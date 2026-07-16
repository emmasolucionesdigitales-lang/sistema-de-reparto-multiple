// ════════════════════════════════════════════════════════════════════
// ◆  Repartidores — usa /repartidores/{codigo} (permitido por reglas Firebase)
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// ◆  QR de invitación — arma el mismo link "#activar?d=..." que ya sabe
//    leer PantallaActivacionRM (14-roles.js), y la imagen QR para ese link.
// ════════════════════════════════════════════════════════════════════
function _srB64EncodeUtf8(str) {
  // Inverso exacto de: JSON.parse(decodeURIComponent(escape(atob(encoded))))
  return btoa(unescape(encodeURIComponent(str)));
}
function generarLinkInvitacionRepartidor(codigo) {
  const encoded = _srB64EncodeUtf8(JSON.stringify({c: (codigo||"").toUpperCase()}));
  const base = window.location.origin + window.location.pathname;
  return `${base}#activar?d=${encoded}`;
}
function urlImagenQR(texto, size) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size||220}x${size||220}&data=${encodeURIComponent(texto)}`;
}

// Sincroniza repartos → escribe en window.db.collection("repartidores")
async function sincronizarInvitaciones(repartos, negocioId, licCodigo) {
  if(!window.db || !negocioId) return;
  try {
    for(const r of (repartos||[]).filter(r=>r.codigo&&r.codigo.length===6)) {
      await window.db.collection("repartidores").doc(r.codigo).set({
        negocioId,
        nombre:   r.repartidorNombre||r.nombre||"Repartidor",
        sectores: r.sectores||[],
        numero:   r.numero||1,
        codigo:   r.codigo,
        activo:   true,
        deviceId: null,
        activado: false,
      }, {merge:true});
    }
    console.log("✅ Repartidores sincronizados:", (repartos||[]).length);
  } catch(e) { console.error("sincronizarInvitaciones:", e.message); }
}

// El repartidor activa con su código de 6 letras — ahora TAMBIÉN vincula
// la sesión real de Firebase Auth (authUid): antes sólo se guardaba el
// deviceId (un texto cualquiera que el propio aparato podía inventar); el
// authUid lo entrega Firebase, nadie lo puede falsificar.
async function canjearInvitacion(deviceId, email, codigo) {
  if(!window.db) return {ok:false, msg:"Base de datos no disponible."};
  if(!window.auth || !window.auth.currentUser) return {ok:false, msg:"Todavía se está iniciando la conexión, esperá un segundo y probá de nuevo."};
  const miUid = window.auth.currentUser.uid;
  try {
    const snap = await window.db.collection("repartidores").doc(codigo).get();
    if(!snap.exists) return {ok:false, msg:"Código no encontrado. Pedile al dueño que abra su app — el código se activa automáticamente."};
    const d = snap.data();
    if(!d.activo) return {ok:false, msg:"Este reparto fue desactivado."};
    if(d.deviceId && d.deviceId !== "" && d.deviceId !== deviceId) return {ok:false, msg:"Este código ya está en uso en otro dispositivo. El dueño puede resetearlo."};
    await snap.ref.update({deviceId, authUid:miUid, activado:true, usadoEn:new Date().toISOString()});
    await window.db.collection("repartidorUid").doc(miUid).set({negocioId:d.negocioId, codigo}, {merge:true});
    return {ok:true, negocioId:d.negocioId, nombre:d.nombre||"Repartidor", sectores:d.sectores||[]};
  } catch(e) { return {ok:false, msg:"Error de conexión: "+e.message}; }
}

async function listarRepartidores(negocioId) {
  if(!window.db) return [];
  try {
    const snap = await window.db.collection("repartidores")
      .where("negocioId","==",negocioId).where("activado","==",true).get();
    return snap.docs.map(d=>({...d.data(), uid:d.data().deviceId||d.id, codigo:d.id}));
  } catch(e) { console.warn("listarRepartidores:", e); return []; }
}

async function listarInvitaciones(negocioId) {
  if(!window.db) return [];
  try {
    const snap = await window.db.collection("repartidores")
      .where("negocioId","==",negocioId).where("activo","==",true).get();
    return snap.docs.filter(d=>!d.data().activado).map(d=>({codigo:d.id, nombre:d.data().nombre}));
  } catch(e) { return []; }
}

async function eliminarRepartidor(uid) {
  if(!window.db) return;
  try {
    const snap = await window.db.collection("repartidores").where("deviceId","==",uid).limit(1).get();
    if(!snap.empty) await snap.docs[0].ref.update({activo:false,activado:false,deviceId:null,authUid:null});
  } catch(e) { console.error("eliminarRepartidor:", e); }
}

async function resetearDispositivoEnLicencia(uid, codigo) {
  if(!window.db || !codigo) return false;
  try {
    // Se limpia también authUid — si no, el repartidor no podría volver a
    // reclamar el código desde otra sesión después del reset.
    await window.db.collection("repartidores").doc(codigo).update({deviceId:null, authUid:null, activado:false});
    return true;
  } catch(e) { console.error("resetear:", e); return false; }
}

function generarEnlaceActivacion(reparto, negocioId) {
  return "";  // Ya no se necesita — el código funciona directo
}

// ════════════════════════════════════════════════════════════════════
// ◆  15-extras.js — VincularEmma · InicioRepartidor · TodosClientes · Agenda · ConfigApariencia · VistaClientes · ImportarExcel
// ════════════════════════════════════════════════════════════════════

function VincularEmmaControl() {
  const [token, setToken] = React.useState(()=>localStorage.getItem('sr_ec_token')||'');
  const [enviando, setEnviando] = React.useState(false);
  const [ultimaSync, setUltimaSync] = React.useState(()=>localStorage.getItem('sr_ec_ultima')||'');
  const db = window.firebaseDB;

  const guardarToken = (t) => { setToken(t); localStorage.setItem('sr_ec_token', t); };
  const resetToken = () => { setToken(''); localStorage.removeItem('sr_ec_token'); localStorage.removeItem('sr_ec_ultima'); };

  const enviarResumenDia = async () => {
    if(!token||!db){ alert('Ingresá el código de Emma Control primero'); return; }
    setEnviando(true);
    try {
      const hoy = new Date().toLocaleDateString('es-AR');
      const ventas = JSON.parse(localStorage.getItem('cat_ventas')||'[]');
      const gastos = JSON.parse(localStorage.getItem('cat_gastos')||'[]');
      const ventasHoy = ventas.filter(v=>v.fecha===hoy);
      const gastosHoy = gastos.filter(g=>g.fecha===hoy);
      const totalVentas = ventasHoy.reduce((s,v)=>s+(v.total||0),0);
      const totalGastos = gastosHoy.reduce((s,g)=>s+(g.monto||0),0);
      const movs = [
        ...ventasHoy.map(v=>({id:'venta_'+v.id,tipo:'ingreso',monto:v.total||0,descripcion:'Venta reparto: '+(v.cliente||''),fecha:hoy,origen:'reparto'})),
        ...gastosHoy.map(g=>({id:'gasto_'+g.id,tipo:'egreso',monto:g.monto||0,descripcion:'Gasto reparto: '+(g.concepto||''),fecha:hoy,origen:'reparto'}))
      ];
      const batch = db.batch();
      movs.forEach(m=>{
        const ref = db.collection('sinc_reparto').doc(token).collection('movimientos').doc(m.id);
        batch.set(ref, m);
      });
      await batch.commit();
      const ahora = new Date().toLocaleString('es-AR');
      setUltimaSync(ahora);
      localStorage.setItem('sr_ec_ultima', ahora);
      alert('✅ Resumen enviado a Emma Control\nVentas: $'+totalVentas.toLocaleString('es-AR')+'\nGastos: $'+totalGastos.toLocaleString('es-AR'));
    } catch(e){ alert('Error al enviar: '+e.message); }
    setEnviando(false);
  };

  const s = {
    card:{background:'var(--color-background-secondary)',borderRadius:14,padding:14,marginBottom:12,border:'1px solid var(--color-border-secondary)'},
    title:{fontSize:11,fontWeight:700,color:'var(--color-text-secondary)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.04em'},
    input:{width:'100%',background:'var(--color-background-tertiary)',border:'1px solid var(--color-border-secondary)',borderRadius:10,padding:'12px 14px',fontSize:16,color:'var(--color-text-primary)',outline:'none',fontFamily:'monospace',letterSpacing:'0.1em',textAlign:'center',marginBottom:10},
    btn:{width:'100%',padding:12,borderRadius:10,border:'none',background:'var(--color-accent-primary)',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8},
    btnRed:{width:'100%',padding:10,borderRadius:10,border:'1px solid #fecaca',background:'transparent',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer'},
    muted:{fontSize:11,color:'var(--color-text-tertiary)',textAlign:'center',marginBottom:8},
  };

  return (
    <div>
      <div style={s.card}>
        <div style={s.title}>🔗 Vincular con Emma Control</div>
        {!token ? <>
          <div style={{fontSize:13,color:'var(--color-text-secondary)',lineHeight:1.6,marginBottom:12}}>
            Ingresá el código de sincronización que generaste en Emma Control → Config → Vincular con App de Reparto.
          </div>
          <input style={s.input} placeholder="Código (ej: AB12CD34)" maxLength={8}
            onChange={e=>guardarToken(e.target.value.toUpperCase())}/>
          <button style={s.btn} onClick={()=>{if(token.length>=6)alert('✅ Código guardado!');else alert('⚠️ Ingresá el código completo');}}>
            Vincular
          </button>
        </> : <>
          <div style={s.muted}>Vinculado con Emma Control</div>
          <div style={{...s.input,marginBottom:10,fontSize:22,letterSpacing:'0.2em',color:'var(--color-accent-primary)'}}>{token}</div>
          <button style={s.btn} onClick={enviarResumenDia} disabled={enviando}>
            {enviando ? '⏳ Enviando...' : '📤 Enviar resumen del día a Emma Control'}
          </button>
          {ultimaSync && <div style={s.muted}>Última sincronización: {ultimaSync}</div>}
          <button style={s.btnRed} onClick={()=>{if(window.confirm('¿Desvincular Emma Control?'))resetToken();}}>
            🗑️ Desvincular
          </button>
        </>}
      </div>
      <div style={{...s.card,background:'rgba(59,130,246,0.05)'}}>
        <div style={s.title}>ℹ️ Cómo funciona</div>
        <div style={{fontSize:12,color:'var(--color-text-secondary)',lineHeight:1.7}}>
          1. Generá un código en <strong>Emma Control → Config → Vincular</strong><br/>
          2. Pegalo aquí y tocá Vincular<br/>
          3. Al terminar el día tocá <strong>Enviar resumen</strong><br/>
          4. Los movimientos aparecen en Emma Control automáticamente
        </div>
      </div>
    </div>
  );
}

async function comprimirLogoBase64(file, maxW=400, maxH=400, quality=0.75) {
  return new Promise((res,rej)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let {width:w, height:h} = img;
      if(w>maxW||h>maxH) {
        const ratio = Math.min(maxW/w, maxH/h);
        w = Math.round(w*ratio); h = Math.round(h*ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width=w; canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      const b64 = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(url);
      res(b64);
    };
    img.onerror = rej;
    img.src = url;
  });
}

async function guardarLogoFirestore(codigo, logoB64) {
  if(!window.db || !codigo) return false;
  try {
    await window.dbLicencias.collection("licencias").doc(codigo).update({ logo: logoB64 });
    // Actualizar localStorage también
    const lic = JSON.parse(localStorage.getItem("rm_licencia")||"null");
    if(lic) { lic.logo = logoB64; localStorage.setItem("rm_licencia", JSON.stringify(lic)); }
    return true;
  } catch(e) { console.error("Error guardando logo:", e); return false; }
}
async function guardarNombreFirestore(codigo, nombre) {
  if(!window.db || !codigo) return false;
  try {
    await window.dbLicencias.collection("licencias").doc(codigo).update({ negocio: nombre });
    const lic = JSON.parse(localStorage.getItem("rm_licencia")||"null");
    if(lic) { lic.negocio = nombre; localStorage.setItem("rm_licencia", JSON.stringify(lic)); }
    return true;
  } catch(e) { console.error("Error guardando nombre:", e); return false; }
}


// ── InicioRepartidor ─────────────────────────────────────────
// ── Notificaciones (repartidor) — versión compacta, sin pantalla de Config ──
function NotifConfigRepartidor() {
  const [permiso,setPermiso] = React.useState('Notification' in window ? Notification.permission : 'no-soportado');
  const [probando,setProbando] = React.useState(false);
  const [resultado,setResultado] = React.useState(null);
  // OJO: antes, con solo tener el permiso del navegador ya se mostraba el
  // tilde verde — aunque el guardado real de la suscripción hubiera
  // fallado en silencio. Ahora se verifica de verdad, y si falla queda
  // un botón para reintentar (no se traba mostrando "activado" a medias).
  const [verificando,setVerificando] = React.useState(true);
  const [subOk,setSubOk] = React.useState(null); // null=verificando, true/false=resultado real

  const activarDeVerdad = async () => {
    if(typeof window.activarNotif!=='function'){ setSubOk(false); return false; }
    try { const ok = await window.activarNotif(); setSubOk(ok); return ok; }
    catch(e){ setSubOk(false); return false; }
  };

  React.useEffect(()=>{
    if(permiso!=='granted'){ setVerificando(false); return; }
    // Si el navegador ya tenía el permiso concedido de antes, igual hay que
    // confirmar que la suscripción esté guardada — por eso se reintenta acá.
    (async()=>{ await activarDeVerdad(); setVerificando(false); })();
  },[]);

  const pedirYActivar = async () => {
    if(!('Notification' in window)) return;
    setProbando(true); setResultado(null);
    const r = await Notification.requestPermission();
    setPermiso(r);
    if(r==='granted'){
      const ok = await activarDeVerdad();
      setResultado(ok?{ok:true,msg:'Notificaciones activadas.'}:{ok:false,msg:'No se pudo completar la suscripción.'});
    }
    setProbando(false);
  };

  if(permiso==='no-soportado') return null;
  if(verificando) return (
    <div style={{margin:"10px 14px 0",fontSize:12,color:"var(--color-text-tertiary)"}}>Verificando notificaciones…</div>
  );
  if(permiso==='granted' && subOk===true) return (
    <div style={{margin:"10px 14px 0",fontSize:12,color:"var(--color-text-success)",display:"flex",alignItems:"center",gap:6}}>
      <span>✅</span><span>Notificaciones activadas</span>
    </div>
  );
  // permiso concedido pero la suscripción falló — no dejar "atascado" acá:
  // mostrar el problema y una forma de reintentar.
  if(permiso==='granted' && subOk===false) return (
    <button style={{margin:"10px 14px 0",width:"calc(100% - 28px)",background:"var(--color-background-danger)",border:"0.5px solid var(--color-text-danger)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}
      onClick={async()=>{setProbando(true);await activarDeVerdad();setProbando(false);}} disabled={probando}>
      <span style={{fontSize:18}}>⚠️</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)"}}>{probando?"Reintentando...":"No se pudo activar — tocar para reintentar"}</div>
      </div>
    </button>
  );
  return (
    <button style={{margin:"10px 14px 0",width:"calc(100% - 28px)",background:"var(--color-background-tertiary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}
      onClick={pedirYActivar} disabled={probando}>
      <span style={{fontSize:18}}>🔔</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{probando?"Activando...":"Activar notificaciones"}</div>
        {permiso==='denied' && <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Bloqueadas — activalas desde el navegador</div>}
        {resultado && <div style={{fontSize:11,color:resultado.ok?"var(--color-text-success)":"var(--color-text-danger)"}}>{resultado.msg}</div>}
      </div>
    </button>
  );
}

function InicioRepartidor({perfil,diaActual,fechaActual,setFechaActual,repartoId,clientes,ventas,noVisitas,planillas,savePlanilla,productos,recordatorios,onSaveRecordatorio,onConfirmarRecordatorio,onIrCliente,onIrCarga,onIrClientes,onIrPlanilla,onIrTodosClientes,onIrAgenda,onIrTransfers,onCambiarDia,onSalir,onEnviarInforme,scaleIdx,onToggleScale,scaleLabel}) {
  const ventasHoy = ventas.filter(v=>v.fechaKey===fechaActual);
  const noVisHoy  = (noVisitas||[]).filter(v=>v.fecha===fechaActual);
  const planKey   = claveDiaReparto(diaActual,fechaActual,repartoId);
  const cargaHecha = !!(planillas||{})[planKey];
  const totalEntregados = ventasHoy.length;
  const totalPend = clientes.filter(c=>!ventasHoy.find(v=>v.clienteId===c.id)&&!noVisHoy.find(v=>v.clienteId===c.id)).length;
  const recorrido = totalEntregados+noVisHoy.length >= clientes.length && clientes.length > 0;
  const recActivos = (recordatorios||[]).filter(r=>!r.confirmado);
  const hoy = (()=>{const d=new Date(Date.now()-3*60*60*1000);return d.toISOString().slice(0,10);})();
  const recHoy = recActivos.filter(r=>r.fecha===hoy||r.fecha===fechaActual);
  const fmtP = (n)=>"$"+Math.round(Number(n)||0).toLocaleString("es-AR");
  const totalEfectivo = ventasHoy.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const totalTransfer = ventasHoy.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const totalNeto = totalEfectivo+totalTransfer+ventasHoy.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);

  const estadoReparto = !cargaHecha ? "pendiente" : recorrido ? "terminado" : "activo";

  return (
    <div style={{...s.screen,paddingBottom:40}}>
      <div style={{...s.header,padding:"12px 14px"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>{"\u{1F690} "+perfil.nombre}</div>
          {onCambiarDia
            ? <button onClick={onCambiarDia} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:11,color:"var(--color-text-info)",textDecoration:"underline",display:"flex",alignItems:"center",gap:3}}>
                {diaActual+" · "+fechaActual} <span style={{fontSize:9}}>▾</span>
              </button>
            : <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{diaActual+" · "+fechaActual}</div>
          }
        </div>
        <button style={{...s.btn,fontSize:11,padding:"6px 10px"}} onClick={onSalir}>Salir</button>
        <HeaderBotones/>
      </div>

      {recHoy.length>0&&(
        <button style={{margin:"10px 14px 0",background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,width:"calc(100% - 28px)",cursor:"pointer",textAlign:"left"}}
          onClick={onIrAgenda}>
          <span style={{fontSize:18}}>{"\u{1F514}"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-warning)"}}>{recHoy.length} recordatorio{recHoy.length!==1?"s":""} para hoy</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Tocar para ver la agenda</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
        </button>
      )}

      <NotifConfigRepartidor />

      <div style={{padding:"12px 14px 0",display:"flex",flexDirection:"column",gap:8}}>

        {/* BOTON PRINCIPAL: Iniciar/Continuar reparto */}
        {estadoReparto==="pendiente"&&(
          <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:10,padding:"16px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}
            onClick={onIrCarga}>
            <span style={{fontSize:26}}>{"\u{1F69A}"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:500}}>Iniciar reparto del dia</div>
              <div style={{fontSize:11,opacity:0.8}}>Cargar cantidades y salir a repartir</div>
            </div>
            <span style={{opacity:0.7}}>{"\u2192"}</span>
          </button>
        )}

        {estadoReparto==="activo"&&(
          <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:10,padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}
            onClick={onIrClientes}>
            <span style={{fontSize:22}}>{"\u{1F4CB}"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:500}}>Continuar reparto</div>
              <div style={{fontSize:11,opacity:0.8}}>{totalPend+" pendientes · "+fmtP(totalNeto)+" cobrado"}</div>
            </div>
            <span style={{opacity:0.7}}>{"\u2192"}</span>
          </button>
        )}

        {estadoReparto==="terminado"&&(
          <button style={{background:"#1a5c2e",color:"#e2eaf4",border:"none",borderRadius:10,padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}
            onClick={onIrPlanilla}>
            <span style={{fontSize:22}}>{"\u2705"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:500}}>Reparto terminado</div>
              <div style={{fontSize:11,opacity:0.8}}>{totalEntregados+" entregas · "+fmtP(totalNeto)+" cobrado · Ir a planilla"}</div>
            </div>
            <span style={{opacity:0.7}}>{"\u2192"}</span>
          </button>
        )}

        {/* Fila de stats cuando hay actividad */}
        {estadoReparto!=="pendiente"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <div style={{...s.metricCard,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:500,color:"#4dd9a0"}}>{totalEntregados}</div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Entregados</div>
            </div>
            <div style={{...s.metricCard,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:500,color:"#f5b942"}}>{totalPend}</div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Pendientes</div>
            </div>
            <div style={{...s.metricCard,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:500}}>{fmtP(totalNeto)}</div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Cobrado</div>
            </div>
          </div>
        )}

        <div style={s.divider}/>

        {/* Planilla del dia */}
        <button style={{...s.card,margin:0,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"13px 14px"}}
          onClick={onIrPlanilla}>
          <span style={{fontSize:20}}>{"\u{1F4CA}"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Planilla del dia</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Gastos, transferencias y cierre</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
        </button>

        {/* Enviar informe al dueño */}
        {onEnviarInforme&&(
          <button style={{...s.card,margin:0,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"13px 14px"}}
            onClick={onEnviarInforme}>
            <span style={{fontSize:20}}>{"\u{1F4E4}"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Enviar informe al dueño</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Manda el resumen del día por email</div>
            </div>
            <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
          </button>
        )}

        {/* Todos los clientes */}
        <button style={{...s.card,margin:0,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"13px 14px"}}
          onClick={onIrTodosClientes}>
          <span style={{fontSize:20}}>{"\u{1F465}"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Todos los clientes</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Ventas y cobros de cualquier dia</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
        </button>

        {/* Transferencias pendientes */}
        {(()=>{
          const pendTrans = ventasHoy.filter(v=>(v.pago==="transferencia"||v.pago==="mixto")&&!v.transConfirmada);
          const pendTransAll = ventas.filter(v=>(v.pago==="transferencia"||v.pago==="mixto")&&!v.transConfirmada);
          const total = pendTransAll.length;
          if(total===0) return null;
          return (
            <button style={{...s.card,margin:0,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"13px 14px",
              background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-warning)"}}
              onClick={onIrTransfers}>
              <span style={{fontSize:20}}>{"\u{1F4B8}"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-warning)"}}>
                  Transferencias pendientes
                  <span style={{...s.badge("warning"),fontSize:10,marginLeft:6}}>{total}</span>
                </div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Tocar para marcar como acreditadas</div>
              </div>
              <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
            </button>
          );
        })()}

        {/* Agenda */}
        <button style={{...s.card,margin:0,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"13px 14px"}}
          onClick={onIrAgenda}>
          <span style={{fontSize:20}}>{"\u{1F4C5}"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>
              Agenda
              {recActivos.length>0&&<span style={{...s.badge("info"),fontSize:10,marginLeft:6}}>{recActivos.length}</span>}
            </div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Recordatorios y visitas programadas</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)"}}>{"\u2192"}</span>
        </button>

      </div>
    </div>
  );
}


// ── GastosRepartidor ─────────────────────────────────────────────────────────
function GastosRepartidor({plan, onSave}) {
  const [gastos, setGastos] = React.useState(plan.gastos||[]);
  const [nuevo, setNuevo]   = React.useState({cat:"otro",desc:"",monto:""});
  const [agregando, setAgregando] = React.useState(false);

  const agregar = () => {
    if(!nuevo.monto||isNaN(Number(nuevo.monto))) return;
    const lista = [...gastos, {id:Date.now(),cat:nuevo.cat,desc:nuevo.desc,monto:Number(nuevo.monto),confirmado:true}];
    setGastos(lista);
    onSave&&onSave({...plan, gastos:lista});
    setNuevo({cat:"otro",desc:"",monto:""});
    setAgregando(false);
  };

  const eliminar = (id) => {
    const lista = gastos.filter(g=>g.id!==id);
    setGastos(lista);
    onSave&&onSave({...plan, gastos:lista});
  };

  const total = gastos.reduce((a,g)=>a+(Number(g.monto)||0),0);
  const fmtP = (n)=>"$"+Math.round(Number(n)||0).toLocaleString("es-AR");

  return (
    <div style={{...s.card,margin:"0 0 8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{"\u{1F4B8} Gastos extras"}</div>
        {total>0&&<div style={{fontSize:12,color:"#f07070",fontWeight:600}}>−{fmtP(total)}</div>}
      </div>
      {gastos.map(g=>(
        <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{flex:1}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{g.cat}</span>
            {g.desc&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}> · {g.desc}</span>}
          </div>
          <span style={{fontSize:13,fontWeight:500,color:"#f07070"}}>{fmtP(g.monto)}</span>
          <button style={{...s.btn,padding:"2px 6px",fontSize:11,color:"var(--color-text-danger)"}} onClick={()=>eliminar(g.id)}>✕</button>
        </div>
      ))}
      {!agregando&&(
        <button style={{...s.btn,marginTop:8,width:"100%",fontSize:12}} onClick={()=>setAgregando(true)}>+ Agregar gasto</button>
      )}
      {agregando&&(
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
          <select style={s.select} value={nuevo.cat} onChange={e=>setNuevo(v=>({...v,cat:e.target.value}))}>
            {["propina","mercado","gnc","gaseosa","uber","inflado","frutas","otro"].map(c=>(
              <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
            ))}
          </select>
          <input style={s.input} placeholder="Descripción (opcional)" value={nuevo.desc} onChange={e=>setNuevo(v=>({...v,desc:e.target.value}))} />
          <input style={{...s.input,textAlign:"right"}} type="number" placeholder="Monto $" value={nuevo.monto} onChange={e=>setNuevo(v=>({...v,monto:e.target.value}))} />
          <div style={{display:"flex",gap:6}}>
            <button style={{...s.btn,flex:1}} onClick={()=>setAgregando(false)}>Cancelar</button>
            <button style={{...s.btnPrimary,flex:2,padding:"8px"}} onClick={agregar}>Guardar gasto</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── TodosClientesRepartidor ──────────────────────────────────
function TodosClientesRepartidor({clientes,prospectos,ventas,onSeleccionar,onNuevoCliente,onVolver}) {
  const [busq,setBusq] = React.useState("");
  const [diaFiltro,setDiaFiltro] = React.useState("todos");
  const filtrados = clientes
    .filter(c=>(diaFiltro==="todos"||c.dia===diaFiltro)&&(c.nombre.toLowerCase().includes(busq.toLowerCase())||(c.barrio||"").toLowerCase().includes(busq.toLowerCase())))
    .sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999));
  const prospectosFiltrados = diaFiltro==="todos" ? (prospectos||[]).filter(p=>(p.estado==="activo"||!p.estado)&&(busq===""||p.nombre.toLowerCase().includes(busq.toLowerCase()))) : [];

  return (
    <div style={s.screen}>
      <HeaderApp titulo="Mis clientes" onVolver={onVolver}/>
      <div style={{padding:"10px 14px 6px"}}>
        <input style={s.input} placeholder="Buscar cliente o barrio..." value={busq} onChange={e=>setBusq(e.target.value)} />
        <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
          {["todos",...DIAS].map(d=>(
            <button key={d} style={{...s.btn,fontSize:11,padding:"3px 9px",
              background:diaFiltro===d?"#185FA5":"var(--color-background-tertiary)",
              color:diaFiltro===d?"#e2eaf4":"var(--color-text-secondary)",
              border:diaFiltro===d?"none":"0.5px solid var(--color-border-secondary)"}}
              onClick={()=>setDiaFiltro(d)}>{d==="todos"?"Todos":d.slice(0,3)}</button>
          ))}
          <button style={{...s.btn,fontSize:11,padding:"3px 10px",marginLeft:"auto",background:"#185FA5",color:"#e2eaf4",border:"none"}} onClick={onNuevoCliente}>+ Nuevo</button>
        </div>
        <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:6}}>{filtrados.length} clientes</div>
      </div>
      {filtrados.map(c=>{
        const vUlt=ventas.filter(v=>v.clienteId===c.id).sort((a,b)=>(b.fechaKey||"").localeCompare(a.fechaKey||""))[0];
        return (
          <div key={c.id} style={{...s.card,marginBottom:0,borderRadius:0,borderBottom:"0.5px solid var(--color-border-tertiary)",
            display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"12px 14px"}}
            onClick={()=>onSeleccionar(c)}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontWeight:600,fontSize:14,color:"var(--color-text-primary)"}}>{c.nombre}</span>
                <span style={{fontSize:10,background:"#185FA5",color:"#fff",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{c.dia}</span>
              </div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>
                {direccionCliente(c)}
              </div>
              {c.saldo<0&&<span style={{...s.badge("danger"),fontSize:10,marginTop:3,display:"inline-block"}}>Debe {fmt(Math.abs(c.saldo))}</span>}
              {c.saldo>0&&<span style={{...s.badge("success"),fontSize:10,marginTop:3,display:"inline-block"}}>A favor {fmt(c.saldo)}</span>}
              {vUlt&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>Última venta: {vUlt.fechaKey}</div>}
            </div>
            <span style={{color:"var(--color-text-tertiary)"}}>→</span>
          </div>
        );
      })}
      {prospectosFiltrados.length>0&&(
        <React.Fragment>
          <span style={{...s.sectionTitle,color:"#f5b942"}}>Prospectos en promocion</span>
          {prospectosFiltrados.map(p=>(
            <div key={p.id} style={{...s.card,marginBottom:0,borderRadius:0,borderBottom:"0.5px solid var(--color-border-tertiary)",
              display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"12px 14px",borderLeft:"3px solid #f5b942"}}
              onClick={()=>onSeleccionar({...p,_esProspecto:true})}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontWeight:600,fontSize:14,color:"var(--color-text-primary)"}}>{p.nombre}</span>
                  <span style={{fontSize:10,background:"#2e1f06",color:"#f5b942",padding:"1px 6px",borderRadius:10,fontWeight:600}}>Prospecto</span>
                  <span style={{fontSize:10,background:"#185FA5",color:"#fff",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{p.dia}</span>
                </div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{direccionProspecto(p)}</div>
              </div>
              <span style={{color:"var(--color-text-tertiary)"}}>→</span>
            </div>
          ))}
        </React.Fragment>
      )}
    </div>
  );
}

// ── AgendaRepartidor ─────────────────────────────────────────
function AgendaRepartidor({recordatorios,clientes,onConfirmar,onEliminar,onNuevo,onIrCliente,onVolver,negocioId,repartidorNombre}) {
  const [mostrarNuevo,setMostrarNuevo] = React.useState(false);
  const hoy = (()=>{const d=new Date(Date.now()-3*60*60*1000);return d.toISOString().slice(0,10);})();
  const pendientes = [...(recordatorios||[])].filter(r=>!r.confirmado).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const confirmados = [...(recordatorios||[])].filter(r=>r.confirmado).slice(0,5);
  const tipoIco = {visita:"🏠",cobro:"💰"};

  return (
    <div style={s.screen}>
      <HeaderApp titulo="📅 Agenda" onVolver={onVolver}/>
      <div style={{padding:"10px 14px 0"}}>
        <button style={{...s.btn,width:"100%",fontSize:13,background:"#185FA5",color:"#e2eaf4",border:"none"}}
          onClick={()=>setMostrarNuevo(true)}>+ Nuevo</button>
      </div>
      {pendientes.length===0&&!mostrarNuevo&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)"}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:14}}>Sin recordatorios pendientes</div>
        </div>
      )}
      {pendientes.map(r=>{
        const c=clientes.find(x=>x.id===r.clienteId);
        const vencido=r.fecha<hoy;
        const esHoy=r.fecha===hoy;
        return (
          <div key={r.id} style={{...s.card,borderLeft:`3px solid ${vencido?"var(--color-text-danger)":esHoy?"#f5b942":"#5daaff"}`}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:18}}>{tipoIco[r.tipo]||"🔔"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{c?.nombre||r.clienteNombre}</div>
                <div style={{fontSize:12,color:vencido?"var(--color-text-danger)":esHoy?"#f5b942":"var(--color-text-secondary)"}}>
                  {vencido?"⚠ ":esHoy?"📌 ":""}{r.fecha}{r.hora?` · ${r.hora}`:""}
                </div>
                <div style={{fontSize:12,color:"var(--color-text-primary)",marginTop:2}}>{r.motivo}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:8}}>
              {r.clienteId&&<button style={{flex:2,padding:"7px",borderRadius:8,border:"none",background:"#185FA5",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}
                onClick={()=>onIrCliente(r.clienteId)}>
                {r.tipo==="cobro"?"💰 Ir a cobrar":"🏠 Ver cliente"}</button>}
              <button style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:"#0a2e1f",color:"#4dd9a0",fontSize:12,cursor:"pointer"}}
                onClick={()=>onConfirmar(r.id)}>✓ Listo</button>
              <button style={{...s.btn,padding:"7px 10px",fontSize:11}} onClick={()=>onEliminar(r.id)}>🗑</button>
            </div>
          </div>
        );
      })}
      {confirmados.length>0&&(
        <div style={{padding:"0 14px"}}>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",margin:"8px 0 4px",textTransform:"uppercase"}}>✓ Completados recientes</div>
          {confirmados.map(r=>(
            <div key={r.id} style={{fontSize:12,color:"var(--color-text-tertiary)",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              {tipoIco[r.tipo]||"🔔"} {r.clienteNombre} · {r.fecha}
            </div>
          ))}
        </div>
      )}
      {mostrarNuevo&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--color-background-secondary)",borderRadius:16,padding:20,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>🔔 Nuevo recordatorio</div>
            <NuevoRecordatorioForm clientes={clientes} onGuardar={(datos)=>{onNuevo(datos);setMostrarNuevo(false);}} onCerrar={()=>setMostrarNuevo(false)} />
          </div>
        </div>
      )}
    </div>
  );
}


function AgendaScreen({recordatorios,clientes,onConfirmar,onEliminar,onNuevo,onIrCliente,onVolver,repartidores}) {
  const [mostrarNuevo,setMostrarNuevo] = React.useState(false);
  const [clienteBusq,setClienteBusq]  = React.useState("");
  const [clienteSel,setClienteSel]    = React.useState(null);
  const [filtro,setFiltro]            = React.useState("pendiente"); // pendiente | todos
  const hoy = (()=>{const d=new Date(Date.now()-3*60*60*1000);return d.toISOString().slice(0,10);})();

  const tipoIco  = {visita:"🏠",cobro:"💰"};
  const tipoCl   = {visita:"var(--color-text-info)",cobro:"var(--color-text-warning)"};
  const tipoBg   = {visita:"var(--color-background-info)",cobro:"var(--color-background-warning)"};

  const lista = [...(recordatorios||[])].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const pendientes = lista.filter(r=>!r.confirmado);
  const confirmados = lista.filter(r=>r.confirmado);
  const mostrar = filtro==="pendiente" ? pendientes : lista;

  const clientesFiltrados = clienteBusq
    ? clientes.filter(c=>c.nombre.toLowerCase().includes(clienteBusq.toLowerCase())).slice(0,5)
    : [];

  const hoyPend = pendientes.filter(r=>r.fecha===hoy).length;
  const vencidos = pendientes.filter(r=>r.fecha<hoy).length;

  return (
    <div style={s.screen}>
      <HeaderApp titulo="📅 Agenda" onVolver={onVolver}/>

      {/* Métricas rápidas */}
      <div style={{display:"flex",gap:8,padding:"10px 14px 6px"}}>
        {vencidos>0&&(
          <div style={{...s.card,flex:1,margin:0,background:"var(--color-background-danger)",border:"0.5px solid var(--color-border-danger)",padding:"8px 12px",textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--color-text-danger)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Vencidos</div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-danger)"}}>{vencidos}</div>
          </div>
        )}
        <div style={{...s.card,flex:1,margin:0,background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"8px 12px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--color-text-info)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Hoy</div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-info)"}}>{hoyPend}</div>
        </div>
        <div style={{...s.card,flex:1,margin:0,padding:"8px 12px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Pendientes</div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)"}}>{pendientes.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:6,padding:"0 14px 8px"}}>
        {[["pendiente","⏳ Pendientes"],["todos","📋 Todos"]].map(([v,l])=>(
          <button key={v} style={{...s.btn,flex:1,fontSize:12,padding:"6px",
            background:filtro===v?"#185FA5":"var(--color-background-tertiary)",
            color:filtro===v?"#e2eaf4":"var(--color-text-secondary)",
            border:filtro===v?"none":"0.5px solid var(--color-border-secondary)"}}
            onClick={()=>setFiltro(v)}>{l}</button>
        ))}
        <button style={{...s.btn,fontSize:12,padding:"6px 12px",background:"#185FA5",color:"#e2eaf4",border:"none"}}
          onClick={()=>setMostrarNuevo(true)}>+ Nuevo</button>
      </div>
      {mostrar.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)"}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:14}}>{filtro==="pendiente"?"No hay recordatorios pendientes":"Sin recordatorios"}</div>
          <div style={{fontSize:12,marginTop:6}}>Tocá "+ Nuevo" para agregar uno</div>
        </div>
      )}

      {mostrar.map(r=>{
        const c=clientes.find(x=>x.id===r.clienteId);
        const vencido=!r.confirmado&&r.fecha<hoy;
        const esHoy=r.fecha===hoy;
        const ico=tipoIco[r.tipo]||"🔔";
        const colTipo=tipoCl[r.tipo]||"var(--color-text-secondary)";
        const bgTipo=tipoBg[r.tipo]||"var(--color-background-tertiary)";
        return (
          <div key={r.id} style={{...s.card,
            borderLeft:`3px solid ${r.confirmado?"#1D9E75":vencido?"var(--color-text-danger)":esHoy?"var(--color-text-warning)":colTipo}`,
            opacity:r.confirmado?0.65:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                {/* Tipo + Fecha */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:bgTipo,color:colTipo}}>{ico} {r.tipo==="cobro"?"Cobro":"Visita"}</span>
                  <span style={{fontSize:12,color:vencido?"var(--color-text-danger)":esHoy?"var(--color-text-warning)":"var(--color-text-tertiary)",fontWeight:vencido||esHoy?600:400}}>
                    {vencido?"⚠ ":esHoy?"📌 ":""}{r.fecha}{r.hora?` · ${r.hora}`:""}
                  </span>
                  {r.confirmado&&<span style={s.badge("success")}>✓ Listo</span>}
                </div>
                {/* Cliente */}
                <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:2}}>
                  {c?.nombre||r.clienteNombre||"Cliente"}
                </div>
                {c&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{c.dia} · {c.barrio||""}</div>}
                {/* Motivo */}
                <div style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.4}}>{r.motivo}</div>
              </div>
              {/* Acciones */}
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                {c?.telefono&&<a href={`https://wa.me/54${c.telefono}`} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>💬</a>}
                {(c?.maps||(c?.lat&&c?.lng))&&<a href={c.maps||`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>📍</a>}
              </div>
            </div>
            {!r.confirmado&&(
              <div style={{display:"flex",gap:6,marginTop:10,paddingTop:8,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                <button style={{...s.btn,flex:1,fontSize:12}} onClick={()=>{if(window.confirm("¿Eliminar este recordatorio?"))onEliminar(r.id);}}>🗑 Eliminar</button>
                <button style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:"#0a2e1f",color:"#4dd9a0",fontSize:12,fontWeight:500,cursor:"pointer"}}
                  onClick={()=>onConfirmar(r.id)}>✓ Marcar como hecho</button>
                {onIrCliente&&r.clienteId&&<button style={{flex:2,padding:"7px",borderRadius:8,border:"none",background:"#185FA5",color:"#e2eaf4",fontSize:12,fontWeight:600,cursor:"pointer"}}
                  onClick={()=>onIrCliente(r.clienteId)}>
                  {r.tipo==="cobro"?"💰 Ir a cobrar":"🏠 Ver cliente →"}
                </button>}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal nuevo recordatorio */}
      {mostrarNuevo&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--color-background-secondary)",borderRadius:16,padding:20,width:"100%",maxWidth:400,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>🔔 Nuevo recordatorio</div>
            <NuevoRecordatorioForm
              clientes={clientes}
              repartidores={repartidores}
              onGuardar={(datos)=>{onNuevo(datos);setMostrarNuevo(false);}}
              onCerrar={()=>setMostrarNuevo(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoRecordatorioForm({clientes,onGuardar,onCerrar,repartidores}) {
  const hoy = (()=>{const d=new Date(Date.now()-3*60*60*1000);return d.toISOString().slice(0,10);})();
  const [tipo,setTipo]     = React.useState("visita");
  const [fecha,setFecha]   = React.useState(hoy);
  const [hora,setHora]     = React.useState("10:00");
  const [busq,setBusq]     = React.useState("");
  const [clienteId,setClienteId] = React.useState(null);
  const [motivo,setMotivo] = React.useState("");
  const [paraRepartidor,setParaRepartidor] = React.useState(""); // "" = yo mismo (dueño)
  const tipoConfig = {visita:{ico:"🏠",label:"Visita",color:"#5daaff",bg:"#1e3a5f"},cobro:{ico:"💰",label:"Cobro",color:"#f5b942",bg:"#2e1f06"}};
  const clientesFilt = busq.length>1 ? clientes.filter(c=>c.nombre.toLowerCase().includes(busq.toLowerCase())).slice(0,6) : [];
  const clienteSel = clientes.find(c=>c.id===clienteId);
  return (
    <div>
      {/* Tipo */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {Object.entries(tipoConfig).map(([k,tc])=>(
          <button key={k} style={{flex:1,padding:"10px 8px",borderRadius:10,border:`2px solid ${tipo===k?tc.color:"var(--color-border-secondary)"}`,
            background:tipo===k?tc.bg:"transparent",color:tipo===k?tc.color:"var(--color-text-secondary)",
            fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}
            onClick={()=>setTipo(k)}>
            <span style={{fontSize:20}}>{tc.ico}</span>{tc.label}
          </button>
        ))}
      </div>
      {/* Fecha y hora */}
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <div style={{flex:2}}><label style={s.label}>Fecha</label><input type="date" style={s.input} value={fecha} onChange={e=>setFecha(e.target.value)}/></div>
        <div style={{flex:1}}><label style={s.label}>Hora</label><input type="time" style={s.input} value={hora} onChange={e=>setHora(e.target.value)}/></div>
      </div>
      {/* Buscar cliente */}
      <div style={{marginBottom:10}}>
        <label style={s.label}>Cliente</label>
        {clienteSel ? (
          <div style={{...s.card,margin:0,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--color-background-info)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{clienteSel.nombre}</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{clienteSel.dia} · {clienteSel.barrio||""}</div>
            </div>
            <button style={{...s.btn,fontSize:11,padding:"3px 8px"}} onClick={()=>{setClienteId(null);setBusq("");}}>✕</button>
          </div>
        ) : (
          <div>
            <input style={s.input} placeholder="Escribí el nombre del cliente..." value={busq} onChange={e=>setBusq(e.target.value)} />
            {clientesFilt.map(c=>(
              <div key={c.id} style={{...s.card,margin:"2px 0",padding:"8px 12px",cursor:"pointer",background:"var(--color-background-tertiary)"}}
                onClick={()=>{setClienteId(c.id);setBusq("");}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{c.nombre}</div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{c.dia} · {c.barrio||""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Para quién (si hay repartidores cargados) */}
      {repartidores&&repartidores.length>0&&(
        <div style={{marginBottom:10}}>
          <label style={s.label}>¿Para quién?</label>
          <select style={s.select} value={paraRepartidor} onChange={e=>setParaRepartidor(e.target.value)}>
            <option value="">Yo mismo</option>
            {repartidores.map(r=>(<option key={r.nombre} value={r.nombre}>{r.nombre}</option>))}
          </select>
        </div>
      )}
      {/* Detalle */}
      <div style={{marginBottom:14}}>
        <label style={s.label}>Detalle</label>
        <textarea style={{...s.input,minHeight:60,resize:"vertical"}}
          placeholder={tipo==="cobro"?"ej: Cobrar deuda $5.000...":"ej: Pasar a visitar, entregar pedido..."}
          value={motivo} onChange={e=>setMotivo(e.target.value)}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{...s.btn,flex:1}} onClick={onCerrar}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2,opacity:(!clienteId||!motivo.trim())?0.5:1}}
          disabled={!clienteId||!motivo.trim()}
          onClick={()=>onGuardar({id:Date.now(),tipo,fecha,hora,motivo:motivo.trim(),clienteId,clienteNombre:(clientes.find(c=>c.id===clienteId)||{}).nombre||"",confirmado:false,paraRepartidor:paraRepartidor||null})}>
          Guardar recordatorio
        </button>
      </div>
    </div>
  );
}



function ConfigApariencia() {
  const [temaActual, setTemaActual] = React.useState(getTemaActual);
  const [modoVista, setModoVista] = React.useState(()=>TEMAS[getTemaActual()]?.modo||"oscuro");
  const [guardado, setGuardado] = React.useState(false);
  const [logo, setLogo] = React.useState(()=>getLogo());
  const [subiendoLogo, setSubiendoLogo] = React.useState(false);
  const licData = (() => { try { return JSON.parse(localStorage.getItem("rm_licencia")||"null"); } catch { return null; } })();
  const [nombreNegocio, setNombreNegocio] = React.useState(()=>licData?.negocio||"");
  const [guardandoNombre, setGuardandoNombre] = React.useState(false);
  const [nombreGuardado, setNombreGuardado] = React.useState(false);

  const aplicar = (id) => {
    setTemaActual(id);
    aplicarTema(id);
    localStorage.setItem("sr_tema", JSON.stringify(id));
    setGuardado(true);
    setTimeout(()=>setGuardado(false),2000);
  };

  const temasFiltrados = Object.entries(TEMAS).filter(([,t])=>t.modo===modoVista);

  return (
    <div>
      <div style={{...s.card,marginBottom:12,background:"var(--color-background-secondary)"}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",marginBottom:10}}>🎨 Paleta de colores</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["oscuro","🌙 Oscuro"],["claro","☀️ Claro"]].map(([m,l])=>(
            <button key={m} style={{flex:1,padding:"7px 8px",fontSize:12,fontWeight:500,borderRadius:8,cursor:"pointer",
              background:modoVista===m?"var(--color-accent)":"var(--color-background-tertiary)",
              color:modoVista===m?"#fff":"var(--color-text-secondary)",
              border:`1px solid ${modoVista===m?"transparent":"var(--color-border-secondary)"}`}}
              onClick={()=>setModoVista(m)}>{l}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {temasFiltrados.map(([id,tema])=>(
            <button key={id} onClick={()=>aplicar(id)} style={{
              padding:"10px 8px",borderRadius:10,cursor:"pointer",textAlign:"center",
              border:`2px solid ${temaActual===id?"var(--color-accent)":"var(--color-border-secondary)"}`,
              background:temaActual===id?"var(--color-background-secondary)":"var(--color-background-tertiary)",
            }}>
              <div style={{fontSize:20,marginBottom:3}}>{tema.emoji}</div>
              <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{tema.nombre}</div>
              <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                {[tema.vars["--color-background-primary"],tema.vars["--color-accent"]||tema.vars["--color-text-info"],tema.vars["--color-text-success"],tema.vars["--color-text-warning"]].map((c,i)=>(
                  <div key={i} style={{width:12,height:12,borderRadius:"50%",background:c,border:"1px solid rgba(128,128,128,0.3)"}}/>
                ))}
              </div>
              {temaActual===id&&<div style={{fontSize:10,color:"var(--color-text-info)",marginTop:3}}>✓ Activo</div>}
            </button>
          ))}
        </div>
        {guardado&&<div style={{fontSize:12,color:"var(--color-text-success)",textAlign:"center",marginTop:8}}>✓ Estilo aplicado</div>}
      </div>

      {/* Nombre del negocio */}
      <div style={{...s.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",marginBottom:10}}>🏪 Nombre del negocio</div>
        <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8,lineHeight:1.5}}>
          Aparece arriba de todo, en el menú principal.
        </div>
        <input style={{...s.input,marginBottom:8}} placeholder="Ej: Distribuidora Pérez" value={nombreNegocio} onChange={e=>setNombreNegocio(e.target.value)} />
        <button style={{...s.btnPrimary,width:"100%",fontSize:13}} disabled={guardandoNombre}
          onClick={async()=>{
            setGuardandoNombre(true);
            const ok = await guardarNombreFirestore(licData?.codigo, nombreNegocio.trim());
            setGuardandoNombre(false);
            if(ok){ setNombreGuardado(true); setTimeout(()=>setNombreGuardado(false),2000); }
            else alert("❌ No se pudo guardar. Verificá la conexión.");
          }}>{guardandoNombre?"Guardando...":"Guardar nombre"}</button>
        {nombreGuardado&&<div style={{fontSize:12,color:"var(--color-text-success)",textAlign:"center",marginTop:6}}>✓ Guardado</div>}
      </div>

      {/* Logo del negocio */}
      <div style={{...s.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",marginBottom:10}}>🖼 Logo del negocio</div>
        {logo&&(
          <div style={{textAlign:"center",marginBottom:10}}>
            <img src={logo} alt="Logo" style={{maxHeight:100,maxWidth:"100%",objectFit:"contain",borderRadius:8,border:"0.5px solid var(--color-border-secondary)"}} />
          </div>
        )}
        <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8,lineHeight:1.5}}>
          El logo aparece en la portada de la app. Recomendado: fondo transparente o blanco, mínimo 200×200px.
        </div>
        <input type="file" accept="image/*" style={{...s.input,padding:"7px",fontSize:12,marginBottom:8}}
          onChange={async(e)=>{
            const f=e.target.files[0]; if(!f) return;
            setSubiendoLogo(true);
            try {
              const b64 = await comprimirLogoBase64(f, 400, 400, 0.8);
              const ok = await guardarLogoFirestore(licData?.codigo, b64);
              if(ok) { setLogo(b64); alert("✅ Logo guardado correctamente."); }
              else alert("❌ No se pudo guardar el logo. Verificá la conexión.");
            } catch(e) { alert("Error al procesar la imagen: "+e.message); }
            setSubiendoLogo(false);
            e.target.value="";
          }}
        />
        {logo&&(
          <button style={{...s.btnDanger,width:"100%",fontSize:12}} onClick={async()=>{
            if(!window.confirm("¿Eliminar el logo?")) return;
            await guardarLogoFirestore(licData?.codigo, "");
            setLogo(null);
          }}>🗑 Quitar logo</button>
        )}
        {subiendoLogo&&<div style={{fontSize:12,color:"var(--color-text-info)",textAlign:"center",marginTop:6}}>Procesando imagen...</div>}
      </div>
    </div>
  );
}

// ── VistaClientesGeneral (dueño ve TODOS los clientes agrupados) ──
function VistaClientesGeneral({clientes, repartos, ventas, onVerDetalle, onAgenda, onMapa, onVolver}) {
  const [busq, setBusq] = React.useState("");
  const [repFiltro, setRepFiltro] = React.useState("todos");
  const [diaFiltro, setDiaFiltro] = React.useState("todos");
  const [abiertos, setAbiertos] = React.useState({});

  const toggle = (key) => setAbiertos(o=>({...o,[key]:!o[key]}));

  // Calcular saldo deudor para badge
  const saldoCliente = (c) => c.saldo||0;

  // Última venta por cliente
  const ultimaVenta = React.useMemo(()=>{
    const m={};
    ventas.forEach(v=>{
      if(!m[v.clienteId]||v.fechaKey>m[v.clienteId]) m[v.clienteId]=v.fechaKey;
    });
    return m;
  },[ventas]);

  // Filtrar clientes
  const busqL = busq.toLowerCase();
  const clientesFiltrados = clientes.filter(c=>{
    if(repFiltro!=="todos" && c.repartoId!==repFiltro) return false;
    if(diaFiltro!=="todos" && c.dia!==diaFiltro) return false;
    if(busq && !c.nombre.toLowerCase().includes(busqL) &&
       !(c.barrio||"").toLowerCase().includes(busqL) &&
       !(c.telefono||"").includes(busq)) return false;
    return true;
  });

  // Agrupar: repartidor → dia → clientes
  const grupos = React.useMemo(()=>{
    const repMap = {};
    repartos.forEach(r=>{ repMap[r.id]=r; });

    // Sin reparto asignado van a un grupo especial
    const sinReparto = {id:"sin", repartidorNombre:"Sin reparto", numero:0};

    const agrupado = {};
    clientesFiltrados.forEach(c=>{
      const repId = c.repartoId||"sin";
      const rep = repMap[repId]||sinReparto;
      if(!agrupado[repId]) agrupado[repId]={rep, dias:{}};
      const dia = c.dia||"Sin día";
      if(!agrupado[repId].dias[dia]) agrupado[repId].dias[dia]=[];
      agrupado[repId].dias[dia].push(c);
    });

    // Ordenar por número de reparto
    return Object.values(agrupado).sort((a,b)=>a.rep.numero-b.rep.numero);
  },[clientesFiltrados, repartos]);

  const totalClientes = clientesFiltrados.length;
  const totalDeudores = clientesFiltrados.filter(c=>saldoCliente(c)<0).length;
  const totalDeuda = clientesFiltrados.filter(c=>saldoCliente(c)<0).reduce((a,c)=>a+Math.abs(saldoCliente(c)),0);

  return (
    <div style={s.screen}>
      <HeaderApp titulo="Todos los clientes" onVolver={onVolver}/>

      {/* Resumen general */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"10px 14px 6px"}}>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)"}}>{totalClientes}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Clientes</div>
        </div>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#e05252"}}>{totalDeudores}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Con deuda</div>
        </div>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#e05252"}}>{fmt(totalDeuda)}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Total deuda</div>
        </div>
      </div>
      {(onAgenda||onMapa)&&(
        <div style={{display:"flex",gap:6,padding:"0 14px 6px"}}>
          {onAgenda&&<button style={{...s.btn,flex:1,fontSize:12}} onClick={onAgenda}>📅 Agenda</button>}
          {onMapa&&<button style={{...s.btn,flex:1,fontSize:12}} onClick={onMapa}>🗺 Mapa</button>}
        </div>
      )}

      {/* Búsqueda */}
      <div style={{padding:"0 14px 8px"}}>
        <input style={s.input} placeholder="🔍 Buscar por nombre, barrio o teléfono..."
          value={busq} onChange={e=>setBusq(e.target.value)} />
      </div>

      {/* Filtro por reparto */}
      <div style={{padding:"0 14px 6px",overflowX:"auto"}}>
        <div style={{display:"flex",gap:6,whiteSpace:"nowrap",paddingBottom:4}}>
          <button style={{...s.btn,fontSize:11,padding:"4px 12px",flexShrink:0,
            background:repFiltro==="todos"?"#185FA5":"var(--color-background-tertiary)",
            color:repFiltro==="todos"?"#e2eaf4":"var(--color-text-secondary)"}}
            onClick={()=>setRepFiltro("todos")}>Todos</button>
          {repartos.sort((a,b)=>a.numero-b.numero).map(r=>(
            <button key={r.id} style={{...s.btn,fontSize:11,padding:"4px 12px",flexShrink:0,
              background:repFiltro===r.id?"#185FA5":"var(--color-background-tertiary)",
              color:repFiltro===r.id?"#e2eaf4":"var(--color-text-secondary)"}}
              onClick={()=>setRepFiltro(r.id)}>Rep.{r.numero} · {r.repartidorNombre.split(" ")[0]}</button>
          ))}
        </div>
      </div>

      {/* Filtro por día */}
      <div style={{padding:"0 14px 10px",overflowX:"auto"}}>
        <div style={{display:"flex",gap:6,whiteSpace:"nowrap",paddingBottom:4}}>
          {["todos",...DIAS].map(d=>(
            <button key={d} style={{...s.btn,fontSize:11,padding:"3px 10px",flexShrink:0,
              background:diaFiltro===d?"#0e7c6b":"var(--color-background-tertiary)",
              color:diaFiltro===d?"#e2eaf4":"var(--color-text-secondary)"}}
              onClick={()=>setDiaFiltro(d)}>
              {d==="todos"?"Todos los días":d}
            </button>
          ))}
        </div>
      </div>

      {/* Lista agrupada */}
      <div style={{padding:"0 14px 32px"}}>
        {grupos.length===0 && (
          <div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-tertiary)"}}>
            <div style={{fontSize:36,marginBottom:8}}>🔍</div>
            <div style={{fontSize:14}}>No se encontraron clientes</div>
          </div>
        )}

        {grupos.map(({rep, dias})=>{
          const repKey = "rep_"+rep.id;
          const repAbierto = abiertos[repKey]!==false; // abierto por defecto
          const totalRep = Object.values(dias).flat().length;
          const deudaRep = Object.values(dias).flat().filter(c=>saldoCliente(c)<0).reduce((a,c)=>a+Math.abs(saldoCliente(c)),0);
          const deudoresRep = Object.values(dias).flat().filter(c=>saldoCliente(c)<0).length;

          return (
            <div key={rep.id} style={{marginBottom:12}}>
              {/* Header del repartidor */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                background:"#185FA5",borderRadius:10,cursor:"pointer",marginBottom:repAbierto?6:0}}
                onClick={()=>toggle(repKey)}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.2)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {rep.numero||"?"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{rep.repartidorNombre}</div>
                  <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>{totalRep} clientes</span>
                    {deudoresRep>0&&<span style={{fontSize:11,color:"#ffcc66",fontWeight:600}}>⚠️ {deudoresRep} deben {fmt(deudaRep)}</span>}
                    {deudoresRep===0&&totalRep>0&&<span style={{fontSize:11,color:"#7de8c5"}}>✓ Sin deudas</span>}
                  </div>
                </div>
                <span style={{color:"rgba(255,255,255,0.7)",fontSize:16}}>{repAbierto?"▲":"▼"}</span>
              </div>

              {/* Días del repartidor */}
              {repAbierto && DIAS.filter(d=>dias[d]&&(diaFiltro==="todos"||d===diaFiltro)).map(dia=>{
                const diaKey = "dia_"+rep.id+"_"+dia;
                const diaAbierto = abiertos[diaKey]!==false; // abierto por defecto
                const csDia = (dias[dia]||[]).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
                const deudoresDia = csDia.filter(c=>saldoCliente(c)<0).length;

                return (
                  <div key={dia} style={{marginBottom:6,marginLeft:8}}>
                    {/* Header del día */}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
                      background:"var(--color-background-tertiary)",
                      borderRadius:8,cursor:"pointer",border:"0.5px solid var(--color-border-secondary)",
                      marginBottom:diaAbierto?4:0}}
                      onClick={()=>toggle(diaKey)}>
                      <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",flex:1}}>
                        📅 {dia}
                      </span>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{csDia.length} clientes</span>
                      {deudoresDia>0&&<span style={s.badge("danger")}>{deudoresDia} deben</span>}
                      <span style={{color:"var(--color-text-tertiary)",fontSize:12,marginLeft:4}}>{diaAbierto?"▲":"▼"}</span>
                    </div>

                    {/* Clientes del día */}
                    {diaAbierto && csDia.map(c=>{
                      const saldo = saldoCliente(c);
                      const ult = ultimaVenta[c.id];
                      return (
                        <div key={c.id}
                          style={{display:"flex",alignItems:"center",gap:10,
                            padding:"10px 12px",marginBottom:4,marginLeft:8,
                            background:"var(--color-background-secondary)",
                            borderRadius:8,cursor:"pointer",
                            border:"0.5px solid "+(saldo<0?"rgba(220,80,80,0.3)":"var(--color-border-secondary)"),
                            transition:"opacity 0.15s"}}
                          onClick={()=>onVerDetalle(c)}>
                          {/* Número de orden */}
                          <div style={{width:24,height:24,borderRadius:6,
                            background:"var(--color-background-tertiary)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:10,fontWeight:700,color:"var(--color-text-tertiary)",flexShrink:0}}>
                            {c.orden||"—"}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",
                              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {c.nombre}
                            </div>
                            <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>
                              {direccionCliente(c)}
                            </div>
                            {ult&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:1}}>Última venta: {ult}</div>}
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {saldo<0 && <div style={{fontSize:12,fontWeight:600,color:"#e05252"}}>−{fmt(Math.abs(saldo))}</div>}
                            {saldo>0 && <div style={{fontSize:12,fontWeight:600,color:"#4dd9a0"}}>+{fmt(saldo)}</div>}
                            {saldo===0 && <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>✓</div>}
                            <span style={{fontSize:14,color:"var(--color-text-tertiary)"}}>→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── ImportarClientesExcel ──────────────────────────────────────────────────
function ImportarClientesExcel({repartos, clientes, onGuardar, onVolver, repartoPreseleccionado}) {
  const [fase, setFase] = React.useState("inicio");
  const [filas, setFilas] = React.useState([]);
  const [errores, setErrores] = React.useState([]);
  const [importados, setImportados] = React.useState(0);
  const fileRef = React.useRef();

  const DIAS_MAP = {
    "lunes":"Lunes","martes":"Martes","miercoles":"Miercoles","miercoles":"Miercoles",
    "jueves":"Jueves","viernes":"Viernes","sabado":"Sabado","sabado":"Sabado","domingo":"Domingo"
  };
  const normDia = (d) => {
    if(!d) return null;
    const k = (d+"").toLowerCase().trim().normalize("NFD").replace(/[^a-z]/g,"");
    return DIAS_MAP[k] || null;
  };

  // Extraer lat/lng del link de Google Maps
  const extractCoords = (url) => {
    if(!url) return {lat:null, lng:null};
    // Formato: @lat,lng o ll=lat,lng o q=lat,lng
    let m = url.match(/@(-?[0-9.]+),(-?[0-9.]+)/);
    if(m) return {lat:parseFloat(m[1]), lng:parseFloat(m[2])};
    m = url.match(/[?&]ll=(-?[0-9.]+),(-?[0-9.]+)/);
    if(m) return {lat:parseFloat(m[1]), lng:parseFloat(m[2])};
    m = url.match(/[?&]q=(-?[0-9.]+),(-?[0-9.]+)/);
    if(m) return {lat:parseFloat(m[1]), lng:parseFloat(m[2])};
    return {lat:null, lng:null};
  };

  const procesarExcel = async (file) => {
    const buf = await file.arrayBuffer();
    let XLSX = window.XLSX;
    if(!XLSX){ alert("Cargando libreria Excel, esperá unos segundos y volvé a intentar."); return; }
    const wb = XLSX.read(buf, {type:"array"});
    const sheetName = wb.SheetNames.find(n=>n.includes("Clientes")||n.includes("clientes")) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});

    // Detectar fila de encabezado
    let headerRow = -1;
    for(let i=0;i<Math.min(10,raw.length);i++){
      const r = raw[i].map(c=>(c+"").toLowerCase());
      if(r.some(c=>c.includes("nombre")||c.includes("apellido"))){ headerRow=i; break; }
    }
    if(headerRow<0){ alert("No encontre la fila de encabezados. Usa la plantilla oficial."); return; }

    const headers = raw[headerRow].map(c=>(c+"").toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g,"").trim());
    const colIdx = (...kws) => {
      for(const kw of kws){
        const i = headers.findIndex(h=>h.includes(kw));
        if(i>=0) return i;
      }
      return -1;
    };

    const CI = {
      nombre:   colIdx("nombre","apellido"),
      dia:      colIdx("dia","visita"),
      orden:    colIdx("orden","ruta","n orden"),
      barrio:   colIdx("barrio"),
      calle:    colIdx("calle","direccion"),
      nro:      colIdx("numero","nro","n puerta"),
      manzana:  colIdx("manzana"),
      lote:     colIdx("lote"),
      sector:   colIdx("sector"),
      acl:      colIdx("aclaracion","casa","ref"),
      telefono: colIdx("telefono","tel"),
      maps:     colIdx("maps","google","link"),
      sifon:    colIdx("sifon","1.5"),
      bidon10:  colIdx("bidon 10","10l","10 l"),
      bidon20:  colIdx("bidon 20","20l","20 l"),
      dispenser:colIdx("dispenser"),
      saldo:    colIdx("saldo"),
      notas:    colIdx("nota","observ"),
    };

    const validas = [], errs = [];
    for(let i=headerRow+1; i<raw.length; i++){
      const row = raw[i];
      if(!row||row.every(c=>c===""||c==null)) continue;
      const nombre = CI.nombre>=0 ? (row[CI.nombre]||"").toString().trim() : "";
      if(!nombre||nombre.toLowerCase().includes("ejemplo")||nombre.startsWith("▼")) continue;
      const diaRaw = CI.dia>=0 ? (row[CI.dia]||"").toString().trim() : "";
      const dia = normDia(diaRaw);
      if(!dia){ errs.push({fila:i+1,nombre:nombre||"(sin nombre)",problemas:[`Dia "${diaRaw}" no reconocido`]}); continue; }

      const mapsUrl = CI.maps>=0 ? (row[CI.maps]||"").toString().trim() : "";
      const {lat, lng} = extractCoords(mapsUrl);

      validas.push({
        nombre,
        dia,
        orden:    CI.orden>=0    ? (parseInt(row[CI.orden])||null)         : null,
        barrio:   CI.barrio>=0   ? (row[CI.barrio]||"").toString().trim()  : "",
        calle:    CI.calle>=0    ? (row[CI.calle]||"").toString().trim()   : "",
        nro:      CI.nro>=0      ? (row[CI.nro]||"").toString().trim()     : "",
        manzana:  CI.manzana>=0  ? (row[CI.manzana]||"").toString().trim() : "",
        lote:     CI.lote>=0     ? (row[CI.lote]||"").toString().trim()    : "",
        sector:   CI.sector>=0   ? (row[CI.sector]||"").toString().trim()  : "",
        acl:      CI.acl>=0      ? (row[CI.acl]||"").toString().trim()     : "",
        telefono: CI.telefono>=0 ? (row[CI.telefono]||"").toString().trim(): "",
        maps:     mapsUrl,
        lat, lng,
        sifon:    CI.sifon>=0    ? (parseInt(row[CI.sifon])||0)            : 0,
        bidon10:  CI.bidon10>=0  ? (parseInt(row[CI.bidon10])||0)          : 0,
        bidon20:  CI.bidon20>=0  ? (parseInt(row[CI.bidon20])||0)          : 0,
        dispenser:CI.dispenser>=0? (parseInt(row[CI.dispenser])||0)        : 0,
        saldo:    CI.saldo>=0    ? (parseFloat((row[CI.saldo]||"0").toString().replace(",","."))||0) : 0,
        obs:      CI.notas>=0    ? (row[CI.notas]||"").toString().trim()   : "",
        _nuevo: true,
      });
    }
    setFilas(validas);
    setErrores(errs);
    setFase("preview");
  };

  const confirmarImport = () => {
    setFase("importando");
    const ahora = Date.now();
    const nuevos = filas.map((f,i)=>({
      ...f,
      id: ahora+i,
      envasesSifon:   f.sifon,
      envasesBidon10: f.bidon10,
      envasesBidon20: f.bidon20,
      // ▶ Si se importa desde el perfil de un repartidor, asignar automáticamente
      repartoId: repartoPreseleccionado?.id || f.repartoId || null,
    }));
    setImportados(nuevos.length);
    onGuardar(nuevos);
    setFase("listo");
  };

  if(fase==="listo") return (
    <div style={s.screen}>
      <HeaderApp titulo="Importar clientes" onVolver={onVolver}/>
      <div style={{padding:"60px 20px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>{"\u2705"}</div>
        <div style={{fontSize:18,fontWeight:700,color:"var(--color-text-primary)",marginBottom:8}}>
          {"\u00a1"}{importados} clientes importados!
        </div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:24}}>
          Ya estan disponibles en cada reparto
        </div>
        <button style={{...s.btnPrimary,padding:"12px 28px"}} onClick={onVolver}>Ir al panel</button>
      </div>
    </div>
  );

  if(fase==="preview") return (
    <div style={s.screen}>
      <HeaderApp titulo="Revisa los datos" onVolver={()=>setFase("inicio")}/>
      {repartoPreseleccionado&&(
        <div style={{margin:"8px 14px 0",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-secondary)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"var(--color-text-info)"}}>
          🚐 Todos los clientes se asignarán automáticamente a <b>{repartoPreseleccionado.repartidorNombre||repartoPreseleccionado.nombre}</b>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 14px 8px"}}>
        <div style={{...s.card,margin:0,background:"#0a2e1f",border:"1px solid #4dd9a0",padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#4dd9a0"}}>{filas.length}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Clientes listos</div>
        </div>
        <div style={{...s.card,margin:0,background:errores.length?"#2e0a0a":"#0a2e1f",border:"1px solid "+(errores.length?"#f07070":"#4dd9a0"),padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:errores.length?"#f07070":"#4dd9a0"}}>{errores.length}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Filas con error</div>
        </div>
      </div>
      {errores.length>0&&(
        <div style={{padding:"0 14px 8px"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#f07070",marginBottom:6}}>Filas con problemas (se omiten):</div>
          {errores.slice(0,5).map((e,i)=>(
            <div key={i} style={{...s.card,margin:"0 0 4px",padding:"8px 10px",background:"rgba(220,50,50,0.1)"}}>
              <div style={{fontSize:12,color:"var(--color-text-primary)"}}>Fila {e.fila}: <b>{e.nombre}</b></div>
              <div style={{fontSize:11,color:"#f07070"}}>{e.problemas.join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
      {filas.length>0&&(
        <div style={{padding:"0 14px 8px"}}>
          <div style={{fontSize:11,fontWeight:600,color:"var(--color-text-secondary)",marginBottom:6}}>
            Vista previa (primeros 5):
          </div>
          {filas.slice(0,5).map((f,i)=>(
            <div key={i} style={{...s.card,margin:"0 0 4px",padding:"8px 10px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{f.nombre}</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>
                {f.dia} · {f.calle?f.calle+" "+f.nro:f.manzana?"Mz "+f.manzana+" L "+f.lote:f.barrio}
                {f.lat?" · 📍 GPS ok":""}
                {f.saldo<0?" · Debe "+fmt(Math.abs(f.saldo)):""}
              </div>
            </div>
          ))}
          {filas.length>5&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",padding:"4px 0"}}>...y {filas.length-5} mas</div>}
        </div>
      )}
      <div style={{padding:"8px 14px 20px",display:"flex",gap:8}}>
        <button style={{...s.btn,flex:1}} onClick={()=>setFase("inicio")}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2,padding:"12px"}} disabled={filas.length===0} onClick={confirmarImport}>
          Importar {filas.length} clientes
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.screen}>
      <HeaderApp titulo="Importar clientes" onVolver={onVolver}/>
      <div style={{padding:"24px 14px",display:"flex",flexDirection:"column",gap:16}}>
        <div style={{...s.card,margin:0,background:"var(--color-background-info)",textAlign:"center",padding:"24px"}}>
          <div style={{fontSize:36,marginBottom:8}}>{"\u{1F4CA}"}</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6}}>Importar desde Excel</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.6}}>
            Usa la planilla oficial <b>planilla_clientes_SR2026.xlsx</b>.<br/>
            Completa los datos y selecciona el archivo.
          </div>
        </div>
        <button style={{...s.btnPrimary,padding:"16px",fontSize:15}} onClick={()=>fileRef.current?.click()}>
          {"\u{1F4CE}"} Seleccionar archivo Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
          onChange={e=>{ const f=e.target.files?.[0]; if(f) procesarExcel(f); e.target.value=""; }} />
        <div style={{...s.card,margin:0,padding:"12px 14px"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-secondary)",marginBottom:8}}>La planilla debe tener estas columnas:</div>
          {[
            "Nombre y Apellido *","Dia de Reparto *","N Orden *",
            "Barrio · Calle · Numero · Manzana · Lote",
            "Telefono · Link Google Maps",
            "Sifones · Bidones 10L · Bidones 20L · Dispenser",
            "Saldo Inicial · Notas"
          ].map((c,i)=>(
            <div key={i} style={{fontSize:11,color:i<3?"var(--color-text-primary)":"var(--color-text-secondary)",padding:"2px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              {i<3?"* ":""}{c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MapaClientes ─────────────────────────────────────────────────────────────
function MapaClientes({clientes, dia, fecha, ventas, noVisitas, onSeleccionar, onActualizar, onVolver}) {
  const mapRef = React.useRef(null);
  const mapInstRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const [leafletOk, setLeafletOk] = React.useState(!!window.L);
  const [filtroDia, setFiltroDia] = React.useState(dia||"todos");

  const ventasHoy = (ventas||[]).filter(v=>v.fechaKey===fecha);
  const noVisHoy  = (noVisitas||[]).filter(v=>v.fecha===fecha);
  const clientesFiltrados = clientes.filter(c=>{
    if(filtroDia!=="todos"&&c.dia!==filtroDia) return false;
    return c.lat&&c.lng;
  });
  const sinCoordenadas = clientes.filter(c=>(filtroDia==="todos"||c.dia===filtroDia)&&(!c.lat||!c.lng)).length;

  // Cargar Leaflet dinámicamente si no está
  React.useEffect(()=>{
    if(window.L){ setLeafletOk(true); return; }
    const link = document.createElement("link");
    link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = ()=>setLeafletOk(true);
    document.head.appendChild(script);
  },[]);

  // Inicializar mapa cuando Leaflet está listo
  React.useEffect(()=>{
    if(!leafletOk||!mapRef.current) return;
    if(mapInstRef.current){ mapInstRef.current.remove(); mapInstRef.current=null; }
    const L = window.L;
    const map = L.map(mapRef.current, {zoomControl:true, scrollWheelZoom:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:"© OpenStreetMap",maxZoom:19
    }).addTo(map);
    mapInstRef.current = map;

    // Agregar marcadores
    markersRef.current = [];
    const bounds = [];
    clientesFiltrados.forEach(c=>{
      const entregado = ventasHoy.some(v=>v.clienteId===c.id);
      const noVisitado = noVisHoy.some(v=>v.clienteId===c.id);
      const color = entregado?"#4dd9a0":noVisitado?"#f07070":"#5daaff";
      const icon = L.divIcon({
        className:"",
        html:`<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">${c.orden||"·"}</div>`,
        iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-14]
      });
      const marker = L.marker([c.lat,c.lng],{icon}).addTo(map);
      marker.bindPopup(`<div style="font-family:sans-serif;min-width:160px"><b style="font-size:13px">${c.nombre}</b><br/><span style="font-size:11px;color:#666">${c.dia} · orden ${c.orden||"-"}</span><br/>${direccionCliente(c)}<br/>${entregado?"<span style='color:#059669;font-weight:600'>✓ Entregado</span>":noVisitado?"<span style='color:#dc2626'>✗ No visitado</span>":"<span style='color:#2563eb'>Pendiente</span>"}</div>`);
      if(onSeleccionar) marker.on("popupopen",()=>marker.getPopup().getElement()?.addEventListener("click",()=>onSeleccionar(c)));
      bounds.push([c.lat,c.lng]);
      markersRef.current.push(marker);
    });

    if(bounds.length>0) map.fitBounds(bounds,{padding:[30,30]});
    else map.setView([-26.82,-65.2],13);

    return ()=>{ if(mapInstRef.current){ mapInstRef.current.remove(); mapInstRef.current=null; } };
  },[leafletOk, filtroDia, clientesFiltrados.length]);

  const entregadosCount = clientesFiltrados.filter(c=>ventasHoy.some(v=>v.clienteId===c.id)).length;
  const pendientesCount = clientesFiltrados.filter(c=>!ventasHoy.some(v=>v.clienteId===c.id)&&!noVisHoy.some(v=>v.clienteId===c.id)).length;

  return (
    <div style={{...s.screen,display:"flex",flexDirection:"column"}}>
      <HeaderApp titulo="Mapa de clientes" onVolver={onVolver}/>
      {/* Filtro de dia */}
      <div style={{padding:"8px 14px",display:"flex",gap:6,overflowX:"auto",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {["todos",...DIAS].map(d=>(
          <button key={d} style={{...s.btn,padding:"5px 12px",fontSize:12,flexShrink:0,
            background:filtroDia===d?"#185FA5":"var(--color-background-tertiary)",
            color:filtroDia===d?"#e2eaf4":"var(--color-text-secondary)",
            border:filtroDia===d?"none":"0.5px solid var(--color-border-secondary)"}}
            onClick={()=>setFiltroDia(d)}>
            {d==="todos"?"Todos":d}
          </button>
        ))}
      </div>
      {/* Stats */}
      <div style={{display:"flex",gap:0,background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{fontSize:16,fontWeight:600,color:"#5daaff"}}>{clientesFiltrados.length}</div>
          <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>Con GPS</div>
        </div>
        <div style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{fontSize:16,fontWeight:600,color:"#4dd9a0"}}>{entregadosCount}</div>
          <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>Entregados</div>
        </div>
        <div style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{fontSize:16,fontWeight:600,color:"#f5b942"}}>{pendientesCount}</div>
          <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>Pendientes</div>
        </div>
        <div style={{flex:1,textAlign:"center",padding:"8px 4px"}}>
          <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-tertiary)"}}>{sinCoordenadas}</div>
          <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>Sin GPS</div>
        </div>
      </div>
      {/* Leyenda */}
      <div style={{display:"flex",gap:12,padding:"6px 14px",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {[["#4dd9a0","Entregado"],["#5daaff","Pendiente"],["#f07070","No visitado"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:c}}/>
            <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{l}</span>
          </div>
        ))}
      </div>
      {/* Mapa */}
      {!leafletOk&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
          <div style={{fontSize:24}}>{"\u{1F5FA}"}</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Cargando mapa...</div>
        </div>
      )}
      {leafletOk&&clientesFiltrados.length===0&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,padding:"20px 24px 8px"}}>
          <div style={{fontSize:32}}>{"\u{1F4CD}"}</div>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Ningún cliente tiene GPS aún</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.5}}>
            Pegá el link de Google Maps de cada cliente abajo para que aparezcan en el mapa.
          </div>
        </div>
      )}
      <div ref={mapRef} style={{flex:1,minHeight:350,display:leafletOk&&clientesFiltrados.length>0?"block":"none"}}/>

      {/* Lista de clientes SIN GPS para asignar coordenadas */}
      {sinCoordenadas>0&&(
        <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingBottom:40}}>
          <div style={{padding:"10px 14px 4px",fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.07em"}}>
            {"\u{1F4CD}"} {sinCoordenadas} clientes sin GPS — pegá el link de Google Maps
          </div>
          {clientes
            .filter(c=>(filtroDia==="todos"||c.dia===filtroDia)&&(!c.lat||!c.lng))
            .sort((a,b)=>(a.dia||"").localeCompare(b.dia||"")||(a.orden||99)-(b.orden||99))
            .map(c=>(
              <SinGpsItem key={c.id} cliente={c} onGuardar={(mapsUrl)=>{
                if(onActualizar){
                  const {lat,lng}=extractCoords(mapsUrl);
                  onActualizar(clientes.map(x=>x.id===c.id?{...x,maps:mapsUrl,lat,lng}:x));
                }
              }}/>
            ))
          }
        </div>
      )}
    </div>
  );
}

function SinGpsItem({cliente, onGuardar}) {
  const [link, setLink] = React.useState(cliente.maps||"");
  const [guardado, setGuardado] = React.useState(false);
  const guardar = () => {
    if(!link.trim()){alert("Pegá un link de Google Maps"); return;}
    onGuardar(link.trim());
    setGuardado(true);
    setTimeout(()=>setGuardado(false), 2000);
  };
  return (
    <div style={{margin:"6px 14px",background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 12px",border:"0.5px solid var(--color-border-tertiary)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div>
          <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{cliente.nombre}</div>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{cliente.dia} · Orden {cliente.orden||"-"} · {cliente.barrio||cliente.calle||""}</div>
        </div>
        {guardado&&<span style={{fontSize:11,color:"var(--color-text-success)",fontWeight:600}}>✓ Guardado</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          style={{...s.input,fontSize:12,flex:1}}
          placeholder="https://maps.app.goo.gl/..."
          value={link}
          onChange={e=>setLink(e.target.value)}
        />
        <button style={{...s.btnPrimary,padding:"6px 14px",fontSize:12,width:"auto",whiteSpace:"nowrap"}}
          onClick={guardar}>
          📍 Guardar
        </button>
      </div>
    </div>
  );
}


function usarInformes({ventas, clientes, planillas, noVisitas, productos, repartoId}) {

  const getLic = () => {
    try{
      // Dueño: rm_licencia_dueno
      const dueno = JSON.parse(localStorage.getItem("rm_licencia_dueno")||"null");
      if(dueno?.email) return dueno;
      // Repartidor: buscar en rm_licencia el negocioId y luego en Firebase
      const rep = JSON.parse(localStorage.getItem("rm_licencia")||"null");
      if(rep?.email) return rep;
      // Fallback legacy
      return JSON.parse(localStorage.getItem("rm_licencia")||"{}");
    }catch{ return {}; }
  };

  // Para repartidor: obtener email del dueño desde Firebase
  const getEmailDueno = async () => {
    const lic = getLic();
    if(lic?.email) return lic.email;
    // Buscar en Firebase el negocio del repartidor
    try {
      const rep = JSON.parse(localStorage.getItem("rm_licencia")||"null");
      if(rep?.negocioId && window.db) {
        const snap = await window.db.collection("negocios").doc(rep.negocioId).get();
        if(snap.exists) return snap.data().email || snap.data().ownerEmail || null;
      }
    } catch(e) {}
    return null;
  };

  const fmtPesos = (n) => "$" + Math.round(Number(n)||0).toLocaleString("es-AR");

  const enviarDiario = async (fecha, dia, imgData) => {
    const lic = getLic();
    const emailDestino = lic.email || await getEmailDueno();
    if(!emailDestino || !window.enviarEmailBrevoRM) {
      alert("No se encontró el email. Verificá la configuración.");
      return false;
    }
    lic.email = emailDestino;
    try {
      const CAJON_SODA = 6;
      const calcCajones = (s) => { const f=Math.floor(s/CAJON_SODA); return (s%CAJON_SODA)>=4?f+1:f; };
      const todasFecha = (ventas||[]).filter(v=>v.fechaKey===fecha);
      const clientesDia = new Set((clientes||[]).filter(c=>c.dia===dia).map(c=>c.id));
      const todasVentasDia = [...todasFecha.filter(v=>clientesDia.has(v.clienteId)),...todasFecha.filter(v=>!clientesDia.has(v.clienteId))];
      const plan = (planillas||{})[claveDiaReparto(dia,fecha,repartoId)]||{};
      const planEf  = plan.efectivo   !== "" && plan.efectivo   !== undefined ? Number(plan.efectivo  ||0) : null;
      const planRet = plan.retenciones!== "" && plan.retenciones!== undefined ? Number(plan.retenciones||0) : null;
      const planFi  = plan.fiado      !== "" && plan.fiado      !== undefined ? Number(plan.fiado     ||0) : null;
      const calcEf = todasVentasDia.filter(v=>v.pago==="contado"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoEfec)||0):(v.pagadoNum||v.neto||0)),0);
      const calcTr = todasVentasDia.filter(v=>v.pago==="transferencia"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.pagadoNum||v.neto||0)),0);
      const calcFi = todasVentasDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
      const ef  = planEf  !== null ? planEf  : Math.round(calcEf);
      const ret = planRet !== null ? planRet : Math.round(calcTr*0.025);
      const tr  = planRet !== null ? Math.round(planRet/0.025) : Math.round(calcTr);
      const trN = tr - ret; const fi = planFi !== null ? planFi : Math.round(calcFi);
      const vendSoda=todasVentasDia.reduce((a,v)=>a+((v.detalle||[]).find(d=>d.nombre==="Sifón 1.5L")?.cantidad||0),0);
      const vendB10 =todasVentasDia.reduce((a,v)=>a+((v.detalle||[]).find(d=>d.nombre==="Bidón 10L" )?.cantidad||0),0);
      const vendB20 =todasVentasDia.reduce((a,v)=>a+((v.detalle||[]).find(d=>d.nombre==="Bidón 20L" )?.cantidad||0),0);
      const cajVend = calcCajones(vendSoda);
      const salSoda = Number(plan.productos?.soda?.llenos||0); const cajSal = calcCajones(salSoda);
      const salB10  = Number(plan.productos?.b10?.llenos||0);
      const salB20  = Number(plan.productos?.b20?.llenos||0);
      const cS=(productos||[]).find(p=>p.nombre==="Sifón 1.5L")?.costo||133.33;
      const cB10=(productos||[]).find(p=>p.nombre==="Bidón 10L")?.costo||800;
      const cB20=(productos||[]).find(p=>p.nombre==="Bidón 20L")?.costo||1100;
      const costo = cajVend*(cS*CAJON_SODA) + vendB10*cB10 + vendB20*cB20;
      const gastosList = (plan.gastos||[]).filter(g=>g.monto);
      const gastos = gastosList.reduce((a,g)=>a+Math.round(Number(g.monto)||0),0);
      const mano = ef - costo - gastos; const gan = (ef+trN) - costo - gastos;
      const entregas = todasVentasDia.filter(v=>!v._esCobro&&!v._esAjuste).length;
      const noVis = (noVisitas||[]).filter(v=>v.fecha===fecha&&v.dia===dia).length;
      const negocio = lic.negocio||lic.nombre||"Sistema de Reparto";
      const fila = (l,v,color="") => `<tr><td style="padding:7px 0;color:#555;border-bottom:1px solid #eee">${l}</td><td style="text-align:right;font-weight:600;border-bottom:1px solid #eee;color:${color||"#222"}">${v}</td></tr>`;
      const sep = (titulo) => `<tr><td colspan="2" style="padding:10px 0 4px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em">${titulo}</td></tr>`;
      const envRow=(prod,sal,vend,volv)=>sal>0||vend>0?`<tr><td style="padding:5px 4px;border-bottom:1px solid #eee">${prod}</td><td style="text-align:center;padding:5px 4px;border-bottom:1px solid #eee">${sal}</td><td style="text-align:center;padding:5px 4px;border-bottom:1px solid #eee;color:#185FA5;font-weight:700">${vend}</td><td style="text-align:center;padding:5px 4px;border-bottom:1px solid #eee">${volv}</td></tr>`:"";
      const htmlContent = imgData
        ? `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:16px;background:#f9fafb"><div style="background:#185FA5;border-radius:12px 12px 0 0;padding:16px 20px"><h2 style="color:#fff;margin:0;font-size:17px">📋 Cierre del día · ${dia} ${fecha}</h2><p style="color:#c8dcf0;margin:4px 0 0;font-size:12px">${negocio}</p></div><div style="background:#fff;border-radius:0 0 12px 12px;padding:12px"><img src="${imgData}" style="width:100%;border-radius:8px;display:block;" alt="Planilla del día"/></div><p style="color:#aaa;font-size:11px;text-align:center;margin-top:12px">Sistema de Reparto · Emma Soluciones Digitales</p></div>`
        : `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb"><div style="background:#185FA5;border-radius:12px 12px 0 0;padding:20px 24px"><h2 style="color:#fff;margin:0;font-size:18px">📋 Cierre del día · ${dia} ${fecha}</h2><p style="color:#c8dcf0;margin:4px 0 0;font-size:13px">${negocio}</p></div><div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08)"><div style="background:#f0f7ff;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center"><div style="font-size:32px;font-weight:800;color:#185FA5">${fmtPesos(ef+tr+fi)}</div><div style="color:#666;font-size:13px">${entregas} entregas · ${noVis} sin visita</div></div><table style="width:100%;border-collapse:collapse;font-size:14px">${cajSal>0||cajVend>0?`${sep("📦 Envases")}<tr style="background:#f5f5f5"><td style="padding:4px;font-size:11px;color:#888">Prod.</td><td style="text-align:center;padding:4px;font-size:11px;color:#888">Sal.</td><td style="text-align:center;padding:4px;font-size:11px;color:#888">Vend.</td><td style="text-align:center;padding:4px;font-size:11px;color:#888">Vuelve</td></tr>${envRow("Soda (caj)",cajSal,cajVend,cajSal-cajVend)}${envRow("Bidón 10L",salB10,vendB10,salB10-vendB10)}${envRow("Bidón 20L",salB20,vendB20,salB20-vendB20)}`:""}${sep("💵 Cobranza")}${fila("Efectivo",fmtPesos(ef))}${tr>0?fila("Transferencias (bruto)",fmtPesos(tr)):""}${ret>0?fila("Retención 2.5%","−"+fmtPesos(ret),"#e05c5c"):""}${tr>0?fila("Transferencias (neto)",fmtPesos(trN),"#185FA5"):""}${fi>0?fila("Fiado",fmtPesos(fi),"#f5a623"):""}${sep("📦 Costos")}${fila("Llenado","−"+fmtPesos(costo),"#e05c5c")}${gastos>0?`${sep("💸 Gastos")}${gastosList.map(g=>fila(g.cat+(g.desc?` · ${g.desc}`:""),"−"+fmtPesos(Math.round(Number(g.monto)||0)),"#e05c5c")).join("")}${fila("<b>Total</b>","−"+fmtPesos(gastos),"#e05c5c")}`:""}${sep("💰 Resultado")}${fila("<b>Plata en mano</b>","<b>"+fmtPesos(mano)+"</b>",mano>=0?"#0a7c3e":"#e05c5c")}${fila("<b>Ganancia neta</b>","<b>"+fmtPesos(gan)+"</b>",gan>=0?"#0a7c3e":"#e05c5c")}</table></div><p style="color:#aaa;font-size:11px;text-align:center;margin-top:16px">Sistema de Reparto · Emma Soluciones Digitales</p></div>`;
      await window.enviarEmailBrevoRM({ to: lic.email, toName: negocio, subject: `📋 Cierre ${dia} ${fecha} · ${fmtPesos(ef+tr+fi)} · En mano ${fmtPesos(mano)}`, htmlContent });
      return true;
    } catch(e) { console.error("enviarDiario:", e); return false; }
  };
  const enviarSemanal = async (fecha) => {
    const lic = getLic();
    if(!lic.email || !window.enviarEmailBrevoRM) return false;
    try {
      const d = new Date(fecha+"T12:00:00");
      const lunesPasado = new Date(d); lunesPasado.setDate(d.getDate()-6);
      const desde = lunesPasado.toISOString().slice(0,10);
      const ventasSem = (ventas||[]).filter(v=>v.fechaKey>=desde&&v.fechaKey<=fecha&&!v._esCobro&&!v._esAjuste);
      const totalSem = ventasSem.reduce((a,v)=>a+(v.neto||0),0);
      const htmlContent = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
          <h2 style="color:#7b3fc9">📊 Resumen semanal</h2>
          <p style="color:#666;font-size:13px">${desde} al ${fecha}</p>
          <div style="background:#f5f0ff;border-radius:10px;padding:16px;margin:16px 0">
            <div style="font-size:28px;font-weight:700;color:#7b3fc9">${fmtPesos(totalSem)}</div>
            <div style="color:#666;font-size:13px">${ventasSem.length} entregas en la semana</div>
          </div>
          <p style="color:#999;font-size:11px;text-align:center">Sistema de Reparto · Emma Soluciones Digitales</p>
        </div>`;
      await window.enviarEmailBrevoRM({
        to: lic.email, toName: lic.negocio||lic.nombre||"",
        subject: `📊 Resumen semanal · ${fmtPesos(totalSem)}`,
        htmlContent
      });
      return true;
    } catch(e) { console.error("enviarSemanal:", e); return false; }
  };

  const enviarMensual = async (mes, anio) => {
    const lic = getLic();
    if(!lic.email || !window.enviarEmailBrevoRM) return false;
    try {
      const prefijo = `${anio}-${String(mes).padStart(2,"0")}`;
      const ventasMes = (ventas||[]).filter(v=>(v.fechaKey||"").startsWith(prefijo)&&!v._esCobro&&!v._esAjuste);
      const totalMes = ventasMes.reduce((a,v)=>a+(v.neto||0),0);
      const meses = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      const htmlContent = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
          <h2 style="color:#1a7a5e">📅 Resumen mensual · ${meses[mes]} ${anio}</h2>
          <div style="background:#f0fff8;border-radius:10px;padding:16px;margin:16px 0">
            <div style="font-size:28px;font-weight:700;color:#1a7a5e">${fmtPesos(totalMes)}</div>
            <div style="color:#666;font-size:13px">${ventasMes.length} entregas en el mes</div>
          </div>
          <p style="color:#999;font-size:11px;text-align:center">Sistema de Reparto · Emma Soluciones Digitales</p>
        </div>`;
      await window.enviarEmailBrevoRM({
        to: lic.email, toName: lic.negocio||lic.nombre||"",
        subject: `📅 Resumen ${meses[mes]} ${anio} · ${fmtPesos(totalMes)}`,
        htmlContent
      });
      return true;
    } catch(e) { console.error("enviarMensual:", e); return false; }
  };

  return { enviarDiario, enviarSemanal, enviarMensual };
}
