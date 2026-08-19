from __future__ import annotations
import asyncio, json, os
from pathlib import Path
from .logger import get_logger
from .models import TaskStatus, now
from .ollama_client import OllamaClient
from .task_queue import TaskQueue
from .workspace import SandboxRunner, WorkspaceManager, WorkspaceError, save_diff

PROMPTS={'architect':'Você é o arquiteto principal do projeto. Analise requisitos antes de alterar código. Identifique dependências, interfaces e riscos. Produza planos pequenos e executáveis.','backend':'Você é um engenheiro backend sênior. Implemente tarefas atribuídas. Leia o código existente antes de alterar arquivos. Faça mudanças pequenas, seguras e testáveis.','frontend':'Você é um engenheiro frontend sênior. Implemente tarefas de interface e integração. Preserve padrões existentes e execute testes relacionados.','qa':'Você é responsável por QA, debugging e revisão. Procure falhas funcionais, regressões, race conditions e integração. Crie testes e valide o comportamento real.'}
RESPONSE_CONTRACT=' Se precisar alterar arquivos, responda JSON com summary, files (lista de {path,content}) e validation_commands (listas de argumentos); não execute alterações diretamente.'

class Worker:
    def __init__(self, worker_id, role, queue, client, workspace='workspace'):
        self.id=worker_id; self.role=role; self.queue=queue; self.client=client; self.workspace=WorkspaceManager(Path(workspace)/worker_id); self.sandbox=SandboxRunner(self.workspace); self.last_task=None; self.log=get_logger(worker_id)
    async def run_once(self):
        task=self.queue.claim_ready(self.id)
        self.last_task=task
        if not task: self.queue.heartbeat(self.id,'READY'); return False
        self.log.info('task_started id=%s attempt=%s title=%s', task.id, task.attempts, task.title)
        self.queue.heartbeat(self.id,'WORKING',task.id)
        self.queue.progress(task.id,self.id,10,'calling model')
        result=await self.client.chat(PROMPTS[self.role],[],f"Tarefa {task.title}:\n{task.description}" + (RESPONSE_CONTRACT if self.role != 'architect' else ''))
        self.queue.progress(task.id,self.id,90,'persisting result')
        self.queue.record_metric(task.id,self.id,getattr(self.client,'model','test'),result)
        proposal=self._proposal(result.content)
        if result.status=='completed' and proposal['files']:
            task.status=TaskStatus.AWAITING_APPROVAL; task.result={'summary':proposal['summary'],'proposed_files':proposal['files'],'validation_commands':proposal['tests'],'files_changed':[],'tests':[],'warnings':['Aguardando aprovação explícita'],'next_actions':['aprovar a task para aplicar as alterações']}; task.error=None
        elif result.status=='completed': task.status=TaskStatus.COMPLETED; task.result={'summary':result.content,'files_changed':[],'tests':[],'warnings':[],'next_actions':[]}; task.error=None
        elif task.attempts < int(os.getenv('MAX_RETRIES','3')): task.status=TaskStatus.RETRYING; task.error=result.error
        else: task.status=TaskStatus.FAILED; task.error=result.error
        if task.status == TaskStatus.COMPLETED: task.progress=100; task.current_step='completed'
        if task.status != TaskStatus.AWAITING_APPROVAL: task.finished_at=now()
        self.queue.update(task); self.queue.heartbeat(self.id,'READY'); return True

    @staticmethod
    def _proposal(content):
        try:
            start, end = content.find('{'), content.rfind('}')
            payload=json.loads(content[start:end+1]) if start >= 0 and end > start else {}
            files=payload.get('files', {})
            if isinstance(files, list): files={item['path']: item['content'] for item in files if item.get('path') is not None and item.get('content') is not None}
            tests=payload.get('validation_commands', payload.get('tests', []))
            tests=[command if isinstance(command, list) else command.split() for command in tests]
            return {'summary':payload.get('summary',content),'files':files if isinstance(files, dict) else {},'tests':tests}
        except (ValueError, TypeError, KeyError):
            return {'summary':content,'files':{},'tests':[]}

    def approve_task(self, task_id):
        task=self.queue.get(task_id)
        if not task or task.assigned_worker != self.id or task.status != TaskStatus.AWAITING_APPROVAL: return False
        proposal=task.result or {}
        try:
            self.workspace.apply_files(task.id, proposal.get('proposed_files', {})); diff=self.workspace.diff(task.id); save_diff(diff, task.id)
            for command in proposal.get('validation_commands', []):
                result=self.sandbox.run(command); task.result.setdefault('tests', []).append({'command':command,'returncode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
                if result.returncode != 0:
                    self.workspace.rollback(task.id); task.status=TaskStatus.FAILED; task.error=f"validação falhou: {' '.join(command)}"; task.finished_at=now(); self.queue.update(task); return False
            task.status=TaskStatus.COMPLETED; task.progress=100; task.current_step='approved and validated'; task.result['files_changed']=list(proposal.get('proposed_files', {}).keys()); task.error=None; task.finished_at=now(); self.queue.update(task); return True
        except WorkspaceError as exc:
            self.workspace.rollback(task.id); task.status=TaskStatus.FAILED; task.error=str(exc); task.finished_at=now(); self.queue.update(task); return False
    async def serve(self, poll=1):
        self.queue.register_worker(self.id,self.role)
        while True:
            worked=await self.run_once()
            delay = poll
            if worked and self.last_task and self.queue.get(self.last_task.id).status == TaskStatus.RETRYING:
                delay = min(60, 2 ** max(0, self.last_task.attempts - 1))
            await asyncio.sleep(delay)
