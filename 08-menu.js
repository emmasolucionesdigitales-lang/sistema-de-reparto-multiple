import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ════════════════════════════════════════════════════════════════════
// ◆  08-menu.js — MenuRepartos · MenuDias · DiaPrincipal · PlanillaDelDia · InicioReparto
// ════════════════════════════════════════════════════════════════════

function MenuRepartos({
  negocioId,
  repartos,
  clientes,
  ventas,
  recordatorios,
  onSeleccionar,
  onConfig,
  onResumen,
  onStock,
  onAgenda,
  onVolver,
  saveRepartos,
  onOperarReparto,
  onTodosClientes,
  onImportarClientes,
  onMapaClientes,
  tabInicial,
  onTabChange,
  scaleIdx,
  onToggleScale,
  scaleLabel
}) {
  const [tab, setTab] = React.useState(tabInicial || "repartos");
  const cambiarTab = t => {
    setTab(t);
    if (onTabChange) onTabChange(t);
  };
  const [modoNuevo, setModoNuevo] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState(null);
  const [form, setForm] = React.useState({
    numero: "",
    repartidorNombre: "",
    codigo: ""
  });
  const [qrReparto, setQrReparto] = React.useState(null); // reparto cuyo QR de invitación se está mostrando

  const genCodigo = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir con 1/0
    let c = "";
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  };
  const guardarReparto = () => {
    if (!form.numero || !form.repartidorNombre) {
      alert("Completá número y nombre");
      return;
    }
    const codUpper = (form.codigo || genCodigo()).toUpperCase();
    if (editandoId) {
      saveRepartos(repartos.map(r => r.id === editandoId ? {
        ...r,
        ...form,
        codigo: codUpper
      } : r));
    } else {
      const nuevo = {
        id: Date.now(),
        numero: Number(form.numero),
        repartidorNombre: form.repartidorNombre.trim(),
        codigo: codUpper,
        nombre: `Reparto ${form.numero}`
      };
      saveRepartos([...repartos, nuevo].sort((a, b) => a.numero - b.numero));
      // La invitación en Firestore la crea sincronizarInvitaciones, que ya se
      // dispara solo desde saveRepartos (16-extras.js) — no hace falta nada más acá.
      // Mostrar el QR de inmediato para que el repartidor lo escanee ahí mismo
      setQrReparto(nuevo);
    }
    setModoNuevo(false);
    setEditandoId(null);
    setForm({
      numero: "",
      repartidorNombre: "",
      codigo: ""
    });
  };
  const eliminarReparto = id => {
    if (!window.confirm("¿Eliminar este reparto?")) return;
    saveRepartos(repartos.filter(r => r.id !== id));
  };
  const clientesPorReparto = repId => clientes.filter(c => c.repartoId === repId);
  const deudaPorReparto = repId => clientes.filter(c => c.repartoId === repId && c.saldo < 0).reduce((a, c) => a + Math.abs(c.saldo), 0);
  const deudoresCount = repId => clientes.filter(c => c.repartoId === repId && c.saldo < 0).length;
  const visitasPorReparto = repId => {
    const ids = new Set(clientesPorReparto(repId).map(c => c.id));
    return (recordatorios || []).filter(r => !r.confirmado && ids.has(r.clienteId));
  };

  // ── Resumen general: ventas de TODOS los repartos, con el detalle de cada uno ──
  const [periodoResGen, setPeriodoResGen] = React.useState("hoy"); // "hoy" | "mes" | "todo"

  const ventasEnPeriodoResGen = React.useMemo(() => {
    if (periodoResGen === "todo") return ventas || [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return (ventas || []).filter(v => {
      if (!v.fecha) return false;
      const f = new Date(v.fecha);
      if (periodoResGen === "hoy") return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth() && f.getDate() === hoy.getDate();
      if (periodoResGen === "mes") return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
      return true;
    });
  }, [ventas, periodoResGen]);
  const resumenPorReparto = React.useMemo(() => {
    const clientesPorId = {};
    (clientes || []).forEach(c => {
      clientesPorId[c.id] = c;
    });
    return (repartos || []).map(rep => {
      const misClientes = (clientes || []).filter(c => c.repartoId === rep.id);
      const idsClientes = new Set(misClientes.map(c => c.id));
      const misVentas = ventasEnPeriodoResGen.filter(v => idsClientes.has(v.clienteId));
      let vendido = 0,
        efectivo = 0,
        transferencia = 0,
        fiado = 0,
        ganancia = 0;
      const envases = {}; // prod -> {prestados, devueltos}

      misVentas.forEach(v => {
        const neto = v.neto || 0;
        vendido += neto;
        ganancia += v.ganancia || 0;
        if (v.pago === "contado") efectivo += neto;else if (v.pago === "transferencia") transferencia += neto;else if (v.pago === "fiado") fiado += neto;else if (v.pago === "mixto_ef") {
          efectivo += neto - (Number(v.montoTrans) || 0);
          transferencia += Number(v.montoTrans) || 0;
        } else if (v.pago === "mixto_tr") {
          transferencia += neto - (Number(v.montoTrans) || 0);
          efectivo += Number(v.montoTrans) || 0;
        }
        (v.envPrest || []).forEach(e => {
          if (!e.prod) return;
          if (!envases[e.prod]) envases[e.prod] = {
            prestados: 0,
            devueltos: 0
          };
          envases[e.prod].prestados += Number(e.cant) || 0;
        });
        (v.envDev || []).forEach(e => {
          if (!e.prod) return;
          if (!envases[e.prod]) envases[e.prod] = {
            prestados: 0,
            devueltos: 0
          };
          envases[e.prod].devueltos += Number(e.cant) || 0;
        });
      });
      const envasesPendientes = Object.entries(envases).map(([prod, v]) => ({
        prod,
        pendiente: v.prestados - v.devueltos
      })).filter(e => e.pendiente > 0);
      const deudaTotal = misClientes.filter(c => c.saldo < 0).reduce((a, c) => a + Math.abs(c.saldo), 0);
      return {
        reparto: rep,
        vendido,
        efectivo,
        transferencia,
        fiado: fiado + deudaTotal,
        ganancia,
        envasesPendientes,
        cantVentas: misVentas.length
      };
    });
  }, [repartos, clientes, ventasEnPeriodoResGen]);
  const totalesGlobalesResGen = React.useMemo(() => {
    return resumenPorReparto.reduce((a, r) => ({
      vendido: a.vendido + r.vendido,
      efectivo: a.efectivo + r.efectivo,
      transferencia: a.transferencia + r.transferencia,
      fiado: a.fiado + r.fiado,
      ganancia: a.ganancia + r.ganancia
    }), {
      vendido: 0,
      efectivo: 0,
      transferencia: 0,
      fiado: 0,
      ganancia: 0
    });
  }, [resumenPorReparto]);
  const fmtResGen = n => "$" + Math.round(n || 0).toLocaleString("es-AR");
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Panel del dueño",
      onVolver: onVolver
    }), /*#__PURE__*/_jsx("div", {
      style: {
        display: "flex",
        borderBottom: "2px solid var(--color-border-secondary)"
      },
      children: [["repartos", "🚚  Repartos"], ["resumenGeneral", "📊  Resumen"], ["herramientas", "🛠  Herramientas"]].map(([id, lbl]) => /*#__PURE__*/_jsx("button", {
        onClick: () => cambiarTab(id),
        style: {
          flex: 1,
          padding: "11px 4px",
          fontSize: 12,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: tab === id ? "#5daaff" : "var(--color-text-tertiary)",
          borderBottom: tab === id ? "3px solid #5daaff" : "3px solid transparent",
          marginBottom: -2
        },
        children: lbl
      }, id))
    }), tab === "repartos" && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          padding: "10px 14px 6px",
          display: "flex",
          gap: 8,
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            flex: 1
          },
          children: ["📋 ", repartos.length, " reparto", repartos.length !== 1 ? "s" : ""]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "7px 14px",
            fontSize: 12,
            background: "#185FA5",
            color: "#e2eaf4",
            border: "none"
          },
          onClick: () => {
            setForm({
              numero: String(repartos.length + 1),
              repartidorNombre: "",
              codigo: genCodigo()
            });
            setModoNuevo(true);
            setEditandoId(null);
          },
          children: "+ Nuevo"
        })]
      }), (modoNuevo || editandoId) && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 14px 10px",
          borderLeft: "3px solid #185FA5"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: 12
          },
          children: editandoId ? "Editar reparto" : "Nuevo reparto"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 8,
            marginBottom: 8
          },
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              style: s.label,
              children: "Número"
            }), /*#__PURE__*/_jsx("input", {
              style: s.input,
              type: "number",
              min: 1,
              placeholder: "1",
              value: form.numero,
              onChange: e => setForm(f => ({
                ...f,
                numero: e.target.value
              }))
            })]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              style: s.label,
              children: "Nombre del repartidor"
            }), /*#__PURE__*/_jsx("input", {
              style: s.input,
              placeholder: "Ej: Juan Pérez",
              value: form.repartidorNombre,
              onChange: e => setForm(f => ({
                ...f,
                repartidorNombre: e.target.value
              }))
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Código del repartidor (6 letras)"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 8
            },
            children: [/*#__PURE__*/_jsx("input", {
              style: {
                ...s.input,
                fontFamily: "monospace",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.15em",
                flex: 1,
                textTransform: "uppercase"
              },
              placeholder: "XXXXXX",
              maxLength: 6,
              value: form.codigo,
              onChange: e => setForm(f => ({
                ...f,
                codigo: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)
              }))
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "8px 12px",
                fontSize: 12,
                whiteSpace: "nowrap"
              },
              onClick: () => setForm(f => ({
                ...f,
                codigo: genCodigo()
              })),
              children: "🎲 Generar"
            })]
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 3
            },
            children: "El repartidor usa este código para entrar"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              flex: 1
            },
            onClick: () => {
              setModoNuevo(false);
              setEditandoId(null);
            },
            children: "Cancelar"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              flex: 2,
              padding: "10px"
            },
            onClick: guardarReparto,
            children: editandoId ? "Guardar cambios" : "Crear reparto"
          })]
        })]
      }), repartos.length === 0 && !modoNuevo && /*#__PURE__*/_jsxs("div", {
        style: {
          textAlign: "center",
          padding: "50px 20px",
          color: "var(--color-text-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 48,
            marginBottom: 12
          },
          children: "🚚"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 16,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            marginBottom: 6
          },
          children: "Sin repartos aún"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13
          },
          children: "Tocá \"+ Nuevo reparto\" para empezar"
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: {
          padding: "0 14px"
        },
        children: [...repartos].sort((a, b) => a.numero - b.numero).map(rep => {
          const nCli = clientesPorReparto(rep.id).length;
          const deuda = deudaPorReparto(rep.id);
          const nDeudores = deudoresCount(rep.id);
          return /*#__PURE__*/_jsxs("div", {
            style: {
              marginBottom: 10
            },
            children: [editandoId === rep.id ? null : /*#__PURE__*/_jsxs("button", {
              style: {
                ...s.card,
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px",
                margin: 0,
                background: "var(--color-background-secondary)"
              },
              onClick: () => onSeleccionar(rep),
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#185FA5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0
                },
                children: rep.numero
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  flex: 1,
                  minWidth: 0
                },
                children: [/*#__PURE__*/_jsx("div", {
                  style: {
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 3
                  },
                  children: rep.repartidorNombre
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap"
                  },
                  children: [/*#__PURE__*/_jsxs("span", {
                    style: {
                      fontSize: 11,
                      color: "var(--color-text-secondary)"
                    },
                    children: [nCli, " cliente", nCli !== 1 ? "s" : ""]
                  }), nDeudores > 0 && /*#__PURE__*/_jsxs("span", {
                    style: s.badge("danger"),
                    children: [nDeudores, " deben ", fmt(deuda)]
                  }), nDeudores === 0 && nCli > 0 && /*#__PURE__*/_jsx("span", {
                    style: s.badge("success"),
                    children: "✓ Sin deudas"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    marginTop: 3,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em"
                  },
                  children: ["Código: ", rep.codigo]
                })]
              }), (() => {
                const pendTrans = (ventas || []).filter(v => (v.pago === "transferencia" || v.pago === "mixto") && !v.transConfirmada && clientesPorReparto(rep.id).some(c => c.id === v.clienteId));
                const pendVisitas = visitasPorReparto(rep.id);
                if (!pendTrans.length && !pendVisitas.length) return null;
                return /*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                    marginRight: 4
                  },
                  children: [pendVisitas.length > 0 && /*#__PURE__*/_jsxs("div", {
                    style: {
                      background: "var(--color-background-info)",
                      border: "0.5px solid #5daaff",
                      borderRadius: 8,
                      padding: "4px 8px",
                      textAlign: "center"
                    },
                    children: [/*#__PURE__*/_jsxs("div", {
                      style: {
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#5daaff"
                      },
                      children: ["🔔 ", pendVisitas.length]
                    }), /*#__PURE__*/_jsxs("div", {
                      style: {
                        fontSize: 9,
                        color: "#5daaff",
                        lineHeight: 1.2
                      },
                      children: ["visita", pendVisitas.length > 1 ? "s" : "", " agend."]
                    })]
                  }), pendTrans.length > 0 && /*#__PURE__*/_jsxs("div", {
                    style: {
                      background: "var(--color-background-warning)",
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: 8,
                      padding: "4px 8px",
                      textAlign: "center"
                    },
                    children: [/*#__PURE__*/_jsx("div", {
                      style: {
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--color-text-warning)"
                      },
                      children: pendTrans.length
                    }), /*#__PURE__*/_jsxs("div", {
                      style: {
                        fontSize: 9,
                        color: "var(--color-text-warning)",
                        lineHeight: 1.2
                      },
                      children: ["transfer", pendTrans.length > 1 ? "s" : "", " pend."]
                    })]
                  })]
                });
              })(), /*#__PURE__*/_jsx("span", {
                style: {
                  color: "var(--color-text-tertiary)",
                  fontSize: 20
                },
                children: "→"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 6,
                marginTop: 4,
                justifyContent: "flex-end",
                flexWrap: "wrap"
              },
              children: [/*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px",
                  background: "rgba(24,95,165,0.2)",
                  color: "#5daaff",
                  border: "1px solid rgba(93,170,255,0.4)"
                },
                onClick: () => onOperarReparto && onOperarReparto(rep),
                children: "🚐 Operar"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px"
                },
                onClick: e => {
                  e.stopPropagation();
                  setQrReparto(rep);
                },
                children: "📱 QR"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px"
                },
                onClick: e => {
                  e.stopPropagation();
                  setForm({
                    numero: String(rep.numero),
                    repartidorNombre: rep.repartidorNombre,
                    codigo: rep.codigo
                  });
                  setEditandoId(rep.id);
                  setModoNuevo(false);
                },
                children: "✏️ Editar"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px",
                  background: "rgba(245,185,66,0.15)",
                  color: "#f5b942",
                  border: "1px solid rgba(245,185,66,0.4)"
                },
                onClick: async () => {
                  if (!window.confirm(`¿Resetear PIN de "${rep.repartidorNombre}"?\n\nPodrá ingresar de nuevo con su PIN: ${rep.codigo}`)) return;
                  try {
                    // OJO: "deviceId" y "authUid" son DOS cosas separadas.
                    // Antes este botón sólo limpiaba "deviceId" — la app
                    // seguía viendo el código como "ya reclamado" por el
                    // repartidor anterior (authUid) y le negaba la entrada
                    // al nuevo. Hay que limpiar los dos.
                    await window.db.collection("repartidores").doc(rep.codigo).set({
                      codigo: rep.codigo,
                      negocioId: negocioId,
                      nombre: rep.repartidorNombre,
                      sectores: rep.sectores || [],
                      activo: true,
                      deviceId: "",
                      authUid: firebase.firestore.FieldValue.delete(),
                      activado: false,
                      resetadoEn: new Date().toISOString()
                    }, {
                      merge: true
                    });
                    alert(`✅ PIN reseteado. "${rep.repartidorNombre}" puede ingresar de nuevo con PIN: ${rep.codigo}`);
                  } catch (e) {
                    alert("Error al resetear: " + e.message);
                  }
                },
                children: "🔄 Reset"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px",
                  background: "rgba(220,38,38,0.15)",
                  color: "var(--color-text-danger)"
                },
                onClick: () => eliminarReparto(rep.id),
                children: "🗑 Eliminar"
              })]
            })]
          }, rep.id);
        })
      })]
    }), tab === "resumenGeneral" && /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "10px 14px 32px"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          display: "flex",
          gap: 6,
          marginBottom: 14
        },
        children: [["hoy", "Hoy"], ["mes", "Este mes"], ["todo", "Histórico"]].map(([id, lbl]) => /*#__PURE__*/_jsx("button", {
          onClick: () => setPeriodoResGen(id),
          style: {
            flex: 1,
            padding: "8px 4px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            cursor: "pointer",
            border: periodoResGen === id ? "2px solid #5daaff" : "2px solid var(--color-border-secondary)",
            background: periodoResGen === id ? "rgba(93,170,255,0.12)" : "transparent",
            color: periodoResGen === id ? "#5daaff" : "var(--color-text-secondary)"
          },
          children: lbl
        }, id))
      }), repartos.length === 0 ? /*#__PURE__*/_jsx("div", {
        style: {
          textAlign: "center",
          padding: "30px 10px",
          color: "var(--color-text-tertiary)",
          fontSize: 13
        },
        children: "Todavía no hay repartos creados."
      }) : /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            background: "var(--color-background-secondary)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1.3fr 0.9fr 0.9fr 0.8fr",
              padding: "9px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--color-text-tertiary)",
              borderBottom: "1px solid var(--color-border-secondary)"
            },
            children: [/*#__PURE__*/_jsx("div", {
              children: "Reparto"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right"
              },
              children: "Vendido"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right"
              },
              children: "Fiado"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right"
              },
              children: "Envases"
            })]
          }), resumenPorReparto.map(r => /*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1.3fr 0.9fr 0.9fr 0.8fr",
              padding: "10px 10px",
              fontSize: 12,
              borderBottom: "1px solid var(--color-border-secondary)",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                fontWeight: 600
              },
              children: [r.reparto.nombre || `Reparto ${r.reparto.numero}`, /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 10,
                  fontWeight: 400,
                  color: "var(--color-text-tertiary)"
                },
                children: r.reparto.repartidorNombre
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                color: "#5daaff"
              },
              children: fmtResGen(r.vendido)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                color: r.fiado > 0 ? "#f07070" : "var(--color-text-tertiary)"
              },
              children: fmtResGen(r.fiado)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                color: r.envasesPendientes.length > 0 ? "#f5b942" : "var(--color-text-tertiary)"
              },
              children: r.envasesPendientes.reduce((a, e) => a + e.pendiente, 0) || "—"
            })]
          }, r.reparto.id)), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1.3fr 0.9fr 0.9fr 0.8fr",
              padding: "11px 10px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(93,170,255,0.08)"
            },
            children: [/*#__PURE__*/_jsx("div", {
              children: "Total global"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                color: "#5daaff"
              },
              children: fmtResGen(totalesGlobalesResGen.vendido)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                color: "#f07070"
              },
              children: fmtResGen(totalesGlobalesResGen.fiado)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right"
              },
              children: "—"
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginBottom: 8,
            fontWeight: 600
          },
          children: "DETALLE POR REPARTIDOR"
        }), resumenPorReparto.map(r => /*#__PURE__*/_jsxs("div", {
          style: {
            background: "var(--color-background-secondary)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8
            },
            children: [r.reparto.nombre || `Reparto ${r.reparto.numero}`, " · ", /*#__PURE__*/_jsx("span", {
              style: {
                fontWeight: 400,
                color: "var(--color-text-tertiary)"
              },
              children: r.reparto.repartidorNombre
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: r.envasesPendientes.length > 0 ? 10 : 0
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)"
                },
                children: "Efectivo"
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4dd9a0"
                },
                children: fmtResGen(r.efectivo)
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)"
                },
                children: "Transfer."
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#5daaff"
                },
                children: fmtResGen(r.transferencia)
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)"
                },
                children: "Ganancia"
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#f5b942"
                },
                children: fmtResGen(r.ganancia)
              })]
            })]
          }), r.envasesPendientes.length > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--color-border-secondary)"
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                marginBottom: 4
              },
              children: "Envases prestados sin devolver"
            }), r.envasesPendientes.map(e => /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "#f07070"
              },
              children: [e.prod, ": ", e.pendiente]
            }, e.prod))]
          })]
        }, r.reparto.id))]
      })]
    }), tab === "herramientas" && /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "10px 14px 32px"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginBottom: 10,
          marginTop: 2
        },
        children: "Herramientas del negocio"
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10
        },
        children: [{
          ico: "📊",
          lbl: "Resumen",
          sub: "Ventas del período",
          fn: onResumen,
          color: "#185FA5"
        }, {
          ico: "👥",
          lbl: "Todos los clientes",
          sub: "Clientes, agenda y mapa",
          fn: onTodosClientes,
          color: "#0e7c6b"
        }, {
          ico: "📦",
          lbl: "Stock",
          sub: "Sodería, depósito, carga",
          fn: onStock,
          color: "#065f46"
        }, {
          ico: "⚙️",
          lbl: "Configuración",
          sub: "Productos, precios, datos",
          fn: () => onConfig && onConfig("datos"),
          color: "#555"
        }].map(({
          ico,
          lbl,
          sub,
          fn,
          color
        }) => /*#__PURE__*/_jsxs("button", {
          onClick: fn,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 12px",
            borderRadius: 12,
            cursor: "pointer",
            border: "none",
            textAlign: "left",
            background: "var(--color-background-secondary)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              width: 40,
              height: 40,
              borderRadius: 10,
              background: color + "22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0
            },
            children: ico
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              minWidth: 0
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                lineHeight: 1.2
              },
              children: lbl
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                marginTop: 2
              },
              children: sub
            })]
          })]
        }, lbl))
      }), /*#__PURE__*/_jsx("div", {
        style: {
          marginTop: 16,
          textAlign: "center"
        },
        children: /*#__PURE__*/_jsx("a", {
          href: "https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto",
          target: "_blank",
          rel: "noopener",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 10,
            background: "#0a2e1f",
            border: "1px solid #4dd9a0",
            color: "#4dd9a0",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none"
          },
          children: "💬 Soporte por WhatsApp"
        })
      })]
    }), qrReparto && (() => {
      const link = generarLinkInvitacionRepartidor(qrReparto.codigo);
      const mensajeWsp = `Hola ${qrReparto.repartidorNombre}! Para entrar a la app de reparto, escaneá este link desde tu celular: ${link}\n\nO ingresá manualmente el código: ${qrReparto.codigo}`;
      return /*#__PURE__*/_jsx("div", {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        },
        onClick: () => setQrReparto(null),
        children: /*#__PURE__*/_jsxs("div", {
          style: {
            background: "var(--color-background-secondary)",
            borderRadius: 16,
            padding: 24,
            maxWidth: 340,
            width: "100%",
            textAlign: "center"
          },
          onClick: e => e.stopPropagation(),
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: 2
            },
            children: qrReparto.repartidorNombre
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 16
            },
            children: "Escaneá este código con la cámara del celular del repartidor"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              display: "inline-block"
            },
            children: /*#__PURE__*/_jsx("img", {
              src: urlImagenQR(link, 220),
              alt: "QR de invitación",
              width: 220,
              height: 220,
              style: {
                display: "block"
              }
            })
          }), /*#__PURE__*/_jsx("div", {
            style: {
              marginTop: 14,
              fontSize: 11,
              color: "var(--color-text-tertiary)"
            },
            children: "También puede ingresar el código a mano:"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#5daaff",
              marginTop: 4
            },
            children: qrReparto.codigo
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 8,
              marginTop: 18
            },
            children: [/*#__PURE__*/_jsx("a", {
              href: `https://wa.me/?text=${encodeURIComponent(mensajeWsp)}`,
              target: "_blank",
              rel: "noopener",
              style: {
                flex: 1,
                textDecoration: "none",
                padding: "10px",
                borderRadius: 10,
                background: "#0a2e1f",
                border: "1px solid #4dd9a0",
                color: "#4dd9a0",
                fontSize: 13,
                fontWeight: 600
              },
              children: "💬 Enviar por WhatsApp"
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "10px 16px"
              },
              onClick: () => setQrReparto(null),
              children: "Cerrar"
            })]
          })]
        })
      });
    })()]
  });
}
function MenuDias({
  dias,
  reparto,
  onDia,
  onResumen,
  onConfig,
  onGestionClientes,
  onPromocion,
  onStock,
  onAgenda,
  onVolver,
  scaleIdx,
  onToggleScale,
  scaleLabel,
  transferenciasPendientes,
  recordatoriosActivos,
  onConfirmarRecordatorio,
  onVerConfirmaciones,
  clientes,
  ventas,
  stock,
  zonasReparto,
  onSetZona,
  onDiaHoy,
  onDiaResumen,
  noVisitas,
  onFiados,
  prospectos
}) {
  const [editandoZona, setEditandoZona] = React.useState(null);
  const hoyDiaNombre = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][new Date().getDay()];
  const hoyFechaKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const hoyLabel = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short"
  });
  const clientesHoy = (clientes || []).filter(c => c.dia === hoyDiaNombre);
  const ventasHoyIds = new Set((ventas || []).filter(v => v.fechaKey === hoyFechaKey).map(v => v.clienteId));
  const noVisitasHoyIds = new Set((noVisitas || []).filter(v => v.fecha === hoyFechaKey).map(v => v.clienteId));
  const visitadosHoy = clientesHoy.filter(c => ventasHoyIds.has(c.id) || noVisitasHoyIds.has(c.id));
  const diaCompleto = clientesHoy.length > 0 && visitadosHoy.length >= clientesHoy.length;
  // Estado del recuadro de HOY según la hora del reloj (si quedó sin terminar):
  //   antes de las 12 → normal (azul) · 12 a 17 hs → naranja · 17 hs en adelante → rojo/pendiente
  const horaActual = new Date().getHours();
  const hayPendHoy = clientesHoy.length > 0 && !diaCompleto;
  const estadoHoy = diaCompleto ? "listo" : hayPendHoy && horaActual >= 17 ? "rojo" : hayPendHoy && horaActual >= 12 ? "naranja" : "normal";
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      onVolver: onVolver
    }), (() => {
      const ultimo = localStorage.getItem("rm_lc_ultimo_backup");
      const hoy = new Date().toLocaleDateString("en-CA");
      const esHoy = ultimo === hoy;
      return /*#__PURE__*/_jsxs("div", {
        style: {
          margin: "8px 14px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          background: "var(--color-background-tertiary)"
        },
        children: [/*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 12,
            color: esHoy ? "var(--color-text-success)" : "var(--color-text-warning)",
            flex: 1
          },
          children: ["💾 ", ultimo ? `Último respaldo: ${esHoy ? "hoy" : ultimo}` : "Todavía no se hizo ningún respaldo"]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            background: "none",
            border: "none",
            color: "var(--color-text-info)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "2px 6px"
          },
          onClick: () => {
            if (typeof window._descargarRespaldo === "function") window._descargarRespaldo();
          },
          children: "Descargar ahora"
        })]
      });
    })(), recordatoriosActivos && recordatoriosActivos.length > 0 && /*#__PURE__*/_jsxs("div", {
      style: {
        margin: "8px 14px 4px"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 11,
          fontWeight: 500,
          color: "#5daaff",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        },
        children: "🔔 Recordatorios pendientes"
      }), recordatoriosActivos.slice(0, 5).map(r => /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 6px",
          background: "#1e2e4a",
          border: "0.5px solid #5daaff",
          display: "flex",
          gap: 8,
          alignItems: "flex-start"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "#5daaff"
            },
            children: [r.clienteNombre, " · ", r.dia]
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-primary)",
              marginTop: 2
            },
            children: r.motivo
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              marginTop: 2
            },
            children: [r.fecha, r.hora ? ` · ${r.hora}` : ""]
          })]
        }), /*#__PURE__*/_jsx("button", {
          style: {
            background: "#4dd9a0",
            color: "#0a2e1f",
            border: "none",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 2
          },
          onClick: () => onConfirmarRecordatorio && onConfirmarRecordatorio(r.id),
          children: "✓"
        })]
      }, r.id)), recordatoriosActivos.length > 5 && /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          textAlign: "center"
        },
        children: ["+", recordatoriosActivos.length - 5, " más"]
      })]
    }), transferenciasPendientes && transferenciasPendientes.length > 0 && /*#__PURE__*/_jsxs("div", {
      style: {
        margin: "8px 14px 4px"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 11,
          fontWeight: 500,
          color: "#f5b942",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        },
        children: "🔴 Transferencias sin confirmar"
      }), transferenciasPendientes.map(({
        dia,
        fecha,
        count,
        monto,
        ventas: vts
      }) => /*#__PURE__*/_jsxs("button", {
        style: {
          ...s.card,
          width: "100%",
          margin: "0 0 6px",
          background: "#1e3a5f",
          border: "1px solid #f5b942",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          textAlign: "left"
        },
        onClick: () => onVerConfirmaciones && onVerConfirmaciones(dia),
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 18
          },
          children: "🔴"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#f5b942"
            },
            children: [dia, " · ", count, " transfer. sin confirmar"]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-secondary)",
              marginTop: 2
            },
            children: [vts.slice(0, 3).map(v => v.cliente).join(", "), vts.length > 3 ? ` +${vts.length - 3} más` : ""]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            textAlign: "right",
            flexShrink: 0
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#f5b942"
            },
            children: fmt(monto)
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 10,
              color: "var(--color-text-tertiary)"
            },
            children: fecha
          })]
        })]
      }, dia + fecha))]
    }), /*#__PURE__*/_jsx("span", {
      style: s.sectionTitle,
      children: "Días de reparto"
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      children: [dias.map((d, idx) => {
        const deudas = (clientes || []).filter(c => c.dia === d && c.saldo < 0);
        const totalDeuda = deudas.reduce((a, c) => a + Math.abs(c.saldo), 0);
        const totalClientes = (clientes || []).filter(c => c.dia === d).length;
        const totalProspectos = (prospectos || []).filter(p => p.dia === d && (p.estado === "activo" || !p.estado)).length;
        const zona = (zonasReparto || {})[d] || "";
        // ── Día pasado sin cargar nada (no hoy): busca su última fecha ya ocurrida y
        //    si no hay ninguna venta ni "no visita" registrada ese día, queda pendiente ──
        let noCargado = false,
          fechaNoCargadoLabel = "",
          fechaNoCargadoKey = "";
        if (d !== hoyDiaNombre) {
          const idxDiaMap = {
            "Domingo": 0,
            "Lunes": 1,
            "Martes": 2,
            "Miércoles": 3,
            "Jueves": 4,
            "Viernes": 5,
            "Sábado": 6
          };
          let diff = new Date().getDay() - idxDiaMap[d];
          if (diff <= 0) diff += 7; // si todavía no pasó esta semana, mira la ocurrencia de la semana pasada
          const fechaObj = new Date();
          fechaObj.setDate(fechaObj.getDate() - diff);
          const fkObj = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
          const clientesEseDia = (clientes || []).filter(c => c.dia === d);
          const ventasEseDiaIds = new Set((ventas || []).filter(v => v.fechaKey === fkObj).map(v => v.clienteId));
          const noVisitasEseDiaIds = new Set((noVisitas || []).filter(v => v.fecha === fkObj).map(v => v.clienteId));
          const cargadoEseDia = clientesEseDia.some(c => ventasEseDiaIds.has(c.id) || noVisitasEseDiaIds.has(c.id));
          noCargado = clientesEseDia.length > 0 && !cargadoEseDia;
          fechaNoCargadoLabel = fechaObj.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short"
          });
          fechaNoCargadoKey = fkObj;
        }
        return /*#__PURE__*/_jsxs(React.Fragment, {
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 6,
              alignItems: "stretch"
            },
            children: [/*#__PURE__*/_jsxs("button", {
              style: {
                ...s.card,
                margin: 0,
                flex: 1,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px"
              },
              onClick: () => onDia(d),
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  flex: 1,
                  minWidth: 0
                },
                children: [/*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 5
                  },
                  children: [/*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--color-text-primary)"
                    },
                    children: d
                  }), zona && /*#__PURE__*/_jsxs(_Fragment, {
                    children: [/*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--color-text-primary)"
                      },
                      children: "·"
                    }), /*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      },
                      children: zona
                    })]
                  }), !zona && /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 12,
                      color: "var(--color-text-tertiary)",
                      fontStyle: "italic",
                      cursor: "pointer"
                    },
                    onClick: e => {
                      e.stopPropagation();
                      setEditandoZona(d);
                    },
                    children: "+ zona"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  },
                  children: [totalDeuda > 0 ? /*#__PURE__*/_jsxs("span", {
                    style: {
                      fontSize: 12,
                      color: "var(--color-text-danger)"
                    },
                    children: ["⚠ ", deudas.length, " cliente", deudas.length > 1 ? "s" : "", " ", deudas.length > 1 ? "deben" : "debe", " ", fmt(totalDeuda)]
                  }) : /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 12,
                      color: "var(--color-text-success)"
                    },
                    children: "✓ Sin deudas"
                  }), /*#__PURE__*/_jsxs("span", {
                    style: {
                      fontSize: 12,
                      color: "var(--color-text-tertiary)"
                    },
                    children: [totalClientes, " cliente", totalClientes !== 1 ? "s" : ""]
                  })]
                })]
              }), /*#__PURE__*/_jsx("span", {
                style: {
                  color: "var(--color-text-tertiary)",
                  fontSize: 18,
                  marginLeft: 10
                },
                children: "→"
              })]
            }), d === hoyDiaNombre && onDiaHoy && (() => {
              const cfg = {
                listo: {
                  bg: "#0a5c3a",
                  border: "1.5px solid #4dd9a0",
                  icon: "✅",
                  txt: "Listo",
                  txtCol: "#4dd9a0",
                  subCol: "#9FE1CB"
                },
                rojo: {
                  bg: "#b91c1c",
                  border: "1.5px solid #fca5a5",
                  icon: "🔴",
                  txt: "Pendiente",
                  txtCol: "#ffe4e4",
                  subCol: "#ffc9c9"
                },
                naranja: {
                  bg: "#b45309",
                  border: "1.5px solid #fcd34d",
                  icon: "⏰",
                  txt: "Hoy",
                  txtCol: "#fff4e0",
                  subCol: "#ffe0b5"
                },
                normal: {
                  bg: "#185FA5",
                  border: "none",
                  icon: "📅",
                  txt: "Hoy",
                  txtCol: "#e2eaf4",
                  subCol: "#b5d4f4"
                }
              }[estadoHoy];
              const sub = diaCompleto || estadoHoy !== "normal" ? `${visitadosHoy.length}/${clientesHoy.length}` : hoyLabel;
              return /*#__PURE__*/_jsxs("button", {
                style: {
                  background: cfg.bg,
                  borderRadius: 12,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  minWidth: 56,
                  border: cfg.border,
                  cursor: "pointer",
                  flexShrink: 0
                },
                onClick: () => diaCompleto ? onDiaResumen && onDiaResumen(d, hoyFechaKey) : onDiaHoy(d, hoyFechaKey),
                children: [/*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 16
                  },
                  children: cfg.icon
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 9,
                    color: cfg.txtCol,
                    fontWeight: 500,
                    textAlign: "center",
                    lineHeight: 1.3
                  },
                  children: cfg.txt
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 9,
                    color: cfg.subCol,
                    lineHeight: 1
                  },
                  children: sub
                })]
              });
            })(), noCargado && onDiaHoy && /*#__PURE__*/_jsxs("button", {
              style: {
                background: "#b91c1c",
                borderRadius: 12,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                minWidth: 56,
                border: "1.5px solid #fca5a5",
                cursor: "pointer",
                flexShrink: 0
              },
              onClick: () => onDiaHoy(d, fechaNoCargadoKey),
              children: [/*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 16
                },
                children: "🔴"
              }), /*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 9,
                  color: "#ffe4e4",
                  fontWeight: 500,
                  textAlign: "center",
                  lineHeight: 1.3
                },
                children: "No cargado"
              }), /*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 9,
                  color: "#ffc9c9",
                  lineHeight: 1
                },
                children: fechaNoCargadoLabel
              })]
            })]
          }), editandoZona === d && /*#__PURE__*/_jsxs("div", {
            style: {
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 10,
              padding: "10px 14px",
              marginTop: 2
            },
            onClick: e => e.stopPropagation(),
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)",
                marginBottom: 6
              },
              children: ["Zona de reparto del ", d]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [/*#__PURE__*/_jsx("input", {
                id: `zona-${d}`,
                style: s.input,
                defaultValue: zona,
                placeholder: "Ej: Lomas de Tafí",
                autoFocus: true
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btnPrimary,
                  padding: "6px 14px",
                  fontSize: 13,
                  whiteSpace: "nowrap"
                },
                onClick: () => {
                  const v = document.getElementById(`zona-${d}`).value.trim();
                  onSetZona(d, v);
                  setEditandoZona(null);
                },
                children: "OK"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  padding: "6px 10px",
                  fontSize: 13
                },
                onClick: () => setEditandoZona(null),
                children: "✕"
              })]
            })]
          }), zona && editandoZona !== d && /*#__PURE__*/_jsx("div", {
            style: {
              textAlign: "right",
              marginTop: 2,
              marginBottom: 2
            },
            children: /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                cursor: "pointer",
                textDecoration: "underline"
              },
              onClick: e => {
                e.stopPropagation();
                setEditandoZona(d);
              },
              children: "editar zona"
            })
          }), idx === dias.length - 1 && stock && (() => {
            const CAJON = 6;
            const sCaj = Math.floor((stock.soderia?.sifon || 0) / CAJON);
            const cCaj = Math.floor((stock.casa?.sifon || 0) / CAJON);
            const sB10 = stock.soderia?.bidon10 || 0,
              cB10 = stock.casa?.bidon10 || 0;
            const sB20 = stock.soderia?.bidon20 || 0,
              cB20 = stock.casa?.bidon20 || 0;
            const envC = {
              sifon: 0,
              bidon10: 0,
              bidon20: 0
            };
            (clientes || []).forEach(c => {
              envC.sifon += c.sifon || 0;
              envC.bidon10 += c.bidon10 || 0;
              envC.bidon20 += c.bidon20 || 0;
            });
            (ventas || []).forEach(v => {
              (v.envPrest || []).forEach(e => {
                const k = e.prod === "Sifón 1.5L" ? "sifon" : e.prod === "Bidón 10L" ? "bidon10" : e.prod === "Bidón 20L" ? "bidon20" : null;
                if (k) envC[k] += Number(e.cant) || 0;
              });
              (v.envDev || []).forEach(e => {
                const k = e.prod === "Sifón 1.5L" ? "sifon" : e.prod === "Bidón 10L" ? "bidon10" : e.prod === "Bidón 20L" ? "bidon20" : null;
                if (k) envC[k] -= Number(e.cant) || 0;
              });
            });
            const envCCaj = Math.floor(envC.sifon / CAJON);
            const totCaj = sCaj + cCaj + envCCaj,
              totB10 = sB10 + cB10 + envC.bidon10,
              totB20 = sB20 + cB20 + envC.bidon20;
            const StockCard = () => {
              const [open, setOpen] = React.useState(false);
              return /*#__PURE__*/_jsxs("div", {
                style: {
                  ...s.card,
                  margin: "4px 0 0",
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-secondary)"
                },
                children: [/*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  },
                  onClick: () => setOpen(o => !o),
                  children: [/*#__PURE__*/_jsxs("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    },
                    children: [/*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-primary)"
                      },
                      children: "📦 Stock"
                    }), /*#__PURE__*/_jsx("div", {
                      style: {
                        display: "flex",
                        gap: 6
                      },
                      children: [[totCaj, "caj"], [totB10, "10L"], [totB20, "20L"]].map(([v, u], i) => /*#__PURE__*/_jsxs("span", {
                        style: {
                          fontSize: 12,
                          fontWeight: 600,
                          color: Number(v) < 3 ? "var(--color-text-danger)" : Number(v) < 8 ? "var(--color-text-warning)" : "var(--color-text-info)"
                        },
                        children: [v, /*#__PURE__*/_jsx("span", {
                          style: {
                            fontSize: 10,
                            fontWeight: 400,
                            color: "var(--color-text-tertiary)",
                            marginLeft: 1
                          },
                          children: u
                        })]
                      }, i))
                    })]
                  }), /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 13,
                      color: "var(--color-text-tertiary)",
                      transition: "transform 0.2s",
                      display: "inline-block",
                      transform: open ? "rotate(180deg)" : "rotate(0deg)"
                    },
                    children: "▾"
                  })]
                }), open && /*#__PURE__*/_jsxs("div", {
                  style: {
                    marginTop: 12
                  },
                  children: [[["🏭 Sodería", [sCaj, sB10, sB20], "primary"], ["👥 En clientes", [envCCaj, envC.bidon10, envC.bidon20], "info"], ["📦 Total general", [totCaj, totB10, totB20], "info"]].map(([titulo, vals, color], gi) => /*#__PURE__*/_jsxs("div", {
                    style: {
                      marginBottom: gi < 2 ? 10 : 0
                    },
                    children: [/*#__PURE__*/_jsx("div", {
                      style: {
                        fontSize: 10,
                        color: "var(--color-text-tertiary)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      },
                      children: titulo
                    }), /*#__PURE__*/_jsx("div", {
                      style: {
                        display: "flex",
                        gap: 6
                      },
                      children: vals.map((v, i) => /*#__PURE__*/_jsxs("div", {
                        style: {
                          textAlign: "center",
                          flex: 1,
                          background: gi === 2 ? "#1e3a5f" : "var(--color-background-tertiary)",
                          borderRadius: 8,
                          padding: "6px 4px",
                          border: gi === 2 ? "0.5px solid var(--color-border-info)" : "none"
                        },
                        children: [/*#__PURE__*/_jsx("div", {
                          style: {
                            fontSize: 18,
                            fontWeight: gi === 2 ? 700 : 600,
                            color: gi === 0 ? Number(v) < 3 ? "var(--color-text-danger)" : Number(v) < 8 ? "var(--color-text-warning)" : "var(--color-text-primary)" : `var(--color-text-${color})`
                          },
                          children: v
                        }), /*#__PURE__*/_jsx("div", {
                          style: {
                            fontSize: 10,
                            color: "var(--color-text-tertiary)"
                          },
                          children: ["caj", "10L", "20L"][i]
                        })]
                      }, i))
                    })]
                  }, gi)), /*#__PURE__*/_jsx("button", {
                    style: {
                      ...s.btn,
                      width: "100%",
                      marginTop: 10,
                      fontSize: 12,
                      padding: "7px"
                    },
                    onClick: e => {
                      e.stopPropagation();
                      onStock();
                    },
                    children: "Editar stock →"
                  })]
                })]
              });
            };
            return /*#__PURE__*/_jsx(StockCard, {});
          })()]
        }, d);
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          padding: "4px 0 8px"
        },
        children: [{
          ico: "📅",
          lbl: "Agenda",
          fn: () => onAgenda && onAgenda()
        }, {
          ico: "💰",
          lbl: "Fiados",
          fn: () => onFiados && onFiados()
        }, {
          ico: "📊",
          lbl: "Resumen",
          fn: () => onResumen && onResumen()
        }].map(({
          ico,
          lbl,
          fn
        }) => /*#__PURE__*/_jsxs("button", {
          onClick: fn,
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "10px 4px",
            borderRadius: 11,
            cursor: "pointer",
            border: "none",
            background: "var(--color-background-tertiary)",
            color: "var(--color-text-secondary)"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 19
            },
            children: ico
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 9,
              fontWeight: 500,
              color: "var(--color-text-tertiary)"
            },
            children: lbl
          })]
        }, lbl))
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          paddingBottom: 4
        },
        children: [{
          ico: "👥",
          lbl: "Clientes",
          fn: onGestionClientes,
          bg: "#185FA5",
          desc: "Lista · Fiados · Agenda"
        }, {
          ico: "📦",
          lbl: "Stock",
          fn: onStock,
          bg: "#1a5e35",
          desc: "Inventario · Resumen"
        }].map(({
          ico,
          lbl,
          fn,
          bg,
          desc
        }) => /*#__PURE__*/_jsxs("button", {
          onClick: fn,
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "18px 8px",
            borderRadius: 14,
            cursor: "pointer",
            border: "none",
            background: bg,
            color: "#e2eaf4",
            boxShadow: "0 3px 10px rgba(0,0,0,0.35)"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 30
            },
            children: ico
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 14,
              fontWeight: 700
            },
            children: lbl
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 9,
              opacity: 0.75,
              textAlign: "center",
              lineHeight: 1.4
            },
            children: desc
          })]
        }, lbl))
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
          paddingBottom: 8
        },
        children: /*#__PURE__*/_jsxs("button", {
          onClick: onConfig,
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 10px",
            borderRadius: 12,
            cursor: "pointer",
            border: "none",
            background: "var(--color-background-tertiary)",
            color: "var(--color-text-secondary)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 20
            },
            children: "⚙️"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: "Config"
          })]
        })
      })]
    })]
  });
}
function DiaPrincipal({
  dia,
  onIrClientes,
  onIrPlanilla,
  onVolver,
  onVerConfirmaciones,
  ventasPendientesTransfer
}) {
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: dia,
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: [/*#__PURE__*/_jsxs("button", {
        style: {
          ...s.card,
          margin: 0,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 16px"
        },
        onClick: onIrPlanilla,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 17,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: "📋 Planilla del día"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)",
              marginTop: 4
            },
            children: "Fechas de visita · inicio del reparto · totales"
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            color: "var(--color-text-tertiary)",
            fontSize: 20
          },
          children: "→"
        })]
      }), ventasPendientesTransfer > 0 && /*#__PURE__*/_jsxs("button", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          background: "#1e3a5f",
          border: "1px solid #f5b942",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          textAlign: "left",
          cursor: "pointer"
        },
        onClick: onVerConfirmaciones,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 14,
              fontWeight: 500,
              color: "#f5b942"
            },
            children: ["🔴 ", ventasPendientesTransfer, " transferencia", ventasPendientesTransfer > 1 ? "s" : "", " sin confirmar"]
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-secondary)",
              marginTop: 2
            },
            children: "Tocá para ir a confirmar →"
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            color: "#f5b942",
            fontSize: 18
          },
          children: "→"
        })]
      }), /*#__PURE__*/_jsxs("button", {
        style: {
          ...s.card,
          margin: 0,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 16px"
        },
        onClick: onIrClientes,
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 17,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: "👥 Clientes del día"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)",
              marginTop: 4
            },
            children: "Registrar entregas y visitas"
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            color: "var(--color-text-tertiary)",
            fontSize: 20
          },
          children: "→"
        })]
      })]
    })]
  });
}
function DetalleTransferencias({
  ventas,
  ventasPendTrans
}) {
  const [abierto, setAbierto] = React.useState(false);
  const pendientes = (ventasPendTrans || []).length;
  return /*#__PURE__*/_jsxs("div", {
    style: {
      marginTop: 8,
      borderTop: "0.5px solid var(--color-border-tertiary)",
      paddingTop: 8
    },
    children: [/*#__PURE__*/_jsxs("button", {
      style: {
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2px 0"
      },
      onClick: () => setAbierto(o => !o),
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 11,
            color: "var(--color-text-secondary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          },
          children: "Detalle de transferencias"
        }), pendientes > 0 && /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--color-background-warning)",
            color: "#f5b942",
            fontWeight: 600
          },
          children: ["🔴 ", pendientes, " pend."]
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 13,
          color: "var(--color-text-tertiary)",
          display: "inline-block",
          transform: abierto ? "rotate(180deg)" : "rotate(0deg)"
        },
        children: "▾"
      })]
    }), abierto && /*#__PURE__*/_jsx("div", {
      style: {
        marginTop: 6
      },
      children: ventas.map(v => {
        const confirmada = !!v.transConfirmada;
        return /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 0",
            borderBottom: "0.5px solid var(--color-border-tertiary)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 12,
                color: "var(--color-text-primary)",
                fontWeight: 500
              },
              children: v.cliente
            }), /*#__PURE__*/_jsx("span", {
              style: {
                marginLeft: 6,
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: confirmada ? "var(--color-background-success)" : "var(--color-background-warning)",
                color: confirmada ? "var(--color-text-success)" : "#f5b942",
                fontWeight: 600
              },
              children: confirmada ? "✅ Confirmada" : "🔴 Pendiente"
            })]
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: confirmada ? "var(--color-text-success)" : "#f5b942"
            },
            children: fmt(v.pago === "mixto" ? Number(v.montoTrans) || 0 : v.pagadoNum || v.neto || 0)
          })]
        }, v.id);
      })
    })]
  });
}
function DetalleVentasDia({
  ventas,
  clientes,
  prospectos,
  noVisitas,
  fecha
}) {
  const [abierto, setAbierto] = React.useState(false);
  const todosMap = React.useMemo(() => {
    const m = {};
    (prospectos || []).forEach(p => {
      m[p.id] = {
        ...p,
        _esProspecto: true
      };
    });
    (clientes || []).forEach(c => {
      m[c.id] = c;
    });
    return m;
  }, [clientes, prospectos]);
  const fmtEnv = arr => (arr || []).filter(e => e.prod && Number(e.cant) > 0).map(e => `${e.cant} ${e.prod}`).join(", ");
  return /*#__PURE__*/_jsxs("div", {
    style: {
      margin: "0 0 8px",
      borderRadius: 12,
      overflow: "hidden",
      border: "1.5px solid #185FA5",
      background: "var(--color-background-info)"
    },
    children: [/*#__PURE__*/_jsxs("button", {
      style: {
        width: "100%",
        padding: "12px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        textAlign: "left"
      },
      onClick: () => setAbierto(o => !o),
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 16
          },
          children: "📋"
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-info)"
          },
          children: "Detalle de ventas del día"
        }), /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)"
          },
          children: [ventas.length, " venta", ventas.length > 1 ? "s" : ""]
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          color: "var(--color-text-info)",
          fontSize: 14,
          display: "inline-block",
          transform: abierto ? "rotate(180deg)" : "rotate(0deg)"
        },
        children: "▾"
      })]
    }), abierto && /*#__PURE__*/_jsxs("div", {
      style: {
        borderTop: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)"
      },
      children: [ventas.map((v, idx) => {
        const pagoBadge = {
          contado: {
            bg: "var(--color-background-success)",
            color: "var(--color-text-success)",
            txt: "Contado"
          },
          transferencia: {
            bg: v.transConfirmada ? "var(--color-background-success)" : "var(--color-background-warning)",
            color: v.transConfirmada ? "var(--color-text-success)" : "#f5b942",
            txt: v.transConfirmada ? "Transfer. ✅" : "Transfer. 🔴"
          },
          fiado: {
            bg: "var(--color-background-warning)",
            color: "var(--color-text-warning)",
            txt: "Fiado"
          },
          mixto: {
            bg: "var(--color-background-info)",
            color: "var(--color-text-info)",
            txt: `Mixto 💵$${v.montoEfec || 0} + 💳$${v.montoTrans || 0}`
          }
        }[v.pago] || {
          bg: "var(--color-background-tertiary)",
          color: "var(--color-text-secondary)",
          txt: v.pago
        };
        const cli = todosMap[v.clienteId] || {};
        const dir = direccionCliente(cli);
        const deudaPagada = Math.max(0, (v.pagadoNum || 0) - (v.neto || 0));
        const prestStr = fmtEnv(v.envPrest);
        const devStr = fmtEnv(v.envDev);
        return /*#__PURE__*/_jsxs("div", {
          style: {
            padding: "10px 16px",
            borderBottom: idx < ventas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 5
            },
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                flex: 1,
                minWidth: 0
              },
              children: [/*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-primary)"
                },
                children: v.cliente
              }), cli._esProspecto && /*#__PURE__*/_jsx("span", {
                style: {
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "#2e1f06",
                  color: "#f5b942",
                  fontWeight: 600
                },
                children: "🚀 Prospecto"
              }), /*#__PURE__*/_jsx("span", {
                style: {
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: pagoBadge.bg,
                  color: pagoBadge.color,
                  fontWeight: 600
                },
                children: pagoBadge.txt
              }), v.repartidor && /*#__PURE__*/_jsxs("span", {
                style: {
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--color-background-tertiary)",
                  color: "var(--color-text-secondary)",
                  fontWeight: 500
                },
                children: ["🚐 ", v.repartidor]
              }), dir && /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginTop: 2
                },
                children: ["📍 ", dir]
              })]
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: fmt(v.neto || 0)
            })]
          }), (v.detalle || []).map((d, di) => /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "2px 0 2px 8px"
            },
            children: [/*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)"
              },
              children: [d.nombre, " × ", d.cantidad]
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 12,
                color: "var(--color-text-tertiary)"
              },
              children: fmt(d.total)
            })]
          }, di)), (v.saldoAplicado > 0 || deudaPagada > 0 || prestStr || devStr) && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "3px 0 0 8px",
              marginTop: 2,
              borderTop: "0.5px solid var(--color-border-tertiary)"
            },
            children: [v.saldoAplicado > 0 && /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-success)"
              },
              children: ["Saldo a favor aplicado: −", fmt(v.saldoAplicado)]
            }), deudaPagada > 0 && /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-success)"
              },
              children: ["💵 Pagó deuda: +", fmt(deudaPagada)]
            }), prestStr && /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                color: "#f5b942"
              },
              children: ["📦 Prestó: ", prestStr]
            }), devStr && /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-info)"
              },
              children: ["↩️ Devolvió: ", devStr]
            })]
          })]
        }, v.id);
      }), (() => {
        const ventaIds = new Set(ventas.map(v => v.clienteId));
        const noComp = (noVisitas || []).filter(n => n.fecha === fecha && !ventaIds.has(n.clienteId) && n.motivo !== "salteado");
        if (noComp.length === 0) return null;
        const lbl = m => m === "noquiso" ? {
          t: "No quiso",
          c: "var(--color-text-danger)",
          ic: "🚫"
        } : {
          t: "No estaba",
          c: "var(--color-text-warning)",
          ic: "🔄"
        };
        return /*#__PURE__*/_jsxs("div", {
          style: {
            borderTop: "0.5px solid var(--color-border-tertiary)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              padding: "8px 16px 4px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: ["No compraron (", noComp.length, ")"]
          }), noComp.map((n, i) => {
            const p = todosMap[n.clienteId] || {};
            const info = lbl(n.motivo);
            const dir = direccionCliente(p);
            return /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 16px",
                borderTop: i > 0 ? "0.5px solid var(--color-border-tertiary)" : "none"
              },
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  minWidth: 0
                },
                children: [/*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 13,
                    color: "var(--color-text-secondary)"
                  },
                  children: p.nombre || "Cliente"
                }), dir && /*#__PURE__*/_jsxs("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--color-text-tertiary)"
                  },
                  children: ["📍 ", dir]
                })]
              }), /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: info.c,
                  flexShrink: 0
                },
                children: [info.ic, " ", info.t]
              })]
            }, "nv" + i);
          })]
        });
      })()]
    })]
  });
}
function PlanillaDelDia({
  dia,
  fecha,
  repartoId,
  ventas,
  clientes,
  planilla,
  productos,
  stock,
  setStock,
  syncData,
  onGuardar,
  onVolver,
  onCerrarDia,
  initCierre,
  prospectos,
  noVisitas,
  cargasDia
}) {
  // Separar ventas del día propio vs ventas de clientes de otro día
  const [enviosInforme, setEnviosInforme] = React.useState(() => Number(localStorage.getItem(`sr_informe_${fecha}_${dia}`) || 0));
  const clientesDia = new Set((clientes || []).filter(c => c.dia === dia).map(c => c.id));
  const ventasPropias = ventas.filter(v => clientesDia.has(v.clienteId));
  const ventasExtraDia = ventas.filter(v => !clientesDia.has(v.clienteId) && (!v.dia || v.dia === dia) && v.fechaKey === fecha);
  // Auto-calcular desde ventas del dia
  const CAJON_SODA = 6;
  const getProdCosto = nombre => {
    const p = (productos || []).find(x => x.nombre === nombre);
    return p ? p.costo || 0 : 0;
  };
  const costSifon = getProdCosto("Sifón 1.5L") || 133.33;
  const costB10 = getProdCosto("Bidón 10L") || 800;
  const costB20 = getProdCosto("Bidón 20L") || 1100;
  const COSTO_CAJON_SODA = costSifon * CAJON_SODA;
  const prodKey = {
    "Bidón 10L": "b10",
    "Bidón 20L": "b20",
    "Sifón 1.5L": "soda"
  };
  // Solo ventas de clientes propios del día
  const totalesPorProd = {
    b10: {
      vacios: 0,
      plata: 0,
      llenar: 0
    },
    b20: {
      vacios: 0,
      plata: 0,
      llenar: 0
    },
    soda: {
      vacios: 0,
      plata: 0,
      llenar: 0,
      cajones: 0
    }
  };
  ventasPropias.forEach(v => {
    v.detalle.forEach(d => {
      const k = prodKey[d.nombre];
      if (!k) return;
      totalesPorProd[k].vacios += d.cantidad;
      totalesPorProd[k].plata += d.total;
    });
  });
  const sodaCajones = Math.floor(totalesPorProd.soda.vacios / CAJON_SODA) || 0;
  totalesPorProd.soda.cajones = sodaCajones;
  totalesPorProd.soda.llenar = sodaCajones * COSTO_CAJON_SODA;
  totalesPorProd.b10.llenar = totalesPorProd.b10.vacios * costB10;
  totalesPorProd.b20.llenar = totalesPorProd.b20.vacios * costB20;
  const totalVentaPlata = Object.values(totalesPorProd).reduce((a, p) => a + p.plata, 0);
  const totalVentaLlenar = Object.values(totalesPorProd).reduce((a, p) => a + p.llenar, 0);
  // Totales ventas de otros días
  const extraEfectivo = ventasExtraDia.filter(v => v.pago === "contado").reduce((a, v) => a + (v.pagadoNum || v.neto || 0), 0);
  const extraTrans = ventasExtraDia.filter(v => v.pago === "transferencia").reduce((a, v) => a + (v.pagadoNum || v.neto || 0), 0);
  const extraFiado = ventasExtraDia.filter(v => v.pago === "fiado").reduce((a, v) => a + (v.neto || 0), 0);
  const extraTotal = extraEfectivo + extraTrans + extraFiado;
  // Cobranza — solo ventas propias del día
  const cobEfectivo = ventasPropias.filter(v => v.pago === "contado" || v.pago === "mixto").reduce((a, v) => a + (v.pago === "mixto" ? Number(v.montoEfec) || 0 : v.pagadoNum || v.neto || 0), 0);
  const cobTransBruto = ventasPropias.filter(v => v.pago === "transferencia" || v.pago === "mixto").reduce((a, v) => a + (v.pago === "mixto" ? Number(v.montoTrans) || 0 : v.pagadoNum || v.neto || 0), 0);
  const cobTransDesc = Math.round(cobTransBruto * 0.025);
  const cobTransNeto = cobTransBruto - cobTransDesc;
  const ventasPendTrans = ventas.filter(v => (v.pago === "transferencia" || v.pago === "mixto" && (Number(v.montoTrans) || 0) > 0) && !v.transConfirmada);
  const cobFiado = ventasPropias.filter(v => v.pago === "fiado").reduce((a, v) => a + (v.neto || 0), 0);
  const cobSaldosEfec = ventasPropias.filter(v => v.pago === "contado").reduce((a, v) => {
    const extra = (v.pagadoNum || 0) - (v.neto || 0);
    return a + (extra > 0 ? extra : 0);
  }, 0);
  const cobSaldosTrans = ventasPropias.filter(v => v.pago === "transferencia").reduce((a, v) => {
    const extra = (v.pagadoNum || 0) - (v.neto || 0);
    return a + (extra > 0 ? extra : 0);
  }, 0);
  const cobSaldos = cobSaldosEfec + cobSaldosTrans;
  const fiadoNeto = cobFiado - cobSaldos;
  const [datos, setDatos] = useState(() => {
    const _sLlenos = Number(planilla?.productos?.soda?.llenos || 0);
    const _b10Init = Number(planilla?.productos?.b10?.llenos || 0);
    const _b20Init = Number(planilla?.productos?.b20?.llenos || 0);
    const _cajInit = Math.floor(_sLlenos / (CAJON_SODA || 6));
    const _pesoInit = _cajInit * 13 + _b10Init * 10 + _b20Init * 20;
    const _bultosInit = _cajInit + _b10Init + _b20Init;
    const _fechaAuto = /^\d{4}-\d{2}-\d{2}$/.test(fecha || "") ? fecha.split("-").reverse().join("/") : "";
    return {
      ...planilla,
      fecha: planilla.fecha || _fechaAuto,
      peso: planilla.peso || (_pesoInit > 0 ? String(_pesoInit) : ""),
      bultos: planilla.bultos || (_bultosInit > 0 ? String(_bultosInit) : ""),
      efectivo: planilla.efectivo || (cobEfectivo > 0 ? String(Math.round(cobEfectivo)) : ""),
      fiado: planilla.fiado || (cobFiado > 0 ? String(Math.round(cobFiado)) : ""),
      retenciones: planilla.retenciones || (cobTransDesc > 0 ? String(cobTransDesc) : "")
    };
  });
  const set = (k, v) => setDatos(d => ({
    ...d,
    [k]: v
  }));
  const setProd = (pid, campo, v) => setDatos(d => ({
    ...d,
    productos: {
      ...d.productos,
      [pid]: {
        ...d.productos[pid],
        [campo]: v
      }
    }
  }));
  const setGasto = (i, campo, v) => {
    const g = [...(datos.gastos || [])];
    g[i] = {
      ...g[i],
      [campo]: v
    };
    setDatos(d => ({
      ...d,
      gastos: g
    }));
  };
  const addGasto = () => setDatos(d => ({
    ...d,
    gastos: [...(d.gastos || []), {
      cat: "propina",
      monto: ""
    }]
  }));
  const delGasto = i => setDatos(d => ({
    ...d,
    gastos: d.gastos.filter((_, j) => j !== i)
  }));
  const totalGastos = (datos.gastos || []).reduce((a, g) => a + num(g.monto), 0);
  const efectivo = num(datos.efectivo),
    fiado = num(datos.fiado),
    retenciones = num(datos.retenciones);
  const sobrante = efectivo - (totalVentaPlata - fiado);
  const ganancia = cobEfectivo + cobTransBruto + cobFiado + cobSaldos - totalVentaLlenar - totalGastos;
  const totalLlenosIngresados = PRODUCTOS_CONFIG.reduce((a, p) => a + num(datos.productos[p.id]?.llenos), 0);

  // ── Cierre del día: estados y cálculos ───────────────────────────
  const [mostrarCierre, setMostrarCierre] = useState(!!(initCierre && !planilla._diaCerrado));
  const [realesLlenos, setRealesLlenos] = useState({
    soda: "",
    b10: "",
    b20: ""
  });
  const [realesVacios, setRealesVacios] = useState({
    soda: "",
    b10: "",
    b20: ""
  });
  const [realesParaLlenar, setRealesParaLlenar] = useState({
    soda: "",
    b10: "",
    b20: ""
  });
  const yaCerrado = !!planilla._diaCerrado;
  const llenosCargados = {
    soda: Number(datos.productos?.soda?.llenos || 0),
    b10: Number(datos.productos?.b10?.llenos || 0),
    b20: Number(datos.productos?.b20?.llenos || 0)
  };
  // Peso y bultos calculados desde los productos cargados
  const cajonesLlenos = Math.floor((llenosCargados.soda || 0) / CAJON_SODA);
  const b10Llenos = llenosCargados.b10 || 0;
  const b20Llenos = llenosCargados.b20 || 0;
  const pesoAuto = cajonesLlenos * 13 + b10Llenos * 10 + b20Llenos * 20;
  const bultosAuto = cajonesLlenos + b10Llenos + b20Llenos;
  const vendidosDia = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  const prestadosDia = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  const devueltosDia = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  ventas.forEach(v => {
    (v.detalle || []).forEach(d => {
      const k = prodKey[d.nombre];
      if (k) vendidosDia[k] += d.cantidad;
    });
    (v.envPrest || []).forEach(e => {
      const k = prodKey[e.prod || ""];
      if (k) prestadosDia[k] += Number(e.cant) || 0;
    });
    (v.envDev || []).forEach(e => {
      const k = prodKey[e.prod || ""];
      if (k) devueltosDia[k] += Number(e.cant) || 0;
    });
  });
  const sobrantes = {
    soda: Math.max(0, llenosCargados.soda - vendidosDia.soda),
    b10: Math.max(0, llenosCargados.b10 - vendidosDia.b10),
    b20: Math.max(0, llenosCargados.b20 - vendidosDia.b20)
  };
  const vaciosRec = {
    soda: Math.max(0, vendidosDia.soda + devueltosDia.soda - prestadosDia.soda),
    b10: Math.max(0, vendidosDia.b10 + devueltosDia.b10 - prestadosDia.b10),
    b20: Math.max(0, vendidosDia.b20 + devueltosDia.b20 - prestadosDia.b20)
  };
  // Sodería actual (antes del cierre) — para mostrar "quedará en" por fila
  const convPk = {
    soda: "sifon",
    b10: "bidon10",
    b20: "bidon20"
  };
  const soderiaActual = stock?.soderia || {};
  const soderiaVaciosActual = stock?.soderia_vacios || {};

  // Cuánto necesitás para la salida del PRÓXIMO día de este mismo reparto
  const DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaSiguiente = DIAS_ORDEN[(DIAS_ORDEN.indexOf(dia) + 1) % DIAS_ORDEN.length];
  const necesarioManana = cargasDia && cargasDia[diaSiguiente] || {
    soda: 0,
    b10: 0,
    b20: 0
  };

  // "Para llenar" (calculado) = de los vacíos que vuelven HOY, cuántos hacen
  // falta llenar para completar lo que se necesita mañana — teniendo en
  // cuenta lo que YA había en sodería de días anteriores, no solo lo de hoy.
  const paraLlenarCalc = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  const vaciosRestoCalc = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  ["soda", "b10", "b20"].forEach(pk => {
    const sk = convPk[pk];
    const llenosHoy = pk === "soda" ? Math.floor(sobrantes[pk] / CAJON_SODA) : sobrantes[pk];
    const vaciosHoy = pk === "soda" ? Math.floor(vaciosRec[pk] / CAJON_SODA) : vaciosRec[pk];
    const llenosYaHabia = pk === "soda" ? Math.floor((soderiaActual[sk] || 0) / CAJON_SODA) : soderiaActual[sk] || 0;
    const necDisp = pk === "soda" ? Math.ceil((necesarioManana[pk] || 0) / CAJON_SODA) : necesarioManana[pk] || 0;
    const falta = Math.max(0, necDisp - llenosYaHabia - llenosHoy);
    paraLlenarCalc[pk] = Math.min(falta, vaciosHoy);
    vaciosRestoCalc[pk] = Math.max(0, vaciosHoy - paraLlenarCalc[pk]);
  });
  const confirmarCierre = () => {
    const realesL = {
      soda: realesLlenos.soda !== "" ? Number(realesLlenos.soda) * CAJON_SODA : sobrantes.soda,
      b10: realesLlenos.b10 !== "" ? Number(realesLlenos.b10) : sobrantes.b10,
      b20: realesLlenos.b20 !== "" ? Number(realesLlenos.b20) : sobrantes.b20
    };
    const realesPL = {
      soda: (realesParaLlenar.soda !== "" ? Number(realesParaLlenar.soda) : paraLlenarCalc.soda) * CAJON_SODA,
      b10: realesParaLlenar.b10 !== "" ? Number(realesParaLlenar.b10) : paraLlenarCalc.b10,
      b20: realesParaLlenar.b20 !== "" ? Number(realesParaLlenar.b20) : paraLlenarCalc.b20
    };
    const realesV = {
      soda: (realesVacios.soda !== "" ? Number(realesVacios.soda) : vaciosRestoCalc.soda) * CAJON_SODA,
      b10: realesVacios.b10 !== "" ? Number(realesVacios.b10) : vaciosRestoCalc.b10,
      b20: realesVacios.b20 !== "" ? Number(realesVacios.b20) : vaciosRestoCalc.b20
    };
    const diffs = {};
    ["soda", "b10", "b20"].forEach(pk => {
      const calcL = pk === "soda" ? Math.floor(sobrantes[pk] / CAJON_SODA) : sobrantes[pk];
      const calcV = pk === "soda" ? Math.floor(vaciosRec[pk] / CAJON_SODA) : vaciosRec[pk];
      const realLTotal = (realesL[pk] + realesPL[pk]) / (pk === "soda" ? CAJON_SODA : 1);
      const realV = realesV[pk] / (pk === "soda" ? CAJON_SODA : 1);
      if (realLTotal !== calcL) diffs[`llenos_${pk}`] = {
        calc: calcL,
        real: realLTotal
      };
      if (realV !== calcV) diffs[`vacios_${pk}`] = {
        calc: calcV,
        real: realV
      };
    });
    const s = JSON.parse(JSON.stringify(stock));
    if (!s.soderia) s.soderia = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
    if (!s.soderia_vacios) s.soderia_vacios = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
    if (!s.camiones) s.camiones = {};
    const conv = {
      soda: "sifon",
      b10: "bidon10",
      b20: "bidon20"
    };
    ["soda", "b10", "b20"].forEach(pk => {
      const sk = conv[pk];
      // "Para llenar" se llena antes de salir mañana — para el stock ya
      // cuenta como LLENO, no como vacío.
      s.soderia[sk] = (s.soderia[sk] || 0) + realesL[pk] + realesPL[pk];
      s.soderia_vacios[sk] = (s.soderia_vacios[sk] || 0) + realesV[pk];
    });
    // Vaciar SOLO el camión de este reparto — el del otro reparto no se toca
    if (repartoId) s.camiones[repartoId] = stockCamionVacio();
    setStock(s);
    syncData({
      stock: s
    });
    onGuardar({
      ...datos,
      _diaCerrado: true,
      _stockActualizado: true,
      ...(Object.keys(diffs).length > 0 ? {
        _cierreDiffs: diffs
      } : {})
    });
    setMostrarCierre(false);
    if (onCerrarDia) setTimeout(() => onCerrarDia(), 800);
  };

  // ── Early return: pantalla de cierre ─────────────────────────────
  if (mostrarCierre) {
    return /*#__PURE__*/_jsxs("div", {
      style: s.screen,
      children: [/*#__PURE__*/_jsx(HeaderApp, {
        titulo: `Cierre del día · ${dia}`,
        onVolver: () => setMostrarCierre(false)
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          padding: 16
        },
        children: [/*#__PURE__*/_jsxs("details", {
          style: {
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsxs("summary", {
            style: {
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--color-background-tertiary)",
              borderRadius: 8,
              padding: "10px 14px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Ver detalle del día (lo cargado y los movimientos)"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "▾"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              marginTop: 8
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                ...s.card,
                margin: "0 0 8px",
                padding: "10px 12px"
              },
              children: [["Soda", llenosCargados.soda > 0 ? `${Math.floor(llenosCargados.soda / CAJON_SODA)} cajones (${llenosCargados.soda} un)` : "—"], ["Bidón 10L", llenosCargados.b10 > 0 ? `${llenosCargados.b10} unidades` : "—"], ["Bidón 20L", llenosCargados.b20 > 0 ? `${llenosCargados.b20} unidades` : "—"]].map(([l, v]) => /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "0.5px solid var(--color-border-tertiary)"
                },
                children: [/*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: 13,
                    color: "var(--color-text-secondary)"
                  },
                  children: [l, " cargado"]
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text-primary)"
                  },
                  children: v
                })]
              }, l))
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                ...s.card,
                margin: "0 0 8px",
                padding: "10px 12px"
              },
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  marginBottom: 8
                },
                children: ["", "Vendido", "Prestado", "Devuelto"].map(h => /*#__PURE__*/_jsx("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--color-text-tertiary)",
                    textAlign: h ? "center" : "left",
                    fontWeight: 500
                  },
                  children: h
                }, h))
              }), [["Soda", "soda"], ["10L", "b10"], ["20L", "b20"]].map(([label, pk]) => /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  padding: "7px 0",
                  borderTop: "0.5px solid var(--color-border-tertiary)",
                  alignItems: "center"
                },
                children: [/*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 13,
                    color: "var(--color-text-primary)"
                  },
                  children: label
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-warning)"
                  },
                  children: vendidosDia[pk] > 0 ? `−${pk === "soda" ? Math.floor(vendidosDia[pk] / CAJON_SODA) : vendidosDia[pk]}` : "—"
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: 600,
                    color: prestadosDia[pk] > 0 ? "var(--color-text-warning)" : "var(--color-text-tertiary)"
                  },
                  children: prestadosDia[pk] > 0 ? `−${pk === "soda" ? Math.floor(prestadosDia[pk] / CAJON_SODA) : prestadosDia[pk]}` : "0"
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: 600,
                    color: devueltosDia[pk] > 0 ? "var(--color-text-success)" : "var(--color-text-tertiary)"
                  },
                  children: devueltosDia[pk] > 0 ? `+${pk === "soda" ? Math.floor(devueltosDia[pk] / CAJON_SODA) : devueltosDia[pk]}` : "0"
                })]
              }, pk))]
            })]
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            ...s.sectionTitle,
            padding: "0 0 8px"
          },
          children: "LO QUE VUELVE A SODERÍA"
        }), /*#__PURE__*/_jsx("p", {
          style: {
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            margin: "-4px 0 10px"
          },
          children: "Contá lo que tenés físicamente en cada columna. Si coincide con el cálculo, dejalo así."
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 16px",
            padding: "10px 12px"
          },
          children: [["Soda", "soda"], ["10L", "b10"], ["20L", "b20"]].map(([label, pk]) => {
            const cajon = pk === "soda" ? CAJON_SODA : 1;
            const cols = [{
              tipo: "llenos",
              titulo: "Lleno",
              calc: Math.floor(sobrantes[pk] / cajon),
              stateObj: realesLlenos,
              setFn: setRealesLlenos
            }, {
              tipo: "pllenar",
              titulo: "Para llenar",
              calc: paraLlenarCalc[pk],
              stateObj: realesParaLlenar,
              setFn: setRealesParaLlenar
            }, {
              tipo: "vacios",
              titulo: "Vacío",
              calc: vaciosRestoCalc[pk],
              stateObj: realesVacios,
              setFn: setRealesVacios
            }];
            return /*#__PURE__*/_jsxs("div", {
              style: {
                borderTop: pk !== "soda" ? "0.5px solid var(--color-border-tertiary)" : "none",
                padding: "10px 0"
              },
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 6
                },
                children: [label, pk === "soda" ? " (cajones)" : ""]
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8
                },
                children: cols.map(({
                  tipo,
                  titulo,
                  calc,
                  stateObj,
                  setFn
                }) => {
                  const realVal = stateObj[pk] !== "" ? Number(stateObj[pk]) : calc;
                  const diff = realVal - calc;
                  return /*#__PURE__*/_jsxs("div", {
                    children: [/*#__PURE__*/_jsx("div", {
                      style: {
                        fontSize: 10,
                        color: "var(--color-text-tertiary)",
                        textAlign: "center",
                        marginBottom: 2
                      },
                      children: titulo
                    }), /*#__PURE__*/_jsxs("div", {
                      style: {
                        fontSize: 10,
                        color: "#5daaff",
                        textAlign: "center",
                        marginBottom: 3
                      },
                      children: ["calc. ", calc]
                    }), /*#__PURE__*/_jsx("input", {
                      type: "number",
                      min: 0,
                      value: stateObj[pk],
                      placeholder: String(calc),
                      style: {
                        padding: "6px 2px",
                        borderRadius: 7,
                        border: "1.5px solid var(--color-border-secondary)",
                        background: "var(--color-background-tertiary)",
                        color: "var(--color-text-primary)",
                        fontSize: 16,
                        textAlign: "center",
                        width: "100%",
                        boxSizing: "border-box"
                      },
                      onChange: e => setFn(r => ({
                        ...r,
                        [pk]: e.target.value
                      }))
                    }), diff !== 0 && /*#__PURE__*/_jsx("div", {
                      style: {
                        textAlign: "center",
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 600,
                        color: diff > 0 ? "var(--color-text-warning)" : "var(--color-text-danger)"
                      },
                      children: `${diff > 0 ? "+" : ""}${diff} dif.`
                    })]
                  }, tipo);
                })
              })]
            }, pk);
          })
        }), /*#__PURE__*/_jsx("button", {
          style: {
            width: "100%",
            padding: "16px",
            borderRadius: 10,
            border: "none",
            background: "var(--color-background-tertiary)",
            borderTop: "2px solid #f5b942",
            color: "#f5b942",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer"
          },
          onClick: confirmarCierre,
          children: "✓ Cerrar día y actualizar stock"
        })]
      })]
    });
  }
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: `Planilla · ${dia}`,
      onVolver: onVolver
    }), /*#__PURE__*/_jsx("div", {
      style: {
        padding: "0 14px",
        display: "flex",
        justifyContent: "flex-end",
        marginTop: -4,
        marginBottom: 6
      },
      children: /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: fecha
        }), planilla._autoGuardado && /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 10,
            color: "#4dd9a0",
            fontWeight: 500
          },
          children: "✓ Auto-guardado"
        }), planilla._stockActualizado && /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 10,
            color: "var(--color-text-info)",
            fontWeight: 500
          },
          children: "📦 Stock actualizado"
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          ...s.sectionTitle,
          padding: "0 0 8px"
        },
        children: "Al salir a repartir"
      }), /*#__PURE__*/_jsx("div", {
        style: s.grid3,
        children: [["fecha", "Fecha", "text"], ["peso", "Peso kg", "number"], ["bultos", "Bultos", "number"]].map(([k, l, t]) => /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: l
          }), /*#__PURE__*/_jsx("input", {
            style: s.inputNum,
            type: t,
            placeholder: t === "text" ? "dd/mm/aaaa" : "0",
            value: datos[k] || "",
            onChange: e => set(k, e.target.value)
          })]
        }, k))
      }), (pesoAuto > 0 || bultosAuto > 0) && /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginBottom: 10,
          lineHeight: 1.7,
          background: "var(--color-background-tertiary)",
          borderRadius: 8,
          padding: "6px 10px"
        },
        children: [bultosAuto > 0 && /*#__PURE__*/_jsxs("div", {
          children: ["📦 ", /*#__PURE__*/_jsx("b", {
            children: "Bultos auto:"
          }), " ", cajonesLlenos, " cajones soda + ", b10Llenos, " bid.10L + ", b20Llenos, " bid.20L = ", /*#__PURE__*/_jsx("b", {
            children: bultosAuto
          })]
        }), pesoAuto > 0 && /*#__PURE__*/_jsxs("div", {
          children: ["⚖️ ", /*#__PURE__*/_jsx("b", {
            children: "Peso auto:"
          }), " ", cajonesLlenos, "×13kg + ", b10Llenos, "×10kg + ", b20Llenos, "×20kg = ", /*#__PURE__*/_jsxs("b", {
            children: [pesoAuto, " kg"]
          })]
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          ...s.sectionTitle,
          padding: "12px 0 8px"
        },
        children: "Envases cargados (solo ingresá los llenos)"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          background: "var(--color-background-secondary)",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 4
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
            padding: "6px 10px",
            borderBottom: "0.5px solid var(--color-border-tertiary)"
          },
          children: ["Producto", "Llenos", "Vacíos", "Plata", "Llenar"].map(h => /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-secondary)",
              fontWeight: 500,
              textAlign: h === "Producto" ? "left" : "right"
            },
            children: h
          }, h))
        }), PRODUCTOS_CONFIG.map(p => {
          const auto = totalesPorProd[p.id];
          const esSoda = p.id === "soda";
          return /*#__PURE__*/_jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
              padding: "6px 10px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-primary)"
                },
                children: p.nombre
              }), esSoda && auto.cajones > 0 && /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 10,
                  color: "#f5b942"
                },
                children: [auto.cajones, " caj. (", auto.vacios, " un.)"]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("input", {
                type: "number",
                style: {
                  ...s.inputNum,
                  width: "100%",
                  fontSize: 13
                },
                value: datos.productos[p.id]?.llenos || "",
                onChange: e => setProd(p.id, "llenos", e.target.value),
                placeholder: "0"
              }), esSoda && datos.productos[p.id]?.llenos > 0 && /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)",
                  textAlign: "right"
                },
                children: [Math.floor((datos.productos[p.id]?.llenos || 0) / 6), " caj."]
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: esSoda ? `${auto.cajones || "—"} caj` : auto.vacios || "—"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                fontSize: 13,
                color: "var(--color-text-primary)"
              },
              children: auto.plata ? fmt(auto.plata).replace("$", "") : "—"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                textAlign: "right",
                fontSize: 13,
                color: "var(--color-text-danger)"
              },
              children: auto.llenar ? fmt(auto.llenar).replace("$", "") : "—"
            })]
          }, p.id);
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
            padding: "8px 10px",
            background: "var(--color-background-tertiary)"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              fontWeight: 500
            },
            children: "Totales"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              textAlign: "right",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: totalLlenosIngresados || "—"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              textAlign: "right",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: Object.values(totalesPorProd).reduce((a, p) => a + p.vacios, 0) || "—"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              textAlign: "right",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: totalVentaPlata ? fmt(totalVentaPlata).replace("$", "") : "—"
          }), /*#__PURE__*/_jsx("div", {
            style: {
              textAlign: "right",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-danger)"
            },
            children: totalVentaLlenar ? fmt(totalVentaLlenar).replace("$", "") : "—"
          })]
        })]
      }), /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginBottom: 12
        },
        children: "Vacíos, plata y llenar se calculan automáticamente desde las ventas del día."
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 11,
            color: "var(--color-text-secondary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.06em"
          },
          children: "Gastos extras (efectivo)"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 12,
            padding: "4px 12px"
          },
          onClick: addGasto,
          children: "+ Agregar"
        })]
      }), (datos.gastos || []).length === 0 && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text-tertiary)",
          marginBottom: 8
        },
        children: "Sin gastos extras"
      }), (datos.gastos || []).map((g, i) => g.confirmado ? /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: "0 0 6px",
          background: "var(--color-background-tertiary)",
          borderLeft: "3px solid #4dd9a0",
          padding: "10px 12px"
        },
        children: /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: [g.cat.charAt(0).toUpperCase() + g.cat.slice(1), g.desc ? ` · ${g.desc}` : ""]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-danger)",
                marginTop: 2
              },
              children: ["−", fmt(num(g.monto))]
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
                padding: "3px 10px"
              },
              onClick: () => setGasto(i, "confirmado", false),
              children: "Editar"
            }), /*#__PURE__*/_jsx("button", {
              style: s.btnDanger,
              onClick: () => delGasto(i),
              children: "✕"
            })]
          })]
        })
      }, i) : /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 6px",
          padding: "10px 12px"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 6,
            marginBottom: 6
          },
          children: [/*#__PURE__*/_jsx("select", {
            style: {
              ...s.select,
              flex: 1
            },
            value: g.cat,
            onChange: e => setGasto(i, "cat", e.target.value),
            children: GASTOS_CATEGORIAS.map(c => /*#__PURE__*/_jsx("option", {
              value: c,
              children: c.charAt(0).toUpperCase() + c.slice(1)
            }, c))
          }), /*#__PURE__*/_jsx("input", {
            style: {
              ...s.inputNum,
              flex: 1
            },
            type: "number",
            placeholder: "Monto $",
            value: g.monto || "",
            onChange: e => setGasto(i, "monto", e.target.value)
          })]
        }), /*#__PURE__*/_jsx("input", {
          style: {
            ...s.input,
            marginBottom: 6
          },
          placeholder: "Descripción (opcional)",
          value: g.desc || "",
          onChange: e => setGasto(i, "desc", e.target.value)
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 6
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              flex: 1,
              padding: "7px",
              borderRadius: 8,
              border: "none",
              background: "#0a2e1f",
              color: "#4dd9a0",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              opacity: !g.monto ? 0.5 : 1
            },
            disabled: !g.monto,
            onClick: () => setGasto(i, "confirmado", true),
            children: "✓ Confirmar y guardar"
          }), /*#__PURE__*/_jsx("button", {
            style: s.btnDanger,
            onClick: () => delGasto(i),
            children: "✕"
          })]
        })]
      }, i)), totalGastos > 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          padding: "6px 0",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          marginBottom: 8
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            color: "var(--color-text-secondary)"
          },
          children: "Total gastos extras"
        }), /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-danger)"
          },
          children: ["−", fmt(totalGastos)]
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0 8px"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.07em"
          },
          children: "Cobranza del día"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 11,
            padding: "3px 10px"
          },
          onClick: () => setDatos(d => ({
            ...d,
            peso: String(pesoAuto || d.peso || ""),
            efectivo: String(Math.round(cobEfectivo)),
            retenciones: String(cobTransDesc),
            fiado: String(Math.round(cobFiado))
          })),
          children: "↻ Autocompletar desde ventas"
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.grid3,
        children: [["efectivo", "Efectivo"], ["fiado", "Fiado"], ["retenciones", "Retención 2.5%"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
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
            placeholder: "0",
            value: datos[k] || "",
            onChange: e => set(k, e.target.value)
          })]
        }, k))
      }), cobTransBruto > 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "10px 0",
          background: "var(--color-background-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            marginBottom: 8
          },
          children: "Detalle transferencias"
        }), [["Monto bruto", fmt(cobTransBruto), "primary"], ["Retención 2.5%", `−${fmt(cobTransDesc)}`, "danger"], ["Neto recibido", fmt(cobTransNeto), "success"]].map(([l, v, c]) => /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
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
              fontWeight: 500,
              color: `var(--color-text-${c})`
            },
            children: v
          })]
        }, l))]
      }), cobSaldos > 0 && /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          background: "var(--color-background-tertiary)"
        },
        children: /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)"
            },
            children: "Cobrado de deuda anterior"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#4dd9a0"
            },
            children: fmt(cobSaldos)
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginTop: 12
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Observaciones"
        }), /*#__PURE__*/_jsx("textarea", {
          style: {
            ...s.input,
            minHeight: 56,
            resize: "vertical"
          },
          placeholder: "Notas del día...",
          value: datos.obs || "",
          onChange: e => set("obs", e.target.value)
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsxs("div", {
        id: "planilla-capture",
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            ...s.sectionTitle,
            padding: "0 0 10px"
          },
          children: "Resumen del día"
        }), ventasPropias.length > 0 ? /*#__PURE__*/_jsx(DetalleVentasDia, {
          ventas: ventasPropias,
          clientes: clientes,
          prospectos: prospectos,
          noVisitas: noVisitas,
          fecha: fecha
        }) : /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            padding: "12px 16px",
            background: "var(--color-background-tertiary)"
          },
          children: /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-tertiary)"
            },
            children: "📋 Sin ventas registradas para este día"
          })
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            background: "var(--color-background-secondary)",
            padding: "14px 16px"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Ventas registradas"
          }), [["Contado (efectivo)", fmt(cobEfectivo), "primary"], ["Transferencias", fmt(cobTransBruto), "info"], ["Fiado del día", fmt(cobFiado), "warning"]].map(([l, v, c]) => /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: l
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: `var(--color-text-${c})`
              },
              children: v
            })]
          }, l)), cobSaldosEfec > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "+ Cobro deuda · efectivo"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-success)"
              },
              children: fmt(cobSaldosEfec)
            })]
          }), cobSaldosTrans > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "+ Cobro deuda · transferencia"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-info)"
              },
              children: fmt(cobSaldosTrans)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0 2px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Total cobrado"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: fmt(cobEfectivo + cobTransBruto)
            })]
          })]
        }), ventasExtraDia.length > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            background: "var(--color-background-secondary)",
            padding: "14px 16px",
            borderLeft: "3px solid var(--color-border-info)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-info)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: ["📦 Ventas de otros días (", ventasExtraDia.length, ")"]
          }), ventasExtraDia.map(v => {
            const c = (clientes || []).find(x => x.id === v.clienteId);
            return /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: "0.5px solid var(--color-border-tertiary)"
              },
              children: [/*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: 12,
                  color: "var(--color-text-secondary)"
                },
                children: [c?.nombre || "Cliente", " ", /*#__PURE__*/_jsxs("span", {
                  style: {
                    color: "var(--color-text-tertiary)"
                  },
                  children: ["· ", c?.dia]
                })]
              }), /*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-info)"
                },
                children: fmt(v.pagadoNum || v.neto || 0)
              })]
            }, v.id);
          }), extraEfectivo > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "Contado"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-primary)"
              },
              children: fmt(extraEfectivo)
            })]
          }), extraTrans > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "Transfer."
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-info)"
              },
              children: fmt(extraTrans)
            })]
          }), extraFiado > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "Fiado"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-warning)"
              },
              children: fmt(extraFiado)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0 2px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Total otros días"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-info)"
              },
              children: fmt(extraTotal)
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            padding: "14px 16px"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Efectivo en mano"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "Efectivo cobrado (contado)"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-primary)"
              },
              children: fmt(cobEfectivo)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-danger)"
              },
              children: "− Llenado de envases"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-danger)"
              },
              children: fmt(totalVentaLlenar)
            })]
          }), totalGastos > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-danger)"
              },
              children: "− Gastos extras"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-danger)"
              },
              children: fmt(totalGastos)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0 2px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Efectivo en mano"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 18,
                fontWeight: 500,
                color: cobEfectivo - totalVentaLlenar - totalGastos >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"
              },
              children: fmt(cobEfectivo - totalVentaLlenar - totalGastos)
            })]
          })]
        }), cobTransBruto > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            padding: "14px 16px"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Transferencias"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "Monto total"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-primary)"
              },
              children: fmt(cobTransBruto)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 12,
                color: "var(--color-text-tertiary)"
              },
              children: "Retención 2.5% (informativo)"
            }), /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 12,
                color: "var(--color-text-danger)"
              },
              children: ["−", fmt(cobTransDesc)]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0 2px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Neto a acreditar"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-info)"
              },
              children: fmt(cobTransNeto)
            })]
          }), /*#__PURE__*/_jsx(DetalleTransferencias, {
            ventas: ventasPropias.filter(v => v.pago === "transferencia" || v.pago === "mixto" && (Number(v.montoTrans) || 0) > 0),
            ventasPendTrans: ventasPendTrans
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 8px",
            padding: "14px 16px"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Fiado pendiente"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "Fiado del día"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-primary)"
              },
              children: fmt(cobFiado)
            })]
          }), cobSaldos > 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "0.5px solid var(--color-border-tertiary)"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-secondary)"
              },
              children: "− Cobros de saldos anteriores"
            }), /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 13,
                color: "var(--color-text-success)"
              },
              children: ["−", fmt(cobSaldos)]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0 2px"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "Fiado neto pendiente"
            }), /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 16,
                fontWeight: 500,
                color: fiadoNeto > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"
              },
              children: [fmt(Math.abs(fiadoNeto)), fiadoNeto < 0 ? " (a favor)" : ""]
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 16px",
            padding: "14px 16px",
            background: "var(--color-background-secondary)"
          },
          children: /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--color-text-primary)"
                },
                children: "Ganancia neta del día"
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginTop: 2
                },
                children: "Total cobrado − Llenado − Gastos"
              })]
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 22,
                fontWeight: 500,
                color: ganancia >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"
              },
              children: fmt(ganancia)
            })]
          })
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: s.btnPrimary,
        onClick: () => onGuardar(datos),
        children: "Guardar planilla"
      }), onCerrarDia && ventas.length > 0 && (() => {
        const MAX_ENVIOS = 3;
        const envios = enviosInforme;
        const quedan = MAX_ENVIOS - envios;
        const agotado = quedan <= 0;
        return /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btnPrimary,
            background: agotado ? "#555" : envios > 0 ? "#0F6E56" : "#8B2FC9",
            marginTop: 8,
            width: "100%",
            cursor: agotado ? "default" : "pointer",
            opacity: agotado ? 0.7 : 1
          },
          onClick: async () => {
            if (agotado) {
              alert(`Ya enviaste el informe del día ${MAX_ENVIOS} veces (el máximo). Revisá tu email, incluida la carpeta de spam.`);
              return;
            }
            let imgData = null;
            try {
              const el = document.getElementById("planilla-capture");
              if (el && window.html2canvas) {
                const canvas = await window.html2canvas(el, {
                  scale: 1.5,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--color-background-primary").trim() || "#0f1923",
                  scrollY: 0,
                  scrollX: 0,
                  width: el.offsetWidth,
                  height: el.scrollHeight,
                  windowWidth: el.offsetWidth,
                  windowHeight: el.scrollHeight
                });
                imgData = canvas.toDataURL("image/jpeg", 0.78);
              }
            } catch (e) {
              console.warn("Captura falló:", e);
            }
            const ok = await onCerrarDia(imgData);
            if (ok) {
              setEnviosInforme(Number(localStorage.getItem(`sr_informe_${fecha}_${dia}`) || envios + 1));
              alert(`✅ Informe enviado a tu email correctamente.${quedan - 1 > 0 ? `\n\nSi no te llega, podés reenviarlo ${quedan - 1} ${quedan - 1 === 1 ? "vez" : "veces"} más.` : ""}`);
            } else {
              alert("❌ No se pudo enviar el informe. Verificá tu conexión e intentá de nuevo.");
            }
          },
          children: agotado ? "✓ Informe enviado (máximo alcanzado)" : envios > 0 ? `🔄 Reenviar informe (${quedan} ${quedan === 1 ? "envío" : "envíos"} restante${quedan === 1 ? "" : "s"})` : "📧 Cerrar día y enviar informe"
        });
      })(), !yaCerrado ? /*#__PURE__*/_jsx("button", {
        style: {
          width: "100%",
          padding: "14px",
          borderRadius: 10,
          border: "2px solid #f5b942",
          background: "#2e1f06",
          color: "#f5b942",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          marginTop: 10
        },
        onClick: () => setMostrarCierre(true),
        children: "🔒 Cerrar el día y actualizar stock"
      }) : /*#__PURE__*/_jsx("div", {
        style: {
          textAlign: "center",
          padding: "12px",
          borderRadius: 10,
          background: "rgba(29,158,117,0.15)",
          color: "#4dd9a0",
          fontSize: 13,
          fontWeight: 500,
          marginTop: 10
        },
        children: "✅ Día cerrado — stock actualizado"
      })]
    })]
  });
}
function InicioReparto({
  dia,
  fecha,
  planilla,
  productos,
  cargasDia,
  stock,
  onGuardar,
  onVolver
}) {
  const prodKeys = {
    "Sifón 1.5L": "soda",
    "Bidón 10L": "b10",
    "Bidón 20L": "b20"
  };
  const CAJON = 6; // sifones por cajón
  const [llenos, setLlenos] = useState(() => {
    const precarga = (cargasDia || CARGA_DIA_DEFAULT)[dia] || CARGA_DIA_DEFAULT[dia] || {};
    const m = {};
    productos.forEach(p => {
      const k = prodKeys[p.nombre];
      if (k) m[k] = planilla?.productos?.[k]?.llenos || precarga[k] || "";
    });
    return m;
  });
  const yaIniciado = planilla?.iniciado;
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: `Inicio del reparto · ${dia}`,
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 16px",
          background: "var(--color-background-info)",
          border: "0.5px solid var(--color-border-info)"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-info)",
            marginBottom: 4
          },
          children: ["📅 ", dia, " · ", fecha ? new Date(fecha + 'T12:00:00').toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }) : ""]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            color: "var(--color-text-secondary)"
          },
          children: yaIniciado ? "Podés modificar las cantidades iniciales si hay un error." : "Ingresá la cantidad de envases llenos con los que salís hoy."
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          ...s.sectionTitle,
          padding: "0 0 10px"
        },
        children: "Envases llenos al salir"
      }), productos.map(p => {
        const k = prodKeys[p.nombre];
        if (!k) return null;
        return /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
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
                color: "var(--color-text-secondary)"
              },
              children: [fmt(p.precio), " c/u"]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [/*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "6px 18px",
                fontSize: 22,
                lineHeight: 1
              },
              onClick: () => setLlenos(l => ({
                ...l,
                [k]: Math.max(0, (Number(l[k]) || 0) - (k === "soda" ? CAJON : 1))
              })),
              children: k === "soda" ? "-caj" : "-"
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                textAlign: "center",
                minWidth: 50
              },
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--color-text-primary)"
                },
                children: llenos[k] || 0
              }), k === "soda" && /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: 10,
                  color: "var(--color-text-tertiary)"
                },
                children: [Math.floor((llenos[k] || 0) / CAJON), "caj+", (llenos[k] || 0) % CAJON, "un"]
              })]
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                padding: "6px 18px",
                fontSize: 22,
                lineHeight: 1
              },
              onClick: () => setLlenos(l => ({
                ...l,
                [k]: (Number(l[k]) || 0) + (k === "soda" ? CAJON : 1)
              })),
              children: k === "soda" ? "+caj" : "+"
            })]
          })]
        }, p.id);
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "12px 0 20px",
          background: "var(--color-background-secondary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            color: "var(--color-text-secondary)",
            marginBottom: 6
          },
          children: "Total envases cargados"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 28,
            fontWeight: 500,
            color: "var(--color-text-primary)"
          },
          children: Object.values(llenos).reduce((a, v) => a + (Number(v) || 0), 0)
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: s.btnPrimary,
        onClick: () => {
          const nuevaPlanilla = {
            ...(planilla || planillaDiaVacia()),
            iniciado: true,
            productos: {
              ...(planilla?.productos || {}),
              ...Object.fromEntries(Object.entries(llenos).map(([k, v]) => [k, {
                ...(planilla?.productos?.[k] || {}),
                llenos: v
              }]))
            }
          };
          onGuardar(nuevaPlanilla, true);
        },
        children: yaIniciado ? "Actualizar y continuar →" : "🚀 Iniciar y descontar de sodería"
      })]
    }), stock?.soderia && /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.card,
        margin: "10px 14px 0",
        background: "var(--color-background-tertiary)"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          marginBottom: 8
        },
        children: "Stock actual · Sodería"
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "flex",
          gap: 16
        },
        children: [["Sifón", stock?.soderia?.sifon || 0], ["Bidón 10L", stock?.soderia?.bidon10 || 0], ["Bidón 20L", stock?.soderia?.bidon20 || 0]].map(([l, v]) => /*#__PURE__*/_jsxs("div", {
          style: {
            textAlign: "center"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-tertiary)"
            },
            children: l
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 18,
              fontWeight: 500,
              color: v > 0 ? "var(--color-text-primary)" : "var(--color-text-danger)"
            },
            children: v || 0
          })]
        }, l))
      })]
    })]
  });
}