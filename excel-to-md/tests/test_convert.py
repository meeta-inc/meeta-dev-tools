"""MarkdownTableWriter + ConvertWorkbook 단위 테스트."""
from __future__ import annotations

from excel_to_md.adapters.markdown_writer import MarkdownTableWriter
from excel_to_md.domain.models import (
    CellGrid,
    ImageRef,
    MergedRange,
    SheetData,
)
from excel_to_md.usecases.convert_workbook import ConvertWorkbook


def _writer() -> MarkdownTableWriter:
    return MarkdownTableWriter()


def test_renders_basic_table():
    sheet = SheetData(name="S", grid=CellGrid(rows=(("a", "b"), (1, 2))))
    md = _writer().render_sheet(sheet).table_markdown
    assert "| a | b |" in md
    assert "| --- | --- |" in md
    assert "| 1 | 2 |" in md


def test_merge_expands_anchor_value():
    # A1:C1 병합, 앵커에만 "제목" → 표시 행은 3칸 모두 "제목"
    grid = CellGrid(rows=(("제목", None, None), ("x", "y", "z")))
    merged = (MergedRange("A1:C1", 1, 1, 1, 3),)
    sheet = SheetData(name="S", grid=grid, merged_ranges=merged)
    md = _writer().render_sheet(sheet).table_markdown
    assert "| 제목 | 제목 | 제목 |" in md
    assert "병합 셀 1개" in md  # 추적 주석


def test_formula_fallback_when_no_cache():
    # 캐시값 None + 수식 존재 → 수식 문자열 표시
    grid = CellGrid(rows=(("합계",), (None,)))
    sheet = SheetData(name="S", grid=grid, formulas={(2, 1): "=SUM(A1:A1)"})
    md = _writer().render_sheet(sheet).table_markdown
    assert "=SUM(A1:A1)" in md


def test_escapes_pipe_and_newline():
    grid = CellGrid(rows=(("a|b", "line1\nline2"),))
    md = _writer().render_sheet(SheetData(name="S", grid=grid)).table_markdown
    assert "a\\|b" in md
    assert "line1<br>line2" in md


def test_empty_sheet():
    md = _writer().render_sheet(SheetData(name="S", grid=CellGrid())).table_markdown
    assert "빈 시트" in md


def test_image_block_extracted():
    img = ImageRef(anchor="E2", image_format="png", extracted_path="assets/x.png")
    sheet = SheetData(name="S", grid=CellGrid(rows=(("a",),)), images=(img,))
    md = _writer().render_sheet(sheet).table_markdown
    assert "![E2](assets/x.png)" in md


def test_image_block_placeholder():
    img = ImageRef(anchor="E2", image_format="png", note="추출 불가 사유")
    sheet = SheetData(name="S", grid=CellGrid(rows=(("a",),)), images=(img,))
    md = _writer().render_sheet(sheet).table_markdown
    assert "이미지 추출 불가" in md


def test_convert_usecase_all_sheets(workbook_data):
    result = ConvertWorkbook(_writer()).execute(workbook_data)
    assert [s.sheet_name for s in result.sheets] == ["Sales", "Meta"]
