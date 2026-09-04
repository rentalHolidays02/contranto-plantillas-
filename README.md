# Contratos Rental Holidays

Generador de contratos de mediación de alquiler vacacional. Rellenas los datos en
el panel izquierdo, el contrato se compone en vivo a la derecha y se exporta a PDF
A4 listo para firmar.

## Uso

No necesita compilarse. Sirve la carpeta y abre el navegador:

```bash
python -m http.server 8080 --bind 127.0.0.1
```

Luego `http://localhost:8080`.

Se puede abrir el `index.html` directamente, pero por HTTP el navegador recoge los
cambios sin pelearse con la caché.

## Qué hace

- Datos del propietario y del inmueble editables desde el formulario o sobre el
  propio documento.
- Cuatro modalidades de duración: meses sueltos, temporadas, fecha fija anual e
  indefinido. El **ANEXO I** con el cuadro de precios se genera solo en modalidad
  mensual.
- Firma digital a mano alzada que se incrusta en el contrato.
- Plantillas guardadas: en el navegador siempre, y sincronizadas entre PCs si se
  conecta la base de datos (botón de estado en la cabecera).
- Exportación a PDF con CLÁUSULAS y ANEXO I abriendo hoja propia.

## Base de datos compartida (opcional)

Sin ella, las plantillas viven sólo en el navegador de cada equipo. Para
compartirlas, en [`server/`](server/) hay un Postgres + PostgREST en Docker
pensado para exponerse únicamente dentro de un tailnet de Tailscale, nunca a
internet. Instrucciones en [`server/README.md`](server/README.md).

## Comprobaciones

```bash
node check.mjs
```

Verifica el cuadro de precios del ANEXO I y que todo campo del formulario quede
vinculado a su hueco del contrato.
