import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function PlantillasList() {
  const [plantillas, setPlantillas] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('plantillas_informe').select('*').order('nombre').then(({ data }) => {
      setPlantillas(data ?? []);
      setLoading(false);
    });
  }, []);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plantillas;
    return plantillas.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [plantillas, query]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1>Plantillas de informe</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/plantillas/nueva')}>
          + Nueva plantilla
        </button>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        Cada plantilla trae el texto normativo fijo del informe (marco legal + cierre técnico) para un tipo de caso —
        por ejemplo "Oncología". Al generar el IFSOL/IFDER elegís cuál usar.
      </p>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar plantilla..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="badge-count">{filtradas.length}</span>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Sin plantillas cargadas</h3></div></div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Texto de apertura</th>
              <th>Texto de cierre técnico</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => (
              <tr key={p.id} onClick={() => navigate(`/plantillas/${p.id}`)}>
                <td><strong>{p.nombre}</strong></td>
                <td style={{ color: 'var(--ink-muted)' }}>
                  {p.texto_apertura ? p.texto_apertura.slice(0, 70) + '…' : '—'}
                </td>
                <td style={{ color: 'var(--ink-muted)' }}>
                  {p.texto_cierre_tecnico ? p.texto_cierre_tecnico.slice(0, 70) + '…' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
