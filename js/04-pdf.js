// ════════════════════════════════════════════════════════════════════
// ◆  04-pdf.js — PantallaElegirTema
// ════════════════════════════════════════════════════════════════════
// Antes este archivo también tenía la generación de PDF (generarPDFDiario/
// Semanal/Mensual) y un "usarInformes" propio para mandarlos por mail. Se
// sacó: quedó reemplazado hace tiempo por la versión de 16-extras.js (envío
// de HTML directo por Brevo, sin PDF) — esa es la que se declara después en
// el orden de carga de index.html y la que realmente se usa. También se
// sacó el componente "Cargando" de acá abajo, que no se renderizaba en
// ningún lado.
function PantallaElegirTema({
  onElegido
}) {
  const [seleccion, setSeleccion] = React.useState("oscuro-azul");
  const [modoVista, setModoVista] = React.useState("oscuro");
  React.useEffect(() => {
    aplicarTemaLC(seleccion);
  }, [seleccion]);
  const temasFiltrados = Object.entries(TEMAS_LC).filter(([, t]) => t.modo === modoVista);
  const lic = (() => {
    try {
      return JSON.parse(localStorage.getItem("rm_licencia") || "null");
    } catch {
      return null;
    }
  })();
  const logo = lic?.logo || null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      padding: "24px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 20
    }
  }, logo ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "logo",
    style: {
      height: 60,
      objectFit: "contain",
      marginBottom: 8
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "var(--color-background-info)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 30,
      margin: "0 auto 8px"
    }
  }, "💧"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      marginBottom: 4
    }
  }, "Elegí tu estilo"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)"
    }
  }, "Esta elección va a quedar fija en tu app.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16,
      justifyContent: "center"
    }
  }, [["oscuro", "🌙 Modo oscuro"], ["claro", "☀️ Modo claro"]].map(([m, l]) => /*#__PURE__*/React.createElement("button", {
    key: m,
    style: {
      flex: 1,
      maxWidth: 160,
      padding: "8px 12px",
      fontSize: 13,
      fontWeight: 500,
      borderRadius: 10,
      cursor: "pointer",
      background: modoVista === m ? "var(--color-accent)" : "var(--color-background-secondary)",
      color: modoVista === m ? "#fff" : "var(--color-text-secondary)",
      border: `1px solid ${modoVista === m ? "transparent" : "var(--color-border-secondary)"}`
    },
    onClick: () => setModoVista(m)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 20
    }
  }, temasFiltrados.map(([id, tema]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setSeleccion(id),
    style: {
      padding: "12px 10px",
      borderRadius: 12,
      cursor: "pointer",
      textAlign: "center",
      border: `2px solid ${seleccion === id ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
      background: seleccion === id ? "var(--color-background-secondary)" : "var(--color-background-tertiary)",
      boxShadow: seleccion === id ? "0 0 0 1px var(--color-accent)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      marginBottom: 4
    }
  }, tema.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, tema.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      justifyContent: "center",
      marginTop: 6
    }
  }, [tema.vars["--color-background-primary"], tema.vars["--color-accent"] || tema.vars["--color-text-info"], tema.vars["--color-text-success"], tema.vars["--color-text-warning"]].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: c,
      border: "1px solid rgba(128,128,128,0.3)"
    }
  })))))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...s.btnPrimary,
      width: "100%",
      padding: "14px",
      fontSize: 15
    },
    onClick: () => onElegido(seleccion)
  }, "Confirmar estilo →"));
}
