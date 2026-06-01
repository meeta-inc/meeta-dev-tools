"""excel_to_md — 엑셀(.xlsx/.xls)을 시트별 마크다운 표 + 분석으로 변환하는 재사용 툴.

클린아키텍처 레이어:
- domain/         순수 모델·규칙(외부 의존 0)
- usecases/       포트에만 의존하는 애플리케이션 규칙
- adapters/       openpyxl/xlrd/pandas/LLM 구현
- infrastructure/ 파일시스템·설정
- cli.py          진입점(의존성 조립)
"""

__version__ = "0.1.0"
