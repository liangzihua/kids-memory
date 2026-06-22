/**
 * algorithm.js — 双轨记忆算法
 * Leitner（低龄/直观）+ SM-2（高龄/精准）
 */

import { addDays, todayStr } from './core.js';

// ===== Leitner 系统（3盒子）=====

const LEITNER_INTERVALS = [1, 3, 7]; // 盒子1/2/3 对应间隔天数

export const Leitner = {
  /**
   * 处理答题结果，更新卡片状态
   * @param {Object} card
   * @param {boolean} correct
   * @returns {Object} 更新后的卡片
   */
  review(card, correct) {
    const now = todayStr();
    card.lastReview  = now;
    card.reviewCount = (card.reviewCount || 0) + 1;

    if (correct) {
      card.correctCount = (card.correctCount || 0) + 1;
      card.streak       = (card.streak || 0) + 1;
      card.box          = Math.min((card.box || 1) + 1, 3);
    } else {
      card.streak = 0;
      card.box    = 1;
    }

    const interval    = LEITNER_INTERVALS[(card.box || 1) - 1];
    card.interval     = interval;
    card.nextReview   = addDays(now, interval);

    return card;
  },

  getBoxLabel(box) {
    return ['需要练习', '快记住了', '已掌握'][box - 1] || '需要练习';
  }
};

// ===== SM-2 算法 =====

export const SM2 = {
  /**
   * @param {Object} card
   * @param {number} quality — 0-5（0=完全忘记, 5=非常熟练）
   * @returns {Object} 更新后的卡片
   */
  review(card, quality) {
    const now = todayStr();
    card.lastReview  = now;
    card.reviewCount = (card.reviewCount || 0) + 1;

    if (quality >= 3) {
      card.correctCount = (card.correctCount || 0) + 1;
      card.streak       = (card.streak || 0) + 1;
    } else {
      card.streak      = 0;
      card.repetitions = 0;
      card.interval    = 1;
      card.nextReview  = addDays(now, 1);
      // ease factor 不变，但最小保护
      card.easeFactor  = Math.max(1.3, (card.easeFactor || 2.5));
      return card;
    }

    // 更新 ease factor
    card.easeFactor = Math.max(
      1.3,
      (card.easeFactor || 2.5) + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );

    // 计算新间隔
    card.repetitions = (card.repetitions || 0) + 1;
    if (card.repetitions === 1) {
      card.interval = 1;
    } else if (card.repetitions === 2) {
      card.interval = 6;
    } else {
      card.interval = Math.round((card.interval || 1) * card.easeFactor);
    }

    card.nextReview = addDays(now, card.interval);
    return card;
  },

  // 将 1-4 按钮评分映射到 SM-2 quality(0-5)
  ratingToQuality(rating) {
    // rating: 1=不会, 2=较难, 4=记得, 5=很熟
    const map = { 1: 0, 2: 2, 3: 3, 4: 4, 5: 5 };
    return map[rating] ?? 3;
  }
};

// ===== 统一接口 =====

/**
 * 根据档案设置选择算法处理答题
 * @param {Object} card
 * @param {number} rating — 1/2/4/5（评分按钮值）
 * @param {string} algorithm — 'leitner' | 'sm2' | 'auto'
 * @param {string} grade — 'primary1'...'middle3'
 * @returns {Object} 更新后的卡片
 */
export function reviewCard(card, rating, algorithm, grade) {
  const useAlgo = resolveAlgorithm(algorithm, grade);

  if (useAlgo === 'leitner') {
    const correct = rating >= 4;
    return Leitner.review(card, correct);
  } else {
    const quality = SM2.ratingToQuality(rating);
    return SM2.review(card, quality);
  }
}

export function resolveAlgorithm(algorithm, grade) {
  if (algorithm !== 'auto') return algorithm;
  const gradeNum = parseInt(grade?.replace(/[a-z]/gi, ''), 10) || 3;
  const isMiddle = grade?.startsWith('middle');
  return (isMiddle || gradeNum >= 5) ? 'sm2' : 'leitner';
}

/**
 * 生成今日学习队列：到期卡 + 新卡（不超过 newPerDay）
 */
export function buildStudyQueue(dueCards, newCards, newPerDay) {
  // 已复习过的到期卡优先，最近未复习的排前面
  const sorted = [...dueCards].sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  // 新卡补充到 newPerDay 上限
  const existing = sorted.filter(c => c.reviewCount > 0);
  const fresh     = newCards.slice(0, Math.max(0, newPerDay - sorted.filter(c => c.reviewCount === 0).length));

  // 混合排列：每 4 张旧卡插入 1 张新卡
  const queue = [];
  let ni = 0, ei = 0;
  const allNew = [...sorted.filter(c => c.reviewCount === 0), ...fresh];

  while (ei < existing.length || ni < allNew.length) {
    for (let i = 0; i < 4 && ei < existing.length; i++, ei++) queue.push(existing[ei]);
    if (ni < allNew.length) queue.push(allNew[ni++]);
  }
  return queue;
}

/**
 * 为选择题生成 3 个干扰项
 * 对诗句类型的卡片：优先从同类诗句卡片中取干扰项（难度更高）
 * 对其他类型：从相同 subject 的卡片中取
 */
export function generateDistractors(correct, allCards) {
  const pool = allCards.filter(c => c.id !== correct.id && c.back);

  let candidates;

  if (correct.type === 'poem' || correct.tags?.includes('古诗') || correct.tags?.includes('古诗文')) {
    // 古诗句：优先找同样是诗句格式的卡片（back 看起来像诗句：含逗号/句号且长度相近）
    const correctLen = correct.back.length;
    const poemPool = pool.filter(c =>
      (c.type === 'poem' || c.tags?.includes('古诗') || c.tags?.includes('古诗文')) &&
      c.back.length >= correctLen - 3 &&
      c.back.length <= correctLen + 3 &&
      // 确保干扰项与答案有实质区别（不是完全相同）
      c.back !== correct.back
    );

    // 如果诗句库不够，补充近似长度的其他诗句
    candidates = poemPool.length >= 3
      ? poemPool
      : [
          ...poemPool,
          ...pool.filter(c => c.subject === correct.subject && !poemPool.includes(c))
        ];
  } else if (correct.type === 'formula' || correct.tags?.includes('公式')) {
    // 公式：从同类别公式中取（避免选到完全不相关的内容）
    const formulaPool = pool.filter(c =>
      (c.type === 'formula' || c.tags?.includes('公式')) &&
      // 相同标签类别
      c.tags?.some(t => correct.tags?.includes(t))
    );
    candidates = formulaPool.length >= 3 ? formulaPool : pool;
  } else {
    // 普通词汇/概念：优先同科目同年级
    const sameSubject = pool.filter(c => c.subject === correct.subject);
    candidates = sameSubject.length >= 3 ? sameSubject : pool;
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 3);

  // 如果不够3个，从全部卡片补充
  while (shuffled.length < 3) {
    const extra = pool.find(c => !shuffled.includes(c) && c.id !== correct.id);
    if (!extra) break;
    shuffled.push(extra);
  }

  const options = [...shuffled.map(c => c.back), correct.back];
  return options.sort(() => Math.random() - 0.5);
}
