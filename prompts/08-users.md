# 08. 사용자

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/08-users` |
| 선행 | 04, 07 |
| 읽을 문서 | [DESIGN 3.2절의 F-USER](../docs/DESIGN.md#f-user-사용자-고르기), [4.3절 사용자](../docs/DESIGN.md#43-사용자), [7.1절 상태](../docs/DESIGN.md#71-상태), [9.9절](../docs/DESIGN.md#99-srcapi), [9.11절](../docs/DESIGN.md#911-srcstate), [11.2절](../docs/DESIGN.md#112-작성-규칙), [13장 보안](../docs/DESIGN.md#13-보안) |
| 고칠 폴더 | 서버: `store/rdb/users.ts`, `domain/users.ts`, `http/guards.ts`, `http/routes/users.ts`, `scripts/seed.ts`. 웹: `api/client.ts`, `api/users.ts`, `state/user.tsx`, `components/user`, `components/shell/user-menu.tsx`, `styles/user.css`, `app.tsx`. `e2e/fixtures.ts` |
| 쓸 스킬 | (설치하면) `api-contract-check`, `react-review` |

로그인은 없다(DESIGN ADR-007). 사용자를 고르거나 만들면 그 id를 요청 머리 `X-User-Id`로 보낸다. 이 단계가 보이려는 것은 보안이 아니라, 사용자가 RDB의 행이고 채팅 목록이 그 행을 참조한다는 것이다.

## 이 단계가 끝나면

- [ ] `GET /api/users`, `POST /api/users`, `GET /api/users/me`가 DESIGN 4.3절대로 동작한다. 같은 이름(대소문자만 다른 것 포함)은 409 `name_taken`이다.
- [ ] `X-User-Id`가 없거나 모르는 id면 `/api/users/me`와 모든 `/api/chats` 경로가 401 `user_required`다.
- [ ] 로그에 본문이 없다(HTTP-6).
- [ ] 웹: 사용자가 없으면 고르기 화면, 고르면 원래 주소로, 401이 나면 `?next=`를 붙여 고르기 화면으로 간다. 사용자 메뉴에 이름과 Switch user가 있다.
- [ ] `e2e/fixtures.ts`의 `asUser` fixture가 테스트마다 새 사용자를 만든다.
- [ ] `bun run data:seed`가 데모 사용자(Demo)를 만든다.
- [ ] 웹의 `api`, `state` `POLICY.md`가 있고, 사람이 승인했다.
- [ ] `@screens`에 사용자 고르기 화면과 사용자 메뉴가 있고, `docs/evidence/ui/08/`의 캡처와 `CHECK.md`를 사람이 보고 체크했다(화면 점검).

## 순서

1. **입력** 프롬프트 1(서버). 보고를 읽는다.
2. **확인**

   ```powershell
   bun run check
   bun test server/http
   ```

3. **입력** 프롬프트 2(웹).
4. **확인**

   ```powershell
   bun run check
   bun --bun playwright test src/components/user
   bun run data:seed
   bun run dev
   ```

   http://localhost:5173 에서 Demo를 고르고, 사용자 메뉴로 바꾸고, 새 이름으로 사용자를 만들어 본다.
   **화면 점검** 아래 "화면 점검" 절.

5. **검토 지점**
   - `http/guards.ts`: 사용자를 찾는 곳이 하나인지, 사용자가 필요한 경로가 모두 그 뒤에 있는지(HTTP-3). 로그인을 붙인다면 바뀔 곳이 여기 하나인지(DESIGN 5.8절).
   - `store/rdb/users.ts`: 고유 제약 위반을 `name_taken`으로 바꾸는 길(5.4절). 이름 비교를 코드가 아니라 `COLLATE NOCASE`의 고유 제약이 하는지.
   - `state/user.tsx`: 401 알림을 받으면 고르기 화면으로 가는 길이 하나인지(API-4).
   - 웹의 `api`, `state` `POLICY.md`를 승인한다.
6. **입력** 검토 프롬프트. 절은 "3.2절 F-USER, 4.3절, 7.1절, 9.9절, 9.11절, 13장".
7. **입력** 반영 프롬프트.

## 프롬프트 1. 서버

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 08 사용자의 서버 쪽. 브랜치 stage/08-users 를 main에서 만든다.
DESIGN 3.2절의 F-USER, 3.6절, 4.3절, 5.2절, 5.4절, 6.1절, 13장을 읽는다. 로그인, 비밀번호, 쿠키는 만들지 않는다(ADR-007).

1. 테스트 먼저(server/http/routes/users.test.ts, domain/users.test.ts).
   createApi 를 node:http 서버에 붙여 포트 0에 띄우고, 진짜 RDB와 문서 저장소를 임시 폴더에 쓴다. 응답의 필드 목록을 shared/contract.ts 의 타입과 맞대 본다.
   - POST /api/users 는 201 과 { user }. 이름의 앞뒤 공백을 지운다. 빈 이름과 41자는 400 invalid_request.
   - 같은 이름(대소문자만 다른 것 포함)의 두 번째는 409 name_taken. 동시에 둘을 보내도 하나만 201 이다(고유 제약이 막는다).
   - GET /api/users 는 만든 순의 목록이다.
   - GET /api/users/me 는 X-User-Id 가 맞으면 200 { user }. 없거나, 형식이 틀리거나, 없는 id면 401 user_required.
   - X-User-Id 없이, 또 없는 id로 GET /api/chats, POST /api/chats, GET /api/chats/cht_aaaaaaaaaaaaaaaaaaaa 가 모두 401 이다(HTTP-3).
   - 로그 출력에 보낸 본문이 없다(HTTP-6).
   돌려서 실패하는 출력을 보인다.
2. 구현
   - store/rdb/users.ts: create, list, findById. 고유 제약 위반(errcode 2067)을 UniqueViolation 으로 바꾼다.
   - domain/users.ts: createUser(이름 다듬기와 검증, UniqueViolation 을 name_taken 으로), listUsers, currentUser.
   - http/guards.ts 에 사용자 판별(X-User-Id 를 id 형식으로 검사하고 RDB에서 찾아 요청의 사용자로 둔다)과 사용자 필요 검사.
     /api/users/me 와 /api/chats 아래 전체를 requireUser 뒤에 둔다. 채팅 경로는 09단계에서 채운다.
   - http/routes/users.ts.
   - scripts/seed.ts: 이름이 Demo 인 사용자. 이미 있으면 건너뛴다. 채팅은 09단계와 10단계에서 seed 에 더한다.
3. 확인: bun run check, bun test server.
4. 작게 커밋한다.
```

## 프롬프트 2. 웹

```text
앞 프롬프트에 이어 08 사용자의 웹 쪽을 같은 브랜치에서 한다. AGENTS.md와 고칠 폴더의 POLICY.md 규칙은 그대로다.
DESIGN 3.1절, 3.2절의 F-USER, 3.3절, 7.1절, 9.9절, 9.11절, 9.12절, 11.2절을 읽는다.

1. 정책 먼저: src/api/POLICY.md, state/POLICY.md 를 DESIGN 9.1절의 형식으로 만든다. 상태 "작성 중".
2. 테스트 먼저
   - 모듈(api/client.test.ts): fetch 를 대체해 request() 가 지금 사용자의 X-User-Id 머리를 붙이는지, 실패 본문을 ApiError(status, code, message)로 바꾸는지,
     401이면 onUnauthorized 를 한 번 부르는지, 본문 없는 204 를 다루는지 본다.
   - e2e/fixtures.ts: asUser fixture. 워커 번호와 시각과 순번으로 고유 이름을 만들고 POST /api/users 로 사용자를 만든다.
     그 id를 컨텍스트의 storageState 로 localStorage 의 chat:user 에 넣는다. addInitScript 로 넣으면 탐색할 때마다 되돌아가서
     사용자를 바꾸는 테스트가 깨진다. 테스트에 user(id, 이름)와 api 도우미를 준다.
     api 도우미는 X-User-Id 머리를 붙여 계약의 경로를 부른다(09단계부터 채팅 만들기를 더한다).
   - e2e(components/user/*.e2e.ts): F-USER-1, F-USER-2, F-USER-4.
     새 이름으로 만들면 홈과 사용자 메뉴에 그 이름이 보인다. 같은 이름으로 다시 만들면 "That name is taken".
     새로고침해도 같은 사용자다. 새 브라우저 컨텍스트는 고르기 화면에서 시작한다. 고른 채 /users 에 가면 / 로 간다.
     저장된 id를 없는 id로 바꾸고 /chats/cht_aaaaaaaaaaaaaaaaaaaa 를 열면 고르기 화면이고 주소에 next 가 있다. 고르면 그 주소로 돌아간다.
     F-USER-3의 "앞 사용자의 채팅이 보이지 않는다"는 09단계에서 쓴다.
   - @screens(src/screens.e2e.ts 에 더한다): 사용자 고르기 화면(사용자 목록, 같은 이름 오류)과 사용자 메뉴를 찍는다.
   돌려서 실패하는 출력을 보인다.
3. 구현
   - api/client.ts: request(path, { method, body, signal }). JSON, X-User-Id 머리, ApiError, onUnauthorized 구독(API-4).
     api/users.ts: list, create, me.
   - state/user.tsx: UserProvider, useUser. status 는 loading, none, chosen. 저장된 id가 있으면 시작할 때 me 를 한 번 부르고,
     네트워크 실패면 한 번 다시 부른다(3.3절). onUnauthorized 를 받으면 none 이 되고 저장된 id를 지운다.
     주소를 바꾸지 않는다(STATE-7). 이동은 components 가 한다.
   - components/user/user-gate.tsx: 사용자가 없으면 user-picker 를 그리고 next 를 다룬다.
     user-picker.tsx: 있는 사용자 목록과 새 이름 입력. 입력의 Enter 는 조합 중을 거른다(COMP-8). 실패 문구는 이 파일에 둔다.
   - components/shell/user-menu.tsx: 이름과 Switch user. 사이드바 맨 아래.
   - app.tsx: DESIGN 7.1절의 Provider 순서 중 UserProvider, ToastProvider, UserGate 까지. 채팅 Provider 는 09단계와 10단계에서 더한다.
   - styles/user.css.
4. 확인: bun run check, 위 e2e 를 세 엔진에서, bun run test:smoke.
5. 작게 커밋한다.
```

## 화면 점검

기능의 확인이 끝난 뒤, 검토 프롬프트 전에 한다. 틀은 [README 6.12절](README.md#612-화면-점검), 기준은 [DESIGN 3.7절](../docs/DESIGN.md#37-화면-품질)이다.

```text
이 단계의 화면 점검을 한다. 기준은 docs/DESIGN.md 3.7절이다. 앱 코드는 고치지 않는다.
1. SCREENS_STAGE=08 bun run test:screens 를 돌려 docs/evidence/ui/08/ 에 캡처를 남긴다.
   이 단계에서 생긴 화면과 상태가 @screens 에 없으면 먼저 더한다.
2. 처음 쓰는 사람의 눈으로 흐름을 따라간다: 처음 들어와 사용자 만들기, 같은 이름으로 만들기, 있는 사용자 고르기, 사용자 메뉴로 바꾸기, 모르는 사용자로 채팅 주소 열기.
   밝은 테마와 어두운 테마, 창 1280x800, 1024x700, 1280x480.
3. docs/evidence/ui/08/CHECK.md 를 만든다. UX-1부터 UX-10까지 행마다 캡처 파일, 본 것,
   판정(맞음, 고칠 것, 사람이 볼 것)을 쓰고, 끝에 사람이 체크할 빈 칸을 둔다.
4. 같은 상황의 안내 문구를 표로 모은다(UX-7).
5. 일반 AI 에이전트 웹앱과 다르게 한 곳은 docs/evidence/ui/compare.md 에 이유와 함께 적는다(UX-2).
   일반 AI 에이전트 웹앱의 화면은 사람이 직접 찍어 docs/evidence/ui/reference/ 에 넣은 것만 쓴다.
6. "고칠 것"을 목록으로 보이고 멈춘다. 이 단계에서 고칠지 15단계로 넘길지는 내가 정한다.
```

**사람** 캡처를 열어 보고 `CHECK.md`의 빈 칸에 체크한다. 캡처로 모자라면 앱을 띄워 위 흐름을 직접 써 본다. 체크하지 않은 단계는 반영하지 않는다(UX-10).

## 막히면

- **e2e에서 만든 사용자가 페이지에 없다.** `storageState`의 `origin`이 테스트 서버의 주소(워커마다 포트가 다르다)와 같은지 본다. 사용자를 만들 때 쓴 요청 컨텍스트는 상관없다. 쿠키가 없어 id만 넘기면 된다.
- **개발 서버에서 상태 변경 요청이 403이다.** API가 Vite 서버에 붙어 있어 출처는 늘 하나다. Origin 검사가 요청의 `Host`와 비교하는지 본다. 정해 둔 주소와 비교하면 `localhost`와 `127.0.0.1`이 다를 때 걸린다.
- **같은 이름이 대소문자만 달라 둘 생긴다.** `display_name`에 `COLLATE NOCASE`가 있는지 본다. 코드에서 소문자로 바꿔 미리 찾아보는 방식은 동시에 만들 때 둘 다 들어간다.
