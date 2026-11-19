# 04. 기초 UI

| 항목 | 값 |
| ---- | -- |
| 브랜치 | `stage/04-ui-foundation` |
| 선행 | 03 |
| 읽을 문서 | [DESIGN 3.1절 화면](../docs/DESIGN.md#31-화면), [3.4절 단축키](../docs/DESIGN.md#34-단축키), [3.5절 접근성](../docs/DESIGN.md#35-접근성), [3.7절 화면 품질](../docs/DESIGN.md#37-화면-품질), [7.3절 브라우저 규칙](../docs/DESIGN.md#73-브라우저-규칙), [9.10절](../docs/DESIGN.md#910-srclib), [9.12절](../docs/DESIGN.md#912-srccomponents), [9.13절](../docs/DESIGN.md#913-srcstyles) |
| 고칠 폴더 | `src/styles`, `components/ui`, `components/shell`, `components/home`, `lib` |
| 쓸 스킬 | (설치하면) `react-review`, `e2e-test-design` |

## 이 단계가 끝나면

- [ ] 토큰(밝은 테마와 어두운 테마), 기본 스타일, ui 부품 11개가 있다. 부품은 props로만 동작한다.
- [ ] 앱 틀: 사이드바(끌기와 키보드로 너비 조절, 접기, `mod+\`), 본문, 빈 목록 자리, 홈과 찾을 수 없음 화면.
- [ ] `lib`: 라우터, 플랫폼 판별, 단축키 해석, 저장소 도우미, 문서 제목 훅. 모듈 테스트가 있다.
- [ ] 개발 서버의 `/dev/ui.html` 견본 화면에서 모든 부품을 두 테마로 볼 수 있다. 빌드에는 들어가지 않는다.
- [ ] 부품의 키보드, 포커스, 바깥 클릭, 동작 줄이기, 대비를 e2e가 세 엔진에서 본다.
- [ ] `components`, `styles`, `lib`의 `POLICY.md`가 있고, 사람이 승인했다.
- [ ] 화면의 바탕: 간격, 글자 크기, 줄 높이, 반지름이 단계 표로 있고(UX-3), 견본 화면에 DESIGN 3.3절의 상태가 있다(UX-1).
- [ ] `@screens` e2e가 있고, `docs/evidence/ui/04/`의 캡처와 `CHECK.md`를 사람이 보고 체크했다(화면 점검).
- [ ] 일반 AI 에이전트 웹앱(Claude 웹이나 ChatGPT)의 같은 화면을 사람이 찍어 `docs/evidence/ui/reference/`에 넣었고, 다르게 한 곳이 `docs/evidence/ui/compare.md`에 있다(UX-2).

## 순서

1. **입력** 프롬프트 1.
2. **확인**

   ```powershell
   bun run check
   bun --bun playwright test src/components src/lib
   bun run dev
   ```

   `bun run dev`를 띄운 채 http://localhost:5173/dev/ui.html 을 연다.

3. **직접 확인**
   - 견본 화면에서 Tab만으로 모든 부품을 지나간다. 포커스가 보이지 않는 곳이 있는지 본다.
   - Windows의 "애니메이션 효과"를 끄고(설정, 접근성, 시각 효과) 스피너와 스켈레톤이 멈추는지 본다.
   - 어두운 테마(Windows 설정의 앱 모드)로 바꿔 글자가 읽히는지 본다.
4. **검토 지점**
   - `components/ui/menu.tsx`: 바깥 클릭을 `pointerdown`으로 받는지(7.3절), 닫을 때 연 버튼으로 포커스가 돌아가는지.
   - `lib/keys.ts`: `event.key`가 라틴 문자가 아니면 `event.code`로 읽는지, `event.repeat`를 무시하는지.
   - 세 `POLICY.md`를 읽고 승인한다.
5. **입력** 검토 프롬프트. 절은 "3.1, 3.4, 3.5, 7.3, 9.10, 9.12, 9.13절".
6. **입력** 반영 프롬프트.

## 프롬프트 1. 구현

```text
이 저장소는 docs/DESIGN.md의 채팅 앱이다. 먼저 AGENTS.md와 docs/TASKS.md의 지금 상태를 읽고 AGENTS.md의 규칙을 따른다.
고칠 폴더에 POLICY.md가 있으면 먼저 읽는다. "승인"인 정책만 규칙이다.
DESIGN.md나 승인된 정책과 부딪히거나, 되돌리기 어렵거나 다른 단계에 걸리는 판단이 필요하면 고치기 전에 멈추고 규칙 ID, 이유, 권장안을 보고한다. 그 밖의 작은 판단은 정한 뒤 보고의 "정한 것"에 적는다.
테스트를 먼저 쓰고, 구현하기 전에 돌려서 실패하는 출력을 보인다. 그 실패가 고칠 결함 때문인지도 본다.
테스트의 전체 출력은 시각을 붙인 로그 파일로 보내고, 대화에는 마지막 요약과 실패만 보인다.
끝나면 AGENTS.md 12장의 형식으로 보고한다. 돌리지 않은 것과 확인하지 못한 것은 그렇다고 쓴다.

이번 단계: 04 기초 UI. 브랜치 stage/04-ui-foundation 을 main에서 만든다.
DESIGN 3.1, 3.4, 3.5, 7.3, 8장, 9.10, 9.12, 9.13절을 읽는다. 서버와 데이터는 아직 없다. 화면은 빈 상태로 그린다.
화면 문구는 영어다.

1. 정책 먼저: src/components/POLICY.md, styles/POLICY.md, lib/POLICY.md 를 DESIGN 9.1절의 형식으로 만든다.
   상태는 "작성 중". 규칙은 9.10, 9.12, 9.13절 그대로. 규칙마다 이유, 예, 확인 방법.
2. 테스트 먼저
   - 모듈(lib/*.test.ts): platform 은 userAgentData.platform 이 없고 navigator.platform 이 "MacIntel" 이면 Mac.
     keys 는 한글 자판에서 key 가 "ㅠ" 이고 code 가 "KeyB" 이면 B 로 읽는다. repeat 는 무시한다. mod 는 Mac에서 meta, 그 밖에서 ctrl.
     storage 는 localStorage 가 던져도 기본값을 돌려준다. router 의 경로 맞추기는 잘못 인코딩된 주소(%E0%A4%A)에도 던지지 않는다.
   - e2e(components/ui/*.e2e.ts, shell/*.e2e.ts): 견본 화면 /dev/ui.html 에서
     메뉴는 열면 첫 항목에 포커스, 위아래 방향키와 Home, End로 움직이고, Esc와 바깥 pointerdown으로 닫히고, 연 버튼으로 포커스가 돌아온다.
     다이얼로그는 showModal 이고, 닫으면 연 곳으로 포커스가 돌아오고, 연 곳이 사라졌으면 화면의 h1로 간다.
     글자를 끌다가 배경에서 놓아도 닫히지 않는다.
     툴팁은 키보드 포커스와 마우스 올림에서 열리고 클릭으로는 열리지 않는다.
     리사이즈 손잡이는 끌기와 방향키, Home, End로 200~400px 안에서 움직이고 aria-valuenow 가 따라간다.
     reducedMotion: 'reduce' 에뮬레이션에서 스피너와 스켈레톤의 animation-name 이 none 이거나 재생이 멈춘다.
     두 테마에서 글자 토큰과 배경 토큰의 대비가 4.5:1 이상, 테두리와 아이콘이 3:1 이상이다(getComputedStyle로 잰다).
     앱 틀은 mod+\ 로 사이드바를 접고 펴고, 너비와 접힘이 새로고침 뒤에도 남는다.
     @screens(src/screens.e2e.ts. testDir 가 src 라서 이 자리다): 견본 화면의 부품과 DESIGN 3.3절의 상태를 두 테마, 1280x800, 1024x700, 1280x480으로 찍어 docs/evidence/ui/04/ 에 둔다.
     파일 이름은 <화면>-<상태>-<테마>-<너비x높이>.png 다. 둘 폴더는 SCREENS_STAGE 로 받고, 없으면 바로 실패한다(DESIGN 3.7절). 캡처는 단언이 아니라 기록이라 구현 전 실패 확인에서 뺀다.
   돌려서 실패하는 출력을 보인다.
3. 구현
   - styles: tokens.css(색, 간격, 반지름, 글꼴, --duration-*, 밝음과 어두움. prefers-color-scheme 과 [data-theme] 둘 다),
     base.css, ui.css, shell.css. 색은 tokens.css 에만(STYLE-4). 애니메이션은 같은 파일에서 reduced-motion 으로 멈춘다(STYLE-9).
     글꼴은 @fontsource-variable/geist.
     간격, 글자 크기, 줄 높이, 반지름은 단계 표로 두고 그 단계만 쓴다(UX-3). 누를 수 있는 것은 hover, focus-visible, active, disabled가 모두 보이게 한다(UX-4).
   - components/ui: button, icon-button, menu, dialog, confirm-dialog, tooltip, toast(ToastProvider 와 useToast), skeleton, spinner, icons, resize-handle.
     props 로만 동작한다(COMP-2). 문구는 props 로 받는다.
   - lib: router.tsx(주소 읽기, 이동, 경로 맞추기. /users, /, /chats/:id, 그 밖), platform.ts, keys.ts, storage.ts, use-document-title.ts.
     브라우저 차이를 다루는 줄에는 DESIGN 7.3절의 행을 주석으로 가리킨다(LIB-7).
   - components/shell: app-shell(사이드바와 본문, 너비와 접힘 저장, mod+\), sidebar(앱 이름, New chat 링크, 접기 버튼, 빈 목록 자리 "No chats yet",
     사용자 메뉴 자리), screen-boundary(화면 하나의 오류 경계). 사이드바 너비를 끌어서 조절하는 동안에는 CSS 변수만 바꾸고 놓을 때 한 번 저장한다
     (조절하는 동안 state를 바꾸면 앱 전체가 다시 그려진다).
   - components/home: home-screen(인사말, 입력창 자리), not-found.
   - 견본 화면: dev/ui.html 과 dev/ui.tsx. 모든 부품을 상태별로 늘어놓고 테마 전환 버튼을 둔다.
     vite.config.ts 의 build 입력은 index.html 하나라서 견본은 빌드에 들어가지 않는다. 빌드 뒤 dist 에 ui.html 이 없는지 본다.
     견본 화면에는 DESIGN 3.3절의 상태(스켈레톤, 빈 목록, 오류 문구와 Retry, 120자 제목)도 늘어놓는다(UX-1, UX-5).
4. 확인: bun run check, 위 e2e 를 세 엔진에서. 결과를 엔진별로 보고한다.
5. 작게 커밋한다. 부품 하나나 둘에 커밋 하나 정도.
```

**일반 AI 에이전트 웹앱 캡처(사람):** 화면 점검 전에 Claude 웹이나 ChatGPT에서 같은 자리(빈 홈, 사이드바, 메뉴, 다이얼로그)를 두 테마로 찍어 `docs/evidence/ui/reference/`에 넣는다. 에이전트는 사람이 넣은 캡처만 비교에 쓴다. 이후 화면 단계에서도 그 단계의 화면이 생기면 같은 자리를 더 찍는다.

## 화면 점검

기능의 확인이 끝난 뒤, 검토 프롬프트 전에 한다. 틀은 [README 6.12절](README.md#612-화면-점검), 기준은 [DESIGN 3.7절](../docs/DESIGN.md#37-화면-품질)이다.

```text
이 단계의 화면 점검을 한다. 기준은 docs/DESIGN.md 3.7절이다. 앱 코드는 고치지 않는다.
1. SCREENS_STAGE=04 bun run test:screens 를 돌려 docs/evidence/ui/04/ 에 캡처를 남긴다.
   이 단계에서 생긴 화면과 상태가 @screens 에 없으면 먼저 더한다.
2. 처음 쓰는 사람의 눈으로 흐름을 따라간다: 견본 화면의 부품을 Tab으로 지나가기, 메뉴와 다이얼로그를 열고 닫기, 사이드바 접기와 너비 조절, 빈 목록과 홈과 찾을 수 없음 화면.
   밝은 테마와 어두운 테마, 창 1280x800, 1024x700, 1280x480.
3. docs/evidence/ui/04/CHECK.md 를 만든다. UX-1부터 UX-10까지 행마다 캡처 파일, 본 것,
   판정(맞음, 고칠 것, 사람이 볼 것)을 쓰고, 끝에 사람이 체크할 빈 칸을 둔다.
4. 같은 상황의 안내 문구를 표로 모은다(UX-7).
5. 일반 AI 에이전트 웹앱과 다르게 한 곳은 docs/evidence/ui/compare.md 에 이유와 함께 적는다(UX-2).
   일반 AI 에이전트 웹앱의 화면은 사람이 직접 찍어 docs/evidence/ui/reference/ 에 넣은 것만 쓴다.
6. "고칠 것"을 목록으로 보이고 멈춘다. 이 단계에서 고칠지 15단계로 넘길지는 내가 정한다.
```

**사람** 캡처를 열어 보고 `CHECK.md`의 빈 칸에 체크한다. 캡처로 모자라면 앱을 띄워 위 흐름을 직접 써 본다. 체크하지 않은 단계는 반영하지 않는다(UX-10).

## 막히면

- **WebKit에서 메뉴가 바깥 클릭으로 닫히지 않는다.** blur에 기대는 코드다. 문서의 `pointerdown`으로 바꾸게 한다.
- **Firefox에서 창 밖에서 놓은 끌기가 따라온다.** pointer capture를 쓰는지 본다. Playwright의 Firefox는 창 밖 입력을 전달하지 않아, 놓은 뒤 따라오지 않는 것까지만 자동으로 본다.
- **대비 테스트가 반투명 색에서 틀린 값을 낸다.** 글자 뒤의 실제 배경을 겹쳐 계산해야 한다. 토큰 쌍을 불투명한 견본 위에서 재게 한다.
