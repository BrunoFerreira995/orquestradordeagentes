"""Safe primitives for future agent file edits."""
from contextlib import contextmanager
from pathlib import Path
import fcntl

@contextmanager
def file_lock(path: str):
    lock=Path(path).with_name('.'+Path(path).name+'.lock'); lock.parent.mkdir(parents=True,exist_ok=True)
    with lock.open('w') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(handle,fcntl.LOCK_UN)

def save_diff(diff: str, task_id: str, directory='logs/diffs'):
    target=Path(directory); target.mkdir(parents=True,exist_ok=True); (target/f'{task_id}.patch').write_text(diff)
