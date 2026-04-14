(function () {
  const DATA = window.CLASSICS_DATA;
  const Parser = window.MarkdownParser;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const cache = new Map();

  // --- Preferences ---
  const FONT_SIZES = ['font-small', 'font-medium', 'font-large', 'font-xlarge'];
  let fontIdx = parseInt(localStorage.getItem('fontIdx') || '1', 10);
  let pinyinVisible = localStorage.getItem('pinyin') !== 'hidden';
  let darkTheme = localStorage.getItem('theme') === 'dark';

  function applyPreferences() {
    const body = document.body;
    FONT_SIZES.forEach(c => body.classList.remove(c));
    body.classList.add(FONT_SIZES[fontIdx]);
    body.classList.toggle('hide-pinyin', !pinyinVisible);
    body.classList.toggle('dark-theme', darkTheme);
    const pinyinBtn = $('#btn-pinyin');
    if (pinyinBtn) pinyinBtn.textContent = pinyinVisible ? '隐拼音' : '显拼音';
    const themeBtn = $('#btn-theme');
    if (themeBtn) themeBtn.textContent = darkTheme ? '☀' : '☾';
  }

  // --- Sidebar ---
  function buildSidebar() {
    const nav = $('#sidebar-nav');
    let html = '<ul>';
    html += `<li class="nav-home"><a href="#/">首页</a></li>`;
    for (const cat of DATA.categories) {
      html += `<li class="nav-category">`;
      html += `<a href="#/category/${cat.id}">${cat.name}</a>`;
      html += `<ul>`;
      for (const book of cat.books) {
        html += `<li><a href="#/read/${cat.id}/${book.id}">${book.title}</a></li>`;
      }
      html += `</ul></li>`;
    }
    html += '</ul>';
    nav.innerHTML = html;
  }

  function highlightSidebar() {
    $$('#sidebar-nav a').forEach(a => a.classList.remove('active'));
    const hash = location.hash || '#/';
    const active = $(`#sidebar-nav a[href="${hash}"]`);
    if (active) active.classList.add('active');
  }

  // --- Fetch markdown ---
  async function fetchMarkdown(filePath) {
    if (cache.has(filePath)) return cache.get(filePath);
    const resp = await fetch(filePath);
    if (!resp.ok) throw new Error(`Failed to load ${filePath}`);
    const text = await resp.text();
    cache.set(filePath, text);
    return text;
  }

  // --- Views ---
  function renderHome() {
    const main = $('#main-content');
    let html = '<div class="home-view">';
    html += '<h1 class="site-title">中华经典古籍</h1>';
    html += '<p class="site-subtitle">十七部核心经典 · 原文 · 注音 · 注释</p>';
    html += '<div class="category-grid">';
    for (const cat of DATA.categories) {
      html += `<a href="#/category/${cat.id}" class="category-card">`;
      html += `<h2>${cat.name}</h2>`;
      html += `<span class="book-count">${cat.books.length}部</span>`;
      html += `<div class="book-names">${cat.books.map(b => b.title).join('　')}</div>`;
      html += `</a>`;
    }
    html += '</div></div>';
    main.innerHTML = html;
    updateBreadcrumb([{ text: '首页' }]);
  }

  function renderCategory(catId) {
    const cat = DATA.categories.find(c => c.id === catId);
    if (!cat) return renderHome();
    const main = $('#main-content');
    let html = `<div class="category-view">`;
    html += `<h1>${cat.name}</h1>`;
    html += `<div class="book-grid">`;
    for (const book of cat.books) {
      html += `<a href="#/read/${cat.id}/${book.id}" class="book-card">`;
      html += `<h3>${book.title}</h3>`;
      html += `<div class="book-meta">${book.author}　${book.era}</div>`;
      html += `<p class="book-brief">${book.brief.substring(0, 80)}…</p>`;
      html += `</a>`;
    }
    html += '</div></div>';
    main.innerHTML = html;
    updateBreadcrumb([
      { text: '首页', href: '#/' },
      { text: cat.name },
    ]);
  }

  async function renderReader(catId, bookId) {
    const cat = DATA.categories.find(c => c.id === catId);
    if (!cat) return renderHome();
    const book = cat.books.find(b => b.id === bookId);
    if (!book) return renderCategory(catId);

    const main = $('#main-content');
    main.innerHTML = '<div class="loading">载入中…</div>';

    try {
      const md = await fetchMarkdown(book.file);
      const html = Parser.parse(md);
      main.innerHTML = `<div class="reader-view">${html}</div>`;
    } catch (e) {
      main.innerHTML = `<div class="error">加载失败：${e.message}</div>`;
    }

    updateBreadcrumb([
      { text: '首页', href: '#/' },
      { text: cat.name, href: `#/category/${cat.id}` },
      { text: book.title },
    ]);
  }

  function updateBreadcrumb(items) {
    const bc = $('#breadcrumb');
    bc.innerHTML = items.map((item, i) => {
      if (item.href && i < items.length - 1) {
        return `<a href="${item.href}">${item.text}</a>`;
      }
      return `<span>${item.text}</span>`;
    }).join(' <span class="sep">›</span> ');
  }

  // --- Router ---
  function route() {
    const hash = location.hash || '#/';
    const parts = hash.substring(2).split('/');

    // Close sidebar on mobile after navigation
    document.body.classList.remove('sidebar-open');

    if (parts[0] === 'category' && parts[1]) {
      renderCategory(parts[1]);
    } else if (parts[0] === 'read' && parts[1] && parts[2]) {
      renderReader(parts[1], parts[2]);
    } else {
      renderHome();
    }
    highlightSidebar();
  }

  // --- Event Listeners ---
  function init() {
    buildSidebar();
    applyPreferences();

    // Hamburger menu
    $('#btn-menu').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });

    // Font size
    $('#btn-font').addEventListener('click', () => {
      fontIdx = (fontIdx + 1) % FONT_SIZES.length;
      localStorage.setItem('fontIdx', fontIdx);
      applyPreferences();
    });

    // Pinyin toggle
    $('#btn-pinyin').addEventListener('click', () => {
      pinyinVisible = !pinyinVisible;
      localStorage.setItem('pinyin', pinyinVisible ? 'visible' : 'hidden');
      applyPreferences();
    });

    // Theme toggle
    $('#btn-theme').addEventListener('click', () => {
      darkTheme = !darkTheme;
      localStorage.setItem('theme', darkTheme ? 'dark' : 'light');
      applyPreferences();
    });

    // Close sidebar when clicking overlay on mobile
    $('#sidebar-overlay').addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });

    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
