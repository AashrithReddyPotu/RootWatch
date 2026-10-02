"""Execute checked-in setup SQL with the Snowflake connector."""
from .config import ROOT
from .repositories import SnowflakeStore
import snowflake.connector

def main():
    store = SnowflakeStore()
    args = {k: v for k, v in store.connection_args.items() if k not in ('database', 'schema', 'warehouse')}
    with snowflake.connector.connect(**args) as connection:
        for cursor in connection.execute_stream((ROOT / 'sql/schema.sql').open()):
            cursor.close()
    print('Created ROOTWATCH.PUBLIC tables and ROOTWATCH_WH')

if __name__ == '__main__':
    main()
