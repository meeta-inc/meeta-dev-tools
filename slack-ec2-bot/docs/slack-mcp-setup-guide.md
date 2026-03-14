# Slack MCP 서버 설정 절차서

> Claude Code에서 Slack 워크스페이스의 채널을 읽고 분석할 수 있도록 설정하는 가이드입니다.
> 사용 패키지: [korotovsky/slack-mcp-server](https://github.com/korotovsky/slack-mcp-server)

---

## 사전 준비

- [ ] Slack 워크스페이스 관리자 권한 (또는 앱 설치 승인 가능한 권한)
- [ ] Node.js 설치 확인: `node -v`
- [ ] npx 사용 가능 확인: `npx --version`

---

## 1단계: Slack App 생성

1. 브라우저에서 https://api.slack.com/apps 접속
2. **Create New App** 클릭
3. **From an app manifest** 선택 (권장 — scope를 자동으로 설정해줌)
4. 워크스페이스 선택 후 **Next**
5. 포맷을 **JSON** 탭으로 전환하고, 아래 내용을 붙여넣기:

```json
{
    "display_information": {
        "name": "Slack MCP"
    },
    "oauth_config": {
        "scopes": {
            "user": [
                "channels:history",
                "channels:read",
                "groups:history",
                "groups:read",
                "im:history",
                "im:read",
                "im:write",
                "mpim:history",
                "mpim:read",
                "mpim:write",
                "users:read",
                "chat:write",
                "search:read",
                "usergroups:read",
                "usergroups:write"
            ]
        }
    },
    "settings": {
        "org_deploy_enabled": false,
        "socket_mode_enabled": false,
        "token_rotation_enabled": false
    }
}
```

6. **Next** → **Create** 클릭

> **참고:** manifest 대신 수동으로 만들려면 [부록 A](#부록-a-수동으로-scope-추가하기)를 참고하세요.

---

## 2단계: 앱 설치 및 토큰 발급

1. 앱 생성 후 **Settings** 화면에서 좌측 메뉴 **OAuth & Permissions** 클릭
2. **Install to Workspace** (또는 **Install to \<워크스페이스명\>**) 클릭
3. 권한 승인 화면에서 **허용** 클릭
4. **User OAuth Token** 값을 복사 (⚠️ `xoxp-`로 시작하는 토큰)

```
xoxp-YOUR-TOKEN-HERE
```

> ⚠️ **주의:** 이 토큰은 비밀번호와 동일한 민감 정보입니다. 절대 Git에 커밋하거나 공유하지 마세요.

---

## 3단계: Claude Code에 MCP 서버 등록

터미널에서 아래 명령어를 실행합니다:

```bash
claude mcp add slack-mcp \
  -t stdio \
  -e SLACK_MCP_XOXP_TOKEN=xoxp-여기에-토큰-붙여넣기 \
  -- npx -y slack-mcp-server@latest --transport stdio
```

### 등록 확인

```bash
claude mcp list
```

출력에 `slack-mcp`가 표시되면 성공입니다.

---

## 4단계: 동작 확인

Claude Code를 새로 시작한 뒤 아래처럼 테스트합니다:

```
> Slack 채널 목록을 보여줘
> #general 채널의 최근 메시지를 읽어줘
```

정상적으로 채널 목록과 메시지가 표시되면 설정 완료입니다.

---

## (선택) 메시지 전송 기능 활성화

기본 설정은 **읽기 전용**입니다. 메시지 전송이 필요하면 등록 시 환경변수를 추가합니다:

```bash
# 기존 등록 제거 후 재등록
claude mcp remove slack-mcp

# 전체 채널에 메시지 전송 허용
claude mcp add slack-mcp \
  -t stdio \
  -e SLACK_MCP_XOXP_TOKEN=xoxp-여기에-토큰 \
  -e SLACK_MCP_ADD_MESSAGE_TOOL=true \
  -- npx -y slack-mcp-server@latest --transport stdio

# 또는 특정 채널만 허용 (채널 ID로 제한)
claude mcp add slack-mcp \
  -t stdio \
  -e SLACK_MCP_XOXP_TOKEN=xoxp-여기에-토큰 \
  -e SLACK_MCP_ADD_MESSAGE_TOOL=C채널ID1,C채널ID2 \
  -- npx -y slack-mcp-server@latest --transport stdio
```

---

## 사용 가능한 기능 요약

| 기능 | 설명 | 기본 활성화 |
|------|------|:-----------:|
| `channels_list` | 채널 목록 조회 | ✅ |
| `conversations_history` | 채널 메시지 읽기 | ✅ |
| `conversations_replies` | 스레드 메시지 읽기 | ✅ |
| `conversations_search_messages` | 메시지 검색 | ✅ |
| `conversations_unreads` | 읽지 않은 메시지 조회 | ✅ |
| `users_search` | 사용자 검색 | ✅ |
| `usergroups_list` | 사용자 그룹 조회 | ✅ |
| `conversations_add_message` | 메시지 전송 | ❌ (수동 활성화) |
| `reactions_add` / `reactions_remove` | 이모지 반응 | ❌ (수동 활성화) |

---

## 문제 해결

### MCP 서버가 시작되지 않는 경우

```bash
# npx 캐시 초기화 후 재시도
npx -y slack-mcp-server@latest --transport stdio
```

에러 메시지를 확인하고, 토큰이 올바른지 검증합니다.

### "missing_scope" 에러가 나는 경우

Slack App의 **OAuth & Permissions** → **User Token Scopes**에 필요한 scope가 모두 추가되어 있는지 확인하세요.
scope 추가 후에는 반드시 **Reinstall to Workspace**를 해야 반영됩니다.

### 토큰 갱신이 필요한 경우

`xoxp` 토큰은 앱을 재설치하지 않는 한 만료되지 않습니다.
토큰이 무효화된 경우 **OAuth & Permissions** → **Reinstall to Workspace**로 새 토큰을 발급받으세요.

### MCP 서버 제거

```bash
claude mcp remove slack-mcp
```

---

## 부록 A: 수동으로 Scope 추가하기

manifest를 사용하지 않고 수동으로 앱을 만드는 경우:

1. https://api.slack.com/apps → **Create New App** → **From scratch**
2. 앱 이름 입력 (예: `Slack MCP`) → 워크스페이스 선택 → **Create App**
3. 좌측 메뉴 **OAuth & Permissions** 클릭
4. **User Token Scopes** 섹션에서 **Add an OAuth Scope** 클릭
5. 아래 scope를 하나씩 추가:

| Scope | 용도 |
|-------|------|
| `channels:read` | 공개 채널 목록 조회 |
| `channels:history` | 공개 채널 메시지 읽기 |
| `groups:read` | 비공개 채널 목록 조회 |
| `groups:history` | 비공개 채널 메시지 읽기 |
| `im:read` | DM 목록 조회 |
| `im:history` | DM 메시지 읽기 |
| `im:write` | DM 시작 |
| `mpim:read` | 그룹 DM 목록 조회 |
| `mpim:history` | 그룹 DM 메시지 읽기 |
| `mpim:write` | 그룹 DM 시작 |
| `users:read` | 사용자 정보 조회 |
| `chat:write` | 메시지 전송 |
| `search:read` | 메시지 검색 |
| `usergroups:read` | 사용자 그룹 조회 |
| `usergroups:write` | 사용자 그룹 관리 |

6. **Install to Workspace** → 권한 승인 → 토큰 복사

---

## 참고 링크

- [slack-mcp-server GitHub](https://github.com/korotovsky/slack-mcp-server)
- [Slack API Apps 관리](https://api.slack.com/apps)
- [Claude Code MCP 설정 문서](https://docs.anthropic.com/en/docs/claude-code/mcp)
