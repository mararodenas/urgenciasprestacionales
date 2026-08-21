import { Paragraph, TextRun } from 'docx';

function parseInlineNode(node, marks = {}) {
  if (node.nodeType === 3) {
    const text = node.textContent;
    if (!text) return [];
    return [new TextRun({ text, bold: !!marks.bold, italics: !!marks.italic, underline: marks.underline ? {} : undefined })];
  }
  if (node.nodeType !== 1) return [];
  const tag = node.tagName.toLowerCase();
  if (tag === 'ul' || tag === 'ol') return []; // las listas anidadas dentro de un <li> se procesan aparte
  const newMarks = { ...marks };
  if (tag === 'b' || tag === 'strong') newMarks.bold = true;
  if (tag === 'i' || tag === 'em') newMarks.italic = true;
  if (tag === 'u') newMarks.underline = true;
  if (tag === 'br') return [new TextRun({ text: '', break: 1 })];
  let runs = [];
  node.childNodes.forEach((child) => { runs = runs.concat(parseInlineNode(child, newMarks)); });
  return runs;
}

// Recorre un <li> devolviendo solo el texto directo (sin bajar a listas anidadas).
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
  Array.from(listNode.children).forEach((li) => {
    if (li.tagName !== 'LI') return;
    counter += 1;
    const runs = inlineOfLi(li);
    if (tag === 'ol') {
      paragraphs.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 + level * 360 },
        children: [new TextRun(`${counter}. `), ...(runs.length ? runs : [new TextRun('')])],
      }));
    } else {
      paragraphs.push(new Paragraph({ bullet: { level }, spacing: { after: 60 }, children: runs.length ? runs : [new TextRun('')] }));
    }
    // listas anidadas dentro de este <li>
    Array.from(li.children).forEach((child) => {
      if (child.tagName === 'UL' || child.tagName === 'OL') walkList(child, level + 1, paragraphs);
    });
  });
}

// Convierte el HTML simple que genera RichTextEditor (p, b/strong, i/em, u,
// ul/ol/li anidables, br) en un array de Paragraph de docx.
export function htmlToDocxParagraphs(html, opts = {}) {
  if (!html || !html.replace(/<[^>]+>/g, '').trim()) {
    return [new Paragraph({ children: [new TextRun(opts.emptyText || '(sin contenido cargado)')] })];
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  const paragraphs = [];

  function walkBlock(node) {
    const tag = node.tagName?.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      walkList(node, 0, paragraphs);
      return;
    }
    if (tag === 'p' || tag === 'div') {
      const runs = parseInlineNode(node);
      paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: runs.length ? runs : [new TextRun('')] }));
      return;
    }
    const runs = parseInlineNode(node);
    if (runs.length) paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: runs }));
  }

  container.childNodes.forEach((node) => {
    if (node.nodeType === 1) {
      walkBlock(node);
    } else if (node.nodeType === 3 && node.textContent.trim()) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(node.textContent)] }));
    }
  });

  return paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun('')] })];
}

// Convierte texto plano con líneas en blanco como separador de párrafo
// (para los bloques de plantilla, que son texto simple, no HTML).
export function plainTextToDocxParagraphs(text, opts = {}) {
  if (!text || !text.trim()) {
    return [new Paragraph({ children: [new TextRun(opts.emptyText || '')] })];
  }
  return text
    .split(/\n\s*\n/)
    .filter((b) => b.trim())
    .map((block) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun(block.trim())] }));
}
