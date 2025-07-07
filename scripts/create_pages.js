#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import hljs from 'highlight.js';
import markdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.chdir(__dirname);

const md = markdownIt('default', {
  html: false,
  typographer: true,
  quotes: '""\'\'',
  langPrefix: 'language-',
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (error) {
        console.error(error);
      }
    }
    return '<pre class="hljs"><code>' +
      md.utils.escapeHtml(str) +
      '</code></pre>';
  }
});

const scripts = [
  '../content_scripts/cvimrc_parser.js',
  '../content_scripts/content-bundle.js'
];

const makeHTML = (data) => {
  return '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8">' +
    '<link rel="stylesheet" href="./markdown.css">' +
    '<link rel="stylesheet" href="./hljs.css">' +
    '<link rel="stylesheet" href="../content_scripts/main.css">' +
    scripts.map(e => `<script src="${e}"></script>`).join('\n') +
    '</head>' + md.render(data) + '</html>';
};

const fileMap = {
  mappings: 'README.md',
  changelog: 'CHANGELOG.md'
};

for (const key in fileMap) {
  const data = readFileSync('../' + fileMap[key], 'utf8');
  writeFileSync('../src/pages/' + key + '.html', makeHTML(data));
}
