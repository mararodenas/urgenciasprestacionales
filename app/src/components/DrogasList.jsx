import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function DrogasList() {
  const [drogas, setDrogas] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [combos, setCombos] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      supabase.from('drogas').select('*').order('nombre'),
      supabase.from('marcas_comerciales').select('id, droga_id, nombre_comercial'),
      supabase.from('droga_patologia').select('id, droga_id'),
    ]).then(([d, m, c]) => {
      setDrogas(d.data ?? []);
      setMarcas(m.data ?? []);
      setCombos(c.data ?? []);
      setLoading(false);
    });
  }, []);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drogas;
    return drogas.filter((d) => d.nombre.toLowerCase().includes(q));
  }, [drogas, query]);

  const marcasDe = (drogaId) => marcas.filter((m) => m.droga_id === drogaId);
  const cantidadPatologias = (drogaId) => combos.filter((c) => c.droga_id === drogaId).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1>Drogas y fundamentaciones</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/catalogo/nueva')}>
          + Nueva droga
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar droga..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="badge-count">{filtradas.length}</span>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Sin drogas cargadas</h3></div></div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Marcas comerciales</th>
              <th>Patologías asociadas</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((d) => (
              <tr key={d.id} onClick={() => navigate(`/catalogo/${d.id}`)}>
                <td><strong>{d.nombre}</strong></td>
                <td style={{ color: 'var(--ink-muted)' }}>
                  {marcasDe(d.id).length ? marcasDe(d.id).map((m) => m.nombre_comercial).join(', ') : '—'}
                </td>
                <td><span className="badge-count">{cantidadPatologias(d.id)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
