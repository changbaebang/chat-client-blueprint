// check:css — STYLE-4 (color literals outside tokens.css), STYLE-6 (themes outside tokens.css),
// STYLE-9 (animated selectors stopped by the same file's reduced-motion block) and STYLE-10 (!important). See DESIGN 9.13.
// Usage: bun scripts/check-css.ts [root]. Prints "[fail] file:line RULE text" per violation and exits 1, or one "[ok]" line.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export type CssViolation = { file: string; line: number; rule: string; text: string }

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/

export function checkCss(root: string): CssViolation[] {
  const out: CssViolation[] = []
  for (const file of listCss(join(root, 'src/styles'), root)) {
    out.push(...checkFile(file, readFileSync(join(root, file), 'utf8')))
  }
  return out
}

function listCss(dir: string, root: string): string[] {
  const found: string[] = []
  const walk = (d: string) => {
    let names: string[]
    try {
      names = readdirSync(d)
    } catch {
      return
    }
    for (const name of names) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.css')) found.push(relative(root, full).split(sep).join('/'))
    }
  }
  walk(dir)
  return found.sort()
}

function checkFile(file: string, source: string): CssViolation[] {
  const isTokens = file.endsWith('/tokens.css')
  // Comments become spaces so offsets and line numbers stay the same.
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const lineAt = (offset: number) => text.slice(0, offset).split('\n').length
  const out: CssViolation[] = []
  const animated: Array<{ selector: string; line: number }> = []
  const stopped = new Set<string>()

  const firstNonSpace = (from: number, to: number) => {
    let i = from
    while (i < to && /\s/.test(text[i] as string)) i++
    return i
  }
  const matching = (open: number) => {
    let depth = 0
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}' && --depth === 0) return i
    }
    return text.length
  }
  const selectorsOf = (prelude: string) => prelude.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean)

  const declarations = (from: number, to: number, selectors: string[], reduce: boolean) => {
    let start = from
    for (let i = from; i <= to; i++) {
      if (i < to && text[i] !== ';') continue
      const at = firstNonSpace(start, i)
      const decl = text.slice(at, i).trim()
      start = i + 1
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      const prop = decl.slice(0, colon).trim().toLowerCase()
      const value = decl.slice(colon + 1).trim().toLowerCase()
      const line = lineAt(at)
      if (value.includes('!important')) out.push({ file, line, rule: 'STYLE-10', text: decl })
      if (!isTokens && COLOR.test(value)) out.push({ file, line, rule: 'STYLE-4', text: decl })
      const isNone = /^none\b/.test(value)
      if (reduce) {
        if (((prop === 'animation' || prop === 'animation-name') && isNone) || (prop === 'animation-play-state' && value === 'paused')) {
          for (const s of selectors) stopped.add(s)
        }
      } else if ((prop === 'animation' || prop === 'animation-name') && !isNone) {
        for (const s of selectors) animated.push({ selector: s, line })
      }
    }
  }

  const block = (from: number, to: number, reduce: boolean) => {
    let i = from
    while (i < to) {
      const at = firstNonSpace(i, to)
      if (at >= to) break
      let j = at
      while (j < to && text[j] !== '{' && text[j] !== ';') j++
      if (j >= to) break
      if (text[j] === ';') {
        i = j + 1
        continue
      }
      const prelude = text.slice(at, j).trim()
      const close = matching(j)
      const line = lineAt(at)
      if (!isTokens && (/prefers-color-scheme/i.test(prelude) || /data-theme/i.test(prelude))) {
        out.push({ file, line, rule: 'STYLE-6', text: prelude })
      }
      if (/^@(-webkit-)?keyframes\b/i.test(prelude)) {
        // Keyframe steps are not selectors.
      } else if (prelude.startsWith('@')) {
        block(j + 1, close, reduce || /prefers-reduced-motion\s*:\s*reduce/i.test(prelude))
      } else {
        declarations(j + 1, close, selectorsOf(prelude), reduce)
      }
      i = close + 1
    }
  }

  block(0, text.length, false)
  for (const a of animated) {
    if (!stopped.has(a.selector)) out.push({ file, line: a.line, rule: 'STYLE-9', text: a.selector })
  }
  return out.sort((x, y) => x.line - y.line)
}

function main() {
  const root = process.argv[2] ?? process.cwd()
  const violations = checkCss(root)
  for (const v of violations) process.stdout.write(`[fail] ${v.file}:${v.line} ${v.rule} ${v.text}\n`)
  if (violations.length > 0) process.exit(1)
  process.stdout.write('[ok] check:css\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
