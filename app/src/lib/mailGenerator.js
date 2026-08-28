// Genera el texto plano (para copiar y pegar en el mail) de los dos tipos
// de mail que se mandan por expediente: a la Obra Social/EMP (siempre,
// primero) y al afiliado (no siempre — de seguimiento, cuando la OS no
// responde o hace falta chequear con el afiliado).
//
// expediente: fila de `expedientes`
// obraSocial: fila de `obras_sociales` (o null)
// patologiaNombre: string
// drogas: [{ nombre, dosis }]
// tipoTratamiento: string libre (ej. "adyuvante a resección quirúrgica efectuada"),
//   no se guarda en la base, se pide al momento de generar el mail.

function nombreOS(obraSocial) {
  if (!obraSocial) return '(Obra Social/EMP no seleccionada en el expediente)';
  const comercial = obraSocial.nombre_comercial ? ` (${obraSocial.nombre_comercial})` : '';
  return `${obraSocial.nombre}${comercial}`;
}

function codigoOS(obraSocial) {
  if (!obraSocial) return '';
  return obraSocial.tipo === 'Obra Social' ? obraSocial.rnas : obraSocial.rnemp;
}

function labelCodigoOS(obraSocial) {
  if (!obraSocial) return 'RNAS/RNEMP';
  return obraSocial.tipo === 'Obra Social' ? 'RNAS' : 'RNEMP';
}

function denunciante(expediente) {
  const nombre = expediente.denunciante_nombre?.trim() || expediente.nombre_paciente;
  const dni = expediente.denunciante_dni_cuit?.trim() || expediente.dni_cuit_paciente?.trim() || '';
  return { nombre, dni };
}

function listaMedicacion(drogas) {
  if (!drogas.length) return '(sin drogas cargadas en el expediente)';
  return drogas
    .map((d) => `- ${(d.nombre ?? '').toUpperCase()}${d.dosis ? ' ' + d.dosis : ''}`)
    .join('\n');
}

export function generarMailOS({ expediente, obraSocial, patologiaNombre, drogas, tipoTratamiento }) {
  const den = denunciante(expediente);
  const os = nombreOS(obraSocial);
  const cod = codigoOS(obraSocial);
  const labelCod = labelCodigoOS(obraSocial);
  const tratamiento = (tipoTratamiento || '').trim();

  return `Se envía por vía mail desde el área de Urgencias Prestacionales de la Gerencia de Control Prestacional (GCP) el trámite de resolución urgente dada las características de tratarse de un tratamiento oncológico${tratamiento ? ' ' + tratamiento : ''} de cumplimiento 100% por parte de la obra social.

La misma fue notificada vía formal x TAD a la obra social. Se reitera la misma y se adjunta la denuncia de la beneficiaria afectada con la correspondiente historia clínica e indicaciones médicas.

POR FAVOR ENVIAR respuesta al mail de la SSS: urgenciasprestacionales@sssalud.org.ar

REFERENCIA: ${os} ${expediente.numero_ee}.

En atención a la denuncia presentada por el/la Sr./Sra. ${den.nombre}${den.dni ? ` (CUIL ${den.dni})` : ''} contra la ${os}${cod ? ` (${labelCod} ${cod})` : ''}, con motivo de ${expediente.motivo_denuncia || '(sin motivo cargado)'}, se confiere traslado a la entidad denunciada para que, dentro del plazo de DOS (2) días hábiles contados NOTIFIQUE RESOLUCION DE LA MISMA.

Notifíquese a la ${os}${cod ? ` (${labelCod} ${cod})` : ''}, acompañando copia de la denuncia y de toda la documental respaldatoria correspondiente.

DIAGNÓSTICO: ${(patologiaNombre || '').toUpperCase()}

${tratamiento ? `TRATAMIENTO ${tratamiento.toUpperCase()}\n\n` : ''}Medicación Indicada:

${listaMedicacion(drogas)}

POR FAVOR ENVIAR respuesta al mail de la SSS: urgenciasprestacionales@sssalud.org.ar UNA VEZ RESUELTA LA DENUNCIA/RECLAMO.`;
}

export function generarMailAfiliado({ expediente, obraSocial, patologiaNombre, drogas }) {
  const den = denunciante(expediente);
  const os = nombreOS(obraSocial);
  const cod = codigoOS(obraSocial);
  const labelCod = labelCodigoOS(obraSocial);

  return `Se envía por mail desde el área de Urgencias Prestacionales de la GCP Gerencia de Control Prestacional por el trámite para resolución urgente presentado por el/la Sr./Sra. ${den.nombre}${den.dni ? ` (C.U.I.L. N.º ${den.dni})` : ''} contra ${os}${cod ? ` (${labelCod} Nº ${cod})` : ''}, con motivo de ${expediente.motivo_denuncia || '(sin motivo cargado)'}, con el Nº ${expediente.numero_ee}.

En atención a la denuncia INFORME RESOLUCION DE LA MISMA indicando si la Obra Social
a) Se contactó con el afiliado
b) Si puso a disposición la/s droga/s para el tratamiento solicitada/s
c) Fecha de contacto
d) Fecha de disponibilidad del tratamiento
e) Si lo tiene, nombre y apellido de la persona con la que habló

DIAGNÓSTICO: ${patologiaNombre || ''}

Medicación Indicada:

${listaMedicacion(drogas)}

POR FAVOR ENVIAR respuesta al mail de la SSS: urgenciasprestacionales@sssalud.org.ar`;
}
