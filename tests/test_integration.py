import os
import shutil
import socket
import subprocess
import time

import httpx
import pytest

from src.models import OllamaResult, Task, TaskStatus
from src.task_queue import TaskQueue
from src.worker import Worker


class FakeClient:
    model = "integration-test"

    async def chat(self, *args, **kwargs):
        return OllamaResult(content="resultado integrado")


def free_port():
    try:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            return sock.getsockname()[1]
    except PermissionError:
        pytest.skip("ambiente não permite abrir sockets locais")


@pytest.mark.asyncio
async def test_queue_worker_and_api_end_to_end(tmp_path):
    if not shutil.which("bun"):
        pytest.skip("Bun não instalado")

    db_path = tmp_path / "agents.db"
    queue = TaskQueue(str(db_path))
    queue.add(Task(id="INTEGRATION-1", title="integração", description="teste", assigned_worker="worker-2", status=TaskStatus.READY))
    assert await Worker("worker-2", "backend", queue, FakeClient(), str(tmp_path)).run_once()
    assert queue.get("INTEGRATION-1").status == TaskStatus.COMPLETED

    port = free_port()
    env = {**os.environ, "DB_PATH": str(db_path), "PORT": str(port), "API_TOKEN": "integration-secret"}
    process = subprocess.Popen(["bun", "run", "src/index.ts"], cwd="api", env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        url = f"http://127.0.0.1:{port}"
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            try:
                response = httpx.get(f"{url}/health", timeout=0.5)
                if response.status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.1)
        else:
            output = process.stderr.read().decode()
            pytest.fail(f"API não iniciou: {output}")

        headers = {"Authorization": "Bearer integration-secret"}
        tasks = httpx.get(f"{url}/tasks", headers=headers, timeout=2).json()
        task = httpx.get(f"{url}/tasks/INTEGRATION-1", headers=headers, timeout=2).json()
        assert any(item["id"] == "INTEGRATION-1" for item in tasks)
        assert task["status"] == "COMPLETED"
        assert task["result"]["summary"] == "resultado integrado"
    finally:
        process.terminate()
        process.wait(timeout=5)
