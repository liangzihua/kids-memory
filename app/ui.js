/**
 * ui.js — 页面路由、渲染与所有交互逻辑
 * 依赖：core.js / algorithm.js / parser.js / speech.js / pronunciation.js / english.js
 */

import { ProfileManager, DeckManager, CardManager, ProgressManager, exportData, todayStr } from './core.js';
import { reviewCard, buildStudyQueue, generateDistractors, resolveAlgorithm } from './algorithm.js';
import { parseFile, parseImageOCR } from './parser.js';
import { speak, speakCard, speakEnglish, speakChinese, startListening, stopListening, startVoiceProfileSwitch, SpeechSupport, setSavedVoiceName, getAvailableVoices } from './speech.js';
import { scorePronunciation, startRecording, stopRecording } from './pronunciation.js';
import { initEnglish, openTodayCardsModal } from './english.js';
import { initPassages } from './passages.js';
import { parseImageWithAI, hasAIKey, handleAIGenerate } from './ai.js';
import { initVocabStore } from './vocab-store.js';
import { initRecitation, renderRecitationList, openRecitationPage, openRecitationListPage } from './recitation.js';

// ===== 应用状态 =====

const App = {
  currentProfile:  null,
  studyQueue:      [],
  studyIndex:      0,
  sessionResults:  [],
  allProfileCards: [],
  isCardFlipped:   false,
  cardDirection:   'normal',  // 'normal' = 正向(front→back)，'reverse' = 反向(back→front)
  recordStream:    null,
  recordStop:      null
};

// ===== 工具 =====

function $(id)  { return document.getElementById(id); }
function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

function toast(msg, duration = 2500) {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ===== 路由 =====

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = $(`page-${pageId}`);
  if (target) target.classList.add('active');

  // 更新底部导航
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
}

// ===== 初始化 =====

async function init() {
  await loadProfiles();

  try {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === 'english') {
        showPage('english-adult');
        return;
      }
      showPage(page);
      if (page === 'library') {
        renderLibrary();
        App._needLibraryRefresh = false;
      }
      if (page === 'search')   initSearchPage();
      if (page === 'stats')    renderStats();
      if (page === 'settings') renderSettings();
    });
  });

  // 所有「返回」按钮
  document.querySelectorAll('.btn-back[data-page]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // 题库年级过滤按钮 → 重新渲染
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLibrary();
    });
  });

  // 主页英语快捷入口
  $('btn-quick-oral')?.addEventListener('click', () => {
    showPage('english-adult');
    import('./english.js').then(m => m.switchEnglishTabPublic?.('speaking') || null);
    document.getElementById('etab-speaking')?.scrollIntoView();
    // 切换 tab
    document.querySelectorAll('.english-tab').forEach(t => t.classList.toggle('active', t.dataset.etab === 'speaking'));
    document.querySelectorAll('.english-section').forEach(s => {
      s.classList.toggle('active', s.id === 'etab-speaking');
      s.classList.toggle('hidden', s.id !== 'etab-speaking');
    });
    import('./english.js').then(m => m.renderScenarioGrid?.());
  });

  $('btn-quick-phonetics')?.addEventListener('click', () => {
    showPage('english-adult');
    document.querySelectorAll('.english-tab').forEach(t => t.classList.toggle('active', t.dataset.etab === 'phonetics'));
    document.querySelectorAll('.english-section').forEach(s => {
      s.classList.toggle('active', s.id === 'etab-phonetics');
      s.classList.toggle('hidden', s.id !== 'etab-phonetics');
    });
    import('./english.js').then(m => m.renderPhonemeGrid?.('vowels'));
  });

  $('btn-quick-grammar')?.addEventListener('click', () => {
    showPage('english-adult');
    document.querySelectorAll('.english-tab').forEach(t => t.classList.toggle('active', t.dataset.etab === 'grammar'));
    document.querySelectorAll('.english-section').forEach(s => {
      s.classList.toggle('active', s.id === 'etab-grammar');
      s.classList.toggle('hidden', s.id !== 'etab-grammar');
    });
    import('./english.js').then(m => m.renderGrammarList?.('all'));
  });

  $('btn-study-back')?.addEventListener('click', () => showPage('home'));
  $('btn-back-home')?.addEventListener('click', () => { hide($('session-complete')); showPage('home'); loadHomeData(); });
  $('btn-continue')?.addEventListener('click', () => startStudySession());

  // 学科卡片（排除古诗文背诵，它单独处理）
  document.querySelectorAll('.subject-card[data-subject]').forEach(btn => {
    btn.addEventListener('click', () => startStudyBySubject(btn.dataset.subject));
  });

  // 古诗文背诵主界面入口
  $('btn-home-recite')?.addEventListener('click', openHomeRecitation);

  // 主页「开始复习」
  $('btn-start-review')?.addEventListener('click', () => startStudySession());

  // 档案切换按钮
  $('btn-switch-profile')?.addEventListener('click', () => showPage('profiles'));

  // 语音切换按钮
  $('btn-voice-switch').addEventListener('click', openVoiceSwitch);
  $('btn-voice-cancel').addEventListener('click', closeVoiceSwitch);

  // 档案管理弹窗
  $('btn-manage-profiles').addEventListener('click', openManageProfiles);
  $('btn-manage-close').addEventListener('click', () => hide($('manage-profiles-modal')));
  $('btn-manage-add').addEventListener('click', () => {
    hide($('manage-profiles-modal'));
    openProfileEditModal(null);
  });

  // 档案新建/编辑弹窗
  $('btn-profile-cancel').addEventListener('click', () => hide($('profile-edit-modal')));
  $('btn-profile-save').addEventListener('click', saveProfileFromModal);

  // 头像选择
  $('avatar-picker').addEventListener('click', e => {
    const btn = e.target.closest('.avatar-option');
    if (!btn) return;
    document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    $('profile-selected-avatar').textContent = btn.dataset.emoji;
  });

  // 导入 + AI
  $('btn-ai-generate')?.addEventListener('click', openAIModal);

  // AI 弹窗内部 provider tabs（限定在弹窗内，不影响其他元素）
  $('ai-generate-modal')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-provider]');
    if (!tab) return;
    $('ai-generate-modal').querySelectorAll('[data-provider]').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    localStorage.setItem('ai_provider', tab.dataset.provider);
  });

  // AI 弹窗取消
  $('btn-ai-cancel')?.addEventListener('click', () => hide($('ai-generate-modal')));

  // AI 弹窗生成按钮
  $('btn-ai-submit')?.addEventListener('click', handleAIGenerate);

  // 模板下载
  document.querySelectorAll('.btn-tpl').forEach(btn => {
    btn.addEventListener('click', () => downloadTemplate(btn.dataset.tpl));
  });

  // 主页背诵方向切换
  document.querySelectorAll('.rd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rd-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.cardDirection = btn.dataset.dir;
    });
  });

  // 学习模式 tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchStudyMode(tab.dataset.mode));
  });

  // 闪卡翻转
  $('flashcard')?.addEventListener('click', e => {
    // 不要在按钮区域点击时触发翻转
    if (e.target.closest('.btn-card-action') || e.target.closest('.voice-answer-result')) return;
    flipCard();
  });

  // 评分按钮
  document.querySelectorAll('.btn-rating[data-rating]').forEach(btn => {
    btn.addEventListener('click', () => submitRating(parseInt(btn.dataset.rating)));
  });

  // 重看正面（翻回去）
  $('btn-flip-back')?.addEventListener('click', () => {
    App.isCardFlipped = false;
    $('card-inner').classList.remove('flipped');
    hide($('rating-buttons'));
  });

  // 朗读按钮（卡片右上角 + 底部工具栏）
  $('btn-speak-front')?.addEventListener('click', e => { e.stopPropagation(); speakCurrentCardFront(); });
  $('btn-speak-card')?.addEventListener('click', speakCurrentCardFront);
  $('btn-speak-back')?.addEventListener('click',  e => { e.stopPropagation(); speakCurrentCardBack(); });

  // 语音回答（底部工具栏麦克风）
  $('btn-voice-answer')?.addEventListener('click', startVoiceAnswer);

  // 选择题
  $('choice-options')?.addEventListener('click', e => {
    const btn = e.target.closest('.choice-btn');
    if (btn) onChoiceSelected(btn);
  });

  // 听写
  $('btn-check-dictation')?.addEventListener('click', checkDictation);
  $('btn-next-dictation')?.addEventListener('click', () => submitRating(2));
  $('btn-dictation-replay')?.addEventListener('click', replayDictation);
  $('btn-dictation-peek')?.addEventListener('click', peekDictationAnswer);
  $('dictation-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkDictation(); });

  // 跟读
  $('btn-record')?.addEventListener('click', toggleRecording);

  // 导入（原导入页，仍保留）
  $('file-input')?.addEventListener('change', e => handleFileInput(e.target.files[0]));
  $('image-input')?.addEventListener('change', e => handleImageInput(e.target.files[0]));
  $('btn-manual-input')?.addEventListener('click', () => show($('manual-modal')));
  $('btn-manual-cancel')?.addEventListener('click', () => hide($('manual-modal')));
  $('btn-manual-save')?.addEventListener('click', () => saveManualCard(false));
  $('btn-manual-add-more')?.addEventListener('click', () => saveManualCard(true));
  $('btn-confirm-import')?.addEventListener('click', confirmImport);
  $('btn-load-builtin')?.addEventListener('click', showBuiltinLibrary);

  // 导入模式切换（新建 / 追加）
  document.querySelectorAll('.import-mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.import-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isAppend = btn.dataset.mode === 'append';
      $('import-new-section')?.classList.toggle('hidden', isAppend);
      $('import-append-section')?.classList.toggle('hidden', !isAppend);
      // 加载已有题库到下拉框
      if (isAppend && App.currentProfile) {
        const decks = await DeckManager.getByProfile(App.currentProfile.id);
        const sel   = $('import-target-deck');
        if (sel) {
          sel.innerHTML = '<option value="">-- 选择要追加的题库 --</option>' +
            decks.map(d => `<option value="${d.id}">${escapeHtml(d.name)}（${App.allProfileCards.filter(c=>c.deckId===d.id).length}张）</option>`).join('');
        }
      }
    });
  });

  // 题库搜索
  const searchInput = $('library-search-input');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = searchInput.value.trim();
      if (q) {
        show($('btn-search-clear'));
        searchTimer = setTimeout(() => searchCards(q), 300);
      } else {
        hide($('btn-search-clear'));
        hide($('search-results'));
      }
    });
    $('btn-search-clear')?.addEventListener('click', () => {
      searchInput.value = '';
      hide($('btn-search-clear'));
      hide($('search-results'));
    });
  }

  // 题库内导入弹窗
  $('btn-import-to-library')?.addEventListener('click', () => show($('import-to-library-modal')));
  $('btn-import-lib-cancel')?.addEventListener('click', () => hide($('import-to-library-modal')));
  $('lib-file-input')?.addEventListener('change', e => {
    hide($('import-to-library-modal'));
    handleFileInputWithSubject(e.target.files[0]);
  });
  $('lib-image-input')?.addEventListener('change', e => {
    hide($('import-to-library-modal'));
    handleImageInput(e.target.files[0]);
  });
  $('btn-lib-manual')?.addEventListener('click', () => {
    hide($('import-to-library-modal'));
    show($('manual-modal'));
  });
  $('btn-lib-ai')?.addEventListener('click', () => {
    hide($('import-to-library-modal'));
    openAIModal();
  });

  // 设置
  $('setting-new-per-day')?.addEventListener('input', e => {
    $('new-per-day-value').textContent = e.target.value;
  });
  $('setting-speech-rate')?.addEventListener('input', e => {
    $('speech-rate-value').textContent = `${e.target.value}×`;
  });
  $('btn-save-azure')?.addEventListener('click', saveAzureConfig);
  $('btn-save-ai-config')?.addEventListener('click', saveAIConfig);
  $('btn-update-builtin')?.addEventListener('click', updateAllBuiltinDecks);
  $('btn-export-data')?.addEventListener('click', exportCurrentProfile);
  $('btn-clear-data')?.addEventListener('click', clearCurrentProfileData);

  // 隐私政策弹窗
  $('btn-show-privacy')?.addEventListener('click', () => {
    $('privacy-overlay')?.classList.remove('hidden');
  });
  $('btn-close-privacy')?.addEventListener('click', () => {
    $('privacy-overlay')?.classList.add('hidden');
  });
  $('btn-privacy-ok')?.addEventListener('click', () => {
    $('privacy-overlay')?.classList.add('hidden');
  });
  $('privacy-overlay')?.addEventListener('click', e => {
    if (e.target === $('privacy-overlay')) $('privacy-overlay').classList.add('hidden');
  });
  $('btn-add-profile')?.addEventListener('click', () => openProfileEditModal(null));

  // 手势：左右滑动 = 评分（闪卡）
  setupSwipeGesture();

  // 全局从左边缘右划 = 返回上一页
  setupBackGesture();

  // 跟读页面按钮
  initSpeakingButtons();

  // 触发 iOS Safari 的 TTS 初始化（需在用户手势中调用一次）
  document.body.addEventListener('touchstart', () => {
    if (SpeechSupport.tts && !window._ttsInited) {
      const u = new SpeechSynthesisUtterance('');
      speechSynthesis.speak(u);
      window._ttsInited = true;
    }
  }, { once: true });

  } catch (err) {
    // 某个元素不存在导致绑定失败，记录但不阻断其他功能
    console.warn('init() binding error:', err);
  }
}

// ===== 档案选择页 =====

async function loadProfiles() {
  const profiles = await ProfileManager.getAll();

  if (profiles.length === 0) {
    // 首次运行：创建默认档案
    const profile = await ProfileManager.create('小朋友', '🐼', 'primary');
    App.currentProfile = profile;
    showPage('home');
    loadHomeData();
    return;
  }

  renderProfilesGrid(profiles);
  showPage('profiles');
}

function renderProfilesGrid(profiles) {
  const grid = $('profiles-grid');
  grid.innerHTML = '';

  profiles.forEach(p => {
    const card = document.createElement('button');
    card.className = 'profile-card';
    card.innerHTML = `
      <div class="profile-avatar">${p.avatar || '🐣'}</div>
      <div class="profile-name">${escapeHtml(p.name)}</div>
      <div class="profile-grade">${gradeLabel(p.grade)}</div>
    `;
    card.addEventListener('click', () => selectProfile(p));
    grid.appendChild(card);
  });

  // 添加按钮
  const addBtn = document.createElement('button');
  addBtn.className = 'profile-card profile-add';
  addBtn.innerHTML = `<div class="profile-avatar" style="background:none;font-size:36px">+</div><div class="profile-name">添加</div>`;
  addBtn.addEventListener('click', addProfileDialog);
  grid.appendChild(addBtn);
}

async function selectProfile(profile) {
  App.currentProfile = profile;
  App.allProfileCards = await CardManager.getByProfile(profile.id);
  $('current-avatar').textContent = profile.avatar || '🐣';
  $('current-name').textContent   = profile.name;

  // 暴露 App 给 english.js 访问（only currentProfile needed）
  window._App = App;

  // 应用年龄主题
  const isYoung = profile.grade?.startsWith('primary') && parseInt(profile.grade.replace('primary','')) <= 3;
  document.body.className = isYoung ? 'theme-young' : '';

  // 初始化成人英语模块
  initEnglish(profile);
  initVocabStore(profile);
  // initRecitation 可能因文件未找到而失败，用 try/catch 保护
  try { await initRecitation(); } catch (_) {}

  // 词库下载完成 → 刷新主页
  document.addEventListener('vocab-downloaded', e => {
    if (e.detail?.profileId === profile.id) {
      CardManager.getByProfile(profile.id).then(cards => {
        App.allProfileCards = cards;
        loadHomeData();
        // 无论在哪个页面都刷新题库数据（下次进入题库时会看到新内容）
        // 如果当前在题库页或词库商店，立即刷新
        const activePage = document.querySelector('.page.active')?.id;
        if (activePage === 'page-library') {
          renderLibrary();
        }
        // 词库商店返回时也刷新
        if (activePage === 'page-vocab-store') {
          // 标记需要刷新，回到题库时触发
          App._needLibraryRefresh = true;
        }
      });
    }
  }, { once: false });

  showPage('home');
  loadHomeData();
}

async function loadHomeData() {
  if (!App.currentProfile) return;
  const profile = App.currentProfile;

  // 更新连续天数
  const streak = await ProgressManager.updateStreak(profile);
  $('streak-count').textContent = streak;

  // 今日待复习
  const due     = await CardManager.getDueCards(profile.id);
  const newCards = App.allProfileCards.filter(c => c.reviewCount === 0);
  const todayProg = await ProgressManager.getByDate(profile.id, todayStr());

  $('due-count').textContent  = due.length;
  $('new-count').textContent  = newCards.length;
  $('done-count').textContent = todayProg?.reviewed || 0;

  // 各科目进度（同时考虑 subject 字段和 tags）
  const subjectTagMap = {
    chinese: ['语文','古诗','成语','文言文','语文'],
    english: ['英语','English','CET-4','CET-6','成人','单词'],
    math:    ['数学','公式','几何','代数','乘法口诀']
  };
  const bySubject = {};

  App.allProfileCards.forEach(c => {
    let effectiveSubject = c.subject || 'custom';
    // 如果 subject 是 custom，用 tags 推断
    if (effectiveSubject === 'custom' || !effectiveSubject) {
      for (const [subj, tags] of Object.entries(subjectTagMap)) {
        if (tags.some(t => c.tags?.includes(t))) { effectiveSubject = subj; break; }
      }
    }
    if (!bySubject[effectiveSubject]) bySubject[effectiveSubject] = { total: 0, mastered: 0 };
    bySubject[effectiveSubject].total++;
    if (c.box >= 3 || c.interval >= 21) bySubject[effectiveSubject].mastered++;
  });

  ['chinese','english','math','custom'].forEach(s => {
    const el = $(`prog-${s}`);
    if (!el) return;
    if (bySubject[s] && bySubject[s].total > 0) {
      const pct = Math.round(bySubject[s].mastered / bySubject[s].total * 100);
      el.textContent = `${bySubject[s].total}词 · ${pct}%已掌握`;
    } else {
      el.textContent = '点击加载';
      el.style.color = 'var(--color-text-hint)';
    }
  });
}

// ===== 语音切换档案 =====

async function openVoiceSwitch() {
  if (!SpeechSupport.stt) {
    toast('当前浏览器不支持语音识别，请使用 Chrome');
    return;
  }

  show($('voice-overlay'));
  $('voice-anim').classList.add('listening');

  const profiles = await ProfileManager.getAll();
  const names    = profiles.map(p => p.name);

  $('voice-overlay-text').textContent = '说出要切换的名字...';

  startVoiceProfileSwitch(
    names,
    async matchedName => {
      const found = profiles.find(p => p.name === matchedName);
      if (found) {
        closeVoiceSwitch();
        await selectProfile(found);
        toast(`已切换到 ${found.name}`);
      }
    },
    msg => {
      $('voice-overlay-text').textContent = msg;
      setTimeout(closeVoiceSwitch, 2000);
    },
    closeVoiceSwitch
  );
}

function closeVoiceSwitch() {
  stopListening();
  hide($('voice-overlay'));
  $('voice-anim').classList.remove('listening');
}

// ===== 学习会话 =====

async function startStudySession(subject) {
  const profile = App.currentProfile;
  if (!profile) return;

  // 确保卡片列表是最新的
  App.allProfileCards = await CardManager.getByProfile(profile.id);

  const due      = await CardManager.getDueCards(profile.id);
  const newCards = App.allProfileCards.filter(c => c.reviewCount === 0);

  // 按科目过滤（也匹配 tags 中的科目名）
  const subjectFilter = card => {
    if (!subject) return true;
    if (card.subject === subject) return true;
    // 中文科目名映射
    const subjectTagMap = { chinese: ['语文','古诗','成语','文言文'], english: ['英语','English'], math: ['数学','公式'] };
    const tags = subjectTagMap[subject] || [];
    return tags.some(t => card.tags?.includes(t));
  };

  const subjectDue  = subject ? due.filter(subjectFilter) : due;
  const subjectNew  = subject ? newCards.filter(subjectFilter) : newCards;
  const allSubject  = subject ? App.allProfileCards.filter(subjectFilter) : App.allProfileCards;

  // 没有该科目的卡片
  if (subject && allSubject.length === 0) {
    const subjectNames = { chinese: '语文', english: '英语', math: '数学' };
    const name = subjectNames[subject] || subject;
    toast(`还没有${name}卡片，请在题库中加载内置库或导入素材`);
    showPage('library');
    renderLibrary();
    return;
  }

  // 有卡片但今天都不到期
  if (subject && allSubject.length > 0 && subjectDue.length === 0 && subjectNew.length === 0) {
    const mastered = allSubject.filter(c => c.box >= 3 || c.interval >= 21).length;
    toast(`${allSubject.length}张卡片中已掌握${mastered}张，今天没有需要复习的，明天再来！`);
    return;
  }

  let queue = buildStudyQueue(subjectDue, subjectNew, profile.newPerDay || 10);

  if (queue.length === 0) {
    toast('今天的卡片都复习完啦！🎉');
    return;
  }

  App.studyQueue    = queue;
  App.studyIndex    = 0;
  App.sessionResults = [];

  hide($('session-complete'));
  showPage('study');
  // 根据科目给 page-study 加颜色 class
  const studyPage = $('page-study');
  if (studyPage) {
    studyPage.classList.remove('subject-chinese','subject-english','subject-math','subject-custom');
    const subj = subject || App.studyQueue[0]?.subject || 'custom';
    studyPage.classList.add('subject-' + subj);
  }
  switchStudyMode('flashcard');
  renderCard();
}

function startStudyBySubject(subject) {
  if (subject === 'custom') {
    showPage('library'); renderLibrary(); return;
  }
  // 所有科目都先进入「题库选择」页
  openSubjectDecksPage(subject);
}

// ===== 古诗文背诵（主界面入口）=====

async function openHomeRecitation() {
  // 确保 recitation 已初始化
  try { await initRecitation(); } catch(_) {}
  // 直接进入独立清单页
  openRecitationListPage();
}

async function openSubjectDecksPage(subject) {
  const profile = App.currentProfile;
  if (!profile) return;

  // 确保卡片列表最新
  App.allProfileCards = await CardManager.getByProfile(profile.id);

  const subjectNames = { chinese: '语文', english: '英语', math: '数学', custom: '题库' };
  const subjectFilter = card => {
    if (card.subject === subject) return true;
    const tagMap = { chinese: ['语文','古诗','成语','文言文'], english: ['英语','English','CET-4'], math: ['数学','公式'] };
    return (tagMap[subject] || []).some(t => card.tags?.includes(t));
  };

  const allSubjectCards = App.allProfileCards.filter(subjectFilter);

  if (!allSubjectCards.length) {
    const name = subjectNames[subject] || subject;
    toast(`还没有${name}卡片，请先在题库商店下载或导入素材`);
    showPage('library'); renderLibrary();
    return;
  }

  // 按牌组分组
  const decks = await DeckManager.getByProfile(profile.id);
  const subjectDecks = decks.filter(d => {
    const deckCards = allSubjectCards.filter(c => c.deckId === d.id);
    return deckCards.length > 0;
  });

  // 更新标题（custom 本身已叫"题库"，不重复加后缀）
  const titleSuffix = subject === 'custom' ? '' : '题库';
  $('subject-decks-title').textContent = `${subjectNames[subject] || subject}${titleSuffix}`;

  // 统计全部
  const due     = allSubjectCards.filter(c => c.nextReview <= todayStr());
  const newCards = allSubjectCards.filter(c => c.reviewCount === 0);
  $('sdb-all-meta').textContent = `${allSubjectCards.length}张 · 待复习${due.length + newCards.length}张`;
  $('subject-decks-total').textContent = `共${subjectDecks.length}个题库`;

  // 渲染各牌组
  const list = $('sdb-decks-list');
  list.innerHTML = '';

  subjectDecks.forEach(deck => {
    const deckCards   = allSubjectCards.filter(c => c.deckId === deck.id);
    const deckDue     = deckCards.filter(c => c.nextReview <= todayStr());
    const deckNew     = deckCards.filter(c => c.reviewCount === 0);
    const deckMastered = deckCards.filter(c => c.box >= 3 || c.interval >= 21);
    const masteredPct = deckCards.length ? Math.round(deckMastered.length / deckCards.length * 100) : 0;
    const todayCount  = deckDue.length + deckNew.length;

    const item = document.createElement('button');
    item.className = 'sdb-deck-item';
    item.dataset.deckId = deck.id;
    item.innerHTML = `
      <div class="sdb-deck-header">
        <span class="sdb-deck-name">${escapeHtml(deck.name)}</span>
        ${todayCount > 0 ? `<span class="sdb-badge">${todayCount}</span>` : '<span class="sdb-done">✓</span>'}
      </div>
      <div class="sdb-deck-stats">
        <span>${deckCards.length}张</span>
        <span>掌握${masteredPct}%</span>
        <div class="sdb-mini-bar"><div class="sdb-mini-fill" style="width:${masteredPct}%"></div></div>
      </div>
    `;
    item.addEventListener('click', () => startStudyFromDeck(deck.id, subject));
    list.appendChild(item);
  });

  // 绑定方向按钮
  $('sdb-dir-forward')?.addEventListener('click', () => {
    $('sdb-dir-forward').classList.add('active');
    $('sdb-dir-reverse').classList.remove('active');
    App.cardDirection = 'normal';
  });
  $('sdb-dir-reverse')?.addEventListener('click', () => {
    $('sdb-dir-reverse').classList.add('active');
    $('sdb-dir-forward').classList.remove('active');
    App.cardDirection = 'reverse';
  });
  // 同步当前方向
  if (App.cardDirection === 'reverse') {
    $('sdb-dir-forward')?.classList.remove('active');
    $('sdb-dir-reverse')?.classList.add('active');
  } else {
    $('sdb-dir-forward')?.classList.add('active');
    $('sdb-dir-reverse')?.classList.remove('active');
  }

  // 全部按钮
  $('btn-study-all-subject').onclick = () => startStudySession(subject);

  // 返回按钮
  $('btn-subject-decks-back').onclick = () => showPage('home');

  showPage('subject-decks');
}

async function startStudyFromDeck(deckId, subject) {
  const profile  = App.currentProfile;
  const deckCards = App.allProfileCards.filter(c => c.deckId === deckId);
  const due       = deckCards.filter(c => c.nextReview <= todayStr());
  const newCards  = deckCards.filter(c => c.reviewCount === 0);
  const queue     = buildStudyQueue(due, newCards, profile.newPerDay || 10);

  if (!queue.length) {
    toast('这个题库今天没有需要复习的，换一个试试？');
    return;
  }

  App.studyQueue     = queue;
  App.studyIndex     = 0;
  App.sessionResults = [];

  hide($('session-complete'));
  showPage('study');
  switchStudyMode('flashcard');
  renderCard();
}
function renderCard() {
  const card = App.studyQueue[App.studyIndex];
  if (!card) { showSessionComplete(); return; }

  const total   = App.studyQueue.length;
  const current = App.studyIndex + 1;
  $('study-progress-bar').style.width = `${(current / total) * 100}%`;
  $('study-progress-text').textContent = `${current}/${total}`;

  // 重置翻转状态
  App.isCardFlipped = false;
  $('card-inner').classList.remove('flipped');
  hide($('rating-buttons'));
  // 重置语音回答状态（底部工具栏按钮）
  hide($('voice-answer-result'));
  const voiceBtn = $('btn-voice-answer');
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    const lbl = $('voice-answer-label');
    if (lbl) lbl.textContent = '语音回答';
  }
  const hintP = $('card-hint-prompt');
  if (hintP) hintP.textContent = SpeechSupport.stt ? '点击翻转查看答案（或语音回答）' : '点击翻转查看答案';

  // 根据方向决定显示面（反向时交换 front/back）
  const isReverse     = App.cardDirection === 'reverse';
  const displayFront  = isReverse ? card.back  : card.front;
  const displayBack   = isReverse ? card.front : card.back;
  const displayPhon   = isReverse ? ''         : (card.phonetic || '');
  const displayEx     = isReverse ? ''         : (card.example  || '');

  // 填充卡片内容（英文单词做音节着色）
  const isEnglishFront = displayFront && !/[一-鿿]/.test(displayFront);
  const frontEl = $('card-front-text');
  if (isEnglishFront) {
    frontEl.innerHTML = colorEnglishSyllables(displayFront);
  } else {
    frontEl.textContent = displayFront;
  }
  $('card-phonetic').textContent   = displayPhon;
  $('card-back-text').textContent  = displayBack;
  $('card-example').textContent    = displayEx;
  $('card-tag').textContent        = subjectLabel(card.subject) + (isReverse ? ' ↩' : '');

  // 生字卡片：显示偏旁部首和笔画
  renderCharInfo(card);

  // 词语卡片（type=word，语文）：正面显示词语+拼音，自动朗读
  if (card.type === 'word' && card.subject === 'chinese') {
    $('card-hint-prompt') && ($('card-hint-prompt').textContent = '点击翻转查看释义，或直接跟读');
    if (mode === 'flashcard') {
      setTimeout(() => speakCard(card, 'front', App.currentProfile?.speechRate || 0.85), 300);
    }
  }

  // 根据模式渲染（限定在学习页面 tabs，不受其他页面同名 class 影响）
  const mode = $('study-mode-tabs')?.querySelector('.mode-tab.active')?.dataset.mode || 'flashcard';
  if (mode === 'choice')   renderChoiceMode(card);
  if (mode === 'dictation') renderDictationMode(card);
  if (mode === 'speaking')  renderSpeakingMode(card);
}

function renderCharInfo(card) {
  // 获取或创建生字信息区
  let infoEl = $('card-char-info');
  if (!infoEl) {
    infoEl = document.createElement('div');
    infoEl.id = 'card-char-info';
    infoEl.className = 'card-char-info';
    // 插入到 card-front 的 card-text 之后
    const frontText = $('card-front-text');
    frontText?.parentNode?.insertBefore(infoEl, frontText.nextSibling);
  }

  if (card.type === 'char' && (card.radical || card.strokes)) {
    const parts = [];
    if (card.radical) parts.push(`<span class="char-info-item"><span class="cii-label">部首</span><span class="cii-val">${escapeHtml(card.radical)}</span></span>`);
    if (card.strokes) parts.push(`<span class="char-info-item"><span class="cii-label">笔画</span><span class="cii-val">${card.strokes}画</span></span>`);
    if (card.structure) parts.push(`<span class="char-info-item"><span class="cii-label">结构</span><span class="cii-val">${escapeHtml(card.structure)}</span></span>`);
    infoEl.innerHTML = parts.join('');
    infoEl.style.display = 'flex';
  } else {
    infoEl.innerHTML = '';
    infoEl.style.display = 'none';
  }
}

// ===== 闪卡模式 =====

function flipCard() {
  if (App.isCardFlipped) return;
  App.isCardFlipped = true;
  $('card-inner').classList.add('flipped');
  show($('rating-buttons'));
  speakCurrentCardBack();
}

function speakCurrentCardFront() {
  const card = App.studyQueue[App.studyIndex];
  if (!card) return;
  // 朗读当前显示的"正面"（反向时是 back）
  const side = App.cardDirection === 'reverse' ? 'back' : 'front';
  speakCard(card, side, App.currentProfile?.speechRate || 0.8);
}

function speakCurrentCardBack() {
  const card = App.studyQueue[App.studyIndex];
  if (!card) return;
  const side = App.cardDirection === 'reverse' ? 'front' : 'back';
  speakCard(card, side, App.currentProfile?.speechRate || 0.8);
}

// ===== 闪卡语音回答 =====

let _voiceAnswerStop = null;

async function startVoiceAnswer() {
  if (!SpeechSupport.stt) {
    toast('此设备不支持语音识别，请使用 Chrome 或安卓设备');
    return;
  }

  const btn   = $('btn-voice-answer');
  const label = $('voice-answer-label');
  const card  = App.studyQueue[App.studyIndex];
  if (!card) return;

  if (_voiceAnswerStop) {
    _voiceAnswerStop();
    _voiceAnswerStop = null;
    btn?.classList.remove('recording');
    if (label) label.textContent = '语音回答';
    return;
  }

  btn?.classList.add('recording');
  if (label) label.textContent = '说话中...';
  const lang = /[一-鿿]/.test(card.front) ? 'zh-CN' : 'en-US';
  let spokenText = '', spokenConf = 1;

  _voiceAnswerStop = startListening(
    lang,
    (text, conf) => { spokenText = text; spokenConf = conf; },
    msg => {
      toast(msg);
      btn?.classList.remove('recording');
      if (label) label.textContent = '语音回答';
    },
    async () => {
      btn?.classList.remove('recording');
      if (label) label.textContent = '语音回答';
      _voiceAnswerStop = null;
      if (!spokenText) return;

      // 反向模式时，正面显示的是 back，用户应该回答 front
      const target     = App.cardDirection === 'reverse' ? card.front : card.back;
      const dist       = levenshtein(target.toLowerCase(), spokenText.toLowerCase());
      const score      = Math.max(0, Math.round((1 - dist / Math.max(target.length, spokenText.length)) * 100));
      const isCorrect  = score >= 65 || spokenText.toLowerCase().includes(target.toLowerCase().slice(0, 4));

      const resultEl = $('voice-answer-result');
      $('voice-answer-text').textContent = `"${spokenText}" ${isCorrect ? '✓' : '✗'}`;
      if (resultEl) {
        resultEl.style.background = isCorrect ? '#D1FAE5' : '#FEE2E2';
        resultEl.style.color      = isCorrect ? '#065F46' : '#991B1B';
        show(resultEl);
      }

      if (isCorrect) {
        playSound('correct');
        setTimeout(() => {
          flipCard();
          setTimeout(() => submitRating(5), 1200);
        }, 800);
      } else {
        playSound('wrong');
        // 答错：翻转看答案，低分
        setTimeout(() => {
          flipCard();
          setTimeout(() => submitRating(1), 1800);
        }, 1000);
      }
    }
  );
}

// levenshtein 从 speech.js 导入（如果未导入则用简单版本）
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

async function submitRating(rating) {
  const card    = App.studyQueue[App.studyIndex];
  const profile = App.currentProfile;
  if (!card || !profile) return;

  const algo    = resolveAlgorithm(profile.algorithm || 'auto', profile.grade);
  const updated = reviewCard(card, rating, profile.algorithm || 'auto', profile.grade);
  await CardManager.update(updated);

  App.sessionResults.push({ card, rating, correct: rating >= 4 });

  // 错误卡片当日重复（评分1时插回队列后10个位置）
  if (rating === 1 && App.studyIndex + 10 < App.studyQueue.length) {
    App.studyQueue.splice(App.studyIndex + 10, 0, { ...card });
  }

  App.studyIndex++;
  if (App.studyIndex >= App.studyQueue.length) {
    await finishSession();
  } else {
    renderCard();
  }
}

// ===== 选择题模式 =====

function renderChoiceMode(card) {
  show($('choice-container'));
  hide($('flashcard'));

  $('choice-question').textContent = card.front;

  const options = generateDistractors(card, App.allProfileCards.length > 3 ? App.allProfileCards : App.studyQueue);
  const container = $('choice-options');
  container.innerHTML = '';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = opt;
    btn.dataset.value = opt;
    container.appendChild(btn);
  });
}

function onChoiceSelected(btn) {
  const card    = App.studyQueue[App.studyIndex];
  const correct = btn.dataset.value === card.back;

  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.value === card.back) b.classList.add('correct');
    if (b === btn && !correct) b.classList.add('wrong');
  });

  if (correct) playSound('correct');
  else         playSound('wrong');

  setTimeout(() => submitRating(correct ? 5 : 1), 1000);
}

// ===== 听写模式 =====

let _dictationPeeked = false;

function renderDictationMode(card) {
  hide($('flashcard'));
  show($('dictation-container'));

  // 重置状态
  _dictationPeeked = false;
  $('dictation-prompt').textContent = '';
  $('dictation-prompt').style.color = '';
  $('dictation-input').value = '';
  $('dictation-input').disabled = false;
  hide($('dictation-answer-reveal'));
  show($('btn-check-dictation'));
  hide($('btn-next-dictation'));
  $('btn-dictation-peek').classList.remove('peeked');
  $('btn-dictation-peek').disabled = false;
  $('dictation-input').focus();

  // 延迟朗读
  setTimeout(() => speakCard(card, 'front', App.currentProfile?.speechRate || 0.8), 500);
}

function replayDictation() {
  const card = App.studyQueue[App.studyIndex];
  if (card) speakCard(card, 'front', App.currentProfile?.speechRate || 0.8);
}

function peekDictationAnswer() {
  const card = App.studyQueue[App.studyIndex];
  if (!card) return;

  _dictationPeeked = true;

  // 显示答案区
  $('dictation-answer-text').textContent = card.back;
  show($('dictation-answer-reveal'));

  // 朗读答案
  speakCard(card, 'back', App.currentProfile?.speechRate || 0.8);

  // 更新按钮状态
  $('btn-dictation-peek').classList.add('peeked');
  $('btn-dictation-peek').disabled = true;
  $('dictation-input').disabled = true;

  // 显示"知道了"按钮，隐藏"确认"
  hide($('btn-check-dictation'));
  show($('btn-next-dictation'));
}

function checkDictation() {
  if (_dictationPeeked) { submitRating(2); return; }

  const card   = App.studyQueue[App.studyIndex];
  const input  = $('dictation-input').value.trim().toLowerCase();
  const target = card.front.toLowerCase().trim();
  const back   = card.back.toLowerCase().trim();

  // 支持：输入英文单词(front) 或 中文含义(back) 都算正确
  const correct = input === target || input === back
    || target.startsWith(input) && input.length >= target.length * 0.9;

  const prompt = $('dictation-prompt');
  if (correct) {
    prompt.textContent = `✓ ${card.front}  ${card.back}`;
    prompt.style.color = 'var(--color-success)';
    playSound('correct');
  } else {
    prompt.textContent = `✗ 正确答案：${card.front}`;
    prompt.style.color = 'var(--color-error)';
    // 自动朗读正确答案
    speakCard(card, 'front', App.currentProfile?.speechRate || 0.8);
    playSound('wrong');
  }

  $('dictation-input').disabled = true;
  setTimeout(() => submitRating(correct ? 5 : 1), 1200);
}

// ===== 跟读/发音评分模式 =====

function renderSpeakingMode(card) {
  hide($('flashcard'));
  show($('speaking-container'));
  hide($('score-display'));
  hide($('mic-hint'));

  // 单词/内容
  $('speaking-word').textContent = card.front;

  // 中文语义（back 字段）
  const meaningEl = $('speaking-meaning');
  if (card.back && card.back !== card.front) {
    meaningEl.textContent = card.back;
    show(meaningEl);
  } else {
    hide(meaningEl);
  }

  // 例句
  const exampleEl = $('speaking-example');
  if (card.example) {
    exampleEl.textContent = card.example;
    show(exampleEl);
  } else {
    hide(exampleEl);
  }

  $('btn-record').classList.remove('recording');
  $('record-label').textContent = '开始跟读';
  $('waveform').classList.remove('active');

  // 检测 file:// 协议（麦克风需要 http/https）
  if (window.location.protocol === 'file:') {
    const hint = $('mic-hint');
    hint.textContent = '⚠ 本地文件模式下麦克风受限，请用 Live Server 或安装为 Android APP 后使用。点击「再听一遍」可先练习发音。';
    show(hint);
  }

  // 自动朗读
  setTimeout(() => speakCard(card, 'front', App.currentProfile?.speechRate || 0.8), 400);
}

// 再听按钮
function initSpeakingButtons() {
  $('btn-speak-again')?.addEventListener('click', () => {
    const card = App.studyQueue[App.studyIndex];
    if (card) speakCard(card, 'front', App.currentProfile?.speechRate || 0.8);
  });
  $('btn-speak-slow')?.addEventListener('click', () => {
    const card = App.studyQueue[App.studyIndex];
    if (card) speakCard(card, 'front', 0.5);  // 0.5x 超慢速
  });
  $('btn-retry-record')?.addEventListener('click', () => {
    hide($('score-display'));
    $('btn-record').classList.remove('recording');
    $('record-label').textContent = '开始跟读';
  });
}

async function toggleRecording() {
  const btn = $('btn-record');

  if (App.recordStop) {
    // 停止录音
    App.recordStop();
    App.recordStop = null;
    btn.classList.remove('recording');
    $('record-label').textContent = '处理中...';
    $('waveform').classList.remove('active');
    return;
  }

  const card   = App.studyQueue[App.studyIndex];
  const lang   = /[一-鿿]/.test(card.front) ? 'zh-CN' : 'en-US';

  btn.classList.add('recording');
  $('record-label').textContent = '说话中...';
  $('waveform').classList.add('active');

  // 同步启动 STT + 录音
  let spokenText = '';
  let spokenConf = 0;

  if (SpeechSupport.stt) {
    App.recordStop = startListening(
      lang,
      (text, conf) => { spokenText = text; spokenConf = conf; },
      msg => { toast(msg); btn.classList.remove('recording'); $('record-label').textContent = '按住说话'; },
      async () => {
        btn.classList.remove('recording');
        $('record-label').textContent = '按住说话';
        $('waveform').classList.remove('active');
        App.recordStop = null;

        if (!spokenText) { toast('没有识别到内容，请再试'); return; }

        const profile = App.currentProfile;
        const azureConfig = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
        const result = await scorePronunciation(card.front, spokenText, spokenConf, azureConfig, null);
        showPronunciationResult(result);
      }
    );
  } else {
    toast('此设备不支持语音识别，请使用 Android Chrome');
    btn.classList.remove('recording');
    $('record-label').textContent = '按住说话';
    $('waveform').classList.remove('active');
  }
}

function showPronunciationResult(result) {
  const scoreEl = $('score-circle');
  const numEl   = $('score-num');
  const feedEl  = $('score-feedback');

  numEl.textContent = result.score;
  scoreEl.className = `score-circle ${result.score >= 75 ? '' : result.score >= 60 ? 'score-mid' : 'score-low'}`;
  feedEl.textContent = result.feedback;
  show($('score-display'));

  if (result.score >= 75) playSound('correct');
  else                    playSound('wrong');

  // 自动评分
  const rating = result.score >= 90 ? 5 : result.score >= 75 ? 4 : result.score >= 60 ? 2 : 1;
  setTimeout(() => submitRating(rating), 2000);
}

// ===== 模式切换 =====

function switchStudyMode(mode) {
  // 只操作学习页面内的 tabs
  $('study-mode-tabs')?.querySelectorAll('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode)
  );

  hide($('flashcard'));
  hide($('choice-container'));
  hide($('dictation-container'));
  hide($('speaking-container'));
  hide($('rating-buttons'));

  if (mode === 'flashcard') show($('flashcard'));
  if (mode === 'choice')    show($('choice-container'));
  if (mode === 'dictation') show($('dictation-container'));
  if (mode === 'speaking')  show($('speaking-container'));

  App.isCardFlipped = false;
  $('card-inner').classList.remove('flipped');

  renderCard();
}

// ===== 会话完成 =====

async function finishSession() {
  const total   = App.sessionResults.length;
  const correct = App.sessionResults.filter(r => r.correct).length;
  const coins   = correct * 2 + Math.floor(total * 0.5);

  await ProgressManager.record(App.currentProfile.id, total, correct);
  await ProfileManager.update(App.currentProfile.id, {
    coins: (App.currentProfile.coins || 0) + coins
  });

  // 更新内存中的 coins
  App.currentProfile.coins = (App.currentProfile.coins || 0) + coins;
  App.allProfileCards = await CardManager.getByProfile(App.currentProfile.id);

  showSessionComplete(total, correct, coins);
}

function showSessionComplete(total, correct, coins) {
  $('complete-summary').textContent = `复习了 ${total} 张，答对 ${correct} 张（${Math.round(correct/total*100)}%）`;
  $('coins-earned').textContent     = coins > 0 ? `+${coins} 金币` : '';
  show($('session-complete'));
}

// ===== 手势支持（左右滑动）=====

function setupSwipeGesture() {
  let startX = 0;
  const card = $('flashcard');

  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (!App.isCardFlipped) { flipCard(); return; }
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) {
      submitRating(dx > 0 ? 5 : 1);  // 右滑=很熟，左滑=不会
    }
  }, { passive: true });
}

// 全局左边缘右划返回（iOS/Android 通用手势）
function setupBackGesture() {
  let startX = 0, startY = 0;
  const EDGE = 30; // 触发区域：屏幕左侧30px内开始滑动

  // 页面返回映射
  const pageBackMap = {
    'page-library':         'home',
    'page-import':          'home',
    'page-search':          'home',
    'page-stats':           'home',
    'page-settings':        'home',
    'page-study':           'home',
    'page-scenario':        'english-adult',
    'page-recitation':      'recitation-list',
    'page-recitation-list': 'home',
    'page-english-adult':   'home',
    'page-vocab-store':     'library',
    'page-subject-decks':   'home',
  };

  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);

    // 右划超过 80px，且水平位移远大于垂直（不是上下滑动）
    // 且触发点在左侧边缘（移动端系统手势区域）或 dx > 120px（全屏右划）
    if (dx > 80 && dy < dx * 0.8 && (startX < EDGE + 20 || dx > 120)) {
      const activePage = document.querySelector('.page.active');
      if (!activePage) return;

      const pageId     = activePage.id;
      const backTarget = pageBackMap[pageId];

      if (backTarget) {
        e.preventDefault?.();
        showPage(backTarget);
        if (backTarget === 'home') loadHomeData();
      }
    }
  }, { passive: true });
}

// ===== 导入 =====

let _importCache = [];

// 从题库页导入时，带上选择的科目
async function handleFileInputWithSubject(file) {
  if (!file) return;
  if (isImageFile(file)) { handleImageInput(file); return; }
  try {
    toast('正在解析文件...');
    const { cards, suggestedName } = await parseFile(file);
    const subject = $('import-subject-select')?.value || 'custom';
    _importCache = cards.map(c => ({ ...c, subject }));
    $('deck-name-input').value = suggestedName;
    showImportPreview(_importCache);
    showPage('import');
  } catch (e) {
    toast(`解析失败：${e.message}`);
  }
}

async function handleFileInput(file) {
  if (!file) return;
  if (isImageFile(file)) { handleImageInput(file); return; }
  try {
    toast('正在解析文件...');
    const { cards, suggestedName } = await parseFile(file);
    _importCache = cards;
    $('deck-name-input').value = suggestedName;
    showImportPreview(cards);
  } catch (e) {
    toast(`解析失败：${e.message}`);
  }
}

function isImageFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ['jpg','jpeg','png','gif','bmp','webp','heic','heif'].includes(ext)
    || file.type.startsWith('image/');
}

async function handleImageInput(file) {
  if (!file) return;

  // 优先用 AI 解析（配置了 Key 或 Worker URL）
  if (hasAIKey()) {
    show($('ocr-progress'));
    try {
      const { cards, suggestedName } = await parseImageWithAI(file, msg => {
        $('ocr-status').textContent = msg;
      });
      _importCache = cards;
      hide($('ocr-progress'));
      $('deck-name-input').value = suggestedName;
      showImportPreview(cards);
      showPage('import');
      return;
    } catch (e) {
      // AI 解析失败则降级到 Tesseract
      $('ocr-status').textContent = `AI解析失败（${e.message}），切换到本地OCR...`;
    }
  }

  // 降级：Tesseract 本地 OCR
  show($('ocr-progress'));
  try {
    const { cards: rawCards, suggestedName } = await parseImageOCR(file, msg => {
      $('ocr-status').textContent = msg;
    });

    // 对识别出的英语单词自动补充中文释义
    $('ocr-status').textContent = '正在查询词典补充释义...';
    const cards = await enrichEnglishCards(rawCards);

    _importCache = cards;
    hide($('ocr-progress'));
    $('deck-name-input').value = suggestedName;
    showImportPreview(cards);
    showPage('import');
  } catch (e) {
    hide($('ocr-progress'));
    toast(`识别失败：${e.message}`);
  }
}

/**
 * 对识别出的英语单词卡片，从本地词库中查询中文释义
 * 如果 back 为空或只有英文，尝试从已下载的 ECDICT 匹配
 */
async function enrichEnglishCards(cards) {
  const englishCards = cards.filter(c => /^[a-zA-Z\s'-]+$/.test(c.front?.trim()));
  if (!englishCards.length) return cards;

  // 从 IndexedDB 加载已下载的英语卡片作为词典
  const profile = App.currentProfile;
  if (!profile) return cards;

  const allCards = App.allProfileCards?.length
    ? App.allProfileCards
    : await CardManager.getByProfile(profile.id);

  // 建立英语→中文的本地词典索引
  const dict = {};
  allCards.forEach(c => {
    if (c.subject === 'english' && c.front && c.back) {
      dict[c.front.toLowerCase()] = c;
    }
  });

  return cards.map(card => {
    const word = card.front?.trim().toLowerCase();
    if (!word || !/^[a-zA-Z\s'-]+$/.test(word)) return card;

    // 如果已经有中文 back，不覆盖
    if (card.back && /[^\x00-\x7F]/.test(card.back)) return card;

    const match = dict[word];
    if (match) {
      return {
        ...card,
        back:     match.back     || card.back,
        phonetic: match.phonetic || card.phonetic || '',
        hint:     match.hint     || card.hint     || '',
        example:  match.example  || card.example  || '',
        tags:     card.tags?.length ? card.tags : (match.tags || ['英语']),
        type:     'word',
        subject:  'english'
      };
    }
    // 没有匹配：保留原始，标记 back 为待补充
    return { ...card, back: card.back || `（${word}）`, subject: 'english' };
  });
}

function showImportPreview(cards) {
  $('preview-count').textContent = cards.length;
  const list = $('preview-list');
  list.innerHTML = '';

  cards.slice(0, 20).forEach(c => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `<span class="preview-front">${escapeHtml(c.front)}</span><span class="preview-back">${escapeHtml(c.back)}</span>`;
    list.appendChild(item);
  });
  if (cards.length > 20) {
    const more = document.createElement('div');
    more.className = 'preview-item';
    more.innerHTML = `<span style="color:var(--color-text-sub)">...还有 ${cards.length - 20} 张</span>`;
    list.appendChild(more);
  }

  show($('import-preview'));
}

async function confirmImport() {
  const profile = App.currentProfile;
  if (!_importCache.length) { toast('没有可导入的卡片'); return; }

  const isAppend    = document.querySelector('.import-mode-btn.active')?.dataset.mode === 'append';
  const targetDeckId = $('import-target-deck')?.value;

  let deckId, deckName, added;

  if (isAppend && targetDeckId) {
    // 追加模式：向已有题库追加（去重：front 相同则跳过）
    const existing = App.allProfileCards.filter(c => c.deckId === targetDeckId);
    const existingFronts = new Set(existing.map(c => c.front?.toLowerCase().trim()));
    const newCards = _importCache.filter(c => !existingFronts.has(c.front?.toLowerCase().trim()));

    if (!newCards.length) {
      toast('所有卡片在题库中均已存在，无需追加');
      return;
    }
    await CardManager.bulkCreate(profile.id, targetDeckId, newCards);
    added    = newCards.length;
    deckName = $('import-target-deck')?.selectedOptions[0]?.text || '已有题库';
    toast(`已追加 ${added} 张（跳过 ${_importCache.length - added} 张重复），题库：${deckName}`);
  } else {
    // 新建模式
    const name = $('deck-name-input')?.value.trim() || '导入的卡片';
    // 科目从 importSubjectSelect 或卡片推断
    const subject = $('import-subject-select')?.value || _importCache[0]?.subject || 'custom';
    const deck    = await DeckManager.create(profile.id, name, subject, 'custom');
    await CardManager.bulkCreate(profile.id, deck.id, _importCache);
    added    = _importCache.length;
    deckName = name;
    toast(`成功导入 ${added} 张卡片到「${deckName}」`);
  }

  App.allProfileCards = await CardManager.getByProfile(profile.id);
  _importCache = [];
  hide($('import-preview'));

  // 重置模式为新建
  document.getElementById('import-mode-new')?.classList.add('active');
  document.getElementById('import-mode-append')?.classList.remove('active');
  $('import-new-section')?.classList.remove('hidden');
  $('import-append-section')?.classList.add('hidden');

  loadHomeData();
}

let _manualCards = [];

function saveManualCard(continueAdding) {
  const front = $('manual-front').value.trim();
  const back  = $('manual-back').value.trim();
  if (!front || !back) { toast('正面和背面都需要填写'); return; }

  _manualCards.push({
    front,
    back,
    hint:  $('manual-hint').value.trim(),
    tags:  $('manual-tags').value.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  });

  $('manual-front').value = '';
  $('manual-back').value  = '';
  $('manual-hint').value  = '';

  toast('已添加');
  if (!continueAdding) {
    hide($('manual-modal'));
    _importCache = _manualCards;
    _manualCards = [];
    showImportPreview(_importCache);
  }
}

// ===== 题库 =====

async function renderLibrary() {
  const decks = await DeckManager.getByProfile(App.currentProfile.id);
  const list  = $('decks-list');
  list.innerHTML = '';

  // 读取当前年级过滤
  const gradeFilterEl = $('grade-filter');
  const gradeFilter   = gradeFilterEl?.querySelector('.filter-btn.active')?.dataset.grade || 'all';

  // 去重：相同名称只保留最新一个（避免重复下载）
  const seen = new Set();
  const deduped = decks.filter(d => {
    if (seen.has(d.name)) return false;
    seen.add(d.name);
    return true;
  });

  // 过滤后的牌组（兼容旧的年级值 primary1-6/middle1-3 和新的 primary/middle）
  const filtered = gradeFilter === 'all'
    ? deduped
    : deduped.filter(d => d.grade === gradeFilter || d.grade?.startsWith(gradeFilter));

  if (!decks.length) {
    list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">暂无题库，去导入或加载内置知识库</p>';
    return;
  }

  if (!filtered.length) {
    list.innerHTML = `<p style="color:var(--color-text-sub);text-align:center;padding:32px">没有${gradeFilter === 'primary' ? '小学' : '初中'}题库</p>`;
    return;
  }

  // 按科目分组
  const groups = {};
  filtered.forEach(deck => {
    const s = deck.subject || 'custom';
    if (!groups[s]) groups[s] = [];
    groups[s].push(deck);
  });

  const subjectOrder = ['chinese', 'english', 'math', 'custom'];
  const subjectLabel_ = { chinese: '语文', english: '英语', math: '数学', custom: '题库' };
  const subjectColors = { chinese: '#E84848', english: '#3B82F6', math: '#8B5CF6', custom: '#10B981' };

  subjectOrder.forEach(subj => {
    const subjDecks = groups[subj];
    if (!subjDecks?.length) return;

    // 科目分组标题
    const title = document.createElement('div');
    title.className = 'deck-group-title';
    title.textContent = subjectLabel_[subj] || subj;
    list.appendChild(title);

    subjDecks.forEach(deck => {
      const cards  = App.allProfileCards.filter(c => c.deckId === deck.id);
      const due    = cards.filter(c => c.nextReview <= todayStr()).length;
      const newC   = cards.filter(c => c.reviewCount === 0).length;
      const todayN = due + newC;

      // 判断是否有古诗全文可背诵
      const hasRecitation = cards.some(c => c.type === 'poem' || c.tags?.includes('古诗'));

      const item   = document.createElement('div');
      item.className = 'deck-item';
      item.innerHTML = `
        <div class="deck-icon" style="background:${subjectColors[subj]||'#aaa'};color:white">
          ${subjectIcon(deck.subject)}
        </div>
        <div class="deck-info">
          <div class="deck-name">${escapeHtml(deck.name)}</div>
          <div class="deck-count">${cards.length}张 ${todayN > 0 ? `· <span style="color:var(--color-primary)">今日${todayN}张</span>` : '· 今日已完成 ✓'}</div>
        </div>
        <div class="deck-actions">
          ${hasRecitation ? `<button class="btn-deck-recite" data-deck="${deck.id}" title="背诵全文">📖</button>` : ''}
          <button class="btn-deck-study" data-deck="${deck.id}">学习</button>
          <button class="btn-deck-delete" data-deck="${deck.id}" data-name="${escapeHtml(deck.name)}" title="删除题库">🗑</button>
        </div>
      `;
      item.querySelector('.btn-deck-study').addEventListener('click', () => studyDeck(deck.id));
      item.querySelector('.btn-deck-delete').addEventListener('click', e => {
        e.stopPropagation();
        deleteDeck(deck.id, deck.name);
      });
      item.querySelector('.btn-deck-recite')?.addEventListener('click', e => {
        e.stopPropagation();
        openRecitationFromDeck(deck.id);
      });
      list.appendChild(item);
    });
  });
}

// ===== 题库删除 =====

async function deleteDeck(deckId, deckName) {
  if (!confirm(`确定要删除题库「${deckName}」吗？\n\n删除后该题库的所有卡片和学习记录将清空，无法恢复。`)) return;
  const profile = App.currentProfile;
  if (!profile) return;
  const cards = App.allProfileCards.filter(c => c.deckId === deckId);
  await Promise.all(cards.map(c => CardManager.delete(c.id)));
  await DeckManager.delete(deckId, profile.id);
  App.allProfileCards = await CardManager.getByProfile(profile.id);
  toast(`已删除题库「${deckName}」`);
  renderLibrary();
  loadHomeData();
}

// ===== 古诗全文背诵入口（从题库进入）=====

async function openRecitationFromDeck(deckId) {
  // 动态导入 recitation.js
  const { initRecitation, openRecitationPage, getRecitationTexts } = await import('./recitation.js');
  await initRecitation();

  const texts = getRecitationTexts();
  if (!texts.length) {
    toast('暂无古诗全文数据，请先加载「古诗全文背诵」题库');
    return;
  }

  // 显示本牌组相关的全文列表
  const deckCards = App.allProfileCards.filter(c => c.deckId === deckId);
  const titles    = new Set(deckCards.map(c => c.hint?.split(' - ')[0]?.split('·')[0]?.trim()).filter(Boolean));

  // 找第一首匹配的诗
  const matched = texts.find(t => titles.has(t.title) || deckCards.some(c => c.front?.includes(t.title)));
  if (matched) {
    openRecitationPage(matched.id);
  } else {
    // 显示全部可背诵列表
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $('page-library')?.classList.add('active');
    toast('请在题库底部选择要背诵的古诗');
    showRecitationListInLibrary();
  }
}

function showRecitationListInLibrary() {
  import('./recitation.js').then(({ getRecitationTexts, renderRecitationList }) => {
    const existing = $('library-recitation-section');
    if (existing) { existing.remove(); return; }
    const sec = document.createElement('div');
    sec.id = 'library-recitation-section';
    sec.innerHTML = '<div class="deck-group-title" style="padding:12px 16px 4px">📖 古诗全文背诵</div>';
    const inner = document.createElement('div');
    inner.style.padding = '0 16px 16px';
    sec.appendChild(inner);
    renderRecitationList(inner, 'all');
    $('decks-list')?.after(sec);
  });
}

// ===== 题库搜索/查询 =====

async function searchCards(query) {
  const profile = App.currentProfile;
  if (!profile) return;

  // 确保卡片已加载（题库页面进入时不一定触发过 renderLibrary）
  if (!App.allProfileCards?.length) {
    App.allProfileCards = await CardManager.getByProfile(profile.id);
  }

  const q      = query.toLowerCase().trim();
  const all    = App.allProfileCards;
  const results = all.filter(c =>
    c.front?.toLowerCase().includes(q) ||
    c.back?.toLowerCase().includes(q) ||
    c.hint?.toLowerCase().includes(q) ||
    c.example?.toLowerCase().includes(q) ||
    c.phonetic?.includes(q) ||
    c.tags?.some(t => t.toLowerCase().includes(q))
  ).slice(0, 50);  // 最多显示50条

  const container = $('search-results');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `<div class="search-empty">没有找到"${escapeHtml(query)}"相关内容</div>`;
    show(container);
    return;
  }

  container.innerHTML = `<div class="search-count">找到 ${results.length} 条结果${all.filter(c=>c.front?.toLowerCase().includes(q)||c.back?.toLowerCase().includes(q)).length > 50 ? '（显示前50条）' : ''}</div>`;

  results.forEach(card => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    // 高亮匹配文字
    const hi = (text) => {
      if (!text) return '';
      const re = new RegExp(`(${escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return escapeHtml(text).replace(re, '<mark>$1</mark>');
    };

    const subjectIcon_ = { chinese: '文', english: 'En', math: '∑', custom: '+' }[card.subject] || '?';
    const subjectColor = { chinese: '#E84848', english: '#3B82F6', math: '#8B5CF6', custom: '#10B981' }[card.subject] || '#aaa';

    item.innerHTML = `
      <div class="sri-subject" style="background:${subjectColor}">${subjectIcon_}</div>
      <div class="sri-content">
        <div class="sri-front">${hi(card.front)}${card.phonetic ? `<span class="sri-phonetic"> ${escapeHtml(card.phonetic)}</span>` : ''}</div>
        <div class="sri-back">${hi(card.back)}</div>
        ${card.example ? `<div class="sri-example">${hi(card.example)}</div>` : ''}
        ${card.hint ? `<div class="sri-hint">💡 ${hi(card.hint)}</div>` : ''}
      </div>
      <button class="sri-speak" title="朗读">🔊</button>
    `;

    item.querySelector('.sri-speak').addEventListener('click', e => {
      e.stopPropagation();
      import('./speech.js').then(({ speakCard }) => speakCard(card, 'front', 0.8));
    });

    container.appendChild(item);
  });

  show(container);
}

async function studyDeck(deckId) {
  const profile  = App.currentProfile;
  const cards    = App.allProfileCards.filter(c => c.deckId === deckId);
  const due      = cards.filter(c => c.nextReview <= todayStr());
  const newCards = cards.filter(c => c.reviewCount === 0);
  const queue    = buildStudyQueue(due, newCards, profile.newPerDay || 10);

  if (!queue.length) { toast('这个题库今天没有需要复习的卡片'); return; }

  App.studyQueue     = queue;
  App.studyIndex     = 0;
  App.sessionResults = [];

  hide($('session-complete'));
  showPage('study');
  switchStudyMode('flashcard');
  renderCard();
}

// ===== 内置知识库加载 =====

const BUILTIN_DECKS = [
  { file: 'data/builtin/english/primary/grade3_words.json',        name: '小学三年级英语',       subject: 'english', grade: 'primary' },
  { file: 'data/builtin/english/primary/grade4_words.json',        name: '小学四年级英语',       subject: 'english', grade: 'primary' },
  { file: 'data/builtin/english/primary/grade5_words.json',        name: '小学五年级英语',       subject: 'english', grade: 'primary' },
  { file: 'data/builtin/english/primary/grade6_words.json',        name: '小学六年级英语',       subject: 'english', grade: 'primary' },
  { file: 'data/builtin/english/middle/middle_vocab.json',         name: '初中核心词汇',         subject: 'english', grade: 'middle'  },
  { file: 'data/builtin/english/middle/middle_grammar.json',       name: '初中英语语法',         subject: 'english', grade: 'middle'  },
  { file: 'data/builtin/chinese/primary/primary_chars_words.json', name: '小学生字（含偏旁笔画）', subject: 'chinese', grade: 'primary' },
  { file: 'data/builtin/chinese/primary/primary_words.json',       name: '小学语文词语（跟读）',  subject: 'chinese', grade: 'primary' },
  { file: 'data/builtin/chinese/primary/primary_poems.json',       name: '小学必背古诗75首',     subject: 'chinese', grade: 'primary' },
  { file: 'data/builtin/chinese/primary/primary_idioms.json',      name: '小学成语',             subject: 'chinese', grade: 'primary' },
  { file: 'data/builtin/chinese/middle/middle_poems.json',         name: '初中必背古诗文',       subject: 'chinese', grade: 'middle'  },
  { file: 'data/builtin/math/primary/multiplication.json',         name: '乘法口诀',             subject: 'math',    grade: 'primary' },
  { file: 'data/builtin/math/primary/primary_formulas.json',       name: '小学数学公式',         subject: 'math',    grade: 'primary' },
  { file: 'data/builtin/math/primary/primary_concepts.json',       name: '小学数学概念',         subject: 'math',    grade: 'primary' },
  { file: 'data/builtin/math/middle/geometry.json',                name: '初中几何公式',         subject: 'math',    grade: 'middle'  },
  { file: 'data/builtin/math/middle/algebra.json',                 name: '初中代数公式',         subject: 'math',    grade: 'middle'  },
];

async function showBuiltinLibrary() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  // grade-filter 只在题库页存在，不存在时默认 all
  const gradeFilterEl = $('grade-filter');
  const gradeFilter   = gradeFilterEl?.querySelector('.filter-btn.active')?.dataset.grade || 'all';

  const filtered = gradeFilter === 'all' ? BUILTIN_DECKS :
    BUILTIN_DECKS.filter(d => d.grade === gradeFilter);

  modal.innerHTML = `
    <div class="modal">
      <h3>加载内置知识库</h3>
      ${filtered.map((d, i) => `
        <button class="btn-secondary" data-idx="${i}" style="text-align:left;margin-bottom:6px">
          ${subjectIcon(d.subject)} ${d.name}
        </button>
      `).join('')}
      <button class="btn-secondary" id="close-builtin-modal" style="margin-top:8px">取消</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#close-builtin-modal').addEventListener('click', () => modal.remove());
  modal.querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', async () => {
      modal.remove();
      const deck = filtered[parseInt(btn.dataset.idx)];
      await loadBuiltinDeck(deck);
    });
  });
}

async function loadBuiltinDeck(deckDef, forceUpdate = false) {
  try {
    toast(`正在加载 ${deckDef.name}...`);
    const res   = await fetch(deckDef.file + '?t=' + Date.now());  // 绕过缓存
    if (!res.ok) throw new Error('文件不存在：' + deckDef.file);
    const data  = await res.json();
    const profile = App.currentProfile;

    // 检查是否已有同名牌组（自动更新逻辑）
    const allDecks = await DeckManager.getByProfile(profile.id);
    const existing = allDecks.find(d => d.name === deckDef.name && d.isBuiltin);

    if (existing && !forceUpdate) {
      // 比较版本：如果本地版本低于新数据版本，提示更新
      const localVersion  = existing.dataVersion || '0';
      const remoteVersion = data.meta?.version || '2024';
      if (localVersion >= remoteVersion) {
        toast(`${deckDef.name} 已是最新版本`);
        return;
      }
      // 有更新：删除旧卡片，重新导入
      toast(`${deckDef.name} 发现新版本，正在更新...`);
      const oldCards = App.allProfileCards.filter(c => c.deckId === existing.id);
      await Promise.all(oldCards.map(c => CardManager.delete(c.id)));
      await DeckManager.delete(existing.id, profile.id);
    }

    const deck = await DeckManager.create(profile.id, deckDef.name, deckDef.subject, deckDef.grade, true);
    // 保存版本号到 deck
    deck.dataVersion = data.meta?.version || '2024';
    await import('./core.js').then(m => m.CardManager); // ensure loaded

    // 注入 subject 字段
    const cards = (data.cards || []).map(c => ({ ...c, subject: deckDef.subject }));
    await CardManager.bulkCreate(profile.id, deck.id, cards);

    App.allProfileCards = await CardManager.getByProfile(profile.id);
    toast(`已加载 ${cards.length} 张卡片，点击主页科目图标开始学习！`);
    loadHomeData();
    renderLibrary();
  } catch (e) {
    toast(`加载失败：${e.message}`);
  }
}

async function updateAllBuiltinDecks() {
  const profile = App.currentProfile;
  if (!profile) return;
  const allDecks = await DeckManager.getByProfile(profile.id);
  const builtinLoaded = allDecks.filter(d => d.isBuiltin).map(d => d.name);

  let updated = 0;
  for (const deckDef of BUILTIN_DECKS) {
    if (builtinLoaded.includes(deckDef.name)) {
      await loadBuiltinDeck(deckDef, true);
      updated++;
    }
  }
  toast(updated > 0 ? `已检查并更新 ${updated} 个题库` : '没有已加载的内置题库需要更新');
}

// ===== 统计 =====

async function renderStats() {
  const profile = App.currentProfile;
  if (!profile) return;

  const cards   = App.allProfileCards;
  const allProg = await ProgressManager.getLast7Days(profile.id);

  const totalReviewed = allProg.reduce((s, p) => s + p.reviewed, 0);
  const totalCorrect  = allProg.reduce((s, p) => s + p.correct, 0);
  const accuracy = totalReviewed ? Math.round(totalCorrect / totalReviewed * 100) : 0;

  $('total-reviewed').textContent = totalReviewed;
  $('total-accuracy').textContent = `${accuracy}%`;
  $('total-streak').textContent   = profile.streak || 0;

  // 7天图表
  renderWeeklyChart(allProg);

  // 最难卡片
  const hard = cards
    .filter(c => c.reviewCount > 2)
    .sort((a, b) => (a.correctCount / a.reviewCount) - (b.correctCount / b.reviewCount))
    .slice(0, 10);

  const list = $('hard-cards-list');
  list.innerHTML = '';
  hard.forEach(c => {
    const rate = Math.round((c.correctCount || 0) / c.reviewCount * 100);
    const item = document.createElement('div');
    item.className = 'hard-card-item';
    item.innerHTML = `<span class="hard-card-front">${escapeHtml(c.front)}</span><span class="hard-card-rate">正确率 ${rate}%</span>`;
    list.appendChild(item);
  });
}

function renderWeeklyChart(data) {
  const container = $('weekly-chart');
  container.innerHTML = '';
  const max = Math.max(...data.map(d => d.reviewed), 1);

  data.forEach(d => {
    const group  = document.createElement('div');
    group.className = 'chart-bar-group';
    const pct = Math.round((d.reviewed / max) * 100);
    const day  = d.date.slice(5);
    group.innerHTML = `
      <div class="chart-bar" style="height:${pct}%"></div>
      <div class="chart-label">${day}</div>
    `;
    container.appendChild(group);
  });
}

// ===== 设置 =====

async function renderSettings() {
  const profile = App.currentProfile;
  if (!profile) return;

  $('setting-grade').value       = profile.grade?.replace(/\d+$/, '') || 'primary';
  $('setting-algorithm').value   = profile.algorithm || 'auto';
  $('setting-new-per-day').value = profile.newPerDay || 10;
  $('new-per-day-value').textContent = profile.newPerDay || 10;
  $('setting-speech-rate').value = profile.speechRate || 0.8;
  $('speech-rate-value').textContent = `${profile.speechRate || 0.8}×`;
  $('setting-azure-key').value    = profile.azureKey    || '';
  $('setting-azure-region').value = profile.azureRegion || '';

  // 成人模式 toggle 同步
  const adultToggle = $('setting-adult-mode');
  if (adultToggle) adultToggle.checked = localStorage.getItem('adult_mode') === '1';

  // AI 配置同步
  loadAISettingsUI();

  // 声音选择器（延迟加载，等声音列表就绪）
  loadVoiceSelectors();

  // 设置自动保存（grade / algorithm / newPerDay / speechRate）
  ['setting-grade','setting-algorithm'].forEach(id => {
    $(id)?.addEventListener('change', saveProfileSettings);
  });
  ['setting-new-per-day','setting-speech-rate'].forEach(id => {
    $(id)?.addEventListener('change', saveProfileSettings);
  });

  // 渲染档案列表
  const profiles  = await ProfileManager.getAll();
  const pList = $('settings-profiles-list');
  pList.innerHTML = '';
  profiles.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0';
    row.innerHTML = `<span style="font-size:24px">${p.avatar}</span><span style="flex:1">${escapeHtml(p.name)}</span>`;
    pList.appendChild(row);
  });
}

async function saveProfileSettings() {
  await ProfileManager.update(App.currentProfile.id, {
    grade:      $('setting-grade').value,
    algorithm:  $('setting-algorithm').value,
    newPerDay:  parseInt($('setting-new-per-day').value),
    speechRate: parseFloat($('setting-speech-rate').value)
  });
  // 更新内存
  Object.assign(App.currentProfile, {
    grade:      $('setting-grade').value,
    algorithm:  $('setting-algorithm').value,
    newPerDay:  parseInt($('setting-new-per-day').value),
    speechRate: parseFloat($('setting-speech-rate').value)
  });
  toast('已保存');
}

function loadVoiceSelectors() {
  const populate = (selectId, lang) => {
    const sel = $(selectId);
    if (!sel) return;
    const voices = getAvailableVoices(lang);
    if (!voices.length) {
      sel.innerHTML = '<option value="">（系统默认）</option>';
      return;
    }
    const savedName = localStorage.getItem(`voice_${lang}`) || '';
    sel.innerHTML = '<option value="">（自动选最佳）</option>' +
      voices.map(v => {
        const quality = v.name.toLowerCase().includes('google') ? ' ⭐' :
                        v.name.toLowerCase().includes('microsoft') ? ' ★' : '';
        const online  = !v.localService ? ' [在线]' : '';
        return `<option value="${escapeHtml(v.name)}" ${v.name === savedName ? 'selected' : ''}>${escapeHtml(v.name)}${quality}${online}</option>`;
      }).join('');

    sel.addEventListener('change', () => {
      setSavedVoiceName(lang, sel.value);
      // 立刻试听
      const testText = lang === 'zh-CN' ? '你好，这是中文朗读测试' : 'Hello, this is a voice test.';
      speak(testText, lang, 0.9);
    });
  };

  // 声音列表可能还没加载，等一下再试
  const tryLoad = () => {
    const zhVoices = getAvailableVoices('zh-CN');
    const enVoices = getAvailableVoices('en-US');
    if (zhVoices.length || enVoices.length) {
      populate('setting-voice-zh', 'zh-CN');
      populate('setting-voice-en', 'en-US');
    } else {
      setTimeout(tryLoad, 500);
    }
  };
  tryLoad();

  // 试听按钮
  $('btn-test-voice')?.addEventListener('click', () => {
    const zhVoice = $('setting-voice-zh')?.value;
    const enVoice = $('setting-voice-en')?.value;
    if (zhVoice) setSavedVoiceName('zh-CN', zhVoice);
    if (enVoice) setSavedVoiceName('en-US', enVoice);
    speak('床前明月光，疑是地上霜。', 'zh-CN', 0.9);
    setTimeout(() => speak('Hello! Nice to meet you.', 'en-US', 0.85), 2500);
  });
}

async function saveAzureConfig() {
  const key    = $('setting-azure-key').value.trim();
  const region = $('setting-azure-region').value.trim();
  await ProfileManager.update(App.currentProfile.id, { azureKey: key, azureRegion: region });
  App.currentProfile.azureKey    = key;
  App.currentProfile.azureRegion = region;
  toast(key ? 'Azure 配置已保存' : 'Azure Key 已清除');
}

async function exportCurrentProfile() {
  const data    = await exportData(App.currentProfile.id);
  const json    = JSON.stringify(data, null, 2);
  const blob    = new Blob([json], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `kids-memory-${App.currentProfile.name}-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearCurrentProfileData() {
  const name = App.currentProfile.name;
  // 第一次确认
  if (!confirm(`确定要清空【${name}】的所有学习数据吗？\n\n此操作将删除所有卡片和学习记录，无法撤销！`)) return;
  // 第二次确认
  const input = prompt(`请输入档案名称【${name}】以确认删除：`);
  if (input?.trim() !== name) {
    toast('输入的名称不匹配，已取消');
    return;
  }
  const cards = await CardManager.getByProfile(App.currentProfile.id);
  await Promise.all(cards.map(c => CardManager.delete(c.id)));
  App.allProfileCards = [];
  toast('数据已清空');
  loadHomeData();
}

// ===== 档案弹窗管理 =====

let _editingProfileId = null;  // null = 新建，有值 = 编辑

function openProfileEditModal(profile) {
  _editingProfileId = profile?.id || null;

  $('profile-modal-title').textContent = profile ? '编辑档案' : '新建档案';
  $('profile-name-input').value        = profile?.name || '';
  $('profile-grade-input').value       = profile?.grade?.replace(/\d+$/, '') || 'primary';

  // 设置头像
  const avatar = profile?.avatar || '🐼';
  $('profile-selected-avatar').textContent = avatar;
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emoji === avatar);
  });

  show($('profile-edit-modal'));
  setTimeout(() => $('profile-name-input').focus(), 100);
}

async function saveProfileFromModal() {
  const name  = $('profile-name-input').value.trim();
  const grade = $('profile-grade-input').value;
  const avatar = $('profile-selected-avatar').textContent;

  if (!name) { toast('请输入名字'); return; }

  if (_editingProfileId) {
    await ProfileManager.update(_editingProfileId, { name, grade, avatar });
    // 如果正在编辑当前档案，同步内存
    if (App.currentProfile?.id === _editingProfileId) {
      Object.assign(App.currentProfile, { name, grade, avatar });
      $('current-avatar').textContent = avatar;
      $('current-name').textContent   = name;
    }
    toast(`已更新档案：${name}`);
  } else {
    const profile = await ProfileManager.create(name, avatar, grade.startsWith('middle') ? 'middle' : 'primary');
    await ProfileManager.update(profile.id, { grade });
    toast(`已创建档案：${name}`);
  }

  hide($('profile-edit-modal'));
  await loadProfiles();
}

async function openManageProfiles() {
  const profiles = await ProfileManager.getAll();
  const list = $('manage-profiles-list');
  list.innerHTML = '';

  profiles.forEach(p => {
    const row = document.createElement('div');
    row.className = 'manage-profile-item';
    row.innerHTML = `
      <div class="manage-profile-emoji">${p.avatar || '🐣'}</div>
      <div class="manage-profile-info">
        <div class="manage-profile-name">${escapeHtml(p.name)}</div>
        <div class="manage-profile-grade">${gradeLabel(p.grade)}</div>
      </div>
      <div class="manage-profile-btns">
        <button class="btn-edit-sm" data-id="${p.id}">编辑</button>
        <button class="btn-delete-sm" data-id="${p.id}" data-name="${escapeHtml(p.name)}">删除</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.btn-edit-sm').forEach(btn => {
    btn.addEventListener('click', async () => {
      const p = profiles.find(x => x.id === btn.dataset.id);
      hide($('manage-profiles-modal'));
      openProfileEditModal(p);
    });
  });

  list.querySelectorAll('.btn-delete-sm').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`确定删除档案"${btn.dataset.name}"及其所有学习数据吗？`)) return;
      await ProfileManager.delete(btn.dataset.id);
      if (App.currentProfile?.id === btn.dataset.id) App.currentProfile = null;
      toast('档案已删除');
      hide($('manage-profiles-modal'));
      await loadProfiles();
    });
  });

  show($('manage-profiles-modal'));
}

async function saveAIConfig() {
  const workerUrl = $('setting-free-worker-url')?.value.trim() || '';
  const provider  = $('setting-ai-provider').value;
  const key       = $('setting-ai-key').value.trim();
  const endpoint  = $('setting-ai-endpoint').value.trim();

  if (workerUrl) localStorage.setItem('free_worker_url', workerUrl);
  else           localStorage.removeItem('free_worker_url');

  localStorage.setItem('ai_provider', provider || (workerUrl ? 'free' : ''));
  localStorage.setItem('ai_key',      key);
  localStorage.setItem('ai_endpoint', endpoint);

  if (workerUrl)  toast('免费 Worker 已配置，AI 功能已启用');
  else if (key)   toast('AI Key 已保存');
  else            toast('AI 配置已清除');
}

function loadAISettingsUI() {
  const workerUrl = localStorage.getItem('free_worker_url') || '';
  const provider  = localStorage.getItem('ai_provider') || '';
  const key       = localStorage.getItem('ai_key') || '';
  const endpoint  = localStorage.getItem('ai_endpoint') || '';

  if ($('setting-free-worker-url')) $('setting-free-worker-url').value = workerUrl;
  if ($('setting-ai-provider'))     $('setting-ai-provider').value     = provider === 'free' ? '' : provider;
  if ($('setting-ai-key'))          $('setting-ai-key').value          = key ? '••••••••' : '';
  if ($('setting-ai-endpoint'))     $('setting-ai-endpoint').value     = endpoint;
}

function openAIModal() {
  const workerUrl   = localStorage.getItem('free_worker_url') || '';
  const savedKey    = localStorage.getItem('ai_key') || '';
  // 优先免费 Worker，其次看有没有 Key，否则默认 deepseek
  const savedProvider = localStorage.getItem('ai_provider')
    || (workerUrl ? 'free' : savedKey ? 'deepseek' : 'free');

  const modal = $('ai-generate-modal');
  if (!modal) return;

  // 只操作弹窗内部的 tabs（避免影响其他页面的同名属性）
  modal.querySelectorAll('[data-provider]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.provider === savedProvider);
  });

  // 显示 Key / Worker 状态
  const hintEl = $('ai-key-hint');
  if (hintEl) {
    if (workerUrl) {
      hintEl.textContent = '已配置免费 Worker ✓';
      hintEl.style.display = 'block';
    } else if (savedKey) {
      hintEl.textContent = '已使用保存的 API Key ✓';
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }
  }

  // 同步当前档案年级
  const grade = App.currentProfile?.grade || 'primary3';
  const gradeMap = {
    primary1:'小学一年级', primary2:'小学二年级', primary3:'小学三年级',
    primary4:'小学四年级', primary5:'小学五年级', primary6:'小学六年级',
    middle1:'初中一年级', middle2:'初中二年级', middle3:'初中三年级'
  };
  const gradeSelect = $('ai-grade-select');
  if (gradeSelect) gradeSelect.value = gradeMap[grade] || '小学三年级';

  show(modal);
}

function downloadTemplate(type) {
  const files = {
    english: 'data/sample/template_english.csv',
    chinese: 'data/sample/template_chinese.csv',
    math:    'data/sample/template_math.csv',
    general: 'data/sample/template_general.csv'
  };
  const names = {
    english: '英语单词模板.csv',
    chinese: '语文词语模板.csv',
    math:    '数学公式模板.csv',
    general: '通用模板.csv'
  };
  const url  = files[type];
  const name = names[type];
  if (!url) return;
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
}

async function addProfileDialog() {
  openProfileEditModal(null);
}

// ===== 音效（Web Audio API，无依赖）=====

const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function playSound(type) {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const sounds = {
    correct:  { freq: [523, 659, 784], dur: 0.1 },
    wrong:    { freq: [220, 180],       dur: 0.15 },
    perfect:  { freq: [523, 659, 784, 1047], dur: 0.12 },
    complete: { freq: [392, 523, 659], dur: 0.15 }
  };

  const cfg   = sounds[type] || sounds.correct;
  const now   = audioCtx.currentTime;

  osc.type = 'sine';
  cfg.freq.forEach((f, i) => {
    osc.frequency.setValueAtTime(f, now + i * cfg.dur);
  });

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.freq.length * cfg.dur + 0.1);

  osc.start(now);
  osc.stop(now + cfg.freq.length * cfg.dur + 0.2);
}

// ===== 工具函数 =====

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function gradeLabel(grade) {
  const map = {
    // 新简化值
    primary: '小学', middle: '初中', adult: '成人学习',
    // 旧年级值（兼容）
    primary1: '小学', primary2: '小学', primary3: '小学',
    primary4: '小学', primary5: '小学', primary6: '小学',
    middle1: '初中', middle2: '初中', middle3: '初中'
  };
  return map[grade] || grade || '';
}

// ===== 英文音节着色 =====

const SYLLABLE_COLORS = ['var(--syl-1)', 'var(--syl-2)', 'var(--syl-3)', 'var(--syl-4)'];

function splitSyllables(word) {
  // 先检查音标里是否有 · 分隔符（最准确）
  // 如果没有，用规则算法拆分
  const w = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!w) return [word];

  const vowels = 'aeiouy';
  const isVowel = c => vowels.includes(c);

  // 特殊前缀/后缀不拆
  const prefixes = ['pre','pro','re','un','dis','mis','over','under','out','sub','super'];
  const suffixes = ['tion','sion','ous','ious','eous','ful','less','ness','ment','ing','ed','er','est','ly','ive','ize','ise','able','ible','al','ic'];

  // 找元音位置
  const chars = w.split('');
  const vowelPositions = chars.map((c, i) => isVowel(c) ? i : -1).filter(i => i >= 0);

  if (vowelPositions.length <= 1) return [word]; // 单音节

  // 基于 VCV / VCCV 规则拆分
  const breaks = [];
  for (let i = 0; i < vowelPositions.length - 1; i++) {
    const v1 = vowelPositions[i];
    const v2 = vowelPositions[i + 1];
    const between = chars.slice(v1 + 1, v2);

    if (between.length === 0) continue; // 相邻元音，不拆（ai, ea, etc）
    if (between.length === 1) {
      // VCV → 在辅音前拆：V|CV（开音节）
      breaks.push(v1 + 1);
    } else if (between.length >= 2) {
      // VCCV → 在辅音群中间拆：VC|CV
      const mid = v1 + 1 + Math.floor(between.length / 2);
      breaks.push(mid);
    }
  }

  if (!breaks.length) return [word];

  // 按 breaks 切割原始单词（保留大小写和连字符）
  const orig = word;
  const result = [];
  let prev = 0;
  for (const b of breaks) {
    if (b > prev && b < orig.length) {
      result.push(orig.slice(prev, b));
      prev = b;
    }
  }
  result.push(orig.slice(prev));
  return result.filter(s => s.length > 0);
}

function colorSyllables(word) {
  // 只处理纯英文单词（允许连字符和撇号）
  if (!word || !/^[a-zA-Z][a-zA-Z' -]*$/.test(word.trim())) return null;
  const parts = splitSyllables(word.trim());
  if (parts.length <= 1) return null; // 单音节不着色
  return parts.map((p, i) =>
    `<span class="syl syl-${(i % 4) + 1}">${escapeHtml(p)}</span>`
  ).join('');
}

// 把英文文本（单个单词或短语）做音节着色，返回 HTML 字符串
function colorEnglishSyllables(text) {
  if (!text) return '';
  // 按"英文单词 / 非英文字符"交替分割
  const tokens = text.split(/([a-zA-Z][a-zA-Z'-]*)/);
  return tokens.map(tok => {
    if (/^[a-zA-Z][a-zA-Z'-]*$/.test(tok)) {
      const colored = colorSyllables(tok);
      return colored || escapeHtml(tok);
    }
    return escapeHtml(tok);
  }).join('');
}

function subjectLabel(subject) {
  return { chinese: '语文', english: '英语', math: '数学', custom: '题库' }[subject] || '';
}

function subjectIcon(subject) {
  return { chinese: '文', english: 'En', math: '∑', custom: '+' }[subject] || '?';
}

// ===== 启动 =====

// 监听英语单词速记开始事件（由 english.js 派发）
document.addEventListener('start-english-vocab', e => {
  const { queue, direction } = e.detail;
  if (!queue?.length) { toast('没有可复习的单词'); return; }

  // 设置方向
  if (direction) App.cardDirection = direction;

  App.studyQueue     = queue;
  App.studyIndex     = 0;
  App.sessionResults = [];

  hide($('session-complete'));
  showPage('study');
  switchStudyMode('flashcard');
  renderCard();
});

// 监听 AI 生成完成事件
document.addEventListener('ai-cards-ready', e => {
  const { cards, suggestedName } = e.detail;
  _importCache = cards;
  if ($('deck-name-input')) $('deck-name-input').value = suggestedName;
  showImportPreview(cards);
  showPage('import');
  toast(`AI 生成了 ${cards.length} 张卡片，请确认后导入`);
});

// 从词库商店返回时刷新题库
document.addEventListener('refresh-library', async () => {
  if (App.currentProfile) {
    App.allProfileCards = await CardManager.getByProfile(App.currentProfile.id);
    renderLibrary();
    loadHomeData();
  }
});

// AI 设置回显已在 saveAIConfig 上方定义，此处无需重复

// ===== 全局查询页面 =====

let _searchFilter = 'all';
let _searchTimer  = null;
let _searchIndex  = null;  // 缓存的搜索索引：{ deckId → cards[] }

let _searchPageInited = false;

function initSearchPage() {
  const input    = $('search-page-input');
  const clearBtn = $('btn-search-page-clear');

  // 只绑定一次——后续进入页面只重置 UI 状态
  if (!_searchPageInited) {
    _searchPageInited = true;

    // 过滤 tab
    document.querySelectorAll('.search-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _searchFilter = btn.dataset.filter;
        const q = input?.value.trim();
        if (q) runSearch(q);
      });
    });

    // 示例词
    document.querySelectorAll('.sph-ex').forEach(ex => {
      ex.addEventListener('click', () => {
        if (input) { input.value = ex.dataset.q; input.focus(); }
        runSearch(ex.dataset.q);
      });
    });

    // 输入框：实时搜索（防抖）+ Enter 立即搜索
    input?.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      const q = input.value.trim();
      if (q) {
        show(clearBtn);
        _searchTimer = setTimeout(() => runSearch(q), 250);
      } else {
        hide(clearBtn);
        hide($('search-page-results'));
        show($('search-page-hint'));
        if ($('search-page-count')) $('search-page-count').textContent = '';
      }
    });

    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        clearTimeout(_searchTimer);
        const q = input.value.trim();
        if (q) { show(clearBtn); runSearch(q); }
        e.preventDefault();
      }
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      hide(clearBtn);
      hide($('search-page-results'));
      show($('search-page-hint'));
      if ($('search-page-count')) $('search-page-count').textContent = '';
      input.focus();
    });
  }

  // 每次进入页面：如果已有查询词就重新搜索，否则显示提示
  const q = input?.value.trim();
  if (q) {
    runSearch(q);
  } else {
    hide($('search-page-results'));
    show($('search-page-hint'));
    if ($('search-page-count')) $('search-page-count').textContent = '';
  }

  setTimeout(() => input?.focus(), 150);
}

async function buildSearchIndex() {
  const profile = App.currentProfile;
  if (!profile) { console.warn('[Search] no profile'); return {}; }

  // 每次都从 DB 拿最新卡片（覆盖所有已下载词库）
  const allCards = await CardManager.getByProfile(profile.id);
  const decks    = await DeckManager.getByProfile(profile.id);

  console.log('[Search] profile:', profile.name, 'decks:', decks.length, 'cards:', allCards.length);

  const index = {};

  decks.forEach(deck => {
    const deckCards = allCards.filter(c => c.deckId === deck.id);
    // 有卡片才加入（跳过空题组）
    if (deckCards.length) {
      index[deck.id] = { deck, cards: deckCards };
    }
  });

  // 加入古诗文背诵（通过全局变量访问，避免 bundle 作用域问题）
  try {
    const texts = window._recitationTexts;
    console.log('[Search] recitation texts:', texts?.length);
    if (texts?.length) {
      index['__recitation__'] = {
        deck: { id: '__recitation__', name: '古诗文背诵', subject: 'chinese' },
        cards: texts.map(t => ({
          id: t.id,
          deckId: '__recitation__',
          front: t.title + (t.author ? ' — ' + t.author : ''),
          back: t.full_text || '',
          hint: t.annotation || '',
          example: t.translation || '',
          tags: [t.dynasty || '', t.category || '', t.grade || ''],
          _reciteId: t.id
        }))
      };
    }
  } catch (e) { console.warn('[Search] recitation error:', e); }

  console.log('[Search] index built, groups:', Object.keys(index));
  return index;
}

async function runSearch(query) {
  const container = $('search-page-results');
  const hint      = $('search-page-hint');
  const countEl   = $('search-page-count');
  if (!container) return;

  const q = query.toLowerCase().trim();
  if (!q) return;

  // 每次搜索都重建索引（确保词库变化即时反映）
  _searchIndex = await buildSearchIndex();

  console.log('[Search] query:', JSON.stringify(q), 'filter:', _searchFilter,
    'groups:', Object.keys(_searchIndex).length,
    'keys:', Object.keys(_searchIndex).join(','));

  const re     = new RegExp(escapeRegex(q), 'gi');  // 用于高亮
  const hiText = (text) => {
    if (!text) return '';
    return escapeHtml(text).replace(
      new RegExp(`(${escapeRegex(escapeHtml(q))})`, 'gi'),
      '<mark>$1</mark>'
    );
  };

  // 在每个牌组里搜索
  const groupResults = [];
  let totalCount = 0;

  for (const { deck, cards } of Object.values(_searchIndex)) {
    // 科目过滤（subject 可能为 undefined，当作 custom 处理）
    const isRecitation = deck.id === '__recitation__';
    const subject = deck.subject || 'custom';
    if (_searchFilter !== 'all' && subject !== _searchFilter) continue;

    const matched = cards.filter(c => {
      const front = c.front?.toLowerCase() || '';
      const back  = c.back?.toLowerCase()  || '';
      const hint_ = c.hint?.toLowerCase()  || '';
      const ex    = c.example?.toLowerCase() || '';
      const ph    = c.phonetic?.toLowerCase() || '';
      const tags  = (c.tags || []).join(' ').toLowerCase();
      return front.includes(q) || back.includes(q) || hint_.includes(q) ||
             ex.includes(q) || ph.includes(q) || tags.includes(q);
    });

    if (matched.length) {
      groupResults.push({ deck, matched: matched.slice(0, 20), isRecitation });
      totalCount += matched.length;
    }
  }

  // 无结果
  if (!groupResults.length) {
    container.innerHTML = `<div class="search-empty-full">没有找到 <strong>${escapeHtml(query)}</strong> 相关内容<br><span style="font-size:var(--font-size-xs);color:var(--color-text-hint)">试试换个关键词，或先下载更多词库</span></div>`;
    show(container);
    hide(hint);
    countEl.textContent = '无结果';
    return;
  }

  countEl.textContent = `共 ${totalCount} 条`;

  container.innerHTML = '';

  groupResults.forEach(({ deck, matched, isRecitation }) => {
    const section = document.createElement('div');
    section.className = 'sq-section';

    const subjectColors = { chinese: '#E84848', english: '#3B82F6', math: '#8B5CF6', custom: '#10B981' };
    const subjectIcons  = { chinese: '文', english: 'En', math: '∑', custom: '+' };
    const color = subjectColors[deck.subject] || '#aaa';
    const icon  = isRecitation ? '诗' : (subjectIcons[deck.subject] || '?');

    section.innerHTML = `
      <div class="sq-deck-header">
        <span class="sq-deck-icon" style="background:${color}">${icon}</span>
        <span class="sq-deck-name">${escapeHtml(deck.name)}</span>
        <span class="sq-deck-count">${matched.length} 条</span>
      </div>
    `;

    matched.forEach(card => {
      const item = document.createElement('div');
      item.className = 'sq-item' + (isRecitation ? ' sq-item-recite' : '');

      if (isRecitation) {
        // 古诗词：显示标题、作者、原文摘要；点击可进入背诵
        const previewText = card.back.replace(/\n/g, ' ').slice(0, 40);
        item.innerHTML = `
          <div class="sq-item-main">
            <div class="sq-front">${hiText(card.front)}</div>
            <div class="sq-back sq-recite-preview">${escapeHtml(previewText)}…</div>
            ${card.example ? `<div class="sq-example sq-recite-trans">${escapeHtml(card.example.slice(0, 50))}…</div>` : ''}
          </div>
          <button class="sq-recite-btn" title="背诵">📖</button>
        `;
        item.querySelector('.sq-recite-btn').addEventListener('click', e => {
          e.stopPropagation();
          (window._openRecitationPage || openRecitationPage)(card._reciteId);
        });
        item.addEventListener('click', () => {
          (window._openRecitationPage || openRecitationPage)(card._reciteId);
        });
      } else {
        item.innerHTML = `
          <div class="sq-item-main">
            <div class="sq-front">${hiText(card.front)}${card.phonetic ? `<span class="sq-phonetic">${escapeHtml(card.phonetic)}</span>` : ''}</div>
            <div class="sq-back">${hiText(card.back)}</div>
            ${card.example ? `<div class="sq-example">${hiText(card.example)}</div>` : ''}
            ${card.hint ? `<div class="sq-hint">💡 ${hiText(card.hint)}</div>` : ''}
          </div>
          <button class="sq-speak" title="朗读">🔊</button>
        `;
        item.querySelector('.sq-speak').addEventListener('click', e => {
          e.stopPropagation();
          const text = card.front;
          const hasChinese = /[一-鿿]/.test(text);
          speak(text, hasChinese ? 'zh-CN' : 'en-US', 0.85);
        });
      }
      section.appendChild(item);
    });

    container.appendChild(section);
  });

  show(container);
  hide(hint);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 搜索索引失效时重建（词库下载后）
document.addEventListener('vocab-downloaded', () => { _searchIndex = null; });
document.addEventListener('refresh-library',  () => { _searchIndex = null; });

// 暴露调试接口
window._dbg = { runSearch, buildSearchIndex, get filter() { return _searchFilter; }, get index() { return _searchIndex; } };

init();
