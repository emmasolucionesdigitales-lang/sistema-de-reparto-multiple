// ════════════════════════════════════════════════════════════════════
// ◆  12-gestion.js — GestionClientes · FormCliente · Resumen · exportar · importar · Calculadora
// ════════════════════════════════════════════════════════════════════

function GestionClientes({
  clientes,
  onEditar,
  onEliminar,
  onNuevo,
  onVolver,
  onReordenarTodo,
  onRegistrarVenta,
  onVerDetalle,
  ventas,
  repartos,
  productos,
  onGuardarCambio,
  onIrTab,
  onPerdida,
  onPerdidaCliente
}) {
  const [fotoClienteId, setFotoClienteId] = React.useState(null);
  const [reasignandoId, setReasignandoId] = useState(null);
  const fotoCliente = fotoClienteId ? clientes.find(c => c.id === fotoClienteId) : null;
  const [busqueda, setBusqueda] = useState("");
  const [filtroDia, setFiltroDia] = useState("todos");
  const [filtroRepartidor, setFiltroRepartidor] = useState("todos");
  const [modoNuevo, setModoNuevo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [cambioId, setCambioId] = useState(null);
  const [productoViejoCambio, setProductoViejoCambio] = useState("Bidón 20L");
  const [productoNuevoCambio, setProductoNuevoCambio] = useState("Bidón 20L");
  const [motivoCambio, setMotivoCambio] = useState("Agua en mal estado");
  const [clienteMoviendo, setClienteMoviendo] = useState(null); // id del cliente "levantado", esperando destino (mismo día)

  const moverCliente = (idOrigen, idDestino) => {
    if (idOrigen === idDestino) return;
    const origen = clientes.find(c => c.id === idOrigen);
    const destino = clientes.find(c => c.id === idDestino);
    if (!origen || !destino) return;
    if (origen.dia !== destino.dia) {
      alert("Solo podés reordenar dentro del mismo día.");
      return;
    }
    const delDia = [...clientes].filter(c => c.dia === origen.dia).sort((a, b) => (a.orden || 9999) - (b.orden || 9999));
    const idsDelDia = delDia.map(c => c.id);
    const idxOrigen = idsDelDia.indexOf(idOrigen),
      idxDestino = idsDelDia.indexOf(idDestino);
    if (idxOrigen === -1 || idxDestino === -1) return;
    const nuevoOrden = [...idsDelDia];
    const [item] = nuevoOrden.splice(idxOrigen, 1);
    nuevoOrden.splice(idxDestino, 0, item);
    const posMap = {};
    nuevoOrden.forEach((id, i) => {
      posMap[id] = i + 1;
    });
    onReordenarTodo(clientes.map(c => posMap[c.id] !== undefined ? {
      ...c,
      orden: posMap[c.id]
    } : c));
  };

  const filtrados = clientes.filter(c => filtroDia === "todos" || c.dia === filtroDia).filter(c => filtroRepartidor === "todos" || c.repartoId === filtroRepartidor).filter(c => buscarCliente(c, busqueda) > 0).sort((a, b) => {
    if (busqueda.trim()) {
      const dif = buscarCliente(b, busqueda) - buscarCliente(a, busqueda);
      if (dif !== 0) return dif;
    }
    if (a.dia !== b.dia) return DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia);
    return (a.orden || 9999) - (b.orden || 9999);
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: s.screen
  }, /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: "Gestión de clientes",
    onVolver: onVolver
  }), onIrTab && /*#__PURE__*/React.createElement(ClientesTabs, {
    activo: "todos",
    onIr: onIrTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px 6px"
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Buscar por domicilio, nombre o teléfono...",
    value: busqueda,
    onChange: e => setBusqueda(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, ["todos", ...DIAS].map(d => /*#__PURE__*/React.createElement("button", {
    key: d,
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px",
      background: filtroDia === d ? "#185FA5" : "var(--color-background-tertiary)",
      color: filtroDia === d ? "#e2eaf4" : "var(--color-text-secondary)",
      border: filtroDia === d ? "none" : "0.5px solid var(--color-border-secondary)"
    },
    onClick: () => setFiltroDia(d)
  }, d === "todos" ? "Todos" : d)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px",
      marginLeft: "auto",
      background: "#185FA5",
      color: "#e2eaf4",
      border: "none"
    },
    onClick: () => {
      setModoNuevo(true);
      setEditandoId(null);
    }
  }, "+ Nuevo"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px"
    },
    onClick: () => {
      const porDia = {};
      DIAS.forEach(d => {
        porDia[d] = [...clientes].filter(c => c.dia === d).sort((a, b) => (a.orden || 9999) - (b.orden || 9999));
      });
      const compactados = clientes.map(c => {
        const lista = porDia[c.dia];
        const idx = lista.findIndex(x => x.id === c.id);
        return idx >= 0 ? {
          ...c,
          orden: idx + 1
        } : c;
      });
      if (window.confirm("¿Reordenar todos los clientes eliminando los huecos en la numeración?")) onReordenarTodo(compactados);
    }
  }, "↺ Reordenar")), repartos && repartos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 6,
      flexWrap: "wrap",
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px",
      background: filtroRepartidor === "todos" ? "#0e7c6b" : "var(--color-background-tertiary)",
      color: filtroRepartidor === "todos" ? "#e2eaf4" : "var(--color-text-secondary)",
      border: filtroRepartidor === "todos" ? "none" : "0.5px solid var(--color-border-secondary)"
    },
    onClick: () => setFiltroRepartidor("todos")
  }, "🚚 Todos"), [...repartos].sort((a, b) => (a.numero || 0) - (b.numero || 0)).map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px",
      flexShrink: 0,
      background: filtroRepartidor === r.id ? "#0e7c6b" : "var(--color-background-tertiary)",
      color: filtroRepartidor === r.id ? "#e2eaf4" : "var(--color-text-secondary)",
      border: filtroRepartidor === r.id ? "none" : "0.5px solid var(--color-border-secondary)"
    },
    onClick: () => setFiltroRepartidor(r.id)
  }, "Rep.", r.numero, " · ", (r.repartidorNombre || "").split(" ")[0]))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: clienteMoviendo ? "var(--color-text-warning)" : "var(--color-text-tertiary)",
      marginTop: 6,
      fontWeight: clienteMoviendo ? 600 : 400
    }
  }, clienteMoviendo ? `📍 Tocá el # de dónde debería ir "${clientes.find(c => c.id === clienteMoviendo)?.nombre || ""}" (mismo día · tocá el mismo para cancelar)` : `${filtrados.length} clientes${filtroDia !== "todos" ? ` · ${filtroDia}` : ""} · Tocá el # de un cliente para moverlo dentro de su día`)), modoNuevo && /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "6px 14px",
      borderLeft: "3px solid #185FA5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.row,
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, "Nuevo cliente"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px"
    },
    onClick: () => setModoNuevo(false)
  }, "Cancelar")), /*#__PURE__*/React.createElement(FormCliente, {
    inicial: {
      nombre: "",
      dia: "Martes",
      barrio: "",
      manzana: "",
      lote: "",
      sector: "",
      calle: "",
      nro: "",
      aclaracion: "",
      telefono: "",
      maps: "",
      notas: "",
      sifon: 0,
      bidon10: 0,
      bidon20: 0,
      orden: ""
    },
    onGuardar: datos => {
      onNuevo(datos);
      setModoNuevo(false);
    },
    repartos: repartos
  })), filtrados.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      ...s.card,
      borderLeft: editandoId === c.id ? "3px solid #5daaff" : "0.5px solid var(--color-border-tertiary)"
    }
  }, editandoId === c.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.row,
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, "Editando"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      fontSize: 11,
      padding: "3px 10px"
    },
    onClick: () => setEditandoId(null)
  }, "Cancelar")), /*#__PURE__*/React.createElement(FormCliente, {
    inicial: c,
    onGuardar: datos => {
      onEditar(c.id, datos);
      setEditandoId(null);
    },
    repartos: repartos
  }), (() => {
    // total actual prestado: se lee directo de c.prestado (se mantiene solo,
    // ver aplicarMovimientoEnvases en 17-app.js). El usuario edita el TOTAL
    // directamente, que ahora se guarda derecho en c.prestado.
    const total = {
      sifon: prestadoClienteDe(c, "sifon", ventas),
      bidon10: prestadoClienteDe(c, "bidon10", ventas),
      bidon20: prestadoClienteDe(c, "bidon20", ventas)
    };
    const setTotal = (k, val) => {
      const n = Math.max(0, Number(val) || 0);
      onEditar(c.id, {
        prestado: {
          ...(c.prestado || {}),
          [k]: n
        }
      });
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...s.card,
        margin: "4px 0",
        background: "var(--color-background-tertiary)",
        padding: "10px 12px",
        borderLeft: "3px solid var(--color-border-warning)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--color-text-warning)",
        marginBottom: 4
      }
    }, "📦 Envases extra prestados al cliente"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-tertiary)",
        marginBottom: 8
      }
    }, "Editá directamente la cantidad que tiene en su poder. Ponelo en 0 si ya los devolvió todos."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["sifon", "Sifón"], ["bidon10", "10L"], ["bidon20", "20L"]].map(([k, l]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        flex: 1,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        textAlign: "center",
        fontSize: 11
      }
    }, l), /*#__PURE__*/React.createElement("input", {
      style: {
        ...s.inputNum,
        textAlign: "center",
        fontSize: 18,
        fontWeight: 700,
        color: total[k] > 0 ? "var(--color-text-warning)" : total[k] < 0 ? "var(--color-text-success)" : "var(--color-text-tertiary)"
      },
      type: "number",
      value: total[k],
      onChange: e => setTotal(k, e.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "var(--color-text-tertiary)",
        marginTop: 3
      }
    }, total[k] > 0 ? "prestado" : total[k] < 0 ? "devuelto de más" : "ok")))));
  })()) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: onVerDetalle ? "pointer" : "default"
    },
    onClick: () => onVerDetalle && onVerDetalle(c)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      flexShrink: 0,
      background: clienteMoviendo === c.id ? "#185FA5" : clienteMoviendo && clientes.find(x => x.id === clienteMoviendo)?.dia === c.dia ? "var(--color-background-warning)" : "var(--color-background-tertiary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 600,
      color: clienteMoviendo === c.id ? "#fff" : clienteMoviendo && clientes.find(x => x.id === clienteMoviendo)?.dia === c.dia ? "var(--color-text-warning)" : "var(--color-text-tertiary)",
      border: clienteMoviendo === c.id ? "1.5px solid #5daaff" : "none"
    },
    onClick: e => {
      e.stopPropagation();
      if (clienteMoviendo === null) setClienteMoviendo(c.id);else if (clienteMoviendo === c.id) setClienteMoviendo(null);else {
        moverCliente(clienteMoviendo, c.id);
        setClienteMoviendo(null);
      }
    }
  }, clienteMoviendo === c.id ? "✓" : c.orden || "#"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "var(--color-text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, c.nombre), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20,
      background: "var(--color-background-success)",
      color: "var(--color-text-success)",
      flexShrink: 0
    }
  }, c.dia)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)",
      marginTop: 3
    }
  }, direccionCliente(c)), c.notas && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-warning)",
      marginTop: 2
    }
  }, "📝 ", c.notas), repartos && repartos.length > 0 && (() => {
    const rep = repartos.find(r => r.id === c.repartoId || String(r.id) === String(c.repartoId));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: rep ? "var(--color-text-info)" : "var(--color-text-tertiary)",
        marginTop: 2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        textDecoration: "underline",
        textDecorationStyle: "dotted"
      },
      onClick: e => {
        e.stopPropagation();
        setReasignandoId(c.id);
      }
    }, "🚚 ", rep ? rep.repartidorNombre : "Sin asignar");
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginTop: 7
    }
  }, c.saldo < 0 && /*#__PURE__*/React.createElement("span", {
    style: s.badge("danger")
  }, "Debe ", fmt(Math.abs(c.saldo))), c.saldo > 0 && /*#__PURE__*/React.createElement("span", {
    style: s.badge("success")
  }, "A favor ", fmt(c.saldo)), (() => {
    const real = {
      sifon: Math.max(0, (Number(c.sifon) || 0) + prestadoClienteDe(c, "sifon", ventas)),
      bidon10: Math.max(0, (Number(c.bidon10) || 0) + prestadoClienteDe(c, "bidon10", ventas)),
      bidon20: Math.max(0, (Number(c.bidon20) || 0) + prestadoClienteDe(c, "bidon20", ventas))
    };
    const pill = txt => /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 20,
        background: "var(--color-background-info)",
        color: "var(--color-text-info)"
      }
    }, txt);
    return /*#__PURE__*/React.createElement(React.Fragment, null, real.sifon > 0 && pill(`Sif ×${real.sifon}`), real.bidon10 > 0 && pill(`10L ×${real.bidon10}`), real.bidon20 > 0 && pill(`20L ×${real.bidon20}`), c.dispenser > 0 && pill(`Disp ×${c.dispenser}`));
  })())), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flexShrink: 0,
      alignItems: "center"
    }
  }, (c.maps || c.lat && c.lng) && /*#__PURE__*/React.createElement("a", {
    href: c.maps || `https://www.google.com/maps?q=${c.lat},${c.lng}`,
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 18,
      textDecoration: "none"
    },
    onClick: e => e.stopPropagation()
  }, "📍"), c.telefono && /*#__PURE__*/React.createElement("a", {
    href: `https://wa.me/54${c.telefono}`,
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 18,
      textDecoration: "none"
    },
    onClick: e => e.stopPropagation()
  }, "💬"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      cursor: "pointer",
      lineHeight: 1
    },
    onClick: e => {
      e.stopPropagation();
      setFotoClienteId(fotoClienteId === c.id ? null : c.id);
    }
  }, "📷"))), /*#__PURE__*/React.createElement(PieEnvases, {
    c: c,
    ventas: ventas,
    onEditar: onEditar,
    onPerdida: onPerdida,
    onPerdidaCliente: onPerdidaCliente,
    izquierda: /*#__PURE__*/React.createElement("button", {
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        cursor: "pointer",
        background: "var(--color-background-danger)",
        color: "var(--color-text-danger)",
        border: "1px solid var(--color-border-danger)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13
      },
      onClick: e => {
        e.stopPropagation();
        onEliminar(c.id);
      },
      title: "Eliminar cliente"
    }, "🗑️")
  }, onRegistrarVenta && /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 12px",
      borderRadius: 20,
      cursor: "pointer",
      background: "#185FA5",
      color: "#e2eaf4",
      border: "none"
    },
    onClick: e => {
      e.stopPropagation();
      onRegistrarVenta(c);
    }
  }, "💰 Venta"), /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 12px",
      borderRadius: 20,
      cursor: "pointer",
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)",
      border: "0.5px solid var(--color-border-secondary)"
    },
    onClick: e => {
      e.stopPropagation();
      setCambioId(cambioId === c.id ? null : c.id);
    }
  }, "🔄 Cambio"), /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 12px",
      borderRadius: 20,
      cursor: "pointer",
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)",
      border: "0.5px solid var(--color-border-secondary)"
    },
    onClick: e => {
      e.stopPropagation();
      setEditandoId(c.id);
    }
  }, "✏️ Editar")), cambioId === c.id && /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "8px 0 0",
      border: "1px solid #818cf8"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)",
      marginBottom: 8,
      fontWeight: 500
    }
  }, "🔄 Cambio de envase (no se cobra)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      marginBottom: 4
    }
  }, "Se retira"), /*#__PURE__*/React.createElement("select", {
    style: s.select,
    value: productoViejoCambio,
    onChange: e => setProductoViejoCambio(e.target.value)
  }, (productos || []).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.nombre
  }, p.nombre)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      marginBottom: 4
    }
  }, "Se entrega"), /*#__PURE__*/React.createElement("select", {
    style: s.select,
    value: productoNuevoCambio,
    onChange: e => setProductoNuevoCambio(e.target.value)
  }, (productos || []).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.nombre
  }, p.nombre))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      marginBottom: 4
    }
  }, "Motivo"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Ej: Agua en mal estado",
    value: motivoCambio,
    onChange: e => setMotivoCambio(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      flex: 1,
      fontSize: 12
    },
    onClick: () => setCambioId(null)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      flex: 2,
      fontSize: 12,
      padding: "8px"
    },
    onClick: () => {
      const vt = {
        id: Date.now(),
        clienteId: c.id,
        cliente: c.nombre,
        dia: c.dia,
        fechaKey: new Date().toLocaleDateString("en-CA"),
        fecha: new Date().toLocaleString("es-AR"),
        detalle: [{
          nombre: "Cambio de envase",
          cantidad: 1,
          precio: 0,
          total: 0
        }],
        pago: "cambio",
        obs: `Cambio: ${productoViejoCambio} → ${productoNuevoCambio}${motivoCambio.trim() ? ` · ${motivoCambio.trim()}` : ""}`,
        neto: 0,
        bruto: 0,
        desc: 0,
        costo: 0,
        ganancia: 0,
        pagadoNum: 0,
        saldoDelta: 0,
        envDev: [{
          prod: productoViejoCambio,
          cant: 1
        }],
        envPrest: [{
          prod: productoNuevoCambio,
          cant: 1
        }],
        _esCambio: true,
        _upd: Date.now()
      };
      onGuardarCambio && onGuardarCambio(vt);
      setCambioId(null);
      setMotivoCambio("Agua en mal estado");
    }
  }, "✓ Registrar cambio")))))), filtrados.length === 0 && !modoNuevo && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--color-text-tertiary)",
      fontSize: 14
    }
  }, "No hay clientes", filtroDia !== "todos" ? ` en ${filtroDia}` : "", ".")), reasignandoId && repartos && (() => {
    const cli = filtrados.find(x => x.id === reasignandoId) || clientes.find(x => x.id === reasignandoId);
    if (!cli) return null;
    const repActual = repartos.find(r => r.id === cli.repartoId || String(r.id) === String(cli.repartoId));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      },
      onClick: () => setReasignandoId(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--color-background-primary)",
        borderRadius: 16,
        padding: 20,
        width: "100%",
        maxWidth: 360,
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: "var(--color-text-primary)"
      }
    }, "↔ Reasignar reparto"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-secondary)"
      }
    }, /*#__PURE__*/React.createElement("b", null, cli.nombre), /*#__PURE__*/React.createElement("br", null), repActual ? `Actualmente: ${repActual.repartidorNombre}` : "Sin reparto asignado"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        fontWeight: 500
      }
    }, "Día de visita"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, DIAS.map(d => /*#__PURE__*/React.createElement("button", {
      key: d,
      style: {
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 12,
        border: "1px solid var(--color-border-secondary)",
        cursor: "pointer",
        background: cli.dia === d ? "#185FA5" : "var(--color-background-tertiary)",
        color: cli.dia === d ? "#e2eaf4" : "var(--color-text-secondary)",
        fontWeight: cli.dia === d ? 600 : 400
      },
      onClick: () => {
        onEditar(cli.id, {
          dia: d
        });
        setReasignandoId(null);
      }
    }, d)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        ...s.label,
        fontWeight: 500
      }
    }, "Repartidor"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 13,
        border: "1px solid var(--color-border-secondary)",
        cursor: "pointer",
        textAlign: "left",
        background: !cli.repartoId ? "rgba(93,170,255,0.15)" : "var(--color-background-tertiary)",
        color: !cli.repartoId ? "var(--color-text-info)" : "var(--color-text-secondary)"
      },
      onClick: () => {
        onEditar(cli.id, {
          repartoId: null
        });
        setReasignandoId(null);
      }
    }, "— Sin asignar"), repartos.map(r => /*#__PURE__*/React.createElement("button", {
      key: r.id,
      style: {
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 13,
        border: "1px solid var(--color-border-secondary)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: cli.repartoId === r.id || String(cli.repartoId) === String(r.id) ? "rgba(93,170,255,0.2)" : "var(--color-background-tertiary)",
        color: cli.repartoId === r.id || String(cli.repartoId) === String(r.id) ? "var(--color-text-info)" : "var(--color-text-primary)"
      },
      onClick: () => {
        onEditar(cli.id, {
          repartoId: r.id
        });
        setReasignandoId(null);
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, r.numero, "."), " ", r.repartidorNombre), (cli.repartoId === r.id || String(cli.repartoId) === String(r.id)) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, "✓"))))), /*#__PURE__*/React.createElement("button", {
      style: {
        ...s.btn,
        textAlign: "center"
      },
      onClick: () => setReasignandoId(null)
    }, "Cancelar")));
  })(), fotoClienteId && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.92)",
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    onClick: () => setFotoClienteId(null)
  }, fotoCliente && fotoCliente.foto ? /*#__PURE__*/React.createElement("img", {
    src: fotoCliente.foto,
    alt: "Domicilio",
    style: {
      maxWidth: "100%",
      maxHeight: "60vh",
      borderRadius: 10,
      objectFit: "contain",
      marginBottom: 16
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#aaa",
      fontSize: 14,
      marginBottom: 20
    }
  }, "Sin foto aún · ", fotoCliente && fotoCliente.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      background: "#185FA5",
      color: "#e2eaf4",
      padding: "12px 20px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      textAlign: "center"
    }
  }, "📷 Cámara", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    capture: "environment",
    style: {
      display: "none"
    },
    onChange: async e => {
      const f = e.target.files[0];
      if (!f) return;
      const b64 = await comprimirFoto(f);
      onEditar(fotoClienteId, {
        foto: b64
      });
      setFotoClienteId(null);
    }
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      background: "#2a3a4a",
      color: "#e2eaf4",
      padding: "12px 20px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      textAlign: "center"
    }
  }, "🖼 Galería", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    style: {
      display: "none"
    },
    onChange: async e => {
      const f = e.target.files[0];
      if (!f) return;
      const b64 = await comprimirFoto(f);
      onEditar(fotoClienteId, {
        foto: b64
      });
      setFotoClienteId(null);
    }
  })), fotoCliente && fotoCliente.foto && /*#__PURE__*/React.createElement("button", {
    style: {
      background: "#3a2020",
      color: "#e05c5c",
      padding: "12px 14px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      border: "none"
    },
    onClick: () => {
      onEditar(fotoClienteId, {
        foto: ""
      });
      setFotoClienteId(null);
    }
  }, "🗑")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#aaa",
      fontSize: 11,
      marginTop: 14
    }
  }, "Tocá fuera para cerrar")));
}
function importarClientesPlanilla(file, clientesActuales, onImportado, repartoId) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, {
        type: "array"
      });

      // Buscar hoja "Clientes" o la primera hoja
      const hoja = wb.Sheets["Clientes"] || wb.Sheets[wb.SheetNames[0]];
      if (!hoja) {
        alert("No se encontró ninguna hoja en el archivo.");
        return;
      }

      // Leer en modo raw para detectar la fila de encabezados
      const rawRows = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: ""
      });
      if (!rawRows.length) {
        alert("El archivo está vacío.");
        return;
      }

      // Buscar la fila que contiene "nombre" (puede ser fila 1, 2 o 3)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        if (rawRows[i].some(c => String(c).toLowerCase().trim().includes("nombre"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        alert("No se encontró la fila de encabezados. El archivo debe tener una columna 'Nombre'.");
        return;
      }

      // Construir mapa de columnas (flexible con mayúsculas, acentos y nombres alternativos)
      const headers = rawRows[headerIdx].map(h => String(h).toLowerCase().trim().normalize("NFD").replace(/\p{Mn}/gu, ""));
      const col = (...keys) => {
        for (const k of keys) {
          const kn = k.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
          const idx = headers.findIndex(h => h.includes(kn) || kn.includes(h));
          if (idx !== -1) return idx;
        }
        return -1;
      };
      const C = {
        nombre: col("nombre", "apellido"),
        dia: col("dia", "día", "day", "jornada", "reparto"),
        orden: col("orden", "n° orden", "order", "n orden"),
        barrio: col("barrio", "zona", "neighborhood"),
        calle: col("calle", "street", "direccion", "dirección"),
        nro: col("numero", "número", "n°", "nro", "number"),
        manzana: col("manzana", "mz"),
        lote: col("lote", "lt"),
        sector: col("sector"),
        aclaracion: col("aclaracion", "aclaración", "casa", "piso", "depto"),
        telefono: col("telefono", "teléfono", "tel", "phone", "celular", "sin 0"),
        maps: col("maps", "google maps", "ubicacion", "link"),
        sifon: col("sifon", "sifón", "sifones", "sifones 1.5"),
        bidon10: col("10l", "bidon 10", "bidón 10", "bidones 10", "b10"),
        bidon20: col("20l", "bidon 20", "bidón 20", "bidones 20", "b20"),
        dispenser: col("dispenser", "dispensador"),
        saldo: col("saldo"),
        notas: col("notas", "nota", "rapidas", "rápidas", "comentario")
      };
      const DIAS_VALIDOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const errores = [];
      const nuevos = [];
      const SKIP = ["▼", "instrucciones", "sistema de reparto", "completá", "clientes"];
      const dataRows = rawRows.slice(headerIdx + 1);
      dataRows.forEach((r, i) => {
        const fila = headerIdx + i + 2; // nro de fila real en el Excel
        const get = idx => idx !== -1 ? String(r[idx] || "").trim() : "";
        const getN = idx => idx !== -1 ? Number(r[idx]) || 0 : 0;
        const nombre = get(C.nombre);
        if (!nombre || SKIP.some(p => nombre.toLowerCase().includes(p))) return;
        const diaRaw = get(C.dia);
        const dia = DIAS_VALIDOS.find(d => d.toLowerCase() === diaRaw.toLowerCase()) || DIAS_VALIDOS.find(d => diaRaw.toLowerCase().includes(d.toLowerCase().slice(0, 4)));
        if (!dia) {
          errores.push(`Fila ${fila} (${nombre}): día inválido "${diaRaw}"`);
          return;
        }
        nuevos.push({
          id: Date.now() + i,
          nombre,
          dia,
          orden: getN(C.orden),
          barrio: get(C.barrio),
          calle: get(C.calle),
          nro: get(C.nro),
          manzana: get(C.manzana),
          lote: get(C.lote),
          sector: get(C.sector),
          aclaracion: get(C.aclaracion),
          telefono: get(C.telefono),
          maps: get(C.maps),
          sifon: getN(C.sifon),
          bidon10: getN(C.bidon10),
          bidon20: getN(C.bidon20),
          dispenser: getN(C.dispenser),
          saldo: getN(C.saldo),
          notas: get(C.notas),
          repartoId: repartoId || null
        });
      });
      if (errores.length > 0) {
        const errMsg = `⚠️ ${errores.length} fila${errores.length !== 1 ? "s" : ""} con error:\n\n` + errores.slice(0, 5).join("\n") + (errores.length > 5 ? `\n... y ${errores.length - 5} más` : "");
        alert(errMsg);
      }
      if (nuevos.length === 0) {
        alert("No se encontraron clientes válidos. Verificá que el archivo tenga datos debajo de la fila de encabezados.");
        return;
      }

      // Vista previa + confirmación
      const dias = [...new Set(nuevos.map(c => c.dia))].join(", ");
      const resumen = `📋 Vista previa del import:\n\n` + `✅ ${nuevos.length} clientes encontrados\n` + `📅 Días: ${dias}\n\n` + (clientesActuales.length > 0 ? `Los ${nuevos.length} clientes se van a AGREGAR a los ${clientesActuales.length} existentes.\n\n` : "") + `¿Confirmar la importación?`;
      if (!window.confirm(resumen)) return;
      const DIAS_ORD = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const todos = [...clientesActuales, ...nuevos].sort((a, b) => DIAS_ORD.indexOf(a.dia) - DIAS_ORD.indexOf(b.dia) || (a.orden || 9999) - (b.orden || 9999));
      onImportado(todos);
      alert(`✅ ${nuevos.length} clientes importados correctamente.`);
    } catch (err) {
      alert("Error al leer el archivo: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}
function esLinkCorto(url) {
  return url && (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps"));
}
function CargaGPSMasiva({
  clientes,
  onActualizar,
  onVolver
}) {
  const sinGPS = React.useMemo(() => (clientes || []).filter(c => !c.lat || !c.lng), []);
  const [idx, setIdx] = React.useState(0);
  const [latVal, setLatVal] = React.useState("");
  const [lngVal, setLngVal] = React.useState("");
  const [guardados, setGuardados] = React.useState(0);
  const [listo, setListo] = React.useState(false);
  const actualizados = React.useRef([...clientes]);
  const cliente = sinGPS[idx] || null;
  const coordsDelLink = cliente?.maps ? extraerCoordsDeURL(cliente.maps) : null;
  React.useEffect(() => {
    if (!cliente) return;
    if (coordsDelLink) {
      setLatVal(String(coordsDelLink.lat));
      setLngVal(String(coordsDelLink.lng));
    } else {
      setLatVal("");
      setLngVal("");
    }
  }, [idx]);
  const guardarYSiguiente = (omitir = false) => {
    if (!omitir && cliente) {
      const lat = parseFloat(latVal),
        lng = parseFloat(lngVal);
      if (!isNaN(lat) && !isNaN(lng)) {
        const i = actualizados.current.findIndex(c => c.id === cliente.id);
        if (i >= 0) actualizados.current[i] = {
          ...actualizados.current[i],
          lat,
          lng
        };
        const ng = guardados + 1;
        setGuardados(ng);
        if (ng % 5 === 0 || idx + 1 >= sinGPS.length) onActualizar([...actualizados.current]);
      }
    }
    setLatVal("");
    setLngVal("");
    if (idx + 1 >= sinGPS.length) setListo(true);else setIdx(i => i + 1);
  };
  if (sinGPS.length === 0 || listo || !cliente) return /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.screen,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48
    }
  }, "✅"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      textAlign: "center"
    }
  }, "¡GPS cargado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)",
      textAlign: "center"
    }
  }, guardados, " cliente", guardados !== 1 ? "s" : "", " con GPS guardado."), /*#__PURE__*/React.createElement("button", {
    style: s.btnPrimary,
    onClick: onVolver
  }, "Ver mapa →"));
  const progreso = Math.round(idx / sinGPS.length * 100);
  const dir = direccionCliente(cliente);
  const latOk = latVal && lngVal && !isNaN(parseFloat(latVal)) && !isNaN(parseFloat(lngVal));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.screen,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: `Cargar GPS · ${idx + 1}/${sinGPS.length}`,
    onVolver: onVolver
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: "var(--color-background-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      background: "#185FA5",
      width: `${progreso}%`,
      transition: "width 0.3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      marginBottom: 2
    }
  }, cliente.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)"
    }
  }, cliente.dia, " · ", dir), cliente.maps && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--color-text-tertiary)",
      marginTop: 2,
      wordBreak: "break-all"
    }
  }, cliente.maps)), coordsDelLink && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-background-success)",
      borderRadius: 10,
      padding: "10px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-success)",
      fontWeight: 600
    }
  }, "✓ Coordenadas extraídas del link"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-success)"
    }
  }, coordsDelLink.lat.toFixed(5), ", ", coordsDelLink.lng.toFixed(5))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-background-info)",
      borderRadius: 10,
      padding: "10px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-info)",
      fontWeight: 600,
      marginBottom: 4
    }
  }, "📋 Cómo obtener las coordenadas:"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-secondary)",
      lineHeight: 1.8
    }
  }, "1. Tocá ", /*#__PURE__*/React.createElement("b", null, "\"Abrir en Maps\""), " abajo", /*#__PURE__*/React.createElement("br", null), "2. ", /*#__PURE__*/React.createElement("b", null, "Mantené presionado"), " el punto del cliente", /*#__PURE__*/React.createElement("br", null), "3. Aparecen los números: ", /*#__PURE__*/React.createElement("b", null, "-26.865, -65.217"), /*#__PURE__*/React.createElement("br", null), "4. Tocá esos números → ", /*#__PURE__*/React.createElement("b", null, "Copiar"), /*#__PURE__*/React.createElement("br", null), "5. Volvé acá y pegá abajo")), cliente.maps && /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      background: "#1a7a3a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    onClick: () => window.open(cliente.maps, "_blank")
  }, "🗺 Abrir en Google Maps"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      fontSize: 12,
      fontWeight: 600
    }
  }, "Pegá las coordenadas (ej: -26.86590, -65.21780)"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...s.input,
      marginTop: 4
    },
    placeholder: "-26.86590, -65.21780",
    value: latVal && lngVal ? `${latVal}, ${lngVal}` : latVal,
    onChange: e => {
      const raw = e.target.value;
      const m = raw.match(/(-?\d+(?:\.\d+)?)[,;\s]+(-?\d+(?:\.\d+)?)/);
      if (m) {
        setLatVal(m[1]);
        setLngVal(m[2]);
      } else setLatVal(raw);
    }
  }), latOk ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4dd9a0",
      marginTop: 4
    }
  }, "✓ ", latVal, ", ", lngVal) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      marginTop: 4
    }
  }, "Pegá los dos números separados por coma")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      flex: 1,
      padding: "12px",
      fontSize: 13
    },
    onClick: () => guardarYSiguiente(true)
  }, "Omitir →"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      flex: 2,
      opacity: latOk || coordsDelLink ? 1 : 0.4
    },
    disabled: !latOk && !coordsDelLink,
    onClick: () => guardarYSiguiente(false)
  }, "Guardar y siguiente →")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      textAlign: "center"
    }
  }, guardados, " guardados · ", sinGPS.length - idx - 1, " restantes · Se sincroniza cada 5")));
}
function calcularRutaOptima(clientes) {
  if (clientes.length <= 1) return clientes;
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng);
  const restantes = [...clientes];
  const ruta = [restantes.shift()];
  while (restantes.length > 0) {
    const ul = ruta[ruta.length - 1];
    let md = Infinity,
      mi = 0;
    restantes.forEach((c, i) => {
      const d = dist(ul, c);
      if (d < md) {
        md = d;
        mi = i;
      }
    });
    ruta.push(restantes.splice(mi, 1)[0]);
  }
  return ruta;
}
function PreviaRuta({
  rutaOptima,
  ventasHoy,
  noVisHoy,
  onAplicar,
  onVolver
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.screen,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(HeaderApp, {
    titulo: "Ruta óptima sugerida",
    onVolver: onVolver
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "var(--color-background-info)",
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-info)",
      lineHeight: 1.6
    }
  }, "Orden que minimiza la distancia total. Podés aplicarlo o volver sin cambios.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 80
    }
  }, rutaOptima.map((c, i) => {
    const entregado = ventasHoy.some(v => v.clienteId === c.id);
    const noVis = noVisHoy.some(v => v.clienteId === c.id);
    const dir = direccionCliente(c);
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        ...s.card,
        margin: "6px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#185FA5",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0
      }
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, c.nombre), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-secondary)"
      }
    }, c.dia, " · ", dir)), entregado && /*#__PURE__*/React.createElement("span", {
      style: s.badge("success")
    }, "✓"), noVis && /*#__PURE__*/React.createElement("span", {
      style: s.badge("danger")
    }, "✗"), c.orden && c.orden !== i + 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "var(--color-text-tertiary)"
      }
    }, "antes:", c.orden));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      padding: "12px 16px",
      background: "var(--color-background-secondary)",
      borderTop: "0.5px solid var(--color-border-tertiary)",
      display: "flex",
      gap: 8,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      flex: 1,
      padding: "12px"
    },
    onClick: onVolver
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      flex: 2
    },
    onClick: onAplicar
  }, "✓ Aplicar este orden")));
}
