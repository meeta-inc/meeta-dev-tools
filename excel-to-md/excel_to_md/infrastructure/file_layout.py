"""인프라: FileLayout — 입력 스캔 + 출력 폴더/raw 사본/md 쓰기.

I/O 레이아웃(User 확정 사양 #4):
  input/ 의 모든 엑셀 스캔
    → output/<YYYY-MM-DD>/<파일명(확장자제외)>/
      → raw 엑셀 사본 + 동일명 .md (+ assets/ 이미지)
"""
from __future__ import annotations

import shutil
from pathlib import Path

# 스캔 대상 확장자
_EXCEL_SUFFIXES = {".xlsx", ".xlsm", ".xls"}


class FileLayout:
    """파일 시스템 입출력 담당(side-effect 격리)."""

    def discover_inputs(self, input_dir: Path) -> list[Path]:
        """input_dir 에서 엑셀 파일을 정렬된 목록으로 수집(임시파일 제외)."""
        if not input_dir.is_dir():
            return []
        files = [
            p
            for p in sorted(input_dir.iterdir())
            if p.is_file()
            and p.suffix.lower() in _EXCEL_SUFFIXES
            and not p.name.startswith("~$")  # 엑셀 임시 잠금파일 제외
        ]
        return files

    def prepare_output_dir(self, out_dir: Path) -> Path:
        """파일별 출력 폴더 생성(존재 시 재사용)."""
        out_dir.mkdir(parents=True, exist_ok=True)
        return out_dir

    def copy_raw(self, src: Path, out_dir: Path) -> Path:
        """원본 엑셀을 출력 폴더로 복사(메타데이터 보존)."""
        dest = out_dir / src.name
        shutil.copy2(src, dest)
        return dest

    def write_markdown(self, out_dir: Path, stem: str, content: str) -> Path:
        """동일 파일명 .md 를 출력 폴더에 쓴다(UTF-8)."""
        dest = out_dir / f"{stem}.md"
        dest.write_text(content, encoding="utf-8")
        return dest

    def assets_dir(self, out_dir: Path) -> Path:
        """이미지 등 자산 출력 경로(생성은 추출 시점에)."""
        return out_dir / "assets"
