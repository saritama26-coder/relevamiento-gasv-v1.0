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

const scriptTags = [...html.matchAll(/<script\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>(?:\s*<\/script>)?/gis)];
for (const match of scriptTags.reverse()) {
  const attrs = (match[1] || '') + ' ' + (match[4] || '');
  const assetPath = localAssetPath(match[3]);
  if (!assetPath) {
    throw new Error(`No se puede integrar el script externo: ${match[3]}`);
  }
  const source = await readFile(assetPath, 'utf8');
  const safeSource = source.replace(/<\/script/gi, '<\\/script');
  const isModule = /\btype=(["'])module\1/i.test(attrs);
  const inlineTag = isModule ? `<script type="module">\n${safeSource}\n</script>` : `<script>\n${safeSource}\n</script>`;
  html = html.replace(match[0], inlineTag);
}

const linkTags = [...html.matchAll(/<link\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gis)];
for (const match of linkTags.reverse()) {
  const attrs = (match[1] || '') + ' ' + (match[4] || '');
  const assetPath = localAssetPath(match[3]);
  if (/\brel=(["'])modulepreload\1/i.test(attrs)) {
    html = html.replace(match[0], '');
    continue;
  }
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

// Examinar el marcado HTML, no cadenas que pudieran aparecer dentro del JS inline.
const htmlMarkupOnly = html.replace(/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/gi, '');
const remainingScripts = [...htmlMarkupOnly.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)].map((m) => m[0]);
const remainingStyles = [...htmlMarkupOnly.matchAll(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/gi)].map((m) => m[0]);
if (remainingScripts.length || remainingStyles.length) {
  throw new Error(`Quedaron referencias externas de JavaScript o CSS; no se generó el HTML autónomo. Scripts: ${remainingScripts.join(' | ') || 'ninguno'}. Hojas: ${remainingStyles.join(' | ') || 'ninguna'}.`);
}

const outputPath = path.join(distDir, 'Relevamiento_Arquitectonico_GASV_autonomo.html');
await writeFile(outputPath, html, 'utf8');
console.log(`HTML autónomo generado: ${outputPath} (${Buffer.byteLength(html)} bytes)`);
