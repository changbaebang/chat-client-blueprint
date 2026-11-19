# 07. 문서 저장소 (NoSQL)

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/07-document-store` |
| 선행 | 06 |
| 읽을 문서 | [DESIGN 5.3절 문서 형태](../docs/DESIGN.md#53-문서-형태), [5.4절](../docs/DESIGN.md#54-연산별-쓰기-순서), [5.5절 어긋났을 때 맞추기](../docs/DESIGN.md#55-어긋났을-때-맞추기), [5.6절](../docs/DESIGN.md#56-왜-하나로-하지-않는가), [5.7절 Windows와 파일 저장](../docs/DESIGN.md#57-windows와-파일-저장), [9.6절](../docs/DESIGN.md#96-serverstore), [11.4절](../docs/DESIGN.md#114-e2e-서버와-데이터) |
| 고칠 폴더 | `server/store/docs`, `domain/ports.ts`, `domain/recovery.ts`, `server/plugin.ts`, `scripts/check-data.ts`, `e2e/global-teardown.ts`, `playwright.config.ts` |
| 쓸 스킬 | (설치하면) `side-effect-check` |

## 이 단계가 끝나면

- [ ] 채팅 하나가 JSON 문서 하나다. 모양이 DESIGN 5.3절과 같고, 읽을 때 검사 함수로 확인한다.
- [ ] 쓰기는 임시 파일, `sync`, 이름 바꾸기다. `EPERM`, `EACCES`, `EBUSY`면 다시 한다.
- [ ] 같은 문서의 읽기와 쓰기가 문서 잠금을 거친다. 동시에 100번 붙여도 100개가 남는다.
- [ ] `schemaVersion`을 읽을 때 올리고, `version` 조건부 쓰기가 다른 버전을 거절한다.
- [ ] `domain/recovery.ts`가 5.5절의 어긋남 다섯 가지를 찾고 고친다. 서버가 시작할 때 돈다.
- [ ] `bun run data:check`가 보고만 하고, `--fix`면 고친다. 어긋남이 있는데 `--fix`가 없으면 종료 코드 1이다.
- [ ] e2e가 끝나면 워커마다 `data:check`가 돈다.
- [ ] `store/POLICY.md`에 DOC 규칙이 더해졌고, 사람이 정책 전체를 승인했다.

## 순서

1. **입력** 프롬프트 1.
2. **확인**

   ```powershell
   bun run check
   bun test server/store/docs server/domain/recovery
   bun run data:check
   bun run test:smoke
   ```

3. **직접 확인** 테스트 출력에서 Windows 전용 테스트("대상 파일을 열어 둔 채 쓴다")가 돌았는지, 건너뛰었는지 본다. 건너뛰었으면 이유를 보고하게 한다.
4. **검토 지점**
   - `atomic-write.ts`: 임시 파일 이름이 같은 폴더에 있는지(다른 드라이브면 이름 바꾸기가 원자적이지 않다), 실패하면 임시 파일을 지우는지, 다시 시도하는 오류 코드가 셋뿐인지.
   - `chat-documents.ts`: 모든 읽기와 쓰기가 문서 잠금 안에 있는지. 잠금을 쥔 채 다른 문서의 잠금을 잡지 않는지.
   - `recovery.ts`: 5.4절의 원칙(존재는 RDB, 내용은 문서)대로 고치는지. `ownerId`가 다르면 고치지 않고 보고만 하는지.
   - `store/POLICY.md`를 승인한다.
5. **입력** 검토 프롬프트. 절은 "5.3~5.7절, 9.6절, 11.4절".
6. **입력** 반영 프롬프트.

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 07 문서 저장소. 브랜치 stage/07-document-store 를 main에서 만든다.
DESIGN 5.3~5.7절, 9.6절, 11.4절을 읽는다. 채팅 내용(메시지)을 채팅마다 JSON 문서 하나에 둔다.

1. 정책: store/POLICY.md 에 DOC-1~DOC-6 을 더한다. 상태는 "작성 중" 그대로.
2. 포트: domain/ports.ts 에 ChatDocs 를 더한다. 모두 Promise.
   read(chatId) 는 문서나 null. append(chatId, ownerId, messages, expectedVersion) 는 문서가 없으면 만들고 붙인다.
   update(chatId, expectedVersion, mutate) 는 mutate 가 돌려준 문서를 쓴다. remove(chatId). allIds().
   문서 타입(ChatDocument)은 store/docs/document-schema.ts 에 두고 ports 는 그 타입을 다시 내보낸다.
3. 테스트 먼저(store/docs/*.test.ts, domain/recovery.test.ts). 테스트마다 임시 폴더.
   - DOC-1: "../x", "cht_ABC", 빈 문자열 같은 id 는 파일 시스템에 닿기 전에 거절된다. fs 호출을 세어 0인지 본다.
   - DOC-2: 이름 바꾸기를 대신하는 함수를 주입해 EPERM 을 두 번 낸 뒤 성공시키면 쓰기가 성공하고 store.retry 로그가 두 줄이다.
     다섯 번 모두 실패하면 던지고 임시 파일이 남지 않는다.
     Windows에서만(test.skipIf(process.platform !== 'win32')): 대상 파일을 fs.open 으로 연 채 쓰기를 시작하고 50ms 뒤 닫으면 쓰기가 성공한다.
   - DOC-3: 같은 문서에 append 100번을 동시에 하면 메시지 100개가 모두 남는다. 잠금을 빼면 이 테스트가 실패하는 것을 한 번 보고 되돌린다.
   - DOC-4: schemaVersion 0 인 옛 문서 고정 파일(테스트용으로 만든다)을 읽으면 1로 올라온 모양이다. 다음 쓰기에서 1로 저장된다.
   - DOC-5: 다른 expectedVersion 으로 update 하면 ConflictError, 파일은 그대로다.
   - DOC-6: 깨진 JSON 은 CorruptDocument 로 던지고 파일을 지우지 않는다.
   - 열 때 남은 *.tmp 를 지운다.
   - recovery: 진짜 RDB(06단계)와 진짜 문서 저장소로 다섯 경우를 만든다.
     streaming 이 남은 문서(글이 있음, 없음), 고아 문서, ownerId 가 다른 문서, 요약이 다른 행, 남은 임시 파일.
     report 모드는 아무것도 바꾸지 않고 다섯 가지를 보고한다. fix 모드는 5.5절의 표대로 고치고, ownerId 는 보고만 한다.
     고친 것마다 recovery.fixed 로그.
   돌려서 실패하는 출력을 보인다.
4. 구현
   - document-schema.ts: 5.3절의 문서 타입, 그 모양을 확인하는 검사 함수(라이브러리 없이), schemaVersion 1, 버전마다 올리는 함수 하나(upgrades[0] 은 0에서 1로).
   - atomic-write.ts: 같은 폴더의 <chatId>.json.<랜덤>.tmp 에 쓰고 filehandle.sync() 뒤 이름 바꾸기.
     EPERM, EACCES, EBUSY 이면 10, 20, 40, 80, 160ms 간격으로 다시(lib/retry.ts). 실패하면 임시 파일을 지우고 던진다.
   - chat-documents.ts: openChatDocs(dir). 문서마다 lib/mutex.ts 의 잠금. 읽기도 잠금 안에서 한다.
     쓰기는 읽은 version 과 expectedVersion 을 비교하고 version+1 로 쓴다. 메시지 400개를 넘는 append 는 ChatTooLong.
   - domain/recovery.ts: findIssues(ports) 와 fixIssues(ports, issues). ports 로만 저장소에 닿는다(DOM-1).
   - plugin.ts: 시작할 때 RDB와 문서 저장소를 열고 recovery 를 fix 모드로 돌린 뒤 처리기를 단다(DESIGN 6.4절).
     /api/ready 가 RDB의 SELECT 1 과 문서 폴더 쓰기를 본다.
   - scripts/check-data.ts: --data-dir 로 폴더를 받는다(기본은 설정의 DATA_DIR). --fix 가 없으면 보고만 하고, 어긋남이 있으면 종료 코드 1.
   - e2e/global-teardown.ts: .e2e-data/w* 마다 check-data 를 보고 모드로 돌린다. 하나라도 종료 코드 1이면 던진다.
     playwright.config.ts 에 globalTeardown 으로 단다.
5. 확인: bun run check, bun run test:smoke(끝에 teardown 이 돈 줄이 보여야 한다), bun run data:check.
6. docs/DECISIONS.md 의 ADR-004, 005, 006 에 이 단계에서 확인한 것을 한 줄씩 더한다(예: Windows 잠금 테스트를 돌렸는지).
7. 작게 커밋한다.
```

## 막히면

- **잠금이 있는데도 동시 append에서 메시지를 잃는다.** 읽기와 쓰기가 같은 잠금 안에 있는지 본다. 읽기만 잠금 밖에 있으면 둘이 같은 옛 문서를 읽고 각자 쓴다.
- **Windows 전용 테스트가 다섯 번 다시 해도 실패한다.** 테스트가 50ms 뒤에 정말 핸들을 닫는지 본다. 다시 시도의 총 시간은 약 310ms다. 닫는 시각이 그 뒤면 실패가 맞다.
- **백신이 임시 파일을 오래 잡는다.** `store.retry` 로그의 횟수를 보고하게 한다. 자주 나면 간격을 늘릴지 사람이 정하고 ADR을 남긴다.
