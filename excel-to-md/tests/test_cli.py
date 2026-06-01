"""CLI 오케스트레이션 테스트 — run()/main() + 빈 입력 + --date 검증."""
from __future__ import annotations

import logging
from pathlib import Path

import pytest

from excel_to_md.cli import build_engine, main, run
from excel_to_md.infrastructure.config import Config

from .fixtures import build_sample_workbook


def test_run_empty_input(tmp_path: Path, caplog):
    cfg = Config.create(str(tmp_path / "input"), str(tmp_path / "out"), "2026-06-01")
    with caplog.at_level(logging.WARNING, logger="excel_to_md"):
        code = run(cfg, build_engine(use_llm=False))
    assert code == 0
    assert any("입력 엑셀이 없습니다" in r.message for r in caplog.records)


def test_run_processes_sample(tmp_path: Path, caplog):
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    build_sample_workbook(input_dir / "s.xlsx")
    cfg = Config.create(str(input_dir), str(tmp_path / "out"), "2026-06-01")
    with caplog.at_level(logging.INFO, logger="excel_to_md"):
        code = run(cfg, build_engine(use_llm=False))
    assert code == 0
    assert any(r.message.startswith("[OK]") for r in caplog.records)


def test_main_with_argv(tmp_path: Path):
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    build_sample_workbook(input_dir / "s.xlsx")
    code = main([
        "--input", str(input_dir),
        "--output", str(tmp_path / "out"),
        "--date", "2026-06-01",
        "--no-llm",
    ])
    assert code == 0
    assert (tmp_path / "out" / "2026-06-01" / "s" / "s.md").exists()


def test_main_rejects_bad_date(tmp_path: Path):
    # CRITICAL 회귀: 경로 traversal 시도 --date 는 거부(exit 2)
    code = main([
        "--input", str(tmp_path),
        "--output", str(tmp_path / "out"),
        "--date", "../../../../tmp/evil",
        "--no-llm",
    ])
    assert code == 2


def test_config_rejects_non_date():
    with pytest.raises(ValueError):
        Config.create("in", "out", "not-a-date")


def test_engine_readers_are_immutable():
    # M1 회귀: Engine.readers 는 tuple — 내용물 변형(append) 이 거부되어야 한다.
    eng = build_engine(use_llm=False)
    assert isinstance(eng.readers, tuple)
    with pytest.raises(AttributeError):
        eng.readers.append("ROGUE")  # type: ignore[attr-defined]
