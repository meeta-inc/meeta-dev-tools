#!/bin/bash
# =============================================================================
# git-sync-all.sh — 워크스페이스 전체 Git 레포지토리 동기화 상태 확인 및 최신화
# =============================================================================
# 사용법:
#   ./git-sync-all.sh                  # 상태 확인만 (기본)
#   ./git-sync-all.sh --pull           # 뒤처진 레포 자동 pull
#   ./git-sync-all.sh --pull --clean   # pull + dirty 레포에 stash 적용 후 pull
#   ./git-sync-all.sh --json           # JSON 형식 출력
#   ./git-sync-all.sh --dir /path      # 대상 디렉토리 지정
#   ./git-sync-all.sh --depth 3        # 탐색 깊이 지정 (기본: 3)
# =============================================================================

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 기본값
WORKSPACE_DIR="${HOME}/workspace"
MAX_DEPTH=3
DO_PULL=false
DO_CLEAN=false
JSON_OUTPUT=false
VERBOSE=false

# 카운터
TOTAL=0
SYNCED=0
BEHIND=0
AHEAD=0
DIVERGED=0
NO_TRACKING=0
DIRTY=0
PULL_SUCCESS=0
PULL_FAIL=0

# 인자 파싱
while [[ $# -gt 0 ]]; do
  case $1 in
    --pull)      DO_PULL=true; shift ;;
    --clean)     DO_CLEAN=true; shift ;;
    --json)      JSON_OUTPUT=true; shift ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --dir)       WORKSPACE_DIR="$2"; shift 2 ;;
    --depth)     MAX_DEPTH="$2"; shift 2 ;;
    --help|-h)
      echo "사용법: $0 [옵션]"
      echo ""
      echo "옵션:"
      echo "  --pull           뒤처진 레포를 자동으로 pull"
      echo "  --clean          dirty 레포에 stash 적용 후 pull (--pull 필요)"
      echo "  --json           JSON 형식으로 출력"
      echo "  --dir <경로>     대상 디렉토리 지정 (기본: ~/workspace)"
      echo "  --depth <숫자>   탐색 깊이 (기본: 3)"
      echo "  --verbose, -v    상세 출력"
      echo "  --help, -h       도움말"
      exit 0
      ;;
    *) echo "알 수 없는 옵션: $1"; exit 1 ;;
  esac
done

# JSON 배열 시작
JSON_ITEMS=()

log() {
  if [[ "$JSON_OUTPUT" == false ]]; then
    echo -e "$@"
  fi
}

log_verbose() {
  if [[ "$VERBOSE" == true && "$JSON_OUTPUT" == false ]]; then
    echo -e "  $@"
  fi
}

# 헤더 출력
log ""
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${BOLD}  Git 동기화 상태 확인 — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
log "${BOLD}  대상: ${WORKSPACE_DIR} (깊이: ${MAX_DEPTH})${NC}"
if [[ "$DO_PULL" == true ]]; then
  log "${BOLD}  모드: ${YELLOW}자동 Pull${NC}${BOLD} 활성화${NC}"
fi
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log ""

# 레포 찾기
REPOS=$(find "$WORKSPACE_DIR" -maxdepth "$MAX_DEPTH" -name ".git" -type d 2>/dev/null | sed 's|/\.git$||' | sort)

for repo_path in $REPOS; do
  TOTAL=$((TOTAL + 1))

  # 상대 경로 계산
  repo_name="${repo_path#$WORKSPACE_DIR/}"

  cd "$repo_path"

  # 기본 정보 수집
  branch=$(git branch --show-current 2>/dev/null || echo "HEAD-detached")
  remote_url=$(git remote get-url origin 2>/dev/null || echo "none")

  # 토큰이 포함된 URL 마스킹
  safe_url=$(echo "$remote_url" | sed -E 's|://[^@]+@|://***@|')

  # fetch
  git fetch --quiet 2>/dev/null || true

  # 트래킹 상태 확인
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null || echo "")

  if [[ -z "$upstream" ]]; then
    status_icon="${MAGENTA}[트래킹없음]${NC}"
    status_code="no_tracking"
    commits_behind=0
    commits_ahead=0
    NO_TRACKING=$((NO_TRACKING + 1))
  else
    commits_behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0)
    commits_ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0)

    if [[ "$commits_behind" -gt 0 && "$commits_ahead" -gt 0 ]]; then
      status_icon="${RED}[분기됨 ↓${commits_behind} ↑${commits_ahead}]${NC}"
      status_code="diverged"
      DIVERGED=$((DIVERGED + 1))
    elif [[ "$commits_behind" -gt 0 ]]; then
      status_icon="${YELLOW}[↓ ${commits_behind}개 뒤처짐]${NC}"
      status_code="behind"
      BEHIND=$((BEHIND + 1))
    elif [[ "$commits_ahead" -gt 0 ]]; then
      status_icon="${CYAN}[↑ ${commits_ahead}개 앞섬]${NC}"
      status_code="ahead"
      AHEAD=$((AHEAD + 1))
    else
      status_icon="${GREEN}[최신]${NC}"
      status_code="synced"
      SYNCED=$((SYNCED + 1))
    fi
  fi

  # dirty 상태 확인
  dirty_count=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  dirty_icon=""
  if [[ "$dirty_count" -gt 0 ]]; then
    dirty_icon=" ${RED}(변경 ${dirty_count}개)${NC}"
    DIRTY=$((DIRTY + 1))
  fi

  # 출력
  log "  ${BOLD}${repo_name}${NC} ${status_icon}${dirty_icon}"
  log_verbose "브랜치: ${branch} → ${upstream:-none}"
  log_verbose "원격: ${safe_url}"

  # Pull 실행
  pull_result=""
  if [[ "$DO_PULL" == true && "$commits_behind" -gt 0 && "$status_code" != "diverged" ]]; then
    if [[ "$dirty_count" -gt 0 ]]; then
      if [[ "$DO_CLEAN" == true ]]; then
        log "    ${BLUE}→ stash 저장 중...${NC}"
        git stash push -m "git-sync-all auto-stash $(date '+%Y%m%d-%H%M%S')" 2>/dev/null

        if git pull --ff-only 2>/dev/null; then
          log "    ${GREEN}→ pull 성공 (${commits_behind}개 커밋)${NC}"
          pull_result="success"
          PULL_SUCCESS=$((PULL_SUCCESS + 1))
        else
          log "    ${RED}→ pull 실패${NC}"
          pull_result="fail"
          PULL_FAIL=$((PULL_FAIL + 1))
        fi

        log "    ${BLUE}→ stash 복원 중...${NC}"
        git stash pop 2>/dev/null || log "    ${YELLOW}→ stash 충돌 발생, 수동 확인 필요${NC}"
      else
        log "    ${YELLOW}→ 변경사항이 있어 pull 건너뜀 (--clean 옵션 사용)${NC}"
        pull_result="skipped_dirty"
      fi
    else
      if git pull --ff-only 2>/dev/null; then
        log "    ${GREEN}→ pull 성공 (${commits_behind}개 커밋)${NC}"
        pull_result="success"
        PULL_SUCCESS=$((PULL_SUCCESS + 1))
      else
        log "    ${RED}→ pull 실패 (fast-forward 불가)${NC}"
        pull_result="fail"
        PULL_FAIL=$((PULL_FAIL + 1))
      fi
    fi
  fi

  # JSON 항목 추가
  if [[ "$JSON_OUTPUT" == true ]]; then
    json_item=$(cat <<JSONEOF
{
  "path": "${repo_name}",
  "branch": "${branch}",
  "upstream": "${upstream:-null}",
  "remote": "${safe_url}",
  "status": "${status_code}",
  "behind": ${commits_behind},
  "ahead": ${commits_ahead},
  "dirty": ${dirty_count},
  "pull_result": "${pull_result:-null}"
}
JSONEOF
)
    JSON_ITEMS+=("$json_item")
  fi

  cd "$WORKSPACE_DIR"
done

# JSON 출력
if [[ "$JSON_OUTPUT" == true ]]; then
  echo "{"
  echo "  \"timestamp\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
  echo "  \"workspace\": \"${WORKSPACE_DIR}\","
  echo "  \"summary\": {"
  echo "    \"total\": ${TOTAL},"
  echo "    \"synced\": ${SYNCED},"
  echo "    \"behind\": ${BEHIND},"
  echo "    \"ahead\": ${AHEAD},"
  echo "    \"diverged\": ${DIVERGED},"
  echo "    \"no_tracking\": ${NO_TRACKING},"
  echo "    \"dirty\": ${DIRTY}"
  echo "  },"
  echo "  \"repos\": ["
  for i in "${!JSON_ITEMS[@]}"; do
    if [[ $i -lt $((${#JSON_ITEMS[@]} - 1)) ]]; then
      echo "    ${JSON_ITEMS[$i]},"
    else
      echo "    ${JSON_ITEMS[$i]}"
    fi
  done
  echo "  ]"
  echo "}"
  exit 0
fi

# 요약 출력
log ""
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${BOLD}  요약 (총 ${TOTAL}개 레포지토리)${NC}"
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log ""
log "  ${GREEN}최신 상태:${NC}     ${SYNCED}개"
log "  ${YELLOW}뒤처짐 (pull):${NC} ${BEHIND}개"
log "  ${CYAN}앞섬 (push):${NC}   ${AHEAD}개"
log "  ${RED}분기됨:${NC}        ${DIVERGED}개"
log "  ${MAGENTA}트래킹없음:${NC}    ${NO_TRACKING}개"
log "  ${RED}변경사항:${NC}      ${DIRTY}개"

if [[ "$DO_PULL" == true ]]; then
  log ""
  log "  ${BOLD}Pull 결과:${NC}"
  log "  ${GREEN}성공:${NC} ${PULL_SUCCESS}개  ${RED}실패:${NC} ${PULL_FAIL}개"
fi

log ""

# 뒤처진 레포가 있고 pull 모드가 아닌 경우 안내
if [[ "$DO_PULL" == false && $((BEHIND + DIVERGED)) -gt 0 ]]; then
  log "  ${YELLOW}팁: ./git-sync-all.sh --pull 로 자동 최신화할 수 있습니다.${NC}"
  log ""
fi
