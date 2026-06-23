/**
 * english.js — 成人英语学习模块
 * 功能：单词速记 / 情景口语 / 音标课程 / 绕口令
 * 依赖：core.js / speech.js / pronunciation.js / algorithm.js
 */

import { CardManager, DeckManager, ProfileManager, todayStr } from './core.js';
import { speak, speakEnglish, startListening, SpeechSupport } from './speech.js';
import { scorePronunciation } from './pronunciation.js';
import { SM2, buildStudyQueue } from './algorithm.js';

// ===== 全局状态 =====
const E = {
  currentProfile:  null,
  phoneticsData:   null,
  phrasesData:     null,
  scenario:        null,   // 当前情景
  exchangeIndex:   0,      // 当前对话句索引
  practiceWord:    null,   // 当前练习例词
  practicePhonem:  null    // 当前练习音素
};

// ===== DOM 工具 =====
const $  = id  => document.getElementById(id);
const show = el => el?.classList.remove('hidden');
const hide = el => el?.classList.add('hidden');

function toast(msg) {
  const c = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ===== 初始化 =====

export function initEnglish(profile) {
  E.currentProfile = profile;
  bindEnglishEvents();
  updateAdultNavVisibility(profile);
}

function updateAdultNavVisibility(profile) {
  const isAdult = localStorage.getItem('adult_mode') === '1' ||
                  profile?.ageGroup === 'adult';
  const englishNavItem = document.querySelector('.nav-item[data-page="english"]');
  if (englishNavItem) englishNavItem.style.display = isAdult ? 'flex' : 'none';
}

function bindEnglishEvents() {
  // 子页 Tab 切换
  document.querySelectorAll('.english-tab').forEach(btn => {
    btn.addEventListener('click', () => switchEnglishTab(btn.dataset.etab));
  });

  // 音标分组切换
  document.querySelectorAll('.ph-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ph-group-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPhonemeGrid(btn.dataset.group);
    });
  });

  // 词汇方向切换
  document.querySelectorAll('.vocab-dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vocab-dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 按钮事件
  $('btn-start-vocab-study')?.addEventListener('click', startVocabStudy);
  $('btn-load-adult-vocab')?.addEventListener('click', loadAdultVocab);
  $('btn-scenario-back')?.addEventListener('click', () => showEnglishPage());
  $('btn-show-model')?.addEventListener('click', showModelAnswer);
  $('btn-try-again')?.addEventListener('click', resetScenarioRecord);
  $('btn-next-exchange')?.addEventListener('click', nextExchange);
  $('btn-speak-cue')?.addEventListener('click', speakCue);
  $('btn-speak-model')?.addEventListener('click', speakModel);
  $('btn-scenario-record')?.addEventListener('click', toggleScenarioRecord);
  $('btn-close-phoneme-modal')?.addEventListener('click', () => hide($('phoneme-detail-modal')));
  $('btn-close-today-modal')?.addEventListener('click', () => hide($('today-cards-modal')));
  $('btn-practice-speak')?.addEventListener('click', speakPracticeWord);
  $('btn-practice-record')?.addEventListener('click', togglePracticeRecord);
  $('btn-speak-ipa')?.addEventListener('click', () => {
    if (E.practicePhonem) speak(E.practicePhonem.examples[0], 'en-US', 0.7);
  });

  // 成人模式 toggle
  $('setting-adult-mode')?.addEventListener('change', e => {
    localStorage.setItem('adult_mode', e.target.checked ? '1' : '0');
    updateAdultNavVisibility(E.currentProfile);
    toast(e.target.checked ? '已开启成人学习模式' : '已关闭成人学习模式');
  });

  // 今日数据点击查看
  ['due-count','new-count','done-count'].forEach(id => {
    $(id)?.addEventListener('click', () => openTodayCardsModal(id));
  });
}

function showEnglishPage() {
  if (window._showPage) { window._showPage('english-adult'); }
  else { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); $('page-english-adult')?.classList.add('active'); }
}

// ===== Tab 切换 =====

function switchEnglishTab(tab) {
  document.querySelectorAll('.english-tab').forEach(b => b.classList.toggle('active', b.dataset.etab === tab));
  document.querySelectorAll('.english-section').forEach(s => {
    s.classList.toggle('active', s.id === `etab-${tab}`);
    s.classList.toggle('hidden', s.id !== `etab-${tab}`);
  });

  if (tab === 'vocab')     refreshVocabStats();
  if (tab === 'speaking')  renderScenarioGrid();
  if (tab === 'phonetics') renderPhonemeGrid('vowels');
  if (tab === 'twister')   renderTwisterList();
  if (tab === 'grammar')   renderGrammarList('all');
  if (tab === 'passages')  { import('./passages.js').then(m => m.initPassages()); }
}

// 供外部调用（主页快捷按钮）
export { renderScenarioGrid, renderPhonemeGrid, renderGrammarList, switchEnglishTab as switchEnglishTabPublic };

// ===== 单词速记 =====

async function refreshVocabStats() {
  if (!E.currentProfile) return;
  const cards = await CardManager.getByProfile(E.currentProfile.id);
  const english = cards.filter(c => c.subject === 'english' || c.tags?.includes('CET-4'));
  const due     = english.filter(c => c.nextReview <= todayStr());
  const fresh   = english.filter(c => c.reviewCount === 0);
  const mastered = english.filter(c => c.interval >= 21 || c.box >= 3);

  const setStatWithClick = (id, count, cardSubset, label) => {
    const el = $(id);
    if (!el) return;
    el.textContent = count;
    el.style.cursor = count > 0 ? 'pointer' : 'default';
    // 移除旧监听器（防止重复绑定）
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    if (count > 0) {
      newEl.addEventListener('click', () => {
        // 直接用这部分卡片开始学习
        const queue = [...cardSubset].sort(() => Math.random() - 0.5).slice(0, 50);
        if (!queue.length) { toast('暂无可学习的卡片'); return; }
        document.dispatchEvent(new CustomEvent('start-english-vocab', {
          detail: { queue, direction: document.querySelector('.vocab-dir-btn.active')?.dataset.dir || 'en-zh' }
        }));
      });
      newEl.title = `点击开始复习${label}（${count}张）`;
    }
  };

  setStatWithClick('vocab-due',     due.length,     due,     '到期卡片');
  setStatWithClick('vocab-new',     fresh.length,   fresh,   '新词');
  setStatWithClick('vocab-mastered', mastered.length, mastered, '已掌握词汇');

  // 填充牌组选择
  const decks = await DeckManager.getByProfile(E.currentProfile.id);
  const deckSel = $('vocab-deck-select');
  if (deckSel) {
    deckSel.innerHTML = '<option value="all">全部英语词汇</option>' +
      decks.filter(d => d.subject === 'english').map(d =>
        `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }
}

async function startVocabStudy() {
  const profile = E.currentProfile;
  if (!profile) return;

  const dir = document.querySelector('.vocab-dir-btn.active')?.dataset.dir || 'en-zh';
  const deckId = $('vocab-deck-select')?.value;

  let cards = await CardManager.getByProfile(profile.id);
  cards = cards.filter(c => c.subject === 'english' || c.tags?.includes('CET-4') || c.tags?.includes('成人'));
  if (deckId && deckId !== 'all') cards = cards.filter(c => c.deckId === deckId);

  if (!cards.length) {
    toast('没有英语词汇，请先加载词汇库');
    return;
  }

  const due = cards.filter(c => c.nextReview <= todayStr());
  const fresh = cards.filter(c => c.reviewCount === 0);
  const queue = buildStudyQueue(due, fresh, profile.newPerDay || 15);

  if (!queue.length) { toast('今天的单词都复习完了！'); return; }

  // 存入 App（通过 custom event 交给 ui.js）
  document.dispatchEvent(new CustomEvent('start-english-vocab', {
    detail: { queue, direction: dir }
  }));
}

async function loadAdultVocab() {
  const profile = E.currentProfile;
  if (!profile) return;
  try {
    toast('正在加载职场词汇...');
    const [vocabRes, phrasesRes] = await Promise.all([
      fetch('data/builtin/english/adult_vocab_basic.json'),
      fetch('data/builtin/english/adult_phrases.json')
    ]);
    const vocab = await vocabRes.json();
    E.phrasesData = await phrasesRes.json();

    const deck = await DeckManager.create(profile.id, '职场英语词汇（CET-4）', 'english', 'adult', true);
    await CardManager.bulkCreate(profile.id, deck.id, vocab.cards);
    toast(`已加载 ${vocab.cards.length} 个职场单词`);
    refreshVocabStats();
  } catch (e) {
    toast(`加载失败：${e.message}`);
  }
}

// ===== 情景口语 =====

async function renderScenarioGrid() {
  if (!E.phrasesData) {
    try {
      const res = await fetch('data/builtin/english/adult_phrases.json');
      E.phrasesData = await res.json();
    } catch {
      $('scenario-grid').innerHTML = '<p style="color:var(--color-text-sub);padding:24px;text-align:center">请先加载职场词汇库</p>';
      return;
    }
  }

  const grid = $('scenario-grid');
  grid.innerHTML = '';

  const categoryIcons = {
    meeting: '📋', presentation: '📊', negotiation: '🤝',
    interview: '💼', smalltalk: '☕', email: '📧', problem_solving: '🔧'
  };

  E.phrasesData.scenarios.forEach(sc => {
    const card = document.createElement('button');
    card.className = 'scenario-card';
    const levelColors = { beginner: '#4CAF7D', intermediate: '#FF8C42', advanced: '#E85555' };
    card.innerHTML = `
      <div class="scenario-icon">${categoryIcons[sc.category] || '💬'}</div>
      <div class="scenario-info">
        <div class="scenario-category">${sc.category_name}</div>
        <div class="scenario-title">${sc.title}</div>
        <div class="scenario-level" style="color:${levelColors[sc.level]}">${levelLabel(sc.level)}</div>
      </div>
      <div class="scenario-count">${sc.exchanges.length}句</div>
    `;
    card.addEventListener('click', () => startScenario(sc));
    grid.appendChild(card);
  });
}

function levelLabel(l) {
  return { beginner: '入门', intermediate: '进阶', advanced: '高级' }[l] || l;
}

function startScenario(scenario) {
  E.scenario = scenario;
  E.exchangeIndex = 0;

  if (window._showPage) { window._showPage('scenario'); }
  else { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); $('page-scenario')?.classList.add('active'); }

  $('scenario-context').textContent = `场景：${scenario.title} — ${scenario.context}`;
  renderExchange();
}

function renderExchange() {
  const sc = E.scenario;
  const ex = sc.exchanges[E.exchangeIndex];
  if (!ex) return;

  const total   = sc.exchanges.length;
  const current = E.exchangeIndex + 1;
  $('scenario-progress-bar').style.width = `${(current / total) * 100}%`;
  $('scenario-progress-text').textContent = `${current}/${total}`;

  $('cue-text').textContent = ex.cue;

  // 关键词 chip
  const kpRow = $('key-phrases-row');
  const kpEl  = $('key-phrases');
  if (ex.key_phrases?.length) {
    kpEl.innerHTML = ex.key_phrases.map(p => `<span class="kp-chip">${p}</span>`).join('');
    show(kpRow);
  } else {
    hide(kpRow);
  }

  // 发音提示
  const ptRow = $('pronunciation-tip-row');
  if (ex.pronunciation_focus) {
    $('pronunciation-tip-text').textContent = ex.pronunciation_focus;
    show(ptRow);
  } else {
    hide(ptRow);
  }

  hide($('scenario-score'));
  hide($('model-answer'));
  hide($('btn-next-exchange'));
  show($('btn-show-model'));
  show($('btn-try-again'));

  const waveform = $('scenario-waveform');
  waveform?.classList.remove('active');

  // 自动朗读提示句
  setTimeout(() => speak(ex.cue, 'en-US', 0.85), 600);
}

function speakCue() {
  const ex = E.scenario?.exchanges[E.exchangeIndex];
  if (ex) speak(ex.cue, 'en-US', 0.85);
}

function speakModel() {
  const ex = E.scenario?.exchanges[E.exchangeIndex];
  if (ex) speak(ex.model_response, 'en-US', 0.8);
}

function showModelAnswer() {
  const ex = E.scenario?.exchanges[E.exchangeIndex];
  if (!ex) return;
  $('model-answer-text').textContent = ex.model_response;
  show($('model-answer'));
  show($('btn-next-exchange'));
}

function resetScenarioRecord() {
  hide($('scenario-score'));
  hide($('model-answer'));
  hide($('btn-next-exchange'));
  $('btn-scenario-record').classList.remove('recording');
  $('scenario-record-label').textContent = '开始说话';
  $('scenario-waveform')?.classList.remove('active');
}

function nextExchange() {
  E.exchangeIndex++;
  if (E.exchangeIndex >= E.scenario.exchanges.length) {
    // 情景完成
    $('scenario-context').textContent = '🎉 本情景练习完成！很棒！';
    $('scenario-exchange').style.display = 'none';
    document.querySelector('.scenario-record-area').style.display = 'none';
    setTimeout(() => {
      $('scenario-exchange').style.display = '';
      document.querySelector('.scenario-record-area').style.display = '';
      showEnglishPage();
    }, 2500);
    return;
  }
  renderExchange();
}

let _scenarioStopRecord = null;

async function toggleScenarioRecord() {
  const btn = $('btn-scenario-record');
  const label = $('scenario-record-label');
  const waveform = $('scenario-waveform');

  if (_scenarioStopRecord) {
    _scenarioStopRecord();
    _scenarioStopRecord = null;
    btn.classList.remove('recording');
    label.textContent = '处理中...';
    waveform?.classList.remove('active');
    return;
  }

  if (!SpeechSupport.stt) {
    toast('此设备不支持语音识别，请使用 Chrome');
    return;
  }

  btn.classList.add('recording');
  label.textContent = '说话中...';
  waveform?.classList.add('active');

  const ex = E.scenario?.exchanges[E.exchangeIndex];
  let spokenText = '', spokenConf = 1;

  _scenarioStopRecord = startListening(
    'en-US',
    (text, conf) => { spokenText = text; spokenConf = conf; },
    msg => { toast(msg); btn.classList.remove('recording'); label.textContent = '开始说话'; },
    async () => {
      btn.classList.remove('recording');
      label.textContent = '开始说话';
      waveform?.classList.remove('active');
      _scenarioStopRecord = null;

      if (!spokenText || !ex) return;

      const profile = E.currentProfile;
      const azureConfig = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;

      // 发音评分（用参考答案作为目标）
      const pronResult = await scorePronunciation(ex.model_response, spokenText, spokenConf, azureConfig, null);

      // 内容相关度（关键词覆盖率）
      const keyPhrases  = ex.key_phrases || [];
      const spokenLower = spokenText.toLowerCase();
      const covered     = keyPhrases.filter(p => spokenLower.includes(p.toLowerCase())).length;
      const contentScore = keyPhrases.length > 0
        ? Math.round((covered / keyPhrases.length) * 100)
        : (spokenText.length > 10 ? 70 : 30);

      const overall = Math.round(pronResult.score * 0.6 + contentScore * 0.4);

      // 显示结果
      $('sc-pronunciation').textContent = pronResult.score;
      $('sc-content').textContent       = contentScore;
      $('sc-overall').textContent       = overall;
      $('sc-feedback').textContent      = buildScenarioFeedback(overall, pronResult, keyPhrases, covered);
      $('sc-recognized').textContent    = `识别到：${spokenText}`;
      show($('scenario-score'));

      if (overall >= 70) show($('btn-next-exchange'));
    }
  );
}

function buildScenarioFeedback(overall, pronResult, keyPhrases, covered) {
  if (overall >= 90) return '非常出色！发音准确，内容完整 🎉';
  if (overall >= 75) return '很好！继续保持，可以尝试更自然的表达';
  if (overall >= 60) {
    const missed = keyPhrases.slice(covered);
    return `不错的尝试！${missed.length > 0 ? `尝试加入：${missed.slice(0,2).join('、')}` : pronResult.feedback}`;
  }
  return `${pronResult.feedback} 看看参考答案再试一次`;
}

// ===== 音标课程 =====

async function loadPhoneticsData() {
  if (E.phoneticsData) return E.phoneticsData;
  try {
    const res = await fetch('data/builtin/english/phonetics.json');
    E.phoneticsData = await res.json();
  } catch {
    E.phoneticsData = { vowels: [], consonants: [], stress_rules: [] };
  }
  return E.phoneticsData;
}

async function renderPhonemeGrid(group) {
  const data = await loadPhoneticsData();
  const grid = $('phoneme-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (group === 'stress') {
    renderStressRules(data.stress_rules);
    return;
  }

  const phones = data[group] || [];
  phones.forEach(ph => {
    const btn = document.createElement('button');
    btn.className = 'phoneme-card';
    btn.innerHTML = `
      <div class="ph-ipa">${ph.ipa}</div>
      <div class="ph-name">${ph.name}</div>
      <div class="ph-example">${ph.examples?.[0] || ''}</div>
    `;
    btn.addEventListener('click', () => openPhonemeDetail(ph));
    grid.appendChild(btn);
  });
}

function renderStressRules(rules) {
  const grid = $('phoneme-grid');
  grid.innerHTML = '';
  rules?.forEach(r => {
    const card = document.createElement('div');
    card.className = 'stress-rule-card';
    card.innerHTML = `
      <div class="stress-rule-title">${r.rule}</div>
      <div class="stress-examples">${r.examples.map(e => `<span class="stress-ex">${e}</span>`).join('')}</div>
      <div class="stress-note">${r.note}</div>
    `;
    grid.appendChild(card);
  });
}

function openPhonemeDetail(phoneme) {
  E.practicePhonem = phoneme;
  E.practiceWord   = phoneme.examples?.[0];

  $('pd-ipa').textContent        = phoneme.ipa;
  $('pd-name').textContent       = phoneme.name;
  $('pd-mouth-tip').textContent  = phoneme.mouth_tip || '—';
  $('pd-articulation').textContent = phoneme.articulation || '—';

  const mistakeRow = $('pd-mistake-row');
  if (phoneme.common_mistake) {
    $('pd-mistake').textContent = phoneme.common_mistake;
    show(mistakeRow);
  } else {
    hide(mistakeRow);
  }

  // 拼写规则 chips
  const spEl = $('pd-spellings');
  if (spEl && phoneme.common_spellings?.length) {
    spEl.innerHTML = phoneme.common_spellings.map(s =>
      `<span class="spelling-chip">${s}</span>`).join('');
  }

  // 例词按钮
  const exEl = $('pd-examples');
  if (exEl && phoneme.examples?.length) {
    exEl.innerHTML = phoneme.examples.map(w =>
      `<button class="example-word-btn" onclick="(function(){window._speakWord='${w}'})();this.classList.add('speaking');setTimeout(()=>this.classList.remove('speaking'),800)">${w}</button>`
    ).join('');
    exEl.querySelectorAll('.example-word-btn').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.textContent, 'en-US', 0.7));
    });
  }

  // 最小对比
  const pairsEl = $('pd-pairs');
  const pairsRow = $('pd-pairs-row');
  if (pairsEl && phoneme.minimal_pairs?.length) {
    pairsEl.innerHTML = phoneme.minimal_pairs.map(p => {
      const a = p.a || p.short || p.voiced;
      const b = p.b || p.long || p.voiceless;
      return `<div class="pair-item"><span class="pair-a" onclick=""><button class="pair-btn" data-word="${a.split('/')[0].trim()}">${a}</button></span><span class="pair-vs">vs</span><button class="pair-btn" data-word="${b.split('/')[0].trim()}">${b}</button></div>`;
    }).join('');
    pairsEl.querySelectorAll('.pair-btn').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.word, 'en-US', 0.7));
    });
    show(pairsRow);
  } else {
    hide(pairsRow);
  }

  // 跟读练习区
  $('practice-word-display').textContent = E.practiceWord || phoneme.examples?.[0] || '';
  hide($('phoneme-score-display'));

  show($('phoneme-detail-modal'));

  // 自动朗读
  setTimeout(() => speak(E.practiceWord || phoneme.ipa.replace(/\//g,''), 'en-US', 0.65), 300);
}

function speakPracticeWord() {
  if (E.practiceWord) speak(E.practiceWord, 'en-US', 0.65);
}

let _practiceStopRecord = null;

async function togglePracticeRecord() {
  const btn = $('btn-practice-record');
  if (_practiceStopRecord) {
    _practiceStopRecord();
    _practiceStopRecord = null;
    btn.classList.remove('recording');
    return;
  }

  if (!SpeechSupport.stt) { toast('此设备不支持语音识别'); return; }

  btn.classList.add('recording');
  let spoken = '', conf = 1;

  _practiceStopRecord = startListening(
    'en-US',
    (text, c) => { spoken = text; conf = c; },
    msg => { toast(msg); btn.classList.remove('recording'); },
    async () => {
      btn.classList.remove('recording');
      _practiceStopRecord = null;
      if (!spoken || !E.practiceWord) return;

      const profile = E.currentProfile;
      const azure   = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
      const result  = await scorePronunciation(E.practiceWord, spoken, conf, azure, null);

      const scoreEl  = $('phoneme-score-circle');
      const numEl    = $('phoneme-score-num');
      const feedEl   = $('phoneme-score-feedback');

      numEl.textContent  = result.score;
      scoreEl.className  = `score-circle ${result.score >= 75 ? '' : result.score >= 60 ? 'score-mid' : 'score-low'}`;
      feedEl.textContent = result.feedback;
      show($('phoneme-score-display'));

      // 轮换下一个例词
      const ph = E.practicePhonem;
      if (ph?.examples) {
        const idx = ph.examples.indexOf(E.practiceWord);
        E.practiceWord = ph.examples[(idx + 1) % ph.examples.length];
        $('practice-word-display').textContent = E.practiceWord;
      }
    }
  );
}

// ===== 绕口令 =====

async function renderTwisterList() {
  if (!E.phrasesData) {
    try {
      const res = await fetch('data/builtin/english/adult_phrases.json');
      E.phrasesData = await res.json();
    } catch { return; }
  }

  const list = $('twister-list');
  if (!list) return;
  list.innerHTML = '';

  E.phrasesData.tongue_twisters?.forEach(tt => {
    const card = document.createElement('div');
    card.className = 'twister-card';
    card.innerHTML = `
      <div class="twister-focus">音素重点：${tt.focus}</div>
      <div class="twister-text">${tt.text}</div>
      <div class="twister-tip">💡 ${tt.tip}</div>
      <div class="twister-actions">
        <button class="btn-secondary twister-speak" data-text="${escapeHtml(tt.text)}">🔊 听</button>
        <button class="btn-secondary twister-record" data-id="${tt.id}">🎤 跟读</button>
      </div>
      <div class="twister-score hidden" id="ts-score-${tt.id}">
        <span class="ts-score-val"></span> <span class="ts-score-fb"></span>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.twister-speak').forEach(btn => {
    btn.addEventListener('click', () => speak(btn.dataset.text, 'en-US', 0.75));
  });

  list.querySelectorAll('.twister-record').forEach(btn => {
    btn.addEventListener('click', () => startTwisterRecord(btn.dataset.id));
  });
}

async function startTwisterRecord(id) {
  if (!SpeechSupport.stt) { toast('此设备不支持语音识别'); return; }
  const tt = E.phrasesData?.tongue_twisters?.find(t => t.id === id);
  if (!tt) return;

  toast('开始说...');
  let spoken = '', conf = 1;

  const stop = startListening(
    'en-US',
    (text, c) => { spoken = text; conf = c; },
    msg => toast(msg),
    async () => {
      if (!spoken) return;
      const profile = E.currentProfile;
      const azure   = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
      const result  = await scorePronunciation(tt.text.toLowerCase(), spoken.toLowerCase(), conf, azure, null);

      const scoreEl = $(`ts-score-${id}`);
      if (scoreEl) {
        scoreEl.querySelector('.ts-score-val').textContent = `${result.score}分`;
        scoreEl.querySelector('.ts-score-fb').textContent  = result.feedback;
        show(scoreEl);
      }
    }
  );
}

// ===== 今日数据弹窗 =====

export async function openTodayCardsModal(type) {
  const profile = window._App?.currentProfile;
  if (!profile) return;

  const allCards = await CardManager.getByProfile(profile.id);
  let cards, title;

  if (type === 'due-count') {
    cards = allCards.filter(c => c.nextReview <= todayStr() && c.reviewCount > 0);
    title = '今日待复习';
  } else if (type === 'new-count') {
    cards = allCards.filter(c => c.reviewCount === 0);
    title = '今日新词';
  } else {
    const prog = await import('./core.js').then(m => m.ProgressManager.getByDate(profile.id, todayStr()));
    title = '今日已学';
    cards = allCards.filter(c => c.lastReview === todayStr());
  }

  $('today-cards-modal-title').textContent = `${title}（${cards.length}张）`;

  const list = $('today-cards-list');
  list.innerHTML = '';

  if (!cards.length) {
    list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:24px">暂无数据</p>';
  } else {
    cards.slice(0, 50).forEach(c => {
      const item = document.createElement('div');
      item.className = 'today-card-item';
      item.innerHTML = `
        <span class="tc-front">${escapeHtml(c.front)}</span>
        <span class="tc-back">${escapeHtml(c.back.slice(0, 30))}${c.back.length > 30 ? '…' : ''}</span>
        <span class="tc-interval" title="下次复习">${c.interval ? `${c.interval}天后` : '新'}</span>
      `;
      list.appendChild(item);
    });
    if (cards.length > 50) {
      const more = document.createElement('p');
      more.style.cssText = 'text-align:center;color:var(--color-text-sub);padding:8px';
      more.textContent = `还有 ${cards.length - 50} 张...`;
      list.appendChild(more);
    }
  }

  show($('today-cards-modal'));
}

// ===== 工具 =====

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 语法要点 =====

// 内置语法数据（小学+初中核心语法点）
const GRAMMAR_DATA = [
  // ---- 小学语法 ----
  {
    id:'g_p01', level:'primary', title:'一般现在时',
    rule:'主语 + 动词原形（第三人称单数：动词+s/es）',
    examples:['I like cats.','She likes cats. （she/he/it用likes）','They play football every day.'],
    tips:['第三人称单数：go→goes，have→has，study→studies','否定：do not / does not + 动词原形'],
    tags:['时态','小学']
  },
  {
    id:'g_p02', level:'primary', title:'现在进行时',
    rule:'am/is/are + 动词-ing（正在做某事）',
    examples:['I am reading a book.','She is running now.','They are playing games.'],
    tips:['be动词：I→am，he/she/it→is，we/you/they→are','加-ing规则：run→running，make→making'],
    tags:['时态','小学']
  },
  {
    id:'g_p03', level:'primary', title:'一般过去时',
    rule:'动词过去式（规则：+ed；不规则需单独记忆）',
    examples:['I played football yesterday.','She went to school.（go→went）','We had dinner.（have→had）'],
    tips:['常见不规则：go→went，have→had，see→saw，come→came','否定：did not + 动词原形'],
    tags:['时态','小学']
  },
  {
    id:'g_p04', level:'primary', title:'一般将来时',
    rule:'will + 动词原形 / am-is-are going to + 动词原形',
    examples:['I will go tomorrow.','She is going to study.','It will rain tonight.'],
    tips:['will表意愿或预测','be going to表计划或已有迹象'],
    tags:['时态','小学']
  },
  {
    id:'g_p05', level:'primary', title:'There be 句型',
    rule:'There is + 单数/不可数  /  There are + 复数',
    examples:['There is a cat on the table.','There are three books here.','Is there a park near your home?'],
    tips:['就近原则：There is a cat and two dogs.（靠近is用is）','否定：There is no... / There are no...'],
    tags:['句型','小学']
  },
  {
    id:'g_p06', level:'primary', title:'How 问句',
    rule:'How + 形容词/副词 + 其他？',
    examples:['How old are you? — I\'m ten.','How many books? — Five.','How much is it? — 20 yuan.'],
    tips:['How many + 可数名词复数','How much + 不可数名词 / 问价格'],
    tags:['句型','疑问句','小学']
  },
  {
    id:'g_p07', level:'primary', title:'冠词 a/an/the',
    rule:'a/an：泛指单数；the：特指',
    examples:['I have a cat.（第一次提到）','The cat is cute.（再次提到）','I play the piano.（乐器前用the）'],
    tips:['a + 辅音音素开头的词：a book','an + 元音音素开头的词：an apple','独一无二的事物用the：the sun，the moon'],
    tags:['冠词','小学']
  },
  {
    id:'g_p08', level:'primary', title:'形容词比较级',
    rule:'比...更... : 形容词+er / more+形容词',
    examples:['He is taller than me.','This book is more interesting.','She runs faster than Tom.'],
    tips:['单音节：tall→taller，fast→faster','多音节：more interesting，more beautiful','不规则：good→better，bad→worse'],
    tags:['形容词','小学']
  },
  // ---- 初中语法 ----
  {
    id:'g_m01', level:'middle', title:'现在完成时',
    rule:'have/has + 过去分词（过去发生对现在有影响）',
    examples:['I have finished my homework.','She has lived here for 3 years.','Have you ever been to Beijing?'],
    tips:['for表持续时间：for 3 years','since表起点：since 2020','already（肯定）/ yet（否定疑问）/ ever（经历）/ never'],
    tags:['时态','初中']
  },
  {
    id:'g_m02', level:'middle', title:'被动语态',
    rule:'be动词 + 过去分词（表示被做/受到）',
    examples:['The book was written by Lu Xun.','English is spoken worldwide.','The window was broken yesterday.'],
    tips:['be动词时态要变：is→was→will be','by + 动作执行者（可省略）'],
    tags:['语态','初中']
  },
  {
    id:'g_m03', level:'middle', title:'宾语从句',
    rule:'think/know/say/wonder + that/if/疑问词 + 陈述语序',
    examples:['I think that he is right.','I wonder if she will come.','Do you know where he lives?'],
    tips:['宾语从句用陈述语序（不倒装）','that引导陈述，if/whether引导一般疑问','时态一致：主句过去时→从句也用过去时'],
    tags:['从句','初中']
  },
  {
    id:'g_m04', level:'middle', title:'定语从句',
    rule:'先行词 + which/that（物）/ who/that（人）+ 从句',
    examples:['The book which I read is good.','The man who helped me is kind.','This is the best film that I have ever seen.'],
    tips:['只能用that：先行词是不定代词、形容词最高级、序数词','定语从句修饰前面的名词'],
    tags:['从句','初中']
  },
  {
    id:'g_m05', level:'middle', title:'情态动词用法',
    rule:'can/could/may/might/must/should + 动词原形',
    examples:['You must study hard.（必须）','She can swim.（能力）','May I come in?（请求）','You should sleep early.（建议）'],
    tips:['must not = 禁止；don\'t have to = 不必要（区别重要！）','could/might比can/may更委婉或可能性更小'],
    tags:['情态动词','初中']
  },
  {
    id:'g_m06', level:'middle', title:'状语从句',
    rule:'时间/条件/原因/结果 + 主句',
    examples:['When I was young, I liked swimming.','If it rains, I will stay home.','It was so hot that we stayed inside.'],
    tips:['条件状语：if（如果）、unless（除非=if not）','结果：so+adj+that / such+n+that','时态：条件从句用一般现在时代替将来时'],
    tags:['从句','状语','初中']
  },
  {
    id:'g_m07', level:'middle', title:'非谓语动词',
    rule:'动名词(doing) / 不定式(to do) 作主语宾语等',
    examples:['Swimming is fun.（动名词作主语）','I want to go.（不定式作宾语）','She is good at singing.（介词后用doing）'],
    tips:['enjoy/finish/mind/keep + doing','want/hope/decide/plan + to do','be good at / look forward to + doing'],
    tags:['非谓语','初中']
  },
  {
    id:'g_m08', level:'middle', title:'虚拟语气（基础）',
    rule:'If + 过去式，would/could + 动词原形（与现在相反的假设）',
    examples:['If I were a bird, I would fly.','If I had money, I could buy it.','I wish I were taller.'],
    tips:['if从句中be动词统一用were（不管主语）','wish后也用虚拟：I wish I knew the answer.'],
    tags:['虚拟语气','初中']
  },
  // ---- 小学语法（扩充）----
  {
    id:'g_p09', level:'primary', title:'一般疑问句与特殊疑问句',
    rule:'一般疑问句：助动词提前；特殊疑问句：疑问词 + 助动词 + 主语 + 动词',
    examples:['Do you like cats? — Yes, I do.','Is she a student? — No, she isn\'t.','What do you eat for breakfast?','Where does he live?'],
    tips:['一般疑问句回答用 Yes/No','特殊疑问词：what、where、when、why、who、how','how 开头也属于特殊疑问句'],
    tags:['句型','疑问句','小学']
  },
  {
    id:'g_p10', level:'primary', title:'祈使句',
    rule:'动词原形开头（省略主语 you），否定：Don\'t + 动词原形',
    examples:['Open the door, please.','Don\'t run in the classroom.','Be quiet!','Let\'s go to the park.'],
    tips:['please 使祈使句更礼貌，可置于句首或句尾','Let\'s + 动词原形 表示建议一起做某事','否定形式：Don\'t forget your homework.'],
    tags:['句型','祈使句','小学']
  },
  {
    id:'g_p11', level:'primary', title:'感叹句',
    rule:'What + a/an + 形容词 + 单数名词！/ How + 形容词/副词 + 主谓！',
    examples:['What a beautiful flower!','What an interesting story!','How fast she runs!','How clever the boy is!'],
    tips:['What 后接名词短语：What + a/an + adj + 单数名词 / What + adj + 复数或不可数名词','How 后接形容词或副词，主谓可省略','What a day! 也是感叹句（省略形容词）'],
    tags:['句型','感叹句','小学']
  },
  {
    id:'g_p12', level:'primary', title:'代词用法',
    rule:'人称代词（主格/宾格）/ 物主代词（形容词性/名词性）/ 反身代词',
    examples:['I love her. She loves me.（主格/宾格）','This is my book. This book is mine.（形容词性/名词性）','He did it himself.（反身代词）'],
    tips:['主格做主语：I / you / he / she / it / we / they','宾格做宾语：me / you / him / her / it / us / them','名词性物主代词单独使用：mine / yours / his / hers / ours / theirs','反身代词：myself / yourself / himself / herself / itself / ourselves / themselves'],
    tags:['代词','小学']
  },
  {
    id:'g_p13', level:'primary', title:'介词用法',
    rule:'时间介词 at/on/in；地点介词 in/on/at/near/under；方式介词 by/with',
    examples:['at 8 o\'clock / on Monday / in July / in 2020','in the box / on the desk / at the door / near the school','go to school by bus / write with a pen'],
    tips:['时间：at + 具体时刻，on + 具体某天，in + 月份/年份/季节','地点：in 表在…里面，on 表在…上面（接触），at 表在某处（较小地点）','方式：by + 交通工具（不加冠词），with + 工具'],
    tags:['介词','小学']
  },
  {
    id:'g_p14', level:'primary', title:'连词用法',
    rule:'并列连词：and/but/or；从属连词：because/so/when/if',
    examples:['I like cats and dogs.','I want to go, but it\'s raining.','Is it a cat or a dog?','Because it rained, we stayed home.','If you study hard, you will pass.'],
    tips:['and 表并列；but 表转折；or 表选择','because 引导原因（不与 so 同用，二选一）','when 引导时间状语从句；if 引导条件状语从句','so 表结果：It rained, so we stayed home.'],
    tags:['连词','小学']
  },
  {
    id:'g_p15', level:'primary', title:'频率副词',
    rule:'always > usually > often > sometimes > never（放在 be 动词后/实义动词前）',
    examples:['I always brush my teeth.','She usually gets up at 7.','He sometimes plays football.','They never eat junk food.'],
    tips:['位置：be 动词之后，实义动词之前','always=100%；usually=80%；often=60%；sometimes=40%；never=0%','可用 How often 提问频率副词'],
    tags:['副词','频率副词','小学']
  },
  {
    id:'g_p16', level:'primary', title:'可数名词与不可数名词',
    rule:'可数名词可加 a/an，有复数；不可数名词不加 a/an，无复数，用 some/much/a lot of',
    examples:['a book / two books（可数）','water / some water / a glass of water（不可数）','I need some rice and two eggs.'],
    tips:['常见不可数名词：water、milk、bread、rice、money、information、advice、weather','不可数名词用量词：a cup of, a piece of, a bottle of','much 修饰不可数；many 修饰可数复数'],
    tags:['名词','可数不可数','小学']
  },
  {
    id:'g_p17', level:'primary', title:'名词复数变化规则',
    rule:'规则变化：+s / +es / 去y加ies / +ves；不规则另记',
    examples:['cat→cats，bus→buses，baby→babies，leaf→leaves','child→children，man→men，tooth→teeth，sheep→sheep'],
    tips:['一般直接加 -s：books, cats, dogs','以 s/x/sh/ch 结尾加 -es：buses, boxes, dishes','辅音+y 结尾：去y加ies（baby→babies），元音+y 直接加s（day→days）','不规则：foot→feet，mouse→mice，person→people'],
    tags:['名词','复数','小学']
  },
  {
    id:'g_p18', level:'primary', title:'some 与 any 的区别',
    rule:'some 用于肯定句；any 用于否定句和疑问句（期待肯定回答的疑问句用 some）',
    examples:['I have some apples.（肯定句）','I don\'t have any apples.（否定句）','Do you have any questions?（疑问句）','Would you like some tea?（期待肯定，用some）'],
    tips:['肯定句用 some，否定句和一般疑问句用 any','Would you like some...? 是邀请/提议，用 some','any 在肯定句中表示"任何一个"：Take any seat.'],
    tags:['限定词','小学']
  },
  {
    id:'g_p19', level:'primary', title:'too / either / also 区别',
    rule:'too 和 also 表"也"（肯定句）；either 表"也"（否定句）',
    examples:['I like cats. She likes cats, too.','I also like cats.（also 在动词前/be后）','I don\'t like cats. He doesn\'t like them, either.'],
    tips:['too：放句末，常用逗号隔开：I can swim, too.','also：放在助动词/be 之后，实义动词之前','either：放句末，用于否定句：I can\'t swim, either.'],
    tags:['副词','小学']
  },
  {
    id:'g_p20', level:'primary', title:'动词不定式基础',
    rule:'to + 动词原形，作宾语/目的/主语',
    examples:['I want to go to the park.','She likes to read books.','I have to finish my homework.','To learn English is important.'],
    tips:['want/like/hope/decide/plan/need + to do','have to 表必须（have 随人称和时态变化）','目的状语：I study hard to pass the exam.','too...to...：too tired to walk（太…而不能）'],
    tags:['非谓语','不定式','小学']
  },
  // ---- 初中语法（扩充）----
  {
    id:'g_m09', level:'middle', title:'现在完成时 vs 一般过去时',
    rule:'现在完成时强调对现在的影响；一般过去时强调过去某时间点',
    examples:['I have lost my key.（现在没有）vs I lost my key yesterday.（过去时间）','She has lived here for 3 years.（至今）vs She lived here in 2010.（过去，已不在）'],
    tips:['有具体过去时间状语（yesterday/last year/in 2020）用一般过去时','for + 时间段 / since + 起点 + 现在完成时','just/already/yet/ever/never 常与现在完成时连用','强调结果是否影响现在用完成时'],
    tags:['时态','初中']
  },
  {
    id:'g_m10', level:'middle', title:'过去进行时',
    rule:'was/were + 动词-ing（过去某时刻正在进行的动作）',
    examples:['I was reading at 8 last night.','They were playing football when it rained.','What were you doing at that time?'],
    tips:['常与具体过去时间点连用：at 9 o\'clock yesterday','when引导的时间从句：过去进行时表背景动作，一般过去时表中断动作','when he called, I was having dinner.（打电话时我在吃饭）'],
    tags:['时态','初中']
  },
  {
    id:'g_m11', level:'middle', title:'过去完成时',
    rule:'had + 过去分词（过去某时间点之前已发生的动作）',
    examples:['When I arrived, she had already left.','He had studied English before he came to China.','I found that I had lost my wallet.'],
    tips:['表示"过去的过去"：比过去某一时刻更早发生的动作','常与 before/after/when/by the time 连用','by the time + 过去时间从句，主句用过去完成时'],
    tags:['时态','初中']
  },
  {
    id:'g_m12', level:'middle', title:'将来进行时',
    rule:'will be + 动词-ing（将来某时刻正在进行的动作）',
    examples:['This time tomorrow, I will be flying to Beijing.','Will you be using the car tonight?','At 8 p.m., she will be sleeping.'],
    tips:['强调将来某时刻动作正在进行','可表示礼貌询问（比 will you... 更委婉）：Will you be attending the meeting?','与将来时间状语连用：this time tomorrow, at this time next week'],
    tags:['时态','初中']
  },
  {
    id:'g_m13', level:'middle', title:'情态动词完整用法',
    rule:'must/have to/need/dare + 动词原形；表义务、必要、需要、敢于',
    examples:['You must be quiet in the library.（内部义务）','I have to finish this by Friday.（外部义务）','Need I attend the meeting? — No, you needn\'t.','How dare you say that!'],
    tips:['must：主观义务/强烈推断；have to：客观必须（随时态变化）','must not 禁止；don\'t have to 不必（区别！）','need 作情态动词：否定 needn\'t，疑问 Need I...?；作实义动词：need to do','dare 作情态动词：否定 daren\'t，疑问 Dare he...?'],
    tags:['情态动词','初中']
  },
  {
    id:'g_m14', level:'middle', title:'强调句',
    rule:'It is/was + 被强调成分 + that/who + 其余部分',
    examples:['It was Tom who broke the window.（强调人）','It was yesterday that I met her.（强调时间）','It is hard work that leads to success.（强调主语）'],
    tips:['强调人用 who 或 that，强调其他成分用 that','去掉 It is/was...that... 后句子仍完整','用 It was...that... 改写：I met her yesterday → It was yesterday that I met her.','注意与定语从句区分：强调句去掉后仍成句，定语从句不行'],
    tags:['句型','强调句','初中']
  },
  {
    id:'g_m15', level:'middle', title:'倒装句',
    rule:'否定副词/Only 位于句首时，主谓倒装（助动词提前）',
    examples:['Never have I seen such a beautiful place.','Not only did he come, but he also brought gifts.','Only when you fail do you learn.','So tired was she that she fell asleep at once.'],
    tips:['否定副词开头倒装：never / seldom / hardly / not until / not only','Only + 状语开头：Only then did I understand.','So/Such 开头：So + adj + be + 主语（So cold was it that...）','部分倒装：助动词/be 提到主语前，实义动词不动'],
    tags:['句型','倒装句','初中']
  },
  {
    id:'g_m16', level:'middle', title:'名词从句',
    rule:'主语从句/表语从句/宾语从句/同位语从句，引导词：that/if/whether/疑问词',
    examples:['What he said surprised us.（主语从句）','The question is whether we can finish.（表语从句）','The news that he passed makes me happy.（同位语从句）'],
    tips:['主语从句常用 it 作形式主语：It is clear that he is right.','表语从句：The problem is that nobody knows.','同位语从句解释名词内容，常跟在 news/fact/idea/question/doubt 后','that 引导同位语从句不可省略'],
    tags:['从句','名词从句','初中']
  },
  {
    id:'g_m17', level:'middle', title:'非限制性定语从句',
    rule:'先行词 + 逗号 + which/who + 从句（补充说明，不限定范围）',
    examples:['My mother, who is a doctor, works hard.','Beijing, which is the capital of China, is beautiful.','He passed the exam, which surprised everyone.'],
    tips:['非限制性定语从句前后有逗号，which 可指整个主句','不能用 that，只能用 which（物）或 who（人）','去掉从句后主句意思仍完整（只是少了补充信息）','which 指代整个句子：He won, which made us happy.'],
    tags:['从句','定语从句','初中']
  },
  {
    id:'g_m18', level:'middle', title:'间接引语',
    rule:'直接引语 → 间接引语：时态后退一格，人称/时间/地点状语相应改变',
    examples:['"I am happy." → He said he was happy.（陈述句）','"Are you ready?" → She asked if I was ready.（一般疑问句）','"Come here!" → He told me to go there.（祈使句）'],
    tips:['时态变化：am/is→was，will→would，can→could，have done→had done','人称变化：看逻辑，通常第一人称变第三人称','时间状语：now→then，today→that day，yesterday→the day before，tomorrow→the next day','地点：here→there；this→that；come→go'],
    tags:['引语','间接引语','初中']
  },
  {
    id:'g_m19', level:'middle', title:'动名词与不定式区别',
    rule:'接 doing（动名词）：finish/enjoy/mind/keep/avoid；接 to do（不定式）：want/hope/decide/plan；接两者意义不同：remember/forget/stop/try',
    examples:['I enjoy swimming.（enjoy只接doing）','She decided to leave.（decide只接to do）','Remember to lock the door.（记得去做）vs I remember locking it.（记得曾做）'],
    tips:['只接 doing：enjoy, finish, mind, keep, avoid, suggest, consider, practise','只接 to do：want, hope, wish, decide, plan, agree, refuse, manage','两者均可但意义不同：remember/forget/stop/try/regret'],
    tags:['非谓语','动名词','不定式','初中']
  },
  {
    id:'g_m20', level:'middle', title:'过去分词作定语与状语',
    rule:'过去分词（done）作定语：放名词前/后；作状语：表时间/原因/条件/伴随（被动含义）',
    examples:['the broken window（前置定语）','the letter written by my friend（后置定语）','Given more time, I could do better.（条件）','Seen from above, the city looks beautiful.（时间/条件）'],
    tips:['过去分词作定语表被动或完成：a closed door（被关上的门）','单个过去分词前置，短语后置','作状语时，分词的逻辑主语必须与主句主语一致','区分：现在分词作定语（主动/进行）vs 过去分词（被动/完成）'],
    tags:['非谓语','过去分词','初中']
  },
  {
    id:'g_m21', level:'middle', title:'现在分词作定语与状语',
    rule:'现在分词（doing）作定语：表主动/进行；作状语：表时间/原因/结果/伴随',
    examples:['the running water（流动的水，前置）','the boy standing there（站在那里的男孩，后置）','Seeing the teacher, he stood up.（时间：一看到）','Not knowing the answer, she kept quiet.（原因）'],
    tips:['现在分词作定语：主动含义，单个前置，短语后置','作状语时，分词逻辑主语须与主句主语一致','表时间（当…时）、原因（因为…）、结果（导致…，用 resulting in）、伴随（同时…）','否定形式：Not knowing / Having not done'],
    tags:['非谓语','现在分词','初中']
  },
  {
    id:'g_m22', level:'middle', title:'独立主格结构',
    rule:'名词/代词 + 非谓语动词（doing/done/to do）或形容词/副词，整体作状语',
    examples:['Weather permitting, we will go on a picnic.（条件）','The work done, he went home.（时间，work被完成）','He sat there, his eyes closed.（伴随，眼睛被闭上）'],
    tips:['独立主格的"主语"与主句主语不同，是独立的逻辑主语','分词与其逻辑主语之间是主动关系用 doing，被动关系用 done','常见结构：名词+done 或 名词+doing','with 复合结构是独立主格的变体：with + 名词 + 分词/形容词/副词'],
    tags:['非谓语','独立主格','初中']
  },
  {
    id:'g_m23', level:'middle', title:'with 复合结构',
    rule:'with + 名词/代词 + 分词/形容词/副词/不定式，表伴随状态',
    examples:['He sat there with his eyes closed.（眼睛被闭上，closed）','She walked in with a book in her hand.（副词短语）','With so much work to do, I can\'t go out.（to do表待完成）'],
    tips:['with + n + doing：名词与动词是主动关系（眼睛睁着 with eyes open/opening）','with + n + done：名词与动词是被动关系（书被打开 with the book opened）','with + n + adj/adv/prep phrase：描述状态','常作伴随状语，表示同时进行的状态'],
    tags:['句型','with复合结构','初中']
  },
  {
    id:'g_m24', level:'middle', title:'比较级特殊用法',
    rule:'the more...the more...；倍数比较；否定词+比较级=最高级',
    examples:['The harder you work, the better results you get.','This room is twice as large as that one.（倍数as...as）','Nothing is more important than health.（否定+比较级=最高级）'],
    tips:['the + 比较级，the + 比较级：随着…越来越…','倍数表达：twice / three times + as + 原级 + as','否定词+比较级 = 最高级含义：Nothing is worse than...','more and more + adj：越来越…（程度递增）'],
    tags:['形容词','比较级','初中']
  },
  {
    id:'g_m25', level:'middle', title:'虚拟语气完整用法',
    rule:'与现在相反：if+过去式，would do；与过去相反：if+had done，would have done；wish/would rather/as if也用虚拟',
    examples:['If I were you, I would study harder.（与现在相反）','If I had studied, I would have passed.（与过去相反）','I wish I could fly.（wish+过去式）','She talks as if she knew everything.（as if+虚拟）'],
    tips:['现在虚拟：if从句用过去式（be统一用were）；主句用would/could/might + do','过去虚拟：if从句用had done；主句用would/could/might + have done','混合虚拟：if I had done（过去）...I would be...（现在结果）','wish后接过去式（现在愿望）或had done（过去遗憾）或would do（将来期望）'],
    tags:['虚拟语气','初中']
  },
  {
    id:'g_m26', level:'middle', title:'省略句与替代',
    rule:'避免重复，用 do so / one / it / so 等替代；省略相同成分',
    examples:['— Will you go? — Yes, I will.（省略 go）','I want to go but she doesn\'t want to.（省略 go）','I lost my pen. I need to buy one.（one替代可数单数）','— Is he happy? — I think so.（so替代从句）'],
    tips:['do so / do it：替代动词短语（do so 更正式）','one/ones：替代可数名词（不定指）；it：替代特指名词','so/not：替代 that 从句：I think so. / I hope not.','省略：条件从句可省略 if（用倒装代替）：Had I known... = If I had known...'],
    tags:['句型','省略','初中']
  },
  {
    id:'g_m27', level:'middle', title:'情景交际常用表达',
    rule:'道歉/感谢/建议/邀请/拒绝的固定句式',
    examples:['I\'m sorry for being late. — That\'s all right.（道歉）','Thank you so much! — You\'re welcome. / My pleasure.（感谢）','Why not join us? / Shall we...? / What about...?（建议）','Would you like to...? — I\'d love to, but...（邀请/有礼貌的拒绝）'],
    tips:['道歉：Sorry / I\'m sorry / I apologize；回应：Never mind / That\'s OK / It\'s nothing','感谢：Thanks / Thank you / I really appreciate it；回应：You\'re welcome / Not at all','建议：Why not + do / How about + doing / I suggest（that）you...','邀请：Would you like to... / Would you come to...；拒绝：I\'d like to, but... / I\'m afraid I can\'t...'],
    tags:['交际','句型','初中']
  },
  {
    id:'g_m28', level:'middle', title:'常见句型转换',
    rule:'主动↔被动；肯定↔否定；直接引语↔间接引语；简单句↔复合句',
    examples:['Tom wrote the letter. → The letter was written by Tom.（主动→被动）','It is so cold that we can\'t go out. → It is too cold to go out.（so...that→too...to）','He is the tallest. → No one is taller than him.（最高级→比较级）'],
    tips:['too...to... = so...that...not：太…以至于不能…','enough to = so...that... + can/could：足够…以至于能…','高级→比较级：the tallest = taller than any other person','含义相同句型转换：because → as/since；although → though；not...until → only when'],
    tags:['句型转换','初中']
  }
];

function renderGrammarList(level) {
  const list = document.getElementById('grammar-list');
  if (!list) return;

  // 绑定过滤按钮
  document.querySelectorAll('.grammar-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grammar-level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrammarList(btn.dataset.level);
    });
  });

  const filtered = level === 'all' ? GRAMMAR_DATA : GRAMMAR_DATA.filter(g => g.level === level);
  list.innerHTML = '';

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'grammar-card';
    card.innerHTML = `
      <div class="grammar-header">
        <span class="grammar-title">${escapeHtml(g.title)}</span>
        <span class="grammar-level-tag ${g.level}">${g.level === 'primary' ? '小学' : '初中'}</span>
      </div>
      <div class="grammar-rule">${escapeHtml(g.rule)}</div>
      <div class="grammar-examples">
        ${g.examples.map(e => `<div class="grammar-ex">
          <button class="grammar-speak" data-text="${escapeHtml(e.split('.')[0].replace(/'/g,''))}">🔊</button>
          <span>${escapeHtml(e)}</span>
        </div>`).join('')}
      </div>
      ${g.tips.length ? `<div class="grammar-tips">
        ${g.tips.map(t => `<div class="grammar-tip">💡 ${escapeHtml(t)}</div>`).join('')}
      </div>` : ''}
    `;
    card.querySelectorAll('.grammar-speak').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        speak(btn.dataset.text, 'en-US', 0.8);
      });
    });
    list.appendChild(card);
  });

  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">暂无内容</p>';
  }
}
