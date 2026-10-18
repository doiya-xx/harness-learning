import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', 'content')
const CONCURRENCY = 5
const TIMEOUT = 15000

const items = []
for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (d.isFile() && d.name.endsWith('.md')) {
    const m = fs.readFileSync(path.join(root, d.name), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
    const fm = m ? YAML.parse(m[1]) : {}
    if (fm?.link) items.push({ file: d.name, url: fm.link })
  } else if (d.isDirectory()) {
    const f = path.join(root, d.name, 'meta.yml')
    if (fs.existsSync(f)) {
      const meta = YAML.parse(fs.readFileSync(f, 'utf8'))
      if (meta?.url) items.push({ file: d.name + '/meta.yml', url: meta.url })
    }
  }
}

async function req(url, method) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT)
  try {
    return await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'harness-learning-linkcheck/1.0' } })
  } finally { clearTimeout(t) }
}

async function check({ file, url }) {
  try {
    let r = await req(url, 'HEAD')
    if (!r.ok) r = await req(url, 'GET')
    return r.ok ? null : { file, url, error: `HTTP ${r.status}` }
  } catch (e) {
    try {
      const r = await req(url, 'GET')
      return r.ok ? null : { file, url, error: `HTTP ${r.status}` }
    } catch (e2) {
      return { file, url, error: String(e2?.cause?.code ?? e2?.message ?? e2) }
    }
  }
}

const broken = []
let idx = 0
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (idx < items.length) {
    const r = await check(items[idx++])
    if (r) broken.push(r)
  }
}))

fs.writeFileSync(path.join(here, 'link-report.json'), JSON.stringify({ checked: items.length, broken }, null, 2))
console.log(`已检查 ${items.length} 个链接，失效 ${broken.length} 个`)
for (const b of broken) console.log(`  ✗ ${b.error}  ${b.url}  (${b.file})`)
