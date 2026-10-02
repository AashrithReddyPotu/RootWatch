from pathlib import Path


class SourceReadError(RuntimeError):
    pass


class SourceFileReader:
    def __init__(self, source_root: Path):
        self.source_root = source_root.resolve()

    def resolve(self, relative_path: str) -> Path:
        candidate = (self.source_root / relative_path).resolve()
        if candidate != self.source_root and self.source_root not in candidate.parents:
            raise SourceReadError("Path is outside the configured source repository")
        if not candidate.is_file():
            raise SourceReadError(f"Source file not found: {relative_path}")
        return candidate

    def read(self, relative_path: str, start_line: int = 1, end_line: int | None = None) -> str:
        path = self.resolve(relative_path)
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        start = max(1, start_line)
        end = min(len(lines), end_line or len(lines))
        return "\n".join(f"{number}: {lines[number - 1]}" for number in range(start, end + 1))
