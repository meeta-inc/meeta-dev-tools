"""레거시 .xls 리더 테스트 — xlwt 로 .xls 픽스처 생성 후 read 경로 검증.

xlwt 는 테스트 전용 의존(런타임 엔진은 읽기만 = xlrd). 미설치 시 skip.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from excel_to_md.adapters.xls_reader import XlsReader

xlwt = pytest.importorskip("xlwt")


def _build_xls(path: Path) -> Path:
    wb = xlwt.Workbook()
    ws = wb.add_sheet("Legacy")
    # 병합 헤더(write_merge(r1, r2, c1, c2)) — 0-based, 끝 포함
    ws.write_merge(0, 0, 0, 2, "레거시 타이틀")
    headers = ["월", "값", "비고"]
    for c, h in enumerate(headers):
        ws.write(1, c, h)
    rows = [["1월", 10, "a"], ["2월", 20, "b"]]
    for r, row in enumerate(rows, start=2):
        for c, v in enumerate(row):
            ws.write(r, c, v)
    wb.save(str(path))
    return path


def test_supports_xls():
    assert XlsReader().supports(Path("a.xls"))
    assert not XlsReader().supports(Path("a.xlsx"))


def test_reads_xls_grid_and_merge(tmp_path: Path):
    src = _build_xls(tmp_path / "legacy.xls")
    wb = XlsReader().read(src)
    assert wb.sheets[0].name == "Legacy"
    grid = wb.sheets[0].grid
    # 헤더 행(1-based row 2)
    assert grid.value_at(1, 0) == "월"
    assert grid.value_at(2, 1) == 10
    # 병합 범위 1개 검출(A1:C1 상응)
    assert wb.sheets[0].merged_count >= 1


def test_xls_no_formula_or_image(tmp_path: Path):
    src = _build_xls(tmp_path / "legacy.xls")
    wb = XlsReader().read(src)
    # .xls 경로는 수식/이미지 미지원(설계상)
    assert wb.sheets[0].formula_count == 0
    assert len(wb.sheets[0].images) == 0
