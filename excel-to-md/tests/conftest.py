"""pytest 공용 픽스처."""
from __future__ import annotations

from pathlib import Path

import pytest

from excel_to_md.adapters.xlsx_reader import XlsxReader

from .fixtures import build_sample_workbook


@pytest.fixture
def sample_xlsx(tmp_path: Path) -> Path:
    """샘플 .xlsx 파일 경로(멀티시트·병합·수식·이미지 포함)."""
    return build_sample_workbook(tmp_path / "sample.xlsx")


@pytest.fixture
def workbook_data(sample_xlsx: Path, tmp_path: Path):
    """샘플을 읽은 WorkbookData(이미지는 assets/ 로 추출)."""
    reader = XlsxReader()
    return reader.read(sample_xlsx, tmp_path / "assets")
