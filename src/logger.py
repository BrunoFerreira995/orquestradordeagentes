from __future__ import annotations
import logging
from pathlib import Path

def get_logger(name: str, log_dir: str = "logs") -> logging.Logger:
    logger = logging.getLogger(f"ollama_agents.{name}")
    if logger.handlers: return logger
    Path(log_dir).mkdir(parents=True, exist_ok=True)
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    sh = logging.StreamHandler(); sh.setFormatter(fmt); logger.addHandler(sh)
    fh = logging.FileHandler(Path(log_dir) / f"{name}.log"); fh.setFormatter(fmt); logger.addHandler(fh)
    return logger

