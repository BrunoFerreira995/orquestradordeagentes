from src.models import Task, TaskStatus
from src.task_queue import TaskQueue


def test_failed_gate_blocks_dependents(tmp_path):
    queue=TaskQueue(str(tmp_path/'agents.db'))
    queue.add(Task(id='A',title='gate',description='',status=TaskStatus.FAILED,error='validation failed'))
    queue.add(Task(id='B',title='dependent',description='',assigned_worker='worker-2',status=TaskStatus.WAITING,dependencies=['A']))
    queue.reconcile_dependencies()
    assert queue.get('B').status == TaskStatus.BLOCKED


def test_cycle_is_blocked_instead_of_waiting_forever(tmp_path):
    queue=TaskQueue(str(tmp_path/'agents.db'))
    queue.add(Task(id='A',title='a',description='',assigned_worker='worker-2',status=TaskStatus.WAITING,dependencies=['B']))
    queue.add(Task(id='B',title='b',description='',assigned_worker='worker-3',status=TaskStatus.WAITING,dependencies=['A']))
    queue.reconcile_dependencies()
    assert queue.get('A').status == TaskStatus.BLOCKED
    assert queue.get('B').status == TaskStatus.BLOCKED


def test_parallel_gates_become_ready_together(tmp_path):
    queue=TaskQueue(str(tmp_path/'agents.db'))
    queue.add(Task(id='G',title='gate',description='',status=TaskStatus.COMPLETED))
    for task_id, worker in [('A','worker-2'),('B','worker-3')]:
        queue.add(Task(id=task_id,title=task_id,description='',assigned_worker=worker,status=TaskStatus.WAITING,dependencies=['G']))
    queue.reconcile_dependencies()
    assert queue.get('A').status == TaskStatus.READY
    assert queue.get('B').status == TaskStatus.READY
