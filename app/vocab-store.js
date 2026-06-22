/**
 * vocab-store.js — 词库商店
 * 支持在线下载：ECDICT / HSK / 教育部汉字 / PEP小学英语 / 初中课标
 * 下载后直接生成本地牌组，存入 IndexedDB
 */

import { DeckManager, CardManager, ProfileManager } from './core.js';

// ===== 镜像配置 =====
const MIRRORS = {
  jsdelivr: 'https://cdn.jsdelivr.net/gh',
  ghproxy:  'https://ghproxy.com/https://raw.githubusercontent.com',
  github:   'https://raw.githubusercontent.com',
  local:    ''   // 仅用本地内置
};

function getBaseUrl() {
  return MIRRORS[localStorage.getItem('store_mirror') || 'jsdelivr'];
}

function githubRaw(repo, branch, path) {
  const base = getBaseUrl();
  if (!base) return null;
  if (base.includes('jsdelivr')) {
    return `${base}/${repo}@${branch}/${path}`;
  }
  return `${base}/${repo}/${branch}/${path}`;
}

// ===== 词库目录 =====
// available: true = 本地文件存在，可立即下载
// available: false = 文件待补充，显示「准备中」
export const VOCAB_CATALOG = [
  // ─── 英语 ───
  {
    id: 'ecdict_basic', available: true,
    name:     'ECDICT 高频词汇（5000词）',
    desc:     '英汉词典高频词汇，含音标、词性、词频',
    category: 'english', grade: 'middle', subject: 'english',
    size: '~60KB', source: 'skywind3000/ECDICT',
    local: 'data/vocab-store/ecdict_5000.json',
    parser: 'cards_json', count: 5000
  },
  {
    id: 'ecdict_full', available: true,
    name:     'ECDICT 完整词库（60万词）',
    desc:     '英汉双解词典完整版。⚠ 文件约50MB，GitHub CDN 常限速，推荐先用「高频5000词版」',
    category: 'english', grade: 'adult', subject: 'english',
    size:     '~50MB',
    source:   'skywind3000/ECDICT',
    remote:   'skywind3000/ECDICT/master/ecdict.csv',
    parser:   'ecdict_csv',
    count:    600000,
    warning:  '文件约50MB，下载时间较长（WiFi约3-5分钟）。\n出现403/超时请切换下载源为「GitHub Proxy」后重试。\n若持续失败，建议使用「ECDICT高频5000词」版本。'
  },
  {
    id: 'pep_primary', available: true,
    name:     '人教版 PEP 小学英语词汇',
    desc:     '3-6年级全套词汇，含音标和中文释义',
    category: 'english', grade: 'primary', subject: 'english',
    size: '~60KB', source: '内置',
    local: 'data/vocab-store/pep_primary_1600.json',
    parser: 'cards_json', count: 1600
  },
  {
    id: 'nce_middle', available: true,
    name:     '初中英语新课标词汇（1600词）',
    desc:     '教育部新课标 7-9 年级核心词汇',
    category: 'english', grade: 'middle', subject: 'english',
    size: '~60KB', source: '内置',
    local: 'data/vocab-store/nce_middle_1600.json',
    parser: 'cards_json', count: 1600
  },
  {
    id: 'cet4', available: true,
    name:     '大学英语四级词汇（CET-4）',
    desc:     '大学英语四级考试核心词汇，含释义和例句',
    category: 'english', grade: 'adult', subject: 'english',
    size: '~180KB', source: '内置',
    local: 'data/vocab-store/cet4_words.json',
    parser: 'cards_json', count: 4500
  },
  {
    id: 'toefl', available: true,
    name:     '托福核心词汇（TOEFL 3500）',
    desc:     '托福考试高频词汇，适合高考及以上水平',
    category: 'english', grade: 'adult', subject: 'english',
    size: '~140KB', source: '内置',
    local: 'data/vocab-store/toefl_words.json',
    parser: 'cards_json', count: 3500
  },
  // ─── 汉语 ───
  {
    id: 'hsk1_3', available: true,
    name:     'HSK 1-3 级词汇（600词）',
    desc:     '汉语水平考试初级，含拼音、例句',
    category: 'chinese', grade: 'primary', subject: 'chinese',
    size: '~30KB', source: '内置（官方标准）',
    local: 'data/vocab-store/hsk1_3.json',
    parser: 'cards_json', count: 600
  },
  {
    id: 'hsk4_6', available: true,
    name:     'HSK 4-6 级词汇（4195词）',
    desc:     '汉语水平考试中高级，含解释和例句',
    category: 'chinese', grade: 'middle', subject: 'chinese',
    size: '~200KB', source: '内置（官方标准）',
    local: 'data/vocab-store/hsk4_6.json',
    parser: 'cards_json', count: 4195
  },
  {
    id: 'moe_3500', available: true,
    name:     '教育部 3500 常用字',
    desc:     '语文课标常用字表，含读音、笔画、组词',
    category: 'chinese', grade: 'primary', subject: 'chinese',
    size: '~250KB', source: '内置（国标）',
    local: 'data/vocab-store/moe_3500_chars.json',
    parser: 'cards_json', count: 3500
  },
  {
    id: 'moe_2500', available: true,
    name:     '教育部 2500 次常用字',
    desc:     '语文课标次常用字表，含读音和组词',
    category: 'chinese', grade: 'middle', subject: 'chinese',
    size: '~200KB', source: '内置（国标）',
    local: 'data/vocab-store/moe_2500_chars.json',
    parser: 'cards_json', count: 2500
  },
  {
    id: 'chinese_idioms', available: true,
    name:     '汉语成语词典（3000条）',
    desc:     '常用成语含出处、释义、例句',
    category: 'chinese', grade: 'primary', subject: 'chinese',
    size: '~300KB', source: '内置',
    local: 'data/vocab-store/chinese_idioms.json',
    parser: 'cards_json', count: 3000
  },
  // ─── 数学 ───
  {
    id: 'math_formulas_full', available: true,
    name:     '中小学数学公式大全',
    desc:     '小学到初中全套数学公式和概念，含例题',
    category: 'math', grade: 'primary', subject: 'math',
    size: '~80KB', source: '内置',
    local: 'data/vocab-store/math_formulas_full.json',
    parser: 'cards_json', count: 200
  }
];

// ===== 初始化 =====

let _currentProfile = null;

export function initVocabStore(profile) {
  _currentProfile = profile;
  bindStoreEvents();
}

function bindStoreEvents() {
  document.getElementById('btn-vocab-store')?.addEventListener('click', openVocabStore);
  document.getElementById('btn-vocab-store-back')?.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-library')?.classList.add('active');
    // 从词库商店返回时始终刷新题库
    document.dispatchEvent(new CustomEvent('refresh-library'));
  });

  document.getElementById('store-mirror-select')?.addEventListener('change', e => {
    localStorage.setItem('store_mirror', e.target.value);
  });

  // 分类筛选
  document.querySelectorAll('.store-cat-btn:not(.store-cat-add)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.store-cat-btn:not(.store-cat-add)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderVocabList(btn.dataset.cat);
    });
  });

  // 添加自定义词库
  document.getElementById('btn-add-custom-vocab')?.addEventListener('click', openAddVocabDialog);

  // 恢复用户之前保存的自定义词库
  restoreCustomVocabs();
}

function openVocabStore() {
  // 同步镜像选择
  const mirrorSel = document.getElementById('store-mirror-select');
  if (mirrorSel) mirrorSel.value = localStorage.getItem('store_mirror') || 'jsdelivr';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-vocab-store')?.classList.add('active');
  renderVocabList('all');
}

// ===== 渲染词库列表 =====

async function renderVocabList(category) {
  const list = document.getElementById('vocab-store-list');
  if (!list) return;

  const filtered = category === 'all'
    ? VOCAB_CATALOG
    : VOCAB_CATALOG.filter(v => v.category === category);

  // 获取已下载的词库 id（同时检查 vocabId 字段和牌组名称，兼容老数据）
  const decks = _currentProfile
    ? await DeckManager.getByProfile(_currentProfile.id)
    : [];
  const downloadedIds = new Set([
    ...decks.map(d => d.vocabId).filter(Boolean),
    // 按名称回退匹配（历史数据没有 vocabId 字段时）
    ...VOCAB_CATALOG
      .filter(v => decks.some(d => d.name === v.name))
      .map(v => v.id)
  ]);

  list.innerHTML = '';

  const groups = [
    { key: 'english', label: '🔤 英语词库' },
    { key: 'chinese', label: '文 汉语词库' },
    { key: 'math',    label: '∑ 数学题库' }
  ];

  for (const { key, label } of groups) {
    const items = filtered.filter(v => v.category === key);
    if (!items.length) continue;

    const section = document.createElement('div');
    section.className = 'store-section';
    section.innerHTML = `<div class="store-section-title">${label}</div>`;

    items.forEach(vocab => {
      const isDownloaded = downloadedIds.has(vocab.id);
      const card = document.createElement('div');
      card.className = 'store-vocab-card';
      card.dataset.id = vocab.id;

      card.innerHTML = `
        <div class="svc-info">
          <div class="svc-name">${vocab.name}</div>
          <div class="svc-desc">${vocab.desc}</div>
          <div class="svc-meta">
            <span class="svc-count">${vocab.count.toLocaleString()}词</span>
            <span class="svc-size">${vocab.size}</span>
            <span class="svc-source">${vocab.source}</span>
          </div>
          ${vocab.warning ? `<div class="svc-warning">⚠ ${vocab.warning}</div>` : ''}
        </div>
        <div class="svc-actions">
          ${isDownloaded
            ? `<div class="svc-downloaded">✓ 已下载</div>
               <button class="btn-svc-delete" data-id="${vocab.id}">删除</button>`
            : vocab.available === false
              ? `<div class="svc-coming-soon">数据更新中，请稍后</div>`
              : `<button class="btn-svc-download" data-id="${vocab.id}">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                     <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                   </svg>
                   下载
                 </button>`}
        </div>
      `;
      section.appendChild(card);
    });

    list.appendChild(section);
  }

  // 绑定下载/删除
  list.querySelectorAll('.btn-svc-download').forEach(btn => {
    btn.addEventListener('click', () => downloadVocab(btn.dataset.id));
  });
  list.querySelectorAll('.btn-svc-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteVocab(btn.dataset.id));
  });
}

// ===== 下载词库 =====

async function downloadVocab(vocabId) {
  const vocab = VOCAB_CATALOG.find(v => v.id === vocabId);
  if (!vocab) return;

  const card = document.querySelector(`.store-vocab-card[data-id="${vocabId}"]`);
  if (!card) return;

  // 显示进度
  const actionsEl = card.querySelector('.svc-actions');
  actionsEl.innerHTML = `
    <div class="svc-progress">
      <div class="svc-progress-bar" id="svc-bar-${vocabId}"></div>
    </div>
    <div class="svc-progress-text" id="svc-text-${vocabId}">准备中...</div>
  `;

  const setProgress = (pct, msg) => {
    const bar  = document.getElementById(`svc-bar-${vocabId}`);
    const text = document.getElementById(`svc-text-${vocabId}`);
    if (bar)  bar.style.width  = `${pct}%`;
    if (text) text.textContent = msg;
  };

  try {
    setProgress(5, '获取数据...');

    let cards;

    // 优先：localStorage 中的自定义文件
    if (vocab.local_storage_key) {
      setProgress(20, '读取本地文件...');
      const text = getCustomFileContent(vocab.local_storage_key);
      if (text) {
        setProgress(50, '解析中...');
        if (vocab.parser === 'ecdict_csv') {
          cards = parseECDICT(text, vocabId);
        } else {
          const data = JSON.parse(text);
          cards = data.cards || data;
        }
      }
    }

    // 其次：内置本地文件
    if (!cards && vocab.local) {
      setProgress(20, '读取内置数据...');
      const res = await fetch(vocab.local + '?t=' + Date.now());
      if (res.ok) {
        setProgress(50, '解析中...');
        const text = await res.text();
        if (vocab.parser === 'ecdict_csv') {
          cards = parseECDICT(text, vocabId);
        } else {
          const data = JSON.parse(text);
          cards = data.cards || data;
        }
      } else if (res.status === 404) {
        // 本地文件尚未内置，提示用户
        throw new Error(`词库数据文件暂未内置（${vocab.local.split('/').pop()}），请关注后续更新`);
      }
    }

    // 本地没有，从网络下载
    if (!cards && vocab.remote) {
      const mirror = localStorage.getItem('store_mirror') || 'jsdelivr';
      if (mirror === 'local') {
        throw new Error('此词库需要网络下载，请在上方切换下载源（推荐 jsDelivr）');
      }

      // 大文件需要用户确认
      if (vocab.warning) {
        if (!confirm(`⚠ ${vocab.warning}\n\n确定要下载吗？`)) {
          actionsEl.innerHTML = `<button class="btn-svc-download" data-id="${vocabId}">下载</button>`;
          actionsEl.querySelector('.btn-svc-download').addEventListener('click', () => downloadVocab(vocabId));
          return;
        }
      }

      // 构造下载 URL（格式: owner/repo/branch/path）
      const parts    = vocab.remote.split('/');
      const owner    = parts[0];
      const repo     = parts[1];
      const branch   = parts[2];
      const filePath = parts.slice(3).join('/');

      let url;
      if (mirror === 'jsdelivr') {
        url = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filePath}`;
      } else if (mirror === 'ghproxy') {
        url = `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      } else {
        url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }

      setProgress(20, '下载中...');
      let res;
      try {
        res = await fetchWithProgress(url, pct => setProgress(20 + pct * 0.5, `下载中 ${pct}%`));
      } catch (fetchErr) {
        // 网络失败时自动尝试备用镜像
        const fallbackUrl = `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        if (url !== fallbackUrl) {
          setProgress(20, '主源失败，尝试备用...');
          res = await fetchWithProgress(fallbackUrl, pct => setProgress(20 + pct * 0.5, `下载中 ${pct}%`));
        } else {
          throw new Error(`网络连接失败，请检查网络或切换下载源后重试`);
        }
      }
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`访问被限制（403）。请在上方将下载源切换为「GitHub Proxy」或「GitHub 直连」后重试`);
        }
        throw new Error(`下载失败（${res.status}），请切换下载源重试`);
      }
      setProgress(70, '解析中...');

      const text = await res.text();
      if (vocab.parser === 'ecdict_csv') {
        cards = parseECDICT(text, vocab.id);
      } else {
        const data = JSON.parse(text);
        cards = data.cards || data;
      }
    }

    if (!cards || !cards.length) throw new Error('词库数据为空');

    setProgress(85, `写入 ${cards.length.toLocaleString()} 条...`);

    // 写入 IndexedDB
    const profile = _currentProfile || (await ProfileManager.getAll())[0];
    if (!profile) throw new Error('请先选择学习档案');

    const deck = await DeckManager.create(
      profile.id,
      vocab.name,
      vocab.subject,
      vocab.grade,
      true
    );
    // 记录词库来源 id，并立即持久化（否则重启后 vocabId 丢失）
    deck.vocabId = vocabId;
    await DeckManager.update(deck);

    // 注入 subject，分批写入（避免 IndexedDB 事务超时）
    const BATCH = 500;
    const withSubject = cards.map(c => ({ ...c, subject: vocab.subject }));
    for (let i = 0; i < withSubject.length; i += BATCH) {
      await CardManager.bulkCreate(profile.id, deck.id, withSubject.slice(i, i + BATCH));
      setProgress(85 + Math.round((i / withSubject.length) * 12), `写入 ${Math.min(i + BATCH, withSubject.length).toLocaleString()}/${withSubject.length.toLocaleString()}...`);
    }

    setProgress(100, '完成！');

    // 刷新列表
    setTimeout(() => {
      renderVocabList(document.querySelector('.store-cat-btn.active')?.dataset.cat || 'all');
      toast(`已下载 ${cards.length.toLocaleString()} 条到「${vocab.name}」`);
      // 通知 ui.js 更新主页数据
      document.dispatchEvent(new CustomEvent('vocab-downloaded', { detail: { profileId: profile.id } }));
    }, 500);

  } catch (e) {
    actionsEl.innerHTML = `
      <div class="svc-error">下载失败：${e.message}</div>
      <button class="btn-svc-download" data-id="${vocabId}">重试</button>
    `;
    actionsEl.querySelector('.btn-svc-download')?.addEventListener('click', () => downloadVocab(vocabId));
  }
}

// ===== 删除词库 =====

async function deleteVocab(vocabId) {
  const vocab = VOCAB_CATALOG.find(v => v.id === vocabId);
  if (!vocab) return;
  if (!confirm(`确定删除「${vocab.name}」及其所有卡片吗？`)) return;

  const profile = _currentProfile;
  if (!profile) return;

  const decks = await DeckManager.getByProfile(profile.id);
  const target = decks.find(d => d.vocabId === vocabId);
  if (target) {
    await DeckManager.delete(target.id, profile.id);
    toast(`已删除「${vocab.name}」`);
    renderVocabList(document.querySelector('.store-cat-btn.active')?.dataset.cat || 'all');
    document.dispatchEvent(new CustomEvent('vocab-downloaded', { detail: { profileId: profile.id } }));
  }
}

// ===== 解析器 =====

function parseECDICT(csvText, vocabId) {
  const lines = csvText.split('\n');
  const cards = [];
  // ECDICT 格式：word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,...
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 4) continue;
    const word      = cols[0]?.trim();
    const phonetic  = cols[1]?.trim();
    const trans     = cols[3]?.trim();  // translation 列
    const frq       = parseInt(cols[9] || '0') || 0;

    if (!word || !trans || !word.match(/^[a-zA-Z'-]+$/) || word.length > 15) continue;
    if (word[0] === word[0].toUpperCase() && word[0].match(/[A-Z]/)) continue; // 过滤专有名词

    // 清理释义：取前3个意思
    const back = trans.replace(/\\n/g, '；').split(/[；;]/g).slice(0, 3).join('；').trim();
    if (!back) continue;

    cards.push({
      id:       `${vocabId}_${i}`,
      type:     'word',
      front:    word,
      back,
      phonetic: phonetic ? `/${phonetic}/` : '',
      hint:     '',
      example:  '',
      tags:     ['英语', '词汇']
    });
  }
  return cards;
}

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false, current = '';
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ===== 带进度的 fetch =====

async function fetchWithProgress(url, onProgress, timeoutMs = 300000) {
  // 用 AbortController 支持超时（默认5分钟，对50MB大文件足够）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const total  = parseInt(res.headers.get('content-length') || '0');
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress?.(Math.round(received / total * 100));
    else onProgress?.(Math.min(99, Math.round(received / 1024 / 10)));  // rough estimate
  }

  const allChunks = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { allChunks.set(chunk, offset); offset += chunk.length; }

  return new Response(allChunks, { headers: res.headers });
}

function toast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ===== 自定义词库管理 =====

let _customSources = [];

async function loadCustomSources() {
  try {
    const res = await fetch('data/vocab-store/custom_sources.json?t=' + Date.now());
    const data = await res.json();
    _customSources = (data.sources || []).filter(s => s.id);  // 过滤掉注释项
  } catch (_) {
    _customSources = [];
  }
}

/**
 * 添加自定义词库来源
 * 支持两种方式：
 *   1. 填写 JSON URL（网络）或选择本地 JSON/CSV 文件
 *   2. 保存到 custom_sources.json 并立即显示在词库列表中
 */
export function openAddVocabDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-vocab-modal';

  overlay.innerHTML = `
    <div class="modal">
      <h3>添加自定义词库</h3>
      <p class="setting-desc" style="margin-bottom:8px">
        支持两种方式：<br>
        ① 输入在线 JSON/CSV URL（如 GitHub Raw 链接）<br>
        ② 选择本地 JSON 文件（cards 数组格式）
      </p>

      <input type="text" id="add-vocab-name" placeholder="词库名称（必填）" style="margin-bottom:8px">
      <input type="text" id="add-vocab-url" placeholder="在线 URL（可选，如 https://.../.json）" style="margin-bottom:8px">

      <label class="import-card" for="add-vocab-file" style="padding:12px;margin-bottom:8px">
        <span class="import-icon" style="font-size:20px">📁</span>
        <span class="import-name">选择本地 JSON 文件</span>
        <span class="import-desc" id="add-vocab-filename">未选择</span>
        <input type="file" id="add-vocab-file" accept=".json,.csv" hidden>
      </label>

      <div style="display:flex;gap:8px;margin-bottom:4px">
        <select id="add-vocab-category" class="setting-select" style="flex:1">
          <option value="english">英语</option>
          <option value="chinese">汉语</option>
          <option value="math">数学</option>
        </select>
        <select id="add-vocab-grade" class="setting-select" style="flex:1">
          <option value="primary">小学</option>
          <option value="middle">初中</option>
          <option value="adult">成人</option>
        </select>
      </div>

      <div class="modal-buttons" style="margin-top:12px">
        <button class="btn-secondary" id="add-vocab-cancel">取消</button>
        <button class="btn-primary" id="add-vocab-save" style="flex:1">添加词库</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let selectedFile = null;

  document.getElementById('add-vocab-file').addEventListener('change', e => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
      document.getElementById('add-vocab-filename').textContent = selectedFile.name;
    }
  });

  document.getElementById('add-vocab-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('add-vocab-save').addEventListener('click', async () => {
    const name     = document.getElementById('add-vocab-name').value.trim();
    const url      = document.getElementById('add-vocab-url').value.trim();
    const category = document.getElementById('add-vocab-category').value;
    const grade    = document.getElementById('add-vocab-grade').value;

    if (!name) { toast('请填写词库名称'); return; }
    if (!url && !selectedFile) { toast('请输入 URL 或选择本地文件'); return; }

    const id = 'custom_' + Date.now();
    const entry = {
      id,
      name,
      desc:     '用户自定义词库',
      category,
      grade,
      subject:  category,
      size:     '自定义',
      source:   url ? url.slice(0, 40) + '...' : selectedFile?.name || '本地文件',
      count:    0,
      isCustom: true
    };

    if (url) {
      entry.remote = url;
      entry.parser = url.endsWith('.csv') ? 'ecdict_csv' : 'cards_json';
    } else if (selectedFile) {
      // 读取文件内容，存入 localStorage（临时），后续写到 IndexedDB
      const text   = await selectedFile.text();
      const stored = localStorage.getItem('custom_vocab_files')
        ? JSON.parse(localStorage.getItem('custom_vocab_files'))
        : {};
      stored[id] = text;
      localStorage.setItem('custom_vocab_files', JSON.stringify(stored));
      entry.local_storage_key = id;
      entry.parser = selectedFile.name.endsWith('.csv') ? 'ecdict_csv' : 'cards_json';
    }

    // 添加到 VOCAB_CATALOG（内存）
    VOCAB_CATALOG.push(entry);

    // 持久化到 localStorage（页面重载后恢复）
    const saved = localStorage.getItem('custom_vocab_catalog')
      ? JSON.parse(localStorage.getItem('custom_vocab_catalog'))
      : [];
    saved.push(entry);
    localStorage.setItem('custom_vocab_catalog', JSON.stringify(saved));

    overlay.remove();
    toast(`已添加词库：${name}`);
    renderVocabList(document.querySelector('.store-cat-btn.active')?.dataset.cat || 'all');
  });
}

/**
 * 从 localStorage 恢复用户之前添加的自定义词库
 */
export function restoreCustomVocabs() {
  const saved = localStorage.getItem('custom_vocab_catalog');
  if (!saved) return;
  try {
    const entries = JSON.parse(saved);
    entries.forEach(e => {
      if (!VOCAB_CATALOG.find(v => v.id === e.id)) {
        VOCAB_CATALOG.push(e);
      }
    });
  } catch (_) {}
}

/**
 * 从 localStorage 读取自定义文件内容（供 downloadVocab 使用）
 */
export function getCustomFileContent(storageKey) {
  const stored = localStorage.getItem('custom_vocab_files');
  if (!stored) return null;
  try { return JSON.parse(stored)[storageKey]; } catch (_) { return null; }
}

