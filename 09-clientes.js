import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ════════════════════════════════════════════════════════════════════
// ◆  09-clientes.js — ListaClientes · DetalleCliente · EditCliente · EditVenta · Modals
// ════════════════════════════════════════════════════════════════════

// Barra de pestañas compartida entre Gestión/Fiados/Dormidos/Mapa — antes
// esto no existía en Multi, por eso esas 4 pantallas no se sentían
// conectadas entre sí como en La Catalina y la Individual.
function ClientesTabs({
  activo,
  onIr
}) {
  const tabs = [["todos", "👥", "Todos", "gestionClientes"], ["fiados", "💰", "Fiados", "fiadosPendientes"], ["dormidos", "😴", "Dormidos", "clientesDormidos"], ["mapa", "🗺", "Mapa", "mapaClientes"]];
  return /*#__PURE__*/_jsx("div", {
    style: {
      display: "flex",
      gap: 4,
      padding: "8px 8px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      background: "var(--color-background-secondary)"
    },
    children: tabs.map(([id, ico, lbl, pant]) => /*#__PURE__*/_jsxs("button", {
      onClick: () => activo !== id && onIr && onIr(pant),
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "6px 2px",
        borderRadius: 9,
        cursor: "pointer",
        border: "none",
        background: activo === id ? "var(--color-background-tertiary)" : "transparent",
        borderBottom: activo === id ? "2px solid var(--color-accent)" : "2px solid transparent"
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 16
        },
        children: ico
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 10,
          fontWeight: activo === id ? 600 : 400,
          color: activo === id ? "var(--color-text-primary)" : "var(--color-text-tertiary)"
        },
        children: lbl
      })]
    }, id))
  });
}
function ListaClientes({
  clientes,
  dia,
  fecha,
  ventas,
  todasVentas,
  noVisitas,
  prospectos,
  recordatorios,
  onSeleccionar,
  onEntregar,
  onNuevoCliente,
  onVolver,
  onReordenar,
  onEditarCliente,
  onRegistrarNoVisita,
  onQuitarNoVisita,
  onVentaProspecto,
  onNoEstaProspecto,
  onNoQuiereProspecto,
  onConfirmarTransfer,
  onVerProspecto,
  onAbrirMapa,
  onIrPlanilla,
  onIrMenu
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteMoviendo, setClienteMoviendo] = useState(null); // id del cliente "levantado", esperando destino
  // ventas y noVisitas ya filtradas por fecha+dia desde App
  const atendidos = new Set(ventas.filter(v => !v._esCobro && !v._esAjuste).map(v => v.clienteId));
  const noVMap = {};
  (noVisitas || []).filter(v => v.fecha === fecha).forEach(v => {
    noVMap[v.clienteId] = v.motivo;
  });
  // visitados = ventas + noesta2 + noquiso (noesta 1ra vez NO cuenta)
  const visitadosSinVenta = new Set(Object.entries(noVMap).filter(([, m]) => m === "noesta2" || m === "noquiso").map(([id]) => Number(id)));
  const visitados = new Set([...atendidos, ...visitadosSinVenta]);
  const prospectosDelDia = (prospectos || []).filter(p => p.dia === dia && p.estado === "activo");
  const visitadosProspectos = new Set(ventas.filter(v => prospectosDelDia.some(p => p.id === v.clienteId)).map(v => v.clienteId));
  const marcarNoVisita = (id, motivo) => {
    const prev = noVMap[id];
    if (motivo === "noesta" && prev === "noesta") onRegistrarNoVisita(id, "noesta2");else if (prev === motivo) onQuitarNoVisita(id);else onRegistrarNoVisita(id, motivo);
  };
  const clientesOrdenados = [...clientes].sort((a, b) => (a.orden || 9999) - (b.orden || 9999));
  const filtrados = clientesOrdenados.filter(c => buscarCliente(c, busqueda) > 0);
  const pendientesNormales = filtrados.filter(c => !visitados.has(c.id) && noVMap[c.id] !== "noesta");
  const volverAlFinal = filtrados.filter(c => noVMap[c.id] === "noesta" && !atendidos.has(c.id));
  const pendientes = [...pendientesNormales, ...volverAlFinal];
  const sinEntrega = filtrados.filter(c => visitadosSinVenta.has(c.id));
  const listos = filtrados.filter(c => atendidos.has(c.id));
  const abrirRuta = () => {
    const cp = pendientes.filter(c => c.maps).slice(0, 9);
    if (!cp.length) {
      alert("Ningún pendiente tiene Maps cargado.");
      return;
    }
    const dest = encodeURIComponent(cp[cp.length - 1].maps);
    const wps = cp.slice(0, -1).map(c => encodeURIComponent(c.maps)).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1${wps ? `&waypoints=${wps}` : ""}&destination=${dest}&travelmode=driving`, "_blank");
  };
  const moverCliente = (idOrigen, idDestino) => {
    if (idOrigen === idDestino) return;
    const ordenActual = clientesOrdenados.map(c => c.id);
    const idxOrigen = ordenActual.indexOf(idOrigen);
    const idxDestino = ordenActual.indexOf(idDestino);
    if (idxOrigen === -1 || idxDestino === -1) return;
    const nuevoOrden = [...ordenActual];
    const [item] = nuevoOrden.splice(idxOrigen, 1);
    nuevoOrden.splice(idxDestino, 0, item);
    const posMap = {};
    nuevoOrden.forEach((id, i) => {
      posMap[id] = i + 1;
    });
    onReordenar(clientes.map(c => posMap[c.id] !== undefined ? {
      ...c,
      orden: posMap[c.id]
    } : c));
  };
  const Card = ({
    c
  }) => {
    const [fotoOpen, setFotoOpen] = React.useState(false);
    const esProspecto = !!c._esProspecto;
    const atendido = esProspecto ? visitadosProspectos.has(c.id) : atendidos.has(c.id);
    const est = noVMap[c.id];
    // Borde naranja para prospectos, verde/amarillo/rojo para clientes normales
    const bc = esProspecto ? "#f5b942" : atendido ? "#1D9E75" : est === "noesta" ? "#EF9F27" : est === "noesta2" || est === "noquiso" ? "#E24B4A" : "var(--color-border-tertiary)";
    const handleClick = () => esProspecto ? onVerProspecto && onVerProspecto(c) : onSeleccionar(c);
    return /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          borderLeft: `3px solid ${bc}`,
          opacity: visitados.has(c.id) ? 0.65 : est === "noesta" ? 0.85 : 1
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "flex-start",
            gap: 8
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              flexShrink: 0,
              paddingTop: 2
            },
            onClick: () => {
              if (atendido) return;
              if (clienteMoviendo === null) setClienteMoviendo(c.id);else if (clienteMoviendo === c.id) setClienteMoviendo(null);else {
                moverCliente(clienteMoviendo, c.id);
                setClienteMoviendo(null);
              }
            },
            children: /*#__PURE__*/_jsx("div", {
              style: {
                width: 34,
                height: 34,
                borderRadius: 8,
                background: clienteMoviendo === c.id ? "#185FA5" : clienteMoviendo && !atendido ? "var(--color-background-warning)" : "var(--color-background-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                color: clienteMoviendo === c.id ? "#fff" : clienteMoviendo && !atendido ? "var(--color-text-warning)" : "var(--color-text-secondary)",
                cursor: atendido ? "default" : "pointer",
                border: clienteMoviendo === c.id ? "1.5px solid #5daaff" : "0.5px solid var(--color-border-tertiary)"
              },
              children: clienteMoviendo === c.id ? "✓" : c.orden || "#"
            })
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              flex: 1,
              cursor: "pointer",
              minWidth: 0
            },
            onClick: handleClick,
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6
              },
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  fontWeight: 500,
                  fontSize: 15,
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                },
                children: [c.nombre, c.foto && /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 10,
                    color: "#4dd9a0",
                    flexShrink: 0,
                    marginLeft: 3
                  },
                  children: "📷"
                })]
              }), (recordatorios || []).some(r => r.clienteId === c.id && !r.confirmado) && /*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: 13,
                  flexShrink: 0
                },
                title: "Recordatorio pendiente",
                children: "🔔"
              }), (() => {
                const vt = ventas.find(v => v.clienteId === c.id && v.fechaKey === fecha && (v.pago === "transferencia" || v.pago === "mixto"));
                if (!vt) return null;
                // Para mixto mostrar solo la parte de transferencia, no el total
                const montoTransfer = vt.pago === "mixto" ? vt.montoTrans || 0 : vt.pagadoNum || vt.neto || 0;
                if (montoTransfer === 0) return null;
                return /*#__PURE__*/_jsxs("button", {
                  style: {
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 4px",
                    lineHeight: 1,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    borderRadius: 6,
                    background: vt.transConfirmada ? "transparent" : "rgba(245,185,66,0.15)"
                  },
                  onClick: e => {
                    e.stopPropagation();
                    onConfirmarTransfer && onConfirmarTransfer(c.id, vt.id);
                  },
                  title: vt.transConfirmada ? "Transfer. confirmada — tocá para desmarcar" : "Tocá para confirmar transferencia",
                  children: [/*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 15
                    },
                    children: vt.transConfirmada ? "🟢" : "🔴"
                  }), !vt.transConfirmada && /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#f5b942"
                    },
                    children: fmt(montoTransfer)
                  })]
                });
              })()]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 17,
                color: "var(--color-text-secondary)",
                marginTop: 2
              },
              children: direccionCliente(c)
            }), c.notas && /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-warning)",
                marginTop: 2
              },
              children: ["📝 ", c.notas]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginTop: 5
              },
              children: [/*#__PURE__*/_jsx(TagsCliente, {
                cliente: c,
                ventas: todasVentas || ventas
              }), atendido && /*#__PURE__*/_jsx("span", {
                style: s.badge("success"),
                children: "✓ Listo"
              }), est === "noesta" && !atendido && /*#__PURE__*/_jsx("span", {
                style: s.badge("warning"),
                children: "🔄 No estaba aún"
              }), est === "noesta2" && /*#__PURE__*/_jsx("span", {
                style: s.badge("warning"),
                children: "No estaba"
              }), est === "noquiso" && /*#__PURE__*/_jsx("span", {
                style: s.badge("danger"),
                children: "No quiso"
              })]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flexShrink: 0,
              alignItems: "center"
            },
            children: [(c.maps || c.lat && c.lng) && /*#__PURE__*/_jsx("a", {
              href: c.maps || `https://www.google.com/maps?q=${c.lat},${c.lng}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                fontSize: 20,
                textDecoration: "none"
              },
              children: "📍"
            }), c.telefono && /*#__PURE__*/_jsx("a", {
              href: `https://wa.me/54${c.telefono}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                fontSize: 20,
                textDecoration: "none"
              },
              children: "💬"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1
              },
              title: "Foto domicilio",
              onClick: e => {
                e.stopPropagation();
                setFotoOpen(true);
              },
              children: "📷"
            })]
          })]
        }), (!visitados.has(c.id) || est === "noesta") && !atendido && !esProspecto && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginTop: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-warning)",
              color: "var(--color-text-warning)",
              border: "1px solid var(--color-border-warning)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1
            },
            onClick: () => marcarNoVisita(c.id, est === "noesta" ? "noesta2" : "noesta"),
            children: est === "noesta" ? "2ª vez" : "🔄 No está"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-danger)",
              color: "var(--color-text-danger)",
              border: "1px solid var(--color-border-danger)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1
            },
            onClick: () => marcarNoVisita(c.id, "noquiso"),
            children: "No quiere"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "#185FA5",
              color: "#e2eaf4",
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 600,
              flex: 2
            },
            onClick: () => (onEntregar || onSeleccionar)(c),
            children: "Entregar →"
          })]
        }), !visitadosProspectos.has(c.id) && !atendido && esProspecto && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginTop: 10
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-warning)",
              color: "var(--color-text-warning)",
              border: "1px solid var(--color-border-warning)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1
            },
            onClick: () => onNoEstaProspecto && onNoEstaProspecto(c.id),
            children: "🔄 No está"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-danger)",
              color: "var(--color-text-danger)",
              border: "1px solid var(--color-border-danger)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1
            },
            onClick: () => onNoQuiereProspecto && onNoQuiereProspecto(c.id),
            children: "No quiere"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "#185FA5",
              color: "#e2eaf4",
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 600,
              flex: 2
            },
            onClick: () => onVentaProspecto && onVentaProspecto(c),
            children: "Entregar →"
          })]
        }), (est === "noesta2" || est === "noquiso") && !atendido && /*#__PURE__*/_jsx("div", {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 6
          },
          children: /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              fontSize: 12,
              padding: "4px 10px"
            },
            onClick: () => onQuitarNoVisita(c.id),
            children: "Desmarcar"
          })
        }), onEditarCliente && /*#__PURE__*/_jsx(PieEnvases, {
          c: c,
          ventas: todasVentas || ventas,
          onEditar: onEditarCliente
        })]
      }), fotoOpen && /*#__PURE__*/_jsxs("div", {
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
          setFotoOpen(false);
        },
        children: [c.foto ? /*#__PURE__*/_jsx("img", {
          src: c.foto,
          alt: "Domicilio",
          style: {
            maxWidth: "100%",
            maxHeight: "60vh",
            borderRadius: 10,
            objectFit: "contain",
            marginBottom: 16
          }
        }) : /*#__PURE__*/_jsxs("div", {
          style: {
            color: "#aaa",
            fontSize: 14,
            marginBottom: 20
          },
          children: ["Sin foto · ", c.nombre]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 12
          },
          onClick: e => e.stopPropagation(),
          children: [/*#__PURE__*/_jsxs("label", {
            style: {
              background: "#185FA5",
              color: "#e2eaf4",
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center"
            },
            children: ["📷 Cámara", /*#__PURE__*/_jsx("input", {
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
                onReordenar(clientes.map(x => x.id === c.id ? {
                  ...x,
                  foto: b64
                } : x));
                setFotoOpen(false);
              }
            })]
          }), /*#__PURE__*/_jsxs("label", {
            style: {
              background: "#2a3a4a",
              color: "#e2eaf4",
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center"
            },
            children: ["🖼 Galería", /*#__PURE__*/_jsx("input", {
              type: "file",
              accept: "image/*",
              style: {
                display: "none"
              },
              onChange: async e => {
                const f = e.target.files[0];
                if (!f) return;
                const b64 = await comprimirFoto(f);
                onReordenar(clientes.map(x => x.id === c.id ? {
                  ...x,
                  foto: b64
                } : x));
                setFotoOpen(false);
              }
            })]
          }), c.foto && /*#__PURE__*/_jsx("button", {
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
              onReordenar(clientes.map(x => x.id === c.id ? {
                ...x,
                foto: ""
              } : x));
              setFotoOpen(false);
            },
            children: "🗑"
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            color: "#aaa",
            fontSize: 11,
            marginTop: 14
          },
          children: "Tocá fuera para cerrar"
        })]
      })]
    });
  };
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: `Clientes · ${dia}`,
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "10px 16px 6px"
      },
      children: [/*#__PURE__*/_jsx("input", {
        style: s.input,
        placeholder: "Buscar por domicilio o nombre...",
        value: busqueda,
        onChange: e => setBusqueda(e.target.value)
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 6,
          marginTop: 8,
          flexWrap: "wrap",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxs("span", {
          style: s.badge("success"),
          children: [visitados.size, "/", clientes.length, " visitados"]
        }), volverAlFinal.length > 0 && /*#__PURE__*/_jsxs("span", {
          style: s.badge("warning"),
          children: [volverAlFinal.length, " volver al final"]
        }), sinEntrega.length > 0 && /*#__PURE__*/_jsxs("span", {
          style: s.badge("danger"),
          children: [sinEntrega.length, " sin entrega"]
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
          onClick: onNuevoCliente,
          children: "+ Nuevo"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 11,
            padding: "3px 10px"
          },
          onClick: onAbrirMapa || abrirRuta,
          children: "🗺 Mapa"
        })]
      }), /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 11,
          color: clienteMoviendo ? "var(--color-text-warning)" : "var(--color-text-tertiary)",
          marginTop: 6,
          fontWeight: clienteMoviendo ? 600 : 400
        },
        children: clienteMoviendo ? `📍 Tocá el # de dónde debería ir "${clientes.find(c => c.id === clienteMoviendo)?.nombre || ""}" (tocá el mismo para cancelar)` : "Tocá el # de un cliente para moverlo, después tocá dónde debería ir"
      })]
    }), filtrados.length === 0 && /*#__PURE__*/_jsxs("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: "var(--color-text-tertiary)",
        fontSize: 14
      },
      children: ["No hay clientes para ", dia, "."]
    }), pendientesNormales.length > 0 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("span", {
        style: s.sectionTitle,
        children: ["Pendientes (", pendientesNormales.length, ")"]
      }), pendientesNormales.map(c => /*#__PURE__*/_jsx(Card, {
        c: c
      }, c.id))]
    }), volverAlFinal.length > 0 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("span", {
        style: {
          ...s.sectionTitle,
          color: "#f5b942"
        },
        children: ["🔄 Volver a visitar (", volverAlFinal.length, ")"]
      }), volverAlFinal.map(c => /*#__PURE__*/_jsx(Card, {
        c: c
      }, c.id))]
    }), listos.length > 0 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("span", {
        style: s.sectionTitle,
        children: ["Entregado (", listos.length, ")"]
      }), listos.map(c => /*#__PURE__*/_jsx(Card, {
        c: c
      }, c.id))]
    }), sinEntrega.length > 0 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsxs("span", {
        style: s.sectionTitle,
        children: ["Sin entrega (", sinEntrega.length, ")"]
      }), sinEntrega.map(c => /*#__PURE__*/_jsx(Card, {
        c: c
      }, c.id))]
    }), pendientes.length === 0 && clientes.length > 0 && /*#__PURE__*/_jsx("div", {
      style: {
        margin: "12px 14px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      children: /*#__PURE__*/_jsxs("div", {
        style: {
          background: "#0a2e1f",
          border: "1.5px solid #4dd9a0",
          borderRadius: 14,
          padding: "16px 20px",
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 28,
            marginBottom: 6
          },
          children: "🎉"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            color: "#4dd9a0",
            marginBottom: 4
          },
          children: "¡Todos visitados!"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginBottom: 14
          },
          children: "Completaste todos los clientes del día."
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [onIrPlanilla && /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              flex: 1,
              background: "#185FA5"
            },
            onClick: onIrPlanilla,
            children: "📋 Ver planilla del día"
          }), onIrMenu && /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              flex: 1,
              background: "#1a8a4a"
            },
            onClick: onIrMenu,
            children: "🏠 Menú principal"
          })]
        })]
      })
    })]
  });
}
function DetalleCliente({
  cliente,
  ventas,
  dia,
  fecha,
  productos,
  onVenta,
  onVolver,
  onEditar,
  onEliminarVenta,
  onEditarVenta,
  onEliminarCliente,
  onNoEstaCliente,
  onNoQuiereCliente,
  recordatorios,
  onGuardarRecordatorio,
  onConfirmarRecordatorio,
  onCobrarSaldo,
  soloLectura = false,
  onGuardarCambio
}) {
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [editandoVentaId, setEditandoVentaId] = useState(null);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [tipoSaldoEdit, setTipoSaldoEdit] = useState("");
  const [montoSaldoEdit, setMontoSaldoEdit] = useState("");
  const [mostrarRecordatorio, setMostrarRecordatorio] = useState(false);
  const [mostrarPagoSaldo, setMostrarPagoSaldo] = useState(false);
  const [mostrarFotoGrande, setMostrarFotoGrande] = useState(false);
  const [mostrarCambio, setMostrarCambio] = useState(false);
  const [productoViejoCambio, setProductoViejoCambio] = useState("Bidón 20L");
  const [productoNuevoCambio, setProductoNuevoCambio] = useState("Bidón 20L");
  const [motivoCambio, setMotivoCambio] = useState("Agua en mal estado");
  const recActivos = (recordatorios || []).filter(r => r.clienteId === cliente.id && !r.confirmado);
  const historial = [...ventas].sort((a, b) => (b.fechaKey || "").localeCompare(a.fechaKey || "") || (b.id || 0) - (a.id || 0));
  const ventaHoy = fecha ? ventas.find(v => v.fechaKey === fecha && !v._esCobro && !v._esAjuste && !v._esCambio) : null;
  const initials = cliente.nombre.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  const totalComprado = ventas.reduce((a, v) => a + (v.neto || 0), 0);
  const promedioVenta = ventas.length > 0 ? Math.round(totalComprado / ventas.length) : 0;
  const ventasUltimos30 = ventas.filter(v => {
    const fk = v.fechaKey || "";
    if (!fk) return false;
    const d = new Date(fk);
    const hoy = new Date();
    return (hoy - d) / 86400000 <= 30;
  }).length;
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: `Clientes · ${cliente.dia || ""}`,
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
        children: cliente.nombre
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 6,
          flexShrink: 0
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            ...s.btn,
            padding: "4px 8px",
            fontSize: 18,
            lineHeight: 1,
            position: "relative"
          },
          onClick: () => setMostrarRecordatorio(true),
          children: ["🔔", recActivos.length > 0 && /*#__PURE__*/_jsx("span", {
            style: {
              position: "absolute",
              top: -3,
              right: -3,
              background: "#f5b942",
              color: "#0f1923",
              borderRadius: "50%",
              width: 16,
              height: 16,
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: recActivos.length
          })]
        }), !soloLectura && /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            fontSize: 12,
            padding: "5px 10px"
          },
          onClick: () => {
            setEditandoCliente(!editandoCliente);
            setEditandoVentaId(null);
          },
          children: editandoCliente ? "Cancelar" : "Editar"
        })]
      })]
    }), mostrarPagoSaldo && /*#__PURE__*/_jsx("div", {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      },
      children: /*#__PURE__*/_jsx(PagoSaldoPanel, {
        saldo: cliente.saldo,
        onCobrar: (monto, pago) => {
          onCobrarSaldo && onCobrarSaldo(monto, pago);
          setMostrarPagoSaldo(false);
        },
        onCerrar: () => setMostrarPagoSaldo(false)
      })
    }), mostrarRecordatorio && /*#__PURE__*/_jsx(RecordatorioModal, {
      cliente: cliente,
      onGuardar: datos => {
        onGuardarRecordatorio && onGuardarRecordatorio({
          ...datos,
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          dia: cliente.dia,
          id: Date.now(),
          confirmado: false
        });
        setMostrarRecordatorio(false);
      },
      onCerrar: () => setMostrarRecordatorio(false)
    }), mostrarFotoGrande && /*#__PURE__*/_jsxs("div", {
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
      onClick: () => setMostrarFotoGrande(false),
      children: [cliente.foto ? /*#__PURE__*/_jsx("img", {
        src: cliente.foto,
        alt: "Domicilio",
        style: {
          maxWidth: "100%",
          maxHeight: "60vh",
          borderRadius: 10,
          objectFit: "contain",
          marginBottom: 16
        }
      }) : /*#__PURE__*/_jsxs("div", {
        style: {
          color: "#aaa",
          fontSize: 14,
          marginBottom: 20
        },
        children: ["Sin foto aún · ", cliente.nombre]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 12
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxs("label", {
          style: {
            background: "#185FA5",
            color: "#e2eaf4",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center"
          },
          children: ["📷 Cámara", /*#__PURE__*/_jsx("input", {
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
              onEditar({
                foto: b64
              });
              setMostrarFotoGrande(false);
            }
          })]
        }), /*#__PURE__*/_jsxs("label", {
          style: {
            background: "#2a3a4a",
            color: "#e2eaf4",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center"
          },
          children: ["🖼 Galería", /*#__PURE__*/_jsx("input", {
            type: "file",
            accept: "image/*",
            style: {
              display: "none"
            },
            onChange: async e => {
              const f = e.target.files[0];
              if (!f) return;
              const b64 = await comprimirFoto(f);
              onEditar({
                foto: b64
              });
              setMostrarFotoGrande(false);
            }
          })]
        }), cliente.foto && /*#__PURE__*/_jsx("button", {
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
            onEditar({
              foto: ""
            });
            setMostrarFotoGrande(false);
          },
          children: "🗑"
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          color: "#aaa",
          fontSize: 11,
          marginTop: 14
        },
        children: "Tocá fuera para cerrar"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [recActivos.length > 0 && !editandoCliente && /*#__PURE__*/_jsx("div", {
        style: {
          marginBottom: 10
        },
        children: recActivos.map(r => /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 6px",
            background: "#2e1f06",
            border: "1px solid #f5b942",
            display: "flex",
            gap: 10,
            alignItems: "flex-start"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 18,
              flexShrink: 0
            },
            children: "🔔"
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
              children: [r.fecha, " ", r.hora && `· ${r.hora}`]
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 13,
                color: "var(--color-text-primary)",
                marginTop: 2
              },
              children: r.motivo
            })]
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "#4dd9a0",
              color: "#0a2e1f",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0
            },
            onClick: () => onConfirmarRecordatorio && onConfirmarRecordatorio(r.id),
            children: "✓ Listo"
          })]
        }, r.id))
      }), !editandoCliente && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14
          },
          children: [cliente.foto ? /*#__PURE__*/_jsx("img", {
            src: cliente.foto,
            alt: "",
            onClick: () => setMostrarFotoGrande(true),
            title: "Ver foto grande",
            style: {
              width: 52,
              height: 52,
              borderRadius: 10,
              objectFit: "cover",
              flexShrink: 0,
              border: "0.5px solid var(--color-border-tertiary)",
              cursor: "zoom-in"
            }
          }) : /*#__PURE__*/_jsx("div", {
            style: {
              width: 52,
              height: 52,
              borderRadius: 10,
              background: "var(--color-background-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 500,
              fontSize: 18,
              color: "var(--color-text-info)",
              flexShrink: 0
            },
            children: initials
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontWeight: 500,
                fontSize: 16,
                color: "var(--color-text-primary)"
              },
              children: cliente.nombre
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)"
              },
              children: [direccionCliente(cliente), cliente.dia ? ` · ${cliente.dia}` : ""]
            }), cliente.notas && /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-warning)",
                marginTop: 3
              },
              children: ["📝 ", cliente.notas]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 10,
              alignItems: "center"
            },
            children: [(cliente.maps || cliente.lat && cliente.lng) && /*#__PURE__*/_jsx("a", {
              href: cliente.maps || `https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                fontSize: 26,
                textDecoration: "none"
              },
              children: "📍"
            }), cliente.telefono && /*#__PURE__*/_jsx("a", {
              href: `https://wa.me/54${cliente.telefono}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                fontSize: 26,
                textDecoration: "none"
              },
              children: "💬"
            })]
          })]
        }), cliente.foto && !editandoCliente && /*#__PURE__*/_jsxs("div", {
          style: {
            marginBottom: 10,
            cursor: "zoom-in",
            borderRadius: 10,
            overflow: "hidden",
            maxHeight: 140,
            position: "relative"
          },
          onClick: () => setMostrarFotoGrande(true),
          children: [/*#__PURE__*/_jsx("img", {
            src: cliente.foto,
            alt: "Domicilio",
            style: {
              width: "100%",
              maxHeight: 140,
              objectFit: "cover",
              display: "block"
            }
          }), /*#__PURE__*/_jsx("div", {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent,rgba(0,0,0,0.5))",
              padding: "6px 10px",
              fontSize: 11,
              color: "#fff"
            },
            children: "📷 Domicilio · tocá para ampliar"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.grid2,
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: s.metricCard,
            children: [/*#__PURE__*/_jsx("div", {
              style: s.metricLabel,
              children: "Saldo"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                ...s.metricVal,
                color: cliente.saldo < 0 ? "var(--color-text-danger)" : cliente.saldo > 0 ? "var(--color-text-success)" : "var(--color-text-primary)"
              },
              children: fmt(cliente.saldo)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)",
                marginTop: 2
              },
              children: cliente.saldo < 0 ? "Debe" : cliente.saldo > 0 ? "A su favor" : "Al día"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: s.metricCard,
            children: [/*#__PURE__*/_jsx("div", {
              style: s.metricLabel,
              children: "Total histórico"
            }), /*#__PURE__*/_jsx("div", {
              style: s.metricVal,
              children: fmt(totalComprado)
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)",
                marginTop: 2
              },
              children: [ventas.length, " compras"]
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "0 0 10px",
            borderLeft: cliente.saldo < 0 ? "3px solid var(--color-text-danger)" : cliente.saldo > 0 ? "3px solid #4dd9a0" : "0.5px solid var(--color-border-tertiary)"
          },
          children: !editandoSaldo ? /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 12,
                  color: "var(--color-text-secondary)"
                },
                children: cliente.saldo < 0 ? "Saldo pendiente" : cliente.saldo > 0 ? "Saldo a favor" : "Sin saldo"
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 20,
                  fontWeight: 500,
                  color: cliente.saldo < 0 ? "var(--color-text-danger)" : cliente.saldo > 0 ? "#4dd9a0" : "var(--color-text-tertiary)"
                },
                children: fmt(Math.abs(cliente.saldo))
              })]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 6
              },
              children: [cliente.saldo < 0 && /*#__PURE__*/_jsx("button", {
                style: {
                  background: "#185FA5",
                  color: "#e2eaf4",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer"
                },
                onClick: () => setMostrarPagoSaldo(true),
                children: "💰 Cobrar"
              }), !soloLectura && /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px"
                },
                onClick: () => setEditandoSaldo(true),
                children: "Ajustar"
              }), !soloLectura && /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  fontSize: 11,
                  padding: "4px 10px"
                },
                onClick: () => setMostrarCambio(true),
                children: "🔄 Cambio"
              })]
            })]
          }) : /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
                fontWeight: 500
              },
              children: "Ajustar saldo"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                display: "flex",
                gap: 6,
                marginBottom: 8
              },
              children: [["favor", "A favor"], ["deuda", "Debe"], ["cero", "En cero"]].map(([v, l]) => /*#__PURE__*/_jsx("button", {
                style: {
                  flex: 1,
                  fontSize: 11,
                  padding: "6px 4px",
                  borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  cursor: "pointer",
                  background: tipoSaldoEdit === v ? "#185FA5" : "var(--color-background-secondary)",
                  color: tipoSaldoEdit === v ? "#e2eaf4" : "var(--color-text-secondary)"
                },
                onClick: () => setTipoSaldoEdit(v),
                children: l
              }, v))
            }), tipoSaldoEdit && tipoSaldoEdit !== "cero" && /*#__PURE__*/_jsx("input", {
              style: {
                ...s.input,
                marginBottom: 8
              },
              type: "number",
              min: 0,
              placeholder: "Monto ($)",
              value: montoSaldoEdit,
              onChange: e => setMontoSaldoEdit(e.target.value)
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 6
              },
              children: [/*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btn,
                  flex: 1,
                  fontSize: 12
                },
                onClick: () => {
                  setEditandoSaldo(false);
                  setTipoSaldoEdit("");
                  setMontoSaldoEdit("");
                },
                children: "Cancelar"
              }), /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btnPrimary,
                  flex: 2,
                  fontSize: 12,
                  padding: "8px"
                },
                onClick: () => {
                  let s = cliente.saldo || 0;
                  if (tipoSaldoEdit === "favor") s = Math.abs(Number(montoSaldoEdit) || 0);
                  if (tipoSaldoEdit === "deuda") s = -Math.abs(Number(montoSaldoEdit) || 0);
                  if (tipoSaldoEdit === "cero") s = 0;
                  onEditar({
                    saldo: s
                  });
                  setEditandoSaldo(false);
                  setTipoSaldoEdit("");
                  setMontoSaldoEdit("");
                },
                children: "Guardar saldo"
              })]
            })]
          })
        }), mostrarCambio && /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 10px",
            border: "1px solid #818cf8"
          },
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 8,
              fontWeight: 500
            },
            children: "🔄 Cambio de envase (no se cobra)"
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 8,
              marginBottom: 8
            },
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsx("label", {
                style: {
                  ...s.label,
                  marginBottom: 4
                },
                children: "Se retira"
              }), /*#__PURE__*/_jsx("select", {
                style: s.select,
                value: productoViejoCambio,
                onChange: e => setProductoViejoCambio(e.target.value),
                children: (productos || []).map(p => /*#__PURE__*/_jsx("option", {
                  value: p.nombre,
                  children: p.nombre
                }, p.id))
              })]
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsx("label", {
                style: {
                  ...s.label,
                  marginBottom: 4
                },
                children: "Se entrega"
              }), /*#__PURE__*/_jsx("select", {
                style: s.select,
                value: productoNuevoCambio,
                onChange: e => setProductoNuevoCambio(e.target.value),
                children: (productos || []).map(p => /*#__PURE__*/_jsx("option", {
                  value: p.nombre,
                  children: p.nombre
                }, p.id))
              })]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              marginBottom: 8
            },
            children: [/*#__PURE__*/_jsx("label", {
              style: {
                ...s.label,
                marginBottom: 4
              },
              children: "Motivo"
            }), /*#__PURE__*/_jsx("input", {
              style: s.input,
              placeholder: "Ej: Agua en mal estado",
              value: motivoCambio,
              onChange: e => setMotivoCambio(e.target.value)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 6
            },
            children: [/*#__PURE__*/_jsx("button", {
              style: {
                ...s.btn,
                flex: 1,
                fontSize: 12
              },
              onClick: () => setMostrarCambio(false),
              children: "Cancelar"
            }), /*#__PURE__*/_jsx("button", {
              style: {
                ...s.btnPrimary,
                flex: 2,
                fontSize: 12,
                padding: "8px"
              },
              onClick: () => {
                const vt = {
                  id: Date.now(),
                  clienteId: cliente.id,
                  cliente: cliente.nombre,
                  dia: dia,
                  fechaKey: fecha,
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
                setMostrarCambio(false);
                setMotivoCambio("Agua en mal estado");
              },
              children: "✓ Registrar cambio"
            })]
          })]
        }), ventaHoy ? /*#__PURE__*/_jsxs("div", {
          style: {
            ...s.card,
            margin: "0 0 12px",
            borderLeft: "3px solid #1D9E75",
            padding: "10px 14px"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                color: "#4dd9a0"
              },
              children: "✓ Entrega registrada hoy"
            }), /*#__PURE__*/_jsx("span", {
              style: s.badge("success"),
              children: fmt(ventaHoy.neto)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginTop: 4
            },
            children: [ventaHoy.detalle.map(d => `${d.nombre} ×${d.cantidad}`).join(" · "), " · ", ventaHoy.pago]
          })]
        }) : /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-warning)",
              color: "var(--color-text-warning)",
              border: "1px solid var(--color-border-warning)",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1,
              minWidth: 90
            },
            onClick: () => {
              onNoEstaCliente && onNoEstaCliente();
            },
            children: "🔄 No está"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: "var(--color-background-danger)",
              color: "var(--color-text-danger)",
              border: "1px solid var(--color-border-danger)",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              flex: 1,
              minWidth: 90
            },
            onClick: () => {
              onNoQuiereCliente && onNoQuiereCliente();
            },
            children: "🚫 No quiere"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              padding: "12px 0",
              fontSize: 15,
              borderRadius: 10,
              flex: 2,
              minWidth: 120
            },
            onClick: onVenta,
            children: "📦 Registrar entrega"
          })]
        }), cliente.saldo < 0 && !ventaHoy && /*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            background: "#0a2e1f",
            color: "#4dd9a0",
            border: "1.5px solid #4dd9a0",
            borderRadius: 10,
            padding: "12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          },
          onClick: () => setMostrarPagoSaldo(true),
          children: ["💰 Cobrar deuda · ", fmt(Math.abs(cliente.saldo))]
        }), /*#__PURE__*/_jsxs("details", {
          style: {
            marginTop: 4
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
              padding: "10px 14px",
              marginBottom: 4
            },
            children: [/*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: ["📋 Historial (", ventas.length, " compras · ", fmt(totalComprado), ")"]
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "▾"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              marginTop: 4
            },
            children: [historial.length === 0 && /*#__PURE__*/_jsx("p", {
              style: {
                fontSize: 13,
                color: "var(--color-text-tertiary)",
                padding: "4px 0"
              },
              children: "Sin registros aún"
            }), historial.map(v => /*#__PURE__*/_jsx("div", {
              style: {
                marginBottom: 8
              },
              children: editandoVentaId === v.id ? /*#__PURE__*/_jsx(EditVenta, {
                venta: v,
                productos: productos,
                onGuardar: (d, p, m, sa, obs, tr2) => {
                  onEditarVenta(v.id, d, p, m, sa, obs, tr2);
                  setEditandoVentaId(null);
                },
                onCancelar: () => setEditandoVentaId(null)
              }) : /*#__PURE__*/_jsxs("div", {
                style: {
                  ...s.card,
                  margin: 0
                },
                children: [/*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3
                  },
                  children: [/*#__PURE__*/_jsxs("span", {
                    style: {
                      fontSize: 11,
                      color: "var(--color-text-tertiary)"
                    },
                    children: [v.fechaKey || v.fecha?.slice(0, 10) || v.dia, " · ", v.fecha?.slice(-8) || ""]
                  }), /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--color-text-primary)"
                    },
                    children: fmt(v.neto)
                  })]
                }), /*#__PURE__*/_jsx("div", {
                  style: {
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    marginBottom: 3
                  },
                  children: v.detalle.map(d => `${d.nombre} ×${d.cantidad}`).join(" · ")
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    marginBottom: 6
                  },
                  children: [(() => {
                    const esMixto = (Number(v.montoTrans) || 0) > 0 && (Number(v.montoEfec) || 0) > 0;
                    return esMixto ? `Mixto · ef ${fmt(v.montoEfec)} + tr ${fmt(v.montoTrans)}` : v.pago;
                  })(), v.desc > 0 ? ` · desc. ${fmt(v.desc)}` : "", v.saldoAplicado > 0 ? ` · saldo ${fmt(v.saldoAplicado)}` : "", v.obs ? ` · ${v.obs.replace(/\s*\[Mixto:[^\]]*\]/g, "")}` : ""]
                }), !soloLectura && /*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 6
                  },
                  children: [/*#__PURE__*/_jsx("button", {
                    style: {
                      ...s.btn,
                      fontSize: 11,
                      padding: "4px 10px"
                    },
                    onClick: () => setEditandoVentaId(v.id),
                    children: "Editar"
                  }), /*#__PURE__*/_jsx("button", {
                    style: {
                      ...s.btnDanger,
                      fontSize: 11,
                      padding: "4px 10px"
                    },
                    onClick: () => {
                      if (window.confirm(`¿Eliminar venta de ${fmt(v.neto)}?`)) onEliminarVenta(v.id);
                    },
                    children: "Eliminar"
                  })]
                })]
              })
            }, v.id))]
          })]
        }), /*#__PURE__*/_jsxs("details", {
          style: {
            marginTop: 6
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
              padding: "10px 14px",
              marginBottom: 4
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: "🫧 Envases"
            }), /*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: "▾"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              marginTop: 4
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                ...s.card,
                margin: "0 0 10px",
                paddingTop: 2
              },
              children: /*#__PURE__*/_jsx(PieEnvases, {
                c: cliente,
                ventas: ventas,
                onEditar: (id, cambios) => onEditar(cambios),
                izquierda: /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: 12,
                    color: "var(--color-text-secondary)"
                  },
                  children: "Ajustar fijos y prestados"
                })
              })
            }), (() => {
              const pkEnv = {
                "Sifón 1.5L": "sifon",
                "Bidón 10L": "bidon10",
                "Bidón 20L": "bidon20"
              };
              const extra = {
                sifon: 0,
                bidon10: 0,
                bidon20: 0
              };
              historial.forEach(v => {
                (v.envPrest || []).forEach(e => {
                  const k = pkEnv[e.prod];
                  if (k) extra[k] += Number(e.cant) || 0;
                });
                (v.envDev || []).forEach(e => {
                  const k = pkEnv[e.prod];
                  if (k) extra[k] -= Number(e.cant) || 0;
                });
              });
              // Sumar ajuste manual
              const aj = cliente.envAjuste || {};
              const exTotal = {
                sifon: extra.sifon + (aj.sifon || 0),
                bidon10: extra.bidon10 + (aj.bidon10 || 0),
                bidon20: extra.bidon20 + (aj.bidon20 || 0)
              };
              const hab = {
                sifon: cliente.sifon || 0,
                bidon10: cliente.bidon10 || 0,
                bidon20: cliente.bidon20 || 0
              };
              const total = {
                sifon: hab.sifon + exTotal.sifon,
                bidon10: hab.bidon10 + exTotal.bidon10,
                bidon20: hab.bidon20 + exTotal.bidon20
              };
              const hayExtra = exTotal.sifon !== 0 || exTotal.bidon10 !== 0 || exTotal.bidon20 !== 0;
              return /*#__PURE__*/_jsx(_Fragment, {
                children: /*#__PURE__*/_jsxs("div", {
                  style: {
                    ...s.card,
                    margin: "0 0 10px",
                    background: "var(--color-background-tertiary)"
                  },
                  children: [/*#__PURE__*/_jsx("div", {
                    style: {
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      marginBottom: 8
                    },
                    children: "📦 En poder del cliente ahora"
                  }), /*#__PURE__*/_jsxs("div", {
                    style: {
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap"
                    },
                    children: [total.sifon > 0 && /*#__PURE__*/_jsxs("div", {
                      style: s.metricCard,
                      children: [/*#__PURE__*/_jsx("div", {
                        style: s.metricLabel,
                        children: "Sifón"
                      }), /*#__PURE__*/_jsx("div", {
                        style: {
                          ...s.metricVal,
                          color: exTotal.sifon > 0 ? "var(--color-text-warning)" : exTotal.sifon < 0 ? "var(--color-text-success)" : "var(--color-text-primary)"
                        },
                        children: total.sifon
                      })]
                    }), total.bidon10 > 0 && /*#__PURE__*/_jsxs("div", {
                      style: s.metricCard,
                      children: [/*#__PURE__*/_jsx("div", {
                        style: s.metricLabel,
                        children: "10L"
                      }), /*#__PURE__*/_jsx("div", {
                        style: {
                          ...s.metricVal,
                          color: exTotal.bidon10 > 0 ? "var(--color-text-warning)" : exTotal.bidon10 < 0 ? "var(--color-text-success)" : "var(--color-text-primary)"
                        },
                        children: total.bidon10
                      })]
                    }), total.bidon20 > 0 && /*#__PURE__*/_jsxs("div", {
                      style: s.metricCard,
                      children: [/*#__PURE__*/_jsx("div", {
                        style: s.metricLabel,
                        children: "20L"
                      }), /*#__PURE__*/_jsx("div", {
                        style: {
                          ...s.metricVal,
                          color: exTotal.bidon20 > 0 ? "var(--color-text-warning)" : exTotal.bidon20 < 0 ? "var(--color-text-success)" : "var(--color-text-primary)"
                        },
                        children: total.bidon20
                      })]
                    }), cliente.dispenser > 0 && /*#__PURE__*/_jsxs("div", {
                      style: s.metricCard,
                      children: [/*#__PURE__*/_jsx("div", {
                        style: s.metricLabel,
                        children: "Dispenser"
                      }), /*#__PURE__*/_jsx("div", {
                        style: s.metricVal,
                        children: cliente.dispenser
                      })]
                    }), !total.sifon && !total.bidon10 && !total.bidon20 && !cliente.dispenser && /*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: 13,
                        color: "var(--color-text-tertiary)"
                      },
                      children: "Sin envases"
                    })]
                  }), hayExtra && /*#__PURE__*/_jsxs("div", {
                    style: {
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      marginTop: 8,
                      borderTop: "0.5px solid var(--color-border-tertiary)",
                      paddingTop: 6
                    },
                    children: [(hab.sifon > 0 || hab.bidon10 > 0 || hab.bidon20 > 0) && /*#__PURE__*/_jsxs("span", {
                      children: ["Habitual: ", hab.sifon > 0 ? `Sifón×${hab.sifon} ` : "", hab.bidon10 > 0 ? `10L×${hab.bidon10} ` : "", hab.bidon20 > 0 ? `20L×${hab.bidon20}` : "", " · "]
                    }), exTotal.sifon !== 0 && /*#__PURE__*/_jsxs("span", {
                      style: {
                        color: exTotal.sifon > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"
                      },
                      children: [exTotal.sifon > 0 ? `+${exTotal.sifon} sif. extra` : ` −${Math.abs(exTotal.sifon)} sif. devueltos`, " "]
                    }), exTotal.bidon10 !== 0 && /*#__PURE__*/_jsxs("span", {
                      style: {
                        color: exTotal.bidon10 > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"
                      },
                      children: [exTotal.bidon10 > 0 ? `+${exTotal.bidon10} 10L extra` : ` −${Math.abs(exTotal.bidon10)} 10L devueltos`, " "]
                    }), exTotal.bidon20 !== 0 && /*#__PURE__*/_jsx("span", {
                      style: {
                        color: exTotal.bidon20 > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"
                      },
                      children: exTotal.bidon20 > 0 ? `+${exTotal.bidon20} 20L extra` : ` −${Math.abs(exTotal.bidon20)} 20L devueltos`
                    })]
                  })]
                })
              });
            })(), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                margin: "10px 0 6px"
              },
              children: "Movimientos registrados"
            }), historial.filter(v => (v.envPrest || []).length > 0 || (v.envDev || []).length > 0).length === 0 && /*#__PURE__*/_jsx("p", {
              style: {
                fontSize: 13,
                color: "var(--color-text-tertiary)"
              },
              children: "Sin movimientos de envases registrados"
            }), historial.filter(v => (v.envPrest || []).length > 0 || (v.envDev || []).length > 0).map(v => /*#__PURE__*/_jsxs("div", {
              style: {
                ...s.card,
                margin: "0 0 8px"
              },
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 4
                },
                children: v.fechaKey || v.dia
              }), (v.envPrest || []).map((e, i) => /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0"
                },
                children: [/*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: 12,
                    color: "var(--color-text-secondary)"
                  },
                  children: ["+ Prestado: ", e.prod]
                }), /*#__PURE__*/_jsxs("span", {
                  style: s.badge("warning"),
                  children: ["×", e.cant]
                })]
              }, "p" + i)), (v.envDev || []).map((e, i) => /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0"
                },
                children: [/*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: 12,
                    color: "var(--color-text-secondary)"
                  },
                  children: ["← Devuelto: ", e.prod]
                }), /*#__PURE__*/_jsxs("span", {
                  style: s.badge("success"),
                  children: ["×", e.cant]
                })]
              }, "d" + i))]
            }, v.id))]
          })]
        }), !soloLectura && /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              ...s.divider,
              marginTop: 12
            }
          }), /*#__PURE__*/_jsxs("details", {
            style: {
              marginTop: 4
            },
            children: [/*#__PURE__*/_jsx("summary", {
              style: {
                fontSize: 12,
                color: "var(--color-text-tertiary)",
                cursor: "pointer",
                padding: "4px 0",
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                gap: 4
              },
              children: "⚙ Opciones avanzadas"
            }), /*#__PURE__*/_jsx("div", {
              style: {
                marginTop: 8
              },
              children: /*#__PURE__*/_jsx("button", {
                style: {
                  ...s.btnDanger,
                  width: "100%",
                  padding: "10px",
                  fontSize: 13
                },
                onClick: () => {
                  if (window.confirm(`¿Eliminar a ${cliente.nombre}? Se borrarán también sus ventas.`)) onEliminarCliente();
                },
                children: "Eliminar cliente"
              })
            })]
          })]
        })]
      }), editandoCliente && !soloLectura && /*#__PURE__*/_jsx(EditCliente, {
        cliente: cliente,
        onGuardar: cambios => {
          onEditar(cambios);
          setEditandoCliente(false);
        },
        onEliminarCliente: onEliminarCliente
      })]
    })]
  });
}
function EditCliente({
  cliente,
  onGuardar,
  onEliminarCliente
}) {
  const [datos, setDatos] = useState({
    ...cliente
  });
  const set = (k, v) => setDatos(d => ({
    ...d,
    [k]: v
  }));
  return /*#__PURE__*/_jsxs("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 16
    },
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Día de reparto"
      }), /*#__PURE__*/_jsx("select", {
        style: s.select,
        value: datos.dia,
        onChange: e => set("dia", e.target.value),
        children: DIAS.map(d => /*#__PURE__*/_jsx("option", {
          value: d,
          children: d
        }, d))
      })]
    }), [["nombre", "Nombre y apellido"], ["barrio", "Barrio"], ["manzana", "Manzana"], ["lote", "Lote"], ["sector", "Sector"], ["calle", "Calle"], ["nro", "Número"], ["telefono", "Teléfono (sin 0 ni 15)"], ["maps", "Link Google Maps"], ["foto", "Link foto del domicilio (Google Drive, etc)"]].map(([k, l]) => /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: l
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        value: datos[k] || "",
        onChange: e => set(k, e.target.value),
        placeholder: l
      })]
    }, k)), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Notas rápidas (timbre roto, perro, cobrar deuda, etc.)"
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        value: datos.notas || "",
        onChange: e => set("notas", e.target.value),
        placeholder: "ej: timbre roto, cobrar $2000..."
      })]
    }), /*#__PURE__*/_jsx("span", {
      style: {
        ...s.label,
        fontSize: 13,
        marginTop: 4
      },
      children: "Envases habituales"
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
          value: datos[k] || 0,
          onChange: e => set(k, Number(e.target.value))
        })]
      }, k))
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Dispenser en comodato"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12
        },
        children: [/*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "5px 16px",
            fontSize: 20,
            lineHeight: 1
          },
          onClick: () => set("dispenser", Math.max(0, (datos.dispenser || 0) - 1)),
          children: "−"
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 20,
            fontWeight: 500,
            minWidth: 32,
            textAlign: "center",
            color: "var(--color-text-primary)"
          },
          children: datos.dispenser || 0
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "5px 16px",
            fontSize: 20,
            lineHeight: 1
          },
          onClick: () => set("dispenser", (datos.dispenser || 0) + 1),
          children: "+"
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: "unidades prestadas"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Saldo (corrección manual)"
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        type: "number",
        value: datos.saldo || 0,
        onChange: e => set("saldo", Number(e.target.value))
      })]
    }), datos.foto && /*#__PURE__*/_jsxs("div", {
      style: {
        position: "relative",
        cursor: "zoom-in"
      },
      onClick: () => setMostrarFotoGrande(true),
      children: [/*#__PURE__*/_jsx("img", {
        src: datos.foto,
        alt: "Domicilio",
        style: {
          width: "100%",
          borderRadius: 8,
          maxHeight: 160,
          objectFit: "cover"
        }
      }), /*#__PURE__*/_jsx("div", {
        style: {
          position: "absolute",
          bottom: 6,
          right: 8,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 11,
          borderRadius: 6,
          padding: "2px 8px"
        },
        children: "🔍 Ampliar"
      })]
    }), /*#__PURE__*/_jsx("button", {
      style: s.btnPrimary,
      onClick: () => onGuardar(datos),
      children: "Guardar cambios"
    }), /*#__PURE__*/_jsx("div", {
      style: {
        marginTop: 16,
        paddingTop: 12,
        borderTop: "0.5px solid var(--color-border-tertiary)"
      },
      children: /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnDanger,
          width: "100%",
          padding: "10px",
          fontSize: 13
        },
        onClick: () => {
          if (window.confirm(`¿Eliminar a ${datos.nombre}? Se borrarán también todas sus ventas.`)) onEliminarCliente();
        },
        children: "Eliminar cliente permanentemente"
      })
    })]
  });
}
function EditVenta({
  venta,
  productos,
  onGuardar,
  onCancelar
}) {
  // onGuardar(detalle,pago,monto,saldoApl,obs,montoTrans2)
  const [cantidades, setCantidades] = useState(() => {
    const m = {};
    productos.forEach(p => {
      m[p.nombre] = 0;
    });
    venta.detalle.forEach(d => {
      m[d.nombre] = d.cantidad;
    });
    return m;
  });
  const esMixtaOrig = venta.pago === "mixto" || (Number(venta.montoTrans) || 0) > 0;
  const [pago, setPago] = useState(esMixtaOrig ? "mixto" : venta.pago || "contado");
  const [monto, setMonto] = useState(() => String(venta.pagadoNum || venta.neto || ""));
  const [montoEfec, setMontoEfec] = useState(esMixtaOrig ? String(venta.montoEfec || "") : "");
  const [montoTrans, setMontoTrans] = useState(esMixtaOrig ? String(venta.montoTrans || "") : "");
  const [obs, setObs] = useState((venta.obs || "").replace(/\s*\[Mixto:[^\]]*\]/g, ""));
  const detalle = productos.map(p => ({
    nombre: p.nombre,
    cantidad: cantidades[p.nombre] || 0,
    precio: p.precio,
    total: (cantidades[p.nombre] || 0) * p.precio
  })).filter(d => d.cantidad > 0);
  const bruto = detalle.reduce((a, d) => a + d.total, 0);
  const neto = bruto;
  const sonarTrans = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.value = 0.3;
        o.start(ctx.currentTime + i * 0.15);
        o.stop(ctx.currentTime + i * 0.15 + 0.15);
      });
    } catch (e) {}
  };
  return /*#__PURE__*/_jsxs("div", {
    style: {
      ...s.card,
      margin: 0,
      background: "var(--color-background-secondary)"
    },
    children: [/*#__PURE__*/_jsx("p", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        marginBottom: 10
      },
      children: "Editando venta"
    }), productos.map(p => /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 13,
          color: "var(--color-text-primary)"
        },
        children: p.nombre
      }), /*#__PURE__*/_jsxs("div", {
        style: s.row,
        children: [/*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "3px 12px",
            fontSize: 17
          },
          onClick: () => setCantidades(q => ({
            ...q,
            [p.nombre]: Math.max(0, (q[p.nombre] || 0) - 1)
          })),
          children: "−"
        }), /*#__PURE__*/_jsx("span", {
          style: {
            minWidth: 24,
            textAlign: "center",
            fontWeight: 500,
            fontSize: 15,
            color: "var(--color-text-primary)"
          },
          children: cantidades[p.nombre] || 0
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "3px 12px",
            fontSize: 17
          },
          onClick: () => setCantidades(q => ({
            ...q,
            [p.nombre]: (q[p.nombre] || 0) + 1
          })),
          children: "+"
        })]
      })]
    }, p.id)), /*#__PURE__*/_jsx("div", {
      style: {
        display: "flex",
        gap: 6,
        margin: "10px 0"
      },
      children: [["contado", "Contado"], ["transferencia", "Transfer."], ["fiado", "Fiado"], ["mixto", "Mixto"]].map(([v, l]) => /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          flex: 1,
          fontSize: 12,
          padding: "8px 2px",
          background: pago === v ? "#185FA5" : undefined,
          color: pago === v ? "#fff" : undefined,
          border: pago === v ? "none" : undefined
        },
        onClick: () => setPago(v),
        children: l
      }, v))
    }), pago === "mixto" && /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        background: "var(--color-background-tertiary)"
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)",
          marginBottom: 6
        },
        children: ["Total: ", fmt(neto)]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Efectivo $"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            type: "number",
            placeholder: "0",
            value: montoEfec,
            onChange: e => setMontoEfec(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Transferencia $"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            type: "number",
            placeholder: "0",
            value: montoTrans,
            onChange: e => setMontoTrans(e.target.value)
          })]
        })]
      }), Number(montoEfec || 0) + Number(montoTrans || 0) > 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)",
          marginTop: 4
        },
        children: ["Pagado: ", fmt(Number(montoEfec || 0) + Number(montoTrans || 0)), Number(montoEfec || 0) + Number(montoTrans || 0) < neto && /*#__PURE__*/_jsxs("span", {
          style: {
            color: "var(--color-text-warning)"
          },
          children: [" · Saldo: ", fmt(neto - Number(montoEfec || 0) - Number(montoTrans || 0))]
        })]
      })]
    }), pago !== "fiado" && pago !== "mixto" && /*#__PURE__*/_jsxs("div", {
      style: {
        marginBottom: 8
      },
      children: [/*#__PURE__*/_jsxs("label", {
        style: s.label,
        children: ["Monto cobrado (vacío = ", fmt(neto), " exacto)"]
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        type: "number",
        value: monto,
        onChange: e => setMonto(e.target.value),
        placeholder: String(Math.round(neto))
      })]
    }), pago === "transferencia" && /*#__PURE__*/_jsx("div", {
      style: {
        ...s.card,
        margin: "0 0 8px",
        background: "#1e3a5f",
        border: "0.5px solid #5daaff"
      },
      children: /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "#5daaff"
          },
          children: "Confirmar transferencia"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            background: "#185FA5",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            cursor: "pointer"
          },
          onClick: sonarTrans,
          children: "🔔 Confirmar"
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        marginBottom: 8
      },
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Observaciones"
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        value: obs,
        onChange: e => setObs(e.target.value)
      })]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        borderTop: "0.5px solid var(--color-border-tertiary)"
      },
      children: [/*#__PURE__*/_jsx("span", {
        children: "Total"
      }), /*#__PURE__*/_jsx("span", {
        children: fmt(neto)
      })]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 8
      },
      children: [/*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          flex: 1
        },
        onClick: onCancelar,
        children: "Cancelar"
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          flex: 2,
          padding: "10px"
        },
        onClick: () => {
          if (pago === "mixto") {
            const ef = Number(montoEfec || 0),
              tr = Number(montoTrans || 0);
            if (ef + tr === 0) {
              alert("⚠️ Completá el desglose: cuánto en efectivo y cuánto por transferencia.");
              return;
            }
            onGuardar(detalle, "mixto", String(ef), venta.saldoAplicado || 0, obs, tr);
          } else {
            onGuardar(detalle, pago, pago === "fiado" ? "" : monto, venta.saldoAplicado || 0, obs);
          }
        },
        children: "Guardar"
      })]
    })]
  });
}
function VehiculoMantModal({
  onGuardar,
  onCerrar
}) {
  const [tipo, setTipo] = React.useState("aceite");
  const [otroDetalle, setOtroDetalle] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [km, setKm] = React.useState("");
  const [costo, setCosto] = React.useState("");
  const [proximo, setProximo] = React.useState("");
  const [proximaFechaISO, setProximaFechaISO] = React.useState("");
  const [fechaISO, setFechaISO] = React.useState(new Date().toISOString().slice(0, 10));
  const fechaDisplay = fechaISO ? new Date(fechaISO + 'T12:00:00').toLocaleDateString("es-AR") : "";
  const tipos = [{
    id: "aceite",
    label: "🛢 Cambio de aceite",
    color: "#f5b942"
  }, {
    id: "preventivo",
    label: "🔩 Mantenimiento preventivo",
    color: "#4dd9a0"
  }, {
    id: "embrague",
    label: "⚙️ Cambio de embrague",
    color: "#e05c5c"
  }, {
    id: "reparacion",
    label: "🛠 Reparación",
    color: "#5daaff"
  }, {
    id: "gnc",
    label: "🟢 Oblea GNC",
    color: "#22c55e"
  }, {
    id: "vtv",
    label: "🔵 VTV",
    color: "#3b82f6"
  }, {
    id: "otro",
    label: "📋 Otro",
    color: "#a0aec0"
  }];
  return /*#__PURE__*/_jsx("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 1200,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    },
    children: /*#__PURE__*/_jsxs("div", {
      style: {
        background: "var(--color-background-secondary)",
        borderRadius: "16px 16px 0 0",
        padding: "20px 16px 32px",
        width: "100%",
        maxWidth: 480,
        maxHeight: "90vh",
        overflowY: "auto"
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text-primary)"
          },
          children: "🔧 Registrar mantenimiento"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            background: "none",
            border: "none",
            fontSize: 22,
            color: "var(--color-text-secondary)",
            cursor: "pointer"
          },
          onClick: onCerrar,
          children: "✕"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4
          },
          children: "📅 Fecha del mantenimiento"
        }), /*#__PURE__*/_jsx("input", {
          type: "date",
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--color-text-primary)",
            fontSize: 13,
            boxSizing: "border-box"
          },
          value: fechaISO,
          onChange: e => setFechaISO(e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 6
          },
          children: "Tipo"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: 6
          },
          children: tipos.map(t => /*#__PURE__*/_jsx("button", {
            onClick: () => setTipo(t.id),
            style: {
              padding: "7px 12px",
              borderRadius: 8,
              border: `2px solid ${tipo === t.id ? t.color : "var(--color-border-tertiary)"}`,
              background: tipo === t.id ? t.color + "22" : "transparent",
              color: tipo === t.id ? t.color : "var(--color-text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: tipo === t.id ? 600 : 400
            },
            children: t.label
          }, t.id))
        })]
      }), tipo === "otro" && /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4
          },
          children: "¿Qué es? (detalle del \"Otro\")"
        }), /*#__PURE__*/_jsx("input", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "2px solid #a0aec0",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--color-text-primary)",
            fontSize: 14,
            boxSizing: "border-box",
            fontWeight: 500
          },
          placeholder: "Ej: Cambio de gomas, batería, luces...",
          value: otroDetalle,
          onChange: e => setOtroDetalle(e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4
          },
          children: "Descripción / detalle adicional"
        }), /*#__PURE__*/_jsx("textarea", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--color-text-primary)",
            fontSize: 13,
            resize: "none",
            boxSizing: "border-box",
            minHeight: 60
          },
          placeholder: "Ej: Cambio aceite 10W-40 + filtro...",
          value: descripcion,
          onChange: e => setDescripcion(e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              display: "block",
              marginBottom: 4
            },
            children: "Km actuales"
          }), /*#__PURE__*/_jsx("input", {
            type: "number",
            style: {
              width: "100%",
              background: "var(--color-background-tertiary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "var(--color-text-primary)",
              fontSize: 13,
              boxSizing: "border-box"
            },
            placeholder: "Ej: 125000",
            value: km,
            onChange: e => setKm(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: {
              fontSize: 12,
              color: "var(--color-text-secondary)",
              display: "block",
              marginBottom: 4
            },
            children: "Costo ($)"
          }), /*#__PURE__*/_jsx("input", {
            type: "number",
            style: {
              width: "100%",
              background: "var(--color-background-tertiary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "var(--color-text-primary)",
              fontSize: 13,
              boxSizing: "border-box"
            },
            placeholder: "Ej: 85000",
            value: costo,
            onChange: e => setCosto(e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4
          },
          children: "Próximo mantenimiento (notas)"
        }), /*#__PURE__*/_jsx("input", {
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--color-text-primary)",
            fontSize: 13,
            boxSizing: "border-box"
          },
          placeholder: "Ej: 135.000 km / junio 2026",
          value: proximo,
          onChange: e => setProximo(e.target.value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 18,
          background: "rgba(255,193,7,0.08)",
          border: "1px solid rgba(255,193,7,0.3)",
          borderRadius: 10,
          padding: "10px 12px"
        },
        children: [/*#__PURE__*/_jsxs("label", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4
          },
          children: ["📅 Fecha próximo mantenimiento ", /*#__PURE__*/_jsx("span", {
            style: {
              color: "#f5b942",
              fontSize: 11
            },
            children: "(para notificación)"
          })]
        }), /*#__PURE__*/_jsx("input", {
          type: "date",
          style: {
            width: "100%",
            background: "var(--color-background-tertiary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--color-text-primary)",
            fontSize: 13,
            boxSizing: "border-box"
          },
          value: proximaFechaISO,
          onChange: e => setProximaFechaISO(e.target.value)
        }), !proximaFechaISO && /*#__PURE__*/_jsx("p", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            margin: "4px 0 0"
          },
          children: "Opcional — si completás, te avisamos 3 días antes"
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: {
          width: "100%",
          padding: "13px",
          borderRadius: 10,
          border: "none",
          background: "#185FA5",
          color: "#e2eaf4",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer"
        },
        onClick: () => {
          if (!tipo) return;
          onGuardar({
            tipo,
            descripcion,
            km,
            costo,
            proximo,
            proximaFechaISO,
            fecha: fechaDisplay,
            fechaISO,
            otroDetalle: tipo === "otro" ? otroDetalle : ""
          });
        },
        children: "Guardar registro"
      })]
    })
  });
}
function RecordatorioModal({
  cliente,
  onGuardar,
  onCerrar
}) {
  const hoy = new Date();
  const [fecha, setFecha] = React.useState(hoy.toISOString().slice(0, 10));
  const [hora, setHora] = React.useState("10:00");
  const [tipo, setTipo] = React.useState("visita"); // visita | cobro
  const [motivo, setMotivo] = React.useState("");
  const tipoConfig = {
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
  return /*#__PURE__*/_jsx("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      zIndex: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    },
    children: /*#__PURE__*/_jsxs("div", {
      style: {
        background: "var(--color-background-secondary)",
        borderRadius: 16,
        padding: 20,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 16,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: 4
        },
        children: "🔔 Nuevo recordatorio"
      }), /*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 13,
          color: "var(--color-text-secondary)",
          marginBottom: 12
        },
        children: cliente.nombre
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 12
        },
        children: Object.entries(tipoConfig).map(([k, tc]) => /*#__PURE__*/_jsxs("button", {
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
          onClick: () => setTipo(k),
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 20
            },
            children: tc.ico
          }), tc.label]
        }, k))
      }), /*#__PURE__*/_jsxs("div", {
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
            children: "Fecha"
          }), /*#__PURE__*/_jsx("input", {
            type: "date",
            style: s.input,
            value: fecha,
            onChange: e => setFecha(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Hora"
          }), /*#__PURE__*/_jsx("input", {
            type: "time",
            style: s.input,
            value: hora,
            onChange: e => setHora(e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 16
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Detalle"
        }), /*#__PURE__*/_jsx("textarea", {
          style: {
            ...s.input,
            minHeight: 60,
            resize: "vertical"
          },
          placeholder: tipo === "cobro" ? "ej: Cobrar deuda $5.000, pago parcial..." : "ej: Pasar a ver al cliente, entregar pedido...",
          value: motivo,
          onChange: e => setMotivo(e.target.value)
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
          onClick: onCerrar,
          children: "Cancelar"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btnPrimary,
            flex: 2
          },
          onClick: () => {
            if (!motivo.trim()) {
              alert("Ingresá el detalle");
              return;
            }
            onGuardar({
              fecha,
              hora,
              tipo,
              motivo: motivo.trim()
            });
          },
          children: "Guardar recordatorio"
        })]
      })]
    })
  });
}
function PagoSaldoPanel({
  saldo,
  onCobrar,
  onCerrar
}) {
  const deuda = Math.abs(saldo || 0);
  const [monto, setMonto] = React.useState(String(deuda));
  const [pago, setPago] = React.useState("contado");
  return /*#__PURE__*/_jsxs("div", {
    style: {
      background: "var(--color-background-secondary)",
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
    },
    children: [/*#__PURE__*/_jsx("div", {
      style: {
        fontSize: 16,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        marginBottom: 4
      },
      children: "💰 Cobrar deuda"
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-danger)",
        marginBottom: 16
      },
      children: ["Total pendiente: ", fmt(deuda)]
    }), /*#__PURE__*/_jsx("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 12
      },
      children: [["contado", "Efectivo"], ["transferencia", "Transferencia"]].map(([v, l]) => /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          flex: 1,
          fontSize: 14,
          padding: "10px 4px",
          background: pago === v ? "#185FA5" : undefined,
          color: pago === v ? "#fff" : undefined,
          border: pago === v ? "none" : undefined
        },
        onClick: () => setPago(v),
        children: l
      }, v))
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        marginBottom: 16
      },
      children: [/*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Monto cobrado"
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        type: "number",
        value: monto,
        onChange: e => setMonto(e.target.value),
        placeholder: String(deuda)
      }), Number(monto) < deuda && Number(monto) > 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-warning)",
          marginTop: 4
        },
        children: ["Pago parcial · Queda pendiente: ", fmt(deuda - Number(monto))]
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
        onClick: onCerrar,
        children: "Cancelar"
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          flex: 2,
          fontSize: 15
        },
        onClick: () => {
          const m = Number(monto) || deuda;
          if (m <= 0) {
            alert("Ingresá el monto");
            return;
          }
          onCobrar(m, pago);
        },
        children: "Confirmar cobro"
      })]
    })]
  });
}
function CobroDeudaPanel({
  saldo,
  onCobrar
}) {
  const [monto, setMonto] = React.useState("");
  const [pago, setPago] = React.useState("contado");
  const [open, setOpen] = React.useState(false);
  const deuda = Math.abs(saldo);
  if (!open) return /*#__PURE__*/_jsxs("button", {
    style: {
      width: "100%",
      padding: "12px",
      fontSize: 14,
      fontWeight: 500,
      borderRadius: 10,
      border: "1px solid var(--color-border-danger)",
      background: "var(--color-background-danger)",
      color: "var(--color-text-danger)",
      cursor: "pointer",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    onClick: () => setOpen(true),
    children: ["💰 Cobrar deuda — ", fmt(deuda)]
  });
  return /*#__PURE__*/_jsxs("div", {
    style: {
      ...s.card,
      margin: "0 0 10px",
      background: "var(--color-background-danger)",
      border: "0.5px solid var(--color-border-danger)"
    },
    children: [/*#__PURE__*/_jsxs("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text-danger)",
        marginBottom: 10
      },
      children: ["Cobrar deuda · Total pendiente: ", fmt(deuda)]
    }), /*#__PURE__*/_jsx("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 10
      },
      children: [["contado", "Efectivo"], ["transferencia", "Transfer."]].map(([v, l]) => /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          flex: 1,
          fontSize: 13,
          padding: "9px 4px",
          background: pago === v ? "#185FA5" : undefined,
          color: pago === v ? "#fff" : undefined,
          border: pago === v ? "none" : undefined
        },
        onClick: () => setPago(v),
        children: l
      }, v))
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        marginBottom: 8
      },
      children: [/*#__PURE__*/_jsxs("label", {
        style: s.label,
        children: ["Monto cobrado (vacío = todo ", fmt(deuda), ")"]
      }), /*#__PURE__*/_jsx("input", {
        style: s.input,
        type: "number",
        placeholder: String(deuda),
        value: monto,
        onChange: e => setMonto(e.target.value)
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
        onClick: () => setOpen(false),
        children: "Cancelar"
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          flex: 2
        },
        onClick: () => {
          const m = Number(monto) || deuda;
          onCobrar(m, pago);
        },
        children: "Registrar cobro"
      })]
    })]
  });
}
function FiadosPendientes({
  clientes,
  ventas,
  onCobrar,
  onVolver,
  onEditarCliente
}) {
  const [pagando, setPagando] = React.useState(null);
  const [monto, setMonto] = React.useState('');
  const [pago, setPago] = React.useState('contado');
  const conDeuda = clientes.filter(c => c.saldo < 0).sort((a, b) => a.saldo - b.saldo);
  const totalDeuda = conDeuda.reduce((a, c) => a + Math.abs(c.saldo), 0);
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsxs("div", {
      style: s.header,
      children: [/*#__PURE__*/_jsx("button", {
        style: s.backBtn,
        onClick: onVolver,
        children: "← Volver"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          flex: 1
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: s.headerTitle,
          children: "💰 Fiados pendientes"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 11,
            color: 'var(--color-text-danger)'
          },
          children: [conDeuda.length, " clientes · ", fmt(totalDeuda), " total"]
        })]
      }), /*#__PURE__*/_jsx(HeaderBotones, {})]
    }), conDeuda.length === 0 && /*#__PURE__*/_jsx("div", {
      style: {
        padding: 40,
        textAlign: 'center',
        color: 'var(--color-text-success)',
        fontSize: 15
      },
      children: "✅ Sin fiados pendientes"
    }), conDeuda.map(c => /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.card,
        margin: '6px 14px'
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-primary)'
            },
            children: c.nombre
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 11,
              color: 'var(--color-text-tertiary)'
            },
            children: [c.dia, c.barrio ? ' · ' + c.barrio : '']
          })]
        }), /*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-text-danger)'
          },
          children: fmt(Math.abs(c.saldo))
        })]
      }), pagando === c.id ? /*#__PURE__*/_jsxs("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingTop: 8,
          borderTop: '0.5px solid var(--color-border-tertiary)'
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            display: 'flex',
            gap: 6
          },
          children: ['contado', 'transferencia'].map(p => /*#__PURE__*/_jsx("button", {
            style: {
              flex: 1,
              padding: '7px',
              fontSize: 12,
              borderRadius: 8,
              border: '0.5px solid var(--color-border-secondary)',
              background: pago === p ? '#185FA5' : 'var(--color-background-tertiary)',
              color: pago === p ? '#e2eaf4' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontWeight: pago === p ? 600 : 400
            },
            onClick: () => setPago(p),
            children: p === 'contado' ? '💵 Efectivo' : '💳 Transfer.'
          }, p))
        }), /*#__PURE__*/_jsx("input", {
          style: {
            ...s.input
          },
          type: "number",
          placeholder: fmt(Math.abs(c.saldo)) + ' (total)',
          value: monto,
          onChange: e => setMonto(e.target.value)
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: 'flex',
            gap: 6
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              flex: 1
            },
            onClick: () => {
              setPagando(null);
              setMonto('');
            },
            children: "Cancelar"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btnPrimary,
              flex: 2,
              padding: '9px'
            },
            onClick: () => {
              const m = Number(monto) || Math.abs(c.saldo);
              onCobrar(c.id, m, pago);
              setPagando(null);
              setMonto('');
            },
            children: "✓ Confirmar cobro"
          })]
        })]
      }) : /*#__PURE__*/_jsx("button", {
        style: {
          width: '100%',
          padding: '9px',
          background: '#0a2e1f',
          color: '#4dd9a0',
          border: '1px solid #4dd9a0',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        },
        onClick: () => {
          setPagando(c.id);
          setMonto(String(Math.abs(c.saldo)));
          setPago('contado');
        },
        children: "💰 Cobrar deuda"
      }), onEditarCliente && /*#__PURE__*/_jsx(PieEnvases, {
        c: c,
        ventas: ventas,
        onEditar: onEditarCliente
      })]
    }, c.id))]
  });
}
function ClientesDormidos({
  clientes,
  ventas,
  repartos,
  onVolver,
  onSeleccionar,
  onEditarCliente,
  onEliminar,
  onPerdida
}) {
  const [semanas, setSemanas] = React.useState(4);
  const hoy = new Date();
  const ultima = {};
  (ventas || []).forEach(v => {
    if (v._esCobro || v._esAjuste || v._esAjusteEnvases || v._esMixtoTrans) return;
    const fk = v.fechaKey;
    if (!fk) return;
    if (!ultima[v.clienteId] || fk > ultima[v.clienteId]) ultima[v.clienteId] = fk;
  });
  const diasDesde = fk => {
    if (!fk) return Infinity;
    const d = new Date(fk + "T12:00:00");
    return Math.floor((hoy - d) / 86400000);
  };
  const lista = (clientes || []).map(c => {
    const fk = ultima[c.id];
    return {
      ...c,
      ultimaFecha: fk,
      dias: diasDesde(fk)
    };
  }).filter(c => c.dias >= semanas * 7).sort((a, b) => b.dias - a.dias);
  const textoTiempo = c => {
    if (c.dias === Infinity) return "Sin compras registradas";
    const sem = Math.floor(c.dias / 7);
    return `Hace ${sem} semana${sem !== 1 ? "s" : ""}` + (c.ultimaFecha ? ` · últ. ${c.ultimaFecha}` : "");
  };
  const nombreRepartidor = c => {
    const rep = (repartos || []).find(r => r.id === c.repartoId || String(r.id) === String(c.repartoId));
    return rep ? rep.repartidorNombre : null;
  };
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsxs("div", {
      style: s.header,
      children: [/*#__PURE__*/_jsx("button", {
        style: s.backBtn,
        onClick: onVolver,
        children: "← Volver"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          flex: 1
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: s.headerTitle,
          children: "😴 Clientes dormidos"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 11,
            color: "var(--color-text-tertiary)"
          },
          children: [lista.length, " cliente", lista.length !== 1 ? "s" : "", " sin comprar hace ", semanas, "+ semanas"]
        })]
      }), /*#__PURE__*/_jsx(HeaderBotones, {})]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: "10px 14px 4px",
        display: "flex",
        gap: 6,
        alignItems: "center"
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)"
        },
        children: "Sin comprar hace:"
      }), [2, 3, 4, 8].map(n => /*#__PURE__*/_jsxs("button", {
        onClick: () => setSemanas(n),
        style: {
          padding: "5px 10px",
          fontSize: 12,
          borderRadius: 8,
          cursor: "pointer",
          border: "0.5px solid var(--color-border-secondary)",
          background: semanas === n ? "#185FA5" : "var(--color-background-tertiary)",
          color: semanas === n ? "#e2eaf4" : "var(--color-text-secondary)",
          fontWeight: semanas === n ? 600 : 400
        },
        children: [n, "+ sem"]
      }, n))]
    }), /*#__PURE__*/_jsx("div", {
      style: {
        padding: "0 14px 4px"
      },
      children: /*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          background: "var(--color-background-tertiary)",
          borderRadius: 8,
          padding: "7px 10px"
        },
        children: "📋 Política: a partir de 3-4 semanas sin comprar, se recomienda retirar los envases y eliminar al cliente."
      })
    }), lista.length === 0 && /*#__PURE__*/_jsx("div", {
      style: {
        padding: 40,
        textAlign: "center",
        color: "var(--color-text-success)",
        fontSize: 15
      },
      children: "✅ ¡Ningún cliente dormido con ese filtro!"
    }), lista.map(c => /*#__PURE__*/_jsxs("div", {
      style: {
        ...s.card,
        margin: "6px 14px"
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1,
            minWidth: 0,
            cursor: "pointer"
          },
          onClick: () => onSeleccionar && onSeleccionar(c),
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: c.nombre
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 2
            },
            children: [c.dia, direccionCliente(c) ? " · " + direccionCliente(c) : ""]
          }), nombreRepartidor(c) && /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-info)",
              marginTop: 2
            },
            children: ["🚚 ", nombreRepartidor(c)]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: c.dias >= 28 ? "var(--color-text-danger)" : "var(--color-text-warning)",
              marginTop: 4
            },
            children: ["⏳ ", textoTiempo(c)]
          }), c.saldo < 0 && /*#__PURE__*/_jsxs("div", {
            style: {
              fontSize: 11,
              color: "var(--color-text-danger)",
              marginTop: 3
            },
            children: ["Debe ", fmt(Math.abs(c.saldo))]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
            alignItems: "center"
          },
          children: [c.telefono && /*#__PURE__*/_jsx("a", {
            href: `https://wa.me/54${c.telefono}`,
            target: "_blank",
            rel: "noreferrer",
            style: {
              fontSize: 22,
              textDecoration: "none"
            },
            title: "WhatsApp",
            children: "💬"
          }), (c.maps || c.lat && c.lng) && /*#__PURE__*/_jsx("a", {
            href: c.maps || `https://www.google.com/maps?q=${c.lat},${c.lng}`,
            target: "_blank",
            rel: "noreferrer",
            style: {
              fontSize: 22,
              textDecoration: "none"
            },
            title: "Mapa",
            children: "📍"
          })]
        })]
      }), onEditarCliente && /*#__PURE__*/_jsx(PieEnvases, {
        c: c,
        ventas: ventas,
        onEditar: onEditarCliente,
        onPerdida: onPerdida,
        izquierda: onEliminar && /*#__PURE__*/_jsx("button", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 20,
            cursor: "pointer",
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
            border: "1px solid var(--color-border-danger)"
          },
          onClick: e => {
            e.stopPropagation();
            onEliminar(c.id);
          },
          children: "🗑️ Eliminar"
        })
      })]
    }, c.id))]
  });
}