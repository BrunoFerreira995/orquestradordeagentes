"""Controlled file and command execution primitives for workers."""
from __future__ import annotations

import difflib
import os
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path

import fcntl


class WorkspaceError(ValueError):
    """Raised when an operation leaves the worker workspace or is unsafe."""


class WorkspaceManager:
    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.snapshot_root = self.root / ".orchestrator" / "snapshots"
        self.snapshot_root.mkdir(parents=True, exist_ok=True)

    def resolve(self, relative: str | Path) -> Path:
        candidate = (self.root / relative).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as exc:
            raise WorkspaceError(f"caminho fora do workspace: {relative}") from exc
        if candidate == self.root / ".orchestrator":
            raise WorkspaceError("diretório interno não pode ser alterado")
        return candidate

    def read(self, relative: str | Path) -> str:
        return self.resolve(relative).read_text()

    def begin(self, task_id: str) -> Path:
        snapshot = self.snapshot_root / task_id
        if snapshot.exists():
            shutil.rmtree(snapshot)
        snapshot.mkdir(parents=True)
        for source in self.root.rglob("*"):
            if not source.is_file() or self.snapshot_root in source.parents:
                continue
            target = snapshot / source.relative_to(self.root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        return snapshot

    def write(self, relative: str | Path, content: str) -> Path:
        target = self.resolve(relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        with file_lock(target):
            target.write_text(content)
        return target

    def apply_files(self, task_id: str, files: dict[str, str]) -> list[str]:
        self.begin(task_id)
        changed = []
        for relative, content in files.items():
            self.write(relative, content)
            changed.append(str(self.resolve(relative).relative_to(self.root)))
        return changed

    def diff(self, task_id: str) -> str:
        snapshot = self.snapshot_root / task_id
        if not snapshot.exists():
            raise WorkspaceError(f"snapshot inexistente: {task_id}")
        before = {p.relative_to(snapshot): p for p in snapshot.rglob("*") if p.is_file()}
        after = {p.relative_to(self.root): p for p in self.root.rglob("*") if p.is_file() and self.snapshot_root not in p.parents}
        output: list[str] = []
        for path in sorted(set(before) | set(after), key=str):
            old = before[path].read_text().splitlines(keepends=True) if path in before else []
            new = after[path].read_text().splitlines(keepends=True) if path in after else []
            if old != new:
                output.extend(difflib.unified_diff(old, new, fromfile=f"a/{path}", tofile=f"b/{path}"))
        return "".join(output)

    def rollback(self, task_id: str) -> None:
        snapshot = self.snapshot_root / task_id
        if not snapshot.exists():
            raise WorkspaceError(f"snapshot inexistente: {task_id}")
        current = [p for p in self.root.rglob("*") if p.is_file() and self.snapshot_root not in p.parents]
        original = {p.relative_to(snapshot) for p in snapshot.rglob("*") if p.is_file()}
        for path in current:
            if path.relative_to(self.root) not in original:
                path.unlink()
        for source in snapshot.rglob("*"):
            if source.is_file():
                target = self.root / source.relative_to(snapshot)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)


class SandboxRunner:
    def __init__(self, workspace: WorkspaceManager, timeout: int = 120):
        self.workspace = workspace
        self.timeout = timeout

    def run(self, command: list[str], timeout: int | None = None) -> subprocess.CompletedProcess[str]:
        if not command or any(not isinstance(part, str) or not part for part in command):
            raise WorkspaceError("comando inválido")
        environment = {"PATH": os.environ.get("PATH", ""), "HOME": str(self.workspace.root), "CI": "1"}
        try:
            return subprocess.run(command, cwd=self.workspace.root, env=environment,
                                  capture_output=True, text=True, timeout=timeout or self.timeout,
                                  shell=False, check=False)
        except subprocess.TimeoutExpired as exc:
            raise WorkspaceError(f"comando excedeu o timeout de {timeout or self.timeout}s") from exc


@contextmanager
def file_lock(path: str | Path):
    lock = Path(path).with_name("." + Path(path).name + ".lock")
    lock.parent.mkdir(parents=True, exist_ok=True)
    with lock.open("w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def save_diff(diff: str, task_id: str, directory="logs/diffs"):
    target = Path(directory)
    target.mkdir(parents=True, exist_ok=True)
    (target / f"{task_id}.patch").write_text(diff)
