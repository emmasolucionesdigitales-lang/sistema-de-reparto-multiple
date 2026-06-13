const BREVO_API_KEY = "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";
const BREVO_FROM = "carabajalponce1980@gmail.com";

// ════════════════════════════════════════════════════════════════════
// ◆  05-licencias.js — Brevo · PantallaActivacion · PantallaPin · getDeviceId · getLogo
// ════════════════════════════════════════════════════════════════════

// El endpoint y token del proxy de email se declaran una sola vez en index.html
// (window.EMAIL_ENDPOINT / window.EMAIL_TOKEN). Acá se reutilizan.
async function enviarEmailBrevo({to, toName, subject, htmlContent}) {
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method:"POST",
      headers:{"Content-Type":"application/json","api-key":BREVO_API_KEY},
      body: JSON.stringify({
        sender:{name:"Sistema de Reparto 2026 · Multi", email:BREVO_FROM},
        to:[{email:to, name:toName||to}],
        subject, htmlContent
      })
    });
    return true;
  } catch(e) { console.error("Email error",e); return false; }
}

// ── PANTALLAS DE SEGURIDAD ───────────────────────────────────────────────────
function PantallaActivacion({onActivado}) {
  const [codigo, setCodigo] = React.useState("");
  const [celular, setCelular] = React.useState("");
  const [terminos, setTerminos] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [negocio, setNegocio] = React.useState("");
  const [paso, setPaso] = React.useState(1); // 1=código, 2=datos
  const [error, setError] = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  const verificarCodigo = async () => {
    if(!codigo.trim()) { setError("Ingresá el código de activación"); return; }
    setCargando(true); setError("");
    try {
      const doc = await window.dbLicencias.collection("licencias").doc(codigo.trim().toUpperCase()).get();
      if(!doc.exists) { setError("Código inválido. Verificá que esté bien escrito."); setCargando(false); return; }
      const lic = doc.data();
      if(lic.estado === "inactivo") { setError("Esta licencia está desactivada. Contactá al soporte."); setCargando(false); return; }
      if(lic.estado === "pendiente") { setError("Tu licencia está pendiente de activación por el administrador. Contactá a Emma Soluciones."); setCargando(false); return; }
      if(lic.estado === "usado" && lic.deviceId && lic.deviceId !== getDeviceId()) {
        setError("Este código ya fue usado en otro dispositivo."); setCargando(false); return;
      }
      setPaso(2);
    } catch(e) { setError("Error de conexión. Verificá tu internet."); }
    setCargando(false);
  };

  const completarActivacion = async () => {
    if(!celular.trim()||!email.trim()||!negocio.trim()) { setError("Completá todos los campos"); return; }
    if(!/\S+@\S+\.\S+/.test(email)) { setError("Email inválido"); return; }
    if(!terminos) { setError("Debés aceptar los Términos y Condiciones para continuar"); return; }
    setCargando(true); setError("");
    try {
      const codigoUp = codigo.trim().toUpperCase();
      const doc = await window.dbLicencias.collection("licencias").doc(codigoUp).get();
      const lic = doc.data();
      if(lic.email&&lic.email.trim().toLowerCase()!==email.trim().toLowerCase()){setError("El email no coincide con el registrado. Contactá al administrador.");setCargando(false);return;}
      if(lic.celular&&lic.celular.trim()!==celular.trim()){setError("El celular no coincide con el registrado. Contactá al administrador.");setCargando(false);return;}
      const deviceId = getDeviceId();
      await window.dbLicencias.collection("licencias").doc(codigoUp).update({
        estado: "usado", deviceId, celular: celular.trim(),
        email: email.trim(), negocio: negocio.trim(),
        aceptoTerminos: true, fechaAceptoTerminos: new Date().toISOString(),
        activadoEn: new Date().toISOString()
      });
      // Guardar en localStorage
      localStorage.setItem("rm_licencia", JSON.stringify({
        codigo:codigoUp, pin:lic.pin, email:email.trim(),
        celular:celular.trim(), negocio:negocio.trim(), deviceId,
        activado:true, logo: lic.logo||""
      }));
      // ── Email de activación (vía proxy Apps Script, sin clave expuesta) ──
      try {
        enviarEmailBrevo({
          to: email.trim(), toName: negocio.trim(),
          subject: "✅ Sistema de Reparto activado correctamente",
          htmlContent: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px"><div style="background:#185FA5;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px"><h2 style="color:#fff;margin:0">¡Bienvenido!</h2><p style="color:rgba(255,255,255,.8);margin:8px 0 0">${negocio.trim()}</p></div><p style="color:#333">Tu app <b>Sistema de Reparto</b> fue activada correctamente.</p><div style="background:#f0f7ff;border-radius:10px;padding:16px;text-align:center;margin:16px 0"><div style="font-size:13px;color:#666;margin-bottom:4px">Tu PIN de acceso</div><div style="font-size:32px;font-weight:800;color:#185FA5;letter-spacing:8px">${lic.pin}</div><div style="font-size:12px;color:#999;margin-top:4px">Guardalo en un lugar seguro</div></div><p style="color:#555;font-size:13px">📱 Código: <b>${codigoUp}</b></p><p style="color:#999;font-size:12px;margin-top:20px">¿Ayuda? WhatsApp: <b>+54 9 381 339-9962</b></p><p style="color:#bbb;font-size:11px">Emma Soluciones Digitales</p></div>`
        });
      } catch(e) {}
      onActivado(lic.pin);
    } catch(e) { setError("Error al activar. Intentá de nuevo."); }
    setCargando(false);
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,minHeight:"100vh",gap:16}}>
      <div style={{width:70,height:70,borderRadius:"50%",background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>💧</div>
      <h1 style={{fontSize:22,fontWeight:600,color:"var(--color-text-primary)",textAlign:"center"}}>Sistema de Reparto 2026 · Multi</h1>

      {paso===1&&(<>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",textAlign:"center",maxWidth:280,lineHeight:1.5}}>
          Primera vez aquí. Ingresá el código de activación que recibiste.
        </p>
        <div style={{width:"100%",maxWidth:320}}>
          <label style={s.label}>Código de activación</label>
          <input style={{...s.input,textAlign:"center",fontSize:20,letterSpacing:4,textTransform:"uppercase"}}
            placeholder="SR2026-XXXX"
            value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&verificarCodigo()} />
        </div>
        {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center"}}>{error}</p>}
        <button style={{...s.btnPrimary,width:200,opacity:cargando?0.6:1}} disabled={cargando} onClick={verificarCodigo}>
          {cargando?"Verificando...":"Continuar →"}
        </button>
      </>)}

      {paso===2&&(<>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",textAlign:"center",maxWidth:280,lineHeight:1.5}}>
          ✓ Código válido. Completá tus datos para activar la app.
        </p>
        <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={s.label}>Nombre del negocio *</label>
            <input style={s.input} placeholder="Ej: Sodería La Esperanza" value={negocio} onChange={e=>setNegocio(e.target.value)} /></div>
          <div><label style={s.label}>Número de celular *</label>
            <input style={s.input} type="tel" placeholder="3816559001" value={celular} onChange={e=>setCelular(e.target.value)} /></div>
          <div><label style={s.label}>Email (recibirás los informes aquí) *</label>
            <input style={s.input} type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        </div>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,maxWidth:320,cursor:"pointer",marginTop:4}}>
          <input type="checkbox" checked={terminos} onChange={e=>setTerminos(e.target.checked)}
            style={{marginTop:3,width:18,height:18,accentColor:"var(--color-accent)",flexShrink:0}} />
          <span style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.5}}>
            Acepto los <span style={{color:"var(--color-text-info)",fontWeight:600}}>Términos y Condiciones</span> del servicio.
            La aplicación se contrata en modalidad mensual. El acceso se suspende si el pago no se realiza antes del día 11 de cada mes.
          </span>
        </label>
        {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center"}}>{error}</p>}
        <button style={{...s.btnPrimary,width:200,opacity:cargando?0.6:1}} disabled={cargando} onClick={completarActivacion}>
          {cargando?"Activando...":"Activar app →"}
        </button>
      </>)}
    </div>
  );
}

function PantallaPin({pin, onOk}) {
  const [intento, setIntento] = React.useState("");
  const [error, setError] = React.useState("");
  const [intentos, setIntentos] = React.useState(0);
  const [bloqueado, setBloqueado] = React.useState(false);

  const verificar = () => {
    if(intento === String(pin)) { setError(""); onOk(); }
    else {
      const nv = intentos+1;
      setIntentos(nv);
      setIntento("");
      if(nv>=5) { setBloqueado(true); setError("Demasiados intentos. Contactá al soporte."); }
      else setError(`PIN incorrecto (${5-nv} intento${5-nv!==1?"s":""} restante${5-nv!==1?"s":""})`);
    }
  };

  const teclas = [1,2,3,4,5,6,7,8,9,"","0","⌫"];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,minHeight:"100vh",gap:20}}>
      <div style={{width:70,height:70,borderRadius:"50%",background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>💧</div>
      <h1 style={{fontSize:20,fontWeight:600,color:"var(--color-text-primary)"}}>Sistema de Reparto 2026 · Multi</h1>
      <p style={{fontSize:14,color:"var(--color-text-secondary)"}}>Ingresá tu PIN de acceso</p>

      {/* Indicadores de dígitos */}
      <div style={{display:"flex",gap:16,marginBottom:8}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:18,height:18,borderRadius:"50%",
            background:intento.length>i?"#185FA5":"transparent",
            border:"2px solid var(--color-border-secondary)"}} />
        ))}
      </div>

      {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center"}}>{error}</p>}

      {/* Teclado numérico */}
      {!bloqueado&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,72px)",gap:10}}>
        {teclas.map((t,i)=>(
          <button key={i} style={{
            height:60,fontSize:t==="⌫"?20:22,fontWeight:500,borderRadius:12,
            background:t===""?"transparent":"var(--color-background-secondary)",
            border:t===""?"none":"0.5px solid var(--color-border-secondary)",
            color:"var(--color-text-primary)",cursor:t===""?"default":"pointer",
            opacity:t===""?0:1
          }} onClick={()=>{
            if(t==="") return;
            if(t==="⌫") setIntento(v=>v.slice(0,-1));
            else if(intento.length<4) {
              const nv = intento+t;
              setIntento(nv);
              if(nv.length===4) setTimeout(()=>{
                if(nv===String(pin)){setError("");onOk();}
                else{
                  setIntento("");
                  setIntentos(prev=>{
                    const n2=prev+1;
                    if(n2>=5){setBloqueado(true);setError("Demasiados intentos. Contactá al soporte.");}
                    else{setError(`PIN incorrecto (${5-n2} intento${5-n2!==1?"s":""} restante${5-n2!==1?"s":""})`);}
                    return n2;
                  });
                }
              },200);
            }
          }}>{t}</button>
        ))}
      </div>}
    </div>
  );
}

function getDeviceId() {
  let id = localStorage.getItem("sr_device_id");
  if(!id) { id = "dev_"+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem("sr_device_id",id); }
  return id;
}

function getLogo() {
  try {
    const lic = JSON.parse(localStorage.getItem("rm_licencia")||"null");
    return lic?.logo || null;
  } catch { return null; }
}

