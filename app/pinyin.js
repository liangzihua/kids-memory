/**
 * pinyin.js — 拼音学习模块
 * 功能：声母韵母表 / 看拼音写词语 / 看词语写拼音 / 多音字专项
 */

import { speak, speakChinese } from './speech.js';

let _data = null;
let _currentMode = 'table';   // table | p2w | w2p | poly
let _gradeFilter = 'all';
let _currentItems = [];
let _currentIdx = 0;
let _score = { correct: 0, wrong: 0 };

const $ = id => document.getElementById(id);
const show = el => el?.classList.remove('hidden');
const hide = el => el?.classList.add('hidden');

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function initPinyin() {
  if (_data) { renderPinyinHome(); return; }
  try {
    const res = await fetch('data/builtin/chinese/pinyin.json');
    if (!res.ok) throw new Error('拼音数据加载失败');
    _data = await res.json();
    window._pinyinData = _data;
  } catch (e) {
    console.warn('pinyin load error', e);
    return;
  }
  // 暴露渲染函数供语文学习中心内嵌使用
  window._renderPinyinToElement = function(el, mode, grade) {
    _currentMode  = mode  || 'table';
    _gradeFilter  = grade || 'all';
    if (mode === 'table')  renderInitialFinalTable(el);
    else if (mode === 'tones') renderTonesSection(el);
    else if (mode === 'poly')  renderPolyphoneSection(el);
    else if (mode === 'p2w')   renderPinyinToWordQuiz(el);
    else if (mode === 'w2p')   renderWordToPinyinQuiz(el);
  };
  bindPinyinEvents();
  renderPinyinHome();
}

function bindPinyinEvents() {
  // 模式切换 tab
  document.querySelectorAll('.py-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.py-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentMode = btn.dataset.mode;
      // 练习模式显示年级过滤
      const gradeRow = document.getElementById('py-grade-row');
      if (gradeRow) gradeRow.style.display = (_currentMode === 'p2w' || _currentMode === 'w2p') ? 'flex' : 'none';
      renderPinyinHome();
    });
  });

  // 年级过滤
  document.querySelectorAll('.py-grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.py-grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _gradeFilter = btn.dataset.grade;
      if (_currentMode === 'p2w' || _currentMode === 'w2p') renderPinyinHome();
    });
  });

  // 返回按钮
  $('btn-pinyin-back')?.addEventListener('click', () => {
    window._goBack?.();
  });
}

export function openPinyinPage() {
  if (window._showPage) { window._showPage('pinyin'); }
  else { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); $('page-pinyin')?.classList.add('active'); }
  initPinyin();
}

function renderPinyinHome() {
  const body = $('pinyin-body');
  if (!body || !_data) return;

  if (_currentMode === 'table')  renderInitialFinalTable(body);
  else if (_currentMode === 'p2w')   renderPinyinToWordQuiz(body);
  else if (_currentMode === 'w2p')   renderWordToPinyinQuiz(body);
  else if (_currentMode === 'poly')  renderPolyphoneSection(body);
  else if (_currentMode === 'tones') renderTonesSection(body);
}

// ===== 声母韵母表 =====
function renderInitialFinalTable(body) {
  const tones = _data.tones;
  body.innerHTML = `
    <!-- 声母 -->
    <div class="py-section">
      <div class="py-section-title">声母（21个）</div>
      <div class="py-initials-grid">
        ${_data.initials.cards.map(c => `
          <button class="py-initial-card" data-initial="${c.initial}">
            <div class="py-char">${escapeHtml(c.initial)}</div>
            <div class="py-example-small">${escapeHtml(c.example.split(' ')[0])}</div>
          </button>`).join('')}
      </div>
    </div>

    <!-- 韵母 -->
    <div class="py-section">
      <div class="py-section-title">韵母（36个）</div>
      ${_data.finals.groups.map(g => `
        <div class="py-group-label">${escapeHtml(g.name)}</div>
        <div class="py-finals-grid">
          ${g.items.map(f => `
            <button class="py-final-card" data-final="${f}">
              <div class="py-char">${escapeHtml(f)}</div>
            </button>`).join('')}
        </div>`).join('')}
    </div>

    <!-- 声调规则 -->
    <div class="py-section">
      <div class="py-section-title">声调口诀</div>
      ${tones.tone_rules.map(r => `
        <div class="py-rule-item">📌 ${escapeHtml(r)}</div>`).join('')}
    </div>

    <!-- 四声对比 -->
    <div class="py-section">
      <div class="py-section-title">四声练习</div>
      <div class="py-tones-grid">
        ${tones.rules.map(t => `
          <div class="py-tone-card">
            <div class="py-tone-mark">${escapeHtml(t.mark)}</div>
            <div class="py-tone-name">${escapeHtml(t.name)}</div>
            <div class="py-tone-desc">${escapeHtml(t.desc)}</div>
            <div class="py-tone-ex">${escapeHtml(t.example)}</div>
            <button class="py-speak-btn" data-text="${escapeHtml(t.example.split('，')[0])}">🔊</button>
          </div>`).join('')}
      </div>
    </div>
  `;

  // 声母卡片点击：显示详情
  body.querySelectorAll('.py-initial-card').forEach(btn => {
    btn.addEventListener('click', () => showInitialDetail(btn.dataset.initial));
  });

  // 韵母卡片点击
  body.querySelectorAll('.py-final-card').forEach(btn => {
    btn.addEventListener('click', () => showFinalDetail(btn.dataset.final));
  });

  // 朗读按钮
  body.querySelectorAll('.py-speak-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      speakChinese(btn.dataset.text, 0.8);
    });
  });
}

function showInitialDetail(initial) {
  const card = _data.initials.cards.find(c => c.initial === initial);
  if (!card) return;
  showDetailPopup(`
    <div class="py-detail-title">${escapeHtml(card.initial)}</div>
    <div class="py-detail-tip">发音要领：${escapeHtml(card.tip)}</div>
    <div class="py-detail-example">例词：${escapeHtml(card.example)}</div>
    <button class="btn-primary py-detail-speak" data-text="${escapeHtml(card.example.split(' ')[0])}">🔊 朗读例词</button>
  `);
}

function showFinalDetail(final) {
  const card = _data.finals.cards.find(c => c.final === final);
  if (!card) return;
  const toneHtml = card.tone_examples
    ? `<div class="py-tone-row">${card.tone_examples.map(t => `<span class="py-tone-ex-item">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  showDetailPopup(`
    <div class="py-detail-title">${escapeHtml(final)}</div>
    <div class="py-detail-example">例字：${escapeHtml(card.example)}</div>
    ${toneHtml}
    <button class="btn-primary py-detail-speak" data-text="${escapeHtml(card.example.split(' ')[1] || card.example)}">🔊 朗读</button>
  `);
}

function showDetailPopup(html) {
  let overlay = $('py-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'py-detail-overlay';
    overlay.className = 'py-detail-overlay';
    overlay.innerHTML = `<div class="py-detail-box" id="py-detail-box"></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  }
  $('py-detail-box').innerHTML = html + `<button class="btn-secondary py-detail-close" style="width:100%;margin-top:12px">关闭</button>`;
  overlay.classList.remove('hidden');

  $('py-detail-box').querySelector('.py-detail-speak')?.addEventListener('click', e => {
    speakChinese(e.currentTarget.dataset.text, 0.8);
  });
  $('py-detail-box').querySelector('.py-detail-close')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

// ===== 看拼音写词语 =====
function renderPinyinToWordQuiz(body) {
  let items = _data.pinyin_to_word.items;
  if (_gradeFilter !== 'all') items = items.filter(i => i.grade === _gradeFilter);
  if (!items.length) { body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">该年级暂无题目</p>'; return; }

  _currentItems = [...items].sort(() => Math.random() - 0.5);
  _currentIdx = 0;
  _score = { correct: 0, wrong: 0 };
  renderP2WCard(body);
}

function renderP2WCard(body) {
  const item = _currentItems[_currentIdx];
  if (!item) { renderQuizResult(body); return; }

  const total = _currentItems.length;
  // 生成4个选项（1个正确+3个干扰）
  const allWords = _data.pinyin_to_word.items.map(i => i.word);
  let options = [item.word];
  while (options.length < 4) {
    const rand = allWords[Math.floor(Math.random() * allWords.length)];
    if (!options.includes(rand)) options.push(rand);
  }
  options = options.sort(() => Math.random() - 0.5);

  body.innerHTML = `
    <div class="py-quiz-progress">${_currentIdx + 1} / ${total}
      <span style="float:right">✅${_score.correct} ❌${_score.wrong}</span>
    </div>
    <div class="py-quiz-card">
      <div class="py-quiz-label">看拼音，选词语</div>
      <div class="py-pinyin-big">${escapeHtml(item.pinyin)}</div>
      ${item.hint ? `<div class="py-quiz-hint">💡 ${escapeHtml(item.hint)}</div>` : ''}
      <button class="py-speak-pinyin" data-text="${escapeHtml(item.word)}">🔊 听读音</button>
    </div>
    <div class="py-options-grid">
      ${options.map(opt => `
        <button class="py-option-btn" data-word="${escapeHtml(opt)}" data-correct="${opt === item.word}">
          ${escapeHtml(opt)}
        </button>`).join('')}
    </div>
    <button class="btn-secondary py-skip-btn" style="margin:12px 16px">跳过</button>
  `;

  body.querySelector('.py-speak-pinyin')?.addEventListener('click', () => speakChinese(item.word, 0.8));

  body.querySelectorAll('.py-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const correct = btn.dataset.correct === 'true';
      body.querySelectorAll('.py-option-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === 'true') b.classList.add('py-correct');
        else if (b === btn && !correct) b.classList.add('py-wrong');
      });
      if (correct) { _score.correct++; speakChinese(item.word, 0.8); }
      else _score.wrong++;
      setTimeout(() => { _currentIdx++; renderP2WCard(body); }, 1200);
    });
  });

  body.querySelector('.py-skip-btn')?.addEventListener('click', () => { _currentIdx++; renderP2WCard(body); });
}

// ===== 看词语写拼音 =====
function renderWordToPinyinQuiz(body) {
  let items = _data.word_to_pinyin.items;
  if (_gradeFilter !== 'all') items = items.filter(i => i.grade === _gradeFilter);
  if (!items.length) { body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">该年级暂无题目</p>'; return; }

  _currentItems = [...items].sort(() => Math.random() - 0.5);
  _currentIdx = 0;
  _score = { correct: 0, wrong: 0 };
  renderW2PCard(body);
}

function renderW2PCard(body) {
  const item = _currentItems[_currentIdx];
  if (!item) { renderQuizResult(body); return; }

  const total = _currentItems.length;
  // 4个选项：1个正确 + item.wrong_options里取3个（或随机）
  let options = [item.pinyin, ...(item.wrong_options || [])].slice(0, 4);
  while (options.length < 4) {
    const rand = _data.word_to_pinyin.items[Math.floor(Math.random() * _data.word_to_pinyin.items.length)].pinyin;
    if (!options.includes(rand)) options.push(rand);
  }
  options = options.sort(() => Math.random() - 0.5);

  const polyBadge = item.polyphone
    ? `<span class="py-poly-badge">多音字：${escapeHtml(item.polyphone)}</span>`
    : '';

  body.innerHTML = `
    <div class="py-quiz-progress">${_currentIdx + 1} / ${total}
      <span style="float:right">✅${_score.correct} ❌${_score.wrong}</span>
    </div>
    <div class="py-quiz-card">
      <div class="py-quiz-label">看词语，选拼音${polyBadge}</div>
      <div class="py-word-big">${escapeHtml(item.word)}</div>
      <button class="py-speak-pinyin" data-text="${escapeHtml(item.word)}">🔊 听读音</button>
    </div>
    <div class="py-options-grid">
      ${options.map(opt => `
        <button class="py-option-btn py-pinyin-opt" data-pinyin="${escapeHtml(opt)}" data-correct="${opt === item.pinyin}">
          ${escapeHtml(opt)}
        </button>`).join('')}
    </div>
    <button class="btn-secondary py-skip-btn" style="margin:12px 16px">跳过</button>
  `;

  body.querySelector('.py-speak-pinyin')?.addEventListener('click', () => speakChinese(item.word, 0.8));

  body.querySelectorAll('.py-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const correct = btn.dataset.correct === 'true';
      body.querySelectorAll('.py-option-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === 'true') b.classList.add('py-correct');
        else if (b === btn && !correct) b.classList.add('py-wrong');
      });
      if (correct) { _score.correct++; speakChinese(item.word, 0.8); }
      else _score.wrong++;
      setTimeout(() => { _currentIdx++; renderW2PCard(body); }, 1200);
    });
  });

  body.querySelector('.py-skip-btn')?.addEventListener('click', () => { _currentIdx++; renderW2PCard(body); });
}

// ===== 多音字专项 =====
function renderPolyphoneSection(body) {
  const chars = _data.polyphones.chars;
  body.innerHTML = `
    <div class="py-section">
      <div class="py-section-title">多音字（${chars.length}个常用字）</div>
      <p style="font-size:12px;color:var(--color-text-sub);padding:0 4px 12px">同一个字根据不同语境有不同读音，点击查看详情</p>
      <div class="py-poly-list">
        ${chars.map(c => `
          <button class="py-poly-item" data-char="${escapeHtml(c.char)}">
            <span class="py-poly-char">${escapeHtml(c.char)}</span>
            <span class="py-poly-pinyins">${c.readings.map(r => escapeHtml(r.pinyin)).join(' / ')}</span>
          </button>`).join('')}
      </div>
    </div>
  `;

  body.querySelectorAll('.py-poly-item').forEach(btn => {
    btn.addEventListener('click', () => showPolyphoneDetail(btn.dataset.char));
  });
}

function showPolyphoneDetail(char) {
  const c = _data.polyphones.chars.find(x => x.char === char);
  if (!c) return;
  const html = `
    <div class="py-detail-title" style="font-size:48px">${escapeHtml(c.char)}</div>
    ${c.readings.map(r => `
      <div class="py-poly-reading">
        <div class="py-poly-reading-py">${escapeHtml(r.pinyin)}</div>
        <div class="py-poly-reading-meaning">${escapeHtml(r.meaning)}</div>
        <div class="py-poly-reading-exs">${r.examples.map(e => `<span class="py-poly-ex">${escapeHtml(e)}</span>`).join('')}</div>
        <button class="py-speak-btn" data-text="${escapeHtml(r.examples[0])}">🔊</button>
      </div>`).join('')}
  `;
  showDetailPopup(html);
  $('py-detail-box').querySelectorAll('.py-speak-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); speakChinese(btn.dataset.text, 0.8); });
  });
}

// ===== 声调专项 =====
function renderTonesSection(body) {
  const tones = _data.tones;
  body.innerHTML = `
    <div class="py-section">
      <div class="py-section-title">四个声调详解</div>
      ${tones.rules.map(t => `
        <div class="py-tone-detail-card">
          <div class="py-tone-detail-header">
            <span class="py-tone-mark-big">${escapeHtml(t.mark)}</span>
            <span class="py-tone-name-big">${escapeHtml(t.name)}</span>
          </div>
          <div class="py-tone-desc-text">${escapeHtml(t.desc)}</div>
          <div class="py-tone-tip">💡 ${escapeHtml(t.tip)}</div>
          <div class="py-tone-examples">${escapeHtml(t.example)}</div>
          <button class="py-speak-btn" data-text="${escapeHtml(t.example.split('，')[0])}">🔊 试听</button>
        </div>`).join('')}
    </div>
    <div class="py-section">
      <div class="py-section-title">标调规则口诀</div>
      ${tones.tone_rules.map((r, i) => `
        <div class="py-rule-item">
          <span class="py-rule-num">${i + 1}</span>
          ${escapeHtml(r)}
        </div>`).join('')}
    </div>
  `;

  body.querySelectorAll('.py-speak-btn').forEach(btn => {
    btn.addEventListener('click', () => speakChinese(btn.dataset.text, 0.8));
  });
}

// ===== 结果页 =====
function renderQuizResult(body) {
  const total = _score.correct + _score.wrong;
  const pct = total ? Math.round(_score.correct / total * 100) : 0;
  const grade = pct >= 90 ? '优秀 🏆' : pct >= 70 ? '良好 👍' : pct >= 50 ? '继续加油 💪' : '需要多加练习 📚';
  body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:64px;margin-bottom:12px">${pct >= 90 ? '🎉' : pct >= 70 ? '😊' : '😅'}</div>
      <div style="font-size:48px;font-weight:900;color:var(--color-chinese)">${pct}<span style="font-size:20px">%</span></div>
      <div style="font-size:16px;margin:8px 0 4px">${grade}</div>
      <div style="font-size:13px;color:var(--color-text-sub)">答对 ${_score.correct} 题，答错 ${_score.wrong} 题</div>
      <button class="btn-primary" style="margin-top:24px;width:80%" id="btn-py-retry">再练一次</button>
      <button class="btn-secondary" style="margin-top:10px;width:80%" id="btn-py-home">返回</button>
    </div>
  `;
  $('btn-py-retry')?.addEventListener('click', () => renderPinyinHome());
  $('btn-py-home')?.addEventListener('click', () => {
    _currentMode = 'table';
    document.querySelectorAll('.py-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'table'));
    renderPinyinHome();
  });
}
