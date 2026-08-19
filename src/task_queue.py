from __future__ import annotations
import json, sqlite3, uuid
from datetime import datetime, timezone
from pathlib import Path
from .models import Task, TaskStatus

def _dt(v): return datetime.fromisoformat(v) if v else None
class TaskQueue:
    def __init__(self, path='data/agents.db'):
        self.path=path; Path(path).parent.mkdir(parents=True,exist_ok=True); self.db=sqlite3.connect(path,check_same_thread=False); self.db.row_factory=sqlite3.Row; self._init()
    def _init(self):
        self.db.executescript('''CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY,title TEXT,description TEXT,assigned_worker TEXT,status TEXT,priority INTEGER,dependencies TEXT,created_at TEXT,started_at TEXT,finished_at TEXT,attempts INTEGER,result TEXT,error TEXT); CREATE TABLE IF NOT EXISTS workers (id TEXT PRIMARY KEY,role TEXT,status TEXT,last_heartbeat TEXT,current_task TEXT); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY,task_id TEXT,worker TEXT,started_at TEXT,finished_at TEXT,status TEXT); CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT,worker TEXT,type TEXT,payload TEXT,created_at TEXT); CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT,worker TEXT,model TEXT,duration REAL,prompt_tokens INTEGER,completion_tokens INTEGER,total_tokens INTEGER,status TEXT,created_at TEXT);'''); self.db.commit()
    def add(self, task: Task) -> Task:
        self.db.execute('INSERT OR REPLACE INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',(task.id,task.title,task.description,task.assigned_worker,task.status.value,task.priority,json.dumps(task.dependencies),task.created_at.isoformat(),task.started_at and task.started_at.isoformat(),task.finished_at and task.finished_at.isoformat(),task.attempts,json.dumps(task.result) if task.result else None,task.error)); self.db.commit(); return task
    def get(self,id):
        r=self.db.execute('SELECT * FROM tasks WHERE id=?',(id,)).fetchone(); return self._task(r) if r else None
    def _task(self,r): return Task(id=r['id'],title=r['title'],description=r['description'],assigned_worker=r['assigned_worker'],status=r['status'],priority=r['priority'],dependencies=json.loads(r['dependencies']),created_at=_dt(r['created_at']),started_at=_dt(r['started_at']),finished_at=_dt(r['finished_at']),attempts=r['attempts'],result=json.loads(r['result']) if r['result'] else None,error=r['error'])
    def all(self): return [self._task(r) for r in self.db.execute('SELECT * FROM tasks ORDER BY priority DESC,created_at')]
    def claim_ready(self,worker):
        for t in self.all():
            if t.status not in (TaskStatus.PENDING,TaskStatus.READY,TaskStatus.WAITING,TaskStatus.RETRYING) or not t.assigned_worker or t.assigned_worker!=worker: continue
            deps=[self.get(d) for d in t.dependencies]
            missing=[dependency for dependency, task in zip(t.dependencies,deps) if task is None]
            if missing:
                t.status=TaskStatus.FAILED
                t.error='Dependências inexistentes: '+', '.join(missing)
                t.finished_at=datetime.now(timezone.utc)
                self.update(t)
                continue
            if all(d and d.status==TaskStatus.COMPLETED for d in deps):
                t.status=TaskStatus.RUNNING; t.started_at=datetime.now(timezone.utc); t.attempts+=1; self.add(t); return t
        return None
    def update(self,t): return self.add(t)
    def recover(self):
        self.db.execute("UPDATE tasks SET status='PENDING', started_at=NULL WHERE status='RUNNING'"); self.db.commit()
    def counts(self):
        return {s.value:self.db.execute('SELECT count(*) FROM tasks WHERE status=?',(s.value,)).fetchone()[0] for s in TaskStatus}
    def register_worker(self,w,role,status='READY'):
        self.db.execute('INSERT OR REPLACE INTO workers VALUES (?,?,?,?,?)',(w,role,status,datetime.now(timezone.utc).isoformat(),None)); self.db.commit()
    def heartbeat(self,w,status,current=None): self.db.execute('UPDATE workers SET status=?,last_heartbeat=?,current_task=? WHERE id=?',(status,datetime.now(timezone.utc).isoformat(),current,w)); self.db.commit()
    def record_metric(self, task, worker, model, result):
        self.db.execute('INSERT INTO metrics(task_id,worker,model,duration,prompt_tokens,completion_tokens,total_tokens,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)',(task,worker,model,result.duration,result.prompt_tokens,result.completion_tokens,result.total_tokens,result.status,datetime.now(timezone.utc).isoformat())); self.db.commit()
    def close(self): self.db.close()
    @staticmethod
    def new_id(): return 'TASK-'+uuid.uuid4().hex[:8].upper()
