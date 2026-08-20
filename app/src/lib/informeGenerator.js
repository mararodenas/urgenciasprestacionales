import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';
import { ENCABEZADO, MARCO_LEGAL, CIERRE, TITULO_INFORME } from './informeTemplates';
import { formatFechaLarga, hoyISO } from './utils';

// expediente: fila de `expedientes` (con patologia/obra_social ya resueltos)
// drogas: array de filas de `drogas` asociadas al expediente
// fundamentaciones: array de textos de fundamentación (droga+patología) a incluir
export function generarInformeDocx({ expediente, patologiaNombre, drogas, fundamentaciones, tipo }) {
  const fechaHoy = formatFechaLarga(hoyISO());

  const parrafosFundamentacion = fundamentaciones.length
    ? fundamentaciones.map((f, i) =>
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: `${drogas[i]?.nombre ?? 'Droga'}: `, bold: true }),
            new TextRun({ text: f || '(sin fundamentación cargada para esta combinación)' }),
          ],
        })
      )
    : [new Paragraph({ text: '(sin drogas asociadas al expediente)' })];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: ENCABEZADO(expediente.numero_ee).split('\n').map(
              (line, i) =>
                new TextRun({ text: line, bold: i === 0, break: i > 0 ? 1 : 0 })
            ),
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
            children: [new TextRun(TITULO_INFORME[tipo])],
          }),

          new Paragraph({ spacing: { after: 200 }, children: [new TextRun(`Fecha: ${fechaHoy}`)] }),

          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({ text: 'Afiliado: ', bold: true }),
              new TextRun(expediente.nombre_paciente),
            ],
          }),

          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({ text: 'Diagnóstico: ', bold: true }),
              new TextRun(`${patologiaNombre ?? ''} — ${expediente.diagnostico_detalle}`),
            ],
          }),

          new Paragraph({ spacing: { after: 160 }, children: [new TextRun(MARCO_LEGAL)] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 120 },
            children: [new TextRun('Medicación / prestación solicitada')],
          }),
          ...parrafosFundamentacion,

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 120 },
            children: [new TextRun('Gestión realizada')],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun(expediente.pasos_resolucion || '(sin detalle cargado)')],
          }),

          new Paragraph({ spacing: { before: 200 }, children: [new TextRun(CIERRE[tipo])] }),
        ],
      },
    ],
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${tipo}_${expediente.numero_ee}.docx`);
  });
}
