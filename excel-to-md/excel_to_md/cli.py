"""CLI 진입점 — 의존성 조립(composition root) + 파이프라인 실행.

의존성 방향: cli → infrastructure/usecases → adapters → domain.
여기서만 구체 어댑터를 생성해 유스케이스에 주입한다(클린아키텍처 조립 지점).
"""
from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass
from pathlib import Path

from .adapters.llm_narrator import LlmNarrator
from .adapters.markdown_writer import MarkdownTableWriter
from .adapters.stats_analyzer import PandasStatsAnalyzer
from .adapters.xls_reader import XlsReader
from .adapters.xlsx_reader import XlsxReader
from .domain.errors import ExcelToMdError
from .domain.report import compose_document
from .infrastructure.config import Config
from .infrastructure.file_layout import FileLayout
from .usecases.analyze_workbook import AnalyzeWorkbook
from .usecases.convert_workbook import ConvertWorkbook
from .usecases.ports import WorkbookReader

logger = logging.getLogger("excel_to_md")


@dataclass(frozen=True)
class Engine:
    """조립된 변환 엔진 — 단일 워크북 처리 단위를 제공(불변 composition root)."""

    readers: tuple[WorkbookReader, ...]  # WorkbookReader 구현 목록(불변)
    converter: ConvertWorkbook
    analyzer: AnalyzeWorkbook
    layout: FileLayout

    def process_one(self, src: Path, config: Config) -> Path:
        """엑셀 1개를 읽어 output/<date>/<name>/ 에 raw+md 생성, md 경로 반환."""
        reader = self._select_reader(src)
        out_dir = self.layout.prepare_output_dir(config.workbook_output_dir(src.stem))
        self.layout.copy_raw(src, out_dir)
        workbook = reader.read(src, self.layout.assets_dir(out_dir))
        analysis = self.analyzer.execute(workbook)
        conversion = self.converter.execute(workbook)
        document = compose_document(analysis, conversion)
        return self.layout.write_markdown(out_dir, src.stem, document)

    def _select_reader(self, src: Path):
        """확장자를 지원하는 첫 리더를 선택."""
        for reader in self.readers:
            if reader.supports(src):
                return reader
        raise ExcelToMdError(f"지원하지 않는 형식: {src.suffix} ({src.name})")


def build_engine(use_llm: bool = True) -> Engine:
    """기본 어댑터로 엔진을 조립(테스트는 직접 주입으로 대체 가능)."""
    narrator = LlmNarrator() if use_llm else None
    return Engine(
        readers=(XlsxReader(), XlsReader()),
        converter=ConvertWorkbook(MarkdownTableWriter()),
        analyzer=AnalyzeWorkbook(PandasStatsAnalyzer(), narrator),
        layout=FileLayout(),
    )


def run(config: Config, engine: Engine) -> int:
    """파이프라인 실행. 전부 성공이면 0, 일부 실패면 1을 반환.

    운영 로그는 `logging`("excel_to_md" 로거)로 발행한다(라이브러리로 임포트 시
    호출자가 레벨/핸들러를 제어 가능). 테스트는 caplog 로 캡처한다.
    """
    inputs = engine.layout.discover_inputs(config.input_dir)
    if not inputs:
        logger.warning("입력 엑셀이 없습니다: %s", config.input_dir)
        return 0
    ok = 0
    for src in inputs:
        try:
            md_path = engine.process_one(src, config)
            logger.info("[OK] %s → %s", src.name, md_path)
            ok += 1
        except ExcelToMdError as exc:
            logger.warning("[SKIP] %s: %s", src.name, exc)
        except Exception as exc:  # 한 파일 실패가 전체를 막지 않도록
            logger.error("[FAIL] %s: %s", src.name, exc)
    logger.info("완료: %d/%d 처리", ok, len(inputs))
    return 0 if ok == len(inputs) else 1


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="excel_to_md",
        description="엑셀(.xlsx/.xls)을 시트별 마크다운 표 + 분석으로 변환",
    )
    parser.add_argument("--input", required=True, help="입력 폴더(엑셀 스캔)")
    parser.add_argument("--output", required=True, help="출력 루트 폴더")
    parser.add_argument("--date", default=None, help="실행 날짜(YYYY-MM-DD, 기본=오늘)")
    parser.add_argument("--no-llm", action="store_true", help="LLM 서술(c) 비활성화")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    # CLI 단독 실행 시 사람이 읽도록 stdout 으로 INFO 출력 설정.
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        config = Config.create(args.input, args.output, args.date)
    except ValueError as exc:  # --date 형식 오류 등 입력 검증 실패
        logger.error("설정 오류: %s", exc)
        return 2
    engine = build_engine(use_llm=not args.no_llm)
    return run(config, engine)
