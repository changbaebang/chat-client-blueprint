// check:imports — the dependency table of DESIGN 9.2, plus Bun-only APIs (EDGE-2) and console in server code (SLIB-2).
// Usage: bun scripts/check-imports.ts [root]. Prints "file:line RULE target" per violation and exits 1, or one "[ok]" line.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Violation = { file: string; line: number; rule: string; target: string }

type Use =
  | { kind: 'import'; spec: string; line: number }
  | { kind: 'global'; name: 'Bun.' | 'console.'; line: number }

// A target is a repository path without extension (src/lib/router) or a bare specifier (react, node:fs, bun:sqlite).
type Target = { path: string | null; spec: string }
type Rule = { rule: string; files: (f: string) => boolean; forbids: (t: Target, file: string) => boolean }

const SCANNED = ['shared', 'server', 'src', 'scripts', 'e2e', 'dev']
const SOURCE = /\.(ts|tsx)$/
const TEST_FILE = /\.(test|e2e)\.tsx?$/
const TEST_LIBS = new Set(['bun:test', '@playwright/test'])

const under = (p: string | null, base: string) => p !== null && (p === base || p.startsWith(base + '/'))
const pkg = (t: Target, ...names: string[]) => t.path === null && names.some((n) => t.spec === n || t.spec.startsWith(n + '/'))
const isPorts = (t: Target) => t.path === 'server/domain/ports'
const otherComponents = (t: Target, own: string) =>
  under(t.path, 'src/components') && !under(t.path, `src/components/${own}`)

const RULES: Rule[] = [
  { rule: 'CON-3', files: (f) => under(f, 'shared'), forbids: (t) => !under(t.path, 'shared') },
  { rule: 'EDGE-1', files: (f) => under(f, 'server'), forbids: (t) => under(t.path, 'src') || pkg(t, 'react', 'react-dom') },
  { rule: 'EDGE-2', files: (f) => under(f, 'server') || under(f, 'scripts'), forbids: (t) => t.path === null && t.spec.startsWith('bun:') },
  { rule: 'HTTP-1', files: (f) => under(f, 'server/http'), forbids: (t) => under(t.path, 'server/store') || under(t.path, 'server/reply') },
  {
    rule: 'DOM-1',
    files: (f) => under(f, 'server/domain'),
    forbids: (t) =>
      pkg(t, 'node:http', 'node:sqlite') || t.spec === 'node:fs' || t.spec === 'node:fs/promises' ||
      under(t.path, 'server/http') || under(t.path, 'server/store') || under(t.path, 'server/reply'),
  },
  {
    rule: 'STORE-2',
    files: (f) => under(f, 'server/store/rdb'),
    forbids: (t) =>
      under(t.path, 'server/store/docs') || under(t.path, 'server/http') || under(t.path, 'server/reply') ||
      (under(t.path, 'server/domain') && !isPorts(t)),
  },
  {
    rule: 'STORE-2',
    files: (f) => under(f, 'server/store/docs'),
    forbids: (t) =>
      under(t.path, 'server/store/rdb') || under(t.path, 'server/http') || under(t.path, 'server/reply') ||
      (under(t.path, 'server/domain') && !isPorts(t)),
  },
  {
    rule: 'REPLY-3',
    files: (f) => under(f, 'server/reply'),
    forbids: (t) => under(t.path, 'server/store') || under(t.path, 'server/http') || (under(t.path, 'server/domain') && !isPorts(t)),
  },
  { rule: 'SLIB-1', files: (f) => under(f, 'server/lib'), forbids: (t) => under(t.path, 'server') && !under(t.path, 'server/lib') },
  { rule: 'EDGE-1', files: (f) => under(f, 'src'), forbids: (t) => under(t.path, 'server') || (t.path === null && t.spec.startsWith('node:')) },
  {
    rule: 'API-3',
    files: (f) => under(f, 'src/api'),
    forbids: (t) => pkg(t, 'react', 'react-dom') || under(t.path, 'src/state') || under(t.path, 'src/components') || under(t.path, 'src/lib'),
  },
  {
    rule: 'LIB-1',
    files: (f) => under(f, 'src/lib'),
    forbids: (t) => under(t.path, 'src/api') || under(t.path, 'src/state') || under(t.path, 'src/components'),
  },
  { rule: 'STATE-5', files: (f) => under(f, 'src/state'), forbids: (t) => under(t.path, 'src/components') },
  { rule: 'STATE-7', files: (f) => under(f, 'src/state'), forbids: (t) => t.path === 'src/lib/router' },
  { rule: 'COMP-2', files: (f) => under(f, 'src/components/ui'), forbids: (t) => under(t.path, 'src/state') || under(t.path, 'src/api') },
  { rule: 'COMP-1', files: (f) => under(f, 'src/components/ui'), forbids: (t) => otherComponents(t, 'ui') },
  {
    rule: 'COMP-1',
    files: (f) => under(f, 'src/components/user'),
    forbids: (t) => ['chat', 'home', 'shell'].some((d) => under(t.path, `src/components/${d}`)),
  },
  {
    rule: 'COMP-1',
    files: (f) => under(f, 'src/components/chat'),
    forbids: (t) => ['user', 'home', 'shell'].some((d) => under(t.path, `src/components/${d}`)),
  },
  {
    rule: 'COMP-1',
    files: (f) => under(f, 'src/components/home'),
    forbids: (t) => ['user', 'shell'].some((d) => under(t.path, `src/components/${d}`)),
  },
]

export function checkImports(root: string): Violation[] {
  const violations: Violation[] = []
  for (const file of listSources(root)) {
    const isTest = TEST_FILE.test(file)
    for (const use of scan(readFileSync(join(root, file), 'utf8'))) {
      if (use.kind === 'global') {
        if (use.name === 'Bun.' && (under(file, 'server') || under(file, 'scripts'))) {
          violations.push({ file, line: use.line, rule: 'EDGE-2', target: 'Bun.' })
        }
        if (use.name === 'console.' && under(file, 'server') && !isTest) {
          violations.push({ file, line: use.line, rule: 'SLIB-2', target: 'console.' })
        }
        continue
      }
      if (isTest && TEST_LIBS.has(use.spec)) continue
      const target = resolve(file, use.spec)
      if (target === null) continue
      for (const r of RULES) {
        if (r.files(file) && r.forbids(target, file)) {
          violations.push({ file, line: use.line, rule: r.rule, target: target.path ?? target.spec })
        }
      }
    }
  }
  return violations
}

function listSources(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let names: string[]
    try {
      names = readdirSync(dir)
    } catch {
      return
    }
    for (const name of names) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (SOURCE.test(name)) out.push(relative(root, full).split(sep).join('/'))
    }
  }
  for (const top of SCANNED) walk(join(root, top))
  return out.sort()
}

// Relative and root-absolute specifiers become repository paths; anything that climbs out of the repository is ignored.
function resolve(file: string, spec: string): Target | null {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return { path: null, spec }
  const joined = spec.startsWith('/') ? spec.slice(1) : posix.join(posix.dirname(file), spec)
  const normal = posix.normalize(joined)
  if (normal.startsWith('..')) return null
  return { path: normal.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '').replace(/\/index$/, ''), spec }
}

// A small lexer: strings, template literals, comments and regex literals are skipped, so text inside them never counts.
// Known limit: in JSX text a lone apostrophe or slash is read as a string or regex up to the end of that line only.
// The newline itself is never swallowed, so line numbers and later lines stay correct.
type Token = { type: 'ident' | 'number' | 'string' | 'punct'; value: string; line: number }

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  const last = () => tokens[tokens.length - 1]
  const regexCanStart = () => {
    const t = last()
    if (!t) return true
    // After ) ] } a slash divides. After < it closes a JSX tag (</h1>).
    if (t.type === 'punct') return !')]}<'.includes(t.value)
    if (t.type === 'ident') return ['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'await', 'yield'].includes(t.value)
    // After a number or a string a slash divides.
    return false
  }
  while (i < text.length) {
    const c = text[i] as string
    if (c === '\n') {
      line++
      i++
    } else if (c === ' ' || c === '\t' || c === '\r') {
      i++
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
    } else if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        if (text[i] === '\n') line++
        i++
      }
      i += 2
    } else if (c === '"' || c === "'") {
      const start = line
      let value = ''
      i++
      while (i < text.length && text[i] !== c && text[i] !== '\n') {
        if (text[i] === '\\') i++
        value += text[i] ?? ''
        i++
      }
      if (text[i] === c) i++ // an unclosed string stops before the newline, which the outer loop counts
      tokens.push({ type: 'string', value, line: start })
    } else if (c === '`') {
      i++
      let depth = 0
      while (i < text.length) {
        const d = text[i]
        if (d === '\\') i += 2
        else if (d === '`' && depth === 0) break
        else {
          if (d === '\n') line++
          if (d === '$' && text[i + 1] === '{') depth++, i++
          else if (d === '}' && depth > 0) depth--
          i++
        }
      }
      i++
      tokens.push({ type: 'string', value: '', line })
    } else if (c === '/' && regexCanStart()) {
      i++
      let inClass = false
      while (i < text.length && text[i] !== '\n') {
        const d = text[i]
        if (d === '\\') i++
        else if (d === '[') inClass = true
        else if (d === ']') inClass = false
        else if (d === '/' && !inClass) break
        i++
      }
      if (text[i] === '/') {
        i++
        while (/[a-z]/i.test(text[i] ?? '')) i++
      }
      tokens.push({ type: 'string', value: '', line })
    } else if (/[0-9]/.test(c)) {
      let value = ''
      while (i < text.length && /[\w.]/.test(text[i] as string)) value += text[i++]
      tokens.push({ type: 'number', value, line })
    } else if (/[A-Za-z_$]/.test(c)) {
      let value = ''
      while (i < text.length && /[\w$]/.test(text[i] as string)) value += text[i++]
      tokens.push({ type: 'ident', value, line })
    } else {
      tokens.push({ type: 'punct', value: c, line })
      i++
    }
  }
  return tokens
}

function scan(text: string): Use[] {
  const tokens = tokenize(text)
  const uses: Use[] = []
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k] as Token
    const prev = tokens[k - 1]
    const next = tokens[k + 1]
    if (t.type !== 'ident' || (prev?.type === 'punct' && prev.value === '.')) continue
    if ((t.value === 'from' || t.value === 'import') && next?.type === 'string' && next.value) {
      uses.push({ kind: 'import', spec: next.value, line: next.line })
    } else if (t.value === 'import' && next?.value === '(' && tokens[k + 2]?.type === 'string') {
      const spec = tokens[k + 2] as Token
      if (spec.value) uses.push({ kind: 'import', spec: spec.value, line: spec.line })
    } else if ((t.value === 'Bun' || t.value === 'console') && next?.value === '.') {
      uses.push({ kind: 'global', name: t.value === 'Bun' ? 'Bun.' : 'console.', line: t.line })
    }
  }
  return uses
}

function main() {
  const root = process.argv[2] ?? process.cwd()
  const violations = checkImports(root)
  for (const v of violations) process.stdout.write(`${v.file}:${v.line} ${v.rule} ${v.target}\n`)
  if (violations.length > 0) {
    process.stdout.write(`[fail] check:imports: ${violations.length} violation(s)\n`)
    process.exit(1)
  }
  process.stdout.write('[ok] check:imports\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
