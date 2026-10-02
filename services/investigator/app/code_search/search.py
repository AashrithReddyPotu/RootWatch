import ast
import re
from dataclasses import dataclass
from pathlib import Path


ALLOWED_SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx", ".sql", ".yaml", ".yml"}
IGNORED_DIRECTORIES = {".git", ".venv", "node_modules", "__pycache__", "dist", "build"}


@dataclass(frozen=True)
class CodeMatch:
    path: str
    function: str | None
    line: int
    snippet: str
    score: float


class CodeSearcher:
    def __init__(self, source_root: Path):
        self.source_root = source_root.resolve()

    def search(self, query: str, preferred_files: list[str] | None = None, limit: int = 5) -> list[CodeMatch]:
        terms = self._terms(query)
        preferred_order = [Path(path).as_posix() for path in preferred_files or []]
        preferred = set(preferred_order)
        preferred_bonus = {
            path: max(4, 12 - index * 4)
            for index, path in enumerate(preferred_order)
        }
        matches: list[CodeMatch] = []
        if not self.source_root.exists():
            return matches
        for path in self.source_root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in ALLOWED_SUFFIXES:
                continue
            if any(part in IGNORED_DIRECTORIES for part in path.parts):
                continue
            relative = path.relative_to(self.source_root).as_posix()
            content = path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()
            functions = self._python_functions(content) if path.suffix == ".py" else []
            for line_number, line in enumerate(lines, start=1):
                normalized = line.lower()
                hits = sum(1 for term in terms if term in normalized)
                file_hits = sum(1 for term in terms if term in relative.lower())
                if hits == 0 and file_hits == 0 and relative not in preferred:
                    continue
                score = hits * 3 + file_hits * 2 + preferred_bonus.get(relative, 0)
                function = self._containing_function(functions, line_number)
                if function:
                    score += 1
                snippet_start = max(0, line_number - 2)
                snippet_end = min(len(lines), line_number + 2)
                snippet = "\n".join(lines[snippet_start:snippet_end])
                matches.append(CodeMatch(relative, function, line_number, snippet, float(score)))
        unique: dict[tuple[str, str | None], CodeMatch] = {}
        for match in sorted(matches, key=lambda item: (-item.score, item.path, item.line)):
            key = (match.path, match.function)
            if key not in unique:
                unique[key] = match
        return list(unique.values())[:limit]

    @staticmethod
    def _terms(query: str) -> set[str]:
        raw = {term.lower() for term in re.findall(r"[A-Za-z][A-Za-z0-9_]+", query) if len(term) > 2}
        expanded = set(raw)
        aliases = {
            "database": {"db", "connection", "pool"},
            "timeout": {"connection", "pool"},
            "application": {"submit", "validation"},
            "failure": {"error", "exception"},
        }
        for term in raw:
            expanded.update(aliases.get(term, set()))
        return expanded

    @staticmethod
    def _python_functions(content: str) -> list[tuple[str, int, int]]:
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return []
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append((node.name, node.lineno, getattr(node, "end_lineno", node.lineno)))
        return functions

    @staticmethod
    def _containing_function(functions: list[tuple[str, int, int]], line: int) -> str | None:
        candidates = [item for item in functions if item[1] <= line <= item[2]]
        if not candidates:
            return None
        return min(candidates, key=lambda item: item[2] - item[1])[0]
