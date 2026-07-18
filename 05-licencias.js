import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ════════════════════════════════════════════════════════════════════
// ◆  05-licencias.js — Brevo · PantallaActivacion · PantallaPin · getDeviceId · getLogo
// ════════════════════════════════════════════════════════════════════

// El endpoint y token del proxy de email se declaran una sola vez en index.html
// (window.EMAIL_ENDPOINT / window.EMAIL_TOKEN). Acá se reutilizan.
async function enviarEmailBrevo({
  to,
  toName,
  subject,
  htmlContent
}) {
  try {
    const resp = await fetch(window.EMAIL_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        token: window.EMAIL_TOKEN,
        to,
        toName: toName || to,
        subject,
        htmlContent
      })
    });
    const data = await resp.json().catch(() => ({
      ok: false,
      error: "respuesta inválida del servicio"
    }));
    if (!data.ok) {
      console.error("Email error:", data.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email error:", e);
    return false;
  }
}

// ── PANTALLAS DE SEGURIDAD ───────────────────────────────────────────────────
function PantallaActivacion({
  onActivado
}) {
  const [codigo, setCodigo] = React.useState("");
  const [celular, setCelular] = React.useState("");
  const [terminos, setTerminos] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [negocio, setNegocio] = React.useState("");
  const [paso, setPaso] = React.useState(1); // 1=código, 2=datos
  const [error, setError] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const verificarCodigo = async () => {
    if (!codigo.trim()) {
      setError("Ingresá el código de activación");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const doc = await window.dbLicencias.collection("licencias").doc(codigo.trim().toUpperCase()).get();
      if (!doc.exists) {
        setError("Código inválido. Verificá que esté bien escrito.");
        setCargando(false);
        return;
      }
      const lic = doc.data();
      if (lic.estado === "inactivo") {
        setError("Esta licencia está desactivada. Contactá al soporte.");
        setCargando(false);
        return;
      }
      if (lic.estado === "pendiente") {
        setError("Tu licencia está pendiente de activación por el administrador. Contactá a Emma Soluciones.");
        setCargando(false);
        return;
      }
      if (lic.estado === "usado") {
        const miDevice = getDeviceId();
        const miTipo = tipoDispositivoRM();
        const dispositivos = slotsLicenciaRM(lic, miDevice, miTipo);
        const slotOcupado = dispositivos[miTipo];
        if (slotOcupado && slotOcupado !== miDevice) {
          setError(`Este código ya está en uso en ${miTipo === "pc" ? "otra computadora" : "otro celular"}.`);
          setCargando(false);
          return;
        }
      }
      setPaso(2);
    } catch (e) {
      setError("Error de conexión. Verificá tu internet.");
    }
    setCargando(false);
  };
  const completarActivacion = async () => {
    if (!celular.trim() || !email.trim() || !negocio.trim()) {
      setError("Completá todos los campos");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email inválido");
      return;
    }
    if (!terminos) {
      setError("Debés aceptar los Términos y Condiciones para continuar");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const codigoUp = codigo.trim().toUpperCase();
      const doc = await window.dbLicencias.collection("licencias").doc(codigoUp).get();
      const lic = doc.data();
      if (lic.email && lic.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        setError("El email no coincide con el registrado. Contactá al administrador.");
        setCargando(false);
        return;
      }
      if (lic.celular && lic.celular.trim() !== celular.trim()) {
        setError("El celular no coincide con el registrado. Contactá al administrador.");
        setCargando(false);
        return;
      }
      const deviceId = getDeviceId();
      const miTipo = tipoDispositivoRM();
      const dispositivos = slotsLicenciaRM(lic, deviceId, miTipo);
      const slotOcupado = dispositivos[miTipo];
      if (slotOcupado && slotOcupado !== deviceId) {
        setError(`Este código ya está en uso en ${miTipo === "pc" ? "otra computadora" : "otro celular"}.`);
        setCargando(false);
        return;
      }
      dispositivos[miTipo] = deviceId;
      await window.dbLicencias.collection("licencias").doc(codigoUp).update({
        estado: "usado",
        deviceId,
        dispositivos,
        celular: celular.trim(),
        email: email.trim(),
        negocio: negocio.trim(),
        aceptoTerminos: true,
        fechaAceptoTerminos: new Date().toISOString(),
        activadoEn: new Date().toISOString()
      });
      // Guardar en localStorage
      localStorage.setItem("rm_licencia", JSON.stringify({
        codigo: codigoUp,
        pin: lic.pin,
        email: email.trim(),
        celular: celular.trim(),
        negocio: negocio.trim(),
        deviceId,
        activado: true,
        logo: lic.logo || ""
      }));
      // ── Email de activación (vía proxy Apps Script, sin clave expuesta) ──
      try {
        enviarEmailBrevo({
          to: email.trim(),
          toName: negocio.trim(),
          subject: "✅ Sistema de Reparto activado correctamente",
          htmlContent: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px"><div style="background:#185FA5;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px"><h2 style="color:#fff;margin:0">¡Bienvenido!</h2><p style="color:rgba(255,255,255,.8);margin:8px 0 0">${negocio.trim()}</p></div><p style="color:#333">Tu app <b>Sistema de Reparto</b> fue activada correctamente.</p><div style="background:#f0f7ff;border-radius:10px;padding:16px;text-align:center;margin:16px 0"><div style="font-size:13px;color:#666;margin-bottom:4px">Tu PIN de acceso</div><div style="font-size:32px;font-weight:800;color:#185FA5;letter-spacing:8px">${lic.pin}</div><div style="font-size:12px;color:#999;margin-top:4px">Guardalo en un lugar seguro</div></div><p style="color:#555;font-size:13px">📱 Código: <b>${codigoUp}</b></p><p style="color:#999;font-size:12px;margin-top:20px">¿Ayuda? WhatsApp: <b>+54 9 381 339-9962</b></p><p style="color:#bbb;font-size:11px">Emma Soluciones Digitales</p></div>`
        });
      } catch (e) {}
      onActivado(lic.pin);
    } catch (e) {
      setError("Error al activar. Intentá de nuevo.");
    }
    setCargando(false);
  };
  return /*#__PURE__*/_jsxs("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      minHeight: "100vh",
      gap: 16
    },
    children: [/*#__PURE__*/_jsx("div", {
      style: {
        width: 70,
        height: 70,
        borderRadius: "50%",
        background: "var(--color-background-info)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 34
      },
      children: "💧"
    }), /*#__PURE__*/_jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 600,
        color: "var(--color-text-primary)",
        textAlign: "center"
      },
      children: "Sistema de Reparto 2026 · Multi"
    }), paso === 1 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 14,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.5
        },
        children: "Primera vez aquí. Ingresá el código de activación que recibiste."
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          width: "100%",
          maxWidth: 320
        },
        children: [/*#__PURE__*/_jsx("label", {
          style: s.label,
          children: "Código de activación"
        }), /*#__PURE__*/_jsx("input", {
          style: {
            ...s.input,
            textAlign: "center",
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase"
          },
          placeholder: "SR2026-XXXX",
          value: codigo,
          onChange: e => setCodigo(e.target.value.toUpperCase()),
          onKeyDown: e => e.key === "Enter" && verificarCodigo()
        })]
      }), error && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text-danger)",
          textAlign: "center"
        },
        children: error
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          width: 200,
          opacity: cargando ? 0.6 : 1
        },
        disabled: cargando,
        onClick: verificarCodigo,
        children: cargando ? "Verificando..." : "Continuar →"
      })]
    }), paso === 2 && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 14,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.5
        },
        children: "✓ Código válido. Completá tus datos para activar la app."
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          width: "100%",
          maxWidth: 320,
          display: "flex",
          flexDirection: "column",
          gap: 10
        },
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Nombre del negocio *"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            placeholder: "Ej: Sodería La Esperanza",
            value: negocio,
            onChange: e => setNegocio(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Número de celular *"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            type: "tel",
            placeholder: "3816559001",
            value: celular,
            onChange: e => setCelular(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            style: s.label,
            children: "Email (recibirás los informes aquí) *"
          }), /*#__PURE__*/_jsx("input", {
            style: s.input,
            type: "email",
            placeholder: "tu@email.com",
            value: email,
            onChange: e => setEmail(e.target.value)
          })]
        })]
      }), /*#__PURE__*/_jsxs("label", {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          maxWidth: 320,
          cursor: "pointer",
          marginTop: 4
        },
        children: [/*#__PURE__*/_jsx("input", {
          type: "checkbox",
          checked: terminos,
          onChange: e => setTerminos(e.target.checked),
          style: {
            marginTop: 3,
            width: 18,
            height: 18,
            accentColor: "var(--color-accent)",
            flexShrink: 0
          }
        }), /*#__PURE__*/_jsxs("span", {
          style: {
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.5
          },
          children: ["Acepto los ", /*#__PURE__*/_jsx("span", {
            style: {
              color: "var(--color-text-info)",
              fontWeight: 600
            },
            children: "Términos y Condiciones"
          }), " del servicio. La aplicación se contrata en modalidad mensual. El acceso se suspende si el pago no se realiza antes del día 11 de cada mes."]
        })]
      }), error && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text-danger)",
          textAlign: "center"
        },
        children: error
      }), /*#__PURE__*/_jsx("button", {
        style: {
          ...s.btnPrimary,
          width: 200,
          opacity: cargando ? 0.6 : 1
        },
        disabled: cargando,
        onClick: completarActivacion,
        children: cargando ? "Activando..." : "Activar app →"
      })]
    })]
  });
}

// ── Acceso biométrico (huella / Face ID) con WebAuthn — Multi ──────────────
const SR_BIO_KEY = "sr_bio_cred";
function bioSoportado() {
  return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
}
function bioEnrolado() {
  try {
    return !!localStorage.getItem(SR_BIO_KEY);
  } catch {
    return false;
  }
}
function bioRechazado() {
  try {
    return localStorage.getItem("sr_bio_no") === "1";
  } catch {
    return false;
  }
}
function _srB64ToBuf(b64) {
  const x = atob(b64);
  const u = new Uint8Array(x.length);
  for (let i = 0; i < x.length; i++) u[i] = x.charCodeAt(i);
  return u.buffer;
}
function _srBufToB64(buf) {
  const u = new Uint8Array(buf);
  let x = "";
  for (let i = 0; i < u.length; i++) x += String.fromCharCode(u[i]);
  return btoa(x);
}
async function srBioRegistrar() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: "Sistema de Reparto Multi"
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: "usuario",
        displayName: "Usuario"
      },
      pubKeyCredParams: [{
        type: "public-key",
        alg: -7
      }, {
        type: "public-key",
        alg: -257
      }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    }
  });
  if (!cred) throw new Error("cancelado");
  localStorage.setItem(SR_BIO_KEY, _srBufToB64(cred.rawId));
  localStorage.removeItem("sr_bio_no");
  return true;
}
async function srBioVerificar() {
  const r = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{
        type: "public-key",
        id: _srB64ToBuf(localStorage.getItem(SR_BIO_KEY))
      }],
      userVerification: "required",
      timeout: 60000
    }
  });
  return !!r;
}
function PantallaPin({
  pin,
  onOk
}) {
  const [intento, setIntento] = React.useState("");
  const [error, setError] = React.useState("");
  const [intentos, setIntentos] = React.useState(0);
  const [bloqueado, setBloqueado] = React.useState(false);
  const [faseEnrolar, setFaseEnrolar] = React.useState(false);
  const [bioMsg, setBioMsg] = React.useState("");
  const [mostrarPin, setMostrarPin] = React.useState(true);
  const [fallosBio, setFallosBio] = React.useState(0);
  const puedeBio = bioSoportado();
  const bioOn = bioEnrolado();

  // Intento automático de huella al montar
  React.useEffect(() => {
    if (puedeBio && bioOn) {
      setMostrarPin(false);
      srBioVerificar().then(ok => {
        if (ok) onOk();
      }).catch(() => {
        setFallosBio(1);
        setMostrarPin(true);
        setBioMsg("Usá tu PIN para entrar.");
      });
    }
  }, []);
  const finalizar = () => {
    if (puedeBio && !bioEnrolado() && !bioRechazado()) setFaseEnrolar(true);else onOk();
  };
  const verificar = () => {
    if (intento === String(pin)) {
      setError("");
      finalizar();
    } else {
      const nv = intentos + 1;
      setIntentos(nv);
      setIntento("");
      if (nv >= 5) {
        setBloqueado(true);
        setError("Demasiados intentos. Contactá al soporte.");
      } else setError(`PIN incorrecto (${5 - nv} intento${5 - nv !== 1 ? "s" : ""} restante${5 - nv !== 1 ? "s" : ""})`);
    }
  };
  const intentarHuellaDeNuevo = async () => {
    setBioMsg("");
    setError("");
    try {
      if (await srBioVerificar()) onOk();
    } catch (e) {
      const nf = fallosBio + 1;
      setFallosBio(nf);
      if (nf >= 3) {
        setBioMsg("Demasiados intentos. Usá tu PIN.");
        setMostrarPin(true);
      } else setBioMsg(`No se reconoció. Intentos restantes: ${3 - nf}`);
    }
  };
  const activarHuella = async () => {
    try {
      await srBioRegistrar();
      onOk();
    } catch (e) {
      onOk();
    }
  };
  const saltarHuella = () => {
    try {
      localStorage.setItem("sr_bio_no", "1");
    } catch (e) {}
    onOk();
  };
  const teclas = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", "0", "⌫"];
  return /*#__PURE__*/_jsxs("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      minHeight: "100vh",
      gap: 20
    },
    children: [/*#__PURE__*/_jsx("div", {
      style: {
        width: 70,
        height: 70,
        borderRadius: "50%",
        background: "var(--color-background-info)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 34
      },
      children: "💧"
    }), /*#__PURE__*/_jsx("h1", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        color: "var(--color-text-primary)"
      },
      children: "Sistema de Reparto 2026 · Multi"
    }), faseEnrolar ? /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        maxWidth: 280
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 46
        },
        children: "👆"
      }), /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 16,
          color: "var(--color-text-primary)",
          textAlign: "center",
          margin: 0,
          fontWeight: 600
        },
        children: "¿Entrar con tu huella la próxima vez?"
      }), /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 12,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          margin: 0,
          lineHeight: 1.5
        },
        children: "Tu PIN sigue funcionando por si lo necesitás."
      }), /*#__PURE__*/_jsx("button", {
        style: {
          background: "#185FA5",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 20px",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          width: 210
        },
        onClick: activarHuella,
        children: "Activar huella"
      }), /*#__PURE__*/_jsx("button", {
        style: {
          background: "none",
          border: "none",
          color: "var(--color-text-secondary)",
          fontSize: 13,
          cursor: "pointer"
        },
        onClick: saltarHuella,
        children: "Ahora no"
      })]
    }) : !mostrarPin && bioOn ? /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16
      },
      children: [/*#__PURE__*/_jsx("div", {
        style: {
          fontSize: 56
        },
        children: "👆"
      }), /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 15,
          color: "var(--color-text-secondary)",
          textAlign: "center"
        },
        children: "Verificando huella..."
      }), bioMsg && /*#__PURE__*/_jsx("p", {
        style: {
          color: "#f5b942",
          fontSize: 13,
          textAlign: "center"
        },
        children: bioMsg
      }), fallosBio > 0 && fallosBio < 3 && /*#__PURE__*/_jsx("button", {
        style: {
          background: "#185FA5",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "10px 20px",
          fontSize: 14,
          cursor: "pointer"
        },
        onClick: intentarHuellaDeNuevo,
        children: "Reintentar huella"
      }), /*#__PURE__*/_jsx("button", {
        style: {
          background: "none",
          border: "none",
          color: "var(--color-text-tertiary)",
          fontSize: 13,
          cursor: "pointer",
          marginTop: 8
        },
        onClick: () => setMostrarPin(true),
        children: "Usar PIN"
      })]
    }) : /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 14,
          color: "var(--color-text-secondary)"
        },
        children: "Ingresá tu PIN de acceso"
      }), /*#__PURE__*/_jsx("div", {
        style: {
          display: "flex",
          gap: 16,
          marginBottom: 8
        },
        children: [0, 1, 2, 3].map(i => /*#__PURE__*/_jsx("div", {
          style: {
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: intento.length > i ? "#185FA5" : "transparent",
            border: "2px solid var(--color-border-secondary)"
          }
        }, i))
      }), error && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text-danger)",
          textAlign: "center"
        },
        children: error
      }), bioMsg && /*#__PURE__*/_jsx("p", {
        style: {
          fontSize: 13,
          color: "#f5b942",
          textAlign: "center"
        },
        children: bioMsg
      }), !bloqueado && /*#__PURE__*/_jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3,72px)",
          gap: 10
        },
        children: teclas.map((t, i) => /*#__PURE__*/_jsx("button", {
          style: {
            height: 60,
            fontSize: t === "⌫" ? 20 : 22,
            fontWeight: 500,
            borderRadius: 12,
            background: t === "" ? "transparent" : "var(--color-background-secondary)",
            border: t === "" ? "none" : "0.5px solid var(--color-border-secondary)",
            color: "var(--color-text-primary)",
            cursor: t === "" ? "default" : "pointer",
            opacity: t === "" ? 0 : 1
          },
          onClick: () => {
            if (t === "") return;
            if (t === "⌫") setIntento(v => v.slice(0, -1));else if (intento.length < 4) {
              const nv = intento + t;
              setIntento(nv);
              if (nv.length === 4) setTimeout(() => {
                if (nv === String(pin)) {
                  setError("");
                  finalizar();
                } else {
                  setIntento("");
                  setIntentos(prev => {
                    const n2 = prev + 1;
                    if (n2 >= 5) {
                      setBloqueado(true);
                      setError("Demasiados intentos. Contactá al soporte.");
                    } else {
                      setError(`PIN incorrecto (${5 - n2} intento${5 - n2 !== 1 ? "s" : ""} restante${5 - n2 !== 1 ? "s" : ""})`);
                    }
                    return n2;
                  });
                }
              }, 200);
            }
          },
          children: t
        }, i))
      })]
    })]
  });
}
function getDeviceId() {
  let id = localStorage.getItem("sr_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("sr_device_id", id);
  }
  return id;
}

// ── Tipo de dispositivo (PC o móvil) — para el licenciamiento de 2 aparatos del dueño ──
function tipoDispositivoRM() {
  const ua = navigator.userAgent || "";
  const esMovilUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  // iPadOS 13+ se identifica como "Macintosh" pero tiene pantalla táctil
  const esIpadDisfrazado = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return esMovilUA || esIpadDisfrazado ? "movil" : "pc";
}

// Arma (sin guardar todavía) el objeto {pc,movil} de una licencia de DUEÑO,
// migrando el esquema viejo de un solo "deviceId" la primera vez que se ve.
// OJO: esto es solo para la licencia del dueño — los repartidores siguen
// atados a 1 solo dispositivo, sin tocar.
function slotsLicenciaRM(d, miDevice, miTipo) {
  let dispositivos = d.dispositivos;
  if (!dispositivos) {
    dispositivos = {
      pc: "",
      movil: ""
    };
    if (d.deviceId) {
      dispositivos[d.deviceId === miDevice ? miTipo : miTipo === "pc" ? "movil" : "pc"] = d.deviceId;
    }
  }
  return dispositivos;
}
function getLogo() {
  try {
    const lic = JSON.parse(localStorage.getItem("rm_licencia") || "null");
    return lic?.logo || null;
  } catch {
    return null;
  }
}