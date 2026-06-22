/**
 * ai.js — AI 智能生题模块
 * 支持：DeepSeek / 豆包（字节）/ 通义千问 / OpenAI 兼容接口
 */

// ===== AI 服务商配置 =====

// 内置免费代理：Cloudflare Workers AI（LLaVA / Llama3）
// 用户可一键部署到自己的 Cloudflare 免费账号（见 proxy/cloudflare-worker.js）
// 也可在设置中覆盖为自己的 API Key
const FREE_WORKER_URL = localStorage.getItem('free_worker_url') || '';

const PROVIDERS = {
  free: {
    name: '免费（Cloudflare）',
    endpoint: FREE_WORKER_URL || 'https://kids-memory-ai.YOUR-SUBDOMAIN.workers.dev',
    model: 'llama-3',
    visionModel: 'llava',
    headers: () => ({ 'Content-Type': 'application/json' })
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    visionModel: 'deepseek-chat',
    headers: key => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` })
  },
  doubao: {
    name: '豆包',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'ep-20250101-xxxxxx',
    visionModel: 'ep-vision-xxxxxx',  // 需用户填写视觉模型 endpoint
    headers: key => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` })
  },
  qwen: {
    name: '通义千问',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
    visionModel: 'qwen-vl-plus',  // 千问VL支持图片
    headers: key => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` })
  },
  openai: {
    name: 'OpenAI 兼容',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    visionModel: 'gpt-4o',
    headers: key => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` })
  }
};

// ===== 系统提示词模板 =====

function buildSystemPrompt() {
  return `你是一个专业的儿童教育助手，擅长制作适合中国中小学生的学习卡片。

你的任务是根据用户的要求，生成高质量的记忆卡片。

输出格式要求：
- 严格输出 JSON 数组，不要有任何其他文字
- 每个卡片对象包含以下字段：
  - front: 正面内容（问题/单词/概念）
  - back: 背面内容（答案/释义/解释）
  - phonetic: 音标（仅英语单词需要，其他留空字符串）
  - hint: 记忆提示（帮助记忆的联想或技巧，可以留空字符串）
  - example: 例句或例子（可以留空字符串）
  - tags: 标签数组（如 ["小学四年级","名词","动物"]）
  - type: 卡片类型（"word"=单词, "sentence"=句子, "poem"=古诗, "formula"=公式, "concept"=概念, "qa"=问答）

示例输出：
[
  {
    "front": "beautiful",
    "back": "美丽的 /ˈbjuːtɪfəl/",
    "phonetic": "/ˈbjuːtɪfəl/",
    "hint": "beau(美)+ti+ful，想象一个美丽的人",
    "example": "She is a beautiful girl.",
    "tags": ["形容词","小学五年级"],
    "type": "word"
  }
]

注意事项：
1. 卡片内容要准确，适合目标年级
2. 提示要有助于记忆（联想法、谐音、图像等）
3. 例句要简单易懂，贴近学生生活
4. 数量要精确符合要求`;
}

function buildUserPrompt(subject, grade, userInput, count) {
  const subjectNames = {
    english: '英语', chinese: '语文', math: '数学', custom: '自定义'
  };
  const subjectName = subjectNames[subject] || subject;

  let basePrompt = `请为${grade}的学生生成 ${count} 张${subjectName}学习卡片。`;

  if (userInput?.trim()) {
    basePrompt += `\n\n具体要求：${userInput}`;
  } else {
    const defaults = {
      english: `生成${count}个常用英语单词，包含中文释义、音标和例句`,
      chinese: `生成${count}张语文学习卡片，可包含古诗填空、成语、生字等`,
      math: `生成${count}张数学公式或概念卡片，要有例子和记忆提示`,
      custom: `生成${count}张综合学习卡片`
    };
    basePrompt += `\n\n默认要求：${defaults[subject] || defaults.custom}`;
  }

  basePrompt += `\n\n直接输出 JSON 数组，不要有任何其他文字。`;
  return basePrompt;
}

// ===== 主调用函数 =====

/**
 * @param {Object} config
 * @param {string} config.provider  — deepseek|doubao|qwen|openai
 * @param {string} config.apiKey
 * @param {string} config.endpoint  — 自定义接口地址（可选）
 * @param {string} config.subject   — english|chinese|math|custom
 * @param {string} config.grade     — 如"小学四年级"
 * @param {string} config.prompt    — 用户自定义提示词
 * @param {number} config.count     — 生成数量
 * @param {Function} onStatus       — 状态回调 (msg) => void
 * @returns {Promise<Array>}        — 卡片数组
 */
export async function generateCards(config, onStatus) {
  const { provider, apiKey, endpoint: customEndpoint, subject, grade, prompt: userPrompt, count } = config;
  const workerUrl = localStorage.getItem('free_worker_url') || '';

  const isFree = provider === 'free' || (!apiKey && workerUrl);
  if (!apiKey && !workerUrl) throw new Error('未配置 AI，请先在设置中填写 API Key 或 Worker URL');

  const providerCfg = PROVIDERS[isFree ? 'free' : (provider || 'deepseek')] || PROVIDERS.deepseek;
  const endpoint    = customEndpoint || (isFree ? workerUrl : providerCfg.endpoint);
  const model       = providerCfg.model;

  onStatus?.('正在连接 AI 服务...');

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user',   content: buildUserPrompt(subject, grade, userPrompt, count) }
  ];

  // 免费 Worker 用简化格式
  const body = isFree
    ? JSON.stringify({ messages, subject, grade, count })
    : JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096, stream: false });

  onStatus?.('AI 正在生成卡片，请稍候...');

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: isFree
        ? { 'Content-Type': 'application/json' }
        : providerCfg.headers(apiKey),
      body
    });
  } catch (e) {
    throw new Error(`网络请求失败：${e.message}。请检查网络连接或 API 地址。`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401) throw new Error('API Key 无效，请检查设置');
    if (response.status === 429) throw new Error('请求太频繁，请稍后再试');
    throw new Error(`AI 接口错误 ${response.status}：${errText.slice(0, 100)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) throw new Error('AI 返回内容为空');

  onStatus?.('正在解析生成结果...');

  return parseAIResponse(content);
}

function parseAIResponse(content) {
  // 尝试提取 JSON 数组（去掉 markdown 代码块等）
  let jsonStr = content.trim();

  // 去掉 ```json ... ``` 包装
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // 找到第一个 [ 到最后一个 ]
  const start = jsonStr.indexOf('[');
  const end   = jsonStr.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('AI 返回格式错误，未找到 JSON 数组');

  jsonStr = jsonStr.slice(start, end + 1);

  let cards;
  try {
    cards = JSON.parse(jsonStr);
  } catch (e) {
    // 尝试修复常见 JSON 错误（末尾逗号等）
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
    try {
      cards = JSON.parse(jsonStr);
    } catch (e2) {
      throw new Error('AI 返回的 JSON 格式无效，请重试');
    }
  }

  if (!Array.isArray(cards)) throw new Error('AI 返回数据格式错误');

  // 标准化每张卡片
  return cards.map((c, i) => ({
    front:    String(c.front    || c.question || c.word || '').trim(),
    back:     String(c.back     || c.answer   || c.meaning || '').trim(),
    phonetic: String(c.phonetic || '').trim(),
    hint:     String(c.hint     || c.tip     || '').trim(),
    example:  String(c.example  || c.eg      || '').trim(),
    tags:     Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['AI生成']),
    type:     c.type || 'word'
  })).filter(c => c.front && c.back);
}

// ===== UI 事件绑定（在 ui.js 中调用）=====

export function initAIModal() {
  // Provider tabs 切换
  document.querySelectorAll('[data-provider]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-provider]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('btn-ai-cancel')?.addEventListener('click', () => {
    document.getElementById('ai-generate-modal')?.classList.add('hidden');
  });

  document.getElementById('btn-ai-submit')?.addEventListener('click', handleAIGenerate);
}

export async function handleAIGenerate() {
  // 弹窗内选中的 provider tab
  const modal     = document.getElementById('ai-generate-modal');
  const provider  = modal?.querySelector('[data-provider].active')?.dataset.provider || 'free';
  const apiKey    = localStorage.getItem('ai_key') || '';
  const workerUrl = localStorage.getItem('free_worker_url') || '';
  const endpoint  = localStorage.getItem('ai_endpoint') || '';
  const subject   = document.getElementById('ai-subject-select')?.value || 'english';
  const grade     = document.getElementById('ai-grade-select')?.value || '小学三年级';
  const userPrompt = document.getElementById('ai-prompt-input')?.value || '';
  const count     = parseInt(document.getElementById('ai-count')?.value || '20');

  // 需要至少有 Key 或 Worker URL 之一
  if (!apiKey && !workerUrl) {
    alert('请先在「设置→AI配置」中填写 API Key 或部署免费 Worker');
    return;
  }

  const statusEl  = document.getElementById('ai-status');
  const statusText = document.getElementById('ai-status-text');
  const submitBtn  = document.getElementById('btn-ai-submit');

  statusEl?.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const cards = await generateCards(
      { provider, apiKey, endpoint, subject, grade, prompt: userPrompt, count },
      msg => { if (statusText) statusText.textContent = msg; }
    );

    if (!cards.length) throw new Error('生成了0张卡片，请调整提示词后重试');

    document.getElementById('ai-generate-modal')?.classList.add('hidden');

    document.dispatchEvent(new CustomEvent('ai-cards-ready', {
      detail: { cards, suggestedName: `AI生成-${grade}${subject === 'english' ? '英语' : subject === 'chinese' ? '语文' : '数学'}` }
    }));

  } catch (e) {
    if (statusText) statusText.textContent = `生成失败：${e.message}`;
    setTimeout(() => statusEl?.classList.add('hidden'), 3000);
  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
}

// ===== AI 图片智能解析 =====

/**
 * 将图片发给支持视觉的 AI 模型，直接解析成卡片数组
 * @param {File} imageFile
 * @param {Function} onStatus  — 进度回调
 * @returns {Promise<{cards: Array, suggestedName: string}>}
 */
export async function parseImageWithAI(imageFile, onStatus) {
  const apiKey      = localStorage.getItem('ai_key') || '';
  const provider    = localStorage.getItem('ai_provider') || (apiKey ? 'deepseek' : 'free');
  const customEndpoint = localStorage.getItem('ai_endpoint') || '';
  const workerUrl   = localStorage.getItem('free_worker_url') || '';

  // 没有任何配置
  if (!apiKey && !workerUrl) {
    throw new Error('请先在设置中配置 AI（填写 API Key 或部署免费 Worker）');
  }

  onStatus?.('正在读取图片...');
  const base64   = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const providerCfg = PROVIDERS[provider] || PROVIDERS.free;
  const useEndpoint = customEndpoint || (provider === 'free' ? workerUrl : providerCfg.endpoint);
  const model       = providerCfg.visionModel || providerCfg.model;

  onStatus?.(`正在用 AI 识别图片（${providerCfg.name}）...`);

  const systemPrompt = `你是一个专业的教育助手，擅长从图片中提取学习内容并制作记忆卡片。

请仔细识别图片中的所有文字内容，然后将其整理成学习卡片。

输出要求：
- 严格输出 JSON 数组，不要有任何其他文字
- 每个对象包含：front（正面/问题）、back（背面/答案）、hint（记忆提示，可留空）、tags（标签数组）、type（word/qa/poem/formula）
- 如果图片是单词表：front=英文单词，back=中文含义+音标
- 如果图片是古诗：front=上句+"___"，back=下句
- 如果图片是数学公式：front=公式名称，back=公式内容+示例
- 如果图片是问答题：front=问题，back=答案
- 内容要准确，不要猜测看不清的字

直接输出JSON数组。`;

  // 免费 Worker 用简化格式（Worker 内部处理）
  // 标准视觉 API 用 OpenAI multimodal 格式
  const body = provider === 'free'
    ? JSON.stringify({
        type: 'vision',
        image: `data:${mimeType};base64,${base64}`,
        prompt: systemPrompt + '\n请识别图片中的所有学习内容，整理成记忆卡片的JSON格式。'
      })
    : JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: 'text', text: '请识别图片中的所有学习内容，整理成记忆卡片的JSON格式。' }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4096
      });

  let response;
  try {
    response = await fetch(useEndpoint, {
      method: 'POST',
      headers: provider === 'free'
        ? { 'Content-Type': 'application/json' }
        : providerCfg.headers(apiKey),
      body
    });
  } catch (e) {
    throw new Error(`网络请求失败：${e.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401) throw new Error('API Key 无效，请检查设置');
    if (response.status === 400) {
      // 该模型可能不支持视觉，尝试降级提示
      throw new Error(`该模型不支持图片识别，请在设置中配置支持视觉的模型（如 qwen-vl-plus、gpt-4o）`);
    }
    throw new Error(`AI 接口错误 ${response.status}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('AI 返回内容为空');

  onStatus?.('正在解析 AI 识别结果...');
  const cards = parseAIResponse(content);

  if (!cards.length) throw new Error('未能从图片中提取到有效内容，请尝试更清晰的图片');

  return {
    cards,
    suggestedName: imageFile.name.replace(/\.[^.]+$/, '') + '-AI解析'
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 判断是否有可用的 AI 配置（Key 或免费 Worker URL）
 */
export function hasAIKey() {
  return !!(localStorage.getItem('ai_key') || localStorage.getItem('free_worker_url'));
}
