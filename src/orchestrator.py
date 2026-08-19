from __future__ import annotations
import asyncio, json, os
from .models import Task, TaskStatus
from .task_queue import TaskQueue
from .ollama_client import OllamaClient

class Orchestrator:
    def __init__(self, queue=None, client=None):
        self.queue=queue or TaskQueue(os.getenv('DB_PATH','data/agents.db')); self.client=client or OllamaClient(os.getenv('OLLAMA_BASE_URL','http://localhost:11434'),os.getenv('OLLAMA_MODEL','lfm2.5-thinking:latest'),float(os.getenv('OLLAMA_TIMEOUT','600')))
    async def submit(self, description):
        root=Task(id=self.queue.new_id(),title='Arquitetura e planejamento',description=description,assigned_worker='worker-1',status=TaskStatus.READY); self.queue.add(root)
        plan=await self.client.chat('Você é arquiteto. Decomponha a tarefa em subtarefas. Responda JSON com tasks: [{title,description,role,dependencies}].',[],description)
        children=[]
        if plan.status=='completed':
            try: children=json.loads(plan.content[plan.content.find('{'):plan.content.rfind('}')+1]).get('tasks',[])
            except (ValueError,AttributeError): pass
        if not children: children=[{'title':'Implementação backend','description':description,'role':'backend','dependencies':[root.id]},{'title':'Validação e testes','description':'Revise a implementação e crie testes para: '+description,'role':'qa','dependencies':[]}]
        root.status=TaskStatus.COMPLETED; root.result={'summary':plan.content,'children':len(children)}; self.queue.update(root)
        # O modelo pode devolver títulos nas dependências, embora a fila use IDs.
        # Gere todos os IDs antes para permitir referências entre subtarefas.
        child_ids={item.get('title','Subtarefa'): self.queue.new_id() for item in children}
        for item in children:
            role=item.get('role','backend'); wid={'architect':'worker-1','backend':'worker-2','frontend':'worker-3','qa':'worker-4'}.get(role,'worker-2'); deps=item.get('dependencies',[])
            normalized=[]
            for dependency in deps:
                normalized.append(child_ids.get(dependency, dependency))
            self.queue.add(Task(id=child_ids[item.get('title','Subtarefa')],title=item.get('title','Subtarefa'),description=item.get('description',''),assigned_worker=wid,status=TaskStatus.READY if not normalized else TaskStatus.WAITING,dependencies=normalized))
        return root
    async def wait(self, timeout=None):
        async def done():
            while any(t.status in (TaskStatus.PENDING,TaskStatus.READY,TaskStatus.WAITING,TaskStatus.RUNNING,TaskStatus.RETRYING) for t in self.queue.all()): await asyncio.sleep(.5)
        try: await asyncio.wait_for(done(),timeout)
        except asyncio.TimeoutError: return False
        return True
