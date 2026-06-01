"""보고서 조립 — 순수 함수.

분석 결과(상단)와 시트별 마크다운 표(하단)를 하나의 `.md` 문서 문자열로 합친다.
외부 라이브러리 의존 없음(domain 레이어 규칙).
완성 이미지: "MD = 상단 분석요약 + 하단 시트별 표(동일 파일)".
"""
from __future__ import annotations

from .models import AnalysisResult, ColumnStats, ConversionResult, SheetAnalysis


def _format_number(value: float | None) -> str:
    """통계 수치를 사람이 읽기 좋게 포매팅(None 은 '-')."""
    if value is None:
        return "-"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return f"{value:.4g}"


def _render_column_stats(stats: ColumnStats) -> list[str]:
    """수치 컬럼 1개의 통계/이상치 라인을 생성."""
    lines = [
        f"| `{stats.name}` | {stats.count} | {_format_number(stats.mean)} | "
        f"{_format_number(stats.std)} | {_format_number(stats.min_value)} | "
        f"{_format_number(stats.max_value)} | {len(stats.outliers_iqr)} | "
        f"{len(stats.outliers_zscore)} |"
    ]
    return lines


def _render_sheet_analysis(sheet: SheetAnalysis) -> list[str]:
    """시트 1개의 구조요약(a) + 통계표(b)를 마크다운 라인으로."""
    lines: list[str] = [
        f"### 시트: `{sheet.sheet_name}`",
        "",
        f"- 행 수: **{sheet.n_rows}**, 열 수: **{sheet.n_cols}**",
        f"- 병합 셀: **{sheet.merged_count}**개, "
        f"수식 셀: **{sheet.formula_count}**개, "
        f"이미지: **{sheet.image_count}**개",
    ]
    if sheet.column_dtypes:
        dtype_str = ", ".join(
            f"`{col}`={dt}" for col, dt in sheet.column_dtypes.items()
        )
        lines.append(f"- 컬럼 타입: {dtype_str}")
    if sheet.column_stats:
        lines += [
            "",
            "| 컬럼 | 개수 | 평균 | 표준편차 | 최소 | 최대 | IQR이상치 | Z이상치 |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
        for stats in sheet.column_stats:
            lines += _render_column_stats(stats)
    lines.append("")
    return lines


def _render_analysis_section(analysis: AnalysisResult) -> list[str]:
    """상단 분석요약 섹션 전체(a+b+c)."""
    lines = ["# 📊 분석 요약", ""]
    for sheet in analysis.sheets:
        lines += _render_sheet_analysis(sheet)
    lines += ["## 🧠 LLM 인사이트", ""]
    if analysis.narrative:
        lines += [analysis.narrative, ""]
    else:
        reason = analysis.narrative_skipped_reason or "API 키 미설정"
        lines += [f"_(LLM 생략 — {reason})_", ""]
    return lines


def compose_document(
    analysis: AnalysisResult, conversion: ConversionResult
) -> str:
    """분석요약 + 시트별 표를 하나의 마크다운 문서로 합쳐 반환."""
    lines = _render_analysis_section(analysis)
    lines += ["---", "", "# 📄 시트별 데이터", ""]
    for sheet_md in conversion.sheets:
        # 시트명을 백틱으로 감싸 `#`/`>` 등 마크다운 특수문자가 든 이름도 헤딩이 깨지지 않게 한다.
        lines += [f"## `{sheet_md.sheet_name}`", "", sheet_md.table_markdown, ""]
    return "\n".join(lines).rstrip() + "\n"
