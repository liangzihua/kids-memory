/**
 * recitation.js — 古诗/文言文背诵模式
 * 支持：完整原文朗读 / 段落填空 / 背诵测评（语音）
 */

import { speak, speakChinese, startListening, SpeechSupport } from './speech.js';
import { levenshtein } from './speech.js';
import { DeckManager, CardManager, ProfileManager } from './core.js';

const R = {
  currentText:    null,   // 当前原文对象
  currentSegIdx:  0,      // 当前段落索引
  allTexts:       [],     // 所有已加载原文
  mode:           'read', // read | quiz | recite
  autoPlayTimer:  null
};

const $    = id => document.getElementById(id);
const show = el => el?.classList.remove('hidden');
const hide = el => el?.classList.add('hidden');

function toast(msg) {
  const c = $('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ===== 初始化 =====

export async function initRecitation() {
  await loadRecitationTexts();
  bindRecitationEvents();
  bindRecitationListEvents();
}

async function loadRecitationTexts() {
  const files = [
    'data/builtin/chinese/primary/primary_poems_full.json',
    'data/builtin/chinese/middle/middle_texts_full.json',
    'data/builtin/chinese/tangpoems_full.json',   // 唐宋诗词精选
    'data/builtin/chinese/wenyan_texts.json',      // 文言文（将来扩展）
  ];
  R.allTexts = [];
  for (const f of files) {
    try {
      const res = await fetch(f);
      if (!res.ok) continue;
      const data = await res.json();
      R.allTexts.push(...(data.texts || []));
    } catch (_) {}
  }
}

// ===== 清单页面 =====

function bindRecitationListEvents() {
  $('btn-recite-list-back')?.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $('page-home')?.classList.add('active');
  });

  // 分类 tab
  document.querySelectorAll('.recite-list-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.recite-list-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRecitationListPage(btn.dataset.cat);
    });
  });

  // 搜索
  let searchTimer;
  $('recite-search-input')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const cat = document.querySelector('.recite-list-tab.active')?.dataset.cat || 'all';
      renderRecitationListPage(cat, e.target.value.trim());
    }, 250);
  });
}

export function openRecitationListPage() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-recitation-list')?.classList.add('active');
  const cat = document.querySelector('.recite-list-tab.active')?.dataset.cat || 'all';
  renderRecitationListPage(cat);
}

function renderRecitationListPage(cat = 'all', query = '') {
  const list = $('recite-texts-list');
  if (!list) return;

  let texts = R.allTexts;

  // 按分类过滤
  if (cat === 'primary') texts = texts.filter(t => t.grade?.startsWith('primary'));
  else if (cat === 'middle') texts = texts.filter(t => t.grade?.startsWith('middle'));
  else if (cat === 'wenyan') texts = texts.filter(t => t.category === '文言文' || t.tags?.includes('文言文'));
  else if (cat === 'poem') texts = texts.filter(t => t.category === '古诗' || t.category === '古诗词' || t.tags?.includes('古诗'));

  // 搜索过滤
  if (query) {
    const q = query.toLowerCase();
    texts = texts.filter(t =>
      t.title?.includes(query) ||
      t.author?.toLowerCase().includes(q) ||
      t.dynasty?.includes(query) ||
      t.annotation?.includes(query)
    );
  }

  $('recite-list-count') && ($('recite-list-count').textContent = `共${texts.length}篇`);

  if (!texts.length) {
    list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--color-text-sub)">${query ? `未找到"${escapeHtml(query)}"` : '暂无内容'}</div>`;
    return;
  }

  // 按年级分组
  const groups = {};
  texts.forEach(t => {
    const g = t.grade || 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  const gradeOrder = ['primary1','primary2','primary3','primary4','primary5','primary6','middle1','middle2','middle3','other'];
  const gradeNames = {
    primary1:'小学一年级', primary2:'小学二年级', primary3:'小学三年级',
    primary4:'小学四年级', primary5:'小学五年级', primary6:'小学六年级',
    middle1:'初中一年级', middle2:'初中二年级', middle3:'初中三年级',
    other:'其他'
  };

  list.innerHTML = '';

  // 如果只有一个分组且数量少，不显示分组标题
  const keys = gradeOrder.filter(k => groups[k]?.length);
  const showGroups = keys.length > 1 || texts.length > 6;

  keys.forEach(grade => {
    const items = groups[grade];
    if (!items?.length) return;

    if (showGroups) {
      const title = document.createElement('div');
      title.className = 'recite-grade-title';
      title.textContent = gradeNames[grade] || grade;
      list.appendChild(title);
    }

    items.forEach(text => {
      const item = document.createElement('button');
      item.className = 'recite-text-item';
      const isWenyan = text.category === '文言文' || text.tags?.includes('文言文');
      const catIcon  = isWenyan ? '文' : '诗';
      const catColor = isWenyan ? '#8B5CF6' : 'var(--color-chinese)';
      // 清单整洁：只显示标题+作者，不显示内容摘要
      item.innerHTML = `
        <div class="rti-cat" style="background:${catColor}">${catIcon}</div>
        <div class="rti-info">
          <div class="rti-title">${escapeHtml(text.title)}</div>
          <div class="rti-meta">${text.dynasty ? text.dynasty + ' · ' : ''}${escapeHtml(text.author || '')}${text.category ? ' · ' + text.category : ''}</div>
        </div>
        <div class="rti-segs">${text.segments?.length || 0}段 ›</div>
      `;
      item.addEventListener('click', () => openRecitationPage(text.id));
      list.appendChild(item);
    });
  });
}

function bindRecitationEvents() {
  $('btn-recite-back')?.addEventListener('click', () => {
    clearInterval(R.autoPlayTimer);
    // 返回古诗文清单页（如果存在），否则返回题库
    const listPage = $('page-recitation-list');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (listPage) listPage.classList.add('active');
    else $('page-library')?.classList.add('active');
  });

  // 模式切换按钮（用 data-mode 属性，没有独立 ID）
  document.querySelectorAll('.recite-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setReciteMode(btn.dataset.mode));
  });

  $('btn-speak-full')?.addEventListener('click', speakCurrentFull);
  $('btn-speak-quiz')?.addEventListener('click', () => {
    const seg = R.currentText?.segments?.[R.currentSegIdx];
    if (seg) speakChinese(seg.text.replace(/\n/g, '，'), 0.8);
  });
  $('btn-prev-seg')?.addEventListener('click', () => navigateSegment(-1));
  $('btn-next-seg')?.addEventListener('click', () => navigateSegment(1));
  $('btn-prev-seg-v')?.addEventListener('click', () => navigateSegment(-1));
  $('btn-next-seg-v')?.addEventListener('click', () => navigateSegment(1));
  $('btn-reveal-answer')?.addEventListener('click', revealAnswer);
  $('btn-recite-record')?.addEventListener('click', startVoiceRecite);

  // 题库/清单页面点击背诵按钮
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-recite-id]');
    if (btn) openRecitationPage(btn.dataset.reciteId);
  });
}

// ===== 打开背诵页 =====

export function openRecitationPage(textId) {
  const text = R.allTexts.find(t => t.id === textId);
  if (!text) { toast('未找到原文数据'); return; }

  R.currentText   = text;
  R.currentSegIdx = 0;

  // 渲染标题
  $('recite-title')  && ($('recite-title').textContent  = text.title);
  $('recite-author') && ($('recite-author').textContent = `${text.dynasty} · ${text.author}`);
  $('recite-grade')  && ($('recite-grade').textContent  = gradeLabel(text.grade));

  // 显示完整原文
  renderFullText(text);
  setReciteMode('read');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-recitation')?.classList.add('active');
}

function renderFullText(text) {
  const el = $('recite-full-text');
  if (!el) return;
  const lines = text.full_text.split('\n');
  el.innerHTML = lines.map(line => `<div class="recite-line">${escapeHtml(line)}</div>`).join('');
}

// ===== 模式切换 =====

function setReciteMode(mode) {
  R.mode = mode;

  document.querySelectorAll('.recite-mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode));

  hide($('recite-full-section'));
  hide($('recite-quiz-section'));
  hide($('recite-voice-section'));

  if (mode === 'read') {
    show($('recite-full-section'));
    renderFullText(R.currentText);
  } else if (mode === 'quiz') {
    show($('recite-quiz-section'));
    renderQuizSegment();
  } else if (mode === 'recite') {
    show($('recite-voice-section'));
    renderVoiceSegment();
  }
}

// ===== 段落填空模式 =====

function renderQuizSegment() {
  const text = R.currentText;
  const seg  = text.segments[R.currentSegIdx];
  if (!seg) return;

  const total = text.segments.length;
  $('quiz-progress').textContent = `${R.currentSegIdx + 1} / ${total}`;
  $('quiz-question').textContent = seg.question;
  $('quiz-context').textContent  = `（${seg.context}）`;

  // 挖空显示：将文字替换为下划线
  const blanked = blankText(seg.text);
  $('quiz-blank').innerHTML = blanked;
  hide($('quiz-answer-reveal'));
  $('quiz-input').value = '';
  $('quiz-input').disabled = false;
  hide($('quiz-result'));
}

function blankText(text) {
  // 随机挖去 30%-50% 的汉字
  const chars = [...text];
  const blankedChars = chars.map((c, i) => {
    if (c === '\n' || c === '，' || c === '。' || c === '、') return c;
    return Math.random() < 0.4 ? '<span class="blank-char">＿</span>' : c;
  });
  return blankedChars.join('').replace(/\n/g, '<br>');
}

function revealAnswer() {
  const seg = R.currentText.segments[R.currentSegIdx];
  $('quiz-answer-text').textContent = seg.text;
  show($('quiz-answer-reveal'));

  // 朗读答案
  speakChinese(seg.text, 0.8);
}

function navigateSegment(dir) {
  const text = R.currentText;
  R.currentSegIdx = Math.max(0, Math.min(text.segments.length - 1, R.currentSegIdx + dir));

  if (R.mode === 'quiz') renderQuizSegment();
  else if (R.mode === 'recite') renderVoiceSegment();
}

// ===== 语音背诵模式 =====

function renderVoiceSegment() {
  const text = R.currentText;
  const seg  = text.segments[R.currentSegIdx];
  if (!seg) return;

  const total = text.segments.length;
  $('voice-progress').textContent = `${R.currentSegIdx + 1} / ${total}`;
  $('voice-question').textContent  = seg.question;
  $('voice-context').textContent   = `（${seg.context}）`;
  hide($('recite-score'));
  hide($('recite-answer-reveal'));
  $('btn-recite-record').classList.remove('recording');
  $('recite-record-label').textContent = '开始背诵';
}

let _reciteStopRecord = null;

async function startVoiceRecite() {
  if (!SpeechSupport.stt) { toast('此设备不支持语音识别，请使用 Chrome'); return; }

  const btn   = $('btn-recite-record');
  const label = $('recite-record-label');

  if (_reciteStopRecord) {
    _reciteStopRecord();
    _reciteStopRecord = null;
    btn.classList.remove('recording');
    label.textContent = '开始背诵';
    return;
  }

  btn.classList.add('recording');
  label.textContent = '背诵中...';

  let spokenText = '';

  _reciteStopRecord = startListening(
    'zh-CN',
    (text) => { spokenText = text; },
    msg => { toast(msg); btn.classList.remove('recording'); label.textContent = '开始背诵'; },
    () => {
      btn.classList.remove('recording');
      label.textContent = '开始背诵';
      _reciteStopRecord = null;

      if (!spokenText) return;

      const seg    = R.currentText.segments[R.currentSegIdx];
      const target = seg.text.replace(/[，。！？、；：\n]/g, '');
      const spoken = spokenText.replace(/[，。！？、；：\n]/g, '');

      const dist  = levenshtein(target, spoken);
      const score = Math.round((1 - dist / Math.max(target.length, spoken.length)) * 100);
      const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';

      const feedback = score >= 90 ? '背得非常好！字字到位 🎉'
        : score >= 70 ? '背得不错！有几个字需要注意'
        : score >= 50 ? '继续努力，可以再多背几遍'
        : '需要多加练习，先看原文再背';

      $('recite-score-val').textContent      = score;
      $('recite-score-grade').textContent    = grade;
      $('recite-score-feedback').textContent = feedback;
      $('recite-recognized').textContent     = `你说的：${spokenText}`;
      show($('recite-score'));

      if (score < 70) {
        $('recite-answer-text').textContent = seg.text;
        show($('recite-answer-reveal'));
      }
    }
  );
}

function speakCurrentFull() {
  const text = R.currentText;
  if (text) speakChinese(text.full_text.replace(/\n/g, '，'), 0.75);
}

// ===== 工具 =====

function gradeLabel(g) {
  const map = {
    primary1: '小学一年级', primary2: '小学二年级', primary3: '小学三年级',
    primary4: '小学四年级', primary5: '小学五年级', primary6: '小学六年级',
    middle1: '初中一年级', middle2: '初中二年级', middle3: '初中三年级'
  };
  return map[g] || g || '';
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== 导出供题库页面使用 =====

export function getRecitationTexts() { return R.allTexts; }

export function renderRecitationList(container, gradeFilter) {
  if (!container) return;
  container.innerHTML = '';

  const filtered = gradeFilter && gradeFilter !== 'all'
    ? R.allTexts.filter(t => t.grade?.startsWith(gradeFilter))
    : R.allTexts;

  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:24px">暂无原文数据</p>';
    return;
  }

  filtered.forEach(text => {
    const item = document.createElement('div');
    item.className = 'recitation-item';
    item.innerHTML = `
      <div class="recit-info">
        <div class="recit-title">${escapeHtml(text.title)}</div>
        <div class="recit-meta">${text.dynasty} · ${text.author} · ${gradeLabel(text.grade)}</div>
      </div>
      <div class="recit-actions">
        <button class="btn-secondary recit-read" data-recite-id="${text.id}">📖 背诵</button>
      </div>
    `;
    container.appendChild(item);
  });
}
