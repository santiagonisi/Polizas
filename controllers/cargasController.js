const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { Op } = require('sequelize');
const { CargaPendiente, Poliza, Obra, Aseguradora, sequelize } = require('../models');
const cargaService = require('../services/cargaService');

const pendingDir = path.join(__dirname, '..', 'uploads', 'pendientes');

async function guardarArchivo(file) {
  await fs.mkdir(pendingDir, { recursive: true });
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomUUID()}${extension}`;
  await fs.writeFile(path.join(pendingDir, filename), file.buffer, { flag: 'wx' });
  return filename;
}

function nombreSeguro(file) {
  return path.basename(file.originalname).replace(/[\r\n"<>]/g, '').slice(0, 240) || 'archivo';
}

function parseJSON(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function estadoDeDatos(data, errors = []) {
  if (errors.length) return 'Requiere revisión';
  const required = ['numero', 'tipo', 'obraId', 'aseguradoraId', 'monto', 'moneda', 'fechaEmision'];
  return required.every((key) => data[key] !== '' && data[key] !== null && data[key] !== undefined)
    ? 'Datos extraídos'
    : 'Requiere revisión';
}

function fechaISOValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function marcarDuplicados(rows) {
  const numbers = rows.map((row) => row.valores.numero).filter(Boolean);
  if (!numbers.length) return;
  const existing = await Poliza.findAll({ attributes: ['numero'] });
  const existingNumbers = new Set(existing.map((item) => cargaService.normalizar(item.numero)));
  const seen = new Set();
  for (const row of rows) {
    const key = cargaService.normalizar(row.valores.numero);
    if (!key) continue;
    if (existingNumbers.has(key) || seen.has(key)) row.errores.push('Ya existe una póliza con este número.');
    seen.add(key);
  }
}

exports.index = async (req, res) => {
  const cargas = await CargaPendiente.findAll({ order: [['createdAt', 'DESC']], limit: 250 });
  res.render('cargas/index', {
    title: 'Carga asistida',
    cargas,
    parseJSON,
    conteos: {
      pendientes: cargas.filter((item) => item.estado === 'Requiere revisión' || item.estado === 'Datos extraídos').length,
      duplicadas: cargas.filter((item) => item.estado === 'Duplicada').length,
      confirmadas: cargas.filter((item) => item.estado === 'Confirmada').length
    }
  });
};

exports.plantilla = async (req, res, next) => {
  try {
    const buffer = await cargaService.crearPlantilla();
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('plantilla-polizas.xlsx').send(Buffer.from(buffer));
  } catch (error) { next(error); }
};

exports.importarExcel = async (req, res, next) => {
  let filename = null;
  try {
    const [obras, aseguradoras] = await Promise.all([
      Obra.findAll({ attributes: ['id', 'nombre', 'comitente'] }),
      Aseguradora.findAll({ attributes: ['id', 'razonSocial'] })
    ]);
    const rows = await cargaService.leerExcel(req.file.buffer, obras, aseguradoras);
    await marcarDuplicados(rows);
    if (!rows.length) throw new Error('No se encontraron filas con datos en la planilla.');

    filename = await guardarArchivo(req.file);
    await CargaPendiente.bulkCreate(rows.map((row) => ({
      tipoCarga: 'Excel',
      nombreOriginal: `${nombreSeguro(req.file)} · fila ${row.fila}`,
      archivo: filename,
      estado: estadoDeDatos(row.valores, row.errores),
      datos: JSON.stringify(row.valores),
      errores: JSON.stringify(row.errores),
      usuarioId: req.session.usuario.id
    })));
    req.session.flash = { type: 'success', msg: `${rows.length} fila(s) agregadas a la bandeja para revisión.` };
    res.redirect('/cargas');
  } catch (error) {
    if (filename) await fs.unlink(path.join(pendingDir, filename)).catch(() => {});
    next(error);
  }
};

exports.importarPDF = async (req, res, next) => {
  const createdFiles = [];
  try {
    const files = req.files || (req.file ? [req.file] : []);
    const [obras, aseguradoras] = await Promise.all([
      Obra.findAll({ attributes: ['id', 'nombre', 'comitente'] }),
      Aseguradora.findAll({ attributes: ['id', 'razonSocial', 'reglasExtraccion'] })
    ]);
    let ocrUsed = false;
    const existing = await Poliza.findAll({ attributes: ['numero'] });
    const existingNumbers = new Set(existing.map((item) => cargaService.normalizar(item.numero)));
    const seenNumbers = new Set();
    const entries = [];
    for (const file of files) {
      const extracted = await cargaService.extraerPDF(file.buffer, aseguradoras, obras);
      const errors = [];
      if (extracted.ocrError) errors.push(extracted.ocrError);
      if (!extracted.datos.numero) errors.push('No se detectó el número de póliza.');
      if (!extracted.datos.aseguradoraId) errors.push('No se identificó la aseguradora; verificá sus etiquetas de extracción.');
      if (!extracted.datos.obraId) errors.push('No se identificó la obra; revisá la selección manualmente.');
      if (!extracted.datos.tipo) errors.push('No se detectó el tipo de póliza.');
      if (!extracted.datos.monto) errors.push('No se detectó el monto asegurado.');
      if (!extracted.datos.moneda) errors.push('No se detectó la moneda.');
      if (!extracted.datos.fechaEmision) errors.push('No se detectó la fecha de emisión.');
      if (!extracted.datos.fechaVencimiento) errors.push('No se detectó el vencimiento.');
      const normalizedNumber = cargaService.normalizar(extracted.datos.numero);
      const duplicate = normalizedNumber && (existingNumbers.has(normalizedNumber) || seenNumbers.has(normalizedNumber));
      if (normalizedNumber) seenNumbers.add(normalizedNumber);
      if (duplicate) errors.push('Ya existe una póliza con este número.');
      entries.push({ file, extracted, errors, duplicate });
      ocrUsed ||= extracted.ocrUsed;
    }
    const pendingRows = [];
    for (const entry of entries) {
      const filename = await guardarArchivo(entry.file);
      createdFiles.push(filename);
      pendingRows.push({
        tipoCarga: 'PDF',
        nombreOriginal: nombreSeguro(entry.file),
        archivo: filename,
        estado: entry.duplicate ? 'Duplicada' : estadoDeDatos(entry.extracted.datos, entry.errors),
        datos: JSON.stringify(entry.extracted.datos),
        errores: JSON.stringify(entry.errors),
        textoExtraido: entry.extracted.text,
        usuarioId: req.session.usuario.id
      });
    }
    await CargaPendiente.bulkCreate(pendingRows);
    req.session.flash = {
      type: 'success',
      msg: ocrUsed
        ? `${files.length} PDF(s) procesados; se aplicó OCR a documentos escaneados. Revisá cuidadosamente las sugerencias.`
        : `${files.length} PDF(s) procesados. Revisá los campos sugeridos antes de confirmar.`
    };
    res.redirect('/cargas');
  } catch (error) {
    await Promise.all(createdFiles.map((filename) => fs.unlink(path.join(pendingDir, filename)).catch(() => {})));
    next(error);
  }
};

exports.ver = async (req, res) => {
  const carga = await CargaPendiente.findByPk(req.params.id);
  if (!carga) return res.redirect('/cargas');
  const [obras, aseguradoras] = await Promise.all([
    Obra.findAll({ order: [['nombre', 'ASC']] }),
    Aseguradora.findAll({ where: { estado: 'Activo' }, order: [['razonSocial', 'ASC']] })
  ]);
  res.render('cargas/revisar', {
    title: 'Revisar carga',
    carga,
    datos: parseJSON(carga.datos, {}),
    errores: parseJSON(carga.errores, []),
    obras,
    aseguradoras,
    tiposPoliza: cargaService.tiposPoliza
  });
};

exports.actualizar = async (req, res) => {
  const carga = await CargaPendiente.findByPk(req.params.id);
  if (!carga || ['Confirmada', 'Rechazada'].includes(carga.estado)) return res.redirect('/cargas');
  const data = req.body;
  const numero = String(data.numero || '').trim();
  const monto = Number(String(data.monto || '').replace(',', '.'));
  const emission = String(data.fechaEmision || '');
  const expiration = String(data.fechaVencimiento || '');
  const errors = [];
  if (!numero) errors.push('Ingresá el número de póliza.');
  if (!cargaService.tiposPoliza.includes(data.tipo)) errors.push('Seleccioná un tipo válido.');
  if (!await Obra.findByPk(data.obraId)) errors.push('Seleccioná una obra registrada.');
  if (!await Aseguradora.findByPk(data.aseguradoraId)) errors.push('Seleccioná una aseguradora registrada.');
  if (!Number.isFinite(monto) || monto <= 0) errors.push('El monto debe ser mayor que cero.');
  if (!['ARS', 'USD'].includes(data.moneda)) errors.push('La moneda debe ser ARS o USD.');
  if (!fechaISOValida(emission)) errors.push('Ingresá una fecha de emisión válida.');
  if (expiration && !fechaISOValida(expiration)) errors.push('Ingresá un vencimiento válido.');
  if (errors.length) {
    req.session.flash = { type: 'danger', msg: errors.join(' ') };
    return res.redirect(`/cargas/${carga.id}`);
  }
  const duplicate = await Poliza.findOne({ where: { numero } });
  if (duplicate) {
    await carga.update({ estado: 'Duplicada', errores: JSON.stringify(['Ya existe una póliza con este número.']) });
    req.session.flash = { type: 'danger', msg: 'Ya existe una póliza con ese número; no se puede confirmar.' };
    return res.redirect(`/cargas/${carga.id}`);
  }

  const datos = {
    numero,
    tipo: data.tipo,
    obraId: Number(data.obraId),
    aseguradoraId: Number(data.aseguradoraId),
    tomador: String(data.tomador || '').trim(),
    monto,
    moneda: data.moneda,
    fechaEmision: emission,
    fechaVencimiento: expiration || null,
    observaciones: String(data.observaciones || '').trim()
  };
  await carga.update({ datos: JSON.stringify(datos), errores: '[]', estado: 'Datos extraídos' });
  req.session.flash = { type: 'success', msg: 'Datos guardados para confirmación.' };
  res.redirect(`/cargas/${carga.id}`);
};

exports.confirmar = async (req, res) => {
  const carga = await CargaPendiente.findByPk(req.params.id);
  if (!carga || ['Confirmada', 'Rechazada'].includes(carga.estado)) return res.redirect('/cargas');
  const datos = parseJSON(carga.datos, {});
  const required = ['numero', 'tipo', 'obraId', 'aseguradoraId', 'fechaEmision'];
  const invalid = required.some((key) => datos[key] === '' || datos[key] === null || datos[key] === undefined) ||
    !cargaService.tiposPoliza.includes(datos.tipo) || !Number.isFinite(Number(datos.monto)) || Number(datos.monto) <= 0 ||
    !['ARS', 'USD'].includes(datos.moneda) || !fechaISOValida(datos.fechaEmision) ||
    (datos.fechaVencimiento && !fechaISOValida(datos.fechaVencimiento));
  if (invalid || !await Obra.findByPk(datos.obraId) || !await Aseguradora.findByPk(datos.aseguradoraId)) {
    req.session.flash = { type: 'danger', msg: 'Completá y guardá todos los campos obligatorios antes de confirmar.' };
    return res.redirect(`/cargas/${carga.id}`);
  }
  let copiedFile = null;
  try {
    let filepath = null;
    if (carga.tipoCarga === 'PDF' && carga.archivo) {
      const polizaDir = path.join(__dirname, '..', 'uploads', 'polizas');
      await fs.mkdir(polizaDir, { recursive: true });
      copiedFile = path.join(polizaDir, carga.archivo);
      await fs.copyFile(path.join(pendingDir, carga.archivo), copiedFile);
      filepath = `/uploads/polizas/${carga.archivo}`;
    }
    await sequelize.transaction(async (transaction) => {
      const existing = await Poliza.findAll({ attributes: ['numero'], transaction });
      if (existing.some((item) => cargaService.normalizar(item.numero) === cargaService.normalizar(datos.numero))) {
        throw new Error('Ya existe una póliza con este número.');
      }
      await Poliza.create({ ...datos, archivoPdf: filepath }, { transaction });
      await carga.update({ estado: 'Confirmada', errores: '[]' }, { transaction });
    });
    req.session.flash = { type: 'success', msg: 'Póliza confirmada y creada correctamente.' };
    res.redirect('/polizas');
  } catch (error) {
    if (copiedFile) await fs.unlink(copiedFile).catch(() => {});
    const duplicate = error.name === 'SequelizeUniqueConstraintError' || error.message.includes('Ya existe');
    await carga.update({ estado: duplicate ? 'Duplicada' : 'Requiere revisión', errores: JSON.stringify([error.message]) });
    req.session.flash = { type: 'danger', msg: error.message || 'No se pudo confirmar la póliza.' };
    res.redirect(`/cargas/${carga.id}`);
  }
};

exports.rechazar = async (req, res) => {
  const carga = await CargaPendiente.findByPk(req.params.id);
  if (carga && carga.estado !== 'Confirmada') await carga.update({ estado: 'Rechazada' });
  req.session.flash = { type: 'success', msg: 'Carga marcada como rechazada.' };
  res.redirect('/cargas');
};

exports.descargarErrores = async (req, res, next) => {
  try {
    const cargas = await CargaPendiente.findAll({ where: { tipoCarga: 'Excel', estado: { [Op.in]: ['Requiere revisión', 'Duplicada'] } }, order: [['id', 'ASC']] });
    const rows = cargas.flatMap((carga) => {
      const values = parseJSON(carga.datos, {});
      return [{
        valores: values,
        errores: parseJSON(carga.errores, ['Revisar los campos antes de reimportar.'])
      }];
    });
    const buffer = await cargaService.crearPlanillaErrores(rows);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('polizas-para-corregir.xlsx').send(Buffer.from(buffer));
  } catch (error) { next(error); }
};

exports.descartarLote = async (req, res) => {
  const cargas = await CargaPendiente.findAll({ where: { tipoCarga: 'Excel', estado: { [Op.in]: ['Requiere revisión', 'Duplicada'] } } });
  await Promise.all(cargas.map((carga) => carga.update({ estado: 'Rechazada' })));
  req.session.flash = { type: 'success', msg: 'Las filas con errores se marcaron como rechazadas.' };
  res.redirect('/cargas');
};