from __future__ import annotations
import time
from collections.abc import AsyncIterator, Callable
import httpx
from .models import OllamaResult

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434", model="lfm2.5-thinking:latest", timeout=600, semaphore=None):
        import asyncio
        self.base_url=base_url.rstrip('/'); self.model=model; self.timeout=timeout
        self.semaphore=semaphore or asyncio.Semaphore(4)

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=5) as c:
                return (await c.get('/api/tags')).is_success
        except httpx.HTTPError: return False

    async def chat(self, system_prompt: str, history: list[dict], task: str, options=None,
                   on_token: Callable[[str], None] | None = None) -> OllamaResult:
        messages=[{"role":"system","content":system_prompt}, *history, {"role":"user","content":task}]
        payload={"model":self.model,"messages":messages,"stream":True,"options":options or {}}
        started=time.monotonic(); content=[]; prompt=completion=0
        try:
            async with self.semaphore:
                async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as c:
                    async with c.stream('POST','/api/chat',json=payload) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line: continue
                            data=__import__('json').loads(line)
                            piece=data.get('message',{}).get('content','')
                            if piece: content.append(piece); on_token and on_token(piece)
                            prompt=data.get('prompt_eval_count',prompt); completion=data.get('eval_count',completion)
                            if data.get('done'): break
            return OllamaResult(content=''.join(content),duration=time.monotonic()-started,prompt_tokens=prompt,completion_tokens=completion,total_tokens=prompt+completion)
        except Exception as exc:
            return OllamaResult(duration=time.monotonic()-started,status='failed',error=str(exc))
