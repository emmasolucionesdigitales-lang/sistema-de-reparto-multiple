import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ════════════════════════════════════════════════════════════════════
// ◆  14-config.js — Config
// ════════════════════════════════════════════════════════════════════

// ── Tarjeta de seguridad: activar/desactivar acceso con huella (dueño) ──
// Usa las funciones que ya viven en 05-licencias.js (bioSoportado, srBioRegistrar, etc.)
function SeguridadHuella() {
  const soportado = typeof bioSoportado === "function" ? bioSoportado() : false;
  const [enrolado, setEnrolado] = React.useState(typeof bioEnrolado === "function" ? bioEnrolado() : false);
  const [trabajando, setTrabajando] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const activar = async () => {
    setMsg("");
    setTrabajando(true);
    try {
      await srBioRegistrar();
      setEnrolado(true);
      setMsg("✓ Listo. La próxima vez que abras la app vas a poder entrar con tu huella.");
    } catch (e) {
      setMsg("No se pudo activar. Probá de nuevo, o usá un dispositivo con lector de huella / Face ID (suele andar en el celular).");
    }
    setTrabajando(false);
  };
  const desactivar = () => {
    // "sr_bio_cred" es la misma clave que usa 05-licencias.js (SR_BIO_KEY)
    try {
      localStorage.removeItem("sr_bio_cred");
      localStorage.removeItem("sr_bio_no");
    } catch (e) {}
    setEnrolado(false);
    setMsg("Huella desactivada. Vas a entrar con tu PIN.");
  };
  return /*#__PURE__*/_jsx(_Fragment, {
    children: !soportado ? /*#__PURE__*/_jsx("p", {
      style: {
        fontSize: 12,
        color: "var(--color-text-tertiary)",
        margin: "4px 0 0",
        lineHeight: 1.5
      },
      children: "Este dispositivo no tiene lector de huella / Face ID disponible. Suele funcionar desde el celular; probá abriendo la app ahí."
    }) : /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          margin: "0 0 12px",
          lineHeight: 1.5
        },
        children: "Entrá a la app con tu huella en lugar de escribir el PIN. El PIN sigue funcionando por si lo necesitás."
      }), enrolado ? /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-success)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10
          },
          children: [/*#__PURE__*/_jsx("span", {
            children: "✓"
          }), /*#__PURE__*/_jsx("span", {
            children: "Huella activada"
          })]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            width: "100%",
            padding: "11px",
            fontSize: 13,
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
            border: "0.5px solid var(--color-border-danger)",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer"
          },
          onClick: desactivar,
          children: "Desactivar huella"
        })]
      }) : /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          width: "100%",
          opacity: trabajando ? 0.6 : 1
        },
        disabled: trabajando,
        onClick: activar,
        children: trabajando ? "Verificando..." : "👆 Activar huella"
      }), msg && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)",
          margin: "8px 0 0",
          lineHeight: 1.5
        },
        children: msg
      })]
    })
  });
}

// ── Tarjeta de notificaciones (dueño) ──────────────────────────────────────
// ── Acordeón simple: título + resumen, se expande al tocar ─────────────────
function SeccionPlegable({
  icono,
  titulo,
  resumen,
  children
}) {
  const [abierto, setAbierto] = React.useState(false);
  return /*#__PURE__*/_jsxs("div", {
    style: {
      marginBottom: 8,
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 8,
      overflow: "hidden"
    },
    children: [/*#__PURE__*/_jsxs("button", {
      style: {
        width: "100%",
        background: "var(--color-background-tertiary)",
        border: "none",
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        textAlign: "left"
      },
      onClick: () => setAbierto(!abierto),
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 13
        },
        children: icono
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 11,
          color: "var(--color-text-secondary)",
          flex: 1
        },
        children: titulo
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 12,
          color: "var(--color-text-primary)",
          fontWeight: 600
        },
        children: resumen
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginLeft: 4
        },
        children: abierto ? "▲" : "▼"
      })]
    }), abierto && /*#__PURE__*/_jsx("div", {
      style: {
        padding: "10px"
      },
      children: children
    })]
  });
}
function NotifConfig({
  syncData
}) {
  const pedirPermiso = async () => {
    if (!('Notification' in window)) return;
    const r = await Notification.requestPermission();
    setPermiso(r);
  };
  const [permiso, setPermiso] = React.useState('Notification' in window ? Notification.permission : 'no-soportado');
  const [probando, setProbando] = React.useState(false);
  const [resultado, setResultado] = React.useState(null);
  const probar = async () => {
    setProbando(true);
    setResultado(null);
    try {
      if (typeof window.activarNotif !== 'function') {
        setResultado({
          ok: false,
          msg: 'La función todavía no cargó, esperá unos segundos y probá de nuevo.'
        });
      } else {
        const ok = await window.activarNotif();
        setResultado(ok ? {
          ok: true,
          msg: 'Suscripción guardada. Esto confirma que el navegador quedó registrado — no confirma que un aviso vaya a llegar (eso depende del servidor).'
        } : {
          ok: false,
          msg: 'No se pudo activar. Revisá los permisos del navegador.'
        });
      }
    } catch (e) {
      setResultado({
        ok: false,
        msg: e.message || 'Error inesperado'
      });
    }
    setProbando(false);
  };
  const estadoColor = permiso === 'granted' ? '#4dd9a0' : permiso === 'denied' ? '#f07070' : '#f5b942';
  const estadoTexto = permiso === 'granted' ? '✅ Activadas' : permiso === 'denied' ? '🚫 Bloqueadas por el sistema' : permiso === 'no-soportado' ? '⚠ No soportado' : '⏳ Sin activar';
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsx("p", {
      style: {
        fontSize: 12,
        color: "var(--color-text-tertiary)",
        margin: "0 0 10px",
        lineHeight: 1.5
      },
      children: "Avisos de cierre, transferencias, mantenimiento y agenda — funcionan con la app cerrada."
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: estadoColor
        },
        children: estadoTexto
      }), permiso !== 'granted' && permiso !== 'denied' && /*#__PURE__*/_jsx("button", {
        style: {
          background: "#185FA5",
          color: "#e2eaf4",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer"
        },
        onClick: pedirPermiso,
        children: "Activar"
      }), permiso === 'denied' && /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)"
        },
        children: "Activalas desde el navegador"
      })]
    }), permiso === 'granted' && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("button", {
        style: {
          width: "100%",
          background: "var(--color-background-tertiary)",
          color: "var(--color-text-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: 8,
          padding: "9px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          marginBottom: 6
        },
        disabled: probando,
        onClick: probar,
        children: probando ? "Probando..." : "🔄 Probar / renovar suscripción de avisos"
      }), resultado && /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 12,
          color: resultado.ok ? "var(--color-text-success)" : "var(--color-text-danger)",
          lineHeight: 1.4
        },
        children: [resultado.ok ? "✓ " : "✗ ", resultado.msg]
      }), /*#__PURE__*/_jsxs(SeccionPlegable, {
        icono: "💳",
        titulo: "Transferencias — horas de aviso",
        resumen: (() => {
          try {
            const a = JSON.parse(localStorage.getItem('rm_horas_notif_trans') || '["13:00","19:00"]');
            return a[0] + ' y ' + a[1];
          } catch {
            return '13:00 y 19:00';
          }
        })(),
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/*#__PURE__*/_jsx("input", {
            type: "time",
            style: {
              padding: "8px 10px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8,
              fontSize: 14,
              background: "var(--color-background-tertiary)",
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
              flex: 1
            },
            defaultValue: (() => {
              try {
                return JSON.parse(localStorage.getItem('rm_horas_notif_trans') || '["13:00","19:00"]')[0];
              } catch {
                return '13:00';
              }
            })(),
            onChange: e => {
              let arr;
              try {
                arr = JSON.parse(localStorage.getItem('rm_horas_notif_trans') || '["13:00","19:00"]');
              } catch {
                arr = ['13:00', '19:00'];
              }
              arr[0] = e.target.value;
              localStorage.setItem('rm_horas_notif_trans', JSON.stringify(arr));
              syncData({
                horasAvisoTrans: arr
              });
            }
          }), /*#__PURE__*/_jsx("input", {
            type: "time",
            style: {
              padding: "8px 10px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8,
              fontSize: 14,
              background: "var(--color-background-tertiary)",
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
              flex: 1
            },
            defaultValue: (() => {
              try {
                return JSON.parse(localStorage.getItem('rm_horas_notif_trans') || '["13:00","19:00"]')[1];
              } catch {
                return '19:00';
              }
            })(),
            onChange: e => {
              let arr;
              try {
                arr = JSON.parse(localStorage.getItem('rm_horas_notif_trans') || '["13:00","19:00"]');
              } catch {
                arr = ['13:00', '19:00'];
              }
              arr[1] = e.target.value;
              localStorage.setItem('rm_horas_notif_trans', JSON.stringify(arr));
              syncData({
                horasAvisoTrans: arr
              });
            }
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 4
          },
          children: "Si a esa hora hay transferencias sin confirmar, recibís un aviso."
        })]
      }), /*#__PURE__*/_jsxs(SeccionPlegable, {
        icono: "🔧",
        titulo: "Mantenimiento — días antes del vencimiento",
        resumen: localStorage.getItem('rm_dias_notif_mant') || '3,2,1,0',
        children: [/*#__PURE__*/_jsx("input", {
          type: "text",
          placeholder: "ej: 3,2,1,0",
          style: {
            padding: "8px 10px",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 8,
            fontSize: 14,
            background: "var(--color-background-tertiary)",
            color: "var(--color-text-primary)",
            outline: "none",
            boxSizing: "border-box",
            width: "100%"
          },
          defaultValue: localStorage.getItem('rm_dias_notif_mant') || '3,2,1,0',
          onChange: e => {
            localStorage.setItem('rm_dias_notif_mant', e.target.value);
            const arr = e.target.value.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
            syncData({
              diasAvisoMant: arr
            });
          }
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 4
          },
          children: "Números separados por coma. Se avisa a las 7am si faltan esos días exactos."
        })]
      }), /*#__PURE__*/_jsxs(SeccionPlegable, {
        icono: "⏰",
        titulo: "Cierre del día — hora de aviso",
        resumen: localStorage.getItem('rm_hora_notif_cierre') || '18:00',
        children: [/*#__PURE__*/_jsx("input", {
          type: "time",
          style: {
            padding: "8px 10px",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 8,
            fontSize: 14,
            background: "var(--color-background-tertiary)",
            color: "var(--color-text-primary)",
            outline: "none",
            boxSizing: "border-box"
          },
          defaultValue: localStorage.getItem('rm_hora_notif_cierre') || '18:00',
          onChange: e => {
            localStorage.setItem('rm_hora_notif_cierre', e.target.value);
            syncData({
              horaAvisoCierre: e.target.value
            });
          }
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 4
          },
          children: "Si a esa hora la planilla está vacía (y es día de reparto), recibís un aviso."
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          lineHeight: 1.7,
          marginTop: 8
        },
        children: "📅 Recordatorios de agenda → a la hora exacta"
      })]
    })]
  });
}
function Config({
  productos,
  setProductos,
  clientes,
  setClientes,
  ventas,
  setVentas,
  planillas,
  setPlanillas,
  stock,
  setStock,
  cargasDia,
  setCargasDia,
  syncData,
  onVolver,
  negocioId,
  tabInicial,
  repartos,
  repartoActual
}) {
  const [tab, setTab] = useState(["datos", "vehiculo", "apariencia"].includes(tabInicial) ? tabInicial : "datos");
  const [abiertoNotif, setAbiertoNotif] = useState(false);
  const [abiertoHuella, setAbiertoHuella] = useState(false);
  const [abiertoRespaldo, setAbiertoRespaldo] = useState(false);
  const [abiertoMant, setAbiertoMant] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  // Exportar ventas a CSV — para llevarle algo armado a un contador, o
  // simplemente tener el historial en una planilla aparte de la app.
  const exportarVentasCSV = () => {
    if (!ventas || !ventas.length) {
      alert("No hay ventas para exportar.");
      return;
    }
    const clientePorId = {};
    (clientes || []).forEach(c => {
      clientePorId[c.id] = c.nombre;
    });
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = [["Fecha", "Día", "Cliente", "Productos", "Monto", "Forma de pago", "Observaciones"].map(esc).join(",")];
    [...ventas].sort((a, b) => (a.fechaKey || "").localeCompare(b.fechaKey || "")).forEach(v => {
      if (v._esCobro || v._esAjuste || v._esAjusteEnvases) return;
      const prods = (v.detalle || []).map(d => `${d.nombre} x${d.cantidad}`).join(" · ");
      filas.push([v.fechaKey || "", v.dia || "", clientePorId[v.clienteId] || "", prods, v.neto || v.pagadoNum || 0, v.pago || "", v.obs || ""].map(esc).join(","));
    });
    const csv = "\uFEFF" + filas.join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_${new Date().toLocaleDateString("en-CA")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const [importando, setImportando] = useState(false);
  const [importReparto, setImportReparto] = useState(repartoActual?.id ?? "");
  // ▶ Fix: filtroReparto faltaba declarado — causaba crash al abrir Datos
  const [filtroReparto, setFiltroReparto] = useState("todos");
  const [mantVeh, setMantVeh] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rm_mant_vehiculo_v1") || "[]");
    } catch {
      return [];
    }
  });
  const [mostrarNuevoMant, setMostrarNuevoMant] = React.useState(false);
  const saveMantVeh = lista => {
    setMantVeh(lista);
    localStorage.setItem("rm_mant_vehiculo_v1", JSON.stringify(lista));
    if (syncData) syncData({
      mantVeh: lista
    });
  };
  const prestados = {
    sifon: clientes.reduce((a, c) => a + (c.sifon || 0), 0),
    bidon10: clientes.reduce((a, c) => a + (c.bidon10 || 0), 0),
    bidon20: clientes.reduce((a, c) => a + (c.bidon20 || 0), 0)
  };
  const stockKeys = {
    "Sifón 1.5L": "sifon",
    "Bidón 10L": "bidon10",
    "Bidón 20L": "bidon20",
    "Dispenser": "dispenser"
  };
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Configuración",
      onVolver: onVolver
    }), /*#__PURE__*/_jsx("div", {
      style: {
        padding: "14px 14px 6px",
        background: "var(--color-background-secondary)"
      },
      children: /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 8
        },
        children: [["datos", "📋", "Datos"], ["vehiculo", "🚐", "Vehículo"], ["apariencia", "🎨", "Estilo"]].map(([id, ico, lbl]) => /*#__PURE__*/_jsxs("button", {
          onClick: () => setTab(id),
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "14px 8px",
            borderRadius: 14,
            cursor: "pointer",
            border: `2px solid ${tab === id ? "var(--color-accent)" : "var(--color-border-tertiary)"}`,
            background: tab === id ? "var(--color-background-info)" : "var(--color-background-tertiary)",
            boxShadow: tab === id ? "0 0 0 1px var(--color-accent), 0 4px 16px rgba(24,95,165,0.25)" : "0 2px 6px rgba(0,0,0,0.25)",
            color: tab === id ? "var(--color-text-info)" : "var(--color-text-secondary)",
            transition: "all 0.18s"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 26,
              lineHeight: 1
            },
            children: ico
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 11,
              fontWeight: tab === id ? 600 : 400,
              letterSpacing: "0.03em"
            },
            children: lbl
          })]
        }, id))
      })
    }), tab === "stock" && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          padding: 16
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 14px",
            background: "var(--color-background-info)",
            border: "0.5px solid var(--color-border-info)",
            padding: "10px 14px"
          },
          children: /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-text-info)"
            },
            children: "💲 Precios y costos"
          })
        }), productos.map(p => {
          const editing = editandoId === p.id;
          const [pr, setPr] = [p.precio, v => setProductos(productos.map(x => x.id === p.id ? {
            ...x,
            precio: Number(v) || 0
          } : x))];
          const [co, setCo] = [p.costo, v => setProductos(productos.map(x => x.id === p.id ? {
            ...x,
            costo: Number(v) || 0
          } : x))];
          const margen = p.precio > 0 ? Math.round((p.precio - p.costo) / p.precio * 100) : 0;
          return /*#__PURE__*/_jsx("div", {
            style: {
              ...s.card,
              margin: "0 0 10px",
              borderLeft: editing ? "3px solid #185FA5" : "0.5px solid var(--color-border-tertiary)"
            },
            children: !editing ? /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              },
              children: [/*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("div", {
                  style: {
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--color-text-primary)"
                  },
                  children: p.nombre
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginTop: 4
                  },
                  children: ["Venta: ", /*#__PURE__*/_jsx("b", {
                    children: fmt(p.precio)
                  }), " · Costo: ", fmt(p.costo), " ·", /*#__PURE__*/_jsxs("span", {
                    style: {
                      color: margen > 40 ? "var(--color-text-success)" : margen > 20 ? "var(--color-text-warning)" : "var(--color-text-danger)"
                    },
                    children: [" ", margen, "% margen"]
                  })]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  gap: 6
                },
                children: [/*#__PURE__*/_jsx("button", {
                  style: {
                    ...s.btn,
                    fontSize: 11,
                    padding: "4px 10px"
                  },
                  onClick: () => setEditandoId(p.id),
                  children: "Editar"
                }), /*#__PURE__*/_jsx("button", {
                  style: s.btnDanger,
                  onClick: () => {
                    if (window.confirm(`¿Eliminar "${p.nombre}"?`)) setProductos(productos.filter(x => x.id !== p.id));
                  },
                  children: "✕"
                })]
              })]
            }) : /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10
                },
                children: [/*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text-primary)"
                  },
                  children: ["Editando: ", p.nombre]
                }), /*#__PURE__*/_jsx("button", {
                  style: {
                    ...s.btn,
                    fontSize: 11,
                    padding: "3px 10px"
                  },
                  onClick: () => setEditandoId(null),
                  children: "Cancelar"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 8
                },
                children: [/*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("label", {
                    style: s.label,
                    children: "Nombre"
                  }), /*#__PURE__*/_jsx("input", {
                    style: s.input,
                    defaultValue: p.nombre,
                    id: `nm-${p.id}`
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("label", {
                    style: s.label,
                    children: "Precio de venta $"
                  }), /*#__PURE__*/_jsx("input", {
                    style: s.inputNum,
                    type: "number",
                    defaultValue: p.precio,
                    id: `pr-${p.id}`
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("label", {
                    style: s.label,
                    children: "Costo de llenado $"
                  }), /*#__PURE__*/_jsx("input", {
                    style: s.inputNum,
                    type: "number",
                    defaultValue: p.costo,
                    id: `co-${p.id}`
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("label", {
                    style: s.label,
                    children: "Unidad (ej: 1.5L)"
                  }), /*#__PURE__*/_jsx("input", {
                    style: s.input,
                    defaultValue: p.unidad || "",
                    id: `un-${p.id}`,
                    placeholder: "opcional"
                  })]
                })]
              }), /*#__PURE__*/_jsx("button", {
                style: s.btnPrimary,
                onClick: () => {
                  const nm = document.getElementById(`nm-${p.id}`).value;
                  const pr = Number(document.getElementById(`pr-${p.id}`).value);
                  const co = Number(document.getElementById(`co-${p.id}`).value);
                  const un = document.getElementById(`un-${p.id}`).value;
                  setProductos(productos.map(x => x.id === p.id ? {
                    ...x,
                    nombre: nm,
                    precio: pr,
                    costo: co,
                    unidad: un
                  } : x));
                  setEditandoId(null);
                },
                children: "Guardar"
              })]
            })
          }, p.id);
        }), editandoId === "nuevo" ? /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 12px",
            borderLeft: "3px solid #4dd9a0"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "#4dd9a0"
              },
              children: "Nuevo artículo"
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                fontSize: 11,
                padding: "3px 10px"
              },
              onClick: () => setEditandoId(null),
              children: "Cancelar"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("label", {
                style: s.label,
                children: "Nombre"
              }), /*#__PURE__*/_jsx("input", {
                style: s.input,
                id: "nm-nuevo",
                placeholder: "Ej: Bidón 20L"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("label", {
                style: s.label,
                children: "Precio de venta $"
              }), /*#__PURE__*/_jsx("input", {
                style: s.inputNum,
                type: "number",
                id: "pr-nuevo",
                placeholder: "0"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("label", {
                style: s.label,
                children: "Costo de llenado $"
              }), /*#__PURE__*/_jsx("input", {
                style: s.inputNum,
                type: "number",
                id: "co-nuevo",
                placeholder: "0"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("label", {
                style: s.label,
                children: "Unidad"
              }), /*#__PURE__*/_jsx("input", {
                style: s.input,
                id: "un-nuevo",
                placeholder: "ej: 20L"
              })]
            })]
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              background: "#0F6E56"
            },
            onClick: () => {
              const nm = document.getElementById("nm-nuevo").value.trim();
              if (!nm) return;
              const pr = Number(document.getElementById("pr-nuevo").value) || 0;
              const co = Number(document.getElementById("co-nuevo").value) || 0;
              const un = document.getElementById("un-nuevo").value;
              setProductos([...productos, {
                id: Date.now(),
                nombre: nm,
                precio: pr,
                costo: co,
                unidad: un
              }]);
              setEditandoId(null);
            },
            children: "+ Agregar artículo"
          })]
        }) : /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            width: "100%",
            padding: "10px",
            fontSize: 13,
            marginBottom: 16,
            borderStyle: "dashed"
          },
          onClick: () => setEditandoId("nuevo"),
          children: "+ Agregar nuevo artículo"
        }), /*#__PURE__*/_jsx(CalculadoraCostoReal, {
          productos: productos,
          ventas: ventas
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          padding: "0 16px 16px"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 14px",
            background: "var(--color-background-info)",
            border: "0.5px solid var(--color-border-info)",
            padding: "10px 14px"
          },
          children: /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-text-info)"
            },
            children: "📦 Stock en depósito"
          })
        }), /*#__PURE__*/_jsx("p", {
          style: {
            fontSize: 13,
            color: "var(--color-text-secondary)",
            marginBottom: 16,
            lineHeight: 1.6
          },
          children: "Control de stock en los 3 lugares. Al iniciar reparto el camión se carga desde la sodería automáticamente."
        }), [["soderia", "🏭 Sodería"], ["casa", "🏠 Casa"], ["camion", "🚚 Camión"]].map(([lugar, titulo]) => /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 12px"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              marginBottom: 10
            },
            children: titulo
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
                  ...s.inputNum,
                  textAlign: "center"
                },
                type: "number",
                min: 0,
                value: stock?.[lugar]?.[k] ?? 0,
                onChange: e => {
                  const ns = JSON.parse(JSON.stringify(stock || {}));
                  if (!ns[lugar]) ns[lugar] = {
                    sifon: 0,
                    bidon10: 0,
                    bidon20: 0
                  };
                  ns[lugar][k] = Number(e.target.value) || 0;
                  setStock(ns);
                }
              })]
            }, k))
          })]
        }, lugar)), /*#__PURE__*/_jsx("button", {
          style: s.btnPrimary,
          onClick: () => {
            syncData({
              stock
            });
            alert("Stock guardado");
          },
          children: "Guardar stock"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "16px 0 14px",
            background: "var(--color-background-info)",
            border: "0.5px solid var(--color-border-info)",
            padding: "10px 14px"
          },
          children: /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-text-info)"
            },
            children: "🚚 Carga diaria del camión"
          })
        }), ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(dia => {
          const c = cargasDia?.[dia] || {
            soda: 0,
            b10: 0,
            b20: 0
          };
          const upd = (k, v) => {
            const nd = {
              ...(cargasDia || {}),
              [dia]: {
                ...c,
                [k]: Number(v) || 0
              }
            };
            setCargasDia(nd);
          };
          return /*#__PURE__*/_jsxs("div", {
            style: {
              ...s.card,
              margin: "0 0 10px"
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 10
              },
              children: dia
            }), /*#__PURE__*/_jsx("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8
              },
              children: [["soda", "🫧 Soda"], ["b10", "💧 Bidón 10L"], ["b20", "🫙 Bidón 20L"]].map(([k, lbl]) => /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("label", {
                  style: {
                    ...s.label,
                    textAlign: "center",
                    fontSize: 10
                  },
                  children: lbl
                }), /*#__PURE__*/_jsx("input", {
                  style: {
                    ...s.inputNum,
                    textAlign: "center"
                  },
                  type: "number",
                  min: 0,
                  value: c[k] ?? 0,
                  onChange: e => upd(k, e.target.value)
                })]
              }, k))
            })]
          }, dia);
        }), /*#__PURE__*/_jsx("button", {
          style: s.btnPrimary,
          onClick: () => {
            syncData({
              cargasDia
            });
            alert("✅ Cargas guardadas");
          },
          children: "Guardar cargas"
        })]
      })]
    }), tab === "datos" && /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "none",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          },
          onClick: () => setAbiertoNotif(!abiertoNotif),
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18
            },
            children: "🔔"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              flex: 1
            },
            children: "Notificaciones"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--color-background-primary)",
              color: "var(--color-text-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0
            },
            children: abiertoNotif ? "▲" : "▼"
          })]
        }), abiertoNotif && /*#__PURE__*/_jsx("div", {
          style: {
            marginTop: 10
          },
          children: /*#__PURE__*/_jsx(NotifConfig, {
            syncData: syncData
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "none",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          },
          onClick: () => setAbiertoHuella(!abiertoHuella),
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18
            },
            children: "🔒"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              flex: 1
            },
            children: "Acceso con huella"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--color-background-primary)",
              color: "var(--color-text-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0
            },
            children: abiertoHuella ? "▲" : "▼"
          })]
        }), abiertoHuella && /*#__PURE__*/_jsx("div", {
          style: {
            marginTop: 10
          },
          children: /*#__PURE__*/_jsx(SeguridadHuella, {})
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "none",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          },
          onClick: () => setAbiertoRespaldo(!abiertoRespaldo),
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18
            },
            children: "💾"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              flex: 1
            },
            children: "Respaldo"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--color-background-primary)",
              color: "var(--color-text-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0
            },
            children: abiertoRespaldo ? "▲" : "▼"
          })]
        }), abiertoRespaldo && /*#__PURE__*/_jsxs("div", {
          style: {
            marginTop: 10
          },
          children: [/*#__PURE__*/_jsx("p", {
            style: {
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              margin: "0 0 12px",
              lineHeight: 1.5
            },
            children: "Guardá todos los datos en un archivo. Descargalo seguido y guardalo en otro lado (mail, Drive). Si se pierde el teléfono, lo restaurás y recuperás todo."
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              width: "100%",
              marginBottom: 8
            },
            onClick: () => {
              if (typeof window._descargarRespaldo === "function") window._descargarRespaldo();else alert("No se pudo generar el respaldo. Recargá la app e intentá de nuevo.");
            },
            children: "💾 Descargar respaldo (.json)"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              width: "100%",
              marginBottom: 8
            },
            onClick: exportarVentasCSV,
            children: "📊 Exportar ventas (.csv, para Excel/contador)"
          }), /*#__PURE__*/_jsxs("label", {
            style: {
              ...s.btn,
              width: "100%",
              padding: "10px",
              display: "block",
              textAlign: "center",
              cursor: "pointer",
              boxSizing: "border-box",
              fontSize: 13,
              marginBottom: 10
            },
            children: ["♻️ Restaurar desde un respaldo", /*#__PURE__*/_jsx("input", {
              type: "file",
              accept: ".json,application/json",
              style: {
                display: "none"
              },
              onChange: e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (!window.confirm("⚠️ Restaurar va a REEMPLAZAR todos los datos actuales por los del archivo. ¿Seguro?")) {
                  e.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    const ok = window._restaurarRespaldo && window._restaurarRespaldo(data);
                    if (ok) alert("✅ Respaldo restaurado. Revisá que esté todo en orden.");
                  } catch (err) {
                    alert("El archivo no es un respaldo válido (.json). " + err.message);
                  }
                  e.target.value = "";
                };
                reader.readAsText(file);
              }
            })]
          }), (repartos || []).length > 1 && /*#__PURE__*/_jsxs("div", {
            style: {
              ...s.card,
              margin: 0,
              padding: "10px 14px"
            },
            children: [/*#__PURE__*/_jsx("label", {
              style: {
                ...s.label,
                marginBottom: 6
              },
              children: "📦 Exportar datos de:"
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 6
              },
              children: [/*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  padding: "6px 14px",
                  fontSize: 12,
                  background: filtroReparto === "todos" ? "#185FA5" : "var(--color-background-tertiary)",
                  color: filtroReparto === "todos" ? "#e2eaf4" : "var(--color-text-secondary)",
                  border: filtroReparto === "todos" ? "none" : "0.5px solid var(--color-border-secondary)"
                },
                onClick: () => setFiltroReparto("todos"),
                children: "Todos los repartidores"
              }), (repartos || []).map(r => /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  padding: "6px 14px",
                  fontSize: 12,
                  background: filtroReparto === r.id ? "#185FA5" : "var(--color-background-tertiary)",
                  color: filtroReparto === r.id ? "#e2eaf4" : "var(--color-text-secondary)",
                  border: filtroReparto === r.id ? "none" : "0.5px solid var(--color-border-secondary)"
                },
                onClick: () => setFiltroReparto(r.id),
                children: r.repartidorNombre || r.nombre
              }, r.id))]
            })]
          }), /*#__PURE__*/_jsx("button", {
            style: s.btnPrimary,
            onClick: () => exportarExcel(clientes, ventas, productos, planillas, repartos || [], filtroReparto),
            children: (() => {
              const n = filtroReparto === "todos" ? clientes.length : clientes.filter(c => c.repartoId === filtroReparto).length;
              const rep = filtroReparto === "todos" ? "todos" : (repartos || []).find(r => r.id === filtroReparto)?.repartidorNombre || "";
              return `📥 Exportar datos · ${n} clientes${rep !== "todos" ? ` · ${rep}` : ""}`;
            })()
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18
            },
            children: "📥"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-text-primary)"
            },
            children: "Importar clientes"
          })]
        }), !importando ? /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            width: "100%",
            padding: "11px",
            fontSize: 13
          },
          onClick: () => setImportando(true),
          children: "📤 Importar clientes desde Excel"
        }) : /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: 0
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 8
            },
            children: "Seleccioná el archivo Excel con los clientes:"
          }), repartos && repartos.length > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              marginBottom: 10
            },
            children: [/*#__PURE__*/_jsx("label", {
              style: {
                ...s.label,
                fontWeight: 500
              },
              children: "Asignar los clientes a:"
            }), /*#__PURE__*/_jsxs("select", {
              style: {
                ...s.input
              },
              value: importReparto,
              onChange: e => setImportReparto(e.target.value ? Number(e.target.value) || e.target.value : ""),
              children: [/*#__PURE__*/_jsx("option", {
                value: "",
                children: "— Sin asignar —"
              }), repartos.map(r => /*#__PURE__*/_jsxs("option", {
                value: r.id,
                children: [r.numero, ". ", r.repartidorNombre]
              }, r.id))]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)",
                marginTop: 4
              },
              children: "Los clientes importados quedarán asignados a ese reparto."
            })]
          }), /*#__PURE__*/_jsx("input", {
            type: "file",
            accept: ".xlsx",
            style: {
              ...s.input,
              marginBottom: 8,
              padding: "6px"
            },
            onChange: e => {
              if (e.target.files[0]) {
                importarClientesPlanilla(e.target.files[0], clientes, nuevos => {
                  setClientes(nuevos);
                  syncData({
                    clientes: nuevos,
                    negocioId
                  });
                }, importReparto || null);
              }
              setImportando(false);
            }
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              width: "100%"
            },
            onClick: () => setImportando(false),
            children: "Cancelar"
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "none",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          },
          onClick: () => setAbiertoMant(!abiertoMant),
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18
            },
            children: "🔧"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              flex: 1
            },
            children: "Mantenimiento de datos"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--color-background-primary)",
              color: "var(--color-text-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0
            },
            children: abiertoMant ? "▲" : "▼"
          })]
        }), abiertoMant && /*#__PURE__*/_jsxs("div", {
          style: {
            marginTop: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              width: "100%",
              padding: "10px",
              fontSize: 13,
              marginBottom: 8
            },
            onClick: () => {
              if (window.confirm("¿Subir todos los datos a la nube?")) {
                cloudSave({
                  clientes,
                  ventas,
                  planillas,
                  stock,
                  productos,
                  noVisitas: noVisitas || [],
                  prospectos: prospectos || []
                }, uid, negocioId).then(() => alert("✅ Datos sincronizados.")).catch(() => alert("❌ Error. Verificá tu conexión."));
              }
            },
            children: "🔄 Forzar sincronización"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              width: "100%",
              padding: "11px",
              background: "#185FA5",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            },
            onClick: async () => {
              const lic = JSON.parse(localStorage.getItem("rm_licencia") || "{}");
              if (!lic.email) {
                alert("No hay email configurado en la licencia.");
                return;
              }
              const total = ventas.reduce((a, v) => a + (v.neto || 0), 0);
              const hoy = new Date().toLocaleDateString("es-AR");
              if (window.enviarEmailBrevoRM) {
                await window.enviarEmailBrevoRM({
                  to: lic.email,
                  toName: lic.nombre || "",
                  subject: `📊 Informe de repartos · ${hoy}`,
                  htmlContent: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
                      <h2 style="color:#185FA5">📊 Informe de repartos</h2>
                      <p style="color:#666">${hoy}</p>
                      <div style="background:#f0f7ff;border-radius:10px;padding:16px;margin:16px 0">
                        <div style="font-size:28px;font-weight:700;color:#185FA5">$${total.toLocaleString("es-AR")}</div>
                        <div style="color:#666">Total acumulado · ${ventas.length} ventas · ${clientes.length} clientes</div>
                      </div>
                      <p style="color:#999;font-size:11px">Sistema de Reparto · Emma Soluciones Digitales</p>
                    </div>`
                });
                alert("✅ Informe enviado a " + lic.email);
              } else {
                alert("❌ Servicio de email no disponible.");
              }
            },
            children: "📊 Enviar informe por email"
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: 0
        },
        children: (() => {
          let total = 0;
          try {
            for (let k in localStorage) {
              if (localStorage.hasOwnProperty(k)) {
                total += (localStorage[k] || '').length * 2;
              }
            }
          } catch (e) {}
          const kb = Math.round(total / 1024);
          const pct = Math.min(100, Math.round(kb / 5120 * 100));
          const color = pct > 80 ? "#e05c5c" : pct > 50 ? "#f5b942" : "#4dd9a0";
          return /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6
              },
              children: [/*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)"
                },
                children: "💾 Espacio usado"
              }), /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 12,
                  color: "var(--color-text-tertiary)"
                },
                children: [kb, " KB · ", pct, "%"]
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                height: 8,
                background: "var(--color-background-tertiary)",
                borderRadius: 4,
                overflow: "hidden"
              },
              children: /*#__PURE__*/_jsx("div", {
                style: {
                  height: "100%",
                  width: pct + "%",
                  background: color,
                  borderRadius: 4
                }
              })
            }), pct > 70 && /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                color: "#e05c5c",
                marginTop: 8
              },
              children: "⚠️ Espacio alto. Eliminá fotos si la app falla."
            })]
          });
        })()
      }), /*#__PURE__*/_jsxs("details", {
        style: {
          ...s.card,
          margin: 0
        },
        children: [/*#__PURE__*/_jsx("summary", {
          style: {
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            cursor: "pointer"
          },
          children: "🔗 Vincular con Emma Control"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            marginTop: 10
          },
          children: /*#__PURE__*/_jsx(VincularEmmaControl, {})
        })]
      }), /*#__PURE__*/_jsx("a", {
        href: "https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto",
        target: "_blank",
        rel: "noopener",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px",
          borderRadius: 10,
          background: "#0a2e1f",
          border: "1px solid #4dd9a0",
          color: "#4dd9a0",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none"
        },
        children: "💬 Soporte por WhatsApp"
      }), /*#__PURE__*/_jsxs("details", {
        style: {
          ...s.card,
          margin: 0,
          border: "1px solid rgba(220,38,38,0.3)"
        },
        children: [/*#__PURE__*/_jsx("summary", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-danger)",
            cursor: "pointer"
          },
          children: "⚠️ Zona peligrosa"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            marginTop: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "1px solid var(--color-text-danger)",
              background: "rgba(220,38,38,0.1)",
              color: "var(--color-text-danger)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            },
            onClick: async () => {
              if (!window.confirm("⚠️ ¿Borrar TODOS los clientes, ventas y movimientos?\n\nLos productos, stock y repartos se conservan.")) return;
              ["rm_clientes_v3", "rm_ventas_v3", "rm_planillas_v1", "rm_novisitas_v1", "rm_prospectos_v1", "rm_recordatorios_v1", "rm_lc_hist_precios", "rm_lc_ultimo_backup"].forEach(k => localStorage.removeItem(k));
              Object.keys(localStorage).filter(k => k.startsWith("rm_lc_backup_")).forEach(k => localStorage.removeItem(k));
              if (window.db && negocioId) {
                try {
                  const col = window.db.collection("negocios").doc(negocioId).collection("datos");
                  const snap = await col.get();
                  const ops = [];
                  snap.forEach(doc => {
                    const id = doc.id;
                    if (id.startsWith("cl_") || id.startsWith("vt_") || id === "clientes_meta" || id === "ventas_meta") {
                      ops.push(doc.ref.delete());
                    } else if (id === "config") {
                      ops.push(doc.ref.update({
                        planillas: {},
                        noVisitas: [],
                        recordatorios: [],
                        prospectos: [],
                        histPrecios: [],
                        mantVeh: []
                      }));
                    }
                  });
                  await Promise.all(ops);
                } catch (e) {
                  console.error(e);
                }
              }
              window.location.reload();
            },
            children: "🗑️ Borrar clientes, ventas y movimientos"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 6,
              textAlign: "center"
            },
            children: "Los productos, stock y repartos se conservan"
          })]
        })]
      })]
    }), tab === "vehiculo" && /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text-primary)"
            },
            children: "🔧 Mantenimiento del vehículo"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginTop: 2
            },
            children: "Historial de service y reparaciones"
          })]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btnPrimary,
            padding: "8px 14px",
            fontSize: 13
          },
          onClick: () => setMostrarNuevoMant(true),
          children: "+ Registrar"
        })]
      }), mantVeh.length === 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-text-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 40,
            marginBottom: 10
          },
          children: "🚐"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 14
          },
          children: "Sin registros aún"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            marginTop: 6
          },
          children: "Registrá cambios de aceite, service y reparaciones"
        })]
      }), [...mantVeh].reverse().map((m, i) => /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          borderLeft: `3px solid ${m.tipo === "aceite" ? "#f5b942" : m.tipo === "preventivo" ? "#4dd9a0" : m.tipo === "embrague" ? "#e05c5c" : m.tipo === "reparacion" ? "#5daaff" : m.tipo === "gnc" ? "#22c55e" : m.tipo === "vtv" ? "#3b82f6" : "#a0aec0"}`
        },
        children: /*#__PURE__*/_jsxs("div", {
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
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-primary)"
              },
              children: m.tipo === "aceite" ? "🛢 Cambio de aceite" : m.tipo === "preventivo" ? "🔩 Mantenimiento preventivo" : m.tipo === "embrague" ? "⚙️ Cambio de embrague" : m.tipo === "reparacion" ? "🛠 Reparación" : m.tipo === "gnc" ? "🟢 Oblea GNC" : m.tipo === "vtv" ? "🔵 VTV" : m.tipo === "otro" ? "📋 " + (m.otroDetalle || "Otro") : "📋 " + m.tipo
            }), m.descripcion && /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)",
                marginTop: 4
              },
              children: m.descripcion
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 12,
                marginTop: 6,
                flexWrap: "wrap"
              },
              children: [m.km && /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 12,
                  color: "var(--color-text-tertiary)"
                },
                children: ["📊 ", Number(m.km).toLocaleString("es-AR"), " km"]
              }), m.costo && /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 12,
                  color: "var(--color-text-tertiary)"
                },
                children: ["💰 $", Number(m.costo).toLocaleString("es-AR")]
              })]
            }), m.proximo && /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "#f5b942",
                marginTop: 4,
                borderTop: "0.5px solid var(--color-border-tertiary)",
                paddingTop: 4
              },
              children: ["⏰ Próximo: ", m.proximo]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              marginLeft: 10,
              flexShrink: 0
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: m.fecha
            }), /*#__PURE__*/_jsx("button", {
              style: {
                background: "#3a2020",
                color: "#e05c5c",
                border: "none",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                cursor: "pointer"
              },
              onClick: () => saveMantVeh(mantVeh.filter((_, j) => mantVeh.length - 1 - j !== i)),
              children: "Borrar"
            })]
          })]
        })
      }, i)), mostrarNuevoMant && /*#__PURE__*/_jsx(VehiculoMantModal, {
        onGuardar: reg => {
          saveMantVeh([...mantVeh, reg]);
          setMostrarNuevoMant(false);
        },
        onCerrar: () => setMostrarNuevoMant(false)
      })]
    }), tab === "apariencia" && /*#__PURE__*/_jsx("div", {
      style: {
        padding: 16
      },
      children: /*#__PURE__*/_jsx(ConfigApariencia, {})
    })]
  });
}