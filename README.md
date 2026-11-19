# chat-client-blueprint

AI 답변을 스트리밍으로 받는 채팅 앱(웹과 API 서버)의 설계 문서와, Git만 설치된 Windows PC에서 이 저장소 안에 그 앱을 끝까지 만드는 단계별 프롬프트다. 앱도 이 저장소에 생긴다. 로그인은 없고 사용자를 고르는 프로토타입이다. 보이려는 것은 RDB와 문서 저장소를 나눠 쓰는 데이터 설계다. DB는 따로 설치하지 않는다. RDB는 Bun에 들어 있는 SQLite(파일 하나), 문서 저장소는 채팅마다 JSON 파일 하나다.

## 읽는 순서

1. [TASKS.md](TASKS.md): 이 작업의 목록, 정해야 할 것, 이 PC에서 잰 사실, 설계에 담은 원칙.
2. [docs/DESIGN.md](docs/DESIGN.md): 전체 스펙, API 계약, 데이터 설계(RDB와 문서 저장소), 폴더 구조, 폴더별 정책, 테스트, 운영, 결정 기록.
3. [prompts/README.md](prompts/README.md): 단계 00~17의 표, 역할, 공통 프롬프트 틀. 단계 파일은 `prompts/00-environment.md`부터다.

## 근거

| 저장소 | 이 작업에 준 것 |
| ------ | --------------- |
| [career-radar](https://github.com/changbaebang/career-radar) | `node:sqlite`와 `user_version` 마이그레이션, 루프백 Host 검사, ADR 형식 |
| [agent-skill-garden](https://github.com/changbaebang/agent-skill-garden) | 변경 권한과 검증 정책, 단계마다 쓰는 스킬 |

## 앱

준비 중이다. 17단계에서 채운다.
