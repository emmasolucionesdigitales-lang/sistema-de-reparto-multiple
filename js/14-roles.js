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
function AppRepartidorWrapper({uid, perfil, onSalir}) {
  // Sin Cargando — renderizar AppRepartidor directamente
  return <AppRepartidor uid={uid} perfil={perfil} onSalir={onSalir} />;
}

function AppRepartidor({uid, perfil, onSalir: onSalirProp}) {
  // ── Calcular diaActual PRIMERO para poder usarlo en useState ────────
  // IMPORTANTE: debe ir antes de cualquier useState que lo use
  const _diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const diaActual = _diasSemana[new Date().getDay()];

  // ── Estado del repartidor ───────────────────────────────────────────
  const [pantalla,   setPantalla]   = React.useState("inicio");
  const [fechaActual,setFechaActual]= React.useState(()=>new Date().toISOString().slice(0,10));
  const [clienteId,  setClienteId]  = React.useState(null);
  const [ventaLibreFecha,setVentaLibreFecha] = React.useState(()=>new Date().toISOString().slice(0,10));
  const [diaClienteActual, setDiaClienteActual] = React.useState(diaActual); // ahora sí está definido
  const [origenDetalle, setOrigenDetalle] = React.useState("clientes");
  const [datos,      setDatos]      = React.useState(null);

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
    : (() => { try{return JSON.parse(localStorage.getItem("cat_repartos_v1")||"[]");}catch{return [];} })();
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

  const sync = (nd) => { setDatos(nd); cloudSave(nd, uid, perfil.negocioId); };
  const saveVentas   = (nv) => sync({...datos, ventas:nv});
  const saveClientes = (nc) => sync({...datos, clientes:nc});
  const saveNoVisitas= (nv) => sync({...datos, noVisitas:nv});
  const savePlanilla = (key,val) => sync({...datos, planillas:{...planillas,[key]:val}});

  const irA = (p) => { setPantalla(p); window.scrollTo(0,0); };

  const registrarVenta = (detalle, pago, montoPagado, saldoAplicado, envPrest, envDev, obs, opcionSaldo, mt2, sdOverride) => {
    const c = cliente;
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
      repartidor:perfil.nombre
    }];
    const clientesActualizados = todosClientes.map(x=>x.id===c.id?{...x,saldo:(x.saldo||0)+saldoDelta}:x);
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
      irA("venta");
      return;
    }
    // Si no hay más clientes, pasar a prospectos
    const visitadosProsp = new Set(ventasHoy.filter(v=>v._esProspecto).map(v=>v.clienteId));
    const sigProspecto = prospectos.find(p=>!visitadosProsp.has(p.id));
    if(sigProspecto){
      setClienteId(sigProspecto.id);
      irA("venta");
      return;
    }
    // Terminó todo
    irA("clientes");
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
          dia={diaActual} fecha={fechaActual} ventas={ventasHoy} noVisitas={noVisHoy}
          onSeleccionar={c=>{setClienteId(c.id);setDiaClienteActual(c.dia||diaActual);setOrigenDetalle("clientes");irA("detalleCliente");}}
          onNuevoCliente={null} onVolver={()=>irA("inicio")}
          onReordenar={lista=>{
            const otros = todosClientes.filter(c=>!(c.dia===diaActual && (sectores.length===0||sectores.some(s=>(c.barrio||"").toLowerCase().includes(s.toLowerCase())))));
            saveClientes([...otros,...lista]);
          }}
          onRegistrarNoVisita={(cId,motivo)=>{
            const nv=[...noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)),{clienteId:cId,dia:diaClienteActual,fecha:fechaActual,motivo}];
            saveNoVisitas(nv);
          }}
          onQuitarNoVisita={(cId)=>saveNoVisitas(noVisitas.filter(v=>!(v.clienteId===cId&&v.fecha===fechaActual)))}
          onConfirmarTransfer={null} prospectos={prospectos} recordatorios={[]}
        />
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
          key={clienteId}
          cliente={cliente} productos={productos} fecha={fechaActual}
          onNoEsta={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noesta"}]);
            irAlSiguiente();
          }}
          onNoQuiere={()=>{
            saveNoVisitas([...noVisitas.filter(v=>!(v.clienteId===clienteId&&v.fecha===fechaActual)),{clienteId,dia:diaClienteActual,fecha:fechaActual,motivo:"noquiso"}]);
            irAlSiguiente();
          }}
          onGuardar={(d,p,m,sa,ep,ed,obs,op,mt2,sd)=>{
            registrarVenta(d,p,m,sa,ep,ed,obs,op,mt2,sd);
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
          onNuevoCliente={null}
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
      if(lic.estado === "usado" && lic.deviceId && lic.deviceId !== getDeviceId()){ setError("Este código ya fue usado en otro dispositivo."); setCargando(false); return; }
      setTipo("dueno"); setLicData(lic); setPaso(2);
    } catch(e){ setError("Error de conexión. Verificá tu internet."); }
    setCargando(false);
  };

  const completarActivacion = async () => {
    if(!nombre.trim()||!celular.trim()||!email.trim()){ setError("Completá todos los campos"); return; }
    if(!/\S+@\S+\.\S+/.test(email)){ setError("Email inválido"); return; }
    setCargando(true); setError("");
    try {
      const cod = codigo.trim().toUpperCase();
      const deviceId = getDeviceId();
      // Buscar negocioId en app-reparto-multiple
      let negocioId = licData.negocioId || cod;
      try {
        const negSnap = await window.db.collection("negocios")
          .where("codigoActivacion","==",cod).limit(1).get();
        if(!negSnap.empty) negocioId = negSnap.docs[0].id;
      } catch(_) {}
      await window.dbLicencias.collection("licencias").doc(cod).update({
        estado:"usado", deviceId, celular:celular.trim(), email:email.trim(),
        negocio:nombre.trim(), activadoEn:new Date().toISOString()
      });
      const profile = {
        rol:"dueño", negocioId, pin:licData.pin,
        nombre:nombre.trim(), email:email.trim(), celular:celular.trim(),
        deviceId, codigo:cod, activado:true
      };
      localStorage.setItem("rm_licencia", JSON.stringify(profile));
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

  const stInp = {...s.input};
  const stBtn = {...s.btnPrimary, opacity:cargando?0.6:1};

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,minHeight:"100vh",gap:16,background:"var(--color-background-primary)"}}>
      <div style={{width:70,height:70,borderRadius:"50%",background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>💧</div>
      <h1 style={{fontSize:22,fontWeight:600,color:"var(--color-text-primary)",textAlign:"center",margin:0}}>Sistema de Reparto</h1>

      {paso===1&&<>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",textAlign:"center",maxWidth:280,lineHeight:1.5,margin:0}}>
          Ingresá el código de activación que recibiste.<br/>
          <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Dueños: código RM-XXXX · Repartidores: código de 6 letras</span>
        </p>
        <div style={{width:"100%",maxWidth:320}}>
          <label style={s.label}>Código de activación</label>
          <input style={{...stInp,textAlign:"center",fontSize:18,letterSpacing:3,textTransform:"uppercase"}}
            placeholder="RM-XXXX o código de 6 letras"
            value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&verificarCodigo()} />
        </div>
        {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center",margin:0}}>{error}</p>}
        <button style={{...stBtn,width:200}} disabled={cargando} onClick={verificarCodigo}>
          {cargando?"Verificando...":"Continuar →"}
        </button>
        {/* Soporte */}
        <a href="https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto"
          target="_blank" rel="noopener"
          style={{marginTop:8,fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
          💬 ¿Necesitás ayuda? Escribinos por WhatsApp
        </a>
      </>}

      {paso===2&&<>
        <p style={{fontSize:14,color:"var(--color-text-success)",textAlign:"center",maxWidth:280,lineHeight:1.5,margin:0}}>
          ✓ Código válido. Completá tus datos para activar.
        </p>
        <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={s.label}>Nombre del negocio *</label>
            <input style={stInp} placeholder="Ej: Distribuidora La Catalina" value={nombre} onChange={e=>setNombre(e.target.value)} /></div>
          <div><label style={s.label}>Número de celular *</label>
            <input style={stInp} type="tel" placeholder="3816559001" value={celular} onChange={e=>setCelular(e.target.value)} /></div>
          <div><label style={s.label}>Email *</label>
            <input style={stInp} type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        </div>
        {error&&<p style={{fontSize:13,color:"var(--color-text-danger)",textAlign:"center",margin:0}}>{error}</p>}
        <button style={{...stBtn,width:200}} disabled={cargando} onClick={completarActivacion}>
          {cargando?"Activando...":"Activar app →"}
        </button>
      </>}
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
