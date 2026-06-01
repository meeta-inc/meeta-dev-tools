"""어댑터: XlsReader — 레거시 .xls(BIFF) 를 xlrd 로 읽는다.

레거시 .xls 는 xlrd 2.0(BIFF) 경유로 읽는다. .xls 포맷 특성상 수식/이미지
추출은 지원하지 않으며(셀 캐시값만 제공), 병합셀은 formatting_info 가용 시 추출한다.
주 대상은 .xlsx(XlsxReader)이고 본 리더는 레거시 호환용 best-effort 다.
"""
from __future__ import annotations

from pathlib import Path

from ..domain.errors import WorkbookReadError
from ..domain.models import CellGrid, MergedRange, SheetData, WorkbookData

_SUPPORTED = {".xls"}


class XlsReader:
    """xlrd 기반 레거시 .xls 리더(WorkbookReader 포트 구현)."""

    def supports(self, path: Path) -> bool:
        return path.suffix.lower() in _SUPPORTED

    def read(self, path: Path, assets_dir: Path | None = None) -> WorkbookData:
        import xlrd  # 레거시 경로에서만 임포트(선택적 의존)

        try:
            # 병합셀을 얻으려면 formatting_info 가 필요하나 일부 파일은 미지원 → 폴백.
            try:
                book = xlrd.open_workbook(str(path), formatting_info=True)
            except NotImplementedError:
                book = xlrd.open_workbook(str(path))
        except Exception as exc:
            raise WorkbookReadError(f".xls 읽기 실패: {path} ({exc})") from exc

        sheets = tuple(self._read_sheet(sheet) for sheet in book.sheets())
        return WorkbookData(source_path=str(path), sheets=sheets)

    def _read_sheet(self, sheet) -> SheetData:
        rows = tuple(
            tuple(sheet.cell_value(r, c) for c in range(sheet.ncols))
            for r in range(sheet.nrows)
        )
        return SheetData(
            name=sheet.name,
            grid=CellGrid(rows=rows),
            merged_ranges=self._read_merged(sheet),
            images=(),  # .xls 이미지 추출 미지원
            formulas={},  # .xls 수식 추출 미지원(캐시값만)
        )

    @staticmethod
    def _read_merged(sheet) -> tuple[MergedRange, ...]:
        """xlrd merged_cells: (rlo, rhi, clo, chi) — 0-based, 끝 exclusive."""
        merged = getattr(sheet, "merged_cells", []) or []
        result = []
        for rlo, rhi, clo, chi in merged:
            result.append(
                MergedRange(
                    ref=f"r{rlo + 1}c{clo + 1}:r{rhi}c{chi}",
                    min_row=rlo + 1,
                    min_col=clo + 1,
                    max_row=rhi,
                    max_col=chi,
                )
            )
        return tuple(result)
