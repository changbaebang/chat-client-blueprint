# 테스트 계획

[DESIGN 11장](DESIGN.md#11-테스트)에서 시작한 뼈대다. 규칙은 DESIGN에 두고 여기서는 링크한다. 이 문서에는 잰 시간과 직접 확인 목록을 쌓는다.

## 1. 층

| 층 | 도구 | 대상 | 위치 |
| -- | ---- | ---- | ---- |
| 모듈 | `bun test` | 계약의 검증 함수, domain, store, reply, 검사 스크립트, 웹의 순수 함수 | 대상 옆 `*.test.ts` |
| HTTP | `bun test`와 `fetch` | `createApi`를 포트 0에 띄운 서버. 상태 코드, 사용자 머리, SSE 순서, 끊김, 소유권, 응답의 필드 목록 | `server/http/**/*.test.ts` |
| 브라우저 | Playwright | 사용자 흐름, 포커스, 화면, 엔진 차이 | `src/**/*.e2e.ts` |
| 직접 확인 | 사람 | 실제 한글 입력기, 실제 Safari, 체감 | 이 문서 5장 |

층을 고르는 기준은 [DESIGN 11.1절](DESIGN.md#111-층)이다.

## 2. 작성 규칙

[DESIGN 11.2절](DESIGN.md#112-작성-규칙)을 따른다.

## 3. 실행 시점

| 때 | 명령 |
| -- | ---- |
| 커밋 전 | `bun run typecheck`, `bun run check:imports` |
| 고치는 동안 | `bun run test`, `bun run test:smoke`, 그 e2e 파일 하나 |
| 단계 끝 | `bun run check`, 그 단계의 e2e 파일을 세 엔진에서 |
| 합류 직전 | `bun run check`, `bun run test:e2e`, `bun run test:e2e:build` |
| 마일스톤 전(첫 마일스톤은 17단계) | `bun run test:e2e:all` |
| 화면 점검 | `SCREENS_STAGE=<단계> bun run test:screens` |

시간 예산과 e2e 서버의 구성은 [DESIGN 11.3절](DESIGN.md#113-실행-시점)과 [11.4절](DESIGN.md#114-e2e-서버와-데이터), 결과 읽는 법은 [11.5절](DESIGN.md#115-결과-읽는-법)이다.

## 4. 잰 시간

| 날짜 | 명령 | 엔진 | 워커 | 통과 | 실패 | 건너뜀 | 시간 | PC(코어, 메모리) | 커밋 |
| ---- | ---- | ---- | ---- | ---- | ---- | ------ | ---- | ---------------- | ---- |
| 2026-11-19 | `bun run check`(typecheck, 검사 스크립트, 모듈 테스트 45개) | 없음 | 없음 | 45 | 0 | 0 | 2.1초 | 논리 코어 12, 16 GB | c2cee3c |
| 2026-11-19 | `bun run test:smoke` | Chromium, 개발 서버 | 4 | 2 | 0 | 0 | 6.9초(명령 전체 8.2초) | 논리 코어 12, 16 GB | c2cee3c |
| 2026-11-19 | `bun run test:e2e:build` | Chromium, preview | 4 | 2 | 0 | 0 | 7.4초(빌드 포함 10.2초) | 논리 코어 12, 16 GB | c2cee3c |

Bun 1.4.4, Windows 11 Home. 시간은 Playwright의 요약 줄이고, 괄호 안은 명령 전체의 벽시계 시간이다.

## 5. 직접 확인 목록

넣는 조건, 지시하는 법, 결과의 말은 [DESIGN 11.6절](DESIGN.md#116-직접-확인과-화면-캡처)이다. 결과는 통과, 측정으로 갈음, 확인 못 함, 하지 않음 중 하나다.

| 번호 | 단계 | 무엇을 | 절차 | 기대 결과 | 브라우저와 버전 | 날짜 | 결과 |
| ---- | ---- | ------ | ---- | --------- | --------------- | ---- | ---- |
