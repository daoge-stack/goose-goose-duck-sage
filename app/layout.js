import './globals.css'

export const metadata = {
  title: '鹅鸭杀 · 嘴替大师',
  description: '上传鹅鸭杀结算截图，AI 自动分析谁是坑货谁是大腿',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
