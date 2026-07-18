import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ════════════════════════════════════════════════════════════════════
// ◆  11-promocion.js — CargaHistorica · Módulo Promoción · TagsCliente
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
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [!enConfig && /*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Carga histórica",
      onVolver: onVolver
    }), !enConfig && guardados > 0 && /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "4px 16px 0",
        fontSize: 12,
        color: "#4dd9a0"
      },
      children: ["✓ ", guardados, " guardadas"]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          marginBottom: 12
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 10
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              flex: 2
            },
            children: [/*#__PURE__*/_jsx("label", {
              style: s.label,
              children: "Fecha del reparto"
            }), /*#__PURE__*/_jsx("input", {
              type: "date",
              style: s.input,
              value: fecha,
              min: "2026-01-01",
              max: "2026-03-31",
              onChange: e => onFechaChange(e.target.value)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsx("label", {
              style: s.label,
              children: "Día"
            }), /*#__PURE__*/_jsx("select", {
              style: s.select,
              value: dia,
              onChange: e => setDia(e.target.value),
              children: DIAS_REP.map(d => /*#__PURE__*/_jsx("option", {
                children: d
              }, d))
            })]
          })]
        }), /*#__PURE__*/_jsxs("button", {
          style: {
            ...s.btnPrimary,
            width: "100%",
            padding: "12px",
            fontSize: 14
          },
          onClick: cargarClientes,
          children: ["📋 Cargar clientes del ", dia, " (", clientesDia.length, " clientes)"]
        })]
      }), filas.length > 0 && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginBottom: 8
          },
          children: "Dejá en 0 los que no compraron ese día. Solo se guardan los que tienen cantidad o monto."
        }), filas.map((f, i) => {
          const c = clientes.find(x => x.id === f.clienteId);
          if (!c) return null;
          const tieneVenta = f.cantidad_sifon > 0 || f.cantidad_b10 > 0 || f.cantidad_b20 > 0 || Number(f.monto) > 0;
          return /*#__PURE__*/_jsxs("div", {
            style: {
              ...s.card,
              margin: "0 0 8px",
              borderLeft: tieneVenta ? "3px solid #4dd9a0" : "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                marginBottom: 8
              },
              children: [c.orden && /*#__PURE__*/_jsxs("span", {
                style: {
                  color: "var(--color-text-tertiary)",
                  fontSize: 12,
                  marginRight: 6
                },
                children: ["#", c.orden]
              }), c.nombre, c.sifon > 0 && /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginLeft: 6
                },
                children: ["hab: S×", c.sifon, c.bidon10 > 0 ? ` B10×${c.bidon10}` : "", c.bidon20 > 0 ? ` B20×${c.bidon20}` : ""]
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: 8
              },
              children: [["cantidad_sifon", "Sifón"], ["cantidad_b10", "Bidón 10L"], ["cantidad_b20", "Bidón 20L"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("label", {
                  style: {
                    ...s.label,
                    fontSize: 10
                  },
                  children: l
                }), /*#__PURE__*/_jsx("input", {
                  style: {
                    ...s.inputNum,
                    textAlign: "center"
                  },
                  type: "number",
                  min: 0,
                  value: f[k] || "",
                  placeholder: "0",
                  onChange: e => setFila(i, k, Number(e.target.value) || 0)
                })]
              }, k))
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6
              },
              children: [/*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("label", {
                  style: {
                    ...s.label,
                    fontSize: 10
                  },
                  children: "Pago"
                }), /*#__PURE__*/_jsx("select", {
                  style: {
                    ...s.select,
                    fontSize: 12
                  },
                  value: f.pago,
                  onChange: e => setFila(i, "pago", e.target.value),
                  children: [["contado", "Contado"], ["transferencia", "Transfer."], ["fiado", "Fiado"]].map(([v, l]) => /*#__PURE__*/_jsx("option", {
                    value: v,
                    children: l
                  }, v))
                })]
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("label", {
                  style: {
                    ...s.label,
                    fontSize: 10
                  },
                  children: "Monto cobrado $"
                }), /*#__PURE__*/_jsx("input", {
                  style: {
                    ...s.inputNum,
                    textAlign: "right"
                  },
                  type: "number",
                  min: 0,
                  value: f.monto,
                  placeholder: "auto",
                  onChange: e => setFila(i, "monto", e.target.value)
                })]
              })]
            })]
          }, i);
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "8px 0",
            background: "var(--color-background-secondary)"
          },
          children: /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)"
            },
            children: [filasConVenta.length, " ventas a guardar del ", fecha]
          })
        }), /*#__PURE__*/_jsxs("button", {
          style: {
            ...s.btnPrimary,
            width: "100%",
            padding: "14px",
            fontSize: 15,
            borderRadius: 12,
            opacity: filasConVenta.length === 0 ? 0.5 : 1
          },
          disabled: filasConVenta.length === 0,
          onClick: guardar,
          children: ["💾 Guardar ", filasConVenta.length, " ventas del ", fecha]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            width: "100%",
            padding: "10px",
            fontSize: 13,
            marginTop: 8
          },
          onClick: () => setFilas([]),
          children: "Limpiar y cargar otro día"
        })]
      }), filas.length === 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-text-tertiary)",
          fontSize: 14,
          lineHeight: 1.8
        },
        children: ["Seleccioná una fecha y tocá", "\n", "\"Cargar clientes del día\"", "\n", "para empezar la carga."]
      })]
    })]
  });
}
function Promocion({
  prospectos,
  onSave,
  onConvertir,
  onVolver
}) {
  const [diaActivo, setDiaActivo] = useState("");
  const [subVista, setSubVista] = useState("menu"); // menu | dia | detalle | nuevo | comodato
  const [selId, setSelId] = useState(null);
  const [importMsg, setImportMsg] = useState(null); // {tipo:"ok"|"error", txt, n}
  const importRef = React.useRef(null);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const compras = p => (p.visitas || []).filter(v => v.resultado === "compro").length;
  const semanas = p => Math.floor((Date.now() - new Date(p.fechaInicio || hoyISO).getTime()) / (7 * 24 * 3600 * 1000));
  const listo = p => compras(p) >= 4;
  const visitadoHoy = p => (p.visitas || []).some(v => v.fecha === hoyISO);
  const porDia = d => prospectos.filter(p => p.dia === d && p.estado !== "convertido");
  const selP = prospectos.find(p => p.id === selId);
  const registrar = (id, resultado) => {
    const nps = prospectos.map(p => {
      if (p.id !== id) return p;
      const v = [...(p.visitas || []), {
        fecha: hoyISO,
        resultado
      }];
      return {
        ...p,
        visitas: v,
        listoConvertir: v.filter(x => x.resultado === "compro").length >= 4
      };
    });
    onSave(nps);
  };
  const guardarComodato = (id, cmd) => {
    onSave(prospectos.map(p => p.id === id ? {
      ...p,
      comodato: {
        ...cmd,
        fecha: new Date().toLocaleDateString("es-AR")
      }
    } : p));
  };
  const importarDesdeExcel = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        if (typeof XLSX === "undefined") {
          setImportMsg({
            tipo: "error",
            txt: "SheetJS no está disponible. Verificá que el script de XLSX esté cargado en el HTML."
          });
          return;
        }
        const wb = XLSX.read(e.target.result, {
          type: "array"
        });
        // Buscar hoja "Prospectos", luego segunda hoja, luego primera
        // Buscar hoja por nombre (flexible) o usar la primera hoja disponible
        let sheet = wb.Sheets["Prospectos"] || wb.Sheets["prospectos"] || wb.Sheets["Clientes"] || wb.Sheets["clientes"] || wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          setImportMsg({
            tipo: "error",
            txt: "No se encontró ninguna hoja válida en el archivo."
          });
          return;
        }

        // Leer en modo raw (header:1) para encontrar la fila de encabezados
        // (el Excel puede tener 1, 2 o 3 filas de título antes de los datos)
        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: ""
        });
        if (!rawRows.length) {
          setImportMsg({
            tipo: "error",
            txt: "La hoja está vacía."
          });
          return;
        }

        // Normalizar string: minúsculas + sin acentos
        const norm = str => String(str || "").toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "");

        // Buscar la fila que tiene "nombre" en alguna celda
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          if (rawRows[i].some(c => norm(c).includes("nombre"))) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx === -1) {
          setImportMsg({
            tipo: "error",
            txt: "No se encontró la fila de encabezados. El archivo debe tener una columna 'Nombre'."
          });
          return;
        }

        // Construir array de objetos usando la fila de headers encontrada
        const headers = rawRows[headerIdx].map(h => norm(h));
        const dataRows = rawRows.slice(headerIdx + 1).map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            if (h) obj[h] = r[i] !== undefined ? r[i] : "";
          });
          return obj;
        });

        // Mapeo flexible: busca la primera columna que incluya alguna de las claves
        const get = (row, ...keys) => {
          for (const k of keys) {
            const kn = norm(k);
            const found = Object.keys(row).find(rk => rk.includes(kn) || kn.includes(rk));
            if (found !== undefined && row[found] !== "" && row[found] !== undefined) return String(row[found]).trim();
          }
          return "";
        };
        const getNum = (row, ...keys) => {
          const v = get(row, ...keys);
          return isNaN(Number(v)) ? 0 : Number(v) || 0;
        };
        const rows = dataRows; // alias para el código de abajo

        const nuevos = [];
        const hoy = new Date().toISOString().slice(0, 10);
        rows.forEach((row, i) => {
          const nombre = get(row, "nombre", "name", "cliente");
          if (!nombre) return; // saltar filas sin nombre
          const dia = get(row, "día", "dia", "day", "jornada") || "Lunes";
          const diaValido = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].find(d => d.toLowerCase() === dia.toLowerCase()) || dia;
          nuevos.push({
            id: Date.now() + i,
            estado: "activo",
            fechaInicio: hoy,
            visitas: [],
            listoConvertir: false,
            nombre,
            dia: diaValido,
            barrio: get(row, "barrio", "neighborhood", "colonia"),
            manzana: get(row, "manzana", "mz", "manzana"),
            lote: get(row, "lote", "lt", "lote"),
            sector: get(row, "sector"),
            calle: get(row, "calle", "calle", "street", "dirección"),
            nro: get(row, "n°", "nro", "número", "numero", "number"),
            aclaracion: get(row, "aclaración", "aclaracion", "piso/depto", "acl"),
            telefono: get(row, "teléfono", "telefono", "tel", "phone", "celular"),
            maps: get(row, "link google maps", "maps", "google maps", "ubicación"),
            notas: get(row, "notas / motivo de interés", "notas", "motivo", "notes", "comentario"),
            sifon: getNum(row, "sifón 1.5l", "sifon", "sifón", "sifones"),
            bidon10: getNum(row, "bidón 10l", "bidon10", "bidón 10l", "b10", "10l"),
            bidon20: getNum(row, "bidón 20l", "bidon20", "bidón 20l", "b20", "20l"),
            dispenser: getNum(row, "dispenser", "dispensador")
          });
        });
        if (!nuevos.length) {
          setImportMsg({
            tipo: "error",
            txt: "No se encontraron filas con nombre válido en la hoja."
          });
          return;
        }
        onSave([...prospectos, ...nuevos]);
        setImportMsg({
          tipo: "ok",
          txt: `${nuevos.length} prospecto${nuevos.length !== 1 ? "s" : ""} importado${nuevos.length !== 1 ? "s" : ""}`,
          n: nuevos.length
        });
        setTimeout(() => setImportMsg(null), 4000);
      } catch (err) {
        setImportMsg({
          tipo: "error",
          txt: "Error al leer el archivo: " + err.message
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const agregarProspecto = datos => {
    onSave([...prospectos, {
      ...datos,
      id: Date.now(),
      estado: "activo",
      fechaInicio: hoyISO,
      visitas: [],
      listoConvertir: false
    }]);
  };
  const eliminar = id => {
    onSave(prospectos.filter(p => p.id !== id));
  };
  if (subVista === "nuevo") return /*#__PURE__*/_jsx(PromoNuevo, {
    diaInicial: diaActivo || "Martes",
    onGuardar: d => {
      agregarProspecto(d);
      setDiaActivo(d.dia);
      setSubVista("dia");
    },
    onVolver: () => setSubVista(diaActivo ? "dia" : "menu")
  });
  if (subVista === "comodato" && selP) return /*#__PURE__*/_jsx(PromoComodato, {
    prospecto: selP,
    onGuardar: cmd => {
      guardarComodato(selP.id, cmd);
      setSubVista("detalle");
    },
    onVolver: () => setSubVista("detalle")
  });
  if (subVista === "detalle" && selP) return /*#__PURE__*/_jsx(PromoDetalle, {
    prospecto: selP,
    listo: listo(selP),
    comprasCount: compras(selP),
    semanasCount: semanas(selP),
    visitadoHoy: visitadoHoy(selP),
    onRegistrar: r => registrar(selP.id, r),
    onComodato: () => setSubVista("comodato"),
    onEditar: datos => onSave(prospectos.map(p => p.id === selP.id ? {
      ...p,
      ...datos
    } : p)),
    onActualizarEnvases: (id, cambios) => {
      onSave(prospectos.map(p => p.id === id ? {
        ...p,
        ...cambios
      } : p));
    },
    onConvertir: () => {
      onConvertir({
        nombre: selP.nombre,
        dia: selP.dia,
        barrio: selP.barrio || "",
        manzana: selP.manzana || "",
        lote: selP.lote || "",
        sector: selP.sector || "",
        calle: selP.calle || "",
        nro: selP.nro || "",
        aclaracion: selP.depto || "",
        telefono: selP.telefono || "",
        maps: selP.maps || "",
        notas: selP.notas || "",
        sifon: selP.sifon || selP.comodato?.sifon || 0,
        bidon10: selP.bidon10 || selP.comodato?.bidon10 || 0,
        bidon20: selP.bidon20 || selP.comodato?.bidon20 || 0,
        dispenser: selP.dispenser || selP.comodato?.dispenser || 0,
        orden: undefined
      });
      setSubVista("dia");
    },
    onEliminar: () => {
      eliminar(selP.id);
      setSubVista("dia");
    },
    onVolver: () => setSubVista("dia")
  });
  if (subVista === "dia") {
    const lista = porDia(diaActivo);
    return /*#__PURE__*/_jsxs("div", {
      style: s.screen,
      children: [/*#__PURE__*/_jsx(HeaderApp, {
        titulo: `Promoción · ${diaActivo}`,
        onVolver: () => setSubVista("menu")
      }), /*#__PURE__*/_jsx("div", {
        style: {
          padding: "8px 14px 4px"
        },
        children: /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center"
          },
          children: [/*#__PURE__*/_jsxs("span", {
            style: s.badge("info"),
            children: [lista.length, " prospectos"]
          }), lista.filter(listo).length > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.badge("success"),
            children: [lista.filter(listo).length, " listos ✓"]
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              fontSize: 11,
              padding: "3px 10px",
              marginLeft: "auto",
              background: "#185FA5",
              color: "#e2eaf4",
              border: "none"
            },
            onClick: () => setSubVista("nuevo"),
            children: "+ Nuevo"
          })]
        })
      }), lista.length === 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-text-tertiary)",
          fontSize: 14
        },
        children: ["No hay prospectos para ", diaActivo, ".", /*#__PURE__*/_jsx("br", {}), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12
          },
          children: "Tocá \"+ Nuevo\" para agregar uno."
        })]
      }), lista.map(p => {
        const c = compras(p),
          s = semanas(p),
          vhoy = visitadoHoy(p),
          lst = listo(p);
        const bc = lst ? "#4dd9a0" : vhoy ? "#5daaff" : "var(--color-border-tertiary)";
        return /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            borderLeft: `3px solid ${bc}`,
            cursor: "pointer"
          },
          onClick: () => {
            setSelId(p.id);
            setSubVista("detalle");
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontWeight: 500,
                  fontSize: 14,
                  color: "var(--color-text-primary)"
                },
                children: p.nombre
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginTop: 2
                },
                children: direccionProspecto(p)
              }), p.fechaInicio && /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)",
                  marginTop: 1
                },
                children: ["Cargado: ", new Date(p.fechaInicio).toLocaleDateString("es-AR")]
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  gap: 5,
                  flexWrap: "wrap",
                  marginTop: 5
                },
                children: [/*#__PURE__*/_jsxs("span", {
                  style: s.tag,
                  children: [s, " sem."]
                }), /*#__PURE__*/_jsxs("span", {
                  style: {
                    ...s.tag,
                    color: "#4dd9a0"
                  },
                  children: [c, "/4 compras"]
                }), lst && /*#__PURE__*/_jsx("span", {
                  style: s.badge("success"),
                  children: "✓ Listo"
                }), vhoy && /*#__PURE__*/_jsx("span", {
                  style: s.badge("info"),
                  children: "Visitado hoy"
                }), p.comodato && /*#__PURE__*/_jsx("span", {
                  style: s.badge("warning"),
                  children: "📋 Comodato"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 8,
                marginLeft: 10
              },
              children: [p.maps && /*#__PURE__*/_jsx("a", {
                href: p.maps,
                target: "_blank",
                rel: "noreferrer",
                style: {
                  fontSize: 18,
                  textDecoration: "none"
                },
                onClick: e => e.stopPropagation(),
                children: "📍"
              }), p.telefono && /*#__PURE__*/_jsx("a", {
                href: `https://wa.me/54${p.telefono}`,
                target: "_blank",
                rel: "noreferrer",
                style: {
                  fontSize: 18,
                  textDecoration: "none"
                },
                onClick: e => e.stopPropagation(),
                children: "💬"
              })]
            })]
          }), /*#__PURE__*/_jsx("div", {
            style: {
              height: 5,
              borderRadius: 3,
              background: "var(--color-background-tertiary)",
              marginTop: 8
            },
            children: /*#__PURE__*/_jsx("div", {
              style: {
                height: 5,
                borderRadius: 3,
                background: lst ? "#4dd9a0" : "#185FA5",
                width: `${Math.min(100, c / 4 * 100)}%`
              }
            })
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              marginTop: 3
            },
            children: lst ? "✓ 4 semanas completadas" : `${c}/4 semanas de compra`
          })]
        }, p.id);
      })]
    });
  }

  // ── Menú principal ─────────────────────────────────────────────────────────
  const activos = prospectos.filter(p => p.estado === "activo").length;
  const listos = prospectos.filter(p => p.listoConvertir && p.estado === "activo").length;
  const convertidos = prospectos.filter(p => p.estado === "convertido").length;
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Promoción",
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.grid3,
        padding: "10px 14px 8px",
        gap: 6
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: s.metricCard,
        children: [/*#__PURE__*/_jsx("div", {
          style: s.metricLabel,
          children: "En promoción"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.metricVal,
            color: "#5daaff"
          },
          children: activos
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.metricCard,
        children: [/*#__PURE__*/_jsx("div", {
          style: s.metricLabel,
          children: "Listos ✓"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.metricVal,
            color: "#4dd9a0"
          },
          children: listos
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.metricCard,
        children: [/*#__PURE__*/_jsx("div", {
          style: s.metricLabel,
          children: "Convertidos"
        }), /*#__PURE__*/_jsx("div", {
          style: s.metricVal,
          children: convertidos
        })]
      })]
    }), listos > 0 && /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.card,
        margin: "0 14px 6px",
        background: "#0a2e1f",
        border: "0.5px solid #4dd9a0"
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 13,
          color: "#4dd9a0",
          fontWeight: 500
        },
        children: ["✓ ", listos, " listo", listos > 1 ? "s" : "", " para convertir"]
      }), /*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-secondary)",
          marginTop: 2
        },
        children: "Entrá al día para agregarlos como clientes"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        gap: 8,
        padding: "4px 14px 2px"
      },
      children: [/*#__PURE__*/_jsxs("button", {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 10px",
          background: "#185FA5",
          color: "#e2eaf4",
          border: "none",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer"
        },
        onClick: () => setSubVista("nuevo"),
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 18,
            lineHeight: 1
          },
          children: "➕"
        }), "Agregar prospecto"]
      }), /*#__PURE__*/_jsxs("button", {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 10px",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-secondary)",
          border: "1.5px solid var(--color-border-secondary)",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer"
        },
        onClick: () => importRef.current?.click(),
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 18,
            lineHeight: 1
          },
          children: "📥"
        }), "Importar Excel"]
      })]
    }), /*#__PURE__*/_jsx("input", {
      ref: importRef,
      type: "file",
      accept: ".xlsx,.xls",
      style: {
        display: "none"
      },
      onChange: e => {
        importarDesdeExcel(e.target.files?.[0]);
        e.target.value = "";
      }
    }), importMsg && /*#__PURE__*/_jsxs("div", {
      style: {
        margin: "4px 14px 0",
        padding: "10px 14px",
        borderRadius: 10,
        background: importMsg.tipo === "ok" ? "var(--color-background-success)" : "var(--color-background-danger)",
        border: "0.5px solid " + (importMsg.tipo === "ok" ? "var(--color-text-success)" : "var(--color-text-danger)"),
        display: "flex",
        alignItems: "center",
        gap: 8
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 16
        },
        children: importMsg.tipo === "ok" ? "✅" : "⚠️"
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 13,
          color: importMsg.tipo === "ok" ? "var(--color-text-success)" : "var(--color-text-danger)",
          fontWeight: 500
        },
        children: importMsg.txt
      })]
    }), /*#__PURE__*/_jsx("span", {
      style: s.sectionTitle,
      children: "Seleccionar día"
    }), /*#__PURE__*/_jsx("div", {
      style: {
        padding: "0 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      children: DIAS.map(d => {
        const total = porDia(d).length,
          lst = porDia(d).filter(listo).length;
        return /*#__PURE__*/_jsxs("button", {
          style: {
            ...s.card,
            margin: 0,
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px"
          },
          onClick: () => {
            setDiaActivo(d);
            setSubVista("dia");
          },
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: d
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)",
                marginTop: 2
              },
              children: [total, " prospectos", lst > 0 ? ` · ${lst} listos` : ""]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 6,
              alignItems: "center"
            },
            children: [lst > 0 && /*#__PURE__*/_jsxs("span", {
              style: s.badge("success"),
              children: [lst, " ✓"]
            }), /*#__PURE__*/_jsx("span", {
              style: {
                color: "var(--color-text-tertiary)",
                fontSize: 18
              },
              children: "→"
            })]
          })]
        }, d);
      })
    })]
  });
}
function EditarProspecto({
  prospecto: p,
  onGuardar,
  onVolver
}) {
  const [d, setD] = useState({
    nombre: p.nombre || "",
    dia: p.dia || "Martes",
    barrio: p.barrio || "",
    sector: p.sector || "",
    manzana: p.manzana || "",
    lote: p.lote || "",
    calle: p.calle || "",
    nro: p.nro || "",
    piso: p.piso || "",
    depto: p.depto || "",
    telefono: p.telefono || "",
    maps: p.maps || "",
    notas: p.notas || "",
    dni: p.dni || "",
    foto: p.foto || "",
    orden: p.orden || "",
    sifon: p.sifon || 0,
    bidon10: p.bidon10 || 0,
    bidon20: p.bidon20 || 0,
    dispenser: p.dispenser || 0
  });
  const s2 = (k, v) => setD(x => ({
    ...x,
    [k]: v
  }));
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Editar prospecto",
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: s.grid2,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Día de visita"
          }), /*#__PURE__*/_jsx("select", {
            style: s.select,
            value: d.dia,
            onChange: e => s2("dia", e.target.value),
            children: DIAS.map(x => /*#__PURE__*/_jsx("option", {
              value: x,
              children: x
            }, x))
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Orden en promoción"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            type: "number",
            min: 1,
            placeholder: "opcional",
            value: d.orden || "",
            onChange: e => s2("orden", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Familia / Nombre *"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "Apellido y nombre",
          value: d.nombre,
          onChange: e => s2("nombre", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Barrio"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "Barrio",
          value: d.barrio,
          onChange: e => s2("barrio", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid3,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Sector"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Sec",
            value: d.sector,
            onChange: e => s2("sector", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Manzana"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Mz",
            value: d.manzana,
            onChange: e => s2("manzana", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Lote"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Lote",
            value: d.lote,
            onChange: e => s2("lote", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid2,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Calle"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Calle",
            value: d.calle,
            onChange: e => s2("calle", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Número"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Nro",
            value: d.nro,
            onChange: e => s2("nro", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid2,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Piso"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: d.piso,
            onChange: e => s2("piso", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Depto"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: d.depto,
            onChange: e => s2("depto", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Teléfono (sin 0 ni 15)"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "3816559000",
          value: d.telefono,
          onChange: e => s2("telefono", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "D.N.I."
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "00.000.000",
          value: d.dni,
          onChange: e => s2("dni", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Link Google Maps"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "https://maps.app.goo.gl/...",
          value: d.maps,
          onChange: e => s2("maps", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Link foto del domicilio"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "https://...",
          value: d.foto,
          onChange: e => s2("foto", e.target.value)
        })]
      }), d.foto && /*#__PURE__*/_jsx("img", {
        src: d.foto,
        alt: "Domicilio",
        style: {
          width: "100%",
          borderRadius: 8,
          maxHeight: 180,
          objectFit: "cover"
        }
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Notas"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "timbre roto, perro, deuda...",
          value: d.notas,
          onChange: e => s2("notas", e.target.value)
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          ...s.label,
          fontSize: 13,
          marginTop: 4
        },
        children: "Envases en comodato"
      }), /*#__PURE__*/_jsx("div", {
        style: s.grid3,
        children: [["sifon", "Sifón"], ["bidon10", "10L"], ["bidon20", "20L"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: {
              ...s.label,
              textAlign: "center"
            },
            children: l
          }), /*#__PURE__*/_jsx("input", {
            style: {
              ...s.input,
              textAlign: "center"
            },
            type: "number",
            min: 0,
            value: d[k] || 0,
            onChange: e => s2(k, Number(e.target.value))
          })]
        }, k))
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Dispenser"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => s2("dispenser", Math.max(0, (d.dispenser || 0) - 1)),
            children: "−"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18,
              fontWeight: 500,
              minWidth: 28,
              textAlign: "center",
              color: "var(--color-text-primary)"
            },
            children: d.dispenser || 0
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => s2("dispenser", (d.dispenser || 0) + 1),
            children: "+"
          })]
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          marginTop: 6,
          opacity: !d.nombre ? 0.45 : 1
        },
        disabled: !d.nombre,
        onClick: () => onGuardar(d),
        children: "Guardar cambios"
      })]
    })]
  });
}
function EnvasesProspecto({
  prospecto: p,
  onActualizar
}) {
  const [editando, setEditando] = useState(false);
  const [vals, setVals] = useState({
    sifon: p.sifon || 0,
    bidon10: p.bidon10 || 0,
    bidon20: p.bidon20 || 0,
    dispenser: p.dispenser || 0
  });
  const sv = (k, v) => setVals(x => ({
    ...x,
    [k]: v
  }));
  const tiene = vals.sifon > 0 || vals.bidon10 > 0 || vals.bidon20 > 0 || vals.dispenser > 0;
  return /*#__PURE__*/_jsxs("div", {
    style: {
      ...s.card,
      marginBottom: 10
    },
    children: [/*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: editando ? 10 : 0
      },
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)"
          },
          children: "Envases en comodato"
        }), !editando && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            marginTop: 4
          },
          children: [vals.sifon > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["Sifón ×", vals.sifon]
          }), vals.bidon10 > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["10L ×", vals.bidon10]
          }), vals.bidon20 > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["20L ×", vals.bidon20]
          }), vals.dispenser > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              ...s.tag,
              color: "#5daaff"
            },
            children: ["Disp ×", vals.dispenser]
          }), !tiene && /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 11,
              color: "var(--color-text-tertiary)"
            },
            children: "Sin envases cargados"
          })]
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          fontSize: 11,
          padding: "4px 10px"
        },
        onClick: () => {
          if (editando) {
            onActualizar({
              sifon: vals.sifon,
              bidon10: vals.bidon10,
              bidon20: vals.bidon20,
              dispenser: vals.dispenser
            });
          }
          setEditando(!editando);
        },
        children: editando ? "Guardar" : "Editar"
      })]
    }), editando && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("div", {
        style: s.grid3,
        children: [["sifon", "Sifón"], ["bidon10", "Bidón 10L"], ["bidon20", "Bidón 20L"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: {
              ...s.label,
              textAlign: "center"
            },
            children: l
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: "center"
            },
            children: [/*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "3px 10px",
                fontSize: 16,
                lineHeight: 1
              },
              onClick: () => sv(k, Math.max(0, (vals[k] || 0) - 1)),
              children: "−"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 16,
                fontWeight: 500,
                minWidth: 24,
                textAlign: "center",
                color: "var(--color-text-primary)"
              },
              children: vals[k] || 0
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "3px 10px",
                fontSize: 16,
                lineHeight: 1
              },
              onClick: () => sv(k, (vals[k] || 0) + 1),
              children: "+"
            })]
          })]
        }, k))
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginTop: 8
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Dispenser"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "4px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => sv("dispenser", Math.max(0, (vals.dispenser || 0) - 1)),
            children: "−"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18,
              fontWeight: 500,
              minWidth: 28,
              textAlign: "center",
              color: "var(--color-text-primary)"
            },
            children: vals.dispenser || 0
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "4px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => sv("dispenser", (vals.dispenser || 0) + 1),
            children: "+"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)"
            },
            children: "unidades"
          })]
        })]
      })]
    })]
  });
}
function PromoDetalle({
  prospecto: p,
  listo,
  comprasCount,
  semanasCount,
  visitadoHoy,
  onRegistrar,
  onComodato,
  onConvertir,
  onEliminar,
  onVolver,
  onActualizarEnvases,
  onEditar
}) {
  const [editando, setEditando] = useState(false);
  if (editando) return /*#__PURE__*/_jsx(EditarProspecto, {
    prospecto: p,
    onGuardar: datos => {
      onEditar(datos);
      setEditando(false);
    },
    onVolver: () => setEditando(false)
  });
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Promoción",
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        background: "var(--color-background-secondary)",
        borderRadius: 10,
        margin: "8px 14px 0",
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 15,
          fontWeight: 600,
          color: "var(--color-text-primary)"
        },
        children: p.nombre
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 6,
          flexShrink: 0
        },
        children: [/*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 11,
            padding: "4px 10px"
          },
          onClick: () => setEditando(true),
          children: "Editar"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 11,
            padding: "4px 10px"
          },
          onClick: onComodato,
          children: "📋"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 14
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          borderLeft: "3px solid #5daaff",
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: [p.dia, " · ", p.fechaInicio && /*#__PURE__*/_jsxs("span", {
            style: {
              color: "var(--color-text-tertiary)"
            },
            children: ["Desde ", new Date(p.fechaInicio).toLocaleDateString("es-AR"), " · "]
          }), direccionProspecto(p)]
        }), p.dni && /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginTop: 2
          },
          children: ["DNI: ", p.dni]
        }), p.notas && /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-warning)",
            marginTop: 4
          },
          children: ["📝 ", p.notas]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginTop: 8
          },
          children: [p.telefono && /*#__PURE__*/_jsx("a", {
            href: `https://wa.me/54${p.telefono}`,
            target: "_blank",
            rel: "noreferrer",
            style: {
              ...s.badge("success"),
              textDecoration: "none"
            },
            children: "💬 WhatsApp"
          }), p.maps && /*#__PURE__*/_jsx("a", {
            href: p.maps,
            target: "_blank",
            rel: "noreferrer",
            style: {
              ...s.badge("info"),
              textDecoration: "none"
            },
            children: "📍 Maps"
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.grid3,
          marginBottom: 10,
          gap: 6
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: s.metricCard,
          children: [/*#__PURE__*/_jsx("div", {
            style: s.metricLabel,
            children: "Semanas"
          }), /*#__PURE__*/_jsx("div", {
            style: s.metricVal,
            children: semanasCount
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.metricCard,
            background: comprasCount >= 4 ? "#0a2e1f" : undefined
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: s.metricLabel,
            children: "Compras"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              ...s.metricVal,
              color: comprasCount >= 4 ? "#4dd9a0" : "var(--color-text-primary)"
            },
            children: [comprasCount, "/4"]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: s.metricCard,
          children: [/*#__PURE__*/_jsx("div", {
            style: s.metricLabel,
            children: "Visitas tot."
          }), /*#__PURE__*/_jsx("div", {
            style: s.metricVal,
            children: (p.visitas || []).length
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            height: 10,
            borderRadius: 5,
            background: "var(--color-background-tertiary)",
            marginBottom: 6
          },
          children: /*#__PURE__*/_jsx("div", {
            style: {
              height: 10,
              borderRadius: 5,
              background: listo ? "#4dd9a0" : "#185FA5",
              width: `${Math.min(100, comprasCount / 4 * 100)}%`,
              transition: "width 0.4s"
            }
          })
        }), listo ? /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            color: "#4dd9a0",
            fontWeight: 500
          },
          children: "✓ Completó 4 semanas de compra"
        }) : /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: ["Faltan ", 4 - comprasCount, " compras más"]
        })]
      }), /*#__PURE__*/_jsx(EnvasesProspecto, {
        prospecto: p,
        onActualizar: cambios => {
          onActualizarEnvases(p.id, cambios);
        }
      }), p.comodato && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          marginBottom: 10,
          background: "var(--color-background-tertiary)"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginBottom: 4,
            fontWeight: 500
          },
          children: ["📋 Comodato entregado · ", p.comodato.fecha]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          },
          children: [p.comodato.sifon > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["Sifón ×", p.comodato.sifon]
          }), p.comodato.bidon10 > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["Bidón 10L ×", p.comodato.bidon10]
          }), p.comodato.bidon20 > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["Bidón 20L ×", p.comodato.bidon20]
          }), p.comodato.dispenser > 0 && /*#__PURE__*/_jsxs("span", {
            style: s.tag,
            children: ["Dispenser ×", p.comodato.dispenser]
          })]
        })]
      }), listo && /*#__PURE__*/_jsxs("button", {
        style: {
          ...s.btnPrimary,
          marginBottom: 10,
          background: "#0F6E56"
        },
        onClick: () => {
          if (window.confirm(`¿Convertir a ${p.nombre} en cliente regular de ${p.dia}?

El número de orden en la ruta se asigna después desde Gestión de clientes.`)) onConvertir();
        },
        children: ["✓ Convertir a cliente regular de ", p.dia]
      }), !visitadoHoy && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            ...s.sectionTitle,
            padding: "0 0 8px"
          },
          children: "Registrar visita de hoy"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              background: "#0a2e1f",
              color: "#4dd9a0",
              border: "0.5px solid #4dd9a0",
              borderRadius: 8,
              padding: "12px 4px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer"
            },
            onClick: () => onRegistrar("compro"),
            children: "✓ Compró"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-warning)",
              color: "var(--color-text-warning)",
              border: "0.5px solid var(--color-border-warning)",
              borderRadius: 8,
              padding: "12px 4px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer"
            },
            onClick: () => onRegistrar("noesta"),
            children: "No estaba"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnDanger,
              padding: "12px 4px",
              fontSize: 12
            },
            onClick: () => onRegistrar("noquiso"),
            children: "No quiso"
          })]
        })]
      }), visitadoHoy && /*#__PURE__*/_jsx("div", {
        style: {
          ...s.badge("info"),
          display: "inline-block",
          marginBottom: 12,
          fontSize: 12,
          padding: "6px 12px"
        },
        children: "✓ Ya visitado hoy"
      }), /*#__PURE__*/_jsx("span", {
        style: {
          ...s.sectionTitle,
          padding: "0 0 8px"
        },
        children: "Historial"
      }), (p.visitas || []).length === 0 && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text-tertiary)"
        },
        children: "Sin visitas aún"
      }), [...(p.visitas || [])].reverse().map((v, i) => /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: v.fecha
        }), /*#__PURE__*/_jsx("span", {
          style: v.resultado === "compro" ? s.badge("success") : v.resultado === "noquiso" ? s.badge("danger") : s.badge("warning"),
          children: v.resultado === "compro" ? "✓ Compró" : v.resultado === "noquiso" ? "No quiso" : "No estaba"
        })]
      }, i)), /*#__PURE__*/_jsx("div", {
        style: {
          ...s.divider,
          marginTop: 16
        }
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnDanger,
          width: "100%",
          padding: "10px"
        },
        onClick: () => {
          if (window.confirm(`¿Eliminar a ${p.nombre}?`)) onEliminar();
        },
        children: "Eliminar prospecto"
      })]
    })]
  });
}
function PromoNuevo({
  diaInicial,
  onGuardar,
  onVolver
}) {
  const [d, setD] = useState({
    nombre: "",
    dia: diaInicial,
    barrio: "",
    sector: "",
    manzana: "",
    lote: "",
    calle: "",
    nro: "",
    piso: "",
    depto: "",
    telefono: "",
    maps: "",
    notas: "",
    dni: "",
    orden: "",
    sifon: 0,
    bidon10: 0,
    bidon20: 0,
    dispenser: 0
  });
  const s2 = (k, v) => setD(x => ({
    ...x,
    [k]: v
  }));
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Nuevo prospecto",
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10
      },
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Día de visita"
        }), /*#__PURE__*/_jsx("select", {
          style: s.select,
          value: d.dia,
          onChange: e => s2("dia", e.target.value),
          children: DIAS.map(x => /*#__PURE__*/_jsx("option", {
            value: x,
            children: x
          }, x))
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Orden en promoción (opcional)"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          type: "number",
          min: 1,
          placeholder: "solo para ordenar la lista de promoción",
          value: d.orden || "",
          onChange: e => s2("orden", e.target.value)
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 3
          },
          children: "El número de ruta se asigna cuando se convierte en cliente regular"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Familia / Nombre *"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "Apellido y nombre",
          value: d.nombre,
          onChange: e => s2("nombre", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Barrio"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "Barrio",
          value: d.barrio,
          onChange: e => s2("barrio", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid3,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Sector"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Sec",
            value: d.sector,
            onChange: e => s2("sector", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Manzana"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Mz",
            value: d.manzana,
            onChange: e => s2("manzana", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Lote"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Lote",
            value: d.lote,
            onChange: e => s2("lote", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid2,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Calle"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Calle",
            value: d.calle,
            onChange: e => s2("calle", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Número"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Nro",
            value: d.nro,
            onChange: e => s2("nro", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: s.grid2,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Piso"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: d.piso,
            onChange: e => s2("piso", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Depto"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: d.depto,
            onChange: e => s2("depto", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Teléfono (sin 0 ni 15)"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "3816559000",
          value: d.telefono,
          onChange: e => s2("telefono", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "D.N.I."
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "00.000.000",
          value: d.dni,
          onChange: e => s2("dni", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Link Google Maps"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "https://maps.app.goo.gl/...",
          value: d.maps,
          onChange: e => s2("maps", e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Notas"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: "timbre roto, perro, deuda...",
          value: d.notas,
          onChange: e => s2("notas", e.target.value)
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          ...s.label,
          fontSize: 13,
          marginTop: 4
        },
        children: "Envases entregados en comodato"
      }), /*#__PURE__*/_jsx("div", {
        style: s.grid3,
        children: [["sifon", "Sifón"], ["bidon10", "Bidón 10L"], ["bidon20", "Bidón 20L"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: {
              ...s.label,
              textAlign: "center"
            },
            children: l
          }), /*#__PURE__*/_jsx("input", {
            style: {
              ...s.input,
              textAlign: "center"
            },
            type: "number",
            min: 0,
            value: d[k] || 0,
            onChange: e => s2(k, Number(e.target.value))
          })]
        }, k))
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Dispenser"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => s2("dispenser", Math.max(0, (d.dispenser || 0) - 1)),
            children: "−"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18,
              fontWeight: 500,
              minWidth: 28,
              textAlign: "center",
              color: "var(--color-text-primary)"
            },
            children: d.dispenser || 0
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => s2("dispenser", (d.dispenser || 0) + 1),
            children: "+"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)"
            },
            children: "unidades"
          })]
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          marginTop: 4,
          opacity: !d.nombre ? 0.45 : 1
        },
        disabled: !d.nombre,
        onClick: () => onGuardar(d),
        children: "Agregar prospecto"
      })]
    })]
  });
}
function PromoComodato({
  prospecto: p,
  onGuardar,
  onVolver
}) {
  const [c, setC] = useState(p.comodato || {
    sifon: 0,
    bidon10: 0,
    bidon20: 0,
    dispenser: 0,
    aclaracion: "",
    dni: "",
    piso: "",
    depto: ""
  });
  const sc = (k, v) => setC(x => ({
    ...x,
    [k]: v
  }));
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: `Comodato · ${p.nombre}`,
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 14
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          textAlign: "center",
          marginBottom: 10,
          background: "var(--color-background-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: "Soda y Agua Tratada Envasada"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 18,
            fontWeight: 500,
            color: "#5daaff",
            margin: "4px 0"
          },
          children: "LA CATALINA"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: "De Guillermo Carabajal Ponce"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            marginTop: 6
          },
          children: "Comodato — Ficha del cliente"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)",
          marginBottom: 10
        },
        children: ["San Miguel de Tucumán: ", new Date().toLocaleDateString("es-AR")]
      }), [["Familia", p.nombre], ["Barrio", p.barrio], ["Sec / Mz / Lote", `${p.sector || "—"} / ${p.manzana || "—"} / ${p.lote || "—"}`], ["Calle", p.calle ? `${p.calle} ${p.nro || ""}` : ""]].filter(([, v]) => v).map(([l, v]) => /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          padding: "6px 0",
          borderBottom: "0.5px solid var(--color-border-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: l
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            color: "var(--color-text-primary)",
            fontWeight: 500
          },
          children: v
        })]
      }, l)), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.grid2,
          margin: "10px 0"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Piso"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: c.piso || "",
            onChange: e => sc("piso", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Depto"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "—",
            value: c.depto || "",
            onChange: e => sc("depto", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0 10px"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)"
          },
          children: "Producto"
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)"
          },
          children: "Cantidad"
        })]
      }), [["sifon", "Sifón 1500cc"], ["bidon10", "Bidón 10 lts."], ["bidon20", "Bidón 20 lts."], ["dispenser", "Dispenser"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "0.5px solid var(--color-border-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 14,
            color: "var(--color-text-primary)"
          },
          children: l
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "4px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => sc(k, Math.max(0, (c[k] || 0) - 1)),
            children: "−"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18,
              fontWeight: 500,
              minWidth: 30,
              textAlign: "center",
              color: "var(--color-text-primary)"
            },
            children: c[k] || 0
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "4px 14px",
              fontSize: 18,
              lineHeight: 1
            },
            onClick: () => sc(k, (c[k] || 0) + 1),
            children: "+"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)"
            },
            children: "Unid."
          })]
        })]
      }, k)), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 14
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Aclaración / Firma"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Nombre en letra de imprenta",
            value: c.aclaracion || "",
            onChange: e => sc("aclaracion", e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "D.N.I."
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "00.000.000",
            value: c.dni || "",
            onChange: e => sc("dni", e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: "12px 0",
          background: "var(--color-background-tertiary)"
        },
        children: /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            lineHeight: 1.6
          },
          children: "El comodato es un contrato por el cual una parte entrega a la otra gratuitamente una especie, mueble o bien raíz, para que haga uso de ella, con cargo de restituir la misma especie después de terminado el uso."
        })
      }), /*#__PURE__*/_jsx("button", {
        style: s.btnPrimary,
        onClick: () => onGuardar(c),
        children: "Guardar comodato"
      })]
    })]
  });
}
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
  return /*#__PURE__*/_jsxs("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      ...(style || {})
    },
    children: [(() => {
      const real = {
        sifon: Math.max(0, (Number(cl.sifon) || 0) + ex.sifon),
        b10: Math.max(0, (Number(cl.bidon10) || 0) + ex.b10),
        b20: Math.max(0, (Number(cl.bidon20) || 0) + ex.b20)
      };
      return /*#__PURE__*/_jsxs(_Fragment, {
        children: [real.sifon > 0 && /*#__PURE__*/_jsxs("span", {
          style: TH,
          children: ["Sif ×", real.sifon]
        }), real.b10 > 0 && /*#__PURE__*/_jsxs("span", {
          style: TH,
          children: ["10L ×", real.b10]
        }), real.b20 > 0 && /*#__PURE__*/_jsxs("span", {
          style: TH,
          children: ["20L ×", real.b20]
        }), cl.dispenser > 0 && /*#__PURE__*/_jsxs("span", {
          style: TH,
          children: ["Disp ×", cl.dispenser]
        })]
      });
    })(), (cl.saldo || 0) < 0 && /*#__PURE__*/_jsxs("span", {
      style: TD,
      children: ["Debe ", fmt(Math.abs(cl.saldo))]
    }), (cl.saldo || 0) > 0 && /*#__PURE__*/_jsxs("span", {
      style: TF,
      children: ["A favor ", fmt(cl.saldo)]
    })]
  });
}