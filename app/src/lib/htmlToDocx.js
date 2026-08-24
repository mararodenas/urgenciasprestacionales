import { Paragraph, TextRun, ImageRun } from 'docx';

// Mapeo clásico de tamaños HTML (1-7, los que usa execCommand fontSize)
// a puntos, y de ahí a "half-points" que pide docx.
const TAMANO_HTML_A_PT = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };

function dataUrlAUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function tipoImagenDeDataUrl(dataUrl) {
  const m = /^data:image\/(png|jpe?g|gif|bmp);/i.exec(dataUrl);
  const t = (m?.[1] ?? 'png').toLowerCase();
  return t === 'jpg' ? 'jpeg' : t;
}

function medirImagen(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
    img.onerror = () => resolve({ width: 400, height: 300 });
    img.src = dataUrl;
  });
}

async function imagenAParagraph(imgNode) {
  const dataUrl = imgNode.getAttribute('src') || '';
  if (!dataUrl.startsWith('data:image')) return null;
  const { width, height } = await medirImagen(dataUrl);
  const maxAncho = 550; // puntos, para que entre bien en la página
  const factor = width > maxAncho ? maxAncho / width : 1;
  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new ImageRun({
        data: dataUrlAUint8Array(dataUrl),
        type: tipoImagenDeDataUrl(dataUrl),
        transformation: { width: Math.round(width * factor), height: Math.round(height * factor) },
      }),
    ],
  });
}

function parseInlineNode(node, marks = {}) {
  if (node.nodeType === 3) {
    const text = node.textContent;
    if (!text) return [];
    return [new TextRun({
      text,
      bold: !!marks.bold,
      italics: !!marks.italic,
      underline: marks.underline ? {} : undefined,
      size: marks.sizePt ? marks.sizePt * 2 : undefined,
    })];
  }
  if (node.nodeType !== 1) return [];
  const tag = node.tagName.toLowerCase();
  if (tag === 'ul' || tag === 'ol' || tag === 'img') return []; // se procesan aparte, no como texto inline
  const newMarks = { ...marks };
  if (tag === 'b' || tag === 'strong') newMarks.bold = true;
  if (tag === 'i' || tag === 'em') newMarks.italic = true;
  if (tag === 'u') newMarks.underline = true;
  if (tag === 'font' && node.getAttribute('size')) {
    newMarks.sizePt = TAMANO_HTML_A_PT[node.getAttribute('size')] ?? newMarks.sizePt;
  }
  if (tag === 'br') return [new TextRun({ text: '', break: 1 })];
  let runs = [];
  node.childNodes.forEach((child) => { runs = runs.concat(parseInlineNode(child, newMarks)); });
  return runs;
}

function inlineOfLi(li) {
  let runs = [];
  li.childNodes.forEach((child) => {
    if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) return;
    runs = runs.concat(parseInlineNode(child));
  });
  return runs;
}

function walkList(listNode, level, paragraphs) {
  const tag = listNode.tagName.toLowerCase();
  let counter = 0;
  Array.from(listNode.children).forEach((child) => {
    // El navegador a veces deja la sub-lista como hermana de los <li> en vez
    // de anidada adentro de uno (ej: <ol><li>..</li><ul>..</ul><li>..</li></ol>).
    if (child.tagName === 'UL' || child.tagName === 'OL') {
      walkList(child, level + 1, paragraphs);
      return;
    }
    if (child.tagName !== 'LI') return;
    counter += 1;
    const runs = inlineOfLi(child);
    if (tag === 'ol') {
      paragraphs.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 + level * 360 },
        children: [new TextRun(`${counter}. `), ...(runs.length ? runs : [new TextRun('')])],
      }));
    } else {
      paragraphs.push(new Paragraph({ bullet: { level }, spacing: { after: 60 }, children: runs.length ? runs : [new TextRun('')] }));
    }
    // caso normal: sub-lista anidada adentro del <li>
    Array.from(child.children).forEach((sub) => {
      if (sub.tagName === 'UL' || sub.tagName === 'OL') walkList(sub, level + 1, paragraphs);
    });
  });
}

// Recorre CUALQUIER nodo (a cualquier profundidad) buscando bloques —
// listas, imágenes, párrafos/divs — sin asumir que están a un nivel fijo,
// que es justo lo que rompía antes (listas/imágenes anidadas se perdían).
async function walkNode(node, paragraphs) {
  if (node.nodeType === 3) {
    if (node.textContent.trim()) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(node.textContent)] }));
    }
    return;
  }
  if (node.nodeType !== 1) return;
  const tag = node.tagName.toLowerCase();

  if (tag === 'ul' || tag === 'ol') {
    walkList(node, 0, paragraphs);
    return;
  }
  if (tag === 'img') {
    const p = await imagenAParagraph(node);
    if (p) paragraphs.push(p);
    return;
  }
  if (tag === 'br') return;

  if (tag === 'p' || tag === 'div') {
    // Procesa los hijos en orden, agrupando texto/inline consecutivo en un
    // mismo párrafo y sacando aparte cualquier lista o imagen que aparezca
    // en el medio (esté anidada donde esté).
    let buffer = [];
    const flush = () => {
      if (buffer.length) {
        paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: buffer }));
        buffer = [];
      }
    };
    for (const child of Array.from(node.childNodes)) {
      const childTag = child.nodeType === 1 ? child.tagName.toUpperCase() : null;
      if (childTag === 'UL' || childTag === 'OL' || childTag === 'IMG') {
        flush();
        await walkNode(child, paragraphs);
      } else if (childTag === 'P' || childTag === 'DIV') {
        flush();
        await walkNode(child, paragraphs);
      } else {
        buffer = buffer.concat(parseInlineNode(child));
      }
    }
    flush();
    return;
  }

  // cualquier otro tag inline suelto a nivel de bloque (span, etc.)
  const runs = parseInlineNode(node);
  if (runs.length) paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: runs }));
}

// Convierte el HTML simple que genera RichTextEditor (p, b/strong, i/em, u,
// font[size], ul/ol/li anidables a cualquier profundidad, img, br) en un
// array de Paragraph de docx.
export async function htmlToDocxParagraphs(html, opts = {}) {
  if (!html || !html.replace(/<[^>]+>/g, '').trim()) {
    return [new Paragraph({ children: [new TextRun(opts.emptyText || '(sin contenido cargado)')] })];
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  const paragraphs = [];

  for (const node of Array.from(container.childNodes)) {
    await walkNode(node, paragraphs);
  }

  return paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun('')] })];
}

// Divide un texto por comillas dobles rectas ("...") y pone en itálica lo
// que va entre ellas — para las citas legales textuales de las plantillas.
function textoConCitasEnItalica(texto) {
  const partes = texto.split('"');
  return partes
    .filter((s, i) => s !== '' || i % 2 === 1)
    .map((seg, i) => new TextRun({ text: i % 2 === 1 ? `"${seg}"` : seg, italics: i % 2 === 1 }));
}

// Convierte texto plano con líneas en blanco como separador de párrafo
// (para los bloques de plantilla, que son texto simple, no HTML). El texto
// entre comillas queda en itálica.
export function plainTextToDocxParagraphs(text, opts = {}) {
  if (!text || !text.trim()) {
    return [new Paragraph({ children: [new TextRun(opts.emptyText || '')] })];
  }
  return text
    .split(/\n\s*\n/)
    .filter((b) => b.trim())
    .map((block) => new Paragraph({ spacing: { after: 160 }, children: textoConCitasEnItalica(block.trim()) }));
}
