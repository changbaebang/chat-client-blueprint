# 03. 계약

`docs/API.md`를 손으로 쓴 타입으로 옮긴다. 검증 라이브러리는 쓰지 않는다. 입력 검증은 05단계의 `server/http/validate.ts`가 한다.

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/03-contracts` |
| 선행 | 02 |
| 읽을 문서 | [DESIGN 3.6절 한도](../docs/DESIGN.md#36-한도), [4장 API 계약](../docs/DESIGN.md#4-api-계약), [9.3절](../docs/DESIGN.md#93-shared) |
| 고칠 폴더 | `shared`, `docs/API.md` |
| 쓸 스킬 | (설치하면) `typescript-review` |

## 이 단계가 끝나면

- [ ] `docs/API.md`가 DESIGN 4장에서 만들어졌다.
- [ ] `shared/contract.ts`에 4.2~4.6절의 타입이 모두 있다. `StreamEvent`는 `type`으로 가르는 유니온이다.
- [ ] `shared/errors.ts`에 4.7절의 오류 코드가, `shared/limits.ts`에 3.6절의 한도가 있다.
- [ ] `shared`는 아무것도 가져오지 않는다(CON-3). `check:imports`가 그것을 본다.
- [ ] `shared/POLICY.md`가 있고, 사람이 승인했다.

## 순서

1. **입력** 프롬프트 1.
2. **확인**

   ```powershell
   bun run check
   bun test shared
   ```

3. **검토 지점**
   - `docs/API.md`와 DESIGN 4장을 나란히 놓고 이벤트 표, 오류 코드 표, 엔드포인트 표가 같은지 본다.
   - `contract.ts`의 `StreamEvent`를 읽는다. 서버와 웹이 이것 하나로 이벤트를 다룬다.
   - `POLICY.md`를 읽고 승인하면 "승인"으로 바꾸고 `AGENTS.md` 9장의 상태 표도 바꾸게 한다.
4. **입력** 검토 프롬프트. 절은 "3.6절, 4장, 9.3절".
5. **입력** 반영 프롬프트.

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 03 계약. 브랜치 stage/03-contracts 를 main에서 만든다.
DESIGN 3.6절, 4장, 9.1절, 9.3절을 읽는다. 검증 라이브러리를 더하지 않는다.

1. docs/API.md 를 DESIGN 4장에서 만든다. 4장의 문장과 표를 옮기고, 4장에 없는 엔드포인트나 필드를 더하지 않는다.
2. shared/POLICY.md 를 DESIGN 9.1절의 형식과 9.3절의 규칙으로 만든다. 상태는 "작성 중".
3. 테스트 먼저(shared/*.test.ts)
   - errors: 4.7절 표의 코드가 모두 ERROR_CODES 에 있고, 중복이 없다. 표에 없는 코드도 없다.
   - limits: 3.6절의 값과 같다.
   돌려서 실패하는 출력을 보인다.
4. 구현
   - limits.ts: 3.6절의 상수. as const.
   - errors.ts: ERROR_CODES 배열(as const)과 ErrorCode 타입, ErrorBody 타입(fields 선택).
   - contract.ts: 4.2~4.6절의 타입. Timestamp, User, ChatSummary, Message, ChatPage, CreateUserInput, CreateChatInput,
     UpdateChatInput, SendMessageInput, StreamEvent(7개 이벤트의 유니온), CancelResult({ message: Message | null }),
     duplicate_message 의 본문(messageId). 주석에 4장의 뜻을 옮긴다(예: title 은 첫 메시지 전까지 null).
   - 세 파일 모두 아무것도 가져오지 않는다(CON-3). 같은 폴더 안의 타입 가져오기만 된다.
5. 확인: bun run check. 그리고 shared 의 임시 파일에서 react 를 가져오면 bun run check:imports 가 CON-3으로 잡는지 보고 지운다.
6. 작게 커밋한다. 예: docs: add the API contract / test: pin the error codes and limits / feat: add the shared contract types.
```

## 막히면

- **웹이나 서버에서 계약의 함수가 필요할 것 같다.** `shared`는 타입과 상수뿐이다(CON-3). 검증은 서버의 `validate.ts`, 화면용 변환은 웹의 `lib`이나 `state`에 둔다. 그래도 필요하면 멈추고 CON 정책을 바꿀지 사람이 정한다.
