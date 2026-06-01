"""도메인 예외 계층 — 명시적 에러처리를 위한 커스텀 예외."""
from __future__ import annotations


class ExcelToMdError(Exception):
    """본 툴의 모든 예외의 최상위 베이스."""


class UnsupportedFormatError(ExcelToMdError):
    """지원하지 않는 파일 형식(.xlsx/.xls 외)일 때."""


class WorkbookReadError(ExcelToMdError):
    """워크북 읽기 실패(손상·암호화·라이브러리 오류 등)."""
