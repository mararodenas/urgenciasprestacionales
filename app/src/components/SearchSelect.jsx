import { useState, useMemo, useRef, useEffect } from 'react';

// options: [{ id, label }]. onCreate(label) -> Promise<{id,label}> opcional, para "crear nuevo".
export default function SearchSelect({ options, value, onChange, placeholder, onCreate, createLabel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          border: '1px solid var(--line)',
          borderRadius: 6,
          padding: '9px 11px',
          fontSize: 13.5,
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          color: selected ? 'var(--ink)' : 'var(--ink-muted)',
        }}
      >
        <span>{selected ? selected.label : placeholder || 'Seleccionar...'}</span>
        <span style={{ color: 'var(--ink-muted)' }}>▾</span>
      </div>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30,
            maxHeight: 260, display: 'flex', flexDirection: 'column',
          }}
        >
          <input
            autoFocus
            className="search-input"
            style={{ width: 'auto', margin: 8, borderRadius: 5 }}
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div style={{ overflowY: 'auto' }}>
            {filtered.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  background: o.id === value ? 'var(--teal-tint)' : 'transparent',
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && !query && (
              <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink-muted)' }}>
                Sin resultados
              </div>
            )}
            {onCreate && query.trim() && !exactMatch && (
              <div
                onClick={async () => {
                  const created = await onCreate(query.trim());
                  if (created) {
                    onChange(created.id);
                    setOpen(false);
                    setQuery('');
                  }
                }}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  color: 'var(--teal)',
                  fontWeight: 600,
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                + {createLabel || 'Crear'} "{query.trim()}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
