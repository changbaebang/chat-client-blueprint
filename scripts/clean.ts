// clean — removes build output, test results, reports and e2e data with node:fs (no shell rm, DESIGN 2.4).
// The root comes from this file's place, so running it from another folder never deletes that folder's files.
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TARGETS = ['dist', 'test-results', 'playwright-report', '.e2e-data']

const root = fileURLToPath(new URL('..', import.meta.url))
for (const target of TARGETS) {
  const full = join(root, target)
  if (!existsSync(full)) continue
  rmSync(full, { recursive: true, force: true })
  process.stdout.write(`removed ${target}\n`)
}
process.stdout.write('[ok] clean\n')
