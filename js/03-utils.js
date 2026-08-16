// ════════════════════════════════════════════════════════════════════
// ◆  03-utils.js — debounceSave, useLS, calcVenta, comprimirFoto, fmtFechaHoraVenta
// ════════════════════════════════════════════════════════════════════

// ── Muestra la fecha y hora real del teléfono de un registro (ej: "19/6/2026 · 14:30", sin segundos) ──
// ── Arma la dirección completa de un cliente, combinando TODOS los campos
//    que tenga cargados — sector, manzana, lote, casa/dpto, calle, número,
//    barrio. No todos los clientes usan los mismos campos (unos tienen
//    calle y número, otros manzana/lote/sector de un barrio popular, otros
//    le suman casa o depto) — esta función junta lo que haya, sin dejar
//    afuera nada de lo cargado. Usarla en TODOS lados en vez de armar la
//    dirección a mano cada vez.
function direccionCliente(c) {
  if (!c) return "";
  const partes = [];
  if (c.calle) {
    partes.push(`${c.calle} ${c.nro || ""}`.trim());
  } else if (c.manzana || c.lote || c.sector) {
    let base = "";
    if (c.sector) base += `S${c.sector} `;
    if (c.manzana) base += `Mz ${c.manzana} `;
    if (c.lote) base += `L ${c.lote}`;
    if (base.trim()) partes.push(base.trim());
  }
  if (c.aclaracion) partes.push(c.aclaracion);
  if (c.barrio) partes.push(c.barrio);
  return partes.join(" · ");
}
const KEY_PROD_ENV = {
  "Sifón 1.5L": "sifon",
  "Bidón 10L": "bidon10",
  "Bidón 20L": "bidon20",
  "Dispenser": "dispenser"
};
// ── Cuánto tiene PRESTADO un cliente de un producto ("sifon"|"bidon10"|
//    "bidon20"|"dispenser"). Se lee directo de c.prestado (campo que se
//    mantiene solo, sumando/restando en cada venta — ver
//    aplicarMovimientoEnvases en 17-app.js). Si el cliente todavía no tiene
//    ese campo (no tuvo ventas con envases desde que se agregó este modelo),
//    se calcula del historial de ventas de ese cliente + el ajuste manual
//    (c.envAjuste) como referencia inicial. Usar SIEMPRE esta función en vez
//    de recalcular a mano — así todas las pantallas muestran el mismo número.
function prestadoClienteDe(c, k, ventasHistoricas) {
  if (c.prestado && c.prestado[k] !== undefined) return c.prestado[k];
  let n = 0;
  (ventasHistoricas || []).forEach(v => {
    if (v.clienteId !== c.id) return;
    (v.envPrest || []).forEach(e => {
      if (KEY_PROD_ENV[e.prod] === k) n += Number(e.cant) || 0;
    });
    (v.envDev || []).forEach(e => {
      if (KEY_PROD_ENV[e.prod] === k) n -= Number(e.cant) || 0;
    });
  });
  return Math.max(0, n + (Number(c.envAjuste?.[k]) || 0));
}

// ════════════════════════════════════════════════════════════════════
// ◆  Helpers de guardado seguro — evitan que un guardado pise cambios
//    que llegaron de otro dispositivo (dueño/repartidor) segundos antes.
//    IMPORTANTE: estas 4 funciones (mergeArrayPorClave, mergeClientesPorUpd,
//    mergeNumericoConDeltas, mergePorClavesCambiadas) faltaban por completo
//    en este archivo aunque syncData (17-app.js) y el guardado por rol
//    (14-roles.js) las llaman en TODOS los guardados a la nube — cada save
//    tiraba "ReferenceError: mergeClientesPorUpd is not defined" adentro
//    del .then(), lo que el .catch() de al lado convertía en un guardado
//    SIN mergear (guardarFinal(data) a secas). O sea: la protección contra
//    pisar cambios de otro dispositivo estaba rota en silencio desde que
//    se armó este guardado seguro. Se agregan acá con la misma lógica ya
//    probada en el Sistema de Reparto Individual.
// ════════════════════════════════════════════════════════════════════

// Arrays con "id" (ventas, recordatorios, noVisitas...): conserva altas,
// ediciones Y borrados hechos en ESTE guardado; para lo que no se tocó,
// respeta lo que ya estaba en la nube (por si otro dispositivo lo cambió).
function mergeArrayPorClave(prevLocal, nuevoLocal, cloudArr, claveFn) {
  const prevMap = {};
  (prevLocal || []).forEach(x => {
    try {
      prevMap[claveFn(x)] = x;
    } catch {}
  });
  const localMap = {};
  (nuevoLocal || []).forEach(x => {
    try {
      localMap[claveFn(x)] = x;
    } catch {}
  });
  const freshMap = {};
  (cloudArr || []).forEach(x => {
    try {
      freshMap[claveFn(x)] = x;
    } catch {}
  });
  const keys = new Set([...Object.keys(prevMap), ...Object.keys(localMap), ...Object.keys(freshMap)]);
  const out = [];
  keys.forEach(k => {
    const inLocal = Object.prototype.hasOwnProperty.call(localMap, k);
    const inFresh = Object.prototype.hasOwnProperty.call(freshMap, k);
    const inPrev = Object.prototype.hasOwnProperty.call(prevMap, k);
    if (inLocal && inFresh) {
      const uL = Number(localMap[k]._upd) || 0,
        uF = Number(freshMap[k]._upd) || 0;
      out.push(uF > uL ? freshMap[k] : localMap[k]);
    } else if (inLocal && !inFresh) {
      out.push(localMap[k]);
    } else if (!inLocal && inFresh) {
      if (!inPrev) out.push(freshMap[k]); // lo agregó otro dispositivo -> conservar
      // si estaba en prev y ya no en local -> se borró acá a propósito, no se restaura
    }
  });
  return out;
}

// Clientes: merge por id + _upd (gana el más nuevo, nunca se pisa un
// cambio ajeno más reciente con uno local viejo).
function mergeClientesPorUpd(prevLocal, nuevoLocal, cloudArr) {
  // Mismo criterio de borrado que mergeArrayPorClave: si un id estaba
  // ANTES de este guardado puntual (prevLocal) y ya no está en lo que se
  // está guardando ahora (nuevoLocal), es que se borró a propósito acá —
  // no revivirlo solo porque la nube todavía lo tenga.
  const prevIds = new Set((prevLocal || []).map(c => c.id));
  const nuevoIds = new Set((nuevoLocal || []).map(c => c.id));
  const borrados = new Set([...prevIds].filter(id => !nuevoIds.has(id)));
  const porId = {};
  (cloudArr || []).forEach(c => {
    if (!borrados.has(c.id)) porId[c.id] = c;
  });
  (nuevoLocal || []).forEach(c => {
    const enNube = porId[c.id];
    if (!enNube) {
      porId[c.id] = c;
      return;
    }
    const uL = Number(c._upd) || 0,
      uN = Number(enNube._upd) || 0;
    if (uL >= uN) porId[c.id] = c;
  });
  return Object.values(porId);
}

// Objetos numéricos simples (stock, cargasDia): aplica el DELTA que hizo
// este guardado sobre la copia local anterior, en vez de reemplazar todo
// el objeto — así una carga de stock hecha en otro dispositivo no se pierde.
function mergeNumericoConDeltas(prevLocal, nuevoLocal, cloudObj) {
  const flat = (obj, prefix = "") => {
    let out = {};
    Object.keys(obj || {}).forEach(k => {
      const v = obj[k];
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) out = {
        ...out,
        ...flat(v, key)
      };else out[key] = v;
    });
    return out;
  };
  const unflat = flatObj => {
    const out = {};
    Object.keys(flatObj).forEach(key => {
      const parts = key.split(".");
      let cur = out;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) cur[p] = flatObj[key];else {
          cur[p] = cur[p] || {};
          cur = cur[p];
        }
      });
    });
    return out;
  };
  const fPrev = flat(prevLocal || {}),
    fNuevo = flat(nuevoLocal || {}),
    fCloud = flat(cloudObj || {});
  const resultado = {
    ...fCloud
  };
  new Set([...Object.keys(fPrev), ...Object.keys(fNuevo)]).forEach(key => {
    const antes = Number(fPrev[key]) || 0,
      ahora = Number(fNuevo[key]) || 0;
    if (antes !== ahora) resultado[key] = (Number(fCloud[key]) || 0) + (ahora - antes);
  });
  return unflat(resultado);
}

// Objetos por clave (planillas por día): conserva las claves cambiadas en
// este guardado, respeta el resto tal cual está en la nube.
function mergePorClavesCambiadas(prevLocal, nuevoLocal, cloudObj) {
  const resultado = {
    ...(cloudObj || {})
  };
  const claves = new Set([...Object.keys(prevLocal || {}), ...Object.keys(nuevoLocal || {})]);
  claves.forEach(k => {
    const antes = JSON.stringify((prevLocal || {})[k]);
    const ahora = JSON.stringify((nuevoLocal || {})[k]);
    if (antes !== ahora) resultado[k] = (nuevoLocal || {})[k];
  });
  return resultado;
}

// ════════════════════════════════════════════════════════════════════
// ◆  CambioEnvasePanel — panel "🔄 Cambio de envase" UNIFICADO (venta,
//    detalle de cliente, gestión). Solo maneja la UI y el estado local
//    (producto que se retira, que se entrega, motivo) — quien lo usa decide
//    cómo registrar el cambio (onConfirmar) y qué hacer al cancelar (onCancelar).
//    Uso: {mostrar && <CambioEnvasePanel productos={productos}
//            onConfirmar={(viejo,nuevo,motivo)=>{...registrar...; cerrar();}}
//            onCancelar={cerrar} />}
// ════════════════════════════════════════════════════════════════════
function CambioEnvasePanel({
  productos,
  onConfirmar,
  onCancelar
}) {
  const [productoViejo, setProductoViejo] = React.useState("Bidón 20L");
  const [productoNuevo, setProductoNuevo] = React.useState("Bidón 20L");
  const [motivo, setMotivo] = React.useState("Agua en mal estado");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "0 0 10px",
      border: "1px solid #818cf8"
    }
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
    value: productoViejo,
    onChange: e => setProductoViejo(e.target.value)
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
    value: productoNuevo,
    onChange: e => setProductoNuevo(e.target.value)
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
    value: motivo,
    onChange: e => setMotivo(e.target.value)
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
    onClick: onCancelar
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      flex: 2,
      fontSize: 12,
      padding: "8px"
    },
    onClick: () => {
      onConfirmar(productoViejo, productoNuevo, motivo);
      setMotivo("Agua en mal estado");
    }
  }, "✓ Registrar cambio")));
}
// ════════════════════════════════════════════════════════════════════
// ◆  FotoClienteModal — visor/editor de foto de cliente a pantalla
//    completa UNIFICADO (📷 Cámara / 🖼 Galería / 🗑 Eliminar).
//    Uso: {abierto && <FotoClienteModal cliente={c} onCerrar={()=>setX(false)}
//            onGuardarFoto={b64 => ...guardar b64 en el cliente...} />}
// ════════════════════════════════════════════════════════════════════
function FotoClienteModal({
  cliente,
  onCerrar,
  onGuardarFoto
}) {
  if (!cliente) return null;
  const subir = async e => {
    const f = e.target.files[0];
    if (!f) return;
    const b64 = await comprimirFoto(f);
    onGuardarFoto(b64);
    onCerrar();
  };
  return /*#__PURE__*/React.createElement("div", {
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
    onClick: e => {
      e.stopPropagation();
      onCerrar();
    }
  }, cliente.foto ? /*#__PURE__*/React.createElement("img", {
    src: cliente.foto,
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
  }, "Sin foto · ", cliente.nombre), /*#__PURE__*/React.createElement("div", {
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
    onChange: subir
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
    onChange: subir
  })), cliente.foto && /*#__PURE__*/React.createElement("button", {
    style: {
      background: "#3a2020",
      color: "#e05c5c",
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      border: "none"
    },
    onClick: () => {
      onGuardarFoto("");
      onCerrar();
    }
  }, "🗑")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#aaa",
      fontSize: 11,
      marginTop: 14
    }
  }, "Tocá fuera para cerrar"));
}
const TIPO_RECORDATORIO_CONFIG = {
  visita: {
    ico: "🏠",
    label: "Visita",
    color: "#5daaff",
    bg: "#1e3a5f"
  },
  cobro: {
    ico: "💰",
    label: "Cobro",
    color: "#f5b942",
    bg: "#2e1f06"
  }
};
// ── Selector "Visita/Cobro" para recordatorios, UNIFICADO entre el modal de
//    venta (RecordatorioModal) y el formulario de la Agenda (NuevoRecordatorioForm).
function TipoRecordatorioSelector({
  tipo,
  onCambiarTipo
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12
    }
  }, Object.entries(TIPO_RECORDATORIO_CONFIG).map(([k, tc]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 10,
      border: `2px solid ${tipo === k ? tc.color : "var(--color-border-secondary)"}`,
      background: tipo === k ? tc.bg : "transparent",
      color: tipo === k ? tc.color : "var(--color-text-secondary)",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3
    },
    onClick: () => onCambiarTipo(k)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, tc.ico), tc.label)));
}
// ── Fila Fecha/Hora para recordatorios, misma unificación.
function FechaHoraRow({
  fecha,
  hora,
  onCambiarFecha,
  onCambiarHora
}) {
  return /*#__PURE__*/React.createElement("div", {
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
  }, "Fecha"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: s.input,
    value: fecha,
    onChange: e => onCambiarFecha(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Hora"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    style: s.input,
    value: hora,
    onChange: e => onCambiarHora(e.target.value)
  })));
}
function fmtFechaHoraVenta(f) {
  if (!f) return "";
  const limpio = String(f).replace(",", " ").replace(/\s+/g, " ").trim();
  const partes = limpio.split(" ");
  const fecha = partes[0] || "";
  let hora = partes[1] || "";
  const hm = hora.split(":");
  if (hm.length >= 2) hora = hm[0].padStart(2, "0") + ":" + hm[1];
  return hora ? fecha + " · " + hora : fecha;
}
function debounceSave(fn) {
  _saveQueue = fn;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const f = _saveQueue;
    _saveQueue = null;
    _saveTimer = null;
    if (f) f();
  }, 1200);
}
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && _saveQueue) {
    const f = _saveQueue;
    _saveQueue = null;
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    f();
  }
});
function useLS(key, fallback) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  });
  // Acepta un valor directo O una función (prev => nuevoValor).
  // La forma función es la segura: React siempre le pasa el estado MÁS
  // reciente, incluso si hay varias llamadas seguidas antes de re-renderizar
  // (evita perder cambios cuando dos acciones se disparan rápido).
  const save = v => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return [val, save];
}
const s = {
  app: {
    maxWidth: 480,
    margin: "0 auto",
    background: "var(--color-background-primary)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    background: "var(--color-background-secondary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--color-text-primary)",
    flex: 1
  },
  backBtn: {
    background: "var(--color-background-tertiary)",
    border: "none",
    cursor: "pointer",
    padding: "6px 12px",
    color: "var(--color-text-secondary)",
    fontSize: 13,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500
  },
  screen: {
    flex: 1,
    paddingBottom: 40
  },
  card: {
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 12,
    padding: "10px 14px",
    margin: "6px 14px"
  },
  label: {
    fontSize: 11,
    color: "var(--color-text-secondary)",
    marginBottom: 3,
    display: "block"
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--color-background-tertiary)",
    color: "var(--color-text-primary)",
    outline: "none",
    boxSizing: "border-box"
  },
  inputNum: {
    padding: "7px 8px",
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--color-background-tertiary)",
    color: "var(--color-text-primary)",
    outline: "none",
    textAlign: "right",
    width: "100%",
    boxSizing: "border-box"
  },
  btn: {
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    background: "var(--color-background-tertiary)",
    color: "var(--color-text-secondary)"
  },
  btnPrimary: {
    background: "#185FA5",
    color: "#e2eaf4",
    border: "none",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    width: "100%"
  },
  btnDanger: {
    background: "var(--color-background-danger)",
    color: "var(--color-text-danger)",
    border: "0.5px solid var(--color-border-danger)",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer"
  },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 6
  },
  metricCard: {
    background: "var(--color-background-tertiary)",
    borderRadius: 8,
    padding: "10px 12px"
  },
  metricLabel: {
    fontSize: 11,
    color: "var(--color-text-secondary)",
    marginBottom: 3
  },
  metricVal: {
    fontSize: 17,
    fontWeight: 500,
    color: "var(--color-text-primary)"
  },
  badge: c => ({
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 7px",
    borderRadius: 6,
    background: `var(--color-background-${c})`,
    color: `var(--color-text-${c})`
  }),
  tag: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    background: "var(--color-background-tertiary)",
    borderRadius: 8,
    padding: "3px 9px"
  },
  divider: {
    borderTop: "0.5px solid var(--color-border-tertiary)",
    margin: "10px 0"
  },
  sectionTitle: {
    fontSize: 10,
    color: "var(--color-text-tertiary)",
    padding: "12px 14px 4px",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    display: "block"
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--color-background-tertiary)",
    color: "var(--color-text-primary)",
    outline: "none",
    boxSizing: "border-box"
  },
  tabBar: {
    display: "flex",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    padding: "0 14px",
    gap: 4,
    background: "var(--color-background-secondary)"
  },
  tab: a => ({
    padding: "9px 12px",
    fontSize: 13,
    cursor: "pointer",
    border: "none",
    background: "none",
    color: a ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
    fontWeight: a ? 500 : 400,
    borderBottom: a ? "2px solid #5daaff" : "2px solid transparent"
  })
};
// "s" recién se acaba de definir — si el tema guardado tiene relieve
// (Panel Industrial / Aluminio), la primera llamada en 01-temas.js no pudo
// mutar card/btn/btnPrimary porque "s" todavía no existía. La repetimos acá.
try {
  aplicarTemaLC(getTemaLC());
} catch {}
function calcVenta(detalle, pago, montoPagado, saldoAplicado, productos) {
  const bruto = detalle.reduce((a, d) => a + d.total, 0);
  const desc = 0; // retención solo en planilla, no afecta el monto de la venta
  const neto = bruto - desc;
  const aPagar = neto - (saldoAplicado || 0);
  const pagadoNum = pago === "fiado" ? 0 : montoPagado !== "" && !isNaN(Number(montoPagado)) ? Number(montoPagado) : aPagar;
  const saldoDelta = pagadoNum - neto;
  const costo = detalle.reduce((a, d) => {
    const p = productos.find(x => x.nombre === d.nombre);
    return a + (p ? p.costo * d.cantidad : 0);
  }, 0);
  return {
    bruto,
    desc,
    neto,
    aPagar,
    pagadoNum,
    saldoDelta,
    costo,
    ganancia: neto - costo
  };
}

// Comprime imagen a max 800px y calidad 0.75 antes de guardar
function comprimirFoto(file, maxW = 800, quality = 0.75) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
}

// Extrae coordenadas (lat,lng) de un link/texto de Google Maps. Devuelve {lat,lng} o null.
function extraerCoordsDeURL(url) {
  if (!url || typeof url !== "string") return null;
  let m;
  m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return {
    lat: +m[1],
    lng: +m[2]
  };
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return {
    lat: +m[1],
    lng: +m[2]
  };
  m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return {
    lat: +m[1],
    lng: +m[2]
  };
  m = url.match(/(-?\d+\.\d+)[,;\s]+(-?\d+\.\d+)/);
  if (m) return {
    lat: +m[1],
    lng: +m[2]
  };
  return null;
}

// ════════════════════════════════════════════════════════════════════
// ◆  PieEnvases — pie de tarjeta de cliente UNIFICADO (todas las listas)
//    Botón ♻️ Envases + botones propios de cada pantalla + panel con Confirmar.
//    Guarda los 4 productos (incluido dispenser) directo en c.prestado.
//    Uso: <PieEnvases c={c} ventas={ventas} onEditar={(id,cambios)=>...}
//           izquierda={<botón opcional/>}> {botones derecha opcionales} </PieEnvases>
// ════════════════════════════════════════════════════════════════════
function PieEnvases({
  c,
  ventas,
  onEditar,
  onPerdida,
  onPerdidaCliente,
  izquierda,
  children
}) {
  const KEYS = ["sifon", "bidon10", "bidon20", "dispenser"];
  const KP = {
    "Sifón 1.5L": "sifon",
    "Bidón 10L": "bidon10",
    "Bidón 20L": "bidon20",
    "Dispenser": "dispenser"
  };
  const [draft, setDraft] = React.useState(null); // null = panel cerrado
  const [mostrarPerdida, setMostrarPerdida] = React.useState(false);
  const [prodPerdida, setProdPerdida] = React.useState("sifon");
  const [cantPerdida, setCantPerdida] = React.useState("");
  const confirmarPerdidaCliente = () => {
    const cant = Math.round(Number(cantPerdida) || 0);
    if (cant <= 0) return;
    // OJO: acá NO se usa onEditar (ese asume que lo que baja del fijo del
    // cliente volvió al depósito). Un envase roto/perdido nunca volvió a
    // ningún lado — se da de baja directo con onPerdidaCliente, que reduce
    // el fijo/prestado del cliente sin acreditarle nada a Casa.
    if (onPerdidaCliente) {
      onPerdidaCliente(c.id, prodPerdida, cant);
    } else if (onEditar) {
      // Fallback por si algún lugar todavía no pasa el prop nuevo.
      const nuevoValor = Math.max(0, (Number(c[prodPerdida]) || 0) - cant);
      onEditar(c.id, {
        [prodPerdida]: nuevoValor
      });
      onPerdida && onPerdida({
        [prodPerdida]: cant
      }, "Roto/perdido en lo del cliente", c.nombre);
    }
    setMostrarPerdida(false);
    setCantPerdida("");
  };
  const abrir = () => {
    setDraft({
      fijos: Object.fromEntries(KEYS.map(k => [k, Number(c[k]) || 0])),
      prest: Object.fromEntries(KEYS.map(k => [k, prestadoClienteDe(c, k, ventas)]))
    });
  };
  const confirmar = () => {
    // Los 4 productos (incluido dispenser) se guardan directo en c.prestado
    // — campo estable que se mantiene solo, sumando/restando en cada venta
    // (ver aplicarMovimientoEnvases en 17-app.js).
    onEditar(c.id, {
      ...Object.fromEntries(KEYS.map(k => [k, Math.max(0, draft.fijos[k])])),
      prestado: {
        ...(c.prestado || {}),
        ...Object.fromEntries(KEYS.map(k => [k, Math.max(0, draft.prest[k])]))
      }
    });
    setDraft(null);
  };
  const abierto = !!draft;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      borderTop: "0.5px solid var(--color-border-tertiary)",
      paddingTop: 8
    }
  }, izquierda || null, /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 12px",
      borderRadius: 20,
      cursor: "pointer",
      background: abierto ? "var(--color-background-warning)" : "var(--color-background-tertiary)",
      color: abierto ? "var(--color-text-warning)" : "var(--color-text-secondary)",
      border: abierto ? "1px solid var(--color-border-warning)" : "0.5px solid var(--color-border-secondary)"
    },
    onClick: e => {
      e.stopPropagation();
      abierto ? setDraft(null) : abrir();
    }
  }, "♻️ Envases"), children), abierto && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: "var(--color-background-tertiary)",
      borderRadius: 8,
      padding: "8px 10px"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "82px 1fr 1fr 1fr 1fr",
      gap: 4,
      fontSize: 10,
      color: "var(--color-text-tertiary)",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "center"
    }
  }, "Sifón"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "center"
    }
  }, "10L"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "center"
    }
  }, "20L"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "center"
    }
  }, "Disp")), [["fijos", "🏠 Fijos"], ["prest", "📦 Prestados"]].map(([t, l]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "grid",
      gridTemplateColumns: "82px 1fr 1fr 1fr 1fr",
      gap: 4,
      alignItems: "center",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: t === "prest" ? "var(--color-text-warning)" : "var(--color-text-secondary)"
    }
  }, l), KEYS.map(k => /*#__PURE__*/React.createElement("input", {
    key: k,
    type: "number",
    value: draft[t][k],
    onChange: e => {
      const n = Math.round(Number(e.target.value) || 0);
      setDraft(d => ({
        ...d,
        [t]: {
          ...d[t],
          [k]: n
        }
      }));
    },
    style: {
      ...s.inputNum,
      padding: "6px 2px",
      fontSize: 14,
      textAlign: "center",
      fontWeight: t === "prest" && draft[t][k] !== 0 ? 600 : 400,
      color: t === "prest" ? draft[t][k] > 0 ? "var(--color-text-warning)" : draft[t][k] < 0 ? "var(--color-text-success)" : "var(--color-text-primary)" : "var(--color-text-primary)"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--color-text-tertiary)",
      margin: "2px 0 6px"
    }
  }, "Prestados = total extra que tiene hoy · 0 = devolvió todo"), !mostrarPerdida ? /*#__PURE__*/React.createElement("button", {
    style: {
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--color-text-danger)",
      fontSize: 11,
      fontWeight: 500,
      cursor: "pointer",
      padding: "4px 0",
      textAlign: "left",
      marginBottom: 6
    },
    onClick: e => {
      e.stopPropagation();
      setMostrarPerdida(true);
    }
  }, "💔 Se le rompió/perdió un envase") : /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-background-secondary)",
      borderRadius: 7,
      padding: 8,
      marginBottom: 8
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-danger)",
      fontWeight: 500,
      marginBottom: 6
    }
  }, "💔 Registrar roto/perdido de ", c.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 60px",
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: prodPerdida,
    onChange: e => setProdPerdida(e.target.value),
    style: {
      ...s.inputNum,
      padding: "6px 4px",
      fontSize: 12,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "sifon"
  }, "Sifón 1.5L"), /*#__PURE__*/React.createElement("option", {
    value: "bidon10"
  }, "Bidón 10L"), /*#__PURE__*/React.createElement("option", {
    value: "bidon20"
  }, "Bidón 20L"), /*#__PURE__*/React.createElement("option", {
    value: "dispenser"
  }, "Dispenser")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 1,
    placeholder: "Cant.",
    value: cantPerdida,
    onChange: e => setCantPerdida(e.target.value),
    style: {
      ...s.inputNum,
      padding: "6px 4px",
      fontSize: 12,
      textAlign: "center"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      flex: 1,
      fontSize: 11,
      padding: "6px"
    },
    onClick: () => {
      setMostrarPerdida(false);
      setCantPerdida("");
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 2,
      background: "var(--color-background-danger)",
      color: "var(--color-text-danger)",
      border: "1px solid var(--color-border-danger)",
      borderRadius: 7,
      padding: "7px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    },
    onClick: confirmarPerdidaCliente
  }, "Confirmar pérdida")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--color-text-tertiary)",
      marginTop: 5
    }
  }, "Se descuenta directo de lo que este cliente tiene asignado, y queda anotado en Stock → Pérdidas.")), /*#__PURE__*/React.createElement("div", {
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
    onClick: e => {
      e.stopPropagation();
      setDraft(null);
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 2,
      background: "#1d9e75",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "9px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    },
    onClick: e => {
      e.stopPropagation();
      confirmar();
    }
  }, "✓ Confirmar"))));
}

// ════════════════════════════════════════════════════════════════════
// ◆  FormCliente — formulario de cliente UNIFICADO (crear y editar)
//    Usado en: Nuevo cliente, Editar desde el perfil, Editar en Gestión.
//    Los envases prestados NO van acá: se editan con ♻️ Envases (PieEnvases).
// ════════════════════════════════════════════════════════════════════
function FormCliente({
  inicial,
  onGuardar,
  onEliminarCliente,
  textoGuardar,
  productos
}) {
  const [datos, setDatos] = React.useState({
    ...(inicial || {})
  });
  const set = (k, v) => setDatos(d => ({
    ...d,
    [k]: v
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: s.grid2
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Día de reparto"), /*#__PURE__*/React.createElement("select", {
    style: s.select,
    value: datos.dia || "Martes",
    onChange: e => set("dia", e.target.value)
  }, DIAS.map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Número de orden"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    type: "number",
    min: 1,
    placeholder: "ej: 5",
    value: datos.orden || "",
    onChange: e => set("orden", Number(e.target.value) || "")
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Nombre y apellido *"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Nombre completo",
    value: datos.nombre || "",
    onChange: e => set("nombre", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: s.grid2
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Barrio"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Barrio",
    value: datos.barrio || "",
    onChange: e => set("barrio", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Sector"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Sector",
    value: datos.sector || "",
    onChange: e => set("sector", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: s.grid3
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Manzana"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Mz",
    value: datos.manzana || "",
    onChange: e => set("manzana", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Lote"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Lote",
    value: datos.lote || "",
    onChange: e => set("lote", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Casa/Dpto"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Casa",
    value: datos.aclaracion || "",
    onChange: e => set("aclaracion", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: s.grid2
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Calle"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Calle",
    value: datos.calle || "",
    onChange: e => set("calle", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Número"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "Nro",
    value: datos.nro || "",
    onChange: e => set("nro", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Teléfono (sin 0 ni 15)"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "3816559000",
    value: datos.telefono || "",
    onChange: e => set("telefono", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Link Google Maps"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "https://maps.app.goo.gl/...",
    value: datos.maps || "",
    onChange: e => set("maps", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Link foto del domicilio (Google Drive, etc)"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "https://...",
    value: datos.foto || "",
    onChange: e => set("foto", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Notas rápidas (timbre roto, perro, cobrar deuda, etc.)"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    placeholder: "ej: timbre roto, cobrar $2000...",
    value: datos.notas || "",
    onChange: e => set("notas", e.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      marginTop: 4
    }
  }, "Envases habituales asignados"), /*#__PURE__*/React.createElement("div", {
    style: s.grid3
  }, [["sifon", "Sifón"], ["bidon10", "Bidón 10L"], ["bidon20", "Bidón 20L"]].map(([k, l]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...s.label,
      textAlign: "center"
    }
  }, l), /*#__PURE__*/React.createElement("input", {
    style: {
      ...s.input,
      textAlign: "center"
    },
    type: "number",
    min: 0,
    value: datos[k] || 0,
    onChange: e => set(k, Number(e.target.value))
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Dispenser en comodato"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      padding: "5px 14px",
      fontSize: 18,
      lineHeight: 1
    },
    onClick: () => set("dispenser", Math.max(0, (datos.dispenser || 0) - 1))
  }, "−"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      minWidth: 28,
      textAlign: "center",
      color: "var(--color-text-primary)"
    }
  }, datos.dispenser || 0), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btn,
      padding: "5px 14px",
      fontSize: 18,
      lineHeight: 1
    },
    onClick: () => set("dispenser", (datos.dispenser || 0) + 1)
  }, "+"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)"
    }
  }, "unidades"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)"
    }
  }, "💡 Los envases prestados (extra) se ajustan con el botón ♻️ Envases."), /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "4px 0",
      background: "var(--color-background-tertiary)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: (datos.minimoMensual && datos.minimoMensual.activo) ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--color-text-secondary)"
    }
  }, "💧 Consumo mínimo mensual (dispenser)"), /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 11,
      padding: "4px 10px",
      borderRadius: 8,
      border: "0.5px solid var(--color-border-secondary)",
      cursor: "pointer",
      background: (datos.minimoMensual && datos.minimoMensual.activo) ? "#185FA5" : "var(--color-background-secondary)",
      color: (datos.minimoMensual && datos.minimoMensual.activo) ? "#e2eaf4" : "var(--color-text-secondary)"
    },
    onClick: () => set("minimoMensual", {
      ...(datos.minimoMensual || {}),
      activo: !(datos.minimoMensual && datos.minimoMensual.activo),
      producto: (datos.minimoMensual && datos.minimoMensual.producto) || (productos && productos[0] ? productos[0].nombre : ""),
      cantidad: (datos.minimoMensual && datos.minimoMensual.cantidad) || 5
    })
  }, (datos.minimoMensual && datos.minimoMensual.activo) ? "Activado" : "Desactivado")), datos.minimoMensual && datos.minimoMensual.activo && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: s.grid2
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Producto de referencia"), /*#__PURE__*/React.createElement("select", {
    style: s.select,
    value: (datos.minimoMensual && datos.minimoMensual.producto) || "",
    onChange: e => set("minimoMensual", { ...(datos.minimoMensual || {}), producto: e.target.value })
  }, (productos || []).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.nombre
  }, p.nombre)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "Cantidad mínima / mes"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    type: "number",
    min: 0,
    value: (datos.minimoMensual && datos.minimoMensual.cantidad) ?? "",
    onChange: e => set("minimoMensual", { ...(datos.minimoMensual || {}), cantidad: Number(e.target.value) || 0 })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      marginTop: 6
    }
  }, (() => {
    const prod = (productos || []).find(p => p.nombre === (datos.minimoMensual && datos.minimoMensual.producto));
    const cant = (datos.minimoMensual && datos.minimoMensual.cantidad) || 0;
    const valor = prod ? cant * (Number(prod.precio) || 0) : 0;
    return `Si el cliente no llega a comprar ${cant} de "${(datos.minimoMensual && datos.minimoMensual.producto) || "—"}" en el mes (≈ ${fmt(valor)} a precio actual), se le cobra la diferencia de forma automática el día 1 del mes siguiente.`;
  })()))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...s.card,
      margin: "4px 0",
      background: "var(--color-background-tertiary)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--color-text-secondary)",
      marginBottom: 8
    }
  }, "Saldo del cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, [["favor", "A favor"], ["deuda", "Debe"], ["cero", "Sin saldo"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    style: {
      flex: 1,
      fontSize: 11,
      padding: "6px 4px",
      borderRadius: 8,
      border: "0.5px solid var(--color-border-secondary)",
      cursor: "pointer",
      background: datos._tipoSaldo === v ? "#185FA5" : "var(--color-background-secondary)",
      color: datos._tipoSaldo === v ? "#e2eaf4" : "var(--color-text-secondary)"
    },
    onClick: () => set("_tipoSaldo", v)
  }, l))), datos._tipoSaldo && datos._tipoSaldo !== "cero" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, datos._tipoSaldo === "favor" ? "Monto a favor ($)" : "Monto que debe ($)"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    type: "number",
    min: 0,
    placeholder: "0",
    value: datos._montoSaldo || "",
    onChange: e => set("_montoSaldo", e.target.value)
  })), (datos.saldo || 0) !== 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: datos.saldo < 0 ? "var(--color-text-danger)" : "var(--color-text-success)",
      marginTop: 4
    }
  }, "Saldo actual: ", fmt(datos.saldo), " · ", datos.saldo < 0 ? "Debe" : "A favor"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: s.label
  }, "O ingresá el saldo directamente (−negativo = debe · +positivo = a favor)"), /*#__PURE__*/React.createElement("input", {
    style: s.input,
    type: "number",
    placeholder: "ej: -2500 o 1800",
    value: datos._saldoDirecto ?? "",
    onChange: e => set("_saldoDirecto", e.target.value)
  }))), datos.foto && /*#__PURE__*/React.createElement("img", {
    src: datos.foto,
    alt: "Domicilio",
    style: {
      width: "100%",
      borderRadius: 8,
      maxHeight: 160,
      objectFit: "cover"
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      marginTop: 4,
      opacity: !datos.nombre ? 0.45 : 1
    },
    disabled: !datos.nombre,
    onClick: () => {
      let saldo = datos.saldo || 0;
      if (datos._tipoSaldo === "favor") saldo = Math.abs(Number(datos._montoSaldo) || 0);
      if (datos._tipoSaldo === "deuda") saldo = -Math.abs(Number(datos._montoSaldo) || 0);
      if (datos._tipoSaldo === "cero") saldo = 0;
      if (datos._saldoDirecto !== undefined && datos._saldoDirecto !== "") saldo = Number(datos._saldoDirecto);
      onGuardar({
        ...datos,
        saldo
      });
    }
  }, textoGuardar || "Guardar cliente"), onEliminarCliente && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 12,
      borderTop: "0.5px solid var(--color-border-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnDanger,
      width: "100%",
      padding: "10px",
      fontSize: 13
    },
    onClick: () => {
      if (window.confirm(`¿Eliminar a ${datos.nombre}? Se borrarán también todas sus ventas.`)) onEliminarCliente();
    }
  }, "Eliminar cliente permanentemente")));
}

// ════════════════════════════════════════════════════════════════════
// ◆  buscarCliente — búsqueda UNIFICADA priorizando el DOMICILIO
//    Devuelve: 2 = coincide el domicilio · 1 = coincide nombre/tel/notas · 0 = no
//    Entiende: "juramento 59", "mz f l 28", "policial 3", barrios, sectores...
//    Ignora tildes/ñ tanto en lo buscado como en lo guardado: antes
//    buscar "maria" NO encontraba a "María" — muy común al tipear rápido
//    desde el celular, sin tildes.
// ════════════════════════════════════════════════════════════════════
function _normalizarBusqueda(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function buscarCliente(c, q) {
  const t = _normalizarBusqueda(q).trim();
  if (!t) return 1; // sin búsqueda: todos pasan
  const domicilio = _normalizarBusqueda([c.calle, c.nro, c.calle && c.nro ? `${c.calle} ${c.nro}` : "", c.barrio, c.sector, c.aclaracion, c.manzana, c.lote, c.manzana ? `mz ${c.manzana}` : "", c.lote ? `l ${c.lote}` : "", c.manzana && c.lote ? `mz ${c.manzana} l ${c.lote}` : "", c.manzana && c.lote ? `manzana ${c.manzana} lote ${c.lote}` : ""].filter(Boolean).join(" · "));
  if (domicilio.includes(t)) return 2;
  if (_normalizarBusqueda(c.nombre).includes(t)) return 1;
  if (String(c.telefono || "").includes(t)) return 1;
  if (_normalizarBusqueda(c.notas).includes(t)) return 1;
  return 0;
}

// ════════════════════════════════════════════════════════════════════
// ◆  HeaderBotones / HeaderApp — encabezado estándar: "Empresa · Pantalla"
//    + sol/M adentro del recuadro, conectado al selector de temas real
//    (antes usaba un interruptor aparte que no tenía nada que ver)
// ════════════════════════════════════════════════════════════════════
const SCALE_LABELS_LC = ["S", "M", "L", "XL"];
function _flipModoTemaLC(id) {
  if (id.startsWith("oscuro-")) return "claro-" + id.slice(7);
  if (id.startsWith("claro-")) return "oscuro-" + id.slice(6);
  return id;
}
function HeaderBotones() {
  const [temaId, setTemaIdLocal] = React.useState(getTemaLC);
  const [scaleIdx, setScaleIdxLocal] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cat_scale_v1") || "1");
    } catch {
      return 1;
    }
  });
  const modoActual = TEMAS_LC[temaId]?.modo || "oscuro";
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const nuevoId = _flipModoTemaLC(temaId);
      if (!TEMAS_LC[nuevoId]) return; // no debería pasar, pero por las dudas no rompe nada
      localStorage.setItem("lc_tema", JSON.stringify(nuevoId)); // guardar primero, siempre
      setTemaIdLocal(nuevoId);
      try {
        aplicarTemaLC(nuevoId);
      } catch (e) {
        console.warn("Error al cambiar de modo:", e);
      }
    },
    style: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "none",
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)",
      fontSize: 14,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    title: "Cambiar modo claro/oscuro"
  }, modoActual === "oscuro" ? "☀️" : "🌙"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const nv = (scaleIdx + 1) % 4;
      setScaleIdxLocal(nv);
      if (window._setScaleIdxLC) window._setScaleIdxLC(nv);
    },
    style: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "none",
      background: "var(--color-background-tertiary)",
      color: "var(--color-text-secondary)",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    title: "Tamaño de texto"
  }, SCALE_LABELS_LC[scaleIdx]));
}
function HeaderApp({
  titulo,
  onVolver
}) {
  const negocio = (() => {
    try {
      return JSON.parse(localStorage.getItem("lc_negocio_nombre") || '"Poca Soda"');
    } catch {
      return "Poca Soda";
    }
  })();
  return /*#__PURE__*/React.createElement("div", {
    style: s.header
  }, /*#__PURE__*/React.createElement("button", {
    style: s.backBtn,
    onClick: onVolver
  }, "← Volver"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.headerTitle,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      cursor: "pointer"
    },
    onClick: () => window._lcIrInicio && window._lcIrInicio(),
    title: "Ir al inicio"
  }, titulo ? `${negocio} · ${titulo}` : negocio), /*#__PURE__*/React.createElement(HeaderBotones, null));
}