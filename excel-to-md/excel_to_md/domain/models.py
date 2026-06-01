"""도메인 모델 — 순수 비즈니스 데이터 구조.

이 레이어는 외부 라이브러리(openpyxl/pandas/LLM 등)에 **전혀 의존하지 않는다**.
모든 모델은 불변(frozen dataclass)으로 정의해 부수효과를 차단한다.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping

# 셀 1칸이 가질 수 있는 값의 타입(엑셀 셀의 원시 값)
CellValue = str | int | float | bool | None


def _readonly(mapping: Mapping) -> Mapping:
    """전달된 매핑을 읽기전용 뷰로 감싼다(frozen 모델의 진짜 불변성 보장)."""
    return MappingProxyType(dict(mapping))


@dataclass(frozen=True)
class MergedRange:
    """병합된 셀 범위. 좌표는 1-based(엑셀 기준)."""

    ref: str  # 예: "A1:C1"
    min_row: int
    min_col: int
    max_row: int
    max_col: int

    def contains(self, row: int, col: int) -> bool:
        """(row, col) 좌표가 이 병합 범위 안에 있는지."""
        return (
            self.min_row <= row <= self.max_row
            and self.min_col <= col <= self.max_col
        )

    def is_anchor(self, row: int, col: int) -> bool:
        """좌상단(앵커) 셀인지 — 병합 범위의 값은 앵커에만 존재한다."""
        return row == self.min_row and col == self.min_col


@dataclass(frozen=True)
class ImageRef:
    """시트에 임베드된 이미지 참조.

    extracted_path 가 None 이면 추출 실패를 의미하고 note 에 사유를 남긴다.
    """

    anchor: str  # 이미지가 붙은 셀 위치(예: "E2")
    image_format: str  # 예: "png", "jpeg", "unknown"
    extracted_path: str | None = None
    note: str | None = None


@dataclass(frozen=True)
class CellGrid:
    """시트의 2차원 셀 값 격자(표시용 캐시값 기준).

    rows[r][c] 형태로 접근하며 0-based. 비어 있는 셀은 None.
    """

    rows: tuple[tuple[CellValue, ...], ...] = ()

    @property
    def n_rows(self) -> int:
        return len(self.rows)

    @property
    def n_cols(self) -> int:
        return max((len(r) for r in self.rows), default=0)

    def value_at(self, row: int, col: int) -> CellValue:
        """0-based 좌표의 값을 안전하게 반환(범위 밖이면 None)."""
        if 0 <= row < len(self.rows) and 0 <= col < len(self.rows[row]):
            return self.rows[row][col]
        return None


@dataclass(frozen=True)
class SheetData:
    """워크북 내 한 시트의 추출 결과."""

    name: str
    grid: CellGrid
    merged_ranges: tuple[MergedRange, ...] = ()
    images: tuple[ImageRef, ...] = ()
    # 수식 셀: 1-based (row, col) -> 수식 문자열(예: "=SUM(B3:B5)")
    formulas: Mapping[tuple[int, int], str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # 외부에서 받은 dict 를 읽기전용으로 동결(frozen 보강)
        object.__setattr__(self, "formulas", _readonly(self.formulas))

    @property
    def formula_count(self) -> int:
        return len(self.formulas)

    @property
    def merged_count(self) -> int:
        return len(self.merged_ranges)


@dataclass(frozen=True)
class WorkbookData:
    """엑셀 워크북 1개의 전체 추출 결과."""

    source_path: str
    sheets: tuple[SheetData, ...] = ()

    @property
    def sheet_count(self) -> int:
        return len(self.sheets)


# ── 분석 결과 모델 ───────────────────────────────────────────────


@dataclass(frozen=True)
class ColumnStats:
    """수치 컬럼 1개에 대한 통계 + 이상치(b 분석)."""

    name: str
    dtype: str
    count: int
    mean: float | None = None
    std: float | None = None
    min_value: float | None = None
    max_value: float | None = None
    outliers_iqr: tuple[float, ...] = ()
    outliers_zscore: tuple[float, ...] = ()


@dataclass(frozen=True)
class SheetAnalysis:
    """시트 1개의 구조요약(a) + 통계(b)."""

    sheet_name: str
    n_rows: int
    n_cols: int
    merged_count: int
    formula_count: int
    image_count: int
    column_dtypes: Mapping[str, str] = field(default_factory=dict)
    column_stats: tuple[ColumnStats, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "column_dtypes", _readonly(self.column_dtypes))


@dataclass(frozen=True)
class AnalysisResult:
    """워크북 전체 분석 결과(a+b+c)."""

    source_path: str
    sheets: tuple[SheetAnalysis, ...] = ()
    # c: LLM 서술 인사이트. 키 부재/실패 시 None → 보고서에 "(LLM 생략)" 표기.
    narrative: str | None = None
    narrative_skipped_reason: str | None = None


@dataclass(frozen=True)
class SheetMarkdown:
    """시트 1개의 마크다운 표 변환 결과."""

    sheet_name: str
    table_markdown: str


@dataclass(frozen=True)
class ConversionResult:
    """워크북 전체의 마크다운 표 변환 결과(시트별)."""

    source_path: str
    sheets: tuple[SheetMarkdown, ...] = ()
