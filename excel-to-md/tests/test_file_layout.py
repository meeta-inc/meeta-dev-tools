"""FileLayout + Config 단위 테스트."""
from __future__ import annotations

from pathlib import Path

from excel_to_md.infrastructure.config import Config
from excel_to_md.infrastructure.file_layout import FileLayout


def test_discover_filters_excel_only(tmp_path: Path):
    # Arrange: 엑셀/비엑셀/임시파일 혼재
    (tmp_path / "a.xlsx").write_text("x")
    (tmp_path / "b.xls").write_text("x")
    (tmp_path / "c.csv").write_text("x")
    (tmp_path / "~$lock.xlsx").write_text("x")  # 엑셀 임시 잠금파일
    # Act
    found = FileLayout().discover_inputs(tmp_path)
    names = [p.name for p in found]
    # Assert
    assert names == ["a.xlsx", "b.xls"]


def test_discover_empty_dir(tmp_path: Path):
    assert FileLayout().discover_inputs(tmp_path / "missing") == []


def test_prepare_output_dir_nested(tmp_path: Path):
    target = tmp_path / "2026-06-01" / "report"
    out = FileLayout().prepare_output_dir(target)
    assert out.is_dir()


def test_copy_raw_and_write_md(tmp_path: Path):
    layout = FileLayout()
    src = tmp_path / "data.xlsx"
    src.write_text("rawbytes")
    out_dir = layout.prepare_output_dir(tmp_path / "out")
    # Act
    copied = layout.copy_raw(src, out_dir)
    md = layout.write_markdown(out_dir, "data", "# hi")
    # Assert
    assert copied.exists() and copied.read_text() == "rawbytes"
    assert md.name == "data.md" and md.read_text() == "# hi"


def test_config_output_path():
    cfg = Config.create("in", "out", "2026-06-01")
    assert cfg.workbook_output_dir("myfile") == Path("out/2026-06-01/myfile")


def test_config_defaults_to_today():
    cfg = Config.create("in", "out")
    # 날짜 형식 YYYY-MM-DD
    assert len(cfg.run_date) == 10 and cfg.run_date.count("-") == 2
