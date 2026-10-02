"""Small interchangeable stores. SQL values are always parameterized."""
import json
import os
from ..config import ROOT, parse_time
from ..models import ServerLog, Deployment, Incident
from .base import Repository

class SnowflakeStore(Repository):
    """Each operation owns a connection: no shared connector cursors between threads."""
    def __init__(self):
        self.connection_args = {}
        for key in ('account', 'user', 'password', 'database', 'schema', 'warehouse'):
            value = os.getenv('SNOWFLAKE_' + key.upper())
            if not value:
                raise ValueError('Missing SNOWFLAKE_' + key.upper())
            self.connection_args[key] = value

    def execute(self, sql, values=(), fetch=False):
        import snowflake.connector
        from snowflake.connector import DictCursor
        with snowflake.connector.connect(**self.connection_args) as conn:
            with conn.cursor(DictCursor) as cursor:
                cursor.execute(sql, values)
                return cursor.fetchall() if fetch else None

    def ping(self):
        self.execute('SELECT 1', fetch=True)
        return True

    @staticmethod
    def decode(rows, model):
        output = []
        for row in rows:
            row = {k.lower(): v for k, v in row.items()}
            if 'files_changed' in row and isinstance(row['files_changed'], str):
                row['files_changed'] = json.loads(row['files_changed'])
            output.append(model(**row))
        return output

    def insert_logs(self, rows):
        # MERGE makes retries with the same log ID idempotent in this single-writer MVP.
        import snowflake.connector
        columns = list(ServerLog.model_fields)
        names = ', '.join('"' + c.upper() + '"' for c in columns)
        source = ', '.join('%s AS "' + c.upper() + '"' for c in columns)
        refs = ', '.join('s."' + c.upper() + '"' for c in columns)
        sql = f'MERGE INTO SERVER_LOGS t USING (SELECT {source}) s ON t.ID=s.ID WHEN NOT MATCHED THEN INSERT ({names}) VALUES ({refs})'
        with snowflake.connector.connect(**self.connection_args) as conn:
            conn.autocommit(False)
            try:
                with conn.cursor() as cursor:
                    for row in rows:
                        values = row.model_dump()
                        cursor.execute(sql, tuple(values[c] for c in columns))
                conn.commit()
            except Exception:
                conn.rollback()
                raise

    def query_logs(self, since, until, service=None, endpoint=None, method=None, error_type=None, limit=None):
        clauses = ['"TIMESTAMP" >= %s', '"TIMESTAMP" <= %s']
        values = [since, until]
        for key, value in [('SERVICE', service), ('ENDPOINT', endpoint), ('METHOD', method), ('ERROR_TYPE', error_type)]:
            if value is not None:
                clauses.append(key + ' = %s')
                values.append(value)
        sql = 'SELECT * FROM SERVER_LOGS WHERE ' + ' AND '.join(clauses) + ' ORDER BY "TIMESTAMP" DESC, ID DESC'
        if limit is not None:
            sql += ' LIMIT %s'
            values.append(limit)
        return self.decode(self.execute(sql, tuple(values), True), ServerLog)

    def list_incidents(self):
        return self.decode(self.execute('SELECT * FROM INCIDENTS ORDER BY LAST_SEEN DESC, INCIDENT_ID DESC', fetch=True), Incident)

    def save_incident(self, row):
        columns = list(Incident.model_fields)
        source = ', '.join('%s AS ' + c.upper() for c in columns)
        updates = ', '.join(f't.{c.upper()}=s.{c.upper()}' for c in columns if c != 'incident_id')
        names = ', '.join(c.upper() for c in columns)
        refs = ', '.join('s.' + c.upper() for c in columns)
        self.execute(f'MERGE INTO INCIDENTS t USING (SELECT {source}) s ON t.INCIDENT_ID=s.INCIDENT_ID WHEN MATCHED THEN UPDATE SET {updates} WHEN NOT MATCHED THEN INSERT ({names}) VALUES ({refs})', tuple(row.model_dump()[c] for c in columns))

    def save_deployment(self, row):
        self.execute('''MERGE INTO DEPLOYMENTS t USING
            (SELECT %s AS DEPLOYMENT_VERSION, %s AS DEPLOYED_AT, %s AS COMMIT_HASH,
                    PARSE_JSON(%s) AS FILES_CHANGED, %s AS DESCRIPTION) s
            ON t.DEPLOYMENT_VERSION=s.DEPLOYMENT_VERSION
            WHEN MATCHED THEN UPDATE SET t.DEPLOYED_AT=s.DEPLOYED_AT, t.COMMIT_HASH=s.COMMIT_HASH,
                t.FILES_CHANGED=s.FILES_CHANGED, t.DESCRIPTION=s.DESCRIPTION
            WHEN NOT MATCHED THEN INSERT (DEPLOYMENT_VERSION, DEPLOYED_AT, COMMIT_HASH, FILES_CHANGED, DESCRIPTION)
            VALUES (s.DEPLOYMENT_VERSION,s.DEPLOYED_AT,s.COMMIT_HASH,s.FILES_CHANGED,s.DESCRIPTION)''',
            (row.deployment_version, row.deployed_at, row.commit_hash, json.dumps(row.files_changed), row.description))

    def list_deployments(self):
        return self.decode(self.execute('SELECT * FROM DEPLOYMENTS ORDER BY DEPLOYED_AT DESC', fetch=True), Deployment)
