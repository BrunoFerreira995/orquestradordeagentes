from src.models import Task, TaskStatus
from src.task_queue import TaskQueue
def test_dependencies_and_claim(tmp_path):
    q=TaskQueue(str(tmp_path/'x.db')); a=Task(id='A',title='a',description='a'); b=Task(id='B',title='b',description='b',assigned_worker='worker-2',dependencies=['A'],status=TaskStatus.WAITING); q.add(a); q.add(b)
    assert q.claim_ready('worker-2') is None
    a.status=TaskStatus.COMPLETED; q.update(a); got=q.claim_ready('worker-2'); assert got.id=='B' and got.attempts==1

def test_missing_dependency_does_not_wait_forever(tmp_path):
    q=TaskQueue(str(tmp_path/'x.db'))
    q.add(Task(id='B',title='b',description='b',assigned_worker='worker-2',dependencies=['missing'],status=TaskStatus.WAITING))
    assert q.claim_ready('worker-2') is None
    task=q.get('B')
    assert task.status==TaskStatus.FAILED
    assert 'missing' in task.error
