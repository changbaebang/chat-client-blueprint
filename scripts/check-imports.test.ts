import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkImports, type Violation } from './check-imports'

const roots: string[] = []
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-imports-'))
  roots.push(root)
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
  }
  return root
}

function found(files: Record<string, string>): string[] {
  return checkImports(repo(files)).map((v: Violation) => `${v.file} ${v.rule} ${v.target}`)
}

// One breaking case for every row of the check:imports table (DESIGN 9.2).
describe('each table row catches its breaking import', () => {
  const rows: Array<[string, string, string, string]> = [
    ['CON-3', 'shared/limits.ts', "import { x } from 'react'\n", 'react'],
    ['EDGE-1', 'server/app.ts', "import { App } from '../src/app'\n", 'src/app'],
    ['EDGE-1', 'server/app.ts', "import { useState } from 'react'\n", 'react'],
    ['EDGE-2', 'server/app.ts', "import { Database } from 'bun:sqlite'\n", 'bun:sqlite'],
    ['EDGE-2', 'server/app.ts', "const f = Bun.file('x')\n", 'Bun.'],
    ['HTTP-1', 'server/http/router.ts', "import { open } from '../store/rdb/database'\n", 'server/store/rdb/database'],
    ['HTTP-1', 'server/http/router.ts', "import { mock } from '../reply/mock-provider'\n", 'server/reply/mock-provider'],
    ['DOM-1', 'server/domain/chats.ts', "import { readFile } from 'node:fs/promises'\n", 'node:fs/promises'],
    ['DOM-1', 'server/domain/chats.ts', "import { DatabaseSync } from 'node:sqlite'\n", 'node:sqlite'],
    ['DOM-1', 'server/domain/chats.ts', "import { route } from '../http/router'\n", 'server/http/router'],
    ['STORE-2', 'server/store/rdb/chats.ts', "import { read } from '../docs/chat-documents'\n", 'server/store/docs/chat-documents'],
    ['STORE-2', 'server/store/rdb/chats.ts', "import { createChat } from '../../domain/chats'\n", 'server/domain/chats'],
    ['STORE-2', 'server/store/docs/chat-documents.ts', "import { open } from '../rdb/database'\n", 'server/store/rdb/database'],
    ['REPLY-3', 'server/reply/mock-provider.ts', "import { open } from '../store/rdb/database'\n", 'server/store/rdb/database'],
    ['REPLY-3', 'server/reply/mock-provider.ts', "import { run } from '../domain/responses'\n", 'server/domain/responses'],
    ['SLIB-1', 'server/lib/log.ts', "import { config } from '../config'\n", 'server/config'],
    ['SLIB-2', 'server/lib/log.ts', "console.log('hello')\n", 'console.'],
    ['EDGE-1', 'src/app.tsx', "import { createApi } from '../server/app'\n", 'server/app'],
    ['EDGE-1', 'src/lib/dates.ts', "import { readFileSync } from 'node:fs'\n", 'node:fs'],
    ['API-3', 'src/api/client.ts', "import { useState } from 'react'\n", 'react'],
    ['API-3', 'src/api/client.ts', "import { useUser } from '../state/user'\n", 'src/state/user'],
    ['LIB-1', 'src/lib/keys.ts', "import { request } from '../api/client'\n", 'src/api/client'],
    ['STATE-5', 'src/state/chats.tsx', "import { Menu } from '../components/ui/menu'\n", 'src/components/ui/menu'],
    ['STATE-7', 'src/state/chats.tsx', "import { navigate } from '../lib/router'\n", 'src/lib/router'],
    ['COMP-2', 'src/components/ui/menu.tsx', "import { useUser } from '../../state/user'\n", 'src/state/user'],
    ['COMP-1', 'src/components/ui/menu.tsx', "import { ChatRow } from '../shell/chat-row'\n", 'src/components/shell/chat-row'],
    ['COMP-1', 'src/components/user/user-picker.tsx', "import { Composer } from '../chat/composer'\n", 'src/components/chat/composer'],
    ['COMP-1', 'src/components/chat/composer.tsx', "import { Sidebar } from '../shell/sidebar'\n", 'src/components/shell/sidebar'],
    ['COMP-1', 'src/components/home/home-screen.tsx', "import { UserGate } from '../user/user-gate'\n", 'src/components/user/user-gate'],
    ['EDGE-2', 'scripts/seed.ts', "import { Database } from 'bun:sqlite'\n", 'bun:sqlite'],
  ]
  for (const [rule, file, text, target] of rows) {
    test(`${rule}: ${file} must not import ${target}`, () => {
      expect(found({ [file]: text })).toEqual([`${file} ${rule} ${target}`])
    })
  }
})

describe('the parts that are allowed', () => {
  test('files that follow the table give no violations', () => {
    expect(
      found({
        'shared/contract.ts': "import type { ErrorCode } from './errors'\nexport type Id = string\n",
        'shared/errors.ts': "export const ERROR_CODES = ['not_found'] as const\n",
        'server/plugin.ts': "import type { Plugin } from 'vite'\nimport { createApi } from './app'\n",
        'server/app.ts': "import type { IncomingMessage } from 'node:http'\nimport { log } from './lib/log'\nimport type { Id } from '../shared/contract'\n",
        'server/store/rdb/chats.ts': "import type { ChatRepo } from '../../domain/ports'\n",
        'server/reply/mock-provider.ts': "import type { ReplyProvider } from '../domain/ports'\nimport { random } from '../lib/random'\n",
        'server/lib/log.ts': "export function log(line: string) { process.stdout.write(line + '\\n') }\n",
        'src/components/home/home-screen.tsx': "import { Composer } from '../chat/composer'\nimport { Button } from '../ui/button'\n",
        'src/state/chats.tsx': "import { request } from '../api/client'\nimport { load } from '../lib/storage'\n",
        'dev/ui.tsx': "import { Menu } from '../src/components/ui/menu'\n",
      }),
    ).toEqual([])
  })

  test('test files may use bun:test, @playwright/test and console', () => {
    expect(
      found({
        'shared/limits.test.ts': "import { expect, test } from 'bun:test'\nimport { LIMITS } from './limits'\n",
        'server/http/router.test.ts': "import { test } from 'bun:test'\nconsole.log('debug')\n",
        'src/app.e2e.ts': "import { expect, test } from '@playwright/test'\n",
      }),
    ).toEqual([])
  })

  test('strings, template literals, comments and member calls are not imports', () => {
    expect(
      found({
        'server/lib/fixtures.ts': [
          "const a = \"import { Database } from 'bun:sqlite'\"",
          'const b = `console.log(Bun.version)`',
          '// console.log and Bun.file in a comment',
          "/* import x from 'react' */",
          "const c = Array.from('abc')",
          "const d = /['\"]/.test(a)",
          '',
        ].join('\n'),
      }),
    ).toEqual([])
  })

  test('a path that climbs up is resolved from the repository root', () => {
    expect(found({ 'src/components/chat/x.tsx': "import { open } from '../../../server/store/rdb/database'\n" })).toEqual([
      'src/components/chat/x.tsx EDGE-1 server/store/rdb/database',
    ])
  })

  test('export from and dynamic import are checked too', () => {
    expect(
      found({
        'src/lib/a.ts': "export { request } from '../api/client'\nconst m = await import('../state/user')\n",
      }),
    ).toEqual(['src/lib/a.ts LIB-1 src/api/client', 'src/lib/a.ts LIB-1 src/state/user'])
  })
})

// Lexer details. The first two once let violations pass silently or shifted line numbers.
describe('scanner details', () => {
  test('a division by a number is not read as a regex, so later uses are still seen', () => {
    const vs = checkImports(
      repo({
        'server/lib/format.ts': [
          'export const line = (n: number) => 100 / n + `',
          '`',
          'console.log(line(1))',
          "export const read = () => Bun.file('x')",
          '',
        ].join('\n'),
      }),
    )
    expect(vs.map((v) => `${v.line} ${v.rule} ${v.target}`)).toEqual(['3 SLIB-2 console.', '4 EDGE-2 Bun.'])
  })

  test('JSX closing tags and an apostrophe in JSX text do not shift line numbers', () => {
    const vs = checkImports(
      repo({
        'src/components/chat/view.tsx': [
          'export function View() {',
          '  return (',
          '    <div>',
          '      <h1>Title</h1>',
          "      <p>Don't stop</p>",
          '    </div>',
          '  )',
          '}',
          "const m = import('../shell/sidebar')",
          '',
        ].join('\n'),
      }),
    )
    expect(vs.map((v) => `${v.line} ${v.rule} ${v.target}`)).toEqual(['9 COMP-1 src/components/shell/sidebar'])
  })

  test('the line number points at the import', () => {
    const [v] = checkImports(repo({ 'src/lib/a.ts': "\n\nimport { request } from '../api/client'\n" }))
    expect(v?.line).toBe(3)
  })
})
