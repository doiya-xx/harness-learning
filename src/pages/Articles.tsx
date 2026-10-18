import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { articles, categories, renderMarkdown, toBlocks, type Article } from '../content'
import { gsap, ScrollTrigger, useGSAP, NO_REDUCE } from '../motion/gsap'
import { scrollToEl, useArticleSwitch, useTocSync } from '../motion/hooks'

type Mode = 'zh' | 'en' | 'both'

function readMode(): Mode {
  try {
    const v = localStorage.getItem('lang-mode')
    if (v === 'zh' || v === 'en' || v === 'both') return v
  } catch { /* ignore */ }
  return 'zh'
}

function Orig({ html, onGone }: { html: string; onGone?: () => void }) {
  void onGone
  return <div lang="en" className="orig" dangerouslySetInnerHTML={{ __html: html }} />
}

function BlockView({ zh, en, force, translatable }: { zh: string; en?: string; force: boolean; translatable: boolean }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const eff = (force || open) && !!en
  const first = useRef(true)

  useEffect(() => { if (eff) setMounted(true) }, [eff])

  useGSAP(() => {
    const el = wrap.current
    if (!el) return
    const mm = gsap.matchMedia()
    const done = () => ScrollTrigger.refresh()
    mm.add(NO_REDUCE, () => {
      if (eff) gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out', onComplete: done })
      else if (!first.current) gsap.to(el, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => { setMounted(false); done() } })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (!eff) setMounted(false)
      done()
    })
    first.current = false
    return () => mm.revert()
  }, { scope: wrap, dependencies: [eff, mounted], revertOnUpdate: false })

  return (
    <div className="group lg:relative">
      {translatable && en && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={eff} disabled={force}
          className="mono mb-1 block cursor-pointer border border-line bg-transparent px-1.5 py-0.5 text-mute hover:border-blue hover:text-blue disabled:cursor-default disabled:opacity-50 lg:absolute lg:-left-16 lg:top-1 lg:mb-0">
          原文
        </button>
      )}
      <div dangerouslySetInnerHTML={{ __html: zh }} />
      {mounted && en && <div ref={wrap} style={{ overflow: 'hidden' }}><Orig html={en} /></div>}
    </div>
  )
}

function Body({ a, mode }: { a: Article; mode: Mode }) {
  const zhBlocks = useMemo(() => (a.zh ? toBlocks(a.zh) : []), [a])
  const enBlocks = useMemo(() => (a.en ? toBlocks(a.en) : []), [a])
  if (a.kind === 'link') return <div dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body ?? '') }} />
  if (mode === 'en' || !zhBlocks.length) return <div lang="en" dangerouslySetInnerHTML={{ __html: enBlocks.map((b) => b.html).join('\n') }} />
  return (
    <>
      {zhBlocks.map((b, i) => (
        <BlockView key={a.slug + i} zh={b.html} en={enBlocks[i]?.html} force={mode === 'both'}
          translatable={b.type !== 'code' && enBlocks[i]?.type === b.type} />
      ))}
    </>
  )
}

export default function Articles() {
  const { slug } = useParams()
  const cats = useMemo(categories, [])
  const article = articles.find((a) => a.slug === slug)
  const [mode, setModeState] = useState<Mode>(readMode)
  const [drawer, setDrawer] = useState(false)
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([])
  const [active, setActive] = useState('')
  const content = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)

  const setMode = (m: Mode) => {
    setModeState(m)
    try { localStorage.setItem('lang-mode', m) } catch { /* ignore */ }
  }

  useArticleSwitch(content, slug ?? '')

  // build TOC from rendered headings (excluding expanded originals)
  useEffect(() => {
    const root = content.current
    if (!root) return
    const hs = Array.from(root.querySelectorAll<HTMLElement>('h2, h3')).filter((h) => !h.closest('.orig'))
    const items = hs.map((h, i) => {
      h.id = `sec-${i}`
      return { id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 }
    })
    setToc((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items))
    setActive('')
    window.scrollTo(0, 0)
    ScrollTrigger.refresh()
  }, [slug, mode])

  useEffect(() => { setDrawer(false) }, [slug])
  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 50); return () => clearTimeout(t) }, [drawer])

  useTocSync(page, toc.map((t) => t.id), setActive)

  if (!slug && articles.length) return <Navigate to={`/articles/${articles[0].slug}`} replace />

  const tocUi = toc.length > 0 && (
    <nav aria-label="目录">
      <div className="mono mb-2 text-mute">目录</div>
      <ul className="m-0 list-none p-0">
        {toc.map((t) => (
          <li key={t.id} className={t.level === 3 ? 'pl-3' : ''}>
            <a href={`#${t.id}`} onClick={(e) => { e.preventDefault(); scrollToEl(t.id) }}
              aria-current={active === t.id ? 'location' : undefined}
              className={'block border-l-2 py-1 pl-2 text-sm no-underline ' + (active === t.id ? 'border-blue text-blue' : 'border-line text-mute hover:text-ink')}>
              {t.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div ref={page} className="mx-auto grid max-w-[88rem] grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      <button type="button" className="mono m-3 cursor-pointer border border-ink bg-transparent px-3 py-2 text-ink lg:hidden"
        aria-expanded={drawer} aria-controls="sidebar" onClick={() => setDrawer((d) => !d)}>
        {drawer ? '关闭分类' : '分类列表'}
      </button>
      <aside id="sidebar" aria-label="文章分类"
        className={(drawer ? 'block' : 'hidden') + ' border-line bg-bg px-4 py-4 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-72 max-lg:overflow-y-auto max-lg:border-r max-lg:pt-16 lg:sticky lg:top-14 lg:block lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-r'}>
        {drawer && <button type="button" onClick={() => setDrawer(false)} className="mono absolute right-3 top-3 cursor-pointer border border-ink bg-transparent px-2 py-1 text-ink lg:hidden">关闭</button>}
        {cats.map((c) => (
          <div key={c.cat} className="mb-5">
            <div className="mono mb-1 text-mute">{c.cat}</div>
            <ul className="m-0 list-none p-0">
              {c.items.map((a) => (
                <li key={a.slug}>
                  <Link to={`/articles/${a.slug}`} aria-current={a.slug === slug ? 'page' : undefined}
                    className={'block border-l-2 py-1 pl-2 text-sm no-underline ' + (a.slug === slug ? 'border-blue font-bold text-ink' : 'border-transparent text-mute hover:text-ink')}>
                    {a.title}{a.kind === 'link' && <span className="mono ml-1 text-blue">外链</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <article ref={content} className="min-w-0 px-4 py-8 sm:px-8 lg:pl-20">
        {!article ? (
          <p>文章不存在。</p>
        ) : (
          <>
            <div className="mono text-mute">{article.cat}</div>
            <h1 className="my-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{article.title}</h1>
            <div className="text-sm text-mute">
              来源：{article.link ? <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue underline">{article.source || article.link}</a> : article.source}
              {article.license && <> · 许可证：{article.license}</>}
              {article.fetched && <> · 收录：{article.fetched}</>}
            </div>
            {article.translation === 'machine' && <div className="mono mt-2 border border-line px-2 py-1 text-mute">机器翻译，以原文为准</div>}
            {article.kind === 'link' && article.link && (
              <p className="mt-4"><a className="btn" href={article.link} target="_blank" rel="noopener noreferrer">打开原文 ↗</a></p>
            )}
            {article.kind === 'bilingual' && (
              <div role="group" aria-label="显示语言" className="mt-4 inline-flex border border-ink">
                {([['zh', '中文'], ['en', '原文'], ['both', '对照']] as [Mode, string][]).map(([m, l]) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    className={'mono cursor-pointer border-0 px-3 py-1 ' + (mode === m ? 'bg-ink text-bg' : 'bg-transparent text-ink hover:text-blue')}>{l}</button>
                ))}
              </div>
            )}
            <div className="mt-4 lg:hidden">{tocUi}</div>
            <div className="prose-body mt-6" lang={article.kind === 'bilingual' && mode === 'en' ? 'en' : 'zh-CN'}>
              <Body a={article} mode={mode} />
            </div>
          </>
        )}
      </article>

      <aside className="hidden px-4 py-8 lg:sticky lg:top-14 lg:block lg:max-h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto" aria-label="本页目录">
        {tocUi}
      </aside>
    </div>
  )
}
