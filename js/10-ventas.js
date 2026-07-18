import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
  progressData
}) {
  const [transConfirmada, setTransConfirmada] = React.useState(false);
  const [mostrarCambio, setMostrarCambio] = React.useState(false);
  const [productoViejoCambio, setProductoViejoCambio] = React.useState("Bidón 20L");
  const [productoNuevoCambio, setProductoNuevoCambio] = React.useState("Bidón 20L");
  const [motivoCambio, setMotivoCambio] = React.useState("Agua en mal estado");
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
    if (ultimaConProd) {
      const det = Array.isArray(ultimaConProd.detalle) ? ultimaConProd.detalle : Object.values(ultimaConProd.detalle || {});
      det.forEach(d => {
        if (!d._esDispRoto && d.nombre in m && nombresEntrega.includes(d.nombre)) m[d.nombre] = d.cantidad;
      });
    }
    return m;
  });
  const [repetido, setRepetido] = useState(!!ultimaConProd);
  const ventasClienteRef = React.useRef(ventasCliente);
  React.useEffect(() => {
    if (ventasClienteRef.current === ventasCliente || repetido) return;
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
  const [pago, setPago] = useState("contado");
  const [monto, setMonto] = useState("");
  const [montoEfec, setMontoEfec] = useState(""); // pago mixto: parte efectivo
  const [montoTrans, setMontoTrans] = useState(""); // pago mixto: parte transferencia
  const [transConfMixto, setTransConfMixto] = useState(false);
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
  const [obs, setObs] = useState("");
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
  const saldoApl = usarSaldo && pago !== "fiado" ? Math.min(saldoDisp, neto) : 0;
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
  }) => /*#__PURE__*/_jsxs("div", {
    style: {
      ...s.row,
      marginBottom: 6
    },
    children: [/*#__PURE__*/_jsxs("select", {
      style: {
        ...s.select,
        flex: 2
      },
      value: list[i].prod,
      onChange: e => {
        const n = [...list];
        n[i].prod = e.target.value;
        setList(n);
      },
      children: [/*#__PURE__*/_jsx("option", {
        value: "",
        children: "— Producto —"
      }), productos.map(p => /*#__PURE__*/_jsx("option", {
        value: p.nombre,
        children: p.nombre
      }, p.id))]
    }), /*#__PURE__*/_jsx("input", {
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
    })]
  });
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsxs("div", {
      style: {
        position: "sticky",
        top: 0,
        zIndex: 15,
        background: "var(--color-background-primary)"
      },
      children: [/*#__PURE__*/_jsx(HeaderApp, {
        titulo: `Clientes · ${cliente.dia || ""}`,
        onVolver: onVolver
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          background: "var(--color-background-secondary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
          padding: "10px 14px"
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
              minWidth: 0
            },
            children: [/*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)"
              },
              children: cliente.nombre
            }), /*#__PURE__*/_jsxs("div", {
              style: {
                fontSize: 11,
                color: "var(--color-text-secondary)",
                marginTop: 1
              },
              children: [direccionCliente(cliente), cliente.orden ? ` · #${cliente.orden}` : ""]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 10,
              fontSize: 17,
              flexShrink: 0
            },
            children: [(cliente.maps || cliente.lat && cliente.lng) && /*#__PURE__*/_jsx("a", {
              href: cliente.maps || `https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                textDecoration: "none"
              },
              onClick: e => e.stopPropagation(),
              children: "📍"
            }), cliente.telefono && /*#__PURE__*/_jsx("a", {
              href: `https://wa.me/54${cliente.telefono}`,
              target: "_blank",
              rel: "noreferrer",
              style: {
                textDecoration: "none"
              },
              onClick: e => e.stopPropagation(),
              children: "💬"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8
          },
          children: [cliente.saldo < 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-danger)",
              color: "var(--color-text-danger)"
            },
            children: ["Debe ", fmt(Math.abs(cliente.saldo))]
          }), cliente.saldo > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-success)",
              color: "var(--color-text-success)"
            },
            children: ["A favor ", fmt(cliente.saldo)]
          }), cliente.sifon > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-info)",
              color: "var(--color-text-info)"
            },
            children: ["Sifón×", cliente.sifon]
          }), cliente.bidon10 > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-info)",
              color: "var(--color-text-info)"
            },
            children: ["10L×", cliente.bidon10]
          }), cliente.bidon20 > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-info)",
              color: "var(--color-text-info)"
            },
            children: ["20L×", cliente.bidon20]
          }), cliente.dispenser > 0 && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--color-background-tertiary)",
              color: "var(--color-text-secondary)"
            },
            children: ["Disp×", cliente.dispenser]
          }), (() => {
            const aj = cliente.envAjuste || {};
            const items = [];
            if ((aj.sifon || 0) > 0) items.push(`+${aj.sifon} sif.`);
            if ((aj.bidon10 || 0) > 0) items.push(`+${aj.bidon10} 10L`);
            if ((aj.bidon20 || 0) > 0) items.push(`+${aj.bidon20} 20L`);
            return items.length > 0 ? /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 5,
                background: "var(--color-background-warning)",
                color: "var(--color-text-warning)"
              },
              children: [items.join(" "), " prest."]
            }) : null;
          })(), cliente.notas && /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 11,
              color: "var(--color-text-warning)"
            },
            children: ["📝 ", cliente.notas]
          })]
        })]
      })]
    }), progressData && /*#__PURE__*/_jsxs("div", {
      style: {
        background: "var(--color-background-tertiary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "6px 14px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: 1,
          minWidth: 120
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: "var(--color-background-secondary)",
            overflow: "hidden"
          },
          children: /*#__PURE__*/_jsx("div", {
            style: {
              height: "100%",
              borderRadius: 3,
              background: "#185FA5",
              width: `${Math.round(progressData.visitados / Math.max(progressData.total, 1) * 100)}%`
            }
          })
        }), /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 11,
            color: "var(--color-text-secondary)",
            whiteSpace: "nowrap"
          },
          children: [progressData.visitados, "/", progressData.total]
        })]
      }), /*#__PURE__*/_jsx("span", {
        style: {
          fontSize: 11,
          color: "var(--color-text-success)",
          fontWeight: 500
        },
        children: fmt(progressData.montoHoy)
      }), progressData.stock && Object.entries(progressData.stock).map(([k, v]) => v > 0 ? /*#__PURE__*/_jsxs("span", {
        style: {
          fontSize: 10,
          color: "var(--color-text-tertiary)"
        },
        children: [k, ":", v]
      }, k) : null)]
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16
      },
      children: [/*#__PURE__*/_jsx("span", {
        style: {
          ...s.sectionTitle,
          padding: "0 0 10px"
        },
        children: "Cantidades entregadas"
      }), repetido && /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "var(--color-background-info)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-info)",
            fontWeight: 500
          },
          children: "🔁 Repetido de la última venta"
        }), /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            padding: "4px 12px",
            fontSize: 12
          },
          onClick: () => {
            setCantidades(q => {
              const m = {};
              Object.keys(q).forEach(k => m[k] = 0);
              return m;
            });
            setRepetido(false);
          },
          children: "Vaciar"
        })]
      }), prodEntrega.map(p => /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: 14,
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
            gap: 6,
            alignItems: "center"
          },
          children: [/*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 16px",
              fontSize: 20,
              lineHeight: 1
            },
            onClick: () => setCantidades(q => ({
              ...q,
              [p.nombre]: Math.max(0, (q[p.nombre] || 0) - 1)
            })),
            children: "−"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 22,
              fontWeight: 500,
              minWidth: 32,
              textAlign: "center",
              color: "var(--color-text-primary)"
            },
            children: cantidades[p.nombre] || 0
          }), /*#__PURE__*/_jsx("button", {
            style: {
              ...s.btn,
              padding: "5px 16px",
              fontSize: 20,
              lineHeight: 1
            },
            onClick: () => setCantidades(q => ({
              ...q,
              [p.nombre]: (q[p.nombre] || 0) + 1
            })),
            children: "+"
          })]
        })]
      }, p.id)), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsx("label", {
        style: {
          ...s.label,
          fontSize: 13,
          marginBottom: 8
        },
        children: "Forma de pago"
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 12
        },
        children: [["contado", "Contado"], ["transferencia", "Transfer."], ["fiado", "Fiado"], ["mixto", "Mixto"]].map(([v, l]) => /*#__PURE__*/_jsx("button", {
          style: {
            ...s.btn,
            flex: 1,
            background: pago === v ? "#185FA5" : undefined,
            color: pago === v ? "#fff" : undefined,
            border: pago === v ? "none" : undefined,
            padding: "9px 4px",
            fontSize: 13
          },
          onClick: () => setPago(v),
          children: l
        }, v))
      }), pago === "transferencia" && /*#__PURE__*/_jsx("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          background: transConfirmada ? "#0a2e1f" : "#1e3a5f",
          border: transConfirmada ? "0.5px solid #4dd9a0" : "0.5px solid #5daaff"
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
              color: transConfirmada ? "#4dd9a0" : "#5daaff"
            },
            children: transConfirmada ? "✓ Transfer. confirmada" : "⏳ Confirmar transferencia"
          }), /*#__PURE__*/_jsx("button", {
            style: {
              background: transConfirmada ? "#4dd9a0" : "#185FA5",
              color: transConfirmada ? "#0a2e1f" : "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer"
            },
            onClick: () => {
              setTransConfirmada(!transConfirmada);
              if (!transConfirmada) sonarTransferencia();
            },
            children: transConfirmada ? "✓ OK" : "Confirmar"
          })]
        })
      }), pago === "mixto" && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          background: "var(--color-background-tertiary)"
        },
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            marginBottom: 8
          },
          children: "Desglose del pago mixto"
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 6
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
              onChange: e => {
                const ef = e.target.value;
                setMontoEfec(ef);
                // Total real = compra + deuda si elige pagar todo
                const totalReal = opcionSaldo === "todo" ? Math.round(Math.abs(cliente.saldo || 0) + aPagar) : aPagar;
                const resto = totalReal - Number(ef || 0);
                setMontoTrans(resto > 0 ? String(Math.round(resto)) : "0");
              }
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
        }), Number(montoEfec || 0) + Number(montoTrans || 0) > 0 && /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: (() => {
            const totalReal = opcionSaldo === "todo" ? Math.round(Math.abs(cliente.saldo || 0) + aPagar) : aPagar;
            const totalPag = Number(montoEfec || 0) + Number(montoTrans || 0);
            return /*#__PURE__*/_jsxs(_Fragment, {
              children: ["Total pagado: ", fmt(totalPag), " de ", fmt(totalReal), totalPag < totalReal && /*#__PURE__*/_jsxs("span", {
                style: {
                  color: "var(--color-text-warning)"
                },
                children: [" · Queda ", fmt(totalReal - totalPag)]
              })]
            });
          })()
        }), Number(montoTrans || 0) > 0 && /*#__PURE__*/_jsx("div", {
          style: {
            ...s.card,
            margin: "8px 0 0",
            background: transConfMixto ? "#0a2e1f" : "#1e3a5f",
            border: transConfMixto ? "0.5px solid #4dd9a0" : "0.5px solid #5daaff"
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
                color: transConfMixto ? "#4dd9a0" : "#5daaff"
              },
              children: transConfMixto ? "✓ Transfer. confirmada" : "⏳ Confirmar transferencia"
            }), /*#__PURE__*/_jsx("button", {
              style: {
                background: transConfMixto ? "#4dd9a0" : "#185FA5",
                color: transConfMixto ? "#0a2e1f" : "#fff",
                border: "none",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 11,
                cursor: "pointer"
              },
              onClick: () => {
                setTransConfMixto(!transConfMixto);
                if (!transConfMixto) sonarTransferencia();
              },
              children: transConfMixto ? "✓ OK" : "Confirmar"
            })]
          })
        })]
      }), saldoDisp > 0 && pago !== "fiado" && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          background: "var(--color-background-success)",
          border: "0.5px solid var(--color-border-success)",
          cursor: "pointer"
        },
        onClick: () => setUsarSaldo(!usarSaldo),
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            gap: 10,
            alignItems: "center"
          },
          children: [/*#__PURE__*/_jsx("input", {
            type: "checkbox",
            checked: usarSaldo,
            onChange: e => setUsarSaldo(e.target.checked),
            style: {
              width: 18,
              height: 18,
              cursor: "pointer",
              accentColor: "#0F6E56"
            }
          }), /*#__PURE__*/_jsxs("label", {
            style: {
              fontSize: 14,
              color: "var(--color-text-success)",
              cursor: "pointer",
              fontWeight: 500
            },
            children: ["Usar saldo a favor — ", fmt(saldoDisp)]
          })]
        }), usarSaldo && saldoApl > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            fontSize: 12,
            color: "var(--color-text-success)",
            marginTop: 4,
            paddingLeft: 28
          },
          children: ["Se descuentan ", fmt(saldoApl), " del total"]
        })]
      }), cliente.saldo < 0 && pago !== "fiado" && /*#__PURE__*/_jsxs("div", {
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
            marginBottom: 8
          },
          children: ["Deuda pendiente: ", fmt(Math.abs(cliente.saldo))]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 6
          },
          children: [["todo", "Paga deuda + compra de hoy", Math.abs(cliente.saldo) + aPagar], ["compra", "Solo la compra de hoy", null], ["parcial", "Pago parcial (ingresá el monto)", null]].map(([op, label, total]) => /*#__PURE__*/_jsxs("button", {
            style: {
              textAlign: "left",
              padding: "8px 12px",
              borderRadius: 8,
              border: "0.5px solid var(--color-border-danger)",
              background: opcionSaldo === op ? "#7f1d1d" : "transparent",
              color: "var(--color-text-danger)",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: opcionSaldo === op ? 500 : 400
            },
            onClick: () => setOpcionSaldo(op),
            children: [opcionSaldo === op ? "✓ " : "", label, total ? ` — ${fmt(total)}` : ""]
          }, op))
        })]
      }), pago !== "fiado" && pago !== "mixto" && /*#__PURE__*/_jsxs("div", {
        style: {
          marginBottom: 12
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: opcionSaldo === "parcial" ? "Monto que paga (parcial)" : opcionSaldo === "todo" ? "Total a cobrar (deuda + compra):" : `Monto cobrado (vacío = ${fmt(aPagar)} exacto)`
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          type: "number",
          placeholder: opcionSaldo === "todo" ? String(Math.round(Math.abs(cliente.saldo) + aPagar)) : String(Math.round(aPagar)),
          value: monto,
          onChange: e => setMonto(e.target.value)
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 12px",
          background: "var(--color-background-secondary)"
        },
        children: [bruto > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)"
            },
            children: "Subtotal"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-primary)"
            },
            children: fmt(bruto)
          })]
        }), desc > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)"
            },
            children: "Descuento 2.5%"
          }), /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-danger)"
            },
            children: ["−", fmt(desc)]
          })]
        }), saldoApl > 0 && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-secondary)"
            },
            children: "Saldo a favor"
          }), /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-success)"
            },
            children: ["−", fmt(saldoApl)]
          })]
        }), pagaTodo && /*#__PURE__*/_jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-danger)"
            },
            children: "Deuda anterior"
          }), /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 13,
              color: "var(--color-text-danger)"
            },
            children: ["+", fmt(deudaPendiente)]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            borderTop: "0.5px solid var(--color-border-tertiary)",
            paddingTop: 10,
            marginTop: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline"
          },
          children: [/*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 16,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: "A cobrar"
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: 26,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: fmt(totalACobrar)
          })]
        })]
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          marginBottom: 10,
          opacity: detalle.length === 0 ? 0.45 : 1
        },
        disabled: detalle.length === 0,
        onClick: () => {
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
        },
        children: "✓ Registrar entrega"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 10
        },
        children: [/*#__PURE__*/_jsx("button", {
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
          onClick: onNoEsta,
          children: "🔄 No está"
        }), /*#__PURE__*/_jsx("button", {
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
          onClick: onNoQuiere,
          children: "🚫 No quiere"
        }), onSaltar && /*#__PURE__*/_jsx("button", {
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
          onClick: onSaltar,
          children: "⏭ Saltar"
        })]
      }), cliente.saldo < 0 && /*#__PURE__*/_jsx(CobroDeudaPanel, {
        saldo: cliente.saldo,
        onCobrar: (mCobro, pCobro) => {
          onGuardar([{
            nombre: "Cobro de deuda",
            cantidad: 1,
            precio: 0,
            total: 0
          }], pCobro, String(mCobro), 0, [], [], `Cobro de deuda $${mCobro.toLocaleString("es-AR")} (${pCobro})`, "cobro_deuda");
        }
      }), !mostrarCambio ? /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btn,
          width: "100%",
          marginBottom: 10,
          fontSize: 12,
          padding: "8px"
        },
        onClick: () => setMostrarCambio(true),
        children: "🔄 Cambio de envase (sin cobrar)"
      }) : /*#__PURE__*/_jsxs("div", {
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
              const obsTxt = `Cambio: ${productoViejoCambio} → ${productoNuevoCambio}${motivoCambio.trim() ? ` · ${motivoCambio.trim()}` : ""}`;
              onGuardar([{
                nombre: "Cambio de envase",
                cantidad: 1,
                precio: 0,
                total: 0
              }], "cambio", "0", 0, [{
                prod: productoNuevoCambio,
                cant: 1
              }], [{
                prod: productoViejoCambio,
                cant: 1
              }], obsTxt, "cambio_envase");
              setMostrarCambio(false);
              setMotivoCambio("Agua en mal estado");
            },
            children: "✓ Registrar cambio"
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), dispenser && (cliente.dispenser || 0) > 0 && /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsx("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)"
          },
          children: "🧊 Dispenser"
        }), /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 12,
            color: "var(--color-text-secondary)"
          },
          children: ["En el cliente: ", /*#__PURE__*/_jsx("b", {
            style: {
              color: "var(--color-text-primary)"
            },
            children: cliente.dispenser
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          ...s.card,
          margin: "0 0 10px",
          padding: 0,
          overflow: "hidden"
        },
        children: [/*#__PURE__*/_jsxs("button", {
          style: {
            width: "100%",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer"
          },
          onClick: () => setEnvOpen(o => !o),
          children: [/*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)"
            },
            children: ["📦 Envases", getEnvCnt(envPrest, "Sifón 1.5L") + getEnvCnt(envPrest, "Bidón 10L") + getEnvCnt(envPrest, "Bidón 20L") + getEnvCnt(envDev, "Sifón 1.5L") + getEnvCnt(envDev, "Bidón 10L") + getEnvCnt(envDev, "Bidón 20L") > 0 ? " · hay movimientos" : ""]
          }), /*#__PURE__*/_jsx("span", {
            style: {
              color: "var(--color-text-tertiary)",
              fontSize: 16,
              transform: envOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s"
            },
            children: "⌃"
          })]
        }), envOpen && prodEntrega.map(p => /*#__PURE__*/_jsxs("div", {
          style: {
            padding: "10px 14px",
            borderTop: "0.5px solid var(--color-border-tertiary)"
          },
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            },
            children: [/*#__PURE__*/_jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)"
              },
              children: p.nombre
            }), /*#__PURE__*/_jsxs("span", {
              style: {
                fontSize: 11,
                color: "var(--color-text-tertiary)"
              },
              children: [getEnvCnt(envPrest, p.nombre) > 0 && `Presté ${getEnvCnt(envPrest, p.nombre)}`, getEnvCnt(envPrest, p.nombre) > 0 && getEnvCnt(envDev, p.nombre) > 0 && " · ", getEnvCnt(envDev, p.nombre) > 0 && `Devolvió ${getEnvCnt(envDev, p.nombre)}`]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              gap: 8
            },
            children: [/*#__PURE__*/_jsx("button", {
              style: {
                flex: 1,
                background: "var(--color-background-info)",
                color: "var(--color-text-info)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: 8,
                padding: "8px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer"
              },
              onClick: () => addEnv(setEnvPrest, p.nombre),
              children: "+ Presté uno"
            }), /*#__PURE__*/_jsx("button", {
              style: {
                flex: 1,
                background: "var(--color-background-success)",
                color: "var(--color-text-success)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: 8,
                padding: "8px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer"
              },
              onClick: () => addEnv(setEnvDev, p.nombre),
              children: "− Devolvió uno"
            })]
          }), getEnvCnt(envPrest, p.nombre) > 0 && /*#__PURE__*/_jsx("button", {
            style: {
              marginTop: 6,
              background: "none",
              border: "none",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              cursor: "pointer",
              padding: 0
            },
            onClick: () => subEnv(setEnvPrest, p.nombre),
            children: "↩ deshacer último prestado"
          }), getEnvCnt(envDev, p.nombre) > 0 && /*#__PURE__*/_jsx("button", {
            style: {
              marginTop: getEnvCnt(envPrest, p.nombre) > 0 ? 2 : 6,
              background: "none",
              border: "none",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              cursor: "pointer",
              padding: 0,
              display: "block"
            },
            onClick: () => subEnv(setEnvDev, p.nombre),
            children: "↩ deshacer última devolución"
          })]
        }, p.nombre))]
      }), /*#__PURE__*/_jsx("div", {
        style: s.divider
      }), /*#__PURE__*/_jsx("label", {
        style: s.label,
        children: "Observaciones"
      }), /*#__PURE__*/_jsx("textarea", {
        style: {
          ...s.input,
          minHeight: 60,
          resize: "vertical",
          marginBottom: 14
        },
        value: obs,
        onChange: e => setObs(e.target.value),
        placeholder: "Notas opcionales..."
      })]
    })]
  });
}
function NuevoCliente({
  diaActual,
  repartoActual,
  onGuardar,
  onVolver
}) {
  const [datos, setDatos] = useState({
    nombre: "",
    dia: diaActual || "Martes",
    barrio: "",
    manzana: "",
    lote: "",
    sector: "",
    repartoId: repartoActual?.id || null,
    calle: "",
    nro: "",
    aclaracion: "",
    telefono: "",
    maps: "",
    foto: "",
    notas: "",
    sifon: 0,
    bidon10: 0,
    bidon20: 0,
    orden: "",
    saldo: 0
  });
  const set = (k, v) => setDatos(d => ({
    ...d,
    [k]: v
  }));
  return /*#__PURE__*/_jsxs("div", {
    style: s.screen,
    children: [/*#__PURE__*/_jsx(HeaderApp, {
      titulo: "Nuevo cliente",
      onVolver: onVolver
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10
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
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Número de orden en la ruta"
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          type: "number",
          min: 1,
          placeholder: "ej: 5",
          value: datos.orden || "",
          onChange: e => set("orden", Number(e.target.value) || "")
        })]
      }), [["nombre", "Nombre y apellido *"], ["barrio", "Barrio"], ["manzana", "Manzana"], ["lote", "Lote"], ["sector", "Sector"], ["calle", "Calle"], ["nro", "Número"], ["aclaracion", "Aclaración (piso, dpto, etc)"], ["telefono", "Teléfono (sin 0 ni 15)"], ["maps", "Link Google Maps"], ["foto", "Link foto del domicilio"], ["notas", "Notas rápidas (timbre, perro, deuda...)"]].map(([k, pl]) => /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: pl.replace(" *", "")
        }), /*#__PURE__*/_jsx("input", {
          style: s.input,
          placeholder: pl.replace(" *", ""),
          value: datos[k] || "",
          onChange: e => set(k, e.target.value)
        })]
      }, k)), /*#__PURE__*/_jsx("span", {
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
            value: datos[k],
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
      }), datos.foto && /*#__PURE__*/_jsx("img", {
        src: datos.foto,
        alt: "Domicilio",
        style: {
          width: "100%",
          borderRadius: 8,
          maxHeight: 160,
          objectFit: "cover"
        }
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          marginTop: 8,
          opacity: !datos.nombre ? 0.45 : 1
        },
        disabled: !datos.nombre,
        onClick: () => onGuardar(datos),
        children: "Agregar cliente"
      })]
    })]
  });
}

// ─── MÓDULO PROMOCIÓN ────────────────────────────────────────────────────────