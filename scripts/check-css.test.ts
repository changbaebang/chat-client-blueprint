import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkCss } from './check-css'

const roots: string[] = []
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function found(files: Record<string, string>): string[] {
  const root = mkdtempSync(join(tmpdir(), 'check-css-'))
  roots.push(root)
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, 'src/styles', path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
  }
  return checkCss(root).map((v) => `${v.file}:${v.line} ${v.rule}`)
}

describe('rules that break', () => {
  test('STYLE-4: color literals outside tokens.css', () => {
    expect(
      found({
        'ui.css': '.a {\n  color: #fff;\n  background: rgb(0 0 0);\n  border-color: hsl(0 0% 50%);\n  outline-color: oklch(70% 0.1 200);\n}\n',
      }),
    ).toEqual(['src/styles/ui.css:2 STYLE-4', 'src/styles/ui.css:3 STYLE-4', 'src/styles/ui.css:4 STYLE-4', 'src/styles/ui.css:5 STYLE-4'])
  })

  test('STYLE-6: themes outside tokens.css', () => {
    expect(
      found({
        'shell.css': '@media (prefers-color-scheme: dark) {\n  .a { color: var(--text); }\n}\n[data-theme="dark"] .b { color: var(--text); }\n',
      }),
    ).toEqual(['src/styles/shell.css:1 STYLE-6', 'src/styles/shell.css:4 STYLE-6'])
  })

  test('STYLE-9: an animated selector that the reduced-motion block does not stop', () => {
    expect(
      found({
        'ui.css': [
          '.spinner { animation: spin 1s linear infinite; }',
          '.skeleton { animation-name: pulse; }',
          '@media (prefers-reduced-motion: reduce) {',
          '  .spinner { animation: none; }',
          '}',
          '',
        ].join('\n'),
      }),
    ).toEqual(['src/styles/ui.css:2 STYLE-9'])
  })

  test('STYLE-10: !important', () => {
    expect(found({ 'base.css': '.a {\n  display: none !important;\n}\n' })).toEqual(['src/styles/base.css:2 STYLE-10'])
  })
})

describe('what is allowed', () => {
  test('tokens.css may hold colors and both themes', () => {
    expect(
      found({
        'tokens.css': [
          ':root { --text: #111; --bg: oklch(98% 0 0); }',
          '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --text: #eee; } }',
          ':root[data-theme="dark"] { --text: #eee; }',
          '',
        ].join('\n'),
      }),
    ).toEqual([])
  })

  test('animations stopped in the same file, ids, comments and keyframes are fine', () => {
    expect(
      found({
        'ui.css': [
          '/* color: #fff; !important */',
          '#root { min-height: 100%; }',
          '@keyframes spin { to { transform: rotate(360deg); } }',
          '.spinner { animation: spin 1s linear infinite; }',
          '.fade { animation: none; }',
          '@media (prefers-reduced-motion: reduce) {',
          '  .spinner { animation-play-state: paused; }',
          '}',
          '',
        ].join('\n'),
      }),
    ).toEqual([])
  })

  test('no CSS at all is fine', () => {
    expect(found({})).toEqual([])
  })
})
