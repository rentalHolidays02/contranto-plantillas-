/**
 * app.js
 * Controlador principal de la aplicación:
 * - Datos directamente en el contrato (Inline Inputs)
 * - Gestor de Fechas Mensuales con selector de 12 meses y presets
 * - Gestor completo de Plantillas (Guardar con nombre, cargar, actualizar, exportar/importar JSON)
 * - Duración flexible (Mensual, Temporadas, Fechas Fijas, Indefinido) y Fechas opcionales
 * - Firma digital con sincronización instantánea
 * - Descarga directa de PDF de alta resolución e impresión oficial A4
 */

const AppState = {
  formData: {
    nombrePropietario: '',
    nifPropietario: '',
    cpPropietario: '',
    domicilioPropietario: '',
    descripcionVivienda: '',
    refInmueble: '',
    municipioInmueble: '',
    clausulaEspecial: ''
  },

  config: {
    incluirFecha: true,
    fechaISO: '',
    fechaTexto: '',
    modoFecha: 'fecha_actual',
    modoDuracion: 'mensual', // 'mensual', 'temporadas', 'fechas', 'indefinido'
    fechaInicio: 'la firma del presente documento',
    fechaFin: '31 de octubre de 2026',
    semanasMinimas: '3 semanas',
    periodoRespetado: 'comprendidas entre la última semana del mes de Julio y las dos primeras del mes de agosto',
    // Nuevo: Configuración de fechas mensuales
    mesesSeleccionados: [6, 7, 8, 9], // Por defecto: Junio, Julio, Agosto, Septiembre
    tipoGestionMensual: 'completo', // 'completo' | 'quincenal' | 'personalizado'
    // Importes: general para todos los meses + específicos por mes (opcional)
    importeMensual: '',
    importePorMesActivo: false,
    importesPorMes: {}, // { 7: '1500', 8: '1800' }
    // Temporadas
    temporadas: [
      { id: 1, nombre: 'Temporada Alta (Verano)', periodo: 'Julio y Agosto', semanas: '3 semanas mínimas' },
      { id: 2, nombre: 'Temporada Media', periodo: 'Junio y Septiembre', semanas: '2 semanas' },
      { id: 3, nombre: 'Semana Santa y Festivos', periodo: 'Abril / Pascua', semanas: '1 semana' }
    ]
  },

  // Gestor de plantillas
  templates: [],
  currentTemplateId: 'default',

  firmaBase64: null,
  isContractDirty: false
};

let sigPad = null;

// Inicialización general
document.addEventListener('DOMContentLoaded', () => {
  initDateDefaults();
  initSignaturePad();
  initTemplates();
  renderContract();
  initMonthlySelector();
  initControlListeners();
  renderSeasonsList();
  syncUIControlsFromConfig();
  abrirContratoDeLaURL();
});

/**
 * Abre directamente el contrato indicado en la dirección (?contrato=ID).
 * Es el enlace que usa el portal de inicio para entrar a editar uno guardado.
 */
async function abrirContratoDeLaURL() {
  const id = new URLSearchParams(location.search).get('contrato');
  if (!id) return;

  try {
    const remoto = await dbGetContrato(id);
    if (!remoto) {
      showToast('Ese contrato ya no existe en la base de datos', 'danger');
      return;
    }

    AppState.config = Object.assign({}, AppState.config, remoto.config);
    AppState.formData = Object.assign({}, AppState.formData, remoto.form_data);
    AppState.firmaBase64 = remoto.firma_base64 || null;
    AppState.currentTemplateId = remoto.id;

    const entrada = {
      id: remoto.id,
      name: remoto.nombre,
      date: remoto.updated_at,
      config: remoto.config,
      formData: remoto.form_data,
      contractHTML: remoto.contrato_html,
      firmaBase64: remoto.firma_base64
    };
    const existente = AppState.templates.find(t => t.id === remoto.id);
    if (existente) Object.assign(existente, entrada);
    else AppState.templates.push(entrada);
    localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));

    renderContract();
    syncUIControlsFromConfig();
    updateTemplateDropdown();
    showToast(`Contrato "${remoto.nombre}" abierto para editar`, 'success');
  } catch (e) {
    console.error(e);
    showToast('No se pudo abrir el contrato: revisa que Tailscale esté conectado', 'danger');
  }
}

/**
 * Inicializa fechas por defecto
 */
function initDateDefaults() {
  const hoy = new Date();
  const fechaISO = hoy.toISOString().split('T')[0];
  AppState.config.fechaISO = fechaISO;

  const fechaObj = formatISODate(fechaISO);
  AppState.config.fechaTexto = `${fechaObj.dia} de ${fechaObj.mes} de ${fechaObj.year}`;

  const inputFecha = document.getElementById('fechaContrato');
  if (inputFecha) inputFecha.value = fechaISO;
}

function formatISODate(isoStr) {
  if (!isoStr) {
    const hoy = new Date();
    isoStr = hoy.toISOString().split('T')[0];
  }
  const [year, month, day] = isoStr.split('-');
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return {
    dia: parseInt(day, 10),
    mes: meses[parseInt(month, 10) - 1] || 'mes',
    year: year
  };
}

/**
 * Inicializa canvas de firma digital
 */
function initSignaturePad() {
  sigPad = new SignaturePad('canvasFirma', {
    color: '#000000',
    lineWidth: 2.2,
    onChange: (dataUrl) => {
      AppState.firmaBase64 = dataUrl;
      updateContractSignature(dataUrl);
      const statusEl = document.getElementById('sigStatusText');
      if (statusEl) {
        statusEl.textContent = dataUrl ? 'Firma capturada ✓' : 'Dibuja con ratón o dedo';
        statusEl.style.color = dataUrl ? '#10b981' : '#64748b';
      }
    }
  });
}

/**
 * RENDERIZA EL CONTRATO con los datos del formulario
 */
function renderContract() {
  const container = document.getElementById('contratoDocumento');
  if (!container) return;

  const html = ContractTemplate.generateFullContractHTML(AppState.formData, AppState.config);
  container.innerHTML = html;

  if (AppState.firmaBase64) {
    updateContractSignature(AppState.firmaBase64);
  }
}

/**
 * Llamado desde oninput en cada campo del formulario del panel izquierdo.
 * Actualiza los spans [data-bind] dentro del contrato en tiempo real sin re-renderizar todo.
 */
function onFieldInput(key, value) {
  AppState.formData[key] = value;

  // Actualizar todos los spans vinculados en el contrato
  const spans = document.querySelectorAll(`.data-field[data-bind="${key}"]`);
  const display = value || getDefaultPlaceholder(key);
  spans.forEach(s => { s.textContent = display; });

  // Cláusula especial: actualizar la caja del contrato
  if (key === 'clausulaEspecial') {
    const elClausula = document.getElementById('textoClausulaEspecialContrato');
    if (elClausula && document.activeElement !== elClausula) {
      elClausula.innerHTML = value ? value.replace(/\n/g, '<br>') : 'No se establecen cláusulas adicionales.';
    }
  }
}

function getDefaultPlaceholder(key) {
  switch (key) {
    case 'nombrePropietario': return '___________________________';
    case 'nifPropietario': return '___________';
    case 'domicilioPropietario': return '___________________________';
    case 'cpPropietario': return '_____';
    case 'municipioInmueble': return '___________';
    case 'descripcionVivienda': return '___________________________';
    case 'refInmueble': return '___________';
    default: return '_____';
  }
}

function updateContractSignature(dataUrl) {
  const slot = document.getElementById('slotFirmaPropietario');
  if (!slot) return;

  if (dataUrl) {
    slot.innerHTML = `<img src="${dataUrl}" alt="Firma Propietario" style="max-height:85px; max-width:100%; object-fit:contain;" />`;
  } else {
    slot.innerHTML = '';
  }
}

function limpiarFirma() {
  if (sigPad) {
    sigPad.clear();
    AppState.firmaBase64 = null;
    updateContractSignature(null);
    const statusEl = document.getElementById('sigStatusText');
    if (statusEl) {
      statusEl.textContent = 'Pendiente de firmar';
      statusEl.style.color = '#64748b';
    }
    showToast('Firma borrada', 'info');
  }
}

/**
 * ==================================================
 * GESTOR DE FECHAS MENSUALES (NUEVO REQUISITO)
 * ==================================================
 */
function initMonthlySelector() {
  const chips = document.querySelectorAll('.month-chip');
  chips.forEach(chip => {
    const m = parseInt(chip.getAttribute('data-month'), 10);
    chip.classList.toggle('selected', AppState.config.mesesSeleccionados.includes(m));

    chip.addEventListener('click', () => {
      toggleMonth(m, chip);
    });
  });

  // Selector de tipo mensual (completo vs quincenal)
  const selTipo = document.getElementById('selTipoMensual');
  if (selTipo) {
    selTipo.value = AppState.config.tipoGestionMensual;
    selTipo.addEventListener('change', (e) => {
      AppState.config.tipoGestionMensual = e.target.value;
      syncConfigToContract();
    });
  }

  // Importe general para todos los meses
  const inputImporte = document.getElementById('importeMensual');
  if (inputImporte) {
    inputImporte.addEventListener('input', (e) => {
      AppState.config.importeMensual = e.target.value;
      renderMonthAmounts(); // refresca los placeholders de las filas
      syncConfigToContract();
    });
  }

  // Activar importes específicos por mes
  const chkPorMes = document.getElementById('chkImportePorMes');
  if (chkPorMes) {
    chkPorMes.addEventListener('change', (e) => {
      AppState.config.importePorMesActivo = e.target.checked;
      if (!e.target.checked) AppState.config.importesPorMes = {};
      renderMonthAmounts();
      syncConfigToContract();
    });
  }

  renderMonthAmounts();
}

function toggleMonth(monthNum, chipElement) {
  const index = AppState.config.mesesSeleccionados.indexOf(monthNum);
  if (index > -1) {
    AppState.config.mesesSeleccionados.splice(index, 1);
    chipElement.classList.remove('selected');
  } else {
    AppState.config.mesesSeleccionados.push(monthNum);
    chipElement.classList.add('selected');
  }
  renderMonthAmounts();
  syncConfigToContract();
}

/**
 * Filas de importe por mes. Solo se muestran si el usuario activa
 * "Importe distinto por mes"; vacío = se aplica el importe general.
 */
function renderMonthAmounts() {
  const container = document.getElementById('monthAmountsContainer');
  if (!container) return;

  if (!AppState.config.importePorMesActivo) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const meses = AppState.config.mesesSeleccionados.slice().sort((a, b) => a - b);
  container.style.display = 'flex';

  if (meses.length === 0) {
    container.innerHTML = '<span class="help-text">Selecciona al menos un mes para asignarle importe.</span>';
    return;
  }

  container.innerHTML = meses.map(m => `
    <div class="month-amount-row">
      <span class="month-amount-name">${ContractTemplate.nombresMeses[m - 1]}</span>
      <input type="number" min="0" step="0.01" value="${AppState.config.importesPorMes[m] || ''}"
             placeholder="${AppState.config.importeMensual || 'General'}"
             oninput="setMonthAmount(${m}, this.value)">
      <span class="month-amount-currency">€</span>
    </div>`).join('');
}

function setMonthAmount(mes, value) {
  if (value === '') {
    delete AppState.config.importesPorMes[mes];
  } else {
    AppState.config.importesPorMes[mes] = value;
  }
  syncConfigToContract();
}

function setMonthPreset(preset) {
  if (preset === 'verano') {
    AppState.config.mesesSeleccionados = [6, 7, 8, 9]; // Jun, Jul, Ago, Sep
  } else if (preset === 'alta') {
    AppState.config.mesesSeleccionados = [7, 8]; // Jul, Ago
  } else if (preset === 'anual') {
    AppState.config.mesesSeleccionados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (preset === 'limpiar') {
    AppState.config.mesesSeleccionados = [];
  }

  // Actualizar chips en la UI
  document.querySelectorAll('.month-chip').forEach(chip => {
    const m = parseInt(chip.getAttribute('data-month'), 10);
    chip.classList.toggle('selected', AppState.config.mesesSeleccionados.includes(m));
  });

  renderMonthAmounts();
  syncConfigToContract();
  showToast(`Meses actualizados (${preset})`, 'info');
}

/**
 * ==================================================
 * GESTOR DE PLANTILLAS ("GUARDAR COMO PLANTILLA")
 * ==================================================
 */
function initTemplates() {
  const stored = localStorage.getItem('rental_holidays_templates');
  if (stored) {
    try {
      AppState.templates = JSON.parse(stored);
    } catch (e) {
      console.error('Error al parsear plantillas', e);
      AppState.templates = [];
    }
  }

  updateTemplateDropdown();
  syncTemplatesFromDb();
}

async function syncTemplatesFromDb() {
  updateDbStatusBadge('checking');
  if (!getDbUrl()) {
    updateDbStatusBadge('offline');
    return;
  }
  try {
    const remoteList = await dbListContratos();
    remoteList.forEach(r => {
      const existing = AppState.templates.find(t => t.id === r.id);
      if (existing) {
        existing.name = r.nombre;
        existing.date = r.updated_at;
      } else {
        AppState.templates.push({ id: r.id, name: r.nombre, date: r.updated_at, remoteOnly: true });
      }
    });

    // Lo borrado en el servidor desaparece también aquí. Se respetan las plantillas
    // que nunca llegaron a subirse, que solo viven en este navegador.
    const enElServidor = new Set(remoteList.map(r => r.id));
    AppState.templates = AppState.templates.filter(t => !isUuid(t.id) || enElServidor.has(t.id));
    if (!AppState.templates.some(t => t.id === AppState.currentTemplateId)) {
      AppState.currentTemplateId = 'default';
    }

    localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
    updateTemplateDropdown();
    updateDbStatusBadge('online');
  } catch (e) {
    console.warn('No se pudo conectar a la base de datos:', e.message);
    updateDbStatusBadge(getDbUrl() ? 'error' : 'offline');
  }
}

function updateDbStatusBadge(state) {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;
  const states = {
    checking: { text: '⏳ Conectando…', cls: 'db-status-checking' },
    online: { text: '☁️ Sincronizado', cls: 'db-status-online' },
    offline: { text: '💾 Solo local', cls: 'db-status-offline' },
    error: { text: '⚠️ Sin conexión', cls: 'db-status-error' }
  };
  const s = states[state] || states.offline;
  badge.textContent = s.text;
  badge.className = 'db-status-badge ' + s.cls;
}

async function connectDbPrompt() {
  const url = promptDbUrl();
  if (url) {
    showToast('Conectando con la base de datos…', 'info');
    await syncTemplatesFromDb();
  } else {
    updateDbStatusBadge('offline');
    showToast('Base de datos desconectada, usando solo almacenamiento local', 'info');
  }
}

function updateTemplateDropdown() {
  const select = document.getElementById('selectPlantillas');
  if (!select) return;

  select.innerHTML = `<option value="default">⭐ Plantilla Oficial Rental Holidays</option>`;

  AppState.templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `📋 ${t.name} (${new Date(t.date).toLocaleDateString()})`;
    select.appendChild(opt);
  });

  select.value = AppState.currentTemplateId;

  // Botón eliminar solo activo si es plantilla personalizada
  const btnEliminar = document.getElementById('btnEliminarPlantilla');
  if (btnEliminar) {
    btnEliminar.style.display = (AppState.currentTemplateId === 'default') ? 'none' : 'inline-flex';
  }
}

async function onTemplateSelected(templateId) {
  AppState.currentTemplateId = templateId;

  const btnEliminar = document.getElementById('btnEliminarPlantilla');
  if (btnEliminar) {
    btnEliminar.style.display = (templateId === 'default') ? 'none' : 'inline-flex';
  }

  if (templateId === 'default') {
    renderContract();
    syncConfigToContract();
    showToast('Plantilla oficial cargada', 'info');
    return;
  }

  let found = AppState.templates.find(t => t.id === templateId);

  if (found && found.remoteOnly) {
    try {
      const remote = await dbGetContrato(found.id);
      if (remote) {
        found = Object.assign(found, {
          config: remote.config,
          formData: remote.form_data,
          contractHTML: remote.contrato_html,
          remoteOnly: false
        });
        localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
      }
    } catch (e) {
      showToast('No se pudo descargar esta plantilla de la base de datos', 'danger');
      return;
    }
  }

  if (found) {
    if (found.config) {
      AppState.config = Object.assign({}, AppState.config, found.config);
    }
    if (found.formData) {
      AppState.formData = Object.assign({}, AppState.formData, found.formData);
    }

    // Restaurar el contrato (re-renderizar con los datos restaurados)
    renderContract();

    // Sincronizar controles visuales + campos del formulario
    syncUIControlsFromConfig();
    showToast(`Plantilla "${found.name}" cargada ✓`, 'success');
  }
}

// Sincroniza los controles del panel izquierdo con la configuración y datos actuales
function syncUIControlsFromConfig() {
  // Switch fecha
  const chkFecha = document.getElementById('chkIncluirFecha');
  if (chkFecha) chkFecha.checked = AppState.config.incluirFecha;

  // Contenedor fecha
  const contenedorFechaInput = document.getElementById('contenedorFechaInput');
  if (contenedorFechaInput) {
    contenedorFechaInput.style.display = AppState.config.incluirFecha ? 'block' : 'none';
  }

  // Radio modo duración
  const radio = document.querySelector(`input[name="modoDuracion"][value="${AppState.config.modoDuracion}"]`);
  if (radio) {
    radio.checked = true;
    toggleDurationPanels(AppState.config.modoDuracion);
  }

  // Chips de meses
  document.querySelectorAll('.month-chip').forEach(chip => {
    const m = parseInt(chip.getAttribute('data-month'), 10);
    chip.classList.toggle('selected', AppState.config.mesesSeleccionados.includes(m));
  });

  // Tipo de gestión mensual e importes
  if (!AppState.config.importesPorMes) AppState.config.importesPorMes = {};
  const selTipo = document.getElementById('selTipoMensual');
  if (selTipo) selTipo.value = AppState.config.tipoGestionMensual;

  const inputImporte = document.getElementById('importeMensual');
  if (inputImporte) inputImporte.value = AppState.config.importeMensual || '';

  const chkPorMes = document.getElementById('chkImportePorMes');
  if (chkPorMes) chkPorMes.checked = !!AppState.config.importePorMesActivo;

  renderMonthAmounts();

  // Restaurar valores en los inputs del formulario
  const fieldMap = [
    'nombrePropietario', 'nifPropietario', 'cpPropietario', 'domicilioPropietario',
    'descripcionVivienda', 'refInmueble', 'municipioInmueble', 'clausulaEspecial'
  ];
  fieldMap.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.value = AppState.formData[key] || '';
  });

  renderSeasonsList();
  actualizarFechaTexto();
}

/**
 * Guarda los cambios sobre el contrato que está abierto, sin crear uno nuevo.
 * Si no hay ninguno abierto, cae en el diálogo de guardar como plantilla nueva.
 */
async function guardarCambios() {
  const actual = AppState.templates.find(t => t.id === AppState.currentTemplateId);
  if (!isUuid(AppState.currentTemplateId) || !actual) {
    openSaveTemplateModal();
    return;
  }

  syncInputValuesToDOM();
  const contractElement = document.getElementById('contratoDocumento');

  Object.assign(actual, {
    config: JSON.parse(JSON.stringify(AppState.config)),
    formData: JSON.parse(JSON.stringify(AppState.formData)),
    contractHTML: contractElement ? contractElement.innerHTML : '',
    firmaBase64: AppState.firmaBase64,
    date: new Date().toISOString()
  });

  try {
    await dbUpsertContrato(actual);
    localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
    updateTemplateDropdown();
    showToast(`Cambios guardados en "${actual.name}" ☁️`, 'success');
  } catch (e) {
    console.error(e);
    showToast('No se pudieron guardar los cambios: ' + e.message, 'danger');
  }
}

function openSaveTemplateModal() {
  const modal = document.getElementById('modalGuardarPlantilla');
  const inputNombre = document.getElementById('inputNombrePlantilla');
  if (modal && inputNombre) {
    inputNombre.value = `Plantilla ${AppState.config.modoDuracion.toUpperCase()} - ${new Date().toLocaleDateString()}`;
    modal.classList.add('active');
    inputNombre.focus();
    inputNombre.select();
  }
}

function closeSaveTemplateModal() {
  const modal = document.getElementById('modalGuardarPlantilla');
  if (modal) modal.classList.remove('active');
}

async function confirmSaveTemplate() {
  const inputNombre = document.getElementById('inputNombrePlantilla');
  const name = inputNombre ? inputNombre.value.trim() : '';

  if (!name) {
    alert('Por favor, indica un nombre para la plantilla.');
    return;
  }

  // Guardar estado actual del documento
  const contractElement = document.getElementById('contratoDocumento');
  const contractHTML = contractElement ? contractElement.innerHTML : '';

  const newTemplate = {
    id: 'tpl_' + Date.now(),
    name: name,
    date: new Date().toISOString(),
    config: JSON.parse(JSON.stringify(AppState.config)),
    formData: JSON.parse(JSON.stringify(AppState.formData)),
    contractHTML: contractHTML,
    firmaBase64: AppState.firmaBase64
  };

  try {
    if (getDbUrl()) {
      const saved = await dbUpsertContrato(newTemplate);
      newTemplate.id = saved.id;
    }
  } catch (e) {
    console.warn('No se pudo sincronizar con la base de datos:', e.message);
    updateDbStatusBadge('error');
  }

  AppState.templates.push(newTemplate);
  AppState.currentTemplateId = newTemplate.id;

  try {
    localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
    updateTemplateDropdown();
    closeSaveTemplateModal();
    const synced = isUuid(newTemplate.id);
    showToast(synced ? `Plantilla "${name}" guardada y sincronizada ☁️` : `Plantilla "${name}" guardada solo en este navegador 💾`, 'success');
  } catch (e) {
    console.error(e);
    alert('No se pudo guardar la plantilla en el almacenamiento local.');
  }
}

async function deleteCurrentTemplate() {
  if (AppState.currentTemplateId === 'default') return;

  const found = AppState.templates.find(t => t.id === AppState.currentTemplateId);
  if (!found) return;

  if (confirm(`¿Estás seguro de eliminar la plantilla "${found.name}"?`)) {
    try {
      await dbDeleteContrato(found.id);
    } catch (e) {
      console.warn('No se pudo eliminar en la base de datos:', e.message);
    }
    AppState.templates = AppState.templates.filter(t => t.id !== AppState.currentTemplateId);
    AppState.currentTemplateId = 'default';
    localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
    updateTemplateDropdown();
    onTemplateSelected('default');
    showToast('Plantilla eliminada', 'info');
  }
}

/**
 * ==================================================
 * MODAL "MIS CONTRATOS" (buscar / cargar / eliminar)
 * ==================================================
 */
function openContractsListModal() {
  const modal = document.getElementById('modalMisContratos');
  const input = document.getElementById('inputBuscarContrato');
  if (!modal) return;
  modal.classList.add('active');
  if (input) { input.value = ''; input.focus(); }
  renderContractsList('');
  syncTemplatesFromDb();
}

function closeContractsListModal() {
  const modal = document.getElementById('modalMisContratos');
  if (modal) modal.classList.remove('active');
}

function renderContractsList(query) {
  const container = document.getElementById('contractsListContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const items = AppState.templates
    .filter(t => !q || t.name.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (items.length === 0) {
    container.innerHTML = `<p class="contracts-empty">${q ? 'Sin resultados para esa búsqueda.' : 'Todavía no hay contratos guardados. Usa "Guardar Plantilla" para añadir el primero.'}</p>`;
    return;
  }

  container.innerHTML = items.map(t => `
    <div class="contract-row">
      <div class="contract-row-info">
        <strong>${escapeHtml(t.name)}</strong>
        <span>${new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${isUuid(t.id) ? '☁️ sincronizado' : '💾 solo local'}</span>
      </div>
      <div class="contract-row-actions">
        <button type="button" class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" onclick="loadContractFromList('${t.id}')">Cargar</button>
        <button type="button" class="btn btn-danger-outline" style="padding: 5px 8px; font-size: 12px;" onclick="deleteContractFromList('${t.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function loadContractFromList(id) {
  await onTemplateSelected(id);
  updateTemplateDropdown();
  closeContractsListModal();
}

async function deleteContractFromList(id) {
  const found = AppState.templates.find(t => t.id === id);
  if (!found) return;
  if (!confirm(`¿Eliminar la plantilla "${found.name}"? Esta acción no se puede deshacer.`)) return;

  try {
    await dbDeleteContrato(id);
  } catch (e) {
    console.warn('No se pudo eliminar en la base de datos:', e.message);
  }
  AppState.templates = AppState.templates.filter(t => t.id !== id);
  if (AppState.currentTemplateId === id) AppState.currentTemplateId = 'default';
  localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
  updateTemplateDropdown();
  renderContractsList(document.getElementById('inputBuscarContrato')?.value || '');
  showToast('Contrato eliminado', 'info');
}

function importTemplatesJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        AppState.templates = imported;
        localStorage.setItem('rental_holidays_templates', JSON.stringify(AppState.templates));
        updateTemplateDropdown();
        showToast(`${imported.length} plantillas importadas correctamente ✓`, 'success');
      } else {
        alert('El archivo no contiene un formato de plantillas válido.');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
}

/**
 * ==================================================
 * LISTENERS DE CONTROL DEL PANEL IZQUIERDO
 * ==================================================
 */
function initControlListeners() {
  // Switch fecha de firma
  const chkIncluirFecha = document.getElementById('chkIncluirFecha');
  const contenedorFechaInput = document.getElementById('contenedorFechaInput');
  const inputFecha = document.getElementById('fechaContrato');

  if (chkIncluirFecha) {
    chkIncluirFecha.addEventListener('change', (e) => {
      AppState.config.incluirFecha = e.target.checked;
      if (contenedorFechaInput) {
        contenedorFechaInput.style.display = e.target.checked ? 'block' : 'none';
      }
      actualizarFechaTexto();
      syncConfigToContract();
    });
  }

  if (inputFecha) {
    inputFecha.addEventListener('change', (e) => {
      AppState.config.fechaISO = e.target.value;
      const fechaObj = formatISODate(e.target.value);
      AppState.config.fechaTexto = `${fechaObj.dia} de ${fechaObj.mes} de ${fechaObj.year}`;
      actualizarFechaTexto();
      syncConfigToContract();
    });
  }

  // Radios de modalidad de duración
  document.querySelectorAll('input[name="modoDuracion"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      AppState.config.modoDuracion = e.target.value;
      toggleDurationPanels(e.target.value);
      syncConfigToContract();
    });
  });

  // Fecha fin anual
  const inputFechaFin = document.getElementById('fechaFinContrato');
  if (inputFechaFin) {
    inputFechaFin.addEventListener('input', (e) => {
      AppState.config.fechaFin = e.target.value;
      syncConfigToContract();
    });
  }
}

function toggleDurationPanels(mode) {
  const pMensual = document.getElementById('panelModoMensual');
  const pTemporadas = document.getElementById('panelModoTemporadas');
  const pFechas = document.getElementById('panelModoFechas');

  if (pMensual) pMensual.style.display = (mode === 'mensual') ? 'block' : 'none';
  if (pTemporadas) pTemporadas.style.display = (mode === 'temporadas') ? 'block' : 'none';
  if (pFechas) pFechas.style.display = (mode === 'fechas') ? 'block' : 'none';
}

function actualizarFechaTexto() {
  const elFecha = document.querySelector('[data-section="fecha-encabezado"]');
  if (!elFecha) return;

  if (!AppState.config.incluirFecha) {
    elFecha.innerHTML = "En Castellón, a _____ de _________________ de 202__.";
  } else {
    elFecha.innerHTML = `En Castellón a ${AppState.config.fechaTexto}.`;
  }
}

function syncConfigToContract() {
  // Cláusula 1
  const elClausula1 = document.querySelector('[data-section="clausula-1-p1"]');
  if (elClausula1) {
    elClausula1.innerHTML = ContractTemplate.getClausula1Texto(AppState.config);
  }

  // Cláusula 3
  const elClausula3 = document.querySelector('[data-section="clausula-3-compromiso"]');
  if (elClausula3) {
    elClausula3.innerHTML = ContractTemplate.getCompromisoSemanasTexto(AppState.config);
  }

  // ANEXO I (cuadro de precios)
  const elAnexo = document.getElementById('anexoIPrecios');
  if (elAnexo) {
    const anexoI = ContractTemplate.getAnexoIHTML(AppState.config);
    elAnexo.innerHTML = anexoI;
    elAnexo.className = anexoI ? 'anexo-section' : '';
  }

  actualizarFechaTexto();
}

/**
 * Gestor de temporadas
 */
function renderSeasonsList() {
  const container = document.getElementById('seasonsListContainer');
  if (!container) return;

  container.innerHTML = '';
  AppState.config.temporadas.forEach((temp, index) => {
    const row = document.createElement('div');
    row.className = 'season-row';
    row.innerHTML = `
      <input type="text" value="${escapeHtml(temp.nombre)}" placeholder="Temporada" onchange="updateSeason(${index}, 'nombre', this.value)">
      <input type="text" value="${escapeHtml(temp.periodo)}" placeholder="Periodo" onchange="updateSeason(${index}, 'periodo', this.value)">
      <input type="text" value="${escapeHtml(temp.semanas)}" placeholder="Mínimo" onchange="updateSeason(${index}, 'semanas', this.value)">
      <button type="button" class="btn-icon-danger" onclick="removeSeason(${index})" title="Eliminar">✕</button>
    `;
    container.appendChild(row);
  });
}

function addSeason() {
  AppState.config.temporadas.push({
    id: Date.now(),
    nombre: 'Nueva Temporada',
    periodo: 'Fechas por determinar',
    semanas: '2 semanas'
  });
  renderSeasonsList();
  syncConfigToContract();
  showToast('Temporada agregada', 'success');
}

function updateSeason(index, field, value) {
  if (AppState.config.temporadas[index]) {
    AppState.config.temporadas[index][field] = value;
    syncConfigToContract();
  }
}

function removeSeason(index) {
  AppState.config.temporadas.splice(index, 1);
  renderSeasonsList();
  syncConfigToContract();
}

/**
 * Barra de herramientas WYSIWYG
 */
function formatDoc(cmd, value = null) {
  document.execCommand(cmd, false, value);
  const doc = document.getElementById('contratoDocumento');
  if (doc) doc.focus();
}

function addNewClause() {
  const container = document.getElementById('contratoDocumento');
  if (!container) return;

  const newIndex = container.querySelectorAll('.clause-item').length + 1;
  const newClauseHtml = `
    <div class="clause-item" id="clause-${newIndex}">
      <h4 class="clause-title" contenteditable="true">${newIndex}. NUEVA CLÁUSULA ADICIONAL</h4>
      <div class="legal-paragraph" contenteditable="true">
        Escriba aquí los términos y condiciones de la nueva cláusula acordada entre las partes...
      </div>
    </div>
  `;

  const specialBox = container.querySelector('.special-clause-box');
  if (specialBox) {
    specialBox.insertAdjacentHTML('beforebegin', newClauseHtml);
  } else {
    container.insertAdjacentHTML('beforeend', newClauseHtml);
  }

  showToast(`Cláusula ${newIndex} añadida`, 'success');
}

function resetToDefaultContract() {
  if (confirm('¿Deseas restablecer el contrato al texto oficial? Se reiniciarán las modificaciones manuales.')) {
    renderContract();
    syncConfigToContract();
    showToast('Contrato restablecido a la versión oficial', 'info');
  }
}

/**
 * ==================================================
 * EXPORTACIÓN A PDF
 * ==================================================
 */
async function downloadPDF() {
  const contractElement = document.getElementById('contratoDocumento');
  if (!contractElement) return;

  const overlay = document.getElementById('overlayLoading');
  if (overlay) overlay.classList.add('active');

  syncInputValuesToDOM();

  // html2pdf mide las posiciones para insertar los saltos ANTES de rasterizar:
  // si el layout cambia entre las dos fases, los saltos caen desplazados. Por eso
  // las marcas de solo-pantalla se ocultan aquí y no dentro de html2canvas.
  contractElement.classList.add('exporting-pdf');

  // Nombre de archivo
  const propName = (AppState.formData.nombrePropietario || 'Propietario')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `Contrato_Mediacion_RentalHolidays_${propName}.pdf`;

  const opt = {
    margin: [12, 14, 12, 14],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: ['.anexo-section', '.starts-new-page'],
      avoid: ['.clause-item', '.special-clause-box', '.signatures-wrapper', '.anexo-table', '.legal-paragraph', '.clause-title', '.legal-section-title']
    }
  };

  try {
    if (typeof html2pdf === 'undefined') {
      throw new Error('La librería html2pdf no se cargó (revisa js/html2pdf.bundle.min.js).');
    }
    await html2pdf().set(opt).from(contractElement).save();
    showToast('PDF generado y descargado con éxito ✓', 'success');
  } catch (err) {
    console.error(err);
    showToast('No se pudo generar el PDF: ' + err.message, 'danger');
  } finally {
    contractElement.classList.remove('exporting-pdf');
    if (overlay) overlay.classList.remove('active');
  }
}

// Asegura que los valores actuales escritos en los inputs se queden grabados como atributo HTML para html2canvas
function syncInputValuesToDOM() {
  const inputs = document.querySelectorAll('.inline-contract-input');
  inputs.forEach(inp => {
    inp.setAttribute('value', inp.value);
  });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}
