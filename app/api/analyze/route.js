const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

// 系统 Prompt：引导 AI 分析鹅鸭杀截图并返回结构化 JSON
const SYSTEM_PROMPT = `你是一个鹅鸭杀(Goose Goose Duck)游戏分析专家。分析用户上传的游戏结算截图，返回严格的 JSON 格式。

分析规则：
1. 识别每个玩家的昵称、角色类别（鹅/鸭/中立）、存活状态、关键数据
2. 根据数据评判表现：
   - 大神标准：鹅完成任务多、正确投票；鸭击杀多、存活到最后、混淆视听成功
   - 坑货标准：鹅挂机不做任务、乱投票；鸭 0 杀被投出、自爆、刀队友
   - 一般的中间状态标为"正常"
3. 生成 3 条嘲讽坑队友的文案（幽默犀利，不要人身攻击）
4. 生成 2 条夸赞大腿的文案

返回格式必须严格的 JSON（不要 markdown 代码块，只返回纯 JSON）：
{
  "players": [
    {
      "name": "昵称",
      "role": "鹅/鸭/中立",
      "status": "存活/死亡",
      "judgment": "大神/正常/坑货",
      "comment": "一句话表现点评"
    }
  ],
  "roasts": ["坑队友文案1", "坑队友文案2", "坑队友文案3"],
  "praises": ["大腿文案1", "大腿文案2"]
}`

export async function POST(req) {
  try {
    // 检查 API Key
    if (!DASHSCOPE_API_KEY) {
      return Response.json(
        { error: '未配置 API Key，请在环境变量中设置 DASHSCOPE_API_KEY' },
        { status: 500 }
      )
    }

    const { image } = await req.json()
    if (!image) {
      return Response.json({ error: '请上传截图' }, { status: 400 })
    }

    // 校验 base64 图片大小（限制 10MB）
    const sizeInBytes = (image.length * 3) / 4
    if (sizeInBytes > 10 * 1024 * 1024) {
      return Response.json({ error: '图片太大，请压缩后上传（最大 10MB）' }, { status: 400 })
    }

    // 调用 DashScope 多模态 API
    const body = {
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: image },
              { text: '分析这张鹅鸭杀游戏结算截图' },
            ],
          },
        ],
      },
      parameters: {
        result_format: 'message',
        max_tokens: 2000,
        temperature: 0.8,
      },
    }

    const resp = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await resp.json()

    if (!resp.ok) {
      console.error('DashScope error:', JSON.stringify(data))
      return Response.json(
        { error: `AI 服务错误: ${data?.message || data?.code || '未知错误'}` },
        { status: 502 }
      )
    }

    // 解析 AI 返回内容
    const content = data?.output?.choices?.[0]?.message?.content
    if (!content) {
      return Response.json({ error: 'AI 返回为空，请重试' }, { status: 502 })
    }

    // 提取 JSON（AI 可能用 ```json 包裹）
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/{[\s\S]*}/)
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
    const parsed = JSON.parse(jsonStr)

    // 验证返回结构
    if (!parsed.players && !parsed.roasts && !parsed.praises) {
      return Response.json({ error: 'AI 返回格式异常，请重试' }, { status: 502 })
    }

    return Response.json({
      players: parsed.players || [],
      roasts: parsed.roasts || [],
      praises: parsed.praises || [],
    })
  } catch (err) {
    console.error('Analyze error:', err)
    return Response.json(
      { error: err.message || '服务器内部错误' },
      { status: 500 }
    )
  }
}
