document.addEventListener('DOMContentLoaded', function () {
  const obraSelect = document.getElementById('obraPoliza');
  const tipoSelect = document.getElementById('tipoPoliza');
  const reemplazoField = document.getElementById('reemplazoField');
  const reemplazoSelect = document.getElementById('reemplazaAId');
  const reemplazoSugerencia = document.getElementById('reemplazoSugerencia');

  if (obraSelect && tipoSelect && reemplazoField && reemplazoSelect) {
    const opciones = Array.from(reemplazoSelect.options).slice(1);
    const etapas = {
      'Mantenimiento de Oferta': 1,
      'Cumplimiento de Contrato': 2,
      'Fondo de Reparo': 3
    };

    const actualizarReemplazos = () => {
      const etapaNueva = etapas[tipoSelect.value];
      const elegibles = opciones.filter(opcion =>
        opcion.dataset.obraId === obraSelect.value &&
        Number(opcion.dataset.etapa) < etapaNueva
      );

      reemplazoField.hidden = !etapaNueva;
      opciones.forEach(opcion => {
        opcion.hidden = !elegibles.includes(opcion);
        opcion.disabled = opcion.hidden;
      });

      const sugerida = elegibles.reduce((mejor, opcion) =>
        !mejor || Number(opcion.dataset.etapa) > Number(mejor.dataset.etapa) ? opcion : mejor, null);
      reemplazoSelect.value = '';
      reemplazoSugerencia.textContent = sugerida
        ? `Sugerida: ${sugerida.textContent.trim()}. Seleccioná solo si corresponde; la baja real se confirma luego.`
        : 'No hay una póliza anterior de la cadena para esta obra.';
    };

    obraSelect.addEventListener('change', actualizarReemplazos);
    tipoSelect.addEventListener('change', actualizarReemplazos);
    actualizarReemplazos();
  }

  const btn = document.getElementById('scrollTopButton');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
