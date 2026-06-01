"""포트(인터페이스) 정의 — 유스케이스가 의존하는 추상.

클린아키텍처 규칙: 유스케이스는 구체 어댑터가 아니라 이 Protocol 에만 의존한다.
어댑터(adapters/*)가 이 Protocol 을 구현한다(덕 타이핑, 상속 불필요).
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from ..domain.models import (
    AnalysisResult,
    SheetAnalysis,
    SheetData,
    SheetMarkdown,
    WorkbookData,
)


class WorkbookReader(Protocol):
    """엑셀 파일을 읽어 WorkbookData 로 변환하는 포트."""

    def supports(self, path: Path) -> bool:
        """이 리더가 해당 확장자를 처리할 수 있는지."""
        ...

    def read(self, path: Path, assets_dir: Path | None = None) -> WorkbookData:
        """워크북을 읽어 도메인 모델로 반환(이미지는 assets_dir 로 추출)."""
        ...


class MarkdownRenderer(Protocol):
    """SheetData 를 마크다운 표 문자열로 렌더링하는 포트."""

    def render_sheet(self, sheet: SheetData) -> SheetMarkdown:
        ...


class StatsEngine(Protocol):
    """시트의 통계/이상치(b)를 산출하는 포트."""

    def analyze_sheet(self, sheet: SheetData) -> SheetAnalysis:
        ...


class Narrator(Protocol):
    """LLM 서술 인사이트(c)를 생성하는 포트.

    키 부재/실패 시 narrate 는 None 을 반환하고 reason 을 채워야 한다.
    """

    def narrate(self, analysis: AnalysisResult) -> tuple[str | None, str | None]:
        """(서술문 or None, 생략사유 or None) 튜플 반환."""
        ...
