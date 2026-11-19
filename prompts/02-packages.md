# 02. 뼈대와 도구

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/02-packages` |
| 선행 | 01 |
| 읽을 문서 | [DESIGN 2장](../docs/DESIGN.md#2-기술-선택), [8장 폴더 구조](../docs/DESIGN.md#8-폴더-구조), [9.2절 의존 방향](../docs/DESIGN.md#92-의존-방향), [11.4절](../docs/DESIGN.md#114-e2e-서버와-데이터) |
| 고칠 폴더 | 루트, `server/plugin.ts`, `server/app.ts`, `src/main.tsx`, `src/app.tsx`, `scripts`, `public` |

## 이 단계가 끝나면

- [ ] `package.json`의 의존성이 DESIGN 2.2절의 열 개와 정확히 같다(`^` 없음).
- [ ] `bun install`이 종료 코드 0이다.
- [ ] `bun run check`(typecheck, check:imports, check:css, test)가 통과한다.
- [ ] `bun run dev`로 http://localhost:5173 에 "Chat"이 보이고, http://localhost:5173/api/health 가 `{ "status": "ok" }`다. 프로세스는 하나다.
- [ ] `bun run test:smoke`와 `bun run test:e2e:build`가 Chromium에서 통과한다.
- [ ] `check:imports`가 DESIGN 9.2절의 표를 그대로 갖고, 행마다 일부러 어긴 import를 잡는 것을 한 번 봤다.

## 순서

1. **입력** 프롬프트 1.
2. **에이전트** 파일을 만들고 설치하고, 브라우저를 받고, 확인한다.
3. **확인**

   ```powershell
   bun install
   bun run check
   bun run test:smoke
   bun run test:e2e:build
   bun run dev
   ```

   `bun run dev`를 띄운 채 http://localhost:5173 과 http://localhost:5173/api/health 를 연다. 다 보면 Ctrl+C로 끈다.

4. **검토 지점**
   - `package.json`을 DESIGN 2.2절에 맞대 본다. 그 밖의 패키지가 있으면 이유를 묻는다.
   - `scripts/check-imports.ts`의 표를 DESIGN 9.2절의 표와 한 줄씩 맞대 본다. 오류 줄에 규칙 ID가 나오는지 본다.
   - `server/plugin.ts`가 `configureServer`와 `configurePreviewServer`에 같은 처리기를 다는지 본다.
5. **입력** 검토 프롬프트(README 6.2절). 절은 "2장, 8장, 9.2절, 11.4절".
6. **입력** 반영 프롬프트(README 6.5절).

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 02 뼈대와 도구. 브랜치 stage/02-packages 를 main에서 만든다.
DESIGN 2장, 8장, 9.2절, 11.4절을 읽는다. 앱 기능은 만들지 않는다. 패키지 하나의 뼈대만 만든다.

1. 버전 확인: DESIGN 2.2절의 열 개마다 npm view <패키지>@<버전> version 으로 그 버전이 있는지 본다(npm 이 없으면 bunx npm view).
   없는 버전이 있으면 멈추고 보고한다. 더 새 버전이 있어도 올리지 않는다(올리는 것은 ADR이 필요하다).
2. 파일
   - package.json: name chat-client, private, type module, packageManager bun@1.4.4, engines.bun >=1.4,
     scripts 는 DESIGN 2.2절의 표 그대로, 의존성은 표의 열 개 그대로.
   - tsconfig.json: include 는 src, server, shared, scripts, e2e, dev, vite.config.ts, playwright.config.ts. exclude 는 **/*.test.ts.
     target ES2022, lib DOM, DOM.Iterable, ES2023, module ESNext, moduleResolution Bundler, jsx react-jsx, strict, noUncheckedIndexedAccess,
     noUnusedLocals, noUnusedParameters, isolatedModules, verbatimModuleSyntax, skipLibCheck, noEmit, types ["vite/client", "node"].
   - vite.config.ts: react 플러그인과 server/plugin.ts 의 chatApi 플러그인. cacheDir 는 E2E_CACHE_DIR(없으면 기본). server.port 5173.
     build 입력은 index.html 하나다.
   - server/app.ts: createApi() 가 (req, res, next) 처리기를 돌려준다. /api 가 아니면 next(). GET /api/health 는 200 { status: 'ok' }.
     그 밖의 /api 는 404 { error: { code: 'not_found', message } }. node:http 의 req, res 만 쓴다. 05단계에서 채운다.
   - server/plugin.ts: chatApi() 가 Vite 플러그인을 돌려준다. configureServer 와 configurePreviewServer 에서 server.middlewares.use(createApi()).
   - index.html(title Chat), src/main.tsx, src/app.tsx(h1 "Chat" 하나), public/favicon.svg.
   - playwright.config.ts: testDir src, testMatch **/*.e2e.ts. workers 는 E2E_WORKERS(기본 4).
     워커 i마다 서버 하나: 포트 5201+i, 명령은 bun --bun vite --port <포트> --strictPort, E2E_SERVER=preview 이면 bun --bun vite preview --port <포트> --strictPort.
     서버의 env 는 DATA_DIR .e2e-data/w{i}, DATA_RESET_ON_START 1, E2E_CACHE_DIR node_modules/.vite-e2e/<포트>. 기다리는 url 은 /api/health.
     baseURL 은 TEST_PARALLEL_INDEX 로 정한다. reuseExistingServer false. projects chromium, firefox, webkit.
     reporter list 와 html(open never). trace off, screenshot only-on-failure, video off.
     Playwright 의 --workers 로 워커 수를 바꾸지 말라는 주석을 단다(서버 수와 맞지 않는다).
   - .gitignore 에 dist/, data/, .e2e-data/, test-results/, playwright-report/ 가 있는지 보고 없으면 더한다.
3. 검사 스크립트(테스트 먼저)
   - scripts/check-imports.ts: DESIGN 9.2절의 "check:imports의 표"를 그대로 옮긴다. 파일마다 import 와 export from 과 동적 import 를 읽고,
     상대 경로를 저장소 기준 경로로 풀어 표와 맞댄다. Bun. 전역 사용과 서버 코드의 console. 호출도 본다(EDGE-2, SLIB-2).
     어기면 "파일:줄 규칙ID 가져온 것" 을 찍고 종료 코드 1. 없으면 [ok] 한 줄.
     테스트 파일(*.test.ts, *.e2e.ts)의 bun:test 와 @playwright/test 는 허용한다.
   - scripts/check-css.ts: src/styles/**/*.css 를 읽어 tokens.css 밖의 색 리터럴(#hex, rgb(, hsl(, oklch() (STYLE-4),
     tokens.css 밖의 prefers-color-scheme 이나 data-theme (STYLE-6), 같은 파일의 prefers-reduced-motion 블록에서 멈추지 않는 animation (STYLE-9),
     !important (STYLE-10) 를 찾는다. 찾으면 [fail] 줄과 종료 코드 1, CSS가 없으면 [ok] 한 줄.
   - scripts/clean.ts: dist, test-results, playwright-report, .e2e-data 를 node:fs 의 rm 으로 지운다.
   - 테스트(scripts/check-imports.test.ts, check-css.test.ts): 임시 폴더에 어기는 파일과 지키는 파일을 만들어 결과를 본다.
     check:imports 는 표의 행마다 하나씩 어기는 경우를 둔다. 돌려서 실패하는 출력을 먼저 보인다.
4. 테스트 먼저: src/app.e2e.ts 에 @smoke 둘을 쓴다. "첫 화면에 Chat 제목이 보인다", "page.request 로 /api/health 가 200 이다".
5. bun install. 설치가 의존성의 lifecycle 스크립트를 막았다고 나오면 그 이름을 보고한다(trustedDependencies 는 사람이 정한다).
   bunx playwright install chromium firefox webkit 으로 브라우저를 받는다.
6. 확인: bun run check, bun run test:smoke, bun run test:e2e:build. 그리고 bun run dev 를 띄워 5173 과 /api/health 가 200 인지 본 뒤 끈다.
7. docs/DECISIONS.md 의 ADR-002, 003, 015 에 "확인" 줄을 더한다: 설치한 실제 버전과 확인한 날짜.
8. 작게 나눠 커밋한다. 예: chore: add the package and tool configs / chore: add the api plugin skeleton / test: add the import and css checks / test: add the first smoke tests.
```

## 막히면

- **tsc가 TypeScript 7의 옵션을 거부한다.** 오류 문구대로 옵션을 고치되, 고친 것을 보고하게 한다.
- **Vite가 서버 코드의 `node:sqlite` 같은 모듈을 묶으려 한다.** 설정 파일이 가져오는 서버 코드는 Vite가 Node 쪽에서 읽는다. 이 단계에서는 아직 `node:sqlite`를 쓰지 않는다. 06단계에서 나면 그때 보고하게 한다.
- **`check:imports`가 상대 경로를 놓친다.** `../../server/store/x`처럼 올라가는 경로를 저장소 기준으로 풀었는지 본다. 3번의 테스트에 그 경우를 더한다.
- **Playwright의 WebKit 설치가 실패한다.** 프록시나 백신을 본다. Chromium만 먼저 받고 진행해도 되지만, TASKS.md에 "WebKit 없음"으로 적는다.
