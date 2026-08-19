from __future__ import annotations
import asyncio, os
from rich.console import Console
from rich.live import Live
from rich.table import Table
from .task_queue import TaskQueue

def render(q, model):
    t=Table(title=f'OLLAMA AGENT ORCHESTRATOR | Model: {model}'); [t.add_column(x) for x in ('Worker','Role','Status','Task')]
    for r in q.db.execute('SELECT * FROM workers ORDER BY id').fetchall(): t.add_row(r['id'],r['role'],r['status'],r['current_task'] or '-')
    c=q.counts(); t.add_row('','Queue',f"{c['READY']+c['PENDING']} pending",f"{c['RUNNING']} running / {c['COMPLETED']} completed"); return t
async def dashboard():
    q=TaskQueue(os.getenv('DB_PATH','data/agents.db'))
    with Live(render(q,os.getenv('OLLAMA_MODEL','lfm2.5-thinking:latest')),console=Console(),refresh_per_second=2) as live:
        while True: await asyncio.sleep(.5); live.update(render(q,os.getenv('OLLAMA_MODEL','lfm2.5-thinking:latest')))
