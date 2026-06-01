"""XlsxReader 단위 테스트 — 병합셀·수식·이미지 추출 검증."""
from __future__ import annotations

from pathlib import Path

from excel_to_md.adapters.xlsx_reader import XlsxReader


def test_reads_all_sheets(workbook_data):
    # Arrange / Act
    names = [s.name for s in workbook_data.sheets]
    # Assert
    assert names == ["Sales", "Meta"]


def test_detects_merged_range(workbook_data):
    sales = workbook_data.sheets[0]
    refs = [r.ref for r in sales.merged_ranges]
    assert "A1:C1" in refs


def test_detects_formula(workbook_data):
    sales = workbook_data.sheets[0]
    # 수식 셀이 1개 이상 잡히고 SUM 을 포함
    formulas = list(sales.formulas.values())
    assert any(f.startswith("=SUM") for f in formulas)


def test_extracts_image_to_assets(sample_xlsx: Path, tmp_path: Path):
    # Arrange
    assets = tmp_path / "assets"
    # Act
    wb = XlsxReader().read(sample_xlsx, assets)
    images = wb.sheets[0].images
    # Assert: 이미지 1개가 assets/ 로 추출됨
    assert len(images) == 1
    assert images[0].extracted_path is not None
    saved = assets / Path(images[0].extracted_path).name
    assert saved.exists() and saved.stat().st_size > 0


def test_image_skipped_without_assets_dir(sample_xlsx: Path):
    # assets_dir 미지정 시 추출 생략 + note 기록(graceful)
    wb = XlsxReader().read(sample_xlsx, None)
    img = wb.sheets[0].images[0]
    assert img.extracted_path is None
    assert img.note is not None


def test_supports_extension():
    reader = XlsxReader()
    assert reader.supports(Path("a.xlsx"))
    assert not reader.supports(Path("a.csv"))
