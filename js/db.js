/**
 * db.js
 * Sincronización de plantillas/contratos con la base de datos self-hosted
 * (Postgres + PostgREST, ver /server). Si no hay conexión o no está configurada,
 * la app sigue funcionando solo con localStorage (comportamiento previo).
 */

const DB_URL_KEY = 'rh_db_url';

// Dirección de la base en el servidor de la oficina. Solo responde dentro del
// tailnet, así que no es un secreto; tenerla aquí evita configurar cada equipo.
const DB_URL_DEFECTO = 'https://rentalhost.tail5ff048.ts.net:8443';

function getDbUrl() {
  const guardada = (localStorage.getItem(DB_URL_KEY) || '').trim();
  return (guardada || DB_URL_DEFECTO).replace(/\/+$/, '');
}

function setDbUrl(url) {
  localStorage.setItem(DB_URL_KEY, url.trim().replace(/\/+$/, ''));
}

function clearDbUrl() {
  localStorage.removeItem(DB_URL_KEY);
}

function isUuid(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function dbFetch(path, opts = {}) {
  const base = getDbUrl();
  if (!base) throw new Error('DB_NOT_CONFIGURED');
  const res = await fetch(base + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error(`DB_HTTP_${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function dbListContratos() {
  return dbFetch('/contratos?select=id,nombre,updated_at&order=updated_at.desc');
}

async function dbGetContrato(id) {
  const rows = await dbFetch(`/contratos?id=eq.${id}&select=*`);
  return rows && rows[0];
}

async function dbUpsertContrato(record) {
  const body = {
    nombre: record.name,
    form_data: record.formData,
    config: record.config,
    contrato_html: record.contractHTML,
    firma_base64: record.firmaBase64 || null,
    updated_at: new Date().toISOString()
  };

  if (isUuid(record.id)) {
    const rows = await dbFetch(`/contratos?id=eq.${record.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return rows[0];
  }
  const rows = await dbFetch('/contratos', { method: 'POST', body: JSON.stringify(body) });
  return rows[0];
}

async function dbDeleteContrato(id) {
  if (!isUuid(id)) return;
  await dbFetch(`/contratos?id=eq.${id}`, { method: 'DELETE' });
}

async function dbPing() {
  try {
    await dbFetch('/contratos?select=id&limit=1');
    return true;
  } catch (e) {
    return false;
  }
}

function promptDbUrl() {
  const current = getDbUrl();
  const url = prompt(
    'Dirección de la base de datos.\nDéjala vacía para volver a la del servidor de la oficina.',
    current
  );
  if (url === null) return null;
  if (url.trim() === '') {
    clearDbUrl();
    return getDbUrl();
  }
  setDbUrl(url);
  return getDbUrl();
}
