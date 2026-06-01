"""어댑터: LlmNarrator — LLM 서술 인사이트(c) 생성.

C-9 준수: API 키는 **환경변수**에서만 읽는다(평문 하드코딩 금지).
키가 없으면 graceful skip — (None, 사유) 를 반환해 결정적 분석(a·b)을 보존한다.

기본 제공자는 Anthropic Messages API(HTTP, 표준 라이브러리 urllib 사용 → 추가 의존 0).
테스트 용이성을 위해 http_post 콜러블을 주입할 수 있다.
"""
from __future__ import annotations

import json
import os
from typing import Callable

from ..domain.models import AnalysisResult, SheetAnalysis

# 환경변수 이름(값은 절대 코드에 두지 않는다 — C-9)
_ENV_API_KEY = "ANTHROPIC_API_KEY"
_ENV_MODEL = "EXCEL_TO_MD_LLM_MODEL"
_DEFAULT_MODEL = "claude-haiku-4-5"
_API_URL = "https://api.anthropic.com/v1/messages"
_MAX_TOKENS = 700

# http_post(url, headers, body) -> 응답 본문(str)
HttpPost = Callable[[str, dict, bytes], str]


class LlmNarrator:
    """Narrator 포트 구현. 키 부재 시 graceful skip."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        http_post: HttpPost | None = None,
    ) -> None:
        # 생성 시점에 환경변수에서 키를 해석(주입 우선)
        self._api_key = api_key if api_key is not None else os.environ.get(_ENV_API_KEY)
        self._model = model or os.environ.get(_ENV_MODEL, _DEFAULT_MODEL)
        self._http_post = http_post or _default_http_post

    def narrate(self, analysis: AnalysisResult) -> tuple[str | None, str | None]:
        if not self._api_key:
            return None, f"{_ENV_API_KEY} 미설정"
        try:
            prompt = _build_prompt(analysis)
            text = self._call_llm(prompt)
            return text.strip(), None
        except Exception as exc:  # 호출 실패는 분석 전체를 막지 않는다
            # md 에는 예외 타입만 축약 기재(HTTP 응답 본문 등 원문 노출 방지).
            return None, f"LLM 호출 실패: {type(exc).__name__}"

    def _call_llm(self, prompt: str) -> str:
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = json.dumps(
            {
                "model": self._model,
                "max_tokens": _MAX_TOKENS,
                "messages": [{"role": "user", "content": prompt}],
            }
        ).encode("utf-8")
        raw = self._http_post(_API_URL, headers, body)
        data = json.loads(raw)
        # 에러 JSON / 빈 content 등 예상 밖 shape 를 명시적으로 거른다.
        if isinstance(data, dict) and data.get("error"):
            raise ValueError(f"API 오류 응답: {data['error']}")
        content = data.get("content") if isinstance(data, dict) else None
        if not isinstance(content, list) or not content:
            raise ValueError("API 응답에 content 가 없음")
        text = content[0].get("text")
        if not isinstance(text, str):
            raise ValueError("API 응답 content[0].text 누락")
        return text


def _build_prompt(analysis: AnalysisResult) -> str:
    """분석 결과를 LLM 입력 프롬프트로 직렬화(한국어 인사이트 요청)."""
    lines = [
        "다음은 한 엑셀 워크북의 구조·통계 분석 결과다.",
        "데이터의 특징·주목할 점·이상치의 의미를 3~5문장의 한국어로 요약하라.",
        "추측은 피하고 수치 근거에 기반하라.",
        "",
        f"파일: {analysis.source_path}",
        f"시트 수: {len(analysis.sheets)}",
    ]
    for sheet in analysis.sheets:
        lines.append(_summarize_sheet(sheet))
    return "\n".join(lines)


def _summarize_sheet(sheet: SheetAnalysis) -> str:
    """시트 1개의 핵심 수치를 한 줄로 요약."""
    parts = [
        f"- [{sheet.sheet_name}] {sheet.n_rows}행x{sheet.n_cols}열",
        f"병합 {sheet.merged_count}, 수식 {sheet.formula_count}, 이미지 {sheet.image_count}",
    ]
    for stats in sheet.column_stats:
        parts.append(
            f"컬럼'{stats.name}'(평균 {stats.mean}, 최소 {stats.min_value}, "
            f"최대 {stats.max_value}, IQR이상치 {len(stats.outliers_iqr)})"
        )
    return "; ".join(parts)


def _default_http_post(url: str, headers: dict, body: bytes) -> str:
    """표준 라이브러리 urllib 기반 POST(추가 의존 없음).

    HTTPError(4xx/5xx)는 응답 본문(에러 JSON)을 메시지에 담아 진단성을 높인다.
    """
    import urllib.error
    import urllib.request

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
