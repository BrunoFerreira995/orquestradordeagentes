import json

from src.models import OllamaResult, Task, TaskStatus
from src.task_queue import TaskQueue
from src.worker import Worker


class ProposalClient:
    async def chat(self, *args, **kwargs):
        return OllamaResult(content=json.dumps({
            'summary': 'alteração segura',
            'files': [{'path': 'src/result.txt', 'content': 'ok\n'}],
            'validation_commands': [['python', '-c', 'from pathlib import Path; assert Path("src/result.txt").read_text() == "ok\\n"']]
        }))


async def test_changes_require_approval_and_are_validated(tmp_path):
    queue=TaskQueue(str(tmp_path/'agents.db'))
    queue.add(Task(id='A',title='change',description='change',assigned_worker='worker-2',status=TaskStatus.READY))
    worker=Worker('worker-2','backend',queue,ProposalClient(),str(tmp_path))
    assert await worker.run_once()
    assert queue.get('A').status == TaskStatus.AWAITING_APPROVAL
    assert not (tmp_path/'worker-2/src/result.txt').exists()
    assert worker.approve_task('A')
    assert queue.get('A').status == TaskStatus.COMPLETED
    assert (tmp_path/'worker-2/src/result.txt').read_text() == 'ok\n'
