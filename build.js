const fs = require('fs');
const path = require('path');

// Category definitions with order and pinyin IDs
const CATEGORIES = [
  { dir: '儒家', id: 'rujia', name: '儒家' },
  { dir: '道家', id: 'daojia', name: '道家' },
  { dir: '法家', id: 'fajia', name: '法家' },
  { dir: '墨家', id: 'mojia', name: '墨家' },
  { dir: '兵家', id: 'bingjia', name: '兵家' },
  { dir: '经部', id: 'jingbu', name: '经部' },
  { dir: '史部', id: 'shibu', name: '史部' },
  { dir: '杂家', id: 'zajia', name: '杂家' },
];

// Book order within each category
const BOOK_ORDER = {
  '儒家': ['大学', '中庸', '论语', '孟子', '荀子'],
  '道家': ['道德经', '庄子'],
  '法家': ['韩非子'],
  '墨家': ['墨子'],
  '兵家': ['孙子兵法'],
  '经部': ['诗经', '周易', '尚书', '礼记'],
  '史部': ['春秋左传', '战国策'],
  '杂家': ['吕氏春秋'],
};

// Simple pinyin conversion for book IDs
function toId(name) {
  const map = {
    '大学': 'daxue', '中庸': 'zhongyong', '论语': 'lunyu',
    '孟子': 'mengzi', '荀子': 'xunzi', '道德经': 'daodejing',
    '庄子': 'zhuangzi', '韩非子': 'hanfeizi', '墨子': 'mozi',
    '孙子兵法': 'sunzibingfa', '诗经': 'shijing', '周易': 'zhouyi',
    '尚书': 'shangshu', '礼记': 'liji', '春秋左传': 'chunqiuzuozhuan',
    '战国策': 'zhanguoce', '吕氏春秋': 'lvshichunqiu',
  };
  return map[name] || name;
}

function parseBook(filePath, categoryDir) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract title from first H1
  let title = '';
  let author = '';
  let era = '';
  let brief = '';
  const sections = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Title: # xxx
    if (!title && line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.substring(2).trim();
    }

    // Author/editor: > **作者**：xxx or > **编者**：xxx
    if (!author && (line.startsWith('> **作者**：') || line.startsWith('> **编者**：'))) {
      author = line.replace(/^> \*\*(作者|编者)\*\*：/, '').trim();
    }

    // Era: > **年代**：xxx
    if (!era && line.startsWith('> **年代**：')) {
      era = line.replace(/^> \*\*年代\*\*：/, '').trim();
    }

    // Brief: content under ## 简介
    if (line === '## 简介' && !brief) {
      // Collect paragraph lines until next --- or ##
      const briefLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        const bl = lines[j].trim();
        if (bl === '---' || bl.startsWith('## ')) break;
        if (bl) briefLines.push(bl);
      }
      brief = briefLines.join('');
    }

    // Sections: ## headings (except 简介)
    if (line.startsWith('## ') && !line.startsWith('## 简介')) {
      sections.push(line.substring(3).trim());
    }
  }

  return {
    id: toId(title),
    title,
    author,
    era,
    file: `${categoryDir}/${path.basename(filePath)}`,
    brief,
    sections,
  };
}

function build() {
  const categories = [];

  for (const cat of CATEGORIES) {
    const dirPath = path.join(__dirname, cat.dir);
    if (!fs.existsSync(dirPath)) continue;

    const order = BOOK_ORDER[cat.dir] || [];
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

    // Sort files by predefined order
    files.sort((a, b) => {
      const nameA = a.replace('.md', '');
      const nameB = b.replace('.md', '');
      const idxA = order.indexOf(nameA);
      const idxB = order.indexOf(nameB);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const books = [];
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      books.push(parseBook(filePath, cat.dir));
    }

    if (books.length > 0) {
      categories.push({ id: cat.id, name: cat.name, books });
    }
  }

  const output = `window.CLASSICS_DATA = ${JSON.stringify({ categories }, null, 2)};`;
  const outPath = path.join(__dirname, 'js', 'data.js');
  fs.writeFileSync(outPath, output, 'utf-8');
  console.log(`Generated js/data.js with ${categories.length} categories, ${categories.reduce((s, c) => s + c.books.length, 0)} books`);
}

build();
