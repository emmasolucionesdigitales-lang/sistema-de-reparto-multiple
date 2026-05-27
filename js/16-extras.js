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
    const lic = JSON.parse(localStorage.getItem("sr_licencia")||"null");
    if(lic) { lic.logo = logoB64; localStorage.setItem("sr_licencia", JSON.stringify(lic)); }
    return true;
  } catch(e) { console.error("Error guardando logo:", e); return false; }
}


// ── InicioRepartidor ─────────────────────────────────────────
function InicioRepartidor({perfil,diaActual,fechaActual,setFechaActual,clientes,ventas,noVisitas,recordatorios,onSaveRecordatorio,onConfirmarRecordatorio,onIrCliente,onIrCarga,onIrClientes,onIrPlanilla,onIrTodosClientes,onIrAgenda,onIrTransfers,onSalir}) {
  const transfersPend = ventas.filter(v=>v.pago==="transferencia"&&!v.transConfirmada);
  const recActivos    = (recordatorios||[]).filter(r=>!r.confirmado);
  const hoy           = new Date().toISOString().slice(0,10);
  const recHoy        = recActivos.filter(r=>r.fecha===hoy);
  const visitadosHoy  = new Set(ventas.filter(v=>v.fechaKey===fechaActual).map(v=>v.clienteId));
  const noVisHoy      = new Set((noVisitas||[]).filter(v=>v.fecha===fechaActual).map(v=>v.clienteId));
  const pendHoy       = clientes.filter(c=>!visitadosHoy.has(c.id)&&!noVisHoy.has(c.id)).length;

  return (
    <div style={{...s.screen,padding:"0 0 32px"}}>
      {/* Header */}
      <div style={{...s.header,padding:"12px 14px"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)"}}>🚐 {perfil.nombre}</div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{diaActual} · {(perfil.sectores||[]).join(" · ")||"Reparto"}</div>
        </div>
        <button style={{...s.btn,fontSize:11,padding:"6px 10px"}} onClick={onSalir}>Salir</button>
      </div>

      {/* Fecha */}
      <div style={{padding:"10px 14px 0"}}>
        <div style={{...s.card,margin:0,background:"var(--color-background-info)",padding:"10px 14px"}}>
          <label style={{fontSize:11,color:"var(--color-text-info)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>📅 Fecha del reparto</label>
          <input type="date" style={{...s.input,margin:0,background:"transparent",border:"none",color:"var(--color-text-primary)",fontSize:16,fontWeight:600,padding:"4px 0"}}
            value={fechaActual} onChange={e=>setFechaActual(e.target.value)} />
        </div>
      </div>

      {/* Alerta transferencias */}
      {transfersPend.length>0&&(
        <button style={{margin:"10px 14px 0",background:"#2e1f06",border:"1px solid #f5b942",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,width:"calc(100% - 28px)",cursor:"pointer",textAlign:"left"}}
          onClick={onIrTransfers}>
          <span style={{fontSize:20}}>🔴</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#f5b942"}}>{transfersPend.length} transferencia{transfersPend.length!==1?"s":""} sin confirmar</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Total: {fmt(transfersPend.reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0))} · Tocá para confirmar →</div>
          </div>
        </button>
      )}

      {/* Alerta recordatorios */}
      {recHoy.length>0&&(
        <div style={{margin:"8px 14px 0"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#5daaff",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em",cursor:"pointer"}}
            onClick={onIrAgenda}>
            🔔 Recordatorios de hoy — <span style={{textDecoration:"underline"}}>ver todos →</span>
          </div>
          {recHoy.slice(0,3).map(r=>(
            <div key={r.id} style={{...s.card,margin:"0 0 6px",background:"#1e2e4a",border:"0.5px solid #5daaff",display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:16,cursor:"pointer"}} onClick={onIrAgenda}>{r.tipo==="cobro"?"💰":"🏠"}</span>
              <div style={{flex:1,cursor:"pointer"}} onClick={onIrAgenda}>
                <div style={{fontSize:12,fontWeight:500,color:"#5daaff"}}>{r.clienteNombre} <span style={{fontSize:10,opacity:0.7}}>· tocá para ver →</span></div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{r.motivo}{r.hora?` · ${r.hora}`:""}</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                {r.clienteId&&<button style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer"}}
                  onClick={()=>onIrCliente(r.clienteId)}>→</button>}
                <button style={{background:"#0a2e1f",color:"#4dd9a0",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer"}}
                  onClick={()=>onConfirmarRecordatorio(r.id)}>✓</button>
              </div>
            </div>
          ))}
          {recActivos.length>3&&(
            <button style={{...s.btn,width:"100%",fontSize:11,padding:"5px"}} onClick={onIrAgenda}>
              +{recActivos.length-3} más → Abrir agenda
            </button>
          )}
        </div>
      )}

      {/* Resumen del día */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"10px 14px 0"}}>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)"}}>{pendHoy}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Pendientes</div>
        </div>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#4dd9a0"}}>{visitadosHoy.size}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Entregados</div>
        </div>
        <div style={{...s.metricCard,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#f5b942"}}>{recActivos.length}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Recordat.</div>
        </div>
      </div>

      {/* Botones principales */}
      <div style={{padding:"12px 14px 0",display:"flex",flexDirection:"column",gap:10}}>
        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,padding:"14px"}}
          onClick={onIrCarga}>
          <span style={{fontSize:22}}>🚚</span>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Carga del día</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Registrar envases que salís a repartir</div>
          </div>
          <span style={{marginLeft:"auto",color:"var(--color-text-tertiary)"}}>→</span>
        </button>

        <button style={{...s.btnPrimary,padding:"16px",fontSize:16,borderRadius:12,display:"flex",alignItems:"center",gap:10}}
          onClick={onIrClientes}>
          <span style={{fontSize:22}}>📋</span>
          <div style={{textAlign:"left"}}>
            <div>Reparto del día</div>
            <div style={{fontSize:11,opacity:0.8}}>{pendHoy} pendientes de entregar</div>
          </div>
        </button>

        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,padding:"14px"}}
          onClick={onIrPlanilla}>
          <span style={{fontSize:22}}>📊</span>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Planilla del día</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Totales y cierre del día</div>
          </div>
          <span style={{marginLeft:"auto",color:"var(--color-text-tertiary)"}}>→</span>
        </button>

        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,padding:"14px"}}
          onClick={onIrTodosClientes}>
          <span style={{fontSize:22}}>👥</span>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Todos los clientes</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Registrar ventas y cobros de cualquier día</div>
          </div>
          <span style={{marginLeft:"auto",color:"var(--color-text-tertiary)"}}>→</span>
        </button>

        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,padding:"14px",
          background:recActivos.length>0?"#1e2e4a":undefined,
          border:recActivos.length>0?"0.5px solid #5daaff":undefined}}
          onClick={onIrAgenda}>
          <span style={{fontSize:22}}>📅</span>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>
              Agenda {recActivos.length>0&&<span style={{...s.badge("info"),fontSize:10,marginLeft:6}}>{recActivos.length}</span>}
            </div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Recordatorios de visitas y cobros</div>
          </div>
          <span style={{marginLeft:"auto",color:"var(--color-text-tertiary)"}}>→</span>
        </button>
      </div>
    </div>
  );
}

// ── TodosClientesRepartidor ──────────────────────────────────
function TodosClientesRepartidor({clientes,ventas,onSeleccionar,onNuevoCliente,onVolver}) {
  const [busq,setBusq] = React.useState("");
  const [diaFiltro,setDiaFiltro] = React.useState("todos");
  const filtrados = clientes
    .filter(c=>(diaFiltro==="todos"||c.dia===diaFiltro)&&(c.nombre.toLowerCase().includes(busq.toLowerCase())||(c.barrio||"").toLowerCase().includes(busq.toLowerCase())))
    .sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999));

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Todos los clientes</span>
        <button style={{...s.btn,padding:"6px 12px",fontSize:13}} onClick={onNuevoCliente}>+ Nuevo</button>
      </div>
      <div style={{padding:"10px 14px 6px"}}>
        <input style={s.input} placeholder="Buscar cliente o barrio..." value={busq} onChange={e=>setBusq(e.target.value)} />
        <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
          {["todos",...DIAS].map(d=>(
            <button key={d} style={{...s.btn,fontSize:11,padding:"3px 9px",
              background:diaFiltro===d?"#185FA5":"var(--color-background-tertiary)",
              color:diaFiltro===d?"#e2eaf4":"var(--color-text-secondary)",
              border:diaFiltro===d?"none":"0.5px solid var(--color-border-secondary)"}}
              onClick={()=>setDiaFiltro(d)}>{d==="todos"?"Todos":d.slice(0,3)}</button>
          ))}
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
                {c.calle?`${c.calle} ${c.nro||""}`:c.manzana?`Mz ${c.manzana} L ${c.lote}`:""}{c.barrio?` · ${c.barrio}`:""}
              </div>
              {c.saldo<0&&<span style={{...s.badge("danger"),fontSize:10,marginTop:3,display:"inline-block"}}>Debe {fmt(Math.abs(c.saldo))}</span>}
              {c.saldo>0&&<span style={{...s.badge("success"),fontSize:10,marginTop:3,display:"inline-block"}}>A favor {fmt(c.saldo)}</span>}
              {vUlt&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>Última venta: {vUlt.fechaKey}</div>}
            </div>
            <span style={{color:"var(--color-text-tertiary)"}}>→</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AgendaRepartidor ─────────────────────────────────────────
function AgendaRepartidor({recordatorios,clientes,onConfirmar,onEliminar,onNuevo,onIrCliente,onVolver}) {
  const [mostrarNuevo,setMostrarNuevo] = React.useState(false);
  const hoy = new Date().toISOString().slice(0,10);
  const pendientes = [...(recordatorios||[])].filter(r=>!r.confirmado).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const confirmados = [...(recordatorios||[])].filter(r=>r.confirmado).slice(0,5);
  const tipoIco = {visita:"🏠",cobro:"💰"};

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>📅 Agenda</span>
        <button style={{...s.btn,padding:"6px 12px",fontSize:12,background:"#185FA5",color:"#e2eaf4",border:"none"}}
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


function AgendaScreen({recordatorios,clientes,onConfirmar,onEliminar,onNuevo,onVolver}) {
  const [mostrarNuevo,setMostrarNuevo] = React.useState(false);
  const [clienteBusq,setClienteBusq]  = React.useState("");
  const [clienteSel,setClienteSel]    = React.useState(null);
  const [filtro,setFiltro]            = React.useState("pendiente"); // pendiente | todos
  const hoy = new Date().toISOString().slice(0,10);

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
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>📅 Agenda</span>
        <button style={{...s.btn,padding:"6px 12px",fontSize:12,background:"#185FA5",color:"#e2eaf4",border:"none"}}
          onClick={()=>setMostrarNuevo(true)}>+ Nuevo</button>
      </div>

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
      </div>

      {/* Lista */}
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
                {c?.maps&&<a href={c.maps} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>📍</a>}
              </div>
            </div>
            {!r.confirmado&&(
              <div style={{display:"flex",gap:6,marginTop:10,paddingTop:8,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                <button style={{...s.btn,flex:1,fontSize:12}} onClick={()=>{if(window.confirm("¿Eliminar este recordatorio?"))onEliminar(r.id);}}>🗑 Eliminar</button>
                <button style={{flex:2,padding:"7px",borderRadius:8,border:"none",background:"#0a2e1f",color:"#4dd9a0",fontSize:12,fontWeight:500,cursor:"pointer"}}
                  onClick={()=>onConfirmar(r.id)}>✓ Marcar como hecho</button>
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
              onGuardar={(datos)=>{onNuevo(datos);setMostrarNuevo(false);}}
              onCerrar={()=>setMostrarNuevo(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoRecordatorioForm({clientes,onGuardar,onCerrar}) {
  const hoy = new Date().toISOString().slice(0,10);
  const [tipo,setTipo]     = React.useState("visita");
  const [fecha,setFecha]   = React.useState(hoy);
  const [hora,setHora]     = React.useState("10:00");
  const [busq,setBusq]     = React.useState("");
  const [clienteId,setClienteId] = React.useState(null);
  const [motivo,setMotivo] = React.useState("");
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
          onClick={()=>onGuardar({tipo,fecha,hora,motivo:motivo.trim(),clienteId})}>
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
  const licData = (() => { try { return JSON.parse(localStorage.getItem("sr_licencia")||"null"); } catch { return null; } })();

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
function VistaClientesGeneral({clientes, repartos, ventas, onVerDetalle, onVolver}) {
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
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Todos los clientes</span>
      </div>

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
                              {c.barrio||""}{c.calle?` · ${c.calle} ${c.nro||""}`:c.manzana?` · Mz ${c.manzana} L ${c.lote}`:""}
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
function ImportarClientesExcel({repartos, clientes, onGuardar, onVolver}) {
  const [fase, setFase] = React.useState("inicio"); // inicio | preview | importando | listo
  const [filas, setFilas] = React.useState([]);
  const [errores, setErrores] = React.useState([]);
  const [importados, setImportados] = React.useState(0);
  const fileRef = React.useRef();

  const DIAS_MAP = {
    "lunes":"Lunes","martes":"Martes","miercoles":"Miércoles","miércoles":"Miércoles",
    "jueves":"Jueves","viernes":"Viernes","sabado":"Sábado","sábado":"Sábado"
  };
  const normDia = (d) => {
    if(!d) return null;
    return DIAS_MAP[(d+"").toLowerCase().trim()] || null;
  };

  const procesarExcel = async (file) => {
    // Leer el archivo como ArrayBuffer y parsearlo con SheetJS (cargado inline)
    const buf = await file.arrayBuffer();
    let XLSX;
    try {
      XLSX = window.XLSX;
      if(!XLSX) throw new Error("no XLSX");
    } catch(e) {
      alert("Cargando librería Excel, por favor esperá unos segundos y volvé a intentar.");
      return;
    }
    const wb = XLSX.read(buf, {type:"array"});
    // Buscar hoja de clientes
    const sheetName = wb.SheetNames.find(n=>n.includes("Clientes")||n.includes("clientes")) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});

    // Detectar fila de encabezado (la que tiene "nombre" o "cliente")
    let headerRow = -1;
    for(let i=0;i<Math.min(10,raw.length);i++){
      const r = raw[i].map(c=>(c+"").toLowerCase());
      if(r.some(c=>c.includes("nombre") || c.includes("cliente"))){
        headerRow = i; break;
      }
    }
    if(headerRow < 0){ alert("No encontré la fila de encabezados en el Excel. Asegurate de usar la plantilla."); return; }

    const headers = raw[headerRow].map(c=>(c+"").toLowerCase().trim());
    const colIdx = (keywords) => {
      for(const kw of keywords){
        const i = headers.findIndex(h=>h.includes(kw));
        if(i>=0) return i;
      }
      return -1;
    };

    const CI = {
      repNum:   colIdx(["repartidor","reparto","rep"]),
      dia:      colIdx(["día","dia","visita"]),
      orden:    colIdx(["orden","ruta"]),
      nombre:   colIdx(["nombre"]),
      calle:    colIdx(["calle","dirección","direccion"]),
      nro:      colIdx(["n° puerta","puerta","número","numero","nro"]),
      barrio:   colIdx(["barrio"]),
      telefono: colIdx(["teléfono","telefono","tel"]),
      sifon:    colIdx(["sifon","sifón","1.5"]),
      bidon10:  colIdx(["bidon 10","bidón 10","10l","10 l"]),
      bidon20:  colIdx(["bidon 20","bidón 20","20l","20 l"]),
      obs:      colIdx(["observ"]),
    };

    const repMap = {};
    repartos.forEach(r=>{ repMap[String(r.numero)] = r.id; });

    const validas = [], errs = [];
    for(let i=headerRow+1; i<raw.length; i++){
      const row = raw[i];
      // Saltar fila ejemplo y filas vacías
      if(!row || row.every(c=>c===""||c==null)) continue;
      const nombre = CI.nombre>=0 ? (row[CI.nombre]||"").toString().trim() : "";
      if(!nombre || nombre.toLowerCase().includes("ej→") || nombre.toLowerCase().includes("ejemplo")) continue;

      const repNumStr = CI.repNum>=0 ? (row[CI.repNum]||"").toString().trim() : "";
      const diaRaw    = CI.dia>=0    ? (row[CI.dia]||"").toString().trim()    : "";
      const dia       = normDia(diaRaw);
      const calle     = CI.calle>=0  ? (row[CI.calle]||"").toString().trim()  : "";

      const lineaErrs = [];
      if(!repNumStr) lineaErrs.push("falta nro repartidor");
      if(!repMap[repNumStr]) lineaErrs.push(`repartidor ${repNumStr} no existe en la app`);
      if(!dia) lineaErrs.push(`día "${diaRaw}" no reconocido`);
      if(!nombre) lineaErrs.push("falta nombre");

      if(lineaErrs.length){
        errs.push({fila:i+1, nombre:nombre||"(sin nombre)", problemas:lineaErrs});
        continue;
      }

      validas.push({
        repartoId: repMap[repNumStr],
        dia,
        orden: CI.orden>=0 ? (parseInt(row[CI.orden])||null) : null,
        nombre,
        calle,
        nro:  CI.nro>=0    ? (row[CI.nro]||"").toString().trim()     : "",
        barrio: CI.barrio>=0 ? (row[CI.barrio]||"").toString().trim() : "",
        telefono: CI.telefono>=0 ? (row[CI.telefono]||"").toString().trim() : "",
        sifon:   CI.sifon>=0   ? (parseInt(row[CI.sifon])||0)   : 0,
        bidon10: CI.bidon10>=0 ? (parseInt(row[CI.bidon10])||0) : 0,
        bidon20: CI.bidon20>=0 ? (parseInt(row[CI.bidon20])||0) : 0,
        obs: CI.obs>=0 ? (row[CI.obs]||"").toString().trim() : "",
        saldo: 0, id: null, _nuevo: true,
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
      id: ahora + i,
      dispenser: 0,
      envasesSifon: f.sifon,
      envasesBidon10: f.bidon10,
      envasesBidon20: f.bidon20,
    }));
    setImportados(nuevos.length);
    onGuardar(nuevos);
    setFase("listo");
  };

  if(fase==="listo") return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Importar clientes</span></div>
      <div style={{padding:"60px 20px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>✅</div>
        <div style={{fontSize:18,fontWeight:700,color:"var(--color-text-primary)",marginBottom:8}}>
          ¡{importados} clientes importados!
        </div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:24}}>
          Ya están disponibles en cada reparto
        </div>
        <button style={{...s.btnPrimary,padding:"12px 28px"}} onClick={onVolver}>Ir al panel</button>
      </div>
    </div>
  );

  if(fase==="preview") return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={()=>setFase("inicio")}>← Volver</button>
        <span style={s.headerTitle}>Revisá los datos</span></div>

      {/* Resumen */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 14px 8px"}}>
        <div style={{...s.card,margin:0,background:"#0a2e1f",border:"1px solid #4dd9a0",padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#4dd9a0"}}>{filas.length}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Clientes listos para importar</div>
        </div>
        <div style={{...s.card,margin:0,background:errores.length?"#2e0a0a":"#1a2e1a",border:"1px solid "+(errores.length?"#f07070":"#4dd9a0"),padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:errores.length?"#f07070":"#4dd9a0"}}>{errores.length}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Filas con error (se omiten)</div>
        </div>
      </div>

      {/* Errores */}
      {errores.length>0&&(
        <div style={{padding:"0 14px 8px"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#f07070",marginBottom:6}}>⚠️ Filas con problemas (no se importarán):</div>
          {errores.slice(0,5).map((e,i)=>(
            <div key={i} style={{...s.card,margin:"0 0 4px",padding:"8px 10px",background:"rgba(220,50,50,0.1)",border:"0.5px solid rgba(220,50,50,0.3)"}}>
              <div style={{fontSize:12,color:"var(--color-text-primary)"}}>Fila {e.fila}: <b>{e.nombre}</b></div>
              <div style={{fontSize:11,color:"#f07070"}}>{e.problemas.join(" · ")}</div>
            </div>
          ))}
          {errores.length>5&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",padding:"4px 0"}}>...y {errores.length-5} más</div>}
        </div>
      )}

      {/* Preview primeros clientes */}
      <div style={{padding:"0 14px 6px"}}>
        <div style={{fontSize:11,fontWeight:600,color:"var(--color-text-secondary)",marginBottom:6}}>Vista previa (primeros {Math.min(5,filas.length)}):</div>
        {filas.slice(0,5).map((f,i)=>(
          <div key={i} style={{...s.card,margin:"0 0 5px",padding:"8px 12px"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{f.nombre}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>
              Rep.{repartos.find(r=>r.id===f.repartoId)?.numero} · {f.dia}{f.calle?` · ${f.calle} ${f.nro}`:""}{f.barrio?` · ${f.barrio}`:""}
            </div>
            {(f.sifon||f.bidon10||f.bidon20)>0&&(
              <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>
                {f.sifon>0?`${f.sifon} sifones `:""}{f.bidon10>0?`${f.bidon10} bidón10L `:""}{f.bidon20>0?`${f.bidon20} bidón20L`:""}
              </div>
            )}
          </div>
        ))}
      </div>

      {filas.length>0?(
        <div style={{padding:"0 14px 20px"}}>
          <button style={{...s.btnPrimary,width:"100%",padding:"14px",fontSize:14}}
            onClick={confirmarImport}>
            ✅ Importar {filas.length} clientes
          </button>
        </div>
      ):(
        <div style={{textAlign:"center",padding:"20px",color:"var(--color-text-tertiary)"}}>
          No se encontraron clientes válidos para importar
        </div>
      )}
    </div>
  );

  // Fase: inicio
  return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Importar clientes</span></div>

      <div style={{padding:"16px 14px"}}>
        {/* Instrucciones */}
        <div style={{...s.card,marginBottom:16,background:"#1e2e4a",border:"0.5px solid #5daaff"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#5daaff",marginBottom:10}}>📥 ¿Cómo importar?</div>
          {[
            "1. Descargá la plantilla Excel desde el botón de abajo",
            "2. Completá los datos de tus clientes (una fila por cliente)",
            "3. Guardá el archivo en tu celular",
            "4. Tocá el botón Seleccionar Excel y elegí el archivo",
          ].map((t,i)=>(
            <div key={i} style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5,paddingLeft:8}}>
              {t}
            </div>
          ))}
        </div>

        {/* Repartos disponibles */}
        <div style={{...s.card,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)",marginBottom:8}}>
            Repartos configurados (usá estos números en el Excel):
          </div>
          {repartos.length===0&&(
            <div style={{fontSize:12,color:"#f07070"}}>⚠️ Primero creá los repartos en la pestaña "Repartos"</div>
          )}
          {repartos.sort((a,b)=>a.numero-b.numero).map(r=>(
            <div key={r.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid var(--color-border-secondary)"}}>
              <div style={{width:30,height:30,borderRadius:7,background:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>{r.numero}</div>
              <div style={{fontSize:12,color:"var(--color-text-primary)"}}>{r.repartidorNombre}</div>
            </div>
          ))}
        </div>

        {/* Botón seleccionar archivo */}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
          onChange={e=>{if(e.target.files[0]) procesarExcel(e.target.files[0]);}} />

        <button style={{...s.btnPrimary,width:"100%",padding:"14px",fontSize:14,marginBottom:10}}
          onClick={()=>fileRef.current.click()}>
          📂 Seleccionar Excel
        </button>

        <div style={{textAlign:"center",fontSize:11,color:"var(--color-text-tertiary)"}}>
          La importación no borra clientes existentes
        </div>
      </div>
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════
// ◆  usarInformes — Envío de resúmenes por email via Brevo
// ════════════════════════════════════════════════════════════════════
function usarInformes({ventas, clientes, planillas, noVisitas, productos}) {

  const getLic = () => { try{ return JSON.parse(localStorage.getItem("sr_licencia")||"{}"); }catch{ return {}; } };

  const fmtPesos = (n) => "$" + Math.round(Number(n)||0).toLocaleString("es-AR");

  const enviarDiario = async (fecha, dia) => {
    const lic = getLic();
    if(!lic.email || !window.enviarEmailBrevoRM) return false;
    try {
      const ventasDia = (ventas||[]).filter(v=>v.fechaKey===fecha&&v.dia===dia&&!v._esCobro&&!v._esAjuste);
      // Cobranza
      const totalEfectivo  = ventasDia.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
      const totalTransfer  = ventasDia.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
      const totalFiado     = ventasDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
      const totalNeto      = totalEfectivo + totalTransfer + totalFiado;
      const retencion      = Math.round(totalTransfer * 0.025);
      const transferNeto   = totalTransfer - retencion;
      // Costo de llenado (desde ventas)
      const costSifon = (productos||[]).find(p=>p.nombre==="Sifón 1.5L")?.costo || 133.33;
      const costB10   = (productos||[]).find(p=>p.nombre==="Bidón 10L")?.costo   || 800;
      const costB20   = (productos||[]).find(p=>p.nombre==="Bidón 20L")?.costo   || 1100;
      let totalCosto = 0;
      ventasDia.forEach(v=>(v.detalle||[]).forEach(d=>{
        if(d.nombre==="Sifón 1.5L") totalCosto += (d.cantidad||0)*costSifon;
        if(d.nombre==="Bidón 10L")  totalCosto += (d.cantidad||0)*costB10;
        if(d.nombre==="Bidón 20L")  totalCosto += (d.cantidad||0)*costB20;
      }));
      // Planilla del día (gastos extras, etc.)
      const planKey = `${dia}_${fecha}`;
      const plan = (planillas||{})[planKey] || {};
      const gastosExtras = (plan.gastos||[]).filter(g=>g.confirmado&&g.monto);
      const totalGastos  = gastosExtras.reduce((a,g)=>a+Math.round(Number(g.monto)||0),0);
      // Plata en mano = efectivo cobrado - costo de carga - gastos extras
      const plataEnMano  = totalEfectivo - totalCosto - totalGastos;
      // Ganancia neta = todo cobrado - costos - gastos
      const gananciaNeta = (totalEfectivo + transferNeto) - totalCosto - totalGastos;
      const noVisitasDia = (noVisitas||[]).filter(v=>v.fecha===fecha);
      const negocio = lic.negocio||lic.nombre||"Sistema de Reparto";
      const fila = (l,v,color="") => `<tr><td style="padding:7px 0;color:#555;border-bottom:1px solid #eee">${l}</td><td style="text-align:right;font-weight:600;border-bottom:1px solid #eee;color:${color||"#222"}">${v}</td></tr>`;
      const separador = (titulo) => `<tr><td colspan="2" style="padding:10px 0 4px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em">${titulo}</td></tr>`;
      const htmlContent = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb">
          <div style="background:#185FA5;border-radius:12px 12px 0 0;padding:20px 24px">
            <h2 style="color:#fff;margin:0;font-size:18px">📋 Cierre del día · ${dia} ${fecha}</h2>
            <p style="color:#c8dcf0;margin:4px 0 0;font-size:13px">${negocio}</p>
          </div>
          <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08)">

            <!-- Total del día -->
            <div style="background:#f0f7ff;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
              <div style="font-size:32px;font-weight:800;color:#185FA5">${fmtPesos(totalNeto)}</div>
              <div style="color:#666;font-size:13px">${ventasDia.length} entregas · ${noVisitasDia.length} sin visita</div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${separador("💵 Cobranza")}
              ${fila("Efectivo (contado)", fmtPesos(totalEfectivo))}
              ${fila("Transferencias (bruto)", fmtPesos(totalTransfer))}
              ${retencion>0 ? fila("&nbsp;&nbsp;Retención 2.5%", "−"+fmtPesos(retencion),"#e05c5c") : ""}
              ${fila("Transferencias (neto)", fmtPesos(transferNeto),"#185FA5")}
              ${totalFiado>0 ? fila("Fiado (pendiente de cobro)", fmtPesos(totalFiado),"#f5a623") : ""}

              ${separador("📦 Costos")}
              ${fila("Llenado de envases", "−"+fmtPesos(totalCosto),"#e05c5c")}

              ${gastosExtras.length>0 ? separador("💸 Gastos extras (efectivo)") : ""}
              ${gastosExtras.map(g=>{
                const cat = g.cat||"Gasto";
                const desc = g.desc ? ` · ${g.desc}` : "";
                return fila(cat.charAt(0).toUpperCase()+cat.slice(1)+desc, "−"+fmtPesos(g.monto),"#e05c5c");
              }).join("")}
              ${gastosExtras.length>0 ? fila("<b>Total gastos</b>","−"+fmtPesos(totalGastos),"#e05c5c") : ""}

              ${separador("💰 Resultado")}
              ${fila("<b>💵 Plata en mano</b>","<b>"+fmtPesos(plataEnMano)+"</b>", plataEnMano>=0?"#0a7c3e":"#e05c5c")}
              ${fila("<b>📊 Ganancia neta del día</b>","<b>"+fmtPesos(gananciaNeta)+"</b>", gananciaNeta>=0?"#0a7c3e":"#e05c5c")}
            </table>

          </div>
          <p style="color:#aaa;font-size:11px;text-align:center;margin-top:16px">Sistema de Reparto · Emma Soluciones Digitales</p>
        </div>`;
      await window.enviarEmailBrevoRM({
        to: lic.email, toName: lic.negocio||lic.nombre||"",
        subject: `📋 Cierre ${dia} ${fecha} · ${fmtPesos(totalNeto)} · En mano ${fmtPesos(plataEnMano)}`,
        htmlContent
      });
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
