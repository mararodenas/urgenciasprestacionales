import { useRef, useEffect, useState } from 'react';

const ESTILOS_VINETA = [
  { valor: 'disc', icono: '•', nombre: 'Disco' },
  { valor: '"– "', icono: '–', nombre: 'Guion' },
  { valor: 'square', icono: '▪', nombre: 'Cuadrado' },
  { valor: 'circle', icono: '○', nombre: 'Círculo' },
];

// Cuando se indenta/desindenta dentro de una lista, el navegador a veces
// corta la lista en dos <ol>/<ul> separadas en vez de continuarla (por eso
// la numeración se reinicia). Esto las vuelve a fusionar si quedan
// adyacentes y son del mismo tipo.
function fusionarListasAdyacentes(root) {
  function fusionarHijos(parent) {
    const children = Array.from(parent.children);
    for (let i = children.length - 1; i > 0; i--) {
      const cur = children[i];
      const prev = children[i - 1];
      if (cur.tagName === prev.tagName && (cur.tagName === 'OL' || cur.tagName === 'UL')) {
        while (cur.firstChild) prev.appendChild(cur.firstChild);
        cur.remove();
      }
    }
  }
  function recorrer(node) {
    fusionarHijos(node);
    Array.from(node.children).forEach((child) => {
      if (['LI', 'OL', 'UL', 'DIV', 'P'].includes(child.tagName)) recorrer(child);
    });
  }
  recorrer(root);
}

// value/onChange manejan HTML simple (b, i, u, ul/ol/li anidables, p, br).
export default function RichTextEditor({ value, onChange, onBlurSave, placeholder, minHeight = 100 }) {
  const ref = useRef(null);
  const isFocused = useRef(false);
  const [menuVinetaAbierto, setMenuVinetaAbierto] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
      fusionarListasAdyacentes(ref.current);
    }
  }, [value]);

  function exec(cmd, val = null) {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    if (['indent', 'outdent', 'insertOrderedList', 'insertUnorderedList'].includes(cmd)) {
      fusionarListasAdyacentes(ref.current);
    }
    onChange(ref.current.innerHTML);
  }

  function listaActual() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== ref.current) {
      if (node.nodeName === 'UL') return node;
      node = node.parentNode;
    }
    return null;
  }

  function aplicarEstiloVineta(valor) {
    ref.current?.focus();
    let ul = listaActual();
    if (!ul) {
      document.execCommand('insertUnorderedList', false, null);
      fusionarListasAdyacentes(ref.current);
      ul = listaActual();
    }
    if (ul) ul.style.listStyleType = valor;
    setMenuVinetaAbierto(false);
    onChange(ref.current.innerHTML);
  }

  function estaEnLista() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== ref.current) {
      if (node.nodeName === 'LI') return true;
      node = node.parentNode;
    }
    return false;
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (estaEnLista()) {
        exec(e.shiftKey ? 'outdent' : 'indent');
      } else if (!e.shiftKey) {
        document.execCommand('insertText', false, '\u00A0\u00A0\u00A0\u00A0');
      }
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} title="Negrita"><strong>N</strong></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} title="Itálica"><em>I</em></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} title="Subrayado"><u>S</u></button>
        <span className="rte-sep" />
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMenuVinetaAbierto((v) => !v)}
            title="Viñetas (elegir estilo)"
          >
            • ▾
          </button>
          {menuVinetaAbierto && (
            <div className="rte-dropdown">
              {ESTILOS_VINETA.map((op) => (
                <div
                  key={op.valor}
                  className="rte-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicarEstiloVineta(op.valor)}
                >
                  <span className="rte-dropdown-icon">{op.icono}</span> {op.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Lista numerada">1.</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('indent')} title="Aumentar sangría (o Tab dentro de una lista)">→|</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('outdent')} title="Disminuir sangría (o Shift+Tab)">|←</button>
        <span className="rte-sep" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertParagraph')} title="Nuevo párrafo">¶</button>
      </div>
      <div
        ref={ref}
        className="rte-content"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => { isFocused.current = true; }}
        onInput={() => onChange(ref.current.innerHTML)}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          if (e.relatedTarget && e.currentTarget.parentElement.contains(e.relatedTarget)) return;
          isFocused.current = false;
          fusionarListasAdyacentes(ref.current);
          onChange(ref.current.innerHTML);
          if (onBlurSave) onBlurSave(ref.current.innerHTML);
        }}
      />
    </div>
  );
}
