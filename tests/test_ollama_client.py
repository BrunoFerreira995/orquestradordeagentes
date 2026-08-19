import httpx, respx
from src.ollama_client import OllamaClient
@respx.mock
async def test_streaming_client():
    route=respx.post('http://test/api/chat').mock(return_value=httpx.Response(200,content=b'{"message":{"content":"hi"}}\n{"message":{"content":"!"},"done":true,"prompt_eval_count":2,"eval_count":3}\n',headers={'content-type':'application/x-ndjson'}))
    r=await OllamaClient('http://test','m').chat('s',[],'t'); assert route.called and r.content=='hi!' and r.total_tokens==5

