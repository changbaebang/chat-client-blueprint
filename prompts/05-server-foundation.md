# 05. 기초 API

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/05-server-foundation` |
| 선행 | 03. 04와는 서로 기대지 않는다 |
| 읽을 문서 | [DESIGN 4.1절](../docs/DESIGN.md#41-공통-규칙), [4.7절](../docs/DESIGN.md#47-오류-코드), [4.8절](../docs/DESIGN.md#48-운영-엔드포인트), [6.1절](../docs/DESIGN.md#61-요청-하나의-흐름), [6.4절](../docs/DESIGN.md#64-시작과-종료), [9.4절](../docs/DESIGN.md#94-serverhttp), [9.8절](../docs/DESIGN.md#98-serverlib), [11.4절](../docs/DESIGN.md#114-e2e-서버와-데이터), [12장](../docs/DESIGN.md#12-운영과-관측) |
| 고칠 폴더 | `server/config.ts`, `server/app.ts`, `server/plugin.ts`, `server/http`, `server/lib`, `server/domain/errors.ts`, `server/domain/ports.ts` |
| 쓸 스킬 | (설치하면) `typescript-review`, `affected-verification` |

## 이 단계가 끝나면

- [ ] `/api` 요청의 처리 순서가 DESIGN 6.1절과 같다. 사용자 판별과 채팅 경로는 아직 비어 있다.
- [ ] Host, Origin, 본문 크기, 본문 종류, 없는 경로가 4.7절의 코드로 거절된다.
- [ ] 라우터가 경로 틀(`/api/chats/:id/responses/:responseId/cancel`)을 맞춘다. 검증 도우미(`validate.ts`)가 있다.
- [ ] SSE 도우미가 있고, 연결 끊김을 `res`의 `close`로 판단한다(HTTP-5). 테스트가 실제로 끊어서 본다.
- [ ] 로그가 JSON 한 줄씩이고, 본문을 남기지 않는다(HTTP-6).
- [ ] 플러그인이 시작할 때 설정을 읽고, e2e에서는 데이터 폴더를 비우고, 닫힐 때 정리한다.
- [ ] `server/http`, `server/lib`, `server/domain`의 `POLICY.md`가 있다. `http`와 `lib`은 사람이 승인했다. `domain`은 "작성 중"으로 둔다(10단계에서 승인).

## 순서

1. **입력** 프롬프트 1.
2. **확인**

   ```powershell
   bun run check
   bun test server
   bun run test:smoke
   bun run dev
   ```

   `bun run dev`를 띄운 채 다른 PowerShell에서:

   ```powershell
   curl.exe -i http://localhost:5173/api/health
   curl.exe -i -H "Host: evil.example" http://localhost:5173/api/health
   ```

   첫째는 200과 `X-Request-Id`, 둘째는 403 `origin_rejected`다. 개발 서버 창의 로그가 JSON 한 줄씩인지 본다.

3. **검토 지점**
   - `http/sse.ts`의 끊김 판단 줄과, 그것을 보는 테스트가 정말 연결을 끊는지(`AbortController`로 fetch를 끊는지) 읽는다.
   - `config.ts`가 `DATA_RESET_ON_START`를 `.e2e-data`가 아닌 경로에서 거절하는지 본다.
   - `http`, `lib`의 `POLICY.md`를 승인한다.
4. **입력** 검토 프롬프트. 절은 "4.1, 4.7, 4.8, 6.1, 6.4, 9.4, 9.8, 11.4절, 12장".
5. **입력** 반영 프롬프트.

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 05 기초 API. 브랜치 stage/05-server-foundation 을 main에서 만든다.
DESIGN 4.1, 4.7, 4.8, 6.1, 6.4, 9.4, 9.5, 9.8, 11.4절과 12장을 읽는다. 저장소, 인증, 채팅은 아직 만들지 않는다.
서버 프레임워크를 더하지 않는다. node:http 의 req, res 만 쓰고, Bun 전용 API 를 쓰지 않는다(EDGE-2).

1. 정책 먼저: server/http/POLICY.md, server/lib/POLICY.md, server/domain/POLICY.md 를 DESIGN 9.1절의 형식으로 만든다. 상태는 "작성 중".
2. 테스트 먼저(server/**/*.test.ts, bun test). HTTP 테스트는 createApi 를 node:http 의 createServer 에 붙여 포트 0에 띄우고,
   next 는 404 로 끝내는 함수로 준다. 임시 데이터 폴더를 쓴다. 응답의 필드 목록을 shared 의 타입과 맞대 본다.
   - GET /api/health 200, 모든 /api 응답에 X-Request-Id.
   - GET /api/ready 200. 데이터 폴더에 쓸 수 없으면 503 not_ready.
   - 없는 /api 경로는 404 not_found 이고 본문이 ErrorBody 다. /api 가 아닌 경로는 next 로 간다.
   - Host 가 evil.example 이면 403 origin_rejected. POST 의 Origin 호스트가 Host 와 다르면 403. 같으면 지나간다.
   - 64KB 넘는 JSON 본문은 413 body_too_large, text/plain 본문은 415 unsupported_media_type, 깨진 JSON 은 400 invalid_request.
   - 처리기가 DomainError 의 code 를 http/errors.ts 의 표대로 상태로 바꾼다. 4.7절의 코드마다 상태가 맞다(HTTP-2).
     표는 Record<ErrorCode, number> 라서 코드가 늘면 tsc 가 빈칸을 잡는다.
   - router: 메서드와 경로 틀을 맞추고 :id 같은 값을 꺼낸다. 메서드만 틀리면 404 not_found 다.
   - validate: 문자열, 공백 정리, 길이, 불리언, 접두사 id(^(usr|cht|msg|rsp)_[a-z2-7]{20}$), 한 값 고르기 도우미가
     맞으면 값을 돌려주고 틀리면 fields 가 있는 invalid_request 를 던진다(HTTP-9). "../x" 같은 id 는 거절한다.
   - 로그: 요청마다 http.request 한 줄이 JSON 이고, 보낸 본문의 글자가 로그 출력에 없다(HTTP-6).
   - sse.ts: 테스트 안의 시험용 경로로 본다(실제 경로에는 두지 않는다).
     머리가 text/event-stream, Cache-Control no-cache, no-transform, X-Accel-Buffering no. 이벤트 형식이 event 줄과 data 줄과 빈 줄.
     15초 ping 은 가짜 타이머나 주입한 간격으로 본다. done() 이 data: [DONE] 을 쓰고 끝낸다.
     클라이언트가 AbortController 로 fetch 를 끊으면 onClose 가 한 번 불린다. 끊지 않고 끝까지 읽으면 불리지 않는다(HTTP-5).
     req 의 close 를 쓰도록 한 번 바꿔 이 테스트가 실패하는 것을 보고 되돌린다(변이 확인).
   - config: 환경 변수가 틀리면 무엇이 틀렸는지 담아 던진다. DATA_RESET_ON_START=1 인데 DATA_DIR 에 .e2e-data 가 없으면 던진다.
   돌려서 실패하는 출력을 보인다.
3. 구현
   - config.ts: DATA_DIR data, DATA_RESET_ON_START 0, REPLY_DELAY_SCALE 1, LOG_LEVEL info. 라이브러리 없이 읽고 검사한다.
   - lib: log.ts(JSON 한 줄, level, 출력 대상을 주입할 수 있게), clock.ts, ids.ts(접두사와 node:crypto 난수의 base32 20자),
     mutex.ts(열쇠마다 하나인 비동기 뮤텍스), retry.ts(정해진 오류 코드에만, 정해진 간격으로), random.ts(시드 난수). 각각 모듈 테스트.
   - domain/errors.ts: DomainError(code: ErrorCode, message, extra). domain/ports.ts: Clock, Ids, Log 타입. 저장소 포트는 06단계에서 더한다.
   - http: router.ts, body.ts(64KB, application/json), validate.ts, errors.ts, sse.ts, guards.ts(요청 ID, 접근 로그, Host와 Origin),
     routes/health.ts. 사용자 판별 자리는 이름만 둔다(08단계). 순서는 DESIGN 6.1절.
   - app.ts: createApi(deps) 가 (req, res, next) 처리기를 돌려준다. deps 는 config, log, clock, ids 와 ready 검사 함수.
   - plugin.ts: DESIGN 6.4절의 시작과 종료. 저장소는 아직 없으니 데이터 폴더를 만들고 쓸 수 있는지만 본다.
     DATA_RESET_ON_START 면 시작할 때 데이터 폴더를 비운다. Vite 의 httpServer 가 close 될 때 정리한다.
4. 확인: bun run check, bun test server, bun run test:smoke. 그리고 bun run dev 를 띄워 /api/health 가 200 인지 본 뒤 끈다.
5. README.md 에 실행 방법과 명령표(DESIGN 2.2절)를 쓴다.
6. 작게 커밋한다.
```

## 막히면

- **SSE 테스트가 끊기 전에 `onClose`를 부른다.** `req.on('close')`를 쓰고 있다. 2026-11-18에 Node 22와 Bun 1.4로 잰 결과, 이 이벤트는 본문을 다 읽은 직후에 온다. `res.on('close')`와 `res.writableFinished === false`로 바꾼다.
- **Vite 개발 서버를 거친 SSE가 한꺼번에 온다.** 응답에 압축이 걸렸는지 본다. `Cache-Control: no-transform`이 있는지, 처리기가 Vite의 다른 미들웨어보다 먼저 붙었는지 본다.
- **Playwright가 서버를 기다리다 시간이 넘는다.** 포트가 다른 실행과 겹치는지 본다. `reuseExistingServer`가 `false`라 겹치면 바로 실패해야 한다. 이전 실행의 bun 프로세스가 남았으면 `Get-Process bun`으로 본다.
- **Windows에서 종료 로그가 안 남는다.** Playwright는 서버를 강제로 끝낸다. 정상이다. 그래서 시작할 때 복구한다(07단계).
