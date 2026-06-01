"""유스케이스: AnalyzeWorkbook — 구조요약(a)+통계(b)+LLM 서술(c) 오케스트레이션."""
from __future__ import annotations

from ..domain.models import AnalysisResult, WorkbookData
from .ports import Narrator, StatsEngine


class AnalyzeWorkbook:
    """WorkbookData → AnalysisResult.

    - a(구조)+b(통계): StatsEngine 포트가 시트별로 산출.
    - c(LLM 서술): Narrator 포트가 생성하되, 키 부재 시 graceful skip.
    Narrator 가 None 을 주입하면 비-LLM 분석(a·b)은 항상 보존된다.
    """

    def __init__(self, stats_engine: StatsEngine, narrator: Narrator | None = None) -> None:
        self._stats_engine = stats_engine
        self._narrator = narrator

    def execute(self, workbook: WorkbookData) -> AnalysisResult:
        sheet_analyses = tuple(
            self._stats_engine.analyze_sheet(sheet) for sheet in workbook.sheets
        )
        # a·b 가 완성된 1차 결과 — c 는 이 위에 덧붙인다.
        result = AnalysisResult(
            source_path=workbook.source_path, sheets=sheet_analyses
        )
        if self._narrator is None:
            return AnalysisResult(
                source_path=result.source_path,
                sheets=result.sheets,
                narrative=None,
                narrative_skipped_reason="Narrator 미주입",
            )
        narrative, reason = self._narrator.narrate(result)
        return AnalysisResult(
            source_path=result.source_path,
            sheets=result.sheets,
            narrative=narrative,
            narrative_skipped_reason=reason,
        )
