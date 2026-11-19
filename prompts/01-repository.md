# 01. 저장소와 에이전트 규칙

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `main`에 바로 커밋한다. 반영할 `main`이 아직 없어서 이 단계만 예외다 |
| 선행 | 00 |
| 읽을 문서 | DESIGN 전체를 한 번. 특히 [10장 에이전트 작업 환경](../docs/DESIGN.md#10-에이전트-작업-환경), [15장 결정 기록](../docs/DESIGN.md#15-결정-기록) |
| 쓸 스킬 | (설치하면) `intake`, `work-start` |

## 이 단계가 끝나면

- [ ] `git log`에 01단계의 커밋이 있고, 신원이 00단계에서 정한 값이다.
- [ ] `AGENTS.md`에 DESIGN 10.1절의 15개 장이 있고, 9장에 정책 상태 표와 정책을 바꾸는 절차가 있다.
- [ ] `CLAUDE.md`는 `@AGENTS.md` 한 줄이다.
- [ ] `.claude/settings.json`이 DESIGN 10.2절과 같다.
- [ ] `docs/`에 `DESIGN.md`, `DECISIONS.md`, `TASKS.md`, `test-plan.md`가 있다.
- [ ] `docs/READING.md`(빈 표)와 `docs/evidence/README.md`가 있다.
- [ ] 새 세션에서 규칙을 알고 있는지와 `data/` 편집이 거부되는지 시험했다(프롬프트 3).
- [ ] `.gitattributes`, `.gitignore`, `.editorconfig`가 있다.
- [ ] 포트폴리오 문서(`prompts/`, 루트의 `TASKS.md`, `docs/DESIGN.md`)는 바뀌지 않았다. 루트의 `README.md`에는 "앱" 절만 더해졌다.
- [ ] (선택) `.claude/skills/` 아래에 고른 스킬이 있고, git에는 들어가지 않는다.

## 순서

1. **사람** VS Code에 이 저장소가 열려 있고 `docs/DESIGN.md`와 `prompts/`가 있는지 본다. 설계는 복사하지 않는다. 앱이 같은 저장소에 생긴다.

2. **입력** 프롬프트 1.
3. **에이전트** 파일을 만들고, 커밋 전에 목록을 보이고, 커밋한다.
4. **확인**

   ```powershell
   git log --format="%h %an <%ae> %s"
   git status --short
   Get-Content CLAUDE.md
   ```

   01의 커밋이 있고, 작업 트리가 깨끗하고, `CLAUDE.md`가 한 줄이면 된다.

5. **검토 지점**
   - `AGENTS.md`를 처음부터 끝까지 읽는다. DESIGN에 없는 규칙이 들어갔으면 빼게 한다. 에이전트가 "보고만 한 것"으로 적은 항목은 넣을지 정한다.
   - `.claude/settings.json`의 `deny`에 푸시와 데이터 폴더가 있는지 본다.
   - 설계는 `docs/DESIGN.md` 하나다. 구현이 설계와 달라지면 같은 커밋에서 고친다.
6. **입력** (선택) 프롬프트 2로 스킬을 설치한다.
7. **입력** 새 세션을 열고 프롬프트 3으로 규칙이 실제로 걸리는지 시험한다.

## 프롬프트 1. 뼈대

```text
이 폴더에 앱 저장소의 뼈대를 만든다. 이 폴더에는 이미 설계(docs/DESIGN.md), 단계 프롬프트(prompts/), 포트폴리오 문서(README.md, TASKS.md)가 있다. docs/DESIGN.md가 이 앱의 설계다. 먼저 끝까지 읽는다.
이 단계는 코드가 아니라 저장소의 뼈대와 에이전트 규칙만 만든다. package.json은 만들지 않는다(02단계).
DESIGN.md에 없는 규칙을 지어내지 않는다. 필요해 보이는 규칙은 만들지 말고 목록으로 보고만 한다.

1. git 저장소가 아니면 git init 을 한다. 이미 저장소면 그대로 쓴다. 기본 브랜치가 main인지 본다.
   prompts/, 루트의 TASKS.md, docs/DESIGN.md 는 고치지 않는다. README.md 는 끝에 "## 앱" 절만 더한다.
2. 다음 파일을 만든다.
   - .gitattributes: "* text=auto eol=lf" (DESIGN 2.4절)
   - .gitignore: node_modules/, dist/, /data/(루트의 데이터 폴더만. 슬래시가 없으면 src/data/ 같은 폴더까지 빠진다), .e2e-data/, test-results/, playwright-report/, *.log, .env*, *.tmp, .claude/skills/, .claude/settings.local.json
   - .editorconfig: utf-8, lf, 들여쓰기 공백 2칸, 파일 끝 줄바꿈
   - AGENTS.md: DESIGN 10.1절의 15개 장. 장마다 짧게 쓰고 DESIGN.md의 절을 링크한다. AGENTS.md 는 루트에 있으니 링크를 루트 기준으로 바꾼다(../prompts/README.md 는 prompts/README.md, 같은 문서 안의 #절 링크는 docs/DESIGN.md#절). 12장의 보고 틀과 14장의 안정 기준은 그대로 옮긴다.
     9장에는 DESIGN 9.2절의 경계 규칙(EDGE-1, EDGE-2)과 9.14절의 절차를 옮기고, 정책 상태 표(폴더, 정책 파일, 상태)를 둔다.
     표의 행은 DESIGN 8장에서 POLICY.md가 있는 폴더 11개이고, 상태는 모두 "없음"으로 시작한다.
   - CLAUDE.md: "@AGENTS.md" 한 줄
   - .claude/settings.json: DESIGN 10.2절의 JSON 그대로
   - docs/DECISIONS.md: DESIGN 15장의 표를 ADR 하나씩 펼친다. 형식은 "## ADR-001: 제목", 상태(채택), 맥락, 결정, 결과, 대안.
     끝에 "따르지 않은 AI 제안" 표(날짜, 제안, 따르지 않은 이유)를 빈 채로 둔다.
   - docs/TASKS.md: 단계 표. 열은 단계, 이름, 브랜치, 상태(대기, 진행, 명세, 반영, 안 함), main 해시, 메모.
     단계는 00 환경 준비, 01 저장소와 에이전트 규칙, 02 패키지와 도구, 03 계약, 04 기초 UI, 05 기초 API,
     06 관계형 저장소, 07 문서 저장소, 08 사용자, 09 채팅 목록, 10 대화와 스트리밍, 11 새 채팅과 동기화,
     12 대기열(선택), 13 예외 상황, 14 단축키와 접근성, 15 결함 찾기, 16 결함 고치기, 17 마무리.
     맨 위에 "진행 방식: 기본" 한 줄을 두고(DESIGN 10.5절. 기본, 빠른 모드, 가벼운 주기 중 사람이 고른다), 그 아래 안정 기준(AGENTS.md 14장)을 한 문단으로 둔다. 00과 01은 반영으로 둔다(이 커밋이 01의 반영이다). 브랜치 이름은 stage/<번호>-<영어 이름>이다(01은 main).
   - docs/test-plan.md: DESIGN 11장을 옮긴 뼈대. "잰 시간" 표와 "직접 확인 목록"은 머리줄만 둔다.
   - docs/READING.md: 표 하나. 열은 단계, 파일:줄, 무엇을 보나, 왜 중요한가, 읽음(빈 칸), 내 말로(빈 칸).
     맨 위에 "사람이 읽고 체크한다. 질문이 나올 핵심 15~20곳을 먼저 읽는다." 한 줄.
   - docs/evidence/README.md: 화면 캡처(ui/<단계>/), 일반 AI 에이전트 웹앱 캡처(ui/reference/), 측정표, 직접 확인 기록을 둔다는 한 문단.
   - README.md: 이미 있는 포트폴리오 소개다. 끝에 "## 앱" 절을 더하고 "준비 중" 한 줄만 쓴다(17단계에서 채운다).
3. git add 뒤 git status --short 로 바뀐 파일 목록을 보인다.
   DESIGN.md를 포함한 모든 파일에 개인 정보나 비밀 값이 없는지 본다.
4. "chore: start the repository with agent rules and design docs" 로 main에 커밋한다.
5. 보고: 만든 파일, AGENTS.md의 장 제목, 지어내지 않으려고 보고만 한 것.
```

## 프롬프트 2. 스킬 설치 (선택)

```text
agent-skill-garden의 스킬을 이 저장소에 프로젝트 범위로 설치한다. 저장소의 파일은 .claude/skills/ 말고는 바꾸지 않는다.

1. 이 저장소 폴더에서 Git Bash를 열고 REPO="$(pwd)" 로 이 저장소의 경로를 적어 둔다. 같은 창에서 /c/dev/tools 폴더를 만들고, 거기에 https://github.com/changbaebang/agent-skill-garden 을 clone한다. 이미 있으면 git pull 한다.
2. 그 폴더에서 ./scripts/validate.sh 를 돌리고 마지막 줄을 보인다. 실패하면 멈춘다.
3. 미리보기를 돌린다. --apply 는 붙이지 않는다.
   ./scripts/install.sh --target claude --scope project --root "$REPO"
     --skill intake --skill work-start --skill api-contract-check --skill side-effect-check
     --skill react-review --skill typescript-review --skill e2e-test-design --skill browser-e2e-check
     --skill affected-verification --skill critical-review --skill bug-triage --skill work-closeout
   PLAN 줄을 모두 보이고 멈춘다. 내가 확인하면 같은 명령에 --apply 를 붙여 돌린다.
4. 설치 뒤 "$REPO"/.claude/skills/<이름>/SKILL.md 가 12개 모두 있는지 본다.
   Git Bash의 ln -s 는 설정에 따라 링크 대신 복사본을 만든다. 어느 쪽이 됐는지 적는다.
5. git status 에 .claude/skills/ 가 나오지 않는지 본다(.gitignore에 있다).
6. README.md에 "쓰는 스킬" 절을 더하고, 스킬 이름과 원본 저장소를 적어 커밋한다.
```

## 프롬프트 3. 새 세션에서 규칙 시험

새 세션을 열어 붙인다. 이 세션에는 앞의 대화가 없다.

```text
이 저장소의 규칙이 새 세션에서 실제로 걸리는지 시험한다. 파일을 남기지 않는다.
1. 파일을 열기 전에, 지금 알고 있는 이 저장소의 규칙을 다섯 줄로 말한다. 특히 data/ 를 고쳐도 되는지, main 에 어떻게 반영하는지.
2. 편집 도구로 data/permission-test.txt 를 만들어 본다. 거부되면 거부 메시지를 그대로 보인다. 만들어지면 바로 지우고 그렇다고 말한다.
3. 셸 명령은 권한 규칙이 막지 못한다. 그 자리를 AGENTS.md 의 어느 문장이 막는지 짚는다.
4. git status 가 비었는지 보인다.
```

1번에서 규칙을 모르면 `CLAUDE.md`가 로드되지 않은 것이다(연 폴더를 본다). 2번에서 파일이 만들어지면 권한 파일이 적용되지 않은 것이다.

## 막히면

- **새 세션이 규칙을 모른다.** Claude Code를 저장소 폴더 자체에서 열었는지 본다. 상위 폴더에서 열면 `CLAUDE.md`가 로드되지 않는다.
- **신원이 다르다.** `git commit --amend --reset-author --no-edit`로 고친다. 01의 커밋이 마지막 커밋일 때만 한다.
- **`validate.sh`가 Python이나 `rg`를 못 찾는다.** 00단계의 선택 설치를 하고 Git Bash를 새로 연다.
- **에이전트가 `package.json`을 만들었다.** 지우게 한다. 의존성은 02단계에서 DESIGN 2.2절의 표대로 한 번에 정한다.
