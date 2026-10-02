from datetime import datetime, timezone
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')

def utcnow():
    return datetime.now(timezone.utc)

def parse_time(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)

def enabled(name, default='true'):
    value = os.getenv(name, default).lower()
    if value not in ('true', 'false'):
        raise ValueError(f'{name} must be true or false')
    return value == 'true'
