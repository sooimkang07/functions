// Read-only static checks. Runtime extension QA is documented in docs/QA.md.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const check = (condition, message) => { if (!condition) errors.push(message) }
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
check(manifest.manifest_version === 3, 'Expected Manifest V3')
const assets = new Set([
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...(manifest.content_scripts || []).flatMap(entry => [...(entry.js || []), ...(entry.css || [])])
].filter(Boolean))
for (const path of assets) check(existsSync(resolve(root, path)), `Missing manifest asset: ${path}`)
const scripts = readdirSync(resolve(root, 'scripts')).filter(name => name.endsWith('.js'))
for (const name of scripts) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, 'scripts', name)], { encoding: 'utf8' })
  check(result.status === 0, `Syntax error: scripts/${name}\n${result.stderr || result.error || ''}`)
}
for (const [size, path] of Object.entries(manifest.icons || {})) {
  if (!existsSync(resolve(root, path))) continue
  const data = readFileSync(resolve(root, path))
  check(data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid PNG: ${path}`)
  if (data.length >= 24) check(data.readUInt32BE(16) === Number(size) && data.readUInt32BE(20) === Number(size), `Wrong icon dimensions: ${path}`)
}
const markdownFiles = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (entry.name.startsWith('.') || entry.name === 'node_modules') return []
  const path = resolve(directory, entry.name)
  return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : []
})
const docs = markdownFiles(root)
for (const file of docs) {
  const content = readFileSync(file, 'utf8')
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '')
    if (/^(?:[a-z]+:|#)/i.test(target)) continue
    const path = decodeURIComponent(target.split('#')[0])
    if (path) check(existsSync(resolve(dirname(file), path)), `Broken link in ${relative(root, file)}: ${target}`)
  }
}
// XML serializers can emit prefixed SVG tags that HTML treats as unknown elements.
for (const name of ['index.html', 'welcome.html']) {
  const html = readFileSync(resolve(root, name), 'utf8')
  check(!/<\/?[\w-]+:(?:svg|g|path|rect|text|defs)\b/i.test(html), `Invalid prefixed inline SVG in ${name}; use ordinary svg tags in HTML.`)
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`PASS: ${scripts.length} JavaScript files, ${assets.size} manifest assets, icon dimensions, ${docs.length} Markdown files' local links.`)
  console.log('Runtime, permission, visual, accessibility, and performance checks still require loaded-extension QA.')
}
