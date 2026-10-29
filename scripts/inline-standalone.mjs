import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
let html = await readFile(indexPath, 'utf8');

function localAssetPath(rawUrl) {
  const cleaned = String(rawUrl || '').split(/[?#]/)[0];
  if (!cleaned || /^(?:[a-z]+:)?\/\//i.test(cleaned) || cleaned.startsWith('data:') || cleaned.startsWith('#')) return null;
  const relative = cleaned.replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
  const resolved = path.resolve(distDir, relative);
  return resolved.startsWith(distDir + path.sep) ? resolved : null;
}

const scriptTags = [...html.matchAll(/<script\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>\s*<\/script>/gis)];
for (const match of scriptTags.reverse()) {
  const attrs = (match[1] || '') + ' ' + (match[4] || '');
  const assetPath = localAssetPath(match[3]);
  if (!assetPath || !/\btype=(["'])module\1/i.test(attrs)) continue;
  const source = await readFile(assetPath, 'utf8');
  const safeSource = source.replace(/<\/script/gi, '<\\/script');
  html = html.replace(match[0], `<script type="module">\n${safeSource}\n</script>`);
}

const linkTags = [...html.matchAll(/<link\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gis)];
for (const match of linkTags.reverse()) {
  const attrs = (match[1] || '') + ' ' + (match[4] || '');
  const assetPath = localAssetPath(match[3]);
  if (!assetPath) continue;
  if (/\brel=(["'])stylesheet\1/i.test(attrs)) {
    const css = await readFile(assetPath, 'utf8');
    html = html.replace(match[0], `<style>\n${css}\n</style>`);
    continue;
  }
  if (/\brel=(["'])(?:icon|apple-touch-icon)\1/i.test(attrs)) {
    try {
      const bytes = await readFile(assetPath);
      const ext = path.extname(assetPath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      const data = `data:${mime};base64,${bytes.toString('base64')}`;
      html = html.replace(match[0], match[0].replace(match[3], data));
    } catch {
      html = html.replace(match[0], '');
    }
  }
}

if (/<script\b[^>]*\bsrc=/i.test(html) || /<link\b[^>]*\brel=(["'])stylesheet\1/i.test(html)) {
  throw new Error('Quedaron referencias externas de JavaScript o CSS; no se generó el HTML autónomo.');
}

const outputPath = path.join(distDir, 'Relevamiento_Arquitectonico_GASV_autonomo.html');
await writeFile(outputPath, html, 'utf8');
console.log(`HTML autónomo generado: ${outputPath} (${Buffer.byteLength(html)} bytes)`);
