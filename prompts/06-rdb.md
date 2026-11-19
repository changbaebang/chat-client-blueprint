# 06. 관계형 저장소 (RDB)

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/06-rdb` |
| 선행 | 05 |
| 읽을 문서 | [DESIGN 5.1절](../docs/DESIGN.md#51-어디에-무엇을-두는가), [5.2절 RDB 스키마](../docs/DESIGN.md#52-rdb-스키마), [5.4절](../docs/DESIGN.md#54-연산별-쓰기-순서), [5.8절](../docs/DESIGN.md#58-운영으로-옮길-때), [9.6절](../docs/DESIGN.md#96-serverstore) |
| 고칠 폴더 | `server/store/rdb`, `domain/ports.ts`, `scripts/reset.ts` |
| 쓸 스킬 | (설치하면) `side-effect-check`, `typescript-review` |

## 이 단계가 끝나면

- [ ] `store/rdb`에 연결, 마이그레이션, 사용자, 채팅 목록 저장소가 있다.
- [ ] 스키마가 DESIGN 5.2절과 같다. `STRICT`, 외래 키, 부분 인덱스 둘.
- [ ] 목록 쿼리가 행 값 비교를 쓰고, 테스트가 `EXPLAIN QUERY PLAN`으로 인덱스 범위를 쓰는 것을 본다(RDB-3).
- [ ] 고유 제약 위반이 `UniqueViolation`으로 바뀐다. 고정 21번째가 거절된다. 사용자를 지우면 그 채팅이 사라진다.
- [ ] `domain/ports.ts`의 저장소 포트가 처음부터 `Promise`를 돌려준다(DESIGN 5.8절).
- [ ] `store/POLICY.md`에 STORE와 RDB 규칙이 있다. 상태는 "작성 중"이다(07단계에서 DOC 규칙을 더하고 승인).

## 순서

1. **입력** 프롬프트 1.
2. **확인**

   ```powershell
   bun run check
   bun test server/store/rdb
   ```

3. **검토 지점**
   - `migrations.ts`의 SQL을 DESIGN 5.2절과 한 줄씩 맞대 본다.
   - `chats.ts`의 페이지 쿼리를 읽는다. `pinned_at IS NULL`이 `WHERE`에 있는지(부분 인덱스), 행 값 비교인지, `LIMIT`을 하나 더 받는지.
   - `writeSummary`가 `message_count`를 `+1`이 아니라 넘겨받은 절대값으로 쓰는지, 제목을 `COALESCE`로 쓰는지.
4. **입력** 검토 프롬프트. 절은 "5.1, 5.2, 5.4, 5.8, 9.6절".
5. **입력** 반영 프롬프트.

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 06 관계형 저장소. 브랜치 stage/06-rdb 를 main에서 만든다.
DESIGN 5.1, 5.2, 5.4, 5.8, 9.6절을 읽는다. 사용자와 채팅 목록을 SQLite(node:sqlite)에 둔다. 메시지는 07단계의 문서 저장소다.

1. 정책 먼저: server/store/POLICY.md 를 만든다. 상태 "작성 중". 이 단계에서는 STORE와 RDB 규칙만 쓴다.
   첫 절에 DESIGN 5.1절의 표를 링크하고, "어느 데이터가 어디에 있는가"를 이 정책의 중심으로 둔다.
2. 포트: domain/ports.ts 에 UserRepo, ChatRepo 를 더한다. 모든 메서드가 Promise 를 돌려준다.
   SQLite가 동기여도 그렇게 한다. 저장소를 PostgreSQL로 바꿔도 domain이 바뀌지 않게 하려는 것이다(DESIGN 5.8절).
   ChatRepo: page(userId, limit, cursor), pinned(userId), get(userId, chatId), create, rename, setPinned(최대 수 검사 포함),
   writeSummary(chatId, { updatedAt, messageCount, autoTitle }), delete, allIds(). 시각은 epoch 밀리초 정수다(RDB-6).
3. 테스트 먼저(store/rdb/*.test.ts). 각 테스트는 임시 폴더의 새 DB 파일을 쓴다.
   - 마이그레이션: 빈 DB가 user_version 1이 된다. 두 번 열어도 그대로다. 열 때 foreign_keys 가 켜져 있다.
   - 사용자: 같은 이름(대소문자만 다른 것 포함)의 두 번째 INSERT 가 UniqueViolation 이다(SQLite errcode 2067).
   - 연쇄 삭제: 사용자를 지우면 그 채팅이 사라진다. 코드로 자식 행을 지우지 않는다(RDB-5).
   - 페이지: 45개를 만들되 updated_at 이 같은 것을 섞는다. 20개씩 읽으면 겹침도 빠짐도 없다.
     두 페이지 사이에 새 채팅을 맨 앞에 넣어도 다음 페이지가 밀리지 않는다.
   - 실행 계획: 다음 페이지 쿼리의 EXPLAIN QUERY PLAN 에 "chats_recent" 와 "(updated_at,id)<" 가 있다.
     고정 목록 쿼리에는 "chats_pinned" 가 있다(RDB-3).
   - 고정: 20개까지 되고 21번째는 TooManyPins 다. 고정도 이름 변경도 updated_at 을 바꾸지 않는다. 이미 고정이면 pinned_at 이 그대로다.
   - 요약: writeSummary 를 같은 값으로 두 번 불러도 결과가 같다. 제목이 있으면 autoTitle 이 덮지 않는다.
   - 남의 채팅: get, rename, setPinned, delete 에 다른 userId 를 주면 null 이나 false 다. 이 판단의 오류 변환은 domain 몫이다.
   돌려서 실패하는 출력을 보인다.
4. 구현
   - database.ts: openDatabase(path). PRAGMA journal_mode WAL, foreign_keys ON, busy_timeout 5000, synchronous NORMAL.
     tx(fn, { immediate }) 도우미. 닫기. node:sqlite 의 ExperimentalWarning 이 나오면 그대로 두고 보고만 한다.
   - migrations.ts: DESIGN 5.2절의 SQL을 첫 마이그레이션으로. user_version 으로 적용하고 하나씩 트랜잭션.
   - users.ts, chats.ts: 준비문과 바인딩만(RDB-2). 페이지는 LIMIT 을 하나 더 받아 다음이 있는지 안다.
     setPinned 는 BEGIN IMMEDIATE 안에서 세고 바꾼다(RDB-4).
   - 오류: UniqueViolation, TooManyPins 를 store/rdb 에 둔다(STORE-3). domain 이 이 이름으로 DomainError 를 고른다.
   - scripts/reset.ts: --yes 가 있어야 데이터 폴더를 지운다. 없으면 지울 경로만 보이고 끝낸다.
5. 확인: bun run check. 그리고 domain 의 임시 파일에서 store/rdb 를 가져오면 bun run check:imports 가 DOM-1로 잡는지 보고 지운다.
6. 작게 커밋한다.
```

## 막히면

- **행 값 비교가 인덱스를 안 쓴다고 나온다.** `WHERE`에 `pinned_at IS NULL`이 빠졌는지 본다. 2026-11-18에 SQLite 3.51.3에서 잰 결과, 이 조건이 있으면 `SEARCH chats USING INDEX chats_recent (user_id=? AND (updated_at,id)<(?,?))`가 나왔다. OR 형태는 `(user_id=?)`만 나왔다.
- **`ExperimentalWarning`이 테스트 출력을 더럽힌다.** Bun 버전과 함께 `docs/TASKS.md`에 적는다. 숨기는 플래그는 사람이 정한다.
- **`database is locked`.** 테스트가 같은 DB 파일을 나눠 쓰는지 본다. 테스트마다 임시 폴더를 쓴다.
