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
function AppRepartidor({uid, perfil, onSalir: onSalirProp}) {
  // Buscar el reparto que corresponde al código del repartidor
  const [pantalla,   setPantalla]   = React.useState("inicio");
  const [fechaActual,setFechaActual]= React.useState(()=>new Date().toISOString().slice(0,10));
  const [clienteId,  setClienteId]  = React.useState(null);
  const [ventaLibreFecha,setVentaLibreFecha] = React.useState(()=>new Date().toISOString().slice(0,10));
  const [diaClienteActual, setDiaClienteActual] = React.useState(diaActual);
  const [origenDetalle, setOrigenDetalle] = React.useState("clientes");
  const [datos,      setDatos]      = React.useState(null);

  // Detectar día actual automáticamente
  const diaHoy = () => {
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    return dias[new Date().getDay()];
  };

  React.useEffect(()=>{
    cloudLoad(uid, perfil.negocioId).then(function(d){
      setDatos(d||{clientes:[],ventas:[],productos:[],planillas:{},stock:{},noVisitas:[],prospectos:[],recordatorios:[],repartos:[]});
    });
  },[]);

  if(!datos) return <Cargando texto="Cargando datos..." />;

  // Leer repartos desde Firestore (datos descargados), con fallback a localStorage
  const todosRepartos = datos.repartos && datos.repartos.length > 0
    ? datos.repartos
    : (() => { try{return JSON.parse(localStorage.getItem("cat_repartos_v1")||"[]");}catch{return [];} })();
  const miReparto = todosRepartos.find(r=>r.codigo===perfil?.codigo) || null;

  const todosClientes = datos.clientes || [];
  const ventas        = datos.ventas   || [];
  const productos     = datos.productos|| [];
  const noVisitas     = datos.noVisitas|| [];
  const planillas     = datos.planillas|| {};

  // Sectores del repartidor (barrios asignados)
  const sectores = perfil.sectores || [];

  // Día actual del reparto (puede ajustarse manualmente)
  const diaActual = (() => {
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    return dias[new Date().getDay()];
  })();

  // Clientes de este repartidor = su reparto (TODOS los días)
  const clientes = todosClientes.filter(c =>
    (!miReparto || c.repartoId === miReparto.id) &&
    (sectores.length === 0 || sectores.some(s => (c.barrio||"").toLowerCase().includes(s.toLowerCase())))
  ).sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999));

  const cliente = todosClientes.find(c=>c.id===clienteId)||null;

  const sync = (nd) => { setDatos(nd); cloudSave(nd, uid, perfil.negocioId); };
  const saveVentas   = (nv) => sync({...datos, ventas:nv});
  const saveClientes = (nc) => sync({...datos, clientes:nc});
  const saveNoVisitas= (nv) => sync({...datos, noVisitas:nv});
  const savePlanilla = (key,val) => sync({...datos, planillas:{...planillas,[key]:val}});

  const irA = (p) => { setPantalla(p); window.scrollTo(0,0); };

  const registrarVenta = (detalle, pago, montoPagado, saldoAplicado, envPrest, envDev, obs, opcionSaldo) => {
    const c = cliente;
    const calc = calcVenta(detalle, pago, montoPagado, saldoAplicado, productos);
    const nv = [...ventas, {id:Date.now(), clienteId:c.id, cliente:c.nombre, dia:diaClienteActual||c.dia, fechaKey:fechaActual,
      fecha:new Date().toLocaleString("es-AR"), detalle, pago, obs:obs||"", saldoAplicado:saldoAplicado||0,
      envPrest:(envPrest||[]).filter(e=>e.prod&&e.cant), envDev:(envDev||[]).filter(e=>e.prod&&e.cant),
      ...calc, repartidor:perfil.nombre}];
    const clientesActualizados = todosClientes.map(x=>x.id===c.id?{...x,saldo:(x.saldo||0)+calc.saldoDelta}:x);
    sync({...datos, ventas:nv, clientes:clientesActualizados});
  };

  const registrarVentaLibre = (detalle,pago,montoPagado,saldoAplicado,envPrest,envDev,obs,op,mt2,sd,fechaKl) => {
    const c = cliente;
    const calc = calcVenta(detalle, pago, montoPagado, saldoAplicado, productos);
    const nVenta = {id:Date.now(), clienteId:c.id, cliente:c.nombre, dia:c.dia, fechaKey:fechaKl,
      fecha:new Date(fechaKl+"T12:00:00").toLocaleString("es-AR"), detalle, pago, obs:obs||"",
      saldoAplicado:saldoAplicado||0, envPrest:(envPrest||[]).filter(e=>e.prod&&e.cant),
      envDev:(envDev||[]).filter(e=>e.prod&&e.cant), ...calc, repartidor:perfil.nombre};
    saveVentas([...ventas, nVenta]);
    saveClientes(clientes.map(x=>x.id===c.id?{...x,saldo:c.saldo+calc.saldoDelta}:x));
  };

  const eliminarVenta = (ventaId) => {
    const v=ventas.find(x=>x.id===ventaId); if(!v) return;
    saveVentas(ventas.filter(x=>x.id!==ventaId));
    const c2=clientes.find(x=>x.id===v.clienteId);
    if(c2) saveClientes(clientes.map(x=>x.id===c2.id?{...x,saldo:c2.saldo-v.saldoDelta}:x));
  };

  const ventasHoy = ventas.filter(v=>v.fechaKey===fechaActual);
  const noVisHoy  = noVisitas.filter(v=>v.fecha===fechaActual);

  return (
    <div style={s.app}>
      {pantalla==="inicio"&&(
        <InicioRepartidor
          perfil={perfil}
          diaActual={diaActual}
          fechaActual={fechaActual}
          setFechaActual={setFechaActual}
          clientes={clientes}
          ventas={ventas}
          noVisitas={noVisHoy}
          recordatorios={datos.recordatorios||[]}
          onSaveRecordatorio={(r)=>{
            const lista=[...(datos.recordatorios||[]),r];
            sync({...datos,recordatorios:lista});
          }}
          onConfirmarRecordatorio={(id)=>{
            const lista=(datos.recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r);
            sync({...datos,recordatorios:lista});
          }}
          onIrCliente={(cId)=>{setClienteId(cId);setDiaClienteActual(clientes.find(c=>c.id===cId)?.dia||diaActual);irA("venta");}}
          onIrCarga={()=>irA("cargaDia")}
          onIrClientes={()=>irA("clientes")}
          onIrPlanilla={()=>irA("planilla")}
          onIrTodosClientes={()=>irA("todosClientes")}
          onIrAgenda={()=>irA("agendaRep")}
          onIrTransfers={()=>irA("confirmTransferRep")}
          onSalir={onSalirProp||(()=>window.auth.signOut())}
        />
      )}
      {pantalla==="cargaDia"&&(
        <InicioReparto
          dia={diaActual} fecha={fechaActual}
          planilla={planillas[`${diaActual}_${fechaActual}`]||planillaDiaVacia()}
          productos={productos}
          cargasDia={datos.cargasDia||CARGA_DIA_DEFAULT}
          stock={datos.stock||{}}
          onGuardar={(p)=>{savePlanilla(`${diaActual}_${fechaActual}`,p);irA("inicio");}}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="clientes"&&(
        <ListaClientes
          clientes={clientes}
          dia={""} fecha={fechaActual} ventas={ventasHoy} noVisitas={noVisHoy}
          onSeleccionar={c=>{setClienteId(c.id);setDiaClienteActual(c.dia||diaActual);setOrigenDetalle("clientes");irA("detalleCliente");}}
          onNuevoCliente={()=>irA("nuevoCliente")} onVolver={()=>irA("inicio")}
          onReordenar={lista=>{
            const otros = todosClientes.filter(c=>!(c.dia===diaActual && (sectores.length===0||sectores.some(s=>(c.barrio||"").toLowerCase().includes(s.toLowerCase())))));
            saveClientes([...otros,...lista]);
          }}
          onRegistrarNoVisita={(cId,motivo)=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)),{clienteId:cId,dia:diaClienteActual,fecha:fechaActual,motivo}];
            saveNoVisitas(nv);
          }}
          onQuitarNoVisita={(cId)=>saveNoVisitas(noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)))}
          onConfirmarTransfer={null} prospectos={[]} recordatorios={[]}
        />
      )}
      {pantalla==="nuevoCliente"&&(
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
          onEditar={()=>{}} onEliminarVenta={()=>{}} onEditarVenta={()=>{}} onEliminarCliente={()=>{}}
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
              detalle:[],pago:pago,neto:monto,saldoDelta:monto,_esCobro:true,
              repartidor:perfil.nombre};
            const clientesActualizados=todosClientes.map(x=>x.id===cliente.id?{...x,saldo:(x.saldo||0)+monto}:x);
            sync({...datos,ventas:[...ventas,cobro],clientes:clientesActualizados});
          }}
        />
      )}
      {pantalla==="venta"&&cliente&&(
        <NuevaVenta
          cliente={cliente} productos={productos} fecha={fechaActual}
          onNoEsta={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noesta"}]);
            irA("clientes");
          }}
          onNoQuiere={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noquiso"}]);
            irA("clientes");
          }}
          onGuardar={(d,p,m,sa,ep,ed,obs,op)=>{registrarVenta(d,p,m,sa,ep,ed,obs,op);irA("clientes");}}
          onVolver={()=>irA("clientes")}
        />
      )}

      {pantalla==="confirmTransferRep"&&(
        <ConfirmacionesDia
          dia={diaActual}
          ventas={ventas.filter(v=>v.pago==="transferencia")}
          clientes={clientes}
          onConfirmar={(ventaId)=>{
            const nv=ventas.map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada}:v);
            sync({...datos,ventas:nv});
          }}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="todosClientes"&&(
        <TodosClientesRepartidor
          clientes={clientes}
          ventas={ventas}
          onSeleccionar={(c)=>{setClienteId(c.id);setDiaClienteActual(c.dia||diaActual);setOrigenDetalle("todosClientes");irA("detalleCliente");}}
          onNuevoCliente={()=>irA("nuevoCliente")}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="agendaRep"&&(
        <AgendaRepartidor
          recordatorios={datos.recordatorios||[]}
          clientes={clientes}
          onConfirmar={(id)=>{const l=(datos.recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r);sync({...datos,recordatorios:l});}}
          onEliminar={(id)=>{const l=(datos.recordatorios||[]).filter(r=>r.id!==id);sync({...datos,recordatorios:l});}}
          onNuevo={(datos2)=>{
            const c=clientes.find(x=>x.id===datos2.clienteId);
            if(!c){alert("Seleccioná un cliente");return;}
            const l=[...(datos.recordatorios||[]),{...datos2,id:Date.now(),clienteId:c.id,clienteNombre:c.nombre,dia:c.dia,confirmado:false}];
            sync({...datos,recordatorios:l});
          }}
          onIrCliente={(cId)=>{setClienteId(cId);setDiaClienteActual(clientes.find(c=>c.id===cId)?.dia||diaActual);irA("venta");}}
          onVolver={()=>irA("inicio")}
        />
      )}
      {pantalla==="planilla"&&(
        <PlanillaDelDia
          dia={diaActual} fecha={fechaActual} ventas={ventasHoy}
          planilla={planillas[`${diaActual}_${fechaActual}`]||planillaDiaVacia()}
          productos={productos} stock={datos.stock||{}} setStock={()=>{}} syncData={()=>{}}
          onGuardar={d=>{savePlanilla(`${diaActual}_${fechaActual}`,d);irA("inicio");}}
          onVolver={()=>irA("inicio")}
        />
      )}
    </div>
  );
}


// ── Login ──────────────────────────────────────────────
function Login({onLogin}) {
  const [modo, setModo]         = React.useState("login"); // "login" | "registro"
  const [email, setEmail]       = React.useState("");
  const [pass, setPass]         = React.useState("");
  const [error, setError]       = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  const manejarAuth = async () => {
    if(!email.trim()||!pass.trim()){setError("Completá email y contraseña");return;}
    setCargando(true); setError("");
    try {
      if(modo==="login"){
        await window.auth.signInWithEmailAndPassword(email.trim(), pass);
      } else {
        await window.auth.createUserWithEmailAndPassword(email.trim(), pass);
      }
    } catch(e) {
      const msgs = {
        "auth/user-not-found":"Email no registrado. ¿Querés crear una cuenta?",
        "auth/wrong-password":"Contraseña incorrecta",
        "auth/email-already-in-use":"Ese email ya tiene una cuenta. Iniciá sesión.",
        "auth/weak-password":"La contraseña debe tener al menos 6 caracteres",
        "auth/invalid-email":"Email inválido",
        "auth/invalid-credential":"Email o contraseña incorrectos",
      };
      setError(msgs[e.code]||e.message);
    }
    setCargando(false);
  };

  const googleLogin = async () => {
    setCargando(true); setError("");
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await window.auth.signInWithPopup(provider);
    } catch(e) {
      setError("Error al iniciar con Google: " + e.message);
    }
    setCargando(false);
  };

  return (
    <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:"var(--color-background-primary)",padding:"0 24px",display:"flex",flexDirection:"column",justifyContent:"center",gap:16}}>
      <div style={{textAlign:"center",marginBottom:8}}>
        <div style={{fontSize:48,marginBottom:12}}>💧</div>
        <h1 style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 6px"}}>Sistema de Reparto</h1>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",margin:0}}>
          {modo==="login"?"Ingresá a tu cuenta":"Creá tu cuenta gratuita"}
        </p>
      </div>

      <div style={{display:"flex",gap:0,background:"var(--color-background-secondary)",borderRadius:10,padding:4}}>
        {["login","registro"].map(m=>(
          <button key={m} onClick={()=>{setModo(m);setError("");}}
            style={{flex:1,padding:"8px",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:500,
              background:modo===m?"var(--color-background-primary)":"transparent",
              color:modo===m?"var(--color-text-primary)":"var(--color-text-secondary)"}}>
            {m==="login"?"Ingresar":"Registrarse"}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div>
          <label style={{fontSize:13,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Email</label>
          <input style={s.input} type="email" placeholder="tu@email.com"
            value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manejarAuth()} />
        </div>
        <div>
          <label style={{fontSize:13,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Contraseña</label>
          <input style={s.input} type="password" placeholder="Mínimo 6 caracteres"
            value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manejarAuth()} />
        </div>
        {error&&<div style={{fontSize:13,color:"var(--color-text-danger)",background:"var(--color-background-danger)",padding:"8px 12px",borderRadius:8}}>{error}</div>}
        <button style={{...s.btnPrimary,marginTop:4}} onClick={manejarAuth} disabled={cargando}>
          {cargando?"Procesando...":(modo==="login"?"Ingresar":"Crear cuenta")}
        </button>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0"}}>
        <div style={{flex:1,height:"0.5px",background:"var(--color-border-secondary)"}}/>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>o</span>
        <div style={{flex:1,height:"0.5px",background:"var(--color-border-secondary)"}}/>
      </div>

      <button onClick={googleLogin} disabled={cargando}
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14,cursor:"pointer",fontWeight:500}}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continuar con Google
      </button>

      <p style={{fontSize:12,color:"var(--color-text-tertiary)",textAlign:"center",lineHeight:1.6,marginTop:8}}>
        Tus datos son privados y solo accesibles con tu cuenta.
      </p>
    </div>
  );
}


// ── Onboarding ──────────────────────────────────────────────
function RepartidoresPanel({negocioId, clientes}) {
  const [repartidores, setRepartidores] = React.useState([]);
  const [cargando, setCargando]         = React.useState(true);
  const [nombre, setNombre]             = React.useState("");
  const [sectorInput, setSectorInput]   = React.useState("");
  const [sectores, setSectores]         = React.useState([]);
  const [codigo, setCodigo]             = React.useState("");
  const [generando, setGenerando]       = React.useState(false);
  const [copiado, setCopiado]           = React.useState(false);

  React.useEffect(()=>{
    if(!negocioId) return;
    listarRepartidores(negocioId).then(r=>{ setRepartidores(r); setCargando(false); });
  },[negocioId]);

  const agregarSector = () => {
    const s = sectorInput.trim();
    if(!s || sectores.includes(s)) return;
    setSectores([...sectores, s]);
    setSectorInput("");
  };

  // Barrios disponibles en clientes
  const barriosDisponibles = [...new Set((clientes||[]).map(c=>c.barrio).filter(Boolean))].sort();

  const generarCodigo = async () => {
    if(!nombre.trim()){ alert("Ingresá el nombre del repartidor"); return; }
    if(sectores.length===0){ alert("Agregá al menos un sector/barrio"); return; }
    setGenerando(true);
    const cod = await crearInvitacion(negocioId, nombre.trim(), sectores);
    setCodigo(cod);
    setGenerando(false);
  };

  const copiarCodigo = () => {
    const texto = `Te invito a usar Sistema de Reparto!\nTu código: ${codigo}\nDescargá la app e ingresá como repartidor.`;
    if(navigator.share) {
      navigator.share({ title:"Código de reparto", text:texto });
    } else {
      navigator.clipboard?.writeText(texto);
      setCopiado(true);
      setTimeout(()=>setCopiado(false), 2000);
    }
  };

  const eliminar = async (uid) => {
    if(!window.confirm("¿Eliminar este repartidor?")) return;
    await eliminarRepartidor(uid);
    setRepartidores(r=>r.filter(x=>x.uid!==uid));
  };

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>

      {/* Lista de repartidores */}
      <div style={{...s.card,margin:0}}>
        <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>👥 Repartidores activos</div>
        {cargando && <div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Cargando...</div>}
        {!cargando && repartidores.length===0 && (
          <div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Aún no hay repartidores. Generá un código abajo.</div>
        )}
        {repartidores.map(r=>(
          <div key={r.uid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{r.nombre}</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{(r.sectores||[]).join(", ")||"Sin sectores"} · {r.email}</div>
            </div>
            <button style={{...s.btnDanger,fontSize:11,padding:"4px 10px"}} onClick={()=>eliminar(r.uid)}>Eliminar</button>
          </div>
        ))}
      </div>

      {/* Generar invitación */}
      <div style={{...s.card,margin:0,borderLeft:"3px solid #5daaff"}}>
        <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>➕ Agregar repartidor</div>
        <label style={s.label}>Nombre del repartidor</label>
        <input style={{...s.input,marginBottom:12}} placeholder="Ej: Juan Pérez" value={nombre} onChange={e=>{setNombre(e.target.value);setCodigo("");}} />
        <label style={s.label}>Sectores / Barrios asignados</label>
        {sectores.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {sectores.map(s=>(
              <span key={s} style={{background:"#1e3a5f",color:"#5daaff",borderRadius:6,padding:"4px 10px",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                {s}
                <button style={{background:"none",border:"none",color:"#5daaff",cursor:"pointer",fontSize:14,padding:0,lineHeight:1}} onClick={()=>setSectores(sectores.filter(x=>x!==s))}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <input style={{...s.input,flex:2,margin:0}} placeholder="Escribí un barrio..." value={sectorInput}
            onChange={e=>setSectorInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();agregarSector();}}}
            list="barrios-disponibles" />
          <datalist id="barrios-disponibles">
            {barriosDisponibles.filter(b=>!sectores.includes(b)).map(b=><option key={b} value={b}/>)}
          </datalist>
          <button style={{...s.btn,flex:1,padding:"8px"}} onClick={agregarSector}>+ Agregar</button>
        </div>
        <button style={{...s.btnPrimary,width:"100%",padding:12}} disabled={generando} onClick={generarCodigo}>
          {generando?"Generando...":"🔑 Generar código de invitación"}
        </button>

        {codigo&&(
          <div style={{marginTop:14,background:"var(--color-background-tertiary)",borderRadius:10,padding:14,textAlign:"center"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Código para {nombre} · {sectores.join(", ")}</div>
            <div style={{fontSize:36,fontWeight:700,color:"#5daaff",letterSpacing:8,marginBottom:12}}>{codigo}</div>
            <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:10}}>El repartidor lo ingresa al abrir la app por primera vez</div>
            <button style={{...s.btnPrimary,width:"100%"}} onClick={copiarCodigo}>
              {copiado?"✓ Copiado!":"📤 Compartir código"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
    React.createElement("div", {style: s.header},
      React.createElement("button", {style: s.backBtn, onClick: onVolver}, "← Volver"),
      React.createElement("span", {style: s.headerTitle}, "Nuevo Cliente"),
      React.createElement("div", null)
    ),
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
