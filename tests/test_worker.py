from src.models import OllamaResult, Task
from src.task_queue import TaskQueue
from src.worker import Worker
class Fake:
    async def chat(self,*a,**k): return OllamaResult(content='ok')
async def test_worker_completes(tmp_path):
    q=TaskQueue(str(tmp_path/'x.db')); q.add(Task(id='A',title='a',description='a',assigned_worker='worker-2'))
    w=Worker('worker-2','backend',q,Fake(),str(tmp_path)); assert await w.run_once(); assert q.get('A').result['summary']=='ok'

