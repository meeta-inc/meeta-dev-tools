"""`python -m excel_to_md` 진입점."""
from __future__ import annotations

import sys

from .cli import main

if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
