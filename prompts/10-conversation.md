# 10. 대화와 스트리밍

가장 큰 단계다. 서버의 답변 흐름과 웹의 채팅 저장소가 여기서 생긴다. 프롬프트를 셋(서버, 웹의 전송, 웹의 화면)으로 나눴다. 각 프롬프트 뒤에 확인하고 넘어간다.

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/10-conversation` |
| 선행 | 09 |
| 읽을 문서 | [DESIGN 3.2절의 F-SEND, F-STOP, F-DRAFT](../docs/DESIGN.md#32-기능), [4.5절](../docs/DESIGN.md#45-메시지), [4.6절 답변 스트림](../docs/DESIGN.md#46-답변-스트림), [5.4절](../docs/DESIGN.md#54-연산별-쓰기-순서), [6.2절](../docs/DESIGN.md#62-답변-하나의-흐름), [6.3절 잠금](../docs/DESIGN.md#63-잠금), [7.1~7.3절](../docs/DESIGN.md#7-웹-구조), [9.5절](../docs/DESIGN.md#95-serverdomain), [9.7절](../docs/DESIGN.md#97-serverreply), [9.9절](../docs/DESIGN.md#99-srcapi) |
| 고칠 폴더 | 서버: `reply`, `domain/answering.ts`, `responses.ts`, `messages.ts`, `mappers.ts`, `chats.ts`, `http/routes/messages.ts`, `responses.ts`, `plugin.ts`. 웹: `api/sse.ts`, `responses.ts`, `messages.ts`, `state/chats.tsx`, `state/drafts.ts`, `components/chat`, `styles/chat.css` |
| 쓸 스킬 | (설치하면) `api-contract-check`, `side-effect-check`, `react-review`, `browser-e2e-check` |

## 이 단계가 끝나면

- [ ] 서버: mock 생성기가 결정적인 Markdown 답을 조각으로 낸다. 테스트 지시어 다섯 개가 있다.
- [ ] 서버: 보내기, 스트림, 취소, 연결 끊김, 실패, 시간 초과, 삭제, 종료가 DESIGN 6.2절과 5.4절대로 끝난다. 어느 경우든 다음 전송이 된다.
- [ ] 서버: 취소 응답 직후의 전송이 20번 모두 성공한다(DOM-8). 스트리밍 중에 읽은 메시지가 `streaming`이다.
- [ ] 웹: SSE 파서와 `sendMessage`의 모듈 테스트가 있다. 루프를 일찍 떠나도 연결을 끝낸다.
- [ ] 웹: 입력창, 낙관적 메시지, 대기 표시, 조각 누적, 확정, Stop과 Esc, 따라가기 스크롤, Jump to latest, 상태 표시, 끝날 때 한 번 알림, 초안.
- [ ] e2e가 F-SEND, F-STOP, F-DRAFT의 완료 조건과 COMP-9(XSS)를 세 엔진에서 본다.
- [ ] `domain`, `reply` `POLICY.md`를 사람이 승인했다.

## 순서

1. **입력** 프롬프트 1(서버).
2. **확인**

   ```powershell
   bun run check
   bun test server
   ```

   curl로 보려면 `X-User-Id` 머리가 필요해 번거롭다. 대신 HTTP 테스트의 이름 목록을 보고 4.6절의 순서 셋(정상, 취소, 실패)이 모두 있는지 본다.

3. **검토 지점(서버)** `domain/responses.ts`를 사람이 처음부터 끝까지 읽는다. 잠금을 잡는 곳과 푸는 곳(`finally`), 문서를 쓰는 두 지점, 요약을 쓰는 두 지점, `abort` 이유가 기록되는 곳을 짚을 수 있어야 한다.
4. **입력** 프롬프트 2(웹의 전송).
5. **확인**

   ```powershell
   bun run check
   bun test src
   ```

6. **검토 지점(웹)** `state/chats.tsx`를 사람이 읽는다. 보내기의 네 갈래(정상, 열기 전 실패, 도중 실패, 멈춤)가 각각 어디서 끝나는지 짚을 수 있어야 한다.
7. **입력** 프롬프트 3(웹의 화면).
8. **확인**

   ```powershell
   bun run check
   bun --bun playwright test src/components/chat src/state
   bun run dev
   ```

9. **직접 확인** 데모 사용자(Demo)를 골라서:
   - 실제 한글 입력기로 "안녕하세요"를 치고 조합이 끝나기 전에 Enter를 누른다. 보내지지 않고, 마지막 글자가 두 번 들어가지 않아야 한다.
   - `[[mock:long]]`을 보내고 위로 스크롤한다. 따라가기가 멈추고 Jump to latest가 보여야 한다.
   - 답변 중에 다른 채팅으로 갔다가 돌아온다. 답변이 이어져야 한다.
   **이해 확인** README 6.11절을 붙여 Enter부터 마지막 조각이 그려질 때까지를 설명받는다. `docs/READING.md`의 그 행에 자기 말로 한두 줄을 적는다.
   **화면 점검** 아래 "화면 점검" 절.
10. **입력** 검토 프롬프트. 절은 "3.2절, 4.5절, 4.6절, 5.4절, 6.2절, 6.3절, 7장, 9.5절, 9.7절, 9.9절".
11. **입력** 반영 프롬프트.

## 프롬프트 1. 서버

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 10 대화와 스트리밍의 서버 쪽. 브랜치 stage/10-conversation 을 main에서 만든다.
DESIGN 4.5, 4.6, 5.3, 5.4, 6.2, 6.3, 6.4, 9.4, 9.5, 9.7절을 읽는다.

1. 정책: server/reply/POLICY.md 를 만든다(상태 "작성 중"). domain/POLICY.md 에 DOM-6~DOM-8 의 예를 채운다.
2. 테스트 먼저
   - 모듈(reply/*.test.ts): 같은 chatId, 메시지 수, 입력이면 같은 조각들이다(REPLY-4).
     지시어 [[mock:long]], [[mock:slow]], [[mock:fail-after=3]], [[mock:never]], [[mock:echo]] 가 9.7절대로 동작하고, 지시어 글자는 답에 나오지 않는다(REPLY-5).
     abort 하면 50ms 안에 끝난다. [[mock:never]] 도 abort 로 깬다(REPLY-2). REPLY_DELAY_SCALE 0이면 기다리지 않는다.
   - 모듈(domain/answering.test.ts, responses.test.ts): 진짜 저장소를 임시 폴더에. 가짜 시계.
     생성기가 던져도, abort 되어도, 120초를 넘어도 잠금이 풀려 다음 전송이 된다(DOM-6).
     같은 채팅의 두 번째 prepare 는 response_in_progress. 같은 clientMessageId 는 duplicate_message 와 그 messageId.
     메시지가 400개면 chat_too_long. 저장소 호출을 기록해 5.4절의 순서(문서 다음 요약)를 본다(DOM-2).
     첫 조각 전에 멈추면 빈 답변이 문서에서 빠지고 사용자 메시지만 남는다. 요약의 messageCount 가 문서 길이와 같다.
   - HTTP(http/routes/responses.test.ts): REPLY_DELAY_SCALE 0, 필요한 곳만 [[mock:slow]] 나 [[mock:never]].
     정상 순서가 4.6절과 같고 [DONE] 으로 끝난다. 조각을 이은 글이 output_text.done 의 글과, 다시 읽은 메시지의 글과 같다.
     첫 메시지면 chat.updated 의 title 이 입력의 앞 60자다. 두 번째 메시지는 제목을 바꾸지 않는다.
     스트리밍 중에 GET messages 하면 답변이 status streaming 이다. 스트리밍 중 GET chat 의 answering 이 true 다.
     취소 API: 도중이면 200 과 incomplete 메시지, 열린 스트림은 output_text.done(incomplete), chat.updated, response.completed(incomplete), [DONE].
     첫 조각 전이면 200 과 null. 끝난 답변이면 404 response_not_found.
     취소 응답을 받자마자 보내기를 20번 되풀이해 모두 200 이다(DOM-8, F-STOP-3).
     fetch 를 AbortController 로 끊으면 서버가 incomplete 로 저장하고 reply.endedBy 가 client_closed 다(HTTP-5).
     [[mock:fail-after=3]] 은 response.failed 와 [DONE], 저장된 답변은 failed.
     스트리밍 중 DELETE 는 204, 스트림이 끝나고, 문서가 없고, 다시 읽으면 404.
     다른 사용자의 채팅에 보내기와 취소는 404(DOM-3).
     로그에 보낸 글이 없고 response.finished 한 줄에 endedBy, firstTokenMs, durationMs, chunks 가 있다(HTTP-6, 12장).
   돌려서 실패하는 출력을 보인다.
3. 구현
   - reply: mock-provider.ts(ReplyProvider 구현), mock-answers.ts(제목, 목록, 표, 코드 블록, 링크가 섞인 답 틀 여럿),
     directives.ts(지시어 해석). [[mock:echo]] 는 입력에서 지시어를 뺀 글을 그대로 Markdown 답으로 돌려준다.
     조각 간격 20~70ms 에 REPLY_DELAY_SCALE 을 곱한다. 시드 난수는 lib/random.ts.
   - domain/answering.ts: Map<chatId, ActiveResponse>. acquire, release, abort(chatId, reason), abortAll(reason).
     ActiveResponse 는 { responseId, controller, done }.
   - domain/responses.ts: prepareResponse 와 run.start(emit), cancel(userId, chatId, responseId). DESIGN 6.2절과 5.4절 그대로.
     답변 도중에는 문서에 쓰지 않는다(ADR-005). 끝날 때 reply 기록(provider, model, seed, firstTokenMs, durationMs, chunks, endedBy)을 문서에 남긴다.
     120초를 넘으면 abort('timeout') 하고 failed 로 끝낸다.
   - domain/messages.ts 와 mappers.ts 의 toMessage(reply, ownerId 같은 내부 필드는 내지 않는다, DOM-7). toChatSummary 의 answering 을 채운다.
   - domain/chats.ts 의 remove: answering.abort(chatId, 'chat_deleted') 뒤 done 을 기다리고, RDB, 문서 순으로 지운다.
   - http/routes/messages.ts, responses.ts: 열기 전 실패는 JSON 오류, 열린 뒤에는 sse.ts 로 쓴다.
     res 의 close 에서 writableFinished 가 false 면 abort('client_closed')(HTTP-5).
   - plugin.ts: 종료 때(Vite 서버의 close 와 SIGINT) abortAll('shutdown') 하고 최대 5초 기다린다(DESIGN 6.4절).
   - scripts/seed.ts: 데모 채팅 몇 개에 메시지를 넣는다. 문서 저장소로 쓴다.
4. 확인: bun run check, bun test server, bun run data:check.
5. 작게 커밋한다.
```

## 프롬프트 2. 웹의 전송

```text
앞 프롬프트에 이어 10단계의 웹 전송 쪽을 같은 브랜치에서 한다. AGENTS.md와 고칠 폴더의 POLICY.md 규칙은 그대로다.
DESIGN 4.6절, 7.1절, 7.2절, 7.3절, 9.9절, 9.11절을 읽는다. 화면은 다음 프롬프트다.

1. 테스트 먼저
   - 모듈(api/sse.test.ts): 청크가 이벤트 중간에서 잘려 와도 이벤트가 하나로 모인다. \r\n 과 \n 을 모두 받는다.
     ": ping" 같은 주석 줄은 무시한다. 빈 줄 없이 끝난 마지막 이벤트도 읽는다. data: [DONE] 에서 끝난다.
   - 모듈(api/responses.test.ts, fetch 대체): 이벤트를 계약 타입으로 낸다. [DONE] 없이 닫히면 StreamEndedEarlyError.
     호출한 쪽이 for await 를 일찍 떠나면 reader.cancel 이 불린다(API-7). 열기 전 실패(409, 413)는 ApiError 이고 duplicate_message 의 messageId 를 담는다.
     cancelResponse 는 200 의 message 와 404 를 모두 "끝남"으로 돌려준다.
   - 모듈(state/chats.test.ts): createChatStore 를 가짜 api 로 돌린다.
     보내면 임시 사용자 메시지가 바로 생기고 message.created 에서 서버의 것으로 바뀐다. 조각이 answer.text 에 붙고 output_text.done 에서 messages 로 옮겨진다.
     열기 전 실패는 임시 메시지를 빼고 쓴 글을 돌려준다. 도중 실패는 받은 글을 유지한 채 syncWithServer 하고 answer 를 비운다.
     답변 중에 돌아온 메시지 읽기 결과가 진행 중인 답변을 덮지 않는다.
     멈춤: responseId 가 있으면 취소 API 를 기다린 뒤 연결을 닫는다. 없으면 연결만 끊는다. 끝나면 한 번 다시 읽는다.
     불러온 채팅은 다시 열어도 다시 읽지 않고, 실패한 채팅은 다시 읽고, 읽는 중에 다시 열면 요청이 하나다.
     구독은 채팅마다다. 채팅 A의 조각이 B의 구독자를 부르지 않는다(STATE-8).
     chat.updated 는 주입한 목록 반영 함수로 넘긴다(STATE-9).
   돌려서 실패하는 출력을 보인다.
2. 구현
   - api/sse.ts, api/responses.ts(sendMessage 는 async generator 이고 finally 에서 reader.cancel), api/messages.ts.
     중단은 오류 문구가 아니라 signal.aborted 로 판단한다(7.3절).
   - state/chats.tsx: DESIGN 7.1절의 Thread 와 createChatStore, ChatsProvider(key={user.id}, 사라질 때 진행 중인 답변을 모두 멈춘다), useThread(chatId).
     open, send, stop, syncWithServer. 목록 반영은 chat-list 의 applySummary 를 주입받는다.
   - state/drafts.ts: chat:draft:<userId>:<chatId> 열쇠(홈은 <chatId> 자리에 home). 읽고 쓰기는 lib/storage.ts 로(LIB-2, LIB-3).
     채팅 삭제 기능 훅(09단계)에서 그 채팅의 초안도 지운다.
3. 확인: bun run check, bun test src.
4. 작게 커밋한다.
```

## 프롬프트 3. 웹의 화면

```text
앞 프롬프트에 이어 10단계의 채팅 화면을 같은 브랜치에서 한다. AGENTS.md와 고칠 폴더의 POLICY.md 규칙은 그대로다.
DESIGN 3.2절의 F-SEND, F-STOP, F-DRAFT, 3.5절, 7.3절, 9.12절, 9.13절, 11.2절을 읽는다.

1. 테스트 먼저(components/chat/*.e2e.ts). 모두 asUser fixture 로 새 사용자다.
   F-SEND-1: Enter 로 보내고 Shift+Enter 로 줄을 바꾼다. compositionstart 와 keyCode 229 의 keydown 을 흉내 내면 Enter 로 보내지 않는다.
     높이가 글에 따라 늘고 본문 높이의 40%에서 멈춘다. 공백뿐이면 보내기가 꺼진다. 8000자를 넘으면 남은 글자 수가 보이고 꺼진다.
   F-SEND-2, 3: 보낸 글이 바로 보이고, 대기 표시 뒤 답이 점점 길어지고, 끝난 뒤 내용이 새로고침해 다시 읽은 것과 같다.
   F-SEND-4: [[mock:long]] 중에 위로 스크롤하면 따라가기가 멈추고 Jump to latest 가 보인다. 누르면 끝으로 가서 다시 따라간다.
     휠을 위로 한 번 굴리면 바로 멈춘다(Firefox 포함).
   F-SEND-5: 답변 중에 다른 채팅으로 갔다가 돌아오면 이어서 보인다.
   F-SEND-6: 메시지가 많은 채팅(api 도우미로 만든다)을 열 때, 첫 그림부터 스크롤이 끝에 있다. 프레임마다 scrollTop 을 기록해 본다.
   F-SEND-7: dev 서버에서 답변 중에 끝난 메시지 컴포넌트가 다시 그려지지 않는다(렌더 수를 센다).
   F-SEND-8: live region 의 글이 답변이 끝날 때 한 번 바뀐다.
   F-SEND-9: 멈춘 답에 "Stopped", [[mock:fail-after=3]] 의 답에 "The answer failed" 와 입력창 위 안내.
   F-STOP-1~3: 답변 중 보내기 버튼이 Stop 이 된다. 입력창의 Esc 도 멈춘다. 다이얼로그가 열려 있으면 Esc 는 다이얼로그만 닫는다.
     멈추면 받은 글과 "Stopped" 가 남고, 새로고침해도 같다. [[mock:never]] 로 첫 조각 전에 멈추면 사용자 메시지만 남는다.
     멈추고 바로 보내기를 5번 되풀이해 모두 답을 받는다(20번은 HTTP 테스트가 본다).
     멈춘 뒤와, 답변 중에 다른 채팅으로 갔다 온 뒤에 오류 문구와 Retry 가 없다(F-STOP-2. 끊은 요청은 오류가 아니다).
   따라가기: 위로 올려 둔 채 보내면 맨 아래로 간다. 채팅을 바꾸면 따라가기가 그 채팅의 처음 상태(맨 아래)로 돌아간다.
     휠 테스트는 순서를 고정한다(휠 뒤에 조각이 온다). 높이가 그대로인 조각으로 따라가기가 다시 켜지지 않는다.
   F-DRAFT-1: 쓰던 글이 다른 채팅에 갔다 와도, 새로고침해도 남는다. 보내면 지워진다. 실패해 돌아온 글은 다시 초안이다.
     채팅을 지우면 그 초안도 없다. 다른 사용자를 고르면 보이지 않는다. localStorage 가 던지는 컨텍스트에서도 화면이 돈다.
   - 모듈(lib/markdown.test.ts, LIB-8): 제목, 문단, 한 단계 목록(순서 있음과 없음), 코드 블록, 표, 인라인 코드, 굵게, 기울임, 링크를 그린다.
     답변은 조각으로 오니 그리는 도중의 글은 늘 불완전하다. 이런 입력에서도 무한 루프 없이 끝난다:
     구분선이 아직 없는 표 머리줄, "#" 만 있는 줄, 닫히지 않은 코드 블록, 끝나지 않은 "**".
     루프마다 횟수를 세는 장치를 두어, 끝나지 않으면 테스트가 멈춰 버리지 않고 실패하게 한다.
     javascript: 링크는 글자로 남고, http, https, mailto 만 링크가 된다(COMP-9).
   COMP-9: [[mock:echo]] 로 <img src=x onerror="window.__xss=1"> 를 보내면 답에 글자로 보이고 window.__xss 가 없다.
     사용자 메시지도 글자로 보인다. 답의 링크는 target _blank 와 rel noopener noreferrer.
   돌려서 실패하는 출력을 보인다.
2. 구현
   - components/chat: chat-screen(열기, 헤더, 목록, 입력창), message-list(스크롤 영역 tabindex 0 과 이름, aria-busy),
     message-view(memo. 사용자 메시지는 줄바꿈만 살린 글자, 답은 lib/markdown.tsx 로 그린다),
     pending-answer, composer(자동 높이는 JS, 조합 처리, 글자 수, Stop, Esc), composer-notice, jump-to-latest,
     use-follow-latest(맨 아래일 때만 따라가고 위로 가는 휠에 바로 멈춘다), 끝날 때 한 번 알리는 live region.
     입력창은 홈에서도 쓸 수 있게 props 로만 받는다(11단계).
     전송이 실패하면 입력창이 돌려받은 글을 다시 받는다. 견본 화면(dev/ui.html)에 채팅 부품의 상태(대기, 답변 중, 멈춤, 실패, 안내)를 더한다(UX-1).
   - lib/markdown.tsx: 위 문법만 React 요소로 그린다. HTML 문자열을 넣지 않는다(dangerouslySetInnerHTML 없음). 분기마다 한 줄 이상 읽는다(LIB-8).
   - styles/chat.css. 색은 토큰, 애니메이션은 동작 줄이기에서 멈춘다.
3. 확인: bun run check, 위 e2e 를 세 엔진에서, bun run test:smoke, bun run data:check.
4. 작게 커밋한다.
```

## 화면 점검

기능의 확인이 끝난 뒤, 검토 프롬프트 전에 한다. 틀은 [README 6.12절](README.md#612-화면-점검), 기준은 [DESIGN 3.7절](../docs/DESIGN.md#37-화면-품질)이다.

```text
이 단계의 화면 점검을 한다. 기준은 docs/DESIGN.md 3.7절이다. 앱 코드는 고치지 않는다.
1. SCREENS_STAGE=10 bun run test:screens 를 돌려 docs/evidence/ui/10/ 에 캡처를 남긴다.
   이 단계에서 생긴 화면과 상태가 @screens 에 없으면 먼저 더한다.
2. 처음 쓰는 사람의 눈으로 흐름을 따라간다: 보내기, 답변 받는 중, 멈추기, 실패와 다시 보내기, 긴 답과 코드 블록과 표, 위로 올려 읽다가 맨 아래로 돌아가기, 다른 채팅에 갔다 와서 초안 보기.
   밝은 테마와 어두운 테마, 창 1280x800, 1024x700, 1280x480.
3. docs/evidence/ui/10/CHECK.md 를 만든다. UX-1부터 UX-10까지 행마다 캡처 파일, 본 것,
   판정(맞음, 고칠 것, 사람이 볼 것)을 쓰고, 끝에 사람이 체크할 빈 칸을 둔다.
4. 같은 상황의 안내 문구를 표로 모은다(UX-7).
5. 일반 AI 에이전트 웹앱과 다르게 한 곳은 docs/evidence/ui/compare.md 에 이유와 함께 적는다(UX-2).
   일반 AI 에이전트 웹앱의 화면은 사람이 직접 찍어 docs/evidence/ui/reference/ 에 넣은 것만 쓴다.
6. "고칠 것"을 목록으로 보이고 멈춘다. 이 단계에서 고칠지 15단계로 넘길지는 내가 정한다.
```

**사람** 캡처를 열어 보고 `CHECK.md`의 빈 칸에 체크한다. 캡처로 모자라면 앱을 띄워 위 흐름을 직접 써 본다. 체크하지 않은 단계는 반영하지 않는다(UX-10).

## 막히면

- **취소 직후 보내기가 가끔 409다.** 취소 경로가 `abort` 뒤 `done`을 기다리지 않고 응답하는지 본다(DOM-8).
- **모든 답변이 시작하자마자 `client_closed`로 끝난다.** `req.on('close')`를 쓰고 있다(HTTP-5).
- **Firefox에서 위로 스크롤해도 끝으로 끌려간다.** 위치 비교만으로 판단하고 있다. Firefox는 휠 뒤 잠시 있다 스크롤을 움직인다. 위로 가는 `wheel`을 받으면 바로 멈추게 한다.
- **조각마다 앱 전체가 다시 그려진다.** 채팅 저장소가 context 값을 조각마다 바꾸는지 본다. 채팅마다 구독해야 한다(STATE-8).
- **WebKit에서 끊긴 스트림의 끝을 구분하지 못한다.** Playwright의 WebKit은 헤더 뒤의 끊김을 요청 실패로 알리지 않는다. 두 경우를 같은 복구 경로(`syncWithServer`)로 처리하고 화면 결과를 본다.
