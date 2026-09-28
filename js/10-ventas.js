// ════════════════════════════════════════════════════════════════════
// ◆  10-ventas.js — NuevaVenta · NuevoCliente
// ════════════════════════════════════════════════════════════════════

function NuevaVenta({
  cliente,
  productos,
  fecha,
  onGuardar,
  onNoEsta,
  onNoQuiere,
  onVolver,
  onSaltar,
  ventasCliente,
  progressData,
  compacto,
  onCambiarDispenser,
  ventaEditar,
  onCancelar
}) {
  // Modo edición: la tarjeta compacta se reutiliza para editar una venta ya
  // guardada (antes era el componente aparte EditVenta). esMixtaOrigEdit
  // detecta si esa venta se guardó como pago mixto (mismo criterio que usaba
  // EditVenta: pago === "mixto" o montoTrans > 0).
  const esMixtaOrigEdit = ventaEditar && (ventaEditar.pago === "mixto" || (Number(ventaEditar.montoTrans) || 0) > 0);
  const [transConfirmada, setTransConfirmada] = React.useState(() => ventaEditar && ventaEditar.pago === "transferencia" ? !!ventaEditar.transConfirmada : false);
  const [dispDelta, setDispDelta] = React.useState(0);
  const [masOpcionesCompacto, setMasOpcionesCompacto] = React.useState(false);
  const [mostrarRotoCompacto, setMostrarRotoCompacto] = React.useState(false);
  const [mostrarCambio, setMostrarCambio] = React.useState(false);
  const sonarTransferencia = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.15);
      });
    } catch (e) {}
  };
  // 🔁 Buscar la última venta con productos para repetirla automáticamente
  const nombresEntrega = (productos || []).filter(p => !p.esDispenser).map(p => p.nombre);
  const ultimaConProd = (() => {
    const conProd = (ventasCliente || []).filter(v => {
      const det = Array.isArray(v.detalle) ? v.detalle : Object.values(v.detalle || {});
      return det.some(d => (d.cantidad || 0) > 0 && !d._esDispRoto && nombresEntrega.includes(d.nombre));
    });
    return conProd.length ? [...conProd].sort((a, b) => (b.id || 0) - (a.id || 0))[0] : null;
  })();
  const [cantidades, setCantidades] = useState(() => {
    const m = {};
    (productos || []).forEach(p => {
      m[p.nombre] = 0;
    });
    if (ventaEditar) {
      const det = Array.isArray(ventaEditar.detalle) ? ventaEditar.detalle : Object.values(ventaEditar.detalle || {});
      det.forEach(d => {
        if (!d._esDispRoto && nombresEntrega.includes(d.nombre)) m[d.nombre] = d.cantidad || 0;
      });
      return m;
    }
    if (ultimaConProd) {
      const det = Array.isArray(ultimaConProd.detalle) ? ultimaConProd.detalle : Object.values(ultimaConProd.detalle || {});
      det.forEach(d => {
        if (!d._esDispRoto && d.nombre in m && nombresEntrega.includes(d.nombre)) m[d.nombre] = d.cantidad;
      });
    }
    return m;
  });
  const [repetido, setRepetido] = useState(() => ventaEditar ? true : !!ultimaConProd);
  // Si el usuario ya tocó las cantidades a mano, nunca más las pisamos con
  // datos que lleguen después de Firebase (bug: "se borraba la carga").
  const cantidadesTocadas = React.useRef(false);
  const ventasClienteRef = React.useRef(ventasCliente);
  React.useEffect(() => {
    if (ventaEditar) return;
    if (ventasClienteRef.current === ventasCliente || repetido || cantidadesTocadas.current) return;
    ventasClienteRef.current = ventasCliente;
    const nombres = (productos || []).filter(p => !p.esDispenser).map(p => p.nombre);
    const conProd = (ventasCliente || []).filter(v => {
      const det = Array.isArray(v.detalle) ? v.detalle : Object.values(v.detalle || {});
      return det.some(d => (d.cantidad || 0) > 0 && !d._esDispRoto && nombres.includes(d.nombre));
    });
    if (!conProd.length) return;
    const ultima = [...conProd].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
    const m = {};
    (productos || []).forEach(p => {
      m[p.nombre] = 0;
    });
    const det = Array.isArray(ultima.detalle) ? ultima.detalle : Object.values(ultima.detalle || {});
    det.forEach(d => {
      if (!d._esDispRoto && nombres.includes(d.nombre)) m[d.nombre] = d.cantidad || 0;
    });
    setCantidades(m);
    setRepetido(true);
  }, [ventasCliente]);
  const [pago, setPago] = useState(() => ventaEditar ? (esMixtaOrigEdit ? "mixto" : ventaEditar.pago || "contado") : "contado");
  const [monto, setMonto] = useState(() => ventaEditar ? String(ventaEditar.pagadoNum || ventaEditar.neto || "") : "");
  const [montoEfec, setMontoEfec] = useState(() => ventaEditar && esMixtaOrigEdit ? String(ventaEditar.montoEfec || "") : ""); // pago mixto: parte efectivo
  const [montoTrans, setMontoTrans] = useState(() => ventaEditar && esMixtaOrigEdit ? String(ventaEditar.montoTrans || "") : ""); // pago mixto: parte transferencia
  const [transConfMixto, setTransConfMixto] = useState(() => ventaEditar && esMixtaOrigEdit ? !!ventaEditar.transConfirmada : false);
  const [usarSaldo, setUsarSaldo] = useState(false);
  const [opcionSaldo, setOpcionSaldo] = useState("compra"); // compra | todo | parcial
  const [envPrest, setEnvPrest] = useState([{
    prod: "",
    cant: ""
  }]);
  const [envDev, setEnvDev] = useState([{
    prod: "",
    cant: ""
  }]);
  const [envOpen, setEnvOpen] = useState(false);
  const addEnv = (setList, prod) => setList(prev => {
    const idx = prev.findIndex(e => e.prod === prod);
    if (idx >= 0) {
      const n = [...prev];
      n[idx] = {
        ...n[idx],
        cant: String((Number(n[idx].cant) || 0) + 1)
      };
      return n;
    }
    return [...prev.filter(e => e.prod !== ""), {
      prod,
      cant: "1"
    }];
  });
  const subEnv = (setList, prod) => setList(prev => {
    const idx = prev.findIndex(e => e.prod === prod);
    if (idx < 0) return prev;
    const n = [...prev];
    const nc = Math.max(0, (Number(n[idx].cant) || 0) - 1);
    if (nc === 0) return n.filter((_, i) => i !== idx);
    n[idx] = {
      ...n[idx],
      cant: String(nc)
    };
    return n;
  });
  const getEnvCnt = (list, prod) => list.filter(e => e.prod === prod).reduce((a, e) => a + (Number(e.cant) || 0), 0);
  const [obs, setObs] = useState(() => ventaEditar ? (ventaEditar.obs || "").replace(/\s*\[Mixto:[^\]]*\]/g, "") : "");
  const [dispRotoPrecio, setDispRotoPrecio] = React.useState("");
  const dispenser = productos.find(p => p.esDispenser);
  const prodEntrega = productos.filter(p => !p.esDispenser);
  const rotoPrecioNum = Number(dispRotoPrecio) || 0;
  const detalle = [...prodEntrega.map(p => ({
    nombre: p.nombre,
    cantidad: cantidades[p.nombre] || 0,
    precio: p.precio,
    total: (cantidades[p.nombre] || 0) * p.precio
  })).filter(d => d.cantidad > 0), ...(rotoPrecioNum > 0 ? [{
    nombre: "Dispenser (rotura)",
    cantidad: 1,
    precio: rotoPrecioNum,
    total: rotoPrecioNum,
    _esDispRoto: true
  }] : [])];
  const bruto = detalle.reduce((a, d) => a + d.total, 0);
  const desc = 0; // retención informativa solo en planilla
  const neto = bruto - desc;
  const saldoDisp = cliente.saldo > 0 ? cliente.saldo : 0;
  // En edición mantenemos el saldoAplicado original de la venta (igual que
  // hacía EditVenta) — no lo recalculamos por el toggle "usar saldo" para no
  // duplicar/perder aplicaciones de saldo ya hechas al registrar la venta.
  const saldoApl = ventaEditar ? Number(ventaEditar.saldoAplicado) || 0 : usarSaldo && pago !== "fiado" ? Math.min(saldoDisp, neto) : 0;
  const aPagar = neto - saldoApl;
  const deudaPendiente = cliente.saldo < 0 ? Math.abs(cliente.saldo) : 0;
  const totalACobrar = opcionSaldo === "todo" ? Math.round(deudaPendiente + aPagar) : aPagar;
  const pagaTodo = deudaPendiente > 0 && pago !== "fiado" && opcionSaldo === "todo";
  React.useEffect(() => {
    if (pago === "fiado") return;
    if (opcionSaldo === "todo" && deudaPendiente > 0) {
      setMonto(String(Math.round(deudaPendiente + aPagar)));
    } else if (opcionSaldo === "compra") {
      setMonto("");
    }
  }, [opcionSaldo, aPagar, deudaPendiente, pago]);
  const ER = ({
    list,
    setList,
    i
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.row,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: {
      ...s.select,
      flex: 2
    },
    value: list[i].prod,
    onChange: e => {
      const n = [...list];
      n[i].prod = e.target.value;
      setList(n);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— Producto —"), productos.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.nombre
  }, p.nombre))), /*#__PURE__*/React.createElement("input", {
    style: {
      ...s.input,
      flex: 1
    },
    type: "number",
    placeholder: "Cant",
    value: list[i].cant,
    onChange: e => {
      const n = [...list];
      n[i].cant = e.target.value;
      setList(n);
    }
  }));
  const confirmarRegistro = () => {
    const envIncompleto = [...envPrest, ...envDev].some(e => {
      const tieneProd = !!e.prod;
      const tieneCant = String(e.cant || "").trim() !== "" && Number(e.cant) > 0;
      return tieneProd && !tieneCant || !tieneProd && tieneCant;
    });
    if (envIncompleto) {
      alert("⚠️ Hay un envase cargado a medias: falta elegir el producto o poner la cantidad. Completalo o borrá esa fila antes de registrar, así no se pierde la devolución o el préstamo.");
      return;
    }
    if (pago === "mixto") {
      const ef = Number(montoEfec || 0),
        tr = Number(montoTrans || 0);
      if (ef === 0 && tr === 0) {
        alert("Ingresá al menos un monto para el pago mixto");
        return;
      }
      const totalPagado = ef + tr;
      if (totalACobrar > 0 && totalPagado > totalACobrar * 3 && totalPagado > totalACobrar + 10000) {
        if (!window.confirm(`Estás cobrando ${fmt(totalPagado)}, bastante más que el total a cobrar (${fmt(totalACobrar)}). ¿Está bien?`)) return;
      }
      const saldoDelta = totalPagado - totalACobrar;
      if (ef > 0) onGuardar(detalle, "contado", String(ef), saldoApl, envPrest, envDev, obs, "mixto_ef", tr, saldoDelta, transConfMixto);else onGuardar(detalle, "transferencia", String(tr), saldoApl, envPrest, envDev, obs, "mixto_tr", ef, saldoDelta, transConfMixto);
    } else {
      const montoFinal = opcionSaldo === "todo" && !monto ? String(Math.round(Math.abs(cliente.saldo) + aPagar)) : monto;
      const pagadoNum = Number(montoFinal) || 0;
      if (pago !== "fiado" && totalACobrar > 0 && pagadoNum > totalACobrar * 3 && pagadoNum > totalACobrar + 10000) {
        if (!window.confirm(`Estás cobrando ${fmt(pagadoNum)}, bastante más que el total a cobrar (${fmt(totalACobrar)}). ¿Está bien?`)) return;
      }
      onGuardar(detalle, pago, montoFinal, saldoApl, envPrest, envDev, obs, opcionSaldo, undefined, undefined, pago === "transferencia" ? transConfirmada : false);
    }
    if (dispDelta !== 0 && onCambiarDispenser) onCambiarDispenser(dispDelta);
  };
  // cuerpoCompacto: el cuerpo de la tarjeta (productos, envases, dispenser,
  // pago, más opciones, botón final) es UNA sola definición — se usa tanto
  // embebido (compacto=true) como dentro de la pantalla completa de abajo
  // (con header, info del cliente y botones No está/No quiere/Saltar
  // alrededor). Antes la pantalla completa tenía su propio JSX distinto;
  // ahora comparten exactamente el mismo cuerpo.
  const cuerpoCompacto = /*#__PURE__*/React.createElement(React.Fragment, null, prodEntrega.map(p => {
      const netoEnv = getEnvCnt(envPrest, p.nombre) - getEnvCnt(envDev, p.nombre);
      const incrementarEnv = () => {
        if (netoEnv < 0) subEnv(setEnvDev, p.nombre);else addEnv(setEnvPrest, p.nombre);
      };
      const decrementarEnv = () => {
        if (netoEnv > 0) subEnv(setEnvPrest, p.nombre);else addEnv(setEnvDev, p.nombre);
      };
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: "grid",
          gridTemplateColumns: "1fr auto 70px",
          alignItems: "center",
          columnGap: 6,
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "var(--color-text-primary)"
        }
      }, p.nombre, /*#__PURE__*/React.createElement("span", {
        style: {
          display: "block",
          fontSize: 10,
          color: "var(--color-text-tertiary)"
        }
      }, fmt(p.precio))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifySelf: "center"
        }
      }, /*#__PURE__*/React.createElement("button", {
        style: {
          ...s.btn,
          width: 26,
          height: 26,
          padding: 0,
          fontSize: 15,
          lineHeight: 1
        },
        onClick: () => (cantidadesTocadas.current = true, setCantidades(q => ({
          ...q,
          [p.nombre]: Math.max(0, (q[p.nombre] || 0) - 1)
        })))
      }, "−"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 15,
          fontWeight: 500,
          minWidth: 14,
          textAlign: "center",
          color: "var(--color-text-primary)"
        }
      }, cantidades[p.nombre] || 0), /*#__PURE__*/React.createElement("button", {
        style: {
          ...s.btn,
          width: 26,
          height: 26,
          padding: 0,
          fontSize: 15,
          lineHeight: 1
        },
        onClick: () => (cantidadesTocadas.current = true, setCantidades(q => ({
          ...q,
          [p.nombre]: (q[p.nombre] || 0) + 1
        })))
      }, "+")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("button", {
        style: {
          width: 20,
          height: 20,
          borderRadius: 5,
          border: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-tertiary)",
          color: "var(--color-text-secondary)",
          fontSize: 12,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0
        },
        onClick: ventaEditar ? undefined : decrementarEnv,
        disabled: !!ventaEditar,
        title: "Devolvió uno"
      }, "−"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 9,
          fontWeight: 600,
          minWidth: 30,
          textAlign: "center",
          color: netoEnv > 0 ? "var(--color-text-info)" : netoEnv < 0 ? "var(--color-text-success)" : "var(--color-text-tertiary)"
        }
      }, netoEnv > 0 ? `P.${netoEnv}` : netoEnv < 0 ? `D.${-netoEnv}` : "env."), /*#__PURE__*/React.createElement("button", {
        style: {
          width: 20,
          height: 20,
          borderRadius: 5,
          border: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-tertiary)",
          color: "var(--color-text-secondary)",
          fontSize: 12,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0
        },
        onClick: ventaEditar ? undefined : incrementarEnv,
        disabled: !!ventaEditar,
        title: "Prestó uno"
      }, "+")));
    }), dispenser && !ventaEditar && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr auto 70px",
        alignItems: "center",
        columnGap: 6,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--color-text-primary)"
      }
    }, "🧊 Dispenser", /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontSize: 10,
        color: "var(--color-text-tertiary)"
      }
    }, "en el cliente: ", cliente.dispenser || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifySelf: "center"
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        width: 26,
        height: 26,
        padding: 0,
        fontSize: 15,
        lineHeight: 1
      },
      onClick: () => setDispDelta(d => Math.max(-(cliente.dispenser || 0), d - 1)),
      title: "Retirar dispenser"
    }, "−"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        minWidth: 20,
        textAlign: "center",
        color: dispDelta > 0 ? "var(--color-text-info)" : dispDelta < 0 ? "var(--color-text-success)" : "var(--color-text-primary)"
      }
    }, dispDelta > 0 ? `+${dispDelta}` : dispDelta), /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        width: 26,
        height: 26,
        padding: 0,
        fontSize: 15,
        lineHeight: 1
      },
      onClick: () => setDispDelta(d => d + 1),
      title: "Prestar dispenser"
    }, "+")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 600,
        textAlign: "center",
        color: dispDelta > 0 ? "var(--color-text-info)" : dispDelta < 0 ? "var(--color-text-success)" : "var(--color-text-tertiary)"
      }
    }, dispDelta > 0 ? `presté ${dispDelta}` : dispDelta < 0 ? `retiré ${-dispDelta}` : "sin cambio")), !ventaEditar && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 8
      }
    }, dispenser && /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        flex: 1,
        fontSize: 11,
        padding: "7px",
        color: mostrarRotoCompacto ? "#fff" : "var(--color-text-danger)",
        background: mostrarRotoCompacto ? "#a32d2d" : undefined,
        border: mostrarRotoCompacto ? "none" : undefined
      },
      onClick: () => setMostrarRotoCompacto(r => !r)
    }, "💔 Dispenser roto"), /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        flex: 1,
        fontSize: 11,
        padding: "7px",
        background: mostrarCambio ? "#185FA5" : undefined,
        color: mostrarCambio ? "#fff" : undefined,
        border: mostrarCambio ? "none" : undefined
      },
      onClick: () => setMostrarCambio(m => !m)
    }, "🔄 Cambio de envase")), !ventaEditar && mostrarRotoCompacto && dispenser && /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        padding: 10,
        border: "1px solid var(--color-border-danger)"
      }
    }, /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.input,
        fontSize: 12
      },
      type: "number",
      placeholder: "Precio de reposición $",
      value: dispRotoPrecio,
      onChange: e => setDispRotoPrecio(e.target.value)
    }), /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        width: "100%",
        marginTop: 6,
        fontSize: 11
      },
      onClick: () => {
        setDispRotoPrecio("");
        setMostrarRotoCompacto(false);
      }
    }, "Cancelar")), !ventaEditar && mostrarCambio && /*#__PURE__*/React.createElement(CambioEnvasePanel, {
      productos: productos,
      onCancelar: () => setMostrarCambio(false),
      onConfirmar: (productoViejo, productoNuevo, motivo) => {
        const obsTxt = `Cambio: ${productoViejo} → ${productoNuevo}${motivo.trim() ? ` · ${motivo.trim()}` : ""}`;
        onGuardar([{
          nombre: "Cambio de envase",
          cantidad: 1,
          precio: 0,
          total: 0
        }], "cambio", "0", 0, [{
          prod: productoNuevo,
          cant: 1
        }], [{
          prod: productoViejo,
          cant: 1
        }], obsTxt, "cambio_envase");
        setMostrarCambio(false);
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        marginBottom: 8
      }
    }, [["contado", "Contado"], ["transferencia", "Transfer."], ["fiado", "Fiado"], ["mixto", "Mixto"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
      key: v,
      style: {
        ...s.btn,
        flex: 1,
        fontSize: 11,
        padding: "6px 2px",
        background: pago === v ? "#185FA5" : undefined,
        color: pago === v ? "#fff" : undefined,
        border: pago === v ? "none" : undefined
      },
      onClick: () => setPago(v)
    }, l))), pago === "transferencia" && /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        padding: "8px 10px",
        background: transConfirmada ? "#0a2e1f" : "#1e3a5f",
        border: transConfirmada ? "0.5px solid #4dd9a0" : "0.5px solid #5daaff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: transConfirmada ? "#4dd9a0" : "#5daaff"
      }
    }, transConfirmada ? "✓ Transfer. confirmada" : "⏳ Confirmar transferencia"), /*#__PURE__*/React.createElement("button", {
      style: {
        background: transConfirmada ? "#4dd9a0" : "#185FA5",
        color: transConfirmada ? "#0a2e1f" : "#fff",
        border: "none",
        borderRadius: 6,
        padding: "4px 9px",
        fontSize: 10,
        cursor: "pointer"
      },
      onClick: () => {
        setTransConfirmada(!transConfirmada);
        if (!transConfirmada) sonarTransferencia();
      }
    }, transConfirmada ? "✓ OK" : "Confirmar"))), pago === "mixto" && /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        padding: 10,
        background: "var(--color-background-tertiary)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.input,
        fontSize: 12
      },
      type: "number",
      placeholder: "Efectivo $",
      value: montoEfec,
      onChange: e => {
        const ef = e.target.value;
        setMontoEfec(ef);
        const resto = totalACobrar - (Number(ef) || 0);
        setMontoTrans(resto > 0 ? String(Math.round(resto)) : "");
      }
    }), /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.input,
        fontSize: 12
      },
      type: "number",
      placeholder: "Transfer. $",
      value: montoTrans,
      onChange: e => setMontoTrans(e.target.value)
    })), Number(montoTrans || 0) > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: transConfMixto ? "#4dd9a0" : "#5daaff"
      }
    }, transConfMixto ? "✓ Transfer. confirmada" : "⏳ Confirmar transferencia"), /*#__PURE__*/React.createElement("button", {
      style: {
        background: transConfMixto ? "#4dd9a0" : "#185FA5",
        color: transConfMixto ? "#0a2e1f" : "#fff",
        border: "none",
        borderRadius: 6,
        padding: "4px 9px",
        fontSize: 10,
        cursor: "pointer"
      },
      onClick: () => {
        setTransConfMixto(!transConfMixto);
        if (!transConfMixto) sonarTransferencia();
      }
    }, transConfMixto ? "✓ OK" : "Confirmar"))), pago !== "fiado" && pago !== "mixto" && /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.input,
        fontSize: 12,
        marginBottom: 8
      },
      type: "number",
      placeholder: `Monto cobrado (vacío = ${fmt(aPagar)})`,
      value: monto,
      onChange: e => setMonto(e.target.value)
    }), (ventaEditar || saldoDisp > 0 || cliente.saldo < 0) && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-info)",
        cursor: "pointer"
      },
      onClick: () => setMasOpcionesCompacto(m => !m)
    }, ventaEditar ? masOpcionesCompacto ? "▲ Ocultar notas" : "▼ Notas" : masOpcionesCompacto ? "▲ Menos opciones" : "▼ Más opciones (saldo, deuda, notas)"), masOpcionesCompacto && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, !ventaEditar && saldoDisp > 0 && pago !== "fiado" && /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        padding: "8px 10px",
        background: "var(--color-background-success)",
        border: "0.5px solid var(--color-border-success)",
        cursor: "pointer"
      },
      onClick: () => setUsarSaldo(!usarSaldo)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: usarSaldo,
      onChange: e => setUsarSaldo(e.target.checked),
      style: {
        width: 16,
        height: 16,
        cursor: "pointer",
        accentColor: "#0F6E56"
      }
    }), /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 12,
        color: "var(--color-text-success)",
        cursor: "pointer",
        fontWeight: 500
      }
    }, "Usar saldo a favor — ", fmt(saldoDisp)))), !ventaEditar && cliente.saldo < 0 && pago !== "fiado" && /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        padding: "8px 10px",
        background: "var(--color-background-danger)",
        border: "0.5px solid var(--color-border-danger)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-text-danger)",
        marginBottom: 6
      }
    }, "Deuda pendiente: ", fmt(Math.abs(cliente.saldo))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 5
      }
    }, [["todo", "Paga deuda + compra de hoy", Math.abs(cliente.saldo) + aPagar], ["compra", "Solo la compra de hoy", null], ["parcial", "Pago parcial (ingresá el monto)", null]].map(([op, label, total]) => /*#__PURE__*/React.createElement("button", {
      key: op,
      style: {
        textAlign: "left",
        padding: "6px 10px",
        borderRadius: 7,
        border: "0.5px solid var(--color-border-danger)",
        background: opcionSaldo === op ? "#7f1d1d" : "transparent",
        color: "var(--color-text-danger)",
        fontSize: 11,
        cursor: "pointer",
        fontWeight: opcionSaldo === op ? 500 : 400
      },
      onClick: () => setOpcionSaldo(op)
    }, opcionSaldo === op ? "✓ " : "", label, total ? ` — ${fmt(total)}` : "")))), !ventaEditar && cliente.saldo < 0 && /*#__PURE__*/React.createElement(CobroDeudaPanel, {
      saldo: cliente.saldo,
      onCobrar: (mCobro, pCobro) => {
        onGuardar([{
          nombre: "Cobro de deuda",
          cantidad: 1,
          precio: 0,
          total: 0
        }], pCobro, String(mCobro), 0, [], [], `Cobro de deuda $${mCobro.toLocaleString("es-AR")} (${pCobro})`, "cobro_deuda");
      }
    }), /*#__PURE__*/React.createElement("textarea", {
      style: {
        ...s.input,
        minHeight: 40,
        fontSize: 12,
        marginBottom: 8
      },
      value: obs,
      onChange: e => setObs(e.target.value),
      placeholder: "Notas opcionales..."
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-tertiary)"
      }
    }, "A cobrar"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 500,
        color: "var(--color-text-primary)"
      }
    }, fmt(totalACobrar))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 6
      }
    }, ventaEditar && onCancelar && /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        flex: 1,
        padding: "9px",
        fontSize: 13
      },
      onClick: onCancelar
    }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btnPrimary,
        flex: ventaEditar ? 2 : 1,
        padding: "9px",
        fontSize: 13,
        opacity: detalle.length === 0 ? 0.45 : 1
      },
      disabled: detalle.length === 0,
      onClick: confirmarRegistro
    }, ventaEditar ? "💾 Guardar cambios" : "✓ Registrar entrega")));
  if (compacto) return cuerpoCompacto;
  return /*#__PURE__*/React.createElement("div", {
    style: s.screen
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 15,
      background: "var(--color-background-primary)"
    }
  }, /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: `Clientes · ${cliente.dia || ""}`,
    onVolver: onVolver
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-background-secondary)",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
      padding: "10px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--color-text-primary)"
    }
  }, cliente.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-secondary)",
      marginTop: 1
    }
  }, direccionCliente(cliente), cliente.orden ? ` · #${cliente.orden}` : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      fontSize: 17,
      flexShrink: 0
    }
  }, (cliente.maps || cliente.lat && cliente.lng) && /*#__PURE__*/React.createElement("a", {
    href: cliente.maps || `https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`,
    target: "_blank",
    rel: "noreferrer",
    style: {
      textDecoration: "none"
    },
    onClick: e => e.stopPropagation()
  }, "📍"), cliente.telefono && /*#__PURE__*/React.createElement("a", {
    href: `https://wa.me/54${cliente.telefono}`,
    target: "_blank",
    rel: "noreferrer",
    style: {
      textDecoration: "none"
    },
    onClick: e => e.stopPropagation()
  }, "💬"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 8
    }
  }, cliente.saldo < 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 500,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-danger)",
      color: "var(--color-text-danger)"
    }
  }, "Debe ", fmt(Math.abs(cliente.saldo))), cliente.saldo > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 500,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-success)",
      color: "var(--color-text-success)"
    }
  }, "A favor ", fmt(cliente.saldo)), cliente.sifon > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-info)",
      color: "var(--color-text-info)"
    }
  }, "Sifón×", cliente.sifon), cliente.bidon10 > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-info)",
      color: "var(--color-text-info)"
    }
  }, "10L×", cliente.bidon10), cliente.bidon20 > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-info)",
      color: "var(--color-text-info)"
    }
  }, "20L×", cliente.bidon20), cliente.dispenser > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 5,
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)"
    }
  }, "Disp×", cliente.dispenser), (() => {
    const aj = cliente.envAjuste || {};
    const items = [];
    if ((aj.sifon || 0) > 0) items.push(`+${aj.sifon} sif.`);
    if ((aj.bidon10 || 0) > 0) items.push(`+${aj.bidon10} 10L`);
    if ((aj.bidon20 || 0) > 0) items.push(`+${aj.bidon20} 20L`);
    return items.length > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 5,
        background: "var(--color-background-warning)",
        color: "var(--color-text-warning)"
      }
    }, items.join(" "), " prest.") : null;
  })(), cliente.notas && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--color-text-warning)"
    }
  }, "📝 ", cliente.notas)))), progressData && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-background-tertiary)",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      padding: "6px 14px",
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flex: 1,
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      background: "var(--color-background-secondary)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      borderRadius: 3,
      background: "#185FA5",
      width: `${Math.round(progressData.visitados / Math.max(progressData.total, 1) * 100)}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--color-text-secondary)",
      whiteSpace: "nowrap"
    }
  }, progressData.visitados, "/", progressData.total)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--color-text-success)",
      fontWeight: 500
    }
  }, fmt(progressData.montoHoy)), progressData.stock && Object.entries(progressData.stock).map(([k, v]) => v > 0 ? /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      fontSize: 10,
      color: "var(--color-text-tertiary)"
    }
  }, k, ":", v) : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, (onNoEsta || onNoQuiere || onSaltar) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 14
    }
  }, onNoEsta && /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      background: "var(--color-background-warning)",
      color: "var(--color-text-warning)",
      border: "0.5px solid var(--color-border-warning)",
      borderRadius: 8,
      padding: "11px 8px",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer"
    },
    onClick: onNoEsta
  }, "🔄 No está"), onNoQuiere && /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      background: "var(--color-background-danger)",
      color: "var(--color-text-danger)",
      border: "0.5px solid var(--color-border-danger)",
      borderRadius: 8,
      padding: "11px 8px",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer"
    },
    onClick: () => onNoQuiere(envPrest, envDev)
  }, "🚫 No quiere"), onSaltar && /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 8,
      padding: "11px 8px",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer"
    },
    onClick: onSaltar
  }, "⏭ Saltar")), cuerpoCompacto));
}
function NuevoCliente({
  diaActual,
  repartoActual,
  repartos,
  onGuardar,
  onVolver,
  prefill,
  productos
}) {
  // Usa el FormCliente unificado (12-gestion.js) — mismo formulario
  // completo que "Editar cliente" y que las demás apps (La Catalina,
  // Comercial): día, orden, dirección completa, teléfono, maps, foto,
  // notas, envases habituales, dispenser y saldo inicial.
  return /*#__PURE__*/React.createElement("div", {
    style: s.screen
  }, /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: prefill ? "Nuevo cliente (desde prospecto)" : "Nuevo cliente",
    onVolver: onVolver
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(FormCliente, {
    inicial: {
      dia: diaActual || "Martes",
      repartoId: repartoActual?.id || null,
      ...(prefill || {})
    },
    repartos: repartos,
    productos: productos,
    textoGuardar: "Agregar cliente",
    onGuardar: onGuardar
  })));
}

// ─── MÓDULO PROMOCIÓN ────────────────────────────────────────────────────────