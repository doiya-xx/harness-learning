import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

const here = path.dirname(fileURLToPath(import.meta.url))
const content = path.resolve(here, '..', 'content')
const UA = 'harness-learning-fetch/1.0 (+https://github.com/doiya-xx/harness-learning)'
const DELAY = 1500
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url, headers = {}) => fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' })

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const today = new Date().toISOString().slice(0, 10)

async function allowedByRobots(url) {
  const u = new URL(url)
  try {
    const r = await get(`${u.origin}/robots.txt`)
    if (!r.ok) return true
    let applies = false
    for (const raw of (await r.text()).split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim()
      const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
      if (!m) continue
      const k = m[1].toLowerCase()
      if (k === 'user-agent') applies = m[2].trim() === '*'
      else if (applies && k === 'disallow' && m[2] && u.pathname.startsWith(m[2].trim())) return false
    }
    return true
  } catch { return true }
}

async function fromRepo(s) {
  const token = process.env.GITHUB_TOKEN
  const headers = token ? { Authorization: 'Bearer ' + token } : {}
  const lic = await get(`https://api.github.com/repos/${s.repo}/license`, headers)
  const license = lic.ok ? ((await lic.json()).license?.spdx_id ?? 'unknown') : 'unknown'
  const raw = await get(`https://raw.githubusercontent.com/${s.repo}/HEAD/${s.path}`)
  if (!raw.ok) throw new Error(`HTTP ${raw.status}`)
  return { en: await raw.text(), license, url: `https://github.com/${s.repo}/blob/HEAD/${s.path}`, source: s.repo, titleEn: s.title }
}

async function fromWeb(s) {
  if (!(await allowedByRobots(s.url))) throw new Error('robots.txt 禁止')
  const r = await get(s.url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const dom = new JSDOM(await r.text(), { url: s.url })
  const art = new Readability(dom.window.document).parse()
  if (!art) throw new Error('无法提取正文')
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  return { en: td.turndown(art.content), license: 'unknown', url: s.url, source: art.siteName || new URL(s.url).hostname, titleEn: art.title || s.title }
}

function writeLinkFallback(s, slug) {
  const f = path.join(content, `${slug}.md`)
  if (fs.existsSync(f) || !s.url) return
  fs.writeFileSync(f, `---\ntitle: ${JSON.stringify(s.title)}\ncat: ${JSON.stringify(s.cat)}\norder: ${s.order ?? 0}\nlink: ${s.url}\nsource: ${new URL(s.url).hostname}\n---\n\n（待补充：用自己的话写要点摘要。）\n`)
}

const sources = YAML.parse(fs.readFileSync(path.join(here, 'sources.yml'), 'utf8')) ?? []
for (const s of sources) {
  const slug = s.slug ?? slugify(s.title)
  try {
    const r = s.repo ? await fromRepo(s) : await fromWeb(s)
    const dir = path.join(content, slug)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'en.md'), r.en.trim() + '\n')
    const metaF = path.join(dir, 'meta.yml')
    const old = fs.existsSync(metaF) ? YAML.parse(fs.readFileSync(metaF, 'utf8')) : {}
    fs.writeFileSync(metaF, YAML.stringify({
      title: old.title ?? s.title, title_en: r.titleEn, cat: s.cat, order: s.order ?? 0,
      source: r.source, url: r.url, license: r.license, fetched: today,
      translation: old.translation ?? 'machine',
    }))
    console.log(`✓ ${slug}（请翻译 zh.md 并运行 npm run check:align）`)
  } catch (e) {
    console.log(`✗ ${slug}: ${e.message}${s.url ? '，降级为外链型' : ''}`)
    writeLinkFallback(s, slug)
  }
  await sleep(DELAY)
}
