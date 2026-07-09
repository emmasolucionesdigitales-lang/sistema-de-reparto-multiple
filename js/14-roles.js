// ════════════════════════════════════════════════════════════════════
// ◆  13-roles.js — OnboardingRoles · AppRepartidor · Login · RepartidoresPanel
// ════════════════════════════════════════════════════════════════════

function OnboardingRoles({uid, email, onListo}) {
  const [modo, setModo]       = React.useState("");
  const [nombre, setNombre]   = React.useState("");
  const [negocio, setNegocio] = React.useState("");
  const [codigo,  setCodigo]  = React.useState("");
  const [error,   setError]   = React.useState("");
  const [cargando,setCargando]= React.useState(false);

  const crearCuentaDueño = async () => {
    if(!nombre.trim()||!negocio.trim()){setError("Completá todos los campos");return;}
    setCargando(true); setError("");
    try {
      const negocioId = await crearNegocio(uid, negocio.trim());
      const p = {rol:"dueño", negocioId, nombre:nombre.trim(), email, negocioNombre:negocio.trim()};
      await saveUserProfile(uid, p);
      onListo(p);
    } catch(e){ setError("Error: "+e.message); setCargando(false); }
  };

  const unirseConCodigo = async () => {
    if(!codigo.trim()){setError("Ingresá el código");return;}
    setCargando(true); setError("");
    const res = await canjearInvitacion(uid, email, codigo.trim().toUpperCase());
    if(!res.ok){ setError(res.msg); setCargando(false); return; }
    const p = {rol:"repartidor", negocioId:res.negocioId, nombre:res.nombre, sectores:res.sectores||[], email};
    onListo(p);
  };

  if(modo==="") return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--color-background-primary)",padding:24,gap:14}}>
      <div style={{fontSize:40}}>💧</div>
      <div style={{fontSize:20,fontWeight:600,color:"var(--color-text-primary)"}}>Sistema de Reparto</div>
      <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8,textAlign:"center"}}>¿Cómo vas a usar la app?</div>
      <button style={{...s.btnPrimary,width:"100%",maxWidth:320,padding:16,fontSize:15,borderRadius:12}} onClick={()=>setModo("dueño")}>
        👤 Soy dueño — crear mi negocio
      </button>
      <button style={{...s.btn,width:"100%",maxWidth:320,padding:16,fontSize:15,borderRadius:12}} onClick={()=>setModo("repartidor")}>
        🚐 Soy repartidor — tengo un código
      </button>
    </div>
  );

  if(modo==="dueño") return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--color-background-primary)",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <button style={{...s.btn,marginBottom:16,fontSize:13}} onClick={()=>setModo("")}>← Volver</button>
        <div style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)",marginBottom:20}}>👤 Crear mi negocio</div>
        <label style={s.label}>Tu nombre</label>
        <input style={{...s.input,marginBottom:12}} placeholder="Ej: Carlos" value={nombre} onChange={e=>setNombre(e.target.value)} />
        <label style={s.label}>Nombre del negocio</label>
        <input style={{...s.input,marginBottom:20}} placeholder="Ej: Distribuidora El Sol" value={negocio} onChange={e=>setNegocio(e.target.value)} />
        {error&&<div style={{color:"var(--color-text-danger)",fontSize:13,marginBottom:12}}>{error}</div>}
        <button style={{...s.btnPrimary,width:"100%",padding:14,fontSize:15}} onClick={crearCuentaDueño} disabled={cargando}>
          {cargando?"Creando...":"Crear negocio"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--color-background-primary)",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <button style={{...s.btn,marginBottom:16,fontSize:13}} onClick={()=>setModo("")}>← Volver</button>
        <div style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)",marginBottom:8}}>🚐 Unirme como repartidor</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:20}}>El dueño te tiene que dar un código de 6 letras.</div>
        <label style={s.label}>Código de invitación</label>
        <input style={{...s.input,marginBottom:20,textTransform:"uppercase",letterSpacing:"0.15em",fontSize:18,textAlign:"center"}} placeholder="XXXXXX" maxLength={6} value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} />
        {error&&<div style={{color:"var(--color-text-danger)",fontSize:13,marginBottom:12}}>{error}</div>}
        <button style={{...s.btnPrimary,width:"100%",padding:14,fontSize:15}} onClick={unirseConCodigo} disabled={cargando}>
          {cargando?"Verificando...":"Unirme al negocio"}
        </button>
      </div>
    </div>
  );
}


// ── AppRepartidor ──────────────────────────────────────────────

// ── PIN local del repartidor (lo crea él mismo la 1ª vez) ──────────
function _repPinLeer(){ try { return JSON.parse(localStorage.getItem("rm_rep_pin")||"null"); } catch { return null; } }
function _repPinGuardar(pin, codigo){ try { localStorage.setItem("rm_rep_pin", JSON.stringify({pin:String(pin), codigo:codigo||""})); } catch(e){} }
function _repPinBorrar(){ try { localStorage.removeItem("rm_rep_pin"); } catch(e){} }

// ── Candado del repartidor: PIN propio + huella (reusa 05-licencias.js) ──
//    Salida de emergencia: "¿Olvidaste tu PIN?" → poné tu código de repartidor
//    para crear uno nuevo. Así nadie queda trabado afuera.
function GateRepartidor({perfil, onOk, onSalir}) {
  const codActual = (perfil && perfil.codigo) ? String(perfil.codigo) : "";
  const guardado  = _repPinLeer();
  const tienePin  = !!(guardado && guardado.pin && (!guardado.codigo || !codActual || guardado.codigo===codActual));
  const puedeBio  = (typeof bioSoportado==="function") ? bioSoportado() : false;
  const bioOn     = (typeof bioEnrolado==="function") ? bioEnrolado() : false;
  const pinReal   = guardado ? guardado.pin : null;

  const [fase, setFase]       = React.useState(tienePin ? (puedeBio && bioOn ? "bio" : "pin") : "crear");
  const [valor, setValor]     = React.useState("");   // tecleo actual
  const [pinTmp, setPinTmp]   = React.useState("");   // pin nuevo entre crear→confirmar
  const [error, setError]     = React.useState("");
  const [msg, setMsg]         = React.useState("");
  const [intentos, setIntentos] = React.useState(0);
  const [olvido, setOlvido]   = React.useState(false);
  const [codReset, setCodReset] = React.useState("");

  // Intento automático de huella al abrir
  React.useEffect(()=>{
    if(fase==="bio"){
      srBioVerificar().then(ok=>{ if(ok) onOk(); else setFase("pin"); })
        .catch(()=>{ setMsg("Usá tu PIN para entrar."); setFase("pin"); });
    }
  },[]);

  const completar = (v) => {
    if(fase==="crear"){ setPinTmp(v); setValor(""); setError(""); setFase("confirmar"); return; }
    if(fase==="confirmar"){
      if(v===pinTmp){
        _repPinGuardar(pinTmp, codActual);
        setValor("");
        if(puedeBio && !bioOn && !(typeof bioRechazado==="function" && bioRechazado())) setFase("ofrecerBio");
        else onOk();
      } else { setError("Los PIN no coinciden. Empezá de nuevo."); setPinTmp(""); setValor(""); setFase("crear"); }
      return;
    }
    if(fase==="pin"){
      if(v===String(pinReal)){ onOk(); }
      else { const n=intentos+1; setIntentos(n); setValor("");
        setError("PIN incorrecto" + (n>=3 ? " — si no te acordás, tocá \"¿Olvidaste tu PIN?\"" : "")); }
      return;
    }
  };

  const tecla = (t) => {
    setError("");
    if(t==="") return;
    if(t==="⌫"){ setValor(v=>v.slice(0,-1)); return; }
    const nv = (valor + String(t)).slice(0,4);
    setValor(nv);
    if(nv.length===4) setTimeout(()=>completar(nv), 110);
  };

  const resetConCodigo = () => {
    const c = codReset.trim().toUpperCase();
    if(codActual && c===codActual.toUpperCase()){
      _repPinBorrar(); setOlvido(false); setCodReset(""); setError(""); setMsg("");
      setValor(""); setPinTmp(""); setIntentos(0); setFase("crear");
    } else { setError("Ese código no coincide. Pedíselo al dueño."); }
  };

  const Teclado = (
    <>
      <div style={{display:"flex",gap:16,marginBottom:6}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{width:18,height:18,borderRadius:"50%",background:valor.length>i?"#185FA5":"transparent",border:"2px solid var(--color-border-secondary)"}} />))}
      </div>
      {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center",maxWidth:270,lineHeight:1.4}}>{error}</p>}
      {msg&&<p style={{fontSize:13,color:"#f5b942",textAlign:"center"}}>{msg}</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,72px)",gap:10}}>
        {[1,2,3,4,5,6,7,8,9,"","0","⌫"].map((t,i)=>(
          t===""? <div key={i}/> :
          <button key={i} onClick={()=>tecla(t)} style={{height:60,borderRadius:14,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-tertiary)",color:"var(--color-text-primary)",fontSize:22,fontWeight:500,cursor:"pointer"}}>{t}</button>
        ))}
      </div>
    </>
  );

  const shell = (contenido) => (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,minHeight:"100vh",gap:18}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>💧</div>
      <h1 style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)",textAlign:"center"}}>Reparto{perfil&&perfil.nombre?` · ${perfil.nombre}`:""}</h1>
      {contenido}
    </div>
  );

  if(fase==="bio") return shell(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <div style={{fontSize:52}}>👆</div>
      <p style={{fontSize:15,color:"var(--color-text-secondary)",textAlign:"center"}}>Verificando huella...</p>
      <button style={{background:"none",border:"none",color:"var(--color-text-tertiary)",fontSize:13,cursor:"pointer"}} onClick={()=>setFase("pin")}>Usar PIN</button>
    </div>
  );

  if(fase==="ofrecerBio") return shell(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,maxWidth:280}}>
      <div style={{fontSize:46}}>👆</div>
      <p style={{fontSize:16,color:"var(--color-text-primary)",textAlign:"center",margin:0,fontWeight:600}}>¿Entrar con tu huella la próxima vez?</p>
      <p style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"center",margin:0,lineHeight:1.5}}>Tu PIN sigue funcionando por si lo necesitás.</p>
      <button style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:10,padding:"12px 20px",fontSize:15,fontWeight:600,cursor:"pointer",width:210}}
        onClick={async ()=>{ try { await srBioRegistrar(); } catch(e){} onOk(); }}>Activar huella</button>
      <button style={{background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:13,cursor:"pointer"}}
        onClick={()=>{ try{localStorage.setItem("sr_bio_no","1");}catch(e){} onOk(); }}>Ahora no</button>
    </div>
  );

  if(fase==="crear" || fase==="confirmar") return shell(
    <>
      <p style={{fontSize:14,color:"var(--color-text-secondary)",textAlign:"center",maxWidth:280,lineHeight:1.5}}>
        {fase==="crear" ? "Creá un PIN de 4 números para proteger la app. Lo vas a usar para entrar." : "Repetí el PIN para confirmar."}
      </p>
      {Teclado}
    </>
  );

  // fase === "pin"
  return shell(
    olvido ? (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,maxWidth:300,width:"100%"}}>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.5}}>
          Ingresá tu <b>código de repartidor</b> (el de 6 letras que te dio el dueño) para crear un PIN nuevo.
        </p>
        <input value={codReset} onChange={e=>{setCodReset(e.target.value);setError("");}} placeholder="Código (6 letras)" maxLength={6}
          style={{...s.input,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.15em",fontSize:18}} />
        {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center"}}>{error}</p>}
        <button style={{...s.btnPrimary,width:"100%"}} onClick={resetConCodigo}>Crear PIN nuevo</button>
        <button style={{background:"none",border:"none",color:"var(--color-text-tertiary)",fontSize:13,cursor:"pointer"}} onClick={()=>{setOlvido(false);setError("");setCodReset("");}}>Volver al PIN</button>
        <button style={{background:"none",border:"none",color:"var(--color-text-danger)",fontSize:12,cursor:"pointer",marginTop:4}}
          onClick={()=>{ if(window.confirm("¿Cerrar sesión? Vas a tener que ingresar de nuevo con tu código.")) onSalir(); }}>Cerrar sesión y volver a ingresar</button>
      </div>
    ) : (
      <>
        <p style={{fontSize:14,color:"var(--color-text-secondary)"}}>Ingresá tu PIN</p>
        {Teclado}
        {puedeBio && bioOn && <button style={{background:"none",border:"none",color:"var(--color-text-tertiary)",fontSize:13,cursor:"pointer",marginTop:6}} onClick={()=>setFase("bio")}>👆 Usar huella</button>}
        <button style={{background:"none",border:"none",color:"var(--color-text-info)",fontSize:13,cursor:"pointer",marginTop:2}} onClick={()=>{setOlvido(true);setError("");}}>¿Olvidaste tu PIN?</button>
      </>
    )
  );
}

function AppRepartidorWrapper({uid, perfil, onSalir}) {
  // Aplicar tema guardado (igual que el dueño)
  React.useEffect(()=>{ try { aplicarTema(getTemaActual()); } catch{} },[]);
  const [desbloqueado, setDesbloqueado] = React.useState(false);
  if(!desbloqueado) return <GateRepartidor perfil={perfil} onSalir={onSalir} onOk={()=>setDesbloqueado(true)} />;
  return <AppRepartidor uid={uid} perfil={perfil} onSalir={onSalir} />;
}

function AppRepartidor({uid, perfil, onSalir: onSalirProp}) {
  // ── Calcular el día de HOY como valor inicial ────────────────────────
  const _diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const diaDeHoy = _diasSemana[new Date().getDay()];

  // ── Estado del repartidor ───────────────────────────────────────────
  const [pantalla,   setPantalla]   = React.useState("inicio");
  // diaActual ahora es editable — el repartidor puede elegir otro día
  // además del de hoy (para adelantar reparto o ponerse al día con uno
  // que quedó pendiente), no solo el dueño desde "Operar".
  const [diaActual, setDiaActual]   = React.useState(diaDeHoy);
  const [fechaActual,setFechaActual]= React.useState(()=>new Date().toLocaleDateString("en-CA"));
  const [clienteId,  setClienteId]  = React.useState(null);
  const [ventaLibreFecha,setVentaLibreFecha] = React.useState(()=>new Date().toLocaleDateString("en-CA"));
  const [diaClienteActual, setDiaClienteActual] = React.useState(diaDeHoy);
  const [origenDetalle, setOrigenDetalle] = React.useState("clientes");
  const [datos,      setDatos]      = React.useState(null);
  const [diaTemporal, setDiaTemporal] = React.useState(null); // día elegido en "elegirDia", pendiente de fecha
  const [scaleIdx, setScaleIdx] = useLS("rm_scale_v1", 1); // 0=S 1=M 2=L 3=XL
  const SCALES = [0.82, 1.0, 1.18, 1.36];
  const SCALE_LABELS = ["S","M","L","XL"];
  // Guards anti doble-tap: evitan sumar/restar el saldo dos veces si el
  // cartel de confirmación tarda en desaparecer y se vuelve a tocar el botón.
  const ultimoRegistroRef = React.useRef({firma:null, ts:0});
  const ultimoBorradoRef = React.useRef({id:null, ts:0});

  const diaHoy = () => diaActual; // mantener compatibilidad

  React.useEffect(()=>{
    cloudLoad(uid, perfil.negocioId).then(function(d){
      setDatos(d||{clientes:[],ventas:[],productos:[],planillas:{},stock:{},noVisitas:[],prospectos:[],recordatorios:[],repartos:[]});
    });
  },[]);

  if(!datos) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)"}}>⏳ Cargando...</div>;

  // Leer repartos desde Firestore (datos descargados), con fallback a localStorage
  const todosRepartos = datos.repartos && datos.repartos.length > 0
    ? datos.repartos
    : (() => { try{return JSON.parse(localStorage.getItem("rm_repartos_v1")||"[]");}catch{return [];} })();
  const miReparto = todosRepartos.find(r=>r.codigo===perfil?.codigo) || null;

  const todosClientes = datos.clientes || [];
  const ventas        = datos.ventas   || [];
  const productos     = datos.productos|| [];
  const noVisitas     = datos.noVisitas|| [];
  const planillas     = datos.planillas|| {};

  // Sectores del repartidor (barrios asignados)
  const sectores = perfil.sectores || [];

  // Clientes de este repartidor del día de HOY
  const clientes = todosClientes.filter(c => {
    if(c.dia !== diaActual) return false;
    // Si hay reparto asignado, filtrar por repartoId
    if(miReparto && c.repartoId && c.repartoId !== miReparto.id) return false;
    // Si hay sectores asignados, filtrar por barrio
    if(sectores.length > 0 && !sectores.some(s => (c.barrio||"").toLowerCase().includes(s.toLowerCase()))) return false;
    return true;
  }).sort((a,b)=>(a.orden||9999)-(b.orden||9999));

  // Prospectos asignados a este repartidor
  const prospectos = (datos.prospectos||[]).filter(p=>
    !p.repartoId || !miReparto || p.repartoId === miReparto.id
  );

  const cliente = todosClientes.find(c=>c.id===clienteId)||null;

  const sync = (overrides={}) => {
    setDatos(prevDatos => {
      const localBase = { ...prevDatos, ...overrides };
      // En el fondo: mergear con Firebase y guardar (no bloquea la UI).
      // OJO: acá vivían dos bugs graves —
      // 1) "eliminarVenta" nunca se propagaba a la nube: el merge de ventas
      //    solo sabía agregar/actualizar por id, nunca sacar una que ya no
      //    estaba en la lista local → una venta borrada podía "revivir".
      // 2) clientes/planillas/noVisitas se pisaban SIEMPRE con la copia
      //    local (que en este repartidor se descarga UNA sola vez al abrir
      //    la app y nunca se refresca) → cualquier cambio hecho por el
      //    dueño u otro repartidor mientras tanto se perdía en cada guardado.
      cloudLoad(uid, perfil.negocioId).then(function(fresh){
        if(!fresh){ cloudSave(localBase, uid, perfil.negocioId); return; }

        // ── Ventas: merge por id que SÍ respeta los borrados ──────────────
        const ventasLocalesPost = overrides.ventas !== undefined ? overrides.ventas : (prevDatos.ventas || []);
        const ventasLocalesPre  = prevDatos.ventas || [];
        const idsLocalesPost = new Set(ventasLocalesPost.map(v=>v.id));
        const idsBorradosLocal = new Set(ventasLocalesPre.filter(v=>!idsLocalesPost.has(v.id)).map(v=>v.id));
        const porIdVenta = {};
        (fresh.ventas||[]).forEach(v=>{ if(!idsBorradosLocal.has(v.id)) porIdVenta[v.id]=v; }); // no revivir lo borrado acá
        ventasLocalesPost.forEach(v=>{ porIdVenta[v.id]=v; }); // altas/ediciones locales, siempre presentes
        const ventasFinal = Object.values(porIdVenta);

        // ── Clientes: merge por id + _upd (no pisar cambios ajenos más nuevos) ──
        const clientesLocales = overrides.clientes !== undefined ? overrides.clientes : (prevDatos.clientes || []);
        const porIdCliente = {}; (fresh.clientes||[]).forEach(c=>{ porIdCliente[c.id]=c; });
        clientesLocales.forEach(c=>{
          const enNube = porIdCliente[c.id];
          if(!enNube){ porIdCliente[c.id]=c; return; }
          const uL = Number(c._upd)||0, uN = Number(enNube._upd)||0;
          if(uL >= uN) porIdCliente[c.id]=c; // empate o local más nuevo → gana local (recién tocado acá)
        });
        const clientesFinal = Object.values(porIdCliente);

        cloudSave({...fresh, ...localBase, ventas:ventasFinal, clientes:clientesFinal}, uid, perfil.negocioId);
      }).catch(function(){ cloudSave(localBase, uid, perfil.negocioId); });
      return localBase;
    });
  };
  const saveVentas   = (nv) => sync({ventas:nv});
  const saveClientes = (nc) => sync({clientes:nc});
  const saveNoVisitas= (nv) => sync({noVisitas:nv});
  const savePlanilla = (key,val) => sync({planillas:{...(datos.planillas||{}),[key]:val}});

  const irA = (p) => { setPantalla(p); window.scrollTo(0,0); };

  const registrarVenta = (detalle, pago, montoPagado, saldoAplicado, envPrest, envDev, obs, opcionSaldo, mt2, sdOverride, transConfirmadaInicial) => {
    const c = cliente;
    // Guard anti doble-tap: ignora una llamada idéntica al mismo cliente
    // dentro de 1.5s (botón sin lock + toque duplicado en el celular)
    const firmaReg = JSON.stringify({cid:c.id, detalle, pago, montoPagado, opcionSaldo});
    const ahoraReg = Date.now();
    if(ultimoRegistroRef.current.firma===firmaReg && (ahoraReg-ultimoRegistroRef.current.ts)<1500){
      console.warn("⚠️ Venta duplicada bloqueada (doble tap):", c.nombre);
      return;
    }
    ultimoRegistroRef.current = {firma:firmaReg, ts:ahoraReg};
    const esMixto = opcionSaldo==="mixto_ef" || opcionSaldo==="mixto_tr";
    const pagoReal = esMixto?"mixto":pago;
    const ef = esMixto?(opcionSaldo==="mixto_ef"?Number(montoPagado):Number(mt2||0)):0;
    const tr = esMixto?(opcionSaldo==="mixto_ef"?Number(mt2||0):Number(montoPagado)):0;
    const totalMixto = esMixto ? ef+tr : 0;
    const montoFinalCalc = esMixto ? String(totalMixto) : montoPagado;
    const obsExtra = esMixto&&totalMixto>0?` [Mixto: ef $${ef} + tr $${tr}]`:"";
    const calc = calcVenta(detalle, pagoReal, montoFinalCalc, saldoAplicado, productos);
    const saldoDelta = esMixto && sdOverride!==undefined ? sdOverride : calc.saldoDelta;
    const nv = [...ventas, {
      id:Date.now(), clienteId:c.id, cliente:c.nombre, dia:diaClienteActual||c.dia, fechaKey:fechaActual,
      fecha:new Date().toLocaleString("es-AR"), detalle, pago:pagoReal, obs:(obs||"")+obsExtra,
      saldoAplicado:saldoAplicado||0, envPrest:(envPrest||[]).filter(e=>e.prod&&e.cant),
      envDev:(envDev||[]).filter(e=>e.prod&&e.cant), mt2:mt2||0, ...calc, saldoDelta,
      montoTrans:esMixto?tr:(mt2||0), montoEfec:esMixto?ef:0,
      transConfirmada: !!transConfirmadaInicial, _upd:Date.now(),
      repartidor:perfil.nombre
    }];
    const clientesActualizados = todosClientes.map(x=>x.id===c.id?{...x,saldo:(x.saldo||0)+saldoDelta,_upd:Date.now()}:x);
    sync({ventas:nv, clientes:clientesActualizados});
  };

  const registrarVentaLibre = (detalle,pago,montoPagado,saldoAplicado,envPrest,envDev,obs,op,mt2,sd,fechaKl) => {
    const c = cliente;
    const calc = calcVenta(detalle, pago, montoPagado, saldoAplicado, productos);
    const nVenta = {id:Date.now(), clienteId:c.id, cliente:c.nombre, dia:c.dia, fechaKey:fechaKl,
      fecha:new Date(fechaKl+"T12:00:00").toLocaleString("es-AR"), detalle, pago, obs:obs||"",
      saldoAplicado:saldoAplicado||0, envPrest:(envPrest||[]).filter(e=>e.prod&&e.cant),
      envDev:(envDev||[]).filter(e=>e.prod&&e.cant), ...calc, _upd:Date.now(), repartidor:perfil.nombre};
    const clientesActualizados = todosClientes.map(x=>x.id===c.id?{...x,saldo:(x.saldo||0)+calc.saldoDelta,_upd:Date.now()}:x);
    sync({ventas:[...ventas, nVenta], clientes:clientesActualizados});
  };

  const eliminarVenta = (ventaId) => {
    // Guard anti doble-tap: ignora un segundo borrado del MISMO id dentro
    // de 2s (el cartel de confirmación puede tardar en cerrarse).
    const ahoraDel = Date.now();
    if(ultimoBorradoRef.current.id===ventaId && (ahoraDel-ultimoBorradoRef.current.ts)<2000){
      console.warn("⚠️ Borrado duplicado bloqueado (doble tap):", ventaId);
      return;
    }
    ultimoBorradoRef.current = {id:ventaId, ts:ahoraDel};
    const v=ventas.find(x=>x.id===ventaId); if(!v) return;
    const c2=clientes.find(x=>x.id===v.clienteId);
    const nuevasVentas = ventas.filter(x=>x.id!==ventaId);
    const clientesActualizados = c2 ? clientes.map(x=>x.id===c2.id?{...x,saldo:(x.saldo||0)-v.saldoDelta,_upd:Date.now()}:x) : clientes;
    sync({ventas:nuevasVentas, clientes:clientesActualizados});
  };

  const irAlSiguiente = () => {
    const visitadosIds = new Set([
      ...ventasHoy.map(v=>v.clienteId),
      ...noVisHoy.map(v=>v.clienteId)
    ]);
    visitadosIds.add(clienteId);
    // Buscar siguiente cliente del día
    const sigCliente = clientes.find(cc=>!visitadosIds.has(cc.id));
    if(sigCliente){
      setClienteId(sigCliente.id);
      setDiaClienteActual(sigCliente.dia||diaActual);
      setOrigenDetalle("clientes");
      irA("venta");
      return;
    }
    // Si no hay más clientes, pasar a prospectos
    const visitadosProsp = new Set(ventasHoy.filter(v=>v._esProspecto).map(v=>v.clienteId));
    const sigProspecto = prospectos.find(p=>p.dia===diaActual&&p.estado==="activo"&&!visitadosProsp.has(p.id));
    if(sigProspecto){
      setClienteId(sigProspecto.id);
      setOrigenDetalle("prospectos");
      irA("clientes"); // volver a lista para que el usuario elija el prospecto
      return;
    }
    // Terminó todo — ir a planilla del día
    irA("planilla");
  };

  const ventasHoy = ventas.filter(v=>v.fechaKey===fechaActual);
  const noVisHoy  = noVisitas.filter(v=>v.fecha===fechaActual);

  return (
    <>
    <div style={{position:"fixed",top:10,right:14,zIndex:9999,display:"flex",gap:6}}>
      <button onClick={()=>setScaleIdx(i=>(i+1)%4)} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Tamaño de texto">{SCALE_LABELS[scaleIdx]}</button>
    </div>
    <div style={{...s.app, zoom: SCALES[scaleIdx]}}>
      {pantalla==="inicio"&&(
        <InicioRepartidor
          perfil={perfil}
          diaActual={diaActual}
          fechaActual={fechaActual}
          setFechaActual={setFechaActual}
          repartoId={miReparto?.id}
          clientes={clientes}
          ventas={ventas}
          noVisitas={noVisitas}
          planillas={planillas}
          savePlanilla={(key,p)=>sync({planillas:{...planillas,[key]:p}})}
          productos={productos}
          recordatorios={datos.recordatorios||[]}
          scaleIdx={scaleIdx}
          onToggleScale={()=>setScaleIdx(i=>(i+1)%4)}
          scaleLabel={SCALE_LABELS[scaleIdx]}
          onSaveRecordatorio={(r)=>{
            const lista=[...(datos.recordatorios||[]),r];
            sync({recordatorios:lista});
          }}
          onConfirmarRecordatorio={(id)=>{
            const lista=(datos.recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r);
            sync({recordatorios:lista});
          }}
          onIrCliente={(cId)=>{setClienteId(cId);setDiaClienteActual(clientes.find(c=>c.id===cId)?.dia||diaActual);irA("venta");}}
          onIrCarga={()=>irA("cargaDia")}
          onIrClientes={()=>irA("clientes")}
          onIrPlanilla={()=>irA("planilla")}
          onIrTodosClientes={()=>irA("todosClientes")}
          onIrAgenda={()=>irA("agendaRep")}
          onIrTransfers={()=>irA("confirmTransferRep")}
          onCambiarDia={()=>irA("elegirDia")}
          onSalir={onSalirProp||(()=>window.auth.signOut())}
          onEnviarInforme={async ()=>{
            if(typeof usarInformes!=="function"){ alert("Función de informe no disponible."); return; }
            try {
              // Buscar email del dueño desde Firestore
              let emailDueno = "";
              if(window.db && perfil.negocioId) {
                const negSnap = await window.db.collection("negocios").doc(perfil.negocioId).get();
                if(negSnap.exists) emailDueno = negSnap.data().ownerEmail || negSnap.data().email || "";
                // Si no está en negocios, buscar en licencias
                if(!emailDueno) {
                  const licSnap = await window.dbLicencias.collection("licencias")
                    .where("negocioId","==",perfil.negocioId).limit(1).get();
                  if(!licSnap.empty) emailDueno = licSnap.docs[0].data().email || "";
                }
              }
              if(!emailDueno){ alert("No se encontró el email del dueño. Contactá al soporte."); return; }
              // Guardar email temporalmente en rm_licencia para que usarInformes lo encuentre
              const licTemp = {email:emailDueno, negocio:perfil.nombre||"Reparto"};
              const prevLic = localStorage.getItem("rm_licencia");
              localStorage.setItem("rm_licencia", JSON.stringify(licTemp));
              const inf = usarInformes({ventas,clientes,planillas,noVisitas,productos,repartoId:miReparto?.id});
              const ok = await inf.enviarDiario(fechaActual, diaActual);
              // Restaurar licencia original
              if(prevLic) localStorage.setItem("rm_licencia", prevLic);
              else localStorage.removeItem("rm_licencia");
              if(ok) alert("\u2705 Informe enviado al dueño (" + emailDueno + ") correctamente.");
              else   alert("\u26A0\uFE0F Error al enviar. Verificá la conexión.");
            } catch(e) {
              alert("Error: " + e.message);
            }
          }}
        />
      )}
      {pantalla==="elegirDia"&&(
        <div style={s.screen}>
          <HeaderApp titulo="Elegir día de reparto" onVolver={()=>irA("inicio")}/>
          <div style={{padding:"10px 14px"}}>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>
              Por defecto ves el día de hoy ({diaDeHoy}). Elegí otro día si necesitás adelantar un reparto o ponerte al día con uno pendiente.
            </p>
            {DIAS.map(d=>(
              <button key={d} style={{...s.card,width:"100%",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:d===diaActual?"var(--color-background-info)":"var(--color-background-secondary)"}}
                onClick={()=>{setDiaTemporal(d);irA("elegirFecha");}}>
                <span style={{fontSize:15,fontWeight:500,color:d===diaActual?"var(--color-text-info)":"var(--color-text-primary)"}}>{d}{d===diaDeHoy?" · hoy":""}</span>
                <span style={{color:"var(--color-text-tertiary)"}}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {pantalla==="elegirFecha"&&diaTemporal&&(
        <SelectorFecha
          dia={diaTemporal}
          repartoId={miReparto?.id}
          planillas={planillas}
          ventas={ventas.filter(v=>{const cl=todosClientes.find(c=>c.id===v.clienteId);return !miReparto||cl?.repartoId===miReparto.id;})}
          noVisitas={(noVisitas||[]).filter(v=>{const cl=todosClientes.find(c=>c.id===v.clienteId);return !miReparto||cl?.repartoId===miReparto.id;})}
          onSeleccionar={(fk,fo)=>{
            setDiaActual(diaTemporal);
            setDiaClienteActual(diaTemporal);
            setFechaActual(fk);
            setDiaTemporal(null);
            irA("inicio");
          }}
          onVolver={()=>irA("elegirDia")}
        />
      )}
      {pantalla==="cargaDia"&&(
        <InicioReparto
          dia={diaActual} fecha={fechaActual}
          planilla={planillas[claveDiaReparto(diaActual,fechaActual,miReparto?.id)]||planillaDiaVacia()}
          productos={productos}
          cargasDia={(datos.cargasDia&&miReparto&&datos.cargasDia[miReparto.id])||CARGA_DIA_DEFAULT}
          stock={datos.stock||{}}
          onGuardar={(p,descontar)=>{
            savePlanilla(claveDiaReparto(diaActual,fechaActual,miReparto?.id),p);
            if(descontar && miReparto){
              const s=JSON.parse(JSON.stringify(datos.stock||{soderia:{},soderia_vacios:{},casa:{},camiones:{}}));
              if(!s.soderia) s.soderia={sifon:0,bidon10:0,bidon20:0};
              if(!s.camiones) s.camiones={};
              if(!s.camiones[miReparto.id]) s.camiones[miReparto.id]={sifon:0,bidon10:0,bidon20:0,dispenser:0};
              const soda=Number(p.productos?.soda?.llenos||0);
              const b10=Number(p.productos?.b10?.llenos||0);
              const b20=Number(p.productos?.b20?.llenos||0);
              s.soderia.sifon  =Math.max(0,(s.soderia.sifon||0)-soda);
              s.soderia.bidon10=Math.max(0,(s.soderia.bidon10||0)-b10);
              s.soderia.bidon20=Math.max(0,(s.soderia.bidon20||0)-b20);
              s.camiones[miReparto.id].sifon  =(s.camiones[miReparto.id].sifon||0)+soda;
              s.camiones[miReparto.id].bidon10=(s.camiones[miReparto.id].bidon10||0)+b10;
              s.camiones[miReparto.id].bidon20=(s.camiones[miReparto.id].bidon20||0)+b20;
              sync({stock:s});
            }
            irA("clientes");
          }}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="clientes"&&(
        <ListaClientes
          clientes={clientes}
          dia={diaActual} fecha={fechaActual} ventas={ventasHoy} todasVentas={ventas} noVisitas={noVisHoy}
          onSeleccionar={c=>{setClienteId(c.id);setDiaClienteActual(c.dia||diaActual);setOrigenDetalle("clientes");irA("detalleCliente");}}
          onEntregar={c=>{setClienteId(c.id);setDiaClienteActual(c.dia||diaActual);irA("venta");}}
          onNuevoCliente={null} onVolver={()=>irA("inicio")}
          onEditarCliente={(id,cambios)=>{
            const clientesActualizados = todosClientes.map(x=>x.id===id?{...x,...cambios,_upd:Date.now()}:x);
            sync({clientes:clientesActualizados});
          }}
          onReordenar={lista=>{
            const otros = todosClientes.filter(c=>!(c.dia===diaActual && (sectores.length===0||sectores.some(s=>(c.barrio||"").toLowerCase().includes(s.toLowerCase())))));
            saveClientes([...otros,...lista]);
          }}
          onRegistrarNoVisita={(cId,motivo)=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)),{clienteId:cId,dia:diaClienteActual,fecha:fechaActual,motivo}];
            saveNoVisitas(nv);
          }}
          onQuitarNoVisita={(cId)=>saveNoVisitas(noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)))}
          onVentaProspecto={(p)=>{
            if(!todosClientes.find(c=>c.id===p.id)){
              saveClientes([...todosClientes,{...p,saldo:0,_esProspecto:true}]);
            }
            setClienteId(p.id);
            irA("venta");
          }}
          onNoEstaProspecto={(id)=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===id&&v.fecha===fechaActual)),{clienteId:id,dia:diaActual,fecha:fechaActual,motivo:"noesta"}];
            saveNoVisitas(nv);
          }}
          onNoQuiereProspecto={(id)=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===id&&v.fecha===fechaActual)),{clienteId:id,dia:diaActual,fecha:fechaActual,motivo:"noquiso"}];
            saveNoVisitas(nv);
          }}
          onConfirmarTransfer={null} prospectos={prospectos} recordatorios={[]}
        />
      )}
      {pantalla==="clientes"&&ventasHoy.length+noVisHoy.length>=clientes.length&&clientes.length>0&&(
        <div style={{padding:"0 14px 16px",display:"flex",flexDirection:"column",gap:8}}>
          <button style={{...s.btnPrimary,background:"#1a8a4a"}} onClick={()=>irA("planilla")}>
            {"\u2705 Recorrido terminado \u2014 Ir a planilla del d\u00eda"}
          </button>
        </div>
      )}
      {pantalla==="nuevoCliente"&&false&&(
        <NuevoClienteForm
          sectores={sectores}
          diaActual={diaActual}
          onGuardar={(datosNuevo)=>{
            const nuevoC = Object.assign({}, datosNuevo, {id:Date.now(), saldo:0, repartoId: miReparto ? miReparto.id : null});
            saveClientes(todosClientes.concat([nuevoC]));
            irA("clientes");
          }}
          onVolver={()=>irA("clientes")}
        />
      )}
      {pantalla==="detalleCliente"&&cliente&&(
        <DetalleCliente
          cliente={cliente} ventas={ventas.filter(v=>v.clienteId===cliente.id)}
          dia={diaActual} fecha={fechaActual} productos={productos}
          soloLectura={true}
          onVenta={()=>irA("venta")}
          onVentaLibre={null}
          onVolver={()=>irA(origenDetalle)}
          onEditar={(cambios)=>{
            const clientesActualizados = todosClientes.map(x=>x.id===cliente.id?{...x,...cambios,_upd:Date.now()}:x);
            sync({clientes:clientesActualizados});
          }} onEliminarVenta={()=>{}} onEditarVenta={()=>{}} onEliminarCliente={()=>{}}
          onNoEstaCliente={()=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===cliente.id&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId:cliente.id,dia:diaActual,fecha:fechaActual,motivo:"noesta"}];
            saveNoVisitas(nv);
          }}
          onNoQuiereCliente={()=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===cliente.id&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId:cliente.id,dia:diaActual,fecha:fechaActual,motivo:"noquiso"}];
            saveNoVisitas(nv);
          }}
          recordatorios={[]} onGuardarRecordatorio={()=>{}} onConfirmarRecordatorio={()=>{}}
          onCobrarSaldo={(monto, pago)=>{
            const cobro={id:Date.now(),clienteId:cliente.id,cliente:cliente.nombre,
              dia:diaActual,fechaKey:fechaActual,fecha:new Date().toLocaleString("es-AR"),
              detalle:[],pago:pago,neto:monto,saldoDelta:monto,_esCobro:true,_upd:Date.now(),
              repartidor:perfil.nombre};
            const clientesActualizados=todosClientes.map(x=>x.id===cliente.id?{...x,saldo:(x.saldo||0)+monto,_upd:Date.now()}:x);
            sync({ventas:[...ventas,cobro],clientes:clientesActualizados});
          }}
        />
      )}
      {pantalla==="venta"&&!cliente&&(()=>{setTimeout(()=>irA("clientes"),0);return null;})()}
      {pantalla==="venta"&&cliente&&(
        <NuevaVenta
          key={clienteId}
          cliente={cliente} productos={productos} fecha={fechaActual}
          ventasCliente={ventas.filter(v=>v.clienteId===cliente?.id)}
          onNoEsta={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noesta"}]);
            irAlSiguiente();
          }}
          onNoQuiere={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noquiso"}]);
            irAlSiguiente();
          }}
          onGuardar={(d,p,m,sa,ep,ed,obs,op,mt2,sd,tc)=>{
            registrarVenta(d,p,m,sa,ep,ed,obs,op,mt2,sd,tc);
            irAlSiguiente();
          }}
          onSaltar={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),
              {clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"salteado"}]);
            irAlSiguiente();
          }}
          progressData={(()=>{
            const visitadosIds=new Set([...ventasHoy.map(v=>v.clienteId),...noVisHoy.map(v=>v.clienteId)]);
            const montoHoy=ventasHoy.reduce((a,v)=>a+(v.neto||0),0);
            return {visitados:visitadosIds.size,total:clientes.length,montoHoy,stock:null};
          })()}
          onVolver={()=>irA("clientes")}
        />
      )}

      {pantalla==="confirmTransferRep"&&(
        <ConfirmacionesDia
          dia={diaActual}
          ventas={ventas.filter(v=>v.pago==="transferencia"||v.pago==="mixto")}
          clientes={todosClientes}
          onConfirmar={(ventaId)=>{
            const nv=(datos.ventas||[]).map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada}:v);
            sync({ventas:nv});
          }}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="todosClientes"&&(
        <TodosClientesRepartidor
          clientes={todosClientes}
          prospectos={prospectos}
          ventas={ventas}
          onSeleccionar={(c)=>{
            setClienteId(c.id);
            setDiaClienteActual(c.dia||diaActual);
            setOrigenDetalle("todosClientes");
            // Si es prospecto, agregarlo temporalmente a clientes
            if(c._esProspecto && !todosClientes.find(x=>x.id===c.id)){
              saveClientes([...todosClientes,{...c,saldo:0}]);
            }
            irA("detalleCliente");
          }}
          onNuevoCliente={null}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="agendaRep"&&(
        <AgendaRepartidor
          recordatorios={datos.recordatorios||[]}
          clientes={todosClientes}
          negocioId={perfil.negocioId}
          repartidorNombre={perfil.nombre}
          onConfirmar={async (id)=>{
            const l=(datos.recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r);
            sync({recordatorios:l});
          }}
          onEliminar={async (id)=>{
            const l=(datos.recordatorios||[]).filter(r=>r.id!==id);
            sync({recordatorios:l});
          }}
          onNuevo={async (datos2)=>{
            const c=todosClientes.find(x=>x.id===datos2.clienteId);
            const nuevo={...datos2,id:Date.now(),clienteId:c?.id||null,clienteNombre:c?.nombre||datos2.clienteNombre||"Sin cliente",dia:c?.dia||"",confirmado:false,creadoPor:perfil.nombre,creadoEn:new Date().toISOString(),paraRepartidor:perfil.nombre};
            const l=[...(datos.recordatorios||[]),nuevo];
            sync({recordatorios:l});
          }}
          onIrCliente={(cId)=>{setClienteId(cId);setDiaClienteActual(todosClientes.find(c=>c.id===cId)?.dia||diaActual);irA("venta");}}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="planilla"&&(
        <PlanillaDelDia
          dia={diaActual} fecha={fechaActual} repartoId={miReparto?.id}
          ventas={ventas.filter(v=>{const cl=todosClientes.find(c=>c.id===v.clienteId);return !miReparto||cl?.repartoId===miReparto.id;})}
          clientes={clientes}
          planilla={planillas[claveDiaReparto(diaActual,fechaActual,miReparto?.id)]||planillaDiaVacia()}
          productos={productos} stock={datos.stock||{}}
          setStock={(ns)=>sync({stock:ns})}
          syncData={(overrides)=>sync(overrides)}
          onGuardar={d=>{savePlanilla(claveDiaReparto(diaActual,fechaActual,miReparto?.id),d);irA("inicio");}}
          onVolver={()=>irA("inicio")}
          onCerrarDia={async (imgData)=>{
            try {
              // Buscar email del dueño
              let emailDueno = "";
              if(window.db && perfil.negocioId) {
                const negSnap = await window.db.collection("negocios").doc(perfil.negocioId).get();
                if(negSnap.exists) emailDueno = negSnap.data().ownerEmail||negSnap.data().email||"";
                if(!emailDueno) {
                  const licSnap = await window.dbLicencias.collection("licencias")
                    .where("negocioId","==",perfil.negocioId).limit(1).get();
                  if(!licSnap.empty) emailDueno = licSnap.docs[0].data().email||"";
                }
              }
              if(!emailDueno) { alert("No se encontró el email del dueño."); return false; }
              // Datos del informe
              const planKey = claveDiaReparto(diaActual,fechaActual,miReparto?.id);
              const plan = planillas[planKey]||{};
              const misClientesIds = new Set(clientes.map(c=>c.id));
              const ventasDia = ventas.filter(v=>v.fechaKey===fechaActual&&!v._esCobro&&!v._esAjuste&&misClientesIds.has(v.clienteId));
              // Efectivo: contado + parte efectivo de mixto (igual que planilla)
              const totalEfectivo = ventasDia.filter(v=>v.pago==="contado"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoEfec)||0):(v.pagadoNum||v.neto||0)),0);
              // Transferencias: transfer + parte transfer de mixto (igual que planilla)
              const totalTransfer = ventasDia.filter(v=>v.pago==="transferencia"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.pagadoNum||v.neto||0)),0);
              const totalFiado    = ventasDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
              const totalNeto     = totalEfectivo+totalTransfer+totalFiado;
              const retencion     = Math.round(totalTransfer*0.025);
              const transferNeto  = totalTransfer-retencion;
              const gastosExtras  = (plan.gastos||[]).filter(g=>g.monto);
              const totalGastos   = gastosExtras.reduce((a,g)=>a+Math.round(Number(g.monto)||0),0);
              const costSifon = productos.find(p=>p.nombre==="Sifón 1.5L")?.costo||133.33;
              const costB10   = productos.find(p=>p.nombre==="Bidón 10L")?.costo||800;
              const costB20   = productos.find(p=>p.nombre==="Bidón 20L")?.costo||1100;
              const CAJON=6;
              let vendSoda=0,vendB10=0,vendB20=0;
              ventasDia.forEach(v=>(v.detalle||[]).forEach(d=>{
                if(d.nombre==="Sifón 1.5L") vendSoda+=d.cantidad||0;
                if(d.nombre==="Bidón 10L")  vendB10 +=d.cantidad||0;
                if(d.nombre==="Bidón 20L")  vendB20 +=d.cantidad||0;
              }));
              const salSoda = Number(plan.productos?.soda?.llenos||0);
              const salB10  = Number(plan.productos?.b10?.llenos||0);
              const salB20  = Number(plan.productos?.b20?.llenos||0);
              const volvSoda = salSoda - vendSoda;
              const volvB10  = salB10  - vendB10;
              const volvB20  = salB20  - vendB20;
              const cajSoda  = Math.floor(vendSoda/CAJON);
              const totalCosto = cajSoda*(costSifon*CAJON) + vendB10*costB10 + vendB20*costB20;
              const plataEnMano = totalEfectivo - totalCosto - totalGastos;
              const fmtP = (n)=>"$"+Math.round(Number(n)||0).toLocaleString("es-AR");
              const fila = (l,v,color="")=>`<tr><td style="padding:7px 0;color:#555;border-bottom:1px solid #eee">${l}</td><td style="text-align:right;font-weight:600;border-bottom:1px solid #eee;color:${color||"#222"}">${v}</td></tr>`;
              const sep  = (t)=>`<tr><td colspan="2" style="padding:10px 0 4px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em">${t}</td></tr>`;
              const noVisHoyCount = (datos.noVisitas||[]).filter(v=>v.fecha===fechaActual).length;
              const htmlContent = imgData
                ? `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:16px;background:#f9fafb"><div style="background:#185FA5;border-radius:12px 12px 0 0;padding:16px 20px"><h2 style="color:#fff;margin:0;font-size:17px">📋 Reparto · ${diaActual} ${fechaActual}</h2><p style="color:#c8dcf0;margin:4px 0 0;font-size:12px">Repartidor: <b>${perfil.nombre}</b></p></div><div style="background:#fff;border-radius:0 0 12px 12px;padding:12px"><img src="${imgData}" style="width:100%;border-radius:8px;display:block;" alt="Planilla del día"/></div><p style="color:#aaa;font-size:11px;text-align:center;margin-top:12px">Sistema de Reparto · Emma Soluciones Digitales</p></div>`
                : `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f9fafb">
                  <div style="background:#185FA5;border-radius:12px 12px 0 0;padding:20px 24px">
                    <h2 style="color:#fff;margin:0;font-size:18px">📋 Informe de reparto · ${diaActual} ${fechaActual}</h2>
                    <p style="color:#c8dcf0;margin:4px 0 0;font-size:13px">Repartidor: <b>${perfil.nombre}</b></p>
                  </div>
                  <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                    <div style="background:#f0f7ff;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
                      <div style="font-size:32px;font-weight:800;color:#185FA5">${fmtP(totalNeto)}</div>
                      <div style="color:#666;font-size:13px">${ventasDia.length} entregas · ${noVisHoyCount} sin visita</div>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:14px">
                      ${sep("📦 Envases")}
                      <tr style="background:#f5f5f5"><td style="padding:5px;font-size:12px;color:#666">Producto</td><td style="padding:5px;text-align:center;font-size:12px;color:#666">Salida</td><td style="padding:5px;text-align:center;font-size:12px;color:#666">Vendidos</td><td style="padding:5px;text-align:center;font-size:12px;color:#666">Vuelve</td></tr>
                      ${salSoda>0||vendSoda>0?`<tr><td style="padding:6px 5px;border-bottom:1px solid #eee">Soda (cajones)</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${Math.floor(salSoda/CAJON)}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee;color:#185FA5;font-weight:600">${cajSoda}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${Math.floor(volvSoda/CAJON)}</td></tr>`:""}
                      ${salB10>0||vendB10>0?`<tr><td style="padding:6px 5px;border-bottom:1px solid #eee">Bidon 10L</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${salB10}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee;color:#185FA5;font-weight:600">${vendB10}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${volvB10}</td></tr>`:""}
                      ${salB20>0||vendB20>0?`<tr><td style="padding:6px 5px;border-bottom:1px solid #eee">Bidon 20L</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${salB20}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee;color:#185FA5;font-weight:600">${vendB20}</td><td style="text-align:center;padding:6px 5px;border-bottom:1px solid #eee">${volvB20}</td></tr>`:""}
                      ${sep("💵 Cobranza")}
                      ${fila("Efectivo",fmtP(totalEfectivo))}
                      ${fila("Transferencias (bruto)",fmtP(totalTransfer))}
                      ${retencion>0?fila("Retención 2.5%","−"+fmtP(retencion),"#e05c5c"):""}
                      ${fila("Transferencias (neto)",fmtP(transferNeto),"#185FA5")}
                      ${totalFiado>0?fila("Fiado",fmtP(totalFiado),"#f5a623"):""}
                      ${sep("📦 Costo de llenado")}
                      ${fila("Llenado de envases","−"+fmtP(totalCosto),"#e05c5c")}
                      ${gastosExtras.length>0?sep("💸 Gastos extras"):""}
                      ${gastosExtras.map(g=>fila((g.cat||"gasto")+( g.desc?` · ${g.desc}`:""),"−"+fmtP(g.monto),"#e05c5c")).join("")}
                      ${gastosExtras.length>0?fila("<b>Total gastos</b>","−"+fmtP(totalGastos),"#e05c5c"):""}
                      ${sep("💰 Resultado")}
                      ${fila("<b>💵 Plata en mano</b>","<b>"+fmtP(plataEnMano)+"</b>",plataEnMano>=0?"#0a7c3e":"#e05c5c")}
                      ${fila("<b>📊 Total cobrado</b>","<b>"+fmtP(totalEfectivo+transferNeto)+"</b>","#0a7c3e")}
                    </table>
                  </div>
                  <p style="color:#aaa;font-size:11px;text-align:center;margin-top:16px">Sistema de Reparto · Emma Soluciones Digitales</p>
                </div>`;
              const ok = await window.enviarEmailBrevoRM({
                to:emailDueno, toName:"Dueno",
                subject:`📋 Reparto ${diaActual} ${fechaActual} · ${perfil.nombre} · ${fmtP(totalNeto)} · En mano ${fmtP(plataEnMano)}`,
                htmlContent
              });
              if(ok) localStorage.setItem(`sr_informe_${fechaActual}_${diaActual}`,"1");
              return ok;
            } catch(e) { console.error(e); return false; }
          }}
        />
      )}
    </div>
    </>
  );
}


// ── PantallaActivacionRM ──────────────────────────────────────────────
function PantallaActivacionRM({onActivado}) {
  const [codigo, setCodigo]   = React.useState(()=>{
    try {
      const hash = window.location.hash||"";
      if(hash.includes("activar?d=")) {
        const encoded = hash.split("activar?d=")[1].split("&")[0];
        const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if(data.c){ localStorage.setItem("_activacion_d",JSON.stringify(data)); window.history.replaceState(null,"",window.location.pathname+"#activar"); return data.c; }
      }
    } catch(_) {}
    return "";
  });
  const [celular, setCelular] = React.useState("");
  const [email, setEmail]     = React.useState("");
  const [nombre, setNombre]   = React.useState("");
  const [pinIngresado, setPinIngresado] = React.useState("");
  const [terminos, setTerminos] = React.useState(false);
  const [paso, setPaso]       = React.useState(1);
  const [tipo, setTipo]       = React.useState(null); // "dueno" | "repartidor"
  const [licData, setLicData] = React.useState(null);
  const [error, setError]     = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  const getDeviceId = () => {
    let id = localStorage.getItem("sr_device_id");
    if(!id){ id="dev_"+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem("sr_device_id",id); }
    return id;
  };

  const verificarCodigo = async () => {
    const cod = codigo.trim().toUpperCase();
    if(!cod){ setError("Ingresá el código"); return; }
    setCargando(true); setError("");
    try {
      // 6 letras = código de repartidor (invitación del dueño)
      if(cod.length === 6 && !cod.includes("-")) {
        const res = await canjearInvitacion(getDeviceId(), "", cod);
        if(!res.ok){ setError(res.msg); setCargando(false); return; }
        const profile = {
          rol:"repartidor", negocioId:res.negocioId, nombre:res.nombre,
          sectores:res.sectores||[], deviceId:getDeviceId(), codigo:cod, activado:true
        };
        localStorage.setItem("rm_licencia", JSON.stringify(profile));
        onActivado(profile);
        setCargando(false); return;
      }
      // Código de dueño (ej: RM-XXXX)
      const snap = await window.dbLicencias.collection("licencias").doc(cod).get();
      if(!snap.exists){ setError("Código inválido. Verificá que esté bien escrito."); setCargando(false); return; }
      const lic = snap.data();
      if(lic.app && lic.app !== "reparto-multi"){ setError("Este código no es para Reparto Multi."); setCargando(false); return; }
      if(lic.estado === "inactivo"){ setError("Licencia desactivada. Contactá al soporte."); setCargando(false); return; }
      if(lic.estado === "pendiente"){ setError("Licencia pendiente de activación. Contactá a Emma Soluciones."); setCargando(false); return; }
      if(lic.estado === "usado") {
        const miDevice = getDeviceId();
        const miTipo = tipoDispositivoRM();
        const dispositivos = slotsLicenciaRM(lic, miDevice, miTipo);
        const slotOcupado = dispositivos[miTipo];
        if(slotOcupado && slotOcupado !== miDevice){ setError(`Este código ya está en uso en ${miTipo==="pc"?"otra computadora":"otro celular"}.`); setCargando(false); return; }
      }
      setTipo("dueno"); setLicData(lic); setPaso(2);
    } catch(e){ setError("Error de conexión. Verificá tu internet."); }
    setCargando(false);
  };

  const completarActivacion = async () => {
    if(!nombre.trim()||!celular.trim()||!email.trim()||!pinIngresado.trim()){ setError("Completá todos los campos"); return; }
    if(!/\S+@\S+\.\S+/.test(email)){ setError("Email inválido"); return; }
    if(!terminos){ setError("Debés aceptar los Términos y Condiciones para continuar"); return; }
    setCargando(true); setError("");
    try {
      const cod = codigo.trim().toUpperCase();
      const deviceId = getDeviceId();
      // Verificar email y celular contra los del admin
      if(licData.email&&licData.email.trim().toLowerCase()!==email.trim().toLowerCase()){setError("El email no coincide con el registrado. Contactá al administrador.");setCargando(false);return;}
      if(licData.celular&&licData.celular.trim()!==celular.trim()){setError("El celular no coincide con el registrado. Contactá al administrador.");setCargando(false);return;}
      if(String(licData.pin)!==pinIngresado.trim()){setError("El PIN no es correcto. Revisá el que te enviaron.");setCargando(false);return;}
      // Re-chequear el casillero (pudo ocuparse entre el paso 1 y este paso)
      const miTipo = tipoDispositivoRM();
      const dispositivos = slotsLicenciaRM(licData, deviceId, miTipo);
      const slotOcupado = dispositivos[miTipo];
      if(slotOcupado && slotOcupado !== deviceId){ setError(`Este código ya está en uso en ${miTipo==="pc"?"otra computadora":"otro celular"}.`); setCargando(false); return; }
      dispositivos[miTipo] = deviceId;
      // Buscar negocioId en app-reparto-multiple
      let negocioId = licData.negocioId || cod;
      try {
        const negSnap = await window.db.collection("negocios")
          .where("codigoActivacion","==",cod).limit(1).get();
        if(!negSnap.empty) negocioId = negSnap.docs[0].id;
      } catch(_) {}
      await window.dbLicencias.collection("licencias").doc(cod).update({
        estado:"usado", deviceId, dispositivos, celular:celular.trim(), email:email.trim(),
        negocio:nombre.trim(), activadoEn:new Date().toISOString()
      });
      const profile = {
        rol:"dueño", negocioId, pin:licData.pin,
        nombre:nombre.trim(), email:email.trim(), celular:celular.trim(),
        deviceId, codigo:cod, activado:true
      };
      localStorage.setItem("rm_licencia", JSON.stringify(profile));
      localStorage.setItem("rm_licencia_dueno", JSON.stringify(profile));
      if(window.enviarEmailBrevoRM) {
        await window.enviarEmailBrevoRM({
          to:email.trim(), toName:nombre.trim(),
          subject:"✅ Tu Sistema de Reparto fue activado",
          htmlContent:`<h2>¡Bienvenido, ${nombre.trim()}!</h2><p>Tu app <b>Sistema de Reparto Multi</b> fue activada correctamente.</p><p>Tu PIN de acceso es: <b>${licData.pin}</b></p><p>Guardalo en un lugar seguro.</p>`
        });
      }
      onActivado(profile);
    } catch(e){ setError("Error al activar. Intentá de nuevo."); }
    setCargando(false);
  };

  const inp = { width:"100%", padding:"12px 14px", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, fontSize:14, background:"rgba(255,255,255,0.05)", color:"var(--color-text-primary,#e2eaf4)", outline:"none", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:"var(--color-text-secondary,#7a9ab8)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" };

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--color-background-primary,#0f1923)",padding:24,overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src="icon-192.png" alt="" onError={e=>e.target.remove()} style={{width:64,height:64,borderRadius:16,marginBottom:12}} />
          <h1 style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary,#e2eaf4)",margin:0}}>Activación de cuenta</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary,#7a9ab8)",marginTop:6,lineHeight:1.5}}>
            {paso===1
              ? <>Ingresá el código que recibiste.<br/><span style={{fontSize:12,color:"var(--color-text-tertiary,#4a6a85)"}}>Dueños: RM-XXXX · Repartidores: 6 letras</span></>
              : <>Completá tus datos para activar el sistema.<br/><span style={{color:"#5daaff",fontWeight:500}}>Código: {codigo.trim().toUpperCase()}</span></>}
          </p>
        </div>

        <div style={{background:"var(--color-background-secondary,#1a2b3c)",borderRadius:16,padding:24,border:"0.5px solid rgba(255,255,255,0.08)",display:"flex",flexDirection:"column",gap:16}}>

          {paso===1&&<>
            <div>
              <label style={lbl}>Código de activación</label>
              <input style={{...inp,textAlign:"center",fontSize:18,letterSpacing:"0.1em",textTransform:"uppercase"}}
                placeholder="RM-XXXX o 6 letras"
                value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==="Enter"&&verificarCodigo()} />
            </div>
            {error&&<div style={{background:"rgba(240,112,112,0.1)",border:"0.5px solid #f07070",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#f07070"}}>⚠️ {error}</div>}
            <button onClick={verificarCodigo} disabled={cargando}
              style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#185FA5",color:"#fff",fontSize:15,fontWeight:600,cursor:cargando?"wait":"pointer",opacity:cargando?0.7:1}}>
              {cargando?"Verificando...":"Verificar código →"}
            </button>
            <a href="https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto" target="_blank" rel="noopener"
              style={{fontSize:12,color:"var(--color-text-tertiary,#4a6a85)",textDecoration:"none",textAlign:"center"}}>
              💬 ¿Necesitás ayuda? Escribinos por WhatsApp
            </a>
          </>}

          {paso===2&&<>
            <div>
              <label style={lbl}>Nombre de tu negocio *</label>
              <input style={inp} placeholder="Ej: Distribuidora La Catalina" value={nombre} onChange={e=>setNombre(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Número de celular *</label>
              <input style={inp} type="tel" placeholder="3816559001" value={celular} onChange={e=>setCelular(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Email registrado *</label>
              <input style={inp} type="email" placeholder="tumail@ejemplo.com" value={email} onChange={e=>setEmail(e.target.value)} />
              <div style={{fontSize:11,color:"var(--color-text-tertiary,#4a6a85)",marginTop:4}}>Recibirás los informes en este email.</div>
            </div>
            <div>
              <label style={lbl}>PIN de activación *</label>
              <input style={{...inp,textAlign:"center",letterSpacing:"0.3em",fontSize:20,fontWeight:700,color:"#5daaff",background:"rgba(24,95,165,0.12)",borderColor:"#185FA5"}}
                type="number" placeholder="••••" value={pinIngresado} onChange={e=>setPinIngresado(e.target.value)} />
              <div style={{fontSize:11,color:"var(--color-text-tertiary,#4a6a85)",marginTop:4}}>Ingresá el PIN que te asignó el administrador. Lo vas a usar cada vez que abras la app.</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:12,border:"0.5px solid rgba(255,255,255,0.08)"}}>
              <div style={{fontSize:11,color:"var(--color-text-secondary,#7a9ab8)",marginBottom:10,lineHeight:1.6,maxHeight:100,overflowY:"auto"}}>
                <strong style={{color:"var(--color-text-primary,#e2eaf4)"}}>Términos y Condiciones de uso</strong><br/>
                Al activar esta cuenta aceptás que: (1) El sistema es de uso exclusivo para gestión de reparto. (2) Los datos ingresados son responsabilidad del usuario. (3) La suscripción es mensual y se renueva automáticamente; el acceso se suspende si el pago no se realiza antes del día 11 de cada mes. (4) Emma Soluciones Digitales no se responsabiliza por pérdida de datos por falta de conectividad. (5) El PIN es personal e intransferible.
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                <input type="checkbox" checked={terminos} onChange={e=>setTerminos(e.target.checked)} style={{width:18,height:18,cursor:"pointer",accentColor:"#185FA5",flexShrink:0}} />
                <span style={{fontSize:13,color:"var(--color-text-primary,#e2eaf4)"}}>Acepto los Términos y Condiciones</span>
              </label>
            </div>
            {error&&<div style={{background:"rgba(240,112,112,0.1)",border:"0.5px solid #f07070",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#f07070"}}>⚠️ {error}</div>}
            <button onClick={completarActivacion} disabled={cargando}
              style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#185FA5",color:"#fff",fontSize:15,fontWeight:600,cursor:cargando?"wait":"pointer",opacity:cargando?0.7:1}}>
              {cargando?"Activando...":"Activar cuenta →"}
            </button>
          </>}
        </div>

        <p style={{fontSize:11,color:"var(--color-text-tertiary,#4a6a85)",textAlign:"center",marginTop:16,lineHeight:1.6}}>Sistema de Reparto · Emma Soluciones Digitales</p>
      </div>
    </div>
  );
}

// ── Login (ya no se usa, reemplazado por PantallaActivacionRM) ──────────────────────────────────────────────
function Login({onLogin}) {
  return <PantallaActivacionRM onActivado={onLogin||function(){}} />;
}


// ── Onboarding ──────────────────────────────────────────────
function RepartidoresPanel({negocioId, clientes}) {
  const [repartidores, setRepartidores] = React.useState([]);
  const [invitesPendientes, setInvitesPendientes] = React.useState([]);
  const [cargando, setCargando]         = React.useState(true);

  React.useEffect(()=>{
    if(!negocioId) return;
    listarRepartidores(negocioId).then(r=>{ setRepartidores(r); setCargando(false); });
    listarInvitaciones(negocioId).then(inv=>setInvitesPendientes(inv));
  },[negocioId]);

  const eliminar = async (uid) => {
    if(!window.confirm("¿Eliminar este repartidor?")) return;
    await eliminarRepartidor(uid);
    setRepartidores(r=>r.filter(x=>x.uid!==uid));
  };

  const resetearDispositivo = async (uid, nombre) => {
    if(!window.confirm(`¿Resetear dispositivo de ${nombre}?\n\nPodrá activar la app de nuevo con su código en cualquier teléfono.`)) return;
    // Reset via window.db._codigos
    const reparto = repartidores.find(r=>r.uid===uid)||{};
    if(window.db && reparto.codigo) {
      try {
        await window.db.collection("_codigos").doc(reparto.codigo).update({deviceId:null,activado:false});
        alert(`✅ Dispositivo de ${nombre} reseteado.\nCompartile el enlace 📤 para que active de nuevo.`);
        setRepartidores(r=>r.map(x=>x.uid===uid?{...x,deviceId:null}:x));
        return;
      } catch(_) {}
    }
    // Si falla Firestore, informar que use el enlace
    alert(`✅ Reset registrado localmente.\n\nCompartile el enlace 📤 Compartir al repartidor para que pueda volver a activar la app.`);
    setRepartidores(r=>r.map(x=>x.uid===uid?{...x,deviceId:null}:x));
    return;
    if(false) { // bloque original desactivado — ya no se necesita
    // Si no hay función o falló, intentar directamente con window.db
    if(window.db && reparto?.codigo) {
      try {
        await window.db.collection("_codigos").doc(reparto.codigo).update({deviceId:null, activado:false});
        alert(`✅ Dispositivo de ${nombre} reseteado.`);
        setRepartidores(r=>r.map(x=>x.uid===uid?{...x,deviceId:null}:x));
        return;
      } catch(_) {}
    }
    const db = window.dbLicencias;
    if(!db){ alert("Error: base de datos no disponible."); return; }
    let reseteado = false;
    try {
      // Intento 1: colección global "repartidores" por uid
      const snap1 = await db.collection("repartidores").where("uid","==",uid).get();
      if(!snap1.empty){
        await Promise.all(snap1.docs.map(d=>d.ref.update({deviceId:null,activado:false})));
        reseteado = true;
      }
      // Intento 2: sub-colección del negocio
      try {
        await db.collection("negocios").doc(negocioId)
          .collection("repartidores").doc(uid).update({deviceId:null, activado:false});
        reseteado = true;
      } catch(_){}
      // Intento 3: colección "invitaciones" por uid
      try {
        const snap3 = await db.collection("invitaciones").where("uid","==",uid).get();
        if(!snap3.empty){
          await Promise.all(snap3.docs.map(d=>d.ref.update({deviceId:null,activado:false,estado:"pendiente"})));
          reseteado = true;
        }
      } catch(_){}
      // Intento 4: colección "invitaciones" por deviceId
      try {
        const repartidor = repartidores.find(r=>r.uid===uid);
        if(repartidor?.codigo){
          const snap4 = await db.collection("invitaciones").doc(repartidor.codigo).get();
          if(snap4.exists) await snap4.ref.update({deviceId:null,activado:false,estado:"pendiente"});
          reseteado = true;
        }
      } catch(_){}
      // Intento 5: colección "codigos" por uid (variante)
      try {
        const snap5 = await db.collection("codigos").where("uid","==",uid).get();
        if(!snap5.empty){
          await Promise.all(snap5.docs.map(d=>d.ref.update({deviceId:null,activado:false})));
          reseteado = true;
        }
      } catch(_){}

      if(reseteado){
        alert(`✅ Dispositivo de ${nombre} reseteado.\nYa puede activar la app de nuevo con su código en cualquier teléfono.`);
      } else {
        alert(`⚠️ Reset ejecutado pero no se encontró el registro del dispositivo en la base de datos.\n${nombre} puede intentar activar de nuevo — si falla con "código ya usado", contactá soporte.`);
      }
      setRepartidores(r=>r.map(x=>x.uid===uid?{...x,deviceId:null}:x));
    } catch(e) {
      alert("Error al resetear: " + e.message);
    }
  };

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>

      {/* Lista de repartidores */}
      <div style={{...s.card,margin:0}}>
        <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>👥 Repartidores activos</div>
        {cargando && <div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Cargando...</div>}
        {!cargando && repartidores.length===0 && (
          <div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Aún no hay repartidores activos.</div>
        )}
        {repartidores.map(r=>(
          <div key={r.uid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{r.nombre}</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{(r.sectores||[]).join(", ")||"Sin sectores"} · {r.email}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button
                style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:"0.5px solid #f5b942",background:"rgba(245,185,66,0.12)",color:"#f5b942",cursor:"pointer",fontWeight:500}}
                onClick={()=>resetearDispositivo(r.uid,r.nombre)}>
                🔄 Reset
              </button>
              <button style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:"0.5px solid var(--color-text-success)",background:"var(--color-background-success)",color:"var(--color-text-success)",cursor:"pointer",fontWeight:500}}
                onClick={()=>{
                  const enlace=typeof generarEnlaceActivacion==="function"?generarEnlaceActivacion(r,negocioId):"";
                  if(!enlace){alert("Error al generar enlace");return;}
                  if(navigator.share){navigator.share({title:"Activación reparto",text:"Abrí este enlace para activar la app",url:enlace}).catch(()=>{navigator.clipboard?.writeText(enlace);alert("Enlace copiado: "+enlace);});}
                  else{navigator.clipboard?.writeText(enlace).then(()=>alert("✅ Enlace copiado.\nPegalo en WhatsApp y enviáselo al repartidor.")).catch(()=>alert("Enlace: "+enlace));}
                }}>
                📤 Compartir
              </button>
              <button style={{...s.btnDanger,fontSize:11,padding:"4px 10px"}} onClick={()=>eliminar(r.uid)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes (creadas desde Panel del dueño, aún no usadas) */}
      {invitesPendientes.length>0&&(
        <div style={{...s.card,margin:0,borderLeft:"3px solid #f5b942"}}>
          <div style={{fontSize:14,fontWeight:500,color:"#f5b942",marginBottom:10}}>⏳ Invitaciones pendientes</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10}}>
            El repartidor aún no usó su código para ingresar.
          </div>
          {invitesPendientes.map(inv=>(
            <div key={inv.codigo} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{inv.nombre}</div>
                <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:"#f5b942",letterSpacing:"0.15em"}}>{inv.codigo}</div>
              </div>
              <button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>{
                const txt=`Código para ingresar a Sistema de Reparto: ${inv.codigo}`;
                if(navigator.share){navigator.share({title:"Código de acceso",text:txt});}
                else{navigator.clipboard?.writeText(txt);alert("Código copiado: "+inv.codigo);}
              }}>📤 Compartir</button>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje: crear repartidores desde Panel del dueño */}
      <div style={{...s.card,margin:0,background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)"}}>
        <div style={{fontSize:13,color:"var(--color-text-info)",fontWeight:600,marginBottom:6}}>💡 ¿Cómo agregar un repartidor?</div>
        <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.6}}>
          Andá a <b>Panel del dueño → + Nuevo reparto</b>, completá el nombre y el código se genera solo.<br/>
          Compartí ese código con el repartidor para que entre a la app.
        </div>
      </div>
    </div>
  );
}
}




// ── NuevoClienteForm ──────────────────────────────────────────────
function NuevoClienteForm({sectores, diaActual, onGuardar, onVolver}) {
  var diasOpc = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  var init = {
    nombre:"", dia:diaActual||"Lunes",
    barrio: (sectores && sectores.length > 0) ? sectores[0] : "",
    calle:"", nro:"", manzana:"", lote:"",
    telefono:"", maps:"", notas:"",
    sifon:0, bidon10:0, bidon20:0, dispenser:0, orden:9999
  };
  var state = React.useState(init);
  var datos = state[0];
  var setDatos = state[1];

  var set = function(k,v){ setDatos(function(d){ var n=Object.assign({},d); n[k]=v; return n; }); };

  var guardar = function() {
    if(!datos.nombre || !datos.nombre.trim()){ alert("Ingresá el nombre del cliente"); return; }
    onGuardar(datos);
  };

  var campos = [
    ["barrio","Barrio"], ["calle","Calle"], ["nro","Número"],
    ["manzana","Manzana"], ["lote","Lote"],
    ["telefono","Teléfono (sin 0 ni 15)"], ["maps","Link Google Maps"]
  ];

  return React.createElement("div", {style: s.screen},
    React.createElement(HeaderApp, {titulo: "Nuevo Cliente", onVolver: onVolver}),
    React.createElement("div", {style: {padding:16, display:"flex", flexDirection:"column", gap:10}},
      React.createElement("div", null,
        React.createElement("label", {style: s.label}, "Nombre y apellido *"),
        React.createElement("input", {style: s.input, value: datos.nombre, placeholder: "Ej: Juan García",
          onChange: function(e){ set("nombre", e.target.value); }})
      ),
      React.createElement("div", null,
        React.createElement("label", {style: s.label}, "Día de reparto"),
        React.createElement("select", {style: s.select, value: datos.dia,
          onChange: function(e){ set("dia", e.target.value); }},
          diasOpc.map(function(d){ return React.createElement("option", {key:d, value:d}, d); })
        )
      ),
      campos.map(function(par){
        return React.createElement("div", {key: par[0]},
          React.createElement("label", {style: s.label}, par[1]),
          React.createElement("input", {style: s.input, value: datos[par[0]]||"", placeholder: par[1],
            onChange: function(e){ set(par[0], e.target.value); }})
        );
      }),
      React.createElement("div", null,
        React.createElement("label", {style: s.label}, "Notas"),
        React.createElement("input", {style: s.input, value: datos.notas||"", placeholder: "ej: timbre roto, cobrar $2000...",
          onChange: function(e){ set("notas", e.target.value); }})
      ),
      React.createElement("div", {style: {display:"flex", gap:10}},
        [["sifon","Sifón"],["bidon10","10L"],["bidon20","20L"]].map(function(par){
          return React.createElement("div", {key:par[0], style:{flex:1}},
            React.createElement("label", {style:{...s.label, textAlign:"center"}}, par[1]),
            React.createElement("input", {style:{...s.input, textAlign:"center"}, type:"number", min:0,
              value: datos[par[0]]||0,
              onChange: function(e){ set(par[0], Number(e.target.value)); }})
          );
        })
      ),
      React.createElement("button", {
        style: Object.assign({}, s.btnPrimary, {marginTop:8, padding:14, fontSize:15}),
        onClick: guardar
      }, "✓ Guardar cliente")
    )
  );
}
