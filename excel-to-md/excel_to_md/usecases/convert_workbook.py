"""유스케이스: ConvertWorkbook — 워크북을 시트별 마크다운 표로 변환."""
from __future__ import annotations

from ..domain.models import ConversionResult, WorkbookData
from .ports import MarkdownRenderer


class ConvertWorkbook:
    """WorkbookData → ConversionResult(시트별 MD 표).

    렌더링 자체는 MarkdownRenderer 포트에 위임한다(의존성 역전).
    """

    def __init__(self, renderer: MarkdownRenderer) -> None:
        self._renderer = renderer

    def execute(self, workbook: WorkbookData) -> ConversionResult:
        sheets = tuple(
            self._renderer.render_sheet(sheet) for sheet in workbook.sheets
        )
        return ConversionResult(source_path=workbook.source_path, sheets=sheets)
