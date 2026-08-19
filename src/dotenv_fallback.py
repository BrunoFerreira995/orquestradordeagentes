import os
from pathlib import Path
def load_env(path='.env'):
    p=Path(path)
    if p.exists():
        for line in p.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                k,v=line.split('=',1); os.environ.setdefault(k.strip(),v.strip())

