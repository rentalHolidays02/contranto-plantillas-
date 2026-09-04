/**
 * contractData.js
 * Plantilla oficial y estructura del Contrato de Mediación de Alquiler Vacacional
 * Rental Holidays Experience, S.L.
 * Soporte para: Datos directamente en el contrato, Fechas Mensuales, Temporadas y Plantillas
 */

const ContractTemplate = {
  // Datos predeterminados de la empresa mediadora
  mediador: {
    nombre: "RENTAL HOLIDAYS EXPERIENCE, S.L.",
    cif: "B12698940",
    domicilio: "Ronda circunvalación, 188, 12003, de Castellón",
    representante: "Francisco Alhambra Fuset",
    nifRepresentante: "18975598T"
  },

  nombresMeses: [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ],

  // Obtiene el texto formateado de los meses seleccionados
  getMesesTexto(mesesSeleccionados) {
    if (!mesesSeleccionados || mesesSeleccionados.length === 0) {
      return "los meses acordados en el calendario de comercialización";
    }
    const lista = mesesSeleccionados.slice().sort((a,b) => a-b).map(m => this.nombresMeses[m - 1] || m);
    if (lista.length === 1) return lista[0];
    const ultimo = lista.pop();
    return `${lista.join(", ")} y ${ultimo}`;
  },

  // Genera el texto formal para la Cláusula 1 según la modalidad de duración/temporada/meses
  getClausula1Texto(config) {
    const { modoDuracion, fechaInicio, fechaFin, temporadas, mesesSeleccionados, tipoGestionMensual } = config;

    // 1. MODALIDAD FECHAS MENSUALES (NUEVO REQUISITO)
    if (modoDuracion === 'mensual') {
      const mesesTexto = this.getMesesTexto(mesesSeleccionados);
      const detalleTipo = tipoGestionMensual === 'quincenal' ? 'por quincenas naturales' : 'por mensualidades completas';
      return `LA PROPIEDAD autoriza AL MEDIADOR en EXCLUSIVA la gestión del arrendamiento vacacional por <strong>periodos mensuales (${detalleTipo})</strong> correspondientes a los meses de: <strong>${mesesTexto}</strong>, junto con la aceptación de la propuesta de precios como ANEXO I. Renovándose automáticamente para las mensualidades o ejercicios sucesivos si no existe renuncia por ninguna de las partes.`;
    }

    // 2. MODALIDAD POR TEMPORADAS
    if (modoDuracion === 'temporadas') {
      let detalleTemporadas = "las temporadas acordadas entre las partes";
      if (temporadas && temporadas.length > 0) {
        detalleTemporadas = temporadas.map(t => {
          let str = `<strong>${t.nombre}</strong>`;
          if (t.periodo) str += ` (${t.periodo})`;
          if (t.semanas) str += ` [Mínimo: ${t.semanas}]`;
          return str;
        }).join(", ");
      }
      return `LA PROPIEDAD autoriza AL MEDIADOR en EXCLUSIVA la gestión del arrendamiento vacacional, para que gestione y, a tal efecto, proporcione cuántos clientes estén interesados en el arrendamiento del inmueble reseñado en el expositivo I del presente contrato, <strong>para las temporadas especificadas: ${detalleTemporadas}</strong>, junto con la aceptación de la propuesta de precios como ANEXO I. Renovándose automáticamente para los periodos o temporadas sucesivas si no existe renuncia por ninguna de las partes.`;
    }

    // 3. MODALIDAD FECHAS FIJAS / ANUAL
    if (modoDuracion === 'fechas') {
      const inicio = fechaInicio || "la firma del presente documento";
      const fin = fechaFin || "31 de octubre de 2026";
      return `LA PROPIEDAD autoriza AL MEDIADOR en EXCLUSIVA la gestión del arrendamiento vacacional, para que gestione y, a tal efecto, proporcione cuántos clientes estén interesados en el arrendamiento del inmueble reseñado en el expositivo I del presente contrato, <strong>desde ${inicio} hasta el ${fin}</strong>, junto con la aceptación de la propuesta de precios como ANEXO I. Renovándose automáticamente por anualidades si no existe renuncia por ninguna de las partes.`;
    }

    // 4. MODO INDEFINIDO / SIN FECHAS FIJAS
    return `LA PROPIEDAD autoriza AL MEDIADOR en EXCLUSIVA la gestión del arrendamiento vacacional, para que gestione y, a tal efecto, proporcione cuántos clientes estén interesados en el arrendamiento del inmueble reseñado en el expositivo I del presente contrato, <strong>con carácter indefinido a partir de la firma</strong>, junto con la aceptación de la propuesta de precios como ANEXO I. Renovándose automáticamente si no existe renuncia por ninguna de las partes.`;
  },

  // Genera el texto para el compromiso de semanas en la Cláusula 3
  getCompromisoSemanasTexto(config) {
    const { modoDuracion, semanasMinimas, periodoRespetado, temporadas, mesesSeleccionados } = config;

    if (modoDuracion === 'mensual') {
      const mesesTexto = this.getMesesTexto(mesesSeleccionados);
      return `La propiedad se compromete a respetar para que el MEDIADOR disponga de la gestión exclusiva, según precios tarifa del Anexo I, la totalidad de los periodos mensuales acordados correspondientes a: <strong>${mesesTexto}</strong>.`;
    }

    if (modoDuracion === 'temporadas' && temporadas && temporadas.length > 0) {
      const resumen = temporadas.map(t => `${t.nombre}: ${t.semanas || 'periodo convenido'}`).join("; ");
      return `La propiedad se compromete a respetar para que el MEDIADOR disponga de la gestión, según precios tarifa del Anexo I, los siguientes periodos y semanas: <strong>${resumen}</strong>.`;
    }

    const semanas = semanasMinimas || "3 semanas";
    const periodo = periodoRespetado || "comprendidas entre la última semana del mes de Julio y las dos primeras del mes de agosto";
    return `La propiedad se compromete a respetar un mínimo de <strong>${semanas}</strong>, ${periodo}, para que el MEDIADOR disponga de la gestión, según precios tarifa del Anexo I.`;
  },

  // Formatea un importe en euros (es-ES). Devuelve '' si no hay valor.
  formatEuro(valor) {
    const num = parseFloat(valor);
    if (isNaN(num)) return '';
    return num.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },

  // Importe aplicable a un mes: el específico si existe, si no el general
  getImporteMes(config, mes) {
    const especifico = config.importesPorMes ? config.importesPorMes[mes] : '';
    return (especifico !== undefined && especifico !== '') ? especifico : config.importeMensual;
  },

  // ANEXO I: cuadro de precios por mes (solo modalidad mensual)
  getAnexoIHTML(config) {
    const meses = (config.mesesSeleccionados || []).slice().sort((a, b) => a - b);
    if (config.modoDuracion !== 'mensual' || meses.length === 0) return '';

    const unidad = config.tipoGestionMensual === 'quincenal' ? 'Por quincena' : 'Mensual';
    let total = 0;
    const filas = meses.map(m => {
      const importe = this.getImporteMes(config, m);
      const num = parseFloat(importe);
      if (!isNaN(num)) total += num;
      const especifico = config.importesPorMes && config.importesPorMes[m] !== undefined && config.importesPorMes[m] !== '';
      return `<tr>
            <td>${this.nombresMeses[m - 1]}</td>
            <td>${unidad}${especifico ? ' <em>(precio específico)</em>' : ''}</td>
            <td class="anexo-importe">${this.formatEuro(importe) || '____________ €'}</td>
          </tr>`;
    }).join('');

    return `
      <div class="anexo-title" contenteditable="true">ANEXO I — CUADRO DE PRECIOS</div>
      <div class="legal-paragraph" contenteditable="true">
        Importes netos que percibirá LA PROPIEDAD por cada periodo comercializado, una vez descontada la comisión de gestión del MEDIADOR.
      </div>
      <table class="anexo-table">
        <thead>
          <tr><th>Periodo</th><th>Modalidad</th><th class="anexo-importe">Importe neto</th></tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr><td colspan="2"><strong>TOTAL periodos acordados</strong></td><td class="anexo-importe"><strong>${this.formatEuro(total) || '____________ €'}</strong></td></tr>
        </tfoot>
      </table>
      <div class="legal-paragraph anexo-nota" contenteditable="true">
        Los importes aquí reflejados podrán actualizarse de mutuo acuerdo entre las partes mediante addenda al presente contrato.
      </div>`;
  },

  // Genera la estructura HTML editable completa del contrato con campos directamente integrados
  generateFullContractHTML(data, config) {
    const prop = {
      nombre: data.nombrePropietario || "",
      nif: data.nifPropietario || "",
      domicilio: data.domicilioPropietario || "",
      cp: data.cpPropietario || "",
      municipio: data.municipioInmueble || "",
      descripcion: data.descripcionVivienda || "",
      registro: data.refInmueble || "",
      clausula: data.clausulaEspecial ? data.clausulaEspecial.replace(/\n/g, '<br>') : "No se establecen cláusulas adicionales."
    };

    // Encabezado de fecha
    let fechaEncabezado = "En Castellón, a _____ de _________________ de 202__.";
    if (config.incluirFecha && config.fechaTexto) {
      fechaEncabezado = `En Castellón a ${config.fechaTexto}.`;
    } else if (config.modoFecha === 'sin_fecha') {
      fechaEncabezado = "En Castellón.";
    }

    const clausula1P1 = this.getClausula1Texto(config);
    const compromisoSemanas = this.getCompromisoSemanasTexto(config);
    const anexoI = this.getAnexoIHTML(config);

    return `
      <!-- ENCABEZADO LEGAL -->
      <div class="legal-header">
        <div class="header-logo-container">
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjY2LjU0NiAxMTQuNDk2IDM2OS44NyAyNzEuMTk2IiB3aWR0aD0iMzY5Ljg3IiBoZWlnaHQ9IjI3MS4xOTYiIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iUmVudGFsSG9saWRheXMgLSBNYWtlcyBtZSBoYXBweSI+CiAgPHRpdGxlPlJlbnRhbEhvbGlkYXlzIC0gTWFrZXMgbWUgaGFwcHk8L3RpdGxlPgogIDxnIGZpbGw9IiNERjA4MUEiPgogICAgPHBhdGggZD0iTTE1Ny44MDEsMTY2LjA0OSBMMjI1LjU4NCwxMjEuNjI3IEE0My43LDQzLjcgMCAwIDEgMjczLjQxNiwxMjEuNjI3IEwzNDEuMTk5LDE2Ni4wNDkgQTkuNSw5LjUgMCAwIDEgMzMwLjgwMSwxODEuOTUxIEwyNjMuMDE4LDEzNy41MyBBMjQuNywyNC43IDAgMCAwIDIzNS45ODIsMTM3LjUzIEwxNjguMTk5LDE4MS45NTEgQTkuNSw5LjUgMCAwIDEgMTU3LjgwMSwxNjYuMDQ5IFoiLz4KICAgIDxwYXRoIGQ9Ik0xNzYuNSwxOTcuNSBBNzMsNzMgMCAwIDAgMjQ5LjUsMjcwLjUgQTczLDczIDAgMCAwIDMyMi41LDE5Ny41IEE5LDkgMCAwIDAgMzA0LjUsMTk3LjUgQTU1LDU1IDAgMCAxIDI0OS41LDI1Mi41IEE1NSw1NSAwIDAgMSAxOTQuNSwxOTcuNSBBOSw5IDAgMCAwIDE3Ni41LDE5Ny41IFoiLz4KICA8L2c+CiAgPGcgZmlsbD0iI0VGOTYxOCI+CiAgICA8cGF0aCBkPSJNMjQ2Ljc1LDE4My4yNSBMMjQ2Ljc1LDE5NC43NSBMMjM1LjI1LDE5NC43NSBBMTEuNSwxMS41IDAgMSAxIDI0Ni43NSwxODMuMjUgWiIvPgogICAgPHBhdGggZD0iTTI1Mi4yNSwxODMuMjUgTDI1Mi4yNSwxOTQuNzUgTDI2My43NSwxOTQuNzUgQTExLjUsMTEuNSAwIDEgMCAyNTIuMjUsMTgzLjI1IFoiLz4KICAgIDxwYXRoIGQ9Ik0yNDYuNzUsMjExLjc1IEwyNDYuNzUsMjAwLjI1IEwyMzUuMjUsMjAwLjI1IEExMS41LDExLjUgMCAxIDAgMjQ2Ljc1LDIxMS43NSBaIi8+CiAgICA8cGF0aCBkPSJNMjUyLjI1LDIxMS43NSBMMjUyLjI1LDIwMC4yNSBMMjYzLjc1LDIwMC4yNSBBMTEuNSwxMS41IDAgMSAxIDI1Mi4yNSwyMTEuNzUgWiIvPgogIDwvZz4KICA8ZyBmaWxsPSIjMDAwMDAwIj4KICAgIDxwYXRoIGQ9Ik03Mi4wMjYgMzM4Ljg4OVYzMzMuMDhIODAuOTU4UTgzLjY5OCAzMzMuMDggODUuMjA1IDMzMS42ODNRODYuNzEyIDMzMC4yODUgODYuNzEyIDMyNy44MTlRODYuNzEyIDMyNS41NzIgODUuMjA1IDMyNC4wNjVRODMuNjk4IDMyMi41NTggODAuOTU4IDMyMi41NThINzIuMDI2VjMxNi40NzZIODEuNjE2UTg1LjM0MiAzMTYuNDc2IDg4LjE2NCAzMTcuOTI4UTkwLjk4NiAzMTkuMzggOTIuNTQ4IDMyMS45MDFROTQuMTEgMzI0LjQyMiA5NC4xMSAzMjcuNzFROTQuMTEgMzMxLjEwNyA5Mi41NDggMzMzLjYwMVE5MC45ODYgMzM2LjA5NCA4OC4xMzcgMzM3LjQ5MVE4NS4yODcgMzM4Ljg4OSA4MS41MDYgMzM4Ljg4OVpNNjYuNTQ2IDM1NVYzMTYuNDc2SDczLjk5OFYzNTVaTTg3LjU4OSAzNTUgNzQuODc1IDMzOC4zNDEgODEuNzI1IDMzNi4yMDQgOTYuNjMxIDM1NVogTTExMi44MzcgMzU1LjU0OFExMDguNjcyIDM1NS41NDggMTA1LjQzOSAzNTMuNzY3UTEwMi4yMDYgMzUxLjk4NiAxMDAuMzE1IDM0OC44NjJROTguNDI1IDM0NS43MzkgOTguNDI1IDM0MS43MzhROTguNDI1IDMzNy43OTMgMTAwLjI2MSAzMzQuNjk3UTEwMi4wOTYgMzMxLjYgMTA1LjI3NSAzMjkuNzY1UTEwOC40NTMgMzI3LjkyOSAxMTIuMzQ0IDMyNy45MjlRMTE2LjE4IDMyNy45MjkgMTE5LjExMiAzMjkuNjU1UTEyMi4wNDQgMzMxLjM4MSAxMjMuNzE1IDMzNC4zNjhRMTI1LjM4NiAzMzcuMzU0IDEyNS4zODYgMzQxLjEzNlExMjUuMzg2IDM0MS44NDggMTI1LjMwNCAzNDIuNTg4UTEyNS4yMjIgMzQzLjMyOCAxMjUuMDAzIDM0NC4yNTlMMTAyLjc1NCAzNDQuMzE0VjMzOC45NDRMMTIxLjY2IDMzOC44ODlMMTE4Ljc1NiAzNDEuMTM2UTExOC42NDYgMzM4Ljc3OSAxMTcuOTA2IDMzNy4xOVExMTcuMTY2IDMzNS42MDEgMTE1Ljc2OSAzMzQuNzUxUTExNC4zNzIgMzMzLjkwMiAxMTIuMzQ0IDMzMy45MDJRMTEwLjIwNyAzMzMuOTAyIDEwOC42MTggMzM0Ljg2MVExMDcuMDI4IDMzNS44MiAxMDYuMTc5IDMzNy41NDZRMTA1LjMzIDMzOS4yNzIgMTA1LjMzIDM0MS42MjlRMTA1LjMzIDM0NC4wNCAxMDYuMjM0IDM0NS44MjFRMTA3LjEzOCAzNDcuNjAyIDEwOC44MzcgMzQ4LjU2MVExMTAuNTM2IDM0OS41MiAxMTIuNzgyIDM0OS41MlExMTQuODEgMzQ5LjUyIDExNi40NTQgMzQ4LjgzNVExMTguMDk4IDM0OC4xNSAxMTkuMzA0IDM0Ni43OEwxMjMuNTIzIDM1MVExMjEuNjA1IDM1My4yNDYgMTE4LjgzOCAzNTQuMzk3UTExNi4wNyAzNTUuNTQ4IDExMi44MzcgMzU1LjU0OFogTTE0Ny45ODggMzU1VjMzOS44MlExNDcuOTg4IDMzNy40NjQgMTQ2LjUwOSAzMzUuOTg0UTE0NS4wMjkgMzM0LjUwNSAxNDIuNjczIDMzNC41MDVRMTQxLjEzOCAzMzQuNTA1IDEzOS45MzMgMzM1LjE2MlExMzguNzI3IDMzNS44MiAxMzguMDQyIDMzNy4wMjZRMTM3LjM1NyAzMzguMjMxIDEzNy4zNTcgMzM5LjgyTDEzNC41NjIgMzM4LjM5NlExMzQuNTYyIDMzNS4yNzIgMTM1LjkwNSAzMzIuOTQzUTEzNy4yNDggMzMwLjYxNCAxMzkuNjMxIDMyOS4yOTlRMTQyLjAxNSAzMjcuOTg0IDE0NS4wMjkgMzI3Ljk4NFExNDcuOTM0IDMyNy45ODQgMTUwLjIzNSAzMjkuNDM2UTE1Mi41MzcgMzMwLjg4OCAxNTMuODUyIDMzMy4yMTdRMTU1LjE2NyAzMzUuNTQ2IDE1NS4xNjcgMzM4LjIzMVYzNTVaTTEzMC4xNzggMzU1VjMyOC41MzJIMTM3LjM1N1YzNTVaIE0xNjMuODY5IDM1NVYzMTcuNTE3SDE3MS4wNDhWMzU1Wk0xNTcuNjc3IDMzNC44MzRWMzI4LjUzMkgxNzcuMjRWMzM0LjgzNFogTTE5MC4yNDggMzU1LjU0OFExODYuNjMxIDM1NS41NDggMTgzLjcyNyAzNTMuNzRRMTgwLjgyMiAzNTEuOTMxIDE3OS4xNzggMzQ4LjgwOFExNzcuNTM0IDM0NS42ODQgMTc3LjUzNCAzNDEuNzkzUTE3Ny41MzQgMzM3Ljg0OCAxNzkuMTc4IDMzNC43MjRRMTgwLjgyMiAzMzEuNiAxODMuNzI3IDMyOS43OTJRMTg2LjYzMSAzMjcuOTg0IDE5MC4yNDggMzI3Ljk4NFExOTMuMDk4IDMyNy45ODQgMTk1LjM0NCAzMjkuMTM0UTE5Ny41OTEgMzMwLjI4NSAxOTguOTM0IDMzMi4zNFEyMDAuMjc2IDMzNC4zOTUgMjAwLjM4NiAzMzYuOTcxVjM0Ni41MDZRMjAwLjI3NiAzNDkuMTM2IDE5OC45MzQgMzUxLjE2NFExOTcuNTkxIDM1My4xOTIgMTk1LjM0NCAzNTQuMzdRMTkzLjA5OCAzNTUuNTQ4IDE5MC4yNDggMzU1LjU0OFpNMTkxLjU2MyAzNDguOTE3UTE5NC41NzcgMzQ4LjkxNyAxOTYuNDQgMzQ2LjkxN1ExOTguMzA0IDM0NC45MTcgMTk4LjMwNCAzNDEuNzM4UTE5OC4zMDQgMzM5LjY1NiAxOTcuNDU0IDMzOC4wMzlRMTk2LjYwNSAzMzYuNDIzIDE5NS4wOTggMzM1LjUxOVExOTMuNTkxIDMzNC42MTQgMTkxLjU2MyAzMzQuNjE0UTE4OS41OSAzMzQuNjE0IDE4OC4wODMgMzM1LjUxOVExODYuNTc2IDMzNi40MjMgMTg1LjcyNyAzMzguMDM5UTE4NC44NzggMzM5LjY1NiAxODQuODc4IDM0MS43MzhRMTg0Ljg3OCAzNDMuODc2IDE4NS43MjcgMzQ1LjQ5MlExODYuNTc2IDM0Ny4xMDkgMTg4LjA4MyAzNDguMDEzUTE4OS41OSAzNDguOTE3IDE5MS41NjMgMzQ4LjkxN1pNMTk3LjkyIDM1NVYzNDcuODc2TDE5OS4wNzEgMzQxLjQxTDE5Ny45MiAzMzUuMDUzVjMyOC41MzJIMjA1LjA0NFYzNTVaIE0yMTEuOTc4IDM1NVYzMTUuMzhIMjE5LjE1N1YzNTVaIE0yMjcuNzQ2IDM1NVYzMTYuNDc2SDIzNS4xOThWMzU1Wk0yNTEuOTEyIDM1NVYzMTYuNDc2SDI1OS4zNjVWMzU1Wk0yMzIuNDU4IDMzOC4zOTZWMzMxLjgySDI1My45OTVWMzM4LjM5NlogTTI4MS4wMTggMzU1LjU0OFEyNzcuMDE4IDM1NS41NDggMjczLjgxMiAzNTMuNzEyUTI3MC42MDYgMzUxLjg3NiAyNjguNzE1IDM0OC43MjVRMjY2LjgyNSAzNDUuNTc0IDI2Ni44MjUgMzQxLjY4NFEyNjYuODI1IDMzNy43OTMgMjY4LjY4OCAzMzQuNjk3UTI3MC41NTEgMzMxLjYgMjczLjc4NCAzMjkuNzY1UTI3Ny4wMTggMzI3LjkyOSAyODAuOTYzIDMyNy45MjlRMjg1LjAxOCAzMjcuOTI5IDI4OC4yMjQgMzI5Ljc2NVEyOTEuNDMgMzMxLjYgMjkzLjI5MyAzMzQuNjk3UTI5NS4xNTYgMzM3Ljc5MyAyOTUuMTU2IDM0MS42ODRRMjk1LjE1NiAzNDUuNTc0IDI5My4yOTMgMzQ4LjcyNVEyOTEuNDMgMzUxLjg3NiAyODguMjI0IDM1My43MTJRMjg1LjAxOCAzNTUuNTQ4IDI4MS4wMTggMzU1LjU0OFpNMjgwLjk2MyAzNDguODYyUTI4Mi45OTEgMzQ4Ljg2MiAyODQuNTUzIDM0Ny45NThRMjg2LjExNCAzNDcuMDU0IDI4Ni45NjQgMzQ1LjQzN1EyODcuODEzIDM0My44MjEgMjg3LjgxMyAzNDEuNzM4UTI4Ny44MTMgMzM5LjY1NiAyODYuOTM2IDMzOC4wNjdRMjg2LjA2IDMzNi40NzggMjg0LjUyNSAzMzUuNTczUTI4Mi45OTEgMzM0LjY2OSAyODAuOTYzIDMzNC42NjlRMjc4Ljk5IDMzNC42NjkgMjc3LjQ1NiAzMzUuNTczUTI3NS45MjIgMzM2LjQ3OCAyNzUuMDQ1IDMzOC4wNjdRMjc0LjE2OCAzMzkuNjU2IDI3NC4xNjggMzQxLjczOFEyNzQuMTY4IDM0My44MjEgMjc1LjA0NSAzNDUuNDM3UTI3NS45MjIgMzQ3LjA1NCAyNzcuNDU2IDM0Ny45NThRMjc4Ljk5IDM0OC44NjIgMjgwLjk2MyAzNDguODYyWiBNMjk3Ljk3OCAzNTVWMzE1LjM4SDMwNS4xNTdWMzU1WiBNMzExLjk3OCAzNTVWMzI4LjUzMkgzMTkuMjEyVjM1NVpNMzE1LjU5NSAzMjQuMjU3UTMxMy44NDIgMzI0LjI1NyAzMTIuNjkxIDMyMy4wNzlRMzExLjU0IDMyMS45MDEgMzExLjU0IDMyMC4xNDdRMzExLjU0IDMxOC40NDggMzEyLjY5MSAzMTcuMjQzUTMxMy44NDIgMzE2LjAzNyAzMTUuNTk1IDMxNi4wMzdRMzE3LjQwNCAzMTYuMDM3IDMxOC41MjcgMzE3LjI0M1EzMTkuNjUgMzE4LjQ0OCAzMTkuNjUgMzIwLjE0N1EzMTkuNjUgMzIxLjkwMSAzMTguNTI3IDMyMy4wNzlRMzE3LjQwNCAzMjQuMjU3IDMxNS41OTUgMzI0LjI1N1ogTTMzNi4zNTggMzU1LjU0OFEzMzIuNjg2IDM1NS41NDggMzI5Ljc4MiAzNTMuNzRRMzI2Ljg3NyAzNTEuOTMxIDMyNS4yMDYgMzQ4LjgwOFEzMjMuNTM0IDM0NS42ODQgMzIzLjUzNCAzNDEuNzkzUTMyMy41MzQgMzM3Ljg0OCAzMjUuMjA2IDMzNC43MjRRMzI2Ljg3NyAzMzEuNiAzMjkuNzU0IDMyOS43OTJRMzMyLjYzMSAzMjcuOTg0IDMzNi4zNTggMzI3Ljk4NFEzMzkuMjA3IDMyNy45ODQgMzQxLjQ4MSAzMjkuMTM0UTM0My43NTYgMzMwLjI4NSAzNDUuMTUzIDMzMi4zNFEzNDYuNTUgMzM0LjM5NSAzNDYuNjYgMzM2Ljk3MVYzNDYuMzk2UTM0Ni41NSAzNDguOTcyIDM0NS4xOCAzNTEuMDU0UTM0My44MSAzNTMuMTM3IDM0MS41MDkgMzU0LjM0MlEzMzkuMjA3IDM1NS41NDggMzM2LjM1OCAzNTUuNTQ4Wk0zMzcuNTYzIDM0OC45MTdRMzM5LjU5MSAzNDguOTE3IDM0MS4wOTggMzQ4LjAxM1EzNDIuNjA1IDM0Ny4xMDkgMzQzLjQ1NCAzNDUuNDkyUTM0NC4zMDQgMzQzLjg3NiAzNDQuMzA0IDM0MS43MzhRMzQ0LjMwNCAzMzkuNjU2IDM0My40NTQgMzM4LjAzOVEzNDIuNjA1IDMzNi40MjMgMzQxLjA5OCAzMzUuNTE5UTMzOS41OTEgMzM0LjYxNCAzMzcuNjE4IDMzNC42MTRRMzM1LjU5IDMzNC42MTQgMzM0LjA4MyAzMzUuNTQ2UTMzMi41NzYgMzM2LjQ3OCAzMzEuNzI3IDMzOC4wNjdRMzMwLjg3OCAzMzkuNjU2IDMzMC44NzggMzQxLjczOFEzMzAuODc4IDM0My44NzYgMzMxLjcyNyAzNDUuNDkyUTMzMi41NzYgMzQ3LjEwOSAzMzQuMTExIDM0OC4wMTNRMzM1LjY0NSAzNDguOTE3IDMzNy41NjMgMzQ4LjkxN1pNMzUxLjA0NCAzNTVIMzQzLjkyVjM0Ny44NzZMMzQ1LjA3MSAzNDEuNDFMMzQzLjg2NSAzMzUuMDUzVjMxNS4zOEgzNTEuMDQ0WiBNMzY4LjI0OCAzNTUuNTQ4UTM2NC42MzEgMzU1LjU0OCAzNjEuNzI3IDM1My43NFEzNTguODIyIDM1MS45MzEgMzU3LjE3OCAzNDguODA4UTM1NS41MzQgMzQ1LjY4NCAzNTUuNTM0IDM0MS43OTNRMzU1LjUzNCAzMzcuODQ4IDM1Ny4xNzggMzM0LjcyNFEzNTguODIyIDMzMS42IDM2MS43MjcgMzI5Ljc5MlEzNjQuNjMxIDMyNy45ODQgMzY4LjI0OCAzMjcuOTg0UTM3MS4wOTggMzI3Ljk4NCAzNzMuMzQ0IDMyOS4xMzRRMzc1LjU5MSAzMzAuMjg1IDM3Ni45MzQgMzMyLjM0UTM3OC4yNzYgMzM0LjM5NSAzNzguMzg2IDMzNi45NzFWMzQ2LjUwNlEzNzguMjc2IDM0OS4xMzYgMzc2LjkzNCAzNTEuMTY0UTM3NS41OTEgMzUzLjE5MiAzNzMuMzQ0IDM1NC4zN1EzNzEuMDk4IDM1NS41NDggMzY4LjI0OCAzNTUuNTQ4Wk0zNjkuNTYzIDM0OC45MTdRMzcyLjU3NyAzNDguOTE3IDM3NC40NCAzNDYuOTE3UTM3Ni4zMDQgMzQ0LjkxNyAzNzYuMzA0IDM0MS43MzhRMzc2LjMwNCAzMzkuNjU2IDM3NS40NTQgMzM4LjAzOVEzNzQuNjA1IDMzNi40MjMgMzczLjA5OCAzMzUuNTE5UTM3MS41OTEgMzM0LjYxNCAzNjkuNTYzIDMzNC42MTRRMzY3LjU5IDMzNC42MTQgMzY2LjA4MyAzMzUuNTE5UTM2NC41NzYgMzM2LjQyMyAzNjMuNzI3IDMzOC4wMzlRMzYyLjg3OCAzMzkuNjU2IDM2Mi44NzggMzQxLjczOFEzNjIuODc4IDM0My44NzYgMzYzLjcyNyAzNDUuNDkyUTM2NC41NzYgMzQ3LjEwOSAzNjYuMDgzIDM0OC4wMTNRMzY3LjU5IDM0OC45MTcgMzY5LjU2MyAzNDguOTE3Wk0zNzUuOTIgMzU1VjM0Ny44NzZMMzc3LjA3MSAzNDEuNDFMMzc1LjkyIDMzNS4wNTNWMzI4LjUzMkgzODMuMDQ0VjM1NVogTTM5OC43MDggMzU1LjIxOSAzODcuNjM4IDMyOC41MzJIMzk1LjQyTDQwMi43NjMgMzQ4LjkxN0g0MDAuMTMzTDQwNy43NSAzMjguNTMySDQxNS41ODZMNDAzLjgwNCAzNTUuMjE5Wk0zOTEuMzY1IDM2Ni4wNyAzOTkuNDIgMzQ5LjAyNyA0MDMuODA0IDM1NS4yMTkgMzk4Ljk4MiAzNjYuMDdaIE00MjUuNjc1IDM1NS42MDNRNDIzLjQyOCAzNTUuNjAzIDQyMS4yNjQgMzU1UTQxOS4wOTkgMzU0LjM5NyA0MTcuMjkxIDM1My4zMjlRNDE1LjQ4MiAzNTIuMjYgNDE0LjE2NyAzNTAuNzI2TDQxOC40NDIgMzQ2LjM5NlE0MTkuODEyIDM0Ny45MzEgNDIxLjYyIDM0OC42OThRNDIzLjQyOCAzNDkuNDY1IDQyNS42MiAzNDkuNDY1UTQyNy4zNzQgMzQ5LjQ2NSA0MjguMjc4IDM0OC45NzJRNDI5LjE4MiAzNDguNDc5IDQyOS4xODIgMzQ3LjQ5MlE0MjkuMTgyIDM0Ni4zOTYgNDI4LjIyMyAzNDUuNzk0UTQyNy4yNjQgMzQ1LjE5MSA0MjUuNzMgMzQ0Ljc4UTQyNC4xOTYgMzQ0LjM2OSA0MjIuNTI0IDM0My44NDhRNDIwLjg1MyAzNDMuMzI4IDQxOS4zMTggMzQyLjQ3OFE0MTcuNzg0IDM0MS42MjkgNDE2LjgyNSAzNDAuMTIyUTQxNS44NjYgMzM4LjYxNSA0MTUuODY2IDMzNi4yMDRRNDE1Ljg2NiAzMzMuNjgzIDQxNy4wOTkgMzMxLjgyUTQxOC4zMzIgMzI5Ljk1NiA0MjAuNjM0IDMyOC45MTVRNDIyLjkzNSAzMjcuODc0IDQyNi4wNTkgMzI3Ljg3NFE0MjkuMzQ3IDMyNy44NzQgNDMyLjAwNSAzMjkuMDI1UTQzNC42NjIgMzMwLjE3NiA0MzYuNDE2IDMzMi40NzdMNDMyLjA4NyAzMzYuODA2UTQzMC44ODEgMzM1LjMyNyA0MjkuMzc0IDMzNC42NjlRNDI3Ljg2NyAzMzQuMDEyIDQyNi4xMTQgMzM0LjAxMlE0MjQuNTI0IDMzNC4wMTIgNDIzLjY3NSAzMzQuNTA1UTQyMi44MjYgMzM0Ljk5OCA0MjIuODI2IDMzNS44NzVRNDIyLjgyNiAzMzYuODYxIDQyMy43ODUgMzM3LjQwOVE0MjQuNzQ0IDMzNy45NTcgNDI2LjI3OCAzMzguMzY4UTQyNy44MTIgMzM4Ljc3OSA0MjkuNDg0IDMzOS4zUTQzMS4xNTUgMzM5LjgyIDQzMi42NjIgMzQwLjc1MlE0MzQuMTY5IDM0MS42ODQgNDM1LjEyOCAzNDMuMjE4UTQzNi4wODcgMzQ0Ljc1MiA0MzYuMDg3IDM0Ny4xNjRRNDM2LjA4NyAzNTEuMDU0IDQzMy4yOTIgMzUzLjMyOVE0MzAuNDk4IDM1NS42MDMgNDI1LjY3NSAzNTUuNjAzWiIvPgogICAgPHBhdGggZD0iTTE2My40NTkgMzg1LjVWMzcyLjA2SDE2NC45OTVMMTcwLjU4MiAzODEuMjU3SDE2OS41ODRMMTc1LjE3MSAzNzIuMDZIMTc2LjcwN1YzODUuNUgxNzQuNDk5VjM3NS45MzhMMTc0Ljk5OCAzNzYuMDczTDE3MC44NTEgMzgyLjg4OUgxNjkuMzE1TDE2NS4xNjggMzc2LjA3M0wxNjUuNjY3IDM3NS45MzhWMzg1LjVaIE0xODAuNDYxIDM4NS41IDE4NS45OSAzNzIuMDZIMTg3LjUyNkwxOTMuMDE4IDM4NS41SDE5MC42MzdMMTg2LjMzNiAzNzQuNjE0SDE4Ny4xNDJMMTgyLjgwMyAzODUuNVpNMTgzLjE4NyAzODIuOTA4VjM4MC45ODhIMTkwLjMxVjM4Mi45MDhaIE0yMDMuOTgxIDM4NS41IDE5Ny43NiAzNzguNDkyIDIwMy44NDYgMzcyLjA2SDIwNi42NjlMMTk5Ljk0OSAzNzkuMDQ5VjM3Ny44MzlMMjA2Ljg2MSAzODUuNVpNMTk1Ljg1OSAzODUuNVYzNzIuMDZIMTk4LjA2N1YzODUuNVogTTIwOC44NTkgMzg1LjVWMzcyLjA2SDIxMS4wNjdWMzg1LjVaTTIxMC4zNzYgMzg1LjVWMzgzLjQ4NEgyMTcuOTAyVjM4NS41Wk0yMTAuMzc2IDM3OS42MDZWMzc3LjY2NkgyMTcuMjVWMzc5LjYwNlpNMjEwLjM3NiAzNzQuMDc2VjM3Mi4wNkgyMTcuODA2VjM3NC4wNzZaIE0yMjQuNDAzIDM4NS42OTJRMjIyLjgxIDM4NS42OTIgMjIxLjY5NiAzODUuMTE2UTIyMC41ODIgMzg0LjU0IDIxOS42OTkgMzgzLjQyNkwyMjEuMTk3IDM4MS45MjlRMjIxLjc1NCAzODIuNzM1IDIyMi41MjIgMzgzLjE4NlEyMjMuMjkgMzgzLjYzOCAyMjQuNDggMzgzLjYzOFEyMjUuNTk0IDM4My42MzggMjI2LjI1NiAzODMuMTc3UTIyNi45MTggMzgyLjcxNiAyMjYuOTE4IDM4MS45MVEyMjYuOTE4IDM4MS4yMzggMjI2LjU3MyAzODAuODE1UTIyNi4yMjcgMzgwLjM5MyAyMjUuNjYxIDM4MC4xMTRRMjI1LjA5NCAzNzkuODM2IDIyNC40MTMgMzc5LjYxNVEyMjMuNzMxIDM3OS4zOTQgMjIzLjA1IDM3OS4xMTZRMjIyLjM2OCAzNzguODM4IDIyMS44MDIgMzc4LjQxNVEyMjEuMjM1IDM3Ny45OTMgMjIwLjg5IDM3Ny4zMjFRMjIwLjU0NCAzNzYuNjQ5IDIyMC41NDQgMzc1LjYxMlEyMjAuNTQ0IDM3NC40MjIgMjIxLjEzIDM3My41ODZRMjIxLjcxNSAzNzIuNzUxIDIyMi43MTQgMzcyLjMxUTIyMy43MTIgMzcxLjg2OCAyMjQuOTQxIDM3MS44NjhRMjI2LjI2NiAzNzEuODY4IDIyNy4zMTIgMzcyLjM4NlEyMjguMzU4IDM3Mi45MDUgMjI5LjAxMSAzNzMuNzExTDIyNy41MTQgMzc1LjIwOVEyMjYuOTM4IDM3NC41NTYgMjI2LjMxNCAzNzQuMjM5UTIyNS42OSAzNzMuOTIyIDIyNC44ODMgMzczLjkyMlEyMjMuODg1IDM3My45MjIgMjIzLjMxOCAzNzQuMzI2UTIyMi43NTIgMzc0LjcyOSAyMjIuNzUyIDM3NS40NThRMjIyLjc1MiAzNzYuMDczIDIyMy4wOTggMzc2LjQ0N1EyMjMuNDQzIDM3Ni44MjIgMjI0LjAxIDM3Ny4wODFRMjI0LjU3NiAzNzcuMzQgMjI1LjI1OCAzNzcuNTdRMjI1LjkzOSAzNzcuODAxIDIyNi42MjEgMzc4LjA4OVEyMjcuMzAyIDM3OC4zNzcgMjI3Ljg2OSAzNzguODI4UTIyOC40MzUgMzc5LjI3OSAyMjguNzgxIDM3OS45OVEyMjkuMTI2IDM4MC43IDIyOS4xMjYgMzgxLjc3NVEyMjkuMTI2IDM4My41OCAyMjcuODUgMzg0LjYzNlEyMjYuNTczIDM4NS42OTIgMjI0LjQwMyAzODUuNjkyWiBNMjM4LjQ1OSAzODUuNVYzNzIuMDZIMjM5Ljk5NUwyNDUuNTgyIDM4MS4yNTdIMjQ0LjU4NEwyNTAuMTcxIDM3Mi4wNkgyNTEuNzA3VjM4NS41SDI0OS40OTlWMzc1LjkzOEwyNDkuOTk4IDM3Ni4wNzNMMjQ1Ljg1MSAzODIuODg5SDI0NC4zMTVMMjQwLjE2OCAzNzYuMDczTDI0MC42NjcgMzc1LjkzOFYzODUuNVogTTI1NS44NTkgMzg1LjVWMzcyLjA2SDI1OC4wNjdWMzg1LjVaTTI1Ny4zNzYgMzg1LjVWMzgzLjQ4NEgyNjQuOTAyVjM4NS41Wk0yNTcuMzc2IDM3OS42MDZWMzc3LjY2NkgyNjQuMjVWMzc5LjYwNlpNMjU3LjM3NiAzNzQuMDc2VjM3Mi4wNkgyNjQuODA2VjM3NC4wNzZaIE0yNzQuNjU5IDM4NS41VjM3Mi4wNkgyNzYuODY3VjM4NS41Wk0yODMuMjAzIDM4NS41VjM3Mi4wNkgyODUuNDExVjM4NS41Wk0yNzYuMTc2IDM3OS41NDhWMzc3LjUzMkgyODMuNjgzVjM3OS41NDhaIE0yODguNDYxIDM4NS41IDI5My45OSAzNzIuMDZIMjk1LjUyNkwzMDEuMDE4IDM4NS41SDI5OC42MzdMMjk0LjMzNiAzNzQuNjE0SDI5NS4xNDJMMjkwLjgwMyAzODUuNVpNMjkxLjE4NyAzODIuOTA4VjM4MC45ODhIMjk4LjMxVjM4Mi45MDhaIE0zMDUuMzc2IDM4MC40MzFWMzc4LjUxMUgzMDguNzM2UTMwOS40MjcgMzc4LjUxMSAzMDkuOTU1IDM3OC4yMzNRMzEwLjQ4MyAzNzcuOTU0IDMxMC43OSAzNzcuNDQ2UTMxMS4wOTggMzc2LjkzNyAzMTEuMDk4IDM3Ni4yNDZRMzExLjA5OCAzNzUuNTU0IDMxMC43OSAzNzUuMDQ2UTMxMC40ODMgMzc0LjUzNyAzMDkuOTU1IDM3NC4yNThRMzA5LjQyNyAzNzMuOTggMzA4LjczNiAzNzMuOThIMzA1LjM3NlYzNzIuMDZIMzA4Ljg1MVEzMTAuMTE4IDM3Mi4wNiAzMTEuMTI2IDM3Mi41NzhRMzEyLjEzNCAzNzMuMDk3IDMxMi43MiAzNzQuMDM4UTMxMy4zMDYgMzc0Ljk3OCAzMTMuMzA2IDM3Ni4yNDZRMzEzLjMwNiAzNzcuNTEzIDMxMi43MiAzNzguNDU0UTMxMi4xMzQgMzc5LjM5NCAzMTEuMTI2IDM3OS45MTNRMzEwLjExOCAzODAuNDMxIDMwOC44NTEgMzgwLjQzMVpNMzAzLjg1OSAzODUuNVYzNzIuMDZIMzA2LjA2N1YzODUuNVogTTMxNy4zNzYgMzgwLjQzMVYzNzguNTExSDMyMC43MzZRMzIxLjQyNyAzNzguNTExIDMyMS45NTUgMzc4LjIzM1EzMjIuNDgzIDM3Ny45NTQgMzIyLjc5IDM3Ny40NDZRMzIzLjA5OCAzNzYuOTM3IDMyMy4wOTggMzc2LjI0NlEzMjMuMDk4IDM3NS41NTQgMzIyLjc5IDM3NS4wNDZRMzIyLjQ4MyAzNzQuNTM3IDMyMS45NTUgMzc0LjI1OFEzMjEuNDI3IDM3My45OCAzMjAuNzM2IDM3My45OEgzMTcuMzc2VjM3Mi4wNkgzMjAuODUxUTMyMi4xMTggMzcyLjA2IDMyMy4xMjYgMzcyLjU3OFEzMjQuMTM0IDM3My4wOTcgMzI0LjcyIDM3NC4wMzhRMzI1LjMwNiAzNzQuOTc4IDMyNS4zMDYgMzc2LjI0NlEzMjUuMzA2IDM3Ny41MTMgMzI0LjcyIDM3OC40NTRRMzI0LjEzNCAzNzkuMzk0IDMyMy4xMjYgMzc5LjkxM1EzMjIuMTE4IDM4MC40MzEgMzIwLjg1MSAzODAuNDMxWk0zMTUuODU5IDM4NS41VjM3Mi4wNkgzMTguMDY3VjM4NS41WiBNMzMxLjQ2NCAzODAuMTI0IDMyNi4yMjIgMzcyLjA2SDMyOC43NzZMMzMyLjg2NiAzNzguNDkySDMzMS42NzVMMzM1Ljc2NSAzNzIuMDZIMzM4LjI4TDMzMyAzODAuMTI0Wk0zMzEuMTU3IDM4NS41VjM3OC43NDJIMzMzLjM2NVYzODUuNVoiLz4KICA8L2c+Cjwvc3ZnPgo=" alt="Rental Holidays" class="contract-logo" />
        </div>
        <div class="header-date" contenteditable="true" data-section="fecha-encabezado">
          ${fechaEncabezado}
        </div>
      </div>

      <div class="contract-title" contenteditable="true">
        CONTRATO DE MEDIACIÓN ALQUILER VACACIONAL
      </div>

      <!-- COMPARECEN -->
      <div class="legal-section-title" contenteditable="true">COMPARECEN</div>
      <div class="legal-paragraph" contenteditable="true" data-section="comparecen">
        De una parte, <strong>Don/Dña <span class="data-field" data-bind="nombrePropietario">${prop.nombre || '___________________________'}</span></strong> mayor de edad, con NIF <strong><span class="data-field" data-bind="nifPropietario">${prop.nif || '___________'}</span></strong> y domicilio en <strong><span class="data-field" data-bind="domicilioPropietario">${prop.domicilio || '___________________________'}</span></strong> CP <strong><span class="data-field" data-bind="cpPropietario">${prop.cp || '_____'}</span></strong>, en adelante <strong>LA PROPIEDAD</strong>.
      </div>
      <div class="legal-paragraph" contenteditable="true">
        Y, de otra parte, <strong>RENTAL HOLIDAYS EXPERIENCE, S.L.</strong> con CIF B12698940, con domicilio social en Ronda circunvalación, 188, 12003, de Castellón, representada por Francisco Alhambra Fuset, con NIF 18975598T, en adelante <strong>EL MEDIADOR</strong>.
      </div>

      <!-- EXPONEN -->
      <div class="legal-section-title" contenteditable="true">EXPONEN</div>
      <div class="legal-paragraph" data-section="exponen-1">
        <strong>I.-</strong> Que D. <strong><span class="data-field" data-bind="nombrePropietario">${escapeHtml(prop.nombre) || "___________________________"}</span></strong> es propietario en pleno dominio de la/s vivienda/s vacacional/es, que se reseña/n a continuación, completamente amuebladas y equipadas al efecto:
      </div>
      <div class="legal-paragraph indent-paragraph" contenteditable="true" data-section="inmueble-detalle">
        <strong>1ª.-</strong> <span class="data-field" data-bind="descripcionVivienda">${prop.descripcion || '___________________________'}</span>, en el municipio de <strong><span class="data-field" data-bind="municipioInmueble">${prop.municipio || '___________'}</span></strong>. Con Registro de vivienda Turística <strong><span class="data-field" data-bind="refInmueble">${prop.registro || '___________'}</span></strong>.
      </div>
      <div class="legal-paragraph" contenteditable="true">
        <strong>II.-</strong> Que la/s citada/s vivienda/s se hallan libres de ocupantes o arrendatarios, de cualquier carga o gravámenes y al corriente en el pago de impuestos y arbitrios que gravan las mismas.
      </div>
      <div class="legal-paragraph" contenteditable="true">
        <strong>III.-</strong> Que LA PROPIEDAD desea arrendar el inmueble descrito en el expositivo I y EL MEDIADOR, que está interesado en realizar los servicios de mediación inmobiliaria con el fin de encontrar las personas físicas o jurídicas interesadas en arrendar el citado inmueble vacacional, convienen el presente contrato de mediación inmobiliaria en base a los siguientes.
      </div>
      <div class="legal-paragraph highlight-clause" contenteditable="true">
        LA PROPIEDAD podrá resolver el presente contrato en caso de venta del inmueble, sin tener que pagar ningún tipo de indemnización, comunicándolo al MEDIADOR con un preaviso de 60 días para poder gestionar las reservas previamente establecidas.
      </div>

      <div class="page-break-hint"><span>--- Fin de Sección Preliminar ---</span></div>

      <!-- CLÁUSULAS -->
      <div class="legal-section-title centered-title starts-new-page" contenteditable="true">CLÁUSULAS</div>

      <!-- 1. AUTORIZACIÓN Y DURACIÓN -->
      <div class="clause-item" id="clause-1">
        <h4 class="clause-title" contenteditable="true">1. AUTORIZACIÓN Y DURACIÓN DEL CONTRATO</h4>
        <div class="legal-paragraph" contenteditable="true" data-section="clausula-1-p1">
          ${clausula1P1}
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Los arrendamientos que se realicen como consecuencia de la captación de los clientes interesados en la finca objeto del presente contrato serán única y exclusivamente de temporada, siéndoles de aplicación lo dispuesto en los artículos 3, párrafo 2, y 5.e) de la ley 29/1994 de Arrendamientos Urbanos y en el Código Civil, así como la normativa autonómica reguladora de las viviendas turísticas denominadas apartamentos, villas, chalés, bungalows y similares, y de las empresas gestoras, personas jurídicas o físicas, dedicadas a la cesión de su uso y disfrute, en el ámbito territorial de cada Comunidad Autónoma.
        </div>
      </div>

      <!-- 2. SERVICIOS DEL MEDIADOR -->
      <div class="clause-item" id="clause-2">
        <h4 class="clause-title" contenteditable="true">2. SERVICIOS DEL MEDIADOR</h4>
        <div class="legal-paragraph" contenteditable="true">
          Los servicios realizados por EL MEDIADOR son los siguientes:
        </div>
        <ul class="legal-list" contenteditable="true">
          <li><strong>a)</strong> Visitar el inmueble, presentando una descripción detallada del mismo, que incluirá fotografías interiores y exteriores, presentando una propuesta de precios para las distintas temporadas.</li>
          <li><strong>b)</strong> Presentación del inmueble dentro de la oferta comercial del MEDIADOR: inclusión en su página web <em>www.rentalholidays.es</em> y en el plan de marketing y venta realizados por EL MEDIADOR, tales como mailings, anuncios, colaboración con otras agencias y en especial en las plataformas colaborativas.</li>
          <li><strong>c)</strong> Gestión de reservas: pre-reservas, confirmación de reserva con envío de documentación, gestión de los calendarios de ocupaciones, organización de entradas y salidas, avisos e instrucciones al personal de limpieza y mantenimiento, entrega de llaves, gestión de pagos. EL MEDIADOR gestionará las reservas en nombre del PROPIETARIO y realizará todas las gestiones necesarias con el fin de que la estancia del inquilino tenga buen fin.</li>
          <li><strong>d)</strong> Atención al cliente en la oficina de EL MEDIADOR.</li>
          <li><strong>e)</strong> Intermediación entre las partes contratantes: propietario, cliente/inquilino, personal de servicio.</li>
          <li><strong>f)</strong> Los demás servicios como el de limpieza y mantenimiento de la vivienda también forman parte de este contrato.</li>
        </ul>
      </div>

      <!-- 3. OBLIGACIONES Y RESPONSABILIDADES -->
      <div class="clause-item" id="clause-3">
        <h4 class="clause-title" contenteditable="true">3. OBLIGACIONES Y RESPONSABILIDADES DE LA PROPIEDAD</h4>
        <div class="legal-paragraph" contenteditable="true">
          Atender a los requerimientos de EL MEDIADOR en temas de inventario, limpieza y preparación en general de la vivienda.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Mantenimiento y conservación tanto de los jardines del inmueble como de la piscina, si la tuviere, que deberán mantenerse en perfecto estado de uso y conservación. Todas las obras de conservación, mantenimiento y mejora de la vivienda, debiendo atender cualquier reparación necesaria. La sustitución y reposición de inventario.
        </div>
        <div class="legal-paragraph" contenteditable="true" data-section="clausula-3-compromiso">
          ${compromisoSemanas}
        </div>
        <div class="legal-paragraph" contenteditable="true">
          <strong>Obligaciones del propietario en relación con la protección de datos:</strong> Deberá cooperar con RENTAL HOLIDAYS en relación con el cumplimiento de las leyes de protección de datos, debiendo garantizar que los datos personales facilitados por RENTAL HOLIDAYS se procesen con la seguridad suficiente, incluida la protección contra el procesamiento no autorizado o ilegal y contra la pérdida, destrucción o daño accidental, y que los datos personales sólo se conservan durante el período de tiempo legalmente necesario.
        </div>
      </div>

      <!-- 4. DEDUCCIONES DE LOS ALQUILERES -->
      <div class="clause-item" id="clause-4">
        <h4 class="clause-title" contenteditable="true">4. DEDUCCIONES DE LOS ALQUILERES</h4>
        <div class="legal-paragraph" contenteditable="true">
          EL MEDIADOR tendrá derecho a deducir de los alquileres debidos a LA PROPIEDAD:
        </div>
        <div class="legal-paragraph indent-paragraph" contenteditable="true">
          <strong>A)</strong> Atención técnica al inmueble por personal del MEDIADOR o, en su caso, de una empresa de servicio, en el caso de que LA PROPIEDAD no pueda cumplir lo previsto en el apartado 3 del presente Contrato.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Devoluciones, compensaciones e indemnizaciones a clientes cuando la vivienda presente defectos que den lugar a una reclamación justificada por parte del cliente al inicio de la colaboración, incluso los costes de pernoctación en alojamientos alternativos, en caso de defectos graves que causen que el inmueble no pueda ser utilizado como vivienda vacacional.
        </div>
      </div>

      <!-- 5. GESTIÓN DE RESERVAS -->
      <div class="clause-item" id="clause-5">
        <h4 class="clause-title" contenteditable="true">5. GESTIÓN DE RESERVAS</h4>
        <div class="legal-paragraph" contenteditable="true">
          LA PROPIEDAD concede AL MEDIADOR la EXCLUSIVIDAD de este contrato de mediación reserva. EL MEDIADOR comunicará a LA PROPIEDAD todas las reservas confirmadas en el instante de la confirmación.
        </div>
      </div>

      <!-- 6. COMPETENCIA Y CONFIDENCIALIDAD -->
      <div class="clause-item" id="clause-6">
        <h4 class="clause-title" contenteditable="true">6. COMPETENCIA Y CONFIDENCIALIDAD</h4>
        <div class="legal-paragraph" contenteditable="true">
          LA PROPIEDAD se compromete a:
        </div>
        <ul class="legal-list bullet-list" contenteditable="true">
          <li>No ofrecer el inmueble/s objeto del presente contrato a otra agencia de intermediación de alquileres que ofrezca servicios similares AL MEDIADOR durante la duración del presente contrato.</li>
          <li>Tratar con confidencialidad los datos de los inquilinos y no hacer acuerdos directos con los clientes captados por EL MEDIADOR.</li>
        </ul>
      </div>

      <!-- 7. PRECIOS Y PAGO DEL ALQUILER -->
      <div class="clause-item" id="clause-7">
        <h4 class="clause-title" contenteditable="true">7. PRECIOS Y PAGO DEL ALQUILER</h4>
        <div class="legal-paragraph" contenteditable="true">
          Los precios acordados están recogidos en el cuadro de precios que forma parte del presente contrato. Este precio pagado A LA PROPIEDAD será el resultado de descontar al precio cobrado al inquilino final la comisión de gestión cobrada por EL MEDIADOR a LA PROPIEDAD. De forma que la tabla de precios adjunta como ANEXO I, contienen las cantidades netas que debe cobrar LA PROPIEDAD.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Una vez que el huésped haya llegado al alojamiento, el pago correspondiente será transferido a los propietarios en un plazo de 24 a 48 horas. La transferencia se llevará a cabo tras la confirmación de que el pago ha sido formalizado por parte del huésped y se han cumplido todas las condiciones de la reserva. El pago se efectuará utilizando el método previamente acordado entre las partes.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          En caso de que se realice una reserva de última hora el pago se realizará de 2 a 3 DÍAS después de que se realice la reserva.
        </div>
      </div>

      <!-- 8. INCUMPLIMIENTO DEL CONTRATO -->
      <div class="clause-item" id="clause-8">
        <h4 class="clause-title" contenteditable="true">8. INCUMPLIMIENTO DEL CONTRATO</h4>
        <div class="legal-paragraph" contenteditable="true">
          En caso de incumplimiento o de resolución anticipada por parte del PROPIETARIO, éste asumirá el coste del importe que supongan los realojos de las reservas existentes en el momento de la resolución. El importe del realojo será como mínimo el valor de venta de las reservas formalizadas hasta la fecha de fin de contrato.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Si como consecuencia del incumplimiento se produjeran gastos y perjuicios adicionales de cualquier clase para los arrendatarios o Rental Holidays, se establece un mínimo de <strong>400 €</strong> por dichos conceptos, tales como desplazamiento, gastos de gestión y publicación en la plataforma Rental Holidays. Y, en general todos los gastos derivados de la promoción del alojamiento. Si produjeran gastos y perjuicios adicionales, de cualquier clase, para los arrendatarios y Rental Holidays, los tendrá que asumir el propietario.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Además, se realizará un cargo al propietario en concepto de cambio de reserva/cancelación por importe de <strong>250,00 euros</strong> por cada cambio de reserva/cancelación que sea necesario realizar por el incumplimiento del contrato.
        </div>
      </div>

      <!-- 9. FIANZA, SEGURO, RESPONSABILIDAD CIVIL -->
      <div class="clause-item" id="clause-9">
        <h4 class="clause-title" contenteditable="true">9. FIANZA, SEGURO, RESPONSABILIDAD CIVIL</h4>
        <div class="legal-paragraph" contenteditable="true">
          <strong>Fianza:</strong> EL MEDIADOR se responsabilizará de los daños y perjuicios causados en la casa o en el inventario por culpa o negligente de los clientes, siempre que:
        </div>
        <ul class="legal-list bullet-list" contenteditable="true">
          <li><strong>Culpabilidad y negligencia:</strong> No se admitirán demandas de indemnización de objetos de inventario que se hayan roto por ser viejos o muy viejos, de ínfima calidad o por su uso continuado en el transcurso del tiempo. En este sentido, el mediador no reemplazará mobiliario o electrodomésticos, salvo en casos de comprobada culpabilidad o irresponsabilidad por parte del cliente/arrendatario.</li>
          <li>Se presentan facturas y/o recibos de la reparación o reposición. <strong>Seguro:</strong> LA PROPIEDAD debe tener contratado para la vivienda un seguro de hogar ampliado al régimen de alquiler.</li>
          <li>La responsabilidad civil para el caso de que el cliente/arrendatario sufra daños y perjuicios en la vivienda, su jardín o la piscina.</li>
          <li>EL MEDIADOR se compromete a devolver la PROPIEDAD en las mismas condiciones en las que fue entregada, salvo el desgaste natural derivado de su uso adecuado. En caso de que la Propiedad sea devuelta en condiciones mejores a las originales, ello será reconocido como un beneficio para el propietario.</li>
          <li>El MEDIADOR se compromete a notificar y, en su caso, asumir los costos de reparación por cualquier daño o deterioro que no se considere parte del desgaste natural, debiendo estos ser rectificados antes de la devolución de la Propiedad.</li>
          <li>Una inspección conjunta será realizada al inicio y al final del contrato, dejando constancia por escrito de las condiciones de la Propiedad en ambas fechas.</li>
        </ul>
      </div>

      <!-- 10. POLÍTICA DE PRIVACIDAD -->
      <div class="clause-item" id="clause-10">
        <h4 class="clause-title" contenteditable="true">10. POLÍTICA DE PRIVACIDAD</h4>
        <div class="legal-paragraph" contenteditable="true">
          El propietario autoriza el tratamiento de los datos personales suministrados únicamente para el envío de ofertas, novedades e información acerca de nuestra empresa y sus alojamientos, que no podrán ser cedidos, vendidos o alquilados a terceros.
        </div>
      </div>

      <!-- 11. LEGISLACIÓN -->
      <div class="clause-item" id="clause-11">
        <h4 class="clause-title" contenteditable="true">11. LEGISLACIÓN</h4>
        <div class="legal-paragraph" contenteditable="true">
          Para lo no previsto en el presente contrato se estará a lo dispuesto en los artículos 3, párrafo 2º, y 5.e de la Ley 29/1994, de Arrendamiento Urbanos, y el Código Civil, así como en la normativa autonómica aprobada por el Decreto 92/2009, de 3 de Julio, del Consell, regulador de las viviendas turísticas denominadas apartamentos, villas, chalés, bungalows y similares, y de las empresas gestoras, personas jurídicas o físicas, dedicadas a la cesión de su uso y disfrute, en el ámbito de la Comunidad Valenciana.
        </div>
        <div class="legal-paragraph" contenteditable="true">
          Las partes con renuncia a su fuero propio se someten a los Juzgados y Tribunales del lugar donde se halle la finca o inmueble objeto del presente contrato.
        </div>
      </div>

      <!-- CLÁUSULA ESPECIAL -->
      <div class="special-clause-box">
        <div class="special-clause-title" contenteditable="true">CLÁUSULA ESPECIAL</div>
        <div class="special-clause-content" id="textoClausulaEspecialContrato" contenteditable="true">${prop.clausula}</div>
      </div>

      <!-- CIERRE Y FIRMAS -->
      <div class="closing-paragraph" contenteditable="true">
        Y en prueba de conformidad, firman el presente por duplicado ejemplar y a un solo fin, en el lugar y fecha al principio indicados.
      </div>

      <div class="signatures-wrapper">
        <div class="signature-column">
          <div class="sig-title">LA PROPIEDAD:</div>
          <div class="signature-slot" id="slotFirmaPropietario"></div>
          <div class="sig-line"></div>
          <div class="sig-name">
            Fdo: <strong><span class="data-field" data-bind="nombrePropietario">${prop.nombre || 'LA PROPIEDAD'}</span></strong>
          </div>
        </div>

        <div class="signature-column">
          <div class="sig-title">EL MEDIADOR:</div>
          <div class="signature-slot"></div>
          <div class="sig-line"></div>
          <div class="sig-name" contenteditable="true">
            Fdo: <strong>RENTAL HOLIDAYS<br>EXPERIENCE, S.L.</strong>
          </div>
        </div>
      </div>

      <!-- ANEXO I: CUADRO DE PRECIOS (se regenera desde la configuración) -->
      <div id="anexoIPrecios" class="${anexoI ? 'anexo-section' : ''}">${anexoI}</div>
    `;
  }
};
