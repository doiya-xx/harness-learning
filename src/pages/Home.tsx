import { useRef } from 'react'
import { Link } from 'react-router'
import { useHeroIntro, useStepsReveal } from '../motion/hooks'

const steps = [
  ['核心库', 'loop、工具、上下文、权限，只产出事件，不负责显示。'],
  ['Subagent', '给子任务一份干净的上下文，只带回结论。'],
  ['MCP', '用 JSON-RPC 接入外部工具，并控制它占用的上下文。'],
  ['接口层', 'stdio JSONL 或 HTTP，让 TUI、IDE 和 Web 共用同一个核心。'],
]

export default function Home() {
  const hero = useRef<HTMLDivElement>(null)
  const path = useRef<HTMLElement>(null)
  useHeroIntro(hero)
  useStepsReveal(path)
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div ref={hero} className="relative border border-line p-6 sm:p-12">
        {['left-1 top-1', 'right-1 top-1', 'left-1 bottom-1', 'right-1 bottom-1'].map((p) => (
          <span key={p} className={'corner ' + p} aria-hidden="true">+</span>
        ))}
        <h1 data-hero-title className="display m-0">Harness from the inside</h1>
        <p data-hero-rest className="mt-8 max-w-[40ch] text-lg">
          一份关于 coding agent harness 的学习资料站：agent loop、工具、subagent、MCP 与接口层。
        </p>
        <div data-hero-rest className="mt-8">
          <Link to="/articles" className="btn">浏览文章 →</Link>
        </div>
      </div>
      <section ref={path} className="mt-12" aria-labelledby="path-h">
        <h2 id="path-h" className="m-0 text-3xl font-extrabold tracking-tight">学习路径</h2>
        <ol className="mt-6 grid list-none grid-cols-1 border-l border-t border-line p-0 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} data-step className="border-b border-r border-line p-5">
              <div className="mono text-blue">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="mb-2 mt-3 text-xl font-bold">{t}</h3>
              <p className="m-0 text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
