# 채팅 클라이언트 설계

**상태:** 초안, 2026-11-18. 이 문서는 [단계 프롬프트](../prompts/README.md)가 읽는 원본이다. 설계, 단계 프롬프트, 앱이 한 저장소에 있고 이 문서는 `docs/DESIGN.md`다. 구현이 이 문서와 달라지면 같은 커밋에서 이 문서를 고친다.

## 0. 이 문서에 대해

### 0.1 독자

이 앱을 만드는 사람과 코딩 에이전트다. 에이전트는 단계 프롬프트가 가리키는 절만 읽어도 그 단계를 할 수 있어야 한다. 그래서 절마다 앞뒤 맥락 없이 읽히게 쓴다.

### 0.2 근거

| 근거 | 가져온 것 |
| ---- | --------- |
| [career-radar](https://github.com/changbaebang/career-radar) | `node:sqlite`와 `user_version` 마이그레이션, 루프백 Host 검사, ADR 형식, 번호 붙인 `AGENTS.md` 규칙 |
| [agent-skill-garden](https://github.com/changbaebang/agent-skill-garden) | 변경 권한의 경계(읽기, 수정, 외부 쓰기), 검증 정책(pass, fail, blocked를 구분하고 못 한 확인을 통과로 바꾸지 않음), 리뷰와 마무리 스킬 |

### 0.3 표기

- **강도:** "반드시"는 어기기 전에 멈추고 사람에게 묻는다. "기본"은 이유가 있으면 어길 수 있고, 그 이유를 코드 옆 주석이나 커밋에 남긴다.
- **ID:** 기능은 `F-`, 정책 규칙은 폴더마다 접두사(`CON-`, `HTTP-`, `DOM-`, `STORE-`, `RDB-`, `DOC-`, `REPLY-`, `SLIB-`, `API-`, `LIB-`, `STATE-`, `COMP-`, `STYLE-`), 폴더 사이의 경계는 `EDGE-`, 결정은 `ADR-`다.
- **측정값:** 버전과 동작은 2026-11-18에 Windows 11 PC에서 잰 값이다. 잰 방법은 [작업 목록 3장](../TASKS.md#3-측정해-둔-사실)에 있다. 재지 않은 것은 "확인하지 못함"으로 적는다.

## 1. 개요

### 1.1 무엇을 만드는가

사용자를 고른 뒤 AI 답변을 스트리밍으로 받는 채팅 웹 앱과 그 API다. 로그인은 없는 프로토타입이다(ADR-007). 패키지 하나에 웹(`src`), API 서버(`server`), 둘이 함께 쓰는 계약(`shared`)이 있다. API 서버는 Vite 플러그인으로 개발 서버와 preview 서버에 붙는다. 데이터는 RDB와 문서 저장소에 저장하고, 사용자를 나눈다.

답변은 결정적인 mock 생성기가 만든다. 실제 모델은 같은 인터페이스(`ReplyProvider`) 뒤에 나중에 붙인다([6.2절](#62-답변-하나의-흐름)).

### 1.2 목표

1. **재현:** Git만 설치된 Windows PC에서, 설계와 프롬프트만 있는 이 저장소로 시작해 단계 프롬프트만 따라 처음부터 끝까지 다시 만들 수 있다.
2. **가볍게:** 의존성 열 개로 만든다. 더하는 패키지는 이유를 ADR로 남긴다.
3. **저장소 분리:** 데이터의 성격에 따라 RDB와 문서 저장소(NoSQL)를 나눠 쓰고, 그 이유와 비용을 코드와 문서로 보인다.
4. **에이전트 환경:** 규칙, 폴더별 정책, 도구 권한, 검증 루프를 설계하고, 그 환경이 에이전트 출력의 품질과 일관성을 지키는 것을 보인다.

### 1.3 범위

**하는 것**

- 사용자 고르기와 만들기, 사용자 바꾸기(로그인 없음)
- 채팅 목록: 최근 활동 순, 날짜 그룹, 커서 페이지, 고정
- 새 채팅, 메시지 전송과 답변 스트리밍, 중단
- 이름 변경, 삭제, 고정
- 채팅별 입력 초안, 단축키, 접근성, 오류 상태
- 답변 중에 보낸 메시지의 대기열(선택 단계)

**하지 않는 것**

| 하지 않는 것 | 이유 |
| ------------ | ---- |
| 파일 첨부, 답변의 출처 표시 | 이 앱의 범위 밖이다. 메시지는 글만 보내고, 답변은 Markdown 본문만 갖는다 |
| 하위 채팅 | 지금은 뺀다. 문서 모양에 부모 관계를 넣을 자리만 비워 둔다([5.3절](#53-문서-형태)) |
| 로그인과 인증 | 사용자를 고르는 프로토타입이다. 이 포트폴리오가 보이려는 것은 데이터 설계다. 로그인을 붙일 자리는 [13장](#13-보안)과 ADR-007 |
| 실제 LLM 연결 | 인터페이스만 둔다. 제안 작업 N3 |
| 독립 실행 서버와 배포 | API는 Vite 서버에 붙는다. 빌드한 앱은 `bun run preview`로 띄운다. 옮길 때 바뀌는 곳은 [5.8절](#58-운영으로-옮길-때) |
| 여러 탭, 여러 기기의 실시간 동기화 | 다시 읽을 때 맞춘다. 한계는 [14장](#14-위험과-알려진-한계) |
| 좁은 화면, 모바일 | 데스크톱 너비 1024 이상을 기준으로 한다 |
| 다국어 | 화면 문구는 영어 하나다 |

## 2. 기술 선택

### 2.1 원칙과 선택

**원칙:** 의존성은 열 개로 시작한다. 패키지는 제 몫을 할 때만 더하고, 더하려면 ADR에 이유를 남긴다.

| 영역 | 선택 | 근거 |
| ---- | ---- | ---- |
| 런타임과 도구 | Bun 1.4(설치, 스크립트, TypeScript 실행, 테스트) | 도구 하나로 끝난다. 이 PC에서 개발 서버, `bun test`, 세 엔진의 Playwright를 모두 돌려 봤다. 잰 결과, 스크립트 안의 환경 변수와 작은따옴표가 Windows에서 설정 없이 된다 |
| 서버 코드의 API | `node:http`, `node:sqlite`, `node:fs`, `node:crypto`만 | Node에서도 그대로 도는 백엔드로 둔다. Bun 전용 API(`Bun.serve`, `bun:sqlite`, `Bun.file`)는 쓰지 않는다(EDGE-2) |
| 웹 | React 19.3, Vite 8.3 | Vite 플러그인으로 API를 같은 출처에 붙일 수 있다 |
| API를 붙이는 곳 | Vite 플러그인(`configureServer`, `configurePreviewServer`) | 프로세스 하나, 웹과 같은 출처라 프록시와 CORS가 없다 |
| HTTP | 직접 만든 작은 라우터(`node:http`의 `req`, `res`) | 경로가 열 개 남짓이라 라이브러리 없이 충분하다 |
| 계약 | 손으로 쓴 TypeScript 타입(`shared/contract.ts`)과 서버의 검증 함수 | 런타임 의존이 없다. `docs/API.md`를 손으로 옮긴다 |
| RDB | SQLite, `node:sqlite` | 파일 하나이고 설치가 없다. 2026-11-18에 Bun 1.4.2로 잰 결과, 경고 없이 SQLite 3.53.2로 돌고, 행 값 비교가 인덱스 범위를 쓴다. 2026-11-19에 Bun 1.4.4로 올린 뒤에는 경고 없이 3.53.4다(ADR-002) |
| 문서 저장소 | 직접 만든 JSON 문서 저장소 | 채팅 하나가 파일 하나다. 잠금, 원자적 쓰기, 버전 조건부 쓰기를 직접 보여 줄 만큼 작다([5.7절](#57-windows와-파일-저장)) |
| Markdown | 직접 만든 렌더러(`src/lib/markdown.tsx`) | 답변에 쓰는 문법만 다룬다. 답변은 조각으로 와서 그리는 도중의 글이 늘 불완전하다. 그런 입력에서도 무한 루프 없이 끝나야 한다(LIB-8) |
| 언어 | TypeScript 7.0.2 | 린터가 없어 typescript-eslint의 peer 범위(`<6.1.0`)에 묶이지 않는다 |
| 테스트 | `bun test`(모듈, HTTP), Playwright 1.65(브라우저) | 모듈과 HTTP는 Bun에 들어 있는 테스트로, 브라우저는 세 엔진에서 본다 |
| 형식과 린트 | 없음. `tsc`와 검사 스크립트 둘(`check:imports`, `check:css`) | 필요한 검사만 스크립트로 둔다. 의존 방향은 `check:imports`가 본다(9.2절) |

### 2.2 의존성과 스크립트

의존성은 열 개다. 2026-11-18의 `npm view` 값으로 정확히 고정한다(`^` 없음). 올릴 때는 [15장](#15-결정-기록)에 ADR을 더한다.

| 구분 | 패키지 |
| ---- | ------ |
| dependencies | `react@19.3.1`, `react-dom@19.3.1`, `@fontsource-variable/geist@5.3.0` |
| devDependencies | `vite@8.3.8`, `@vitejs/plugin-react@6.3.0`, `typescript@7.0.2`, `@playwright/test@1.65.1`, `@types/node@26.6.6`, `@types/react@19.3.0`, `@types/react-dom@19.3.0` |

`package.json`의 `engines.bun`은 `>=1.4`, `packageManager`는 `bun@1.4.4`다(2026-11-18 winget의 Bun).

**스크립트**

| 스크립트 | 명령 | 쓰는 때 |
| -------- | ---- | ------- |
| `dev` | `bun --bun vite` | 웹과 API를 함께 띄운다(5173) |
| `build` | `tsc --noEmit && bun --bun vite build` | `dist/`로 빌드한다 |
| `preview` | `bun --bun vite preview` | 빌드한 웹과 API를 함께 띄운다 |
| `typecheck` | `tsc --noEmit` | 커밋 전 |
| `check:imports` | `bun scripts/check-imports.ts` | 폴더 의존 방향, Bun 전용 API, 서버 코드의 `console`(9.2절) |
| `check:css` | `bun scripts/check-css.ts` | 색 리터럴, 테마 밖 사용, `!important`, 멈추지 않는 애니메이션(STYLE-4, 6, 9, 10) |
| `test` | `bun test` | 모듈 테스트와 HTTP 테스트 |
| `test:e2e` | `bun --bun playwright test --project=chromium --grep-invert @screens` | 합류 직전. 개발 서버에서 전체([11.4절](#114-e2e-서버와-데이터)) |
| `test:e2e:all` | `bun --bun playwright test --grep-invert @screens` | 마일스톤 전, 세 엔진 |
| `test:smoke` | `bun --bun playwright test --project=chromium --grep @smoke` | 고치는 동안 |
| `test:screens` | `bun --bun playwright test --project=chromium --grep @screens` | 화면 점검. 캡처를 둘 단계는 `SCREENS_STAGE`로 준다([3.7절](#37-화면-품질)) |
| `test:e2e:build` | `bun run build && E2E_SERVER=preview bun --bun playwright test --project=chromium --grep @smoke` | 합류 직전. 빌드한 앱에서 스모크 |
| `test:report` | `bun --bun playwright show-report` | e2e가 실패했을 때 |
| `data:seed`, `data:reset`, `data:check` | `bun scripts/seed.ts`, `reset.ts`, `check-data.ts` | 데모 데이터, 초기화, 두 저장소의 어긋남 검사([5.5절](#55-어긋났을-때-맞추기)) |
| `clean` | `bun scripts/clean.ts` | 빌드 산출물, 테스트 결과, e2e 데이터 지우기 |
| `check` | `bun run typecheck && bun run check:imports && bun run check:css && bun run test` | 단계마다 끝날 때 |

### 2.3 쓰지 않는 것

| 쓰지 않는 것 | 이유 |
| ------------ | ---- |
| Node와 pnpm, tsx, Vitest | Bun 하나가 맡는다. 처음 판은 이 조합이었고, 그때 잰 것(pnpm 12의 설정 두 가지)은 [작업 목록 3장](../TASKS.md#3-측정해-둔-사실)에 남겼다 |
| Express | 경로가 열 개 남짓이다. `node:http` 위의 작은 라우터로 충분하다 |
| Zod | 계약이 작다. 검증 함수가 계약 타입을 돌려준다(HTTP-9) |
| react-markdown, remark-gfm | 답변에 쓰는 문법만 직접 그린다(2.1절) |
| ESLint, Prettier | 의존 방향은 `check:imports`가, 타입은 `tsc`가 본다. 형식은 `.editorconfig`만 둔다 |
| `bun:sqlite`, `better-sqlite3` | 서버를 Node에서도 돌게 둔다(EDGE-2). `better-sqlite3`는 Windows에서 네이티브 빌드가 필요할 수 있다 |
| lowdb 같은 JSON DB | 파일 하나에 전부 담으면 채팅 하나를 쓸 때 전체를 다시 쓴다. 문서마다 파일과 잠금을 직접 보이는 것이 요점이다 |
| ORM, TanStack Query, react-router, Tailwind | 테이블 둘, 화면 넷, plain CSS다. 이 규모에서는 가져오는 비용이 더 크다 |
| jsdom, happy-dom, React Testing Library | 배치, 포커스, `showModal`, 엔진 차이를 흉내 내지 못한다 |

### 2.4 Windows에서 지킬 것

| 규칙 | 이유 |
| ---- | ---- |
| 저장소는 공백 없는 짧은 경로에 둔다(예: `Downloads\chat-client-blueprint`) | 스크립트와 경로 처리가 단순해진다 |
| `.gitattributes`에 `* text=auto eol=lf` | Git의 `autocrlf`가 줄 끝을 바꾸면 diff가 흔들린다 |
| 스크립트에서 `rm`, `cp`, `mkdir -p`를 쓰지 않는다 | `scripts/*.ts`를 Bun으로 돌린다 |
| 파일 바꿔 쓰기는 다시 시도한다 | 잰 결과, 다른 핸들이 연 파일 위로 이름 바꾸기가 Node와 Bun 모두에서 `EPERM`이다. 백신과 색인기도 파일을 잡는다(DOC-2) |
| 종료는 믿지 않는다 | Windows에는 `SIGTERM`이 오지 않고, Playwright는 서버를 강제로 끝낸다. 그래서 시작할 때 복구한다([6.4절](#64-시작과-종료)) |
| 에이전트의 셸은 Git Bash, 사람이 치는 명령은 PowerShell로 적는다 | Claude Code는 Windows에서 Bash 도구로 Git Bash를 쓴다. 사람은 PowerShell 창을 쓴다 |

## 3. 기능 스펙

### 3.1 화면

| 주소 | 화면 | 사용자 |
| ---- | ---- | ------ |
| `/users` | 사용자 고르기. 있는 사용자 목록과 새 이름 입력 | 필요 없음. 이미 고른 상태로 오면 `/`로 보낸다 |
| `/` | 홈: 인사말("Good morning, {이름}")과 새 채팅 입력창 | 필요 |
| `/chats/:id` | 채팅: 헤더(제목, 메뉴), 메시지 목록, 입력창 | 필요 |
| 그 밖의 주소 | 찾을 수 없음. 셸 안에 그린다 | 필요 |

사용자를 고른 뒤의 화면은 왼쪽 사이드바와 오른쪽 본문이다.

- **사이드바:** 앱 이름, New chat 버튼, 접기 버튼, Pinned 그룹, 날짜 그룹(Today, Yesterday, Previous 7 days, Previous 30 days, Older), 맨 아래 사용자 메뉴(표시 이름, Log out).
- **너비:** 끌어서 200~400px로 바꾼다. 키보드로도 바꾼다(방향키, Home, End). 접으면 아이콘 레일이 남는다. 너비와 접힘은 `localStorage`에 둔다.
- **본문:** 내용 너비는 최대 768px로 가운데 둔다. 입력창은 본문 아래에 붙는다.

### 3.2 기능

완료 조건의 "e2e"와 "모듈"은 [11장](#11-테스트)의 층이다. 프롬프트의 각 단계가 이 조건을 테스트로 먼저 쓴다.

#### F-USER. 사용자 고르기

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-USER-1 | 사용자 고르기 화면(`/users`): 있는 사용자 목록(만든 순)과 새 사용자 이름 입력(1~40자). 고르거나 만들면 `/`로 간다. 같은 이름이 있으면 "That name is taken" | e2e: 새 이름으로 만들면 홈과 사용자 메뉴에 그 이름이 보인다. 같은 이름(대소문자만 다른 것 포함)으로 다시 만들면 문구가 보인다 |
| F-USER-2 | 고른 사용자의 id를 이 브라우저의 `localStorage`(`chat:user`)에 두고, 요청마다 `X-User-Id` 머리로 보낸다. 비밀번호와 세션은 없다(ADR-007) | e2e: 새로고침해도 같은 사용자다. 새 브라우저 컨텍스트는 고르기 화면에서 시작한다 |
| F-USER-3 | 사용자 바꾸기: 사용자 메뉴의 Switch user. 클라이언트의 채팅 목록, 메시지 저장소, 진행 중 답변을 모두 비우고 고르기 화면으로 간다 | e2e: 바꾼 뒤 앞 사용자의 채팅이 한 프레임도 보이지 않는다 |
| F-USER-4 | 어떤 요청이든 401 `user_required`면 고르기 화면으로 가고 원래 주소를 `?next=`로 둔다. 고르면 그 주소로 돌아간다. 쓰던 초안은 남는다 | e2e: 저장된 id를 없는 id로 바꾸고 채팅을 열면 고르기 화면이고, 고르면 그 채팅이다 |

#### F-LIST. 채팅 목록

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-LIST-1 | 고정하지 않은 채팅을 `updatedAt` 최신 순으로 20개씩 받는다. 목록 끝이 보이면 다음 페이지를 받는다. 실패하면 자동으로 다시 요청하지 않고 멈춘 뒤 Retry를 보인다. 첫 페이지를 받는 사이에 만든 채팅도 빠지지 않는다(응답으로 덮지 않고 합친다) | e2e: 45개를 만들면 스크롤로 모두 보이고 겹치거나 빠지지 않는다. 서버를 막으면 요청이 반복되지 않는다(요청 횟수를 센다). 첫 페이지 응답을 붙잡아 둔 사이에 채팅을 만들고 응답을 놓아도 그 채팅이 남는다 |
| F-LIST-2 | 날짜 그룹은 사용자의 지역 시간 기준이다. 탭을 켠 채 자정을 넘기거나 숨긴 탭이 다시 보이면 다시 나눈다 | 모듈: 그룹 계산. e2e: `page.clock`으로 자정을 넘긴다 |
| F-LIST-3 | Pinned 그룹: `pinnedAt` 최신 순, 최대 20개. 고정한 채팅은 날짜 그룹에 나오지 않는다. 답변이 와도 Pinned 안의 자리는 그대로다. 아직 받지 않은 페이지의 채팅도 고정되어 있으면 보인다. Pinned 행은 날짜 그룹과 같은 행 부품을 쓴다 | e2e: 고정하면 Pinned로 가고 새로고침해도 남는다. 다른 브라우저 컨텍스트에서 같은 사용자를 골라도 보인다. Pinned 행에도 답변 중 표시와 바꾼 이름이 나온다 |
| F-LIST-4 | 보고 있는 채팅을 강조한다. 답변 중인 채팅에 표시를 둔다. 제목이 없으면 "New chat"이다 | e2e |
| F-LIST-5 | 행마다 메뉴(Rename, Pin 또는 Unpin, Delete). 메뉴 버튼은 링크 안이 아니라 형제 요소다. 낮은 창에서도 메뉴가 잘리지 않는다. 펼칠 방향은 가장 가까운 스크롤 영역을 기준으로, 그리기 전에 잰 실제 높이로 정한다. 메뉴를 열고 닫아도 목록이 움직이지 않는다 | e2e: 창 높이 800, 600, 480에서 맨 위와 맨 아래 행의 메뉴가 화면 안에 있다. 400에서는 잘리는 px을 재서 `docs/test-plan.md`에 적는다. 맨 위와 맨 아래 행은 그 테스트가 만든 채팅으로 정한다. 메뉴를 열기 전과 닫은 뒤 목록의 스크롤 위치가 같다 |

#### F-NEW. 새 채팅

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-NEW-1 | 홈 입력창에서 첫 메시지를 보낼 때 채팅을 만들고, 바로 보내고, 채팅 화면으로 간다. 보내기 전에는 채팅이 생기지 않는다. 만드는 동안 입력창이 잠겨 두 번 보내지 않는다. 만들기가 끝난 순간에 아직 홈에 있을 때만 채팅 화면으로 간다. 만들기에 실패하면 목록에 행이 남지 않고, 입력을 그대로 두고 이유를 보인다 | e2e: 홈을 열기만 하면 목록이 늘지 않는다. 보내면 Today 맨 위에 제목과 함께 나온다. Enter를 두 번 눌러도 채팅은 하나다. 만들기 응답을 붙잡아 둔 사이에 다른 화면으로 가면 끌려오지 않는다. 만들기가 실패하면 목록의 행 수가 보내기 전과 같고 입력이 남는다 |
| F-NEW-2 | New chat 버튼과 `mod+Shift+O`는 홈으로 가서 입력창에 포커스를 준다 | e2e |

#### F-SEND. 전송과 스트리밍

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-SEND-1 | 입력창: Enter로 보내고 Shift+Enter로 줄을 바꾼다. 한글 조합 중 Enter는 보내지 않는다(`isComposing || keyCode === 229`). 높이는 JS로 늘리고 본문 높이의 40%에서 멈춘다. 비었거나 공백뿐이면 보내기를 끈다. 8,000자를 넘으면 남은 글자 수를 보이고 보내기를 끈다 | e2e: 조합 중 Enter를 흉내 내면 보내지 않는다 |
| F-SEND-2 | 보낸 글을 바로 사용자 메시지로 보이고, `message.created`가 오면 서버의 것으로 바꾼다 | e2e |
| F-SEND-3 | 첫 조각 전에는 대기 표시, 조각이 오면 이어 붙여 Markdown으로 그린다. `output_text.done`이 오면 서버의 최종 메시지로 바꾼다 | e2e: 답변이 점점 길어지고, 끝난 뒤 내용이 다시 읽은 값과 같다 |
| F-SEND-4 | 맨 아래에 있을 때만 따라간다. 위로 스크롤하거나 휠을 위로 굴리면 바로 멈추고 "Jump to latest"를 보인다 | e2e: Firefox에서도 휠 한 번에 멈춘다 |
| F-SEND-5 | 다른 채팅으로 가도 답변을 계속 받는다. 돌아오면 이어서 보인다 | e2e |
| F-SEND-6 | 채팅을 열면 맨 아래부터 보인다. 맨 위가 한 프레임도 그려지지 않는다 | e2e: 프레임마다 스크롤 위치를 잰다 |
| F-SEND-7 | 끝난 메시지는 다시 그리지 않는다(memo). 조각마다 다시 그리는 것은 진행 중인 답변 하나다 | e2e: dev 서버에서 렌더 횟수를 센다 |
| F-SEND-8 | 스크린 리더에는 답변이 끝났을 때 한 번 알린다. 조각마다 알리지 않는다 | e2e: live region의 글이 한 번 바뀐다 |
| F-SEND-9 | 끝난 상태를 보인다. `incomplete`는 "Stopped", `failed`는 "The answer failed"와 입력창 위의 안내 | e2e: mock 지시어로 실패를 만든다([9.7절](#97-serverreply)) |

#### F-STOP. 중단

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-STOP-1 | 답변 중에는 보내기 버튼이 Stop이 된다. 입력창에 포커스가 있을 때 Esc도 멈춘다. 다이얼로그가 열려 있으면 Esc는 다이얼로그가 갖는다 | e2e |
| F-STOP-2 | 멈추면 취소 API를 부르고, 받은 글은 남기고 "Stopped"를 붙인다. 첫 조각 전에 멈추면 사용자 메시지만 남는다. 사용자가 멈춘 것과 화면을 떠나며 끊은 요청은 오류로 보이지 않는다 | e2e: 새로고침해도 같다. 멈춘 뒤 오류 문구와 Retry가 없다. 답변 중에 다른 채팅으로 갔다 와도 오류 화면이 없다 |
| F-STOP-3 | 멈춘 직후 바로 보낼 수 있다. 재시도 없이 409가 나지 않는다 | e2e: 멈추고 바로 보내기를 20번 반복해 모두 성공 |

#### F-RENAME, F-DELETE, F-PIN

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-RENAME-1 | 행 메뉴와 헤더 메뉴의 Rename은 그 자리에서 입력으로 바뀐다. Enter 저장, Esc 취소, 한글 조합 처리, 120자, 비우면 취소. 앞뒤 공백과 겹친 공백은 서버가 정리한다. 실패하면 이전 이름으로 되돌리고 토스트를 보인다 | e2e |
| F-RENAME-2 | 답변 중에 바꾼 이름을 그 답변의 `chat.updated`가 되돌리지 않는다. 클라이언트는 목록의 제목이 `null`일 때만 이벤트의 제목을 쓴다 | e2e |
| F-DELETE-1 | Delete는 확인 다이얼로그를 거친다. 답변 중이면 서버가 멈춘다. 보고 있던 채팅이면 홈으로 먼저 간 뒤 목록에서 뺀다. 홈으로 갈지는 지우기가 끝난 순간의 주소로 정한다. 그사이 다른 채팅으로 옮겼으면 그 채팅에 둔다. 늦게 온 이벤트가 지운 채팅을 되살리지 않는다. 404는 이미 지워진 것이니 성공으로 본다 | e2e: 찾을 수 없음 화면이 한 프레임도 보이지 않는다. 지우기 응답을 붙잡아 둔 사이에 다른 채팅으로 옮기면 그 채팅에 머문다(행 메뉴와 머리글 메뉴 둘 다) |
| F-PIN-1 | Pin과 Unpin. 고정은 활동이 아니라 `updatedAt`을 바꾸지 않는다. 21번째는 서버가 409로 거절하고 토스트로 알린다 | e2e, HTTP |

#### F-DRAFT. 입력 초안

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-DRAFT-1 | 채팅마다, 그리고 홈에 초안 하나씩 `localStorage`에 둔다. 열쇠는 `chat:draft:{userId}:{chatId 또는 home}`이다. 글이 바뀌면 저장하고 다시 열면 되살린다. 보내면 지우고, 실패해 돌아온 글은 다시 초안이 된다. 채팅을 지우면 그 초안도 지운다. 저장소를 쓸 수 없으면 저장 없이 동작한다 | e2e: 다른 채팅에 갔다 오거나 새로고침해도 남는다. 다른 사용자를 고르면 보이지 않는다 |

#### F-QUEUE. 대기열 (선택 단계 12)

| ID | 동작 | 완료 조건 |
| -- | ---- | --------- |
| F-QUEUE-1 | 답변 중에도 입력창이 열려 있고, Enter는 대기열에 쌓는다. 채팅마다 차례대로 보낸다. 다른 채팅을 보는 동안에도 보낸다 | 모듈: 대기열 상태 전이. e2e: 셋을 쌓으면 셋 다 순서대로 답을 받는다 |
| F-QUEUE-2 | 항목마다 취소가 있다. 중단과 실패는 대기열을 멈추고 입력창 위에 "N queued", Send, Clear를 보인다. 멈춘 대기열에 보낸 메시지는 끝에 쌓는다. 다음 항목은 앞 답변의 연결이 닫힌 뒤에 보낸다. 그래도 409 `response_in_progress`가 오면 다시 보내지 않고 실패로 멈춘다. 서버가 잠금을 푼 뒤에 끝을 알리므로(4.6절) 409는 결함의 신호다. 거절된 메시지는 뒤에 대기가 있으면 대기열 맨 앞으로, 없으면 입력창으로 돌아간다. 빈 대기열은 멈춘 것으로 보지 않는다 | 모듈: 전이표. e2e: 셋을 차례로 보내는 동안 409가 한 번도 없다(응답을 센다). 409를 한 번 돌려주면 대기열이 멈추고, 거절된 메시지가 맨 앞이나 입력창으로 간다 |
| F-QUEUE-3 | 대기열은 메모리에만 있다. 같은 `clientMessageId`로 두 번 보내면 서버가 409 `duplicate_message`로 거른다 | HTTP |

### 3.3 상태별 화면

| 상황 | 보이는 것 |
| ---- | --------- |
| 목록 첫 페이지를 읽는 중 | 사이드바에 줄 모양 스켈레톤 다섯 개 |
| 목록이 비었다 | "No chats yet" 한 줄 |
| 목록 다음 페이지 실패 | 목록 끝에 "Couldn't load more"와 Retry. 자동으로 다시 요청하지 않는다 |
| 채팅을 읽는 중 | 메시지 모양 스켈레톤 |
| 채팅 읽기 실패 | "Couldn't open this chat"과 Try again. 404면 찾을 수 없음 화면을 보이고 목록에서도 뺀다 |
| 전송 전 실패(409, 413, 네트워크) | 임시 메시지를 빼고 쓴 글을 입력창에 돌려준다. 입력창 위에 이유를 보인다 |
| 답변 중 연결이 끊김 | 받은 글을 유지한 채 서버와 다시 맞춘다. 서버가 `incomplete`로 저장했으면 "Stopped"로 보인다 |
| 사용자가 멈추거나 화면을 떠나며 끊은 요청 | 오류로 보이지 않는다. 받은 글은 남는다(F-STOP-2, STATE-10) |
| 화면 하나가 렌더 중에 던짐 | 그 화면만 오류 경계가 잡아 "Something went wrong"과 Reload를 보인다. 사이드바는 남는다 |
| 401 `user_required` | 사용자 고르기 화면(F-USER-4) |
| 서버가 꺼짐 | 요청마다 실패를 보인다. 자동 재시도는 목록 첫 읽기와 지금 사용자 읽기(`GET /api/users/me`)에만 한 번 |

### 3.4 단축키

`mod`는 Mac에서 ⌘, 그 밖에서 Ctrl이다. 키는 `event.key`가 라틴 문자가 아니면 `event.code`로 읽는다(한글 입력 상태). 누르고 있어 반복되는 입력은 무시한다. 다이얼로그나 메뉴가 열려 있으면 실행하지 않되 브라우저 기본 동작은 막는다.

| 키 | 동작 |
| -- | ---- |
| `mod+\` | 사이드바 접기와 펴기 |
| `mod+Shift+O` | 새 채팅 |
| `mod+/` | 단축키 도움말 |
| `Esc` | 입력창에서: 답변 중단. 다이얼로그와 메뉴에서: 닫기 |
| `Enter`, `Shift+Enter` | 입력창에서 보내기, 줄바꿈 |

단축키 목록은 `src/components/shell/shortcuts.ts` 한 곳에 둔다. 처리기, 툴팁의 키 표기, 도움말 화면이 모두 이 목록을 읽는다. 키를 읽는 규칙(위의 `event.code`, 반복 무시)은 `src/lib/keys.ts`가 맡는다. 도움말이 세 번째 사본이 되면 언젠가 어긋난다. `/`는 Shift와 함께 눌러도 받는다(자판에 따라 `/`가 Shift 자리에 있다). AltGr(Ctrl+Alt)는 단축키로 보지 않는다. Playwright의 키 입력은 브라우저 단축키까지 닿지 않는다. 그래서 브라우저 단축키와 겹치는 키(Chrome에서 `Ctrl+Shift+O`는 북마크 관리자)는 사람이 실제 브라우저에서 확인하고 브라우저와 버전을 적는다([11.6절](#116-직접-확인과-화면-캡처)).

### 3.5 접근성

- 메뉴는 `role="menu"`의 키보드 동작(방향키, Home, End, Esc, 열면 첫 항목에 포커스)을 한다.
- 다이얼로그는 `<dialog>`의 `showModal`이다. 열 때 첫 입력이나 확인 버튼에 포커스, 닫으면 연 곳으로, 그곳이 사라졌으면 화면의 `h1`로 돌아간다.
- 툴팁은 키보드 포커스와 마우스 올림에만 열고, 클릭으로는 열지 않는다.
- 글자 대비 4.5:1, 글자 아닌 것 3:1. 밝은 테마와 어두운 테마 모두다.
- `prefers-reduced-motion`이면 모든 반복 애니메이션이 멈춘다.
- 메시지 목록은 스크롤 영역에 `tabindex="0"`과 이름을 준다(Safari에서 키보드로 스크롤).
- 진행 중인 답변은 `aria-busy`, 끝나면 live region에 한 번 알린다.
- **포커스가 갈 곳:** 메뉴 항목을 고르면 메뉴 버튼으로 돌아간다(Esc와 같다). Pin과 Unpin처럼 아무것도 열지 않는 항목도 같다. 행이 다른 자리로 옮겨졌으면 옮겨진 행의 메뉴 버튼으로 간다. 입력을 여는 항목(Rename)은 그 입력이 포커스를 갖는다. 누른 버튼이 사라지면(대기열 항목 취소) 이웃 항목이나 입력창으로 간다. 어느 경우에도 `body`로 떨어지지 않는다.
- **이미 옮겨 간 포커스는 건드리지 않는다:** 닫힌 뒤 한 프레임을 기다려, 그사이 사용자가 다른 요소로 포커스를 옮겼으면 되돌리지 않는다.
- **배경을 눌러 닫기:** 다이얼로그 배경을 누른 곳과 뗀 곳이 모두 배경일 때만 닫는다. 입력 안에서 글을 고르다 배경에서 떼도 닫히지 않는다.
- **툴팁:** 포커스로는 `:focus-visible`일 때만 연다. 열려 있는 동안 기준 요소를 따라가고, 기준이 사라지면 닫는다. 닫혀 있을 때는 위치를 계산하지 않는다.
- WebKit은 클릭한 버튼에 포커스를 주지 않는다. 포커스에 기대는 동작은 세 엔진에서 본다.

### 3.6 한도

`shared/limits.ts`에 둔다. 서버와 웹이 같은 값을 읽는다.

| 이름 | 값 | 쓰는 곳 |
| ---- | -- | ------- |
| `INPUT_MAX` | 8,000자 | 메시지 입력 |
| `TITLE_MAX` | 120자 | 채팅 제목 |
| `AUTO_TITLE_MAX` | 60자 | 첫 메시지로 만드는 제목 |
| `DISPLAY_NAME_MAX` | 40자 | 사용자 이름 |
| `PAGE_LIMIT_DEFAULT`, `PAGE_LIMIT_MAX` | 20, 50 | 채팅 목록 |
| `PIN_MAX` | 20 | 고정 |
| `CHAT_MESSAGES_MAX` | 400 | 채팅 하나의 메시지 수. 넘으면 413 `chat_too_long` |
| `BODY_MAX_BYTES` | 65,536 | 요청 본문 |

### 3.7 화면 품질

화면 품질은 기능과 같은 결과물이다. 기능과 테스트가 두꺼워도 화면을 다듬는 시간을 따로 두지 않으면 쓰는 사람이 느끼는 완성도가 떨어진다. 기준은 UX-로 시작하고, 화면 단계(04, 08, 09, 10, 11, 13, 14)가 끝날 때마다 [prompts/README.md 6.12절](../prompts/README.md#612-화면-점검)의 화면 점검을 돈다.

| ID | 기준 | 확인 방법 |
| -- | ---- | --------- |
| UX-1 | 3.3절의 상태마다 실제 화면이 있다. 견본 화면(`/dev/ui.html`)에도 같은 상태가 있다 | `@screens` 캡처와 사람의 눈 |
| UX-2 | 같은 흐름을 일반 AI 에이전트 웹앱(Claude 웹이나 ChatGPT)의 같은 화면과 나란히 놓고 본다. 새 채팅, 답변 중, 중단, 오류, 목록, 메뉴. 다르게 한 곳은 이유를 적는다 | 캡처를 나란히 둔 `docs/evidence/ui/compare.md` |
| UX-3 | 간격, 글자 크기, 줄 높이, 반지름은 토큰의 단계만 쓴다. 화면 사이에 같은 요소는 같은 크기다 | 리뷰 |
| UX-4 | 누를 수 있는 것은 모두 hover, focus-visible, active, disabled가 눈에 보인다 | `@screens` 캡처, e2e의 포커스 검사 |
| UX-5 | 긴 값이 배치를 깨지 않는다: 120자 제목, 띄어쓰기 없는 긴 낱말, 긴 코드 블록, 8,000자 입력, 긴 표시 이름. 말줄임과 줄바꿈을 쓰고, 가로 스크롤은 코드 블록에만 둔다 | e2e: 그 값을 넣고 넘치는 요소가 없는지 잰다 |
| UX-6 | 화면이 튀지 않는다. 답변이 끝날 때, 버튼이 나타날 때, 목록 순서가 바뀔 때 다른 요소가 밀리지 않는다 | e2e: 앞뒤의 위치를 잰다 |
| UX-7 | 안내 문구는 무슨 일이 있었고 다음에 무엇을 할 수 있는지를 한 문장으로 말한다. 같은 상황은 같은 말이다 | 리뷰. 화면 점검에서 같은 상황의 문구를 표로 모아 비교한다 |
| UX-8 | 창 1280x800, 1024x700, 1280x480에서 잘리거나 겹치는 것이 없다 | `@screens` 캡처 |
| UX-9 | 밝은 테마와 어두운 테마가 같은 완성도다. 한쪽에서만 맞춘 색이 없다 | 두 테마의 캡처, STYLE-7 |
| UX-10 | 사람이 화면 단계마다 캡처를 보고, 단계 프롬프트의 "화면 점검"이 만든 `CHECK.md`에 체크한다. 체크하지 않은 단계는 반영하지 않는다 | `docs/evidence/ui/{단계}/CHECK.md` |

**캡처:** 화면 단계마다 `@screens` 태그의 e2e가 상태별 화면을 두 테마와 창 크기 셋(1280x800, 1024x700, 1280x480)으로 찍어 `docs/evidence/ui/<단계>/`에 둔다. 명령은 `SCREENS_STAGE=<단계> bun run test:screens`이다(PowerShell에서는 `$env:SCREENS_STAGE='09'; bun run test:screens`). `SCREENS_STAGE`가 없으면 캡처 테스트는 건너뛴다. 그래서 단계 확인에서 그 단계의 e2e를 세 엔진으로 돌려도 캡처를 쓰지 않는다. 캡처를 찍을 때 "건너뜀"이 나오면 `SCREENS_STAGE`가 빠진 것이다. `test:e2e`와 `test:e2e:all`은 `@screens`를 빼고 돌아서, 반영할 때 캡처가 바뀌지 않는다. 캡처는 따로 돌기 때문에 다른 테스트가 만든 사용자와 채팅이 섞이지 않는다. 파일 이름은 `<화면>-<상태>-<테마>-<너비x높이>.png`이고, 다시 찍으면 덮어쓴다. 저장소에 남는 것은 마지막 캡처다. 17단계의 보고서가 이 캡처를 쓴다.

**시간:** 화면 단계마다 기능을 마친 뒤 화면 점검을 한 번 돈다. 점검에서 나온 것은 그 단계 안에서 고치거나, 15단계의 `docs/Issues.md`에 UX-ID와 함께 올린다. 테스트와 정책에 들인 만큼 화면에도 시간을 쓴다.

## 4. API 계약

이 장이 `docs/API.md`가 되고, `shared/contract.ts`의 타입이 이 장을 코드로 옮긴다. 둘이 다르면 고치는 순서는 [CON-1](#93-shared)을 따른다.

### 4.1 공통 규칙

- **주소:** 모든 API는 `/api` 아래다. API는 Vite 플러그인으로 개발 서버(`bun run dev`, 5173)와 preview 서버(`bun run preview`)에 붙는다. 웹과 API는 늘 같은 출처다.
- **본문:** JSON이고 필드는 camelCase다. 본문이 있는 요청은 `Content-Type: application/json`이어야 하고, 아니면 415다. 본문은 64KB까지다.
- **시간:** ISO 8601 UTC, 밀리초까지, `Z`로 끝난다. 예: `2026-11-18T09:14:03.512Z`.
- **ID:** 접두사와 소문자 base32 20자다. `usr_`, `cht_`, `msg_`, `rsp_`. 형식은 `^(usr|cht|msg|rsp)_[a-z2-7]{20}$`이고 서버는 이 형식이 아닌 경로 값을 404로 거절한다. 문서 저장소의 파일 이름이 이 값이기 때문이다(DOC-1).
- **사용자:** 로그인은 없다(ADR-007). 클라이언트가 고른 사용자의 id를 요청 머리 `X-User-Id`로 보내고, 서버는 RDB에서 그 사용자를 찾는다. 없거나 모르는 id면 사용자가 필요한 경로가 401 `user_required`로 답한다. 다른 사이트의 페이지는 이 머리를 붙이려면 CORS 사전 요청이 필요하고, 서버가 허락하지 않는다.
- **출처 검사:** 서버는 `Host`가 `localhost`, `127.0.0.1`, `[::1]`이 아니면 403이다(DNS 재바인딩 방어, career-radar ADR-0008). 상태를 바꾸는 요청(POST, PATCH, DELETE)에 `Origin`이 있으면 그 호스트와 포트가 요청의 `Host`와 같아야 하고, 아니면 403이다. 웹과 API가 같은 출처라 따로 설정할 값이 없다.
- **요청 ID:** 모든 응답에 `X-Request-Id`가 있다. 서버 로그의 `reqId`와 같다.
- **오류 본문:**

  ```json
  { "error": { "code": "chat_not_found", "message": "No chat with this id" } }
  ```

  검증 실패는 `fields`를 더한다: `{ "error": { "code": "invalid_request", "message": "…", "fields": [{ "path": "title", "message": "Too long" }] } }`.

### 4.2 타입

```ts
type Timestamp = string // ISO 8601 UTC

type User = {
  id: string
  displayName: string
  createdAt: Timestamp
}

type ChatSummary = {
  id: string
  title: string | null        // 첫 메시지가 제목을 줄 때까지 null
  createdAt: Timestamp
  updatedAt: Timestamp        // 마지막 활동. 목록이 이 순서다
  messageCount: number
  pinnedAt: Timestamp | null  // null이면 고정이 아니다
  answering: boolean          // 지금 답변이 스트리밍 중이다
}

type Message = {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string             // Markdown
  status: 'streaming' | 'completed' | 'incomplete' | 'failed'
  createdAt: Timestamp
  clientMessageId: string | null  // 사용자 메시지에만 있다
}

type ChatPage = { chats: ChatSummary[]; nextCursor: string | null }
```

- 사용자 메시지의 `status`는 항상 `completed`다.
- `streaming`은 서버가 답변을 만드는 중이라는 뜻이다. 그 순간의 `content`는 비어 있을 수 있다(서버는 끝날 때 한 번 쓴다, [5.4절](#54-연산별-쓰기-순서)).
- `answering`은 서버 프로세스의 메모리에서 온다. 저장되지 않는다.

### 4.3 사용자

| 요청 | 본문 | 성공 | 실패 |
| ---- | ---- | ---- | ---- |
| `GET /api/users` | 없음 | 200 `{ users: User[] }`, 만든 순 | 없음 |
| `POST /api/users` | `{ displayName }` | 201 `{ user }` | 400 `invalid_request`, 409 `name_taken` |
| `GET /api/users/me` | 없음(`X-User-Id` 머리) | 200 `{ user }` | 401 `user_required` |

이름은 앞뒤 공백을 지우고 저장한다. 같은 이름인지는 대소문자를 가리지 않고 DB의 고유 제약이 본다(5.2절의 `COLLATE NOCASE`). 앞의 둘은 사용자 없이 부를 수 있다. 프로토타입이라 사용자 목록을 누구에게나 보인다(13장).

### 4.4 채팅

아래는 모두 사용자가 필요하다. `X-User-Id`가 없거나 모르는 id면 401 `user_required`다. 남의 채팅은 없는 채팅과 같이 404 `chat_not_found`다. 있는지조차 알려 주지 않는다.

| 요청 | 본문, 쿼리 | 성공 | 실패 |
| ---- | ---------- | ---- | ---- |
| `GET /api/chats` | `limit`(1~50, 기본 20), `cursor` | 200 `ChatPage`. 고정하지 않은 채팅만, `updatedAt` 내림차순, 같으면 `id` 내림차순 | 400 |
| `GET /api/chats?pinned=true` | 없음 | 200 `ChatPage`. 고정한 채팅만, `pinnedAt` 내림차순, 최대 20개, `nextCursor`는 항상 `null` | 없음 |
| `POST /api/chats` | `{ title? }` | 201 `ChatSummary` | 400 |
| `GET /api/chats/:id` | 없음 | 200 `ChatSummary` | 404 |
| `PATCH /api/chats/:id` | `{ title?, pinned? }`, 하나는 있어야 한다 | 200 `ChatSummary` | 400, 404, 409 `too_many_pins` |
| `DELETE /api/chats/:id` | 없음 | 204. 진행 중인 답변을 먼저 멈춘다 | 404 |

- **커서:** `{ "u": updatedAt 밀리초, "i": id }`를 JSON으로 만들어 base64url로 바꾼 값이다. 클라이언트는 속을 읽지 않는다. 깨진 커서는 400이다.
- **제목:** 앞뒤 공백을 지우고 겹친 공백을 하나로 바꾼 뒤 1~120자여야 한다. 이름 변경은 `updatedAt`을 바꾸지 않는다.
- **자동 제목:** 제목이 `null`인 채팅에 첫 메시지가 오면 서버가 그 글의 앞 60자(공백 정리)로 제목을 정한다. 한 번뿐이다. 그 뒤로 서버는 제목을 바꾸지 않는다.
- **고정:** `pinned: true`이면 서버가 받은 순간의 시각을 `pinnedAt`으로 정한다. 이미 고정이면 그대로 둔다. `false`이면 `null`이다. 클라이언트는 시각을 보내지 않는다. 기기마다 시계가 다르다. 고정은 `updatedAt`을 바꾸지 않는다.
- **겹침:** 기본 목록과 고정 목록은 겹치지 않는다. 고정을 바꾸면 클라이언트가 그 채팅을 한 목록에서 다른 목록으로 옮긴다.

### 4.5 메시지

| 요청 | 성공 | 실패 |
| ---- | ---- | ---- |
| `GET /api/chats/:id/messages` | 200 `{ messages: Message[] }`, 오래된 것부터 | 404 |

메시지가 한 번도 없었던 채팅(문서가 아직 없음)은 빈 배열이다.

### 4.6 답변 스트림

#### `POST /api/chats/:id/responses`

메시지를 보내고 답변을 [server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)로 받는다.

```json
{ "input": "Plan a three-day trip to Jeju", "clientMessageId": "9b1f6c1e-3c2a-4a8e-a1f0-5d6c2b7e8f90" }
```

- `input`: 앞뒤 공백을 지운 뒤 1~8,000자.
- `clientMessageId`: 클라이언트가 만든 값(`crypto.randomUUID()`), `^[A-Za-z0-9_-]{8,64}$`. 같은 채팅에서 같은 값은 한 번만 받는다.

스트림을 열기 전의 실패는 보통의 JSON 오류다.

| 상태 | code | 때 |
| ---- | ---- | -- |
| 400 | `invalid_request` | 본문이 틀렸다 |
| 404 | `chat_not_found` | 채팅이 없다 |
| 409 | `response_in_progress` | 이 채팅이 이미 답변 중이다 |
| 409 | `duplicate_message` | 이 `clientMessageId`를 이미 받았다. 본문의 `messageId`가 그 메시지다 |
| 413 | `chat_too_long` | 메시지가 400개다 |

스트림은 `text/event-stream`이다. 이벤트마다 `event:` 줄이 이벤트 이름이고, `data:` 줄이 `type`이 같은 JSON이다. 끝은 `data: [DONE]`이다. 15초마다 주석 줄 `: ping`을 보낸다.

| 이벤트 | data | 뜻 |
| ------ | ---- | -- |
| `response.created` | `response: { id, chatId, status: 'in_progress' }` | 답변을 시작했다. `response.id`가 취소에 쓰는 값이다 |
| `message.created` | `message: Message` | 저장된 사용자 메시지 |
| `chat.updated` | `chat: ChatSummary` | 요약이 바뀌었다(`updatedAt`, `messageCount`, 첫 메시지면 `title`). 여러 번 온다 |
| `response.output_text.delta` | `messageId`, `delta` | 답변 글의 다음 조각. 순서대로 붙인다 |
| `response.output_text.done` | `message: Message` | 저장된 답변. `completed`이거나, 취소로 멈췄으면 `incomplete` |
| `response.completed` | `response: { id, chatId, status: 'completed' \| 'incomplete' }` | 끝 |
| `response.failed` | `response: { id, chatId, status: 'failed' }`, `error: { code, message }` | 서버나 답변 생성기가 실패했다. 받은 글은 `failed`로 저장됐다 |

**순서**

- 정상: `response.created`, `message.created`, `chat.updated`, `delta` 반복, `output_text.done`, `chat.updated`, `response.completed`, `[DONE]`.
- 취소 API로 멈춤: 연결이 열려 있으면 `delta` 반복 뒤 `output_text.done`(받은 글이 있을 때만, `incomplete`), `chat.updated`, `response.completed`(`incomplete`), `[DONE]`.
- 클라이언트가 연결을 끊음: 서버는 아무것도 보내지 못한다. 받은 글을 `incomplete`로 저장한다.
- 실패: `delta` 반복 뒤 `response.failed`, `[DONE]`.

#### `POST /api/chats/:id/responses/:responseId/cancel`

진행 중인 답변을 멈춘다. 서버가 받은 글을 저장하고 잠금을 푼 **뒤에** 응답한다. 그래서 이 응답을 받은 직후의 전송은 409가 나지 않는다.

| 상태 | 본문 | 때 |
| ---- | ---- | -- |
| 200 | `{ message: Message \| null }` | 멈췄다. `message`는 저장된 `incomplete` 답변, 첫 조각 전이었으면 `null` |
| 404 | `response_not_found` | 이 답변은 이미 끝났다. 클라이언트는 끝난 것으로 본다 |

클라이언트는 Stop에서 이 API를 부르고, 응답을 받으면 스트림을 닫는다. 취소 요청이 실패하면 연결을 끊는다. 서버는 연결 끊김도 멈춤으로 처리한다.

### 4.7 오류 코드

| 상태 | code | 때 |
| ---- | ---- | -- |
| 400 | `invalid_request` | 본문, 쿼리, 커서가 스키마에 맞지 않는다 |
| 401 | `user_required` | `X-User-Id`가 없거나 모르는 사용자다 |
| 403 | `origin_rejected` | `Host`나 `Origin`이 허용 목록 밖이다 |
| 404 | `chat_not_found` | 채팅이 없거나 남의 것이다. 형식이 틀린 id도 같다 |
| 404 | `response_not_found` | 취소할 답변이 진행 중이 아니다 |
| 404 | `not_found` | 없는 API 경로 |
| 409 | `name_taken` | 이미 있는 사용자 이름 |
| 409 | `response_in_progress` | 이 채팅이 답변 중이다 |
| 409 | `duplicate_message` | 같은 `clientMessageId` |
| 409 | `too_many_pins` | 고정이 이미 20개 |
| 413 | `body_too_large` | 본문이 64KB를 넘는다 |
| 413 | `chat_too_long` | 메시지가 400개 |
| 415 | `unsupported_media_type` | 본문이 JSON이 아니다 |
| 500 | `internal_error` | 그 밖. 문구는 일반적인 말이고 자세한 것은 그 `X-Request-Id`의 로그에 있다 |
| 503 | `not_ready` | `/api/ready`가 실패했다 |

### 4.8 운영 엔드포인트

사용자가 필요 없다.

| 요청 | 성공 | 실패 |
| ---- | ---- | ---- |
| `GET /api/health` | 200 `{ status: 'ok' }`. 프로세스가 요청을 받는다 | 없음 |
| `GET /api/ready` | 200 `{ status: 'ready' }`. RDB에 `SELECT 1`이 되고 데이터 폴더에 쓸 수 있다 | 503 `not_ready` |

## 5. 데이터 설계

이 장이 포트폴리오의 중심이다. 사용자와 채팅 목록은 RDB에, 채팅 내용은 문서 저장소에 둔다. 아래에서 그 이유, 두 저장소 사이의 쓰기 순서, 어긋났을 때 맞추는 법, 그리고 이 나눔의 비용을 함께 적는다.

### 5.1 어디에 무엇을 두는가

| 데이터 | 저장소 | 읽고 쓰는 모양 | 여기에 두는 이유 |
| ------ | ------ | -------------- | ---------------- |
| 사용자 `users` | RDB | 요청마다 id로 하나를 찾는다. 고르기 화면이 목록을 읽는다. 드물게 쓴다 | 이름의 고유함을 DB가 보장해야 한다. 같은 이름으로 동시에 만들어도 하나만 성공한다. `chats`가 외래 키로 참조한다 |
| 채팅 목록 `chats` | RDB | 한 사용자의 채팅을 활동 순으로 페이지 단위로 읽는다. 고정한 것만 따로 읽는다. 이름 변경, 고정, 삭제. 답변마다 요약을 고친다 | 여러 채팅에 걸친 정렬, 거르기, 커서 페이지는 인덱스가 하는 일이다. 소유권을 행마다 갖는다. 페이지 사이에 빠짐과 겹침이 없어야 한다 |
| 채팅 내용(메시지) | 문서 저장소, 채팅마다 문서 하나 | 채팅 id 하나로 문서 전체를 읽는다. 끝에 메시지를 붙인다. 여러 채팅을 한꺼번에 읽지 않는다 | 읽는 단위가 채팅 하나다. 메시지의 모양이 자주 바뀐다(상태, 생성기 정보, 시간 측정). 마이그레이션 없이 문서의 `schemaVersion`으로 올린다. 운영에서는 `chatId`를 파티션 키로 수평 확장한다 |
| 진행 중인 답변 | 서버 메모리 | 채팅마다 하나. 시작, 조각, 끝 | 수명이 연결 하나다. 저장하면 죽은 프로세스의 잠금이 남는다 |
| 지금 고른 사용자, 입력 초안, 사이드바 너비와 접힘 | 브라우저 `localStorage` | 화면 하나가 읽고 쓴다 | 기기 하나의 편의다 |

**나누는 기준:** 기기와 탭이 달라도 같아야 하는 데이터는 서버에 둔다. 그중 여러 행에 걸쳐 고르고 정렬하며 고유함과 참조를 지켜야 하는 것은 RDB에, 한 덩어리로 읽고 쓰며 모양이 자주 바뀌는 것은 문서 저장소에 둔다. 이 브라우저에서만 뜻이 있는 것(초안, 사이드바 너비)은 `localStorage`에 둔다. 그래서 고정은 RDB의 열이고 초안은 `localStorage`다. 새 데이터를 더할 때는 이 표에 행을 먼저 더한다. 기준 둘에 다 걸리면 멈추고 묻는다.

### 5.2 RDB 스키마

`server/store/rdb/migrations.ts`의 첫 마이그레이션이다. 시각은 epoch 밀리초 정수로 저장하고, 계약으로 낼 때 ISO 문자열로 바꾼다.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL COLLATE NOCASE UNIQUE,  -- 같은 이름은 대소문자를 가리지 않고 하나
  created_at    INTEGER NOT NULL
) STRICT;

CREATE TABLE chats (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  message_count  INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  pinned_at      INTEGER
) STRICT;
CREATE INDEX chats_recent ON chats(user_id, updated_at DESC, id DESC) WHERE pinned_at IS NULL;
CREATE INDEX chats_pinned ON chats(user_id, pinned_at DESC)           WHERE pinned_at IS NOT NULL;
```

**표는 둘이다.** 사용자와 채팅 목록. SQL은 고유 제약, 외래 키와 연쇄 삭제, 부분 인덱스와 행 값 비교로 하는 커서 페이지, 짧은 트랜잭션을 보일 만큼만 쓴다. ORM과 쿼리 빌더는 쓰지 않는다(TASKS D1).

**연결을 열 때:** `PRAGMA journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`. 마이그레이션은 `PRAGMA user_version`으로 어디까지 했는지 알고, 하나씩 트랜잭션으로 적용한다.

**주요 쿼리**

| 쓰임 | SQL | 잰 실행 계획(SQLite 3.51.3) |
| ---- | --- | --------------------------- |
| 목록 첫 페이지 | `SELECT … FROM chats WHERE user_id = ? AND pinned_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT ?` | `SEARCH chats USING INDEX chats_recent (user_id=?)` |
| 다음 페이지 | 위에 `AND (updated_at, id) < (?, ?)` | `SEARCH chats USING INDEX chats_recent (user_id=? AND (updated_at,id)<(?,?))` |
| 다음 페이지를 OR로 쓰면 | `AND (updated_at < ? OR (updated_at = ? AND id < ?))` | `… (user_id=?)`만. 범위를 인덱스로 좁히지 못한다. 쓰지 않는다 |
| 고정 목록 | `… WHERE user_id = ? AND pinned_at IS NOT NULL ORDER BY pinned_at DESC LIMIT 20` | `SEARCH chats USING INDEX chats_pinned (user_id=? AND pinned_at>?)` |
| 답변 뒤 요약 | `UPDATE chats SET updated_at = ?, message_count = ?, title = COALESCE(title, ?) WHERE id = ?` | 기본 키 |
| 고정 | `BEGIN IMMEDIATE`, 고정 수를 세고, 20 미만이면 `UPDATE`, `COMMIT` | 세는 쿼리가 `chats_pinned`를 쓴다 |

- 페이지는 `LIMIT`을 하나 더 받아 다음 페이지가 있는지 안다. `OFFSET`은 쓰지 않는다. 항목이 앞에 들어오거나 빠지면 페이지가 밀리기 때문이다.
- 부분 인덱스는 쿼리의 `WHERE`에 같은 조건(`pinned_at IS NULL`)이 있어야 쓰인다.
- 요약의 `message_count`는 `+1`이 아니라 문서에서 센 절대값을 쓴다. 몇 번을 다시 써도 같은 결과다.
- `title = COALESCE(title, ?)`이 "자동 제목은 한 번뿐"을 SQL로 지킨다.

### 5.3 문서 형태

파일 하나가 채팅 하나다: `{DATA_DIR}/chats/{chatId}.json`. 저장 모양은 서버 안의 타입이고, API 모양(`Message`)과 다르다. 바꾸는 일은 domain이 한다(DOM-7).

```json
{
  "schemaVersion": 1,
  "chatId": "cht_k3j9x2m4p7q8r5t6w2y4",
  "ownerId": "usr_a2b3c4d5e6f7g2h3i4j5",
  "version": 7,
  "parentId": null,
  "createdAt": "2026-11-18T09:14:03.512Z",
  "updatedAt": "2026-11-18T09:20:11.004Z",
  "messages": [
    {
      "id": "msg_…",
      "role": "user",
      "content": "Plan a three-day trip to Jeju",
      "status": "completed",
      "createdAt": "2026-11-18T09:20:08.120Z",
      "clientMessageId": "9b1f6c1e-3c2a-4a8e-a1f0-5d6c2b7e8f90"
    },
    {
      "id": "msg_…",
      "role": "assistant",
      "content": "Here's a plan…",
      "status": "completed",
      "createdAt": "2026-11-18T09:20:08.131Z",
      "responseId": "rsp_…",
      "reply": { "provider": "mock", "model": "mock-1", "seed": 41823, "firstTokenMs": 182, "durationMs": 2873, "chunks": 57, "endedBy": "completed" }
    }
  ]
}
```

| 필드 | 뜻 |
| ---- | -- |
| `schemaVersion` | 문서 모양의 버전. 읽을 때 옛 버전이면 올린다(DOC-4) |
| `ownerId` | RDB `chats.user_id`의 사본. 문서만으로 소유권을 한 번 더 확인하고, 고아 문서를 찾을 때 쓴다 |
| `version` | 쓸 때마다 1씩 오른다. 조건부 쓰기의 기준이다(DOC-5) |
| `parentId` | 하위 채팅을 위해 비워 둔 자리. 지금은 항상 `null` |
| `reply` | 답변 생성의 기록. 생성기마다 모양이 다르다. 문서 저장소를 고른 이유 하나다. API로 내지 않는다 |
| `reply.endedBy` | `completed`, `cancelled`, `client_closed`, `chat_deleted`, `shutdown`, `timeout`, `failed` |

### 5.4 연산별 쓰기 순서

두 저장소를 묶는 트랜잭션은 없다. 대신 아래 원칙과 순서로 맞춘다.

1. **존재와 소유권의 원본은 RDB다.** 문서만 있고 RDB 행이 없으면 없는 채팅이다.
2. **내용의 원본은 문서다.** RDB의 `message_count`와 `updated_at`은 목록을 위한 사본이다. 어긋나면 문서가 이긴다.
3. **만들 때는 RDB 먼저, 내용을 쓸 때는 문서 먼저, 지울 때는 RDB 먼저.** 어느 순간에 멈춰도 사용자에게 보이는 것은 "없음"이거나 "조금 늦은 요약"이지, "있는데 내용이 없음"이 아니다.
4. **요약은 절대값으로 쓴다.** 다시 써도 같아서, 실패한 쓰기는 다음 쓰기나 복구가 덮는다.

| 연산 | 순서 | 중간에 실패하면 |
| ---- | ---- | --------------- |
| 사용자 만들기 | RDB `users` INSERT | 고유 제약 위반(`errcode` 2067)이면 409 `name_taken` |
| 채팅 만들기 | RDB `chats` INSERT. 문서는 만들지 않는다 | 500 |
| 보내기 시작 | 1. 메모리 잠금. 2. 문서에 사용자 메시지와 빈 `streaming` 답변을 한 번에 붙인다. 3. RDB 요약 | 2가 실패하면 잠금을 풀고 500. 바뀐 것이 없다. 3이 실패하면 경고를 남기고 계속한다. 끝날 때 다시 쓴다 |
| 답변 끝(완료, 멈춤, 실패) | 1. 문서의 `streaming` 답변을 최종 상태로 바꾼다. 글이 빈 `incomplete`면 뺀다. 2. RDB 요약. 3. 잠금을 푼다 | 1이 실패하면 오류 로그를 남기고 잠금을 푼다. 문서에 `streaming`이 남고, 시작할 때의 복구가 `incomplete`로 바꾼다 |
| 이름 변경, 고정 | RDB만 | 400, 409 |
| 채팅 삭제 | 1. 진행 중인 답변을 멈추고 끝나기를 기다린다. 2. RDB DELETE(이 순간부터 404). 3. 문서 파일 삭제 | 3이 실패하면 고아 문서가 남는다. 복구와 `data:check --fix`가 지운다 |
| 사용자 삭제(스크립트만) | RDB DELETE. 채팅은 CASCADE. 문서는 고아가 된다 | 복구가 지운다 |

답변 도중에는 문서에 쓰지 않는다. 끝날 때 한 번 쓴다. 쓰기 횟수가 답변마다 둘로 고정되는 대신, 프로세스가 답변 도중에 죽으면 그 답변의 글은 잃는다(빈 `incomplete`로 복구되어 빠진다). 주기적으로 쓰는 안은 [15장](#15-결정-기록)의 ADR-005에 대안으로 적었다.

### 5.5 어긋났을 때 맞추기

`server/domain/recovery.ts`가 찾고 고친다. 플러그인이 처리기를 달기 전에 한 번 돌고, `bun run data:check`가 같은 코드를 보고만 하는 방식으로 돈다(`--fix`면 고친다, 어긋남이 있는데 `--fix`가 없으면 종료 코드 1).

| 어긋남 | 찾는 법 | 고치는 법 |
| ------ | ------- | --------- |
| 문서에 `streaming` 답변이 남았다(프로세스가 죽었다) | 모든 문서를 읽어 `status`를 본다 | 글이 있으면 `incomplete`, `reply.endedBy: 'shutdown'`. 없으면 뺀다. 요약을 다시 쓴다 |
| 고아 문서(RDB 행이 없다) | 문서 id 목록과 RDB id 목록의 차 | 문서를 지운다 |
| `ownerId`가 RDB와 다르다 | 둘을 비교한다 | 고치지 않는다. 오류로 보고하고 그 채팅의 읽기를 500으로 막는다. 원인을 사람이 본다 |
| 요약이 다르다 | `message_count`가 문서 길이와 다르거나, `updated_at`이 마지막 메시지 시각과 다르다 | RDB 요약을 다시 쓴다 |
| 남은 임시 파일 `*.tmp` | 폴더를 본다 | 지운다 |

e2e가 끝나면 워커마다 데이터 폴더에 `data:check`를 돌려 어긋남이 0인지 본다([11.4절](#114-e2e-서버와-데이터)). 수백 번의 전송, 중단, 삭제 뒤에도 두 저장소가 맞는다는 근거가 된다.

### 5.6 왜 하나로 하지 않는가

| 안 | 좋은 점 | 나쁜 점 |
| -- | ------- | ------- |
| 모두 RDB(`messages` 테이블) | 메시지와 요약을 트랜잭션 하나로 쓴다. 어긋남이 생기지 않는다. 이 규모에서는 충분히 빠르다 | 메시지 모양이 바뀔 때마다 마이그레이션이다. 커지면 메시지 테이블을 나눠야 한다 |
| 모두 문서 | 저장소가 하나다 | 이름의 고유함을 보장하기 어렵다. 여러 채팅에 걸친 정렬과 커서 페이지에 보조 인덱스가 필요하다. 사용자를 지울 때 연쇄 삭제를 직접 해야 한다 |
| 나눔(이 설계) | 데이터마다 맞는 접근 방식을 쓴다 | 두 저장소에 걸친 쓰기에 트랜잭션이 없어 순서와 복구 코드가 필요하다. 백업과 초기화가 둘이다 |

**판단:** 이 앱의 규모(사용자 몇 명, 채팅 수백 개)라면 SQLite 하나로 충분하다. 나눔은 일부러 고른 시연이고, 그 비용인 5.4절과 5.5절의 코드를 함께 보인다. 운영에서 나눔이 이기는 때는 메시지 쓰기가 목록 쓰기보다 훨씬 많고, 메시지 모양이 자주 바뀌고, 대화의 양이 RDB 한 대를 넘을 때다.

### 5.7 Windows와 파일 저장

| 규칙 | 근거 |
| ---- | ---- |
| 쓰기는 같은 폴더의 `{chatId}.json.{랜덤}.tmp`에 쓰고 `sync`한 뒤 `{chatId}.json`으로 이름을 바꾼다 | 쓰는 도중에 죽어도 문서가 반쯤 쓰인 채 남지 않는다 |
| 이름 바꾸기가 `EPERM`, `EACCES`, `EBUSY`면 10, 20, 40, 80, 160ms 간격으로 다시 하고, 그래도 안 되면 임시 파일을 지우고 던진다 | 잰 결과, 다른 핸들이 연 파일 위로 이름 바꾸기가 Node와 Bun 모두에서 `EPERM`이다. 백신과 색인기가 잠깐 파일을 잡는다. npm의 graceful-fs도 같은 이유로 Windows의 rename을 다시 시도한다 |
| 같은 문서의 읽기와 쓰기는 문서마다 하나인 프로세스 안의 잠금을 거친다 | 이 프로세스의 읽기가 이름 바꾸기를 막지 않게 한다. 같은 문서에 두 쓰기가 겹쳐 하나를 잃지 않게 한다 |
| 쓰기는 읽은 `version`을 조건으로 한다. 다르면 `ConflictError` | 한 프로세스에서는 잠금 때문에 늘 같다. 여러 쓰는 쪽이 생길 때를 위한 것이고, 문서 DB의 조건부 쓰기(DynamoDB의 `ConditionExpression`, MongoDB의 버전 필터)와 같은 모양이다 |
| 파일 이름은 형식을 검사한 id만 쓴다(`^cht_[a-z2-7]{20}$`) | 경로를 사용자 입력으로 만들지 않는다. `../`가 들어갈 수 없다 |
| 시작할 때 남은 `*.tmp`를 지운다 | 쓰는 도중에 죽은 흔적 |
| 문서는 JSON 하나를 통째로 다시 쓴다. 메시지 400개가 상한이다 | 상한에서 문서는 수 MB다. 넘으면 413 `chat_too_long`으로 새 채팅을 권한다 |

### 5.8 운영으로 옮길 때

이 설계는 로컬 한 프로세스가 전제다. 옮길 때 바뀌는 곳을 폴더로 가둬 둔다.

| 지금 | 옮기면 | 바뀌는 곳 |
| ---- | ------ | --------- |
| SQLite 파일 | PostgreSQL | `store/rdb`. 부분 인덱스와 행 값 비교는 PostgreSQL에도 있다. 포트는 처음부터 `Promise`를 돌려주므로(06단계) domain은 그대로다 |
| JSON 문서 파일 | DynamoDB(파티션 키 `chatId`), MongoDB, Cosmos DB | `store/docs`. DynamoDB는 항목 하나가 400KB까지라 메시지를 항목 하나씩(정렬 키에 순번) 나눠야 한다 |
| 사용자 고르기(`X-User-Id`) | 로그인과 세션, 또는 외부 인증 | `http/guards.ts`의 사용자 판별 한 곳과 4.3절의 사용자 API. domain은 사용자 id만 받으므로 그대로다 |
| 메모리 잠금 | Redis 잠금과 TTL, fencing token | `domain/answering.ts` |
| 시작할 때의 복구 | 주기 작업 | `domain/recovery.ts`를 부르는 곳 |
| Vite 플러그인으로 붙은 API | 독립 실행 서버 | `server/`에 진입점 하나를 더한다. `createApi`를 `node:http` 서버에 붙이고 빌드한 웹을 낸다. 다른 코드는 그대로다 |
| 프로세스 하나 | 인스턴스 여럿 | 취소 요청이 스트림을 가진 인스턴스에 닿아야 한다. pub/sub이 필요하다 |

## 6. 서버 구조

### 6.1 요청 하나의 흐름

`server/plugin.ts`가 Vite 서버가 뜰 때 설정을 읽고, RDB를 열어 마이그레이션하고, 문서 저장소를 열고, 복구를 돌린 뒤, `createApi(deps)`가 만든 처리기를 Vite의 `server.middlewares`에 단다. 처리기는 `/api`만 맡고 나머지는 `next()`로 Vite에 넘긴다. HTTP 테스트는 같은 `createApi`를 `node:http` 서버에 붙여 포트 0에서 띄운다.

`/api` 요청 하나의 처리 순서다.

1. 요청 ID: `X-Request-Id`를 만든다.
2. 접근 로그: 응답이 끝나면 한 줄 남긴다([12장](#12-운영과-관측)).
3. Host 검사, 상태 변경 요청의 Origin 검사.
4. JSON 본문: 64KB, `application/json`만.
5. 사용자: `X-User-Id` 머리의 id로 RDB에서 사용자를 찾아 `req.user`를 붙인다. 없거나 모르는 id면 붙이지 않고, 사용자가 필요한 경로가 401로 답한다.
6. 경로: `/api/health`, `/api/ready`, `GET`과 `POST /api/users`. 그 뒤로 사용자가 필요한 `/api/users/me`, `/api/chats/*`.
7. 웹 파일과 `index.html`은 Vite가 낸다. 처리기는 `/api`가 아닌 요청을 맨 앞에서 `next()`로 넘긴다.
8. `/api`의 없는 경로는 404 `not_found`.
9. 오류 처리: `DomainError`는 코드표대로, 검증 오류는 400, 본문 오류는 400과 413, 그 밖은 500과 오류 로그.

층마다 맡는 일은 [9장](#9-폴더별-정책)의 정책이 정한다. 요약하면 http는 검증과 변환, domain은 규칙과 순서, store는 저장, reply는 답변 생성이다.

### 6.2 답변 하나의 흐름

http는 스트림을 열기 전에 실패를 JSON으로 돌려줄 수 있어야 한다. 그래서 domain의 답변은 두 단계다.

1. **`prepareResponse(userId, chatId, input, clientMessageId)`:** 채팅을 찾고, 잠금을 잡고, 중복과 한도를 보고, 문서와 요약을 쓴다. 실패하면 `DomainError`를 던지고 잠금을 푼다. http는 이것을 JSON 오류로 낸다.
2. **`run.start(emit)`:** http가 SSE를 연 뒤 부른다. 답변 생성기에서 조각을 받아 `emit`으로 넘긴다. 끝나면 문서와 요약을 쓰고 잠금을 푼 뒤, 결과(`completed`, `incomplete`, `failed`)를 돌려준다. `emit`은 연결이 닫힌 뒤에는 아무것도 하지 않는다.

```text
idle -> preparing -> streaming -> finalizing -> done
                         |
                         +-- abort(reason) --> finalizing (incomplete)
                         +-- 생성기 오류 ----> finalizing (failed)
                         +-- 120초 초과 ----> finalizing (failed, timeout)
```

멈추는 이유(`AbortSignal`의 reason)는 `client_closed`(연결 끊김), `cancelled`(취소 API), `chat_deleted`, `shutdown`, `timeout`이다. 문서의 `reply.endedBy`와 로그에 남는다.

**답변 생성기 인터페이스**

```ts
type ReplyTurn = { role: 'user' | 'assistant'; content: string }

interface ReplyProvider {
  readonly name: string     // 'mock'
  readonly model: string    // 'mock-1'
  stream(request: { chatId: string; history: ReplyTurn[]; input: string }, signal: AbortSignal): AsyncIterable<string>
}
```

- mock은 `chatId`와 메시지 수로 시드를 정해 같은 입력에 같은 답을 낸다. 표, 목록, 코드 블록, 제목이 섞인 Markdown 답을 20~70ms 간격의 조각으로 낸다.
- mock에만 있는 테스트 지시어가 있다(REPLY-5). 입력에 `[[mock:long]]`이면 긴 답, `[[mock:slow]]`이면 조각 간격 300ms, `[[mock:fail-after=3]]`이면 세 조각 뒤 실패, `[[mock:never]]`이면 첫 조각을 보내지 않고 기다린다. `[[mock:echo]]`이면 지시어를 뺀 입력을 그대로 Markdown 답으로 돌려준다(XSS와 Markdown 테스트용).
- 실제 모델 어댑터(제안 작업 N3)는 같은 인터페이스를 구현하면 된다. domain과 http는 바뀌지 않는다.

### 6.3 잠금

| 잠금 | 위치 | 범위 | 풀리는 때 |
| ---- | ---- | ---- | --------- |
| 답변 잠금 | `domain/answering.ts`의 `Map<chatId, ActiveResponse>` | 채팅 하나, 답변 하나 | 답변이 끝날 때. `finally`에서 |
| 문서 잠금 | `store/docs`의 문서별 비동기 뮤텍스 | 문서 하나의 읽기 또는 쓰기 한 번 | 그 읽기나 쓰기가 끝날 때 |

- **잡는 순서:** 답변 잠금, 그다음 문서 잠금. 거꾸로 잡지 않는다.
- **문서 잠금을 쥔 채 기다리지 않는다:** 답변 생성기를 기다리는 동안 문서 잠금은 풀려 있다. 그래서 답변 중에도 그 채팅의 메시지 읽기가 된다.
- `ActiveResponse`는 `{ responseId, controller, done }`이다. 취소 API와 삭제와 종료는 `controller.abort(reason)` 뒤 `await done`한다. 그래서 취소 API의 응답이 오면 잠금은 이미 풀려 있다.
- 이 잠금들은 프로세스 안에만 있다. 인스턴스가 둘이면 맞지 않는다([5.8절](#58-운영으로-옮길-때)).

### 6.4 시작과 종료

**시작:** 플러그인의 `configureServer`와 `configurePreviewServer`에서 한다.

1. 설정을 읽고 검증한다. 틀리면 무엇이 틀렸는지 담아 던진다. Vite가 뜨지 않는다.
2. `DATA_RESET_ON_START=1`이면 데이터 폴더를 비운다([11.4절](#114-e2e-서버와-데이터)).
3. RDB를 열고 마이그레이션한다.
4. 문서 폴더를 만들고 `*.tmp`를 지운다.
5. 복구를 돈다([5.5절](#55-어긋났을-때-맞추기)).
6. 처리기를 단다. `server.started` 로그에 데이터 폴더, 런타임과 SQLite 버전을 남긴다.

**종료:** Vite의 HTTP 서버가 닫힐 때(`close`)와 `SIGINT`에서 한다.

1. 새 `/api` 요청을 503 `not_ready`로 거절한다.
2. 진행 중인 답변을 모두 `shutdown`으로 멈추고, 저장이 끝나기를 최대 5초 기다린다.
3. RDB를 닫는다.

Windows에는 `SIGTERM`이 오지 않고, Playwright는 서버를 강제로 끝낸다. 종료 처리가 돌지 않을 때가 많으므로, 시작할 때의 복구가 그 뒤를 맡는다.

## 7. 웹 구조

### 7.1 상태

`app.tsx`의 Provider 순서다.

```tsx
<UserProvider>                          // state/user.tsx: 지금 사용자, 고르기와 바꾸기
  <ToastProvider>                       // components/ui/toast.tsx
    <UserGate>                          // components/user: 사용자가 없으면 고르기 화면
      <ChatListProvider key={user.id}>  // state/chat-list.tsx: 고정 목록, 페이지, 요약 반영
        <ChatsProvider key={user.id}>   // state/chats.tsx: 채팅별 메시지, 답변, 대기열
          <AppShell />                  // components/shell
```

- `key={user.id}`라서 사용자가 바뀌면 목록과 메시지 저장소가 통째로 새로 만들어진다. 앞 사용자의 데이터가 남지 않는다(F-USER-3). `ChatsProvider`가 사라질 때 진행 중인 답변을 모두 멈춘다.
- 채팅별 데이터는 자주 바뀌고 열쇠마다 나뉘어서 context가 아니라 외부 저장소(`createChatStore`)와 `useSyncExternalStore`로 채팅 하나씩 구독한다(STATE-8). 조각 하나가 와도 그 채팅을 보는 컴포넌트만 다시 그린다.
- 답변의 `chat.updated`는 채팅 저장소가 받아 목록 state에 넘긴다. 두 state를 함께 바꾸는 일은 기능 훅 하나가 맡는다(STATE-9).

채팅 하나의 상태다.

```ts
type Thread = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  messages: Message[]
  error: ThreadError | null
  answer: {
    responseId: string | null
    messageId: string | null
    text: string
    phase: 'sending' | 'waiting' | 'streaming' | 'stopping'
  } | null
  queue: { id: string; input: string }[]   // 단계 12
  queueState: 'running' | 'paused'
}
```

### 7.2 전송과 중단

**보내기**

1. `clientMessageId = crypto.randomUUID()`를 만들고, 임시 사용자 메시지를 바로 보인다.
2. `sendMessage`의 이벤트마다: `response.created`에서 `responseId`를 기억한다. `message.created`에서 임시 메시지를 바꾼다. `chat.updated`는 목록으로 넘긴다. 조각은 `answer.text`에 붙인다. `output_text.done`에서 최종 메시지를 넣고 `answer`를 비운다.
3. 스트림을 열기 전의 실패(409, 413, 404, 네트워크): 임시 메시지를 빼고 쓴 글을 입력창에 돌려주고 이유를 보인다.
4. 도중의 실패(`StreamEndedEarlyError`, 네트워크): 받은 글을 유지한 채 서버와 맞춘다(`syncWithServer`). 그 뒤 `answer`를 비운다.

**멈추기**

1. `phase`를 `stopping`으로 둔다.
2. `responseId`가 있으면 취소 API를 기다린 뒤 연결을 닫는다. 취소 API가 실패하면 연결을 끊는다.
3. `responseId`가 아직 없으면(첫 이벤트 전) 연결을 끊는다. 서버가 `client_closed`로 처리한다.
4. 끝나면 메시지와 요약을 한 번 다시 읽어 맞춘다.

**채팅 열기:** 불러온 채팅은 다시 열어도 다시 읽지 않는다. 실패한 채팅은 다시 열면 다시 읽는다. 읽는 중에 다시 열면 요청을 또 보내지 않는다. 답변 중에 돌아온 읽기 결과로 진행 중인 답변을 덮지 않는다.

### 7.3 브라우저 규칙

세 엔진에서 지킬 브라우저 규칙이다. 컴포넌트 정책(COMP-)과 lib 정책(LIB-)이 이 목록을 가리킨다.

- 한글 조합 중 Enter는 `event.isComposing || event.keyCode === 229`로 거른다. Safari는 조합이 끝난 뒤 keydown을 보낸다
- 입력창 높이는 JS로 맞춘다. `field-sizing`은 세 엔진 공통 지원을 확인하지 못했다
- 중단은 오류 문구가 아니라 `signal.aborted`로 판단한다. 문구는 브라우저마다 다르다
- 날짜는 ISO 문자열만 `Date`에 넘긴다. 날짜 그룹은 지역 자정 기준이다
- Mac 판별은 `navigator.userAgentData?.platform`, 없으면 `navigator.platform`의 `Mac`이다. Safari와 Firefox는 `MacIntel`을 낸다
- 메뉴의 바깥 클릭은 문서의 `pointerdown`으로 받는다. WebKit은 클릭한 버튼에 포커스를 주지 않아 blur가 오지 않는다
- 단축키는 `event.key`가 라틴 문자가 아니면 `event.code`로 읽고, `event.repeat`는 무시한다
- 위로 가는 휠을 받으면 따라가기를 바로 멈춘다. Firefox는 휠 뒤 잠시 있다가 스크롤을 움직인다
- 사이드바가 목록 순서를 바꿀 때 보던 위치는 브라우저의 스크롤 고정에 기댄다. 실제 Safari는 확인하지 못했다
- 스트림을 그만 읽을 때는 `reader.cancel()`로 연결을 끝낸다. 그러지 않으면 서버는 계속 답한다
- 빈 줄 없이 끝난 마지막 이벤트도 읽는다

## 8. 폴더 구조

패키지 하나다. `POLICY.md`가 있는 폴더에는 ★를 붙였다. 정책이 없는 폴더(`docs`, `scripts`, `e2e`, `dev`)는 `AGENTS.md`와 `docs/test-plan.md`가 다룬다.

```text
chat-client-blueprint/       설계, 단계 프롬프트, 앱이 한 저장소다
├─ AGENTS.md                 에이전트 공통 규칙. Claude Code와 Codex가 함께 읽는다
├─ CLAUDE.md                 "@AGENTS.md" 한 줄
├─ README.md                 포트폴리오 소개와 앱의 실행 방법, 명령표
├─ TASKS.md                  포트폴리오 작업 목록(T, D, N). 앱의 단계 상태는 docs/TASKS.md
├─ prompts/                  단계 프롬프트 00~17. 사람이 붙이는 지시의 원본
├─ package.json, bun.lock    의존성 열 개와 스크립트(2.2절)
├─ tsconfig.json             웹, 서버, 계약, 스크립트를 한 번에 본다. 테스트 파일은 뺀다
├─ vite.config.ts            react 플러그인과 API 플러그인(server/plugin.ts)
├─ playwright.config.ts      e2e. 워커마다 서버와 데이터 폴더가 따로다
├─ index.html
├─ .editorconfig, .gitattributes, .gitignore
├─ .claude/settings.json     에이전트 권한
├─ data/                     git 제외. app.db, chats/*.json
├─ docs/
│  ├─ DESIGN.md              이 문서
│  ├─ API.md                 HTTP 계약. 이 문서 4장에서 시작한다
│  ├─ DECISIONS.md           ADR과 따르지 않은 AI 제안. 이 문서 15장에서 시작한다
│  ├─ TASKS.md               단계별 진행 상태
│  ├─ test-plan.md           테스트 층, 실행 시점, 작성 규칙, 직접 확인 목록
│  ├─ Issues.md              결함 목록. 15단계에서 만든다
│  ├─ Improvements.md        개선 후보 목록. 15단계에서 만든다
│  ├─ READING.md             사람이 읽을 곳과 읽음 체크. 01단계에서 만들고 단계마다 더한다
│  ├─ QA.md                  예상 질문과 근거 링크. 17단계에서 만든다
│  ├─ explain/               폴더별 설명 준비. 17단계에서 만든다
│  ├─ evidence/              화면 캡처, 측정표, 직접 확인 기록(3.7절, 11.6절)
│  └─ REPORT.md              결과 보고. 17단계에서 만든다
├─ scripts/
│  ├─ check-imports.ts       의존 방향, Bun 전용 API, 서버의 console 검사(9.2절)
│  ├─ check-css.ts           색 리터럴, 테마 밖 사용, !important, 멈추지 않는 애니메이션
│  ├─ seed.ts, reset.ts, check-data.ts, clean.ts
│  └─ *.test.ts              위 스크립트의 모듈 테스트
├─ e2e/
│  ├─ fixtures.ts            사용자를 고른 page(asUser), API로 채팅 만들기, 고유 이름
│  └─ global-teardown.ts     워커마다 data:check를 돌려 두 저장소가 맞는지 본다
├─ dev/
│  └─ ui.html, ui.tsx        부품 견본 화면. 개발 서버에서만 열리고 빌드에 들어가지 않는다(04단계)
├─ public/favicon.svg
├─ shared/                   ★ CON. 웹과 서버가 함께 쓰는 계약
│  ├─ contract.ts            User, ChatSummary, Message, ChatPage, StreamEvent 등 4장의 타입
│  ├─ limits.ts              3.6절의 한도
│  └─ errors.ts              4.7절의 오류 코드
├─ server/                   API. Vite 플러그인으로 붙는다
│  ├─ plugin.ts              Vite 플러그인. 저장소를 열고, 복구하고, 처리기를 달고, 닫힐 때 정리한다
│  ├─ app.ts                 createApi(deps): /api만 맡고 나머지는 next()로 넘기는 처리기
│  ├─ config.ts              환경 변수 읽기
│  ├─ http/                  ★ HTTP
│  │  ├─ router.ts           메서드와 경로 틀 맞추기
│  │  ├─ body.ts, validate.ts, sse.ts, errors.ts
│  │  ├─ guards.ts           요청 ID, 접근 로그, Host와 Origin, 사용자 판별, 사용자 필요
│  │  └─ routes/             users.ts, chats.ts, messages.ts, responses.ts, health.ts
│  ├─ domain/                ★ DOM
│  │  ├─ ports.ts            저장소, 생성기, 시계, id의 인터페이스
│  │  ├─ errors.ts           DomainError
│  │  ├─ users.ts, chats.ts, messages.ts, responses.ts
│  │  ├─ answering.ts        답변 잠금
│  │  ├─ recovery.ts         두 저장소 맞추기
│  │  └─ mappers.ts          저장 모양을 계약 모양으로
│  ├─ store/                 ★ STORE, RDB, DOC
│  │  ├─ rdb/                database.ts, migrations.ts, users.ts, chats.ts
│  │  └─ docs/               chat-documents.ts, document-schema.ts, atomic-write.ts
│  ├─ reply/                 ★ REPLY. mock-provider.ts, mock-answers.ts, directives.ts
│  └─ lib/                   ★ SLIB. log.ts, clock.ts, ids.ts, mutex.ts, retry.ts, random.ts
└─ src/                      웹
   ├─ main.tsx, app.tsx      CSS 가져오기, Provider 순서(7.1절)
   ├─ api/                   ★ API. client.ts, users.ts, chats.ts, messages.ts, sse.ts, responses.ts
   ├─ lib/                   ★ LIB. router.tsx, markdown.tsx, dates.ts, platform.ts, keys.ts, storage.ts, format.ts, use-*.ts
   ├─ state/                 ★ STATE. user.tsx, chat-list.tsx, chat-list-rules.ts, chats.tsx, queue-rules.ts, drafts.ts
   ├─ components/            ★ COMP
   │  ├─ ui/                 button, icon-button, menu, dialog, confirm-dialog, tooltip, toast, skeleton, spinner, icons, resize-handle
   │  ├─ user/               user-gate, user-picker
   │  ├─ chat/               chat-screen, message-list, message-view, composer, composer-notice, queued-message, chat-menu, chat-name-input, jump-to-latest, pending-answer, use-follow-latest
   │  ├─ home/               home-screen, not-found
   │  └─ shell/              app-shell, sidebar, chat-list, chat-row, user-menu, shortcuts, shortcut-help, screen-boundary
   └─ styles/                ★ STYLE. tokens.css, base.css, ui.css, shell.css, chat.css, user.css
```

테스트 파일은 대상 옆에 둔다. 모듈 테스트와 HTTP 테스트는 `*.test.ts`, 브라우저 테스트는 `*.e2e.ts`다. `*.spec.ts`는 쓰지 않는다. `bun test`가 그것도 줍기 때문이다.

## 9. 폴더별 정책

### 9.1 정책 파일의 형식

폴더마다 `POLICY.md` 하나를 아래 형식으로 둔다.

```markdown
# <폴더> 정책

**상태:** 작성 중 | 승인

## 범위
맡는 일(목록)과 맡지 않는 일(표: 일, 맡는 곳)

## 가리키는 다른 정책
AGENTS.md와 DESIGN.md에 이미 있는 기준은 다시 쓰지 않고 링크한다

## 규칙
#### <ID>. <규칙 한 문장> (반드시 | 기본)
- **규칙:** 무엇을 하고 무엇을 하지 않는가
- **이유:** 이 규칙이 없으면 무엇이 깨지는가. 잰 값이나 실제로 깨진 사례가 있으면 적는다
- **예:** 지금 코드의 위치
- **확인 방법:** 자동(check:imports, check:css, tsc, 테스트 이름) 또는 리뷰

## 예외
## 알려진 차이
지금 코드가 규칙과 다른 곳과 그 이유

## 변경 기록
```

- **상태:** 폴더를 처음 만드는 단계에서 "작성 중"으로 만든다. 그 단계의 검토에서 사람이 승인하면 "승인"으로 바꾼다. "승인"인 정책만 규칙이다. "작성 중"은 참고만 한다.
- **확인 방법:** "리뷰"에 맡기는 규칙을 줄인다. 의존 방향을 `check:imports`로, 계약을 `tsc`와 HTTP 테스트로 옮겨 "자동"을 늘린다. 린터 없이 스크립트 하나로 한다.
- **우선순위:** `AGENTS.md`, `docs/DESIGN.md`, `POLICY.md` 순이다. 부딪히면 멈추고 사람에게 묻는다.
- **ID:** 한 번 쓴 ID는 다시 쓰지 않는다. 없앤 규칙은 지우지 않고 제목 끝에 "(폐지)"를 붙이고, 이유를 변경 기록에 쓴다. 다른 문서와 커밋 메시지가 그 ID를 가리키고 있기 때문이다.
- **초안을 뽑는 법:** 코드가 생긴 뒤에 쓰는 정책은 지금 코드에서 뽑는다. 규칙마다 따르는 실제 위치(`파일:줄`)를 예로 들고, 확인 방법의 명령은 한 번 돌려 결과를 본다. 초안 끝에는 표 셋을 둔다. 어긋난 곳(위치, 고치는 비용, 두면 생길 위험), 사람이 정할 것, 덜어낼 수 있는 e2e 후보. 어긋난 곳은 "규칙을 어긴 곳"과 "아직 규칙이 없는 새 모양"으로 나눠 적는다. 승인 전에는 동작을 바꾸는 정리를 하지 않는다.
- **글의 모양:** 규칙은 현재형으로, 주제별로 쓴다. "하기로 했다", "이번 단계에서" 같은 과정의 말과 커밋 해시는 변경 기록에만 쓴다. 정할 것, 넘겨받은 것, 후보 같은 작업용 표는 그 단계가 끝나면 정리한다. 확인: 변경 기록 밖에서 과정의 말을 grep한다.
- **다른 규칙을 옮겨 쓰지 않는다:** 규칙 문장에 다른 규칙의 세부(값, 목록)를 박지 않고 ID로 가리킨다. 옮겨 쓴 세부는 한쪽만 바뀌어 어긋난다.
- **변경 기록:** 한 줄에 날짜, 규칙 ID, 바뀐 내용, 커밋, 계기(누가 무엇 때문에)를 쓴다.

### 9.2 의존 방향

```text
shared   <──  server, src                (shared는 아무것도 가져오지 않는다)

server
  plugin.ts, app.ts ──> http ──> domain <── store      (store와 reply는 domain/ports.ts만)
                                   ^   <── reply
  lib  <── 모두                    (lib은 server의 다른 폴더를 가져오지 않는다)

src
  components ──> state ──> api ──> shared
       |           |
       +──> lib <──+               (lib은 react와 shared만)
  styles  <── main.tsx만

server  와  src 는 서로 가져오지 않는다(EDGE-1)
```

- domain이 인터페이스(`ports.ts`)를 갖고, store와 reply가 그것을 구현한다. 그래서 domain은 SQL과 파일을 모른다. 조립은 `plugin.ts`와 테스트가 한다.
- 폴더 사이의 경계 규칙은 둘이다.

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| EDGE-1 | 반드시 | `server`와 `src`는 서로 가져오지 않는다. 둘이 함께 쓰는 것은 `shared`에만 둔다 | 서버 코드가 웹 번들에 들어가거나 그 반대가 되지 않게 한다 | `check:imports` |
| EDGE-2 | 반드시 | `server`와 `scripts`는 Bun 전용 API(`bun:*` 모듈, `Bun.` 전역)를 쓰지 않는다. `node:` 모듈만 쓴다 | 서버를 Node에서도 돌게 둔다. 널리 쓰는 백엔드 런타임(Node.js)과 운영 도구의 지원 범위 때문이다. 테스트 파일의 `bun:test`만 예외다 | `check:imports` |

**`check:imports`의 표.** 아래를 어기는 import가 있으면 파일, 줄, 규칙 ID를 찍고 종료 코드 1로 끝난다. 상대 경로를 저장소 기준 경로로 풀어서 본다.

| 파일 | 가져오면 안 되는 것 | 규칙 |
| ---- | ------------------- | ---- |
| `shared/**` | `shared` 밖의 모든 것 | CON-3 |
| `server/**` | `src/**`, `react`, `bun:*`, `Bun.` 전역 | EDGE-1, EDGE-2 |
| `server/http/**` | `server/store/**`, `server/reply/**` | HTTP-1 |
| `server/domain/**` | `node:http`, `node:sqlite`, `node:fs`, `node:fs/promises`, `server/http/**`, `server/store/**`, `server/reply/**` | DOM-1 |
| `server/store/rdb/**` | `server/store/docs/**`, `server/http/**`, `server/reply/**`, `server/domain/**`(`ports.ts` 빼고) | STORE-2 |
| `server/store/docs/**` | `server/store/rdb/**`, `server/http/**`, `server/reply/**`, `server/domain/**`(`ports.ts` 빼고) | STORE-2 |
| `server/reply/**` | `server/store/**`, `server/http/**`, `server/domain/**`(`ports.ts` 빼고) | REPLY-3 |
| `server/lib/**` | `server`의 다른 폴더 | SLIB-1 |
| `server/**`의 테스트 아닌 파일 | `console.` 호출 | SLIB-2 |
| `src/**` | `server/**`, `node:*` | EDGE-1 |
| `src/api/**` | `react`, `react-dom`, `src/state/**`, `src/components/**`, `src/lib/**` | API-3 |
| `src/lib/**` | `src/api/**`, `src/state/**`, `src/components/**` | LIB-1 |
| `src/state/**` | `src/components/**`, `src/lib/router.tsx` | STATE-5, STATE-7 |
| `src/components/ui/**` | `src/state/**`, `src/api/**`, `components`의 다른 하위 폴더 | COMP-2, COMP-1 |
| `src/components/user/**` | `chat`, `home`, `shell` | COMP-1 |
| `src/components/chat/**` | `user`, `home`, `shell` | COMP-1 |
| `src/components/home/**` | `user`, `shell` | COMP-1 |

### 9.3 shared

**맡는 일:** HTTP 계약의 타입(`contract.ts`), 오류 코드 목록(`errors.ts`), 한도 상수(`limits.ts`). **맡지 않는 일:** 입력 검증(서버의 `http/validate.ts`), 저장 모양(store), 화면 문구(components).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| CON-1 | 반드시 | 계약을 바꿀 때는 `docs/API.md`의 표를 먼저 고치고, 같은 커밋에서 `contract.ts`를 맞춘다 | 사람이 읽는 계약과 코드의 계약이 어긋나지 않게 한다 | 리뷰. HTTP 테스트가 응답의 필드 목록을 계약과 맞대 본다 |
| CON-2 | 반드시 | 계약 타입은 `contract.ts` 한 곳에만 있다. 서버와 웹에 같은 모양을 다시 쓰지 않는다 | 사본이 생기면 하나만 고쳐진다 | 리뷰 |
| CON-3 | 반드시 | `shared`는 아무것도 가져오지 않는다. 타입과 상수뿐이다 | 웹과 서버가 함께 가져오는 폴더다. 여기에 런타임 코드가 생기면 두 쪽이 엮인다 | `check:imports` |
| CON-4 | 기본 | 이벤트 이름과 오류 코드는 문자열 리터럴 유니온이다. 쓰는 쪽의 `switch`는 `never` 검사로 끝낸다 | 새 이벤트를 더하면 처리하지 않은 곳을 tsc가 찾는다 | tsc |
| CON-5 | 반드시 | 필드를 빼거나 뜻을 바꾸는 변경은 ADR을 남긴다. 더할 때는 선택 필드로 더한다 | 옛 클라이언트가 깨지지 않게 한다 | 리뷰 |

### 9.4 server/http

**맡는 일:** 라우터, 본문 읽기, 입력 검증, 상태 코드, SSE 쓰기, 요청 ID, 접근 로그, Host와 Origin 검사, 사용자 판별(`X-User-Id`). **맡지 않는 일:** 규칙과 순서(domain), SQL과 파일(store), 답변 글(reply), 로그 형식(lib).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| HTTP-1 | 반드시 | 라우트는 셋만 한다: `validate.ts`의 함수로 입력을 검증하고, domain 함수 하나를 부르고, 결과를 응답으로 낸다. 저장소를 직접 부르지 않는다 | 규칙이 라우트에 흩어지면 테스트할 곳이 둘이 된다 | `check:imports` |
| HTTP-2 | 반드시 | HTTP 상태는 `http/errors.ts`의 표 하나(`Record<ErrorCode, number>`)가 정한다 | 같은 오류가 경로마다 다른 상태로 나가지 않게 한다. 코드를 더하면 tsc가 표의 빈칸을 잡는다 | HTTP 테스트가 4.7절의 코드마다 상태를 본다 |
| HTTP-3 | 반드시 | 사용자가 필요한 경로(`/api/users/me`, `/api/chats` 아래 전체)는 사용자 검사 뒤에 둔다. 라우트는 사용자 id만 domain에 넘긴다 | 경로를 더할 때 사용자 검사를 빠뜨리지 않게 한다 | HTTP 테스트: `X-User-Id` 없이, 또 없는 id로 부르면 그 경로가 모두 401 |
| HTTP-4 | 반드시 | SSE는 `http/sse.ts`만 쓴다. 머리(`text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`), 즉시 flush, 15초마다 `: ping`, 끝의 `[DONE]` | 프록시가 묶거나 끊지 않게 한다 | HTTP 테스트 |
| HTTP-5 | 반드시 | 연결 끊김은 `res`의 `close`에서 `res.writableFinished === false`로 판단한다. `req`의 `close`는 쓰지 않는다 | 잰 결과, Node 22와 Bun 1.4 모두에서 `req`의 `close`는 본문을 다 읽은 직후, 끊기 전에 온다. | HTTP 테스트: 끊으면 `incomplete`로 저장되고, 끊지 않으면 `completed` |
| HTTP-6 | 반드시 | 로그에 본문과 메시지 내용을 남기지 않는다 | 로그는 개인정보를 담지 않는다(career-radar와 같은 원칙) | HTTP 테스트가 로그 출력에서 보낸 글을 찾는다 |
| HTTP-7 | 반드시 | Host와 Origin 검사는 모든 `/api` 경로 앞에 둔다 | DNS 재바인딩과 다른 사이트의 요청을 막는다 | HTTP 테스트 |
| HTTP-8 | 기본 | 응답 본문은 domain이 돌려준 계약 값이다. http에서 모양을 바꾸지 않는다 | 변환이 두 곳이면 하나가 빠진다(DOM-7) | 리뷰 |
| HTTP-9 | 반드시 | 입력 검증은 `validate.ts`의 함수가 한다. 함수는 계약 타입의 값을 돌려주거나 `fields`가 있는 `invalid_request`를 던진다. 라우트마다 손으로 검증하지 않는다 | Zod 없이도 검증과 타입이 한 곳에서 맞물리게 한다 | 모듈 테스트: 함수마다 맞는 예와 틀린 예 |

### 9.5 server/domain

**맡는 일:** 사용 사례(사용자 만들기, 목록, 이름, 고정, 삭제, 답변), 소유권, 두 저장소에 걸친 쓰기 순서, 답변 잠금, 복구, 저장 모양을 계약 모양으로 바꾸기. **맡지 않는 일:** HTTP(http), SQL과 파일(store), 답변 글(reply).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| DOM-1 | 반드시 | domain은 `node:http`, `node:sqlite`, `node:fs`를 가져오지 않는다. 바깥은 `ports.ts`의 인터페이스로 받는다 | 저장소를 바꿔도 규칙이 그대로이게 한다(5.8절). 테스트는 가짜 저장소를 따로 만들지 않고 `:memory:`나 임시 폴더의 진짜 저장소를 쓴다 | `check:imports` |
| DOM-2 | 반드시 | 두 저장소에 걸친 쓰기 순서는 domain에서만 정하고 5.4절의 표를 따른다 | 순서가 흩어지면 어긋남을 복구 코드가 다 알 수 없다 | 리뷰. 모듈 테스트가 저장소 호출 순서를 기록해 본다 |
| DOM-3 | 반드시 | 소유권은 domain이 본다. 남의 채팅은 `chat_not_found`다 | 있는지조차 알려 주지 않는다 | HTTP 테스트: 다른 사용자의 채팅은 모든 경로에서 404 |
| DOM-4 | 반드시 | 오류는 `DomainError(code)`로 던진다. `code`는 계약의 오류 코드이고, domain은 HTTP 상태를 모른다 | 상태를 정하는 곳은 HTTP-2 하나다 | tsc |
| DOM-5 | 기본 | 시간과 id는 주입받은 `clock`, `ids`로 만든다 | 테스트가 시간을 고정하고 순서를 재현한다 | 리뷰(`Date.now`, `Math.random` 검색) |
| DOM-6 | 반드시 | 답변 잠금은 `finally`에서 푼다. 답변 생성기를 기다리는 동안 문서 잠금을 쥐지 않는다(6.3절) | 잠금이 남으면 그 채팅은 영원히 409다 | 모듈 테스트: 생성기가 던져도, 멈춰도, 시간이 넘어도 다음 전송이 된다 |
| DOM-7 | 기본 | 저장 모양을 계약 모양으로 바꾸는 일은 `mappers.ts`가 한다. `reply`, `ownerId`, `version` 같은 내부 필드는 내지 않는다 | 저장 모양이 바뀌어도 API가 흔들리지 않게 한다 | HTTP 테스트가 응답에 계약에 없는 필드가 없는지 본다 |
| DOM-8 | 반드시 | 취소, 삭제, 종료는 `abort(reason)` 뒤 그 답변의 `done`을 기다린 다음에 응답한다 | 응답을 받은 클라이언트의 다음 요청이 409를 보지 않게 한다(F-STOP-3) | HTTP 테스트: 취소 응답 직후의 전송이 20번 모두 200 |

### 9.6 server/store

`store/rdb`와 `store/docs` 두 하위 폴더를 정책 하나로 다룬다. 이 정책의 중심은 [5.1절](#51-어디에-무엇을-두는가)의 표다.

**맡는 일:** `rdb`는 SQLite 연결, 마이그레이션, 사용자와 채팅 목록의 저장소. `docs`는 채팅 문서의 읽기와 쓰기, 문서 잠금, 원자적 쓰기, 문서 모양과 버전 올리기. **맡지 않는 일:** 쓰기 순서와 소유권(domain), 계약 변환(domain), 두 저장소 맞추기의 판단(domain의 `recovery.ts`).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| STORE-1 | 반드시 | 어느 데이터가 어느 저장소인지는 DESIGN 5.1절의 표가 정한다. 새 데이터는 표에 먼저 더한다 | 나눔의 근거가 한 곳에 있어야 한다 | 리뷰 |
| STORE-2 | 반드시 | `rdb`와 `docs`는 서로 가져오지 않는다. domain에서는 `ports.ts`만 가져온다 | 두 저장소를 묶는 일은 domain만 한다(DOM-2) | `check:imports` |
| STORE-3 | 반드시 | 저장소의 오류는 이름 있는 오류(`UniqueViolation`, `TooManyPins`, `ConflictError`, `ChatTooLong`, `CorruptDocument`)로 바꿔 던진다 | domain이 SQLite와 파일 시스템의 오류 코드를 모르게 한다 | 모듈 테스트 |
| RDB-1 | 반드시 | 스키마는 `migrations.ts`의 순서 있는 목록이고 `user_version`으로 적용한다. 적용한 마이그레이션은 고치지 않고 새로 더한다 | 이미 만든 DB 파일이 있는 곳에서도 같은 스키마가 된다 | 모듈 테스트: 빈 DB와 한 버전 전의 DB가 모두 최신이 된다 |
| RDB-2 | 반드시 | SQL에 값을 이어 붙이지 않는다. 준비문과 바인딩만 쓴다 | SQL 주입 | 리뷰(`prepare(` 안의 템플릿 문자열 검색) |
| RDB-3 | 반드시 | 목록은 커서와 행 값 비교 `(updated_at, id) < (?, ?)`로 읽는다. `OFFSET`과 OR 형태를 쓰지 않는다 | 잰 결과, 행 값 비교만 인덱스 범위를 쓴다. `OFFSET`은 앞에 항목이 들어오면 밀린다 | 모듈 테스트가 `EXPLAIN QUERY PLAN`에 `chats_recent`와 `(updated_at,id)<`가 있는지 본다 |
| RDB-4 | 반드시 | 여러 문장을 쓰는 연산은 트랜잭션이다. 읽고 나서 쓰는 연산(고정 수 세기)은 `BEGIN IMMEDIATE`다 | 동시에 고정해 21개가 되지 않게 한다 | 모듈 테스트 |
| RDB-5 | 반드시 | 외래 키를 켜고, 연쇄 삭제는 스키마가 맡는다. 코드로 자식 행을 지우지 않는다 | 지우는 경로가 둘이면 하나가 빠진다 | 모듈 테스트: 사용자를 지우면 그 채팅이 사라진다 |
| RDB-6 | 기본 | 시각은 epoch 밀리초 정수다. 문자열로 바꾸는 일은 domain의 `mappers.ts`가 한다 | 정렬과 비교가 정수로 된다 | 리뷰 |
| DOC-1 | 반드시 | 문서 하나는 채팅 하나이고, 파일 이름은 형식을 검사한 `chatId`다 | 경로를 입력으로 만들지 않는다 | 모듈 테스트: 형식이 틀린 id는 파일 시스템에 닿기 전에 거절된다 |
| DOC-2 | 반드시 | 쓰기는 임시 파일, `sync`, 이름 바꾸기다. `EPERM`, `EACCES`, `EBUSY`면 5.7절의 간격으로 다시 한다 | 잰 결과, Windows에서 열린 파일 위로 이름 바꾸기가 `EPERM`이다 | 모듈 테스트: 이름 바꾸기를 대신하는 함수가 두 번 `EPERM`을 내고 세 번째에 성공한다. Windows에서는 대상 파일을 열어 둔 채 쓰는 테스트도 돈다 |
| DOC-3 | 반드시 | 같은 문서의 읽기와 쓰기는 문서 잠금을 거친다 | 겹친 쓰기 하나를 잃지 않고, 이 프로세스의 읽기가 이름 바꾸기를 막지 않는다 | 모듈 테스트: 같은 문서에 붙이기 100번을 동시에 하면 100개가 모두 남는다 |
| DOC-4 | 반드시 | 문서는 `schemaVersion`을 갖는다. 읽을 때 옛 버전을 올리고, 다음 쓰기에서 새 버전으로 저장한다. 올리는 함수는 버전마다 하나다 | 마이그레이션 없이 모양을 바꾸는 것이 문서 저장소를 고른 이유다 | 모듈 테스트: 고정해 둔 옛 문서 파일을 읽는다 |
| DOC-5 | 기본 | 쓰기는 읽은 `version`을 조건으로 하고, 다르면 `ConflictError`다 | 여러 쓰는 쪽이 생겨도 같은 모양으로 막는다(5.7절) | 모듈 테스트 |
| DOC-6 | 기본 | 읽은 문서는 `document-schema.ts`의 검사 함수로 확인한다. 깨진 문서는 `CorruptDocument`로 던지고 지우지 않는다 | 깨진 파일을 조용히 지우면 원인을 잃는다 | 모듈 테스트 |

### 9.7 server/reply

**맡는 일:** `ReplyProvider` 구현(지금은 mock), 시드, 조각 나누기, 테스트 지시어. **맡지 않는 일:** 저장, 잠금, 요약(domain).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| REPLY-1 | 반드시 | 답변 생성은 `ReplyProvider` 인터페이스 하나로만 낸다 | 실제 모델을 붙여도 domain이 바뀌지 않는다 | tsc |
| REPLY-2 | 반드시 | `signal`이 abort되면 다음 조각 전에 멈춘다. 기다리는 중이면 바로 깬다 | 멈춤이 늦으면 취소 응답도 늦다(DOM-8) | 모듈 테스트: abort 뒤 50ms 안에 끝난다 |
| REPLY-3 | 반드시 | reply는 저장소와 http를 가져오지 않는다 | 생성기는 글만 만든다 | `check:imports` |
| REPLY-4 | 기본 | mock은 결정적이다. 같은 채팅, 같은 메시지 수, 같은 입력에 같은 조각을 낸다 | e2e와 HTTP 테스트가 결과를 비교할 수 있다 | 모듈 테스트 |
| REPLY-5 | 반드시 | 테스트 지시어는 mock에만 있고 아래 목록뿐이다. 지시어는 답변 글에 나오지 않는다 | 테스트용 문이 실제 생성기로 새지 않게 한다 | 모듈 테스트 |
| REPLY-6 | 기본 | 조각 간격은 설정 `REPLY_DELAY_SCALE`(기본 1, 0이면 지연 없음)로 늘이고 줄인다. HTTP 테스트는 0으로 돈다 | 테스트 시간을 줄인다 | 설정 테스트 |

테스트 지시어 목록: `[[mock:long]]`(조각 300개쯤의 긴 답), `[[mock:slow]]`(조각 간격 300ms), `[[mock:fail-after=N]]`(N조각 뒤 실패), `[[mock:never]]`(첫 조각을 보내지 않고 abort를 기다림), `[[mock:echo]]`(지시어를 뺀 입력을 그대로 답으로).

### 9.8 server/lib

**맡는 일:** 앱 데이터를 모르는 도구. 로그, 시계, id, 뮤텍스, 다시 시도, 시드 난수, 해시. **맡지 않는 일:** 앱 데이터와 규칙.

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| SLIB-1 | 반드시 | lib은 `server`의 다른 폴더를 가져오지 않는다 | 모두가 가져오는 폴더라 순환이 생긴다 | `check:imports` |
| SLIB-2 | 반드시 | 서버 코드의 로그는 `lib/log.ts`만 쓴다. `console.*`는 `scripts/`와 테스트에서만 쓴다 | 로그 형식이 하나여야 모아서 볼 수 있다(12장) | `check:imports` |
| SLIB-3 | 기본 | 시간과 난수가 필요한 함수는 그것을 인자로 받을 수 있다 | 테스트가 고정한다 | 리뷰 |
| SLIB-4 | 기본 | 한 폴더에서만 쓰는 도구는 그 폴더에 둔다 | lib이 잡동사니가 되지 않게 한다 | 리뷰 |

### 9.9 src/api

서버를 이 저장소가 가지므로, API에 없는 기능은 클라이언트에서 흉내 내지 않고 계약을 먼저 바꾼다.

**맡는 일:** 계약의 경로를 타입 있는 함수로 부르기, `X-User-Id` 머리 붙이기, `ApiError`, SSE 읽기와 연결 끝내기, 취소, 401 알림. **맡지 않는 일:** 재시도(state), 상태 코드의 뜻(state와 components), 화면 문구(components), 캐시(state), 로컬 저장(lib의 `storage.ts`).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| API-1 | 반드시 | 계약은 `shared/contract.ts`가 먼저다. 이 폴더에 같은 모양의 타입을 다시 쓰지 않는다 | CON-2 | 리뷰 |
| API-2 | 반드시 | 타입과 상수는 `shared`에서 가져오고, `server`는 가져오지 않는다 | EDGE-1 | `check:imports` |
| API-3 | 반드시 | React와 웹의 다른 폴더를 가져오지 않는다 | 어디서나 부를 수 있는 가장 아래 층이다 | `check:imports` |
| API-4 | 반드시 | 요청은 `request()` 하나를 거친다. JSON, 지금 사용자의 `X-User-Id` 머리, `ApiError`, 401이면 `onUnauthorized` 알림. 스트림도 같은 머리와 오류를 쓴다 | 401 처리나 머리가 경로마다 다르면 하나가 빠진다(F-USER-4) | 리뷰 |
| API-5 | 기본 | 읽기와 오래 걸리는 요청은 `signal`을 받는다 | STATE-10의 `AbortController` | 리뷰 |
| API-6 | 반드시 | 실패는 `ApiError(status, code, message)`로 던지고, 뜻은 호출한 쪽이 정한다 | 404가 어떤 화면에서는 성공이다(F-DELETE-1) | 모듈 테스트 |
| API-7 | 반드시 | 스트림 연결은 `sendMessage`가 끝낸다. 호출한 쪽이 루프를 일찍 떠나도 `finally`에서 `reader.cancel()`한다 | 그러지 않으면 서버가 계속 답한다 | 모듈 테스트(fetch 대체) |
| API-8 | 반드시 | `[DONE]` 없이 닫힌 스트림은 `StreamEndedEarlyError`다. 빈 줄 없이 끝난 마지막 이벤트와 `\r\n`도 읽는다 | 끊김과 정상 종료를 가른다 | 모듈 테스트 |
| API-9 | 기본 | API에 없는 기능이 필요하면 클라이언트에서 흉내 내지 않고 계약을 먼저 바꾼다(CON-1) | 흉내 낸 기능은 기기 사이에 이어지지 않는다 | 리뷰 |

### 9.10 src/lib

**맡는 일:** 화면과 앱 상태에 기대지 않는 도구. 라우터, Markdown 렌더러, 날짜, 플랫폼, 단축키 해석, 저장소 도우미, 형식, 훅. **맡지 않는 일:** 서버 요청(api), 앱 데이터(state), 앱 데이터의 저장 열쇠(state), 화면과 문구(components). 예외로 `markdown.tsx`는 답변 본문을 그리는 데까지 맡는다.

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| LIB-1 | 반드시 | react와 `shared`까지만 가져온다 | 모두가 가져오는 폴더다 | `check:imports` |
| LIB-2 | 반드시 | 브라우저 저장소는 `storage.ts`만 만지고, 실패해도 던지지 않는다 | 사생활 보호 모드와 가득 찬 저장소에서 앱이 멈추지 않는다 | e2e: 저장소를 막은 컨텍스트 |
| LIB-3 | 반드시 | lib은 앱 데이터의 저장 열쇠와 형식을 갖지 않는다. 열쇠는 state가 갖는다 | 열쇠에 사용자 id가 들어가야 한다(STATE-11) | 리뷰 |
| LIB-4 | 반드시 | 주소는 `router.tsx`만 읽고 바꾼다 | 화면 이동이 한 곳에서 일어나야 오류 경계와 문서 제목이 맞는다 | 리뷰(`window.location`, `history` 검색) |
| LIB-5 | 기본 | 이상한 입력에도 던지지 않고 안전한 값을 돌려준다 | 날짜 하나 때문에 목록 전체가 깨지지 않게 한다 | 모듈 테스트 |
| LIB-6 | 기본 | 한 주제에 파일 하나, 이름 있는 내보내기만. 훅은 `use-*.ts`에 하나씩 | 찾기 쉽게 한다 | 리뷰 |
| LIB-7 | 기본 | 브라우저 차이를 다루는 코드는 7.3절의 표를 따르고 그 행을 주석으로 가리킨다 | 왜 그렇게 쓰였는지 잃지 않게 한다 | 리뷰 |
| LIB-8 | 반드시 | Markdown 렌더러는 어떤 입력에도 끝난다. 스트리밍 중간 상태(반쪽짜리 표, `#`만 있는 줄, 닫히지 않은 코드 블록, 끝나지 않은 `**`)를 모듈 테스트한다 | 답변은 조각으로 와서 그리는 도중의 글이 늘 불완전하다. 이런 입력에서 무한 루프가 생기면 탭이 멈춘다 | 모듈 테스트 |

### 9.11 src/state

**맡는 일:** 여러 화면이 함께 보는 데이터를 갖고, 서버와 맞추고, 바꾸는 일. 사용자, 채팅 목록, 채팅별 메시지와 답변과 대기열, 초안. **맡지 않는 일:** 화면 문구(components), 한 화면의 한 번 읽기(components), 요청의 모양(api), 주소(lib의 router), 저장소 접근(lib의 storage).

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| STATE-1 | 기본 | 파일마다 Provider 하나와 그 값을 읽는 훅 하나를 내보낸다 | 찾기 쉽게 한다 | 리뷰 |
| STATE-2 | 반드시 | context 값은 렌더마다 새로 만들지 않는다 | 값이 바뀔 때마다 그 아래가 모두 다시 그려진다 | e2e의 렌더 횟수 |
| STATE-3 | 반드시 | Provider 밖에서 읽으면 던진다 | 빈 값으로 조용히 도는 화면을 막는다 | 리뷰 |
| STATE-4 | 기본 | 서버 요청은 state가 한다. 한 화면에서만 쓰는 한 번 읽기만 컴포넌트가 직접 부른다 | 같은 데이터를 두 곳이 따로 갖지 않게 한다 | 리뷰 |
| STATE-5 | 반드시 | state는 components를 가져오지 않는다 | 9.2절 | `check:imports` |
| STATE-6 | 기본 | 오류는 종류로 나누고, 문구는 components가 정한다 | 같은 오류를 화면마다 다르게 말할 수 있다 | 리뷰 |
| STATE-7 | 반드시 | state는 주소와 화면 배치를 모른다. 이동이 필요하면 부른 컴포넌트가 넘긴 `leave`를 순서의 그 자리에서 부르고, `leave`는 불리는 순간의 주소를 보고 이동할지 정한다 | 삭제한 뒤 홈으로 가는 순서를 화면이 정한다(F-DELETE-1). 지우는 사이에 다른 채팅으로 옮긴 사용자를 홈으로 끌고 가지 않는다 | `check:imports`(router 가져오기 금지), e2e(F-DELETE-1) |
| STATE-8 | 기본 | 열쇠마다 나뉘고 자주 바뀌는 데이터는 외부 저장소와 `useSyncExternalStore`로 둔다 | 조각 하나에 앱 전체가 다시 그려지지 않게 한다 | e2e의 렌더 횟수 |
| STATE-9 | 기본 | 여러 state를 함께 바꾸는 일은 기능 훅 하나가 맡는다. 예: 답변의 요약을 목록에 반영, 채팅 삭제 | 순서가 한 곳에 있어야 한다 | 리뷰 |
| STATE-10 | 반드시 | effect의 비동기 결과는 지금도 유효할 때만 반영한다. effect가 다시 돌면 cleanup의 `ignore`로 버리고, 요청을 끊어야 하면 `AbortController`를 쓴다 | 빠르게 채팅을 바꾸면 늦게 온 응답이 지금 화면을 덮는다 | e2e: 응답 순서를 고정한 테스트 |
| STATE-11 | 반드시 | 사용자에게 속한 state는 사용자가 바뀌면 사라진다. Provider에 `key={user.id}`, 저장 열쇠에 사용자 id | 다음 사용자에게 앞 사용자의 채팅이 보이면 정보 유출이다 | e2e(F-USER-3) |
| STATE-12 | 기본 | 화면 없이 볼 수 있는 규칙은 순수 함수로 떼어 모듈 테스트한다. 예: 목록 합치기, 날짜 그룹, 대기열 전이 | 모듈 테스트가 e2e보다 훨씬 빠르다 | 테스트 파일 |
| STATE-13 | 반드시 | 목록을 바꾸는 갱신은 함수형으로 한다(`set(prev => next)`). 서버 응답은 목록을 덮지 않고 합친다. 개수 같은 파생 판단은 갱신 함수 안에서 한다 | 첫 페이지 응답이 늦게 오면 그사이 만든 채팅이 사라질 수 있다 | e2e(F-LIST-1) |
| STATE-14 | 반드시 | `useSyncExternalStore`의 스냅샷은 바뀌지 않았으면 같은 참조다. 처음 보는 열쇠에도 상수 하나를 돌려준다 | 읽을 때마다 새 값을 주면 끝없이 다시 그린다 | 모듈 테스트 |
| STATE-15 | 기본 | 사이드바는 목록 요약만 구독한다. 조각마다 바뀌는 값은 그 채팅 화면만 구독한다 | 조각 하나에 사이드바 전체가 다시 그려진다 | e2e의 렌더 횟수(세는 대상이 그려졌다는 단언을 먼저) |

### 9.12 src/components

이 정책은 하위 폴더의 역할, 하위 폴더끼리 기대는 방향, 공통 규칙만 정한다.

| 폴더 | 맡는 일 | 맡지 않는 일 | 가져와도 되는 하위 폴더 |
| ---- | ------- | ------------ | ----------------------- |
| `ui` | 화면을 모르는 부품: 버튼, 메뉴, 다이얼로그, 확인 다이얼로그, 툴팁, 토스트, 스켈레톤, 스피너, 아이콘, 리사이즈 손잡이 | 앱 데이터, 서버 요청, 화면 문구 | 없음 |
| `user` | 사용자 고르기 화면, 사용자가 없으면 막는 문 | 지금 사용자 자체(`state/user`) | `ui` |
| `chat` | 채팅 화면, 메시지와 답변, 입력창, 채팅 메뉴, 이름 바꾸기 입력, 따라가기 스크롤 | 화면 사이의 배치, 사이드바 | `ui` |
| `home` | 홈 화면, 찾을 수 없음 화면 | 입력창 자체(`chat`의 것을 쓴다) | `ui`, `chat` |
| `shell` | 앱의 틀: 사이드바, 채팅 목록과 행, 사용자 메뉴, 단축키, 도움말, 화면 경계, 주소에 맞는 화면 고르기 | 각 화면의 내용 | 모두 |

| ID | 강도 | 규칙 | 이유 | 확인 방법 |
| -- | ---- | ---- | ---- | --------- |
| COMP-1 | 반드시 | 하위 폴더는 위 표에서 허락한 폴더만 가져온다 | 순환을 막고, 바꿀 때 영향이 미치는 범위를 표로 안다 | `check:imports` |
| COMP-2 | 반드시 | `ui`의 부품은 props로만 동작한다. state, api, 화면 문구를 모른다 | 어디서나 같은 부품을 쓴다 | `check:imports` |
| COMP-3 | 기본 | 파일 이름은 주로 내보내는 것의 kebab-case이고, 이름 있는 내보내기만 쓴다 | 찾기 쉽게 한다 | 리뷰 |
| COMP-4 | 기본 | 훅은 그것을 쓰는 화면의 폴더에 둔다. 두 폴더가 쓰면 lib으로 옮긴다 | 쓰는 곳 가까이 둔다 | 리뷰 |
| COMP-5 | 기본 | 문서 전체에서 요소를 찾는 코드(`document.querySelector`)는 앱 전체에 묻는 질문에만 쓴다. 예: 열린 다이얼로그가 있나. 화면의 요소는 ref로 잡는다 | 같은 화면이 둘 뜨면 엉뚱한 입력창에 포커스가 간다 | 리뷰 |
| COMP-6 | 기본 | 많이 그려지는 목록 항목(채팅 행, 끝난 메시지)만 memo로 감싼다 | 필요한 곳에만 비용을 쓴다 | e2e의 렌더 횟수 |
| COMP-7 | 기본 | 열고 닫는 UI는 닫힐 때 연 곳으로, 그곳이 사라졌으면 화면의 `h1`로 포커스를 돌려준다 | 포커스가 `body`로 떨어지면 키보드 사용자가 길을 잃는다 | e2e |
| COMP-8 | 반드시 | 글 입력에서 Enter를 처리하는 곳은 모두 조합 중을 거른다(7.3절) | 한글 마지막 글자가 두 번 들어가거나 조합 중에 보내진다 | e2e |
| COMP-9 | 반드시 | 사용자 글과 답변을 HTML 문자열로 넣지 않는다(`dangerouslySetInnerHTML` 없음). Markdown은 `lib/markdown.tsx`가 React 요소로만 그린다. 링크는 `http`, `https`, `mailto`만 살리고 새 탭과 `rel="noopener noreferrer"`다 | XSS. `javascript:` 링크도 막는다 | 리뷰. e2e: `<img onerror>`와 `javascript:` 링크가 든 답이 글자로 보인다 |

### 9.13 src/styles

확인은 `scripts/check-css.ts`로 자동화한다.

| ID | 강도 | 규칙 | 확인 방법 |
| -- | ---- | ---- | --------- |
| STYLE-1 | 기본 | 화면 영역마다 CSS 파일 하나(`tokens`, `base`, `ui`, `shell`, `chat`, `user`) | 리뷰 |
| STYLE-2 | 기본 | class 이름은 `block`, `block__element`, `block--modifier` | 리뷰 |
| STYLE-3 | 기본 | 상태와 옵션은 `data-*` 속성, 블록의 종류는 `--modifier` | 리뷰 |
| STYLE-4 | 반드시 | 색은 토큰으로 쓴다. `tokens.css` 밖에 색 리터럴이 없다 | `check:css` |
| STYLE-5 | 기본 | 전환 시간은 `--duration-*` 토큰, 반복 애니메이션의 주기만 숫자 | 리뷰 |
| STYLE-6 | 반드시 | 테마(밝음, 어두움)는 `tokens.css`만 안다 | `check:css` |
| STYLE-7 | 반드시 | 글자 대비 4.5:1, 글자 아닌 것 3:1. 두 테마 모두 | e2e가 화면에서 재는 대비 검사 |
| STYLE-8 | 기본 | 인라인 스타일은 렌더할 때 정해지는 값(사이드바 너비)에만 | 리뷰 |
| STYLE-9 | 기본 | 애니메이션이 있는 선택자는 같은 파일의 `prefers-reduced-motion` 블록에서 멈춘다 | `check:css` |
| STYLE-10 | 기본 | `!important`를 쓰지 않는다 | `check:css` |

### 9.14 정책을 바꾸는 절차

`AGENTS.md`에 그대로 옮긴다.

1. 작업이 승인된 "반드시" 규칙과 부딪히면 코드를 고치기 전에 멈춘다.
2. 부딪히는 규칙 ID, 바꿀 문장(전과 후), 이유, 영향받는 코드 위치를 보고한다. 이유는 그 규칙의 "이유"가 왜 더 이상 맞지 않는지로 쓴다.
3. 사람이 승인하면 정책을 고친 커밋을 먼저 하고, 그다음 코드를 고친다.
4. 그 `POLICY.md`의 변경 기록에 한 줄을 남긴다. `check:imports`의 표가 함께 바뀌면 같은 커밋에서 바꾼다.
5. 바꾸는 도중에 승인된 다른 정책과 부딪히는 것이 드러나면 같은 정책 커밋에서 함께 고치고, 양쪽 변경 기록에 남긴다.
6. 사람이 대화 중에 새 규칙을 정하면 그 자리에서 해당 정책이나 `AGENTS.md`의 장에 더하고 "사람이 정함"과 날짜를 붙여 같은 커밋에 넣는다. 에이전트가 해석해서 넣은 문장은 "해석"이라고 표시해 확인받는다.

**첫 연습:** 12단계가 이 절차의 첫 연습이다. 지시에서 부딪힐 규칙을 미리 말하지 않고, 에이전트가 스스로 찾아 멈추는지 본다. 멈추지 않으면 절차의 빈틈으로 `docs/TASKS.md`에 적고 `AGENTS.md`의 9장을 고친다. 규칙을 바꿔야 하는 큰 기능은 명세 브랜치(DESIGN과 TASKS의 "명세"), 정책 변경 커밋, 구현 브랜치 순으로 간다(10.5절).

## 10. 에이전트 작업 환경

에이전트가 같은 품질로 일하게 만드는 장치다. 프롬프트 한 줄이 아니라 에이전트가 일하는 환경 전체를 설계한다.

| 장치 | 무엇을 막거나 돕나 | 위치 |
| ---- | ------------------ | ---- |
| `AGENTS.md` | 모든 작업에 공통인 규칙. 무엇을 읽고, 무엇을 묻고, 어떻게 끝내는가 | 저장소 루트 |
| `docs/DESIGN.md` | 무엇을 만드는가. 에이전트가 스펙을 지어내지 않게 한다 | `docs/` |
| 폴더별 `POLICY.md` | 그 폴더에서 어떻게 만드는가. 폴더에 들어가기 전에 읽는다 | 9장 |
| `tsc`와 검사 스크립트 | 정책 중 기계가 볼 수 있는 것(타입, 의존 방향, Bun 전용 API, `console`, CSS 규칙) | `tsconfig.json`, `scripts/check-*.ts` |
| 권한 | 되돌리기 어려운 명령과 지켜야 할 파일 | `.claude/settings.json` |
| 테스트 먼저 | 완료의 기준을 구현 전에 고정한다 | 단계 프롬프트마다 |
| 검토 프롬프트 | 다른 눈으로 본다. 관점과 기준을 준다 | [prompts/README.md](../prompts/README.md) |
| 스킬 | 반복되는 절차(검증, 결함 분류, 마감)를 같은 방식으로 | 10.4절 |

### 10.1 AGENTS.md의 장

01단계가 만든다. 각 장은 짧게 쓰고, 이미 DESIGN.md나 POLICY.md에 있는 내용은 링크한다.

1. **먼저 읽는 것과 우선순위:** 일을 시작하기 전에 `docs/TASKS.md`의 지금 상태와 맨 위의 진행 방식(10.5절)을 읽는다. 15단계부터는 `docs/Issues.md`도 읽는다. 지시의 전제가 문서와 다르면 고치기 전에 알린다. 붙인 지시에 한글이 든 `{…}`(사람이 채울 칸)가 남아 있으면 멈추고 무엇을 채울지 묻는다. 코드의 중괄호와 꺾쇠로 쓴 이름 틀(`<단계>`)은 칸이 아니다. 우선순위는 `AGENTS.md`, `docs/DESIGN.md`, 폴더의 `POLICY.md` 순이다. 부딪히면 멈추고 묻는다. 문서에 없다고 "없었다"고 단정하지 않는다. git log와 대화 기록도 본다.
2. **건드리지 않는 것:** `data/`, `.e2e-data/`, 손으로 고친 `bun.lock`, 적용한 마이그레이션, 비밀 값. `prompts/`와 루트의 `TASKS.md`는 사람이 쓰는 포트폴리오 문서다. 지시 없이 고치지 않고, 붙여 준 지시 밖의 단계 파일은 읽지 않는다. 공통 틀인 `prompts/README.md`는 읽어도 된다. 권한 규칙(10.2절)은 편집 도구만 막고 셸 명령은 막지 못하므로 이 문장이 함께 막는다. 남이 띄운 프로세스는 확인 없이 끄지 않는다. 에이전트가 띄운 서버는 PID를 적어 두고 끝날 때 그것만 끈다. 재현 스크립트도 개발 데이터 대신 테스트 서버를 쓴다.
3. **명령:** [2.2절](#22-의존성과-스크립트)의 스크립트 표. 도구를 직접 부르지 않고 `package.json`의 스크립트로 돌린다(`tsc -b`를 직접 돌리면 생성물이 남는다). 정규식이나 긴 스크립트는 셸 한 줄 대신 파일로 쓴다.
4. **의존성과 해법의 크기:** 2.2절의 열 개 밖의 패키지를 더하기 전에 이유를 말하고 승인받는다. 버전은 정확히 고정한다. 서버는 Bun 전용 API를 쓰지 않는다(EDGE-2). 잰 근거 없는 큰 해법(포탈, 전역 상태, 새 라이브러리)은 간단한 대안을 먼저 해 보고, 필요를 잰 뒤에 넣는다.
5. **작업 단위와 반영:** 단계 하나가 브랜치 하나다. 커밋 메시지는 영어, 작게 커밋한다. 공용 부품을 먼저 고치고 그것을 쓰는 기능을 뒤에 한다. 반영 절차는 [10.5절](#105-브랜치와-커밋)이고, 사람이 "반영해줘"라고만 해도 그 절차대로 한다. 얼마나 돌릴지는 `docs/TASKS.md` 맨 위의 진행 방식을 따른다(10.5절). 푸시하지 않는다.
6. **테스트 먼저:** 완료 조건을 테스트로 먼저 쓰고, 구현 전에 돌려 실패하는 출력을 본다. 그 실패가 고칠 결함 때문인지도 본다. 고치기 전에도 통과하는 테스트와 엉뚱한 이유(도우미나 가짜 응답의 형식 오류)로 빨간 테스트는 고친다. 중요한 테스트는 변이로 확인한다([11.2절](#112-작성-규칙)). `test.fail`(Playwright)과 `test.failing`(bun test)은 고치지 않기로 했고 결과가 늘 같은 결함에만 두고, ID와 이유를 적는다.
7. **주장의 범위:** 결과는 pass, fail, blocked로 나눈다. 돌리지 못한 확인을 통과로 쓰지 않는다. 테스트가 본 조건까지만 주장한다. 창 높이 480에서 봤으면 "모든 높이"라고 쓰지 않는다. 명령의 마지막 줄과 종료 코드를 그대로 보인다(agent-skill-garden의 verification 정책).
8. **재현과 조사의 깊이:** 고치기 전에 재현하거나 지금 상태를 확인한다. 재현되지 않거나, 이미 해결됐거나, 전제가 틀렸으면 구현하지 않고 근거와 함께 닫는다. "재현 안 됨"은 조건을 갖췄는지 확인한 뒤에만 쓴다. 이상한 측정값은 측정 방법부터 의심한다. 결정이 달라질 만큼만 검증하고, 원인을 끝까지 밝히지 못했으면 "확인하지 못함"으로 적는다. 계획에 없던 측정이나 외부 라이브러리 소스 분석은 먼저 묻는다. 계산으로 기각한 것에는 실물로 다시 볼 조건(어느 단계, 무엇으로)을 남긴다. 원인이 흐리면 고치기 전에 관찰한다([prompts/README.md 6.9절](../prompts/README.md#69-관찰-지시)).
9. **폴더별 정책:** 폴더를 고치기 전에 그 `POLICY.md`를 읽는다. "승인"인 정책만 규칙이다. 경계 규칙(EDGE-1, EDGE-2), 폴더별 정책 상태 표(없음, 작성 중, 승인), 바꾸는 절차(9.14절)를 이 장에 둔다. 되돌리기 어렵거나 다른 단계에 걸리는 판단은 구현 전에 묻고, 그 밖의 작은 판단은 정한 뒤 보고에 적는다. 사람이 대화 중에 정한 규칙은 그 자리에서 해당 장에 더하고 "사람이 정함"과 날짜를 붙인다.
10. **기록:** 결정은 `docs/DECISIONS.md`, 단계 상태는 `docs/TASKS.md`, 결함은 `docs/Issues.md`, 개선 후보는 `docs/Improvements.md`, 사람이 읽을 곳은 `docs/READING.md`, 캡처와 측정은 `docs/evidence/`. 따르지 않은 AI 제안은 그 자리에서 `docs/DECISIONS.md` 끝의 표에 적고, 그 밖의 발견은 바로 한 줄로 넘긴 뒤 단계 끝에 정리한다. 앞으로 할 일은 "예정", 한 일은 "완료"로 쓰고, 구현하면 예정 문장을 고쳐 쓴다. 다른 문서나 대화에서 가져온 것은 출처를 적는다. 계획이 바뀌면 문서의 약속 문장도 고친다.
11. **Windows:** [2.4절](#24-windows에서-지킬-것)의 규칙. 파일 이름의 대소문자는 기존 그대로 쓴다(대소문자만 다르게 쓰면 기존 파일이 바뀐다). 줄 끝은 LF다. 로그 파일 이름에는 시각을 붙인다. 사람에게 주는 명령은 PowerShell 문법으로 쓴다.
12. **보고:** 끝날 때와 멈출 때 같은 틀로 쓴다. 결과 그대로(명령, 마지막 줄, 종료 코드, 로그 경로), 구현 전 실패, 실패와 원인, 정한 것, 지시와 다르게 한 것과 이유, 확인하지 못한 것, 직접 확인 필요(앞 보고에 이어 번호를 붙인다), 정해 주실 것(권장안과 함께), 읽을 곳(`docs/READING.md`에 더한 행). 틀은 [prompts/README.md 6.7절](../prompts/README.md#67-보고)이다(career-radar `AGENTS.md`의 12번을 넓힌 것).
13. **실행과 기다림:** 테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다. 3분이 넘는 실행은 백그라운드로 돌리고, 예상 시간을 먼저 말한 뒤 로그 파일을 보며 5분마다 진행을 짧게 보고한다. 관문 명령이 도는 동안에는 앱과 테스트 파일을 고치지 않고, 사람에게도 피해 달라고 말한다. 사람이 테스트를 돌리는 동안에도 같다. 임시로 파일을 바꾸는 확인(변이)은 시작 전에 알리고, 끝나면 되돌렸다는 것을 `cmp`로 보인다.
14. **안정 기준:** `main`은 언제든 내보낼 수 있어야 한다. 세 단위로 본다. 항목(결정과 이유가 문서에 있다), 반영(합류 전 실행이 통과했다), 마일스톤(세 엔진 전체가 통과했다. 첫 마일스톤은 17단계). `main`의 `docs/TASKS.md`에 "진행"은 없다. 명세만 합쳐지고 구현 전인 항목은 "명세"로 둔다.
15. **반복해서 틀리는 것:** 에이전트가 되풀이해 틀리기 쉬운 것과 막는 곳. 테스트가 본 범위 이상을 주장한다(7장). 실제 경로 대신 상태를 미리 만들어 준 테스트로 결함을 놓친다(11.2절). 붙잡아 둔 요청을 끝에 끊지 않아 데이터가 남는다(11.2절). 이름으로 찾는 선택자가 여럿을 잡는다(11.2절). 지시에 없는 규칙을 묻지 않고 더한다(9장). 예정을 한 일처럼 쓴다(10장). 새로 되풀이되는 것을 찾으면 여기에 한 줄 더한다.

단계 프롬프트의 머리말([prompts/README.md 6.1절](../prompts/README.md#61-구현-프롬프트의-머리말))은 이 장들을 부르기만 한다. 같은 말을 프롬프트마다 다시 쓰지 않는다. 규칙이 바뀌면 이 장을 고치고 프롬프트는 짧게 둔다.

### 10.2 권한

`.claude/settings.json`이다. Codex에는 같은 내용을 `AGENTS.md` 2장의 문장으로 둔다.

```json
{
  "permissions": {
    "deny": [
      "Bash(git push:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean:*)",
      "Bash(git commit --no-verify:*)",
      "Bash(rm -rf:*)",
      "Edit(data/**)",
      "Edit(.e2e-data/**)",
      "Edit(bun.lock)",
      "Read(.env*)"
    ],
    "ask": [
      "Bash(bun add:*)",
      "Bash(bun remove:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)"
    ]
  }
}
```

- **deny:** 되돌릴 수 없거나 바깥에 나가는 명령, 앱이 소유한 데이터, 도구가 만드는 파일, 비밀 값.
- **ask:** 의존성과 `main`의 역사를 바꾸는 명령. 사람이 매번 본다.
- **권한은 편집 도구만 막는다.** `sed -i`나 리디렉션 같은 셸 명령은 막지 못한다. 그래서 같은 내용을 `AGENTS.md` 2장의 문장으로도 둔다. 01단계는 새 세션에서 규칙을 알고 있는지와 `data/` 편집이 거부되는지를 시험한다.
- 커밋은 막지 않는다. 브랜치 안의 작은 커밋은 에이전트의 일이다(10.5절).
- agent-skill-garden의 `adapters/claude/hooks/destructive-push-guard`는 원하면 더한다. 권한 규칙이 이미 푸시를 막으므로 기본에서는 뺐다.

### 10.3 검증 루프

단계마다 같은 순서다. 단계 프롬프트의 "확인"이 이 순서의 명령을 적는다.

1. **테스트 먼저:** 완료 조건을 테스트로 쓰고, 돌려서 실패하는 것을 본다. 실패 출력을 보고에 넣는다.
2. **구현:** 그 단계가 가리키는 폴더의 `POLICY.md`를 먼저 읽는다.
3. **빠른 확인:** `bun run check`(typecheck, check:imports, check:css, test).
4. **그 단계의 e2e:** 새로 쓴 e2e 파일을 세 엔진에서.
5. **검토:** 검토 프롬프트로 다른 대화(가능하면 다른 모델)에서 본다.
6. **사람의 확인:** 단계의 "검토 지점"을 사람이 읽고, 직접 확인 항목을 손으로 본다.
7. **합류 전:** `bun run check`, `bun run test:e2e`, `bun run test:e2e:build`. 모두 종료 코드 0이어야 한다. 진행 방식이 가벼운 주기면 10.5절대로 줄인다. `test:e2e:build`가 빌드도 한다.
8. **반영:** 사람이 "반영해줘"라고 하면 10.5절의 절차대로 한다.

**합류 전 실행 뒤에 바뀌면:** 앱 코드가 바뀌면 7번을 다시 돈다. 테스트 파일만 바뀌면 그 파일만 다시 돌린다. 부분 재실행만 통과한 채 반영하지 않는다. 반영 전에 문서의 상태와 해시가 커밋된 코드와 맞는지 대조하고, 마지막 전체 실행의 커밋과 결과(건수, 시간)를 `docs/TASKS.md`에 적는다.

### 10.4 스킬

[agent-skill-garden](https://github.com/changbaebang/agent-skill-garden)의 스킬을 프로젝트 범위로 설치해 쓴다(01단계, 선택). 설치하지 않아도 단계 프롬프트는 돈다. 설치하면 프롬프트의 "쓸 스킬"이 그 절차를 부른다.

| 단계 | 스킬 | 쓰는 이유 |
| ---- | ---- | --------- |
| 01 | `intake`, `work-start` | 단계를 작업 단위로 자르고 브랜치를 시작한다 |
| 03, 08~10 | `api-contract-check` | 서버가 실제로 내는 응답과 `docs/API.md`를 맞대 본다 |
| 06, 07, 10 | `side-effect-check` | 저장소와 잠금을 바꿀 때 소비자를 따라간다 |
| 04, 08~14 | `react-review`, `typescript-review` | 단계 검토 |
| 04, 09~14 | `e2e-test-design`, `browser-e2e-check` | e2e 범위와 시나리오 |
| 합류 전마다 | `affected-verification`, `critical-review` | CI처럼 돌리고, 배포를 막을 문제만 본다 |
| 15, 16 | `bug-triage` | 결함마다 재현, 원인, 판정 |
| 17 | `work-closeout` | 마감의 증거 |

설치는 Git Bash에서 한다. 스크립트는 Bash, Python 3.9 이상, Git, ripgrep을 요구한다. Git Bash의 `ln -s`는 설정에 따라 링크 대신 복사본을 만들 수 있다. 설치 뒤 `.claude/skills/<이름>/SKILL.md`가 있는지 본다.

### 10.5 브랜치와 커밋

- 단계 하나가 브랜치 하나다: `stage/07-document-store`. 단계 안에서는 작게 커밋한다.
- 커밋 메시지는 영어이고 `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`로 시작한다. 메시지는 변경 파일 전체를 대표한다.
- 커밋 전에 바뀐 파일을 보고, 데이터 폴더, 비밀 값, 생성물이 없는지 본다.
- 커밋 신원(`user.name`, `user.email`)은 사람이 00단계에서 정한다. 에이전트는 바꾸지 않는다.
- 원격 저장소는 사람이 만들고, 푸시도 사람이 한다.
- **반영 절차:** 작업 트리가 깨끗한지 본다. 10.3절의 합류 전 실행이 통과했는지 본다. 기능 브랜치에 선 채로 `git fetch . {브랜치}:main`으로 `main`을 옮긴 뒤(fast-forward만 된다) `git switch main`한다. 띄워 둔 개발 서버의 파일이 중간에 바뀌지 않는다. fast-forward가 안 되면 멈추고 보고한다. `docs/TASKS.md`의 상태와 해시를 고쳐 커밋하고, 해시를 보고한다. 브랜치는 지우지 않는다.
- **진행 방식:** `docs/TASKS.md` 맨 위의 "진행 방식" 한 줄이 정한다. 사람이 그 줄을 고쳐 바꾼다.
  - **기본:** 묶음마다 멈춰 사람의 승인을 받는다. 반영마다 10.3절의 합류 전 실행을 모두 돈다.
  - **빠른 모드:** 승인 없이 이어 가고 "정해 주실 것"만 멈춘다. 묶음 확인은 Chromium만 하고, 세 엔진은 반영 직전에 돈다. 새 테스트의 구현 전 실패(그 파일만)와 핵심 변이 한두 개는 빼지 않는다.
  - **가벼운 주기:** 반영마다 `bun run check`와 바뀐 영역의 e2e(새 테스트는 세 엔진)만 돈다. Chromium 전체는 브랜치 한두 개마다, 세 엔진 전체와 빌드는 마일스톤에 돈다. 전체 실행 없이 반영한 것은 `docs/TASKS.md`에 적는다.
  - 빠른 모드와 가벼운 주기는 함께 쓸 수 있다(예: "진행 방식: 빠른 모드, 가벼운 주기").
- **명세와 구현을 나눈다:** 규칙을 바꿔야 하는 기능은 명세 브랜치(DESIGN과 TASKS의 "명세")를 먼저 합치고, 정책 변경 커밋, 구현 브랜치 순으로 간다. `main`에는 언제나 내보낼 수 있는 상태만 있다(AGENTS.md 14장).

## 11. 테스트

`docs/test-plan.md`가 이 장에서 시작한다.

### 11.1 층

| 층 | 도구 | 대상 | 위치 |
| -- | ---- | ---- | ---- |
| 모듈 | `bun test` | 계약의 검증 함수, domain(`:memory:` SQLite와 임시 폴더의 진짜 저장소), store(임시 폴더), reply, 검사 스크립트, 웹의 순수 함수(Markdown, 목록 규칙, 날짜, 키, SSE 파서, 대기열 전이) | 대상 옆 `*.test.ts` |
| HTTP | `bun test`와 `fetch` | `createApi`를 `node:http` 서버에 붙여 포트 0에 띄우고 임시 데이터 폴더를 쓴다. 상태 코드, 사용자 머리, SSE 순서, 끊김, 소유권, 응답의 필드 목록 | `server/http/**/*.test.ts` |
| 브라우저 | Playwright | 사용자 흐름, 포커스, 화면, 엔진 차이 | `src/**/*.e2e.ts` |
| 직접 확인 | 사람 | 실제 한글 입력기, 실제 Safari, 체감 | `docs/test-plan.md`의 목록 |

- 같은 내용을 두 층에서 반복하지 않는다. 눈에 보이는 동작은 e2e, 계산과 판단은 모듈, 서버의 계약은 HTTP다.
- 브라우저별 동작은 `bun test`로 판단하지 않는다. Bun은 브라우저가 아니다. 날짜 문자열처럼 Bun은 읽어도 WebKit은 읽지 못하는 것이 있다.
- Playwright 테스트를 `bun test`로 돌리지 않는다. 파일 이름(`*.test.ts`와 `*.e2e.ts`)으로 둘을 나눈다.
- 테스트 파일은 `tsconfig.json`에서 뺀다. `bun:test`의 타입 패키지를 더하지 않으려는 것이다. 대신 테스트는 실행해야 통과한다.
- DOM 흉내(jsdom 등)는 쓰지 않는다(2.3절).
- 화면에 드러나지 않는 순서(어느 함수가 먼저 불리는가)는 테스트로 고정하지 않는다. POLICY.md는 층을 고르는 기준을 다시 쓰지 않고 이 절을 가리킨다. 컴포넌트 테스트(RTL, happy-dom)를 두지 않는 이유와 쓰게 될 조건은 ADR-018이다.

### 11.2 작성 규칙

- **먼저 쓰고 실패를 본다.** 구현 전에 실패를 보지 않은 테스트는 무엇을 지키는지 알 수 없다. 중요한 테스트는 코드를 일부러 깨서(변이) 실패하는 것도 본다.
- **e2e는 테스트마다 새 사용자다.** `e2e/fixtures.ts`의 `asUser` fixture가 API로 고유한 이름의 사용자를 만들고, 페이지가 열리기 전에 컨텍스트의 `storageState`로 그 id를 `localStorage`에 넣는다. 공용 데이터의 이름과 개수에 기대지 않는다. 테스트끼리 데이터가 섞이는 문제가 구조적으로 생기지 않는다.
- **데이터는 API로 만든다.** 목록 45개 같은 준비는 화면이 아니라 `fixtures.ts`의 API 도우미로 한다.
- **고정 대기를 쓰지 않는다.** 자동 대기와 조건 대기를 쓴다. 시간은 `page.clock`으로 다룬다.
- **선택자는 역할과 레이블 먼저, 그리고 정확하게.** 이름으로 찾을 때는 `exact: true`를 주고 범위를 영역(region, dialog)으로 좁힌다. 알림 영역을 class로 찾지 않는다. 새 접근성 이름이나 `role="status"`를 더하면 기존 테스트의 선택자가 여럿을 잡지 않는지 먼저 찾는다. class는 다른 길이 없을 때만 쓴다.
- **실패 상황:** 서버 쪽은 mock 지시어(9.7절), 네트워크 쪽은 `page.route`, 스트림 중간의 끊김은 `api`와 `state`의 모듈 테스트(fetch 대체)로 본다.
- **답 내용:** mock이 결정적이라 비교할 수 있지만, 상태와 구조를 먼저 본다. 답 틀이 바뀌어도 깨지지 않게 한다.
- **시작한 답변은 끝내거나 멈춘다.** e2e가 끝난 뒤 데이터 검사가 남은 `streaming`을 어긋남으로 센다(11.4절).
- **불안정한 테스트는 실패로 본다.** 연결 거부와 시간 초과는 그 파일만 한 번 다시 돌린다. 다시 나면 멈추고 조사한다. 단언 값이 다른 실패는 다시 돌려 넘기지 않는다.
- **렌더 횟수를 세는 테스트는 개발 서버에서만 돈다.** 빌드에서는 컴포넌트 이름이 줄어든다.
- **테스트 코드는 앱 번들에 들어가지 않는다.** 앱 코드에서 테스트 파일을 가져오지 않는다.
- **실제 경로를 따른다.** 입력 전에 화면이 준비된 표시(로딩 끝)를 기다린다. 테스트 안에서 상태를 미리 만들어 주지 않는다(포커스를 강제로 주는 등). 예: 메뉴 항목에 포커스를 먼저 주고 Esc를 누르는 테스트는 마우스로 연 메뉴에서 WebKit이 Esc를 받지 못하는 결함을 놓친다.
- **붙잡아 둔 요청은 끝에 끊는다.** `page.route`로 잡아 둔 요청은 테스트 끝에 `route.abort()`로 끊거나 `page.unrouteAll({ behavior: 'ignoreErrors' })`를 부른다. 그냥 두면 페이지가 닫힐 때 실제 서버로 나가 데이터를 남긴다. 측정 스크립트도 같다.
- **"없다" 앞에 "있다"를 먼저.** "0이어야 한다", "보이지 않는다" 같은 단언 앞에, 그 대상이 관찰되는 조건이라는 단언을 먼저 둔다. 렌더 횟수를 세기 전에 그 컴포넌트가 그려졌는지 본다. 부정 단언은 고정 대기 뒤가 아니라 확실한 신호(요청 응답, 상태 표시) 뒤에 한다.
- **변이로 확인한다.** 구현 뒤 결함을 몇 가지 일부러 넣어 새 테스트가 잡는지 본다. 넣기 전에 파일을 백업하고, 되돌린 뒤 `cmp`로 원본과 같은지 보인다. 못 잡으면 테스트를 고친다. e2e를 덜어낼 때도 그 동작을 깨는 변이로 남는 테스트가 실제로 실패하는지 본 뒤에 지운다.
- **배치를 재는 테스트는 그 테스트가 만든 데이터로.** 맨 위 행, 맨 아래 행, 긴 제목처럼 배치에 기대는 테스트는 그 테스트가 만든 채팅으로 정한다. 공용 데이터에 기대면 우연히 통과한다.
- **`test.fail`은 결과가 늘 같은 결함에만.** 기기 속도에 따라 들쭉날쭉한 것은 기록만 한다. `test.fail`은 통과하면 실패로 친다.

### 11.3 실행 시점

| 때 | 명령 |
| -- | ---- |
| 커밋 전 | `bun run typecheck`, `bun run check:imports` |
| 고치는 동안 | `bun run test`, `bun run test:smoke`, 그 e2e 파일 하나 |
| 단계 끝 | `bun run check`, 그 단계의 e2e 파일을 세 엔진에서 |
| 합류 직전 | `bun run check`, `bun run test:e2e`, `bun run test:e2e:build` |
| 마일스톤 전(첫 마일스톤은 17단계) | `bun run test:e2e:all` |

잰 시간은 단계마다 `docs/test-plan.md`에 더한다. 환경이 다르면 다시 잰다.

**시간 예산:** 스모크 1분 안, 바뀐 영역의 e2e 3분 안, 합류 전 Chromium 전체 10분 안. 넘어도 테스트 개수를 줄여 맞추지 않는다. 공용 코드(`ui`, `lib`, `api`, `state`)가 바뀌면 영역이 아니라 전체를 돈다. 속도를 더 줄이기 전에 이론상 하한(테스트 시간의 합을 워커 수로 나눈 값)을 계산하고 기대 효과를 먼저 잰다. 실제가 하한에 가까우면 분배로는 줄지 않는다. 엔진을 줄이거나 실제 스트림을 가짜로 바꿔 시간을 맞추지 않는다.

**워커 수가 먼저다:** e2e 시간의 대부분은 mock 답변의 지연과 스트림을 기다리는 데 든다. 그래서 코어 수보다 워커 수가 먼저 효과가 있다. 11.4절의 워커별 서버와 `DATA_DIR` 분리는 이 때문이다. 예산을 넘으면 먼저 `REPLY_DELAY_SCALE`(REPLY-6)로 기본 지연을 줄이고, 느림이 조건인 테스트만 `[[mock:slow]]`로 늦춘다. `trace: 'retain-on-failure'`는 실행 시간을 크게 늘리고 시간에 민감한 테스트를 깨뜨릴 수 있어 끈다.

### 11.4 e2e 서버와 데이터

- **기본:** 워커 i마다 Vite 개발 서버 하나(`bun --bun vite --port {5201+i} --strictPort`)를 띄운다. API는 그 서버에 붙어 있다. 환경 변수는 `DATA_DIR=.e2e-data/w{i}`, `DATA_RESET_ON_START=1`, `E2E_CACHE_DIR=node_modules/.vite-e2e/{포트}`다. 개발 모드라 React의 경고와 렌더 횟수를 볼 수 있다.
- **빌드:** `E2E_SERVER=preview`이면 같은 포트에 `bun --bun vite preview`를 띄운다. `@smoke`만 돈다. 빌드한 모양을 본다.
- **워커 수:** 기본 4, `E2E_WORKERS`로 바꾼다. Playwright의 `--workers`로 바꾸면 서버 수와 맞지 않으니 쓰지 않는다. 각 워커는 `TEST_PARALLEL_INDEX`로 자기 포트를 안다. `reuseExistingServer`는 `false`다. 포트가 겹치면 바로 실패한다.
- **데이터 초기화:** 플러그인이 시작할 때 `DATA_RESET_ON_START=1`이면 데이터 폴더를 비운다. 경로에 `.e2e-data`가 없으면 이 설정을 거절하고 던진다. 실수로 개발 데이터를 지우지 않게 한다.
- **끝난 뒤:** `e2e/global-teardown.ts`가 워커마다 `data:check`를 돌린다. 어긋남이 있으면 실행 전체가 실패한다([5.5절](#55-어긋났을-때-맞추기)).
- **보고와 기록:** reporter는 `list`와 `html`(`open: 'never'`)이다. `list` 출력은 시각을 붙인 로그 파일로 남겨 진행을 셀 수 있게 한다. trace는 끄고(`off`), 화면은 실패 때만(`only-on-failure`), 동영상은 끄고, retries는 0이다. trace가 필요하면 UI 모드나 `--trace on`으로 한 번 돈다. 빌드 스모크는 보고서 폴더를 따로 둔다.
- **브라우저 설치:** `bunx playwright install chromium firefox webkit`. Windows에서 WebKit은 실제 Safari가 아니다. 실제 Safari로 보지 못한 것은 [14장](#14-위험과-알려진-한계)에 적는다.

### 11.5 결과 읽는 법

- **판정은 종료 코드와 마지막 줄로 한다.** 줄마다 찍히는 기호가 아니라 명령의 종료 코드와 요약 줄(`N passed`, `N failed`)을 본다. 보고에는 그 둘을 그대로 옮긴다.
- **`test.fail`의 표시:** 기대대로 실패한 `test.fail`은 통과로 센다. 목록에는 실패 기호로 보일 수 있다. 고쳐져서 통과하면 오히려 실패로 나온다. 그때 `test.fail`을 지운다. `bun test`의 `test.failing`도 같다.
- **'already used'와 연결 거부:** 포트가 이미 쓰인다는 오류는 다른 실행이 같은 포트를 쓰는 중이라는 뜻이다. 그 실행이 끝날 때까지 기다린다. 사람과 에이전트가 같은 때에 e2e를 돌리지 않는다.
- **불안정인가 결함인가:** 시간 초과나 연결 오류는 그 파일만 한 번 다시 돌린다. 다시 나면 멈춘다. 단언 값이 어긋나면 다시 돌리지 않고 원인부터 찾고, 반영을 미룬다. 돌릴 때마다 다른 테스트가 깨지면 부하를, 같은 테스트가 깨지면 앱의 결함을 먼저 의심한다.
- **로그:** 전체 출력은 `logs/{명령}-{YYYYMMDD-HHmm}.log`로 보낸다(`*.log`는 git이 무시한다). 대화에는 마지막 요약과 실패한 테스트 이름만 붙인다. 세션 기록이 커지는 것을 줄이고, 사람이 같은 로그를 열어 볼 수 있다.

### 11.6 직접 확인과 화면 캡처

자동화가 닿지 않는 것만 사람이 본다. 목록은 `docs/test-plan.md`의 "직접 확인" 표이고, 증거는 `docs/evidence/`에 둔다.

- **넣는 조건:** 절차와 기대 결과를 적을 수 있는 것만 넣는다. "체감"은 측정으로 바꾼다. 브라우저 단축키와 겹치는 키는 Playwright로 확인할 수 없으니 이 목록에 넣는다.
- **지시하는 법:** 어느 브라우저(버전은 `chrome://version` 첫 줄의 숫자), 어느 화면, 무엇을 하면 무엇이 보여야 통과인지, 무엇을 복사해 보낼지를 적는다. 명령이 필요하면 PowerShell 문법으로 준다.
- **결과의 말:** 통과, 측정으로 갈음, 확인 못 함(그 환경이 없다), 하지 않음. "하지 않음"은 읽는 사람에게 할 수 있었는데 안 한 것으로 보인다. 단계 보고마다 "직접 확인 필요"를 번호로 쌓고, 사람이 단계 끝에 한 번에 본다.
- **기록:** 사람이 확인한 뒤에만 "확인했다"로 적는다. 브라우저, 버전, 날짜를 함께 적는다. 이 PC에 없는 브라우저는 "확인 못 함"으로 둔다.
- **화면 캡처:** [3.7절](#37-화면-품질)의 `@screens` 캡처가 `docs/evidence/ui/{단계}/`에 남는다. 측정표와 직접 확인의 화면도 `docs/evidence/`에 둔다. 임시 폴더에 두면 남지 않는다.
- **보여 주기:** 사람에게 동작을 보일 때는 화면에 띄운 브라우저(`bunx playwright wk {주소}`, `bunx playwright ff {주소}`)에서 천천히 재현하고 단계마다 설명한다.

## 12. 운영과 관측

로컬 앱이지만 운영할 때 필요한 최소한을 처음부터 둔다. 지표 집계와 SLO는 제안 작업 N5다.

**로그:** 표준 출력에 JSON 한 줄씩. 공통 필드는 `t`(ISO 시각), `level`, `msg`다.

| `msg` | 필드 | 쓰임 |
| ----- | ---- | ---- |
| `http.request` | `reqId`, `method`, `route`(경로 틀, 예: `/api/chats/:id`), `status`, `ms`, `userId` | 느린 요청과 오류 비율 |
| `response.finished` | `reqId`, `chatId`, `responseId`, `endedBy`, `firstTokenMs`, `durationMs`, `chunks`, `chars` | 첫 글자까지의 시간, 중단 비율. 글 자체는 남기지 않는다 |
| `store.retry` | `op`, `code`, `attempt` | Windows의 파일 잠금이 얼마나 자주 나는지 |
| `recovery.fixed` | `kind`, `chatId` | 두 저장소가 얼마나 자주 어긋나는지 |
| `server.started`, `server.stopping` | 데이터 폴더, 런타임과 SQLite 버전, 진행 중 답변 수 | |
| `error` | `reqId`, `name`, `message`, `stack` | 요청 본문은 남기지 않는다(HTTP-6) |

- **요청 ID를 화면까지:** 화면의 오류 안내에 `X-Request-Id`를 작게 보인다("Reference: …"). 사용자가 알려 준 값으로 로그를 찾는다.
- **상태 확인:** `/api/health`(프로세스), `/api/ready`(RDB와 데이터 폴더).
- **어긋남 검사:** `bun run data:check`가 두 저장소를 맞대 본다(5.5절).
- **SLO 초안(N5에서 정한다):** mock 기준으로 첫 글자까지 p95 1초 미만, 취소 응답 p95 200ms 미만, 5xx 비율 0.1% 미만.

## 13. 보안

| 위협 | 대응 | 위치 |
| ---- | ---- | ---- |
| 다른 사용자인 척 | 막지 않는다. 로그인이 없는 프로토타입이다(ADR-007). 다른 사이트의 페이지는 `X-User-Id` 머리를 붙이려면 CORS 사전 요청이 필요하고, 서버가 허락하지 않아 막힌다 | HTTP-7 |
| XSS | React의 이스케이프, HTML 문자열을 넣지 않는 Markdown 렌더러, 링크 프로토콜 제한과 `rel` | COMP-9 |
| CSRF | 쿠키가 없고 사용자는 머리로만 온다. 상태 변경 요청의 Origin 검사, JSON 본문만 | HTTP-7 |
| DNS 재바인딩 | Host 검사 | HTTP-7 |
| 남의 채팅 | domain의 소유권 확인, 404 | DOM-3 |
| 경로 조작 | id 형식 검사 뒤에만 파일 이름으로 쓴다 | DOC-1 |
| SQL 주입 | 준비문과 바인딩 | RDB-2 |
| 큰 요청 | 본문 64KB, 입력 8,000자, 채팅당 메시지 400개 | 3.6절 |
| 로그의 개인정보 | 본문과 메시지 내용을 남기지 않는다 | HTTP-6 |
| 비밀 값 | 저장소에 두지 않는다. `.env*`는 git에서 빼고 에이전트가 읽지 못한다 | `.gitignore`, 10.2절 |

**받아들인 것:** 인증이 없다. 누구나 다른 사용자의 id를 보낼 수 있고, 사용자 목록도 누구에게나 보인다. 한 PC에서 쓰는 데모이고 이 포트폴리오가 보이려는 것은 데이터 설계라서 받아들였다. 로그인을 붙일 때는 `http/guards.ts`의 사용자 판별 한 곳을 바꾼다(5.8절).

## 14. 위험과 알려진 한계

| 한계 | 영향 | 옮길 때 |
| ---- | ---- | ------- |
| 한 프로세스 전제(답변 잠금, 문서 잠금) | 서버를 둘 띄우면 409가 맞지 않는다 | 5.8절 |
| 인증이 없다 | 서버에 닿는 누구나 어떤 사용자로든 쓸 수 있고, 사용자 목록이 보인다 | 5.8절. `http/guards.ts`의 사용자 판별을 로그인 세션으로 바꾼다 |
| API가 Vite 서버에 붙어 있다 | 독립 실행 서버와 배포 진입점이 없다. 빌드한 앱은 `bun run preview`로 띄운다 | 5.8절. `createApi`를 `node:http` 서버에 붙이는 진입점 하나 |
| 답변 도중 서버가 죽으면 그 답변의 글을 잃는다 | 복구가 빈 답변을 뺀다 | ADR-005의 대안 |
| 문서를 통째로 다시 쓴다 | 긴 채팅일수록 쓰기가 무겁다. 400개 상한 | 메시지 단위 저장 |
| 시작할 때 복구가 모든 문서를 읽는다 | 문서가 많으면 시작이 느리다 | 주기 작업 |
| 다른 탭과 기기 | 목록과 메시지는 다시 읽을 때 맞는다. 다른 탭에서 진행 중인 답변은 끝난 뒤 다시 열어야 보인다 | 실시간 채널 |
| 대기열은 메모리에만 있다 | 새로고침하면 사라진다 | 서버 큐 |
| 실제 Safari와 Mac | Windows라 Playwright의 WebKit으로만 본다. 단축키의 ⌘, 스크롤 고정, 실제 입력기 | 직접 확인 목록 |
| 실제 한글 입력기 | e2e는 조합 이벤트를 흉내 낸다. 실제 입력기는 사람이 본다 | 직접 확인 목록 |
| 좁은 화면 | 1024px 미만은 다루지 않는다 | 반응형 배치 |
| 테스트 파일은 tsc가 보지 않는다 | 테스트의 타입 실수는 실행해야 드러난다 | `@types/bun`을 더하고 테스트를 포함 |
| 형식 도구가 없다 | 에이전트마다 형식이 조금 다를 수 있다 | `.editorconfig`로 버틴다. 흔들리면 ADR로 Prettier를 더한다 |
| Node에서 돌려 보지 않았다 | 서버를 Node 호환 API로만 쓰지만(EDGE-2), Node로 실행한 확인은 없다 | 독립 진입점을 Node로 돌리는 스모크 |

## 15. 결정 기록

`docs/DECISIONS.md`가 이 표로 시작한다. 형식은 career-radar의 ADR이다: 제목, 상태, 맥락, 결정, 결과, 대안.

| ID | 결정 | 고르지 않은 대안과 이유 |
| -- | ---- | ----------------------- |
| ADR-001 | 패키지 하나 | 워크스페이스(웹, 서버, 계약을 따로): 웹이 서버 의존성을 가져오는 것을 설치 단계에서 막지만, 도구와 설정이 늘어난다. 경계는 `check:imports`가 본다 |
| ADR-002 | Bun 1.4 하나로 설치, 실행, 테스트 | Node와 pnpm, tsx, Vitest: 처음 판의 선택이었다. 잰 결과 pnpm 12는 Windows에서 설정 두 가지가 더 필요했다. Bun으로 이 PC에서 모든 층을 돌려 봤다 |
| ADR-003 | TypeScript 7.0.2 | 6.0: typescript-eslint를 쓸 때만 필요했다. 린터를 쓰지 않는다 |
| ADR-004 | 사용자와 목록은 RDB, 채팅 내용은 문서 저장소 | 5.6절 |
| ADR-005 | 답변은 끝날 때 한 번 쓴다 | 1초마다 쓰기: 죽어도 글이 남지만 쓰기가 답변 길이만큼 늘고, 그동안 문서 잠금을 다툰다 |
| ADR-006 | 문서 저장소를 직접 만든다 | lowdb: 파일 하나에 모두 담는다. 문서마다 잠금과 원자적 쓰기를 직접 보이는 것이 목적이다 |
| ADR-007 | 로그인 없이 사용자를 고르고, 그 id를 `X-User-Id` 머리로 보낸다(프로토타입) | 이메일과 비밀번호, 쿠키 세션(처음 판): 비밀번호 해시, 세션 표, 실패 제한, CSRF까지 보안 코드가 커지는데, 이 포트폴리오가 보이려는 RDB와 문서 저장소의 나눔에는 보태는 것이 없다(2026-11-18 사용자 결정, TASKS D3). 사용자 표와 소유권은 그대로 두어 나중에 로그인을 붙일 자리를 남긴다. JWT: 같은 이유 |
| ADR-008 | 명시적 취소 API | 연결 끊기만: 잠금이 풀리기 전에 다음 전송이 오면 409가 난다 |
| ADR-009 | API를 Vite 플러그인으로 붙인다 | 독립 서버와 프록시: 개발 중 프로세스가 둘, e2e 서버가 워커마다 둘이 된다. 한 프로세스와 같은 출처가 더 단순하다 |
| ADR-010 | camelCase 필드, ISO 8601 UTC 시각 | snake_case: 변환 층이 생긴다. 비표준 시각: 엔진마다 다르게 읽힌다 |
| ADR-011 | 라우터, 데이터 패칭, 서버 프레임워크, 검증 라이브러리를 쓰지 않는다 | react-router, TanStack Query, Express, Zod: 화면 넷, 경로 열 개 남짓, 본문 여덟 개 규모에서는 가져오는 비용이 더 크다 |
| ADR-012 | Markdown 렌더러를 직접 쓴다 | react-markdown과 remark-gfm: 의존성 둘. 답변에 쓰는 문법만 그리고, 그리는 도중의 불완전한 글에서 무한 루프가 없는지 모듈 테스트로 본다(LIB-8) |
| ADR-013 | `bun test`와 Playwright, DOM 흉내 없음 | Vitest: Bun에 내장된 것으로 충분하다. jsdom: 2.3절 |
| ADR-014 | e2e 전체는 개발 서버, 빌드는 preview로 스모크 | 빌드만: 렌더 횟수를 볼 수 없고 매번 빌드해야 한다. 개발 서버만: 빌드한 모양을 보지 못한다 |
| ADR-015 | 의존성은 열 개 | 2.3절의 표 |
| ADR-016 | 서버는 Bun 전용 API를 쓰지 않는다 | `Bun.serve`, `bun:sqlite`: 조금 빠르고 짧지만, 서버가 Bun에 묶인다. `node:sqlite`가 Bun에서 경고 없이 돈다는 것을 쟀다 |
| ADR-017 | 폴더마다 `CLAUDE.md`를 두지 않는다. 루트의 `CLAUDE.md`가 `AGENTS.md`를 부르고, `AGENTS.md`가 "고치기 전에 그 폴더의 `POLICY.md`를 읽는다"고 말한다 | 폴더별 `CLAUDE.md`(`@POLICY.md`): 그 폴더의 파일을 읽을 때만 불러오고 셸로 고칠 때는 불러오지 않는다. "작성 중" 초안도 똑같이 불러온다. Claude만 읽어 규칙의 출처가 둘이 되고, 늘 컨텍스트를 차지한다 |
| ADR-018 | 컴포넌트 테스트(RTL, happy-dom)를 두지 않는다 | 화면 e2e가 지키는 것은 거의 모두 브라우저에서만 보이는 동작(포커스, 배치, `:focus-visible`, 엔진 차이)이라 DOM 흉내로 옮길 수 없다. 쓰게 될 조건: 합류 전 Chromium 전체가 시간 예산(11.3절)을 넘고, 배치와 무관한 컴포넌트 동작이 많아질 때 |

## 16. 용어

| 말 | 뜻 |
| -- | -- |
| 답변 | assistant 메시지. 생성기가 만든다 |
| 조각 | `response.output_text.delta`의 `delta` 하나 |
| 요약 | RDB `chats` 행의 `title`, `updated_at`, `message_count`. 목록을 위한 사본 |
| 문서 | 채팅 하나의 JSON 파일. 메시지의 원본 |
| 답변 잠금 | 채팅마다 답변을 하나만 허락하는 메모리의 표시 |
| 복구 | 두 저장소의 어긋남을 찾아 고치는 일(5.5절) |
| 지시어 | mock 생성기에만 있는 테스트용 입력(`[[mock:…]]`) |
| 단계 | 단계 프롬프트 하나. 브랜치 하나, 반영 하나 |
| 검토 지점 | 단계에서 사람이 직접 읽고 판단할 곳 |
