import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ObrasSocialesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('obras_sociales')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) => o.nombre.toLowerCase().includes(q) || o.rnas?.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Registro</div>
          <h1>Obras Sociales / EMP</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/obras-sociales/nueva')}>
          + Nueva entidad
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nombre o RNAS..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="badge-count">{filtrados.length} entidades</span>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>No hay entidades cargadas</h3></div></div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>RNAS/RNEMP</th>
              <th>Auditoría médica</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/obras-sociales/${o.id}`)}>
                <td><strong>{o.nombre}</strong></td>
                <td>{o.tipo}</td>
                <td className="ee-num">{o.rnas || '—'}</td>
                <td>{o.am_nombre || '—'}</td>
                <td>{o.am_telefono || o.am_email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
