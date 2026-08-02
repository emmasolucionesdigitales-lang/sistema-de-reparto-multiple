// ════════════════════════════════════════════════════════════════════
// ◆  11-promocion.js — CargaHistorica · TagsCliente (Módulo Promoción/Prospectos eliminado)
// ════════════════════════════════════════════════════════════════════

function CargaHistorica({
  clientes,
  productos,
  onGuardar,
  onVolver,
  enConfig
}) {
  const DIAS_REP = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const [fecha, setFecha] = React.useState("2026-01-06");
  const [dia, setDia] = React.useState("Martes");
  const [filas, setFilas] = React.useState([]);
  const [guardando, setGuardando] = React.useState(false);
  const [guardados, setGuardados] = React.useState(0);

  // Clientes del día seleccionado
  const clientesDia = clientes.filter(c => c.dia === dia).sort((a, b) => (a.orden || 999) - (b.orden || 999));

  // Al cambiar la fecha, auto-detectar el día
  const onFechaChange = f => {
    setFecha(f);
    const d = new Date(f + 'T12:00:00');
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = dias[d.getDay()];
    if (DIAS_REP.includes(nombreDia)) setDia(nombreDia);
  };

  // Fila vacía
  const filaVacia = (clienteId = "") => ({
    clienteId,
    cantidad_sifon: 0,
    cantidad_b10: 0,
    cantidad_b20: 0,
    pago: "contado",
    monto: "",
    obs: ""
  });

  // Cargar clientes del día como filas
  const cargarClientes = () => {
    setFilas(clientesDia.map(c => filaVacia(c.id)));
  };
  const setFila = (i, campo, val) => setFilas(fs => fs.map((f, j) => j === i ? {
    ...f,
    [campo]: val
  } : f));
  const filasConVenta = filas.filter(f => f.clienteId && (f.cantidad_sifon > 0 || f.cantidad_b10 > 0 || f.cantidad_b20 > 0 || Number(f.monto) > 0));
  const guardar = () => {
    if (!filasConVenta.length) {
      alert("No hay ventas para guardar");
      return;
    }
    const nuevasVentas = [];
    const fechaKey = fecha;
    filasConVenta.forEach(f => {
      const c = clientes.find(x => x.id === f.clienteId);
      if (!c) return;
      const ps = productos || [];
      const detalle = [];
      const getSifon = ps.find(p => p.nombre === "Sifón 1.5L");
      const getB10 = ps.find(p => p.nombre === "Bidón 10L");
      const getB20 = ps.find(p => p.nombre === "Bidón 20L");
      if (f.cantidad_sifon > 0 && getSifon) detalle.push({
        nombre: getSifon.nombre,
        cantidad: Number(f.cantidad_sifon),
        precio: getSifon.precio,
        total: Number(f.cantidad_sifon) * getSifon.precio
      });
      if (f.cantidad_b10 > 0 && getB10) detalle.push({
        nombre: getB10.nombre,
        cantidad: Number(f.cantidad_b10),
        precio: getB10.precio,
        total: Number(f.cantidad_b10) * getB10.precio
      });
      if (f.cantidad_b20 > 0 && getB20) detalle.push({
        nombre: getB20.nombre,
        cantidad: Number(f.cantidad_b20),
        precio: getB20.precio,
        total: Number(f.cantidad_b20) * getB20.precio
      });
      if (!detalle.length && Number(f.monto) > 0) detalle.push({
        nombre: "Venta histórica",
        cantidad: 1,
        precio: Number(f.monto),
        total: Number(f.monto)
      });
      const bruto = detalle.reduce((a, d) => a + d.total, 0);
      const pagadoNum = Number(f.monto) || bruto;
      const saldoDelta = f.pago === "fiado" ? -bruto : pagadoNum - bruto;
      nuevasVentas.push({
        id: Date.now() + nuevasVentas.length,
        clienteId: c.id,
        cliente: c.nombre,
        dia,
        fechaKey,
        fecha: `${fecha} (historial)`,
        detalle,
        pago: f.pago,
        obs: f.obs || "Carga histórica",
        bruto,
        desc: 0,
        neto: bruto,
        costo: 0,
        ganancia: bruto,
        pagadoNum,
        saldoAplicado: 0,
        saldoDelta,
        envPrest: [],
        envDev: []
      });
    });
    setGuardando(true);
    onGuardar(nuevasVentas);
    setGuardados(g => g + nuevasVentas.length);
    setFilas([]);
    setGuardando(false);
    alert(`✅ ${nuevasVentas.length} ventas guardadas para el ${fecha}`);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: s.screen
  }, !enConfig && /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: "Carga histórica",
    onVolver: onVolver
  }), !enConfig && guardados > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 0",
      fontSize: 12,
      color: "#4dd9a0"
    }
  }, "✓ ", guardados, " guardadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Fecha del reparto"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: s.input,
    value: fecha,
    min: "2026-01-01",
    max: "2026-03-31",
    onChange: e => onFechaChange(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Día"), /*#__PURE__*/React.createElement("select", {
    style: s.select,
    value: dia,
    onChange: e => setDia(e.target.value)
  }, DIAS_REP.map(d => /*#__PURE__*/React.createElement("option", {
    key: d
  }, d))))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      width: "100%",
      padding: "12px",
      fontSize: 14
    },
    onClick: cargarClientes
  }, "📋 Cargar clientes del ", dia, " (", clientesDia.length, " clientes)")), filas.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)",
      marginBottom: 8
    }
  }, "Dejá en 0 los que no compraron ese día. Solo se guardan los que tienen cantidad o monto."), filas.map((f, i) => {
    const c = clientes.find(x => x.id === f.clienteId);
    if (!c) return null;
    const tieneVenta = f.cantidad_sifon > 0 || f.cantidad_b10 > 0 || f.cantidad_b20 > 0 || Number(f.monto) > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        ...s.card,
        margin: "0 0 8px",
        borderLeft: tieneVenta ? "3px solid #4dd9a0" : "0.5px solid var(--color-border-tertiary)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        marginBottom: 8
      }
    }, c.orden && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-tertiary)",
        fontSize: 12,
        marginRight: 6
      }
    }, "#", c.orden), c.nombre, c.sifon > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-tertiary)",
        marginLeft: 6
      }
    }, "hab: S×", c.sifon, c.bidon10 > 0 ? ` B10×${c.bidon10}` : "", c.bidon20 > 0 ? ` B20×${c.bidon20}` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        marginBottom: 8
      }
    }, [["cantidad_sifon", "Sifón"], ["cantidad_b10", "Bidón 10L"], ["cantidad_b20", "Bidón 20L"]].map(([k, l]) => /*#__PURE__*/React.createElement("div", {
      key: k
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        fontSize: 10
      }
    }, l), /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.inputNum,
        textAlign: "center"
      },
      type: "number",
      min: 0,
      value: f[k] || "",
      placeholder: "0",
      onChange: e => setFila(i, k, Number(e.target.value) || 0)
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        fontSize: 10
      }
    }, "Pago"), /*#__PURE__*/React.createElement("select", {
      style: {
        ...s.select,
        fontSize: 12
      },
      value: f.pago,
      onChange: e => setFila(i, "pago", e.target.value)
    }, [["contado", "Contado"], ["transferencia", "Transfer."], ["fiado", "Fiado"]].map(([v, l]) => /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        fontSize: 10
      }
    }, "Monto cobrado $"), /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.inputNum,
        textAlign: "right"
      },
      type: "number",
      min: 0,
      value: f.monto,
      placeholder: "auto",
      onChange: e => setFila(i, "monto", e.target.value)
    }))));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "8px 0",
      background: "var(--color-background-secondary)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)"
    }
  }, filasConVenta.length, " ventas a guardar del ", fecha)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      width: "100%",
      padding: "14px",
      fontSize: 15,
      borderRadius: 12,
      opacity: filasConVenta.length === 0 ? 0.5 : 1
    },
    disabled: filasConVenta.length === 0,
    onClick: guardar
  }, "💾 Guardar ", filasConVenta.length, " ventas del ", fecha), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      width: "100%",
      padding: "10px",
      fontSize: 13,
      marginTop: 8
    },
    onClick: () => setFilas([])
  }, "Limpiar y cargar otro día")), filas.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--color-text-tertiary)",
      fontSize: 14,
      lineHeight: 1.8
    }
  }, "Seleccioná una fecha y tocá", "\n", "\"Cargar clientes del día\"", "\n", "para empezar la carga.")));
}
// Promocion / EditarProspecto / EnvasesProspecto / PromoDetalle /
// PromoNuevo / PromoComodato (gestión de prospectos) — eliminados a
// pedido. CargaHistorica y TagsCliente se conservan: se usan en otro
// lado (pantalla "historial" y ListaClientes) y no dependen de
// prospectos.
function TagsCliente({
  cliente,
  ventas,
  style
}) {
  const cl = cliente;
  const TH = {
    background: "rgba(56,138,221,0.28)",
    color: "#ffffff",
    border: "1px solid rgba(56,138,221,0.5)",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-block"
  };
  const TP = {
    background: "rgba(245,158,11,0.28)",
    color: "#ffffff",
    border: "1px solid rgba(245,158,11,0.55)",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-block"
  };
  const TD = {
    background: "rgba(226,75,74,0.25)",
    color: "#ffffff",
    border: "1px solid rgba(226,75,74,0.5)",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-block"
  };
  const TF = {
    background: "rgba(29,158,117,0.25)",
    color: "#ffffff",
    border: "1px solid rgba(29,158,117,0.5)",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-block"
  };
  const ex = {
    sifon: 0,
    b10: 0,
    b20: 0
  };
  (ventas || []).filter(v => v.clienteId === cl.id).forEach(v => {
    (v.envPrest || []).forEach(e => {
      if (e.prod === "Sifón 1.5L") ex.sifon += Number(e.cant) || 0;
      if (e.prod === "Bidón 10L") ex.b10 += Number(e.cant) || 0;
      if (e.prod === "Bidón 20L") ex.b20 += Number(e.cant) || 0;
    });
    (v.envDev || []).forEach(e => {
      if (e.prod === "Sifón 1.5L") ex.sifon -= Number(e.cant) || 0;
      if (e.prod === "Bidón 10L") ex.b10 -= Number(e.cant) || 0;
      if (e.prod === "Bidón 20L") ex.b20 -= Number(e.cant) || 0;
    });
  });
  // Ajuste manual de envases prestados (envAjuste, del botón ♻️ Envases)
  const _aj = cl.envAjuste || {};
  ex.sifon += Number(_aj.sifon) || 0;
  ex.b10 += Number(_aj.bidon10) || 0;
  ex.b20 += Number(_aj.bidon20) || 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      ...(style || {})
    }
  }, (() => {
    const real = {
      sifon: Math.max(0, (Number(cl.sifon) || 0) + ex.sifon),
      b10: Math.max(0, (Number(cl.bidon10) || 0) + ex.b10),
      b20: Math.max(0, (Number(cl.bidon20) || 0) + ex.b20)
    };
    return /*#__PURE__*/React.createElement(React.Fragment, null, real.sifon > 0 && /*#__PURE__*/React.createElement("span", {
      style: TH
    }, "Sif ×", real.sifon), real.b10 > 0 && /*#__PURE__*/React.createElement("span", {
      style: TH
    }, "10L ×", real.b10), real.b20 > 0 && /*#__PURE__*/React.createElement("span", {
      style: TH
    }, "20L ×", real.b20), cl.dispenser > 0 && /*#__PURE__*/React.createElement("span", {
      style: TH
    }, "Disp ×", cl.dispenser));
  })(), (cl.saldo || 0) < 0 && /*#__PURE__*/React.createElement("span", {
    style: TD
  }, "Debe ", fmt(Math.abs(cl.saldo))), (cl.saldo || 0) > 0 && /*#__PURE__*/React.createElement("span", {
    style: TF
  }, "A favor ", fmt(cl.saldo)));
}