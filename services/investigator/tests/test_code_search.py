from pathlib import Path

import pytest

from app.code_search import CodeSearcher, SourceFileReader, SourceReadError


SERVICE_ROOT = Path(__file__).resolve().parents[1]


def test_search_finds_application_service():
    searcher = CodeSearcher(SERVICE_ROOT / "demo_repository")
    results = searcher.search(
        "database connection timeout submit application",
        preferred_files=["services/application_service.py"],
    )
    assert results
    assert results[0].path == "services/application_service.py"
    assert results[0].function == "submit_application"


def test_reader_rejects_path_escape():
    reader = SourceFileReader(SERVICE_ROOT / "demo_repository")
    with pytest.raises(SourceReadError):
        reader.read("../../README.md")
