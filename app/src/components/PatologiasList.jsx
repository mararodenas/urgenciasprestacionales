import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function PatologiasList() {
  const [patologias, setPatologias] = useState([]);
  const [combos, setCombos] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      supabase.from('patologias').select('*').order('nombre'),
      supabase.from('droga_patologia').select('id, patologia_id'),
    ]).then(([p, c]) => {
      setPatologias(p.data ?? []);
      setCombos(c.data ?? []);
      setLoading(false);
    });
  }, []);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patologias;
    return patologias.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [patologias, query]);

  const cantidadDrogas = (patId) => combos.filter((c) => c.patologia_id === patId).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1>Patologías</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/patologias/nueva')}>
          + Nueva patología
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar patología..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="badge-count">{filtradas.length}</span>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Sin patologías cargadas</h3></div></div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Drogas asociadas</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((pat) => (
              <tr key={pat.id} onClick={() => navigate(`/patologias/${pat.id}`)}>
                <td><strong>{pat.nombre}</strong></td>
                <td><span className="badge-count">{cantidadDrogas(pat.id)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
