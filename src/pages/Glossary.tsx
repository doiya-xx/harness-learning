import { useState } from 'react'
import { glossary } from '../content'

export default function Glossary() {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const rows = glossary.filter((g) =>
    !s || [g.term, g.zh, g.note, ...(g.aliases ?? [])].some((x) => x?.toLowerCase().includes(s)))
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="m-0 text-4xl font-extrabold tracking-tight">术语表</h1>
      <p className="text-mute">“不翻译”的词在译文中保持原样；“指定译法”的词必须使用统一译法。</p>
      <label className="mono mt-4 block" htmlFor="gq">搜索</label>
      <input id="gq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="term / 译法"
        className="mt-1 w-full max-w-md border border-ink bg-transparent px-3 py-2 text-ink" />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="mono border-b border-ink">
              <th className="py-2 pr-4">术语</th><th className="py-2 pr-4">策略</th><th className="py-2 pr-4">中文译法</th><th className="py-2">备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.term} className="border-b border-line align-top">
                <td className="py-2 pr-4 font-bold">{g.term}</td>
                <td className="mono py-2 pr-4">{g.policy === 'keep' ? '不翻译' : '指定译法'}</td>
                <td className="py-2 pr-4">{g.zh ?? '—'}</td>
                <td className="py-2 text-mute">{g.note || ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="py-4 text-mute">没有匹配项。</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
