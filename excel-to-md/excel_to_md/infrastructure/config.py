"""인프라: 실행 설정(Config) — 입력/출력 경로와 실행 날짜."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path


@dataclass(frozen=True)
class Config:
    """CLI 실행 1회의 설정값(불변)."""

    input_dir: Path
    output_dir: Path
    run_date: str  # YYYY-MM-DD

    @staticmethod
    def create(input_dir: str, output_dir: str, run_date: str | None = None) -> "Config":
        """문자열 경로로부터 Config 생성. run_date 미지정 시 오늘 날짜.

        run_date 는 출력 경로(`output/<run_date>/...`)의 일부가 되므로
        엄격히 YYYY-MM-DD 형식만 허용한다(경로 traversal 차단 — C-9 입력검증).
        """
        validated = _validate_run_date(run_date) if run_date else date.today().isoformat()
        return Config(
            input_dir=Path(input_dir),
            output_dir=Path(output_dir),
            run_date=validated,
        )

    def workbook_output_dir(self, stem: str) -> Path:
        """파일별 출력 폴더: output/<YYYY-MM-DD>/<파일명(확장자제외)>/."""
        return self.output_dir / self.run_date / stem


def _validate_run_date(value: str) -> str:
    """run_date 가 정확히 YYYY-MM-DD 인지 검증(아니면 ValueError)."""
    # date.fromisoformat 는 '../..' 같은 경로 조각·구분자 변형을 모두 거부한다.
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"--date 는 YYYY-MM-DD 형식이어야 합니다: {value!r}") from exc
    return parsed.isoformat()
