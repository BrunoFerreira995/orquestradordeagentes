from __future__ import annotations
import asyncio, os
from pathlib import Path
from .logger import get_logger
from .models import TaskStatus, now
from .ollama_client import OllamaClient
from .task_queue import TaskQueue

PROMPTS={'architect':'Você é o arquiteto principal do projeto. Analise requisitos antes de alterar código. Identifique dependências, interfaces e riscos. Produza planos pequenos e executáveis.','backend':'Você é um engenheiro backend sênior. Implemente tarefas atribuídas. Leia o código existente antes de alterar arquivos. Faça mudanças pequenas, seguras e testáveis.','frontend':'Você é um engenheiro frontend sênior. Implemente tarefas de interface e integração. Preserve padrões existentes e execute testes relacionados.','qa':'Você é responsável por QA, debugging e revisão. Procure falhas funcionais, regressões, race conditions e integração. Crie testes e valide o comportamento real.'}

class Worker:
    def __init__(self, worker_id, role, queue, client, workspace='workspace'):
        self.id=worker_id; self.role=role; self.queue=queue; self.client=client; self.workspace=Path(workspace)/worker_id; self.workspace.mkdir(parents=True,exist_ok=True); self.log=get_logger(worker_id)
    async def run_once(self):
        task=self.queue.claim_ready(self.id)
        if not task: self.queue.heartbeat(self.id,'READY'); return False
        self.queue.heartbeat(self.id,'WORKING',task.id)
        result=await self.client.chat(PROMPTS[self.role],[],f"Tarefa {task.title}:\n{task.description}")
        self.queue.record_metric(task.id,self.id,getattr(self.client,'model','test'),result)
        if result.status=='completed': task.status=TaskStatus.COMPLETED; task.result={'summary':result.content,'files_changed':[],'tests':[],'warnings':[],'next_actions':[]}; task.error=None
        elif task.attempts < int(os.getenv('MAX_RETRIES','3')): task.status=TaskStatus.RETRYING; task.error=result.error
        else: task.status=TaskStatus.FAILED; task.error=result.error
        task.finished_at=now(); self.queue.update(task); self.queue.heartbeat(self.id,'READY'); return True
    async def serve(self, poll=1):
        self.queue.register_worker(self.id,self.role)
        while True:
            worked=await self.run_once()
            await asyncio.sleep((2 ** max(0, self.queue.get(self.queue.all()[-1].id).attempts-1)) if worked and self.queue.all()[-1].status==TaskStatus.RETRYING else poll)
