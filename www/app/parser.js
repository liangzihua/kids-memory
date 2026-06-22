/**
 * parser.js — 文档解析
 * 支持：CSV / Excel(.xlsx) / Markdown / Word(.docx) / 纯文本
 * Excel 和 Word 通过 CDN 按需加载
 */

// ===== CSV 解析（无依赖）=====

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const frontIdx = findCol(headers, ['front', '正面', '问题', '单词', 'word', 'question']);
  const backIdx  = findCol(headers, ['back', '背面', '答案', '释义', 'answer', 'meaning']);
  const hintIdx  = findCol(headers, ['hint', '提示', 'tip']);
  const tagIdx   = findCol(headers, ['tags', '标签', 'tag']);
  const phoneIdx = findCol(headers, ['phonetic', '音标', 'ipa']);
  const exIdx    = findCol(headers, ['example', '例句', 'eg']);

  if (frontIdx === -1 || backIdx === -1) {
    // 尝试两列直接解析（第1列=正面，第2列=背面）
    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      if (cols.length < 2 || !cols[0].trim()) return null;
      return { front: cols[0].trim(), back: cols[1].trim(), hint: '', tags: [] };
    }).filter(Boolean);
  }

  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line);
    if (!cols[frontIdx]?.trim()) return null;
    return {
      front:    cols[frontIdx]?.trim() || '',
      back:     cols[backIdx]?.trim()  || '',
      hint:     hintIdx  !== -1 ? cols[hintIdx]?.trim()  : '',
      phonetic: phoneIdx !== -1 ? cols[phoneIdx]?.trim() : '',
      example:  exIdx    !== -1 ? cols[exIdx]?.trim()    : '',
      tags:     tagIdx   !== -1 ? (cols[tagIdx] || '').split(/[,，]/).map(t => t.trim()).filter(Boolean) : []
    };
  }).filter(Boolean);
}

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false, current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
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

// ===== Markdown 解析 =====

export function parseMarkdown(text) {
  const cards = [];
  const lines = text.split(/\r?\n/);
  let currentSection = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 检测 Q&A 模式：问：xxx \n 答：xxx
    if (/^问[：:]\s*(.+)/.test(line)) {
      const question = line.replace(/^问[：:]\s*/, '').trim();
      const nextLine = lines[i + 1] || '';
      if (/^答[：:]\s*/.test(nextLine)) {
        const answer = nextLine.replace(/^答[：:]\s*/, '').trim();
        cards.push({ front: question, back: answer, hint: currentSection, tags: [currentSection].filter(Boolean) });
        i += 2; continue;
      }
    }

    // 检测章节标题（作为 hint/tag）
    const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
    if (sectionMatch) { currentSection = sectionMatch[1].trim(); i++; continue; }

    // 检测列表项 - 词语 — 解释
    const listMatch = line.match(/^[-*]\s+(.+?)\s*[—–-]\s*(.+)/);
    if (listMatch) {
      cards.push({ front: listMatch[1].trim(), back: listMatch[2].trim(), hint: '', tags: [currentSection].filter(Boolean) });
      i++; continue;
    }

    // 检测 **粗体** 词 + 后续行解释
    const boldMatch = line.match(/\*\*(.+?)\*\*/);
    if (boldMatch && i + 1 < lines.length && lines[i+1].trim()) {
      const context = line.replace(/\*\*/g, '').trim();
      cards.push({ front: boldMatch[1].trim(), back: context, hint: currentSection, tags: [currentSection].filter(Boolean) });
    }

    i++;
  }

  // 检测诗词：连续的非空行（4字或7字格式）
  const poetryCards = extractPoetry(lines);
  cards.push(...poetryCards);

  return cards;
}

function extractPoetry(lines) {
  const cards = [];
  let title = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const titleMatch = line.match(/^##\s+(.+)/);
    if (titleMatch) { title = titleMatch[1]; continue; }

    // 诗句行：含句号/逗号且不太长
    if (/[，。！？；]/.test(line) && line.length >= 4 && line.length <= 24) {
      // 拆成上下句
      const parts = line.split(/[，,]/).filter(p => p.trim());
      if (parts.length === 2) {
        cards.push({
          front: parts[0].trim() + '，___',
          back:  parts[1].trim().replace(/[。？！]/, ''),
          hint:  title,
          type:  'poem',
          tags:  ['古诗', title].filter(Boolean)
        });
      }
    }
  }
  return cards;
}

// ===== Excel 解析（SheetJS CDN 按需加载）=====

let _XLSX = null;

async function loadSheetJS() {
  if (_XLSX) return _XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.mini.min.js';
    script.onload = () => { _XLSX = window.XLSX; resolve(_XLSX); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function parseExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb   = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  // 转成 CSV 相同的结构再复用解析
  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const csvText = [headers.join(','), ...rows.slice(1).map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  return parseCSV(csvText);
}

// ===== Word (.docx) 解析（JSZip CDN 按需加载）=====

let _JSZip = null;

async function loadJSZip() {
  if (_JSZip) return _JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => { _JSZip = window.JSZip; resolve(_JSZip); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function parseWord(arrayBuffer) {
  const JSZip = await loadJSZip();
  const zip   = await JSZip.loadAsync(arrayBuffer);
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Invalid .docx file');
  const xml  = await xmlFile.async('string');
  const text = extractTextFromXML(xml);
  // 把提取的纯文本当 Markdown 处理
  return parseMarkdown(text);
}

function extractTextFromXML(xml) {
  // 提取所有 <w:t> 文本节点，段落间加换行
  const lines = [];
  const paraRe  = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const textRe  = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;

  let paraMatch;
  while ((paraMatch = paraRe.exec(xml)) !== null) {
    const para = paraMatch[0];
    let line = '', m;
    while ((m = textRe.exec(para)) !== null) {
      line += m[1];
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join('\n');
}

// ===== 统一入口 =====

export async function parseFile(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '');

  if (ext === 'csv' || ext === 'txt') {
    const text = await readAsText(file);
    return { cards: parseCSV(text), suggestedName: name };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await readAsArrayBuffer(file);
    return { cards: await parseExcel(buf), suggestedName: name };
  }

  throw new Error(`不支持的文件类型：.${ext}（请使用 CSV、Excel 或 TXT）`);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ===== OCR（Tesseract.js CDN 按需加载）=====

export async function parseImageOCR(file, onProgress) {
  await loadTesseract();
  const { createWorker } = window.Tesseract;

  onProgress?.('正在初始化 OCR 引擎...');
  const worker = await createWorker(['chi_sim', 'eng'], 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress?.(`识别中 ${Math.round(m.progress * 100)}%`);
      }
    }
  });

  const url = URL.createObjectURL(file);
  const { data: { text } } = await worker.recognize(url);
  URL.revokeObjectURL(url);
  await worker.terminate();

  onProgress?.('识别完成，正在解析...');
  const cards = parseMarkdown(text) || fallbackOCRParse(text);
  return { cards, suggestedName: file.name.replace(/\.[^.]+$/, '') };
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function fallbackOCRParse(text) {
  // 简单拆行：将每行当作正面，留空给用户补充背面
  return text.split(/\n/).map(line => line.trim()).filter(l => l.length > 1).map(line => ({
    front: line,
    back: '',
    hint: '',
    tags: ['OCR导入']
  }));
}
