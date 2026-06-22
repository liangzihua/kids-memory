/**
 * core.js — IndexedDB 封装 + 多档案管理
 * 所有数据操作通过此模块进行
 */

const DB_NAME = 'KidsMemoryDB';
const DB_VERSION = 1;

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // 档案表
      if (!db.objectStoreNames.contains('profiles')) {
        const ps = db.createObjectStore('profiles', { keyPath: 'id' });
        ps.createIndex('name', 'name', { unique: false });
      }

      // 卡片表
      if (!db.objectStoreNames.contains('cards')) {
        const cs = db.createObjectStore('cards', { keyPath: 'id' });
        cs.createIndex('profileId', 'profileId');
        cs.createIndex('deckId', 'deckId');
        cs.createIndex('nextReview', 'nextReview');
        cs.createIndex('profileDeck', ['profileId', 'deckId']);
      }

      // 牌组表
      if (!db.objectStoreNames.contains('decks')) {
        const ds = db.createObjectStore('decks', { keyPath: 'id' });
        ds.createIndex('profileId', 'profileId');
      }

      // 学习记录表
      if (!db.objectStoreNames.contains('progress')) {
        const prs = db.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
        prs.createIndex('profileDate', ['profileId', 'date']);
        prs.createIndex('profileId', 'profileId');
      }
    };

    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror  = e => reject(e.target.error);
  });
}

function txn(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s  = Array.isArray(store) ? store.map(n => tx.objectStore(n)) : tx.objectStore(store);
    let result;
    try { result = fn(s, tx); } catch (err) { reject(err); return; }
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result);
      result.onerror   = () => reject(result.error);
    } else if (result instanceof Promise) {
      result.then(resolve).catch(reject);
    } else {
      tx.oncomplete = () => resolve(result);
      tx.onerror    = () => reject(tx.error);
    }
  }));
}

function getAll(storeName, indexName, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = indexName ? store.index(indexName).getAll(key) : store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

function put(storeName, item) {
  return txn(storeName, 'readwrite', s => s.put(item));
}

function del(storeName, key) {
  return txn(storeName, 'readwrite', s => s.delete(key));
}

function getOne(storeName, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

// ===== 档案管理 =====

export const ProfileManager = {
  async getAll() {
    return getAll('profiles');
  },

  async get(id) {
    return getOne('profiles', id);
  },

  async create(name, avatar, ageGroup = 'primary') {
    const profile = {
      id: crypto.randomUUID(),
      name,
      avatar,
      ageGroup,
      grade: ageGroup === 'middle' ? 'middle1' : 'primary3',
      algorithm: 'auto',
      newPerDay: 10,
      speechRate: 0.8,
      azureKey: '',
      azureRegion: '',
      coins: 0,
      streak: 0,
      lastStudyDate: '',
      createdAt: new Date().toISOString()
    };
    await put('profiles', profile);
    return profile;
  },

  async update(id, changes) {
    const profile = await getOne('profiles', id);
    if (!profile) throw new Error('Profile not found');
    Object.assign(profile, changes);
    await put('profiles', profile);
    return profile;
  },

  async delete(id) {
    // 删除档案时级联删除所有卡片和牌组
    const cards = await getAll('cards', 'profileId', id);
    const decks  = await getAll('decks', 'profileId', id);
    const progs  = await getAll('progress', 'profileId', id);
    await Promise.all([
      ...cards.map(c => del('cards', c.id)),
      ...decks.map(d => del('decks', d.id)),
      ...progs.map(p => del('progress', p.id))
    ]);
    return del('profiles', id);
  }
};

// ===== 牌组管理 =====

export const DeckManager = {
  async getByProfile(profileId) {
    return getAll('decks', 'profileId', profileId);
  },

  async create(profileId, name, subject, grade, isBuiltin = false) {
    const deck = {
      id: crypto.randomUUID(),
      profileId,
      name,
      subject,   // chinese | english | math | custom
      grade,     // primary | middle
      isBuiltin,
      totalCards: 0,
      createdAt: new Date().toISOString()
    };
    await put('decks', deck);
    return deck;
  },

  async delete(deckId, profileId) {
    const cards = await getAll('cards', 'deckId', deckId);
    await Promise.all(cards.map(c => del('cards', c.id)));
    return del('decks', deckId);
  },

  async update(deck) {
    return put('decks', deck);
  }
};

// ===== 卡片管理 =====

export const CardManager = {
  async getByDeck(deckId) {
    return getAll('cards', 'deckId', deckId);
  },

  async getByProfile(profileId) {
    return getAll('cards', 'profileId', profileId);
  },

  async getDueCards(profileId, today = todayStr()) {
    const all = await getAll('cards', 'profileId', profileId);
    return all.filter(c => c.nextReview <= today);
  },

  async getNewCards(profileId, limit = 10) {
    const all = await getAll('cards', 'profileId', profileId);
    return all.filter(c => c.reviewCount === 0).slice(0, limit);
  },

  async create(profileId, deckId, data) {
    const card = {
      id: crypto.randomUUID(),
      profileId,
      deckId,
      type: data.type || 'word',
      front: data.front,
      back: data.back,
      hint: data.hint || '',
      example: data.example || '',
      phonetic: data.phonetic || '',
      tags: data.tags || [],
      subject: data.subject || 'custom',
      // Leitner 状态
      box: 1,
      // SM-2 状态
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      // 公用
      nextReview: todayStr(),
      lastReview: null,
      reviewCount: 0,
      correctCount: 0,
      streak: 0,
      createdAt: new Date().toISOString()
    };
    await put('cards', card);
    return card;
  },

  async update(card) {
    return put('cards', card);
  },

  async bulkCreate(profileId, deckId, items) {
    const cards = items.map(data => ({
      id: crypto.randomUUID(),
      profileId,
      deckId,
      type: data.type || 'word',
      front: data.front,
      back: data.back,
      hint: data.hint || '',
      example: data.example || '',
      phonetic: data.phonetic || '',
      tags: data.tags || [],
      subject: data.subject || 'custom',
      box: 1,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: todayStr(),
      lastReview: null,
      reviewCount: 0,
      correctCount: 0,
      streak: 0,
      createdAt: new Date().toISOString()
    }));
    await openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('cards', 'readwrite');
      const store = tx.objectStore('cards');
      cards.forEach(c => store.put(c));
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    }));
    return cards;
  },

  async delete(cardId) {
    return del('cards', cardId);
  }
};

// ===== 进度记录 =====

export const ProgressManager = {
  async record(profileId, reviewed, correct) {
    const today = todayStr();
    const existing = await this.getByDate(profileId, today);
    if (existing) {
      existing.reviewed += reviewed;
      existing.correct  += correct;
      return put('progress', existing);
    }
    return put('progress', {
      profileId,
      date: today,
      reviewed,
      correct
    });
  },

  async getByDate(profileId, date) {
    const all = await getAll('progress', 'profileDate', [profileId, date]);
    return all[0] || null;
  },

  async getLast7Days(profileId) {
    const results = [];
    const allProgress = await getAll('progress', 'profileId', profileId);
    for (let i = 6; i >= 0; i--) {
      const d = dayOffset(-i);
      const entry = allProgress.find(p => p.date === d);
      results.push({ date: d, reviewed: entry?.reviewed || 0, correct: entry?.correct || 0 });
    }
    return results;
  },

  async updateStreak(profile) {
    const today    = todayStr();
    const yesterday = dayOffset(-1);
    let newStreak = profile.streak || 0;

    if (profile.lastStudyDate === today) {
      // already counted today
    } else if (profile.lastStudyDate === yesterday) {
      newStreak += 1;
    } else if (profile.lastStudyDate !== today) {
      newStreak = 1;
    }

    await ProfileManager.update(profile.id, { streak: newStreak, lastStudyDate: today });
    return newStreak;
  }
};

// ===== 数据导出/导入 =====

export async function exportData(profileId) {
  const [profile, cards, decks, progress] = await Promise.all([
    ProfileManager.get(profileId),
    CardManager.getByProfile(profileId),
    DeckManager.getByProfile(profileId),
    getAll('progress', 'profileId', profileId)
  ]);
  return { exportedAt: new Date().toISOString(), profile, cards, decks, progress };
}

export async function importData(data) {
  const { profile, cards, decks, progress } = data;
  await put('profiles', profile);
  await Promise.all([
    ...decks.map(d => put('decks', d)),
    ...cards.map(c => put('cards', c)),
    ...progress.map(p => put('progress', p))
  ]);
}

// ===== 工具函数 =====

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function dayOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
