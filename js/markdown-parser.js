window.MarkdownParser = {
  // Detect if a line is a pinyin line: starts and ends with *, content is Latin chars/tones/punctuation
  PINYIN_LINE_RE: /^\*([^*]+)\*$/,
  // Latin letters with tone marks + common punctuation in pinyin lines
  PINYIN_CONTENT_RE: /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s,;.:!?'"，；。！？、：\-—–…''\u201c\u201d「」《》()（）\d]+$/,

  isPinyinLine(line) {
    const m = line.match(this.PINYIN_LINE_RE);
    if (!m) return false;
    return this.PINYIN_CONTENT_RE.test(m[1]);
  },

  extractPinyin(line) {
    const m = line.match(this.PINYIN_LINE_RE);
    if (!m) return [];
    // Split by spaces, strip punctuation, filter out empty/punctuation-only tokens
    return m[1].split(/\s+/)
      .map(w => w.replace(/^[^a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+|[^a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/g, ''))
      .filter(w => w.length > 0);
  },

  // Chinese punctuation that should not get ruby annotation
  isCJKPunctuation(ch) {
    return /[，。！？、；：""''（）《》【】—…·\-\s]/.test(ch);
  },

  buildRubyText(pinyinWords, chineseText) {
    let pi = 0;
    let html = '';
    for (const ch of chineseText) {
      if (this.isCJKPunctuation(ch)) {
        html += ch;
      } else if (pi < pinyinWords.length) {
        html += `<ruby>${ch}<rt>${pinyinWords[pi]}</rt></ruby>`;
        pi++;
      } else {
        html += ch;
      }
    }
    return html;
  },

  parseInline(text) {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic (single *)
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return text;
  },

  parse(markdown) {
    const lines = markdown.split('\n');
    const result = [];
    let i = 0;
    let inBlockquote = false;
    let blockquoteLines = [];

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        result.push('<blockquote>' + blockquoteLines.join('\n') + '</blockquote>');
        blockquoteLines = [];
      }
      inBlockquote = false;
    };

    while (i < lines.length) {
      const line = lines[i].trim();

      // Empty line
      if (line === '') {
        flushBlockquote();
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line)) {
        flushBlockquote();
        result.push('<hr>');
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('#')) {
        flushBlockquote();
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          const id = text.replace(/\s+/g, '-');
          if (level === 1) {
            result.push(`<h1 id="${id}">${this.parseInline(text)}</h1>`);
          } else {
            result.push(`<h${level} id="${id}">${this.parseInline(text)}</h${level}>`);
          }
        }
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('> ') || line === '>') {
        const content = line.replace(/^>\s?/, '');
        if (!inBlockquote) {
          inBlockquote = true;
        }
        blockquoteLines.push('<p>' + this.parseInline(content) + '</p>');
        i++;
        continue;
      }

      // Pinyin + Chinese text pair (may have blank line in between)
      if (this.isPinyinLine(line)) {
        flushBlockquote();
        // Look ahead past empty lines to find the Chinese text
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('>') && !this.isPinyinLine(nextLine) && !/^---+$/.test(nextLine)) {
            const pinyinWords = this.extractPinyin(line);
            const rubyHtml = this.buildRubyText(pinyinWords, nextLine);
            result.push('<p class="classic-text">' + rubyHtml + '</p>');
            i = j + 1;
            continue;
          }
        }
      }

      // Regular paragraph
      flushBlockquote();
      result.push('<p>' + this.parseInline(line) + '</p>');
      i++;
    }

    flushBlockquote();
    return result.join('\n');
  }
};
