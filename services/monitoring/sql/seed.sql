-- Optional demo deployment; run schema.sql first. Does not overwrite metadata.
USE DATABASE ROOTWATCH;
USE SCHEMA PUBLIC;
USE WAREHOUSE ROOTWATCH_WH;
MERGE INTO DEPLOYMENTS t USING (
    SELECT 'v1.4.8' AS DEPLOYMENT_VERSION,
        DATEADD('minute', -5, CURRENT_TIMESTAMP()) AS DEPLOYED_AT,
        'demo148' AS COMMIT_HASH,
        PARSE_JSON('["services/application_service.py", "database/connection.py"]') AS FILES_CHANGED,
        'Synthetic application database configuration update' AS DESCRIPTION
) s ON t.DEPLOYMENT_VERSION = s.DEPLOYMENT_VERSION
WHEN NOT MATCHED THEN INSERT (DEPLOYMENT_VERSION, DEPLOYED_AT, COMMIT_HASH, FILES_CHANGED, DESCRIPTION)
VALUES (s.DEPLOYMENT_VERSION, s.DEPLOYED_AT, s.COMMIT_HASH, s.FILES_CHANGED, s.DESCRIPTION);
-- Use generator/generate_logs.py for timestamped server traffic.
