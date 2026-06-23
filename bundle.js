(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // app/core.js
  var core_exports = {};
  __export(core_exports, {
    CardManager: () => CardManager,
    DeckManager: () => DeckManager,
    ProfileManager: () => ProfileManager,
    ProgressManager: () => ProgressManager,
    addDays: () => addDays,
    dayOffset: () => dayOffset,
    exportData: () => exportData,
    importData: () => importData,
    todayStr: () => todayStr
  });
  async function openDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("profiles")) {
          const ps = db.createObjectStore("profiles", { keyPath: "id" });
          ps.createIndex("name", "name", { unique: false });
        }
        if (!db.objectStoreNames.contains("cards")) {
          const cs = db.createObjectStore("cards", { keyPath: "id" });
          cs.createIndex("profileId", "profileId");
          cs.createIndex("deckId", "deckId");
          cs.createIndex("nextReview", "nextReview");
          cs.createIndex("profileDeck", ["profileId", "deckId"]);
        }
        if (!db.objectStoreNames.contains("decks")) {
          const ds = db.createObjectStore("decks", { keyPath: "id" });
          ds.createIndex("profileId", "profileId");
        }
        if (!db.objectStoreNames.contains("progress")) {
          const prs = db.createObjectStore("progress", { keyPath: "id", autoIncrement: true });
          prs.createIndex("profileDate", ["profileId", "date"]);
          prs.createIndex("profileId", "profileId");
        }
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  function txn(store, mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const s = Array.isArray(store) ? store.map((n) => tx.objectStore(n)) : tx.objectStore(store);
      let result;
      try {
        result = fn(s, tx);
      } catch (err) {
        reject(err);
        return;
      }
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else if (result instanceof Promise) {
        result.then(resolve).catch(reject);
      } else {
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      }
    }));
  }
  function getAll(storeName, indexName, key) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = indexName ? store.index(indexName).getAll(key) : store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }
  function put(storeName, item) {
    return txn(storeName, "readwrite", (s) => s.put(item));
  }
  function del(storeName, key) {
    return txn(storeName, "readwrite", (s) => s.delete(key));
  }
  function getOne(storeName, key) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }
  async function exportData(profileId) {
    const [profile, cards, decks, progress] = await Promise.all([
      ProfileManager.get(profileId),
      CardManager.getByProfile(profileId),
      DeckManager.getByProfile(profileId),
      getAll("progress", "profileId", profileId)
    ]);
    return { exportedAt: (/* @__PURE__ */ new Date()).toISOString(), profile, cards, decks, progress };
  }
  async function importData(data) {
    const { profile, cards, decks, progress } = data;
    await put("profiles", profile);
    await Promise.all([
      ...decks.map((d) => put("decks", d)),
      ...cards.map((c) => put("cards", c)),
      ...progress.map((p) => put("progress", p))
    ]);
  }
  function todayStr() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dayOffset(n) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  var DB_NAME, DB_VERSION, _db, ProfileManager, DeckManager, CardManager, ProgressManager;
  var init_core = __esm({
    "app/core.js"() {
      DB_NAME = "KidsMemoryDB";
      DB_VERSION = 1;
      _db = null;
      ProfileManager = {
        async getAll() {
          return getAll("profiles");
        },
        async get(id) {
          return getOne("profiles", id);
        },
        async create(name, avatar, ageGroup = "primary") {
          const profile = {
            id: crypto.randomUUID(),
            name,
            avatar,
            ageGroup,
            grade: ageGroup === "middle" ? "middle1" : "primary3",
            algorithm: "auto",
            newPerDay: 10,
            speechRate: 0.8,
            azureKey: "",
            azureRegion: "",
            coins: 0,
            streak: 0,
            lastStudyDate: "",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          await put("profiles", profile);
          return profile;
        },
        async update(id, changes) {
          const profile = await getOne("profiles", id);
          if (!profile) throw new Error("Profile not found");
          Object.assign(profile, changes);
          await put("profiles", profile);
          return profile;
        },
        async delete(id) {
          const cards = await getAll("cards", "profileId", id);
          const decks = await getAll("decks", "profileId", id);
          const progs = await getAll("progress", "profileId", id);
          await Promise.all([
            ...cards.map((c) => del("cards", c.id)),
            ...decks.map((d) => del("decks", d.id)),
            ...progs.map((p) => del("progress", p.id))
          ]);
          return del("profiles", id);
        }
      };
      DeckManager = {
        async getByProfile(profileId) {
          return getAll("decks", "profileId", profileId);
        },
        async create(profileId, name, subject, grade, isBuiltin = false) {
          const deck = {
            id: crypto.randomUUID(),
            profileId,
            name,
            subject,
            // chinese | english | math | custom
            grade,
            // primary | middle
            isBuiltin,
            totalCards: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          await put("decks", deck);
          return deck;
        },
        async delete(deckId, profileId) {
          const cards = await getAll("cards", "deckId", deckId);
          await Promise.all(cards.map((c) => del("cards", c.id)));
          return del("decks", deckId);
        },
        async update(deck) {
          return put("decks", deck);
        }
      };
      CardManager = {
        async getByDeck(deckId) {
          return getAll("cards", "deckId", deckId);
        },
        async getByProfile(profileId) {
          return getAll("cards", "profileId", profileId);
        },
        async getDueCards(profileId, today = todayStr()) {
          const all = await getAll("cards", "profileId", profileId);
          return all.filter((c) => c.nextReview <= today);
        },
        async getNewCards(profileId, limit = 10) {
          const all = await getAll("cards", "profileId", profileId);
          return all.filter((c) => c.reviewCount === 0).slice(0, limit);
        },
        async create(profileId, deckId, data) {
          const card = {
            id: crypto.randomUUID(),
            profileId,
            deckId,
            type: data.type || "word",
            front: data.front,
            back: data.back,
            hint: data.hint || "",
            example: data.example || "",
            phonetic: data.phonetic || "",
            tags: data.tags || [],
            subject: data.subject || "custom",
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
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          await put("cards", card);
          return card;
        },
        async update(card) {
          return put("cards", card);
        },
        async bulkCreate(profileId, deckId, items) {
          const cards = items.map((data) => ({
            id: crypto.randomUUID(),
            profileId,
            deckId,
            type: data.type || "word",
            front: data.front,
            back: data.back,
            hint: data.hint || "",
            example: data.example || "",
            phonetic: data.phonetic || "",
            tags: data.tags || [],
            subject: data.subject || "custom",
            box: 1,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: todayStr(),
            lastReview: null,
            reviewCount: 0,
            correctCount: 0,
            streak: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }));
          await openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction("cards", "readwrite");
            const store = tx.objectStore("cards");
            cards.forEach((c) => store.put(c));
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          }));
          return cards;
        },
        async delete(cardId) {
          return del("cards", cardId);
        }
      };
      ProgressManager = {
        async record(profileId, reviewed, correct) {
          const today = todayStr();
          const existing = await this.getByDate(profileId, today);
          if (existing) {
            existing.reviewed += reviewed;
            existing.correct += correct;
            return put("progress", existing);
          }
          return put("progress", {
            profileId,
            date: today,
            reviewed,
            correct
          });
        },
        async getByDate(profileId, date) {
          const all = await getAll("progress", "profileDate", [profileId, date]);
          return all[0] || null;
        },
        async getLast7Days(profileId) {
          const results = [];
          const allProgress = await getAll("progress", "profileId", profileId);
          for (let i = 6; i >= 0; i--) {
            const d = dayOffset(-i);
            const entry = allProgress.find((p) => p.date === d);
            results.push({ date: d, reviewed: entry?.reviewed || 0, correct: entry?.correct || 0 });
          }
          return results;
        },
        async updateStreak(profile) {
          const today = todayStr();
          const yesterday = dayOffset(-1);
          let newStreak = profile.streak || 0;
          if (profile.lastStudyDate === today) {
          } else if (profile.lastStudyDate === yesterday) {
            newStreak += 1;
          } else if (profile.lastStudyDate !== today) {
            newStreak = 1;
          }
          await ProfileManager.update(profile.id, { streak: newStreak, lastStudyDate: today });
          return newStreak;
        }
      };
    }
  });

  // app/algorithm.js
  function reviewCard(card, rating, algorithm, grade) {
    const useAlgo = resolveAlgorithm(algorithm, grade);
    if (useAlgo === "leitner") {
      const correct = rating >= 4;
      return Leitner.review(card, correct);
    } else {
      const quality = SM2.ratingToQuality(rating);
      return SM2.review(card, quality);
    }
  }
  function resolveAlgorithm(algorithm, grade) {
    if (algorithm !== "auto") return algorithm;
    const gradeNum = parseInt(grade?.replace(/[a-z]/gi, ""), 10) || 3;
    const isMiddle = grade?.startsWith("middle");
    return isMiddle || gradeNum >= 5 ? "sm2" : "leitner";
  }
  function buildStudyQueue(dueCards, newCards, newPerDay) {
    const sorted = [...dueCards].sort((a, b) => a.nextReview.localeCompare(b.nextReview));
    const existing = sorted.filter((c) => c.reviewCount > 0);
    const fresh = newCards.slice(0, Math.max(0, newPerDay - sorted.filter((c) => c.reviewCount === 0).length));
    const queue = [];
    let ni = 0, ei = 0;
    const allNew = [...sorted.filter((c) => c.reviewCount === 0), ...fresh];
    while (ei < existing.length || ni < allNew.length) {
      for (let i = 0; i < 4 && ei < existing.length; i++, ei++) queue.push(existing[ei]);
      if (ni < allNew.length) queue.push(allNew[ni++]);
    }
    return queue;
  }
  function generateDistractors(correct, allCards) {
    const pool = allCards.filter((c) => c.id !== correct.id && c.back);
    let candidates;
    if (correct.type === "poem" || correct.tags?.includes("\u53E4\u8BD7") || correct.tags?.includes("\u53E4\u8BD7\u6587")) {
      const correctLen = correct.back.length;
      const poemPool = pool.filter(
        (c) => (c.type === "poem" || c.tags?.includes("\u53E4\u8BD7") || c.tags?.includes("\u53E4\u8BD7\u6587")) && c.back.length >= correctLen - 3 && c.back.length <= correctLen + 3 && // 确保干扰项与答案有实质区别（不是完全相同）
        c.back !== correct.back
      );
      candidates = poemPool.length >= 3 ? poemPool : [
        ...poemPool,
        ...pool.filter((c) => c.subject === correct.subject && !poemPool.includes(c))
      ];
    } else if (correct.type === "formula" || correct.tags?.includes("\u516C\u5F0F")) {
      const formulaPool = pool.filter(
        (c) => (c.type === "formula" || c.tags?.includes("\u516C\u5F0F")) && // 相同标签类别
        c.tags?.some((t) => correct.tags?.includes(t))
      );
      candidates = formulaPool.length >= 3 ? formulaPool : pool;
    } else {
      const sameSubject = pool.filter((c) => c.subject === correct.subject);
      candidates = sameSubject.length >= 3 ? sameSubject : pool;
    }
    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 3);
    while (shuffled.length < 3) {
      const extra = pool.find((c) => !shuffled.includes(c) && c.id !== correct.id);
      if (!extra) break;
      shuffled.push(extra);
    }
    const options = [...shuffled.map((c) => c.back), correct.back];
    return options.sort(() => Math.random() - 0.5);
  }
  var LEITNER_INTERVALS, Leitner, SM2;
  var init_algorithm = __esm({
    "app/algorithm.js"() {
      init_core();
      LEITNER_INTERVALS = [1, 3, 7];
      Leitner = {
        /**
         * 处理答题结果，更新卡片状态
         * @param {Object} card
         * @param {boolean} correct
         * @returns {Object} 更新后的卡片
         */
        review(card, correct) {
          const now = todayStr();
          card.lastReview = now;
          card.reviewCount = (card.reviewCount || 0) + 1;
          if (correct) {
            card.correctCount = (card.correctCount || 0) + 1;
            card.streak = (card.streak || 0) + 1;
            card.box = Math.min((card.box || 1) + 1, 3);
          } else {
            card.streak = 0;
            card.box = 1;
          }
          const interval = LEITNER_INTERVALS[(card.box || 1) - 1];
          card.interval = interval;
          card.nextReview = addDays(now, interval);
          return card;
        },
        getBoxLabel(box) {
          return ["\u9700\u8981\u7EC3\u4E60", "\u5FEB\u8BB0\u4F4F\u4E86", "\u5DF2\u638C\u63E1"][box - 1] || "\u9700\u8981\u7EC3\u4E60";
        }
      };
      SM2 = {
        /**
         * @param {Object} card
         * @param {number} quality — 0-5（0=完全忘记, 5=非常熟练）
         * @returns {Object} 更新后的卡片
         */
        review(card, quality) {
          const now = todayStr();
          card.lastReview = now;
          card.reviewCount = (card.reviewCount || 0) + 1;
          if (quality >= 3) {
            card.correctCount = (card.correctCount || 0) + 1;
            card.streak = (card.streak || 0) + 1;
          } else {
            card.streak = 0;
            card.repetitions = 0;
            card.interval = 1;
            card.nextReview = addDays(now, 1);
            card.easeFactor = Math.max(1.3, card.easeFactor || 2.5);
            return card;
          }
          card.easeFactor = Math.max(
            1.3,
            (card.easeFactor || 2.5) + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
          );
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
          const map = { 1: 0, 2: 2, 3: 3, 4: 4, 5: 5 };
          return map[rating] ?? 3;
        }
      };
    }
  });

  // app/speech.js
  var speech_exports = {};
  __export(speech_exports, {
    SpeechSupport: () => SpeechSupport,
    getAvailableVoices: () => getAvailableVoices,
    levenshtein: () => levenshtein,
    setSavedVoiceName: () => setSavedVoiceName,
    speak: () => speak2,
    speakCard: () => speakCard,
    speakChinese: () => speakChinese,
    speakEnglish: () => speakEnglish,
    startListening: () => startListening,
    startVoiceProfileSwitch: () => startVoiceProfileSwitch,
    stopListening: () => stopListening,
    stopSpeaking: () => stopSpeaking
  });
  function loadVoices() {
    return new Promise((resolve) => {
      if (!SpeechSupport.tts) {
        resolve([]);
        return;
      }
      const update = () => {
        _voices = speechSynthesis.getVoices();
        if (_voices.length) {
          _voicesLoaded = true;
          resolve(_voices);
        }
      };
      update();
      speechSynthesis.onvoiceschanged = update;
      setTimeout(() => resolve(_voices), 1e3);
    });
  }
  function getSavedVoiceName(lang) {
    return localStorage.getItem(`voice_${lang}`) || "";
  }
  function setSavedVoiceName(lang, name) {
    localStorage.setItem(`voice_${lang}`, name);
  }
  function pickVoice(lang) {
    if (!_voicesLoaded || !_voices.length) return null;
    const savedName = getSavedVoiceName(lang);
    if (savedName) {
      const saved = _voices.find((v) => v.name === savedName);
      if (saved) return saved;
    }
    const prefix = lang.split("-")[0];
    const matching = _voices.filter(
      (v) => v.lang === lang || v.lang.startsWith(prefix)
    );
    if (!matching.length) return null;
    const priority = (v) => {
      const n = v.name.toLowerCase();
      if (n.includes("google")) return 0;
      if (n.includes("microsoft")) return 1;
      if (n.includes("samantha") || n.includes("daniel") || n.includes("karen")) return 2;
      if (!v.localService) return 3;
      return 4;
    };
    return matching.sort((a, b) => priority(a) - priority(b))[0];
  }
  function getAvailableVoices(lang) {
    if (!_voicesLoaded) return [];
    const prefix = lang.split("-")[0];
    return _voices.filter((v) => v.lang === lang || v.lang.startsWith(prefix));
  }
  function speak2(text, lang = "en-US", rate = 0.8, onEnd, pitch = 1) {
    if (!SpeechSupport.tts) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
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
  function speakChinese(text, rate = 0.9) {
    speak2(text, "zh-CN", rate, void 0, 1.05);
  }
  function speakEnglish(text, rate = 0.78) {
    speak2(text, "en-US", rate);
  }
  function stopSpeaking() {
    if (SpeechSupport.tts) speechSynthesis.cancel();
  }
  function speakCard(card, side = "front", rate = 0.8) {
    const text = side === "front" ? card.front : card.back;
    if (!text) return;
    const hasChinese = /[一-鿿]/.test(text);
    speak2(text, hasChinese ? "zh-CN" : "en-US", rate);
  }
  function startListening(lang = "en-US", onResult, onError, onEnd) {
    if (!SpeechSupport.stt) {
      onError?.("\u6B64\u8BBE\u5907/\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Android Chrome \u6216\u684C\u9762 Chrome\u3002");
      return () => {
      };
    }
    stopListening();
    const rec = new SpeechRecognitionClass();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    rec.onresult = (e) => {
      const result = e.results[0];
      if (result) {
        onResult?.(result[0].transcript.trim(), result[0].confidence);
      }
    };
    rec.onerror = (e) => {
      const msg = {
        "no-speech": "\u6CA1\u6709\u68C0\u6D4B\u5230\u58F0\u97F3\uFF0C\u8BF7\u518D\u8BD5\u4E00\u6B21",
        "audio-capture": "\u65E0\u6CD5\u8BBF\u95EE\u9EA6\u514B\u98CE\uFF0C\u8BF7\u68C0\u67E5\u6743\u9650",
        "not-allowed": "\u9EA6\u514B\u98CE\u6743\u9650\u88AB\u62D2\u7EDD",
        "network": "\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BED\u97F3\u8BC6\u522B\u9700\u8981\u7F51\u7EDC\u8FDE\u63A5"
      }[e.error] || `\u8BC6\u522B\u51FA\u9519\uFF1A${e.error}`;
      onError?.(msg);
    };
    rec.onend = onEnd;
    rec.start();
    _activeRecognition = rec;
    return () => rec.stop();
  }
  function stopListening() {
    if (_activeRecognition) {
      try {
        _activeRecognition.stop();
      } catch (_) {
      }
      _activeRecognition = null;
    }
  }
  function startVoiceProfileSwitch(profileNames, onMatch, onError, onEnd) {
    return startListening(
      "zh-CN",
      (text) => {
        const found = profileNames.find(
          (name) => text.includes(name) || name.includes(text) || levenshtein(text, name) <= 1
        );
        if (found) onMatch?.(found);
        else {
          onError?.(`\u6CA1\u6709\u627E\u5230\u53EB"${text}"\u7684\u6863\u6848`);
          onEnd?.();
        }
      },
      onError,
      onEnd
    );
  }
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }
  var SpeechSupport, _voices, _voicesLoaded, _currentUtterance, SpeechRecognitionClass, _activeRecognition;
  var init_speech = __esm({
    "app/speech.js"() {
      SpeechSupport = {
        tts: typeof window !== "undefined" && "speechSynthesis" in window,
        stt: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
      };
      _voices = [];
      _voicesLoaded = false;
      _currentUtterance = null;
      SpeechRecognitionClass = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
      _activeRecognition = null;
      if (SpeechSupport.tts) loadVoices();
    }
  });

  // app/pronunciation.js
  function scoreByText(target, spoken, confidence = 1) {
    const t = target.toLowerCase().trim();
    const s = spoken.toLowerCase().trim();
    if (!s) return { score: 0, grade: "F", feedback: "\u6CA1\u6709\u542C\u5230\u58F0\u97F3\uFF0C\u8BF7\u518D\u8BD5\u4E00\u6B21", highlights: [] };
    if (t === s) {
      return { score: 100, grade: "A", feedback: "\u53D1\u97F3\u5B8C\u7F8E\uFF01", highlights: [] };
    }
    const dist = levenshtein(t, s);
    const maxLen = Math.max(t.length, s.length);
    const simRatio = 1 - dist / maxLen;
    const rawScore = simRatio * 0.8 + confidence * 0.2;
    const score = Math.round(rawScore * 100);
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";
    const feedback = buildFeedback(t, s, score);
    const highlights = buildHighlights(t, s);
    return { score, grade, feedback, highlights, recognized: spoken };
  }
  function buildFeedback(target, spoken, score) {
    if (score >= 90) return "\u53D1\u97F3\u975E\u5E38\u597D\uFF01\u7EE7\u7EED\u4FDD\u6301 \u{1F44D}";
    if (score >= 75) {
      const tips2 = getPronunciationTips(target, spoken);
      return tips2 ? `\u63A5\u8FD1\u4E86\uFF01${tips2}` : `\u542C\u8D77\u6765\u50CF "${spoken}"\uFF0C\u5F88\u63A5\u8FD1\uFF01`;
    }
    if (score >= 60) {
      const tips2 = getPronunciationTips(target, spoken);
      return tips2 || `\u6CE8\u610F\u53D1\u97F3\uFF0C\u76EE\u6807\u662F "${target}"\uFF0C\u518D\u542C\u4E00\u904D\u6807\u51C6\u97F3\u540E\u91CD\u8BD5`;
    }
    const tips = getPronunciationTips(target, spoken);
    return tips || `\u8BF7\u4ED4\u7EC6\u542C\u6807\u51C6\u53D1\u97F3\u540E\u91CD\u8BD5\uFF0C\u6CE8\u610F\u5634\u578B\u548C\u820C\u4F4D`;
  }
  function getPronunciationTips(target, spoken) {
    const t = target.toLowerCase();
    const s = spoken.toLowerCase();
    const substitutions = [
      { target_word: "think", spoken_error: "sink", tip: '"think" \u4E2D th \u8981\u820C\u5C16\u4F38\u51FA\u9F7F\u95F4\uFF0C\u4E0D\u662F s' },
      { target_word: "three", spoken_error: "free", tip: '"three" \u4E2D th \u8981\u820C\u5C16\u4F38\u51FA\u9F7F\u95F4' },
      { target_word: "very", spoken_error: "berry", tip: '"very" \u7684 v \u8981\u4E0A\u9F7F\u54AC\u4E0B\u5507' },
      { target_word: "vine", spoken_error: "wine", tip: '"vine" \u4E2D v \u9700\u4E0A\u9F7F\u54AC\u4E0B\u5507\uFF0C\u4E0D\u662F\u5706\u5507' },
      { target_word: "sheep", spoken_error: "ship", tip: '"sheep" \u662F\u957F\u97F3 /i\u02D0/\uFF0C\u9700\u62C9\u957F' },
      { target_word: "ship", spoken_error: "sheep", tip: '"ship" \u662F\u77ED\u97F3 /\u026A/\uFF0C\u8981\u77ED\u4FC3\u653E\u677E' },
      { target_word: "rice", spoken_error: "lice", tip: '"rice" \u7684 r \u820C\u5C16\u4E0A\u7FD8\u4E0D\u89E6\u78B0\uFF0C\u4E0D\u662F l' },
      { target_word: "light", spoken_error: "right", tip: '"light" \u7684 l \u820C\u5C16\u8981\u9876\u4E0A\u7259\u9F88' },
      { target_word: "world", spoken_error: "word", tip: '"world" \u7ED3\u5C3E\u7684 ld \u8981\u5B8C\u6574\u53D1\u51FA' }
    ];
    for (const sub of substitutions) {
      if (t.includes(sub.target_word) && s.includes(sub.spoken_error)) return sub.tip;
    }
    for (const err of CHINESE_LEARNER_ERRORS) {
      if (err.pattern.test(t) && (!err.spoken_error || !err.spoken_error.test(s) || t !== s)) {
        return err.tip;
      }
    }
    const syllables = t.split(/[aeiouæɑɔɜ]/i).filter(Boolean).length;
    if (syllables >= 3 && t !== s) {
      return `\u6CE8\u610F\u5355\u8BCD\u91CD\u97F3\u4F4D\u7F6E\uFF0C\u91CD\u8BFB\u97F3\u8282\u8981\u66F4\u54CD\u3001\u66F4\u957F`;
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
  async function scoreByAzure(audioBlob, referenceText, apiKey, region) {
    const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;
    const assessmentJson = JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      EnableMiscue: true
    });
    const base64 = btoa(assessmentJson);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": base64
      },
      body: audioBlob
    });
    if (!response.ok) {
      throw new Error(`Azure API \u9519\u8BEF\uFF1A${response.status}`);
    }
    const data = await response.json();
    return parseAzureResult(data);
  }
  function parseAzureResult(data) {
    const pa = data.NBest?.[0]?.PronunciationAssessment;
    if (!pa) throw new Error("Azure \u8FD4\u56DE\u683C\u5F0F\u9519\u8BEF");
    const score = Math.round(pa.AccuracyScore * 0.6 + pa.FluencyScore * 0.2 + pa.CompletenessScore * 0.2);
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";
    const phonemeIssues = [];
    for (const word of data.NBest?.[0]?.Words || []) {
      const wpa = word.PronunciationAssessment;
      if (wpa?.AccuracyScore < 80) {
        phonemeIssues.push({
          word: word.Word,
          score: wpa.AccuracyScore,
          error: wpa.ErrorType
        });
      }
    }
    const feedback = phonemeIssues.length ? `\u6CE8\u610F\u8FD9\u4E9B\u5355\u8BCD\uFF1A${phonemeIssues.map((p) => p.word).join("\u3001")}` : score >= 90 ? "\u53D1\u97F3\u5F88\u68D2\uFF01" : "\u7EE7\u7EED\u7EC3\u4E60\uFF0C\u52A0\u6CB9\uFF01";
    return {
      score,
      grade,
      feedback,
      accuracy: pa.AccuracyScore,
      fluency: pa.FluencyScore,
      completeness: pa.CompletenessScore,
      phonemeIssues
    };
  }
  async function scorePronunciation(target, spoken, confidence, azureConfig, audioBlob) {
    if (azureConfig?.key && azureConfig?.region && audioBlob) {
      try {
        return await scoreByAzure(audioBlob, target, azureConfig.key, azureConfig.region);
      } catch (e) {
        console.warn("Azure \u8BC4\u5206\u5931\u8D25\uFF0C\u964D\u7EA7\u5230\u6587\u672C\u5BF9\u6BD4\uFF1A", e.message);
      }
    }
    return scoreByText(target, spoken, confidence);
  }
  var CHINESE_LEARNER_ERRORS;
  var init_pronunciation = __esm({
    "app/pronunciation.js"() {
      init_speech();
      CHINESE_LEARNER_ERRORS = [
        // 辅音对
        { pattern: /\bth/, spoken_error: /[sd]/, tip: '"th" \u53D1\u97F3\uFF1A\u820C\u5C16\u8F7B\u4F38\u51FA\u9F7F\u95F4\uFF0C\u4E0D\u8981\u53D1\u6210 s \u6216 d' },
        { pattern: /\br/, spoken_error: /[lyw]/, tip: '"r" \u53D1\u97F3\uFF1A\u820C\u5C16\u4E0A\u7FD8\u60AC\u7A7A\uFF0C\u4E0D\u8981\u53D1\u6210 l \u6216 y' },
        { pattern: /\bl/, spoken_error: /[rn]/, tip: '"l" \u53D1\u97F3\uFF1A\u820C\u5C16\u62B5\u4E0A\u7259\u9F88\uFF0C\u4E0D\u8981\u53D1\u6210 r \u6216 n' },
        { pattern: /\bv/, spoken_error: /[wb]/, tip: '"v" \u53D1\u97F3\uFF1A\u4E0A\u9F7F\u54AC\u4E0B\u5507\uFF0C\u632F\u52A8\u58F0\u5E26\uFF0C\u4E0D\u8981\u53D1\u6210 w \u6216 b' },
        { pattern: /\bw/, spoken_error: /[vb]/, tip: '"w" \u53D1\u97F3\uFF1A\u5634\u5507\u5706\u7A81\uFF0C\u4E0D\u8981\u54AC\u5507\uFF08\u90A3\u662Fv\uFF09' },
        { pattern: /ng$/, spoken_error: /nk$|ng[gk]/, tip: '"ng" \u7ED3\u5C3E\uFF1A\u4E0D\u8981\u52A0 g \u7684\u7206\u7834\uFF0C\u4FDD\u6301\u9F3B\u97F3' },
        { pattern: /[td]$/, spoken_error: /[td]?$/, tip: "\u7ED3\u5C3E\u7206\u7834\u97F3\uFF1A\u4FDD\u6301\u6700\u7EC8\u7684\u6C14\u6D41\u505C\u987F" },
        { pattern: /z/, spoken_error: /s/, tip: '"z" \u8981\u632F\u52A8\u58F0\u5E26\uFF0C\u4E0D\u662F "s"\uFF08\u4E2D\u56FD\u5B66\u751F\u5E38\u53D1\u6210 s\uFF09' },
        // 元音
        { pattern: /\b[aeiou]{2}/, spoken_error: /\b[aeiou]/, tip: "\u6CE8\u610F\u53CC\u5143\u97F3\uFF1A\u4ECE\u7B2C\u4E00\u4E2A\u97F3\u7D20\u5E73\u6ED1\u6ED1\u5411\u7B2C\u4E8C\u4E2A" },
        { pattern: /ea|ee/, spoken_error: /i/, tip: '"ee/ea" \u662F\u957F\u97F3 /i\u02D0/\uFF0C\u5634\u89D2\u5411\u4E24\u4FA7\u62C9\uFF0C\u6BD4\u4E2D\u6587"\u4E00"\u66F4\u62C9' },
        { pattern: /\bcan't|cannot/, spoken_error: /\bcan/, tip: "can't \u91CD\u8BFB\uFF0Ccan \u5F31\u8BFB\uFF1B\u6CE8\u610F\u5426\u5B9A\u8981\u660E\u663E" },
        { pattern: /tion|sion/, spoken_error: /tion|sion/, tip: '"-tion/-sion" \u53D1 /\u0283\u0259n/\uFF0C\u4E0D\u662F "ti-on"' }
      ];
    }
  });

  // app/passages.js
  var passages_exports = {};
  __export(passages_exports, {
    initPassages: () => initPassages
  });
  async function initPassages() {
    if (_passages.length) return;
    try {
      const files = [
        "data/builtin/english/passages/primary_passages.json",
        "data/builtin/english/passages/middle_passages.json"
      ];
      for (const f of files) {
        const res = await fetch(f);
        if (!res.ok) continue;
        const data = await res.json();
        _passages.push(...data.passages || []);
      }
      window._passages = _passages;
    } catch (e) {
      console.warn("passages load error", e);
    }
    bindPassageEvents();
    renderPassageList();
  }
  function bindPassageEvents() {
    const $5 = (id) => document.getElementById(id);
    document.querySelectorAll(".passage-grade-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".passage-grade-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _passageFilter = btn.dataset.grade;
        renderPassageList();
      });
    });
    $5("btn-passage-back")?.addEventListener("click", () => {
      window._goBack?.();
    });
    $5("btn-passage-speak")?.addEventListener("click", () => {
      if (_currentPassage) speak(_currentPassage.text, "en-US", 0.8);
    });
    document.querySelectorAll("[data-pmode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-pmode]").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("active", on);
          b.style.color = on ? "var(--color-english)" : "var(--color-text-sub)";
          b.style.borderBottom = on ? "2px solid var(--color-english)" : "2px solid transparent";
        });
        const mode = btn.dataset.pmode;
        $5("passage-read-section").classList.toggle("hidden", mode !== "read");
        $5("passage-translate-section").classList.toggle("hidden", mode !== "translate");
        $5("passage-recite-section").classList.toggle("hidden", mode !== "recite");
      });
    });
    $5("btn-passage-record")?.addEventListener("click", startPassageRecite);
  }
  function passageGradeLabel(g) {
    return {
      primary3: "\u5C0F\u5B66\u4E09\u5E74\u7EA7",
      primary4: "\u5C0F\u5B66\u56DB\u5E74\u7EA7",
      primary5: "\u5C0F\u5B66\u4E94\u5E74\u7EA7",
      primary6: "\u5C0F\u5B66\u516D\u5E74\u7EA7",
      middle1: "\u521D\u4E2D\u4E00\u5E74\u7EA7",
      middle2: "\u521D\u4E2D\u4E8C\u5E74\u7EA7",
      middle3: "\u521D\u4E2D\u4E09\u5E74\u7EA7"
    }[g] || g;
  }
  function renderPassageList() {
    const list = document.getElementById("passage-list");
    if (!list) return;
    let items = _passages;
    if (_passageFilter === "primary") items = items.filter((p) => p.grade?.startsWith("primary"));
    else if (_passageFilter === "middle") items = items.filter((p) => p.grade?.startsWith("middle"));
    if (!items.length) {
      list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">\u6682\u65E0\u77ED\u6587\u6570\u636E</p>';
      return;
    }
    const catColors = {
      "\u751F\u6D3B": "#FF8C42",
      "\u6821\u56ED": "#3B82F6",
      "\u81EA\u7136": "#10B981",
      "\u52A8\u7269": "#F59E0B",
      "\u5065\u5EB7": "#EF4444",
      "\u79D1\u6280": "#8B5CF6",
      "\u6587\u5316": "#EC4899",
      "\u54C1\u5FB7": "#14B8A6",
      "\u52B1\u5FD7": "#F97316",
      "\u5386\u53F2": "#6366F1",
      "\u73AF\u4FDD": "#22C55E",
      "\u793E\u4F1A": "#0EA5E9",
      "\u79D1\u5B66": "#A855F7",
      "\u6559\u80B2": "#F59E0B",
      "\u68A6\u60F3": "#EF4444",
      "\u8FD0\u52A8": "#3B82F6",
      "\u65C5\u6E38": "#06B6D4",
      "\u5BB6\u5EAD": "#F472B6",
      "\u9605\u8BFB": "#84CC16",
      "\u5199\u4F5C": "#FB923C",
      "\u5B89\u5168": "#DC2626"
    };
    list.innerHTML = items.map((p, i) => {
      const words = (p.text || "").split(/\s+/).length;
      const color = catColors[p.category] || "#aaa";
      return `<button class="passage-item" data-pid="${escapeHtml(p.id)}">
      <div class="pi-num">${i + 1}</div>
      <div class="pi-cat" style="background:${color}">${escapeHtml(p.category || "\u82F1")}</div>
      <div class="pi-info">
        <div class="pi-title">${escapeHtml(p.title)}</div>
        <div class="pi-meta">${passageGradeLabel(p.grade)} \xB7 ${words} \u8BCD</div>
      </div>
      <div class="pi-arrow">\u203A</div>
    </button>`;
    }).join("");
    list.querySelectorAll(".passage-item").forEach((btn) => {
      btn.addEventListener("click", () => openPassage(btn.dataset.pid));
    });
  }
  function openPassage(pid) {
    const p = _passages.find((x) => x.id === pid);
    if (!p) return;
    _currentPassage = p;
    const $5 = (id) => document.getElementById(id);
    $5("passage-title").textContent = p.title;
    $5("passage-meta").textContent = (p.category || "") + " \xB7 " + (p.text || "").split(/\s+/).length + " \u8BCD";
    const tokens = p.text.split(/([a-zA-Z][a-zA-Z'-]*)/);
    $5("passage-text").innerHTML = tokens.map((tok) => {
      if (/^[a-zA-Z][a-zA-Z'-]*$/.test(tok)) {
        if (window._colorEnglishSyllables) return window._colorEnglishSyllables(tok);
        return escapeHtml(tok);
      }
      return escapeHtml(tok);
    }).join("");
    const kwEl = $5("passage-keywords");
    if (kwEl) kwEl.innerHTML = p.keywords?.length ? `
    <div style="font-size:11px;font-weight:700;color:var(--color-english);margin-bottom:6px">\u{1F511} \u5173\u952E\u8BCD</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${p.keywords.map((k) => `<span style="background:rgba(59,130,246,0.1);color:var(--color-english);border-radius:20px;padding:3px 10px;font-size:12px">${escapeHtml(k)}</span>`).join("")}
    </div>` : "";
    const kpEl = $5("passage-keypoints");
    if (kpEl) kpEl.innerHTML = p.key_points?.length ? `
    <div style="font-size:11px;font-weight:700;color:#8B5CF6;margin-bottom:6px;margin-top:12px">\u{1F4CC} \u5B66\u4E60\u91CD\u70B9</div>
    ${p.key_points.map((pt) => `<div style="font-size:12px;color:var(--color-text-sub);padding:3px 0">\xB7 ${escapeHtml(pt)}</div>`).join("")}` : "";
    const trEl = $5("passage-translation");
    if (trEl) trEl.textContent = p.translation || "";
    $5("passage-score")?.classList.add("hidden");
    if ($5("passage-recognized")) $5("passage-recognized").textContent = "";
    if ($5("passage-record-label")) $5("passage-record-label").textContent = "\u5F00\u59CB\u80CC\u8BF5";
    document.querySelectorAll("[data-pmode]").forEach((b) => {
      const on = b.dataset.pmode === "read";
      b.classList.toggle("active", on);
      b.style.color = on ? "var(--color-english)" : "var(--color-text-sub)";
      b.style.borderBottom = on ? "2px solid var(--color-english)" : "2px solid transparent";
    });
    $5("passage-read-section")?.classList.remove("hidden");
    $5("passage-translate-section")?.classList.add("hidden");
    $5("passage-recite-section")?.classList.add("hidden");
    if (window._showPage) {
      window._showPage("passage");
    } else {
      document.querySelectorAll(".page").forEach((pg) => pg.classList.remove("active"));
      document.getElementById("page-passage")?.classList.add("active");
    }
  }
  async function startPassageRecite() {
    const { startListening: startListening2, SpeechSupport: SpeechSupport2 } = await Promise.resolve().then(() => (init_speech(), speech_exports));
    const $5 = (id) => document.getElementById(id);
    if (!SpeechSupport2.stt) {
      alert("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome \u6D4F\u89C8\u5668");
      return;
    }
    const btn = $5("btn-passage-record");
    const label = $5("passage-record-label");
    if (_passageStopRecord) {
      _passageStopRecord();
      _passageStopRecord = null;
      btn.style.background = "var(--color-english)";
      label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
      return;
    }
    btn.style.background = "#EF4444";
    label.textContent = "\u80CC\u8BF5\u4E2D\u2026\u70B9\u51FB\u505C\u6B62";
    let spoken = "";
    _passageStopRecord = startListening2(
      "en-US",
      (text) => {
        spoken = text;
        if ($5("passage-recognized")) $5("passage-recognized").textContent = "\u8BC6\u522B\uFF1A" + text;
      },
      () => {
        btn.style.background = "var(--color-english)";
        label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
      },
      () => {
        btn.style.background = "var(--color-english)";
        label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
        _passageStopRecord = null;
        if (!spoken || !_currentPassage) return;
        const target = _currentPassage.text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
        const said = spoken.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
        const hits = said.filter((w) => target.includes(w)).length;
        const score = Math.min(100, Math.round(hits / Math.max(target.length * 0.3, 1) * 100));
        const feedback = score >= 85 ? "\u592A\u68D2\u4E86\uFF01\u80CC\u8BF5\u975E\u5E38\u6D41\u5229\uFF01" : score >= 60 ? "\u4E0D\u9519\uFF01\u7EE7\u7EED\u7EC3\u4E60" : "\u518D\u719F\u6089\u4E00\u4E0B\u539F\u6587\uFF0C\u52A0\u6CB9\uFF01";
        if ($5("passage-score-val")) $5("passage-score-val").textContent = score;
        if ($5("passage-score-feedback")) $5("passage-score-feedback").textContent = feedback;
        $5("passage-score")?.classList.remove("hidden");
      }
    );
  }
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var _passages, _currentPassage, _passageFilter, _passageStopRecord;
  var init_passages = __esm({
    "app/passages.js"() {
      _passages = [];
      _currentPassage = null;
      _passageFilter = "all";
      _passageStopRecord = null;
    }
  });

  // app/english.js
  var english_exports = {};
  __export(english_exports, {
    initEnglish: () => initEnglish,
    openTodayCardsModal: () => openTodayCardsModal,
    renderGrammarList: () => renderGrammarList,
    renderPhonemeGrid: () => renderPhonemeGrid,
    renderScenarioGrid: () => renderScenarioGrid,
    switchEnglishTabPublic: () => switchEnglishTab
  });
  function toast(msg) {
    const c = $("toast-container");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  function initEnglish(profile) {
    E.currentProfile = profile;
    bindEnglishEvents();
    updateAdultNavVisibility(profile);
  }
  function updateAdultNavVisibility(profile) {
    const isAdult = localStorage.getItem("adult_mode") === "1" || profile?.ageGroup === "adult";
    const englishNavItem = document.querySelector('.nav-item[data-page="english"]');
    if (englishNavItem) englishNavItem.style.display = isAdult ? "flex" : "none";
  }
  function bindEnglishEvents() {
    document.querySelectorAll(".english-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchEnglishTab(btn.dataset.etab));
    });
    document.querySelectorAll(".ph-group-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ph-group-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderPhonemeGrid(btn.dataset.group);
      });
    });
    document.querySelectorAll(".vocab-dir-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".vocab-dir-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    $("btn-start-vocab-study")?.addEventListener("click", startVocabStudy);
    $("btn-load-adult-vocab")?.addEventListener("click", loadAdultVocab);
    $("btn-scenario-back")?.addEventListener("click", () => showEnglishPage());
    $("btn-show-model")?.addEventListener("click", showModelAnswer);
    $("btn-try-again")?.addEventListener("click", resetScenarioRecord);
    $("btn-next-exchange")?.addEventListener("click", nextExchange);
    $("btn-speak-cue")?.addEventListener("click", speakCue);
    $("btn-speak-model")?.addEventListener("click", speakModel);
    $("btn-scenario-record")?.addEventListener("click", toggleScenarioRecord);
    $("btn-close-phoneme-modal")?.addEventListener("click", () => hide($("phoneme-detail-modal")));
    $("btn-close-today-modal")?.addEventListener("click", () => hide($("today-cards-modal")));
    $("btn-practice-speak")?.addEventListener("click", speakPracticeWord);
    $("btn-practice-record")?.addEventListener("click", togglePracticeRecord);
    $("btn-speak-ipa")?.addEventListener("click", () => {
      if (E.practicePhonem) speak2(E.practicePhonem.examples[0], "en-US", 0.7);
    });
    $("setting-adult-mode")?.addEventListener("change", (e) => {
      localStorage.setItem("adult_mode", e.target.checked ? "1" : "0");
      updateAdultNavVisibility(E.currentProfile);
      toast(e.target.checked ? "\u5DF2\u5F00\u542F\u6210\u4EBA\u5B66\u4E60\u6A21\u5F0F" : "\u5DF2\u5173\u95ED\u6210\u4EBA\u5B66\u4E60\u6A21\u5F0F");
    });
    ["due-count", "new-count", "done-count"].forEach((id) => {
      $(id)?.addEventListener("click", () => openTodayCardsModal(id));
    });
  }
  function showEnglishPage() {
    if (window._showPage) {
      window._showPage("english-adult");
    } else {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      $("page-english-adult")?.classList.add("active");
    }
  }
  function switchEnglishTab(tab) {
    document.querySelectorAll(".english-tab").forEach((b) => b.classList.toggle("active", b.dataset.etab === tab));
    document.querySelectorAll(".english-section").forEach((s) => {
      s.classList.toggle("active", s.id === `etab-${tab}`);
      s.classList.toggle("hidden", s.id !== `etab-${tab}`);
    });
    if (tab === "vocab") refreshVocabStats();
    if (tab === "speaking") renderScenarioGrid();
    if (tab === "phonetics") renderPhonemeGrid("vowels");
    if (tab === "twister") renderTwisterList();
    if (tab === "grammar") renderGrammarList("all");
    if (tab === "passages") {
      Promise.resolve().then(() => (init_passages(), passages_exports)).then((m) => m.initPassages());
    }
  }
  async function refreshVocabStats() {
    if (!E.currentProfile) return;
    const cards = await CardManager.getByProfile(E.currentProfile.id);
    const english = cards.filter((c) => c.subject === "english" || c.tags?.includes("CET-4"));
    const due = english.filter((c) => c.nextReview <= todayStr());
    const fresh = english.filter((c) => c.reviewCount === 0);
    const mastered = english.filter((c) => c.interval >= 21 || c.box >= 3);
    const setStatWithClick = (id, count, cardSubset, label) => {
      const el = $(id);
      if (!el) return;
      el.textContent = count;
      el.style.cursor = count > 0 ? "pointer" : "default";
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      if (count > 0) {
        newEl.addEventListener("click", () => {
          const queue = [...cardSubset].sort(() => Math.random() - 0.5).slice(0, 50);
          if (!queue.length) {
            toast("\u6682\u65E0\u53EF\u5B66\u4E60\u7684\u5361\u7247");
            return;
          }
          document.dispatchEvent(new CustomEvent("start-english-vocab", {
            detail: { queue, direction: document.querySelector(".vocab-dir-btn.active")?.dataset.dir || "en-zh" }
          }));
        });
        newEl.title = `\u70B9\u51FB\u5F00\u59CB\u590D\u4E60${label}\uFF08${count}\u5F20\uFF09`;
      }
    };
    setStatWithClick("vocab-due", due.length, due, "\u5230\u671F\u5361\u7247");
    setStatWithClick("vocab-new", fresh.length, fresh, "\u65B0\u8BCD");
    setStatWithClick("vocab-mastered", mastered.length, mastered, "\u5DF2\u638C\u63E1\u8BCD\u6C47");
    const decks = await DeckManager.getByProfile(E.currentProfile.id);
    const deckSel = $("vocab-deck-select");
    if (deckSel) {
      deckSel.innerHTML = '<option value="all">\u5168\u90E8\u82F1\u8BED\u8BCD\u6C47</option>' + decks.filter((d) => d.subject === "english").map((d) => `<option value="${d.id}">${escapeHtml2(d.name)}</option>`).join("");
    }
  }
  async function startVocabStudy() {
    const profile = E.currentProfile;
    if (!profile) return;
    const dir = document.querySelector(".vocab-dir-btn.active")?.dataset.dir || "en-zh";
    const deckId = $("vocab-deck-select")?.value;
    let cards = await CardManager.getByProfile(profile.id);
    cards = cards.filter((c) => c.subject === "english" || c.tags?.includes("CET-4") || c.tags?.includes("\u6210\u4EBA"));
    if (deckId && deckId !== "all") cards = cards.filter((c) => c.deckId === deckId);
    if (!cards.length) {
      toast("\u6CA1\u6709\u82F1\u8BED\u8BCD\u6C47\uFF0C\u8BF7\u5148\u52A0\u8F7D\u8BCD\u6C47\u5E93");
      return;
    }
    const due = cards.filter((c) => c.nextReview <= todayStr());
    const fresh = cards.filter((c) => c.reviewCount === 0);
    const queue = buildStudyQueue(due, fresh, profile.newPerDay || 15);
    if (!queue.length) {
      toast("\u4ECA\u5929\u7684\u5355\u8BCD\u90FD\u590D\u4E60\u5B8C\u4E86\uFF01");
      return;
    }
    document.dispatchEvent(new CustomEvent("start-english-vocab", {
      detail: { queue, direction: dir }
    }));
  }
  async function loadAdultVocab() {
    const profile = E.currentProfile;
    if (!profile) return;
    try {
      toast("\u6B63\u5728\u52A0\u8F7D\u804C\u573A\u8BCD\u6C47...");
      const [vocabRes, phrasesRes] = await Promise.all([
        fetch("data/builtin/english/adult_vocab_basic.json"),
        fetch("data/builtin/english/adult_phrases.json")
      ]);
      const vocab = await vocabRes.json();
      E.phrasesData = await phrasesRes.json();
      const deck = await DeckManager.create(profile.id, "\u804C\u573A\u82F1\u8BED\u8BCD\u6C47\uFF08CET-4\uFF09", "english", "adult", true);
      await CardManager.bulkCreate(profile.id, deck.id, vocab.cards);
      toast(`\u5DF2\u52A0\u8F7D ${vocab.cards.length} \u4E2A\u804C\u573A\u5355\u8BCD`);
      refreshVocabStats();
    } catch (e) {
      toast(`\u52A0\u8F7D\u5931\u8D25\uFF1A${e.message}`);
    }
  }
  async function renderScenarioGrid() {
    if (!E.phrasesData) {
      try {
        const res = await fetch("data/builtin/english/adult_phrases.json");
        E.phrasesData = await res.json();
      } catch {
        $("scenario-grid").innerHTML = '<p style="color:var(--color-text-sub);padding:24px;text-align:center">\u8BF7\u5148\u52A0\u8F7D\u804C\u573A\u8BCD\u6C47\u5E93</p>';
        return;
      }
    }
    const grid = $("scenario-grid");
    grid.innerHTML = "";
    const categoryIcons = {
      meeting: "\u{1F4CB}",
      presentation: "\u{1F4CA}",
      negotiation: "\u{1F91D}",
      interview: "\u{1F4BC}",
      smalltalk: "\u2615",
      email: "\u{1F4E7}",
      problem_solving: "\u{1F527}"
    };
    E.phrasesData.scenarios.forEach((sc) => {
      const card = document.createElement("button");
      card.className = "scenario-card";
      const levelColors = { beginner: "#4CAF7D", intermediate: "#FF8C42", advanced: "#E85555" };
      card.innerHTML = `
      <div class="scenario-icon">${categoryIcons[sc.category] || "\u{1F4AC}"}</div>
      <div class="scenario-info">
        <div class="scenario-category">${sc.category_name}</div>
        <div class="scenario-title">${sc.title}</div>
        <div class="scenario-level" style="color:${levelColors[sc.level]}">${levelLabel(sc.level)}</div>
      </div>
      <div class="scenario-count">${sc.exchanges.length}\u53E5</div>
    `;
      card.addEventListener("click", () => startScenario(sc));
      grid.appendChild(card);
    });
  }
  function levelLabel(l) {
    return { beginner: "\u5165\u95E8", intermediate: "\u8FDB\u9636", advanced: "\u9AD8\u7EA7" }[l] || l;
  }
  function startScenario(scenario) {
    E.scenario = scenario;
    E.exchangeIndex = 0;
    if (window._showPage) {
      window._showPage("scenario");
    } else {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      $("page-scenario")?.classList.add("active");
    }
    $("scenario-context").textContent = `\u573A\u666F\uFF1A${scenario.title} \u2014 ${scenario.context}`;
    renderExchange();
  }
  function renderExchange() {
    const sc = E.scenario;
    const ex = sc.exchanges[E.exchangeIndex];
    if (!ex) return;
    const total = sc.exchanges.length;
    const current = E.exchangeIndex + 1;
    $("scenario-progress-bar").style.width = `${current / total * 100}%`;
    $("scenario-progress-text").textContent = `${current}/${total}`;
    $("cue-text").textContent = ex.cue;
    const kpRow = $("key-phrases-row");
    const kpEl = $("key-phrases");
    if (ex.key_phrases?.length) {
      kpEl.innerHTML = ex.key_phrases.map((p) => `<span class="kp-chip">${p}</span>`).join("");
      show(kpRow);
    } else {
      hide(kpRow);
    }
    const ptRow = $("pronunciation-tip-row");
    if (ex.pronunciation_focus) {
      $("pronunciation-tip-text").textContent = ex.pronunciation_focus;
      show(ptRow);
    } else {
      hide(ptRow);
    }
    hide($("scenario-score"));
    hide($("model-answer"));
    hide($("btn-next-exchange"));
    show($("btn-show-model"));
    show($("btn-try-again"));
    const waveform = $("scenario-waveform");
    waveform?.classList.remove("active");
    setTimeout(() => speak2(ex.cue, "en-US", 0.85), 600);
  }
  function speakCue() {
    const ex = E.scenario?.exchanges[E.exchangeIndex];
    if (ex) speak2(ex.cue, "en-US", 0.85);
  }
  function speakModel() {
    const ex = E.scenario?.exchanges[E.exchangeIndex];
    if (ex) speak2(ex.model_response, "en-US", 0.8);
  }
  function showModelAnswer() {
    const ex = E.scenario?.exchanges[E.exchangeIndex];
    if (!ex) return;
    $("model-answer-text").textContent = ex.model_response;
    show($("model-answer"));
    show($("btn-next-exchange"));
  }
  function resetScenarioRecord() {
    hide($("scenario-score"));
    hide($("model-answer"));
    hide($("btn-next-exchange"));
    $("btn-scenario-record").classList.remove("recording");
    $("scenario-record-label").textContent = "\u5F00\u59CB\u8BF4\u8BDD";
    $("scenario-waveform")?.classList.remove("active");
  }
  function nextExchange() {
    E.exchangeIndex++;
    if (E.exchangeIndex >= E.scenario.exchanges.length) {
      $("scenario-context").textContent = "\u{1F389} \u672C\u60C5\u666F\u7EC3\u4E60\u5B8C\u6210\uFF01\u5F88\u68D2\uFF01";
      $("scenario-exchange").style.display = "none";
      document.querySelector(".scenario-record-area").style.display = "none";
      setTimeout(() => {
        $("scenario-exchange").style.display = "";
        document.querySelector(".scenario-record-area").style.display = "";
        showEnglishPage();
      }, 2500);
      return;
    }
    renderExchange();
  }
  async function toggleScenarioRecord() {
    const btn = $("btn-scenario-record");
    const label = $("scenario-record-label");
    const waveform = $("scenario-waveform");
    if (_scenarioStopRecord) {
      _scenarioStopRecord();
      _scenarioStopRecord = null;
      btn.classList.remove("recording");
      label.textContent = "\u5904\u7406\u4E2D...";
      waveform?.classList.remove("active");
      return;
    }
    if (!SpeechSupport.stt) {
      toast("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome");
      return;
    }
    btn.classList.add("recording");
    label.textContent = "\u8BF4\u8BDD\u4E2D...";
    waveform?.classList.add("active");
    const ex = E.scenario?.exchanges[E.exchangeIndex];
    let spokenText = "", spokenConf = 1;
    _scenarioStopRecord = startListening(
      "en-US",
      (text, conf) => {
        spokenText = text;
        spokenConf = conf;
      },
      (msg) => {
        toast(msg);
        btn.classList.remove("recording");
        label.textContent = "\u5F00\u59CB\u8BF4\u8BDD";
      },
      async () => {
        btn.classList.remove("recording");
        label.textContent = "\u5F00\u59CB\u8BF4\u8BDD";
        waveform?.classList.remove("active");
        _scenarioStopRecord = null;
        if (!spokenText || !ex) return;
        const profile = E.currentProfile;
        const azureConfig = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
        const pronResult = await scorePronunciation(ex.model_response, spokenText, spokenConf, azureConfig, null);
        const keyPhrases = ex.key_phrases || [];
        const spokenLower = spokenText.toLowerCase();
        const covered = keyPhrases.filter((p) => spokenLower.includes(p.toLowerCase())).length;
        const contentScore = keyPhrases.length > 0 ? Math.round(covered / keyPhrases.length * 100) : spokenText.length > 10 ? 70 : 30;
        const overall = Math.round(pronResult.score * 0.6 + contentScore * 0.4);
        $("sc-pronunciation").textContent = pronResult.score;
        $("sc-content").textContent = contentScore;
        $("sc-overall").textContent = overall;
        $("sc-feedback").textContent = buildScenarioFeedback(overall, pronResult, keyPhrases, covered);
        $("sc-recognized").textContent = `\u8BC6\u522B\u5230\uFF1A${spokenText}`;
        show($("scenario-score"));
        if (overall >= 70) show($("btn-next-exchange"));
      }
    );
  }
  function buildScenarioFeedback(overall, pronResult, keyPhrases, covered) {
    if (overall >= 90) return "\u975E\u5E38\u51FA\u8272\uFF01\u53D1\u97F3\u51C6\u786E\uFF0C\u5185\u5BB9\u5B8C\u6574 \u{1F389}";
    if (overall >= 75) return "\u5F88\u597D\uFF01\u7EE7\u7EED\u4FDD\u6301\uFF0C\u53EF\u4EE5\u5C1D\u8BD5\u66F4\u81EA\u7136\u7684\u8868\u8FBE";
    if (overall >= 60) {
      const missed = keyPhrases.slice(covered);
      return `\u4E0D\u9519\u7684\u5C1D\u8BD5\uFF01${missed.length > 0 ? `\u5C1D\u8BD5\u52A0\u5165\uFF1A${missed.slice(0, 2).join("\u3001")}` : pronResult.feedback}`;
    }
    return `${pronResult.feedback} \u770B\u770B\u53C2\u8003\u7B54\u6848\u518D\u8BD5\u4E00\u6B21`;
  }
  async function loadPhoneticsData() {
    if (E.phoneticsData) return E.phoneticsData;
    try {
      const res = await fetch("data/builtin/english/phonetics.json");
      E.phoneticsData = await res.json();
    } catch {
      E.phoneticsData = { vowels: [], consonants: [], stress_rules: [] };
    }
    return E.phoneticsData;
  }
  async function renderPhonemeGrid(group) {
    const data = await loadPhoneticsData();
    const grid = $("phoneme-grid");
    if (!grid) return;
    grid.innerHTML = "";
    if (group === "stress") {
      renderStressRules(data.stress_rules);
      return;
    }
    const phones = data[group] || [];
    phones.forEach((ph) => {
      const btn = document.createElement("button");
      btn.className = "phoneme-card";
      btn.innerHTML = `
      <div class="ph-ipa">${ph.ipa}</div>
      <div class="ph-name">${ph.name}</div>
      <div class="ph-example">${ph.examples?.[0] || ""}</div>
    `;
      btn.addEventListener("click", () => openPhonemeDetail(ph));
      grid.appendChild(btn);
    });
  }
  function renderStressRules(rules) {
    const grid = $("phoneme-grid");
    grid.innerHTML = "";
    rules?.forEach((r) => {
      const card = document.createElement("div");
      card.className = "stress-rule-card";
      card.innerHTML = `
      <div class="stress-rule-title">${r.rule}</div>
      <div class="stress-examples">${r.examples.map((e) => `<span class="stress-ex">${e}</span>`).join("")}</div>
      <div class="stress-note">${r.note}</div>
    `;
      grid.appendChild(card);
    });
  }
  function openPhonemeDetail(phoneme) {
    E.practicePhonem = phoneme;
    E.practiceWord = phoneme.examples?.[0];
    $("pd-ipa").textContent = phoneme.ipa;
    $("pd-name").textContent = phoneme.name;
    $("pd-mouth-tip").textContent = phoneme.mouth_tip || "\u2014";
    $("pd-articulation").textContent = phoneme.articulation || "\u2014";
    const mistakeRow = $("pd-mistake-row");
    if (phoneme.common_mistake) {
      $("pd-mistake").textContent = phoneme.common_mistake;
      show(mistakeRow);
    } else {
      hide(mistakeRow);
    }
    const spEl = $("pd-spellings");
    if (spEl && phoneme.common_spellings?.length) {
      spEl.innerHTML = phoneme.common_spellings.map((s) => `<span class="spelling-chip">${s}</span>`).join("");
    }
    const exEl = $("pd-examples");
    if (exEl && phoneme.examples?.length) {
      exEl.innerHTML = phoneme.examples.map(
        (w) => `<button class="example-word-btn" onclick="(function(){window._speakWord='${w}'})();this.classList.add('speaking');setTimeout(()=>this.classList.remove('speaking'),800)">${w}</button>`
      ).join("");
      exEl.querySelectorAll(".example-word-btn").forEach((btn) => {
        btn.addEventListener("click", () => speak2(btn.textContent, "en-US", 0.7));
      });
    }
    const pairsEl = $("pd-pairs");
    const pairsRow = $("pd-pairs-row");
    if (pairsEl && phoneme.minimal_pairs?.length) {
      pairsEl.innerHTML = phoneme.minimal_pairs.map((p) => {
        const a = p.a || p.short || p.voiced;
        const b = p.b || p.long || p.voiceless;
        return `<div class="pair-item"><span class="pair-a" onclick=""><button class="pair-btn" data-word="${a.split("/")[0].trim()}">${a}</button></span><span class="pair-vs">vs</span><button class="pair-btn" data-word="${b.split("/")[0].trim()}">${b}</button></div>`;
      }).join("");
      pairsEl.querySelectorAll(".pair-btn").forEach((btn) => {
        btn.addEventListener("click", () => speak2(btn.dataset.word, "en-US", 0.7));
      });
      show(pairsRow);
    } else {
      hide(pairsRow);
    }
    $("practice-word-display").textContent = E.practiceWord || phoneme.examples?.[0] || "";
    hide($("phoneme-score-display"));
    show($("phoneme-detail-modal"));
    setTimeout(() => speak2(E.practiceWord || phoneme.ipa.replace(/\//g, ""), "en-US", 0.65), 300);
  }
  function speakPracticeWord() {
    if (E.practiceWord) speak2(E.practiceWord, "en-US", 0.65);
  }
  async function togglePracticeRecord() {
    const btn = $("btn-practice-record");
    if (_practiceStopRecord) {
      _practiceStopRecord();
      _practiceStopRecord = null;
      btn.classList.remove("recording");
      return;
    }
    if (!SpeechSupport.stt) {
      toast("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B");
      return;
    }
    btn.classList.add("recording");
    let spoken = "", conf = 1;
    _practiceStopRecord = startListening(
      "en-US",
      (text, c) => {
        spoken = text;
        conf = c;
      },
      (msg) => {
        toast(msg);
        btn.classList.remove("recording");
      },
      async () => {
        btn.classList.remove("recording");
        _practiceStopRecord = null;
        if (!spoken || !E.practiceWord) return;
        const profile = E.currentProfile;
        const azure = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
        const result = await scorePronunciation(E.practiceWord, spoken, conf, azure, null);
        const scoreEl = $("phoneme-score-circle");
        const numEl = $("phoneme-score-num");
        const feedEl = $("phoneme-score-feedback");
        numEl.textContent = result.score;
        scoreEl.className = `score-circle ${result.score >= 75 ? "" : result.score >= 60 ? "score-mid" : "score-low"}`;
        feedEl.textContent = result.feedback;
        show($("phoneme-score-display"));
        const ph = E.practicePhonem;
        if (ph?.examples) {
          const idx = ph.examples.indexOf(E.practiceWord);
          E.practiceWord = ph.examples[(idx + 1) % ph.examples.length];
          $("practice-word-display").textContent = E.practiceWord;
        }
      }
    );
  }
  async function renderTwisterList() {
    if (!E.phrasesData) {
      try {
        const res = await fetch("data/builtin/english/adult_phrases.json");
        E.phrasesData = await res.json();
      } catch {
        return;
      }
    }
    const list = $("twister-list");
    if (!list) return;
    list.innerHTML = "";
    E.phrasesData.tongue_twisters?.forEach((tt) => {
      const card = document.createElement("div");
      card.className = "twister-card";
      card.innerHTML = `
      <div class="twister-focus">\u97F3\u7D20\u91CD\u70B9\uFF1A${tt.focus}</div>
      <div class="twister-text">${tt.text}</div>
      <div class="twister-tip">\u{1F4A1} ${tt.tip}</div>
      <div class="twister-actions">
        <button class="btn-secondary twister-speak" data-text="${escapeHtml2(tt.text)}">\u{1F50A} \u542C</button>
        <button class="btn-secondary twister-record" data-id="${tt.id}">\u{1F3A4} \u8DDF\u8BFB</button>
      </div>
      <div class="twister-score hidden" id="ts-score-${tt.id}">
        <span class="ts-score-val"></span> <span class="ts-score-fb"></span>
      </div>
    `;
      list.appendChild(card);
    });
    list.querySelectorAll(".twister-speak").forEach((btn) => {
      btn.addEventListener("click", () => speak2(btn.dataset.text, "en-US", 0.75));
    });
    list.querySelectorAll(".twister-record").forEach((btn) => {
      btn.addEventListener("click", () => startTwisterRecord(btn.dataset.id));
    });
  }
  async function startTwisterRecord(id) {
    if (!SpeechSupport.stt) {
      toast("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B");
      return;
    }
    const tt = E.phrasesData?.tongue_twisters?.find((t) => t.id === id);
    if (!tt) return;
    toast("\u5F00\u59CB\u8BF4...");
    let spoken = "", conf = 1;
    const stop = startListening(
      "en-US",
      (text, c) => {
        spoken = text;
        conf = c;
      },
      (msg) => toast(msg),
      async () => {
        if (!spoken) return;
        const profile = E.currentProfile;
        const azure = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
        const result = await scorePronunciation(tt.text.toLowerCase(), spoken.toLowerCase(), conf, azure, null);
        const scoreEl = $(`ts-score-${id}`);
        if (scoreEl) {
          scoreEl.querySelector(".ts-score-val").textContent = `${result.score}\u5206`;
          scoreEl.querySelector(".ts-score-fb").textContent = result.feedback;
          show(scoreEl);
        }
      }
    );
  }
  async function openTodayCardsModal(type) {
    const profile = window._App?.currentProfile;
    if (!profile) return;
    const allCards = await CardManager.getByProfile(profile.id);
    let cards, title;
    if (type === "due-count") {
      cards = allCards.filter((c) => c.nextReview <= todayStr() && c.reviewCount > 0);
      title = "\u4ECA\u65E5\u5F85\u590D\u4E60";
    } else if (type === "new-count") {
      cards = allCards.filter((c) => c.reviewCount === 0);
      title = "\u4ECA\u65E5\u65B0\u8BCD";
    } else {
      const prog = await Promise.resolve().then(() => (init_core(), core_exports)).then((m) => m.ProgressManager.getByDate(profile.id, todayStr()));
      title = "\u4ECA\u65E5\u5DF2\u5B66";
      cards = allCards.filter((c) => c.lastReview === todayStr());
    }
    $("today-cards-modal-title").textContent = `${title}\uFF08${cards.length}\u5F20\uFF09`;
    const list = $("today-cards-list");
    list.innerHTML = "";
    if (!cards.length) {
      list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:24px">\u6682\u65E0\u6570\u636E</p>';
    } else {
      cards.slice(0, 50).forEach((c) => {
        const item = document.createElement("div");
        item.className = "today-card-item";
        item.innerHTML = `
        <span class="tc-front">${escapeHtml2(c.front)}</span>
        <span class="tc-back">${escapeHtml2(c.back.slice(0, 30))}${c.back.length > 30 ? "\u2026" : ""}</span>
        <span class="tc-interval" title="\u4E0B\u6B21\u590D\u4E60">${c.interval ? `${c.interval}\u5929\u540E` : "\u65B0"}</span>
      `;
        list.appendChild(item);
      });
      if (cards.length > 50) {
        const more = document.createElement("p");
        more.style.cssText = "text-align:center;color:var(--color-text-sub);padding:8px";
        more.textContent = `\u8FD8\u6709 ${cards.length - 50} \u5F20...`;
        list.appendChild(more);
      }
    }
    show($("today-cards-modal"));
  }
  function escapeHtml2(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function renderGrammarList(level) {
    const list = document.getElementById("grammar-list");
    if (!list) return;
    document.querySelectorAll(".grammar-level-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".grammar-level-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderGrammarList(btn.dataset.level);
      });
    });
    const filtered = level === "all" ? GRAMMAR_DATA : GRAMMAR_DATA.filter((g) => g.level === level);
    list.innerHTML = "";
    filtered.forEach((g) => {
      const card = document.createElement("div");
      card.className = "grammar-card";
      card.innerHTML = `
      <div class="grammar-header">
        <span class="grammar-title">${escapeHtml2(g.title)}</span>
        <span class="grammar-level-tag ${g.level}">${g.level === "primary" ? "\u5C0F\u5B66" : "\u521D\u4E2D"}</span>
      </div>
      <div class="grammar-rule">${escapeHtml2(g.rule)}</div>
      <div class="grammar-examples">
        ${g.examples.map((e) => `<div class="grammar-ex">
          <button class="grammar-speak" data-text="${escapeHtml2(e.split(".")[0].replace(/'/g, ""))}">\u{1F50A}</button>
          <span>${escapeHtml2(e)}</span>
        </div>`).join("")}
      </div>
      ${g.tips.length ? `<div class="grammar-tips">
        ${g.tips.map((t) => `<div class="grammar-tip">\u{1F4A1} ${escapeHtml2(t)}</div>`).join("")}
      </div>` : ""}
    `;
      card.querySelectorAll(".grammar-speak").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          speak2(btn.dataset.text, "en-US", 0.8);
        });
      });
      list.appendChild(card);
    });
    if (!filtered.length) {
      list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">\u6682\u65E0\u5185\u5BB9</p>';
    }
  }
  var E, $, show, hide, _scenarioStopRecord, _practiceStopRecord, GRAMMAR_DATA;
  var init_english = __esm({
    "app/english.js"() {
      init_core();
      init_speech();
      init_pronunciation();
      init_algorithm();
      E = {
        currentProfile: null,
        phoneticsData: null,
        phrasesData: null,
        scenario: null,
        // 当前情景
        exchangeIndex: 0,
        // 当前对话句索引
        practiceWord: null,
        // 当前练习例词
        practicePhonem: null
        // 当前练习音素
      };
      $ = (id) => document.getElementById(id);
      show = (el) => el?.classList.remove("hidden");
      hide = (el) => el?.classList.add("hidden");
      _scenarioStopRecord = null;
      _practiceStopRecord = null;
      GRAMMAR_DATA = [
        // ---- 小学语法 ----
        {
          id: "g_p01",
          level: "primary",
          title: "\u4E00\u822C\u73B0\u5728\u65F6",
          rule: "\u4E3B\u8BED + \u52A8\u8BCD\u539F\u5F62\uFF08\u7B2C\u4E09\u4EBA\u79F0\u5355\u6570\uFF1A\u52A8\u8BCD+s/es\uFF09",
          examples: ["I like cats.", "She likes cats. \uFF08she/he/it\u7528likes\uFF09", "They play football every day."],
          tips: ["\u7B2C\u4E09\u4EBA\u79F0\u5355\u6570\uFF1Ago\u2192goes\uFF0Chave\u2192has\uFF0Cstudy\u2192studies", "\u5426\u5B9A\uFF1Ado not / does not + \u52A8\u8BCD\u539F\u5F62"],
          tags: ["\u65F6\u6001", "\u5C0F\u5B66"]
        },
        {
          id: "g_p02",
          level: "primary",
          title: "\u73B0\u5728\u8FDB\u884C\u65F6",
          rule: "am/is/are + \u52A8\u8BCD-ing\uFF08\u6B63\u5728\u505A\u67D0\u4E8B\uFF09",
          examples: ["I am reading a book.", "She is running now.", "They are playing games."],
          tips: ["be\u52A8\u8BCD\uFF1AI\u2192am\uFF0Che/she/it\u2192is\uFF0Cwe/you/they\u2192are", "\u52A0-ing\u89C4\u5219\uFF1Arun\u2192running\uFF0Cmake\u2192making"],
          tags: ["\u65F6\u6001", "\u5C0F\u5B66"]
        },
        {
          id: "g_p03",
          level: "primary",
          title: "\u4E00\u822C\u8FC7\u53BB\u65F6",
          rule: "\u52A8\u8BCD\u8FC7\u53BB\u5F0F\uFF08\u89C4\u5219\uFF1A+ed\uFF1B\u4E0D\u89C4\u5219\u9700\u5355\u72EC\u8BB0\u5FC6\uFF09",
          examples: ["I played football yesterday.", "She went to school.\uFF08go\u2192went\uFF09", "We had dinner.\uFF08have\u2192had\uFF09"],
          tips: ["\u5E38\u89C1\u4E0D\u89C4\u5219\uFF1Ago\u2192went\uFF0Chave\u2192had\uFF0Csee\u2192saw\uFF0Ccome\u2192came", "\u5426\u5B9A\uFF1Adid not + \u52A8\u8BCD\u539F\u5F62"],
          tags: ["\u65F6\u6001", "\u5C0F\u5B66"]
        },
        {
          id: "g_p04",
          level: "primary",
          title: "\u4E00\u822C\u5C06\u6765\u65F6",
          rule: "will + \u52A8\u8BCD\u539F\u5F62 / am-is-are going to + \u52A8\u8BCD\u539F\u5F62",
          examples: ["I will go tomorrow.", "She is going to study.", "It will rain tonight."],
          tips: ["will\u8868\u610F\u613F\u6216\u9884\u6D4B", "be going to\u8868\u8BA1\u5212\u6216\u5DF2\u6709\u8FF9\u8C61"],
          tags: ["\u65F6\u6001", "\u5C0F\u5B66"]
        },
        {
          id: "g_p05",
          level: "primary",
          title: "There be \u53E5\u578B",
          rule: "There is + \u5355\u6570/\u4E0D\u53EF\u6570  /  There are + \u590D\u6570",
          examples: ["There is a cat on the table.", "There are three books here.", "Is there a park near your home?"],
          tips: ["\u5C31\u8FD1\u539F\u5219\uFF1AThere is a cat and two dogs.\uFF08\u9760\u8FD1is\u7528is\uFF09", "\u5426\u5B9A\uFF1AThere is no... / There are no..."],
          tags: ["\u53E5\u578B", "\u5C0F\u5B66"]
        },
        {
          id: "g_p06",
          level: "primary",
          title: "How \u95EE\u53E5",
          rule: "How + \u5F62\u5BB9\u8BCD/\u526F\u8BCD + \u5176\u4ED6\uFF1F",
          examples: ["How old are you? \u2014 I'm ten.", "How many books? \u2014 Five.", "How much is it? \u2014 20 yuan."],
          tips: ["How many + \u53EF\u6570\u540D\u8BCD\u590D\u6570", "How much + \u4E0D\u53EF\u6570\u540D\u8BCD / \u95EE\u4EF7\u683C"],
          tags: ["\u53E5\u578B", "\u7591\u95EE\u53E5", "\u5C0F\u5B66"]
        },
        {
          id: "g_p07",
          level: "primary",
          title: "\u51A0\u8BCD a/an/the",
          rule: "a/an\uFF1A\u6CDB\u6307\u5355\u6570\uFF1Bthe\uFF1A\u7279\u6307",
          examples: ["I have a cat.\uFF08\u7B2C\u4E00\u6B21\u63D0\u5230\uFF09", "The cat is cute.\uFF08\u518D\u6B21\u63D0\u5230\uFF09", "I play the piano.\uFF08\u4E50\u5668\u524D\u7528the\uFF09"],
          tips: ["a + \u8F85\u97F3\u97F3\u7D20\u5F00\u5934\u7684\u8BCD\uFF1Aa book", "an + \u5143\u97F3\u97F3\u7D20\u5F00\u5934\u7684\u8BCD\uFF1Aan apple", "\u72EC\u4E00\u65E0\u4E8C\u7684\u4E8B\u7269\u7528the\uFF1Athe sun\uFF0Cthe moon"],
          tags: ["\u51A0\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p08",
          level: "primary",
          title: "\u5F62\u5BB9\u8BCD\u6BD4\u8F83\u7EA7",
          rule: "\u6BD4...\u66F4... : \u5F62\u5BB9\u8BCD+er / more+\u5F62\u5BB9\u8BCD",
          examples: ["He is taller than me.", "This book is more interesting.", "She runs faster than Tom."],
          tips: ["\u5355\u97F3\u8282\uFF1Atall\u2192taller\uFF0Cfast\u2192faster", "\u591A\u97F3\u8282\uFF1Amore interesting\uFF0Cmore beautiful", "\u4E0D\u89C4\u5219\uFF1Agood\u2192better\uFF0Cbad\u2192worse"],
          tags: ["\u5F62\u5BB9\u8BCD", "\u5C0F\u5B66"]
        },
        // ---- 初中语法 ----
        {
          id: "g_m01",
          level: "middle",
          title: "\u73B0\u5728\u5B8C\u6210\u65F6",
          rule: "have/has + \u8FC7\u53BB\u5206\u8BCD\uFF08\u8FC7\u53BB\u53D1\u751F\u5BF9\u73B0\u5728\u6709\u5F71\u54CD\uFF09",
          examples: ["I have finished my homework.", "She has lived here for 3 years.", "Have you ever been to Beijing?"],
          tips: ["for\u8868\u6301\u7EED\u65F6\u95F4\uFF1Afor 3 years", "since\u8868\u8D77\u70B9\uFF1Asince 2020", "already\uFF08\u80AF\u5B9A\uFF09/ yet\uFF08\u5426\u5B9A\u7591\u95EE\uFF09/ ever\uFF08\u7ECF\u5386\uFF09/ never"],
          tags: ["\u65F6\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m02",
          level: "middle",
          title: "\u88AB\u52A8\u8BED\u6001",
          rule: "be\u52A8\u8BCD + \u8FC7\u53BB\u5206\u8BCD\uFF08\u8868\u793A\u88AB\u505A/\u53D7\u5230\uFF09",
          examples: ["The book was written by Lu Xun.", "English is spoken worldwide.", "The window was broken yesterday."],
          tips: ["be\u52A8\u8BCD\u65F6\u6001\u8981\u53D8\uFF1Ais\u2192was\u2192will be", "by + \u52A8\u4F5C\u6267\u884C\u8005\uFF08\u53EF\u7701\u7565\uFF09"],
          tags: ["\u8BED\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m03",
          level: "middle",
          title: "\u5BBE\u8BED\u4ECE\u53E5",
          rule: "think/know/say/wonder + that/if/\u7591\u95EE\u8BCD + \u9648\u8FF0\u8BED\u5E8F",
          examples: ["I think that he is right.", "I wonder if she will come.", "Do you know where he lives?"],
          tips: ["\u5BBE\u8BED\u4ECE\u53E5\u7528\u9648\u8FF0\u8BED\u5E8F\uFF08\u4E0D\u5012\u88C5\uFF09", "that\u5F15\u5BFC\u9648\u8FF0\uFF0Cif/whether\u5F15\u5BFC\u4E00\u822C\u7591\u95EE", "\u65F6\u6001\u4E00\u81F4\uFF1A\u4E3B\u53E5\u8FC7\u53BB\u65F6\u2192\u4ECE\u53E5\u4E5F\u7528\u8FC7\u53BB\u65F6"],
          tags: ["\u4ECE\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m04",
          level: "middle",
          title: "\u5B9A\u8BED\u4ECE\u53E5",
          rule: "\u5148\u884C\u8BCD + which/that\uFF08\u7269\uFF09/ who/that\uFF08\u4EBA\uFF09+ \u4ECE\u53E5",
          examples: ["The book which I read is good.", "The man who helped me is kind.", "This is the best film that I have ever seen."],
          tips: ["\u53EA\u80FD\u7528that\uFF1A\u5148\u884C\u8BCD\u662F\u4E0D\u5B9A\u4EE3\u8BCD\u3001\u5F62\u5BB9\u8BCD\u6700\u9AD8\u7EA7\u3001\u5E8F\u6570\u8BCD", "\u5B9A\u8BED\u4ECE\u53E5\u4FEE\u9970\u524D\u9762\u7684\u540D\u8BCD"],
          tags: ["\u4ECE\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m05",
          level: "middle",
          title: "\u60C5\u6001\u52A8\u8BCD\u7528\u6CD5",
          rule: "can/could/may/might/must/should + \u52A8\u8BCD\u539F\u5F62",
          examples: ["You must study hard.\uFF08\u5FC5\u987B\uFF09", "She can swim.\uFF08\u80FD\u529B\uFF09", "May I come in?\uFF08\u8BF7\u6C42\uFF09", "You should sleep early.\uFF08\u5EFA\u8BAE\uFF09"],
          tips: ["must not = \u7981\u6B62\uFF1Bdon't have to = \u4E0D\u5FC5\u8981\uFF08\u533A\u522B\u91CD\u8981\uFF01\uFF09", "could/might\u6BD4can/may\u66F4\u59D4\u5A49\u6216\u53EF\u80FD\u6027\u66F4\u5C0F"],
          tags: ["\u60C5\u6001\u52A8\u8BCD", "\u521D\u4E2D"]
        },
        {
          id: "g_m06",
          level: "middle",
          title: "\u72B6\u8BED\u4ECE\u53E5",
          rule: "\u65F6\u95F4/\u6761\u4EF6/\u539F\u56E0/\u7ED3\u679C + \u4E3B\u53E5",
          examples: ["When I was young, I liked swimming.", "If it rains, I will stay home.", "It was so hot that we stayed inside."],
          tips: ["\u6761\u4EF6\u72B6\u8BED\uFF1Aif\uFF08\u5982\u679C\uFF09\u3001unless\uFF08\u9664\u975E=if not\uFF09", "\u7ED3\u679C\uFF1Aso+adj+that / such+n+that", "\u65F6\u6001\uFF1A\u6761\u4EF6\u4ECE\u53E5\u7528\u4E00\u822C\u73B0\u5728\u65F6\u4EE3\u66FF\u5C06\u6765\u65F6"],
          tags: ["\u4ECE\u53E5", "\u72B6\u8BED", "\u521D\u4E2D"]
        },
        {
          id: "g_m07",
          level: "middle",
          title: "\u975E\u8C13\u8BED\u52A8\u8BCD",
          rule: "\u52A8\u540D\u8BCD(doing) / \u4E0D\u5B9A\u5F0F(to do) \u4F5C\u4E3B\u8BED\u5BBE\u8BED\u7B49",
          examples: ["Swimming is fun.\uFF08\u52A8\u540D\u8BCD\u4F5C\u4E3B\u8BED\uFF09", "I want to go.\uFF08\u4E0D\u5B9A\u5F0F\u4F5C\u5BBE\u8BED\uFF09", "She is good at singing.\uFF08\u4ECB\u8BCD\u540E\u7528doing\uFF09"],
          tips: ["enjoy/finish/mind/keep + doing", "want/hope/decide/plan + to do", "be good at / look forward to + doing"],
          tags: ["\u975E\u8C13\u8BED", "\u521D\u4E2D"]
        },
        {
          id: "g_m08",
          level: "middle",
          title: "\u865A\u62DF\u8BED\u6C14\uFF08\u57FA\u7840\uFF09",
          rule: "If + \u8FC7\u53BB\u5F0F\uFF0Cwould/could + \u52A8\u8BCD\u539F\u5F62\uFF08\u4E0E\u73B0\u5728\u76F8\u53CD\u7684\u5047\u8BBE\uFF09",
          examples: ["If I were a bird, I would fly.", "If I had money, I could buy it.", "I wish I were taller."],
          tips: ["if\u4ECE\u53E5\u4E2Dbe\u52A8\u8BCD\u7EDF\u4E00\u7528were\uFF08\u4E0D\u7BA1\u4E3B\u8BED\uFF09", "wish\u540E\u4E5F\u7528\u865A\u62DF\uFF1AI wish I knew the answer."],
          tags: ["\u865A\u62DF\u8BED\u6C14", "\u521D\u4E2D"]
        },
        // ---- 小学语法（扩充）----
        {
          id: "g_p09",
          level: "primary",
          title: "\u4E00\u822C\u7591\u95EE\u53E5\u4E0E\u7279\u6B8A\u7591\u95EE\u53E5",
          rule: "\u4E00\u822C\u7591\u95EE\u53E5\uFF1A\u52A9\u52A8\u8BCD\u63D0\u524D\uFF1B\u7279\u6B8A\u7591\u95EE\u53E5\uFF1A\u7591\u95EE\u8BCD + \u52A9\u52A8\u8BCD + \u4E3B\u8BED + \u52A8\u8BCD",
          examples: ["Do you like cats? \u2014 Yes, I do.", "Is she a student? \u2014 No, she isn't.", "What do you eat for breakfast?", "Where does he live?"],
          tips: ["\u4E00\u822C\u7591\u95EE\u53E5\u56DE\u7B54\u7528 Yes/No", "\u7279\u6B8A\u7591\u95EE\u8BCD\uFF1Awhat\u3001where\u3001when\u3001why\u3001who\u3001how", "how \u5F00\u5934\u4E5F\u5C5E\u4E8E\u7279\u6B8A\u7591\u95EE\u53E5"],
          tags: ["\u53E5\u578B", "\u7591\u95EE\u53E5", "\u5C0F\u5B66"]
        },
        {
          id: "g_p10",
          level: "primary",
          title: "\u7948\u4F7F\u53E5",
          rule: "\u52A8\u8BCD\u539F\u5F62\u5F00\u5934\uFF08\u7701\u7565\u4E3B\u8BED you\uFF09\uFF0C\u5426\u5B9A\uFF1ADon't + \u52A8\u8BCD\u539F\u5F62",
          examples: ["Open the door, please.", "Don't run in the classroom.", "Be quiet!", "Let's go to the park."],
          tips: ["please \u4F7F\u7948\u4F7F\u53E5\u66F4\u793C\u8C8C\uFF0C\u53EF\u7F6E\u4E8E\u53E5\u9996\u6216\u53E5\u5C3E", "Let's + \u52A8\u8BCD\u539F\u5F62 \u8868\u793A\u5EFA\u8BAE\u4E00\u8D77\u505A\u67D0\u4E8B", "\u5426\u5B9A\u5F62\u5F0F\uFF1ADon't forget your homework."],
          tags: ["\u53E5\u578B", "\u7948\u4F7F\u53E5", "\u5C0F\u5B66"]
        },
        {
          id: "g_p11",
          level: "primary",
          title: "\u611F\u53F9\u53E5",
          rule: "What + a/an + \u5F62\u5BB9\u8BCD + \u5355\u6570\u540D\u8BCD\uFF01/ How + \u5F62\u5BB9\u8BCD/\u526F\u8BCD + \u4E3B\u8C13\uFF01",
          examples: ["What a beautiful flower!", "What an interesting story!", "How fast she runs!", "How clever the boy is!"],
          tips: ["What \u540E\u63A5\u540D\u8BCD\u77ED\u8BED\uFF1AWhat + a/an + adj + \u5355\u6570\u540D\u8BCD / What + adj + \u590D\u6570\u6216\u4E0D\u53EF\u6570\u540D\u8BCD", "How \u540E\u63A5\u5F62\u5BB9\u8BCD\u6216\u526F\u8BCD\uFF0C\u4E3B\u8C13\u53EF\u7701\u7565", "What a day! \u4E5F\u662F\u611F\u53F9\u53E5\uFF08\u7701\u7565\u5F62\u5BB9\u8BCD\uFF09"],
          tags: ["\u53E5\u578B", "\u611F\u53F9\u53E5", "\u5C0F\u5B66"]
        },
        {
          id: "g_p12",
          level: "primary",
          title: "\u4EE3\u8BCD\u7528\u6CD5",
          rule: "\u4EBA\u79F0\u4EE3\u8BCD\uFF08\u4E3B\u683C/\u5BBE\u683C\uFF09/ \u7269\u4E3B\u4EE3\u8BCD\uFF08\u5F62\u5BB9\u8BCD\u6027/\u540D\u8BCD\u6027\uFF09/ \u53CD\u8EAB\u4EE3\u8BCD",
          examples: ["I love her. She loves me.\uFF08\u4E3B\u683C/\u5BBE\u683C\uFF09", "This is my book. This book is mine.\uFF08\u5F62\u5BB9\u8BCD\u6027/\u540D\u8BCD\u6027\uFF09", "He did it himself.\uFF08\u53CD\u8EAB\u4EE3\u8BCD\uFF09"],
          tips: ["\u4E3B\u683C\u505A\u4E3B\u8BED\uFF1AI / you / he / she / it / we / they", "\u5BBE\u683C\u505A\u5BBE\u8BED\uFF1Ame / you / him / her / it / us / them", "\u540D\u8BCD\u6027\u7269\u4E3B\u4EE3\u8BCD\u5355\u72EC\u4F7F\u7528\uFF1Amine / yours / his / hers / ours / theirs", "\u53CD\u8EAB\u4EE3\u8BCD\uFF1Amyself / yourself / himself / herself / itself / ourselves / themselves"],
          tags: ["\u4EE3\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p13",
          level: "primary",
          title: "\u4ECB\u8BCD\u7528\u6CD5",
          rule: "\u65F6\u95F4\u4ECB\u8BCD at/on/in\uFF1B\u5730\u70B9\u4ECB\u8BCD in/on/at/near/under\uFF1B\u65B9\u5F0F\u4ECB\u8BCD by/with",
          examples: ["at 8 o'clock / on Monday / in July / in 2020", "in the box / on the desk / at the door / near the school", "go to school by bus / write with a pen"],
          tips: ["\u65F6\u95F4\uFF1Aat + \u5177\u4F53\u65F6\u523B\uFF0Con + \u5177\u4F53\u67D0\u5929\uFF0Cin + \u6708\u4EFD/\u5E74\u4EFD/\u5B63\u8282", "\u5730\u70B9\uFF1Ain \u8868\u5728\u2026\u91CC\u9762\uFF0Con \u8868\u5728\u2026\u4E0A\u9762\uFF08\u63A5\u89E6\uFF09\uFF0Cat \u8868\u5728\u67D0\u5904\uFF08\u8F83\u5C0F\u5730\u70B9\uFF09", "\u65B9\u5F0F\uFF1Aby + \u4EA4\u901A\u5DE5\u5177\uFF08\u4E0D\u52A0\u51A0\u8BCD\uFF09\uFF0Cwith + \u5DE5\u5177"],
          tags: ["\u4ECB\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p14",
          level: "primary",
          title: "\u8FDE\u8BCD\u7528\u6CD5",
          rule: "\u5E76\u5217\u8FDE\u8BCD\uFF1Aand/but/or\uFF1B\u4ECE\u5C5E\u8FDE\u8BCD\uFF1Abecause/so/when/if",
          examples: ["I like cats and dogs.", "I want to go, but it's raining.", "Is it a cat or a dog?", "Because it rained, we stayed home.", "If you study hard, you will pass."],
          tips: ["and \u8868\u5E76\u5217\uFF1Bbut \u8868\u8F6C\u6298\uFF1Bor \u8868\u9009\u62E9", "because \u5F15\u5BFC\u539F\u56E0\uFF08\u4E0D\u4E0E so \u540C\u7528\uFF0C\u4E8C\u9009\u4E00\uFF09", "when \u5F15\u5BFC\u65F6\u95F4\u72B6\u8BED\u4ECE\u53E5\uFF1Bif \u5F15\u5BFC\u6761\u4EF6\u72B6\u8BED\u4ECE\u53E5", "so \u8868\u7ED3\u679C\uFF1AIt rained, so we stayed home."],
          tags: ["\u8FDE\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p15",
          level: "primary",
          title: "\u9891\u7387\u526F\u8BCD",
          rule: "always > usually > often > sometimes > never\uFF08\u653E\u5728 be \u52A8\u8BCD\u540E/\u5B9E\u4E49\u52A8\u8BCD\u524D\uFF09",
          examples: ["I always brush my teeth.", "She usually gets up at 7.", "He sometimes plays football.", "They never eat junk food."],
          tips: ["\u4F4D\u7F6E\uFF1Abe \u52A8\u8BCD\u4E4B\u540E\uFF0C\u5B9E\u4E49\u52A8\u8BCD\u4E4B\u524D", "always=100%\uFF1Busually=80%\uFF1Boften=60%\uFF1Bsometimes=40%\uFF1Bnever=0%", "\u53EF\u7528 How often \u63D0\u95EE\u9891\u7387\u526F\u8BCD"],
          tags: ["\u526F\u8BCD", "\u9891\u7387\u526F\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p16",
          level: "primary",
          title: "\u53EF\u6570\u540D\u8BCD\u4E0E\u4E0D\u53EF\u6570\u540D\u8BCD",
          rule: "\u53EF\u6570\u540D\u8BCD\u53EF\u52A0 a/an\uFF0C\u6709\u590D\u6570\uFF1B\u4E0D\u53EF\u6570\u540D\u8BCD\u4E0D\u52A0 a/an\uFF0C\u65E0\u590D\u6570\uFF0C\u7528 some/much/a lot of",
          examples: ["a book / two books\uFF08\u53EF\u6570\uFF09", "water / some water / a glass of water\uFF08\u4E0D\u53EF\u6570\uFF09", "I need some rice and two eggs."],
          tips: ["\u5E38\u89C1\u4E0D\u53EF\u6570\u540D\u8BCD\uFF1Awater\u3001milk\u3001bread\u3001rice\u3001money\u3001information\u3001advice\u3001weather", "\u4E0D\u53EF\u6570\u540D\u8BCD\u7528\u91CF\u8BCD\uFF1Aa cup of, a piece of, a bottle of", "much \u4FEE\u9970\u4E0D\u53EF\u6570\uFF1Bmany \u4FEE\u9970\u53EF\u6570\u590D\u6570"],
          tags: ["\u540D\u8BCD", "\u53EF\u6570\u4E0D\u53EF\u6570", "\u5C0F\u5B66"]
        },
        {
          id: "g_p17",
          level: "primary",
          title: "\u540D\u8BCD\u590D\u6570\u53D8\u5316\u89C4\u5219",
          rule: "\u89C4\u5219\u53D8\u5316\uFF1A+s / +es / \u53BBy\u52A0ies / +ves\uFF1B\u4E0D\u89C4\u5219\u53E6\u8BB0",
          examples: ["cat\u2192cats\uFF0Cbus\u2192buses\uFF0Cbaby\u2192babies\uFF0Cleaf\u2192leaves", "child\u2192children\uFF0Cman\u2192men\uFF0Ctooth\u2192teeth\uFF0Csheep\u2192sheep"],
          tips: ["\u4E00\u822C\u76F4\u63A5\u52A0 -s\uFF1Abooks, cats, dogs", "\u4EE5 s/x/sh/ch \u7ED3\u5C3E\u52A0 -es\uFF1Abuses, boxes, dishes", "\u8F85\u97F3+y \u7ED3\u5C3E\uFF1A\u53BBy\u52A0ies\uFF08baby\u2192babies\uFF09\uFF0C\u5143\u97F3+y \u76F4\u63A5\u52A0s\uFF08day\u2192days\uFF09", "\u4E0D\u89C4\u5219\uFF1Afoot\u2192feet\uFF0Cmouse\u2192mice\uFF0Cperson\u2192people"],
          tags: ["\u540D\u8BCD", "\u590D\u6570", "\u5C0F\u5B66"]
        },
        {
          id: "g_p18",
          level: "primary",
          title: "some \u4E0E any \u7684\u533A\u522B",
          rule: "some \u7528\u4E8E\u80AF\u5B9A\u53E5\uFF1Bany \u7528\u4E8E\u5426\u5B9A\u53E5\u548C\u7591\u95EE\u53E5\uFF08\u671F\u5F85\u80AF\u5B9A\u56DE\u7B54\u7684\u7591\u95EE\u53E5\u7528 some\uFF09",
          examples: ["I have some apples.\uFF08\u80AF\u5B9A\u53E5\uFF09", "I don't have any apples.\uFF08\u5426\u5B9A\u53E5\uFF09", "Do you have any questions?\uFF08\u7591\u95EE\u53E5\uFF09", "Would you like some tea?\uFF08\u671F\u5F85\u80AF\u5B9A\uFF0C\u7528some\uFF09"],
          tips: ["\u80AF\u5B9A\u53E5\u7528 some\uFF0C\u5426\u5B9A\u53E5\u548C\u4E00\u822C\u7591\u95EE\u53E5\u7528 any", "Would you like some...? \u662F\u9080\u8BF7/\u63D0\u8BAE\uFF0C\u7528 some", 'any \u5728\u80AF\u5B9A\u53E5\u4E2D\u8868\u793A"\u4EFB\u4F55\u4E00\u4E2A"\uFF1ATake any seat.'],
          tags: ["\u9650\u5B9A\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p19",
          level: "primary",
          title: "too / either / also \u533A\u522B",
          rule: 'too \u548C also \u8868"\u4E5F"\uFF08\u80AF\u5B9A\u53E5\uFF09\uFF1Beither \u8868"\u4E5F"\uFF08\u5426\u5B9A\u53E5\uFF09',
          examples: ["I like cats. She likes cats, too.", "I also like cats.\uFF08also \u5728\u52A8\u8BCD\u524D/be\u540E\uFF09", "I don't like cats. He doesn't like them, either."],
          tips: ["too\uFF1A\u653E\u53E5\u672B\uFF0C\u5E38\u7528\u9017\u53F7\u9694\u5F00\uFF1AI can swim, too.", "also\uFF1A\u653E\u5728\u52A9\u52A8\u8BCD/be \u4E4B\u540E\uFF0C\u5B9E\u4E49\u52A8\u8BCD\u4E4B\u524D", "either\uFF1A\u653E\u53E5\u672B\uFF0C\u7528\u4E8E\u5426\u5B9A\u53E5\uFF1AI can't swim, either."],
          tags: ["\u526F\u8BCD", "\u5C0F\u5B66"]
        },
        {
          id: "g_p20",
          level: "primary",
          title: "\u52A8\u8BCD\u4E0D\u5B9A\u5F0F\u57FA\u7840",
          rule: "to + \u52A8\u8BCD\u539F\u5F62\uFF0C\u4F5C\u5BBE\u8BED/\u76EE\u7684/\u4E3B\u8BED",
          examples: ["I want to go to the park.", "She likes to read books.", "I have to finish my homework.", "To learn English is important."],
          tips: ["want/like/hope/decide/plan/need + to do", "have to \u8868\u5FC5\u987B\uFF08have \u968F\u4EBA\u79F0\u548C\u65F6\u6001\u53D8\u5316\uFF09", "\u76EE\u7684\u72B6\u8BED\uFF1AI study hard to pass the exam.", "too...to...\uFF1Atoo tired to walk\uFF08\u592A\u2026\u800C\u4E0D\u80FD\uFF09"],
          tags: ["\u975E\u8C13\u8BED", "\u4E0D\u5B9A\u5F0F", "\u5C0F\u5B66"]
        },
        // ---- 初中语法（扩充）----
        {
          id: "g_m09",
          level: "middle",
          title: "\u73B0\u5728\u5B8C\u6210\u65F6 vs \u4E00\u822C\u8FC7\u53BB\u65F6",
          rule: "\u73B0\u5728\u5B8C\u6210\u65F6\u5F3A\u8C03\u5BF9\u73B0\u5728\u7684\u5F71\u54CD\uFF1B\u4E00\u822C\u8FC7\u53BB\u65F6\u5F3A\u8C03\u8FC7\u53BB\u67D0\u65F6\u95F4\u70B9",
          examples: ["I have lost my key.\uFF08\u73B0\u5728\u6CA1\u6709\uFF09vs I lost my key yesterday.\uFF08\u8FC7\u53BB\u65F6\u95F4\uFF09", "She has lived here for 3 years.\uFF08\u81F3\u4ECA\uFF09vs She lived here in 2010.\uFF08\u8FC7\u53BB\uFF0C\u5DF2\u4E0D\u5728\uFF09"],
          tips: ["\u6709\u5177\u4F53\u8FC7\u53BB\u65F6\u95F4\u72B6\u8BED\uFF08yesterday/last year/in 2020\uFF09\u7528\u4E00\u822C\u8FC7\u53BB\u65F6", "for + \u65F6\u95F4\u6BB5 / since + \u8D77\u70B9 + \u73B0\u5728\u5B8C\u6210\u65F6", "just/already/yet/ever/never \u5E38\u4E0E\u73B0\u5728\u5B8C\u6210\u65F6\u8FDE\u7528", "\u5F3A\u8C03\u7ED3\u679C\u662F\u5426\u5F71\u54CD\u73B0\u5728\u7528\u5B8C\u6210\u65F6"],
          tags: ["\u65F6\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m10",
          level: "middle",
          title: "\u8FC7\u53BB\u8FDB\u884C\u65F6",
          rule: "was/were + \u52A8\u8BCD-ing\uFF08\u8FC7\u53BB\u67D0\u65F6\u523B\u6B63\u5728\u8FDB\u884C\u7684\u52A8\u4F5C\uFF09",
          examples: ["I was reading at 8 last night.", "They were playing football when it rained.", "What were you doing at that time?"],
          tips: ["\u5E38\u4E0E\u5177\u4F53\u8FC7\u53BB\u65F6\u95F4\u70B9\u8FDE\u7528\uFF1Aat 9 o'clock yesterday", "when\u5F15\u5BFC\u7684\u65F6\u95F4\u4ECE\u53E5\uFF1A\u8FC7\u53BB\u8FDB\u884C\u65F6\u8868\u80CC\u666F\u52A8\u4F5C\uFF0C\u4E00\u822C\u8FC7\u53BB\u65F6\u8868\u4E2D\u65AD\u52A8\u4F5C", "when he called, I was having dinner.\uFF08\u6253\u7535\u8BDD\u65F6\u6211\u5728\u5403\u996D\uFF09"],
          tags: ["\u65F6\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m11",
          level: "middle",
          title: "\u8FC7\u53BB\u5B8C\u6210\u65F6",
          rule: "had + \u8FC7\u53BB\u5206\u8BCD\uFF08\u8FC7\u53BB\u67D0\u65F6\u95F4\u70B9\u4E4B\u524D\u5DF2\u53D1\u751F\u7684\u52A8\u4F5C\uFF09",
          examples: ["When I arrived, she had already left.", "He had studied English before he came to China.", "I found that I had lost my wallet."],
          tips: ['\u8868\u793A"\u8FC7\u53BB\u7684\u8FC7\u53BB"\uFF1A\u6BD4\u8FC7\u53BB\u67D0\u4E00\u65F6\u523B\u66F4\u65E9\u53D1\u751F\u7684\u52A8\u4F5C', "\u5E38\u4E0E before/after/when/by the time \u8FDE\u7528", "by the time + \u8FC7\u53BB\u65F6\u95F4\u4ECE\u53E5\uFF0C\u4E3B\u53E5\u7528\u8FC7\u53BB\u5B8C\u6210\u65F6"],
          tags: ["\u65F6\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m12",
          level: "middle",
          title: "\u5C06\u6765\u8FDB\u884C\u65F6",
          rule: "will be + \u52A8\u8BCD-ing\uFF08\u5C06\u6765\u67D0\u65F6\u523B\u6B63\u5728\u8FDB\u884C\u7684\u52A8\u4F5C\uFF09",
          examples: ["This time tomorrow, I will be flying to Beijing.", "Will you be using the car tonight?", "At 8 p.m., she will be sleeping."],
          tips: ["\u5F3A\u8C03\u5C06\u6765\u67D0\u65F6\u523B\u52A8\u4F5C\u6B63\u5728\u8FDB\u884C", "\u53EF\u8868\u793A\u793C\u8C8C\u8BE2\u95EE\uFF08\u6BD4 will you... \u66F4\u59D4\u5A49\uFF09\uFF1AWill you be attending the meeting?", "\u4E0E\u5C06\u6765\u65F6\u95F4\u72B6\u8BED\u8FDE\u7528\uFF1Athis time tomorrow, at this time next week"],
          tags: ["\u65F6\u6001", "\u521D\u4E2D"]
        },
        {
          id: "g_m13",
          level: "middle",
          title: "\u60C5\u6001\u52A8\u8BCD\u5B8C\u6574\u7528\u6CD5",
          rule: "must/have to/need/dare + \u52A8\u8BCD\u539F\u5F62\uFF1B\u8868\u4E49\u52A1\u3001\u5FC5\u8981\u3001\u9700\u8981\u3001\u6562\u4E8E",
          examples: ["You must be quiet in the library.\uFF08\u5185\u90E8\u4E49\u52A1\uFF09", "I have to finish this by Friday.\uFF08\u5916\u90E8\u4E49\u52A1\uFF09", "Need I attend the meeting? \u2014 No, you needn't.", "How dare you say that!"],
          tips: ["must\uFF1A\u4E3B\u89C2\u4E49\u52A1/\u5F3A\u70C8\u63A8\u65AD\uFF1Bhave to\uFF1A\u5BA2\u89C2\u5FC5\u987B\uFF08\u968F\u65F6\u6001\u53D8\u5316\uFF09", "must not \u7981\u6B62\uFF1Bdon't have to \u4E0D\u5FC5\uFF08\u533A\u522B\uFF01\uFF09", "need \u4F5C\u60C5\u6001\u52A8\u8BCD\uFF1A\u5426\u5B9A needn't\uFF0C\u7591\u95EE Need I...?\uFF1B\u4F5C\u5B9E\u4E49\u52A8\u8BCD\uFF1Aneed to do", "dare \u4F5C\u60C5\u6001\u52A8\u8BCD\uFF1A\u5426\u5B9A daren't\uFF0C\u7591\u95EE Dare he...?"],
          tags: ["\u60C5\u6001\u52A8\u8BCD", "\u521D\u4E2D"]
        },
        {
          id: "g_m14",
          level: "middle",
          title: "\u5F3A\u8C03\u53E5",
          rule: "It is/was + \u88AB\u5F3A\u8C03\u6210\u5206 + that/who + \u5176\u4F59\u90E8\u5206",
          examples: ["It was Tom who broke the window.\uFF08\u5F3A\u8C03\u4EBA\uFF09", "It was yesterday that I met her.\uFF08\u5F3A\u8C03\u65F6\u95F4\uFF09", "It is hard work that leads to success.\uFF08\u5F3A\u8C03\u4E3B\u8BED\uFF09"],
          tips: ["\u5F3A\u8C03\u4EBA\u7528 who \u6216 that\uFF0C\u5F3A\u8C03\u5176\u4ED6\u6210\u5206\u7528 that", "\u53BB\u6389 It is/was...that... \u540E\u53E5\u5B50\u4ECD\u5B8C\u6574", "\u7528 It was...that... \u6539\u5199\uFF1AI met her yesterday \u2192 It was yesterday that I met her.", "\u6CE8\u610F\u4E0E\u5B9A\u8BED\u4ECE\u53E5\u533A\u5206\uFF1A\u5F3A\u8C03\u53E5\u53BB\u6389\u540E\u4ECD\u6210\u53E5\uFF0C\u5B9A\u8BED\u4ECE\u53E5\u4E0D\u884C"],
          tags: ["\u53E5\u578B", "\u5F3A\u8C03\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m15",
          level: "middle",
          title: "\u5012\u88C5\u53E5",
          rule: "\u5426\u5B9A\u526F\u8BCD/Only \u4F4D\u4E8E\u53E5\u9996\u65F6\uFF0C\u4E3B\u8C13\u5012\u88C5\uFF08\u52A9\u52A8\u8BCD\u63D0\u524D\uFF09",
          examples: ["Never have I seen such a beautiful place.", "Not only did he come, but he also brought gifts.", "Only when you fail do you learn.", "So tired was she that she fell asleep at once."],
          tips: ["\u5426\u5B9A\u526F\u8BCD\u5F00\u5934\u5012\u88C5\uFF1Anever / seldom / hardly / not until / not only", "Only + \u72B6\u8BED\u5F00\u5934\uFF1AOnly then did I understand.", "So/Such \u5F00\u5934\uFF1ASo + adj + be + \u4E3B\u8BED\uFF08So cold was it that...\uFF09", "\u90E8\u5206\u5012\u88C5\uFF1A\u52A9\u52A8\u8BCD/be \u63D0\u5230\u4E3B\u8BED\u524D\uFF0C\u5B9E\u4E49\u52A8\u8BCD\u4E0D\u52A8"],
          tags: ["\u53E5\u578B", "\u5012\u88C5\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m16",
          level: "middle",
          title: "\u540D\u8BCD\u4ECE\u53E5",
          rule: "\u4E3B\u8BED\u4ECE\u53E5/\u8868\u8BED\u4ECE\u53E5/\u5BBE\u8BED\u4ECE\u53E5/\u540C\u4F4D\u8BED\u4ECE\u53E5\uFF0C\u5F15\u5BFC\u8BCD\uFF1Athat/if/whether/\u7591\u95EE\u8BCD",
          examples: ["What he said surprised us.\uFF08\u4E3B\u8BED\u4ECE\u53E5\uFF09", "The question is whether we can finish.\uFF08\u8868\u8BED\u4ECE\u53E5\uFF09", "The news that he passed makes me happy.\uFF08\u540C\u4F4D\u8BED\u4ECE\u53E5\uFF09"],
          tips: ["\u4E3B\u8BED\u4ECE\u53E5\u5E38\u7528 it \u4F5C\u5F62\u5F0F\u4E3B\u8BED\uFF1AIt is clear that he is right.", "\u8868\u8BED\u4ECE\u53E5\uFF1AThe problem is that nobody knows.", "\u540C\u4F4D\u8BED\u4ECE\u53E5\u89E3\u91CA\u540D\u8BCD\u5185\u5BB9\uFF0C\u5E38\u8DDF\u5728 news/fact/idea/question/doubt \u540E", "that \u5F15\u5BFC\u540C\u4F4D\u8BED\u4ECE\u53E5\u4E0D\u53EF\u7701\u7565"],
          tags: ["\u4ECE\u53E5", "\u540D\u8BCD\u4ECE\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m17",
          level: "middle",
          title: "\u975E\u9650\u5236\u6027\u5B9A\u8BED\u4ECE\u53E5",
          rule: "\u5148\u884C\u8BCD + \u9017\u53F7 + which/who + \u4ECE\u53E5\uFF08\u8865\u5145\u8BF4\u660E\uFF0C\u4E0D\u9650\u5B9A\u8303\u56F4\uFF09",
          examples: ["My mother, who is a doctor, works hard.", "Beijing, which is the capital of China, is beautiful.", "He passed the exam, which surprised everyone."],
          tips: ["\u975E\u9650\u5236\u6027\u5B9A\u8BED\u4ECE\u53E5\u524D\u540E\u6709\u9017\u53F7\uFF0Cwhich \u53EF\u6307\u6574\u4E2A\u4E3B\u53E5", "\u4E0D\u80FD\u7528 that\uFF0C\u53EA\u80FD\u7528 which\uFF08\u7269\uFF09\u6216 who\uFF08\u4EBA\uFF09", "\u53BB\u6389\u4ECE\u53E5\u540E\u4E3B\u53E5\u610F\u601D\u4ECD\u5B8C\u6574\uFF08\u53EA\u662F\u5C11\u4E86\u8865\u5145\u4FE1\u606F\uFF09", "which \u6307\u4EE3\u6574\u4E2A\u53E5\u5B50\uFF1AHe won, which made us happy."],
          tags: ["\u4ECE\u53E5", "\u5B9A\u8BED\u4ECE\u53E5", "\u521D\u4E2D"]
        },
        {
          id: "g_m18",
          level: "middle",
          title: "\u95F4\u63A5\u5F15\u8BED",
          rule: "\u76F4\u63A5\u5F15\u8BED \u2192 \u95F4\u63A5\u5F15\u8BED\uFF1A\u65F6\u6001\u540E\u9000\u4E00\u683C\uFF0C\u4EBA\u79F0/\u65F6\u95F4/\u5730\u70B9\u72B6\u8BED\u76F8\u5E94\u6539\u53D8",
          examples: ['"I am happy." \u2192 He said he was happy.\uFF08\u9648\u8FF0\u53E5\uFF09', '"Are you ready?" \u2192 She asked if I was ready.\uFF08\u4E00\u822C\u7591\u95EE\u53E5\uFF09', '"Come here!" \u2192 He told me to go there.\uFF08\u7948\u4F7F\u53E5\uFF09'],
          tips: ["\u65F6\u6001\u53D8\u5316\uFF1Aam/is\u2192was\uFF0Cwill\u2192would\uFF0Ccan\u2192could\uFF0Chave done\u2192had done", "\u4EBA\u79F0\u53D8\u5316\uFF1A\u770B\u903B\u8F91\uFF0C\u901A\u5E38\u7B2C\u4E00\u4EBA\u79F0\u53D8\u7B2C\u4E09\u4EBA\u79F0", "\u65F6\u95F4\u72B6\u8BED\uFF1Anow\u2192then\uFF0Ctoday\u2192that day\uFF0Cyesterday\u2192the day before\uFF0Ctomorrow\u2192the next day", "\u5730\u70B9\uFF1Ahere\u2192there\uFF1Bthis\u2192that\uFF1Bcome\u2192go"],
          tags: ["\u5F15\u8BED", "\u95F4\u63A5\u5F15\u8BED", "\u521D\u4E2D"]
        },
        {
          id: "g_m19",
          level: "middle",
          title: "\u52A8\u540D\u8BCD\u4E0E\u4E0D\u5B9A\u5F0F\u533A\u522B",
          rule: "\u63A5 doing\uFF08\u52A8\u540D\u8BCD\uFF09\uFF1Afinish/enjoy/mind/keep/avoid\uFF1B\u63A5 to do\uFF08\u4E0D\u5B9A\u5F0F\uFF09\uFF1Awant/hope/decide/plan\uFF1B\u63A5\u4E24\u8005\u610F\u4E49\u4E0D\u540C\uFF1Aremember/forget/stop/try",
          examples: ["I enjoy swimming.\uFF08enjoy\u53EA\u63A5doing\uFF09", "She decided to leave.\uFF08decide\u53EA\u63A5to do\uFF09", "Remember to lock the door.\uFF08\u8BB0\u5F97\u53BB\u505A\uFF09vs I remember locking it.\uFF08\u8BB0\u5F97\u66FE\u505A\uFF09"],
          tips: ["\u53EA\u63A5 doing\uFF1Aenjoy, finish, mind, keep, avoid, suggest, consider, practise", "\u53EA\u63A5 to do\uFF1Awant, hope, wish, decide, plan, agree, refuse, manage", "\u4E24\u8005\u5747\u53EF\u4F46\u610F\u4E49\u4E0D\u540C\uFF1Aremember/forget/stop/try/regret"],
          tags: ["\u975E\u8C13\u8BED", "\u52A8\u540D\u8BCD", "\u4E0D\u5B9A\u5F0F", "\u521D\u4E2D"]
        },
        {
          id: "g_m20",
          level: "middle",
          title: "\u8FC7\u53BB\u5206\u8BCD\u4F5C\u5B9A\u8BED\u4E0E\u72B6\u8BED",
          rule: "\u8FC7\u53BB\u5206\u8BCD\uFF08done\uFF09\u4F5C\u5B9A\u8BED\uFF1A\u653E\u540D\u8BCD\u524D/\u540E\uFF1B\u4F5C\u72B6\u8BED\uFF1A\u8868\u65F6\u95F4/\u539F\u56E0/\u6761\u4EF6/\u4F34\u968F\uFF08\u88AB\u52A8\u542B\u4E49\uFF09",
          examples: ["the broken window\uFF08\u524D\u7F6E\u5B9A\u8BED\uFF09", "the letter written by my friend\uFF08\u540E\u7F6E\u5B9A\u8BED\uFF09", "Given more time, I could do better.\uFF08\u6761\u4EF6\uFF09", "Seen from above, the city looks beautiful.\uFF08\u65F6\u95F4/\u6761\u4EF6\uFF09"],
          tips: ["\u8FC7\u53BB\u5206\u8BCD\u4F5C\u5B9A\u8BED\u8868\u88AB\u52A8\u6216\u5B8C\u6210\uFF1Aa closed door\uFF08\u88AB\u5173\u4E0A\u7684\u95E8\uFF09", "\u5355\u4E2A\u8FC7\u53BB\u5206\u8BCD\u524D\u7F6E\uFF0C\u77ED\u8BED\u540E\u7F6E", "\u4F5C\u72B6\u8BED\u65F6\uFF0C\u5206\u8BCD\u7684\u903B\u8F91\u4E3B\u8BED\u5FC5\u987B\u4E0E\u4E3B\u53E5\u4E3B\u8BED\u4E00\u81F4", "\u533A\u5206\uFF1A\u73B0\u5728\u5206\u8BCD\u4F5C\u5B9A\u8BED\uFF08\u4E3B\u52A8/\u8FDB\u884C\uFF09vs \u8FC7\u53BB\u5206\u8BCD\uFF08\u88AB\u52A8/\u5B8C\u6210\uFF09"],
          tags: ["\u975E\u8C13\u8BED", "\u8FC7\u53BB\u5206\u8BCD", "\u521D\u4E2D"]
        },
        {
          id: "g_m21",
          level: "middle",
          title: "\u73B0\u5728\u5206\u8BCD\u4F5C\u5B9A\u8BED\u4E0E\u72B6\u8BED",
          rule: "\u73B0\u5728\u5206\u8BCD\uFF08doing\uFF09\u4F5C\u5B9A\u8BED\uFF1A\u8868\u4E3B\u52A8/\u8FDB\u884C\uFF1B\u4F5C\u72B6\u8BED\uFF1A\u8868\u65F6\u95F4/\u539F\u56E0/\u7ED3\u679C/\u4F34\u968F",
          examples: ["the running water\uFF08\u6D41\u52A8\u7684\u6C34\uFF0C\u524D\u7F6E\uFF09", "the boy standing there\uFF08\u7AD9\u5728\u90A3\u91CC\u7684\u7537\u5B69\uFF0C\u540E\u7F6E\uFF09", "Seeing the teacher, he stood up.\uFF08\u65F6\u95F4\uFF1A\u4E00\u770B\u5230\uFF09", "Not knowing the answer, she kept quiet.\uFF08\u539F\u56E0\uFF09"],
          tips: ["\u73B0\u5728\u5206\u8BCD\u4F5C\u5B9A\u8BED\uFF1A\u4E3B\u52A8\u542B\u4E49\uFF0C\u5355\u4E2A\u524D\u7F6E\uFF0C\u77ED\u8BED\u540E\u7F6E", "\u4F5C\u72B6\u8BED\u65F6\uFF0C\u5206\u8BCD\u903B\u8F91\u4E3B\u8BED\u987B\u4E0E\u4E3B\u53E5\u4E3B\u8BED\u4E00\u81F4", "\u8868\u65F6\u95F4\uFF08\u5F53\u2026\u65F6\uFF09\u3001\u539F\u56E0\uFF08\u56E0\u4E3A\u2026\uFF09\u3001\u7ED3\u679C\uFF08\u5BFC\u81F4\u2026\uFF0C\u7528 resulting in\uFF09\u3001\u4F34\u968F\uFF08\u540C\u65F6\u2026\uFF09", "\u5426\u5B9A\u5F62\u5F0F\uFF1ANot knowing / Having not done"],
          tags: ["\u975E\u8C13\u8BED", "\u73B0\u5728\u5206\u8BCD", "\u521D\u4E2D"]
        },
        {
          id: "g_m22",
          level: "middle",
          title: "\u72EC\u7ACB\u4E3B\u683C\u7ED3\u6784",
          rule: "\u540D\u8BCD/\u4EE3\u8BCD + \u975E\u8C13\u8BED\u52A8\u8BCD\uFF08doing/done/to do\uFF09\u6216\u5F62\u5BB9\u8BCD/\u526F\u8BCD\uFF0C\u6574\u4F53\u4F5C\u72B6\u8BED",
          examples: ["Weather permitting, we will go on a picnic.\uFF08\u6761\u4EF6\uFF09", "The work done, he went home.\uFF08\u65F6\u95F4\uFF0Cwork\u88AB\u5B8C\u6210\uFF09", "He sat there, his eyes closed.\uFF08\u4F34\u968F\uFF0C\u773C\u775B\u88AB\u95ED\u4E0A\uFF09"],
          tips: ['\u72EC\u7ACB\u4E3B\u683C\u7684"\u4E3B\u8BED"\u4E0E\u4E3B\u53E5\u4E3B\u8BED\u4E0D\u540C\uFF0C\u662F\u72EC\u7ACB\u7684\u903B\u8F91\u4E3B\u8BED', "\u5206\u8BCD\u4E0E\u5176\u903B\u8F91\u4E3B\u8BED\u4E4B\u95F4\u662F\u4E3B\u52A8\u5173\u7CFB\u7528 doing\uFF0C\u88AB\u52A8\u5173\u7CFB\u7528 done", "\u5E38\u89C1\u7ED3\u6784\uFF1A\u540D\u8BCD+done \u6216 \u540D\u8BCD+doing", "with \u590D\u5408\u7ED3\u6784\u662F\u72EC\u7ACB\u4E3B\u683C\u7684\u53D8\u4F53\uFF1Awith + \u540D\u8BCD + \u5206\u8BCD/\u5F62\u5BB9\u8BCD/\u526F\u8BCD"],
          tags: ["\u975E\u8C13\u8BED", "\u72EC\u7ACB\u4E3B\u683C", "\u521D\u4E2D"]
        },
        {
          id: "g_m23",
          level: "middle",
          title: "with \u590D\u5408\u7ED3\u6784",
          rule: "with + \u540D\u8BCD/\u4EE3\u8BCD + \u5206\u8BCD/\u5F62\u5BB9\u8BCD/\u526F\u8BCD/\u4E0D\u5B9A\u5F0F\uFF0C\u8868\u4F34\u968F\u72B6\u6001",
          examples: ["He sat there with his eyes closed.\uFF08\u773C\u775B\u88AB\u95ED\u4E0A\uFF0Cclosed\uFF09", "She walked in with a book in her hand.\uFF08\u526F\u8BCD\u77ED\u8BED\uFF09", "With so much work to do, I can't go out.\uFF08to do\u8868\u5F85\u5B8C\u6210\uFF09"],
          tips: ["with + n + doing\uFF1A\u540D\u8BCD\u4E0E\u52A8\u8BCD\u662F\u4E3B\u52A8\u5173\u7CFB\uFF08\u773C\u775B\u7741\u7740 with eyes open/opening\uFF09", "with + n + done\uFF1A\u540D\u8BCD\u4E0E\u52A8\u8BCD\u662F\u88AB\u52A8\u5173\u7CFB\uFF08\u4E66\u88AB\u6253\u5F00 with the book opened\uFF09", "with + n + adj/adv/prep phrase\uFF1A\u63CF\u8FF0\u72B6\u6001", "\u5E38\u4F5C\u4F34\u968F\u72B6\u8BED\uFF0C\u8868\u793A\u540C\u65F6\u8FDB\u884C\u7684\u72B6\u6001"],
          tags: ["\u53E5\u578B", "with\u590D\u5408\u7ED3\u6784", "\u521D\u4E2D"]
        },
        {
          id: "g_m24",
          level: "middle",
          title: "\u6BD4\u8F83\u7EA7\u7279\u6B8A\u7528\u6CD5",
          rule: "the more...the more...\uFF1B\u500D\u6570\u6BD4\u8F83\uFF1B\u5426\u5B9A\u8BCD+\u6BD4\u8F83\u7EA7=\u6700\u9AD8\u7EA7",
          examples: ["The harder you work, the better results you get.", "This room is twice as large as that one.\uFF08\u500D\u6570as...as\uFF09", "Nothing is more important than health.\uFF08\u5426\u5B9A+\u6BD4\u8F83\u7EA7=\u6700\u9AD8\u7EA7\uFF09"],
          tips: ["the + \u6BD4\u8F83\u7EA7\uFF0Cthe + \u6BD4\u8F83\u7EA7\uFF1A\u968F\u7740\u2026\u8D8A\u6765\u8D8A\u2026", "\u500D\u6570\u8868\u8FBE\uFF1Atwice / three times + as + \u539F\u7EA7 + as", "\u5426\u5B9A\u8BCD+\u6BD4\u8F83\u7EA7 = \u6700\u9AD8\u7EA7\u542B\u4E49\uFF1ANothing is worse than...", "more and more + adj\uFF1A\u8D8A\u6765\u8D8A\u2026\uFF08\u7A0B\u5EA6\u9012\u589E\uFF09"],
          tags: ["\u5F62\u5BB9\u8BCD", "\u6BD4\u8F83\u7EA7", "\u521D\u4E2D"]
        },
        {
          id: "g_m25",
          level: "middle",
          title: "\u865A\u62DF\u8BED\u6C14\u5B8C\u6574\u7528\u6CD5",
          rule: "\u4E0E\u73B0\u5728\u76F8\u53CD\uFF1Aif+\u8FC7\u53BB\u5F0F\uFF0Cwould do\uFF1B\u4E0E\u8FC7\u53BB\u76F8\u53CD\uFF1Aif+had done\uFF0Cwould have done\uFF1Bwish/would rather/as if\u4E5F\u7528\u865A\u62DF",
          examples: ["If I were you, I would study harder.\uFF08\u4E0E\u73B0\u5728\u76F8\u53CD\uFF09", "If I had studied, I would have passed.\uFF08\u4E0E\u8FC7\u53BB\u76F8\u53CD\uFF09", "I wish I could fly.\uFF08wish+\u8FC7\u53BB\u5F0F\uFF09", "She talks as if she knew everything.\uFF08as if+\u865A\u62DF\uFF09"],
          tips: ["\u73B0\u5728\u865A\u62DF\uFF1Aif\u4ECE\u53E5\u7528\u8FC7\u53BB\u5F0F\uFF08be\u7EDF\u4E00\u7528were\uFF09\uFF1B\u4E3B\u53E5\u7528would/could/might + do", "\u8FC7\u53BB\u865A\u62DF\uFF1Aif\u4ECE\u53E5\u7528had done\uFF1B\u4E3B\u53E5\u7528would/could/might + have done", "\u6DF7\u5408\u865A\u62DF\uFF1Aif I had done\uFF08\u8FC7\u53BB\uFF09...I would be...\uFF08\u73B0\u5728\u7ED3\u679C\uFF09", "wish\u540E\u63A5\u8FC7\u53BB\u5F0F\uFF08\u73B0\u5728\u613F\u671B\uFF09\u6216had done\uFF08\u8FC7\u53BB\u9057\u61BE\uFF09\u6216would do\uFF08\u5C06\u6765\u671F\u671B\uFF09"],
          tags: ["\u865A\u62DF\u8BED\u6C14", "\u521D\u4E2D"]
        },
        {
          id: "g_m26",
          level: "middle",
          title: "\u7701\u7565\u53E5\u4E0E\u66FF\u4EE3",
          rule: "\u907F\u514D\u91CD\u590D\uFF0C\u7528 do so / one / it / so \u7B49\u66FF\u4EE3\uFF1B\u7701\u7565\u76F8\u540C\u6210\u5206",
          examples: ["\u2014 Will you go? \u2014 Yes, I will.\uFF08\u7701\u7565 go\uFF09", "I want to go but she doesn't want to.\uFF08\u7701\u7565 go\uFF09", "I lost my pen. I need to buy one.\uFF08one\u66FF\u4EE3\u53EF\u6570\u5355\u6570\uFF09", "\u2014 Is he happy? \u2014 I think so.\uFF08so\u66FF\u4EE3\u4ECE\u53E5\uFF09"],
          tips: ["do so / do it\uFF1A\u66FF\u4EE3\u52A8\u8BCD\u77ED\u8BED\uFF08do so \u66F4\u6B63\u5F0F\uFF09", "one/ones\uFF1A\u66FF\u4EE3\u53EF\u6570\u540D\u8BCD\uFF08\u4E0D\u5B9A\u6307\uFF09\uFF1Bit\uFF1A\u66FF\u4EE3\u7279\u6307\u540D\u8BCD", "so/not\uFF1A\u66FF\u4EE3 that \u4ECE\u53E5\uFF1AI think so. / I hope not.", "\u7701\u7565\uFF1A\u6761\u4EF6\u4ECE\u53E5\u53EF\u7701\u7565 if\uFF08\u7528\u5012\u88C5\u4EE3\u66FF\uFF09\uFF1AHad I known... = If I had known..."],
          tags: ["\u53E5\u578B", "\u7701\u7565", "\u521D\u4E2D"]
        },
        {
          id: "g_m27",
          level: "middle",
          title: "\u60C5\u666F\u4EA4\u9645\u5E38\u7528\u8868\u8FBE",
          rule: "\u9053\u6B49/\u611F\u8C22/\u5EFA\u8BAE/\u9080\u8BF7/\u62D2\u7EDD\u7684\u56FA\u5B9A\u53E5\u5F0F",
          examples: ["I'm sorry for being late. \u2014 That's all right.\uFF08\u9053\u6B49\uFF09", "Thank you so much! \u2014 You're welcome. / My pleasure.\uFF08\u611F\u8C22\uFF09", "Why not join us? / Shall we...? / What about...?\uFF08\u5EFA\u8BAE\uFF09", "Would you like to...? \u2014 I'd love to, but...\uFF08\u9080\u8BF7/\u6709\u793C\u8C8C\u7684\u62D2\u7EDD\uFF09"],
          tips: ["\u9053\u6B49\uFF1ASorry / I'm sorry / I apologize\uFF1B\u56DE\u5E94\uFF1ANever mind / That's OK / It's nothing", "\u611F\u8C22\uFF1AThanks / Thank you / I really appreciate it\uFF1B\u56DE\u5E94\uFF1AYou're welcome / Not at all", "\u5EFA\u8BAE\uFF1AWhy not + do / How about + doing / I suggest\uFF08that\uFF09you...", "\u9080\u8BF7\uFF1AWould you like to... / Would you come to...\uFF1B\u62D2\u7EDD\uFF1AI'd like to, but... / I'm afraid I can't..."],
          tags: ["\u4EA4\u9645", "\u53E5\u578B", "\u521D\u4E2D"]
        },
        {
          id: "g_m28",
          level: "middle",
          title: "\u5E38\u89C1\u53E5\u578B\u8F6C\u6362",
          rule: "\u4E3B\u52A8\u2194\u88AB\u52A8\uFF1B\u80AF\u5B9A\u2194\u5426\u5B9A\uFF1B\u76F4\u63A5\u5F15\u8BED\u2194\u95F4\u63A5\u5F15\u8BED\uFF1B\u7B80\u5355\u53E5\u2194\u590D\u5408\u53E5",
          examples: ["Tom wrote the letter. \u2192 The letter was written by Tom.\uFF08\u4E3B\u52A8\u2192\u88AB\u52A8\uFF09", "It is so cold that we can't go out. \u2192 It is too cold to go out.\uFF08so...that\u2192too...to\uFF09", "He is the tallest. \u2192 No one is taller than him.\uFF08\u6700\u9AD8\u7EA7\u2192\u6BD4\u8F83\u7EA7\uFF09"],
          tips: ["too...to... = so...that...not\uFF1A\u592A\u2026\u4EE5\u81F3\u4E8E\u4E0D\u80FD\u2026", "enough to = so...that... + can/could\uFF1A\u8DB3\u591F\u2026\u4EE5\u81F3\u4E8E\u80FD\u2026", "\u9AD8\u7EA7\u2192\u6BD4\u8F83\u7EA7\uFF1Athe tallest = taller than any other person", "\u542B\u4E49\u76F8\u540C\u53E5\u578B\u8F6C\u6362\uFF1Abecause \u2192 as/since\uFF1Balthough \u2192 though\uFF1Bnot...until \u2192 only when"],
          tags: ["\u53E5\u578B\u8F6C\u6362", "\u521D\u4E2D"]
        }
      ];
    }
  });

  // app/pinyin.js
  var pinyin_exports = {};
  __export(pinyin_exports, {
    initPinyin: () => initPinyin,
    openPinyinPage: () => openPinyinPage
  });
  function escapeHtml3(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  async function initPinyin() {
    if (_data) {
      renderPinyinHome();
      return;
    }
    try {
      const res = await fetch("data/builtin/chinese/pinyin.json");
      if (!res.ok) throw new Error("\u62FC\u97F3\u6570\u636E\u52A0\u8F7D\u5931\u8D25");
      _data = await res.json();
      window._pinyinData = _data;
    } catch (e) {
      console.warn("pinyin load error", e);
      return;
    }
    window._renderPinyinToElement = function(el, mode, grade) {
      _currentMode = mode || "table";
      _gradeFilter = grade || "all";
      if (mode === "table") renderInitialFinalTable(el);
      else if (mode === "tones") renderTonesSection(el);
      else if (mode === "poly") renderPolyphoneSection(el);
      else if (mode === "p2w") renderPinyinToWordQuiz(el);
      else if (mode === "w2p") renderWordToPinyinQuiz(el);
    };
    bindPinyinEvents();
    renderPinyinHome();
  }
  function bindPinyinEvents() {
    document.querySelectorAll(".py-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".py-mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _currentMode = btn.dataset.mode;
        const gradeRow = document.getElementById("py-grade-row");
        if (gradeRow) gradeRow.style.display = _currentMode === "p2w" || _currentMode === "w2p" ? "flex" : "none";
        renderPinyinHome();
      });
    });
    document.querySelectorAll(".py-grade-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".py-grade-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _gradeFilter = btn.dataset.grade;
        if (_currentMode === "p2w" || _currentMode === "w2p") renderPinyinHome();
      });
    });
    $2("btn-pinyin-back")?.addEventListener("click", () => {
      window._goBack?.();
    });
  }
  function openPinyinPage() {
    if (window._showPage) {
      window._showPage("pinyin");
    } else {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      $2("page-pinyin")?.classList.add("active");
    }
    initPinyin();
  }
  function renderPinyinHome() {
    const body = $2("pinyin-body");
    if (!body || !_data) return;
    if (_currentMode === "table") renderInitialFinalTable(body);
    else if (_currentMode === "p2w") renderPinyinToWordQuiz(body);
    else if (_currentMode === "w2p") renderWordToPinyinQuiz(body);
    else if (_currentMode === "poly") renderPolyphoneSection(body);
    else if (_currentMode === "tones") renderTonesSection(body);
  }
  function renderInitialFinalTable(body) {
    const tones = _data.tones;
    body.innerHTML = `
    <!-- \u58F0\u6BCD -->
    <div class="py-section">
      <div class="py-section-title">\u58F0\u6BCD\uFF0821\u4E2A\uFF09</div>
      <div class="py-initials-grid">
        ${_data.initials.cards.map((c) => `
          <button class="py-initial-card" data-initial="${c.initial}">
            <div class="py-char">${escapeHtml3(c.initial)}</div>
            <div class="py-example-small">${escapeHtml3(c.example.split(" ")[0])}</div>
          </button>`).join("")}
      </div>
    </div>

    <!-- \u97F5\u6BCD -->
    <div class="py-section">
      <div class="py-section-title">\u97F5\u6BCD\uFF0836\u4E2A\uFF09</div>
      ${_data.finals.groups.map((g) => `
        <div class="py-group-label">${escapeHtml3(g.name)}</div>
        <div class="py-finals-grid">
          ${g.items.map((f) => `
            <button class="py-final-card" data-final="${f}">
              <div class="py-char">${escapeHtml3(f)}</div>
            </button>`).join("")}
        </div>`).join("")}
    </div>

    <!-- \u58F0\u8C03\u89C4\u5219 -->
    <div class="py-section">
      <div class="py-section-title">\u58F0\u8C03\u53E3\u8BC0</div>
      ${tones.tone_rules.map((r) => `
        <div class="py-rule-item">\u{1F4CC} ${escapeHtml3(r)}</div>`).join("")}
    </div>

    <!-- \u56DB\u58F0\u5BF9\u6BD4 -->
    <div class="py-section">
      <div class="py-section-title">\u56DB\u58F0\u7EC3\u4E60</div>
      <div class="py-tones-grid">
        ${tones.rules.map((t) => `
          <div class="py-tone-card">
            <div class="py-tone-mark">${escapeHtml3(t.mark)}</div>
            <div class="py-tone-name">${escapeHtml3(t.name)}</div>
            <div class="py-tone-desc">${escapeHtml3(t.desc)}</div>
            <div class="py-tone-ex">${escapeHtml3(t.example)}</div>
            <button class="py-speak-btn" data-text="${escapeHtml3(t.example.split("\uFF0C")[0])}">\u{1F50A}</button>
          </div>`).join("")}
      </div>
    </div>
  `;
    body.querySelectorAll(".py-initial-card").forEach((btn) => {
      btn.addEventListener("click", () => showInitialDetail(btn.dataset.initial));
    });
    body.querySelectorAll(".py-final-card").forEach((btn) => {
      btn.addEventListener("click", () => showFinalDetail(btn.dataset.final));
    });
    body.querySelectorAll(".py-speak-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        speakChinese(btn.dataset.text, 0.8);
      });
    });
  }
  function showInitialDetail(initial) {
    const card = _data.initials.cards.find((c) => c.initial === initial);
    if (!card) return;
    showDetailPopup(`
    <div class="py-detail-title">${escapeHtml3(card.initial)}</div>
    <div class="py-detail-tip">\u53D1\u97F3\u8981\u9886\uFF1A${escapeHtml3(card.tip)}</div>
    <div class="py-detail-example">\u4F8B\u8BCD\uFF1A${escapeHtml3(card.example)}</div>
    <button class="btn-primary py-detail-speak" data-text="${escapeHtml3(card.example.split(" ")[0])}">\u{1F50A} \u6717\u8BFB\u4F8B\u8BCD</button>
  `);
  }
  function showFinalDetail(final) {
    const card = _data.finals.cards.find((c) => c.final === final);
    if (!card) return;
    const toneHtml = card.tone_examples ? `<div class="py-tone-row">${card.tone_examples.map((t) => `<span class="py-tone-ex-item">${escapeHtml3(t)}</span>`).join("")}</div>` : "";
    showDetailPopup(`
    <div class="py-detail-title">${escapeHtml3(final)}</div>
    <div class="py-detail-example">\u4F8B\u5B57\uFF1A${escapeHtml3(card.example)}</div>
    ${toneHtml}
    <button class="btn-primary py-detail-speak" data-text="${escapeHtml3(card.example.split(" ")[1] || card.example)}">\u{1F50A} \u6717\u8BFB</button>
  `);
  }
  function showDetailPopup(html) {
    let overlay = $2("py-detail-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "py-detail-overlay";
      overlay.className = "py-detail-overlay";
      overlay.innerHTML = `<div class="py-detail-box" id="py-detail-box"></div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.add("hidden");
      });
    }
    $2("py-detail-box").innerHTML = html + `<button class="btn-secondary py-detail-close" style="width:100%;margin-top:12px">\u5173\u95ED</button>`;
    overlay.classList.remove("hidden");
    $2("py-detail-box").querySelector(".py-detail-speak")?.addEventListener("click", (e) => {
      speakChinese(e.currentTarget.dataset.text, 0.8);
    });
    $2("py-detail-box").querySelector(".py-detail-close")?.addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
  }
  function renderPinyinToWordQuiz(body) {
    let items = _data.pinyin_to_word.items;
    if (_gradeFilter !== "all") items = items.filter((i) => i.grade === _gradeFilter);
    if (!items.length) {
      body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">\u8BE5\u5E74\u7EA7\u6682\u65E0\u9898\u76EE</p>';
      return;
    }
    _currentItems = [...items].sort(() => Math.random() - 0.5);
    _currentIdx = 0;
    _score = { correct: 0, wrong: 0 };
    renderP2WCard(body);
  }
  function renderP2WCard(body) {
    const item = _currentItems[_currentIdx];
    if (!item) {
      renderQuizResult(body);
      return;
    }
    const total = _currentItems.length;
    const allWords = _data.pinyin_to_word.items.map((i) => i.word);
    let options = [item.word];
    while (options.length < 4) {
      const rand = allWords[Math.floor(Math.random() * allWords.length)];
      if (!options.includes(rand)) options.push(rand);
    }
    options = options.sort(() => Math.random() - 0.5);
    body.innerHTML = `
    <div class="py-quiz-progress">${_currentIdx + 1} / ${total}
      <span style="float:right">\u2705${_score.correct} \u274C${_score.wrong}</span>
    </div>
    <div class="py-quiz-card">
      <div class="py-quiz-label">\u770B\u62FC\u97F3\uFF0C\u9009\u8BCD\u8BED</div>
      <div class="py-pinyin-big">${escapeHtml3(item.pinyin)}</div>
      ${item.hint ? `<div class="py-quiz-hint">\u{1F4A1} ${escapeHtml3(item.hint)}</div>` : ""}
      <button class="py-speak-pinyin" data-text="${escapeHtml3(item.word)}">\u{1F50A} \u542C\u8BFB\u97F3</button>
    </div>
    <div class="py-options-grid">
      ${options.map((opt) => `
        <button class="py-option-btn" data-word="${escapeHtml3(opt)}" data-correct="${opt === item.word}">
          ${escapeHtml3(opt)}
        </button>`).join("")}
    </div>
    <button class="btn-secondary py-skip-btn" style="margin:12px 16px">\u8DF3\u8FC7</button>
  `;
    body.querySelector(".py-speak-pinyin")?.addEventListener("click", () => speakChinese(item.word, 0.8));
    body.querySelectorAll(".py-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        body.querySelectorAll(".py-option-btn").forEach((b) => {
          b.disabled = true;
          if (b.dataset.correct === "true") b.classList.add("py-correct");
          else if (b === btn && !correct) b.classList.add("py-wrong");
        });
        if (correct) {
          _score.correct++;
          speakChinese(item.word, 0.8);
        } else _score.wrong++;
        setTimeout(() => {
          _currentIdx++;
          renderP2WCard(body);
        }, 1200);
      });
    });
    body.querySelector(".py-skip-btn")?.addEventListener("click", () => {
      _currentIdx++;
      renderP2WCard(body);
    });
  }
  function renderWordToPinyinQuiz(body) {
    let items = _data.word_to_pinyin.items;
    if (_gradeFilter !== "all") items = items.filter((i) => i.grade === _gradeFilter);
    if (!items.length) {
      body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">\u8BE5\u5E74\u7EA7\u6682\u65E0\u9898\u76EE</p>';
      return;
    }
    _currentItems = [...items].sort(() => Math.random() - 0.5);
    _currentIdx = 0;
    _score = { correct: 0, wrong: 0 };
    renderW2PCard(body);
  }
  function renderW2PCard(body) {
    const item = _currentItems[_currentIdx];
    if (!item) {
      renderQuizResult(body);
      return;
    }
    const total = _currentItems.length;
    let options = [item.pinyin, ...item.wrong_options || []].slice(0, 4);
    while (options.length < 4) {
      const rand = _data.word_to_pinyin.items[Math.floor(Math.random() * _data.word_to_pinyin.items.length)].pinyin;
      if (!options.includes(rand)) options.push(rand);
    }
    options = options.sort(() => Math.random() - 0.5);
    const polyBadge = item.polyphone ? `<span class="py-poly-badge">\u591A\u97F3\u5B57\uFF1A${escapeHtml3(item.polyphone)}</span>` : "";
    body.innerHTML = `
    <div class="py-quiz-progress">${_currentIdx + 1} / ${total}
      <span style="float:right">\u2705${_score.correct} \u274C${_score.wrong}</span>
    </div>
    <div class="py-quiz-card">
      <div class="py-quiz-label">\u770B\u8BCD\u8BED\uFF0C\u9009\u62FC\u97F3${polyBadge}</div>
      <div class="py-word-big">${escapeHtml3(item.word)}</div>
      <button class="py-speak-pinyin" data-text="${escapeHtml3(item.word)}">\u{1F50A} \u542C\u8BFB\u97F3</button>
    </div>
    <div class="py-options-grid">
      ${options.map((opt) => `
        <button class="py-option-btn py-pinyin-opt" data-pinyin="${escapeHtml3(opt)}" data-correct="${opt === item.pinyin}">
          ${escapeHtml3(opt)}
        </button>`).join("")}
    </div>
    <button class="btn-secondary py-skip-btn" style="margin:12px 16px">\u8DF3\u8FC7</button>
  `;
    body.querySelector(".py-speak-pinyin")?.addEventListener("click", () => speakChinese(item.word, 0.8));
    body.querySelectorAll(".py-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        body.querySelectorAll(".py-option-btn").forEach((b) => {
          b.disabled = true;
          if (b.dataset.correct === "true") b.classList.add("py-correct");
          else if (b === btn && !correct) b.classList.add("py-wrong");
        });
        if (correct) {
          _score.correct++;
          speakChinese(item.word, 0.8);
        } else _score.wrong++;
        setTimeout(() => {
          _currentIdx++;
          renderW2PCard(body);
        }, 1200);
      });
    });
    body.querySelector(".py-skip-btn")?.addEventListener("click", () => {
      _currentIdx++;
      renderW2PCard(body);
    });
  }
  function renderPolyphoneSection(body) {
    const chars = _data.polyphones.chars;
    body.innerHTML = `
    <div class="py-section">
      <div class="py-section-title">\u591A\u97F3\u5B57\uFF08${chars.length}\u4E2A\u5E38\u7528\u5B57\uFF09</div>
      <p style="font-size:12px;color:var(--color-text-sub);padding:0 4px 12px">\u540C\u4E00\u4E2A\u5B57\u6839\u636E\u4E0D\u540C\u8BED\u5883\u6709\u4E0D\u540C\u8BFB\u97F3\uFF0C\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5</p>
      <div class="py-poly-list">
        ${chars.map((c) => `
          <button class="py-poly-item" data-char="${escapeHtml3(c.char)}">
            <span class="py-poly-char">${escapeHtml3(c.char)}</span>
            <span class="py-poly-pinyins">${c.readings.map((r) => escapeHtml3(r.pinyin)).join(" / ")}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
    body.querySelectorAll(".py-poly-item").forEach((btn) => {
      btn.addEventListener("click", () => showPolyphoneDetail(btn.dataset.char));
    });
  }
  function showPolyphoneDetail(char) {
    const c = _data.polyphones.chars.find((x) => x.char === char);
    if (!c) return;
    const html = `
    <div class="py-detail-title" style="font-size:48px">${escapeHtml3(c.char)}</div>
    ${c.readings.map((r) => `
      <div class="py-poly-reading">
        <div class="py-poly-reading-py">${escapeHtml3(r.pinyin)}</div>
        <div class="py-poly-reading-meaning">${escapeHtml3(r.meaning)}</div>
        <div class="py-poly-reading-exs">${r.examples.map((e) => `<span class="py-poly-ex">${escapeHtml3(e)}</span>`).join("")}</div>
        <button class="py-speak-btn" data-text="${escapeHtml3(r.examples[0])}">\u{1F50A}</button>
      </div>`).join("")}
  `;
    showDetailPopup(html);
    $2("py-detail-box").querySelectorAll(".py-speak-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        speakChinese(btn.dataset.text, 0.8);
      });
    });
  }
  function renderTonesSection(body) {
    const tones = _data.tones;
    body.innerHTML = `
    <div class="py-section">
      <div class="py-section-title">\u56DB\u4E2A\u58F0\u8C03\u8BE6\u89E3</div>
      ${tones.rules.map((t) => `
        <div class="py-tone-detail-card">
          <div class="py-tone-detail-header">
            <span class="py-tone-mark-big">${escapeHtml3(t.mark)}</span>
            <span class="py-tone-name-big">${escapeHtml3(t.name)}</span>
          </div>
          <div class="py-tone-desc-text">${escapeHtml3(t.desc)}</div>
          <div class="py-tone-tip">\u{1F4A1} ${escapeHtml3(t.tip)}</div>
          <div class="py-tone-examples">${escapeHtml3(t.example)}</div>
          <button class="py-speak-btn" data-text="${escapeHtml3(t.example.split("\uFF0C")[0])}">\u{1F50A} \u8BD5\u542C</button>
        </div>`).join("")}
    </div>
    <div class="py-section">
      <div class="py-section-title">\u6807\u8C03\u89C4\u5219\u53E3\u8BC0</div>
      ${tones.tone_rules.map((r, i) => `
        <div class="py-rule-item">
          <span class="py-rule-num">${i + 1}</span>
          ${escapeHtml3(r)}
        </div>`).join("")}
    </div>
  `;
    body.querySelectorAll(".py-speak-btn").forEach((btn) => {
      btn.addEventListener("click", () => speakChinese(btn.dataset.text, 0.8));
    });
  }
  function renderQuizResult(body) {
    const total = _score.correct + _score.wrong;
    const pct = total ? Math.round(_score.correct / total * 100) : 0;
    const grade = pct >= 90 ? "\u4F18\u79C0 \u{1F3C6}" : pct >= 70 ? "\u826F\u597D \u{1F44D}" : pct >= 50 ? "\u7EE7\u7EED\u52A0\u6CB9 \u{1F4AA}" : "\u9700\u8981\u591A\u52A0\u7EC3\u4E60 \u{1F4DA}";
    body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:64px;margin-bottom:12px">${pct >= 90 ? "\u{1F389}" : pct >= 70 ? "\u{1F60A}" : "\u{1F605}"}</div>
      <div style="font-size:48px;font-weight:900;color:var(--color-chinese)">${pct}<span style="font-size:20px">%</span></div>
      <div style="font-size:16px;margin:8px 0 4px">${grade}</div>
      <div style="font-size:13px;color:var(--color-text-sub)">\u7B54\u5BF9 ${_score.correct} \u9898\uFF0C\u7B54\u9519 ${_score.wrong} \u9898</div>
      <button class="btn-primary" style="margin-top:24px;width:80%" id="btn-py-retry">\u518D\u7EC3\u4E00\u6B21</button>
      <button class="btn-secondary" style="margin-top:10px;width:80%" id="btn-py-home">\u8FD4\u56DE</button>
    </div>
  `;
    $2("btn-py-retry")?.addEventListener("click", () => renderPinyinHome());
    $2("btn-py-home")?.addEventListener("click", () => {
      _currentMode = "table";
      document.querySelectorAll(".py-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "table"));
      renderPinyinHome();
    });
  }
  var _data, _currentMode, _gradeFilter, _currentItems, _currentIdx, _score, $2;
  var init_pinyin = __esm({
    "app/pinyin.js"() {
      init_speech();
      _data = null;
      _currentMode = "table";
      _gradeFilter = "all";
      _currentItems = [];
      _currentIdx = 0;
      _score = { correct: 0, wrong: 0 };
      $2 = (id) => document.getElementById(id);
    }
  });

  // app/recitation.js
  var recitation_exports = {};
  __export(recitation_exports, {
    getRecitationTexts: () => getRecitationTexts,
    initRecitation: () => initRecitation,
    openRecitationListPage: () => openRecitationListPage,
    openRecitationPage: () => openRecitationPage,
    renderRecitationList: () => renderRecitationList
  });
  function toast3(msg) {
    const c = $3("toast-container");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  async function initRecitation() {
    await loadRecitationTexts();
    bindRecitationEvents();
    bindRecitationListEvents();
    window._openRecitationPage = openRecitationPage;
  }
  async function loadRecitationTexts() {
    const files = [
      "data/builtin/chinese/primary/primary_poems_full.json",
      "data/builtin/chinese/middle/middle_texts_full.json",
      "data/builtin/chinese/tangpoems_full.json",
      "data/builtin/chinese/wenyan_texts.json"
    ];
    R.allTexts = [];
    for (const f of files) {
      try {
        const res = await fetch(f);
        if (!res.ok) continue;
        const data = await res.json();
        R.allTexts.push(...data.texts || []);
      } catch (_) {
      }
    }
    window._recitationTexts = R.allTexts;
  }
  function bindRecitationListEvents() {
    $3("btn-recite-list-back")?.addEventListener("click", () => {
      (window._goBack || (() => {
        document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
        document.getElementById("page-home")?.classList.add("active");
      }))();
    });
    document.querySelectorAll(".recite-list-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".recite-list-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderRecitationListPage(btn.dataset.cat);
      });
    });
    let searchTimer;
    $3("recite-search-input")?.addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const cat = document.querySelector(".recite-list-tab.active")?.dataset.cat || "all";
        renderRecitationListPage(cat, e.target.value.trim());
      }, 250);
    });
  }
  function openRecitationListPage() {
    if (window._showPage) {
      window._showPage("recitation-list");
    } else {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      $3("page-recitation-list")?.classList.add("active");
    }
    const cat = document.querySelector(".recite-list-tab.active")?.dataset.cat || "all";
    renderRecitationListPage(cat);
  }
  function renderRecitationListPage(cat = "all", query = "") {
    const list = $3("recite-texts-list");
    if (!list) return;
    let texts = R.allTexts;
    if (cat === "primary") texts = texts.filter((t) => t.grade?.startsWith("primary"));
    else if (cat === "middle") texts = texts.filter((t) => t.grade?.startsWith("middle"));
    else if (cat === "wenyan") texts = texts.filter((t) => t.category === "\u6587\u8A00\u6587" || t.tags?.includes("\u6587\u8A00\u6587"));
    else if (cat === "poem") texts = texts.filter((t) => t.category === "\u53E4\u8BD7" || t.category === "\u53E4\u8BD7\u8BCD" || t.tags?.includes("\u53E4\u8BD7"));
    if (query) {
      const q = query.toLowerCase();
      texts = texts.filter(
        (t) => t.title?.includes(query) || t.author?.toLowerCase().includes(q) || t.dynasty?.includes(query) || t.annotation?.includes(query)
      );
    }
    $3("recite-list-count") && ($3("recite-list-count").textContent = `\u5171${texts.length}\u7BC7`);
    if (!texts.length) {
      list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--color-text-sub)">${query ? `\u672A\u627E\u5230"${escapeHtml4(query)}"` : "\u6682\u65E0\u5185\u5BB9"}</div>`;
      return;
    }
    const groups = {};
    texts.forEach((t) => {
      const g = t.grade || "other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    });
    const gradeOrder = ["primary1", "primary2", "primary3", "primary4", "primary5", "primary6", "middle1", "middle2", "middle3", "other"];
    const gradeNames = {
      primary1: "\u5C0F\u5B66\u4E00\u5E74\u7EA7",
      primary2: "\u5C0F\u5B66\u4E8C\u5E74\u7EA7",
      primary3: "\u5C0F\u5B66\u4E09\u5E74\u7EA7",
      primary4: "\u5C0F\u5B66\u56DB\u5E74\u7EA7",
      primary5: "\u5C0F\u5B66\u4E94\u5E74\u7EA7",
      primary6: "\u5C0F\u5B66\u516D\u5E74\u7EA7",
      middle1: "\u521D\u4E2D\u4E00\u5E74\u7EA7",
      middle2: "\u521D\u4E2D\u4E8C\u5E74\u7EA7",
      middle3: "\u521D\u4E2D\u4E09\u5E74\u7EA7",
      other: "\u5176\u4ED6"
    };
    list.innerHTML = "";
    const keys = gradeOrder.filter((k) => groups[k]?.length);
    const showGroups = keys.length > 1 || texts.length > 6;
    keys.forEach((grade) => {
      const items = groups[grade];
      if (!items?.length) return;
      if (showGroups) {
        const title = document.createElement("div");
        title.className = "recite-grade-title";
        title.textContent = gradeNames[grade] || grade;
        list.appendChild(title);
      }
      items.forEach((text) => {
        const item = document.createElement("button");
        item.className = "recite-text-item";
        const isWenyan = text.category === "\u6587\u8A00\u6587" || text.tags?.includes("\u6587\u8A00\u6587");
        const catIcon = isWenyan ? "\u6587" : "\u8BD7";
        const catColor = isWenyan ? "#8B5CF6" : "var(--color-chinese)";
        item.innerHTML = `
        <div class="rti-cat" style="background:${catColor}">${catIcon}</div>
        <div class="rti-info">
          <div class="rti-title">${escapeHtml4(text.title)}</div>
          <div class="rti-meta">${text.dynasty ? text.dynasty + " \xB7 " : ""}${escapeHtml4(text.author || "")}${text.category ? " \xB7 " + text.category : ""}</div>
        </div>
        <div class="rti-segs">${text.segments?.length || 0}\u6BB5 \u203A</div>
      `;
        item.addEventListener("click", () => openRecitationPage(text.id));
        list.appendChild(item);
      });
    });
  }
  function bindRecitationEvents() {
    $3("btn-recite-back")?.addEventListener("click", () => {
      clearInterval(R.autoPlayTimer);
      window._goBack?.() || (() => {
        document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
        document.getElementById("page-recitation-list")?.classList.add("active");
      })();
    });
    document.querySelectorAll(".recite-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setReciteMode(btn.dataset.mode));
    });
    $3("btn-speak-full")?.addEventListener("click", speakCurrentFull);
    $3("btn-speak-quiz")?.addEventListener("click", () => {
      const seg = R.currentText?.segments?.[R.currentSegIdx];
      if (seg) speakChinese(seg.text.replace(/\n/g, "\uFF0C"), 0.8);
    });
    $3("btn-prev-seg")?.addEventListener("click", () => navigateSegment(-1));
    $3("btn-next-seg")?.addEventListener("click", () => navigateSegment(1));
    $3("btn-prev-seg-v")?.addEventListener("click", () => navigateSegment(-1));
    $3("btn-next-seg-v")?.addEventListener("click", () => navigateSegment(1));
    $3("btn-reveal-answer")?.addEventListener("click", revealAnswer);
    $3("btn-recite-record")?.addEventListener("click", startVoiceRecite);
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-recite-id]");
      if (btn) openRecitationPage(btn.dataset.reciteId);
    });
    $3("btn-recite-again")?.addEventListener("click", () => {
      hide2($3("recite-score"));
      hide2($3("recite-answer-reveal"));
      $3("btn-recite-record").classList.remove("recording");
      $3("recite-record-label").textContent = "\u5F00\u59CB\u80CC\u8BF5";
    });
    $3("btn-recite-clear-score")?.addEventListener("click", () => {
      hide2($3("recite-score"));
      hide2($3("recite-answer-reveal"));
      $3("btn-recite-record").classList.remove("recording");
      $3("recite-record-label").textContent = "\u5F00\u59CB\u80CC\u8BF5";
      $3("recite-score-val").textContent = "0";
      $3("recite-score-grade").textContent = "\u2014";
      $3("recite-score-feedback").textContent = "";
      $3("recite-recognized").textContent = "";
      toast3("\u5DF2\u6E05\u9664\u672C\u6BB5\u80CC\u8BF5\u8BB0\u5F55");
    });
    $3("btn-recite-replay")?.addEventListener("click", () => {
      const seg = R.currentText?.segments?.[R.currentSegIdx];
      if (seg) speakChinese(seg.text.replace(/\n/g, "\uFF0C"), 0.8);
    });
  }
  function openRecitationPage(textId) {
    const text = R.allTexts.find((t) => t.id === textId);
    if (!text) {
      toast3("\u672A\u627E\u5230\u539F\u6587\u6570\u636E");
      return;
    }
    R.currentText = text;
    R.currentSegIdx = 0;
    $3("recite-title") && ($3("recite-title").textContent = text.title);
    $3("recite-author") && ($3("recite-author").textContent = `${text.dynasty} \xB7 ${text.author}`);
    $3("recite-grade") && ($3("recite-grade").textContent = gradeLabel(text.grade));
    renderFullText(text);
    setReciteMode("read");
    if (window._showPage) {
      window._showPage("recitation");
    } else {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      $3("page-recitation")?.classList.add("active");
    }
  }
  function renderFullText(text) {
    const el = $3("recite-full-text");
    if (!el) return;
    const lines = text.full_text.split("\n");
    let html = lines.map(
      (line) => line.trim() ? `<div class="recite-line">${escapeHtml4(line)}</div>` : ""
    ).join("");
    if (text.translation) {
      html += `<div class="recite-translation">
      <div class="ra-label">\u{1F236} \u767D\u8BDD\u6587\u7FFB\u8BD1</div>
      <div class="rt-text">${escapeHtml4(text.translation)}</div>
    </div>`;
    }
    if (text.word_notes?.length) {
      html += `<div class="recite-word-notes">
      <div class="ra-label">\u{1F4D6} \u8BCD\u8BED\u6CE8\u91CA</div>
      <div class="rwn-grid">
        ${text.word_notes.map((n) => `
          <div class="rwn-item">
            <span class="rwn-word">${escapeHtml4(n.word)}</span>
            <span class="rwn-note">${escapeHtml4(n.note)}</span>
          </div>`).join("")}
      </div>
    </div>`;
    }
    if (text.annotation) {
      html += `<div class="recite-annotation">
      <div class="ra-label">\u{1F4DD} \u521B\u4F5C\u80CC\u666F</div>
      <div class="ra-text">${escapeHtml4(text.annotation)}</div>
    </div>`;
    }
    if (text.key_points?.length) {
      html += `<div class="recite-keypoints">
      <div class="ra-label">\u{1F511} \u5B66\u4E60\u91CD\u70B9</div>
      ${text.key_points.map((p) => `<div class="rk-item">\xB7 ${escapeHtml4(p)}</div>`).join("")}
    </div>`;
    }
    el.innerHTML = html;
  }
  function setReciteMode(mode) {
    R.mode = mode;
    document.querySelectorAll(".recite-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    hide2($3("recite-full-section"));
    hide2($3("recite-quiz-section"));
    hide2($3("recite-voice-section"));
    if (mode === "read") {
      show2($3("recite-full-section"));
      renderFullText(R.currentText);
    } else if (mode === "quiz") {
      show2($3("recite-quiz-section"));
      renderQuizSegment();
    } else if (mode === "recite") {
      show2($3("recite-voice-section"));
      renderVoiceSegment();
    }
  }
  function renderQuizSegment() {
    const text = R.currentText;
    const seg = text.segments[R.currentSegIdx];
    if (!seg) return;
    const total = text.segments.length;
    $3("quiz-progress").textContent = `${R.currentSegIdx + 1} / ${total}`;
    $3("quiz-question").textContent = seg.question;
    $3("quiz-context").textContent = `\uFF08${seg.context}\uFF09`;
    const blanked = blankText(seg.text);
    $3("quiz-blank").innerHTML = blanked;
    hide2($3("quiz-answer-reveal"));
    $3("quiz-input").value = "";
    $3("quiz-input").disabled = false;
    hide2($3("quiz-result"));
  }
  function blankText(text) {
    const chars = [...text];
    const blankedChars = chars.map((c, i) => {
      if (c === "\n" || c === "\uFF0C" || c === "\u3002" || c === "\u3001") return c;
      return Math.random() < 0.4 ? '<span class="blank-char">\uFF3F</span>' : c;
    });
    return blankedChars.join("").replace(/\n/g, "<br>");
  }
  function revealAnswer() {
    const seg = R.currentText.segments[R.currentSegIdx];
    $3("quiz-answer-text").textContent = seg.text;
    show2($3("quiz-answer-reveal"));
    speakChinese(seg.text, 0.8);
  }
  function navigateSegment(dir) {
    const text = R.currentText;
    R.currentSegIdx = Math.max(0, Math.min(text.segments.length - 1, R.currentSegIdx + dir));
    if (R.mode === "quiz") renderQuizSegment();
    else if (R.mode === "recite") renderVoiceSegment();
  }
  function renderVoiceSegment() {
    const text = R.currentText;
    const seg = text.segments[R.currentSegIdx];
    if (!seg) return;
    const total = text.segments.length;
    $3("voice-progress").textContent = `${R.currentSegIdx + 1} / ${total}`;
    $3("voice-question").textContent = seg.question;
    $3("voice-context").textContent = `\uFF08${seg.context}\uFF09`;
    hide2($3("recite-score"));
    hide2($3("recite-answer-reveal"));
    $3("btn-recite-record").classList.remove("recording");
    $3("recite-record-label").textContent = "\u5F00\u59CB\u80CC\u8BF5";
  }
  async function startVoiceRecite() {
    if (!SpeechSupport.stt) {
      toast3("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome");
      return;
    }
    const btn = $3("btn-recite-record");
    const label = $3("recite-record-label");
    if (_reciteStopRecord) {
      _reciteStopRecord();
      _reciteStopRecord = null;
      btn.classList.remove("recording");
      label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
      return;
    }
    btn.classList.add("recording");
    label.textContent = "\u80CC\u8BF5\u4E2D...";
    let spokenText = "";
    _reciteStopRecord = startListening(
      "zh-CN",
      (text) => {
        spokenText = text;
      },
      (msg) => {
        toast3(msg);
        btn.classList.remove("recording");
        label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
      },
      () => {
        btn.classList.remove("recording");
        label.textContent = "\u5F00\u59CB\u80CC\u8BF5";
        _reciteStopRecord = null;
        if (!spokenText) return;
        const seg = R.currentText.segments[R.currentSegIdx];
        const target = seg.text.replace(/[，。！？、；：\n]/g, "");
        const spoken = spokenText.replace(/[，。！？、；：\n]/g, "");
        const dist = levenshtein(target, spoken);
        const score = Math.round((1 - dist / Math.max(target.length, spoken.length)) * 100);
        const grade = score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
        const feedback = score >= 90 ? "\u80CC\u5F97\u975E\u5E38\u597D\uFF01\u5B57\u5B57\u5230\u4F4D \u{1F389}" : score >= 70 ? "\u80CC\u5F97\u4E0D\u9519\uFF01\u6709\u51E0\u4E2A\u5B57\u9700\u8981\u6CE8\u610F" : score >= 50 ? "\u7EE7\u7EED\u52AA\u529B\uFF0C\u53EF\u4EE5\u518D\u591A\u80CC\u51E0\u904D" : "\u9700\u8981\u591A\u52A0\u7EC3\u4E60\uFF0C\u5148\u770B\u539F\u6587\u518D\u80CC";
        $3("recite-score-val").textContent = score;
        $3("recite-score-grade").textContent = grade;
        $3("recite-score-feedback").textContent = feedback;
        $3("recite-recognized").textContent = `\u4F60\u8BF4\u7684\uFF1A${spokenText}`;
        show2($3("recite-score"));
        if (score < 70) {
          $3("recite-answer-text").textContent = seg.text;
          show2($3("recite-answer-reveal"));
        }
      }
    );
  }
  function speakCurrentFull() {
    const text = R.currentText;
    if (text) speakChinese(text.full_text.replace(/\n/g, "\uFF0C"), 0.75);
  }
  function gradeLabel(g) {
    const map = {
      primary1: "\u5C0F\u5B66\u4E00\u5E74\u7EA7",
      primary2: "\u5C0F\u5B66\u4E8C\u5E74\u7EA7",
      primary3: "\u5C0F\u5B66\u4E09\u5E74\u7EA7",
      primary4: "\u5C0F\u5B66\u56DB\u5E74\u7EA7",
      primary5: "\u5C0F\u5B66\u4E94\u5E74\u7EA7",
      primary6: "\u5C0F\u5B66\u516D\u5E74\u7EA7",
      middle1: "\u521D\u4E2D\u4E00\u5E74\u7EA7",
      middle2: "\u521D\u4E2D\u4E8C\u5E74\u7EA7",
      middle3: "\u521D\u4E2D\u4E09\u5E74\u7EA7"
    };
    return map[g] || g || "";
  }
  function escapeHtml4(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function getRecitationTexts() {
    return R.allTexts;
  }
  function renderRecitationList(container, gradeFilter) {
    if (!container) return;
    container.innerHTML = "";
    const filtered = gradeFilter && gradeFilter !== "all" ? R.allTexts.filter((t) => t.grade?.startsWith(gradeFilter)) : R.allTexts;
    if (!filtered.length) {
      container.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:24px">\u6682\u65E0\u539F\u6587\u6570\u636E</p>';
      return;
    }
    filtered.forEach((text) => {
      const item = document.createElement("div");
      item.className = "recitation-item";
      item.innerHTML = `
      <div class="recit-info">
        <div class="recit-title">${escapeHtml4(text.title)}</div>
        <div class="recit-meta">${text.dynasty} \xB7 ${text.author} \xB7 ${gradeLabel(text.grade)}</div>
      </div>
      <div class="recit-actions">
        <button class="btn-secondary recit-read" data-recite-id="${text.id}">\u{1F4D6} \u80CC\u8BF5</button>
      </div>
    `;
      container.appendChild(item);
    });
  }
  var R, $3, show2, hide2, _reciteStopRecord;
  var init_recitation = __esm({
    "app/recitation.js"() {
      init_speech();
      init_speech();
      init_core();
      R = {
        currentText: null,
        // 当前原文对象
        currentSegIdx: 0,
        // 当前段落索引
        allTexts: [],
        // 所有已加载原文
        mode: "read",
        // read | quiz | recite
        autoPlayTimer: null
      };
      $3 = (id) => document.getElementById(id);
      show2 = (el) => el?.classList.remove("hidden");
      hide2 = (el) => el?.classList.add("hidden");
      _reciteStopRecord = null;
    }
  });

  // app/ui.js
  init_core();
  init_algorithm();

  // app/parser.js
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const frontIdx = findCol(headers, ["front", "\u6B63\u9762", "\u95EE\u9898", "\u5355\u8BCD", "word", "question"]);
    const backIdx = findCol(headers, ["back", "\u80CC\u9762", "\u7B54\u6848", "\u91CA\u4E49", "answer", "meaning"]);
    const hintIdx = findCol(headers, ["hint", "\u63D0\u793A", "tip"]);
    const tagIdx = findCol(headers, ["tags", "\u6807\u7B7E", "tag"]);
    const phoneIdx = findCol(headers, ["phonetic", "\u97F3\u6807", "ipa"]);
    const exIdx = findCol(headers, ["example", "\u4F8B\u53E5", "eg"]);
    if (frontIdx === -1 || backIdx === -1) {
      return lines.slice(1).map((line) => {
        const cols = parseCSVLine(line);
        if (cols.length < 2 || !cols[0].trim()) return null;
        return { front: cols[0].trim(), back: cols[1].trim(), hint: "", tags: [] };
      }).filter(Boolean);
    }
    return lines.slice(1).map((line) => {
      const cols = parseCSVLine(line);
      if (!cols[frontIdx]?.trim()) return null;
      return {
        front: cols[frontIdx]?.trim() || "",
        back: cols[backIdx]?.trim() || "",
        hint: hintIdx !== -1 ? cols[hintIdx]?.trim() : "",
        phonetic: phoneIdx !== -1 ? cols[phoneIdx]?.trim() : "",
        example: exIdx !== -1 ? cols[exIdx]?.trim() : "",
        tags: tagIdx !== -1 ? (cols[tagIdx] || "").split(/[,，]/).map((t) => t.trim()).filter(Boolean) : []
      };
    }).filter(Boolean);
  }
  function parseCSVLine(line) {
    const result = [];
    let inQuotes = false, current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
  function findCol(headers, candidates) {
    for (const c of candidates) {
      const i = headers.indexOf(c);
      if (i !== -1) return i;
    }
    return -1;
  }
  function parseMarkdown(text) {
    const cards = [];
    const lines = text.split(/\r?\n/);
    let currentSection = "";
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^问[：:]\s*(.+)/.test(line)) {
        const question = line.replace(/^问[：:]\s*/, "").trim();
        const nextLine = lines[i + 1] || "";
        if (/^答[：:]\s*/.test(nextLine)) {
          const answer = nextLine.replace(/^答[：:]\s*/, "").trim();
          cards.push({ front: question, back: answer, hint: currentSection, tags: [currentSection].filter(Boolean) });
          i += 2;
          continue;
        }
      }
      const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        i++;
        continue;
      }
      const listMatch = line.match(/^[-*]\s+(.+?)\s*[—–-]\s*(.+)/);
      if (listMatch) {
        cards.push({ front: listMatch[1].trim(), back: listMatch[2].trim(), hint: "", tags: [currentSection].filter(Boolean) });
        i++;
        continue;
      }
      const boldMatch = line.match(/\*\*(.+?)\*\*/);
      if (boldMatch && i + 1 < lines.length && lines[i + 1].trim()) {
        const context = line.replace(/\*\*/g, "").trim();
        cards.push({ front: boldMatch[1].trim(), back: context, hint: currentSection, tags: [currentSection].filter(Boolean) });
      }
      i++;
    }
    const poetryCards = extractPoetry(lines);
    cards.push(...poetryCards);
    return cards;
  }
  function extractPoetry(lines) {
    const cards = [];
    let title = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const titleMatch = line.match(/^##\s+(.+)/);
      if (titleMatch) {
        title = titleMatch[1];
        continue;
      }
      if (/[，。！？；]/.test(line) && line.length >= 4 && line.length <= 24) {
        const parts = line.split(/[，,]/).filter((p) => p.trim());
        if (parts.length === 2) {
          cards.push({
            front: parts[0].trim() + "\uFF0C___",
            back: parts[1].trim().replace(/[。？！]/, ""),
            hint: title,
            type: "poem",
            tags: ["\u53E4\u8BD7", title].filter(Boolean)
          });
        }
      }
    }
    return cards;
  }
  var _XLSX = null;
  async function loadSheetJS() {
    if (_XLSX) return _XLSX;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.mini.min.js";
      script.onload = () => {
        _XLSX = window.XLSX;
        resolve(_XLSX);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  async function parseExcel(arrayBuffer) {
    const XLSX = await loadSheetJS();
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const csvText = [headers.join(","), ...rows.slice(1).map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return parseCSV(csvText);
  }
  async function parseFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const name = file.name.replace(/\.[^.]+$/, "");
    if (ext === "csv" || ext === "txt") {
      const text = await readAsText(file);
      return { cards: parseCSV(text), suggestedName: name };
    }
    if (ext === "xlsx" || ext === "xls") {
      const buf = await readAsArrayBuffer(file);
      return { cards: await parseExcel(buf), suggestedName: name };
    }
    throw new Error(`\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B\uFF1A.${ext}\uFF08\u8BF7\u4F7F\u7528 CSV\u3001Excel \u6216 TXT\uFF09`);
  }
  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, "UTF-8");
    });
  }
  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  async function parseImageOCR(file, onProgress) {
    await loadTesseract();
    const { createWorker } = window.Tesseract;
    onProgress?.("\u6B63\u5728\u521D\u59CB\u5316 OCR \u5F15\u64CE...");
    const worker = await createWorker(["chi_sim", "eng"], 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          onProgress?.(`\u8BC6\u522B\u4E2D ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    const url = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(url);
    URL.revokeObjectURL(url);
    await worker.terminate();
    onProgress?.("\u8BC6\u522B\u5B8C\u6210\uFF0C\u6B63\u5728\u89E3\u6790...");
    const cards = parseMarkdown(text) || fallbackOCRParse(text);
    return { cards, suggestedName: file.name.replace(/\.[^.]+$/, "") };
  }
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  function fallbackOCRParse(text) {
    return text.split(/\n/).map((line) => line.trim()).filter((l) => l.length > 1).map((line) => ({
      front: line,
      back: "",
      hint: "",
      tags: ["OCR\u5BFC\u5165"]
    }));
  }

  // app/ui.js
  init_speech();
  init_pronunciation();
  init_english();
  init_passages();
  init_pinyin();

  // app/ai.js
  var FREE_WORKER_URL = localStorage.getItem("free_worker_url") || "";
  var PROVIDERS = {
    free: {
      name: "\u514D\u8D39\uFF08Cloudflare\uFF09",
      endpoint: FREE_WORKER_URL || "https://kids-memory-ai.YOUR-SUBDOMAIN.workers.dev",
      model: "llama-3",
      visionModel: "llava",
      headers: () => ({ "Content-Type": "application/json" })
    },
    deepseek: {
      name: "DeepSeek",
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat",
      visionModel: "deepseek-chat",
      headers: (key) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${key}` })
    },
    doubao: {
      name: "\u8C46\u5305",
      endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      model: "ep-20250101-xxxxxx",
      visionModel: "ep-vision-xxxxxx",
      // 需用户填写视觉模型 endpoint
      headers: (key) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${key}` })
    },
    qwen: {
      name: "\u901A\u4E49\u5343\u95EE",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      model: "qwen-turbo",
      visionModel: "qwen-vl-plus",
      // 千问VL支持图片
      headers: (key) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${key}` })
    },
    openai: {
      name: "OpenAI \u517C\u5BB9",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-3.5-turbo",
      visionModel: "gpt-4o",
      headers: (key) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${key}` })
    }
  };
  function buildSystemPrompt() {
    return `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u513F\u7AE5\u6559\u80B2\u52A9\u624B\uFF0C\u64C5\u957F\u5236\u4F5C\u9002\u5408\u4E2D\u56FD\u4E2D\u5C0F\u5B66\u751F\u7684\u5B66\u4E60\u5361\u7247\u3002

\u4F60\u7684\u4EFB\u52A1\u662F\u6839\u636E\u7528\u6237\u7684\u8981\u6C42\uFF0C\u751F\u6210\u9AD8\u8D28\u91CF\u7684\u8BB0\u5FC6\u5361\u7247\u3002

\u8F93\u51FA\u683C\u5F0F\u8981\u6C42\uFF1A
- \u4E25\u683C\u8F93\u51FA JSON \u6570\u7EC4\uFF0C\u4E0D\u8981\u6709\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57
- \u6BCF\u4E2A\u5361\u7247\u5BF9\u8C61\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
  - front: \u6B63\u9762\u5185\u5BB9\uFF08\u95EE\u9898/\u5355\u8BCD/\u6982\u5FF5\uFF09
  - back: \u80CC\u9762\u5185\u5BB9\uFF08\u7B54\u6848/\u91CA\u4E49/\u89E3\u91CA\uFF09
  - phonetic: \u97F3\u6807\uFF08\u4EC5\u82F1\u8BED\u5355\u8BCD\u9700\u8981\uFF0C\u5176\u4ED6\u7559\u7A7A\u5B57\u7B26\u4E32\uFF09
  - hint: \u8BB0\u5FC6\u63D0\u793A\uFF08\u5E2E\u52A9\u8BB0\u5FC6\u7684\u8054\u60F3\u6216\u6280\u5DE7\uFF0C\u53EF\u4EE5\u7559\u7A7A\u5B57\u7B26\u4E32\uFF09
  - example: \u4F8B\u53E5\u6216\u4F8B\u5B50\uFF08\u53EF\u4EE5\u7559\u7A7A\u5B57\u7B26\u4E32\uFF09
  - tags: \u6807\u7B7E\u6570\u7EC4\uFF08\u5982 ["\u5C0F\u5B66\u56DB\u5E74\u7EA7","\u540D\u8BCD","\u52A8\u7269"]\uFF09
  - type: \u5361\u7247\u7C7B\u578B\uFF08"word"=\u5355\u8BCD, "sentence"=\u53E5\u5B50, "poem"=\u53E4\u8BD7, "formula"=\u516C\u5F0F, "concept"=\u6982\u5FF5, "qa"=\u95EE\u7B54\uFF09

\u793A\u4F8B\u8F93\u51FA\uFF1A
[
  {
    "front": "beautiful",
    "back": "\u7F8E\u4E3D\u7684 /\u02C8bju\u02D0t\u026Af\u0259l/",
    "phonetic": "/\u02C8bju\u02D0t\u026Af\u0259l/",
    "hint": "beau(\u7F8E)+ti+ful\uFF0C\u60F3\u8C61\u4E00\u4E2A\u7F8E\u4E3D\u7684\u4EBA",
    "example": "She is a beautiful girl.",
    "tags": ["\u5F62\u5BB9\u8BCD","\u5C0F\u5B66\u4E94\u5E74\u7EA7"],
    "type": "word"
  }
]

\u6CE8\u610F\u4E8B\u9879\uFF1A
1. \u5361\u7247\u5185\u5BB9\u8981\u51C6\u786E\uFF0C\u9002\u5408\u76EE\u6807\u5E74\u7EA7
2. \u63D0\u793A\u8981\u6709\u52A9\u4E8E\u8BB0\u5FC6\uFF08\u8054\u60F3\u6CD5\u3001\u8C10\u97F3\u3001\u56FE\u50CF\u7B49\uFF09
3. \u4F8B\u53E5\u8981\u7B80\u5355\u6613\u61C2\uFF0C\u8D34\u8FD1\u5B66\u751F\u751F\u6D3B
4. \u6570\u91CF\u8981\u7CBE\u786E\u7B26\u5408\u8981\u6C42`;
  }
  function buildUserPrompt(subject, grade, userInput, count) {
    const subjectNames = {
      english: "\u82F1\u8BED",
      chinese: "\u8BED\u6587",
      math: "\u6570\u5B66",
      custom: "\u81EA\u5B9A\u4E49"
    };
    const subjectName = subjectNames[subject] || subject;
    let basePrompt = `\u8BF7\u4E3A${grade}\u7684\u5B66\u751F\u751F\u6210 ${count} \u5F20${subjectName}\u5B66\u4E60\u5361\u7247\u3002`;
    if (userInput?.trim()) {
      basePrompt += `

\u5177\u4F53\u8981\u6C42\uFF1A${userInput}`;
    } else {
      const defaults = {
        english: `\u751F\u6210${count}\u4E2A\u5E38\u7528\u82F1\u8BED\u5355\u8BCD\uFF0C\u5305\u542B\u4E2D\u6587\u91CA\u4E49\u3001\u97F3\u6807\u548C\u4F8B\u53E5`,
        chinese: `\u751F\u6210${count}\u5F20\u8BED\u6587\u5B66\u4E60\u5361\u7247\uFF0C\u53EF\u5305\u542B\u53E4\u8BD7\u586B\u7A7A\u3001\u6210\u8BED\u3001\u751F\u5B57\u7B49`,
        math: `\u751F\u6210${count}\u5F20\u6570\u5B66\u516C\u5F0F\u6216\u6982\u5FF5\u5361\u7247\uFF0C\u8981\u6709\u4F8B\u5B50\u548C\u8BB0\u5FC6\u63D0\u793A`,
        custom: `\u751F\u6210${count}\u5F20\u7EFC\u5408\u5B66\u4E60\u5361\u7247`
      };
      basePrompt += `

\u9ED8\u8BA4\u8981\u6C42\uFF1A${defaults[subject] || defaults.custom}`;
    }
    basePrompt += `

\u76F4\u63A5\u8F93\u51FA JSON \u6570\u7EC4\uFF0C\u4E0D\u8981\u6709\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\u3002`;
    return basePrompt;
  }
  async function generateCards(config, onStatus) {
    const { provider, apiKey, endpoint: customEndpoint, subject, grade, prompt: userPrompt, count } = config;
    const workerUrl = localStorage.getItem("free_worker_url") || "";
    const isFree = provider === "free" || !apiKey && workerUrl;
    if (!apiKey && !workerUrl) throw new Error("\u672A\u914D\u7F6E AI\uFF0C\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Key \u6216 Worker URL");
    const providerCfg = PROVIDERS[isFree ? "free" : provider || "deepseek"] || PROVIDERS.deepseek;
    const endpoint = customEndpoint || (isFree ? workerUrl : providerCfg.endpoint);
    const model = providerCfg.model;
    onStatus?.("\u6B63\u5728\u8FDE\u63A5 AI \u670D\u52A1...");
    const messages = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(subject, grade, userPrompt, count) }
    ];
    const body = isFree ? JSON.stringify({ messages, subject, grade, count }) : JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096, stream: false });
    onStatus?.("AI \u6B63\u5728\u751F\u6210\u5361\u7247\uFF0C\u8BF7\u7A0D\u5019...");
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: isFree ? { "Content-Type": "application/json" } : providerCfg.headers(apiKey),
        body
      });
    } catch (e) {
      throw new Error(`\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF1A${e.message}\u3002\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216 API \u5730\u5740\u3002`);
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      if (response.status === 401) throw new Error("API Key \u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u7F6E");
      if (response.status === 429) throw new Error("\u8BF7\u6C42\u592A\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
      throw new Error(`AI \u63A5\u53E3\u9519\u8BEF ${response.status}\uFF1A${errText.slice(0, 100)}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("AI \u8FD4\u56DE\u5185\u5BB9\u4E3A\u7A7A");
    onStatus?.("\u6B63\u5728\u89E3\u6790\u751F\u6210\u7ED3\u679C...");
    return parseAIResponse(content);
  }
  function parseAIResponse(content) {
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = jsonStr.indexOf("[");
    const end = jsonStr.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("AI \u8FD4\u56DE\u683C\u5F0F\u9519\u8BEF\uFF0C\u672A\u627E\u5230 JSON \u6570\u7EC4");
    jsonStr = jsonStr.slice(start, end + 1);
    let cards;
    try {
      cards = JSON.parse(jsonStr);
    } catch (e) {
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
      try {
        cards = JSON.parse(jsonStr);
      } catch (e2) {
        throw new Error("AI \u8FD4\u56DE\u7684 JSON \u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u91CD\u8BD5");
      }
    }
    if (!Array.isArray(cards)) throw new Error("AI \u8FD4\u56DE\u6570\u636E\u683C\u5F0F\u9519\u8BEF");
    return cards.map((c, i) => ({
      front: String(c.front || c.question || c.word || "").trim(),
      back: String(c.back || c.answer || c.meaning || "").trim(),
      phonetic: String(c.phonetic || "").trim(),
      hint: String(c.hint || c.tip || "").trim(),
      example: String(c.example || c.eg || "").trim(),
      tags: Array.isArray(c.tags) ? c.tags : c.tag ? [c.tag] : ["AI\u751F\u6210"],
      type: c.type || "word"
    })).filter((c) => c.front && c.back);
  }
  async function handleAIGenerate() {
    const modal = document.getElementById("ai-generate-modal");
    const provider = modal?.querySelector("[data-provider].active")?.dataset.provider || "free";
    const apiKey = localStorage.getItem("ai_key") || "";
    const workerUrl = localStorage.getItem("free_worker_url") || "";
    const endpoint = localStorage.getItem("ai_endpoint") || "";
    const subject = document.getElementById("ai-subject-select")?.value || "english";
    const grade = document.getElementById("ai-grade-select")?.value || "\u5C0F\u5B66\u4E09\u5E74\u7EA7";
    const userPrompt = document.getElementById("ai-prompt-input")?.value || "";
    const count = parseInt(document.getElementById("ai-count")?.value || "20");
    if (!apiKey && !workerUrl) {
      alert("\u8BF7\u5148\u5728\u300C\u8BBE\u7F6E\u2192AI\u914D\u7F6E\u300D\u4E2D\u586B\u5199 API Key \u6216\u90E8\u7F72\u514D\u8D39 Worker");
      return;
    }
    const statusEl = document.getElementById("ai-status");
    const statusText = document.getElementById("ai-status-text");
    const submitBtn = document.getElementById("btn-ai-submit");
    statusEl?.classList.remove("hidden");
    if (submitBtn) submitBtn.disabled = true;
    try {
      const cards = await generateCards(
        { provider, apiKey, endpoint, subject, grade, prompt: userPrompt, count },
        (msg) => {
          if (statusText) statusText.textContent = msg;
        }
      );
      if (!cards.length) throw new Error("\u751F\u6210\u4E860\u5F20\u5361\u7247\uFF0C\u8BF7\u8C03\u6574\u63D0\u793A\u8BCD\u540E\u91CD\u8BD5");
      document.getElementById("ai-generate-modal")?.classList.add("hidden");
      document.dispatchEvent(new CustomEvent("ai-cards-ready", {
        detail: { cards, suggestedName: `AI\u751F\u6210-${grade}${subject === "english" ? "\u82F1\u8BED" : subject === "chinese" ? "\u8BED\u6587" : "\u6570\u5B66"}` }
      }));
    } catch (e) {
      if (statusText) statusText.textContent = `\u751F\u6210\u5931\u8D25\uFF1A${e.message}`;
      setTimeout(() => statusEl?.classList.add("hidden"), 3e3);
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  }
  async function parseImageWithAI(imageFile, onStatus) {
    const apiKey = localStorage.getItem("ai_key") || "";
    const provider = localStorage.getItem("ai_provider") || (apiKey ? "deepseek" : "free");
    const customEndpoint = localStorage.getItem("ai_endpoint") || "";
    const workerUrl = localStorage.getItem("free_worker_url") || "";
    if (!apiKey && !workerUrl) {
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E AI\uFF08\u586B\u5199 API Key \u6216\u90E8\u7F72\u514D\u8D39 Worker\uFF09");
    }
    onStatus?.("\u6B63\u5728\u8BFB\u53D6\u56FE\u7247...");
    const base64 = await fileToBase64(imageFile);
    const mimeType = imageFile.type || "image/jpeg";
    const providerCfg = PROVIDERS[provider] || PROVIDERS.free;
    const useEndpoint = customEndpoint || (provider === "free" ? workerUrl : providerCfg.endpoint);
    const model = providerCfg.visionModel || providerCfg.model;
    onStatus?.(`\u6B63\u5728\u7528 AI \u8BC6\u522B\u56FE\u7247\uFF08${providerCfg.name}\uFF09...`);
    const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u6559\u80B2\u52A9\u624B\uFF0C\u64C5\u957F\u4ECE\u56FE\u7247\u4E2D\u63D0\u53D6\u5B66\u4E60\u5185\u5BB9\u5E76\u5236\u4F5C\u8BB0\u5FC6\u5361\u7247\u3002

\u8BF7\u4ED4\u7EC6\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u6240\u6709\u6587\u5B57\u5185\u5BB9\uFF0C\u7136\u540E\u5C06\u5176\u6574\u7406\u6210\u5B66\u4E60\u5361\u7247\u3002

\u8F93\u51FA\u8981\u6C42\uFF1A
- \u4E25\u683C\u8F93\u51FA JSON \u6570\u7EC4\uFF0C\u4E0D\u8981\u6709\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57
- \u6BCF\u4E2A\u5BF9\u8C61\u5305\u542B\uFF1Afront\uFF08\u6B63\u9762/\u95EE\u9898\uFF09\u3001back\uFF08\u80CC\u9762/\u7B54\u6848\uFF09\u3001hint\uFF08\u8BB0\u5FC6\u63D0\u793A\uFF0C\u53EF\u7559\u7A7A\uFF09\u3001tags\uFF08\u6807\u7B7E\u6570\u7EC4\uFF09\u3001type\uFF08word/qa/poem/formula\uFF09
- \u5982\u679C\u56FE\u7247\u662F\u5355\u8BCD\u8868\uFF1Afront=\u82F1\u6587\u5355\u8BCD\uFF0Cback=\u4E2D\u6587\u542B\u4E49+\u97F3\u6807
- \u5982\u679C\u56FE\u7247\u662F\u53E4\u8BD7\uFF1Afront=\u4E0A\u53E5+"___"\uFF0Cback=\u4E0B\u53E5
- \u5982\u679C\u56FE\u7247\u662F\u6570\u5B66\u516C\u5F0F\uFF1Afront=\u516C\u5F0F\u540D\u79F0\uFF0Cback=\u516C\u5F0F\u5185\u5BB9+\u793A\u4F8B
- \u5982\u679C\u56FE\u7247\u662F\u95EE\u7B54\u9898\uFF1Afront=\u95EE\u9898\uFF0Cback=\u7B54\u6848
- \u5185\u5BB9\u8981\u51C6\u786E\uFF0C\u4E0D\u8981\u731C\u6D4B\u770B\u4E0D\u6E05\u7684\u5B57

\u76F4\u63A5\u8F93\u51FAJSON\u6570\u7EC4\u3002`;
    const body = provider === "free" ? JSON.stringify({
      type: "vision",
      image: `data:${mimeType};base64,${base64}`,
      prompt: systemPrompt + "\n\u8BF7\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u6240\u6709\u5B66\u4E60\u5185\u5BB9\uFF0C\u6574\u7406\u6210\u8BB0\u5FC6\u5361\u7247\u7684JSON\u683C\u5F0F\u3002"
    }) : JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: "\u8BF7\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u6240\u6709\u5B66\u4E60\u5185\u5BB9\uFF0C\u6574\u7406\u6210\u8BB0\u5FC6\u5361\u7247\u7684JSON\u683C\u5F0F\u3002" }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    });
    let response;
    try {
      response = await fetch(useEndpoint, {
        method: "POST",
        headers: provider === "free" ? { "Content-Type": "application/json" } : providerCfg.headers(apiKey),
        body
      });
    } catch (e) {
      throw new Error(`\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF1A${e.message}`);
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      if (response.status === 401) throw new Error("API Key \u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u7F6E");
      if (response.status === 400) {
        throw new Error(`\u8BE5\u6A21\u578B\u4E0D\u652F\u6301\u56FE\u7247\u8BC6\u522B\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u652F\u6301\u89C6\u89C9\u7684\u6A21\u578B\uFF08\u5982 qwen-vl-plus\u3001gpt-4o\uFF09`);
      }
      throw new Error(`AI \u63A5\u53E3\u9519\u8BEF ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("AI \u8FD4\u56DE\u5185\u5BB9\u4E3A\u7A7A");
    onStatus?.("\u6B63\u5728\u89E3\u6790 AI \u8BC6\u522B\u7ED3\u679C...");
    const cards = parseAIResponse(content);
    if (!cards.length) throw new Error("\u672A\u80FD\u4ECE\u56FE\u7247\u4E2D\u63D0\u53D6\u5230\u6709\u6548\u5185\u5BB9\uFF0C\u8BF7\u5C1D\u8BD5\u66F4\u6E05\u6670\u7684\u56FE\u7247");
    return {
      cards,
      suggestedName: imageFile.name.replace(/\.[^.]+$/, "") + "-AI\u89E3\u6790"
    };
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function hasAIKey() {
    return !!(localStorage.getItem("ai_key") || localStorage.getItem("free_worker_url"));
  }

  // app/vocab-store.js
  init_core();
  var VOCAB_CATALOG = [
    // ─── 英语 ───
    {
      id: "ecdict_basic",
      available: true,
      name: "ECDICT \u9AD8\u9891\u8BCD\u6C47\uFF085000\u8BCD\uFF09",
      desc: "\u82F1\u6C49\u8BCD\u5178\u9AD8\u9891\u8BCD\u6C47\uFF0C\u542B\u97F3\u6807\u3001\u8BCD\u6027\u3001\u8BCD\u9891",
      category: "english",
      grade: "middle",
      subject: "english",
      size: "~60KB",
      source: "skywind3000/ECDICT",
      local: "data/vocab-store/ecdict_5000.json",
      parser: "cards_json",
      count: 5e3
    },
    {
      id: "ecdict_full",
      available: true,
      name: "ECDICT \u5B8C\u6574\u8BCD\u5E93\uFF0860\u4E07\u8BCD\uFF09",
      desc: "\u82F1\u6C49\u53CC\u89E3\u8BCD\u5178\u5B8C\u6574\u7248\u3002\u26A0 \u6587\u4EF6\u7EA650MB\uFF0CGitHub CDN \u5E38\u9650\u901F\uFF0C\u63A8\u8350\u5148\u7528\u300C\u9AD8\u98915000\u8BCD\u7248\u300D",
      category: "english",
      grade: "adult",
      subject: "english",
      size: "~50MB",
      source: "skywind3000/ECDICT",
      remote: "skywind3000/ECDICT/master/ecdict.csv",
      parser: "ecdict_csv",
      count: 6e5,
      warning: "\u6587\u4EF6\u7EA650MB\uFF0C\u4E0B\u8F7D\u65F6\u95F4\u8F83\u957F\uFF08WiFi\u7EA63-5\u5206\u949F\uFF09\u3002\n\u51FA\u73B0403/\u8D85\u65F6\u8BF7\u5207\u6362\u4E0B\u8F7D\u6E90\u4E3A\u300CGitHub Proxy\u300D\u540E\u91CD\u8BD5\u3002\n\u82E5\u6301\u7EED\u5931\u8D25\uFF0C\u5EFA\u8BAE\u4F7F\u7528\u300CECDICT\u9AD8\u98915000\u8BCD\u300D\u7248\u672C\u3002"
    },
    {
      id: "pep_primary",
      available: true,
      name: "\u4EBA\u6559\u7248 PEP \u5C0F\u5B66\u82F1\u8BED\u8BCD\u6C47",
      desc: "3-6\u5E74\u7EA7\u5168\u5957\u8BCD\u6C47\uFF0C\u542B\u97F3\u6807\u548C\u4E2D\u6587\u91CA\u4E49",
      category: "english",
      grade: "primary",
      subject: "english",
      size: "~60KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/pep_primary_1600.json",
      parser: "cards_json",
      count: 1600
    },
    {
      id: "nce_middle",
      available: true,
      name: "\u521D\u4E2D\u82F1\u8BED\u65B0\u8BFE\u6807\u8BCD\u6C47\uFF081600\u8BCD\uFF09",
      desc: "\u6559\u80B2\u90E8\u65B0\u8BFE\u6807 7-9 \u5E74\u7EA7\u6838\u5FC3\u8BCD\u6C47",
      category: "english",
      grade: "middle",
      subject: "english",
      size: "~60KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/nce_middle_1600.json",
      parser: "cards_json",
      count: 1600
    },
    {
      id: "cet4",
      available: true,
      name: "\u5927\u5B66\u82F1\u8BED\u56DB\u7EA7\u8BCD\u6C47\uFF08CET-4\uFF09",
      desc: "\u5927\u5B66\u82F1\u8BED\u56DB\u7EA7\u8003\u8BD5\u6838\u5FC3\u8BCD\u6C47\uFF0C\u542B\u91CA\u4E49\u548C\u4F8B\u53E5",
      category: "english",
      grade: "adult",
      subject: "english",
      size: "~180KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/cet4_words.json",
      parser: "cards_json",
      count: 4500
    },
    {
      id: "toefl",
      available: true,
      name: "\u6258\u798F\u6838\u5FC3\u8BCD\u6C47\uFF08TOEFL 3500\uFF09",
      desc: "\u6258\u798F\u8003\u8BD5\u9AD8\u9891\u8BCD\u6C47\uFF0C\u9002\u5408\u9AD8\u8003\u53CA\u4EE5\u4E0A\u6C34\u5E73",
      category: "english",
      grade: "adult",
      subject: "english",
      size: "~140KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/toefl_words.json",
      parser: "cards_json",
      count: 3500
    },
    // ─── 汉语 ───
    {
      id: "hsk1_3",
      available: true,
      name: "HSK 1-3 \u7EA7\u8BCD\u6C47\uFF08600\u8BCD\uFF09",
      desc: "\u6C49\u8BED\u6C34\u5E73\u8003\u8BD5\u521D\u7EA7\uFF0C\u542B\u62FC\u97F3\u3001\u4F8B\u53E5",
      category: "chinese",
      grade: "primary",
      subject: "chinese",
      size: "~30KB",
      source: "\u5185\u7F6E\uFF08\u5B98\u65B9\u6807\u51C6\uFF09",
      local: "data/vocab-store/hsk1_3.json",
      parser: "cards_json",
      count: 600
    },
    {
      id: "hsk4_6",
      available: true,
      name: "HSK 4-6 \u7EA7\u8BCD\u6C47\uFF084195\u8BCD\uFF09",
      desc: "\u6C49\u8BED\u6C34\u5E73\u8003\u8BD5\u4E2D\u9AD8\u7EA7\uFF0C\u542B\u89E3\u91CA\u548C\u4F8B\u53E5",
      category: "chinese",
      grade: "middle",
      subject: "chinese",
      size: "~200KB",
      source: "\u5185\u7F6E\uFF08\u5B98\u65B9\u6807\u51C6\uFF09",
      local: "data/vocab-store/hsk4_6.json",
      parser: "cards_json",
      count: 4195
    },
    {
      id: "moe_3500",
      available: true,
      name: "\u6559\u80B2\u90E8 3500 \u5E38\u7528\u5B57",
      desc: "\u8BED\u6587\u8BFE\u6807\u5E38\u7528\u5B57\u8868\uFF0C\u542B\u8BFB\u97F3\u3001\u7B14\u753B\u3001\u7EC4\u8BCD",
      category: "chinese",
      grade: "primary",
      subject: "chinese",
      size: "~250KB",
      source: "\u5185\u7F6E\uFF08\u56FD\u6807\uFF09",
      local: "data/vocab-store/moe_3500_chars.json",
      parser: "cards_json",
      count: 3500
    },
    {
      id: "moe_2500",
      available: true,
      name: "\u6559\u80B2\u90E8 2500 \u6B21\u5E38\u7528\u5B57",
      desc: "\u8BED\u6587\u8BFE\u6807\u6B21\u5E38\u7528\u5B57\u8868\uFF0C\u542B\u8BFB\u97F3\u548C\u7EC4\u8BCD",
      category: "chinese",
      grade: "middle",
      subject: "chinese",
      size: "~200KB",
      source: "\u5185\u7F6E\uFF08\u56FD\u6807\uFF09",
      local: "data/vocab-store/moe_2500_chars.json",
      parser: "cards_json",
      count: 2500
    },
    {
      id: "chinese_idioms",
      available: true,
      name: "\u6C49\u8BED\u6210\u8BED\u8BCD\u5178\uFF083000\u6761\uFF09",
      desc: "\u5E38\u7528\u6210\u8BED\u542B\u51FA\u5904\u3001\u91CA\u4E49\u3001\u4F8B\u53E5",
      category: "chinese",
      grade: "primary",
      subject: "chinese",
      size: "~300KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/chinese_idioms.json",
      parser: "cards_json",
      count: 3e3
    },
    // ─── 数学 ───
    {
      id: "math_formulas_full",
      available: true,
      name: "\u4E2D\u5C0F\u5B66\u6570\u5B66\u516C\u5F0F\u5927\u5168",
      desc: "\u5C0F\u5B66\u5230\u521D\u4E2D\u5168\u5957\u6570\u5B66\u516C\u5F0F\u548C\u6982\u5FF5\uFF0C\u542B\u4F8B\u9898",
      category: "math",
      grade: "primary",
      subject: "math",
      size: "~80KB",
      source: "\u5185\u7F6E",
      local: "data/vocab-store/math_formulas_full.json",
      parser: "cards_json",
      count: 200
    }
  ];
  var _currentProfile = null;
  function initVocabStore(profile) {
    _currentProfile = profile;
    bindStoreEvents();
  }
  function bindStoreEvents() {
    document.getElementById("btn-vocab-store")?.addEventListener("click", openVocabStore);
    document.getElementById("btn-vocab-store-back")?.addEventListener("click", () => {
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      document.getElementById("page-library")?.classList.add("active");
      document.dispatchEvent(new CustomEvent("refresh-library"));
    });
    document.getElementById("store-mirror-select")?.addEventListener("change", (e) => {
      localStorage.setItem("store_mirror", e.target.value);
    });
    document.querySelectorAll(".store-cat-btn:not(.store-cat-add)").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".store-cat-btn:not(.store-cat-add)").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderVocabList(btn.dataset.cat);
      });
    });
    document.getElementById("btn-add-custom-vocab")?.addEventListener("click", openAddVocabDialog);
    restoreCustomVocabs();
  }
  function openVocabStore() {
    const mirrorSel = document.getElementById("store-mirror-select");
    if (mirrorSel) mirrorSel.value = localStorage.getItem("store_mirror") || "jsdelivr";
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById("page-vocab-store")?.classList.add("active");
    renderVocabList("all");
  }
  async function renderVocabList(category) {
    const list = document.getElementById("vocab-store-list");
    if (!list) return;
    const filtered = category === "all" ? VOCAB_CATALOG : VOCAB_CATALOG.filter((v) => v.category === category);
    const decks = _currentProfile ? await DeckManager.getByProfile(_currentProfile.id) : [];
    const downloadedIds = /* @__PURE__ */ new Set([
      ...decks.map((d) => d.vocabId).filter(Boolean),
      // 按名称回退匹配（历史数据没有 vocabId 字段时）
      ...VOCAB_CATALOG.filter((v) => decks.some((d) => d.name === v.name)).map((v) => v.id)
    ]);
    list.innerHTML = "";
    const groups = [
      { key: "english", label: "\u{1F524} \u82F1\u8BED\u8BCD\u5E93" },
      { key: "chinese", label: "\u6587 \u6C49\u8BED\u8BCD\u5E93" },
      { key: "math", label: "\u2211 \u6570\u5B66\u9898\u5E93" }
    ];
    for (const { key, label } of groups) {
      const items = filtered.filter((v) => v.category === key);
      if (!items.length) continue;
      const section = document.createElement("div");
      section.className = "store-section";
      section.innerHTML = `<div class="store-section-title">${label}</div>`;
      items.forEach((vocab) => {
        const isDownloaded = downloadedIds.has(vocab.id);
        const card = document.createElement("div");
        card.className = "store-vocab-card";
        card.dataset.id = vocab.id;
        card.innerHTML = `
        <div class="svc-info">
          <div class="svc-name">${vocab.name}</div>
          <div class="svc-desc">${vocab.desc}</div>
          <div class="svc-meta">
            <span class="svc-count">${vocab.count.toLocaleString()}\u8BCD</span>
            <span class="svc-size">${vocab.size}</span>
            <span class="svc-source">${vocab.source}</span>
          </div>
          ${vocab.warning ? `<div class="svc-warning">\u26A0 ${vocab.warning}</div>` : ""}
        </div>
        <div class="svc-actions">
          ${isDownloaded ? `<div class="svc-downloaded">\u2713 \u5DF2\u4E0B\u8F7D</div>
               <button class="btn-svc-delete" data-id="${vocab.id}">\u5220\u9664</button>` : vocab.available === false ? `<div class="svc-coming-soon">\u6570\u636E\u66F4\u65B0\u4E2D\uFF0C\u8BF7\u7A0D\u540E</div>` : `<button class="btn-svc-download" data-id="${vocab.id}">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                     <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                   </svg>
                   \u4E0B\u8F7D
                 </button>`}
        </div>
      `;
        section.appendChild(card);
      });
      list.appendChild(section);
    }
    list.querySelectorAll(".btn-svc-download").forEach((btn) => {
      btn.addEventListener("click", () => downloadVocab(btn.dataset.id));
    });
    list.querySelectorAll(".btn-svc-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteVocab(btn.dataset.id));
    });
  }
  async function downloadVocab(vocabId) {
    const vocab = VOCAB_CATALOG.find((v) => v.id === vocabId);
    if (!vocab) return;
    const card = document.querySelector(`.store-vocab-card[data-id="${vocabId}"]`);
    if (!card) return;
    const actionsEl = card.querySelector(".svc-actions");
    actionsEl.innerHTML = `
    <div class="svc-progress">
      <div class="svc-progress-bar" id="svc-bar-${vocabId}"></div>
    </div>
    <div class="svc-progress-text" id="svc-text-${vocabId}">\u51C6\u5907\u4E2D...</div>
  `;
    const setProgress = (pct, msg) => {
      const bar = document.getElementById(`svc-bar-${vocabId}`);
      const text = document.getElementById(`svc-text-${vocabId}`);
      if (bar) bar.style.width = `${pct}%`;
      if (text) text.textContent = msg;
    };
    try {
      setProgress(5, "\u83B7\u53D6\u6570\u636E...");
      let cards;
      if (vocab.local_storage_key) {
        setProgress(20, "\u8BFB\u53D6\u672C\u5730\u6587\u4EF6...");
        const text = getCustomFileContent(vocab.local_storage_key);
        if (text) {
          setProgress(50, "\u89E3\u6790\u4E2D...");
          if (vocab.parser === "ecdict_csv") {
            cards = parseECDICT(text, vocabId);
          } else {
            const data = JSON.parse(text);
            cards = data.cards || data;
          }
        }
      }
      if (!cards && vocab.local) {
        setProgress(20, "\u8BFB\u53D6\u5185\u7F6E\u6570\u636E...");
        const res = await fetch(vocab.local + "?t=" + Date.now());
        if (res.ok) {
          setProgress(50, "\u89E3\u6790\u4E2D...");
          const text = await res.text();
          if (vocab.parser === "ecdict_csv") {
            cards = parseECDICT(text, vocabId);
          } else {
            const data = JSON.parse(text);
            cards = data.cards || data;
          }
        } else if (res.status === 404) {
          throw new Error(`\u8BCD\u5E93\u6570\u636E\u6587\u4EF6\u6682\u672A\u5185\u7F6E\uFF08${vocab.local.split("/").pop()}\uFF09\uFF0C\u8BF7\u5173\u6CE8\u540E\u7EED\u66F4\u65B0`);
        }
      }
      if (!cards && vocab.remote) {
        const mirror = localStorage.getItem("store_mirror") || "jsdelivr";
        if (mirror === "local") {
          throw new Error("\u6B64\u8BCD\u5E93\u9700\u8981\u7F51\u7EDC\u4E0B\u8F7D\uFF0C\u8BF7\u5728\u4E0A\u65B9\u5207\u6362\u4E0B\u8F7D\u6E90\uFF08\u63A8\u8350 jsDelivr\uFF09");
        }
        if (vocab.warning) {
          if (!confirm(`\u26A0 ${vocab.warning}

\u786E\u5B9A\u8981\u4E0B\u8F7D\u5417\uFF1F`)) {
            actionsEl.innerHTML = `<button class="btn-svc-download" data-id="${vocabId}">\u4E0B\u8F7D</button>`;
            actionsEl.querySelector(".btn-svc-download").addEventListener("click", () => downloadVocab(vocabId));
            return;
          }
        }
        const parts = vocab.remote.split("/");
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[2];
        const filePath = parts.slice(3).join("/");
        let url;
        if (mirror === "jsdelivr") {
          url = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filePath}`;
        } else if (mirror === "ghproxy") {
          url = `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        } else {
          url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        }
        setProgress(20, "\u4E0B\u8F7D\u4E2D...");
        let res;
        try {
          res = await fetchWithProgress(url, (pct) => setProgress(20 + pct * 0.5, `\u4E0B\u8F7D\u4E2D ${pct}%`));
        } catch (fetchErr) {
          const fallbackUrl = `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
          if (url !== fallbackUrl) {
            setProgress(20, "\u4E3B\u6E90\u5931\u8D25\uFF0C\u5C1D\u8BD5\u5907\u7528...");
            res = await fetchWithProgress(fallbackUrl, (pct) => setProgress(20 + pct * 0.5, `\u4E0B\u8F7D\u4E2D ${pct}%`));
          } else {
            throw new Error(`\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u6216\u5207\u6362\u4E0B\u8F7D\u6E90\u540E\u91CD\u8BD5`);
          }
        }
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error(`\u8BBF\u95EE\u88AB\u9650\u5236\uFF08403\uFF09\u3002\u8BF7\u5728\u4E0A\u65B9\u5C06\u4E0B\u8F7D\u6E90\u5207\u6362\u4E3A\u300CGitHub Proxy\u300D\u6216\u300CGitHub \u76F4\u8FDE\u300D\u540E\u91CD\u8BD5`);
          }
          throw new Error(`\u4E0B\u8F7D\u5931\u8D25\uFF08${res.status}\uFF09\uFF0C\u8BF7\u5207\u6362\u4E0B\u8F7D\u6E90\u91CD\u8BD5`);
        }
        setProgress(70, "\u89E3\u6790\u4E2D...");
        const text = await res.text();
        if (vocab.parser === "ecdict_csv") {
          cards = parseECDICT(text, vocab.id);
        } else {
          const data = JSON.parse(text);
          cards = data.cards || data;
        }
      }
      if (!cards || !cards.length) throw new Error("\u8BCD\u5E93\u6570\u636E\u4E3A\u7A7A");
      setProgress(85, `\u5199\u5165 ${cards.length.toLocaleString()} \u6761...`);
      const profile = _currentProfile || (await ProfileManager.getAll())[0];
      if (!profile) throw new Error("\u8BF7\u5148\u9009\u62E9\u5B66\u4E60\u6863\u6848");
      const deck = await DeckManager.create(
        profile.id,
        vocab.name,
        vocab.subject,
        vocab.grade,
        true
      );
      deck.vocabId = vocabId;
      await DeckManager.update(deck);
      const BATCH = 500;
      const withSubject = cards.map((c) => ({ ...c, subject: vocab.subject }));
      for (let i = 0; i < withSubject.length; i += BATCH) {
        await CardManager.bulkCreate(profile.id, deck.id, withSubject.slice(i, i + BATCH));
        setProgress(85 + Math.round(i / withSubject.length * 12), `\u5199\u5165 ${Math.min(i + BATCH, withSubject.length).toLocaleString()}/${withSubject.length.toLocaleString()}...`);
      }
      setProgress(100, "\u5B8C\u6210\uFF01");
      setTimeout(() => {
        renderVocabList(document.querySelector(".store-cat-btn.active")?.dataset.cat || "all");
        toast2(`\u5DF2\u4E0B\u8F7D ${cards.length.toLocaleString()} \u6761\u5230\u300C${vocab.name}\u300D`);
        document.dispatchEvent(new CustomEvent("vocab-downloaded", { detail: { profileId: profile.id } }));
      }, 500);
    } catch (e) {
      actionsEl.innerHTML = `
      <div class="svc-error">\u4E0B\u8F7D\u5931\u8D25\uFF1A${e.message}</div>
      <button class="btn-svc-download" data-id="${vocabId}">\u91CD\u8BD5</button>
    `;
      actionsEl.querySelector(".btn-svc-download")?.addEventListener("click", () => downloadVocab(vocabId));
    }
  }
  async function deleteVocab(vocabId) {
    const vocab = VOCAB_CATALOG.find((v) => v.id === vocabId);
    if (!vocab) return;
    if (!confirm(`\u786E\u5B9A\u5220\u9664\u300C${vocab.name}\u300D\u53CA\u5176\u6240\u6709\u5361\u7247\u5417\uFF1F`)) return;
    const profile = _currentProfile;
    if (!profile) return;
    const decks = await DeckManager.getByProfile(profile.id);
    const target = decks.find((d) => d.vocabId === vocabId);
    if (target) {
      await DeckManager.delete(target.id, profile.id);
      toast2(`\u5DF2\u5220\u9664\u300C${vocab.name}\u300D`);
      renderVocabList(document.querySelector(".store-cat-btn.active")?.dataset.cat || "all");
      document.dispatchEvent(new CustomEvent("vocab-downloaded", { detail: { profileId: profile.id } }));
    }
  }
  function parseECDICT(csvText, vocabId) {
    const lines = csvText.split("\n");
    const cards = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine2(lines[i]);
      if (cols.length < 4) continue;
      const word = cols[0]?.trim();
      const phonetic = cols[1]?.trim();
      const trans = cols[3]?.trim();
      const frq = parseInt(cols[9] || "0") || 0;
      if (!word || !trans || !word.match(/^[a-zA-Z'-]+$/) || word.length > 15) continue;
      if (word[0] === word[0].toUpperCase() && word[0].match(/[A-Z]/)) continue;
      const back = trans.replace(/\\n/g, "\uFF1B").split(/[；;]/g).slice(0, 3).join("\uFF1B").trim();
      if (!back) continue;
      cards.push({
        id: `${vocabId}_${i}`,
        type: "word",
        front: word,
        back,
        phonetic: phonetic ? `/${phonetic}/` : "",
        hint: "",
        example: "",
        tags: ["\u82F1\u8BED", "\u8BCD\u6C47"]
      });
    }
    return cards;
  }
  function parseCSVLine2(line) {
    const result = [];
    let inQuotes = false, current = "";
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
  async function fetchWithProgress(url, onProgress, timeoutMs = 3e5) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = parseInt(res.headers.get("content-length") || "0");
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) onProgress?.(Math.round(received / total * 100));
      else onProgress?.(Math.min(99, Math.round(received / 1024 / 10)));
    }
    const allChunks = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, offset);
      offset += chunk.length;
    }
    return new Response(allChunks, { headers: res.headers });
  }
  function toast2(msg) {
    const c = document.getElementById("toast-container");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3e3);
  }
  function openAddVocabDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "add-vocab-modal";
    overlay.innerHTML = `
    <div class="modal">
      <h3>\u6DFB\u52A0\u81EA\u5B9A\u4E49\u8BCD\u5E93</h3>
      <p class="setting-desc" style="margin-bottom:8px">
        \u652F\u6301\u4E24\u79CD\u65B9\u5F0F\uFF1A<br>
        \u2460 \u8F93\u5165\u5728\u7EBF JSON/CSV URL\uFF08\u5982 GitHub Raw \u94FE\u63A5\uFF09<br>
        \u2461 \u9009\u62E9\u672C\u5730 JSON \u6587\u4EF6\uFF08cards \u6570\u7EC4\u683C\u5F0F\uFF09
      </p>

      <input type="text" id="add-vocab-name" placeholder="\u8BCD\u5E93\u540D\u79F0\uFF08\u5FC5\u586B\uFF09" style="margin-bottom:8px">
      <input type="text" id="add-vocab-url" placeholder="\u5728\u7EBF URL\uFF08\u53EF\u9009\uFF0C\u5982 https://.../.json\uFF09" style="margin-bottom:8px">

      <label class="import-card" for="add-vocab-file" style="padding:12px;margin-bottom:8px">
        <span class="import-icon" style="font-size:20px">\u{1F4C1}</span>
        <span class="import-name">\u9009\u62E9\u672C\u5730 JSON \u6587\u4EF6</span>
        <span class="import-desc" id="add-vocab-filename">\u672A\u9009\u62E9</span>
        <input type="file" id="add-vocab-file" accept=".json,.csv" hidden>
      </label>

      <div style="display:flex;gap:8px;margin-bottom:4px">
        <select id="add-vocab-category" class="setting-select" style="flex:1">
          <option value="english">\u82F1\u8BED</option>
          <option value="chinese">\u6C49\u8BED</option>
          <option value="math">\u6570\u5B66</option>
        </select>
        <select id="add-vocab-grade" class="setting-select" style="flex:1">
          <option value="primary">\u5C0F\u5B66</option>
          <option value="middle">\u521D\u4E2D</option>
          <option value="adult">\u6210\u4EBA</option>
        </select>
      </div>

      <div class="modal-buttons" style="margin-top:12px">
        <button class="btn-secondary" id="add-vocab-cancel">\u53D6\u6D88</button>
        <button class="btn-primary" id="add-vocab-save" style="flex:1">\u6DFB\u52A0\u8BCD\u5E93</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    let selectedFile = null;
    document.getElementById("add-vocab-file").addEventListener("change", (e) => {
      selectedFile = e.target.files[0];
      if (selectedFile) {
        document.getElementById("add-vocab-filename").textContent = selectedFile.name;
      }
    });
    document.getElementById("add-vocab-cancel").addEventListener("click", () => overlay.remove());
    document.getElementById("add-vocab-save").addEventListener("click", async () => {
      const name = document.getElementById("add-vocab-name").value.trim();
      const url = document.getElementById("add-vocab-url").value.trim();
      const category = document.getElementById("add-vocab-category").value;
      const grade = document.getElementById("add-vocab-grade").value;
      if (!name) {
        toast2("\u8BF7\u586B\u5199\u8BCD\u5E93\u540D\u79F0");
        return;
      }
      if (!url && !selectedFile) {
        toast2("\u8BF7\u8F93\u5165 URL \u6216\u9009\u62E9\u672C\u5730\u6587\u4EF6");
        return;
      }
      const id = "custom_" + Date.now();
      const entry = {
        id,
        name,
        desc: "\u7528\u6237\u81EA\u5B9A\u4E49\u8BCD\u5E93",
        category,
        grade,
        subject: category,
        size: "\u81EA\u5B9A\u4E49",
        source: url ? url.slice(0, 40) + "..." : selectedFile?.name || "\u672C\u5730\u6587\u4EF6",
        count: 0,
        isCustom: true
      };
      if (url) {
        entry.remote = url;
        entry.parser = url.endsWith(".csv") ? "ecdict_csv" : "cards_json";
      } else if (selectedFile) {
        const text = await selectedFile.text();
        const stored = localStorage.getItem("custom_vocab_files") ? JSON.parse(localStorage.getItem("custom_vocab_files")) : {};
        stored[id] = text;
        localStorage.setItem("custom_vocab_files", JSON.stringify(stored));
        entry.local_storage_key = id;
        entry.parser = selectedFile.name.endsWith(".csv") ? "ecdict_csv" : "cards_json";
      }
      VOCAB_CATALOG.push(entry);
      const saved = localStorage.getItem("custom_vocab_catalog") ? JSON.parse(localStorage.getItem("custom_vocab_catalog")) : [];
      saved.push(entry);
      localStorage.setItem("custom_vocab_catalog", JSON.stringify(saved));
      overlay.remove();
      toast2(`\u5DF2\u6DFB\u52A0\u8BCD\u5E93\uFF1A${name}`);
      renderVocabList(document.querySelector(".store-cat-btn.active")?.dataset.cat || "all");
    });
  }
  function restoreCustomVocabs() {
    const saved = localStorage.getItem("custom_vocab_catalog");
    if (!saved) return;
    try {
      const entries = JSON.parse(saved);
      entries.forEach((e) => {
        if (!VOCAB_CATALOG.find((v) => v.id === e.id)) {
          VOCAB_CATALOG.push(e);
        }
      });
    } catch (_) {
    }
  }
  function getCustomFileContent(storageKey) {
    const stored = localStorage.getItem("custom_vocab_files");
    if (!stored) return null;
    try {
      return JSON.parse(stored)[storageKey];
    } catch (_) {
      return null;
    }
  }

  // app/ui.js
  init_recitation();
  var App = {
    currentProfile: null,
    studyQueue: [],
    studyIndex: 0,
    sessionResults: [],
    allProfileCards: [],
    isCardFlipped: false,
    cardDirection: "normal",
    // 'normal' = 正向(front→back)，'reverse' = 反向(back→front)
    recordStream: null,
    recordStop: null
  };
  function $4(id) {
    return document.getElementById(id);
  }
  function show3(el) {
    el?.classList.remove("hidden");
  }
  function hide3(el) {
    el?.classList.add("hidden");
  }
  function toast4(msg, duration = 2500) {
    const container = $4("toast-container");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
  var _pageHistory = [];
  var _isGoingBack = false;
  function goBack() {
    const prev = _pageHistory.pop();
    _isGoingBack = true;
    showPage(prev || "home");
    _isGoingBack = false;
    if (!prev) loadHomeData();
  }
  window._goBack = goBack;
  window._showPage = showPage;
  function showPage(pageId) {
    if (!_isGoingBack) {
      const cur = document.querySelector(".page.active")?.id?.replace("page-", "");
      if (cur && cur !== pageId && cur !== "profiles") {
        _pageHistory.push(cur);
        if (_pageHistory.length > 30) _pageHistory.shift();
      }
    }
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    const target = $4(`page-${pageId}`);
    if (target) target.classList.add("active");
    if (target && pageId !== "home" && pageId !== "profiles") {
      const header = target.querySelector(".page-header, .study-header, .home-header");
      if (header && !header.querySelector(".btn-go-home")) {
        const btn = document.createElement("button");
        btn.className = "btn-go-home btn-icon";
        btn.title = "\u8FD4\u56DE\u4E3B\u9875";
        btn.innerHTML = "\u{1F3E0}";
        btn.style.cssText = "background:rgba(255,255,255,0.2);color:white;font-size:16px;flex-shrink:0;margin-left:auto";
        btn.addEventListener("click", () => {
          _pageHistory.length = 0;
          _isGoingBack = true;
          showPage("home");
          _isGoingBack = false;
          loadHomeData();
        });
        header.appendChild(btn);
      }
    }
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === pageId);
    });
  }
  async function init() {
    await loadProfiles();
    try {
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = btn.dataset.page;
          if (page === "english") {
            showPage("english-adult");
            return;
          }
          showPage(page);
          if (page === "library") {
            renderLibrary();
            App._needLibraryRefresh = false;
          }
          if (page === "search") initSearchPage();
          if (page === "stats") renderStats();
          if (page === "settings") renderSettings();
        });
      });
      document.querySelectorAll(".btn-back").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.page) showPage(btn.dataset.page);
          else goBack();
        });
      });
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderLibrary();
        });
      });
      $4("btn-quick-oral")?.addEventListener("click", () => {
        showPage("english-adult");
        Promise.resolve().then(() => (init_english(), english_exports)).then((m) => m.switchEnglishTabPublic?.("speaking") || null);
        document.getElementById("etab-speaking")?.scrollIntoView();
        document.querySelectorAll(".english-tab").forEach((t) => t.classList.toggle("active", t.dataset.etab === "speaking"));
        document.querySelectorAll(".english-section").forEach((s) => {
          s.classList.toggle("active", s.id === "etab-speaking");
          s.classList.toggle("hidden", s.id !== "etab-speaking");
        });
        Promise.resolve().then(() => (init_english(), english_exports)).then((m) => m.renderScenarioGrid?.());
      });
      $4("btn-quick-phonetics")?.addEventListener("click", () => {
        showPage("english-adult");
        document.querySelectorAll(".english-tab").forEach((t) => t.classList.toggle("active", t.dataset.etab === "phonetics"));
        document.querySelectorAll(".english-section").forEach((s) => {
          s.classList.toggle("active", s.id === "etab-phonetics");
          s.classList.toggle("hidden", s.id !== "etab-phonetics");
        });
        Promise.resolve().then(() => (init_english(), english_exports)).then((m) => m.renderPhonemeGrid?.("vowels"));
      });
      $4("btn-quick-grammar")?.addEventListener("click", () => {
        showPage("english-adult");
        document.querySelectorAll(".english-tab").forEach((t) => t.classList.toggle("active", t.dataset.etab === "grammar"));
        document.querySelectorAll(".english-section").forEach((s) => {
          s.classList.toggle("active", s.id === "etab-grammar");
          s.classList.toggle("hidden", s.id !== "etab-grammar");
        });
        Promise.resolve().then(() => (init_english(), english_exports)).then((m) => m.renderGrammarList?.("all"));
      });
      $4("btn-quick-chinese")?.addEventListener("click", () => openChineseLearningPage());
      $4("btn-quick-recite-tab")?.addEventListener("click", () => openChineseTab("recite"));
      $4("btn-quick-pinyin-tab")?.addEventListener("click", () => openChineseTab("pinyin"));
      $4("btn-quick-chars-tab")?.addEventListener("click", () => openChineseTab("chars"));
      $4("btn-quick-idioms-tab")?.addEventListener("click", () => openChineseTab("idioms"));
      document.querySelectorAll(".chinese-tab").forEach((btn) => {
        btn.addEventListener("click", () => switchChineseTab(btn.dataset.ctab));
      });
      $4("btn-study-back")?.addEventListener("click", () => goBack());
      $4("btn-back-home")?.addEventListener("click", () => {
        hide3($4("session-complete"));
        goBack();
        loadHomeData();
      });
      $4("btn-continue")?.addEventListener("click", () => startStudySession());
      document.querySelectorAll(".subject-card[data-subject]").forEach((btn) => {
        btn.addEventListener("click", () => startStudyBySubject(btn.dataset.subject));
      });
      $4("btn-home-recite")?.addEventListener("click", openHomeRecitation);
      $4("btn-start-review")?.addEventListener("click", () => startStudySession());
      $4("btn-switch-profile")?.addEventListener("click", () => showPage("profiles"));
      $4("btn-voice-switch").addEventListener("click", openVoiceSwitch);
      $4("btn-voice-cancel").addEventListener("click", closeVoiceSwitch);
      $4("btn-manage-profiles").addEventListener("click", openManageProfiles);
      $4("btn-manage-close").addEventListener("click", () => hide3($4("manage-profiles-modal")));
      $4("btn-manage-add").addEventListener("click", () => {
        hide3($4("manage-profiles-modal"));
        openProfileEditModal(null);
      });
      $4("btn-profile-cancel").addEventListener("click", () => hide3($4("profile-edit-modal")));
      $4("btn-profile-save").addEventListener("click", saveProfileFromModal);
      $4("avatar-picker").addEventListener("click", (e) => {
        const btn = e.target.closest(".avatar-option");
        if (!btn) return;
        document.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        $4("profile-selected-avatar").textContent = btn.dataset.emoji;
      });
      $4("btn-ai-generate")?.addEventListener("click", openAIModal);
      $4("ai-generate-modal")?.addEventListener("click", (e) => {
        const tab = e.target.closest("[data-provider]");
        if (!tab) return;
        $4("ai-generate-modal").querySelectorAll("[data-provider]").forEach((b) => b.classList.remove("active"));
        tab.classList.add("active");
        localStorage.setItem("ai_provider", tab.dataset.provider);
      });
      $4("btn-ai-cancel")?.addEventListener("click", () => hide3($4("ai-generate-modal")));
      $4("btn-ai-submit")?.addEventListener("click", handleAIGenerate);
      document.querySelectorAll(".btn-tpl").forEach((btn) => {
        btn.addEventListener("click", () => downloadTemplate(btn.dataset.tpl));
      });
      document.querySelectorAll(".rd-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".rd-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          App.cardDirection = btn.dataset.dir;
        });
      });
      document.querySelectorAll(".mode-tab").forEach((tab) => {
        tab.addEventListener("click", () => switchStudyMode(tab.dataset.mode));
      });
      $4("flashcard")?.addEventListener("click", (e) => {
        if (e.target.closest(".btn-card-action") || e.target.closest(".voice-answer-result")) return;
        flipCard();
      });
      document.querySelectorAll(".btn-rating[data-rating]").forEach((btn) => {
        btn.addEventListener("click", () => submitRating(parseInt(btn.dataset.rating)));
      });
      $4("btn-flip-back")?.addEventListener("click", () => {
        App.isCardFlipped = false;
        $4("card-inner").classList.remove("flipped");
        hide3($4("rating-buttons"));
      });
      $4("btn-speak-front")?.addEventListener("click", (e) => {
        e.stopPropagation();
        speakCurrentCardFront();
      });
      $4("btn-speak-card")?.addEventListener("click", speakCurrentCardFront);
      $4("btn-speak-back")?.addEventListener("click", (e) => {
        e.stopPropagation();
        speakCurrentCardBack();
      });
      $4("btn-voice-answer")?.addEventListener("click", startVoiceAnswer);
      $4("choice-options")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".choice-btn");
        if (btn) onChoiceSelected(btn);
      });
      $4("btn-check-dictation")?.addEventListener("click", checkDictation);
      $4("btn-next-dictation")?.addEventListener("click", () => submitRating(2));
      $4("btn-dictation-replay")?.addEventListener("click", replayDictation);
      $4("btn-dictation-peek")?.addEventListener("click", peekDictationAnswer);
      $4("dictation-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkDictation();
      });
      $4("btn-record")?.addEventListener("click", toggleRecording);
      $4("file-input")?.addEventListener("change", (e) => handleFileInput(e.target.files[0]));
      $4("image-input")?.addEventListener("change", (e) => handleImageInput(e.target.files[0]));
      $4("btn-manual-input")?.addEventListener("click", () => show3($4("manual-modal")));
      $4("btn-manual-cancel")?.addEventListener("click", () => hide3($4("manual-modal")));
      $4("btn-manual-save")?.addEventListener("click", () => saveManualCard(false));
      $4("btn-manual-add-more")?.addEventListener("click", () => saveManualCard(true));
      $4("btn-confirm-import")?.addEventListener("click", confirmImport);
      $4("btn-load-builtin")?.addEventListener("click", showBuiltinLibrary);
      document.querySelectorAll(".import-mode-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          document.querySelectorAll(".import-mode-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const isAppend = btn.dataset.mode === "append";
          $4("import-new-section")?.classList.toggle("hidden", isAppend);
          $4("import-append-section")?.classList.toggle("hidden", !isAppend);
          if (isAppend && App.currentProfile) {
            const decks = await DeckManager.getByProfile(App.currentProfile.id);
            const sel = $4("import-target-deck");
            if (sel) {
              sel.innerHTML = '<option value="">-- \u9009\u62E9\u8981\u8FFD\u52A0\u7684\u9898\u5E93 --</option>' + decks.map((d) => `<option value="${d.id}">${escapeHtml5(d.name)}\uFF08${App.allProfileCards.filter((c) => c.deckId === d.id).length}\u5F20\uFF09</option>`).join("");
            }
          }
        });
      });
      const searchInput = $4("library-search-input");
      if (searchInput) {
        let searchTimer;
        searchInput.addEventListener("input", () => {
          clearTimeout(searchTimer);
          const q = searchInput.value.trim();
          if (q) {
            show3($4("btn-search-clear"));
            searchTimer = setTimeout(() => searchCards(q), 300);
          } else {
            hide3($4("btn-search-clear"));
            hide3($4("search-results"));
          }
        });
        $4("btn-search-clear")?.addEventListener("click", () => {
          searchInput.value = "";
          hide3($4("btn-search-clear"));
          hide3($4("search-results"));
        });
      }
      $4("btn-import-to-library")?.addEventListener("click", () => show3($4("import-to-library-modal")));
      $4("btn-import-lib-cancel")?.addEventListener("click", () => hide3($4("import-to-library-modal")));
      $4("lib-file-input")?.addEventListener("change", (e) => {
        hide3($4("import-to-library-modal"));
        handleFileInputWithSubject(e.target.files[0]);
      });
      $4("lib-image-input")?.addEventListener("change", (e) => {
        hide3($4("import-to-library-modal"));
        handleImageInput(e.target.files[0]);
      });
      $4("btn-lib-manual")?.addEventListener("click", () => {
        hide3($4("import-to-library-modal"));
        show3($4("manual-modal"));
      });
      $4("btn-lib-ai")?.addEventListener("click", () => {
        hide3($4("import-to-library-modal"));
        openAIModal();
      });
      $4("setting-new-per-day")?.addEventListener("input", (e) => {
        $4("new-per-day-value").textContent = e.target.value;
      });
      $4("setting-speech-rate")?.addEventListener("input", (e) => {
        $4("speech-rate-value").textContent = `${e.target.value}\xD7`;
      });
      $4("btn-save-azure")?.addEventListener("click", saveAzureConfig);
      $4("btn-save-ai-config")?.addEventListener("click", saveAIConfig);
      $4("btn-update-builtin")?.addEventListener("click", updateAllBuiltinDecks);
      $4("btn-export-data")?.addEventListener("click", exportCurrentProfile);
      $4("btn-clear-data")?.addEventListener("click", clearCurrentProfileData);
      $4("btn-show-privacy")?.addEventListener("click", () => {
        $4("privacy-overlay")?.classList.remove("hidden");
      });
      $4("btn-close-privacy")?.addEventListener("click", () => {
        $4("privacy-overlay")?.classList.add("hidden");
      });
      $4("btn-privacy-ok")?.addEventListener("click", () => {
        $4("privacy-overlay")?.classList.add("hidden");
      });
      $4("privacy-overlay")?.addEventListener("click", (e) => {
        if (e.target === $4("privacy-overlay")) $4("privacy-overlay").classList.add("hidden");
      });
      $4("btn-add-profile")?.addEventListener("click", () => openProfileEditModal(null));
      setupSwipeGesture();
      setupBackGesture();
      initSpeakingButtons();
      document.body.addEventListener("touchstart", () => {
        if (SpeechSupport.tts && !window._ttsInited) {
          const u = new SpeechSynthesisUtterance("");
          speechSynthesis.speak(u);
          window._ttsInited = true;
        }
      }, { once: true });
    } catch (err) {
      console.warn("init() binding error:", err);
    }
  }
  async function loadProfiles() {
    const profiles = await ProfileManager.getAll();
    if (profiles.length === 0) {
      const profile = await ProfileManager.create("\u5C0F\u670B\u53CB", "\u{1F43C}", "primary");
      App.currentProfile = profile;
      showPage("home");
      loadHomeData();
      return;
    }
    renderProfilesGrid(profiles);
    showPage("profiles");
  }
  function renderProfilesGrid(profiles) {
    const grid = $4("profiles-grid");
    grid.innerHTML = "";
    profiles.forEach((p) => {
      const card = document.createElement("button");
      card.className = "profile-card";
      card.innerHTML = `
      <div class="profile-avatar">${p.avatar || "\u{1F423}"}</div>
      <div class="profile-name">${escapeHtml5(p.name)}</div>
      <div class="profile-grade">${gradeLabel2(p.grade)}</div>
    `;
      card.addEventListener("click", () => selectProfile(p));
      grid.appendChild(card);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "profile-card profile-add";
    addBtn.innerHTML = `<div class="profile-avatar" style="background:none;font-size:36px">+</div><div class="profile-name">\u6DFB\u52A0</div>`;
    addBtn.addEventListener("click", addProfileDialog);
    grid.appendChild(addBtn);
  }
  async function selectProfile(profile) {
    App.currentProfile = profile;
    App.allProfileCards = await CardManager.getByProfile(profile.id);
    $4("current-avatar").textContent = profile.avatar || "\u{1F423}";
    $4("current-name").textContent = profile.name;
    window._App = App;
    const isYoung = profile.grade?.startsWith("primary") && parseInt(profile.grade.replace("primary", "")) <= 3;
    document.body.className = isYoung ? "theme-young" : "";
    initEnglish(profile);
    initVocabStore(profile);
    try {
      await initRecitation();
    } catch (_) {
    }
    document.addEventListener("vocab-downloaded", (e) => {
      if (e.detail?.profileId === profile.id) {
        CardManager.getByProfile(profile.id).then((cards) => {
          App.allProfileCards = cards;
          loadHomeData();
          const activePage = document.querySelector(".page.active")?.id;
          if (activePage === "page-library") {
            renderLibrary();
          }
          if (activePage === "page-vocab-store") {
            App._needLibraryRefresh = true;
          }
        });
      }
    }, { once: false });
    showPage("home");
    loadHomeData();
  }
  async function loadHomeData() {
    if (!App.currentProfile) return;
    const profile = App.currentProfile;
    const streak = await ProgressManager.updateStreak(profile);
    $4("streak-count").textContent = streak;
    const due = await CardManager.getDueCards(profile.id);
    const newCards = App.allProfileCards.filter((c) => c.reviewCount === 0);
    const todayProg = await ProgressManager.getByDate(profile.id, todayStr());
    $4("due-count").textContent = due.length;
    $4("new-count").textContent = newCards.length;
    $4("done-count").textContent = todayProg?.reviewed || 0;
    const subjectTagMap = {
      chinese: ["\u8BED\u6587", "\u53E4\u8BD7", "\u6210\u8BED", "\u6587\u8A00\u6587", "\u8BED\u6587"],
      english: ["\u82F1\u8BED", "English", "CET-4", "CET-6", "\u6210\u4EBA", "\u5355\u8BCD"],
      math: ["\u6570\u5B66", "\u516C\u5F0F", "\u51E0\u4F55", "\u4EE3\u6570", "\u4E58\u6CD5\u53E3\u8BC0"]
    };
    const bySubject = {};
    App.allProfileCards.forEach((c) => {
      let effectiveSubject = c.subject || "custom";
      if (effectiveSubject === "custom" || !effectiveSubject) {
        for (const [subj, tags] of Object.entries(subjectTagMap)) {
          if (tags.some((t) => c.tags?.includes(t))) {
            effectiveSubject = subj;
            break;
          }
        }
      }
      if (!bySubject[effectiveSubject]) bySubject[effectiveSubject] = { total: 0, mastered: 0 };
      bySubject[effectiveSubject].total++;
      if (c.box >= 3 || c.interval >= 21) bySubject[effectiveSubject].mastered++;
    });
    ["chinese", "english", "math", "custom"].forEach((s) => {
      const el = $4(`prog-${s}`);
      if (!el) return;
      if (bySubject[s] && bySubject[s].total > 0) {
        const pct = Math.round(bySubject[s].mastered / bySubject[s].total * 100);
        el.textContent = `${bySubject[s].total}\u8BCD \xB7 ${pct}%\u5DF2\u638C\u63E1`;
      } else {
        el.textContent = "\u70B9\u51FB\u52A0\u8F7D";
        el.style.color = "var(--color-text-hint)";
      }
    });
  }
  async function openVoiceSwitch() {
    if (!SpeechSupport.stt) {
      toast4("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome");
      return;
    }
    show3($4("voice-overlay"));
    $4("voice-anim").classList.add("listening");
    const profiles = await ProfileManager.getAll();
    const names = profiles.map((p) => p.name);
    $4("voice-overlay-text").textContent = "\u8BF4\u51FA\u8981\u5207\u6362\u7684\u540D\u5B57...";
    startVoiceProfileSwitch(
      names,
      async (matchedName) => {
        const found = profiles.find((p) => p.name === matchedName);
        if (found) {
          closeVoiceSwitch();
          await selectProfile(found);
          toast4(`\u5DF2\u5207\u6362\u5230 ${found.name}`);
        }
      },
      (msg) => {
        $4("voice-overlay-text").textContent = msg;
        setTimeout(closeVoiceSwitch, 2e3);
      },
      closeVoiceSwitch
    );
  }
  function closeVoiceSwitch() {
    stopListening();
    hide3($4("voice-overlay"));
    $4("voice-anim").classList.remove("listening");
  }
  async function startStudySession(subject) {
    const profile = App.currentProfile;
    if (!profile) return;
    App.allProfileCards = await CardManager.getByProfile(profile.id);
    const due = await CardManager.getDueCards(profile.id);
    const newCards = App.allProfileCards.filter((c) => c.reviewCount === 0);
    const subjectFilter = (card) => {
      if (!subject) return true;
      if (card.subject === subject) return true;
      const subjectTagMap = { chinese: ["\u8BED\u6587", "\u53E4\u8BD7", "\u6210\u8BED", "\u6587\u8A00\u6587"], english: ["\u82F1\u8BED", "English"], math: ["\u6570\u5B66", "\u516C\u5F0F"] };
      const tags = subjectTagMap[subject] || [];
      return tags.some((t) => card.tags?.includes(t));
    };
    const subjectDue = subject ? due.filter(subjectFilter) : due;
    const subjectNew = subject ? newCards.filter(subjectFilter) : newCards;
    const allSubject = subject ? App.allProfileCards.filter(subjectFilter) : App.allProfileCards;
    if (subject && allSubject.length === 0) {
      const subjectNames = { chinese: "\u8BED\u6587", english: "\u82F1\u8BED", math: "\u6570\u5B66" };
      const name = subjectNames[subject] || subject;
      toast4(`\u8FD8\u6CA1\u6709${name}\u5361\u7247\uFF0C\u8BF7\u5728\u9898\u5E93\u4E2D\u52A0\u8F7D\u5185\u7F6E\u5E93\u6216\u5BFC\u5165\u7D20\u6750`);
      showPage("library");
      renderLibrary();
      return;
    }
    if (subject && allSubject.length > 0 && subjectDue.length === 0 && subjectNew.length === 0) {
      const mastered = allSubject.filter((c) => c.box >= 3 || c.interval >= 21).length;
      toast4(`${allSubject.length}\u5F20\u5361\u7247\u4E2D\u5DF2\u638C\u63E1${mastered}\u5F20\uFF0C\u4ECA\u5929\u6CA1\u6709\u9700\u8981\u590D\u4E60\u7684\uFF0C\u660E\u5929\u518D\u6765\uFF01`);
      return;
    }
    let queue = buildStudyQueue(subjectDue, subjectNew, profile.newPerDay || 10);
    if (queue.length === 0) {
      toast4("\u4ECA\u5929\u7684\u5361\u7247\u90FD\u590D\u4E60\u5B8C\u5566\uFF01\u{1F389}");
      return;
    }
    App.studyQueue = queue;
    App.studyIndex = 0;
    App.sessionResults = [];
    hide3($4("session-complete"));
    showPage("study");
    const studyPage = $4("page-study");
    if (studyPage) {
      studyPage.classList.remove("subject-chinese", "subject-english", "subject-math", "subject-custom");
      const subj = subject || App.studyQueue[0]?.subject || "custom";
      studyPage.classList.add("subject-" + subj);
    }
    switchStudyMode("flashcard");
    renderCard();
  }
  function openChineseLearningPage() {
    showPage("chinese-learning");
    switchChineseTab("recite");
  }
  function openChineseTab(tab) {
    showPage("chinese-learning");
    document.querySelectorAll(".chinese-tab").forEach((b) => b.classList.toggle("active", b.dataset.ctab === tab));
    switchChineseTab(tab);
  }
  function switchChineseTab(tab) {
    document.querySelectorAll(".chinese-tab").forEach((b) => b.classList.toggle("active", b.dataset.ctab === tab));
    document.querySelectorAll(".chinese-section").forEach((s) => {
      s.classList.toggle("active", s.id === `ctab-${tab}`);
      s.classList.toggle("hidden", s.id !== `ctab-${tab}`);
    });
    if (tab === "recite") initCtabRecite();
    if (tab === "pinyin") initCtabPinyin();
    if (tab === "chars") initCtabChars();
    if (tab === "idioms") initCtabIdioms();
    if (tab === "poems") initCtabPoems();
  }
  function initCtabRecite() {
    const list = document.getElementById("ctab-recite-list");
    if (!list) return;
    const { getRecitationTexts: getRecitationTexts2, openRecitationPage: openRecitationPage2 } = window._recitationAPI || {};
    const texts = window._recitationTexts || [];
    if (!texts.length) {
      list.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">\u6B63\u5728\u52A0\u8F7D\u53E4\u8BD7\u6570\u636E\u2026</p>';
      setTimeout(() => {
        if (window._recitationTexts?.length) initCtabRecite();
      }, 500);
      return;
    }
    function renderList(cat2 = "all", query = "") {
      let items = texts;
      if (cat2 === "primary") items = items.filter((t) => t.grade?.startsWith("primary"));
      else if (cat2 === "middle") items = items.filter((t) => t.grade?.startsWith("middle"));
      else if (cat2 === "poem") items = items.filter((t) => t.category === "\u53E4\u8BD7" || t.category === "\u53E4\u8BD7\u8BCD" || t.tags?.includes("\u53E4\u8BD7"));
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((t) => t.title?.includes(query) || t.author?.toLowerCase().includes(q) || t.dynasty?.includes(query));
      }
      const gradeLabel3 = (g) => ({ primary1: "\u5C0F\u5B66\u4E00\u5E74\u7EA7", primary2: "\u5C0F\u5B66\u4E8C\u5E74\u7EA7", primary3: "\u5C0F\u5B66\u4E09\u5E74\u7EA7", primary4: "\u5C0F\u5B66\u56DB\u5E74\u7EA7", primary5: "\u5C0F\u5B66\u4E94\u5E74\u7EA7", primary6: "\u5C0F\u5B66\u516D\u5E74\u7EA7", middle1: "\u521D\u4E2D\u4E00\u5E74\u7EA7", middle2: "\u521D\u4E2D\u4E8C\u5E74\u7EA7", middle3: "\u521D\u4E2D\u4E09\u5E74\u7EA7" })[g] || g || "";
      if (!items.length) {
        list.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-sub)">\u6682\u65E0\u5185\u5BB9</p>';
        return;
      }
      list.innerHTML = items.map((t) => {
        const isWenyan = t.category === "\u6587\u8A00\u6587" || t.tags?.includes("\u6587\u8A00\u6587");
        return `<button class="recite-text-item" data-id="${t.id}" style="width:100%;text-align:left">
        <div class="rti-cat" style="background:${isWenyan ? "#8B5CF6" : "var(--color-chinese)"}">${isWenyan ? "\u6587" : "\u8BD7"}</div>
        <div class="rti-info">
          <div class="rti-title">${t.title}</div>
          <div class="rti-meta">${t.dynasty ? t.dynasty + " \xB7 " : ""}${t.author || ""}${t.category ? " \xB7 " + t.category : ""}</div>
        </div>
        <div class="rti-segs">${t.segments?.length || 0}\u6BB5 \u203A</div>
      </button>`;
      }).join("");
      list.querySelectorAll(".recite-text-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (window._openRecitationPage) window._openRecitationPage(btn.dataset.id);
        });
      });
    }
    const tabContainer = document.querySelector("#ctab-recite .recite-list-tabs");
    if (tabContainer && !tabContainer.dataset.bound) {
      tabContainer.dataset.bound = "1";
      tabContainer.querySelectorAll(".recite-list-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          tabContainer.querySelectorAll(".recite-list-tab").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const q = document.getElementById("ctab-recite-search")?.value.trim() || "";
          renderList(btn.dataset.cat, q);
        });
      });
    }
    const searchInput = document.getElementById("ctab-recite-search");
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "1";
      let timer;
      searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const cat2 = document.querySelector("#ctab-recite .recite-list-tab.active")?.dataset.cat || "all";
          renderList(cat2, searchInput.value.trim());
        }, 250);
      });
    }
    const cat = document.querySelector("#ctab-recite .recite-list-tab.active")?.dataset.cat || "all";
    renderList(cat);
  }
  var _ctabPinyinMode = "table";
  var _ctabPinyinGrade = "all";
  function initCtabPinyin() {
    const modeTabs = document.getElementById("ctab-py-mode-tabs");
    if (modeTabs && !modeTabs.dataset.bound) {
      modeTabs.dataset.bound = "1";
      modeTabs.querySelectorAll(".py-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          modeTabs.querySelectorAll(".py-mode-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _ctabPinyinMode = btn.dataset.pymode;
          const gradeRow = document.getElementById("ctab-py-grade-row");
          if (gradeRow) gradeRow.style.display = _ctabPinyinMode === "p2w" || _ctabPinyinMode === "w2p" ? "flex" : "none";
          renderCtabPinyin();
        });
      });
      document.getElementById("ctab-py-grade-row")?.querySelectorAll(".py-grade-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.getElementById("ctab-py-grade-row").querySelectorAll(".py-grade-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _ctabPinyinGrade = btn.dataset.pygrade;
          renderCtabPinyin();
        });
      });
    }
    if (window._pinyinData) {
      renderCtabPinyin();
    } else {
      Promise.resolve().then(() => (init_pinyin(), pinyin_exports)).then((m) => m.initPinyin?.()).then(() => renderCtabPinyin());
    }
  }
  function renderCtabPinyin() {
    const body = document.getElementById("ctab-py-body");
    if (!body || !window._pinyinData) return;
    Promise.resolve().then(() => (init_pinyin(), pinyin_exports)).then((m) => {
      if (window._renderPinyinToElement) {
        window._renderPinyinToElement(body, _ctabPinyinMode, _ctabPinyinGrade);
      }
    });
  }
  async function startStudyFromSubjectDeck(subject, deckNameKeyword) {
    const profile = App.currentProfile;
    if (!profile) return;
    App._studyFromPage = "chinese-learning";
    const decks = await DeckManager.getByProfile(profile.id);
    const deck = decks.find((d) => d.subject === subject && d.name.includes(deckNameKeyword));
    if (deck) {
      startStudyFromDeck(deck.id, subject);
    } else {
      toast4(`\u6B63\u5728\u52A0\u8F7D"${deckNameKeyword}"...`);
      await ensureBuiltinDeck(subject, deckNameKeyword);
    }
  }
  function startStudyBySubject(subject) {
    if (subject === "custom") {
      showPage("library");
      renderLibrary();
      return;
    }
    openSubjectDecksPage(subject);
  }
  async function openHomeRecitation() {
    try {
      await initRecitation();
    } catch (_) {
    }
    openRecitationListPage();
  }
  var _ctabCharsTab = "chars";
  async function initCtabChars() {
    const tabs = document.getElementById("ctab-chars-tabs");
    if (tabs && !tabs.dataset.bound) {
      tabs.dataset.bound = "1";
      tabs.querySelectorAll(".py-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          tabs.querySelectorAll(".py-mode-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _ctabCharsTab = btn.dataset.charstab;
          renderCtabChars();
        });
      });
    }
    renderCtabChars();
  }
  async function renderCtabChars() {
    const body = document.getElementById("ctab-chars-body");
    if (!body) return;
    body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u52A0\u8F7D\u4E2D\u2026</p>';
    const deckName = _ctabCharsTab === "chars" ? "\u5C0F\u5B66\u751F\u5B57" : "\u5C0F\u5B66\u8BED\u6587\u8BCD\u8BED";
    const cards = await loadBuiltinCardsInline("chinese", deckName);
    if (!cards.length) {
      body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u6682\u65E0\u6570\u636E\uFF0C\u9996\u6B21\u4F7F\u7528\u9700\u52A0\u8F7D</p>';
      return;
    }
    body.innerHTML = cards.slice(0, 100).map((c) => `
    <div class="ctab-card-item">
      <div class="ctab-card-front">${escapeHtml5(c.front)}</div>
      <div class="ctab-card-back">${escapeHtml5((c.back || "").split("\uFF5C")[0])}</div>
      ${c.phonetic ? `<div class="ctab-card-phonetic">${escapeHtml5(c.phonetic)}</div>` : ""}
      <button class="ctab-card-speak" data-text="${escapeHtml5(c.front)}">\u{1F50A}</button>
    </div>`).join("");
    body.querySelectorAll(".ctab-card-speak").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        speakChinese(btn.dataset.text, 0.8);
      });
    });
    if (cards.length > 100) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn-secondary";
      moreBtn.style.cssText = "width:100%;margin-top:8px";
      moreBtn.textContent = `\u25B6 \u8FDB\u5165\u95EA\u5361\u7EC3\u4E60\uFF08\u5171${cards.length}\u5F20\uFF09`;
      moreBtn.addEventListener("click", () => startStudyFromSubjectDeck("chinese", deckName));
      body.appendChild(moreBtn);
    }
  }
  async function initCtabIdioms() {
    const body = document.getElementById("ctab-idioms-body");
    if (!body) return;
    const search = document.getElementById("ctab-idioms-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      let timer;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => renderCtabIdioms(search.value.trim()), 250);
      });
    }
    renderCtabIdioms("");
  }
  async function renderCtabIdioms(query = "") {
    const body = document.getElementById("ctab-idioms-body");
    if (!body) return;
    body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u52A0\u8F7D\u4E2D\u2026</p>';
    let cards = await loadBuiltinCardsInline("chinese", "\u5C0F\u5B66\u6210\u8BED");
    if (query) cards = cards.filter((c) => c.front?.includes(query) || c.back?.includes(query));
    if (!cards.length) {
      body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u672A\u627E\u5230\u76F8\u5173\u6210\u8BED</p>';
      return;
    }
    body.innerHTML = cards.slice(0, 80).map((c) => `
    <div class="ctab-card-item ctab-idiom-item">
      <div class="ctab-idiom-word">${escapeHtml5(c.front)}</div>
      <div class="ctab-card-back">${escapeHtml5(c.back || "")}</div>
      ${c.example ? `<div class="ctab-idiom-ex">\u{1F4DD} ${escapeHtml5(c.example)}</div>` : ""}
      <button class="ctab-card-speak" data-text="${escapeHtml5(c.front)}">\u{1F50A}</button>
    </div>`).join("");
    body.querySelectorAll(".ctab-card-speak").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        speakChinese(btn.dataset.text, 0.8);
      });
    });
    if (!query && cards.length > 80) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn-secondary";
      moreBtn.style.cssText = "width:100%;margin-top:8px";
      moreBtn.textContent = `\u25B6 \u8FDB\u5165\u95EA\u5361\u7EC3\u4E60\uFF08\u5171${cards.length}\u6761\uFF09`;
      moreBtn.addEventListener("click", () => startStudyFromSubjectDeck("chinese", "\u5C0F\u5B66\u6210\u8BED"));
      body.appendChild(moreBtn);
    }
  }
  async function initCtabPoems() {
    const body = document.getElementById("ctab-poems-body");
    if (!body) return;
    body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u52A0\u8F7D\u4E2D\u2026</p>';
    const cards = await loadBuiltinCardsInline("chinese", "\u5C0F\u5B66\u5FC5\u80CC\u53E4\u8BD7");
    if (!cards.length) {
      body.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub)">\u6682\u65E0\u6570\u636E</p>';
      return;
    }
    body.innerHTML = cards.slice(0, 60).map((c) => `
    <div class="ctab-card-item ctab-poem-item">
      <div class="ctab-poem-q">${escapeHtml5(c.front)}</div>
      <div class="ctab-poem-a" style="display:none">${escapeHtml5(c.back || "")}</div>
      <div class="ctab-poem-hint">${escapeHtml5(c.hint || "")}</div>
      <button class="ctab-poem-reveal">\u663E\u793A\u7B54\u6848</button>
    </div>`).join("");
    body.querySelectorAll(".ctab-poem-reveal").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ans = btn.previousElementSibling.previousElementSibling;
        if (ans.style.display === "none") {
          ans.style.display = "block";
          btn.textContent = "\u9690\u85CF\u7B54\u6848";
        } else {
          ans.style.display = "none";
          btn.textContent = "\u663E\u793A\u7B54\u6848";
        }
      });
    });
    if (cards.length > 60) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn-secondary";
      moreBtn.style.cssText = "width:100%;margin-top:8px";
      moreBtn.textContent = `\u25B6 \u8FDB\u5165\u95EA\u5361\u7EC3\u4E60\uFF08\u5171${cards.length}\u9898\uFF09`;
      moreBtn.addEventListener("click", () => startStudyFromSubjectDeck("chinese", "\u5C0F\u5B66\u5FC5\u80CC\u53E4\u8BD7"));
      body.appendChild(moreBtn);
    }
  }
  var _builtinCardCache = {};
  async function loadBuiltinCardsInline(subject, nameKeyword) {
    const key = subject + "|" + nameKeyword;
    if (_builtinCardCache[key]) return _builtinCardCache[key];
    if (App.currentProfile) {
      const decks = await DeckManager.getByProfile(App.currentProfile.id);
      const deck = decks.find((d) => d.subject === subject && d.name.includes(nameKeyword));
      if (deck) {
        const cards = App.allProfileCards.filter((c) => c.deckId === deck.id);
        if (cards.length) {
          _builtinCardCache[key] = cards;
          return cards;
        }
      }
    }
    const def = BUILTIN_DECKS.find((d) => d.subject === subject && d.name.includes(nameKeyword));
    if (!def) return [];
    try {
      const res = await fetch(def.file);
      if (!res.ok) return [];
      const data = await res.json();
      const cards = (data.cards || []).map((c) => ({ ...c, subject }));
      _builtinCardCache[key] = cards;
      return cards;
    } catch {
      return [];
    }
  }
  async function openSubjectDecksPage(subject) {
    const profile = App.currentProfile;
    if (!profile) return;
    App.allProfileCards = await CardManager.getByProfile(profile.id);
    const subjectNames = { chinese: "\u8BED\u6587", english: "\u82F1\u8BED", math: "\u6570\u5B66", custom: "\u9898\u5E93" };
    const subjectFilter = (card) => {
      if (card.subject === subject) return true;
      const tagMap = { chinese: ["\u8BED\u6587", "\u53E4\u8BD7", "\u6210\u8BED", "\u6587\u8A00\u6587"], english: ["\u82F1\u8BED", "English", "CET-4"], math: ["\u6570\u5B66", "\u516C\u5F0F"] };
      return (tagMap[subject] || []).some((t) => card.tags?.includes(t));
    };
    const allSubjectCards = App.allProfileCards.filter(subjectFilter);
    if (!allSubjectCards.length) {
      const name = subjectNames[subject] || subject;
      toast4(`\u8FD8\u6CA1\u6709${name}\u5361\u7247\uFF0C\u8BF7\u5148\u5728\u9898\u5E93\u5546\u5E97\u4E0B\u8F7D\u6216\u5BFC\u5165\u7D20\u6750`);
      showPage("library");
      renderLibrary();
      return;
    }
    const decks = await DeckManager.getByProfile(profile.id);
    const subjectDecks = decks.filter((d) => {
      const deckCards = allSubjectCards.filter((c) => c.deckId === d.id);
      return deckCards.length > 0;
    });
    const titleSuffix = subject === "custom" ? "" : "\u9898\u5E93";
    $4("subject-decks-title").textContent = `${subjectNames[subject] || subject}${titleSuffix}`;
    const due = allSubjectCards.filter((c) => c.nextReview <= todayStr());
    const newCards = allSubjectCards.filter((c) => c.reviewCount === 0);
    $4("sdb-all-meta").textContent = `${allSubjectCards.length}\u5F20 \xB7 \u5F85\u590D\u4E60${due.length + newCards.length}\u5F20`;
    $4("subject-decks-total").textContent = `\u5171${subjectDecks.length}\u4E2A\u9898\u5E93`;
    const list = $4("sdb-decks-list");
    list.innerHTML = "";
    subjectDecks.forEach((deck) => {
      const deckCards = allSubjectCards.filter((c) => c.deckId === deck.id);
      const deckDue = deckCards.filter((c) => c.nextReview <= todayStr());
      const deckNew = deckCards.filter((c) => c.reviewCount === 0);
      const deckMastered = deckCards.filter((c) => c.box >= 3 || c.interval >= 21);
      const masteredPct = deckCards.length ? Math.round(deckMastered.length / deckCards.length * 100) : 0;
      const todayCount = deckDue.length + deckNew.length;
      const item = document.createElement("button");
      item.className = "sdb-deck-item";
      item.dataset.deckId = deck.id;
      item.innerHTML = `
      <div class="sdb-deck-header">
        <span class="sdb-deck-name">${escapeHtml5(deck.name)}</span>
        ${todayCount > 0 ? `<span class="sdb-badge">${todayCount}</span>` : '<span class="sdb-done">\u2713</span>'}
      </div>
      <div class="sdb-deck-stats">
        <span>${deckCards.length}\u5F20</span>
        <span>\u638C\u63E1${masteredPct}%</span>
        <div class="sdb-mini-bar"><div class="sdb-mini-fill" style="width:${masteredPct}%"></div></div>
      </div>
    `;
      item.addEventListener("click", () => startStudyFromDeck(deck.id, subject));
      list.appendChild(item);
    });
    $4("sdb-dir-forward")?.addEventListener("click", () => {
      $4("sdb-dir-forward").classList.add("active");
      $4("sdb-dir-reverse").classList.remove("active");
      App.cardDirection = "normal";
    });
    $4("sdb-dir-reverse")?.addEventListener("click", () => {
      $4("sdb-dir-reverse").classList.add("active");
      $4("sdb-dir-forward").classList.remove("active");
      App.cardDirection = "reverse";
    });
    if (App.cardDirection === "reverse") {
      $4("sdb-dir-forward")?.classList.remove("active");
      $4("sdb-dir-reverse")?.classList.add("active");
    } else {
      $4("sdb-dir-forward")?.classList.add("active");
      $4("sdb-dir-reverse")?.classList.remove("active");
    }
    $4("btn-study-all-subject").onclick = () => startStudySession(subject);
    $4("btn-subject-decks-back").onclick = () => goBack();
    showPage("subject-decks");
  }
  async function startStudyFromDeck(deckId, subject) {
    const profile = App.currentProfile;
    const deckCards = App.allProfileCards.filter((c) => c.deckId === deckId);
    const due = deckCards.filter((c) => c.nextReview <= todayStr());
    const newCards = deckCards.filter((c) => c.reviewCount === 0);
    const queue = buildStudyQueue(due, newCards, profile.newPerDay || 10);
    if (!queue.length) {
      toast4("\u8FD9\u4E2A\u9898\u5E93\u4ECA\u5929\u6CA1\u6709\u9700\u8981\u590D\u4E60\u7684\uFF0C\u6362\u4E00\u4E2A\u8BD5\u8BD5\uFF1F");
      return;
    }
    App.studyQueue = queue;
    App.studyIndex = 0;
    App.sessionResults = [];
    hide3($4("session-complete"));
    showPage("study");
    switchStudyMode("flashcard");
    renderCard();
  }
  function renderCard() {
    const card = App.studyQueue[App.studyIndex];
    if (!card) {
      showSessionComplete();
      return;
    }
    const total = App.studyQueue.length;
    const current = App.studyIndex + 1;
    $4("study-progress-bar").style.width = `${current / total * 100}%`;
    $4("study-progress-text").textContent = `${current}/${total}`;
    App.isCardFlipped = false;
    $4("card-inner").classList.remove("flipped");
    hide3($4("rating-buttons"));
    hide3($4("voice-answer-result"));
    const voiceBtn = $4("btn-voice-answer");
    if (voiceBtn) {
      voiceBtn.classList.remove("recording");
      const lbl = $4("voice-answer-label");
      if (lbl) lbl.textContent = "\u8BED\u97F3\u56DE\u7B54";
    }
    const hintP = $4("card-hint-prompt");
    if (hintP) hintP.textContent = SpeechSupport.stt ? "\u70B9\u51FB\u7FFB\u8F6C\u67E5\u770B\u7B54\u6848\uFF08\u6216\u8BED\u97F3\u56DE\u7B54\uFF09" : "\u70B9\u51FB\u7FFB\u8F6C\u67E5\u770B\u7B54\u6848";
    const isReverse = App.cardDirection === "reverse";
    const displayFront = isReverse ? card.back : card.front;
    const displayBack = isReverse ? card.front : card.back;
    const displayPhon = isReverse ? "" : card.phonetic || "";
    const displayEx = isReverse ? "" : card.example || "";
    const isEnglishFront = displayFront && !/[一-鿿]/.test(displayFront);
    const frontEl = $4("card-front-text");
    if (isEnglishFront) {
      frontEl.innerHTML = colorEnglishSyllables(displayFront);
    } else {
      frontEl.textContent = displayFront;
    }
    $4("card-phonetic").textContent = displayPhon;
    $4("card-back-text").textContent = displayBack;
    $4("card-example").textContent = displayEx;
    $4("card-tag").textContent = subjectLabel(card.subject) + (isReverse ? " \u21A9" : "");
    renderCharInfo(card);
    if (card.type === "word" && card.subject === "chinese") {
      $4("card-hint-prompt") && ($4("card-hint-prompt").textContent = "\u70B9\u51FB\u7FFB\u8F6C\u67E5\u770B\u91CA\u4E49\uFF0C\u6216\u76F4\u63A5\u8DDF\u8BFB");
      if (mode === "flashcard") {
        setTimeout(() => speakCard(card, "front", App.currentProfile?.speechRate || 0.85), 300);
      }
    }
    const mode = $4("study-mode-tabs")?.querySelector(".mode-tab.active")?.dataset.mode || "flashcard";
    if (mode === "choice") renderChoiceMode(card);
    if (mode === "dictation") renderDictationMode(card);
    if (mode === "speaking") renderSpeakingMode(card);
  }
  function renderCharInfo(card) {
    let infoEl = $4("card-char-info");
    if (!infoEl) {
      infoEl = document.createElement("div");
      infoEl.id = "card-char-info";
      infoEl.className = "card-char-info";
      const frontText = $4("card-front-text");
      frontText?.parentNode?.insertBefore(infoEl, frontText.nextSibling);
    }
    if (card.type === "char" && (card.radical || card.strokes)) {
      const parts = [];
      if (card.radical) parts.push(`<span class="char-info-item"><span class="cii-label">\u90E8\u9996</span><span class="cii-val">${escapeHtml5(card.radical)}</span></span>`);
      if (card.strokes) parts.push(`<span class="char-info-item"><span class="cii-label">\u7B14\u753B</span><span class="cii-val">${card.strokes}\u753B</span></span>`);
      if (card.structure) parts.push(`<span class="char-info-item"><span class="cii-label">\u7ED3\u6784</span><span class="cii-val">${escapeHtml5(card.structure)}</span></span>`);
      infoEl.innerHTML = parts.join("");
      infoEl.style.display = "flex";
    } else {
      infoEl.innerHTML = "";
      infoEl.style.display = "none";
    }
  }
  function flipCard() {
    if (App.isCardFlipped) return;
    App.isCardFlipped = true;
    $4("card-inner").classList.add("flipped");
    show3($4("rating-buttons"));
    speakCurrentCardBack();
  }
  function speakCurrentCardFront() {
    const card = App.studyQueue[App.studyIndex];
    if (!card) return;
    const side = App.cardDirection === "reverse" ? "back" : "front";
    speakCard(card, side, App.currentProfile?.speechRate || 0.8);
  }
  function speakCurrentCardBack() {
    const card = App.studyQueue[App.studyIndex];
    if (!card) return;
    const side = App.cardDirection === "reverse" ? "front" : "back";
    speakCard(card, side, App.currentProfile?.speechRate || 0.8);
  }
  var _voiceAnswerStop = null;
  async function startVoiceAnswer() {
    if (!SpeechSupport.stt) {
      toast4("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome \u6216\u5B89\u5353\u8BBE\u5907");
      return;
    }
    const btn = $4("btn-voice-answer");
    const label = $4("voice-answer-label");
    const card = App.studyQueue[App.studyIndex];
    if (!card) return;
    if (_voiceAnswerStop) {
      _voiceAnswerStop();
      _voiceAnswerStop = null;
      btn?.classList.remove("recording");
      if (label) label.textContent = "\u8BED\u97F3\u56DE\u7B54";
      return;
    }
    btn?.classList.add("recording");
    if (label) label.textContent = "\u8BF4\u8BDD\u4E2D...";
    const lang = /[一-鿿]/.test(card.front) ? "zh-CN" : "en-US";
    let spokenText = "", spokenConf = 1;
    _voiceAnswerStop = startListening(
      lang,
      (text, conf) => {
        spokenText = text;
        spokenConf = conf;
      },
      (msg) => {
        toast4(msg);
        btn?.classList.remove("recording");
        if (label) label.textContent = "\u8BED\u97F3\u56DE\u7B54";
      },
      async () => {
        btn?.classList.remove("recording");
        if (label) label.textContent = "\u8BED\u97F3\u56DE\u7B54";
        _voiceAnswerStop = null;
        if (!spokenText) return;
        const target = App.cardDirection === "reverse" ? card.front : card.back;
        const dist = levenshtein2(target.toLowerCase(), spokenText.toLowerCase());
        const score = Math.max(0, Math.round((1 - dist / Math.max(target.length, spokenText.length)) * 100));
        const isCorrect = score >= 65 || spokenText.toLowerCase().includes(target.toLowerCase().slice(0, 4));
        const resultEl = $4("voice-answer-result");
        $4("voice-answer-text").textContent = `"${spokenText}" ${isCorrect ? "\u2713" : "\u2717"}`;
        if (resultEl) {
          resultEl.style.background = isCorrect ? "#D1FAE5" : "#FEE2E2";
          resultEl.style.color = isCorrect ? "#065F46" : "#991B1B";
          show3(resultEl);
        }
        if (isCorrect) {
          playSound("correct");
          setTimeout(() => {
            flipCard();
            setTimeout(() => submitRating(5), 1200);
          }, 800);
        } else {
          playSound("wrong");
          setTimeout(() => {
            flipCard();
            setTimeout(() => submitRating(1), 1800);
          }, 1e3);
        }
      }
    );
  }
  function levenshtein2(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }
  async function submitRating(rating) {
    const card = App.studyQueue[App.studyIndex];
    const profile = App.currentProfile;
    if (!card || !profile) return;
    const algo = resolveAlgorithm(profile.algorithm || "auto", profile.grade);
    const updated = reviewCard(card, rating, profile.algorithm || "auto", profile.grade);
    await CardManager.update(updated);
    App.sessionResults.push({ card, rating, correct: rating >= 4 });
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
  function renderChoiceMode(card) {
    show3($4("choice-container"));
    hide3($4("flashcard"));
    $4("choice-question").textContent = card.front;
    const options = generateDistractors(card, App.allProfileCards.length > 3 ? App.allProfileCards : App.studyQueue);
    const container = $4("choice-options");
    container.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = opt;
      btn.dataset.value = opt;
      container.appendChild(btn);
    });
  }
  function onChoiceSelected(btn) {
    const card = App.studyQueue[App.studyIndex];
    const correct = btn.dataset.value === card.back;
    document.querySelectorAll(".choice-btn").forEach((b) => {
      b.disabled = true;
      if (b.dataset.value === card.back) b.classList.add("correct");
      if (b === btn && !correct) b.classList.add("wrong");
    });
    if (correct) playSound("correct");
    else playSound("wrong");
    setTimeout(() => submitRating(correct ? 5 : 1), 1e3);
  }
  var _dictationPeeked = false;
  function renderDictationMode(card) {
    hide3($4("flashcard"));
    show3($4("dictation-container"));
    _dictationPeeked = false;
    $4("dictation-prompt").textContent = "";
    $4("dictation-prompt").style.color = "";
    $4("dictation-input").value = "";
    $4("dictation-input").disabled = false;
    hide3($4("dictation-answer-reveal"));
    show3($4("btn-check-dictation"));
    hide3($4("btn-next-dictation"));
    $4("btn-dictation-peek").classList.remove("peeked");
    $4("btn-dictation-peek").disabled = false;
    $4("dictation-input").focus();
    setTimeout(() => speakCard(card, "front", App.currentProfile?.speechRate || 0.8), 500);
  }
  function replayDictation() {
    const card = App.studyQueue[App.studyIndex];
    if (card) speakCard(card, "front", App.currentProfile?.speechRate || 0.8);
  }
  function peekDictationAnswer() {
    const card = App.studyQueue[App.studyIndex];
    if (!card) return;
    _dictationPeeked = true;
    $4("dictation-answer-text").textContent = card.back;
    show3($4("dictation-answer-reveal"));
    speakCard(card, "back", App.currentProfile?.speechRate || 0.8);
    $4("btn-dictation-peek").classList.add("peeked");
    $4("btn-dictation-peek").disabled = true;
    $4("dictation-input").disabled = true;
    hide3($4("btn-check-dictation"));
    show3($4("btn-next-dictation"));
  }
  function checkDictation() {
    if (_dictationPeeked) {
      submitRating(2);
      return;
    }
    const card = App.studyQueue[App.studyIndex];
    const input = $4("dictation-input").value.trim().toLowerCase();
    const target = card.front.toLowerCase().trim();
    const back = card.back.toLowerCase().trim();
    const correct = input === target || input === back || target.startsWith(input) && input.length >= target.length * 0.9;
    const prompt2 = $4("dictation-prompt");
    if (correct) {
      prompt2.textContent = `\u2713 ${card.front}  ${card.back}`;
      prompt2.style.color = "var(--color-success)";
      playSound("correct");
    } else {
      prompt2.textContent = `\u2717 \u6B63\u786E\u7B54\u6848\uFF1A${card.front}`;
      prompt2.style.color = "var(--color-error)";
      speakCard(card, "front", App.currentProfile?.speechRate || 0.8);
      playSound("wrong");
    }
    $4("dictation-input").disabled = true;
    setTimeout(() => submitRating(correct ? 5 : 1), 1200);
  }
  function renderSpeakingMode(card) {
    hide3($4("flashcard"));
    show3($4("speaking-container"));
    hide3($4("score-display"));
    hide3($4("mic-hint"));
    $4("speaking-word").textContent = card.front;
    const meaningEl = $4("speaking-meaning");
    if (card.back && card.back !== card.front) {
      meaningEl.textContent = card.back;
      show3(meaningEl);
    } else {
      hide3(meaningEl);
    }
    const exampleEl = $4("speaking-example");
    if (card.example) {
      exampleEl.textContent = card.example;
      show3(exampleEl);
    } else {
      hide3(exampleEl);
    }
    $4("btn-record").classList.remove("recording");
    $4("record-label").textContent = "\u5F00\u59CB\u8DDF\u8BFB";
    $4("waveform").classList.remove("active");
    if (window.location.protocol === "file:") {
      const hint = $4("mic-hint");
      hint.textContent = "\u26A0 \u672C\u5730\u6587\u4EF6\u6A21\u5F0F\u4E0B\u9EA6\u514B\u98CE\u53D7\u9650\uFF0C\u8BF7\u7528 Live Server \u6216\u5B89\u88C5\u4E3A Android APP \u540E\u4F7F\u7528\u3002\u70B9\u51FB\u300C\u518D\u542C\u4E00\u904D\u300D\u53EF\u5148\u7EC3\u4E60\u53D1\u97F3\u3002";
      show3(hint);
    }
    setTimeout(() => speakCard(card, "front", App.currentProfile?.speechRate || 0.8), 400);
  }
  function initSpeakingButtons() {
    $4("btn-speak-again")?.addEventListener("click", () => {
      const card = App.studyQueue[App.studyIndex];
      if (card) speakCard(card, "front", App.currentProfile?.speechRate || 0.8);
    });
    $4("btn-speak-slow")?.addEventListener("click", () => {
      const card = App.studyQueue[App.studyIndex];
      if (card) speakCard(card, "front", 0.5);
    });
    $4("btn-retry-record")?.addEventListener("click", () => {
      hide3($4("score-display"));
      $4("btn-record").classList.remove("recording");
      $4("record-label").textContent = "\u5F00\u59CB\u8DDF\u8BFB";
    });
  }
  async function toggleRecording() {
    const btn = $4("btn-record");
    if (App.recordStop) {
      App.recordStop();
      App.recordStop = null;
      btn.classList.remove("recording");
      $4("record-label").textContent = "\u5904\u7406\u4E2D...";
      $4("waveform").classList.remove("active");
      return;
    }
    const card = App.studyQueue[App.studyIndex];
    const lang = /[一-鿿]/.test(card.front) ? "zh-CN" : "en-US";
    btn.classList.add("recording");
    $4("record-label").textContent = "\u8BF4\u8BDD\u4E2D...";
    $4("waveform").classList.add("active");
    let spokenText = "";
    let spokenConf = 0;
    if (SpeechSupport.stt) {
      App.recordStop = startListening(
        lang,
        (text, conf) => {
          spokenText = text;
          spokenConf = conf;
        },
        (msg) => {
          toast4(msg);
          btn.classList.remove("recording");
          $4("record-label").textContent = "\u6309\u4F4F\u8BF4\u8BDD";
        },
        async () => {
          btn.classList.remove("recording");
          $4("record-label").textContent = "\u6309\u4F4F\u8BF4\u8BDD";
          $4("waveform").classList.remove("active");
          App.recordStop = null;
          if (!spokenText) {
            toast4("\u6CA1\u6709\u8BC6\u522B\u5230\u5185\u5BB9\uFF0C\u8BF7\u518D\u8BD5");
            return;
          }
          const profile = App.currentProfile;
          const azureConfig = profile?.azureKey ? { key: profile.azureKey, region: profile.azureRegion } : null;
          const result = await scorePronunciation(card.front, spokenText, spokenConf, azureConfig, null);
          showPronunciationResult(result);
        }
      );
    } else {
      toast4("\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Android Chrome");
      btn.classList.remove("recording");
      $4("record-label").textContent = "\u6309\u4F4F\u8BF4\u8BDD";
      $4("waveform").classList.remove("active");
    }
  }
  function showPronunciationResult(result) {
    const scoreEl = $4("score-circle");
    const numEl = $4("score-num");
    const feedEl = $4("score-feedback");
    numEl.textContent = result.score;
    scoreEl.className = `score-circle ${result.score >= 75 ? "" : result.score >= 60 ? "score-mid" : "score-low"}`;
    feedEl.textContent = result.feedback;
    show3($4("score-display"));
    if (result.score >= 75) playSound("correct");
    else playSound("wrong");
    const rating = result.score >= 90 ? 5 : result.score >= 75 ? 4 : result.score >= 60 ? 2 : 1;
    setTimeout(() => submitRating(rating), 2e3);
  }
  function switchStudyMode(mode) {
    $4("study-mode-tabs")?.querySelectorAll(".mode-tab").forEach(
      (t) => t.classList.toggle("active", t.dataset.mode === mode)
    );
    hide3($4("flashcard"));
    hide3($4("choice-container"));
    hide3($4("dictation-container"));
    hide3($4("speaking-container"));
    hide3($4("rating-buttons"));
    if (mode === "flashcard") show3($4("flashcard"));
    if (mode === "choice") show3($4("choice-container"));
    if (mode === "dictation") show3($4("dictation-container"));
    if (mode === "speaking") show3($4("speaking-container"));
    App.isCardFlipped = false;
    $4("card-inner").classList.remove("flipped");
    renderCard();
  }
  async function finishSession() {
    const total = App.sessionResults.length;
    const correct = App.sessionResults.filter((r) => r.correct).length;
    const coins = correct * 2 + Math.floor(total * 0.5);
    await ProgressManager.record(App.currentProfile.id, total, correct);
    await ProfileManager.update(App.currentProfile.id, {
      coins: (App.currentProfile.coins || 0) + coins
    });
    App.currentProfile.coins = (App.currentProfile.coins || 0) + coins;
    App.allProfileCards = await CardManager.getByProfile(App.currentProfile.id);
    showSessionComplete(total, correct, coins);
  }
  function showSessionComplete(total, correct, coins) {
    $4("complete-summary").textContent = `\u590D\u4E60\u4E86 ${total} \u5F20\uFF0C\u7B54\u5BF9 ${correct} \u5F20\uFF08${Math.round(correct / total * 100)}%\uFF09`;
    $4("coins-earned").textContent = coins > 0 ? `+${coins} \u91D1\u5E01` : "";
    show3($4("session-complete"));
  }
  function setupSwipeGesture() {
    let startX = 0;
    const card = $4("flashcard");
    card.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    card.addEventListener("touchend", (e) => {
      if (!App.isCardFlipped) {
        flipCard();
        return;
      }
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 60) {
        submitRating(dx > 0 ? 5 : 1);
      }
    }, { passive: true });
  }
  function setupBackGesture() {
    let startX = 0, startY = 0;
    const EDGE = 30;
    document.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (dx > 80 && dy < dx * 0.8 && (startX < EDGE + 20 || dx > 120)) {
        const activePage = document.querySelector(".page.active");
        if (!activePage) return;
        const pageId = activePage.id?.replace("page-", "");
        if (pageId && pageId !== "home" && pageId !== "profiles") {
          e.preventDefault?.();
          goBack();
        }
      }
    }, { passive: true });
  }
  var _importCache = [];
  async function handleFileInputWithSubject(file) {
    if (!file) return;
    if (isImageFile(file)) {
      handleImageInput(file);
      return;
    }
    try {
      toast4("\u6B63\u5728\u89E3\u6790\u6587\u4EF6...");
      const { cards, suggestedName } = await parseFile(file);
      const subject = $4("import-subject-select")?.value || "custom";
      _importCache = cards.map((c) => ({ ...c, subject }));
      $4("deck-name-input").value = suggestedName;
      showImportPreview(_importCache);
      showPage("import");
    } catch (e) {
      toast4(`\u89E3\u6790\u5931\u8D25\uFF1A${e.message}`);
    }
  }
  async function handleFileInput(file) {
    if (!file) return;
    if (isImageFile(file)) {
      handleImageInput(file);
      return;
    }
    try {
      toast4("\u6B63\u5728\u89E3\u6790\u6587\u4EF6...");
      const { cards, suggestedName } = await parseFile(file);
      _importCache = cards;
      $4("deck-name-input").value = suggestedName;
      showImportPreview(cards);
    } catch (e) {
      toast4(`\u89E3\u6790\u5931\u8D25\uFF1A${e.message}`);
    }
  }
  function isImageFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif"].includes(ext) || file.type.startsWith("image/");
  }
  async function handleImageInput(file) {
    if (!file) return;
    if (hasAIKey()) {
      show3($4("ocr-progress"));
      try {
        const { cards, suggestedName } = await parseImageWithAI(file, (msg) => {
          $4("ocr-status").textContent = msg;
        });
        _importCache = cards;
        hide3($4("ocr-progress"));
        $4("deck-name-input").value = suggestedName;
        showImportPreview(cards);
        showPage("import");
        return;
      } catch (e) {
        $4("ocr-status").textContent = `AI\u89E3\u6790\u5931\u8D25\uFF08${e.message}\uFF09\uFF0C\u5207\u6362\u5230\u672C\u5730OCR...`;
      }
    }
    show3($4("ocr-progress"));
    try {
      const { cards: rawCards, suggestedName } = await parseImageOCR(file, (msg) => {
        $4("ocr-status").textContent = msg;
      });
      $4("ocr-status").textContent = "\u6B63\u5728\u67E5\u8BE2\u8BCD\u5178\u8865\u5145\u91CA\u4E49...";
      const cards = await enrichEnglishCards(rawCards);
      _importCache = cards;
      hide3($4("ocr-progress"));
      $4("deck-name-input").value = suggestedName;
      showImportPreview(cards);
      showPage("import");
    } catch (e) {
      hide3($4("ocr-progress"));
      toast4(`\u8BC6\u522B\u5931\u8D25\uFF1A${e.message}`);
    }
  }
  async function enrichEnglishCards(cards) {
    const englishCards = cards.filter((c) => /^[a-zA-Z\s'-]+$/.test(c.front?.trim()));
    if (!englishCards.length) return cards;
    const profile = App.currentProfile;
    if (!profile) return cards;
    const allCards = App.allProfileCards?.length ? App.allProfileCards : await CardManager.getByProfile(profile.id);
    const dict = {};
    allCards.forEach((c) => {
      if (c.subject === "english" && c.front && c.back) {
        dict[c.front.toLowerCase()] = c;
      }
    });
    return cards.map((card) => {
      const word = card.front?.trim().toLowerCase();
      if (!word || !/^[a-zA-Z\s'-]+$/.test(word)) return card;
      if (card.back && /[^\x00-\x7F]/.test(card.back)) return card;
      const match = dict[word];
      if (match) {
        return {
          ...card,
          back: match.back || card.back,
          phonetic: match.phonetic || card.phonetic || "",
          hint: match.hint || card.hint || "",
          example: match.example || card.example || "",
          tags: card.tags?.length ? card.tags : match.tags || ["\u82F1\u8BED"],
          type: "word",
          subject: "english"
        };
      }
      return { ...card, back: card.back || `\uFF08${word}\uFF09`, subject: "english" };
    });
  }
  function showImportPreview(cards) {
    $4("preview-count").textContent = cards.length;
    const list = $4("preview-list");
    list.innerHTML = "";
    cards.slice(0, 20).forEach((c) => {
      const item = document.createElement("div");
      item.className = "preview-item";
      item.innerHTML = `<span class="preview-front">${escapeHtml5(c.front)}</span><span class="preview-back">${escapeHtml5(c.back)}</span>`;
      list.appendChild(item);
    });
    if (cards.length > 20) {
      const more = document.createElement("div");
      more.className = "preview-item";
      more.innerHTML = `<span style="color:var(--color-text-sub)">...\u8FD8\u6709 ${cards.length - 20} \u5F20</span>`;
      list.appendChild(more);
    }
    show3($4("import-preview"));
  }
  async function confirmImport() {
    const profile = App.currentProfile;
    if (!_importCache.length) {
      toast4("\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u5361\u7247");
      return;
    }
    const isAppend = document.querySelector(".import-mode-btn.active")?.dataset.mode === "append";
    const targetDeckId = $4("import-target-deck")?.value;
    let deckId, deckName, added;
    if (isAppend && targetDeckId) {
      const existing = App.allProfileCards.filter((c) => c.deckId === targetDeckId);
      const existingFronts = new Set(existing.map((c) => c.front?.toLowerCase().trim()));
      const newCards = _importCache.filter((c) => !existingFronts.has(c.front?.toLowerCase().trim()));
      if (!newCards.length) {
        toast4("\u6240\u6709\u5361\u7247\u5728\u9898\u5E93\u4E2D\u5747\u5DF2\u5B58\u5728\uFF0C\u65E0\u9700\u8FFD\u52A0");
        return;
      }
      await CardManager.bulkCreate(profile.id, targetDeckId, newCards);
      added = newCards.length;
      deckName = $4("import-target-deck")?.selectedOptions[0]?.text || "\u5DF2\u6709\u9898\u5E93";
      toast4(`\u5DF2\u8FFD\u52A0 ${added} \u5F20\uFF08\u8DF3\u8FC7 ${_importCache.length - added} \u5F20\u91CD\u590D\uFF09\uFF0C\u9898\u5E93\uFF1A${deckName}`);
    } else {
      const name = $4("deck-name-input")?.value.trim() || "\u5BFC\u5165\u7684\u5361\u7247";
      const subject = $4("import-subject-select")?.value || _importCache[0]?.subject || "custom";
      const deck = await DeckManager.create(profile.id, name, subject, "custom");
      await CardManager.bulkCreate(profile.id, deck.id, _importCache);
      added = _importCache.length;
      deckName = name;
      toast4(`\u6210\u529F\u5BFC\u5165 ${added} \u5F20\u5361\u7247\u5230\u300C${deckName}\u300D`);
    }
    App.allProfileCards = await CardManager.getByProfile(profile.id);
    _importCache = [];
    hide3($4("import-preview"));
    document.getElementById("import-mode-new")?.classList.add("active");
    document.getElementById("import-mode-append")?.classList.remove("active");
    $4("import-new-section")?.classList.remove("hidden");
    $4("import-append-section")?.classList.add("hidden");
    loadHomeData();
  }
  var _manualCards = [];
  function saveManualCard(continueAdding) {
    const front = $4("manual-front").value.trim();
    const back = $4("manual-back").value.trim();
    if (!front || !back) {
      toast4("\u6B63\u9762\u548C\u80CC\u9762\u90FD\u9700\u8981\u586B\u5199");
      return;
    }
    _manualCards.push({
      front,
      back,
      hint: $4("manual-hint").value.trim(),
      tags: $4("manual-tags").value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    });
    $4("manual-front").value = "";
    $4("manual-back").value = "";
    $4("manual-hint").value = "";
    toast4("\u5DF2\u6DFB\u52A0");
    if (!continueAdding) {
      hide3($4("manual-modal"));
      _importCache = _manualCards;
      _manualCards = [];
      showImportPreview(_importCache);
    }
  }
  async function renderLibrary() {
    const decks = await DeckManager.getByProfile(App.currentProfile.id);
    const list = $4("decks-list");
    list.innerHTML = "";
    const gradeFilterEl = $4("grade-filter");
    const gradeFilter = gradeFilterEl?.querySelector(".filter-btn.active")?.dataset.grade || "all";
    const seen = /* @__PURE__ */ new Set();
    const deduped = decks.filter((d) => {
      if (seen.has(d.name)) return false;
      seen.add(d.name);
      return true;
    });
    const filtered = gradeFilter === "all" ? deduped : deduped.filter((d) => d.grade === gradeFilter || d.grade?.startsWith(gradeFilter));
    if (!decks.length) {
      list.innerHTML = '<p style="color:var(--color-text-sub);text-align:center;padding:32px">\u6682\u65E0\u9898\u5E93\uFF0C\u53BB\u5BFC\u5165\u6216\u52A0\u8F7D\u5185\u7F6E\u77E5\u8BC6\u5E93</p>';
      return;
    }
    if (!filtered.length) {
      list.innerHTML = `<p style="color:var(--color-text-sub);text-align:center;padding:32px">\u6CA1\u6709${gradeFilter === "primary" ? "\u5C0F\u5B66" : "\u521D\u4E2D"}\u9898\u5E93</p>`;
      return;
    }
    const groups = {};
    filtered.forEach((deck) => {
      const s = deck.subject || "custom";
      if (!groups[s]) groups[s] = [];
      groups[s].push(deck);
    });
    const subjectOrder = ["chinese", "english", "math", "custom"];
    const subjectLabel_ = { chinese: "\u8BED\u6587", english: "\u82F1\u8BED", math: "\u6570\u5B66", custom: "\u9898\u5E93" };
    const subjectColors = { chinese: "#E84848", english: "#3B82F6", math: "#8B5CF6", custom: "#10B981" };
    subjectOrder.forEach((subj) => {
      const subjDecks = groups[subj];
      if (!subjDecks?.length) return;
      const title = document.createElement("div");
      title.className = "deck-group-title";
      title.textContent = subjectLabel_[subj] || subj;
      list.appendChild(title);
      subjDecks.forEach((deck) => {
        const cards = App.allProfileCards.filter((c) => c.deckId === deck.id);
        const due = cards.filter((c) => c.nextReview <= todayStr()).length;
        const newC = cards.filter((c) => c.reviewCount === 0).length;
        const todayN = due + newC;
        const hasRecitation = cards.some((c) => c.type === "poem" || c.tags?.includes("\u53E4\u8BD7"));
        const item = document.createElement("div");
        item.className = "deck-item";
        item.innerHTML = `
        <div class="deck-icon" style="background:${subjectColors[subj] || "#aaa"};color:white">
          ${subjectIcon(deck.subject)}
        </div>
        <div class="deck-info">
          <div class="deck-name">${escapeHtml5(deck.name)}</div>
          <div class="deck-count">${cards.length}\u5F20 ${todayN > 0 ? `\xB7 <span style="color:var(--color-primary)">\u4ECA\u65E5${todayN}\u5F20</span>` : "\xB7 \u4ECA\u65E5\u5DF2\u5B8C\u6210 \u2713"}</div>
        </div>
        <div class="deck-actions">
          ${hasRecitation ? `<button class="btn-deck-recite" data-deck="${deck.id}" title="\u80CC\u8BF5\u5168\u6587">\u{1F4D6}</button>` : ""}
          <button class="btn-deck-study" data-deck="${deck.id}">\u5B66\u4E60</button>
          <button class="btn-deck-delete" data-deck="${deck.id}" data-name="${escapeHtml5(deck.name)}" title="\u5220\u9664\u9898\u5E93">\u{1F5D1}</button>
        </div>
      `;
        item.querySelector(".btn-deck-study").addEventListener("click", () => studyDeck(deck.id));
        item.querySelector(".btn-deck-delete").addEventListener("click", (e) => {
          e.stopPropagation();
          deleteDeck(deck.id, deck.name);
        });
        item.querySelector(".btn-deck-recite")?.addEventListener("click", (e) => {
          e.stopPropagation();
          openRecitationFromDeck(deck.id);
        });
        list.appendChild(item);
      });
    });
  }
  async function deleteDeck(deckId, deckName) {
    if (!confirm(`\u786E\u5B9A\u8981\u5220\u9664\u9898\u5E93\u300C${deckName}\u300D\u5417\uFF1F

\u5220\u9664\u540E\u8BE5\u9898\u5E93\u7684\u6240\u6709\u5361\u7247\u548C\u5B66\u4E60\u8BB0\u5F55\u5C06\u6E05\u7A7A\uFF0C\u65E0\u6CD5\u6062\u590D\u3002`)) return;
    const profile = App.currentProfile;
    if (!profile) return;
    const cards = App.allProfileCards.filter((c) => c.deckId === deckId);
    await Promise.all(cards.map((c) => CardManager.delete(c.id)));
    await DeckManager.delete(deckId, profile.id);
    App.allProfileCards = await CardManager.getByProfile(profile.id);
    toast4(`\u5DF2\u5220\u9664\u9898\u5E93\u300C${deckName}\u300D`);
    renderLibrary();
    loadHomeData();
  }
  async function openRecitationFromDeck(deckId) {
    const { initRecitation: initRecitation2, openRecitationPage: openRecitationPage2, getRecitationTexts: getRecitationTexts2 } = await Promise.resolve().then(() => (init_recitation(), recitation_exports));
    await initRecitation2();
    const texts = getRecitationTexts2();
    if (!texts.length) {
      toast4("\u6682\u65E0\u53E4\u8BD7\u5168\u6587\u6570\u636E\uFF0C\u8BF7\u5148\u52A0\u8F7D\u300C\u53E4\u8BD7\u5168\u6587\u80CC\u8BF5\u300D\u9898\u5E93");
      return;
    }
    const deckCards = App.allProfileCards.filter((c) => c.deckId === deckId);
    const titles = new Set(deckCards.map((c) => c.hint?.split(" - ")[0]?.split("\xB7")[0]?.trim()).filter(Boolean));
    const matched = texts.find((t) => titles.has(t.title) || deckCards.some((c) => c.front?.includes(t.title)));
    if (matched) {
      openRecitationPage2(matched.id);
    } else {
      showPage("library");
      toast4("\u8BF7\u5728\u9898\u5E93\u5E95\u90E8\u9009\u62E9\u8981\u80CC\u8BF5\u7684\u53E4\u8BD7");
      showRecitationListInLibrary();
    }
  }
  function showRecitationListInLibrary() {
    Promise.resolve().then(() => (init_recitation(), recitation_exports)).then(({ getRecitationTexts: getRecitationTexts2, renderRecitationList: renderRecitationList2 }) => {
      const existing = $4("library-recitation-section");
      if (existing) {
        existing.remove();
        return;
      }
      const sec = document.createElement("div");
      sec.id = "library-recitation-section";
      sec.innerHTML = '<div class="deck-group-title" style="padding:12px 16px 4px">\u{1F4D6} \u53E4\u8BD7\u5168\u6587\u80CC\u8BF5</div>';
      const inner = document.createElement("div");
      inner.style.padding = "0 16px 16px";
      sec.appendChild(inner);
      renderRecitationList2(inner, "all");
      $4("decks-list")?.after(sec);
    });
  }
  async function searchCards(query) {
    const profile = App.currentProfile;
    if (!profile) return;
    if (!App.allProfileCards?.length) {
      App.allProfileCards = await CardManager.getByProfile(profile.id);
    }
    const q = query.toLowerCase().trim();
    const all = App.allProfileCards;
    const results = all.filter(
      (c) => c.front?.toLowerCase().includes(q) || c.back?.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q) || c.example?.toLowerCase().includes(q) || c.phonetic?.includes(q) || c.tags?.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 50);
    const container = $4("search-results");
    if (!container) return;
    if (!results.length) {
      container.innerHTML = `<div class="search-empty">\u6CA1\u6709\u627E\u5230"${escapeHtml5(query)}"\u76F8\u5173\u5185\u5BB9</div>`;
      show3(container);
      return;
    }
    container.innerHTML = `<div class="search-count">\u627E\u5230 ${results.length} \u6761\u7ED3\u679C${all.filter((c) => c.front?.toLowerCase().includes(q) || c.back?.toLowerCase().includes(q)).length > 50 ? "\uFF08\u663E\u793A\u524D50\u6761\uFF09" : ""}</div>`;
    results.forEach((card) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      const hi = (text) => {
        if (!text) return "";
        const re = new RegExp(`(${escapeHtml5(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        return escapeHtml5(text).replace(re, "<mark>$1</mark>");
      };
      const subjectIcon_ = { chinese: "\u6587", english: "En", math: "\u2211", custom: "+" }[card.subject] || "?";
      const subjectColor = { chinese: "#E84848", english: "#3B82F6", math: "#8B5CF6", custom: "#10B981" }[card.subject] || "#aaa";
      item.innerHTML = `
      <div class="sri-subject" style="background:${subjectColor}">${subjectIcon_}</div>
      <div class="sri-content">
        <div class="sri-front">${hi(card.front)}${card.phonetic ? `<span class="sri-phonetic"> ${escapeHtml5(card.phonetic)}</span>` : ""}</div>
        <div class="sri-back">${hi(card.back)}</div>
        ${card.example ? `<div class="sri-example">${hi(card.example)}</div>` : ""}
        ${card.hint ? `<div class="sri-hint">\u{1F4A1} ${hi(card.hint)}</div>` : ""}
      </div>
      <button class="sri-speak" title="\u6717\u8BFB">\u{1F50A}</button>
    `;
      item.querySelector(".sri-speak").addEventListener("click", (e) => {
        e.stopPropagation();
        Promise.resolve().then(() => (init_speech(), speech_exports)).then(({ speakCard: speakCard2 }) => speakCard2(card, "front", 0.8));
      });
      container.appendChild(item);
    });
    show3(container);
  }
  async function studyDeck(deckId) {
    const profile = App.currentProfile;
    const cards = App.allProfileCards.filter((c) => c.deckId === deckId);
    const due = cards.filter((c) => c.nextReview <= todayStr());
    const newCards = cards.filter((c) => c.reviewCount === 0);
    const queue = buildStudyQueue(due, newCards, profile.newPerDay || 10);
    if (!queue.length) {
      toast4("\u8FD9\u4E2A\u9898\u5E93\u4ECA\u5929\u6CA1\u6709\u9700\u8981\u590D\u4E60\u7684\u5361\u7247");
      return;
    }
    App.studyQueue = queue;
    App.studyIndex = 0;
    App.sessionResults = [];
    hide3($4("session-complete"));
    showPage("study");
    switchStudyMode("flashcard");
    renderCard();
  }
  var BUILTIN_DECKS = [
    { file: "data/builtin/english/primary/grade3_words.json", name: "\u5C0F\u5B66\u4E09\u5E74\u7EA7\u82F1\u8BED", subject: "english", grade: "primary" },
    { file: "data/builtin/english/primary/grade4_words.json", name: "\u5C0F\u5B66\u56DB\u5E74\u7EA7\u82F1\u8BED", subject: "english", grade: "primary" },
    { file: "data/builtin/english/primary/grade5_words.json", name: "\u5C0F\u5B66\u4E94\u5E74\u7EA7\u82F1\u8BED", subject: "english", grade: "primary" },
    { file: "data/builtin/english/primary/grade6_words.json", name: "\u5C0F\u5B66\u516D\u5E74\u7EA7\u82F1\u8BED", subject: "english", grade: "primary" },
    { file: "data/builtin/english/middle/middle_vocab.json", name: "\u521D\u4E2D\u6838\u5FC3\u8BCD\u6C47", subject: "english", grade: "middle" },
    { file: "data/builtin/english/middle/middle_grammar.json", name: "\u521D\u4E2D\u82F1\u8BED\u8BED\u6CD5", subject: "english", grade: "middle" },
    { file: "data/builtin/chinese/primary/primary_chars_words.json", name: "\u5C0F\u5B66\u751F\u5B57\uFF08\u542B\u504F\u65C1\u7B14\u753B\uFF09", subject: "chinese", grade: "primary" },
    { file: "data/builtin/chinese/primary/primary_words.json", name: "\u5C0F\u5B66\u8BED\u6587\u8BCD\u8BED\uFF08\u8DDF\u8BFB\uFF09", subject: "chinese", grade: "primary" },
    { file: "data/builtin/chinese/primary/primary_poems.json", name: "\u5C0F\u5B66\u5FC5\u80CC\u53E4\u8BD775\u9996", subject: "chinese", grade: "primary" },
    { file: "data/builtin/chinese/primary/primary_idioms.json", name: "\u5C0F\u5B66\u6210\u8BED", subject: "chinese", grade: "primary" },
    { file: "data/builtin/chinese/middle/middle_poems.json", name: "\u521D\u4E2D\u5FC5\u80CC\u53E4\u8BD7\u6587", subject: "chinese", grade: "middle" },
    { file: "data/builtin/math/primary/multiplication.json", name: "\u4E58\u6CD5\u53E3\u8BC0", subject: "math", grade: "primary" },
    { file: "data/builtin/math/primary/primary_formulas.json", name: "\u5C0F\u5B66\u6570\u5B66\u516C\u5F0F", subject: "math", grade: "primary" },
    { file: "data/builtin/math/primary/primary_concepts.json", name: "\u5C0F\u5B66\u6570\u5B66\u6982\u5FF5", subject: "math", grade: "primary" },
    { file: "data/builtin/math/middle/geometry.json", name: "\u521D\u4E2D\u51E0\u4F55\u516C\u5F0F", subject: "math", grade: "middle" },
    { file: "data/builtin/math/middle/algebra.json", name: "\u521D\u4E2D\u4EE3\u6570\u516C\u5F0F", subject: "math", grade: "middle" }
  ];
  async function ensureBuiltinDeck(subject, nameKeyword) {
    const def = BUILTIN_DECKS.find((d) => d.subject === subject && d.name.includes(nameKeyword));
    if (!def) {
      toast4(`\u672A\u627E\u5230\u9898\u5E93\uFF1A${nameKeyword}`);
      return;
    }
    await loadBuiltinDeck(def);
    const decks = await DeckManager.getByProfile(App.currentProfile.id);
    const deck = decks.find((d) => d.name.includes(nameKeyword));
    if (deck) startStudyFromDeck(deck.id, subject);
  }
  async function showBuiltinLibrary() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    const gradeFilterEl = $4("grade-filter");
    const gradeFilter = gradeFilterEl?.querySelector(".filter-btn.active")?.dataset.grade || "all";
    const filtered = gradeFilter === "all" ? BUILTIN_DECKS : BUILTIN_DECKS.filter((d) => d.grade === gradeFilter);
    modal.innerHTML = `
    <div class="modal">
      <h3>\u52A0\u8F7D\u5185\u7F6E\u77E5\u8BC6\u5E93</h3>
      ${filtered.map((d, i) => `
        <button class="btn-secondary" data-idx="${i}" style="text-align:left;margin-bottom:6px">
          ${subjectIcon(d.subject)} ${d.name}
        </button>
      `).join("")}
      <button class="btn-secondary" id="close-builtin-modal" style="margin-top:8px">\u53D6\u6D88</button>
    </div>
  `;
    document.body.appendChild(modal);
    modal.querySelector("#close-builtin-modal").addEventListener("click", () => modal.remove());
    modal.querySelectorAll("[data-idx]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        modal.remove();
        const deck = filtered[parseInt(btn.dataset.idx)];
        await loadBuiltinDeck(deck);
      });
    });
  }
  async function loadBuiltinDeck(deckDef, forceUpdate = false) {
    try {
      toast4(`\u6B63\u5728\u52A0\u8F7D ${deckDef.name}...`);
      const res = await fetch(deckDef.file + "?t=" + Date.now());
      if (!res.ok) throw new Error("\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A" + deckDef.file);
      const data = await res.json();
      const profile = App.currentProfile;
      const allDecks = await DeckManager.getByProfile(profile.id);
      const existing = allDecks.find((d) => d.name === deckDef.name && d.isBuiltin);
      if (existing && !forceUpdate) {
        const localVersion = existing.dataVersion || "0";
        const remoteVersion = data.meta?.version || "2024";
        if (localVersion >= remoteVersion) {
          toast4(`${deckDef.name} \u5DF2\u662F\u6700\u65B0\u7248\u672C`);
          return;
        }
        toast4(`${deckDef.name} \u53D1\u73B0\u65B0\u7248\u672C\uFF0C\u6B63\u5728\u66F4\u65B0...`);
        const oldCards = App.allProfileCards.filter((c) => c.deckId === existing.id);
        await Promise.all(oldCards.map((c) => CardManager.delete(c.id)));
        await DeckManager.delete(existing.id, profile.id);
      }
      const deck = await DeckManager.create(profile.id, deckDef.name, deckDef.subject, deckDef.grade, true);
      deck.dataVersion = data.meta?.version || "2024";
      await Promise.resolve().then(() => (init_core(), core_exports)).then((m) => m.CardManager);
      const cards = (data.cards || []).map((c) => ({ ...c, subject: deckDef.subject }));
      await CardManager.bulkCreate(profile.id, deck.id, cards);
      App.allProfileCards = await CardManager.getByProfile(profile.id);
      toast4(`\u5DF2\u52A0\u8F7D ${cards.length} \u5F20\u5361\u7247\uFF0C\u70B9\u51FB\u4E3B\u9875\u79D1\u76EE\u56FE\u6807\u5F00\u59CB\u5B66\u4E60\uFF01`);
      loadHomeData();
      renderLibrary();
    } catch (e) {
      toast4(`\u52A0\u8F7D\u5931\u8D25\uFF1A${e.message}`);
    }
  }
  async function updateAllBuiltinDecks() {
    const profile = App.currentProfile;
    if (!profile) return;
    const allDecks = await DeckManager.getByProfile(profile.id);
    const builtinLoaded = allDecks.filter((d) => d.isBuiltin).map((d) => d.name);
    let updated = 0;
    for (const deckDef of BUILTIN_DECKS) {
      if (builtinLoaded.includes(deckDef.name)) {
        await loadBuiltinDeck(deckDef, true);
        updated++;
      }
    }
    toast4(updated > 0 ? `\u5DF2\u68C0\u67E5\u5E76\u66F4\u65B0 ${updated} \u4E2A\u9898\u5E93` : "\u6CA1\u6709\u5DF2\u52A0\u8F7D\u7684\u5185\u7F6E\u9898\u5E93\u9700\u8981\u66F4\u65B0");
  }
  async function renderStats() {
    const profile = App.currentProfile;
    if (!profile) return;
    const cards = App.allProfileCards;
    const allProg = await ProgressManager.getLast7Days(profile.id);
    const totalReviewed = allProg.reduce((s, p) => s + p.reviewed, 0);
    const totalCorrect = allProg.reduce((s, p) => s + p.correct, 0);
    const accuracy = totalReviewed ? Math.round(totalCorrect / totalReviewed * 100) : 0;
    $4("total-reviewed").textContent = totalReviewed;
    $4("total-accuracy").textContent = `${accuracy}%`;
    $4("total-streak").textContent = profile.streak || 0;
    renderWeeklyChart(allProg);
    const hard = cards.filter((c) => c.reviewCount > 2).sort((a, b) => a.correctCount / a.reviewCount - b.correctCount / b.reviewCount).slice(0, 10);
    const list = $4("hard-cards-list");
    list.innerHTML = "";
    hard.forEach((c) => {
      const rate = Math.round((c.correctCount || 0) / c.reviewCount * 100);
      const item = document.createElement("div");
      item.className = "hard-card-item";
      item.innerHTML = `<span class="hard-card-front">${escapeHtml5(c.front)}</span><span class="hard-card-rate">\u6B63\u786E\u7387 ${rate}%</span>`;
      list.appendChild(item);
    });
  }
  function renderWeeklyChart(data) {
    const container = $4("weekly-chart");
    container.innerHTML = "";
    const max = Math.max(...data.map((d) => d.reviewed), 1);
    data.forEach((d) => {
      const group = document.createElement("div");
      group.className = "chart-bar-group";
      const pct = Math.round(d.reviewed / max * 100);
      const day = d.date.slice(5);
      group.innerHTML = `
      <div class="chart-bar" style="height:${pct}%"></div>
      <div class="chart-label">${day}</div>
    `;
      container.appendChild(group);
    });
  }
  async function renderSettings() {
    const profile = App.currentProfile;
    if (!profile) return;
    $4("setting-grade").value = profile.grade?.replace(/\d+$/, "") || "primary";
    $4("setting-algorithm").value = profile.algorithm || "auto";
    $4("setting-new-per-day").value = profile.newPerDay || 10;
    $4("new-per-day-value").textContent = profile.newPerDay || 10;
    $4("setting-speech-rate").value = profile.speechRate || 0.8;
    $4("speech-rate-value").textContent = `${profile.speechRate || 0.8}\xD7`;
    $4("setting-azure-key").value = profile.azureKey || "";
    $4("setting-azure-region").value = profile.azureRegion || "";
    const adultToggle = $4("setting-adult-mode");
    if (adultToggle) adultToggle.checked = localStorage.getItem("adult_mode") === "1";
    loadAISettingsUI();
    loadVoiceSelectors();
    ["setting-grade", "setting-algorithm"].forEach((id) => {
      $4(id)?.addEventListener("change", saveProfileSettings);
    });
    ["setting-new-per-day", "setting-speech-rate"].forEach((id) => {
      $4(id)?.addEventListener("change", saveProfileSettings);
    });
    const profiles = await ProfileManager.getAll();
    const pList = $4("settings-profiles-list");
    pList.innerHTML = "";
    profiles.forEach((p) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0";
      row.innerHTML = `<span style="font-size:24px">${p.avatar}</span><span style="flex:1">${escapeHtml5(p.name)}</span>`;
      pList.appendChild(row);
    });
  }
  async function saveProfileSettings() {
    await ProfileManager.update(App.currentProfile.id, {
      grade: $4("setting-grade").value,
      algorithm: $4("setting-algorithm").value,
      newPerDay: parseInt($4("setting-new-per-day").value),
      speechRate: parseFloat($4("setting-speech-rate").value)
    });
    Object.assign(App.currentProfile, {
      grade: $4("setting-grade").value,
      algorithm: $4("setting-algorithm").value,
      newPerDay: parseInt($4("setting-new-per-day").value),
      speechRate: parseFloat($4("setting-speech-rate").value)
    });
    toast4("\u5DF2\u4FDD\u5B58");
  }
  function loadVoiceSelectors() {
    const populate = (selectId, lang) => {
      const sel = $4(selectId);
      if (!sel) return;
      const voices = getAvailableVoices(lang);
      if (!voices.length) {
        sel.innerHTML = '<option value="">\uFF08\u7CFB\u7EDF\u9ED8\u8BA4\uFF09</option>';
        return;
      }
      const savedName = localStorage.getItem(`voice_${lang}`) || "";
      sel.innerHTML = '<option value="">\uFF08\u81EA\u52A8\u9009\u6700\u4F73\uFF09</option>' + voices.map((v) => {
        const quality = v.name.toLowerCase().includes("google") ? " \u2B50" : v.name.toLowerCase().includes("microsoft") ? " \u2605" : "";
        const online = !v.localService ? " [\u5728\u7EBF]" : "";
        return `<option value="${escapeHtml5(v.name)}" ${v.name === savedName ? "selected" : ""}>${escapeHtml5(v.name)}${quality}${online}</option>`;
      }).join("");
      sel.addEventListener("change", () => {
        setSavedVoiceName(lang, sel.value);
        const testText = lang === "zh-CN" ? "\u4F60\u597D\uFF0C\u8FD9\u662F\u4E2D\u6587\u6717\u8BFB\u6D4B\u8BD5" : "Hello, this is a voice test.";
        speak2(testText, lang, 0.9);
      });
    };
    const tryLoad = () => {
      const zhVoices = getAvailableVoices("zh-CN");
      const enVoices = getAvailableVoices("en-US");
      if (zhVoices.length || enVoices.length) {
        populate("setting-voice-zh", "zh-CN");
        populate("setting-voice-en", "en-US");
      } else {
        setTimeout(tryLoad, 500);
      }
    };
    tryLoad();
    $4("btn-test-voice")?.addEventListener("click", () => {
      const zhVoice = $4("setting-voice-zh")?.value;
      const enVoice = $4("setting-voice-en")?.value;
      if (zhVoice) setSavedVoiceName("zh-CN", zhVoice);
      if (enVoice) setSavedVoiceName("en-US", enVoice);
      speak2("\u5E8A\u524D\u660E\u6708\u5149\uFF0C\u7591\u662F\u5730\u4E0A\u971C\u3002", "zh-CN", 0.9);
      setTimeout(() => speak2("Hello! Nice to meet you.", "en-US", 0.85), 2500);
    });
  }
  async function saveAzureConfig() {
    const key = $4("setting-azure-key").value.trim();
    const region = $4("setting-azure-region").value.trim();
    await ProfileManager.update(App.currentProfile.id, { azureKey: key, azureRegion: region });
    App.currentProfile.azureKey = key;
    App.currentProfile.azureRegion = region;
    toast4(key ? "Azure \u914D\u7F6E\u5DF2\u4FDD\u5B58" : "Azure Key \u5DF2\u6E05\u9664");
  }
  async function exportCurrentProfile() {
    const data = await exportData(App.currentProfile.id);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kids-memory-${App.currentProfile.name}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function clearCurrentProfileData() {
    const name = App.currentProfile.name;
    if (!confirm(`\u786E\u5B9A\u8981\u6E05\u7A7A\u3010${name}\u3011\u7684\u6240\u6709\u5B66\u4E60\u6570\u636E\u5417\uFF1F

\u6B64\u64CD\u4F5C\u5C06\u5220\u9664\u6240\u6709\u5361\u7247\u548C\u5B66\u4E60\u8BB0\u5F55\uFF0C\u65E0\u6CD5\u64A4\u9500\uFF01`)) return;
    const input = prompt(`\u8BF7\u8F93\u5165\u6863\u6848\u540D\u79F0\u3010${name}\u3011\u4EE5\u786E\u8BA4\u5220\u9664\uFF1A`);
    if (input?.trim() !== name) {
      toast4("\u8F93\u5165\u7684\u540D\u79F0\u4E0D\u5339\u914D\uFF0C\u5DF2\u53D6\u6D88");
      return;
    }
    const cards = await CardManager.getByProfile(App.currentProfile.id);
    await Promise.all(cards.map((c) => CardManager.delete(c.id)));
    App.allProfileCards = [];
    toast4("\u6570\u636E\u5DF2\u6E05\u7A7A");
    loadHomeData();
  }
  var _editingProfileId = null;
  function openProfileEditModal(profile) {
    _editingProfileId = profile?.id || null;
    $4("profile-modal-title").textContent = profile ? "\u7F16\u8F91\u6863\u6848" : "\u65B0\u5EFA\u6863\u6848";
    $4("profile-name-input").value = profile?.name || "";
    $4("profile-grade-input").value = profile?.grade?.replace(/\d+$/, "") || "primary";
    const avatar = profile?.avatar || "\u{1F43C}";
    $4("profile-selected-avatar").textContent = avatar;
    document.querySelectorAll(".avatar-option").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.emoji === avatar);
    });
    show3($4("profile-edit-modal"));
    setTimeout(() => $4("profile-name-input").focus(), 100);
  }
  async function saveProfileFromModal() {
    const name = $4("profile-name-input").value.trim();
    const grade = $4("profile-grade-input").value;
    const avatar = $4("profile-selected-avatar").textContent;
    if (!name) {
      toast4("\u8BF7\u8F93\u5165\u540D\u5B57");
      return;
    }
    if (_editingProfileId) {
      await ProfileManager.update(_editingProfileId, { name, grade, avatar });
      if (App.currentProfile?.id === _editingProfileId) {
        Object.assign(App.currentProfile, { name, grade, avatar });
        $4("current-avatar").textContent = avatar;
        $4("current-name").textContent = name;
      }
      toast4(`\u5DF2\u66F4\u65B0\u6863\u6848\uFF1A${name}`);
    } else {
      const profile = await ProfileManager.create(name, avatar, grade.startsWith("middle") ? "middle" : "primary");
      await ProfileManager.update(profile.id, { grade });
      toast4(`\u5DF2\u521B\u5EFA\u6863\u6848\uFF1A${name}`);
    }
    hide3($4("profile-edit-modal"));
    await loadProfiles();
  }
  async function openManageProfiles() {
    const profiles = await ProfileManager.getAll();
    const list = $4("manage-profiles-list");
    list.innerHTML = "";
    profiles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "manage-profile-item";
      row.innerHTML = `
      <div class="manage-profile-emoji">${p.avatar || "\u{1F423}"}</div>
      <div class="manage-profile-info">
        <div class="manage-profile-name">${escapeHtml5(p.name)}</div>
        <div class="manage-profile-grade">${gradeLabel2(p.grade)}</div>
      </div>
      <div class="manage-profile-btns">
        <button class="btn-edit-sm" data-id="${p.id}">\u7F16\u8F91</button>
        <button class="btn-delete-sm" data-id="${p.id}" data-name="${escapeHtml5(p.name)}">\u5220\u9664</button>
      </div>
    `;
      list.appendChild(row);
    });
    list.querySelectorAll(".btn-edit-sm").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const p = profiles.find((x) => x.id === btn.dataset.id);
        hide3($4("manage-profiles-modal"));
        openProfileEditModal(p);
      });
    });
    list.querySelectorAll(".btn-delete-sm").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(`\u786E\u5B9A\u5220\u9664\u6863\u6848"${btn.dataset.name}"\u53CA\u5176\u6240\u6709\u5B66\u4E60\u6570\u636E\u5417\uFF1F`)) return;
        await ProfileManager.delete(btn.dataset.id);
        if (App.currentProfile?.id === btn.dataset.id) App.currentProfile = null;
        toast4("\u6863\u6848\u5DF2\u5220\u9664");
        hide3($4("manage-profiles-modal"));
        await loadProfiles();
      });
    });
    show3($4("manage-profiles-modal"));
  }
  async function saveAIConfig() {
    const workerUrl = $4("setting-free-worker-url")?.value.trim() || "";
    const provider = $4("setting-ai-provider").value;
    const key = $4("setting-ai-key").value.trim();
    const endpoint = $4("setting-ai-endpoint").value.trim();
    if (workerUrl) localStorage.setItem("free_worker_url", workerUrl);
    else localStorage.removeItem("free_worker_url");
    localStorage.setItem("ai_provider", provider || (workerUrl ? "free" : ""));
    localStorage.setItem("ai_key", key);
    localStorage.setItem("ai_endpoint", endpoint);
    if (workerUrl) toast4("\u514D\u8D39 Worker \u5DF2\u914D\u7F6E\uFF0CAI \u529F\u80FD\u5DF2\u542F\u7528");
    else if (key) toast4("AI Key \u5DF2\u4FDD\u5B58");
    else toast4("AI \u914D\u7F6E\u5DF2\u6E05\u9664");
  }
  function loadAISettingsUI() {
    const workerUrl = localStorage.getItem("free_worker_url") || "";
    const provider = localStorage.getItem("ai_provider") || "";
    const key = localStorage.getItem("ai_key") || "";
    const endpoint = localStorage.getItem("ai_endpoint") || "";
    if ($4("setting-free-worker-url")) $4("setting-free-worker-url").value = workerUrl;
    if ($4("setting-ai-provider")) $4("setting-ai-provider").value = provider === "free" ? "" : provider;
    if ($4("setting-ai-key")) $4("setting-ai-key").value = key ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "";
    if ($4("setting-ai-endpoint")) $4("setting-ai-endpoint").value = endpoint;
  }
  function openAIModal() {
    const workerUrl = localStorage.getItem("free_worker_url") || "";
    const savedKey = localStorage.getItem("ai_key") || "";
    const savedProvider = localStorage.getItem("ai_provider") || (workerUrl ? "free" : savedKey ? "deepseek" : "free");
    const modal = $4("ai-generate-modal");
    if (!modal) return;
    modal.querySelectorAll("[data-provider]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.provider === savedProvider);
    });
    const hintEl = $4("ai-key-hint");
    if (hintEl) {
      if (workerUrl) {
        hintEl.textContent = "\u5DF2\u914D\u7F6E\u514D\u8D39 Worker \u2713";
        hintEl.style.display = "block";
      } else if (savedKey) {
        hintEl.textContent = "\u5DF2\u4F7F\u7528\u4FDD\u5B58\u7684 API Key \u2713";
        hintEl.style.display = "block";
      } else {
        hintEl.style.display = "none";
      }
    }
    const grade = App.currentProfile?.grade || "primary3";
    const gradeMap = {
      primary1: "\u5C0F\u5B66\u4E00\u5E74\u7EA7",
      primary2: "\u5C0F\u5B66\u4E8C\u5E74\u7EA7",
      primary3: "\u5C0F\u5B66\u4E09\u5E74\u7EA7",
      primary4: "\u5C0F\u5B66\u56DB\u5E74\u7EA7",
      primary5: "\u5C0F\u5B66\u4E94\u5E74\u7EA7",
      primary6: "\u5C0F\u5B66\u516D\u5E74\u7EA7",
      middle1: "\u521D\u4E2D\u4E00\u5E74\u7EA7",
      middle2: "\u521D\u4E2D\u4E8C\u5E74\u7EA7",
      middle3: "\u521D\u4E2D\u4E09\u5E74\u7EA7"
    };
    const gradeSelect = $4("ai-grade-select");
    if (gradeSelect) gradeSelect.value = gradeMap[grade] || "\u5C0F\u5B66\u4E09\u5E74\u7EA7";
    show3(modal);
  }
  function downloadTemplate(type) {
    const files = {
      english: "data/sample/template_english.csv",
      chinese: "data/sample/template_chinese.csv",
      math: "data/sample/template_math.csv",
      general: "data/sample/template_general.csv"
    };
    const names = {
      english: "\u82F1\u8BED\u5355\u8BCD\u6A21\u677F.csv",
      chinese: "\u8BED\u6587\u8BCD\u8BED\u6A21\u677F.csv",
      math: "\u6570\u5B66\u516C\u5F0F\u6A21\u677F.csv",
      general: "\u901A\u7528\u6A21\u677F.csv"
    };
    const url = files[type];
    const name = names[type];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }
  async function addProfileDialog() {
    openProfileEditModal(null);
  }
  var audioCtx = typeof AudioContext !== "undefined" ? new AudioContext() : null;
  function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const sounds = {
      correct: { freq: [523, 659, 784], dur: 0.1 },
      wrong: { freq: [220, 180], dur: 0.15 },
      perfect: { freq: [523, 659, 784, 1047], dur: 0.12 },
      complete: { freq: [392, 523, 659], dur: 0.15 }
    };
    const cfg = sounds[type] || sounds.correct;
    const now = audioCtx.currentTime;
    osc.type = "sine";
    cfg.freq.forEach((f, i) => {
      osc.frequency.setValueAtTime(f, now + i * cfg.dur);
    });
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(1e-3, now + cfg.freq.length * cfg.dur + 0.1);
    osc.start(now);
    osc.stop(now + cfg.freq.length * cfg.dur + 0.2);
  }
  function escapeHtml5(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function gradeLabel2(grade) {
    const map = {
      // 新简化值
      primary: "\u5C0F\u5B66",
      middle: "\u521D\u4E2D",
      adult: "\u6210\u4EBA\u5B66\u4E60",
      // 旧年级值（兼容）
      primary1: "\u5C0F\u5B66",
      primary2: "\u5C0F\u5B66",
      primary3: "\u5C0F\u5B66",
      primary4: "\u5C0F\u5B66",
      primary5: "\u5C0F\u5B66",
      primary6: "\u5C0F\u5B66",
      middle1: "\u521D\u4E2D",
      middle2: "\u521D\u4E2D",
      middle3: "\u521D\u4E2D"
    };
    return map[grade] || grade || "";
  }
  function splitSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!w) return [word];
    const vowels = "aeiouy";
    const isVowel = (c) => vowels.includes(c);
    const prefixes = ["pre", "pro", "re", "un", "dis", "mis", "over", "under", "out", "sub", "super"];
    const suffixes = ["tion", "sion", "ous", "ious", "eous", "ful", "less", "ness", "ment", "ing", "ed", "er", "est", "ly", "ive", "ize", "ise", "able", "ible", "al", "ic"];
    const chars = w.split("");
    const vowelPositions = chars.map((c, i) => isVowel(c) ? i : -1).filter((i) => i >= 0);
    if (vowelPositions.length <= 1) return [word];
    const breaks = [];
    for (let i = 0; i < vowelPositions.length - 1; i++) {
      const v1 = vowelPositions[i];
      const v2 = vowelPositions[i + 1];
      const between = chars.slice(v1 + 1, v2);
      if (between.length === 0) continue;
      if (between.length === 1) {
        breaks.push(v1 + 1);
      } else if (between.length >= 2) {
        const mid = v1 + 1 + Math.floor(between.length / 2);
        breaks.push(mid);
      }
    }
    if (!breaks.length) return [word];
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
    return result.filter((s) => s.length > 0);
  }
  function colorSyllables(word) {
    if (!word || !/^[a-zA-Z][a-zA-Z' -]*$/.test(word.trim())) return null;
    const parts = splitSyllables(word.trim());
    if (parts.length <= 1) return null;
    return parts.map(
      (p, i) => `<span class="syl syl-${i % 4 + 1}">${escapeHtml5(p)}</span>`
    ).join("");
  }
  function colorEnglishSyllables(text) {
    if (!text) return "";
    const tokens = text.split(/([a-zA-Z][a-zA-Z'-]*)/);
    return tokens.map((tok) => {
      if (/^[a-zA-Z][a-zA-Z'-]*$/.test(tok)) {
        const colored = colorSyllables(tok);
        return colored || escapeHtml5(tok);
      }
      return escapeHtml5(tok);
    }).join("");
  }
  function subjectLabel(subject) {
    return { chinese: "\u8BED\u6587", english: "\u82F1\u8BED", math: "\u6570\u5B66", custom: "\u9898\u5E93" }[subject] || "";
  }
  function subjectIcon(subject) {
    return { chinese: "\u6587", english: "En", math: "\u2211", custom: "+" }[subject] || "?";
  }
  document.addEventListener("start-english-vocab", (e) => {
    const { queue, direction } = e.detail;
    if (!queue?.length) {
      toast4("\u6CA1\u6709\u53EF\u590D\u4E60\u7684\u5355\u8BCD");
      return;
    }
    if (direction) App.cardDirection = direction;
    App.studyQueue = queue;
    App.studyIndex = 0;
    App.sessionResults = [];
    hide3($4("session-complete"));
    showPage("study");
    switchStudyMode("flashcard");
    renderCard();
  });
  document.addEventListener("ai-cards-ready", (e) => {
    const { cards, suggestedName } = e.detail;
    _importCache = cards;
    if ($4("deck-name-input")) $4("deck-name-input").value = suggestedName;
    showImportPreview(cards);
    showPage("import");
    toast4(`AI \u751F\u6210\u4E86 ${cards.length} \u5F20\u5361\u7247\uFF0C\u8BF7\u786E\u8BA4\u540E\u5BFC\u5165`);
  });
  document.addEventListener("refresh-library", async () => {
    if (App.currentProfile) {
      App.allProfileCards = await CardManager.getByProfile(App.currentProfile.id);
      renderLibrary();
      loadHomeData();
    }
  });
  var _searchFilter = "all";
  var _searchTimer = null;
  var _searchIndex = null;
  var _searchPageInited = false;
  function initSearchPage() {
    const input = $4("search-page-input");
    const clearBtn = $4("btn-search-page-clear");
    if (!_searchPageInited) {
      _searchPageInited = true;
      document.querySelectorAll(".search-filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".search-filter-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _searchFilter = btn.dataset.filter;
          const q2 = input?.value.trim();
          if (q2) runSearch(q2);
        });
      });
      document.querySelectorAll(".sph-ex").forEach((ex) => {
        ex.addEventListener("click", () => {
          if (input) {
            input.value = ex.dataset.q;
            input.focus();
          }
          runSearch(ex.dataset.q);
        });
      });
      input?.addEventListener("input", () => {
        clearTimeout(_searchTimer);
        const q2 = input.value.trim();
        if (q2) {
          show3(clearBtn);
          _searchTimer = setTimeout(() => runSearch(q2), 250);
        } else {
          hide3(clearBtn);
          hide3($4("search-page-results"));
          show3($4("search-page-hint"));
          if ($4("search-page-count")) $4("search-page-count").textContent = "";
        }
      });
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          clearTimeout(_searchTimer);
          const q2 = input.value.trim();
          if (q2) {
            show3(clearBtn);
            runSearch(q2);
          }
          e.preventDefault();
        }
      });
      clearBtn?.addEventListener("click", () => {
        input.value = "";
        hide3(clearBtn);
        hide3($4("search-page-results"));
        show3($4("search-page-hint"));
        if ($4("search-page-count")) $4("search-page-count").textContent = "";
        input.focus();
      });
    }
    const q = input?.value.trim();
    if (q) {
      runSearch(q);
    } else {
      hide3($4("search-page-results"));
      show3($4("search-page-hint"));
      if ($4("search-page-count")) $4("search-page-count").textContent = "";
    }
    setTimeout(() => input?.focus(), 150);
  }
  async function buildSearchIndex() {
    const profile = App.currentProfile;
    if (!profile) {
      console.warn("[Search] no profile");
      return {};
    }
    const allCards = await CardManager.getByProfile(profile.id);
    const decks = await DeckManager.getByProfile(profile.id);
    console.log("[Search] profile:", profile.name, "decks:", decks.length, "cards:", allCards.length);
    const index = {};
    decks.forEach((deck) => {
      const deckCards = allCards.filter((c) => c.deckId === deck.id);
      if (deckCards.length) {
        index[deck.id] = { deck, cards: deckCards };
      }
    });
    try {
      const texts = window._recitationTexts;
      console.log("[Search] recitation texts:", texts?.length);
      if (texts?.length) {
        index["__recitation__"] = {
          deck: { id: "__recitation__", name: "\u53E4\u8BD7\u6587\u80CC\u8BF5", subject: "chinese" },
          cards: texts.map((t) => ({
            id: t.id,
            deckId: "__recitation__",
            front: t.title + (t.author ? " \u2014 " + t.author : ""),
            back: t.full_text || "",
            hint: t.annotation || "",
            example: t.translation || "",
            tags: [t.dynasty || "", t.category || "", t.grade || ""],
            _reciteId: t.id
          }))
        };
      }
    } catch (e) {
      console.warn("[Search] recitation error:", e);
    }
    console.log("[Search] index built, groups:", Object.keys(index));
    return index;
  }
  async function runSearch(query) {
    const container = $4("search-page-results");
    const hint = $4("search-page-hint");
    const countEl = $4("search-page-count");
    if (!container) return;
    const q = query.toLowerCase().trim();
    if (!q) return;
    _searchIndex = await buildSearchIndex();
    console.log(
      "[Search] query:",
      JSON.stringify(q),
      "filter:",
      _searchFilter,
      "groups:",
      Object.keys(_searchIndex).length,
      "keys:",
      Object.keys(_searchIndex).join(",")
    );
    const re = new RegExp(escapeRegex(q), "gi");
    const hiText = (text) => {
      if (!text) return "";
      return escapeHtml5(text).replace(
        new RegExp(`(${escapeRegex(escapeHtml5(q))})`, "gi"),
        "<mark>$1</mark>"
      );
    };
    const groupResults = [];
    let totalCount = 0;
    for (const { deck, cards } of Object.values(_searchIndex)) {
      const isRecitation = deck.id === "__recitation__";
      const subject = deck.subject || "custom";
      if (_searchFilter !== "all" && subject !== _searchFilter) continue;
      const matched = cards.filter((c) => {
        const front = c.front?.toLowerCase() || "";
        const back = c.back?.toLowerCase() || "";
        const hint_ = c.hint?.toLowerCase() || "";
        const ex = c.example?.toLowerCase() || "";
        const ph = c.phonetic?.toLowerCase() || "";
        const tags = (c.tags || []).join(" ").toLowerCase();
        return front.includes(q) || back.includes(q) || hint_.includes(q) || ex.includes(q) || ph.includes(q) || tags.includes(q);
      });
      if (matched.length) {
        groupResults.push({ deck, matched: matched.slice(0, 20), isRecitation });
        totalCount += matched.length;
      }
    }
    if (!groupResults.length) {
      container.innerHTML = `<div class="search-empty-full">\u6CA1\u6709\u627E\u5230 <strong>${escapeHtml5(query)}</strong> \u76F8\u5173\u5185\u5BB9<br><span style="font-size:var(--font-size-xs);color:var(--color-text-hint)">\u8BD5\u8BD5\u6362\u4E2A\u5173\u952E\u8BCD\uFF0C\u6216\u5148\u4E0B\u8F7D\u66F4\u591A\u8BCD\u5E93</span></div>`;
      show3(container);
      hide3(hint);
      countEl.textContent = "\u65E0\u7ED3\u679C";
      return;
    }
    countEl.textContent = `\u5171 ${totalCount} \u6761`;
    container.innerHTML = "";
    groupResults.forEach(({ deck, matched, isRecitation }) => {
      const section = document.createElement("div");
      section.className = "sq-section";
      const subjectColors = { chinese: "#E84848", english: "#3B82F6", math: "#8B5CF6", custom: "#10B981" };
      const subjectIcons = { chinese: "\u6587", english: "En", math: "\u2211", custom: "+" };
      const color = subjectColors[deck.subject] || "#aaa";
      const icon = isRecitation ? "\u8BD7" : subjectIcons[deck.subject] || "?";
      section.innerHTML = `
      <div class="sq-deck-header">
        <span class="sq-deck-icon" style="background:${color}">${icon}</span>
        <span class="sq-deck-name">${escapeHtml5(deck.name)}</span>
        <span class="sq-deck-count">${matched.length} \u6761</span>
      </div>
    `;
      matched.forEach((card) => {
        const item = document.createElement("div");
        item.className = "sq-item" + (isRecitation ? " sq-item-recite" : "");
        if (isRecitation) {
          const previewText = card.back.replace(/\n/g, " ").slice(0, 40);
          item.innerHTML = `
          <div class="sq-item-main">
            <div class="sq-front">${hiText(card.front)}</div>
            <div class="sq-back sq-recite-preview">${escapeHtml5(previewText)}\u2026</div>
            ${card.example ? `<div class="sq-example sq-recite-trans">${escapeHtml5(card.example.slice(0, 50))}\u2026</div>` : ""}
          </div>
          <button class="sq-recite-btn" title="\u80CC\u8BF5">\u{1F4D6}</button>
        `;
          item.querySelector(".sq-recite-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            (window._openRecitationPage || openRecitationPage)(card._reciteId);
          });
          item.addEventListener("click", () => {
            (window._openRecitationPage || openRecitationPage)(card._reciteId);
          });
        } else {
          item.innerHTML = `
          <div class="sq-item-main">
            <div class="sq-front">${hiText(card.front)}${card.phonetic ? `<span class="sq-phonetic">${escapeHtml5(card.phonetic)}</span>` : ""}</div>
            <div class="sq-back">${hiText(card.back)}</div>
            ${card.example ? `<div class="sq-example">${hiText(card.example)}</div>` : ""}
            ${card.hint ? `<div class="sq-hint">\u{1F4A1} ${hiText(card.hint)}</div>` : ""}
          </div>
          <button class="sq-speak" title="\u6717\u8BFB">\u{1F50A}</button>
        `;
          item.querySelector(".sq-speak").addEventListener("click", (e) => {
            e.stopPropagation();
            const text = card.front;
            const hasChinese = /[一-鿿]/.test(text);
            speak2(text, hasChinese ? "zh-CN" : "en-US", 0.85);
          });
        }
        section.appendChild(item);
      });
      container.appendChild(section);
    });
    show3(container);
    hide3(hint);
  }
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  document.addEventListener("vocab-downloaded", () => {
    _searchIndex = null;
  });
  document.addEventListener("refresh-library", () => {
    _searchIndex = null;
  });
  window._dbg = { runSearch, buildSearchIndex, get filter() {
    return _searchFilter;
  }, get index() {
    return _searchIndex;
  } };
  init();
})();
