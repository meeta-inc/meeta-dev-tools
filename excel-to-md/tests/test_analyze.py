"""분석부 테스트 — PandasStatsAnalyzer(a+b), AnalyzeWorkbook(c skip/inject), report."""
from __future__ import annotations

from excel_to_md.adapters.stats_analyzer import (
    PandasStatsAnalyzer,
    _dedupe,
    _safe_float,
)
from excel_to_md.domain.models import AnalysisResult, CellGrid, SheetData
from excel_to_md.domain.report import compose_document
from excel_to_md.usecases.analyze_workbook import AnalyzeWorkbook
from excel_to_md.usecases.convert_workbook import ConvertWorkbook
from excel_to_md.adapters.markdown_writer import MarkdownTableWriter


def test_structure_summary_counts(workbook_data):
    analysis = PandasStatsAnalyzer().analyze_sheet(workbook_data.sheets[0])
    assert analysis.sheet_name == "Sales"
    assert analysis.merged_count == 1
    assert analysis.formula_count == 1
    assert analysis.image_count == 1


def test_numeric_dtype_and_outlier():
    # 매출 컬럼에 99999 이상치 포함 → IQR 또는 zscore 이상치 검출
    grid = CellGrid(rows=(
        ("월", "매출"),
        ("1월", 100), ("2월", 110), ("3월", 120),
        ("4월", 130), ("5월", 99999),
    ))
    analysis = PandasStatsAnalyzer().analyze_sheet(SheetData(name="S", grid=grid))
    sales_col = [c for c in analysis.column_stats if c.name == "매출"]
    assert sales_col, "수치 컬럼 '매출' 통계가 있어야 함"
    col = sales_col[0]
    assert col.count == 5
    assert col.max_value == 99999
    assert len(col.outliers_iqr) + len(col.outliers_zscore) >= 1


def test_analyze_skips_llm_without_narrator(workbook_data):
    # narrator 미주입 → narrative None, 사유 기록 (graceful skip)
    result = AnalyzeWorkbook(PandasStatsAnalyzer(), narrator=None).execute(workbook_data)
    assert result.narrative is None
    assert result.narrative_skipped_reason is not None


def test_analyze_uses_injected_narrator(workbook_data):
    class FakeNarrator:
        def narrate(self, analysis):
            return "데이터 인사이트 요약", None

    result = AnalyzeWorkbook(PandasStatsAnalyzer(), FakeNarrator()).execute(workbook_data)
    assert result.narrative == "데이터 인사이트 요약"


def test_report_contains_sections(workbook_data):
    analysis = AnalyzeWorkbook(PandasStatsAnalyzer(), None).execute(workbook_data)
    conversion = ConvertWorkbook(MarkdownTableWriter()).execute(workbook_data)
    doc = compose_document(analysis, conversion)
    assert "# 📊 분석 요약" in doc
    assert "# 📄 시트별 데이터" in doc
    assert "LLM 생략" in doc  # 키 없는 환경의 기본 동작
    # L3: 시트명 헤딩은 백틱으로 감싼다(특수문자 안전)
    assert "## `Sales`" in doc and "## `Meta`" in doc


def test_safe_float_filters_nan_and_inf():
    # L1 회귀: NaN/±inf 는 None 으로 정규화(직렬화 안전), 유한값은 보존
    assert _safe_float(float("nan")) is None
    assert _safe_float(float("inf")) is None
    assert _safe_float(float("-inf")) is None
    assert _safe_float(3.5) == 3.5
    assert _safe_float(None) is None


def test_ragged_grid_does_not_crash():
    # L2 회귀: 데이터 행이 헤더보다 넓은 ragged 격자도 헤더 폭으로 truncate
    grid = CellGrid(rows=(
        ("월", "매출"),          # 헤더 2열
        ("1월", 100, "초과열"),   # 데이터 3열(ragged)
        ("2월", 110, "초과열2"),
    ))
    analysis = PandasStatsAnalyzer().analyze_sheet(SheetData(name="R", grid=grid))
    assert analysis.sheet_name == "R"
    # 헤더 폭(2)에 맞춰 처리되어 예외 없이 분석이 완료된다.
    assert "매출" in analysis.column_dtypes


def test_dedupe_avoids_recollision():
    # L7 회귀: 생성한 접미사명이 원본과 재충돌하지 않게 증분
    assert _dedupe(["a", "a"]) == ["a", "a.1"]
    result = _dedupe(["a", "a.1", "a"])
    assert len(set(result)) == len(result)  # 전부 유일
    assert result == ["a", "a.1", "a.2"]
