
// ════════════════════════════════════════════════════════════════════
// ◆  Prospectos — lista de gente visitada durante una promoción que
//    todavía no es cliente (no la encontraron en casa, se mudó, etc).
//    Se guarda nombre/teléfono/dirección para hacer seguimiento y, cuando
//    corresponda, convertirlo en cliente real (precarga el alta). Vive
//    dentro de la pestaña "Promociones" del Panel del dueño — por eso
//    puede renderizarse SIN su propio encabezado (prop sinHeader).
// ════════════════════════════════════════════════════════════════════
function Prospectos({ prospectos, onGuardar, onEliminar, onConvertir, onVolver, sinHeader }) {
  const [mostrarForm, setMostrarForm] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [calle, setCalle] = React.useState("");
  const [nro, setNro] = React.useState("");
  const [barrio, setBarrio] = React.useState("");
  const [sector, setSector] = React.useState("");
  const [manzana, setManzana] = React.useState("");
  const [lote, setLote] = React.useState("");
  const [aclaracion, setAclaracion] = React.useState("");
  const [maps, setMaps] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [verConvertidos, setVerConvertidos] = React.useState(false);

  const limpiarForm = () => {
    setNombre("");
    setTelefono("");
    setCalle("");
    setNro("");
    setBarrio("");
    setSector("");
    setManzana("");
    setLote("");
    setAclaracion("");
    setMaps("");
    setNotas("");
    setMostrarForm(false);
  };

  const guardar = () => {
    if (!nombre.trim()) {
      alert("⚠️ Poné al menos el nombre.");
      return;
    }
    onGuardar({
      id: "p" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      calle: calle.trim(),
      nro: nro.trim(),
      barrio: barrio.trim(),
      sector: sector.trim(),
      manzana: manzana.trim(),
      lote: lote.trim(),
      aclaracion: aclaracion.trim(),
      maps: maps.trim(),
      notas: notas.trim(),
      estado: "pendiente",
      fecha: new Date().toLocaleDateString("es-AR")
    });
    limpiarForm();
  };

  const lista = (prospectos || [])
    .filter(p => verConvertidos || p.estado !== "convertido")
    .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));

  const renderForm = () => {
    if (!mostrarForm) return null;
    return React.createElement("div", { style: s.card },
      React.createElement("div", { style: { marginBottom: 8 } },
        React.createElement("label", { style: s.label }, "Nombre *"),
        React.createElement("input", {
          style: s.input, placeholder: "Nombre y apellido",
          value: nombre, onChange: e => setNombre(e.target.value), autoFocus: true
        })
      ),
      React.createElement("div", { style: { marginBottom: 8 } },
        React.createElement("label", { style: s.label }, "Teléfono (sin 0 ni 15)"),
        React.createElement("input", {
          style: s.input, placeholder: "3816559000",
          value: telefono, onChange: e => setTelefono(e.target.value)
        })
      ),
      React.createElement("div", { style: { ...s.grid2, marginBottom: 8 } },
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Calle"),
          React.createElement("input", {
            style: s.input, placeholder: "Calle",
            value: calle, onChange: e => setCalle(e.target.value)
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Número"),
          React.createElement("input", {
            style: s.input, placeholder: "Nro",
            value: nro, onChange: e => setNro(e.target.value)
          })
        )
      ),
      React.createElement("div", { style: { ...s.grid2, marginBottom: 8 } },
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Barrio"),
          React.createElement("input", {
            style: s.input, placeholder: "Barrio",
            value: barrio, onChange: e => setBarrio(e.target.value)
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Sector"),
          React.createElement("input", {
            style: s.input, placeholder: "Sector",
            value: sector, onChange: e => setSector(e.target.value)
          })
        )
      ),
      React.createElement("div", { style: { ...s.grid3, marginBottom: 8 } },
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Manzana"),
          React.createElement("input", {
            style: s.input, placeholder: "Mz",
            value: manzana, onChange: e => setManzana(e.target.value)
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Lote"),
          React.createElement("input", {
            style: s.input, placeholder: "Lote",
            value: lote, onChange: e => setLote(e.target.value)
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: s.label }, "Casa/Dpto"),
          React.createElement("input", {
            style: s.input, placeholder: "Casa",
            value: aclaracion, onChange: e => setAclaracion(e.target.value)
          })
        )
      ),
      React.createElement("div", { style: { marginBottom: 8 } },
        React.createElement("label", { style: s.label }, "Link Google Maps"),
        React.createElement("input", {
          style: s.input, placeholder: "https://maps.app.goo.gl/...",
          value: maps, onChange: e => setMaps(e.target.value)
        })
      ),
      React.createElement("div", { style: { marginBottom: 10 } },
        React.createElement("label", { style: s.label }, "Notas (cuándo volver, qué le interesó, etc.)"),
        React.createElement("input", {
          style: s.input, placeholder: "Notas",
          value: notas, onChange: e => setNotas(e.target.value)
        })
      ),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement("button", { style: { ...s.btn, flex: 1 }, onClick: limpiarForm }, "Cancelar"),
        React.createElement("button", { style: { ...s.btnPrimary, flex: 2 }, onClick: guardar }, "Guardar prospecto")
      )
    );
  };

  const renderItem = p => React.createElement("div", {
      key: p.id,
      style: { ...s.card, opacity: p.estado === "convertido" ? 0.55 : 1 }
    },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" } },
          p.nombre,
          p.estado === "convertido" && React.createElement("span", { style: { ...s.badge("success"), marginLeft: 6 } }, "✓ Cliente")
        ),
        (p.calle || p.barrio || p.sector || p.manzana || p.lote) && React.createElement("div", { style: { fontSize: 12, color: "var(--color-text-secondary)" } },
          [
            [p.calle, p.nro].filter(Boolean).join(" "),
            p.barrio,
            p.sector,
            (p.manzana || p.lote) && `Mz ${p.manzana || "-"} Lote ${p.lote || "-"}`
          ].filter(Boolean).join(" · ")
        )
      ),
      React.createElement("span", { style: { fontSize: 11, color: "var(--color-text-tertiary)" } }, p.fecha)
    ),
    p.notas && React.createElement("div", { style: { fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 } }, "📝 ", p.notas),
    React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
      p.telefono && React.createElement("a", {
        href: `https://wa.me/54${p.telefono}?text=${encodeURIComponent(`Hola ${p.nombre}! Te contacto de reparto, pasamos por tu casa hace poco. ¿Te interesa que te llevemos agua?`)}`,
        target: "_blank", rel: "noreferrer",
        style: { ...s.btn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }
      }, "💬 WhatsApp"),
      p.estado !== "convertido" && React.createElement("button", {
        style: { ...s.btn, background: "#185FA5", color: "#fff", border: "none" },
        onClick: () => onConvertir(p)
      }, "✓ Convertir en cliente"),
      React.createElement("button", {
        style: { ...s.btnDanger, marginLeft: "auto" },
        onClick: () => { if (window.confirm(`¿Eliminar el prospecto "${p.nombre}"?`)) onEliminar(p.id); }
      }, "Eliminar")
    )
  );

  const cuerpo = React.createElement(React.Fragment, null,
    React.createElement("div", { style: { padding: sinHeader ? "10px 14px 0" : "10px 14px 0" } },
      React.createElement("p", { style: { fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 10 } },
        "Gente que visitaste en una promoción y todavía no es cliente (no estaba en casa, se mudó, etc). Anotá el contacto acá para hacer seguimiento después."
      ),
      !mostrarForm && React.createElement("button", {
        style: { ...s.btnPrimary, marginBottom: 10 },
        onClick: () => setMostrarForm(true)
      }, "➕ Nuevo prospecto")
    ),
    renderForm(),
    React.createElement("div", { style: { padding: "4px 14px" } },
      React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-tertiary)", margin: "6px 0" } },
        React.createElement("input", { type: "checkbox", checked: verConvertidos, onChange: e => setVerConvertidos(e.target.checked) }),
        "Ver ya convertidos en clientes"
      )
    ),
    lista.length === 0 && React.createElement("p", {
      style: { fontSize: 13, color: "var(--color-text-tertiary)", padding: "20px 14px", textAlign: "center" }
    }, "Sin prospectos cargados todavía."),
    lista.map(renderItem)
  );

  if (sinHeader) return cuerpo;

  return React.createElement("div", { style: s.screen },
    React.createElement(HeaderApp, { titulo: "Promociones · Prospectos", onVolver: onVolver }),
    cuerpo
  );
}
