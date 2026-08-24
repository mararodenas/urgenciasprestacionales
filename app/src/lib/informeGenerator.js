import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { REFERENCIA, TRASLADO_FIJO, CIERRE } from './informeTemplates';
import { htmlToDocxParagraphs, plainTextToDocxParagraphs } from './htmlToDocx';

// expediente: fila de `expedientes`
// obraSocial: fila de `obras_sociales` (con rnas/rnemp/nombre_comercial)
// patologiaNombre: string
// drogas: [{ nombre }] — una por medicamento seleccionado
// marcas: [{ nombre_comercial, numero_anmat } | null] — la marca elegida por droga, en el mismo orden
// fundamentacionesHtml: [string] — HTML de "Indicaciones médicas" por droga, mismo orden
// plantilla: { texto_apertura, texto_cierre_tecnico } | null
// gestionHtml: string — HTML del campo "Gestión" (texto libre)
export async function generarInformeDocx({
  expediente, obraSocial, patologiaNombre, drogas, marcas, fundamentacionesHtml, plantilla, gestionHtml, tipo,
}) {
  const denuncianteNombre = expediente.denunciante_nombre?.trim() || expediente.nombre_paciente;
  const denuncianteDni = expediente.denunciante_dni_cuit?.trim() || expediente.dni_cuit_paciente?.trim() || '';

  const codigoOS = obraSocial?.tipo === 'Obra Social' ? obraSocial?.rnas : obraSocial?.rnemp;
  const nombreComercialOS = obraSocial?.nombre_comercial ? ` (${obraSocial.nombre_comercial})` : '';

  const parrafoApertura = new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun('Tratan los actuados sobre la presentación en atención a la denuncia presentada por el/la Sr./Sra. '),
      new TextRun({ text: `${denuncianteDni ? denuncianteDni + ' ' : ''}${denuncianteNombre}`, bold: true }),
      new TextRun(' - '),
      new TextRun({ text: expediente.nombre_paciente, bold: true }),
      new TextRun(' contra el Agente de Seguro Nº '),
      new TextRun({ text: `${codigoOS ?? ''} ${obraSocial?.nombre ?? ''}${nombreComercialOS}`, bold: true }),
      new TextRun(', con motivo de '),
      new TextRun({ text: (expediente.motivo_denuncia || '(sin motivo cargado)').toUpperCase() + '.', bold: true }),
    ],
  });

  const droguerBlocks = [];
  for (let i = 0; i < drogas.length; i++) {
    const droga = drogas[i];
    const marca = marcas[i];
    droguerBlocks.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Droga / Medicación solicitada: ', bold: true }),
          new TextRun((droga?.nombre ?? '').toUpperCase()),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Nombre comercial: ', bold: true }),
          new TextRun(marca?.nombre_comercial ?? '(sin marca especificada)'),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun(
            marca?.numero_anmat
              ? `Especialidad médica aprobada por ANMAT con Nº de certificado ${marca.numero_anmat}`
              : 'Especialidad médica — Nº de certificado ANMAT no especificado'
          ),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: `Indicaciones Médicas y Mecanismo de Acción en: ${patologiaNombre ?? ''}`, bold: true })],
      }),
      ...(await htmlToDocxParagraphs(fundamentacionesHtml[i], { emptyText: '(sin fundamentación cargada para esta combinación)' }))
    );
  }

  const gestionParagraphs = await htmlToDocxParagraphs(gestionHtml, { emptyText: '(sin gestión cargada)' });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 }, // 20 half-points = 10pt
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: REFERENCIA(tipo, expediente.numero_ee), bold: true })] }),

          parrafoApertura,

          ...(plantilla?.texto_apertura ? plainTextToDocxParagraphs(plantilla.texto_apertura) : []),

          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({ text: 'DIAGNOSTICO: ', bold: true }),
              new TextRun(expediente.diagnostico_detalle || ''),
            ],
          }),

          ...droguerBlocks,

          ...(plantilla?.texto_cierre_tecnico ? plainTextToDocxParagraphs(plantilla.texto_cierre_tecnico) : []),

          new Paragraph({ spacing: { after: 240 }, children: [new TextRun(TRASLADO_FIJO)] }),

          ...gestionParagraphs,

          new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: CIERRE[tipo], bold: true })] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${tipo}_${expediente.numero_ee}.docx`);
}
