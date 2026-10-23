const ExcelJS = require('exceljs');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const tiposPoliza = [
  'Cumplimiento de Contrato',
  'Anticipo Financiero',
  'Fondo de Reparo',
  'Impugnación',
  'Mantenimiento de Oferta'
];

const columnas = [
  ['numero', 'Número de póliza'],
  ['tipo', 'Tipo'],
  ['obra', 'Obra'],
  ['aseguradora', 'Aseguradora'],
  ['tomador', 'Tomador'],
  ['monto', 'Monto'],
  ['moneda', 'Moneda'],
  ['fechaEmision', 'Fecha de emisión'],
  ['fechaVencimiento', 'Fecha de vencimiento'],
  ['observaciones', 'Observaciones']
];

function normalizar(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textoCelda(value) {
  if (value && typeof value === 'object') {
    if (value.text) return value.text.trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
  }
  return value === null || value === undefined ? '' : String(value).trim();
}

function parseFecha(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
  const text = textoCelda(value);
  let match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return '';
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function fechaValida(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseMonto(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let text = textoCelda(value).replace(/[^\d,.-]/g, '');
  if (text.includes(',') && text.includes('.')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }
  return Number(text);
}

function tipoCanonico(value) {
  return tiposPoliza.find((tipo) => normalizar(tipo) === normalizar(value)) || '';
}

function matchNombre(value, records, field) {
  const target = normalizar(value);
  return records.find((record) => normalizar(record[field]) === target) || null;
}

function valorPorFila(row, indexes, key) {
  const index = indexes[key];
  return index ? row.getCell(index).value : '';
}

async function crearPlantilla() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Polizas');
  sheet.addRow(columnas.map(([, label]) => label));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263238' } };
  sheet.columns = columnas.map(([, header]) => ({ header, width: Math.max(18, header.length + 4) }));
  sheet.dataValidations.add('G2:G1000', { type: 'list', formulae: ['"ARS,USD"'], allowBlank: false });
  sheet.dataValidations.add('B2:B1000', { type: 'list', formulae: [`"${tiposPoliza.join(',')}"`], allowBlank: false });
  workbook.creator = 'Polizas Vial';
  return workbook.xlsx.writeBuffer();
}

async function leerExcel(buffer, obras, aseguradoras) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new Error('La planilla no contiene filas para importar.');

  const aliases = {
    numero: ['numero', 'numero poliza', 'numero de poliza', 'nro poliza'],
    tipo: ['tipo', 'tipo poliza'],
    obra: ['obra', 'nombre obra'],
    aseguradora: ['aseguradora', 'compania aseguradora'],
    tomador: ['tomador', 'comitente'],
    monto: ['monto', 'suma asegurada', 'importe'],
    moneda: ['moneda', 'divisa'],
    fechaEmision: ['fecha emision', 'emision', 'fecha de emision'],
    fechaVencimiento: ['fecha vencimiento', 'vencimiento', 'fecha de vencimiento'],
    observaciones: ['observaciones', 'notas']
  };
  const headers = new Map();
  sheet.getRow(1).eachCell((cell, index) => headers.set(normalizar(textoCelda(cell.value)), index));
  const indexes = {};
  for (const [key, candidates] of Object.entries(aliases)) {
    const normalizedCandidates = candidates.map(normalizar);
    const found = [...headers.entries()].find(([header]) => normalizedCandidates.includes(header));
    if (found) indexes[key] = found[1];
  }
  const missingHeaders = ['numero', 'tipo', 'obra', 'aseguradora', 'monto', 'moneda', 'fechaEmision']
    .filter((key) => !indexes[key]);
  if (missingHeaders.length) {
    throw new Error(`Faltan columnas obligatorias: ${missingHeaders.map((key) => columnas.find(([name]) => name === key)[1]).join(', ')}.`);
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || row.values.slice(1).every((value) => !textoCelda(value))) return;
    const raw = Object.fromEntries(columnas.map(([key]) => [key, textoCelda(valorPorFila(row, indexes, key))]));
    raw.fechaEmision = parseFecha(valorPorFila(row, indexes, 'fechaEmision'));
    raw.fechaVencimiento = parseFecha(valorPorFila(row, indexes, 'fechaVencimiento'));
    raw.monto = parseMonto(valorPorFila(row, indexes, 'monto'));
    raw.tipo = tipoCanonico(raw.tipo);
    raw.moneda = raw.moneda.toUpperCase();
    const obra = matchNombre(raw.obra, obras, 'nombre');
    const aseguradora = matchNombre(raw.aseguradora, aseguradoras, 'razonSocial');
    const errores = [];

    if (!raw.numero) errores.push('Falta el número de póliza.');
    if (!raw.tipo) errores.push('El tipo de póliza no es válido.');
    if (!obra) errores.push('La obra no coincide con una obra registrada.');
    if (!aseguradora) errores.push('La aseguradora no coincide con una registrada.');
    if (!Number.isFinite(raw.monto) || raw.monto <= 0) errores.push('El monto debe ser un número mayor que cero.');
    if (!['ARS', 'USD'].includes(raw.moneda)) errores.push('La moneda debe ser ARS o USD.');
    if (!fechaValida(raw.fechaEmision)) errores.push('La fecha de emisión no es válida.');
    if (raw.fechaVencimiento && !fechaValida(raw.fechaVencimiento)) errores.push('La fecha de vencimiento no es válida.');
    if (raw.fechaVencimiento && fechaValida(raw.fechaVencimiento) && fechaValida(raw.fechaEmision) && raw.fechaVencimiento < raw.fechaEmision) {
      errores.push('El vencimiento no puede ser anterior a la emisión.');
    }

    rows.push({
      fila: rowNumber,
      valores: {
        ...raw,
        obraId: obra ? obra.id : null,
        aseguradoraId: aseguradora ? aseguradora.id : null
      },
      errores
    });
  });

  const seen = new Set();
  for (const row of rows) {
    const key = normalizar(row.valores.numero);
    if (key && seen.has(key)) row.errores.push('El número de póliza está repetido en la planilla.');
    if (key) seen.add(key);
  }
  return rows;
}

async function crearPlanillaErrores(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Corregir errores');
  sheet.addRow([...columnas.map(([, label]) => label), 'Errores de validación']);
  for (const row of rows) {
    sheet.addRow([
      ...columnas.map(([key]) => row.valores[key]),
      row.errores.join(' ')
    ]);
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263238' } };
  sheet.columns = [...columnas.map(([, header]) => ({ header, width: Math.max(18, header.length + 4) })), { header: 'Errores de validación', width: 54 }];
  return workbook.xlsx.writeBuffer();
}

function extraerPorEtiquetas(text, labels) {
  for (const label of labels) {
    const normalizedLabel = normalizar(label);
    for (const line of text.split(/\r?\n/)) {
      const normalizedLine = normalizar(line);
      if (normalizedLine !== normalizedLabel && !normalizedLine.startsWith(`${normalizedLabel} `)) continue;
      const separator = line.search(/[:#]/);
      const value = separator >= 0 ? line.slice(separator + 1) : line.slice(label.length);
      if (value.trim()) return value.replace(/^[\s:;.-]+|[\s;]+$/g, '').trim().slice(0, 100);
    }
  }
  return '';
}

function reglasAseguradora(aseguradora) {
  try {
    const rules = JSON.parse(aseguradora && aseguradora.reglasExtraccion || '{}');
    return Object.fromEntries(Object.entries(rules).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter((label) => typeof label === 'string' && label.trim()).slice(0, 20) : []
    ]));
  } catch {
    return {};
  }
}

function detectar(text, aseguradoras, obras) {
  const normalizedText = normalizar(text);
  const aseguradora = aseguradoras.find((item) => {
    const aliases = reglasAseguradora(item).aliases || [];
    return [item.razonSocial, ...aliases].some((alias) => {
      const normalizedAlias = normalizar(alias);
      return normalizedAlias.length >= 3 && normalizedText.includes(normalizedAlias);
    });
  }) || null;
  const rules = reglasAseguradora(aseguradora);
  const numero = extraerPorEtiquetas(text, [...(rules.numero || []), 'numero de poliza', 'nro de poliza', 'poliza numero']);
  const tomador = extraerPorEtiquetas(text, [...(rules.tomador || []), 'tomador', 'asegurado']);
  let obra = obras.find((item) => normalizedText.includes(normalizar(item.nombre))) || null;
  if (!obra) {
    const matches = obras.filter((item) => item.comitente && normalizedText.includes(normalizar(item.comitente)));
    if (matches.length === 1) obra = matches[0];
  }
  const montoRaw = extraerPorEtiquetas(text, [...(rules.monto || []), 'suma asegurada', 'monto asegurado', 'capital asegurado']);
  const emisionRaw = extraerPorEtiquetas(text, [...(rules.fechaEmision || []), 'fecha de emision', 'fecha emision']);
  const vencimientoRaw = extraerPorEtiquetas(text, [...(rules.fechaVencimiento || []), 'fecha de vencimiento', 'vigencia hasta']);
  const typeText = normalizar(text);
  const tipoRaw = extraerPorEtiquetas(text, rules.tipo || []);
  const tipo = tipoCanonico(tipoRaw) || tiposPoliza.find((item) => typeText.includes(normalizar(item))) || '';
  const dateToISO = (value) => {
    const dateMatch = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})|(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) return '';
    return dateMatch[4]
      ? `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`
      : `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  };
  const monto = parseMonto(montoRaw);
  const currency = text.match(/\b(ARS|USD)\b/i);
  return {
    numero,
    tipo,
    tomador,
    obra: obra ? obra.nombre : '',
    obraId: obra ? obra.id : null,
    aseguradora: aseguradora ? aseguradora.razonSocial : '',
    aseguradoraId: aseguradora ? aseguradora.id : null,
    monto: Number.isFinite(monto) ? monto : '',
    moneda: currency ? currency[1].toUpperCase() : '',
    fechaEmision: dateToISO(emisionRaw),
    fechaVencimiento: dateToISO(vencimientoRaw),
    observaciones: ''
  };
}

async function extraerPDF(buffer, aseguradoras, obras) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  let text = '';
  const pagesToRead = Math.min(document.numPages, 12);
  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let currentLine = '';
    let currentY = null;
    const lines = [];
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (currentY !== null && Math.abs(y - currentY) > 2) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += `${item.str} `;
      currentY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    text += `${lines.join('\n')}\n`;
  }

  let ocrUsed = false;
  let ocrError = '';
  if (text.replace(/\s/g, '').length < 80) {
    const { createWorker } = require('tesseract.js');
    let worker;
    try {
      const cachePath = path.join(os.homedir(), '.cache', 'polizas-vial', 'tesseract');
      await fs.mkdir(cachePath, { recursive: true });
      worker = await createWorker('spa', undefined, { cachePath });
      text = '';
      for (let pageNumber = 1; pageNumber <= Math.min(pagesToRead, 5); pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        const result = await worker.recognize(canvas.toBuffer('image/png'));
        text += `${result.data.text}\n`;
      }
      ocrUsed = true;
    } catch {
      ocrError = 'No se pudo completar el OCR; cargá manualmente los datos detectados.';
    } finally {
      if (worker) await worker.terminate();
    }
  }
  await document.cleanup();
  return { text: text.slice(0, 100000), ocrUsed, ocrError, datos: detectar(text, aseguradoras, obras) };
}

module.exports = {
  tiposPoliza,
  columnas,
  normalizar,
  crearPlantilla,
  leerExcel,
  crearPlanillaErrores,
  extraerPDF,
  detectar
};