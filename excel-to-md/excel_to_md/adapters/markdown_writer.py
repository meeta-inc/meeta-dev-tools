"""어댑터: MarkdownTableWriter — SheetData 를 마크다운 표로 렌더링.

규칙:
- 병합 셀: 앵커 값을 병합 범위 전체에 펼쳐 표시(읽기 편의) + 하단 주석에 범위 명시.
- 수식 셀: 캐시값이 있으면 값, 없으면 수식 문자열(예: `=SUM(...)`)로 폴백.
- 파이프/개행 이스케이프로 표 깨짐 방지.
- 이미지: 추출됐으면 마크다운 이미지 링크, 아니면 주석 placeholder.
"""
from __future__ import annotations

from ..domain.models import CellValue, ImageRef, SheetData, SheetMarkdown


class MarkdownTableWriter:
    """MarkdownRenderer 포트 구현."""

    def render_sheet(self, sheet: SheetData) -> SheetMarkdown:
        if sheet.grid.n_rows == 0:
            body = "_(빈 시트)_"
        else:
            matrix = self._build_display_matrix(sheet)
            body = self._render_table(matrix)
        parts = [body]
        merged_note = self._render_merged_note(sheet)
        if merged_note:
            parts.append(merged_note)
        image_block = self._render_images(sheet.images)
        if image_block:
            parts.append(image_block)
        return SheetMarkdown(sheet_name=sheet.name, table_markdown="\n\n".join(parts))

    def _build_display_matrix(self, sheet: SheetData) -> list[list[str]]:
        """캐시값·수식·병합을 반영한 표시용 문자열 2차원 배열을 만든다."""
        n_rows, n_cols = sheet.grid.n_rows, sheet.grid.n_cols
        merge_map = self._build_merge_map(sheet)
        matrix: list[list[str]] = []
        for r in range(n_rows):
            row_cells = []
            for c in range(n_cols):
                row_cells.append(self._cell_text(sheet, r, c, merge_map))
            matrix.append(row_cells)
        return matrix

    def _cell_text(self, sheet, r, c, merge_map) -> str:
        """0-based (r,c) 셀의 표시 문자열을 결정."""
        # 병합 영역이면 앵커 값을 사용
        if (r, c) in merge_map:
            ar, ac = merge_map[(r, c)]
            value = sheet.grid.value_at(ar, ac)
            formula = sheet.formulas.get((ar + 1, ac + 1))
        else:
            value = sheet.grid.value_at(r, c)
            formula = sheet.formulas.get((r + 1, c + 1))
        if value is None and formula is not None:
            return self._escape(formula)  # 캐시값 없음 → 수식 문자열 폴백
        return self._escape(self._format_value(value))

    @staticmethod
    def _build_merge_map(sheet: SheetData) -> dict[tuple[int, int], tuple[int, int]]:
        """병합 범위 내 모든 0-based 좌표 → 앵커 0-based 좌표 매핑."""
        merge_map: dict[tuple[int, int], tuple[int, int]] = {}
        for rng in sheet.merged_ranges:
            anchor = (rng.min_row - 1, rng.min_col - 1)
            for row in range(rng.min_row, rng.max_row + 1):
                for col in range(rng.min_col, rng.max_col + 1):
                    merge_map[(row - 1, col - 1)] = anchor
        return merge_map

    @staticmethod
    def _format_value(value: CellValue) -> str:
        """셀 값을 문자열로(float 정수는 소수점 제거)."""
        if value is None:
            return ""
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)

    @staticmethod
    def _escape(text: str) -> str:
        """마크다운 표에서 깨지는 문자 이스케이프."""
        return text.replace("|", "\\|").replace("\n", "<br>")

    @staticmethod
    def _render_table(matrix: list[list[str]]) -> str:
        """2차원 문자열 배열을 GFM 표로 렌더링(첫 행을 헤더로 사용)."""
        n_cols = max((len(row) for row in matrix), default=0)
        if n_cols == 0:
            return "_(빈 시트)_"
        header = matrix[0] + [""] * (n_cols - len(matrix[0]))
        lines = ["| " + " | ".join(header) + " |"]
        lines.append("| " + " | ".join(["---"] * n_cols) + " |")
        for row in matrix[1:]:
            padded = row + [""] * (n_cols - len(row))
            lines.append("| " + " | ".join(padded) + " |")
        return "\n".join(lines)

    @staticmethod
    def _render_merged_note(sheet: SheetData) -> str:
        """병합 범위를 주석으로 기록(변환 추적성)."""
        if not sheet.merged_ranges:
            return ""
        refs = ", ".join(rng.ref for rng in sheet.merged_ranges)
        return f"<!-- 병합 셀 {sheet.merged_count}개: {refs} -->"

    @staticmethod
    def _render_images(images: tuple[ImageRef, ...]) -> str:
        """이미지 블록 렌더링(추출 성공=링크, 실패/생략=주석)."""
        if not images:
            return ""
        lines = ["**임베드 이미지:**"]
        for img in images:
            if img.extracted_path:
                lines.append(f"- `{img.anchor}` → ![{img.anchor}]({img.extracted_path})")
            else:
                note = img.note or "추출 불가"
                lines.append(f"- `{img.anchor}` <!-- 이미지 추출 불가: {note} -->")
        return "\n".join(lines)
