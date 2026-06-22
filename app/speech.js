/**
 * speech.js — TTS朗读 + STT语音识别 + 语音切换档案
 */

// ===== 能力检测 =====

export const SpeechSupport = {
  tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
  stt: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
};

// ===== TTS（文字转语音）=====

let _voices = [];
let _voicesLoaded = false;

function loadVoices() {
  return new Promise(resolve => {
    if (!SpeechSupport.tts) { resolve([]); return; }
    const update = () => {
      _voices = speechSynthesis.getVoices();
      if (_voices.length) { _voicesLoaded = true; resolve(_voices); }
    };
    update();
    speechSynthesis.onvoiceschanged = update;
    // 降级：1秒后强制 resolve
    setTimeout(() => resolve(_voices), 1000);
  });
}

// 用户手动选择的声音（存 localStorage）
function getSavedVoiceName(lang) {
  return localStorage.getItem(`voice_${lang}`) || '';
}

export function setSavedVoiceName(lang, name) {
  localStorage.setItem(`voice_${lang}`, name);
}

function pickVoice(lang) {
  if (!_voicesLoaded || !_voices.length) return null;

  // 先看用户是否手动选了声音
  const savedName = getSavedVoiceName(lang);
  if (savedName) {
    const saved = _voices.find(v => v.name === savedName);
    if (saved) return saved;
  }

  // 过滤出匹配语言的声音
  const prefix   = lang.split('-')[0];          // 'zh' / 'en'
  const matching = _voices.filter(v =>
    v.lang === lang || v.lang.startsWith(prefix)
  );
  if (!matching.length) return null;

  // 优先级：Google > Microsoft > Apple > 其他
  const priority = (v) => {
    const n = v.name.toLowerCase();
    if (n.includes('google'))       return 0;
    if (n.includes('microsoft'))    return 1;
    if (n.includes('samantha') || n.includes('daniel') || n.includes('karen')) return 2;  // Apple 高质量
    if (!v.localService)            return 3;  // 在线声音通常更自然
    return 4;
  };

  return matching.sort((a, b) => priority(a) - priority(b))[0];
}

/** 返回当前可用的所有声音列表（供设置页使用）*/
export function getAvailableVoices(lang) {
  if (!_voicesLoaded) return [];
  const prefix = lang.split('-')[0];
  return _voices.filter(v => v.lang === lang || v.lang.startsWith(prefix));
}

let _currentUtterance = null;

export function speak(text, lang = 'en-US', rate = 0.8, onEnd, pitch = 1.0) {
  if (!SpeechSupport.tts) return;
  speechSynthesis.cancel();

  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = lang;
  utter.rate     = rate;
  utter.pitch    = pitch;

  const applyVoice = () => {
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.onend = onEnd;
    speechSynthesis.speak(utter);
  };

  if (!_voicesLoaded) {
    loadVoices().then(applyVoice);
  } else {
    applyVoice();
  }

  _currentUtterance = utter;
}

export function speakChinese(text, rate = 0.9) {
  // 中文稍快一点、音调微调让语感更自然
  speak(text, 'zh-CN', rate, undefined, 1.05);
}

export function speakEnglish(text, rate = 0.78) {
  speak(text, 'en-US', rate);
}

export function stopSpeaking() {
  if (SpeechSupport.tts) speechSynthesis.cancel();
}

// 根据卡片 subject 自动选择语言
export function speakCard(card, side = 'front', rate = 0.8) {
  const text = side === 'front' ? card.front : card.back;
  if (!text) return;

  // 判断文本语言：含中文字符则用中文，否则英文
  const hasChinese = /[一-鿿]/.test(text);
  speak(text, hasChinese ? 'zh-CN' : 'en-US', rate);
}

// ===== STT（语音识别）=====

const SpeechRecognitionClass = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

let _activeRecognition = null;

/**
 * 开始录音识别
 * @param {string} lang — 'en-US' | 'zh-CN'
 * @param {Function} onResult — (text: string, confidence: number) => void
 * @param {Function} onError  — (error: string) => void
 * @param {Function} onEnd    — () => void
 * @returns {Function} stop() 函数
 */
export function startListening(lang = 'en-US', onResult, onError, onEnd) {
  if (!SpeechSupport.stt) {
    onError?.('此设备/浏览器不支持语音识别，请使用 Android Chrome 或桌面 Chrome。');
    return () => {};
  }

  stopListening();

  const rec = new SpeechRecognitionClass();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  rec.onresult = e => {
    const result = e.results[0];
    if (result) {
      onResult?.(result[0].transcript.trim(), result[0].confidence);
    }
  };

  rec.onerror = e => {
    const msg = {
      'no-speech':     '没有检测到声音，请再试一次',
      'audio-capture': '无法访问麦克风，请检查权限',
      'not-allowed':   '麦克风权限被拒绝',
      'network':       '网络错误，语音识别需要网络连接'
    }[e.error] || `识别出错：${e.error}`;
    onError?.(msg);
  };

  rec.onend = onEnd;

  rec.start();
  _activeRecognition = rec;

  return () => rec.stop();
}

export function stopListening() {
  if (_activeRecognition) {
    try { _activeRecognition.stop(); } catch (_) {}
    _activeRecognition = null;
  }
}

// ===== 语音切换档案 =====

/**
 * 启动语音监听，识别档案名字后触发回调
 * @param {string[]} profileNames — 当前所有档案名
 * @param {Function} onMatch — (matchedName: string) => void
 * @param {Function} onError — (msg: string) => void
 * @param {Function} onEnd  — () => void
 */
export function startVoiceProfileSwitch(profileNames, onMatch, onError, onEnd) {
  return startListening(
    'zh-CN',
    (text) => {
      // 模糊匹配档案名
      const found = profileNames.find(name =>
        text.includes(name) ||
        name.includes(text) ||
        levenshtein(text, name) <= 1
      );
      if (found) onMatch?.(found);
      else {
        onError?.(`没有找到叫"${text}"的档案`);
        onEnd?.();
      }
    },
    onError,
    onEnd
  );
}

// ===== Levenshtein 编辑距离（用于模糊名字匹配）=====

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// 初始化：预加载语音列表
if (SpeechSupport.tts) loadVoices();
