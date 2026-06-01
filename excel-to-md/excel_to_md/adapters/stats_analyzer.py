"""어댑터: PandasStatsAnalyzer — 시트의 구조요약(a)+통계/이상치(b) 산출.

- a(구조): 행/열수·병합수·수식수·이미지수·컬럼 dtype.
- b(통계): 수치 컬럼 describe + IQR/zscore 이상치.

헤더 가정: 풀폭 병합 타이틀 행을 건너뛴 첫 데이터 행을 컬럼 헤더로 본다.
헤더 추론이 어긋나도 구조요약 카운트(a: 행/열·병합·수식·이미지 수)는 항상 정확하다.
"""
from __future__ import annotations

import math

import pandas as pd

from ..domain.models import ColumnStats, SheetAnalysis, SheetData

_ZSCORE_THRESHOLD = 3.0  # |z| 이 값 초과 시 이상치
_IQR_FACTOR = 1.5  # 사분위 범위 배수


class PandasStatsAnalyzer:
    """StatsEngine 포트 구현(pandas 기반)."""

    def analyze_sheet(self, sheet: SheetData) -> SheetAnalysis:
        df = self._to_dataframe(sheet)
        dtypes = {col: str(df[col].dtype) for col in df.columns}
        column_stats = tuple(
            self._column_stats(df, col)
            for col in df.select_dtypes("number").columns
        )
        return SheetAnalysis(
            sheet_name=sheet.name,
            n_rows=sheet.grid.n_rows,
            n_cols=sheet.grid.n_cols,
            merged_count=sheet.merged_count,
            formula_count=sheet.formula_count,
            image_count=len(sheet.images),
            column_dtypes=dtypes,
            column_stats=column_stats,
        )

    def _to_dataframe(self, sheet: SheetData) -> pd.DataFrame:
        """격자를 DataFrame 으로. 풀폭 병합 타이틀 행을 건너뛰고 헤더를 잡는다."""
        grid = sheet.grid
        offset = self._header_offset(sheet)  # 타이틀 행 수만큼 건너뜀
        if grid.n_rows - offset <= 1:
            return pd.DataFrame()
        n_cols = len(grid.rows[offset])
        header = [
            str(h) if h is not None else f"col{i}"
            for i, h in enumerate(grid.rows[offset])
        ]
        header = _dedupe(header)
        # 데이터 행을 헤더 폭으로 맞춘다(리더는 직사각형 격자를 보장하지만,
        # CellGrid 를 직접 주입하는 라이브러리 사용 시 ragged 행 방어).
        data = [list(r)[:n_cols] for r in grid.rows[offset + 1:]]
        df = pd.DataFrame(data, columns=header[:n_cols])
        # 문자열로 들어온 수치 컬럼을 숫자로 강제 변환 시도(실패분은 원형 유지)
        for col in df.columns:
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() >= max(1, len(converted) // 2):
                df[col] = converted
        return df

    @staticmethod
    def _header_offset(sheet: SheetData) -> int:
        """상단의 풀폭 병합 타이틀 행 개수를 반환(헤더 추론용).

        타이틀 행 = 1열부터 전체 폭을 덮는 병합 범위가 시작되는 행. 이런 행이
        연속되면 모두 건너뛰어 실제 데이터 헤더 행을 찾는다.
        """
        n_cols = sheet.grid.n_cols
        title_rows = {
            rng.min_row - 1  # 0-based
            for rng in sheet.merged_ranges
            if rng.min_col == 1 and rng.max_col >= n_cols and n_cols > 1
        }
        offset = 0
        while offset in title_rows:
            offset += 1
        return offset

    def _column_stats(self, df: pd.DataFrame, col) -> ColumnStats:
        """수치 컬럼 1개의 통계 + 이상치."""
        series = df[col].dropna()
        outliers_iqr = self._iqr_outliers(series)
        outliers_z = self._zscore_outliers(series)
        return ColumnStats(
            name=str(col),
            dtype=str(df[col].dtype),
            count=int(series.count()),
            mean=_safe_float(series.mean()),
            std=_safe_float(series.std()),
            min_value=_safe_float(series.min()),
            max_value=_safe_float(series.max()),
            outliers_iqr=tuple(float(x) for x in outliers_iqr),
            outliers_zscore=tuple(float(x) for x in outliers_z),
        )

    @staticmethod
    def _iqr_outliers(series) -> list[float]:
        """IQR 규칙 이상치(Q1-1.5IQR 미만 또는 Q3+1.5IQR 초과)."""
        if series.count() < 4:
            return []
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lo, hi = q1 - _IQR_FACTOR * iqr, q3 + _IQR_FACTOR * iqr
        return series[(series < lo) | (series > hi)].tolist()

    @staticmethod
    def _zscore_outliers(series) -> list[float]:
        """z-score 규칙 이상치(|z| > 임계)."""
        if series.count() < 3:
            return []
        std = series.std()
        if std == 0 or math.isnan(std):  # 분산 0 또는 NaN 이면 이상치 없음
            return []
        mean = series.mean()
        z = (series - mean) / std
        return series[z.abs() > _ZSCORE_THRESHOLD].tolist()


def _dedupe(names: list[str]) -> list[str]:
    """중복 컬럼명에 접미사를 붙여 유일화.

    생성한 접미사명(`a.1`)이 원본에 이미 존재하면(`['a','a.1','a']`) 충돌하므로,
    이미 사용된 이름이면 빌 때까지 카운터를 증가시켜 재충돌을 회피한다.
    """
    seen: dict[str, int] = {}
    result = []
    for name in names:
        if name not in seen:
            seen[name] = 0
            result.append(name)
            continue
        seen[name] += 1
        candidate = f"{name}.{seen[name]}"
        while candidate in seen:  # 생성명이 기존 이름과 재충돌하면 다음 번호로
            seen[name] += 1
            candidate = f"{name}.{seen[name]}"
        seen[candidate] = 0
        result.append(candidate)
    return result


def _safe_float(value) -> float | None:
    """NaN/inf/None 을 None 으로 정규화한 float 변환(JSON·md 직렬화 안전)."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f
