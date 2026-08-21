export function diasHasta(fechaISO) {
  if (!fechaISO) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO + 'T00:00:00');
  const ms = fecha - hoy;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Estado de urgencia respecto de fecha_limite, solo si el expediente sigue abierto/pendiente.
export function urgenciaExpediente(exp) {
  if (exp.estado === 'Cerrado') return { nivel: 'cerrado', dias: null };
  if (!exp.fecha_limite) return { nivel: 'sin-dato', dias: null };
  const dias = diasHasta(exp.fecha_limite);
  if (dias < 0) return { nivel: 'vencido', dias };
  if (dias <= 3) return { nivel: 'proximo', dias };
  return { nivel: 'ok', dias };
}

export function formatFecha(fechaISO) {
  if (!fechaISO) return '—';
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

export function formatFechaLarga(fechaISO) {
  if (!fechaISO) return '';
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [y, m, d] = fechaISO.split('-').map(Number);
  return `${d} de ${meses[m - 1]} de ${y}`;
}

export function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
