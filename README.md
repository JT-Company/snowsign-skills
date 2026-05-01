# 스노우싸인 스킬과 MCP

Claude Code와 Codex에서 스노우싸인을 쉽게 쓰기 위한 Agent Skills와 MCP 서버입니다.

이 저장소를 설치하면 에이전트가 스노우싸인 계약을 조회하거나, API 연동 코드를 작성할 때 필요한 문서와 절차를 바로 참고할 수 있습니다.

## 설치 전 준비

설치에는 Node.js 18 이상이 필요합니다.

SnowSign API 키도 준비해 주세요. 키는 스노우싸인 웹 콘솔에서 발급합니다.

```text
조직관리 > API 키 > 새 API
```

## 설치하기

아래 명령어를 터미널에 붙여 넣으면 설치 화면이 열립니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install.sh | bash
```

설치 화면에서 다음 순서로 진행합니다.

1. 설치 구성을 선택합니다.
2. 설치 대상을 선택합니다.
3. SnowSign API 키를 입력합니다.

키를 입력하면 설치 스크립트가 현재 셸 설정 파일에 `SNOWSIGN_API_KEY`를 저장합니다.

- zsh: `~/.zshrc`
- bash: `~/.bashrc`
- 그 외: `~/.profile`

## 설치 구성

| 구성 | 설치 내용 | 추천 상황 |
|---|---|---|
| 개발용 | `snowsign-integration-architect` | API/웹훅 연동 설계, 구현 계획 작성 |
| 운영용 | MCP + `snowsign-contract-operator` | 계약 조회, 생성, 발송, 취소 같은 실제 업무 처리 |
| 전체 | MCP + 모든 스킬 | 개발과 운영을 모두 사용할 때 |

## 설치 대상

설치 대상은 네 가지 중에서 고릅니다.

| 대상 | 설명 |
|---|---|
| Claude Code | Claude Code 기본 스킬 경로에 설치 |
| Codex | Codex 기본 스킬 경로에 설치 |
| Claude Code + Codex | 양쪽에 모두 설치 |
| 직접 경로 입력 | 원하는 스킬 설치 경로를 직접 입력 |

직접 경로를 선택하면 스킬은 입력한 경로에 설치됩니다. MCP 자동 등록은 Claude Code, Codex, Claude Code + Codex 대상에서만 수행됩니다.

## 제공 스킬

| 스킬 | 용도 |
|---|---|
| `snowsign-contract-operator` | SnowSign 계약 조회, 생성, 발송, 취소, 리마인더, 다운로드를 API로 직접 처리합니다. |
| `snowsign-integration-architect` | SnowSign Public API와 웹훅을 ERP, 자체 서비스, 자동화 워크플로우에 연동하도록 설계합니다. |

## API 키 바꾸기

설치 후 API 키를 바꾸려면 셸 설정 파일의 `SNOWSIGN_API_KEY` 값을 수정합니다.

```bash
export SNOWSIGN_API_KEY="your_api_key"
```

수정한 뒤 새 터미널을 열거나 아래 명령어로 현재 터미널에 반영합니다.

```bash
source ~/.zshrc
```

bash를 사용한다면:

```bash
source ~/.bashrc
```

## 업데이트

이미 설치한 스킬을 최신 버전으로 바꾸려면 설치 명령어를 다시 실행하면 됩니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install.sh | bash
```

설치 스크립트는 같은 이름의 기존 스킬을 새 버전으로 교체합니다.

## MCP로 사용하기

MCP 서버는 위 두 스킬의 MCP 버전입니다. 에이전트가 SnowSign API를 도구로 직접 호출하고, API 문서 섹션도 도구로 확인할 수 있습니다.

MCP 서버도 Node.js 18 이상으로 실행됩니다. 별도 npm 패키지는 필요하지 않습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install-mcp.sh | bash
```

MCP 서버도 `SNOWSIGN_API_KEY` 환경변수를 사용합니다. 키는 스노우싸인 웹 콘솔의 `조직관리 > API 키 > 새 API`에서 발급합니다.

대표 도구는 다음과 같습니다.

| 도구 | 설명 |
|---|---|
| `snowsign_list_contracts` | 계약 목록 조회 |
| `snowsign_create_contract` | 계약 초안 생성 |
| `snowsign_send_contract` | 계약 발송 |
| `snowsign_cancel_contract` | 계약 취소 |
| `snowsign_list_templates` | 템플릿 목록 조회 |
| `snowsign_create_contract_from_template` | 템플릿으로 계약 초안 생성 |
| `snowsign_get_api_reference_section` | API 문서 섹션 확인 |

## 수동 설치

자동 설치가 어렵다면 저장소를 받은 뒤 직접 복사할 수 있습니다.

Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -R skills/* ~/.claude/skills/
```

Codex:

```bash
mkdir -p ~/.agents/skills
cp -R skills/* ~/.agents/skills/
```

MCP 서버 파일은 `mcp/snowsign_mcp.mjs`입니다.
