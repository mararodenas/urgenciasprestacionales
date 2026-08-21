// Textos fijos del informe (iguales en todos los casos, sin importar la
// plantilla elegida) — tomados del modelo real de IFSOL/IFDER.

export const REFERENCIA = (tipo, numeroEE) => `Referencia: ${tipo} ${numeroEE}`;

export const TRASLADO_FIJO =
  'Se confiere traslado a la entidad denunciada para que, dentro del plazo de CINCO (5) ' +
  'días hábiles contados a partir de la presente notificación, formule las consideraciones ' +
  'que estime pertinentes, las que deberán ser presentadas de manera clara, completa y ' +
  'debidamente documentada.';

export const CIERRE = {
  IFSOL:
    'Habiendo transcurrido el tiempo establecido en el marco regulatorio y habiéndose podido ' +
    'resolver en forma favorable la denuncia, se giran en devolución a esa área a efectos de ' +
    'la continuidad del trámite conforme se estime corresponder en cuanto a sanciones, multas ' +
    'e intimación al Agente del Seguro de salud con los fines de dar cumplimiento a la ' +
    'cobertura prestacional.',
  IFDER:
    'Habiendo transcurrido el tiempo establecido en el marco regulatorio y no habiéndose ' +
    'podido resolver en forma favorable la denuncia, se giran en devolución a esa área a ' +
    'efectos de la continuidad del trámite conforme se estime corresponder en cuanto a ' +
    'sanciones, multas e intimación al Agente del Seguro de salud con los fines de dar ' +
    'cumplimiento a la cobertura prestacional.',
};
