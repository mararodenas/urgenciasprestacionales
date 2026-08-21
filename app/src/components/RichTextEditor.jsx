import { useRef, useEffect } from 'react';

// value/onChange manejan HTML simple (b, i, u, ul/ol/li anidables, p, br).
export default function RichTextEditor({ value, onChange, onBlurSave, placeholder, minHeight = 100 }) {
  const ref = useRef(null);
  const isFocused = useRef(false);

  useEffect(() => {
    if (ref.current && !isFocused.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  function exec(cmd, val = null) {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
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
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Viñetas">•</button>
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
        onBlur={() => {
          isFocused.current = false;
          onChange(ref.current.innerHTML);
          if (onBlurSave) onBlurSave(ref.current.innerHTML);
        }}
      />
    </div>
  );
}
