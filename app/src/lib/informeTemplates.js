// Textos fijos de la plantilla IFSOL / IFDER.
// Son un punto de partida editable: ajustá el marco legal y el encabezado
// a la redacción oficial que use GCP antes de emitir informes reales.

export const ENCABEZADO = (numeroEE) =>
  `SUPERINTENDENCIA DE SERVICIOS DE SALUD\nGerencia de Control Prestacional\nExpediente N° ${numeroEE}`;

export const MARCO_LEGAL =
  'En el marco de lo dispuesto por la Ley N.° 23.661, la Ley N.° 24.901 y la ' +
  'normativa complementaria vigente en materia de cobertura de urgencias ' +
  'prestacionales, esta Gerencia de Control Prestacional procedió a la ' +
  'evaluación del presente reclamo.';

export const CIERRE = {
  IFSOL:
    'En virtud de lo expuesto, y de las gestiones realizadas por esta Gerencia, ' +
    'se deja constancia de que la presente denuncia ha podido resolverse en ' +
    'forma favorable, habiéndose podido resolver en forma favorable la denuncia, ' +
    'garantizándose al afiliado el acceso a la prestación requerida.',
  IFDER:
    'En virtud de lo expuesto, y no habiéndose podido resolver en forma ' +
    'favorable la denuncia por la vía de gestión informal, se dispone la ' +
    'derivación de las presentes actuaciones a los fines que correspondan.',
};

export const TITULO_INFORME = {
  IFSOL: 'INFORME DE RESOLUCIÓN (IFSOL)',
  IFDER: 'INFORME DE DERIVACIÓN (IFDER)',
};
