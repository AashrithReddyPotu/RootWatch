import httpx


class LLMError(RuntimeError):
    pass


class OllamaClient:
    def __init__(self, base_url: str, model: str, timeout_seconds: float, enabled: bool = True):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.enabled = enabled

    async def generate(self, system_prompt: str, user_prompt: str) -> str | None:
        if not self.enabled:
            return None
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "options": {"temperature": 0.15},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
                content = response.json().get("message", {}).get("content", "").strip()
        except (httpx.HTTPError, ValueError) as exc:
            raise LLMError(str(exc)) from exc
        if not content:
            raise LLMError("The model returned an empty response")
        return content
