// ════════════════════════════════════════════════════════════════════
// ◆  16-app.js — App (auth) · AppPrincipal (estado global)
// ════════════════════════════════════════════════════════════════════

function App() {
  // ── Todos los hooks primero (regla de React: nunca hooks después de un return) ──
  const [perfilRecuperado, setPerfilRecuperado] = React.useState(null);
  const [buscandoSesion, setBuscandoSesion] = React.useState(()=>{
    // Si ya hay sesión local de cualquier tipo, no necesitamos buscar en Firebase
    const hayLocal = !!localStorage.getItem("rm_licencia") || !!localStorage.getItem("rm_licencia_dueno");
    return !hayLocal; // true = hay que buscar, false = ya tenemos sesión
  });
  const _srLic = (() => {
    try {
      const d = JSON.parse(localStorage.getItem("rm_licencia_dueno")||"null");
      if(d) return d;
      const r = JSON.parse(localStorage.getItem("rm_licencia")||"null");
      if(r && r.rol === "dueño") return r; // dueño guardado en rm_licencia (compatibilidad)
      return null;
    } catch { return null; }
  })();
  const [fase, setFase] = React.useState(()=>(!_srLic||!_srLic.activado)?"activacion":"pin");
  const [temaElegido, setTemaElegido] = React.useState(()=>!!localStorage.getItem("rm_tema"));

  // ── Recuperar sesión de repartidor desde Firebase si se borró el caché ──
  React.useEffect(()=>{
    if(!buscandoSesion) return; // ya tenía sesión local, no buscar
    const deviceId = localStorage.getItem("sr_device_id");
    if(!deviceId || !window.db){ setBuscandoSesion(false); return; }
    // ▶ Buscar en subcolección: negocios/{negocioId}/repartidores/
    window.db.collectionGroup("repartidores")
      .where("deviceId","==",deviceId)
      .where("activado","==",true)
      .limit(1)
      .get()
      .then(snap=>{
        if(!snap.empty){
          const d = snap.docs[0].data();
          const perfil = {
            rol:"repartidor", negocioId:d.negocioId,
            nombre:d.nombre||"Repartidor", sectores:d.sectores||[],
            deviceId, codigo:snap.docs[0].id, activado:true
          };
          localStorage.setItem("rm_licencia", JSON.stringify(perfil));
          setPerfilRecuperado(perfil);
        }
        setBuscandoSesion(false);
      })
      .catch(()=>setBuscandoSesion(false));
  },[]);

  const handleActivado = (lic) => {
    if(lic.rol === "repartidor") {
      localStorage.setItem("rm_licencia", JSON.stringify({...lic, activado:true}));
      window.location.reload();
    } else {
      setFase("pin");
    }
  };

  // ── PASO 1: Repartidor desde localStorage ─────────────────────────
  const _rmLic = (() => { try { return JSON.parse(localStorage.getItem("rm_licencia")||"null"); } catch { return null; } })();
  if(_rmLic && _rmLic.activado && _rmLic.rol === "repartidor") {
    return <AppRepartidorWrapper uid={_rmLic.deviceId} perfil={_rmLic}
      onSalir={()=>{ localStorage.removeItem("rm_licencia"); window.location.reload(); }} />;
  }

  // ── PASO 1b: Buscando sesión en Firebase ──────────────────────────
  if(buscandoSesion) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:"var(--color-background-primary)"}}>
      <div style={{fontSize:36}}>💧</div>
      <div style={{fontSize:14,color:"var(--color-text-secondary)"}}>Verificando sesión...</div>
    </div>
  );

  // ── PASO 1c: Sesión recuperada de Firebase ────────────────────────
  if(perfilRecuperado && perfilRecuperado.rol==="repartidor") {
    return <AppRepartidorWrapper uid={perfilRecuperado.deviceId} perfil={perfilRecuperado}
      onSalir={()=>{ localStorage.removeItem("rm_licencia"); window.location.reload(); }} />;
  }

  // ── PASO 2: Dueño — flujo normal ─────────────────────────────────
  if(fase === "activacion") return <PantallaActivacionRM onActivado={handleActivado} />;
  if(fase === "pin")        return <PantallaPin pin={_srLic?.pin} onOk={()=>setFase("app")} />;
  if(!temaElegido)          return <PantallaElegirTema onElegido={(id)=>{ localStorage.setItem("rm_tema",JSON.stringify(id)); aplicarTema(id); setTemaElegido(true); }} />;
  if(!_srLic)               return <PantallaActivacionRM onActivado={handleActivado} />;
  return <AppPrincipal uid={_srLic.deviceId||_srLic.negocioId} email={_srLic.email} perfil={_srLic} />;
}


function AppPrincipal({uid, email: emailProp, perfil}) {
  const negocioId = perfil?.negocioId || uid;
  const [operandoReparto, setOperandoReparto] = React.useState(null);
  const [tabConfig, setTabConfig] = React.useState("stock");
  const [modalResumenDia, setModalResumenDia] = React.useState(null);
  const [tabMenu, setTabMenu] = React.useState("repartos");
  const [pantalla, setPantalla]   = useState(()=>{
    const h = window.location.hash.slice(1)||"portada";
    const needsDia = ["diaPrincipal","selectorFechaClientes","selectorFechaPlanilla","inicioReparto","clientes","detalleCliente","venta","planilla"]; // historial does NOT need dia
    const savedDia = (() => { try { return JSON.parse(localStorage.getItem("rm_dia_actual")||'""'); } catch{ return ""; } })();
    if(needsDia.includes(h) && !savedDia) return "portada";
    return h;
  });
  const [diaActual, setDiaActual]   = useLS("rm_dia_actual", "");
  const [repartos, setRepartos]     = useLS("rm_repartos_v1", []);
  const [repartoActual, setRepartoActual] = useLS("rm_reparto_actual_v1", null);
  // repartos: [{id, numero, nombre, repartidorNombre, codigo}]
  const repartidoresUnicos = React.useMemo(() =>
    [...new Set((repartos||[]).map(r=>r.repartidorNombre).filter(Boolean))].map(nombre=>({nombre})),
    [repartos]
  );
  const saveRepartos = (v) => {
    setRepartos(v);
    syncData({repartos:v});
    // Sincronizar en licencias del dueño para que los repartidores puedan activar
    if(typeof sincronizarInvitaciones === "function"){
      sincronizarInvitaciones(v, negocioId, perfil?.codigo).catch(()=>{});
    }
  };
  // Reset diaActual when it's invalid
  React.useEffect(()=>{
    if(diaActual && !DIAS.includes(diaActual)) setDiaActual("");
  },[]);
  const [fechaActual, setFechaActual] = useLS("rm_fecha_actual", ""); // ISO date key YYYY-MM-DD
  const [fechaObj, setFechaObj]   = useState(null);
  const [clienteId, setClienteId] = useState(null);
  const [initCierre, setInitCierre] = useState(false);
  const [noVisitas, setNoVisitas] = useLS("rm_novisitas_v1", []);
  const [prospectos, setProspectos] = useLS("rm_prospectos_v1", []);
  const [recordatorios, setRecordatorios] = useLS("rm_recordatorios_v1", []);
  // recordatorio: {id, clienteId, clienteNombre, fecha, hora, motivo, dia, confirmado}
  const saveRecordatorios = (r) => { setRecordatorios(r); syncData({recordatorios:r}); };
  const recordatoriosActivos = (recordatorios||[]).filter(r=>!r.confirmado); // [{clienteId,dia,fecha,motivo}]
  const [clientes, setClientes]   = useLS("rm_clientes_v3", CLIENTES_INICIALES);
  const [ventasRaw, setVentasRaw] = useLS("rm_ventas_v3", []);
  const normalizarFechaKey = (v) => {
    if(v.fechaKey) return v;
    const fk = v.fecha ? (()=>{
      const parts = v.fecha.split('/');
      if(parts.length>=3){
        const d=parts[0].trim(),m=parts[1].trim(),y=parts[2].split(',')[0].trim();
        if(y.length===4) return y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0');
      }
      return '';
    })() : '';
    return {...v, fechaKey:fk};
  };
  const ventas = React.useMemo(()=>(ventasRaw||[]).map(normalizarFechaKey),[ventasRaw]);
  const setVentas = (arg) => setVentasRaw(typeof arg==='function' ? prev=>arg(prev) : arg);
  const [productos, setProductos] = useLS("rm_productos_v3", PRODUCTOS_INICIALES);
  const normStock = (s) => {
    const e = () => ({sifon:0,bidon10:0,bidon20:0,dispenser:0});
    const pick = (o) => { const r={sifon:0,bidon10:0,bidon20:0,dispenser:0}; if(o&&typeof o==="object"){ for(const k in o){ r[k]=Math.max(0,Math.round(Number(o[k])||0)); } } return r; };
    const base = {soderia:e(),soderia_vacios:e(),casa:e(),camion:e()};
    if(!s||typeof s!=="object") return base;
    if(s.soderia&&typeof s.soderia==="object") {
      return {
        soderia:    pick(s.soderia),
        soderia_vacios: pick(s.soderia_vacios),
        casa:       pick(s.casa),
        camion:     pick(s.camion),
      };
    }
    return {soderia:pick(s), soderia_vacios:e(), casa:e(), camion:e()};
  };
  const [stockRaw, setStockRaw] = useLS("rm_stock_v4", {soderia:{sifon:0,bidon10:0,bidon20:0,dispenser:0},soderia_vacios:{sifon:0,bidon10:0,bidon20:0,dispenser:0},casa:{sifon:0,bidon10:0,bidon20:0,dispenser:0},camion:{sifon:0,bidon10:0,bidon20:0,dispenser:0}});
  const stockNorm = React.useMemo(()=>normStock(stockRaw), [JSON.stringify(stockRaw)]);
  const setStock = (sOrFn) => {
    if(typeof sOrFn === "function") {
      setStockRaw(prev => normStock(sOrFn(normStock(prev))));
    } else {
      setStockRaw(normStock(sOrFn));
    }
  };
  // Auto-migrate old stock format on first load
  React.useEffect(()=>{
    // Force normalize stock on every mount
    const normalized = normStock(stockRaw);
    if(JSON.stringify(normalized) !== JSON.stringify(stockRaw)) setStockRaw(normalized);
  },[]);
  // Helper: transferir del camión a sodería al cerrar el día
  const cerrarCamion = (sobrLlenos, vacios) => {
    setStock(prev=>{
      const s = JSON.parse(JSON.stringify(normStock(prev)));
      ["sifon","bidon10","bidon20","dispenser"].forEach(k=>{
        s.soderia[k]    = (s.soderia[k]||0) + (sobrLlenos[k]||0);
        s.soderia_vacios[k] = (s.soderia_vacios[k]||0) + (vacios[k]||0);
        s.camion[k]  = Math.max(0, (s.camion[k]||0) - (sobrLlenos[k]||0) - (vacios[k]||0));
      });
      syncData({stock:s});
      return s;
    });
  };
  const [planillas, setPlanillas] = useLS("rm_planillas_v1", {});
  // Firebase — credentials embedded in SDK config above
  const apiKey = "firebase";
  const binId  = "firebase";
  const [syncStatus, setSyncStatus] = useState("idle");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOfflineSync, setPendingOfflineSync] = useState(
    ()=>!!localStorage.getItem("sr_offline_pending")
  );
  const [cloudSetup, setCloudSetup] = useState(false);
  const [zonasReparto, setZonasReparto] = useLS("rm_zonas_v1", {});
  const [scaleIdx, setScaleIdx]   = useLS("rm_scale_v1", 1); // 0=S 1=M 2=L 3=XL
  const SCALES = [0.82, 1.0, 1.18, 1.36];
  const SCALE_LABELS = ["S","M","L","XL"];


  // Al iniciar, si hay credenciales guardadas, cargar datos de la nube
  const { useEffect } = React;
  useEffect(() => {
    if (!apiKey || !binId) return;
    setSyncStatus("saving");
    setSyncStatus("loading");
    cloudLoad(uid, negocioId).then(function(data) {
      if(!data) { setSyncStatus("idle"); return; }
      if (data.clientes?.length)   setClientes(data.clientes);
      if (data.ventas?.length)     {
        // Merge: no pisar ventas locales más nuevas que Firebase
        // ── MERGE INTELIGENTE: por cada venta, quedarse con la versión MÁS NUEVA ──
        // Compara el sello _upd. En empate (o datos viejos sin sello) prioriza la transferencia confirmada.
        const ventasLocales=(()=>{try{return JSON.parse(localStorage.getItem("rm_ventas_v3")||"[]");}catch{return[];}})();
        const porId={}; (data.ventas||[]).forEach(v=>{porId[v.id]=v;});
        let cambiosLocales=0;
        ventasLocales.forEach(v=>{
          const enNube=porId[v.id];
          if(!enNube){porId[v.id]=v;cambiosLocales++;return;}
          const uL=Number(v._upd)||0, uN=Number(enNube._upd)||0;
          const ganaLocal=(uL!==uN)?uL>uN:(!!v.transConfirmada&&!enNube.transConfirmada);
          if(ganaLocal){porId[v.id]=v;cambiosLocales++;}
        });
        const merged=Object.values(porId);
        setVentasRaw(merged);
        if(cambiosLocales>0){console.log("Merge: "+cambiosLocales+" ventas locales más nuevas, sincronizando");setTimeout(()=>syncData({ventas:merged}),2000);}
      }
      if (data.planillas)          setPlanillas(data.planillas);
      if (data.stock) {
        const ds = data.stock;
        const normStock = ds.soderia ? ds : {
          soderia:{sifon:ds.sifon||0,bidon10:ds.bidon10||0,bidon20:ds.bidon20||0},
          casa:   {sifon:0,bidon10:0,bidon20:0},
          camion: {sifon:0,bidon10:0,bidon20:0},
        };
        setStock(normStock);
      }
      if (data.productos?.length)  setProductos(data.productos);
      if (data.noVisitas?.length)  setNoVisitas(data.noVisitas);
      if (data.prospectos?.length) setProspectos(data.prospectos);
      if (data.recordatorios?.length) setRecordatorios(data.recordatorios);
      if (data.mantVeh?.length)    localStorage.setItem("rm_mant_vehiculo_v1", JSON.stringify(data.mantVeh));
      if (data.histPrecios?.length) localStorage.setItem("rm_lc_hist_precios", JSON.stringify(data.histPrecios));
      if (data.horaAvisoCierre)    localStorage.setItem("rm_hora_notif_cierre", data.horaAvisoCierre);
      if (data.horasAvisoTrans)    localStorage.setItem("rm_horas_notif_trans", JSON.stringify(data.horasAvisoTrans));
      if (data.diasAvisoMant)      localStorage.setItem("rm_dias_notif_mant", data.diasAvisoMant.join(','));
      if (data.zonasReparto && Object.keys(data.zonasReparto).length) setZonasReparto(data.zonasReparto);
      if (data.repartos?.length) { setRepartos(data.repartos); try{localStorage.setItem("rm_repartos_v1",JSON.stringify(data.repartos));}catch{} }
      // Refrescar logo desde licencia
      const lic = (() => { try { return JSON.parse(localStorage.getItem("rm_licencia_dueno")||"null"); } catch { return null; } })();
      if(lic?.codigo && window.dbLicencias) {
        window.dbLicencias.collection("licencias").doc(lic.codigo).get().then(doc=>{
          if(doc.exists) {
            const d = doc.data();
            if(d.logo !== undefined && d.logo !== lic.logo) {
              lic.logo = d.logo;
              localStorage.setItem("rm_licencia_dueno", JSON.stringify(lic));
            }
          }
        }).catch(()=>{});
      }
      setSyncStatus("saved");
      setTimeout(()=>setSyncStatus("idle"), 2000);
    });

    // Refrescar ventas del repartidor cada 60 segundos automáticamente
    const _refreshInterval = setInterval(()=>{
      cloudLoad(uid, negocioId).then(function(data){
        if(!data) return;
        if(data.ventas?.length) setVentasRaw(v => {
          // Merge: agregar ventas nuevas del repartidor sin perder las del dueño
          const ids = new Set(v.map(x=>x.id));
          const nuevas = data.ventas.filter(x=>!ids.has(x.id));
          if(!nuevas.length) return v;
          return [...v, ...nuevas];
        });
        if(data.clientes?.length) setClientes(data.clientes);
        if(data.planillas) setPlanillas(p=>({...data.planillas,...p}));
      }).catch(()=>{});
    }, 60000);
    return ()=>clearInterval(_refreshInterval);
  }, []);

  // Ref siempre actualizado — evita datos viejos en el debounce
  const estadoRef = React.useRef({clientes,ventas,planillas,stock:stockNorm,productos,noVisitas,recordatorios,prospectos});
  React.useEffect(()=>{ estadoRef.current={clientes,ventas,planillas,stock:stockNorm,productos,noVisitas,recordatorios,prospectos,zonasReparto,repartos}; });

  // Respaldo COMPLETO descargable + restaurar (solo dueño)
  React.useEffect(()=>{
    window._descargarRespaldo = () => {
      const mantVeh = (()=>{ try { return JSON.parse(localStorage.getItem("rm_mant_vehiculo_v1")||"[]"); } catch { return []; } })();
      const data = { ...estadoRef.current, mantVeh, _respaldo:true, _app:"reparto-multi", _fecha:new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fkk = new Date().toLocaleDateString("es-AR").replace(/\//g,"-");
      a.href = url; a.download = `respaldo-completo_reparto_${fkk}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    };
    window._restaurarRespaldo = (data) => {
      if(!data || typeof data!=="object"){ alert("El archivo no es un respaldo válido."); return false; }
      try {
        if(data.clientes!==undefined) setClientes(data.clientes||[]);
        if(data.ventas!==undefined) setVentasRaw(data.ventas||[]);
        if(data.planillas!==undefined) setPlanillas(data.planillas||{});
        if(data.stock) setStock(normStock(data.stock));
        if(data.productos!==undefined) setProductos(data.productos||[]);
        if(data.noVisitas!==undefined) setNoVisitas(data.noVisitas||[]);
        if(data.prospectos!==undefined) setProspectos(data.prospectos||[]);
        if(data.recordatorios!==undefined) setRecordatorios(data.recordatorios||[]);
        if(data.mantVeh!==undefined){ try{localStorage.setItem("rm_mant_vehiculo_v1",JSON.stringify(data.mantVeh||[]));}catch{} }
        try { syncData({clientes:data.clientes,ventas:data.ventas,planillas:data.planillas,productos:data.productos,noVisitas:data.noVisitas,prospectos:data.prospectos,recordatorios:data.recordatorios}); } catch{}
        return true;
      } catch(e){ alert("Error al restaurar: "+e.message); return false; }
    };
    return ()=>{ delete window._descargarRespaldo; delete window._restaurarRespaldo; };
  }, []);

  // Auto backup DIARIO a localStorage
  React.useEffect(()=>{
    const ultimoBackup = localStorage.getItem("rm_lc_ultimo_backup");
    const hoy = new Date().toLocaleDateString("en-CA");
    if(ultimoBackup===hoy) return; // ya se hizo hoy
    try {
      localStorage.setItem("rm_lc_backup_"+hoy, JSON.stringify({clientes,ventas,planillas}));
      localStorage.setItem("rm_lc_ultimo_backup", hoy);
      // Mantener solo los últimos 7 backups
      const keys = Object.keys(localStorage).filter(k=>k.startsWith("rm_lc_backup_")).sort().reverse();
      keys.slice(7).forEach(k=>localStorage.removeItem(k));
      console.log("Auto-backup diario guardado:", hoy);
    } catch(e){ console.warn("Auto-backup falló:", e); }
  },[]);

  const syncData = (overrides={}) => {
    if(!window.db) return;
    setSyncStatus("saving");
    const mantVehActual = (() => { try { return JSON.parse(localStorage.getItem("rm_mant_vehiculo_v1")||"[]"); } catch { return []; } })();
    const histPreciosActual = (() => { try { return JSON.parse(localStorage.getItem("rm_lc_hist_precios")||"[]"); } catch { return []; } })();
    const data = { ...estadoRef.current, ...overrides, noVisitas: overrides.noVisitas!==undefined ? overrides.noVisitas : (estadoRef.current.noVisitas||[]), prospectos: overrides.prospectos!==undefined ? overrides.prospectos : (estadoRef.current.prospectos||[]), recordatorios: overrides.recordatorios!==undefined ? overrides.recordatorios : (estadoRef.current.recordatorios||[]), mantVeh: overrides.mantVeh||mantVehActual, histPrecios: overrides.histPrecios||histPreciosActual, zonasReparto: overrides.zonasReparto||estadoRef.current.zonasReparto||{}, repartos: overrides.repartos||estadoRef.current.repartos||[], horaAvisoCierre: overrides.horaAvisoCierre || localStorage.getItem('rm_hora_notif_cierre') || '18:00', horasAvisoTrans: overrides.horasAvisoTrans || (()=>{try{return JSON.parse(localStorage.getItem('rm_horas_notif_trans')||'["13:00","19:00"]');}catch{return ['13:00','19:00'];}})(), diasAvisoMant: overrides.diasAvisoMant || (localStorage.getItem('rm_dias_notif_mant')||'3,2,1,0').split(',').map(n=>parseInt(n.trim(),10)).filter(n=>!isNaN(n)) };
    estadoRef.current = data;
    debounceSave(() => {
      if(!navigator.onLine) {
        // Sin red → guardar en cola local
        try { localStorage.setItem("sr_offline_pending", JSON.stringify(data)); } catch {}
        setPendingOfflineSync(true);
        setSyncStatus("offline_pending");
        return;
      }
      cloudSave(data, uid, negocioId).then(function(ok){
        if(ok){
          localStorage.removeItem("sr_offline_pending");
          setPendingOfflineSync(false);
          setSyncStatus("saved");
        } else {
          // Puede que Firestore esté cacheando (persistence activa) → guardar cola igual
          try { localStorage.setItem("sr_offline_pending", JSON.stringify(data)); } catch {}
          setPendingOfflineSync(true);
          setSyncStatus("offline_pending");
        }
      }).catch(function(){
        try { localStorage.setItem("sr_offline_pending", JSON.stringify(data)); } catch {}
        setPendingOfflineSync(true);
        setSyncStatus("offline_pending");
      });
    });
  };

  const saveClientes = (v) => { setClientes(v); syncData({clientes:v}); };
  const saveVentas   = (v) => { setVentasRaw(v);   syncData({ventas:v}); };
  const savePlanillasCloud = (v) => { setPlanillas(v); syncData({planillas:v}); };

  // Limpieza automática: partes-transferencia de pago mixto cuya venta principal ya no existe
  React.useEffect(()=>{
    const huerfanas = ventasRaw.filter(v=>v._esMixtoTrans && v._mixtoDe!==undefined && !ventasRaw.some(x=>x.id===v._mixtoDe));
    if(huerfanas.length>0){ const ids=new Set(huerfanas.map(v=>v.id)); setVentasRaw(ventasRaw.filter(v=>!ids.has(v.id))); }
  }, [ventasRaw]);


  // ── MODO OFFLINE ──────────────────────────────────────────────────
  React.useEffect(()=>{
    const goOnline  = () => {
      setIsOnline(true);
      // Al reconectar, si hay datos pendientes → intentar sync
      const pending = localStorage.getItem("sr_offline_pending");
      if(pending) {
        setSyncStatus("saving");
        try {
          const data = JSON.parse(pending);
          cloudSave(data, uid, negocioId).then(ok=>{
            if(ok){
              localStorage.removeItem("sr_offline_pending");
              setPendingOfflineSync(false);
              setSyncStatus("saved");
              setTimeout(()=>setSyncStatus("idle"),2500);
            } else {
              setSyncStatus("error");
              setTimeout(()=>setSyncStatus("offline_pending"),3000);
            }
          }).catch(()=>{
            setSyncStatus("error");
            setTimeout(()=>setSyncStatus("offline_pending"),3000);
          });
        } catch { localStorage.removeItem("sr_offline_pending"); setPendingOfflineSync(false); }
      }
    };
    const goOffline = () => { setIsOnline(false); setSyncStatus("offline"); };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return ()=>{ window.removeEventListener("online",goOnline); window.removeEventListener("offline",goOffline); };
  },[]);

  // ── NOTIFICACIONES ─────────────────────────────────────────────────
  // Los avisos (cierre, mantenimiento, transferencias, agenda) los manda el
  // servidor (GitHub Actions) por push real — funciona con la app cerrada.
  // Acá solo pedimos permiso; la suscripción vive en index.html.
  React.useEffect(()=>{
    if(!("Notification" in window)) return;
    if(Notification.permission === "default") Notification.requestPermission();
  },[]);

  // ── INFORMES PDF ─────────────────────────────────────────────────
  const {enviarDiario, enviarSemanal, enviarMensual} = usarInformes({ventas,clientes,planillas,noVisitas:noVisitas||[],productos});

  const cerrarDia = async (fecha, dia, imgData) => {
    const key = `sr_informe_${fecha}_${dia}`;
    const envios = Number(localStorage.getItem(key)||0);
    if(envios>=3) return false; // máximo 3 envíos por día
    setSyncStatus("saving");
    const ok = await enviarDiario(fecha, dia, imgData);
    if(ok) {
      localStorage.setItem(key, String(envios+1));
      // Sábado → también enviar semanal (solo la primera vez)
      const d = new Date(fecha+"T12:00:00");
      if(d.getDay()===6 && !localStorage.getItem(`sr_informe_sem_${fecha}`)) {
        const okSem = await enviarSemanal(fecha);
        if(okSem) localStorage.setItem(`sr_informe_sem_${fecha}`,"1");
      }
      // Último día hábil del mes → también mensual (solo la primera vez)
      const manana = new Date(d); manana.setDate(d.getDate()+1);
      const esUltimoDiaHabil = manana.getMonth()!==d.getMonth() || (manana.getDay()===6&&manana.getDate()>25);
      if(esUltimoDiaHabil && !localStorage.getItem(`sr_informe_mes_${d.getFullYear()}_${d.getMonth()+1}`)) {
        const okMes = await enviarMensual(d.getMonth()+1, d.getFullYear());
        if(okMes) localStorage.setItem(`sr_informe_mes_${d.getFullYear()}_${d.getMonth()+1}`,"1");
      }
    }
    setSyncStatus(ok?"saved":"error");
    setTimeout(()=>setSyncStatus("idle"),3000);
    return ok;
  };
  const saveStock    = (v) => { setStock(v);    syncData({stock:v}); };
  const saveProductos= (v) => {
    // Registrar cambio de precio en historial
    const hoy = (()=>{ const d=new Date(); const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })();
    const histPrecios = JSON.parse(localStorage.getItem("rm_lc_hist_precios")||"[]");
    histPrecios.push({fecha:hoy, productos:v.map(p=>({nombre:p.nombre,precio:p.precio,costo:p.costo}))});
    localStorage.setItem("rm_lc_hist_precios", JSON.stringify(histPrecios.slice(-50)));
    setProductos(v); syncData({productos:v});
  };
  const [cargasDia, setCargasDia] = useLS("rm_cargas_dia_v1", CARGA_DIA_DEFAULT);
  const saveCargasDia = (v) => { setCargasDia(v); try{localStorage.setItem("rm_cargas_dia_v1",JSON.stringify(v));}catch{} };
  const saveNoVisitas= (v) => { setNoVisitas(v); try{localStorage.setItem("rm_novisitas_v1",JSON.stringify(v));}catch{} syncData({noVisitas:v}); };
  const saveProspectos=(v)=>{ setProspectos(v); try{localStorage.setItem("rm_prospectos_v1",JSON.stringify(v));}catch{} syncData({prospectos:v}); };

  const cliente = clientes.find(c=>c.id===clienteId)||null;
  const irA = (p) => {
    const needsDia = ["diaPrincipal","selectorFechaClientes","selectorFechaPlanilla","inicioReparto","clientes","detalleCliente","venta","planilla"]; // historial does NOT need dia
    if(needsDia.includes(p) && !diaActual) { setPantalla("menu"); window.history.pushState({pantalla:"menu"},'','#menu'); window.scrollTo(0,0); return; }
    setPantalla(p);
    window.scrollTo(0,0);
    window.history.pushState({pantalla:p},'',`#${p}`);
  };

  // Handle back button
  React.useEffect(()=>{
    const handler = (e)=>{
      const p = e.state?.pantalla || "portada";
      const needsDia = ["diaPrincipal","selectorFechaClientes","selectorFechaPlanilla","inicioReparto","clientes","detalleCliente","venta","planilla"]; // historial does NOT need dia
      if(needsDia.includes(p) && !diaActual) { setPantalla("menu"); return; }
      setPantalla(p);
      window.scrollTo(0,0);
    };
    window.addEventListener('popstate', handler);
    return ()=>window.removeEventListener('popstate', handler);
  },[]);

  const updateCliente = (id, cambios) => {
    const nueva = clientes.map(c=>c.id===id?{...c,...cambios}:c);
    saveClientes(nueva);
  };
  const savePlanilla = (dia, datos) => {
    const nueva = {...planillas,[dia]:datos};
    savePlanillasCloud(nueva);
  };
  const getPlanilla = (dia) => planillas[dia]||planillaDiaVacia();

  // Auto-guardado de planilla cuando todos los clientes del día tienen estado
  React.useEffect(()=>{
    if(!diaActual||!fechaActual) return;
    const clientesDia = clientes.filter(c=>c.dia===diaActual);
    if(clientesDia.length===0) return;
    const ventasDia   = ventas.filter(v=>v.dia===diaActual&&v.fechaKey===fechaActual);
    const noVisitasDia= (noVisitas||[]).filter(v=>v.dia===diaActual&&v.fecha===fechaActual);
    const atendidos   = new Set(ventasDia.filter(v=>!v._esCobro&&!v._esAjuste).map(v=>v.clienteId));
    const conEstado   = new Set([...atendidos,...noVisitasDia.map(v=>v.clienteId)]);
    const todosVisitados = clientesDia.every(c=>conEstado.has(c.id));
    if(!todosVisitados) return;
    // Calcular valores automáticos para la planilla
    const CAJON_SODA=6;
    const getProdCosto=(nombre)=>{const p=(productos||[]).find(x=>x.nombre===nombre);return p?(p.costo||0):0;};
    const costSifon=getProdCosto("Sifón 1.5L")||133.33;
    const costB10=getProdCosto("Bidón 10L")||800;
    const costB20=getProdCosto("Bidón 20L")||1100;
    const tots={b10:{vacios:0},b20:{vacios:0},soda:{vacios:0}};
    const prodKey={"Bidón 10L":"b10","Bidón 20L":"b20","Sifón 1.5L":"soda"};
    ventasDia.forEach(v=>v.detalle.forEach(d=>{const k=prodKey[d.nombre];if(k)tots[k].vacios+=d.cantidad;}));
    const sodaCajones=Math.floor(tots.soda.vacios/CAJON_SODA)||0;
    // Pago mixto: venta principal pago="contado" con montoEfec+montoTrans
    const cobEfectivo=ventasDia.filter(v=>v.pago==="contado"&&!v._esMixtoTrans).reduce((a,v)=>{
      const esMixto=(Number(v.montoTrans)||0)>0;
      return a+(esMixto?(Number(v.montoEfec)||0):(v.pagadoNum||v.neto||0));
    },0);
    const cobFiado=ventasDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
    const cobTransBruto=ventasDia.filter(v=>!v._esMixtoTrans).reduce((a,v)=>{
      if(v.pago==="transferencia") return a+(v.pagadoNum||v.neto||0);
      if(v.pago==="contado"&&(Number(v.montoTrans)||0)>0) return a+(Number(v.montoTrans)||0);
      return a;
    },0);
    const cobTransDesc=Math.round(cobTransBruto*0.025);
    const planillaKey=`${diaActual}_${fechaActual}`;
    const planillaActual=planillas[planillaKey]||planillaDiaVacia();
    // Solo auto-completar campos vacíos, nunca pisar lo que el usuario editó
    const nueva={
      ...planillaActual,
      fecha:planillaActual.fecha||fechaActual,
      efectivo:planillaActual.efectivo||(cobEfectivo>0?String(Math.round(cobEfectivo)):""),
      fiado:planillaActual.fiado||(cobFiado>0?String(Math.round(cobFiado)):""),
      retenciones:planillaActual.retenciones||(cobTransDesc>0?String(cobTransDesc):""),
      _autoGuardado:true,
    };
    // Solo guardar si cambió algo
    if(JSON.stringify(nueva)!==JSON.stringify(planillaActual)){
      savePlanilla(planillaKey, nueva);
    }
  }, [ventas, noVisitas, clientes, diaActual, fechaActual]);

  const registrarVenta = (detalle, pago, montoPagado, saldoAplicado, envPrest, envDev, obs, opcionSaldo, montoTrans2, saldoDeltaMixto, transConfirmadaInicial) => {
    const c = cliente;
    // Auto-detectar envases prestados (solo si no es cobro de deuda)
    const envAutoDetect = [];
    if(opcionSaldo!=="cobro_deuda" && opcionSaldo!=="cambio_envase") {
      const mapa = {sifon:"Sifón 1.5L", bidon10:"Bidón 10L", bidon20:"Bidón 20L"};
      detalle.forEach(d=>{
        const asignado = d.nombre==="Sifón 1.5L"?(c.sifon||0):d.nombre==="Bidón 10L"?(c.bidon10||0):d.nombre==="Bidón 20L"?(c.bidon20||0):0;
        const extra = d.cantidad - asignado;
        if(extra>0) envAutoDetect.push({prod:d.nombre, cant:String(extra)});
      });
    }
    const envPrestFinal = [...(envPrest||[]).filter(e=>e.prod&&e.cant), ...envAutoDetect.filter(e=>!(envPrest||[]).some(ep=>ep.prod===e.prod))];

    // Pago mixto: UNA sola venta con ambos montos
    const esMixto = opcionSaldo==="mixto_ef" || opcionSaldo==="mixto_tr";
    const pagoReal = esMixto?"mixto":pago;
    const ef = esMixto?(opcionSaldo==="mixto_ef"?Number(montoPagado):Number(montoTrans2||0)):0;
    const tr = esMixto?(opcionSaldo==="mixto_ef"?Number(montoTrans2||0):Number(montoPagado)):0;
    const totalMixto = esMixto ? ef+tr : 0;
    const montoFinalCalc = esMixto ? String(totalMixto) : montoPagado;
    const deudaCobrada = opcionSaldo==="todo"&&c.saldo<0 ? Math.abs(c.saldo) : 0;
    const obsDeuda = deudaCobrada>0 ? ` [Incluye deuda cobrada: $${deudaCobrada.toLocaleString("es-AR")}]` : "";
    const obsExtra = (esMixto&&totalMixto>0?` [Mixto: ef $${ef} + tr $${tr}]`:"") + obsDeuda;

    const calc = calcVenta(detalle, pagoReal, montoFinalCalc, saldoAplicado, productos);
    const nuevaVenta = {
      id:Date.now(), clienteId:c.id, cliente:c.nombre,
      dia:diaActual, fechaKey:fechaActual, fecha:new Date().toLocaleString("es-AR"),
      detalle, pago:pagoReal, obs:(obs||"")+obsExtra, saldoAplicado:saldoAplicado||0,
      envPrest:envPrestFinal,
      envDev:(envDev||[]).filter(e=>e.prod&&e.cant), ...calc,
      montoTrans:esMixto?tr:(montoTrans2||0),
      montoEfec:esMixto?ef:0,
      transConfirmada: !!transConfirmadaInicial,
      _upd:Date.now(),
      ...(opcionSaldo==="cambio_envase"?{_esCambio:true,neto:0,bruto:0,costo:0,ganancia:0}:{}),
    };

    // UNA sola venta — sin duplicar
    let nuevasVentas = [...ventas, nuevaVenta];
    let saldoExtra = calc.saldoDelta;

    saveVentas(nuevasVentas);
    const nuevosClientes = clientes.map(c2=>c2.id===c.id?{...c2,saldo:c.saldo+saldoExtra}:c2);
    saveClientes(nuevosClientes);
  };


  const renumerarTrasEliminar = (lista, clienteEliminado) => {
    const { dia, orden } = clienteEliminado;
    if(!orden) return lista;
    return lista.map(c =>
      c.dia === dia && (c.orden||0) > orden
        ? {...c, orden: c.orden - 1}
        : c
    );
  };
  const eliminarCliente = (clienteId) => {
    const eliminado = clientes.find(c=>c.id===clienteId);
    let nc = clientes.filter(c=>c.id!==clienteId);
    if(eliminado) nc = renumerarTrasEliminar(nc, eliminado);
    saveClientes(nc);
    const nv = ventas.filter(v=>v.clienteId!==clienteId);
    saveVentas(nv);
    irA("clientes");
  };

  const eliminarVenta = (ventaId) => {
    const v = ventas.find(x=>x.id===ventaId); if(!v) return;
    const eraMixta = (Number(v.montoTrans)||0)>0;
    let ajusteSaldoExtra = 0;
    let nv = ventas.filter(x=>{
      if(x.id===ventaId) return false;
      const ligada = x._esMixtoTrans && (
        x._mixtoDe===ventaId ||
        (x._mixtoDe===undefined && eraMixta && x.clienteId===v.clienteId && x.fechaKey===v.fechaKey)
      );
      if(ligada && (Number(x.saldoDelta)||0)!==0) ajusteSaldoExtra += Number(x.saldoDelta);
      return !ligada;
    });
    nv = nv.filter(x=>!(x._esMixtoTrans && x._mixtoDe!==undefined && !nv.some(y=>y.id===x._mixtoDe)));
    saveVentas(nv);
    const c = clientes.find(x=>x.id===v.clienteId);
    if(c){ const nc=clientes.map(x=>x.id===c.id?{...x,saldo:c.saldo-v.saldoDelta-ajusteSaldoExtra}:x); saveClientes(nc); }
  };

  const editarVenta = (ventaId, detalle, pago, montoPagado, saldoAplicado, obs, montoTrans2) => {
    const vV = ventas.find(v=>v.id===ventaId); if(!vV) return;
    const c  = clientes.find(x=>x.id===vV.clienteId);
    const esMixto = pago==="mixto";
    const ef = esMixto?(Number(montoPagado)||0):0;
    const tr = esMixto?(Number(montoTrans2)||0):0;
    // MIXTO (diseño Multi): UNA venta con pago "mixto" + montoEfec/montoTrans; cálculo con el total
    const calc = calcVenta(detalle, esMixto?"contado":pago, esMixto?String(ef+tr):montoPagado, saldoAplicado, productos);
    const obsLimpia = (obs||"").replace(/\s*\[Mixto:[^\]]*\]/g,"");
    const obsFinal  = esMixto ? obsLimpia+` [Mixto: ef $${ef} + tr $${tr}]` : obsLimpia;
    let nev = ventas.filter(v=>!(v._esMixtoTrans && v._mixtoDe===ventaId)); // limpiar restos de versiones viejas
    nev = nev.map(v=>v.id===ventaId?{...vV,detalle,pago:esMixto?"mixto":pago,obs:obsFinal,saldoAplicado:saldoAplicado||0,...calc,montoEfec:esMixto?ef:0,montoTrans:esMixto?tr:0,transConfirmada:esMixto?(vV.transConfirmada||false):vV.transConfirmada,_upd:Date.now()}:v);
    const saldoNuevo = c ? (c.saldo - vV.saldoDelta + calc.saldoDelta) : 0;
    saveVentas(nev);
    if(c) saveClientes(clientes.map(x=>x.id===c.id?{...x,saldo:saldoNuevo}:x));
  };

  return (
    <div style={{position:"relative"}}>
    {operandoReparto ? (
      <AppRepartidor uid={uid} perfil={{nombre:operandoReparto.repartidorNombre,codigo:operandoReparto.codigo,sectores:[],rol:"repartidor",negocioId}} onSalir={()=>setOperandoReparto(null)} />
    ) : (<>
    <div style={{position:"fixed",top:10,right:14,zIndex:9999,display:"flex",gap:6}}>
      <button onClick={()=>setScaleIdx(i=>(i+1)%4)} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Tamaño de texto">{SCALE_LABELS[scaleIdx]}</button>
    </div>
    <div style={{...s.app, zoom: SCALES[scaleIdx]}}>
      <SyncBar status={syncStatus} isOnline={isOnline} />
      {pantalla==="portada" && <Portada onIngresar={()=>irA("menu")} />}
      {pantalla==="menu" && <MenuRepartos
        negocioId={negocioId}
        repartos={repartos}
        clientes={clientes}
        ventas={ventas}
        recordatorios={recordatorios}
        onSeleccionar={(rep)=>{setRepartoActual(rep);irA("diasReparto");}}
        onConfig={(tab)=>{setTabConfig(tab||"stock");irA("config");}}
        onResumen={()=>irA("resumen")}
        onStock={()=>irA("stock")}
        onAgenda={()=>irA("agenda")}
        onVolver={()=>irA("portada")}
        saveRepartos={saveRepartos}
        onOperarReparto={(rep)=>setOperandoReparto(rep)}
        onTodosClientes={()=>irA("vistaClientesGeneral")}
        onImportarClientes={()=>irA("importarClientes")}
        onMapaClientes={()=>irA("mapaClientes")}
        tabInicial={tabMenu}
        onTabChange={setTabMenu}
        scaleIdx={scaleIdx}
        onToggleScale={()=>setScaleIdx(i=>(i+1)%4)}
        scaleLabel={SCALE_LABELS[scaleIdx]}
      />}
      {pantalla==="diasReparto" && !repartoActual && (()=>{ setTimeout(()=>irA("menu"),0); return null; })()}
      {pantalla==="diasReparto" && repartoActual && <MenuDias
        dias={DIAS}
        reparto={repartoActual}
        onDia={d=>{setDiaActual(d);irA("diaPrincipal");}}
        onResumen={()=>irA("resumen")}
        onConfig={()=>irA("config")}
        onGestionClientes={()=>irA("gestionClientes")}
        onPromocion={()=>irA("promocion")}
        onStock={()=>irA("stock")}
        onAgenda={()=>irA("agenda")}
        onVolver={()=>irA("menu")}
        scaleIdx={scaleIdx}
        onToggleScale={()=>setScaleIdx(i=>(i+1)%4)}
        scaleLabel={SCALE_LABELS[scaleIdx]}
        clientes={clientes.filter(c=>c.repartoId===repartoActual.id)}
        ventas={ventas.filter(v=>{const cl=clientes.find(c=>c.id===v.clienteId);return cl?.repartoId===repartoActual.id;})}
        stock={stockNorm}
        recordatoriosActivos={recordatoriosActivos}
        onConfirmarRecordatorio={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
        onVerConfirmaciones={(dia)=>{setDiaActual(dia);irA("confirmacionesDia");}}
        transferenciasPendientes={DIAS.map(dia=>{
          const clientesRep=clientes.filter(c=>c.repartoId===repartoActual.id);
          const vts=ventas.filter(v=>v.dia===dia&&(v.pago==="transferencia"||(v.pago==="mixto"&&(Number(v.montoTrans)||0)>0))&&!v.transConfirmada&&clientesRep.some(c=>c.id===v.clienteId));
          if(!vts.length) return null;
          const fechas=[...new Set(vts.map(v=>v.fechaKey))].sort().reverse();
          return {dia,fecha:fechas[0]||"",count:vts.length,monto:vts.reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.pagadoNum||v.neto||0)),0),ventas:vts};
        }).filter(Boolean)}
        zonasReparto={zonasReparto}
        onSetZona={(dia,zona)=>{const nz={...zonasReparto,[dia]:zona};setZonasReparto(nz);syncData({zonasReparto:nz});}}
        onDiaHoy={(dia,fechaKey)=>{setDiaActual(dia);setFechaActual(fechaKey);setFechaObj(new Date(fechaKey+"T12:00:00"));irA("inicioReparto");}}
        onDiaResumen={(dia,fechaKey)=>{setDiaActual(dia);setFechaActual(fechaKey);setFechaObj(new Date(fechaKey+"T12:00:00"));setInitCierre(!planillas[`${dia}_${fechaKey}`]?._diaCerrado);irA("planilla");}}
        noVisitas={noVisitas||[]}
        prospectos={prospectos||[]}
        onFiados={()=>irA("fiadosPendientes")} />}
      {pantalla==="confirmacionesDia" && <ConfirmacionesDia
          dia={diaActual}
          ventas={ventas.filter(v=>(v.pago==="transferencia"||v.pago==="mixto")&&!v.transConfirmada)}
          clientes={clientes}
          onConfirmar={(ventaId)=>{const nv=ventas.map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada,_upd:Date.now()}:v);saveVentas(nv);}}
          onVolver={()=>irA("menu")} />}
      {pantalla==="diaPrincipal"   && <DiaPrincipal dia={diaActual} onIrClientes={()=>irA("selectorFechaClientes")} onIrPlanilla={()=>irA("selectorFechaPlanilla")} onVolver={()=>irA("menu")} onVerConfirmaciones={()=>irA("confirmacionesDia")} ventasPendientesTransfer={ventas.filter(v=>v.dia===diaActual&&(v.pago==="transferencia"||(v.pago==="mixto"&&(Number(v.montoTrans)||0)>0))&&!v.transConfirmada).length} />}
      {pantalla==="selectorFechaPlanilla" && <SelectorFecha dia={diaActual} planillas={planillas} ventas={ventas} noVisitas={noVisitas} onSeleccionar={(fk,fo)=>{setFechaActual(fk);setFechaObj(fo);irA("planilla");}} onVolver={()=>irA("diaPrincipal")} />}
      {pantalla==="planilla"       && <PlanillaDelDia dia={diaActual} fecha={fechaActual} ventas={ventas.filter(v=>v.dia===diaActual&&v.fechaKey===fechaActual)} clientes={clientes} planilla={planillas[`${diaActual}_${fechaActual}`]||planillaDiaVacia()} productos={productos} stock={stockNorm} setStock={setStock} syncData={syncData} onGuardar={d=>{savePlanilla(`${diaActual}_${fechaActual}`,d);irA("planilla");}} onVolver={()=>irA("selectorFechaPlanilla")} onCerrarDia={(img)=>cerrarDia(fechaActual,diaActual,img)} initCierre={initCierre} prospectos={prospectos||[]} noVisitas={noVisitas||[]} />}
      {pantalla==="selectorFechaClientes" && <SelectorFecha dia={diaActual} planillas={planillas} ventas={ventas} noVisitas={noVisitas} onSeleccionar={(fk,fo)=>{setFechaActual(fk);setFechaObj(fo);irA("inicioReparto");}} onVolver={()=>irA("diaPrincipal")} />}
      {pantalla==="inicioReparto"  && <InicioReparto dia={diaActual} fecha={fechaActual} planilla={planillas[`${diaActual}_${fechaActual}`]||planillaDiaVacia()} productos={productos} cargasDia={cargasDia} stock={stockNorm}
        onGuardar={(p,descontar)=>{
          savePlanilla(`${diaActual}_${fechaActual}`,p);
          if(descontar){
            const s=JSON.parse(JSON.stringify(normStock(stockNorm)));
            const soda=Number(p.productos?.soda?.llenos||0);
            const b10=Number(p.productos?.b10?.llenos||0);
            const b20=Number(p.productos?.b20?.llenos||0);
            s.soderia.sifon  =Math.max(0,(s.soderia.sifon||0)-soda);
            s.soderia.bidon10=Math.max(0,(s.soderia.bidon10||0)-b10);
            s.soderia.bidon20=Math.max(0,(s.soderia.bidon20||0)-b20);
            s.camion.sifon   =(s.camion.sifon||0)+soda;
            s.camion.bidon10 =(s.camion.bidon10||0)+b10;
            s.camion.bidon20 =(s.camion.bidon20||0)+b20;
            setStock(normStock(s));
            syncData({stock:normStock(s)});
          }
          irA("clientes");
        }} onVolver={()=>irA("selectorFechaClientes")} />}
      {pantalla==="clientes"       && <ListaClientes clientes={clientes.filter(c=>c.dia===diaActual&&(!repartoActual||c.repartoId===repartoActual.id))} dia={diaActual} fecha={fechaActual} ventas={ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual)} todasVentas={ventas} noVisitas={(noVisitas||[]).filter(v=>v.dia===diaActual&&v.fecha===fechaActual)} onEditarCliente={(id,cambios)=>updateCliente(id,cambios)} onSeleccionar={c=>{setClienteId(c.id);irA("detalleCliente");}} onNuevoCliente={()=>irA("nuevoCliente")} onVolver={()=>irA("selectorFechaClientes")} onReordenar={lista=>{
          const otros=clientes.filter(c=>c.dia!==diaActual);
          saveClientes([...otros,...lista]);
        }} onRegistrarNoVisita={(clienteId,motivo)=>{const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId,dia:diaActual,fecha:fechaActual,motivo}];saveNoVisitas(nv);}} onQuitarNoVisita={(clienteId)=>{const nv=(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual));saveNoVisitas(nv);}}
        onConfirmarTransfer={(clienteId,ventaId)=>{
          const nv=ventas.map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada,_upd:Date.now()}:v);
          saveVentas(nv);
        }}
        prospectos={(prospectos||[]).filter(p=>p.dia===diaActual&&p.estado==="activo")}
        recordatorios={recordatorios}
        onVentaProspecto={(p)=>{
          if(!clientes.find(c=>c.id===p.id)){
            saveClientes([...clientes,{...p,saldo:0,_esProspecto:true}]);
          }
          setClienteId(p.id);
          irA("venta");
        }}
        onNoEstaProspecto={(id)=>{
          const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===id&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId:id,dia:diaActual,fecha:fechaActual,motivo:"noesta"}];
          saveNoVisitas(nv);
        }}
        onVerProspecto={(p)=>{
          if(!clientes.find(c=>c.id===p.id)){
            saveClientes([...clientes,{...p,saldo:p.saldo||0,_esProspecto:true}]);
          }
          setClienteId(p.id);
          irA("detalleCliente");
        }}
        onIrPlanilla={()=>{ setInitCierre(!planillas[`${diaActual}_${fechaActual}`]?._diaCerrado); irA("planilla"); }}
        onIrMenu={()=>irA("menu")}
        onAbrirMapa={()=>irA("mapaClientes")}
        />}
      {pantalla==="detalleCliente" && cliente && <DetalleCliente cliente={cliente} ventas={ventas.filter(v=>v.clienteId===cliente.id)} dia={diaActual} fecha={fechaActual} productos={productos} onVenta={()=>irA("venta")} onVolver={()=>irA("clientes")} onEditar={cambios=>updateCliente(cliente.id,cambios)} onEliminarVenta={eliminarVenta} onEditarVenta={editarVenta} onEliminarCliente={()=>eliminarCliente(cliente.id)}
          onNoEstaCliente={()=>{
            const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===cliente.id&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId:cliente.id,dia:diaActual,fecha:fechaActual,motivo:"noesta"}];
            saveNoVisitas(nv);
            const clientesDia=clientes.filter(c=>c.dia===diaActual).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
            const ventasIds=new Set(ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId));
            const noVMap={};nv.filter(v=>v.dia===diaActual&&v.fecha===fechaActual).forEach(v=>{noVMap[v.clienteId]=v.motivo;});
            const terminados=new Set(clientesDia.filter(c=>ventasIds.has(c.id)||noVMap[c.id]==="noquiso"||noVMap[c.id]==="noesta2").map(c=>c.id));
            const normalPend=clientesDia.filter(c=>!terminados.has(c.id)&&noVMap[c.id]!=="noesta"&&c.id!==cliente.id);
            const noestaPend=clientesDia.filter(c=>noVMap[c.id]==="noesta"&&!terminados.has(c.id)&&c.id!==cliente.id);
            const sig=normalPend[0]||noestaPend[0];
            if(sig){setClienteId(sig.id);irA("detalleCliente");}else irA("clientes");
          }}
          onNoQuiereCliente={()=>{
            const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===cliente.id&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId:cliente.id,dia:diaActual,fecha:fechaActual,motivo:"noquiso"}];
            saveNoVisitas(nv);
            const clientesDia=clientes.filter(c=>c.dia===diaActual).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
            const ventasIds=new Set(ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId));
            const noVMap={};nv.filter(v=>v.dia===diaActual&&v.fecha===fechaActual).forEach(v=>{noVMap[v.clienteId]=v.motivo;});
            const terminados=new Set(clientesDia.filter(c=>ventasIds.has(c.id)||noVMap[c.id]==="noquiso"||noVMap[c.id]==="noesta2").map(c=>c.id));
            const normalPend=clientesDia.filter(c=>!terminados.has(c.id)&&noVMap[c.id]!=="noesta"&&c.id!==cliente.id);
            const noestaPend=clientesDia.filter(c=>noVMap[c.id]==="noesta"&&!terminados.has(c.id)&&c.id!==cliente.id);
            const sig=normalPend[0]||noestaPend[0];
            if(sig){setClienteId(sig.id);irA("detalleCliente");}else irA("clientes");
          }}
          recordatorios={recordatorios}
          onGuardarRecordatorio={(r)=>saveRecordatorios([...(recordatorios||[]),r])}
          onConfirmarRecordatorio={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
          onCobrarSaldo={(monto,pago)=>{
            const c=cliente;
            const det=[{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}];
            const calc=calcVenta(det,pago,String(monto),0,productos);
            const vt={id:Date.now(),clienteId:c.id,cliente:c.nombre,dia:diaActual,fechaKey:fechaActual,fecha:new Date().toLocaleString("es-AR"),
              detalle:det,pago,obs:`Cobro de deuda $${monto.toLocaleString("es-AR")} (${pago})`,saldoAplicado:0,
              neto:0,bruto:0,desc:0,costo:0,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],_esCobro:true,_upd:Date.now()};
            const nv=[...ventas,vt];
            saveVentas(nv);
            const nc=clientes.map(x=>x.id===c.id?{...x,saldo:(c.saldo||0)+monto}:x);
            saveClientes(nc);
          }}
          onGuardarCambio={(vt)=>{saveVentas([...ventas,vt]);}} />}
      {pantalla==="venta"          && cliente && <NuevaVenta key={clienteId} cliente={cliente} productos={productos} fecha={fechaActual} ventasCliente={ventas.filter(v=>v.clienteId===cliente.id)}
        progressData={(()=>{
          const clientesDia=clientes.filter(c=>c.dia===diaActual);
          const ventasHoy=ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste);
          const noVHoy=(noVisitas||[]).filter(v=>v.dia===diaActual&&v.fecha===fechaActual);
          const visitadosIds=new Set([...ventasHoy.map(v=>v.clienteId),...noVHoy.map(v=>v.clienteId)]);
          const montoHoy=ventasHoy.reduce((a,v)=>a+(v.neto||0),0);
          const sifs=ventasHoy.reduce((a,v)=>a+(v.detalle||[]).filter(d=>d.nombre==="Sifón 1.5L").reduce((b,d)=>b+d.cantidad,0),0);
          const b10=ventasHoy.reduce((a,v)=>a+(v.detalle||[]).filter(d=>d.nombre==="Bidón 10L").reduce((b,d)=>b+d.cantidad,0),0);
          const b20=ventasHoy.reduce((a,v)=>a+(v.detalle||[]).filter(d=>d.nombre==="Bidón 20L").reduce((b,d)=>b+d.cantidad,0),0);
          const planillaHoy=planillas[`${diaActual}_${fechaActual}`]||{};
          return {visitados:visitadosIds.size,total:clientesDia.length,montoHoy,stock:{"Sif":Math.max(0,(Number(planillaHoy.productos?.soda?.llenos)||0)-sifs),"10L":Math.max(0,(Number(planillaHoy.productos?.b10?.llenos)||0)-b10),"20L":Math.max(0,(Number(planillaHoy.productos?.b20?.llenos)||0)-b20)}};
        })()}
        onNoEsta={()=>{
          const prev=(noVisitas||[]).find(v=>v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual);
          const motivo=prev?.motivo==="noesta"?"noesta2":"noesta";
          const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId,dia:diaActual,fecha:fechaActual,motivo}];
          saveNoVisitas(nv);
          const clientesDia=clientes.filter(c=>c.dia===diaActual).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
          const visitadosIds=new Set([...ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId),...(nv).filter(v=>v.dia===diaActual&&v.fecha===fechaActual&&(v.motivo==="noquiso"||v.motivo==="noesta2"||v.motivo==="noesta")).map(v=>v.clienteId)]);
          visitadosIds.add(clienteId);
          const siguiente=clientesDia.find(c=>!visitadosIds.has(c.id)&&c.id!==clienteId);
          if(siguiente){setClienteId(siguiente.id);irA("venta");}else irA("clientes");
        }}
        onNoQuiere={()=>{
          const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId,dia:diaActual,fecha:fechaActual,motivo:"noquiso"}];
          saveNoVisitas(nv);
          const clientesDia=clientes.filter(c=>c.dia===diaActual).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
          const visitadosIds=new Set([...ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId),...nv.filter(v=>v.dia===diaActual&&v.fecha===fechaActual&&(v.motivo==="noquiso"||v.motivo==="noesta2"||v.motivo==="noesta")).map(v=>v.clienteId)]);
          visitadosIds.add(clienteId);
          const siguiente=clientesDia.find(c=>!visitadosIds.has(c.id)&&c.id!==clienteId);
          if(siguiente){setClienteId(siguiente.id);irA("venta");}else irA("clientes");
        }}
        onGuardar={(d,p,m,sa,ep,ed,obs,op,mt2,sd)=>{
  registrarVenta(d,p,m,sa,ep,ed,obs,op,mt2,sd);
  const clientesDia = clientes.filter(c=>c.dia===diaActual).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
  const visitadosIds = new Set([
    ...ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId),
    ...(noVisitas||[]).filter(v=>v.dia===diaActual&&v.fecha===fechaActual&&(v.motivo==="noquiso"||v.motivo==="noesta2"||v.motivo==="noesta"||v.motivo==="salteado")).map(v=>v.clienteId)
  ]);
  visitadosIds.add(clienteId);
  const siguiente = clientesDia.find(c=>!visitadosIds.has(c.id)&&c.id!==clienteId);
  if(siguiente){ setClienteId(siguiente.id); irA("venta"); }
  else irA("clientes");
}}
        onSaltar={()=>{
          const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual)),
            {clienteId,dia:diaActual,fecha:fechaActual,motivo:"salteado"}];
          saveNoVisitas(nv);
          const clientesDia=clientes.filter(c=>c.dia===diaActual&&(!repartoActual||c.repartoId===repartoActual.id)).sort((a,b)=>(a.orden||9999)-(b.orden||9999));
          const nvMap={};nv.filter(v=>v.dia===diaActual&&v.fecha===fechaActual).forEach(v=>{nvMap[v.clienteId]=v.motivo;});
          const terminados=new Set([
            ...ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual&&!v._esCobro&&!v._esAjuste).map(v=>v.clienteId),
            ...nv.filter(v=>v.dia===diaActual&&v.fecha===fechaActual&&(v.motivo==="noquiso"||v.motivo==="noesta2")).map(v=>v.clienteId)
          ]);
          const normalPend=clientesDia.filter(c=>!terminados.has(c.id)&&nvMap[c.id]!=="noesta"&&nvMap[c.id]!=="salteado"&&c.id!==clienteId);
          const noestaPend=clientesDia.filter(c=>nvMap[c.id]==="noesta"&&!terminados.has(c.id)&&c.id!==clienteId);
          const saltadosPend=clientesDia.filter(c=>nvMap[c.id]==="salteado"&&c.id!==clienteId);
          const sig=normalPend[0]||noestaPend[0]||saltadosPend[0];
          if(sig){setClienteId(sig.id);irA("venta");}else irA("clientes");
        }}
        onVolver={()=>irA("detalleCliente")} />}
      {pantalla==="nuevoCliente"   && <NuevoCliente diaActual={diaActual} repartoActual={repartoActual} onGuardar={(datos)=>{
          const orden=datos.orden;
          let base=clientes;
          if(orden&&clientes.some(c=>c.dia===datos.dia&&(c.orden||0)===Number(orden))){
            base=clientes.map(c=>c.dia===datos.dia&&(c.orden||0)>=Number(orden)?{...c,orden:(c.orden||0)+1}:c);
          }
          const nc=[...base,{...datos,id:Date.now(),saldo:0,dispenser:datos.dispenser||0,repartoId:repartoActual?.id||null}]
            .sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999));
          saveClientes(nc);irA("clientes");
        }} onVolver={()=>irA("clientes")} />}
      {pantalla==="historial" && <CargaHistorica clientes={clientes} productos={productos} onGuardar={(vts)=>{saveVentas([...ventas,...vts]);irA("menu");}} onVolver={()=>irA("menu")} />}
      {pantalla==="promocion"       && <Promocion prospectos={prospectos} clientes={clientes} onSave={saveProspectos} onConvertir={(p)=>{
        const nuevo={...p,id:Date.now(),saldo:0,sifon:0,bidon10:1,bidon20:0};
        saveClientes([...clientes,nuevo]);
        saveProspectos(prospectos.map(x=>x.id===p.id?{...x,estado:"convertido"}:x));
        irA("promocion");
      }} onVolver={()=>irA("menu")} />}
      {pantalla==="gestionClientes" && <GestionClientes clientes={clientes} repartos={repartos} repartoActual={repartoActual} onReordenarTodo={(lista)=>saveClientes(lista)} onEditar={(id,cambios)=>{saveClientes(clientes.map(c=>c.id===id?{...c,...cambios}:c));}} onEliminar={(id)=>{
        if(window.confirm("¿Eliminar cliente?")){
          const eliminado=clientes.find(c=>c.id===id);
          let nc=clientes.filter(c=>c.id!==id);
          if(eliminado) nc=renumerarTrasEliminar(nc,eliminado);
          saveClientes(nc);
        }}} onNuevo={(datos)=>{
        const orden = datos.orden;
        let nuevos;
        if(orden&&clientes.some(c=>c.dia===datos.dia&&c.orden===orden)){
          // Shift all clients with same day and order >= new order
          nuevos = clientes.map(c=>c.dia===datos.dia&&(c.orden||0)>=orden?{...c,orden:(c.orden||0)+1}:c);
        } else { nuevos = [...clientes]; }
        saveClientes([...nuevos,{...datos,id:Date.now(),saldo:0,dispenser:datos.dispenser||0}].sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999)));
      }} onVolver={()=>irA("menu")} onRegistrarVenta={(c)=>{
          setClienteId(c.id);
          // Asegurar que fechaActual esté seteado a hoy
          const hoyKey = new Date().toLocaleDateString("en-CA");
          if(!fechaActual) setFechaActual(hoyKey);
          // Si no hay diaActual, usar el día del cliente como fallback
          if(!diaActual) setDiaActual(c.dia);
          irA("venta");
        }} onVerDetalle={(c)=>{setClienteId(c.id);irA("detalleDesdeGestion");}} ventas={ventas} productos={productos} onGuardarCambio={(vt)=>{saveVentas([...ventas,vt]);}} />}
      {pantalla==="detalleDesdeGestion" && cliente && <DetalleCliente cliente={cliente} ventas={ventas.filter(v=>v.clienteId===cliente.id)} dia={diaActual||cliente.dia} fecha={fechaActual} productos={productos} onVenta={()=>{setDiaActual(cliente.dia);const hoy=new Date().toLocaleDateString("en-CA");if(!fechaActual)setFechaActual(hoy);irA("venta");}} onVolver={()=>irA("gestionClientes")} onEditar={cambios=>updateCliente(cliente.id,cambios)} onEliminarVenta={eliminarVenta} onEditarVenta={editarVenta} onEliminarCliente={()=>{eliminarCliente(cliente.id);irA("gestionClientes");}}
          onNoEstaCliente={()=>{}} onNoQuiereCliente={()=>{}}
          recordatorios={recordatorios} onGuardarRecordatorio={(r)=>saveRecordatorios([...(recordatorios||[]),r])} onConfirmarRecordatorio={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
          onCobrarSaldo={(monto,pago)=>{
            if(cliente){
              const saldoAntes=cliente.saldo||0;
              const saldoDespues=saldoAntes+monto;
              const det=[{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}];
              const fk=fechaActual||new Date().toLocaleDateString("en-CA");
              const vt={id:Date.now(),clienteId:cliente.id,cliente:cliente.nombre,
                dia:diaActual||cliente.dia,fechaKey:fk,fecha:new Date().toLocaleString("es-AR"),
                detalle:det,pago,obs:`Cobro de deuda $${monto.toLocaleString("es-AR")} (${pago})`,saldoAplicado:0,
                neto:0,bruto:0,desc:0,costo:0,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],
                saldoAntes,saldoDespues,_esCobro:true,_upd:Date.now()};
              saveVentas([...ventas,vt]);
              saveClientes(clientes.map(x=>x.id===cliente.id?{...x,saldo:saldoDespues}:x));
            }
          }}
          onGuardarCambio={(vt)=>{saveVentas([...ventas,vt]);}} />}
      {pantalla==="importarClientes" && <ImportarClientesExcel
        repartos={repartos}
        clientes={clientes}
        repartoPreseleccionado={repartoActual}
        onGuardar={(nuevos)=>{saveClientes([...clientes,...nuevos]);irA("menu");}}
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="mapaClientes" && <MapaClientes
        clientes={clientes}
        dia={diaActual}
        fecha={fechaActual}
        ventas={ventas}
        noVisitas={noVisitas}
        onSeleccionar={(c)=>{setClienteId(c.id);irA("detalleDesdeGestion");}}
        onActualizar={(nuevosClientes)=>saveClientes(nuevosClientes)}
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="vistaClientesGeneral" && <VistaClientesGeneral
        clientes={clientes}
        repartos={repartos}
        ventas={ventas}
        onVerDetalle={(c)=>{setClienteId(c.id);irA("detalleDesdeGestion");}}
        onAgenda={()=>irA("agenda")}
        onMapa={()=>irA("mapaClientes")}
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="agenda" && <AgendaScreen
        recordatorios={recordatorios||[]}
        clientes={clientes}
        repartidores={repartidoresUnicos}
        onConfirmar={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
        onEliminar={(id)=>saveRecordatorios((recordatorios||[]).filter(r=>r.id!==id))}
        onNuevo={(datos)=>{
          const c=clientes.find(x=>x.id===datos.clienteId);
          if(!c){alert("Seleccioná un cliente");return;}
          saveRecordatorios([...(recordatorios||[]),{...datos,id:Date.now(),clienteId:c.id,clienteNombre:c.nombre,dia:c.dia,confirmado:false,paraRepartidor:datos.paraRepartidor||null}]);
        }}
        onIrCliente={(cId)=>{
          const c=clientes.find(x=>x.id===cId);
          if(c){setClienteId(cId);setDiaActual(c.dia);irA("detalleCliente");}
        }}
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="stock"          && <StockGeneral stock={stockNorm} setStock={(ns)=>{setStock(ns);syncData({stock:ns});}} clientes={clientes} setClientes={saveClientes} ventas={ventas} productos={productos} setProductos={saveProductos} cargasDia={cargasDia} setCargasDia={saveCargasDia} planillas={planillas} onVolver={()=>irA("menu")} onResumen={()=>irA("resumen")} />}
      {pantalla==="fiadosPendientes" && <FiadosPendientes clientes={clientes} ventas={ventas} onEditarCliente={(id,cambios)=>updateCliente(id,cambios)} onCobrar={(cId,monto,pago)=>{
        const cl=clientes.find(c=>c.id===cId);if(!cl)return;
        const saldoAntes=cl.saldo||0;const saldoDespues=saldoAntes+monto;
        const vt={id:Date.now(),clienteId:cl.id,cliente:cl.nombre,dia:cl.dia,fechaKey:new Date().toLocaleDateString("en-CA"),fecha:new Date().toLocaleString("es-AR"),
          detalle:[{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}],pago,obs:`Cobro de deuda ${fmt(monto)} (${pago})`,
          neto:0,bruto:0,desc:0,costo:0,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],saldoAntes,saldoDespues,_esCobro:true,_upd:Date.now()};
        saveVentas([...ventas,vt]);saveClientes(clientes.map(c=>c.id===cId?{...c,saldo:saldoDespues}:c));
      }} onVolver={()=>irA("menu")} />}
      {pantalla==="resumen"        && <Resumen ventas={ventas} clientes={clientes} productos={productos} planillas={planillas} noVisitas={noVisitas||[]} onVolver={()=>irA("menu")} />}
      {pantalla==="config"         && <Config productos={productos} setProductos={saveProductos} clientes={clientes} setClientes={saveClientes} ventas={ventas} setVentas={saveVentas} planillas={planillas} setPlanillas={savePlanillasCloud} stock={stockNorm} setStock={(s)=>{const ns=normStock(s);setStockRaw(ns);syncData({stock:ns});}} cargasDia={cargasDia} setCargasDia={saveCargasDia} syncData={syncData} onVolver={()=>irA("menu")} negocioId={negocioId} tabInicial={tabConfig} repartos={repartos} repartoActual={repartoActual} />}
    </div>
    {/* fin del zoom */}
    </>)}{modalResumenDia&&(()=>{
        const {dia,fechaKey}=modalResumenDia;
        const vDia=ventas.filter(v=>v.fechaKey===fechaKey&&v.dia===dia&&!v._esCobro&&!v._esAjuste);
        const ef=vDia.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
        const tr=vDia.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
        const trP=tr-vDia.filter(v=>v.pago==="transferencia"&&v.transConfirmada).reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
        const fi=vDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
        return (
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--color-background-primary)",borderRadius:16,padding:24,width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:36}}>✅</div><div style={{fontSize:17,fontWeight:600,color:"var(--color-text-primary)"}}>Día completado</div><div style={{fontSize:12,color:"var(--color-text-tertiary)",textTransform:"capitalize"}}>{dia} · {new Date(fechaKey+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"long"})}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["💵 Efectivo",ef,"success"],["💳 Transferencias",tr,"info"],...(trP>0?[["  🔴 Pendientes",trP,"warning"]]:[]),["📋 Fiado nuevo",fi,"warning"]].map(([l,v,cl])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"var(--color-background-secondary)"}}>
                    <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{l}</span><span style={{fontSize:14,fontWeight:500,color:`var(--color-text-${cl})`}}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",borderRadius:8,background:"var(--color-background-tertiary)"}}>
                  <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Total del día</span>
                  <span style={{fontSize:17,fontWeight:700,color:"var(--color-text-success)"}}>{fmt(ef+tr+fi)}</span>
                </div>
              </div>
              <button style={{...s.btnPrimary}} onClick={()=>{setModalResumenDia(null);irA("planilla");}}>Ver planilla completa →</button>
              <button style={{...s.btn,textAlign:"center"}} onClick={()=>setModalResumenDia(null)}>Cerrar</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = {error:null}; }
  static getDerivedStateFromError(e) { return {error:e}; }
  componentDidCatch(e,info) { console.error("App error:", e, info); }
  render() {
    if(this.state.error) return (
      <div style={{padding:40,textAlign:"center",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0f1923"}}>
        <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:500,color:"#f07070",marginBottom:8}}>Algo salió mal</div>
        <div style={{fontSize:13,color:"#7a9ab8",marginBottom:20,maxWidth:300}}>{String(this.state.error.message||"Error desconocido")}</div>
        <button style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,cursor:"pointer"}}
          onClick={()=>{this.setState({error:null});window.location.hash="portada";}}>
          Reiniciar app
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── CONSTANTES DE SEGURIDAD ──────────────────────────────────────────────────

// ── Render raíz ──────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
