// build.js — converts Markdown posts to HTML using templates
const fs = require('fs-extra');
const path = require('path');
const fm = require('gray-matter');
const { marked } = require('marked');

const POSTS_DIR = path.join(__dirname, '_posts');
const OUT_DIR = path.join(__dirname, 'dist');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

fs.ensureDirSync(OUT_DIR);
fs.ensureDirSync(path.join(OUT_DIR, 'posts'));
fs.copyFileSync('CNAME', path.join(OUT_DIR, 'CNAME'));

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
}

const baseTemplate = loadTemplate('base.html');
const postTemplate = loadTemplate('post.html');
const indexTemplate = loadTemplate('index.html');

// Read posts
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.markdown'));

const posts = files.map(f => {
  const src = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
  const { data, content } = fm(src);
  const html = marked(content);
  const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md|\.markdown/,'');
  const outPath = `/posts/${slug}.html`;
  return { file: f, data, content, html, slug, outPath };
}).sort((a,b) => new Date(b.data.date || b.data.time || 0) - new Date(a.data.date || a.data.time || 0));

// Generate post pages
posts.forEach(p => {
  const body = postTemplate.replace('{{title}}', p.data.title || p.slug)
                           .replace('{{date}}', p.data.date || '')
                           .replace('{{content}}', p.html)
                           .replace(/{{slug}}/g, p.slug);
  const page = baseTemplate.replace('{{head}}', `<link rel="stylesheet" href="/assets/css/styles.css">`)
                           .replace('{{body}}', body);
  const outFile = path.join(OUT_DIR, 'posts', p.slug + '.html');
  fs.writeFileSync(outFile, page, 'utf8');
});

// Generate index
const postsListHtml = posts.map(p => `  <li class="post-item"><a href="${p.outPath}"><time>${p.data.date || ''}</time><span class="post-title">${p.data.title}</span></a></li>`).join('\n');
const indexBody = indexTemplate.replace('{{posts}}', postsListHtml);
const indexPage = baseTemplate.replace('{{head}}', `<link rel="stylesheet" href="/assets/css/styles.css">`)
                              .replace('{{body}}', indexBody);
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage);

// Copy assets
fs.ensureDirSync(path.join(OUT_DIR, 'assets'));
fs.copySync('assets', path.join(OUT_DIR, 'assets'));

// Copy favicon etc
['favicon.ico','favicon-96x96.png','favicon.svg','site.webmanifest','apple-touch-icon.png','web-app-manifest-192x192.png','web-app-manifest-512x512.png'].forEach(name => {
  if (fs.existsSync(name)) fs.copyFileSync(name, path.join(OUT_DIR, name));
});

console.log('Build complete. Output in /dist');
