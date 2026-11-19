# 09. 채팅 목록

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/09-chat-list` |
| 선행 | 08 |
| 읽을 문서 | [DESIGN 3.2절의 F-LIST, F-RENAME, F-DELETE, F-PIN](../docs/DESIGN.md#32-기능), [4.4절 채팅](../docs/DESIGN.md#44-채팅), [5.2절](../docs/DESIGN.md#52-rdb-스키마), [5.4절](../docs/DESIGN.md#54-연산별-쓰기-순서), [7.1절](../docs/DESIGN.md#71-상태), [9.5절](../docs/DESIGN.md#95-serverdomain), [9.11절](../docs/DESIGN.md#911-srcstate), [9.12절](../docs/DESIGN.md#912-srccomponents) |
| 고칠 폴더 | 서버: `domain/chats.ts`, `domain/mappers.ts`, `http/routes/chats.ts`, `scripts/seed.ts`. 웹: `api/chats.ts`, `state/chat-list.tsx`, `state/chat-list-rules.ts`, `components/shell`, `components/chat/chat-menu.tsx`, `chat-name-input.tsx`, `chat-screen.tsx`(자리만), `lib/use-load-more.ts`, `use-in-view.ts`, `use-local-day.ts` |
| 쓸 스킬 | (설치하면) `api-contract-check`, `react-review`, `e2e-test-design` |

## 이 단계가 끝나면

- [ ] 서버: 목록(커서), 고정 목록, 만들기, 하나 읽기, 이름 변경, 고정, 삭제가 DESIGN 4.4절대로 동작한다.
- [ ] 남의 채팅은 모든 경로에서 404이고, 응답에 계약에 없는 필드가 없다(DOM-3, DOM-7).
- [ ] 웹: 사이드바에 Pinned 그룹과 날짜 그룹, 스크롤로 다음 페이지, 실패하면 멈추고 Retry, 행 메뉴(Rename, Pin 또는 Unpin, Delete).
- [ ] 인라인 이름 변경이 Enter, Esc, 한글 조합, 120자, 빈 값 취소, 실패 복구를 다룬다.
- [ ] 보고 있던 채팅을 지우면 홈으로 먼저 간다. 찾을 수 없음 화면이 한 프레임도 보이지 않는다.
- [ ] 사용자를 바꾸면 앞 사용자의 채팅이 한 프레임도 보이지 않는다(F-USER-3).
- [ ] `domain` `POLICY.md`는 아직 "작성 중"이다(10단계에서 승인). 웹의 `components` 정책에 이 단계의 예를 더했다.

## 순서

1. **입력** 프롬프트 1(서버).
2. **확인**

   ```powershell
   bun run check
   bun test server/http/routes/chats.test.ts server/domain
   ```

3. **입력** 프롬프트 2(웹).
4. **확인**

   ```powershell
   bun run check
   bun --bun playwright test src/components/shell src/state
   bun run data:reset --yes
   bun run data:seed
   bun run dev
   ```

   데모 사용자(Demo)를 고른다. 목록을 끝까지 스크롤하고, 이름을 바꾸고, 고정하고, 지워 본다. 창 높이를 줄여 맨 아래 행의 메뉴가 잘리지 않는지 본다.

5. **검토 지점**
   - `state/chat-list-rules.ts`: 페이지 합치기의 중복 제거, 고정과 고정 해제로 두 목록 사이를 옮기는 규칙, 요약 반영에서 제목을 지키는 규칙(F-RENAME-2). 이 파일은 사람이 읽고 설명할 수 있어야 한다.
   - `domain/chats.ts`의 삭제: RDB 먼저, 문서 나중(5.4절).
6. **입력** 검토 프롬프트. 절은 "3.2절, 4.4절, 5.4절, 7.1절, 9.5절, 9.11절, 9.12절".
7. **입력** 반영 프롬프트.

## 프롬프트 1. 서버

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 09 채팅 목록의 서버 쪽. 브랜치 stage/09-chat-list 를 main에서 만든다.
DESIGN 4.4절, 5.4절, 9.4절, 9.5절을 읽는다. 메시지와 답변은 10단계다.

1. 테스트 먼저(http/routes/chats.test.ts, domain/chats.test.ts). 진짜 저장소를 임시 폴더에 쓴다. 응답의 필드 목록을 계약 타입과 맞대 본다.
   - 45개를 만들고(updated_at 이 같은 것을 섞어) limit 20으로 끝까지 읽으면 겹침도 빠짐도 없고, 마지막 nextCursor 가 null.
     두 페이지 사이에 새 채팅을 만들어도 다음 페이지가 밀리지 않는다. 깨진 커서는 400 invalid_request.
   - ?pinned=true 는 고정한 것만 pinnedAt 내림차순이고, 기본 목록에는 고정한 것이 없다.
   - 만들기 201, title 은 선택. 하나 읽기 200.
   - 이름 변경: "  a   b  " 는 "a b". 공백뿐이거나 121자는 400. updatedAt 이 바뀌지 않는다.
   - 고정: pinnedAt 은 서버 시각, 이미 고정이면 그대로, false 면 null. updatedAt 이 바뀌지 않는다. 21번째는 409 too_many_pins.
   - 삭제 204, 그 뒤 하나 읽기 404, 문서 파일도 없다. 두 번째 삭제는 404.
   - 다른 사용자의 채팅은 GET, PATCH, DELETE 모두 404 chat_not_found 이고, 형식이 틀린 id 도 404다(DOM-3).
   - 응답의 ChatSummary 에 계약에 없는 필드(userId, messageCount 의 원본 열 이름 등)가 없다(DOM-7).
   - 삭제 순서: 저장소 호출을 기록하는 감싸개로 RDB 삭제가 문서 삭제보다 먼저인지 본다(DOM-2).
   돌려서 실패하는 출력을 보인다.
2. 구현
   - domain/chats.ts: list, pinned, create, get, rename(공백 정리), setPinned, remove. UniqueViolation, TooManyPins 를 DomainError 로 바꾼다.
     remove 는 진행 중인 답변을 멈추는 자리를 둔다(10단계의 answering 이 채운다. 지금은 없는 것으로 친다).
   - domain/mappers.ts: toChatSummary(행, answering). 시각을 ISO로. answering 은 지금 false.
   - 커서: { u, i } JSON 을 base64url 로. 해석이 실패하면 invalid_request.
   - http/routes/chats.ts: 4.4절의 경로. 입력은 validate.ts 의 함수로 검증하고 domain 하나를 부른다(HTTP-1, HTTP-9).
   - scripts/seed.ts: 데모 사용자에게 채팅 45개를 여러 날에 걸쳐 만들고(오늘, 어제, 지난 7일, 지난 30일, 그 전), 2개를 고정한다.
3. 확인: bun run check.
4. 작게 커밋한다.
```

## 프롬프트 2. 웹

```text
앞 프롬프트에 이어 09 채팅 목록의 웹 쪽을 같은 브랜치에서 한다. AGENTS.md와 고칠 폴더의 POLICY.md 규칙은 그대로다.
DESIGN 3.1절, 3.2절의 F-LIST, F-RENAME, F-DELETE, F-PIN, 3.3절, 7.1절, 7.3절, 9.11절, 9.12절을 읽는다.

1. 테스트 먼저
   - 모듈(state/chat-list-rules.test.ts): 페이지 합치기는 id 로 중복을 없앤다. 고정하면 기본 목록에서 빼 고정 목록 맨 앞에 넣고, 풀면 그 반대다.
     요약 반영(applySummary)은 기본 목록이면 맨 위로 옮기고, 고정 목록이면 자리를 지킨다. 목록의 제목이 있으면 이벤트의 제목으로 덮지 않는다.
     날짜 그룹은 지역 자정 기준이다. 고정한 시각으로 자정 직전과 직후를 본다.
   - e2e(components/shell/chat-list.e2e.ts 등). 모두 asUser fixture 로 새 사용자다. 데이터는 api 도우미로 만든다.
     F-LIST-1: 45개를 만들면 스크롤로 모두 보이고 겹치거나 빠지지 않는다. /api/chats 의 두 번째 페이지를 page.route 로 실패시키면
       "Couldn't load more" 와 Retry 가 보이고, 3초 동안 같은 요청이 다시 가지 않는다(요청 수를 센다).
       첫 페이지 응답을 route.fetch() 로 붙잡아 둔 사이에 api 로 채팅을 만들고 응답을 놓아도 그 채팅이 목록에 남는다.
     F-LIST-2: page.clock 으로 자정을 넘기면 Today 의 채팅이 Yesterday 로 옮겨 간다.
     F-LIST-3: 고정하면 Pinned 로 가고 새로고침해도 남는다. 새 브라우저 컨텍스트에서 같은 사용자를 골라도 보인다.
       Pinned 행도 같은 chat-row 부품이다. 고정한 채팅의 이름을 바꾸면 Pinned 행에 바로 나온다.
     F-LIST-4: 보고 있는 채팅이 강조된다. 제목이 없으면 "New chat".
     F-LIST-5: 행 메뉴 버튼이 링크 안에 있지 않다. 창 높이 800, 600, 480에서 맨 위와 맨 아래 행의 메뉴가 화면 안에 있다.
       맨 위와 맨 아래 행은 이 테스트가 만든 채팅으로 정한다. 400에서는 잘리는 px을 재서 docs/test-plan.md 에 적는다.
       메뉴를 열기 전과 닫은 뒤 목록의 스크롤 위치가 같다. 세 엔진에서 본다.
     F-RENAME-1: Enter 저장, Esc 취소, 비우면 취소, 120자에서 더 들어가지 않는다. 조합 중 Enter 는 저장하지 않는다.
       PATCH 를 page.route 로 실패시키면 이전 이름으로 돌아오고 토스트가 보인다.
     F-DELETE-1: 확인 다이얼로그를 거친다. 보고 있던 채팅을 지우면 홈으로 가고, 지우는 동안 프레임마다 화면을 보는 관찰자를 두어
       찾을 수 없음 화면이 한 번도 그려지지 않았는지 본다. DELETE 가 404여도 목록에서 빠지고 오류 토스트가 없다.
       DELETE 응답을 붙잡아 둔 사이에 다른 채팅으로 옮기면, 응답을 놓은 뒤에도 그 채팅에 머문다(행 메뉴와 머리글 메뉴 둘 다).
     붙잡은 요청은 테스트 끝에 모두 끊는다(DESIGN 11.2절).
     F-PIN-1: 21번째 고정은 토스트로 알린다.
     F-USER-3: 사용자 A로 채팅을 만들고 사용자 메뉴의 Switch user 로 B를 고른다. 고른 때부터 목록이 그려질 때까지 프레임마다 사이드바의 제목을 기록해
       A의 제목이 한 번도 없었는지 본다.
   돌려서 실패하는 출력을 보인다.
2. 구현
   - api/chats.ts: list, pinned, create, get, update, remove.
   - state/chat-list-rules.ts: 위 규칙을 순수 함수로(STATE-12).
   - state/chat-list.tsx: ChatListProvider, useChatList. 고정 목록과 페이지, loadMore(실패하면 멈춘다), rename, setPinned, remove(404는 성공),
     applySummary. 낙관적으로 바꾸고 실패하면 되돌린다. app.tsx 에서 key={user.id} 로 둔다(STATE-11).
   - lib/use-in-view.ts, use-load-more.ts, use-local-day.ts(자정과 숨긴 탭이 다시 보일 때 다시 계산).
   - components/shell/chat-list.tsx, chat-row.tsx(memo, COMP-6): 그룹, 강조, Retry, 빈 목록, 첫 읽기 스켈레톤.
   - components/chat/chat-menu.tsx(행과 헤더가 함께 쓴다), chat-name-input.tsx(COMP-8), chat-screen.tsx(헤더의 제목과 메뉴만. 메시지는 10단계).
   - 삭제: 보고 있던 채팅이면 먼저 홈으로 이동한 뒤 목록에서 뺀다. 이동은 컴포넌트가 하고 state 는 주소를 모른다(STATE-7).
     목록과 다른 state 를 함께 바꾸는 일은 기능 훅 하나에 둔다(STATE-9). 초안 지우기는 10단계에서 이 훅에 더한다.
   - 메뉴의 위아래 방향은 가장 가까운 스크롤 영역에서 쓸 수 있는 공간으로 정한다.
     펼칠 높이는 그리기 전에 잰 실제 높이로 정한다. 포탈은 잰 필요가 있을 때만 쓴다.
   - 삭제 기능 훅은 화면이 넘긴 leave 를 순서의 그 자리에서 부르고, leave 는 불리는 순간의 주소로 판단한다(STATE-7).
     목록 갱신은 함수형으로 하고, 서버 응답은 목록을 덮지 않고 합친다(STATE-13).
3. 확인: bun run check, 위 e2e 를 세 엔진에서, bun run test:smoke.
4. components/POLICY.md 와 state/POLICY.md 의 "예"를 이 단계의 파일로 채운다.
   변이 확인: 메뉴 방향 계산, 첫 페이지 합치기, leave 판단을 하나씩 일부러 틀리게 바꿔 해당 테스트가 실패하는지 보고 되돌린다.
   바꾸기 전에 백업하고, 되돌린 뒤 cmp 로 원본과 같은지 보인다.
5. 작게 커밋한다.
```

## 화면 점검

기능의 확인이 끝난 뒤, 검토 프롬프트 전에 한다. 틀은 [README 6.12절](README.md#612-화면-점검), 기준은 [DESIGN 3.7절](../docs/DESIGN.md#37-화면-품질)이다.

```text
이 단계의 화면 점검을 한다. 기준은 docs/DESIGN.md 3.7절이다. 앱 코드는 고치지 않는다.
1. SCREENS_STAGE=09 bun run test:screens 를 돌려 docs/evidence/ui/09/ 에 캡처를 남긴다.
   이 단계에서 생긴 화면과 상태가 @screens 에 없으면 먼저 더한다.
2. 처음 쓰는 사람의 눈으로 흐름을 따라간다: 채팅 45개 목록을 스크롤하기, 고정과 해제, 120자 이름으로 바꾸기, 지우기 확인, 낮은 창(480)에서 맨 위와 맨 아래 행의 메뉴.
   밝은 테마와 어두운 테마, 창 1280x800, 1024x700, 1280x480.
3. docs/evidence/ui/09/CHECK.md 를 만든다. UX-1부터 UX-10까지 행마다 캡처 파일, 본 것,
   판정(맞음, 고칠 것, 사람이 볼 것)을 쓰고, 끝에 사람이 체크할 빈 칸을 둔다.
4. 같은 상황의 안내 문구를 표로 모은다(UX-7).
5. 일반 AI 에이전트 웹앱과 다르게 한 곳은 docs/evidence/ui/compare.md 에 이유와 함께 적는다(UX-2).
   일반 AI 에이전트 웹앱의 화면은 사람이 직접 찍어 docs/evidence/ui/reference/ 에 넣은 것만 쓴다.
6. "고칠 것"을 목록으로 보이고 멈춘다. 이 단계에서 고칠지 15단계로 넘길지는 내가 정한다.
```

**사람** 캡처를 열어 보고 `CHECK.md`의 빈 칸에 체크한다. 캡처로 모자라면 앱을 띄워 위 흐름을 직접 써 본다. 체크하지 않은 단계는 반영하지 않는다(UX-10).

## 막히면

- **사용자를 바꾼 뒤 앞 사용자의 목록이 잠깐 보인다.** `ChatListProvider`에 `key={user.id}`가 있는지, 사용자 바꾸기가 Provider를 내리는지 본다.
- **사이드바 스크롤이 행이 옮겨질 때 튄다.** 11단계에서 본다. 이 단계에서는 목록 순서가 답변으로 바뀌지 않는다.
- **메뉴가 창 높이 480에서 잘린다.** 창 높이가 아니라 스크롤로 확보할 수 있는 공간을 세는지 본다.
