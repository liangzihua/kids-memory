/**
 * kids-memory-ai-worker.js
 * Cloudflare Workers AI 免费代理
 *
 * 部署步骤（5分钟，完全免费）：
 * 1. 注册 Cloudflare 账号：https://cloudflare.com
 * 2. Workers & Pages → 创建 Worker → 粘贴本文件内容 → 部署
 * 3. 复制 Worker URL 填入小记忆 APP「设置→AI配置→免费 Worker URL」
 *
 * 免费额度：每天 100,000 次请求
 * 支持：文字生题 + 图片识别
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // ===== 图片识别模式 =====
      if (body.type === 'vision' && body.image) {
        const base64Match = body.image.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) {
          return Response.json({ error: '图片格式无效' }, { status: 400, headers: corsHeaders });
        }
        const imageData = base64Match[2];
        const prompt    = body.prompt || '请识别图片中的学习内容，以JSON数组格式输出，每项包含front(问题)和back(答案)字段。';

        const result = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
          prompt,
          image: [...atob(imageData)].map(c => c.charCodeAt(0))
        });

        const text     = result.description || result.response || '';
        const jsonText = extractJSON(text);
        return Response.json({
          choices: [{ message: { content: jsonText || text } }]
        }, { headers: corsHeaders });
      }

      // ===== 文字生题模式 =====
      const messages = body.messages || [];
      const sysMsg   = messages.find(m => m.role === 'system')?.content || '';
      const userMsg  = messages.find(m => m.role === 'user')?.content || '';

      const fullPrompt = body.subject
        ? `${sysMsg}\n\n科目：${body.subject}，年级：${body.grade || '小学三年级'}，数量：${body.count || 20}`
        : sysMsg;

      const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: fullPrompt },
          { role: 'user',   content: typeof userMsg === 'string' ? userMsg : JSON.stringify(userMsg) }
        ],
        max_tokens: 3000,
        temperature: 0.7
      });

      const content  = result.response || '';
      const jsonText = extractJSON(content);

      return Response.json({
        choices: [{ message: { content: jsonText || content } }]
      }, { headers: corsHeaders });

    } catch (err) {
      console.error(err);
      return Response.json(
        { error: `Worker 错误：${err.message}` },
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

function extractJSON(text) {
  let s = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim();
  const start = s.indexOf('[');
  const end   = s.lastIndexOf(']');
  if (start !== -1 && end !== -1) return s.slice(start, end + 1);
  return s;
}
