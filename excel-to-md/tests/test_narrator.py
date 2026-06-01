"""LlmNarrator(c) 테스트 — 키 부재 graceful skip + 주입 http_post 성공/실패."""
from __future__ import annotations

import json

from excel_to_md.adapters.llm_narrator import LlmNarrator
from excel_to_md.domain.models import AnalysisResult, SheetAnalysis

_ANALYSIS = AnalysisResult(
    source_path="x.xlsx",
    sheets=(SheetAnalysis("S", 5, 2, 1, 1, 0),),
)


def test_skips_when_no_api_key():
    narrator = LlmNarrator(api_key="")  # 명시적으로 키 없음
    text, reason = narrator.narrate(_ANALYSIS)
    assert text is None
    assert "미설정" in reason


def test_calls_llm_with_injected_http():
    def fake_post(url, headers, body):
        # Anthropic Messages API 응답 형태를 모사
        assert headers["x-api-key"] == "test-key"
        return json.dumps({"content": [{"text": "요약 인사이트"}]})

    narrator = LlmNarrator(api_key="test-key", http_post=fake_post)
    text, reason = narrator.narrate(_ANALYSIS)
    assert text == "요약 인사이트"
    assert reason is None


def test_http_failure_is_graceful():
    def boom(url, headers, body):
        raise RuntimeError("network down: 503 response body leak")

    narrator = LlmNarrator(api_key="k", http_post=boom)
    text, reason = narrator.narrate(_ANALYSIS)
    assert text is None
    # md 에는 예외 타입만 축약 기재 — 원문(응답 본문 등)은 노출되지 않는다(L4).
    assert reason == "LLM 호출 실패: RuntimeError"
    assert "response body leak" not in reason


def test_error_json_is_graceful():
    # API 가 에러 JSON 을 반환해도 a·b 를 막지 않고 graceful skip
    def err(url, headers, body):
        return json.dumps({"error": {"type": "invalid_request", "message": "bad"}})

    text, reason = LlmNarrator(api_key="k", http_post=err).narrate(_ANALYSIS)
    assert text is None
    # 에러 JSON 경로도 ValueError 로 잡혀 타입만 축약 기재(원문 미노출).
    assert reason == "LLM 호출 실패: ValueError"
    assert "bad" not in reason


def test_empty_content_is_graceful():
    def empty(url, headers, body):
        return json.dumps({"content": []})

    text, reason = LlmNarrator(api_key="k", http_post=empty).narrate(_ANALYSIS)
    assert text is None
    assert reason == "LLM 호출 실패: ValueError"
