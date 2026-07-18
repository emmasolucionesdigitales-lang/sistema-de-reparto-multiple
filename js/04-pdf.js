// ════════════════════════════════════════════════════════════════════
// ◆  04-pdf.js — Generación PDF · usarInformes · PantallaElegirTema · Cargando
// ════════════════════════════════════════════════════════════════════

const AZUL = [24, 95, 165];
const AZUL_CLAR = [214, 228, 240];
const GRIS = [245, 245, 245];
const NEGRO = [30, 30, 30];
function fmt2(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0
  });
}
function pdfHeader(doc, negocio, titulo, subtitulo) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Sistema de Reparto 2026 · Multi", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(negocio || "", 14, 17);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, W / 2, 10, {
    align: "center"
  });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(subtitulo || "", W / 2, 17, {
    align: "center"
  });
  doc.setTextColor(...NEGRO);
  return 35;
}
function pdfSeccion(doc, y, titulo) {
  doc.setFillColor(...AZUL_CLAR);
  doc.rect(10, y, doc.internal.pageSize.getWidth() - 20, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text(titulo, 14, y + 5);
  doc.setTextColor(...NEGRO);
  return y + 9;
}
function generarPDFDiario({
  ventas,
  clientes,
  planillas,
  noVisitas,
  productos,
  fecha,
  dia,
  negocio
}) {
  const {
    jsPDF
  } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  const W = doc.internal.pageSize.getWidth();
  const ventasDia = ventas.filter(v => v.fechaKey === fecha && v.dia === dia);
  const noVDia = (noVisitas || []).filter(v => v.fecha === fecha && v.dia === dia);
  const planilla = planillas[`${dia}_${fecha}`] || {};
  const gastos = planilla.gastos || [];
  const totalGastos = gastos.reduce((a, g) => a + (Number(g.monto) || 0), 0);

  // Totales
  const cobEf = ventasDia.reduce((a, v) => a + (v.pago === "contado" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoEfec) || 0 : 0), 0);
  const cobTr = ventasDia.reduce((a, v) => a + (v.pago === "transferencia" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoTrans) || 0 : 0), 0);
  const cobFi = ventasDia.filter(v => v.pago === "fiado").reduce((a, v) => a + (v.neto || 0), 0);
  const totalBruto = cobEf + cobTr + cobFi;
  const totalGan = ventasDia.reduce((a, v) => a + (v.ganancia || 0), 0);
  const efectivoNeto = cobEf - totalGastos;
  let y = pdfHeader(doc, negocio, `Informe Diario — ${dia}`, fecha);

  // Resumen financiero
  y = pdfSeccion(doc, y, "RESUMEN FINANCIERO");
  doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: GRIS
    },
    head: [["Concepto", "Monto"]],
    body: [["💵 Efectivo cobrado", fmt2(cobEf)], ["📲 Transferencias", fmt2(cobTr)], ["📝 Fiado", fmt2(cobFi)], ["📦 Total facturado", fmt2(totalBruto)], ["✅ Ganancia estimada", fmt2(totalGan)], ["🔧 Gastos del día", fmt2(totalGastos)], ["💰 Efectivo neto en mano", fmt2(efectivoNeto)]],
    columnStyles: {
      0: {
        cellWidth: 120
      },
      1: {
        cellWidth: 50,
        halign: "right"
      }
    }
  });
  y = doc.lastAutoTable.finalY + 6;

  // Detalle por cliente
  if (ventasDia.length > 0) {
    y = pdfSeccion(doc, y, `DETALLE POR CLIENTE (${ventasDia.length} entregas)`);
    const filas = ventasDia.map(v => {
      const prod = v.detalle.map(d => `${d.nombre} ×${d.cantidad}`).join(", ");
      return [v.cliente || "", prod, fmt2(v.neto), v.pago === "contado" ? "Efectivo" : v.pago === "transferencia" ? "Transfer." : v.pago === "mixto" ? "Mixto" : "Fiado", fmt2(v.pagadoNum || 0)];
    });
    doc.autoTable({
      startY: y,
      margin: {
        left: 10,
        right: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: AZUL,
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: GRIS
      },
      head: [["Cliente", "Productos", "Total", "Pago", "Pagado"]],
      body: filas,
      columnStyles: {
        0: {
          cellWidth: 42
        },
        1: {
          cellWidth: 62
        },
        2: {
          cellWidth: 22,
          halign: "right"
        },
        3: {
          cellWidth: 22,
          halign: "center"
        },
        4: {
          cellWidth: 22,
          halign: "right"
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // No visitados
  if (noVDia.length > 0) {
    y = pdfSeccion(doc, y, `NO VISITADOS (${noVDia.length})`);
    const cl = clientes.reduce((m, c) => {
      m[c.id] = c.nombre;
      return m;
    }, {});
    doc.autoTable({
      startY: y,
      margin: {
        left: 10,
        right: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5
      },
      headStyles: {
        fillColor: [180, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      head: [["Cliente", "Motivo"]],
      body: noVDia.map(v => [cl[v.clienteId] || "", v.motivo === "noesta" ? "No estaba" : v.motivo === "noquiso" ? "No quiso" : "—"]),
      columnStyles: {
        0: {
          cellWidth: 100
        },
        1: {
          cellWidth: 60
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Gastos
  if (gastos.length > 0) {
    y = pdfSeccion(doc, y, "GASTOS DEL DÍA");
    doc.autoTable({
      startY: y,
      margin: {
        left: 10,
        right: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5
      },
      headStyles: {
        fillColor: AZUL,
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: GRIS
      },
      head: [["Descripción", "Monto"]],
      body: [...gastos.map(g => [g.cat + (g.desc ? ` — ${g.desc}` : ""), fmt2(g.monto)]), ["TOTAL", fmt2(totalGastos)]],
      columnStyles: {
        0: {
          cellWidth: 130
        },
        1: {
          cellWidth: 30,
          halign: "right"
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Envases
  const envPrest = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    },
    envDev = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
  const pk = {
    "Sifón 1.5L": "sifon",
    "Bidón 10L": "bidon10",
    "Bidón 20L": "bidon20"
  };
  ventasDia.forEach(v => {
    (v.envPrest || []).forEach(e => {
      const k = pk[e.prod];
      if (k) envPrest[k] += Number(e.cant) || 0;
    });
    (v.envDev || []).forEach(e => {
      const k = pk[e.prod];
      if (k) envDev[k] += Number(e.cant) || 0;
    });
  });
  if (envPrest.sifon || envPrest.bidon10 || envPrest.bidon20 || envDev.sifon || envDev.bidon10 || envDev.bidon20) {
    y = pdfSeccion(doc, y, "MOVIMIENTO DE ENVASES");
    doc.autoTable({
      startY: y,
      margin: {
        left: 10,
        right: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5
      },
      headStyles: {
        fillColor: AZUL,
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      head: [["Producto", "Prestados", "Devueltos", "Neto"]],
      body: [["Sifón 1.5L", envPrest.sifon, envDev.sifon, envPrest.sifon - envDev.sifon], ["Bidón 10L", envPrest.bidon10, envDev.bidon10, envPrest.bidon10 - envDev.bidon10], ["Bidón 20L", envPrest.bidon20, envDev.bidon20, envPrest.bidon20 - envDev.bidon20]],
      columnStyles: {
        0: {
          cellWidth: 80
        },
        1: {
          cellWidth: 30,
          halign: "center"
        },
        2: {
          cellWidth: 30,
          halign: "center"
        },
        3: {
          cellWidth: 30,
          halign: "center"
        }
      }
    });
  }

  // Pie de página
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${new Date().toLocaleString("es-AR")} · Sistema de Reparto 2026 · Multi`, W / 2, doc.internal.pageSize.getHeight() - 8, {
    align: "center"
  });
  return doc.output("datauristring").split(",")[1]; // base64
}
function generarPDFSemanal({
  ventas,
  clientes,
  planillas,
  noVisitas,
  productos,
  fechaFin,
  negocio
}) {
  const {
    jsPDF
  } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  const W = doc.internal.pageSize.getWidth();

  // Calcular rango semanal (lunes a sábado)
  const fin = new Date(fechaFin);
  const ini = new Date(fin);
  ini.setDate(fin.getDate() - 5);
  const fechasRango = [];
  for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) fechasRango.push(d.toISOString().slice(0, 10));
  const ventasSem = ventas.filter(v => fechasRango.includes(v.fechaKey));
  const cobEf = ventasSem.reduce((a, v) => a + (v.pago === "contado" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoEfec) || 0 : 0), 0);
  const cobTr = ventasSem.reduce((a, v) => a + (v.pago === "transferencia" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoTrans) || 0 : 0), 0);
  const cobFi = ventasSem.filter(v => v.pago === "fiado").reduce((a, v) => a + (v.neto || 0), 0);
  const totalGan = ventasSem.reduce((a, v) => a + (v.ganancia || 0), 0);
  const totalGastos = fechasRango.reduce((a, f) => {
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return a + dias.reduce((b, d) => b + (planillas[`${d}_${f}`]?.gastos || []).reduce((c, g) => c + (Number(g.monto) || 0), 0), 0);
  }, 0);
  const semLabel = `${ini.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short"
  })} al ${fin.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
  let y = pdfHeader(doc, negocio, "Informe Semanal", semLabel);
  y = pdfSeccion(doc, y, "RESUMEN DE LA SEMANA");
  doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: GRIS
    },
    head: [["Concepto", "Monto"]],
    body: [["💵 Efectivo cobrado", fmt2(cobEf)], ["📲 Transferencias", fmt2(cobTr)], ["📝 Fiado acumulado", fmt2(cobFi)], ["📦 Total facturado", fmt2(cobEf + cobTr + cobFi)], ["✅ Ganancia estimada", fmt2(totalGan)], ["🔧 Gastos de la semana", fmt2(totalGastos)], ["💰 Resultado neto", fmt2(cobEf + cobTr - totalGastos)]],
    columnStyles: {
      0: {
        cellWidth: 120
      },
      1: {
        cellWidth: 50,
        halign: "right"
      }
    }
  });
  y = doc.lastAutoTable.finalY + 6;

  // Por día
  y = pdfSeccion(doc, y, "DETALLE POR DÍA");
  const DIAS_MAP = {
    "Lunes": "lunes",
    "Martes": "martes",
    "Miércoles": "miercoles",
    "Jueves": "jueves",
    "Viernes": "viernes",
    "Sábado": "sabado"
  };
  const filasXDia = fechasRango.map(f => {
    const vF = ventasSem.filter(v => v.fechaKey === f);
    const gastosDia = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].reduce((a, d) => a + (planillas[`${d}_${f}`]?.gastos || []).reduce((b, g) => b + (Number(g.monto) || 0), 0), 0);
    const total = vF.reduce((a, v) => a + (v.neto || 0), 0);
    const d = new Date(f + "T12:00:00");
    const label = d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    return [label, vF.length, fmt2(total), fmt2(gastosDia), fmt2(total - gastosDia)];
  }).filter(r => r[1] > 0);
  if (filasXDia.length > 0) doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 8,
      cellPadding: 1.5
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: GRIS
    },
    head: [["Día", "Entregas", "Facturado", "Gastos", "Neto"]],
    body: filasXDia,
    columnStyles: {
      0: {
        cellWidth: 40
      },
      1: {
        cellWidth: 22,
        halign: "center"
      },
      2: {
        cellWidth: 32,
        halign: "right"
      },
      3: {
        cellWidth: 32,
        halign: "right"
      },
      4: {
        cellWidth: 32,
        halign: "right"
      }
    }
  });
  y = doc.lastAutoTable.finalY + 6;

  // Top clientes
  y = pdfSeccion(doc, y, "TOP CLIENTES DE LA SEMANA");
  const porCliente = {};
  ventasSem.forEach(v => {
    if (!porCliente[v.clienteId]) porCliente[v.clienteId] = {
      nombre: v.cliente,
      total: 0,
      compras: 0
    };
    porCliente[v.clienteId].total += v.neto || 0;
    porCliente[v.clienteId].compras++;
  });
  const top = Object.values(porCliente).sort((a, b) => b.total - a.total).slice(0, 10);
  if (top.length > 0) doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 8,
      cellPadding: 1.5
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: GRIS
    },
    head: [["Cliente", "Compras", "Total"]],
    body: top.map(c => [c.nombre, c.compras, fmt2(c.total)]),
    columnStyles: {
      0: {
        cellWidth: 110
      },
      1: {
        cellWidth: 30,
        halign: "center"
      },
      2: {
        cellWidth: 30,
        halign: "right"
      }
    }
  });
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${new Date().toLocaleString("es-AR")} · Sistema de Reparto 2026 · Multi`, W / 2, doc.internal.pageSize.getHeight() - 8, {
    align: "center"
  });
  return doc.output("datauristring").split(",")[1];
}
function generarPDFMensual({
  ventas,
  clientes,
  planillas,
  noVisitas,
  productos,
  mes,
  anio,
  negocio
}) {
  const {
    jsPDF
  } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  const W = doc.internal.pageSize.getWidth();
  const ventasMes = ventas.filter(v => {
    const fk = v.fechaKey || "";
    return fk.startsWith(`${anio}-${String(mes).padStart(2, "0")}`);
  });
  const cobEf = ventasMes.reduce((a, v) => a + (v.pago === "contado" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoEfec) || 0 : 0), 0);
  const cobTr = ventasMes.reduce((a, v) => a + (v.pago === "transferencia" ? v.pagadoNum || v.neto || 0 : v.pago === "mixto" ? Number(v.montoTrans) || 0 : 0), 0);
  const cobFi = ventasMes.filter(v => v.pago === "fiado").reduce((a, v) => a + (v.neto || 0), 0);
  const totalGan = ventasMes.reduce((a, v) => a + (v.ganancia || 0), 0);
  const mesNombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric"
  });
  let y = pdfHeader(doc, negocio, "Informe Mensual", mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1));
  y = pdfSeccion(doc, y, "RESUMEN DEL MES");
  doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: GRIS
    },
    head: [["Concepto", "Monto"]],
    body: [["📦 Entregas realizadas", ventasMes.length + " ventas"], ["💵 Efectivo cobrado", fmt2(cobEf)], ["📲 Transferencias", fmt2(cobTr)], ["📝 Fiado acumulado", fmt2(cobFi)], ["📦 Total facturado", fmt2(cobEf + cobTr + cobFi)], ["✅ Ganancia estimada", fmt2(totalGan)]],
    columnStyles: {
      0: {
        cellWidth: 120
      },
      1: {
        cellWidth: 50,
        halign: "right"
      }
    }
  });
  y = doc.lastAutoTable.finalY + 6;

  // Clientes con deuda
  const deudores = clientes.filter(c => c.saldo < 0).sort((a, b) => a.saldo - b.saldo);
  if (deudores.length > 0) {
    y = pdfSeccion(doc, y, `CLIENTES CON DEUDA (${deudores.length})`);
    doc.autoTable({
      startY: y,
      margin: {
        left: 10,
        right: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5
      },
      headStyles: {
        fillColor: [180, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      head: [["Cliente", "Día", "Saldo"]],
      body: deudores.map(c => [c.nombre, c.dia, fmt2(Math.abs(c.saldo))]),
      columnStyles: {
        0: {
          cellWidth: 100
        },
        1: {
          cellWidth: 40
        },
        2: {
          cellWidth: 30,
          halign: "right"
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Envases en circulación
  const envTot = clientes.reduce((a, c) => ({
    sifon: a.sifon + (c.sifon || 0),
    bidon10: a.bidon10 + (c.bidon10 || 0),
    bidon20: a.bidon20 + (c.bidon20 || 0)
  }), {
    sifon: 0,
    bidon10: 0,
    bidon20: 0
  });
  y = pdfSeccion(doc, y, "ENVASES EN PODER DE CLIENTES");
  doc.autoTable({
    startY: y,
    margin: {
      left: 10,
      right: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    head: [["Producto", "Cantidad"]],
    body: [["Sifón 1.5L", envTot.sifon], ["Bidón 10L", envTot.bidon10], ["Bidón 20L", envTot.bidon20]],
    columnStyles: {
      0: {
        cellWidth: 120
      },
      1: {
        cellWidth: 50,
        halign: "center"
      }
    }
  });
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${new Date().toLocaleString("es-AR")} · Sistema de Reparto 2026 · Multi`, W / 2, doc.internal.pageSize.getHeight() - 8, {
    align: "center"
  });
  return doc.output("datauristring").split(",")[1];
}
async function enviarInformePorEmail({
  base64pdf,
  nombre,
  asunto,
  cuerpoHtml,
  emailDestino,
  nombreDestino
}) {
  try {
    const res = await fetch(window.EMAIL_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        token: window.EMAIL_TOKEN,
        to: emailDestino,
        toName: nombreDestino || emailDestino,
        subject: asunto,
        htmlContent: cuerpoHtml,
        attachmentBase64: base64pdf,
        attachmentName: nombre
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Email error", e);
    return false;
  }
}
function usarInformes({
  ventas,
  clientes,
  planillas,
  noVisitas,
  productos
}) {
  const lic = (() => {
    try {
      return JSON.parse(localStorage.getItem("rm_licencia") || "null");
    } catch {
      return null;
    }
  })();
  const negocio = lic?.negocio || "Sistema de Reparto 2026 · Multi";
  const emailDest = lic?.email || "";
  const enviarDiario = async (fecha, dia) => {
    if (!emailDest || !window.jspdf) return false;
    try {
      const base64 = generarPDFDiario({
        ventas,
        clientes,
        planillas,
        noVisitas,
        productos,
        fecha,
        dia,
        negocio
      });
      const d = new Date(fecha + "T12:00:00");
      const label = d.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
      return await enviarInformePorEmail({
        base64pdf: base64,
        nombre: `informe-diario-${fecha}.pdf`,
        asunto: `📦 Informe del día — ${label}`,
        cuerpoHtml: `<h2>Sistema de Reparto 2026 · Multi</h2><p>Hola <b>${negocio}</b>,</p><p>Adjunto el informe del día <b>${label}</b>.</p><p>Guardalo para tener tu registro.</p><br><p style="color:#888;font-size:12px">Sistema de Reparto 2026 · Multi</p>`,
        emailDestino: emailDest,
        nombreDestino: negocio
      });
    } catch (e) {
      console.error("PDF diario error", e);
      return false;
    }
  };
  const enviarSemanal = async fechaSabado => {
    if (!emailDest || !window.jspdf) return false;
    try {
      const base64 = generarPDFSemanal({
        ventas,
        clientes,
        planillas,
        noVisitas,
        productos,
        fechaFin: fechaSabado,
        negocio
      });
      const d = new Date(fechaSabado + "T12:00:00");
      const label = d.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      return await enviarInformePorEmail({
        base64pdf: base64,
        nombre: `informe-semanal-${fechaSabado}.pdf`,
        asunto: `📊 Informe Semanal — semana del ${label}`,
        cuerpoHtml: `<h2>Sistema de Reparto 2026 · Multi</h2><p>Hola <b>${negocio}</b>,</p><p>Adjunto el resumen de la semana que terminó el <b>${label}</b>.</p><br><p style="color:#888;font-size:12px">Sistema de Reparto 2026 · Multi</p>`,
        emailDestino: emailDest,
        nombreDestino: negocio
      });
    } catch (e) {
      console.error("PDF semanal error", e);
      return false;
    }
  };
  const enviarMensual = async (mes, anio) => {
    if (!emailDest || !window.jspdf) return false;
    try {
      const base64 = generarPDFMensual({
        ventas,
        clientes,
        planillas,
        noVisitas,
        productos,
        mes,
        anio,
        negocio
      });
      const label = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric"
      });
      return await enviarInformePorEmail({
        base64pdf: base64,
        nombre: `informe-mensual-${anio}-${mes}.pdf`,
        asunto: `📅 Informe Mensual — ${label}`,
        cuerpoHtml: `<h2>Sistema de Reparto 2026 · Multi</h2><p>Hola <b>${negocio}</b>,</p><p>Adjunto el resumen del mes de <b>${label}</b>.</p><br><p style="color:#888;font-size:12px">Sistema de Reparto 2026 · Multi</p>`,
        emailDestino: emailDest,
        nombreDestino: negocio
      });
    } catch (e) {
      console.error("PDF mensual error", e);
      return false;
    }
  };
  return {
    enviarDiario,
    enviarSemanal,
    enviarMensual
  };
}
function PantallaElegirTema({
  onElegido
}) {
  const [seleccion, setSeleccion] = React.useState("oscuro-azul");
  const [modoVista, setModoVista] = React.useState("oscuro");
  React.useEffect(() => {
    aplicarTema(seleccion);
  }, [seleccion]);
  const temasFiltrados = Object.entries(TEMAS).filter(([, t]) => t.modo === modoVista);
  const lic = (() => {
    try {
      return JSON.parse(localStorage.getItem("rm_licencia") || "null");
    } catch {
      return null;
    }
  })();
  const logo = lic?.logo || null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      padding: "24px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 20
    }
  }, logo ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "logo",
    style: {
      height: 60,
      objectFit: "contain",
      marginBottom: 8
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "var(--color-background-info)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 30,
      margin: "0 auto 8px"
    }
  }, "💧"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      marginBottom: 4
    }
  }, "Elegí tu estilo"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)"
    }
  }, "Esta elección va a quedar fija en tu app.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16,
      justifyContent: "center"
    }
  }, [["oscuro", "🌙 Modo oscuro"], ["claro", "☀️ Modo claro"]].map(([m, l]) => /*#__PURE__*/React.createElement("button", {
    key: m,
    style: {
      flex: 1,
      maxWidth: 160,
      padding: "8px 12px",
      fontSize: 13,
      fontWeight: 500,
      borderRadius: 10,
      cursor: "pointer",
      background: modoVista === m ? "var(--color-accent)" : "var(--color-background-secondary)",
      color: modoVista === m ? "#fff" : "var(--color-text-secondary)",
      border: `1px solid ${modoVista === m ? "transparent" : "var(--color-border-secondary)"}`
    },
    onClick: () => setModoVista(m)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 20
    }
  }, temasFiltrados.map(([id, tema]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setSeleccion(id),
    style: {
      padding: "12px 10px",
      borderRadius: 12,
      cursor: "pointer",
      textAlign: "center",
      border: `2px solid ${seleccion === id ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
      background: seleccion === id ? "var(--color-background-secondary)" : "var(--color-background-tertiary)",
      boxShadow: seleccion === id ? "0 0 0 1px var(--color-accent)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      marginBottom: 4
    }
  }, tema.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, tema.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      justifyContent: "center",
      marginTop: 6
    }
  }, [tema.vars["--color-background-primary"], tema.vars["--color-accent"] || tema.vars["--color-text-info"], tema.vars["--color-text-success"], tema.vars["--color-text-warning"]].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: c,
      border: "1px solid rgba(128,128,128,0.3)"
    }
  })))))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      width: "100%",
      padding: "14px",
      fontSize: 15
    },
    onClick: () => onElegido(seleccion)
  }, "Confirmar estilo →"));
}
function Cargando({
  texto
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-background-primary)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "💧"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--color-text-secondary)"
    }
  }, texto || "Cargando...")));
}