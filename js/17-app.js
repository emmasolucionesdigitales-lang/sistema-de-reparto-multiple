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
  const _srLic = (() => { try { return JSON.parse(localStorage.getItem("rm_licencia_dueno")||"null"); } catch { return null; } })();
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
    const savedDia = (() => { try { return JSON.parse(localStorage.getItem("cat_dia_actual")||'""'); } catch{ return ""; } })();
    if(needsDia.includes(h) && !savedDia) return "portada";
    return h;
  });
  const [diaActual, setDiaActual]   = useLS("cat_dia_actual", "");
  const [repartos, setRepartos]     = useLS("cat_repartos_v1", []);
  const [repartoActual, setRepartoActual] = useLS("cat_reparto_actual_v1", null);
  // repartos: [{id, numero, nombre, repartidorNombre, codigo}]
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
  const [fechaActual, setFechaActual] = useLS("cat_fecha_actual", ""); // ISO date key YYYY-MM-DD
  const [fechaObj, setFechaObj]   = useState(null);
  const [clienteId, setClienteId] = useState(null);
  const [initCierre, setInitCierre] = useState(false);
  const [noVisitas, setNoVisitas] = useLS("cat_novisitas_v1", []);
  const [prospectos, setProspectos] = useLS("cat_prospectos_v1", []);
  const [recordatorios, setRecordatorios] = useLS("cat_recordatorios_v1", []);
  // recordatorio: {id, clienteId, clienteNombre, fecha, hora, motivo, dia, confirmado}
  const saveRecordatorios = (r) => { setRecordatorios(r); syncData({recordatorios:r}); };
  const recordatoriosActivos = (recordatorios||[]).filter(r=>!r.confirmado); // [{clienteId,dia,fecha,motivo}]
  const [clientes, setClientes]   = useLS("cat_clientes_v3", CLIENTES_INICIALES);
  const [ventasRaw, setVentasRaw] = useLS("cat_ventas_v3", []);
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
  const [productos, setProductos] = useLS("cat_productos_v3", PRODUCTOS_INICIALES);
  const normStock = (s) => {
    const empty = {sifon:0,bidon10:0,bidon20:0};
    const base = {soderia:{...empty},soderia_vacios:{...empty},casa:{...empty},camion:{...empty}};
    if(!s||typeof s!=="object") return base;
    if(s.soderia&&typeof s.soderia==="object") {
      return {
        soderia:        {sifon:s.soderia?.sifon||0,bidon10:s.soderia?.bidon10||0,bidon20:s.soderia?.bidon20||0},
        soderia_vacios: {sifon:s.soderia_vacios?.sifon||0,bidon10:s.soderia_vacios?.bidon10||0,bidon20:s.soderia_vacios?.bidon20||0},
        casa:           {sifon:s.casa?.sifon||0,bidon10:s.casa?.bidon10||0,bidon20:s.casa?.bidon20||0},
        camion:         {sifon:s.camion?.sifon||0,bidon10:s.camion?.bidon10||0,bidon20:s.camion?.bidon20||0},
      };
    }
    // old format
    return {soderia:{sifon:s.sifon||0,bidon10:s.bidon10||0,bidon20:s.bidon20||0},soderia_vacios:{...empty},casa:{...empty},camion:{...empty}};
  };
  const [stockRaw, setStockRaw] = useLS("cat_stock_v4", {soderia:{sifon:0,bidon10:0,bidon20:0},casa:{sifon:0,bidon10:0,bidon20:0},camion:{sifon:0,bidon10:0,bidon20:0}});
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
      ["sifon","bidon10","bidon20"].forEach(k=>{
        s.soderia[k] = (s.soderia[k]||0) + (sobrLlenos[k]||0) + (vacios[k]||0);
        s.camion[k]  = Math.max(0, (s.camion[k]||0) - (sobrLlenos[k]||0));
      });
      syncData({stock:s});
      return s;
    });
  };
  const [planillas, setPlanillas] = useLS("cat_planillas_v1", {});
  // Firebase — credentials embedded in SDK config above
  const apiKey = "firebase";
  const binId  = "firebase";
  const [syncStatus, setSyncStatus] = useState("idle");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOfflineSync, setPendingOfflineSync] = useState(
    ()=>!!localStorage.getItem("sr_offline_pending")
  );
  const [cloudSetup, setCloudSetup] = useState(false);
  const [zonasReparto, setZonasReparto] = useLS("cat_zonas_v1", {});
  const [scaleIdx, setScaleIdx]   = useLS("cat_scale_v1", 1); // 0=S 1=M 2=L 3=XL
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
      if (data.ventas?.length)     setVentasRaw(data.ventas);
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
      if (data.mantVeh?.length)    localStorage.setItem("cat_mant_vehiculo_v1", JSON.stringify(data.mantVeh));
      if (data.histPrecios?.length) localStorage.setItem("lc_hist_precios", JSON.stringify(data.histPrecios));
      if (data.zonasReparto && Object.keys(data.zonasReparto).length) setZonasReparto(data.zonasReparto);
      if (data.repartos?.length) { setRepartos(data.repartos); try{localStorage.setItem("cat_repartos_v1",JSON.stringify(data.repartos));}catch{} }
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
  }, []);

  // Ref siempre actualizado — evita datos viejos en el debounce
  const estadoRef = React.useRef({clientes,ventas,planillas,stock:stockNorm,productos,noVisitas,recordatorios,prospectos});
  React.useEffect(()=>{ estadoRef.current={clientes,ventas,planillas,stock:stockNorm,productos,noVisitas,recordatorios,prospectos,zonasReparto,repartos}; });

  // Auto backup DIARIO a localStorage
  React.useEffect(()=>{
    const ultimoBackup = localStorage.getItem("lc_ultimo_backup");
    const hoy = new Date().toISOString().slice(0,10);
    if(ultimoBackup===hoy) return; // ya se hizo hoy
    try {
      localStorage.setItem("lc_backup_"+hoy, JSON.stringify({clientes,ventas,planillas}));
      localStorage.setItem("lc_ultimo_backup", hoy);
      // Mantener solo los últimos 7 backups
      const keys = Object.keys(localStorage).filter(k=>k.startsWith("lc_backup_")).sort().reverse();
      keys.slice(7).forEach(k=>localStorage.removeItem(k));
      console.log("Auto-backup diario guardado:", hoy);
    } catch(e){ console.warn("Auto-backup falló:", e); }
  },[]);

  const syncData = (overrides={}) => {
    if(!window.db) return;
    setSyncStatus("saving");
    const mantVehActual = (() => { try { return JSON.parse(localStorage.getItem("cat_mant_vehiculo_v1")||"[]"); } catch { return []; } })();
    const histPreciosActual = (() => { try { return JSON.parse(localStorage.getItem("lc_hist_precios")||"[]"); } catch { return []; } })();
    const data = { ...estadoRef.current, ...overrides, noVisitas: estadoRef.current.noVisitas||[], prospectos: overrides.prospectos!==undefined ? overrides.prospectos : (estadoRef.current.prospectos||[]), recordatorios: estadoRef.current.recordatorios||[], mantVeh: overrides.mantVeh||mantVehActual, histPrecios: overrides.histPrecios||histPreciosActual, zonasReparto: overrides.zonasReparto||estadoRef.current.zonasReparto||{}, repartos: overrides.repartos||estadoRef.current.repartos||[] };
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
  React.useEffect(()=>{
    if(!("Notification" in window)) return;

    const pedirPermiso = async () => {
      if(Notification.permission === "default") {
        await Notification.requestPermission();
      }
    };
    pedirPermiso();

    // —— Notificación 1: Recordatorio cierre del día a las 18:00 ——
    const programar18hs = () => {
      const ahora = new Date();
      const hoy18 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 18, 0, 0);
      let msHasta18 = hoy18 - ahora;
      if(msHasta18 < 0) msHasta18 += 24*60*60*1000; // ya pasó → mañana
      return setTimeout(()=>{
        if(Notification.permission === "granted"){
          const hoyKey = new Date().toISOString().slice(0,10);
          const yaEnviado = localStorage.getItem(`notif_cierre_${hoyKey}`);
          if(!yaEnviado){
            new Notification("🚚 Sistema de Reparto", {
              body: "Son las 18:00 — ¿Ya cerraste el día?",
              icon: "/icon-192.png",
              tag: "cierre-dia"
            });
            localStorage.setItem(`notif_cierre_${hoyKey}`,"1");
          }
        }
        programar18hs(); // reprogramar para mañana
      }, msHasta18);
    };
    const t18 = programar18hs();

    // —— Notificación 2: Mantenimiento vehicular 3 días antes ——
    const chequearMantenimiento = () => {
      if(Notification.permission !== "granted") return;
      const mantList = (()=>{ try{ return JSON.parse(localStorage.getItem("cat_mant_vehiculo_v1")||"[]"); }catch{ return []; } })();
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      mantList.forEach(m=>{
        if(!m.proximaFechaISO) return;
        const proxFecha = new Date(m.proximaFechaISO+"T12:00:00"); proxFecha.setHours(0,0,0,0);
        const diffDias = Math.round((proxFecha - hoy)/(1000*60*60*24));
        if(diffDias === 3 || diffDias === 2 || diffDias === 1){
          const notifKey = `notif_mant_${m.proximaFechaISO}_${m.tipo}`;
          const hoyKey = new Date().toISOString().slice(0,10);
          const yaEnviado = localStorage.getItem(`${notifKey}_${hoyKey}`);
          if(!yaEnviado){
            const tipoLabel = {aceite:"Cambio de aceite",preventivo:"Mantenimiento preventivo",embrague:"Cambio de embrague",reparacion:"Reparación",otro:"Mantenimiento"}[m.tipo]||m.tipo;
            new Notification("🔧 Vencimiento de mantenimiento", {
              body: `${tipoLabel} vence en ${diffDias} día${diffDias>1?"s":""}${m.descripcion?" — "+m.descripcion:""}`,
              icon: "/icon-192.png",
              tag: notifKey
            });
            localStorage.setItem(`${notifKey}_${hoyKey}`,"1");
          }
        }
      });
    };
    chequearMantenimiento(); // al abrir la app
    const tMant = setInterval(chequearMantenimiento, 60*60*1000); // cada hora

    return ()=>{ clearTimeout(t18); clearInterval(tMant); };
  },[]);

  // ── INFORMES PDF ─────────────────────────────────────────────────
  const {enviarDiario, enviarSemanal, enviarMensual} = usarInformes({ventas,clientes,planillas,noVisitas:noVisitas||[],productos});

  const cerrarDia = async (fecha, dia) => {
    const key = `sr_informe_${fecha}_${dia}`;
    if(localStorage.getItem(key)) return; // ya enviado
    setSyncStatus("saving");
    const ok = await enviarDiario(fecha, dia);
    if(ok) {
      localStorage.setItem(key, "1");
      // Sábado → también enviar semanal
      const d = new Date(fecha+"T12:00:00");
      if(d.getDay()===6) {
        const okSem = await enviarSemanal(fecha);
        if(okSem) localStorage.setItem(`sr_informe_sem_${fecha}`,"1");
      }
      // Último día hábil del mes → también mensual
      const manana = new Date(d); manana.setDate(d.getDate()+1);
      const esUltimoDiaHabil = manana.getMonth()!==d.getMonth() || (manana.getDay()===6&&manana.getDate()>25);
      if(esUltimoDiaHabil) {
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
    const hoy = new Date().toISOString().slice(0,16);
    const histPrecios = JSON.parse(localStorage.getItem("lc_hist_precios")||"[]");
    histPrecios.push({fecha:hoy, productos:v.map(p=>({nombre:p.nombre,precio:p.precio,costo:p.costo}))});
    localStorage.setItem("lc_hist_precios", JSON.stringify(histPrecios.slice(-50)));
    setProductos(v); syncData({productos:v});
  };
  const [cargasDia, setCargasDia] = useLS("cat_cargas_dia_v1", CARGA_DIA_DEFAULT);
  const saveCargasDia = (v) => { setCargasDia(v); try{localStorage.setItem("cat_cargas_dia_v1",JSON.stringify(v));}catch{} };
  const saveNoVisitas= (v) => { setNoVisitas(v); try{localStorage.setItem("cat_novisitas_v1",JSON.stringify(v));}catch{} };
  const saveProspectos=(v)=>{ setProspectos(v); try{localStorage.setItem("cat_prospectos_v1",JSON.stringify(v));}catch{} syncData({prospectos:v}); };

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
    const cobEfectivo=ventasDia.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
    const cobFiado=ventasDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
    const cobTransBruto=ventasDia.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
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

  const registrarVenta = (detalle, pago, montoPagado, saldoAplicado, envPrest, envDev, obs, opcionSaldo, montoTrans2, saldoDeltaMixto) => {
    const c = cliente;
    // Auto-detectar envases prestados (solo si no es cobro de deuda)
    const envAutoDetect = [];
    if(opcionSaldo!=="cobro_deuda") {
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
    const nv = ventas.filter(x=>x.id!==ventaId);
    saveVentas(nv);
    const c = clientes.find(x=>x.id===v.clienteId);
    if(c){ const nc=clientes.map(x=>x.id===c.id?{...x,saldo:c.saldo-v.saldoDelta}:x); saveClientes(nc); }
  };

  const editarVenta = (ventaId, detalle, pago, montoPagado, saldoAplicado, obs, montoTrans2) => {
    const vV = ventas.find(v=>v.id===ventaId); if(!vV) return;
    const c  = clientes.find(x=>x.id===vV.clienteId);
    const pagoReal = pago==="mixto"?"contado":pago;
    const calc = calcVenta(detalle, pagoReal, montoPagado, saldoAplicado, productos);
    // Remove old transfer venta if existed (from previous mixto edit)
    let nev = ventas.filter(v=>!(v.obs==="[Parte transfer. de pago mixto]"&&v.clienteId===vV.clienteId&&v.fechaKey===vV.fechaKey));
    nev = nev.map(v=>v.id===ventaId?{...vV,detalle,pago:pagoReal,obs,saldoAplicado:saldoAplicado||0,...calc}:v);
    let saldoExtra = c ? (c.saldo - vV.saldoDelta + calc.saldoDelta) : 0;
    // If mixto, add transfer venta
    if(pago==="mixto"&&montoTrans2>0){
      const ventaTr = {
        id:Date.now()+2, clienteId:vV.clienteId, cliente:vV.cliente,
        dia:vV.dia, fechaKey:vV.fechaKey, fecha:vV.fecha,
        detalle:[{nombre:"Pago mixto · transferencia",cantidad:1,precio:montoTrans2,total:montoTrans2}],
        pago:"transferencia", obs:"[Parte transfer. de pago mixto]", saldoAplicado:0,
        neto:montoTrans2, bruto:montoTrans2, desc:0, costo:0, ganancia:montoTrans2,
        pagadoNum:montoTrans2, saldoDelta:montoTrans2, envPrest:[], envDev:[],
      };
      nev = [...nev, ventaTr];
      saldoExtra += montoTrans2;
    }
    saveVentas(nev);
    if(c){ const nc=clientes.map(x=>x.id===c.id?{...x,saldo:saldoExtra}:x); saveClientes(nc); }
  };

  return (
    <div style={{position:"relative"}}>
    {operandoReparto ? (
      <AppRepartidor uid={uid} perfil={{nombre:operandoReparto.repartidorNombre,codigo:operandoReparto.codigo,sectores:[],rol:"repartidor",negocioId}} onSalir={()=>setOperandoReparto(null)} />
    ) : (<>
    <div style={{...s.app, zoom: SCALES[scaleIdx]}}>
      <SyncBar status={syncStatus} isOnline={isOnline} />
      {pantalla==="portada" && <Portada onIngresar={()=>irA("menu")} />}
      {pantalla==="menu" && <MenuRepartos
        negocioId={negocioId}
        repartos={repartos}
        clientes={clientes}
        ventas={ventas}
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
      />}
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
        clientes={clientes.filter(c=>c.repartoId===repartoActual.id)}
        ventas={ventas.filter(v=>{const cl=clientes.find(c=>c.id===v.clienteId);return cl?.repartoId===repartoActual.id;})}
        stock={stockNorm}
        recordatoriosActivos={recordatoriosActivos}
        onConfirmarRecordatorio={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
        onVerConfirmaciones={(dia)=>{setDiaActual(dia);irA("confirmacionesDia");}}
        transferenciasPendientes={DIAS.map(dia=>{
          const clientesRep=clientes.filter(c=>c.repartoId===repartoActual.id);
          const vts=ventas.filter(v=>v.dia===dia&&v.pago==="transferencia"&&!v.transConfirmada&&clientesRep.some(c=>c.id===v.clienteId));
          if(!vts.length) return null;
          const fechas=[...new Set(vts.map(v=>v.fechaKey))].sort().reverse();
          return {dia,fecha:fechas[0]||"",count:vts.length,monto:vts.reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0),ventas:vts};
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
          onConfirmar={(ventaId)=>{const nv=ventas.map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada}:v);saveVentas(nv);}}
          onVolver={()=>irA("menu")} />}
      {pantalla==="diaPrincipal"   && <DiaPrincipal dia={diaActual} onIrClientes={()=>irA("selectorFechaClientes")} onIrPlanilla={()=>irA("selectorFechaPlanilla")} onVolver={()=>irA("menu")} onVerConfirmaciones={()=>irA("confirmacionesDia")} ventasPendientesTransfer={ventas.filter(v=>v.dia===diaActual&&v.pago==="transferencia"&&!v.transConfirmada).length} />}
      {pantalla==="selectorFechaPlanilla" && <SelectorFecha dia={diaActual} planillas={planillas} ventas={ventas} noVisitas={noVisitas} onSeleccionar={(fk,fo)=>{setFechaActual(fk);setFechaObj(fo);irA("planilla");}} onVolver={()=>irA("diaPrincipal")} />}
      {pantalla==="planilla"       && <PlanillaDelDia dia={diaActual} fecha={fechaActual} ventas={ventas.filter(v=>v.dia===diaActual&&v.fechaKey===fechaActual)} clientes={clientes} planilla={planillas[`${diaActual}_${fechaActual}`]||planillaDiaVacia()} productos={productos} stock={stockNorm} setStock={setStock} syncData={syncData} onGuardar={d=>{savePlanilla(`${diaActual}_${fechaActual}`,d);irA("planilla");}} onVolver={()=>irA("selectorFechaPlanilla")} onCerrarDia={()=>cerrarDia(fechaActual,diaActual)} initCierre={initCierre} />}
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
      {pantalla==="clientes"       && <ListaClientes clientes={clientes.filter(c=>c.dia===diaActual&&(!repartoActual||c.repartoId===repartoActual.id))} dia={diaActual} fecha={fechaActual} ventas={ventas.filter(v=>v.fechaKey===fechaActual&&v.dia===diaActual)} todasVentas={ventas} noVisitas={(noVisitas||[]).filter(v=>v.dia===diaActual&&v.fecha===fechaActual)} onSeleccionar={c=>{setClienteId(c.id);irA("detalleCliente");}} onNuevoCliente={()=>irA("nuevoCliente")} onVolver={()=>irA("selectorFechaClientes")} onReordenar={lista=>{
          const otros=clientes.filter(c=>c.dia!==diaActual);
          saveClientes([...otros,...lista]);
        }} onRegistrarNoVisita={(clienteId,motivo)=>{const nv=[...(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual)),{clienteId,dia:diaActual,fecha:fechaActual,motivo}];saveNoVisitas(nv);}} onQuitarNoVisita={(clienteId)=>{const nv=(noVisitas||[]).filter(v=>!(v.clienteId===clienteId&&v.dia===diaActual&&v.fecha===fechaActual));saveNoVisitas(nv);}}
        onConfirmarTransfer={(clienteId,ventaId)=>{
          const nv=ventas.map(v=>v.id===ventaId?{...v,transConfirmada:!v.transConfirmada}:v);
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
        onIrPlanilla={()=>irA("selectorFechaPlanilla")}
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
              neto:monto,bruto:monto,desc:0,costo:monto,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],_esCobro:true};
            const nv=[...ventas,vt];
            saveVentas(nv);
            const nc=clientes.map(x=>x.id===c.id?{...x,saldo:(c.saldo||0)+monto}:x);
            saveClientes(nc);
          }} />}
      {pantalla==="venta"          && cliente && <NuevaVenta key={clienteId} cliente={cliente} productos={productos} fecha={fechaActual}
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
          const hoyKey = new Date().toISOString().slice(0,10);
          if(!fechaActual) setFechaActual(hoyKey);
          // Si no hay diaActual, usar el día del cliente como fallback
          if(!diaActual) setDiaActual(c.dia);
          irA("venta");
        }} onVerDetalle={(c)=>{setClienteId(c.id);irA("detalleDesdeGestion");}} ventas={ventas} />}
      {pantalla==="detalleDesdeGestion" && cliente && <DetalleCliente cliente={cliente} ventas={ventas.filter(v=>v.clienteId===cliente.id)} dia={diaActual||cliente.dia} fecha={fechaActual} productos={productos} onVenta={()=>{setDiaActual(cliente.dia);const hoy=new Date().toISOString().slice(0,10);if(!fechaActual)setFechaActual(hoy);irA("venta");}} onVolver={()=>irA("gestionClientes")} onEditar={cambios=>updateCliente(cliente.id,cambios)} onEliminarVenta={eliminarVenta} onEditarVenta={editarVenta} onEliminarCliente={()=>{eliminarCliente(cliente.id);irA("gestionClientes");}}
          onNoEstaCliente={()=>{}} onNoQuiereCliente={()=>{}}
          recordatorios={recordatorios} onGuardarRecordatorio={(r)=>saveRecordatorios([...(recordatorios||[]),r])} onConfirmarRecordatorio={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
          onCobrarSaldo={(monto,pago)=>{
            if(cliente){
              const saldoAntes=cliente.saldo||0;
              const saldoDespues=saldoAntes+monto;
              const det=[{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}];
              const fk=fechaActual||new Date().toISOString().slice(0,10);
              const vt={id:Date.now(),clienteId:cliente.id,cliente:cliente.nombre,
                dia:diaActual||cliente.dia,fechaKey:fk,fecha:new Date().toLocaleString("es-AR"),
                detalle:det,pago,obs:`Cobro de deuda $${monto.toLocaleString("es-AR")} (${pago})`,saldoAplicado:0,
                neto:monto,bruto:monto,desc:0,costo:monto,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],
                saldoAntes,saldoDespues,_esCobro:true};
              saveVentas([...ventas,vt]);
              saveClientes(clientes.map(x=>x.id===cliente.id?{...x,saldo:saldoDespues}:x));
            }
          }} />}
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
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="agenda" && <AgendaScreen
        recordatorios={recordatorios||[]}
        clientes={clientes}
        onConfirmar={(id)=>saveRecordatorios((recordatorios||[]).map(r=>r.id===id?{...r,confirmado:true}:r))}
        onEliminar={(id)=>saveRecordatorios((recordatorios||[]).filter(r=>r.id!==id))}
        onNuevo={(datos)=>{
          const c=clientes.find(x=>x.id===datos.clienteId);
          if(!c){alert("Seleccioná un cliente");return;}
          saveRecordatorios([...(recordatorios||[]),{...datos,id:Date.now(),clienteId:c.id,clienteNombre:c.nombre,dia:c.dia,confirmado:false}]);
        }}
        onVolver={()=>irA("menu")}
      />}
      {pantalla==="stock"          && <StockGeneral stock={stockNorm} setStock={(ns)=>{setStock(ns);syncData({stock:ns});}} clientes={clientes} ventas={ventas} productos={productos} planillas={planillas} onVolver={()=>irA("menu")} />}
      {pantalla==="fiadosPendientes" && <FiadosPendientes clientes={clientes} onCobrar={(cId,monto,pago)=>{
        const cl=clientes.find(c=>c.id===cId);if(!cl)return;
        const saldoAntes=cl.saldo||0;const saldoDespues=saldoAntes+monto;
        const vt={id:Date.now(),clienteId:cl.id,cliente:cl.nombre,dia:cl.dia,fechaKey:new Date().toISOString().slice(0,10),fecha:new Date().toLocaleString("es-AR"),
          detalle:[{nombre:"Cobro de deuda",cantidad:1,precio:monto,total:monto}],pago,obs:`Cobro de deuda ${fmt(monto)} (${pago})`,
          neto:monto,bruto:monto,desc:0,costo:monto,ganancia:0,pagadoNum:monto,saldoDelta:monto,envPrest:[],envDev:[],saldoAntes,saldoDespues,_esCobro:true};
        saveVentas([...ventas,vt]);saveClientes(clientes.map(c=>c.id===cId?{...c,saldo:saldoDespues}:c));
      }} onVolver={()=>irA("menu")} />}
      {pantalla==="resumen"        && <Resumen ventas={ventas} clientes={clientes} productos={productos} planillas={planillas} noVisitas={noVisitas||[]} onVolver={()=>irA("menu")} />}
      {pantalla==="config"         && <Config productos={productos} setProductos={saveProductos} clientes={clientes} setClientes={saveClientes} ventas={ventas} setVentas={saveVentas} planillas={planillas} setPlanillas={savePlanillasCloud} stock={stockNorm} setStock={(s)=>{const ns=normStock(s);setStockRaw(ns);syncData({stock:ns});}} cargasDia={cargasDia} setCargasDia={saveCargasDia} syncData={syncData} onVolver={()=>irA("menu")} negocioId={negocioId} tabInicial={tabConfig} repartos={repartos} />}
    </div>
    {/* Botón flotante de escala — fuera del zoom para que no se afecte */}
    <button
      onClick={()=>setScaleIdx(i=>(i+1)%4)}
      title={`Tamaño: ${SCALE_LABELS[scaleIdx]} — tocá para cambiar`}
      style={{
        position:"fixed", bottom:18, right:18, zIndex:9999,
        width:38, height:38, borderRadius:"50%",
        background:"#185FA5", color:"#e2eaf4",
        border:"none", cursor:"pointer",
        fontSize:12, fontWeight:700,
        boxShadow:"0 2px 10px rgba(0,0,0,0.4)",
        display:"flex", alignItems:"center", justifyContent:"center",
        letterSpacing:"0.02em",
      }}>
      {SCALE_LABELS[scaleIdx]}
    </button>
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
