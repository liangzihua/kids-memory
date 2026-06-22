
// ===== 英语短文背诵 =====

let _passages = [];
let _currentPassage = null;
let _passageFilter = 'all';

export async function initPassages() {
  if (_passages.length) return;
  try {
    const files = [
      'data/builtin/english/passages/primary_passages.json',
      'data/builtin/english/passages/middle_passages.json'
    ];
    for (const f of files) {
      const res = await fetch(f);
      if (!res.ok) continue;
      const data = await res.json();
      _passages.push(...(data.passages || []));
    }
    window._passages = _passages;
  } catch(e) { console.warn('passages load error', e); }
  bindPassageEvents();
  renderPassageList();
}

function bindPassageEvents() {
  const $ = id => document.getElementById(id);

  document.querySelectorAll('.passage-grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.passage-grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _passageFilter = btn.dataset.grade;
      renderPassageList();
    });
  });

  $('btn-passage-back')?.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $('page-english-adult')?.classList.add('active');
    document.querySelectorAll('.english-tab').forEach(t => t.classList.toggle('active', t.dataset.etab === 'passages'));
    document.querySelectorAll('.english-section').forEach(s => {
      s.classList.toggle('active', s.id === 'etab-passages');
      s.classList.toggle('hidden', s.id !== 'etab-passages');
    });
  });

  $('btn-passage-speak')?.addEventListener('click', () => {
    if (_currentPassage) speak(_currentPassage.text, 'en-US', 0.8);
  });

  document.querySelectorAll('[data-pmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pmode]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.style.color = on ? 'var(--color-english)' : 'var(--color-text-sub)';
        b.style.borderBottom = on ? '2px solid var(--color-english)' : '2px solid transparent';
      });
      const mode = btn.dataset.pmode;
      $('passage-read-section').classList.toggle('hidden', mode !== 'read');
      $('passage-translate-section').classList.toggle('hidden', mode !== 'translate');
      $('passage-recite-section').classList.toggle('hidden', mode !== 'recite');
    });
  });

  $('btn-passage-record')?.addEventListener('click', startPassageRecite);
}

function passageGradeLabel(g) {
  return { primary3:'小学三年级', primary4:'小学四年级', primary5:'小学五年级', primary6:'小学六年级',
           middle1:'初中一年级', middle2:'初中二年级', middle3:'初中三年级' }[g] || g;
}

function renderPassageList() {
  const list = document.getElementById('passage-list');
  if (!list) return;

  let items = _passages;
  if (_passageFilter === 'primary') items = items.filter(p => p.grade?.startsWith('primary'));
  else if (_passageFilter === 'middle') items = items.filter(p => p.grade?.startsWith('middle'));

  if (!items.length) {
    list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">暂无短文数据</p>';
    return;
  }

  const catColors = {
    '生活':'#FF8C42', '校园':'#3B82F6', '自然':'#10B981', '动物':'#F59E0B',
    '健康':'#EF4444', '科技':'#8B5CF6', '文化':'#EC4899', '品德':'#14B8A6',
    '励志':'#F97316', '历史':'#6366F1', '环保':'#22C55E', '社会':'#0EA5E9',
    '科学':'#A855F7', '教育':'#F59E0B', '梦想':'#EF4444', '运动':'#3B82F6',
    '旅游':'#06B6D4', '家庭':'#F472B6', '阅读':'#84CC16', '写作':'#FB923C',
    '安全':'#DC2626'
  };

  list.innerHTML = items.map((p, i) => {
    const words = (p.text || '').split(/\s+/).length;
    const color = catColors[p.category] || '#aaa';
    return `<button class="passage-item" data-pid="${escapeHtml(p.id)}">
      <div class="pi-num">${i + 1}</div>
      <div class="pi-cat" style="background:${color}">${escapeHtml(p.category || '英')}</div>
      <div class="pi-info">
        <div class="pi-title">${escapeHtml(p.title)}</div>
        <div class="pi-meta">${passageGradeLabel(p.grade)} · ${words} 词</div>
      </div>
      <div class="pi-arrow">›</div>
    </button>`;
  }).join('');

  list.querySelectorAll('.passage-item').forEach(btn => {
    btn.addEventListener('click', () => openPassage(btn.dataset.pid));
  });
}

function openPassage(pid) {
  const p = _passages.find(x => x.id === pid);
  if (!p) return;
  _currentPassage = p;

  const $ = id => document.getElementById(id);
  $('passage-title').textContent = p.title;
  $('passage-meta').textContent = (p.category || '') + ' · ' + (p.text || '').split(/\s+/).length + ' 词';

  // 原文（音节着色）
  const tokens = p.text.split(/([a-zA-Z][a-zA-Z'-]*)/);
  $('passage-text').innerHTML = tokens.map(tok => {
    if (/^[a-zA-Z][a-zA-Z'-]*$/.test(tok)) {
      if (window._colorEnglishSyllables) return window._colorEnglishSyllables(tok);
      return escapeHtml(tok);
    }
    return escapeHtml(tok);
  }).join('');

  // 关键词
  const kwEl = $('passage-keywords');
  if (kwEl) kwEl.innerHTML = p.keywords?.length ? `
    <div style="font-size:11px;font-weight:700;color:var(--color-english);margin-bottom:6px">🔑 关键词</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${p.keywords.map(k => `<span style="background:rgba(59,130,246,0.1);color:var(--color-english);border-radius:20px;padding:3px 10px;font-size:12px">${escapeHtml(k)}</span>`).join('')}
    </div>` : '';

  // 学习重点
  const kpEl = $('passage-keypoints');
  if (kpEl) kpEl.innerHTML = p.key_points?.length ? `
    <div style="font-size:11px;font-weight:700;color:#8B5CF6;margin-bottom:6px;margin-top:12px">📌 学习重点</div>
    ${p.key_points.map(pt => `<div style="font-size:12px;color:var(--color-text-sub);padding:3px 0">· ${escapeHtml(pt)}</div>`).join('')}` : '';

  // 译文
  const trEl = $('passage-translation');
  if (trEl) trEl.textContent = p.translation || '';

  // 重置
  $('passage-score')?.classList.add('hidden');
  if ($('passage-recognized')) $('passage-recognized').textContent = '';
  if ($('passage-record-label')) $('passage-record-label').textContent = '开始背诵';

  // 切到原文模式
  document.querySelectorAll('[data-pmode]').forEach(b => {
    const on = b.dataset.pmode === 'read';
    b.classList.toggle('active', on);
    b.style.color = on ? 'var(--color-english)' : 'var(--color-text-sub)';
    b.style.borderBottom = on ? '2px solid var(--color-english)' : '2px solid transparent';
  });
  $('passage-read-section')?.classList.remove('hidden');
  $('passage-translate-section')?.classList.add('hidden');
  $('passage-recite-section')?.classList.add('hidden');

  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById('page-passage')?.classList.add('active');
}

let _passageStopRecord = null;

async function startPassageRecite() {
  const { startListening, SpeechSupport } = await import('./speech.js');
  const $ = id => document.getElementById(id);
  if (!SpeechSupport.stt) { alert('此设备不支持语音识别，请使用 Chrome 浏览器'); return; }

  const btn = $('btn-passage-record');
  const label = $('passage-record-label');

  if (_passageStopRecord) {
    _passageStopRecord();
    _passageStopRecord = null;
    btn.style.background = 'var(--color-english)';
    label.textContent = '开始背诵';
    return;
  }

  btn.style.background = '#EF4444';
  label.textContent = '背诵中…点击停止';
  let spoken = '';

  _passageStopRecord = startListening('en-US',
    text => { spoken = text; if ($('passage-recognized')) $('passage-recognized').textContent = '识别：' + text; },
    () => { btn.style.background = 'var(--color-english)'; label.textContent = '开始背诵'; },
    () => {
      btn.style.background = 'var(--color-english)';
      label.textContent = '开始背诵';
      _passageStopRecord = null;
      if (!spoken || !_currentPassage) return;

      const target = _currentPassage.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
      const said   = spoken.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
      const hits   = said.filter(w => target.includes(w)).length;
      const score  = Math.min(100, Math.round((hits / Math.max(target.length * 0.3, 1)) * 100));
      const feedback = score >= 85 ? '太棒了！背诵非常流利！' : score >= 60 ? '不错！继续练习' : '再熟悉一下原文，加油！';

      if ($('passage-score-val')) $('passage-score-val').textContent = score;
      if ($('passage-score-feedback')) $('passage-score-feedback').textContent = feedback;
      $('passage-score')?.classList.remove('hidden');
    }
  );
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
