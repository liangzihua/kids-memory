/**
 * pronunciation.js — 发音评分
 * 方案A（默认）：Levenshtein 文本相似度
 * 方案B（可选）：Azure Pronunciation Assessment API
 */

import { levenshtein } from './speech.js';

// ===== 方案A：文本相似度评分 =====

/**
 * 比较识别文本与目标文本，返回评分和反馈
 * @param {string} target   — 目标单词/句子
 * @param {string} spoken   — 识别到的文本
 * @param {number} confidence — STT 置信度 (0-1)
 * @returns {{ score: number, grade: string, feedback: string, highlights: Array }}
 */
export function scoreByText(target, spoken, confidence = 1) {
  const t = target.toLowerCase().trim();
  const s = spoken.toLowerCase().trim();

  if (!s) return { score: 0, grade: 'F', feedback: '没有听到声音，请再试一次', highlights: [] };

  // 完全匹配
  if (t === s) {
    return { score: 100, grade: 'A', feedback: '发音完美！', highlights: [] };
  }

  // 编辑距离比率
  const dist    = levenshtein(t, s);
  const maxLen  = Math.max(t.length, s.length);
  const simRatio = 1 - dist / maxLen;

  // STT 置信度加权
  const rawScore = simRatio * 0.8 + confidence * 0.2;
  const score    = Math.round(rawScore * 100);

  const grade    = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  const feedback = buildFeedback(t, s, score);
  const highlights = buildHighlights(t, s);

  return { score, grade, feedback, highlights, recognized: spoken };
}

function buildFeedback(target, spoken, score) {
  if (score >= 90) return '发音非常好！继续保持 👍';
  if (score >= 75) {
    const tips = getPronunciationTips(target, spoken);
    return tips ? `接近了！${tips}` : `听起来像 "${spoken}"，很接近！`;
  }
  if (score >= 60) {
    const tips = getPronunciationTips(target, spoken);
    return tips || `注意发音，目标是 "${target}"，再听一遍标准音后重试`;
  }
  const tips = getPronunciationTips(target, spoken);
  return tips || `请仔细听标准发音后重试，注意嘴型和舌位`;
}

// 常见中国学生发音错误 — 扩充版
const CHINESE_LEARNER_ERRORS = [
  // 辅音对
  { pattern: /\bth/, spoken_error: /[sd]/, tip: '"th" 发音：舌尖轻伸出齿间，不要发成 s 或 d' },
  { pattern: /\br/, spoken_error: /[lyw]/, tip: '"r" 发音：舌尖上翘悬空，不要发成 l 或 y' },
  { pattern: /\bl/, spoken_error: /[rn]/, tip: '"l" 发音：舌尖抵上牙龈，不要发成 r 或 n' },
  { pattern: /\bv/, spoken_error: /[wb]/, tip: '"v" 发音：上齿咬下唇，振动声带，不要发成 w 或 b' },
  { pattern: /\bw/, spoken_error: /[vb]/, tip: '"w" 发音：嘴唇圆突，不要咬唇（那是v）' },
  { pattern: /ng$/, spoken_error: /nk$|ng[gk]/, tip: '"ng" 结尾：不要加 g 的爆破，保持鼻音' },
  { pattern: /[td]$/, spoken_error: /[td]?$/, tip: '结尾爆破音：保持最终的气流停顿' },
  { pattern: /z/, spoken_error: /s/, tip: '"z" 要振动声带，不是 "s"（中国学生常发成 s）' },
  // 元音
  { pattern: /\b[aeiou]{2}/, spoken_error: /\b[aeiou]/, tip: '注意双元音：从第一个音素平滑滑向第二个' },
  { pattern: /ea|ee/, spoken_error: /i/, tip: '"ee/ea" 是长音 /iː/，嘴角向两侧拉，比中文"一"更拉' },
  { pattern: /\bcan't|cannot/, spoken_error: /\bcan/, tip: 'can\'t 重读，can 弱读；注意否定要明显' },
  { pattern: /tion|sion/, spoken_error: /tion|sion/, tip: '"-tion/-sion" 发 /ʃən/，不是 "ti-on"' },
];

function getPronunciationTips(target, spoken) {
  const t = target.toLowerCase();
  const s = spoken.toLowerCase();

  // 直接词汇替换错误检测（常见中式英语替换）
  const substitutions = [
    { target_word: 'think', spoken_error: 'sink', tip: '"think" 中 th 要舌尖伸出齿间，不是 s' },
    { target_word: 'three', spoken_error: 'free', tip: '"three" 中 th 要舌尖伸出齿间' },
    { target_word: 'very', spoken_error: 'berry', tip: '"very" 的 v 要上齿咬下唇' },
    { target_word: 'vine', spoken_error: 'wine', tip: '"vine" 中 v 需上齿咬下唇，不是圆唇' },
    { target_word: 'sheep', spoken_error: 'ship', tip: '"sheep" 是长音 /iː/，需拉长' },
    { target_word: 'ship', spoken_error: 'sheep', tip: '"ship" 是短音 /ɪ/，要短促放松' },
    { target_word: 'rice', spoken_error: 'lice', tip: '"rice" 的 r 舌尖上翘不触碰，不是 l' },
    { target_word: 'light', spoken_error: 'right', tip: '"light" 的 l 舌尖要顶上牙龈' },
    { target_word: 'world', spoken_error: 'word', tip: '"world" 结尾的 ld 要完整发出' },
  ];

  for (const sub of substitutions) {
    if (t.includes(sub.target_word) && s.includes(sub.spoken_error)) return sub.tip;
  }

  // 模式匹配错误
  for (const err of CHINESE_LEARNER_ERRORS) {
    if (err.pattern.test(t) && (!err.spoken_error || !err.spoken_error.test(s) || t !== s)) {
      return err.tip;
    }
  }

  // 重音位置提示（多音节词）
  const syllables = t.split(/[aeiouæɑɔɜ]/i).filter(Boolean).length;
  if (syllables >= 3 && t !== s) {
    return `注意单词重音位置，重读音节要更响、更长`;
  }

  return null;
}

function buildHighlights(target, spoken) {
  const highlights = [];
  const minLen = Math.min(target.length, spoken.length);
  for (let i = 0; i < minLen; i++) {
    if (target[i] !== spoken[i]) {
      highlights.push({ pos: i, expected: target[i], got: spoken[i] });
    }
  }
  return highlights;
}

// ===== 方案B：Azure Pronunciation Assessment =====

/**
 * @param {Blob} audioBlob — 录音 Blob（WAV/OGG）
 * @param {string} referenceText — 目标文本
 * @param {string} apiKey — Azure Subscription Key
 * @param {string} region — Azure Region（如 eastasia）
 * @returns {Promise<AzureResult>}
 */
export async function scoreByAzure(audioBlob, referenceText, apiKey, region) {
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;

  const assessmentJson = JSON.stringify({
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    EnableMiscue: true
  });

  const base64 = btoa(assessmentJson);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Pronunciation-Assessment': base64,
    },
    body: audioBlob
  });

  if (!response.ok) {
    throw new Error(`Azure API 错误：${response.status}`);
  }

  const data = await response.json();
  return parseAzureResult(data);
}

function parseAzureResult(data) {
  const pa = data.NBest?.[0]?.PronunciationAssessment;
  if (!pa) throw new Error('Azure 返回格式错误');

  const score    = Math.round(pa.AccuracyScore * 0.6 + pa.FluencyScore * 0.2 + pa.CompletenessScore * 0.2);
  const grade    = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  // 提取音素级别问题
  const phonemeIssues = [];
  for (const word of data.NBest?.[0]?.Words || []) {
    const wpa = word.PronunciationAssessment;
    if (wpa?.AccuracyScore < 80) {
      phonemeIssues.push({
        word:  word.Word,
        score: wpa.AccuracyScore,
        error: wpa.ErrorType
      });
    }
  }

  const feedback = phonemeIssues.length
    ? `注意这些单词：${phonemeIssues.map(p => p.word).join('、')}`
    : score >= 90 ? '发音很棒！' : '继续练习，加油！';

  return {
    score,
    grade,
    feedback,
    accuracy:     pa.AccuracyScore,
    fluency:      pa.FluencyScore,
    completeness: pa.CompletenessScore,
    phonemeIssues
  };
}

// ===== 录音功能（Web Audio API）=====

let _mediaRecorder = null;
let _audioChunks   = [];

export async function startRecording(onDataAvailable) {
  if (_mediaRecorder?.state === 'recording') return;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  _audioChunks = [];

  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
  _mediaRecorder = new MediaRecorder(stream, { mimeType });

  _mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) _audioChunks.push(e.data);
  };

  _mediaRecorder.start(100);
  return stream;
}

export function stopRecording() {
  return new Promise(resolve => {
    if (!_mediaRecorder || _mediaRecorder.state === 'inactive') {
      resolve(null); return;
    }
    _mediaRecorder.onstop = () => {
      const mimeType = _mediaRecorder.mimeType;
      const blob = new Blob(_audioChunks, { type: mimeType });
      // 停止所有音轨
      _mediaRecorder.stream?.getTracks().forEach(t => t.stop());
      _mediaRecorder = null;
      resolve(blob);
    };
    _mediaRecorder.stop();
  });
}

// ===== 统一评分入口 =====

/**
 * @param {string} target — 目标文本
 * @param {string} spoken — 识别文本（方案A）
 * @param {number} confidence — STT 置信度
 * @param {Object} azureConfig — { key, region }（方案B，可选）
 * @param {Blob}   audioBlob  — 录音 Blob（方案B 需要）
 */
export async function scorePronunciation(target, spoken, confidence, azureConfig, audioBlob) {
  if (azureConfig?.key && azureConfig?.region && audioBlob) {
    try {
      return await scoreByAzure(audioBlob, target, azureConfig.key, azureConfig.region);
    } catch (e) {
      console.warn('Azure 评分失败，降级到文本对比：', e.message);
    }
  }
  return scoreByText(target, spoken, confidence);
}
