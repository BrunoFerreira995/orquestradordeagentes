import pytest

from src.workspace import SandboxRunner, WorkspaceError, WorkspaceManager


def test_workspace_changes_diff_and_rollback(tmp_path):
    manager = WorkspaceManager(tmp_path)
    manager.write("src/app.txt", "before\n")
    manager.apply_files("TASK-1", {"src/app.txt": "after\n", "new.txt": "created\n"})

    diff = manager.diff("TASK-1")
    assert "-before" in diff and "+after" in diff
    assert manager.read("new.txt") == "created\n"

    manager.rollback("TASK-1")
    assert manager.read("src/app.txt") == "before\n"
    assert not (tmp_path / "new.txt").exists()


def test_workspace_rejects_escape(tmp_path):
    manager = WorkspaceManager(tmp_path)
    with pytest.raises(WorkspaceError):
        manager.write("../outside.txt", "blocked")


def test_sandbox_runner_is_bounded(tmp_path):
    manager = WorkspaceManager(tmp_path)
    result = SandboxRunner(manager).run(["python", "-c", "print('ok')"])
    assert result.returncode == 0
    assert result.stdout.strip() == "ok"
