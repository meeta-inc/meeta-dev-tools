# excel-to-md

엑셀(`.xlsx`/`.xls`)을 받아 **① 시트별 Markdown 표 변환** + **② 분석(구조요약·통계/이상치·LLM 서술)** 을 산출하는 재사용 Python 툴입니다. 클린아키텍처로 구성되어 있어 라이브러리로 임포트하거나 CLI 로 일괄 변환할 수 있습니다.

> 출처: 인프라팀 P-08 `p08-excel-to-md-engine` (2026-06-01). MeetA dev-tools 모노레포 최상위 툴.

## 무엇을 하나

- `input/` 폴더의 **모든 엑셀**을 스캔 → 파일별로
  `output/<YYYY-MM-DD>/<파일명(확장자제외)>/` 폴더 생성
  → 그 안에 **원본 엑셀 사본 + 동일 파일명 `.md`** (+ 추출 이미지 `assets/`) 배치.
- 생성되는 `.md` = **상단 분석요약** + **하단 시트별 데이터 표** (동일 파일).
- 변환 범위: **멀티시트 · 병합셀 · 수식(캐시값/폴백) · 임베드 이미지**.

## 설치

Python 3.10+ 필요. (개발 환경에는 `pip` 대신 [`uv`](https://github.com/astral-sh/uv) 사용 가능)

```bash
# 가상환경 + 의존성 (uv)
uv venv .venv
uv pip install --python .venv/bin/python -e ".[dev]"

# 또는 표준 pip
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

런타임 의존성(Phase 0 실측으로 확정): `openpyxl`, `pandas`, `Pillow`, `xlrd`.

## 사용법

```bash
# input/ 의 모든 엑셀을 변환
python -m excel_to_md --input ./input --output ./output

# 옵션
python -m excel_to_md --input ./in --output ./out --date 2026-06-01 --no-llm
```

| 옵션 | 설명 |
|------|------|
| `--input` | 입력 폴더(엑셀 스캔, 필수) |
| `--output` | 출력 루트 폴더(필수) |
| `--date` | 실행 날짜 `YYYY-MM-DD` (기본=오늘) |
| `--no-llm` | LLM 서술(c) 비활성화 |

### 출력 예시

```
output/2026-06-01/sales-report/
├── sales-report.xlsx      # 원본 사본
├── sales-report.md        # 분석요약 + 시트별 표
└── assets/
    └── 월별매출_img1.png   # 추출된 임베드 이미지
```

## 분석 항목 (a + b + c)

| 구분 | 내용 |
|------|------|
| **a. 구조요약** | 시트명 · 행/열 수 · 컬럼 dtype · 병합셀 수 · 수식셀 수 · 이미지 수 |
| **b. 통계/이상치** | 수치 컬럼 개수·평균·표준편차·최소·최대 + **IQR**(Q1-1.5·IQR / Q3+1.5·IQR) · **z-score**(\|z\|>3) 이상치 |
| **c. LLM 서술** | 데이터 인사이트 요약. **API 키 부재 시 graceful skip** → `_(LLM 생략 — …)_` 표기. 결정적 분석(a·b)은 항상 산출 |

### LLM 설정 (c) — 보안

API 키는 **환경변수로만** 주입합니다(평문 하드코딩 금지). `.env.example` 참고:

```bash
ANTHROPIC_API_KEY=          # 미설정 시 LLM 생략(a·b 는 항상 동작)
EXCEL_TO_MD_LLM_MODEL=      # 선택, 기본 claude-haiku-4-5
```

`.env` 는 절대 커밋하지 않습니다(`.gitignore` 등록).

## 아키텍처 (클린아키텍처)

```
excel_to_md/
├── domain/          # 순수 모델·규칙 (외부 의존 0)
│   ├── models.py    #   WorkbookData·SheetData·CellGrid·AnalysisResult·ConversionResult …
│   ├── report.py    #   분석요약 + 표 → 최종 MD 문서 조립(순수 함수)
│   └── errors.py
├── usecases/        # 포트에만 의존하는 애플리케이션 규칙
│   ├── ports.py     #   WorkbookReader · MarkdownRenderer · StatsEngine · Narrator (Protocol)
│   ├── convert_workbook.py
│   └── analyze_workbook.py
├── adapters/        # 구체 구현
│   ├── xlsx_reader.py    #   openpyxl: 시트·병합셀·수식·이미지
│   ├── xls_reader.py     #   xlrd: 레거시 .xls (best-effort)
│   ├── markdown_writer.py#   시트 → GFM 표(병합 펼침·수식 폴백·이스케이프)
│   ├── stats_analyzer.py #   pandas: dtype·describe·IQR/zscore
│   └── llm_narrator.py   #   LLM 서술(env 키, graceful skip)
├── infrastructure/  # 파일시스템·설정
│   ├── file_layout.py    #   input 스캔 + output/<date>/<name>/ + raw 복사 + md 쓰기
│   └── config.py
├── cli.py           # 진입점(의존성 조립)
└── __main__.py
```

**의존성 방향**: `cli → infrastructure/usecases → adapters → domain`.
**domain 은 누구에게도 의존하지 않습니다.** 어댑터 교체(예: 다른 LLM)는 포트 구현만 바꾸면 됩니다.

## 테스트

```bash
.venv/bin/python -m pytest --cov=excel_to_md --cov-report=term-missing
```

- 멀티시트·병합셀·수식·이미지 포함 샘플 `.xlsx` 를 **프로그램으로 생성**(`tests/fixtures.py`)해 사용.
- 단위 테스트(convert / analyze / file-layout / reader / narrator / cli) + **round-trip**(xlsx→읽기→MD 셀값 일치) 검증.
- 현재 41 테스트 / 핵심 usecase·adapter 합리적 커버리지(전체 93%).

## Phase 0 — 라이브러리 선정 근거 (실측)

손수 파서를 짜는 대신 후보를 **실제 설치해 작은 샘플로 실측 비교**했습니다(assume 금지).

| 판단축 | `markitdown` (MS) | **`openpyxl` + `pandas`** (채택) |
|--------|-------------------|----------------------------------|
| 병합셀 | ✗ 타이틀 행을 헤더로 오인식 → `Unnamed` 컬럼 발생 | ✓ `merged_cells.ranges` 정확 추출 |
| 수식 캐시값 | ✗ `NaN` 표기, 수식 미보존 | ✓ `data_only=True` 캐시값 + 수식 둘 다 |
| 임베드 이미지 | ✗ 미추출 | ✓ `ws._images` 추출 (Pillow 필요) |
| 통계/이상치 | ✗ 전무(표 변환만) | ✓ pandas `describe` + IQR/z-score |
| 구조요약 | ✗ | ✓ |

**결론**: `markitdown` 은 빠른 표 변환에는 쓸 수 있으나 분석(a·b·c)이 전무하고 병합셀을 오인식해 **주 엔진으로 부적합**. `openpyxl + pandas` 가 4개 축을 모두 충족하여 채택. 보조로 `Pillow`(이미지 추출), `xlrd`(레거시 `.xls`)를 둡니다.

### 알려진 제약

- **수식 캐시값**: `openpyxl` 로 *생성*한 파일은 `<v>` 캐시가 없어 `data_only=True` 시 `None`. Excel/LibreOffice 가 저장한 파일은 캐시가 존재합니다. 캐시가 없으면 MD 에 **수식 문자열로 폴백**합니다(예: `=SUM(B3:B8)`).
- **헤더 추론**: 통계(b)는 첫 데이터 행을 헤더로 봅니다. 풀폭 병합 타이틀 행은 자동으로 건너뜁니다. 구조요약(a) 카운트는 헤더 추론과 무관하게 항상 정확합니다.
- **`.xls` 레거시**: `xlrd` 경유 best-effort — 셀 캐시값·병합셀까지. 수식/이미지 추출은 미지원.
- **이미지 추출 불가** 시: MD 에 `<!-- 이미지 추출 불가: … -->` placeholder + 주석으로 graceful 처리.
