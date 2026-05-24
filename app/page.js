'use client'

import { useState, useRef } from 'react'

export default function Home() {
  const [image, setImage] = useState(null)       // base64 data URL
  const [preview, setPreview] = useState(null)    // for display
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [targetPlayer, setTargetPlayer] = useState('')
  const inputRef = useRef()

  function handleFile(file) {
    if (!file) return
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result, 800)
      setImage(compressed)
      setPreview(URL.createObjectURL(file))
    }
    reader.readAsDataURL(file)
  }

  // 压缩图片：最大宽度 800px，JPEG 70% 质量（AI 分析够用就行）
  function compressImage(dataUrl, maxWidth) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const w = img.width * scale
        const h = img.height * scale
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = dataUrl
    })
  }

  async function handleAnalyze(target) {
    if (!image) return
    const name = target || targetPlayer
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort('timeout'), 55000)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, targetPlayer: name }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setResult(data)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('分析超时，请检查截图是否清晰或换一张试试')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function copy(text, idx) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
          🦆 鹅鸭杀 · 嘴替大师
        </h1>
        <p className="text-slate-400 mt-2">上传结算截图，AI 替你开口骂坑货、夸大腿</p>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-yellow-500 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {preview ? (
          <img src={preview} alt="截图预览" className="max-h-64 mx-auto rounded-lg" />
        ) : (
          <div className="text-slate-500">
            <div className="text-5xl mb-3">📸</div>
            <p className="text-lg">点击或拖拽上传截图</p>
            <p className="text-sm mt-1">支持 PNG / JPG</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Target player input */}
      {image && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="指定要嘴替的玩家（留空则全场随机）"
            value={targetPlayer}
            onChange={(e) => setTargetPlayer(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
          />
        </div>
      )}

      {/* Analyze button */}
      {image && (
        <button
          onClick={() => handleAnalyze()}
          disabled={loading}
          className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-red-500 text-white font-bold rounded-xl text-lg hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? '🤔 分析中...' : targetPlayer ? `🎯 嘴替 ${targetPlayer}` : '🔥 开始嘴替'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Player analysis */}
          {result.players?.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">📊 本局风云</h2>
              <div className="space-y-2">
                {result.players.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                    <span className={`text-xl ${p.judgment === '坑货' ? 'opacity-50' : ''}`}>
                      {emojiForRole(p.role)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-600 text-slate-300 shrink-0">
                          {p.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                          p.judgment === '大神' ? 'bg-yellow-600/50 text-yellow-300' :
                          p.judgment === '坑货' ? 'bg-red-600/50 text-red-300' :
                          'bg-slate-600/50 text-slate-300'
                        }`}>
                          {p.judgment}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{p.comment}</p>
                    </div>
                    <button
                      onClick={() => handleAnalyze(p.name)}
                      className="shrink-0 text-xs px-2 py-1 rounded bg-slate-600 hover:bg-yellow-600 transition-colors"
                      title={`专门嘴替 ${p.name}`}
                    >
                      🎯 针对 TA
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roast comments */}
          {result.roasts?.length > 0 && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-4 text-red-400">😈 坑货嘴替</h2>
              <div className="space-y-2">
                {result.roasts.map((text, i) => (
                  <CommentCard
                    key={`roast-${i}`}
                    text={text}
                    idx={`roast-${i}`}
                    copiedIndex={copiedIndex}
                    onCopy={copy}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Praise comments */}
          {result.praises?.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">👑 大腿夸夸</h2>
              <div className="space-y-2">
                {result.praises.map((text, i) => (
                  <CommentCard
                    key={`praise-${i}`}
                    text={text}
                    idx={`praise-${i}`}
                    copiedIndex={copiedIndex}
                    onCopy={copy}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* How to get API key */}
      <div className="mt-10 text-xs text-slate-600 text-center leading-relaxed">
        <p>💡 需要配置阿里云通义千问 API Key 才能使用</p>
        <p>部署时在 Vercel 设置环境变量 <code className="text-slate-400">DASHSCOPE_API_KEY</code></p>
      </div>
    </main>
  )
}

function emojiForRole(role) {
  if (role === '鹅' || role?.includes('鹅')) return '🦆'
  if (role === '鸭' || role?.includes('鸭')) return '🐤'
  if (role === '中立' || role?.includes('中立')) return '🦊'
  return '❓'
}

function CommentCard({ text, idx, copiedIndex, onCopy }) {
  return (
    <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3 group">
      <p className="flex-1 text-sm leading-relaxed">{text}</p>
      <button
        onClick={() => onCopy(text, idx)}
        className="shrink-0 px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors"
      >
        {copiedIndex === idx ? '✅ 已复制' : '📋 复制'}
      </button>
    </div>
  )
}
