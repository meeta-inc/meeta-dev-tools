"""End-to-end + round-trip 검증.

round-trip: xlsx → 읽기 → MD 표 셀값이 원본 리터럴 값과 일치하는지.
"""
from __future__ import annotations

from pathlib import Path

from excel_to_md.adapters.xlsx_reader import XlsxReader
from excel_to_md.cli import build_engine
from excel_to_md.infrastructure.config import Config

from .fixtures import SALES_ROWS


def test_end_to_end_produces_raw_and_md(sample_xlsx: Path, tmp_path: Path):
    # Arrange: input/ 에 샘플 배치
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    dest = input_dir / "sample.xlsx"
    dest.write_bytes(sample_xlsx.read_bytes())
    output_dir = tmp_path / "output"
    config = Config.create(str(input_dir), str(output_dir), "2026-06-01")
    engine = build_engine(use_llm=False)
    # Act
    md_path = engine.process_one(dest, config)
    # Assert: output/<date>/<name>/ 에 raw 사본 + md
    out_dir = output_dir / "2026-06-01" / "sample"
    assert (out_dir / "sample.xlsx").exists()  # raw 사본
    assert md_path == out_dir / "sample.md"
    assert md_path.exists()


def test_roundtrip_literal_values_present(sample_xlsx: Path, tmp_path: Path):
    # Arrange / Act
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    dest = input_dir / "sample.xlsx"
    dest.write_bytes(sample_xlsx.read_bytes())
    config = Config.create(str(input_dir), str(tmp_path / "output"), "2026-06-01")
    engine = build_engine(use_llm=False)
    md = engine.process_one(dest, config).read_text(encoding="utf-8")
    # Assert: 원본 리터럴 셀값이 MD 에 모두 존재
    for row in SALES_ROWS:
        for cell in row:
            if cell not in ("", None):
                assert str(cell) in md, f"MD 에 셀값 누락: {cell!r}"


def test_roundtrip_grid_equality(sample_xlsx: Path, tmp_path: Path):
    # 읽은 격자가 원본 리터럴 행과 셀 단위로 일치(타이틀/수식 행 제외)
    wb = XlsxReader().read(sample_xlsx, tmp_path / "assets")
    grid = wb.sheets[0].grid
    # grid row0=병합 타이틀, row1~ = SALES_ROWS
    for i, src_row in enumerate(SALES_ROWS):
        for j, cell in enumerate(src_row):
            value = grid.value_at(i + 1, j)
            expected = None if cell == "" else cell
            assert value == expected, f"({i + 1},{j}) {value!r} != {expected!r}"
