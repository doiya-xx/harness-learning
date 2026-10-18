import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Lexer } from 'marked'
import YAML from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'content')
const glossary = YAML.parse(fs.readFileSync(path.join(root, 'glossary.yml'), 'utf8')) ?? []
const errors = []
const err = (file, msg) => errors.push(`${path.relative(process.cwd(), file)}: ${msg}`)

const blocks = (md) => new Lexer().lex(md).filter((t) => t.type !== 'space')
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// longest names first so "tool call" masks "tool"
const entries = []
for (const g of glossary) for (const name of [g.term, ...(g.aliases ?? [])]) entries.push({ name, g })
entries.sort((a, b) => b.name.length - a.name.length)

function termsIn(text) {
  let rest = text
  const found = new Map()
  for (const { name, g } of entries) {
    const re = new RegExp(`(?<![A-Za-z0-9])${esc(name)}(?:e?s)?(?![A-Za-z0-9])`, 'gi')
    if (re.test(rest)) {
      found.set(g.term, g)
      rest = rest.replace(re, ' ')
    }
  }
  return [...found.values()]
}

function zhHas(zhText, g) {
  const low = zhText.toLowerCase()
  if (g.policy === 'keep') return [g.term, ...(g.aliases ?? [])].some((n) => low.includes(n.toLowerCase()))
  return g.zh ? low.includes(g.zh.toLowerCase()) : true
}

for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const dir = path.join(root, d.name)
  if (!fs.existsSync(path.join(dir, 'meta.yml'))) continue
  const enF = path.join(dir, 'en.md')
  const zhF = path.join(dir, 'zh.md')
  if (!fs.existsSync(enF)) { err(dir, '缺少 en.md'); continue }
  if (!fs.existsSync(zhF)) { err(dir, '缺少 zh.md'); continue }
  const en = blocks(fs.readFileSync(enF, 'utf8'))
  const zh = blocks(fs.readFileSync(zhF, 'utf8'))
  if (en.length !== zh.length) err(zhF, `块数不一致：en ${en.length}，zh ${zh.length}`)
  const n = Math.min(en.length, zh.length)
  for (let i = 0; i < n; i++) {
    if (en[i].type !== zh[i].type) { err(zhF, `第 ${i + 1} 块类型不一致：en ${en[i].type}，zh ${zh[i].type}`); continue }
    if (en[i].type === 'code') continue
    for (const g of termsIn(en[i].raw)) {
      if (!zhHas(zh[i].raw, g)) {
        err(zhF, `第 ${i + 1} 块术语 "${g.term}" ${g.policy === 'keep' ? '必须保持原文' : `必须译为“${g.zh}”`}`)
      }
    }
  }
}

if (errors.length) {
  console.error('check:align 失败：\n' + errors.map((e) => '  - ' + e).join('\n'))
  process.exit(1)
}
console.log('check:align 通过')
