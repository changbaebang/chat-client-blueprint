# 00. 환경 준비

| 항목 | 값 |
| ---- | -- |
| 브랜치 | 없음. 앱은 이 저장소(설계와 프롬프트가 있는 폴더) 안에 만든다 |
| 선행 | Git이 설치된 Windows PC, Claude Code(CLI나 VS Code 확장) |
| 읽을 문서 | [DESIGN 2.1절, 2.4절](../docs/DESIGN.md#2-기술-선택) |

Bun 하나면 된다. Node는 설치하지 않아도 된다.

## 이 단계가 끝나면

- [ ] `bun --version`이 1.4 이상이다. 2026-11-18에 winget의 Bun은 1.4.4였다.
- [ ] Git의 `init.defaultBranch`가 `main`이고, 커밋 신원(`user.name`, `user.email`)이 사람이 고른 값이다.
- [ ] 이 저장소를 VS Code로 열었고, 앱 파일(`package.json`, `src/`, `server/`)은 아직 없다.
- [ ] Bun에서 `node:sqlite`가 돈다.
- [ ] (선택) 스킬을 쓰려면 Python 3.9 이상과 ripgrep이 있다.

## 순서

1. **사람** PowerShell을 연다. 아래를 돌린다. Bun을 설치한 뒤에는 PowerShell 창을 새로 연다. 열려 있던 창은 새 PATH를 모른다.

   ```powershell
   git --version
   winget install --id Oven-sh.Bun --exact --accept-source-agreements --accept-package-agreements
   ```

   새 창에서:

   ```powershell
   bun --version
   git config --global init.defaultBranch main
   git config --global user.name "{커밋에 쓸 이름}"
   git config --global user.email "{커밋에 쓸 이메일}"
   ```

2. **사람** Bun에서 `node:sqlite`를 확인한다. SQLite 버전이 나오면 된다. 2026-11-18에 Bun 1.4.2에서는 경고 없이 `3.53.2`가 나왔다.

   ```powershell
   bun -e "const { DatabaseSync } = require('node:sqlite'); console.log(new DatabaseSync(':memory:').prepare('select sqlite_version() as v').get().v)"
   ```

3. **사람** (선택) 01단계에서 agent-skill-garden의 스킬을 설치하려면:

   ```powershell
   winget install --id Python.Python.3.13 --exact
   winget install --id BurntSushi.ripgrep.MSVC --exact
   ```

4. **사람** Bun을 설치한 뒤에는 VS Code를 완전히 껐다 켠다. 터미널 탭만 새로 열어서는 PATH가 바뀌지 않는다. 그다음 이 저장소 폴더 자체를 VS Code로 열고 Claude Code 패널을 연다. 상위 폴더에서 열면 `CLAUDE.md`가 시작할 때 로드되지 않는다.
5. **입력** 프롬프트 1을 붙인다. 에이전트가 환경을 확인해 표로 보고한다.
6. **사람** 표의 모든 행이 기대값과 같은지 본다. 다르면 "막히면"을 본다.

## 프롬프트 1. 환경 확인

```text
이 폴더는 설계(docs/DESIGN.md)와 단계 프롬프트(prompts/)가 있는 저장소다. 앱은 이 폴더 안에 만든다. 아무 파일도 만들지 않고 환경만 확인한다.

1. Git Bash에서 다음을 돌린다.
   git --version
   bun --version
   git config --global init.defaultBranch
   git config --global user.name 과 user.email 은 값이 있는지만 본다. 값은 보고에 쓰지 않는다.
2. Bun에서 node:sqlite를 확인한다.
   bun -e "const { DatabaseSync } = require('node:sqlite'); console.log(new DatabaseSync(':memory:').prepare('select sqlite_version() as v').get().v)"
   출력과, 경고가 함께 나왔는지를 적는다.
3. 이 폴더에 docs/DESIGN.md 와 prompts/ 가 있고, 앱 파일(package.json, src/, server/)은 아직 없는지 본다.
4. 결과를 표로 보고한다. 열은 항목, 기대값, 실제 값, 판정(pass, fail, blocked)이다.
   기대값: Git 2.x, Bun 1.4 이상, defaultBranch main, 신원 있음, node:sqlite 버전이 나옴, 설계와 프롬프트만 있음.
5. fail이 있으면 고치는 명령을 제안만 하고 실행하지 않는다.
```

## 막히면

- **`bun`을 찾지 못한다.** Bun을 설치하기 전에 연 창이다. 새 창을 연다. VS Code도 다시 시작한다. 그래도 없으면 `%USERPROFILE%\.bun\bin`이 PATH에 있는지 본다.
- **winget이 없다.** Microsoft Store의 "앱 설치 관리자"를 업데이트한다. 아니면 Bun 공식 설치 스크립트를 쓴다: `powershell -c "irm bun.sh/install.ps1 | iex"`.
- **`node:sqlite`가 없다고 나온다.** Bun 버전을 본다. 1.4.2에서는 됐다. 더 낮으면 `winget upgrade --id Oven-sh.Bun`.
