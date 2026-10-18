import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, Link, useLocation } from 'react-router'
import { themeFlash, useRuler, useRefreshOn } from './motion/hooks'
import Home from './pages/Home'
import Articles from './pages/Articles'
import Glossary from './pages/Glossary'

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch { /* ignore */ }
    setTheme(next)
    themeFlash()
  }
  return { theme, toggle }
}

function Ruler() {
  const cursor = useRef<HTMLDivElement>(null)
  useRuler(cursor)
  return (
    <div className="ruler" aria-hidden="true">
      <div ref={cursor} className="ruler-cursor" />
    </div>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  'mono px-3 py-4 no-underline border-b-2 ' + (isActive ? 'border-blue text-blue' : 'border-transparent text-ink hover:text-blue')

export default function App() {
  const { theme, toggle } = useTheme()
  const loc = useLocation()
  useRefreshOn(loc.pathname)
  useEffect(() => {
    if (!loc.pathname.startsWith('/articles')) window.scrollTo(0, 0)
  }, [loc.pathname])
  return (
    <div className="min-h-screen lg:pr-7">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-bg focus:p-2">跳到正文</a>
      <header data-theme-anim className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg px-4 sm:px-6">
        <Link to="/" className="font-extrabold tracking-tight no-underline text-ink">HARNESS<span className="text-blue">/</span>LEARNING</Link>
        <nav className="flex items-center" aria-label="主导航">
          <NavLink to="/" end className={navCls}>01 首页</NavLink>
          <NavLink to="/articles" className={navCls}>02 文章</NavLink>
          <NavLink to="/glossary" className={navCls}>03 术语</NavLink>
          <button type="button" onClick={toggle} aria-label="切换明暗主题" aria-pressed={theme === 'dark'}
            className="mono ml-2 cursor-pointer border border-ink bg-transparent px-2 py-1 text-ink hover:border-blue hover:text-blue">
            {theme === 'dark' ? '亮' : '暗'}
          </button>
        </nav>
      </header>
      <Ruler />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<Articles />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="*" element={<div className="p-8">页面不存在。<Link to="/" className="text-blue underline">回首页</Link></div>} />
        </Routes>
      </main>
    </div>
  )
}
