/**
 * Comprobación del cuadro de precios del ANEXO I.
 * Ejecutar: node check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert';

// contractData.js usa escapeHtml, que en el navegador aporta app.js
const ContractTemplate = new Function(
  'escapeHtml',
  readFileSync('js/contractData.js', 'utf8') + '; return ContractTemplate;'
)(s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

// ponytail: es-ES no agrupa millares por debajo de 10.000 (minimumGroupingDigits: 2)
assert.strictEqual(ContractTemplate.formatEuro('1000'), '1000\u00a0€');
assert.strictEqual(ContractTemplate.formatEuro('12500.5'), '12.500,5\u00a0€');
assert.strictEqual(ContractTemplate.formatEuro(''), '');
assert.strictEqual(ContractTemplate.formatEuro('abc'), '');

const base = {
  modoDuracion: 'mensual', tipoGestionMensual: 'completo',
  mesesSeleccionados: [8, 7], importeMensual: '1000', importesPorMes: {}
};

// El importe general se aplica a todos los meses seleccionados
let html = ContractTemplate.getAnexoIHTML(base);
assert.strictEqual((html.match(/1000/g) || []).length, 2);
assert.match(html, /2000/, 'total = 1000 + 1000');

// El importe específico de un mes pisa al general
html = ContractTemplate.getAnexoIHTML({ ...base, importesPorMes: { 8: '1500' } });
assert.match(html, /precio específico/);
assert.match(html, /2500/, 'total = 1000 + 1500');

// Un mes a 0 € es un importe válido, no cae al general
assert.match(ContractTemplate.getAnexoIHTML({ ...base, importesPorMes: { 8: '0' } }), /0\u00a0€/);

// Sin importe: hueco para rellenar a mano, nunca NaN
html = ContractTemplate.getAnexoIHTML({ ...base, importeMensual: '' });
assert.match(html, /____________ €/);
assert.doesNotMatch(html, /NaN/);

// El anexo solo existe en modalidad mensual y con meses seleccionados
assert.strictEqual(ContractTemplate.getAnexoIHTML({ ...base, modoDuracion: 'fechas' }), '');
assert.strictEqual(ContractTemplate.getAnexoIHTML({ ...base, mesesSeleccionados: [] }), '');

// getMesesTexto ordena sin mutar la configuración
const meses = [8, 7, 6];
assert.strictEqual(ContractTemplate.getMesesTexto(meses), 'Junio, Julio y Agosto');
assert.deepStrictEqual(meses, [8, 7, 6]);

console.log('OK: cuadro de precios ANEXO I');

// Todo campo vinculado se actualiza en vivo por .data-field[data-bind]; un span
// con otra clase queda huérfano y nunca recibe el valor escrito en el formulario.
const contrato = ContractTemplate.generateFullContractHTML(
  { nombrePropietario: 'Arturo Pérez', nifPropietario: '222222', municipioInmueble: 'Castellón' },
  base
);
for (const [, clase] of contrato.matchAll(/class="([^"]*)"[^>]*data-bind="/g)) {
  assert.ok(clase.split(/\s+/).includes('data-field'), `span data-bind sin .data-field: "${clase}"`);
}
assert.strictEqual((contrato.match(/Arturo Pérez/g) || []).length, 3, 'nombre en COMPARECEN, EXPONEN y firma');

// CLÁUSULAS y ANEXO I abren hoja propia: la clase es lo que lee html2pdf (pagebreak.before)
assert.match(contrato, /class="[^"]*starts-new-page[^"]*"[^>]*>\s*CLÁUSULAS/);

console.log('OK: campos vinculados del contrato');
