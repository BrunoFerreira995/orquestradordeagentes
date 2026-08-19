from __future__ import annotations
import argparse, asyncio, os
from .dashboard import dashboard
from .dotenv_fallback import load_env
from .ollama_client import OllamaClient
from .orchestrator import Orchestrator
from .task_queue import TaskQueue
from .worker import Worker
def parser():
    p=argparse.ArgumentParser('ollama-agents'); s=p.add_subparsers(dest='cmd',required=True); r=s.add_parser('run'); r.add_argument('task'); s.add_parser('status'); s.add_parser('workers'); s.add_parser('tasks'); s.add_parser('logs'); s.add_parser('dashboard'); s.add_parser('stop'); s.add_parser('chat'); w=s.add_parser('worker'); w.add_argument('worker_id'); w.add_argument('role'); return p
async def run(a):
    q=TaskQueue(os.getenv('DB_PATH','data/agents.db')); q.recover()
    if a.cmd=='run': print(f'Tarefa registrada: {(await Orchestrator(q).submit(a.task)).id}')
    elif a.cmd=='dashboard': await dashboard()
    elif a.cmd=='worker': await Worker(a.worker_id,a.role,q,OllamaClient()).serve()
    elif a.cmd=='tasks': [print(t.id,t.status.value,t.assigned_worker,t.title) for t in q.all()]
    elif a.cmd in ('status','workers'): print('Database ............ ONLINE'); print(f"Workers ............. {len(q.db.execute('SELECT * FROM workers').fetchall())}"); print(q.counts())
    elif a.cmd=='logs': print('logs/*.log')
    elif a.cmd=='stop': print('Use scripts/stop.sh')
    elif a.cmd=='chat':
        while True:
            try: text=input('ollama-agents> ')
            except EOFError: break
            if text in ('exit','quit'): break
            if text: print(f'Tarefa registrada: {(await Orchestrator(q).submit(text)).id}')
def main(): load_env(); asyncio.run(run(parser().parse_args()))
if __name__=='__main__': main()
