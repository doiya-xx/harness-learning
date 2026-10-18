import { Lexer, parser, type Token, type Tokens } from 'marked'
import YAML from 'yaml'

const files = import.meta.glob('/content/**', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export type Block = { type: string; html: string }

export type Article = {
  slug: string
  kind: 'link' | 'bilingual'
  title: string
  titleEn?: string
  cat: string
  order: number
  source: string
  link?: string
  license?: string
  fetched?: string
  translation?: string
  body?: string
  en?: string
  zh?: string
}

export type GlossaryEntry = { term: string; policy: 'keep' | 'translate'; zh?: string; note?: string; aliases?: string[] }

function frontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  return { data: (YAML.parse(m[1]) as Record<string, unknown>) ?? {}, body: m[2] }
}

function build(): { articles: Article[]; glossary: GlossaryEntry[] } {
  const articles: Article[] = []
  let glossary: GlossaryEntry[] = []
  const dirs: Record<string, { meta?: string; en?: string; zh?: string }> = {}
  for (const [path, raw] of Object.entries(files)) {
    const rel = path.replace(/^\/content\//, '')
    if (rel === 'glossary.yml') {
      glossary = (YAML.parse(raw) as GlossaryEntry[]) ?? []
    } else if (!rel.includes('/') && rel.endsWith('.md')) {
      const { data, body } = frontmatter(raw)
      articles.push({
        slug: rel.replace(/\.md$/, ''),
        kind: 'link',
        title: String(data.title ?? rel),
        cat: String(data.cat ?? '99 其他'),
        order: Number(data.order ?? 0),
        source: String(data.source ?? ''),
        link: data.link ? String(data.link) : undefined,
        body,
      })
    } else {
      const [dir, file] = rel.split('/')
      const d = (dirs[dir] ??= {})
      if (file === 'meta.yml') d.meta = raw
      else if (file === 'en.md') d.en = raw
      else if (file === 'zh.md') d.zh = raw
    }
  }
  for (const [slug, d] of Object.entries(dirs)) {
    if (!d.meta) continue
    const m = YAML.parse(d.meta) as Record<string, unknown>
    articles.push({
      slug,
      kind: 'bilingual',
      title: String(m.title ?? slug),
      titleEn: m.title_en ? String(m.title_en) : undefined,
      cat: String(m.cat ?? '99 其他'),
      order: Number(m.order ?? 0),
      source: String(m.source ?? ''),
      link: m.url ? String(m.url) : undefined,
      license: m.license ? String(m.license) : undefined,
      fetched: m.fetched ? String(m.fetched) : undefined,
      translation: m.translation ? String(m.translation) : undefined,
      en: d.en,
      zh: d.zh,
    })
  }
  articles.sort((a, b) => a.cat.localeCompare(b.cat) || a.order - b.order || a.title.localeCompare(b.title))
  return { articles, glossary }
}

const built = build()
export const articles = built.articles
export const glossary = built.glossary

export function categories(): { cat: string; items: Article[] }[] {
  const out: { cat: string; items: Article[] }[] = []
  for (const a of articles) {
    const last = out[out.length - 1]
    if (last && last.cat === a.cat) last.items.push(a)
    else out.push({ cat: a.cat, items: [a] })
  }
  return out
}

export function toBlocks(md: string): Block[] {
  const lexer = new Lexer()
  const tokens = lexer.lex(md)
  const links = (tokens as Token[] & { links: Tokens.Generic }).links
  return tokens
    .filter((t) => t.type !== 'space')
    .map((t) => {
      const list = [t] as Token[] & { links: unknown }
      list.links = links
      return { type: t.type, html: parser(list as never) as string }
    })
}

export function renderMarkdown(md: string): string {
  return toBlocks(md).map((b) => b.html).join('\n')
}
