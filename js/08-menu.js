// ════════════════════════════════════════════════════════════════════
// ◆  08-menu.js — MenuRepartos · MenuDias · DiaPrincipal · PlanillaDelDia · InicioReparto
// ════════════════════════════════════════════════════════════════════

function MenuRepartos({negocioId,repartos,clientes,ventas,recordatorios,onSeleccionar,onConfig,onResumen,onStock,onAgenda,onVolver,saveRepartos,onOperarReparto,onTodosClientes,onImportarClientes,onMapaClientes,tabInicial,onTabChange}) {
  const [tab, setTab] = React.useState(tabInicial||"repartos");
  const cambiarTab = (t) => { setTab(t); if(onTabChange) onTabChange(t); };
  const [modoNuevo, setModoNuevo] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState(null);
  const [form, setForm] = React.useState({numero:"",repartidorNombre:"",codigo:""});

  const genCodigo = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir con 1/0
    let c = "";
    for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)];
    return c;
  };

  const guardarReparto = () => {
    if(!form.numero||!form.repartidorNombre){alert("Completá número y nombre");return;}
    const codUpper=(form.codigo||genCodigo()).toUpperCase();
    if(editandoId){
      saveRepartos(repartos.map(r=>r.id===editandoId?{...r,...form,codigo:codUpper}:r));
    } else {
      const nuevo={id:Date.now(),numero:Number(form.numero),repartidorNombre:form.repartidorNombre.trim(),codigo:codUpper,nombre:`Reparto ${form.numero}`};
      saveRepartos([...repartos,nuevo].sort((a,b)=>a.numero-b.numero));
      // ← Guardar el mismo código como invitación en Firestore para que el repartidor pueda ingresar
      if(negocioId) crearInvitacion(negocioId, form.repartidorNombre.trim(), [], codUpper);
    }
    setModoNuevo(false);setEditandoId(null);setForm({numero:"",repartidorNombre:"",codigo:""});
  };

  const eliminarReparto = (id) => {
    if(!window.confirm("¿Eliminar este reparto?")) return;
    saveRepartos(repartos.filter(r=>r.id!==id));
  };

  const clientesPorReparto = (repId) => clientes.filter(c=>c.repartoId===repId);
  const deudaPorReparto = (repId) => clientes.filter(c=>c.repartoId===repId&&c.saldo<0).reduce((a,c)=>a+Math.abs(c.saldo),0);
  const deudoresCount = (repId) => clientes.filter(c=>c.repartoId===repId&&c.saldo<0).length;
  const visitasPorReparto = (repId) => {
    const ids = new Set(clientesPorReparto(repId).map(c=>c.id));
    return (recordatorios||[]).filter(r=>!r.confirmado && ids.has(r.clienteId));
  };

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Panel del dueño</span>
      </div>

      {/* ── PESTAÑAS ── */}
      <div style={{display:"flex",borderBottom:"2px solid var(--color-border-secondary)"}}>
        {[["repartos","🚚  Repartos"],["herramientas","🛠  Herramientas"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>cambiarTab(id)}
            style={{flex:1,padding:"11px 4px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",
              background:"transparent",
              color:tab===id?"#5daaff":"var(--color-text-tertiary)",
              borderBottom:tab===id?"3px solid #5daaff":"3px solid transparent",
              marginBottom:-2}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: REPARTOS ══════════ */}
      {tab==="repartos" && <>
      {/* Barra de acciones */}
      <div style={{padding:"10px 14px 6px",display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",flex:1}}>
          📋 {repartos.length} reparto{repartos.length!==1?"s":""}
        </span>
        <button style={{...s.btn,padding:"7px 14px",fontSize:12,background:"#185FA5",color:"#e2eaf4",border:"none"}}
          onClick={()=>{setForm({numero:String(repartos.length+1),repartidorNombre:"",codigo:genCodigo()});setModoNuevo(true);setEditandoId(null);}}>
          + Nuevo
        </button>
      </div>

      {/* Formulario nuevo/editar */}
      {(modoNuevo||editandoId)&&(
        <div style={{...s.card,margin:"0 14px 10px",borderLeft:"3px solid #185FA5"}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:12}}>
            {editandoId?"Editar reparto":"Nuevo reparto"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8,marginBottom:8}}>
            <div>
              <label style={s.label}>Número</label>
              <input style={s.input} type="number" min={1} placeholder="1" value={form.numero}
                onChange={e=>setForm(f=>({...f,numero:e.target.value}))}/>
            </div>
            <div>
              <label style={s.label}>Nombre del repartidor</label>
              <input style={s.input} placeholder="Ej: Juan Pérez" value={form.repartidorNombre}
                onChange={e=>setForm(f=>({...f,repartidorNombre:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={s.label}>Código del repartidor (6 letras)</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{...s.input,fontFamily:"monospace",fontSize:18,fontWeight:700,letterSpacing:"0.15em",flex:1,textTransform:"uppercase"}}
                placeholder="XXXXXX" maxLength={6} value={form.codigo}
                onChange={e=>setForm(f=>({...f,codigo:e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,6)}))}/>
              <button style={{...s.btn,padding:"8px 12px",fontSize:12,whiteSpace:"nowrap"}}
                onClick={()=>setForm(f=>({...f,codigo:genCodigo()}))}>🎲 Generar</button>
            </div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>El repartidor usa este código para entrar</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...s.btn,flex:1}} onClick={()=>{setModoNuevo(false);setEditandoId(null);}}>Cancelar</button>
            <button style={{...s.btnPrimary,flex:2,padding:"10px"}} onClick={guardarReparto}>
              {editandoId?"Guardar cambios":"Crear reparto"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de repartos */}
      {repartos.length===0&&!modoNuevo&&(
        <div style={{textAlign:"center",padding:"50px 20px",color:"var(--color-text-tertiary)"}}>
          <div style={{fontSize:48,marginBottom:12}}>🚚</div>
          <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:6}}>Sin repartos aún</div>
          <div style={{fontSize:13}}>Tocá "+ Nuevo reparto" para empezar</div>
        </div>
      )}

      <div style={{padding:"0 14px"}}>
        {[...repartos].sort((a,b)=>a.numero-b.numero).map(rep=>{
          const nCli=clientesPorReparto(rep.id).length;
          const deuda=deudaPorReparto(rep.id);
          const nDeudores=deudoresCount(rep.id);
          return (
            <div key={rep.id} style={{marginBottom:10}}>
              {editandoId===rep.id ? null : (
                <button style={{...s.card,width:"100%",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"16px",margin:0,
                  background:"var(--color-background-secondary)"}}
                  onClick={()=>onSeleccionar(rep)}>
                  {/* Número del reparto */}
                  <div style={{width:52,height:52,borderRadius:14,background:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {rep.numero}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",marginBottom:3}}>
                      {rep.repartidorNombre}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{nCli} cliente{nCli!==1?"s":""}</span>
                      {nDeudores>0&&<span style={s.badge("danger")}>{nDeudores} deben {fmt(deuda)}</span>}
                      {nDeudores===0&&nCli>0&&<span style={s.badge("success")}>✓ Sin deudas</span>}
                    </div>
                    <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:3,fontFamily:"monospace",letterSpacing:"0.1em"}}>
                      Código: {rep.codigo}
                    </div>
                  </div>
                  {(()=>{
                    const pendTrans = (ventas||[]).filter(v=>
                      (v.pago==="transferencia"||v.pago==="mixto") &&
                      !v.transConfirmada &&
                      clientesPorReparto(rep.id).some(c=>c.id===v.clienteId)
                    );
                    const pendVisitas = visitasPorReparto(rep.id);
                    if(!pendTrans.length && !pendVisitas.length) return null;
                    return (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0,marginRight:4}}>
                        {pendVisitas.length>0 &&
                        <div style={{background:"var(--color-background-info)",border:"0.5px solid #5daaff",borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                          <div style={{fontSize:14,fontWeight:500,color:"#5daaff"}}>🔔 {pendVisitas.length}</div>
                          <div style={{fontSize:9,color:"#5daaff",lineHeight:1.2}}>visita{pendVisitas.length>1?"s":""} agend.</div>
                        </div>}
                        {pendTrans.length>0 &&
                        <div style={{background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-warning)"}}>{pendTrans.length}</div>
                          <div style={{fontSize:9,color:"var(--color-text-warning)",lineHeight:1.2}}>transfer{pendTrans.length>1?"s":""} pend.</div>
                        </div>}
                      </div>
                    );
                  })()}
                  <span style={{color:"var(--color-text-tertiary)",fontSize:20}}>→</span>
                </button>
              )}
              {/* Botones editar/eliminar/operar */}
              <div style={{display:"flex",gap:6,marginTop:4,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <button style={{...s.btn,fontSize:11,padding:"4px 10px",background:"rgba(24,95,165,0.2)",color:"#5daaff",border:"1px solid rgba(93,170,255,0.4)"}}
                  onClick={()=>onOperarReparto&&onOperarReparto(rep)}>
                  🚐 Operar
                </button>
                <button style={{...s.btn,fontSize:11,padding:"4px 10px"}}
                  onClick={e=>{e.stopPropagation();setForm({numero:String(rep.numero),repartidorNombre:rep.repartidorNombre,codigo:rep.codigo});setEditandoId(rep.id);setModoNuevo(false);}}>
                  ✏️ Editar
                </button>
                <button style={{...s.btn,fontSize:11,padding:"4px 10px",background:"rgba(245,185,66,0.15)",color:"#f5b942",border:"1px solid rgba(245,185,66,0.4)"}}
                  onClick={async()=>{
                    if(!window.confirm(`¿Resetear PIN de "${rep.repartidorNombre}"?\n\nPodrá ingresar de nuevo con su PIN: ${rep.codigo}`)) return;
                    try {
                      await window.db.collection("repartidores").doc(rep.codigo).set({
                        codigo: rep.codigo,
                        negocioId: negocioId,
                        nombre: rep.repartidorNombre,
                        sectores: rep.sectores||[],
                        activo: true,
                        deviceId: "",
                        activado: false,
                        resetadoEn: new Date().toISOString(),
                      }, {merge: true});
                      alert(`✅ PIN reseteado. "${rep.repartidorNombre}" puede ingresar de nuevo con PIN: ${rep.codigo}`);
                    } catch(e) {
                      alert("Error al resetear: " + e.message);
                    }
                  }}>
                  🔄 Reset
                </button>
                <button style={{...s.btn,fontSize:11,padding:"4px 10px",background:"rgba(220,38,38,0.15)",color:"var(--color-text-danger)"}}
                  onClick={()=>eliminarReparto(rep.id)}>
                  🗑 Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      </>}

      {/* ══════════ TAB: HERRAMIENTAS ══════════ */}
      {tab==="herramientas" && (
        <div style={{padding:"10px 14px 32px"}}>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:10,marginTop:2}}>
            Herramientas del negocio
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {ico:"📊",lbl:"Resumen",sub:"Ventas del período",fn:onResumen,color:"#185FA5"},
              {ico:"👥",lbl:"Todos los clientes",sub:"Clientes, agenda y mapa",fn:onTodosClientes,color:"#0e7c6b"},
              {ico:"📦",lbl:"Stock",sub:"Sodería, depósito, carga",fn:onStock,color:"#065f46"},
              {ico:"⚙️",lbl:"Configuración",sub:"Productos, precios, datos",fn:()=>onConfig&&onConfig("datos"),color:"#555"},
            ].map(({ico,lbl,sub,fn,color})=>(
              <button key={lbl} onClick={fn}
                style={{display:"flex",alignItems:"center",gap:10,padding:"14px 12px",
                  borderRadius:12,cursor:"pointer",border:"none",textAlign:"left",
                  background:"var(--color-background-secondary)",
                  boxShadow:"0 2px 6px rgba(0,0,0,0.25)"}}>
                <div style={{width:40,height:40,borderRadius:10,
                  background:color+"22",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {ico}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--color-text-primary)",
                    lineHeight:1.2}}>{lbl}</div>
                  <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Soporte */}
          <div style={{marginTop:16,textAlign:"center"}}>
            <a href="https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto"
              target="_blank" rel="noopener"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",
                borderRadius:10,background:"#0a2e1f",border:"1px solid #4dd9a0",
                color:"#4dd9a0",fontSize:13,fontWeight:600,textDecoration:"none"}}>
              💬 Soporte por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


function MenuDias({dias,reparto,onDia,onResumen,onConfig,onGestionClientes,onPromocion,onStock,onAgenda,onVolver,transferenciasPendientes,recordatoriosActivos,onConfirmarRecordatorio,onVerConfirmaciones,clientes,ventas,stock,zonasReparto,onSetZona,onDiaHoy,onDiaResumen,noVisitas,onFiados,prospectos}) {
  const [editandoZona, setEditandoZona] = React.useState(null);
  const hoyDiaNombre = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date().getDay()];
  const hoyFechaKey = (()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
  const hoyLabel = new Date().toLocaleDateString("es-AR",{day:"numeric",month:"short"});
  const clientesHoy = (clientes||[]).filter(c=>c.dia===hoyDiaNombre);
  const ventasHoyIds = new Set((ventas||[]).filter(v=>v.fechaKey===hoyFechaKey).map(v=>v.clienteId));
  const noVisitasHoyIds = new Set((noVisitas||[]).filter(v=>v.fecha===hoyFechaKey).map(v=>v.clienteId));
  const visitadosHoy = clientesHoy.filter(c=>ventasHoyIds.has(c.id)||noVisitasHoyIds.has(c.id));
  const diaCompleto = clientesHoy.length>0 && visitadosHoy.length>=clientesHoy.length;
  // Estado del recuadro de HOY según la hora del reloj (si quedó sin terminar):
  //   antes de las 12 → normal (azul) · 12 a 17 hs → naranja · 17 hs en adelante → rojo/pendiente
  const horaActual = new Date().getHours();
  const hayPendHoy = clientesHoy.length>0 && !diaCompleto;
  const estadoHoy = diaCompleto ? "listo"
    : (hayPendHoy && horaActual>=17) ? "rojo"
    : (hayPendHoy && horaActual>=12) ? "naranja"
    : "normal";
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Sistema de Reparto 2026 · Multi</span>
      </div>
      
      
      {recordatoriosActivos&&recordatoriosActivos.length>0&&(
        <div style={{margin:"8px 14px 4px"}}>
          <div style={{fontSize:11,fontWeight:500,color:"#5daaff",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>🔔 Recordatorios pendientes</div>
          {recordatoriosActivos.slice(0,5).map(r=>(
            <div key={r.id} style={{...s.card,margin:"0 0 6px",background:"#1e2e4a",border:"0.5px solid #5daaff",display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:"#5daaff"}}>{r.clienteNombre} · {r.dia}</div>
                <div style={{fontSize:12,color:"var(--color-text-primary)",marginTop:2}}>{r.motivo}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{r.fecha}{r.hora?` · ${r.hora}`:""}</div>
              </div>
              <button style={{background:"#4dd9a0",color:"#0a2e1f",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0,marginTop:2}}
                onClick={()=>onConfirmarRecordatorio&&onConfirmarRecordatorio(r.id)}>✓</button>
            </div>
          ))}
          {recordatoriosActivos.length>5&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",textAlign:"center"}}>+{recordatoriosActivos.length-5} más</div>}
        </div>
      )}
      {transferenciasPendientes&&transferenciasPendientes.length>0&&(
        <div style={{margin:"8px 14px 4px"}}>
          <div style={{fontSize:11,fontWeight:500,color:"#f5b942",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>🔴 Transferencias sin confirmar</div>
          {transferenciasPendientes.map(({dia,fecha,count,monto,ventas:vts})=>(
            <button key={dia+fecha} style={{...s.card,width:"100%",margin:"0 0 6px",background:"#1e3a5f",border:"1px solid #f5b942",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}
              onClick={()=>onVerConfirmaciones&&onVerConfirmaciones(dia)}>
              <span style={{fontSize:18}}>🔴</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:"#f5b942"}}>{dia} · {count} transfer. sin confirmar</div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>{vts.slice(0,3).map(v=>v.cliente).join(", ")}{vts.length>3?` +${vts.length-3} más`:""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:500,color:"#f5b942"}}>{fmt(monto)}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{fecha}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <span style={s.sectionTitle}>Días de reparto</span>
      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:8}}>
        {dias.map((d,idx)=>{
          const deudas = (clientes||[]).filter(c=>c.dia===d&&c.saldo<0);
          const totalDeuda = deudas.reduce((a,c)=>a+Math.abs(c.saldo),0);
          const totalClientes = (clientes||[]).filter(c=>c.dia===d).length;
          const totalProspectos = (prospectos||[]).filter(p=>p.dia===d&&(p.estado==="activo"||!p.estado)).length;
          const zona = (zonasReparto||{})[d] || "";
          // ── Día pasado sin cargar nada (no hoy): busca su última fecha ya ocurrida y
          //    si no hay ninguna venta ni "no visita" registrada ese día, queda pendiente ──
          let noCargado = false, fechaNoCargadoLabel = "", fechaNoCargadoKey = "";
          if(d!==hoyDiaNombre){
            const idxDiaMap = {"Domingo":0,"Lunes":1,"Martes":2,"Miércoles":3,"Jueves":4,"Viernes":5,"Sábado":6};
            let diff = new Date().getDay() - idxDiaMap[d];
            if(diff<=0) diff += 7; // si todavía no pasó esta semana, mira la ocurrencia de la semana pasada
            const fechaObj = new Date(); fechaObj.setDate(fechaObj.getDate()-diff);
            const fkObj = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,'0')}-${String(fechaObj.getDate()).padStart(2,'0')}`;
            const clientesEseDia = (clientes||[]).filter(c=>c.dia===d);
            const ventasEseDiaIds = new Set((ventas||[]).filter(v=>v.fechaKey===fkObj).map(v=>v.clienteId));
            const noVisitasEseDiaIds = new Set((noVisitas||[]).filter(v=>v.fecha===fkObj).map(v=>v.clienteId));
            const cargadoEseDia = clientesEseDia.some(c=>ventasEseDiaIds.has(c.id)||noVisitasEseDiaIds.has(c.id));
            noCargado = clientesEseDia.length>0 && !cargadoEseDia;
            fechaNoCargadoLabel = fechaObj.toLocaleDateString("es-AR",{day:"numeric",month:"short"});
            fechaNoCargadoKey = fkObj;
          }
          return (<React.Fragment key={d}>
          <div style={{display:"flex",gap:6,alignItems:"stretch"}}>
          <button style={{...s.card,margin:0,flex:1,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px"}} onClick={()=>onDia(d)}>
            <div style={{flex:1,minWidth:0}}>
              {/* Línea 1: Día · Zona */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{d}</span>
                {zona&&<>
                  <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>·</span>
                  <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{zona}</span>
                </>}
                {!zona&&<span style={{fontSize:12,color:"var(--color-text-tertiary)",fontStyle:"italic",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setEditandoZona(d);}}>+ zona</span>}
              </div>
              {/* Línea 2: deuda a la izquierda, clientes a la derecha */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {totalDeuda>0
                  ?<span style={{fontSize:12,color:"var(--color-text-danger)"}}>⚠ {deudas.length} cliente{deudas.length>1?"s":""} {deudas.length>1?"deben":"debe"} {fmt(totalDeuda)}</span>
                  :<span style={{fontSize:12,color:"var(--color-text-success)"}}>✓ Sin deudas</span>
                }
                <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{totalClientes} cliente{totalClientes!==1?"s":""}</span>
              </div>
            </div>
            <span style={{color:"var(--color-text-tertiary)",fontSize:18,marginLeft:10}}>→</span>
          </button>
          {d===hoyDiaNombre&&onDiaHoy&&(()=>{
            const cfg = ({
              listo:   {bg:"#0a5c3a", border:"1.5px solid #4dd9a0", icon:"✅", txt:"Listo",     txtCol:"#4dd9a0", subCol:"#9FE1CB"},
              rojo:    {bg:"#b91c1c", border:"1.5px solid #fca5a5", icon:"🔴", txt:"Pendiente", txtCol:"#ffe4e4", subCol:"#ffc9c9"},
              naranja: {bg:"#b45309", border:"1.5px solid #fcd34d", icon:"⏰", txt:"Hoy",       txtCol:"#fff4e0", subCol:"#ffe0b5"},
              normal:  {bg:"#185FA5", border:"none",                icon:"📅", txt:"Hoy",       txtCol:"#e2eaf4", subCol:"#b5d4f4"},
            })[estadoHoy];
            const sub = (diaCompleto || estadoHoy!=="normal") ? `${visitadosHoy.length}/${clientesHoy.length}` : hoyLabel;
            return (
            <button
              style={{background:cfg.bg,borderRadius:12,padding:"8px 10px",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:2,minWidth:56,border:cfg.border,cursor:"pointer",flexShrink:0}}
              onClick={()=>diaCompleto?(onDiaResumen&&onDiaResumen(d,hoyFechaKey)):onDiaHoy(d,hoyFechaKey)}>
              <span style={{fontSize:16}}>{cfg.icon}</span>
              <span style={{fontSize:9,color:cfg.txtCol,fontWeight:500,textAlign:"center",lineHeight:1.3}}>
                {cfg.txt}
              </span>
              <span style={{fontSize:9,color:cfg.subCol,lineHeight:1}}>
                {sub}
              </span>
            </button>
            );
          })()}
          {noCargado&&onDiaHoy&&(
            <button
              style={{background:"#b91c1c",borderRadius:12,padding:"8px 10px",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:2,minWidth:56,border:"1.5px solid #fca5a5",cursor:"pointer",flexShrink:0}}
              onClick={()=>onDiaHoy(d,fechaNoCargadoKey)}>
              <span style={{fontSize:16}}>🔴</span>
              <span style={{fontSize:9,color:"#ffe4e4",fontWeight:500,textAlign:"center",lineHeight:1.3}}>No cargado</span>
              <span style={{fontSize:9,color:"#ffc9c9",lineHeight:1}}>{fechaNoCargadoLabel}</span>
            </button>
          )}
          )}
          </div>
          {/* Modal inline editar zona */}
          {editandoZona===d&&(
            <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:10,padding:"10px 14px",marginTop:2}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Zona de reparto del {d}</div>
              <div style={{display:"flex",gap:8}}>
                <input id={`zona-${d}`} style={s.input} defaultValue={zona} placeholder="Ej: Lomas de Tafí" autoFocus />
                <button style={{...s.btnPrimary,padding:"6px 14px",fontSize:13,whiteSpace:"nowrap"}} onClick={()=>{
                  const v=document.getElementById(`zona-${d}`).value.trim();
                  onSetZona(d,v);
                  setEditandoZona(null);
                }}>OK</button>
                <button style={{...s.btn,padding:"6px 10px",fontSize:13}} onClick={()=>setEditandoZona(null)}>✕</button>
              </div>
            </div>
          )}
          {zona&&editandoZona!==d&&(
            <div style={{textAlign:"right",marginTop:2,marginBottom:2}}>
              <span style={{fontSize:10,color:"var(--color-text-tertiary)",cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setEditandoZona(d);}}>editar zona</span>
            </div>
          )}
          {idx===dias.length-1&&stock&&(
            (()=>{
              const CAJON=6;
              const sCaj=Math.floor((stock.soderia?.sifon||0)/CAJON);
              const cCaj=Math.floor((stock.casa?.sifon||0)/CAJON);
              const sB10=stock.soderia?.bidon10||0, cB10=stock.casa?.bidon10||0;
              const sB20=stock.soderia?.bidon20||0, cB20=stock.casa?.bidon20||0;
              const envC={sifon:0,bidon10:0,bidon20:0};
              (clientes||[]).forEach(c=>{envC.sifon+=(c.sifon||0);envC.bidon10+=(c.bidon10||0);envC.bidon20+=(c.bidon20||0);});
              (ventas||[]).forEach(v=>{
                (v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)envC[k]+=Number(e.cant)||0;});
                (v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)envC[k]-=Number(e.cant)||0;});
              });
              const envCCaj=Math.floor(envC.sifon/CAJON);
              const totCaj=sCaj+cCaj+envCCaj, totB10=sB10+cB10+envC.bidon10, totB20=sB20+cB20+envC.bidon20;
              const StockCard = ()=>{
                const [open,setOpen]=React.useState(false);
                return (
                  <div style={{...s.card,margin:"4px 0 0",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-secondary)"}}>
                    {/* Header siempre visible — toca para desplegar */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>📦 Stock</span>
                        {/* Resumen compacto siempre visible */}
                        <div style={{display:"flex",gap:6}}>
                          {[[totCaj,"caj"],[totB10,"10L"],[totB20,"20L"]].map(([v,u],i)=>(
                            <span key={i} style={{fontSize:12,fontWeight:600,color:Number(v)<3?"var(--color-text-danger)":Number(v)<8?"var(--color-text-warning)":"var(--color-text-info)"}}>{v}<span style={{fontSize:10,fontWeight:400,color:"var(--color-text-tertiary)",marginLeft:1}}>{u}</span></span>
                          ))}
                        </div>
                      </div>
                      <span style={{fontSize:13,color:"var(--color-text-tertiary)",transition:"transform 0.2s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
                    </div>
                    {/* Detalle desplegable */}
                    {open&&<div style={{marginTop:12}}>
                      {[["🏭 Sodería",[sCaj,sB10,sB20],"primary"],["👥 En clientes",[envCCaj,envC.bidon10,envC.bidon20],"info"],["📦 Total general",[totCaj,totB10,totB20],"info"]].map(([titulo,vals,color],gi)=>(
                        <div key={gi} style={{marginBottom:gi<2?10:0}}>
                          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>{titulo}</div>
                          <div style={{display:"flex",gap:6}}>
                            {vals.map((v,i)=>(
                              <div key={i} style={{textAlign:"center",flex:1,background:gi===2?"#1e3a5f":"var(--color-background-tertiary)",borderRadius:8,padding:"6px 4px",border:gi===2?"0.5px solid var(--color-border-info)":"none"}}>
                                <div style={{fontSize:18,fontWeight:gi===2?700:600,color:gi===0?(Number(v)<3?"var(--color-text-danger)":Number(v)<8?"var(--color-text-warning)":"var(--color-text-primary)"):`var(--color-text-${color})`}}>{v}</div>
                                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{["caj","10L","20L"][i]}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button style={{...s.btn,width:"100%",marginTop:10,fontSize:12,padding:"7px"}} onClick={e=>{e.stopPropagation();onStock();}}>Editar stock →</button>
                    </div>}
                  </div>
                );
              };
              return <StockCard/>;
            })()
          )}
          </React.Fragment>);
        })}
        <div style={s.divider} />
        {/* Accesos rápidos */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"4px 0 8px"}}>
          {[
            {ico:"📅",lbl:"Agenda",fn:()=>onAgenda&&onAgenda()},
            {ico:"💰",lbl:"Fiados",fn:()=>onFiados&&onFiados()},
            {ico:"📊",lbl:"Resumen",fn:()=>onResumen&&onResumen()},
          ].map(({ico,lbl,fn})=>(
            <button key={lbl} onClick={fn} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px",borderRadius:11,cursor:"pointer",border:"none",background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)"}}>
              <span style={{fontSize:19}}>{ico}</span>
              <span style={{fontSize:9,fontWeight:500,color:"var(--color-text-tertiary)"}}>{lbl}</span>
            </button>
          ))}
        </div>

        <div style={s.divider} />

        {/* Fila 1: Clientes y Stock (grandes) */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingBottom:4}}>
          {[
            {ico:"👥",lbl:"Clientes",fn:onGestionClientes,bg:"#185FA5",desc:"Lista · Fiados · Agenda"},
            {ico:"📦",lbl:"Stock",fn:onStock,bg:"#1a5e35",desc:"Inventario · Resumen"},
          ].map(({ico,lbl,fn,bg,desc})=>(
            <button key={lbl} onClick={fn} style={{
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
              padding:"18px 8px",borderRadius:14,cursor:"pointer",border:"none",
              background:bg,color:"#e2eaf4",boxShadow:"0 3px 10px rgba(0,0,0,0.35)",
            }}>
              <span style={{fontSize:30}}>{ico}</span>
              <span style={{fontSize:14,fontWeight:700}}>{lbl}</span>
              <span style={{fontSize:9,opacity:0.75,textAlign:"center",lineHeight:1.4}}>{desc}</span>
            </button>
          ))}
        </div>

        {/* Fila 2: Config */}
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,paddingBottom:8}}>
          <button onClick={onConfig} style={{
            display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,
            padding:"12px 10px",borderRadius:12,cursor:"pointer",border:"none",
            background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",
            boxShadow:"0 2px 6px rgba(0,0,0,0.2)",
          }}>
            <span style={{fontSize:20}}>⚙️</span>
            <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Config</span>
          </button>
        </div>

      </div>
    </div>
  );
}

function DiaPrincipal({dia,onIrClientes,onIrPlanilla,onVolver,onVerConfirmaciones,ventasPendientesTransfer}) {
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>{dia}</span>
      </div>
      <div style={{padding:"24px 16px",display:"flex",flexDirection:"column",gap:12}}>
        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 16px"}} onClick={onIrPlanilla}>
          <div>
            <div style={{fontSize:17,fontWeight:500,color:"var(--color-text-primary)"}}>📋 Planilla del día</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:4}}>Fechas de visita · inicio del reparto · totales</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)",fontSize:20}}>→</span>
        </button>
        {ventasPendientesTransfer>0&&(
          <button style={{...s.card,margin:"0 0 10px",background:"#1e3a5f",border:"1px solid #f5b942",display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",textAlign:"left",cursor:"pointer"}}
            onClick={onVerConfirmaciones}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:"#f5b942"}}>🔴 {ventasPendientesTransfer} transferencia{ventasPendientesTransfer>1?"s":""} sin confirmar</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>Tocá para ir a confirmar →</div>
            </div>
            <span style={{color:"#f5b942",fontSize:18}}>→</span>
          </button>
        )}
        <button style={{...s.card,margin:0,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 16px"}} onClick={onIrClientes}>
          <div>
            <div style={{fontSize:17,fontWeight:500,color:"var(--color-text-primary)"}}>👥 Clientes del día</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:4}}>Registrar entregas y visitas</div>
          </div>
          <span style={{color:"var(--color-text-tertiary)",fontSize:20}}>→</span>
        </button>
      </div>
    </div>
  );
}

function DetalleTransferencias({ventas, ventasPendTrans}) {
  const [abierto, setAbierto] = React.useState(false);
  const pendientes = (ventasPendTrans||[]).length;
  return (
    <div style={{marginTop:8,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8}}>
      <button style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}
        onClick={()=>setAbierto(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Detalle de transferencias</span>
          {pendientes>0&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--color-background-warning)",color:"#f5b942",fontWeight:600}}>🔴 {pendientes} pend.</span>}
        </div>
        <span style={{fontSize:13,color:"var(--color-text-tertiary)",display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </button>
      {abierto&&(
        <div style={{marginTop:6}}>
          {ventas.map(v=>{
            const confirmada=!!v.transConfirmada;
            return (
              <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,color:"var(--color-text-primary)",fontWeight:500}}>{v.cliente}</span>
                  <span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:4,
                    background:confirmada?"var(--color-background-success)":"var(--color-background-warning)",
                    color:confirmada?"var(--color-text-success)":"#f5b942",fontWeight:600}}>
                    {confirmada?"✅ Confirmada":"🔴 Pendiente"}
                  </span>
                </div>
                <span style={{fontSize:13,fontWeight:500,color:confirmada?"var(--color-text-success)":"#f5b942"}}>{fmt(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.pagadoNum||v.neto||0))}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetalleVentasDia({ventas, clientes, prospectos, noVisitas, fecha}) {
  const [abierto, setAbierto] = React.useState(false);
  const todosMap = React.useMemo(()=>{
    const m={};
    (prospectos||[]).forEach(p=>{ m[p.id]={...p,_esProspecto:true}; });
    (clientes||[]).forEach(c=>{ m[c.id]=c; });
    return m;
  },[clientes,prospectos]);
  const fmtEnv=(arr)=>(arr||[]).filter(e=>e.prod&&Number(e.cant)>0).map(e=>`${e.cant} ${e.prod}`).join(", ");
  return (
    <div style={{margin:"0 0 8px",borderRadius:12,overflow:"hidden",border:"1.5px solid #185FA5",background:"var(--color-background-info)"}}>
      <button
        style={{width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left"}}
        onClick={()=>setAbierto(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>📋</span>
          <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-info)"}}>Detalle de ventas del día</span>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{ventas.length} venta{ventas.length>1?"s":""}</span>
        </div>
        <span style={{color:"var(--color-text-info)",fontSize:14,display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </button>
      {abierto&&(
        <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)"}}>
          {ventas.map((v,idx)=>{
            const pagoBadge={
              contado:{bg:"var(--color-background-success)",color:"var(--color-text-success)",txt:"Contado"},
              transferencia:{bg:v.transConfirmada?"var(--color-background-success)":"var(--color-background-warning)",color:v.transConfirmada?"var(--color-text-success)":"#f5b942",txt:v.transConfirmada?"Transfer. ✅":"Transfer. 🔴"},
              fiado:{bg:"var(--color-background-warning)",color:"var(--color-text-warning)",txt:"Fiado"},
              mixto:{bg:"var(--color-background-info)",color:"var(--color-text-info)",txt:`Mixto 💵$${v.montoEfec||0} + 💳$${v.montoTrans||0}`},
            }[v.pago]||{bg:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",txt:v.pago};
            const cli=todosMap[v.clienteId]||{};
            const dir=(cli.calle?`${cli.calle} ${cli.nro||""}`:cli.manzana?`Mz ${cli.manzana} L ${cli.lote}`:"")+(cli.barrio?` · ${cli.barrio}`:"");
            const deudaPagada=Math.max(0,(v.pagadoNum||0)-(v.neto||0));
            const prestStr=fmtEnv(v.envPrest); const devStr=fmtEnv(v.envDev);
            return (
              <div key={v.id} style={{padding:"10px 16px",borderBottom:idx<ventas.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{v.cliente}</span>
                    {cli._esProspecto&&<span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:4,background:"#2e1f06",color:"#f5b942",fontWeight:600}}>🚀 Prospecto</span>}
                    <span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:4,background:pagoBadge.bg,color:pagoBadge.color,fontWeight:600}}>{pagoBadge.txt}</span>
                    {v.repartidor&&<span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",fontWeight:500}}>🚐 {v.repartidor}</span>}
                    {dir&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>📍 {dir}</div>}
                  </div>
                  <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(v.neto||0)}</span>
                </div>
                {(v.detalle||[]).map((d,di)=>(
                  <div key={di} style={{display:"flex",justifyContent:"space-between",padding:"2px 0 2px 8px"}}>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{d.nombre} × {d.cantidad}</span>
                    <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{fmt(d.total)}</span>
                  </div>
                ))}
                {(v.saldoAplicado>0||deudaPagada>0||prestStr||devStr)&&(
                  <div style={{display:"flex",flexDirection:"column",gap:2,padding:"3px 0 0 8px",marginTop:2,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                    {v.saldoAplicado>0&&<span style={{fontSize:11,color:"var(--color-text-success)"}}>Saldo a favor aplicado: −{fmt(v.saldoAplicado)}</span>}
                    {deudaPagada>0&&<span style={{fontSize:11,color:"var(--color-text-success)"}}>💵 Pagó deuda: +{fmt(deudaPagada)}</span>}
                    {prestStr&&<span style={{fontSize:11,color:"#f5b942"}}>📦 Prestó: {prestStr}</span>}
                    {devStr&&<span style={{fontSize:11,color:"var(--color-text-info)"}}>↩️ Devolvió: {devStr}</span>}
                  </div>
                )}
              </div>
            );
          })}
          {(()=>{
            const ventaIds = new Set(ventas.map(v=>v.clienteId));
            const noComp = (noVisitas||[]).filter(n=>n.fecha===fecha && !ventaIds.has(n.clienteId) && n.motivo!=="salteado");
            if(noComp.length===0) return null;
            const lbl = (m)=> m==="noquiso" ? {t:"No quiso",c:"var(--color-text-danger)",ic:"🚫"} : {t:"No estaba",c:"var(--color-text-warning)",ic:"🔄"};
            return (
              <div style={{borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{padding:"8px 16px 4px",fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>No compraron ({noComp.length})</div>
                {noComp.map((n,i)=>{
                  const p = todosMap[n.clienteId] || {};
                  const info = lbl(n.motivo);
                  const dir = (p.calle?`${p.calle} ${p.nro||""}`:p.manzana?`Mz ${p.manzana} L ${p.lote}`:"")+(p.barrio?` · ${p.barrio}`:"");
                  return (
                    <div key={"nv"+i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 16px",borderTop:i>0?"0.5px solid var(--color-border-tertiary)":"none"}}>
                      <div style={{minWidth:0}}>
                        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{p.nombre||"Cliente"}</span>
                        {dir&&<div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>📍 {dir}</div>}
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:info.c,flexShrink:0}}>{info.ic} {info.t}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PlanillaDelDia({dia,fecha,ventas,clientes,planilla,productos,stock,setStock,syncData,onGuardar,onVolver,onCerrarDia,initCierre,prospectos,noVisitas}) {
  // Separar ventas del día propio vs ventas de clientes de otro día
  const [enviosInforme,setEnviosInforme] = React.useState(()=>Number(localStorage.getItem(`sr_informe_${fecha}_${dia}`)||0));
  const clientesDia = new Set((clientes||[]).filter(c=>c.dia===dia).map(c=>c.id));
  const ventasPropias  = ventas.filter(v=>clientesDia.has(v.clienteId));
  const ventasExtraDia = ventas.filter(v=>!clientesDia.has(v.clienteId)&&(!v.dia||v.dia===dia)&&v.fechaKey===fecha);
  // Auto-calcular desde ventas del dia
  const CAJON_SODA = 6;
  const getProdCosto = (nombre) => { const p=(productos||[]).find(x=>x.nombre===nombre); return p?(p.costo||0):0; };
  const costSifon  = getProdCosto("Sifón 1.5L") || 133.33;
  const costB10    = getProdCosto("Bidón 10L")   || 800;
  const costB20    = getProdCosto("Bidón 20L")   || 1100;
  const COSTO_CAJON_SODA = costSifon * CAJON_SODA;
  const prodKey = {"Bidón 10L":"b10","Bidón 20L":"b20","Sifón 1.5L":"soda"};
  // Solo ventas de clientes propios del día
  const totalesPorProd = {b10:{vacios:0,plata:0,llenar:0},b20:{vacios:0,plata:0,llenar:0},soda:{vacios:0,plata:0,llenar:0,cajones:0}};
  ventasPropias.forEach(v=>{ v.detalle.forEach(d=>{ const k=prodKey[d.nombre]; if(!k) return; totalesPorProd[k].vacios+=d.cantidad; totalesPorProd[k].plata+=d.total; }); });
  const sodaCajones = Math.floor(totalesPorProd.soda.vacios/CAJON_SODA)||0;
  totalesPorProd.soda.cajones = sodaCajones;
  totalesPorProd.soda.llenar  = sodaCajones * COSTO_CAJON_SODA;
  totalesPorProd.b10.llenar   = totalesPorProd.b10.vacios * costB10;
  totalesPorProd.b20.llenar   = totalesPorProd.b20.vacios * costB20;

  const totalVentaPlata  = Object.values(totalesPorProd).reduce((a,p)=>a+p.plata,0);
  const totalVentaLlenar = Object.values(totalesPorProd).reduce((a,p)=>a+p.llenar,0);
  // Totales ventas de otros días
  const extraEfectivo = ventasExtraDia.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const extraTrans    = ventasExtraDia.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const extraFiado    = ventasExtraDia.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
  const extraTotal    = extraEfectivo + extraTrans + extraFiado;
  // Cobranza — solo ventas propias del día
  const cobEfectivo   = ventasPropias.filter(v=>v.pago==="contado"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoEfec)||0):(v.pagadoNum||v.neto||0)),0);
  const cobTransBruto = ventasPropias.filter(v=>v.pago==="transferencia"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.pagadoNum||v.neto||0)),0);
  const cobTransDesc  = Math.round(cobTransBruto*0.025);
  const cobTransNeto  = cobTransBruto - cobTransDesc;
  const ventasPendTrans = ventas.filter(v=>(v.pago==="transferencia"||(v.pago==="mixto"&&(Number(v.montoTrans)||0)>0))&&!v.transConfirmada);
  const cobFiado      = ventasPropias.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
  const cobSaldosEfec  = ventasPropias.filter(v=>v.pago==="contado").reduce((a,v)=>{ const extra=(v.pagadoNum||0)-(v.neto||0); return a+(extra>0?extra:0); },0);
  const cobSaldosTrans = ventasPropias.filter(v=>v.pago==="transferencia").reduce((a,v)=>{ const extra=(v.pagadoNum||0)-(v.neto||0); return a+(extra>0?extra:0); },0);
  const cobSaldos      = cobSaldosEfec + cobSaldosTrans;
  const fiadoNeto      = cobFiado - cobSaldos;

  const [datos,setDatos] = useState(()=>{
    const _sLlenos = Number(planilla?.productos?.soda?.llenos||0);
    const _b10Init = Number(planilla?.productos?.b10?.llenos||0);
    const _b20Init = Number(planilla?.productos?.b20?.llenos||0);
    const _cajInit = Math.floor(_sLlenos/(CAJON_SODA||6));
    const _pesoInit  = _cajInit * 13 + _b10Init * 10 + _b20Init * 20;
    const _bultosInit = _cajInit + _b10Init + _b20Init;
    return {
      ...planilla,
      peso:        planilla.peso        || (_pesoInit>0   ? String(_pesoInit)                 : ""),
      bultos:      planilla.bultos      || (_bultosInit>0 ? String(_bultosInit)               : ""),
      efectivo:    planilla.efectivo    || (cobEfectivo>0   ? String(Math.round(cobEfectivo))   : ""),
      fiado:       planilla.fiado       || (cobFiado>0      ? String(Math.round(cobFiado))      : ""),
      retenciones: planilla.retenciones || (cobTransDesc>0  ? String(cobTransDesc)              : ""),
    };
  });
  const set = (k,v) => setDatos(d=>({...d,[k]:v}));
  const setProd=(pid,campo,v)=>setDatos(d=>({...d,productos:{...d.productos,[pid]:{...d.productos[pid],[campo]:v}}}));
  const setGasto=(i,campo,v)=>{const g=[...(datos.gastos||[])];g[i]={...g[i],[campo]:v};setDatos(d=>({...d,gastos:g}));};
  const addGasto=()=>setDatos(d=>({...d,gastos:[...(d.gastos||[]),{cat:"propina",monto:""}]}));
  const delGasto=(i)=>setDatos(d=>({...d,gastos:d.gastos.filter((_,j)=>j!==i)}));

  const totalGastos=(datos.gastos||[]).reduce((a,g)=>a+num(g.monto),0);
  const efectivo=num(datos.efectivo), fiado=num(datos.fiado), retenciones=num(datos.retenciones);
  const sobrante=efectivo-(totalVentaPlata-fiado);
  const ganancia=(cobEfectivo+cobTransBruto+cobFiado+cobSaldos)-totalVentaLlenar-totalGastos;
  const totalLlenosIngresados=PRODUCTOS_CONFIG.reduce((a,p)=>a+num(datos.productos[p.id]?.llenos),0);


  // ── Cierre del día: estados y cálculos ───────────────────────────
  const [mostrarCierre, setMostrarCierre] = useState(!!(initCierre && !planilla._diaCerrado));
  const [realesLlenos, setRealesLlenos] = useState({soda:"",b10:"",b20:""});
  const [realesVacios, setRealesVacios] = useState({soda:"",b10:"",b20:""});
  const yaCerrado = !!planilla._diaCerrado;

  const llenosCargados = {
    soda: Number(datos.productos?.soda?.llenos||0),
    b10:  Number(datos.productos?.b10?.llenos||0),
    b20:  Number(datos.productos?.b20?.llenos||0),
  };
  // Peso y bultos calculados desde los productos cargados
  const cajonesLlenos = Math.floor((llenosCargados.soda||0)/CAJON_SODA);
  const b10Llenos = llenosCargados.b10||0;
  const b20Llenos = llenosCargados.b20||0;
  const pesoAuto   = cajonesLlenos*13 + b10Llenos*10 + b20Llenos*20;
  const bultosAuto = cajonesLlenos + b10Llenos + b20Llenos;
  const vendidosDia={soda:0,b10:0,b20:0};
  const prestadosDia={soda:0,b10:0,b20:0};
  const devueltosDia={soda:0,b10:0,b20:0};
  ventas.forEach(v=>{
    (v.detalle||[]).forEach(d=>{const k=prodKey[d.nombre];if(k)vendidosDia[k]+=d.cantidad;});
    (v.envPrest||[]).forEach(e=>{const k=prodKey[e.prod||""];if(k)prestadosDia[k]+=Number(e.cant)||0;});
    (v.envDev||[]).forEach(e=>{const k=prodKey[e.prod||""];if(k)devueltosDia[k]+=Number(e.cant)||0;});
  });
  const sobrantes={
    soda:Math.max(0,llenosCargados.soda-vendidosDia.soda),
    b10: Math.max(0,llenosCargados.b10-vendidosDia.b10),
    b20: Math.max(0,llenosCargados.b20-vendidosDia.b20),
  };
  const vaciosRec={
    soda:Math.max(0,vendidosDia.soda+devueltosDia.soda-prestadosDia.soda),
    b10: Math.max(0,vendidosDia.b10+devueltosDia.b10-prestadosDia.b10),
    b20: Math.max(0,vendidosDia.b20+devueltosDia.b20-prestadosDia.b20),
  };

  const confirmarCierre = () => {
    const realesL={
      soda: realesLlenos.soda!==""?Number(realesLlenos.soda)*CAJON_SODA:sobrantes.soda,
      b10:  realesLlenos.b10!==""?Number(realesLlenos.b10):sobrantes.b10,
      b20:  realesLlenos.b20!==""?Number(realesLlenos.b20):sobrantes.b20,
    };
    const realesV={
      soda: realesVacios.soda!==""?Number(realesVacios.soda)*CAJON_SODA:vaciosRec.soda,
      b10:  realesVacios.b10!==""?Number(realesVacios.b10):vaciosRec.b10,
      b20:  realesVacios.b20!==""?Number(realesVacios.b20):vaciosRec.b20,
    };
    const diffs={};
    ["soda","b10","b20"].forEach(pk=>{
      const calcL=pk==="soda"?Math.floor(sobrantes[pk]/CAJON_SODA):sobrantes[pk];
      const calcV=pk==="soda"?Math.floor(vaciosRec[pk]/CAJON_SODA):vaciosRec[pk];
      const realL=realesLlenos[pk]!==""?Number(realesLlenos[pk]):calcL;
      const realV=realesVacios[pk]!==""?Number(realesVacios[pk]):calcV;
      if(realL!==calcL)diffs[`llenos_${pk}`]={calc:calcL,real:realL};
      if(realV!==calcV)diffs[`vacios_${pk}`]={calc:calcV,real:realV};
    });
    const s=JSON.parse(JSON.stringify(stock));
    if(!s.soderia)s.soderia={sifon:0,bidon10:0,bidon20:0};
    if(!s.soderia_vacios)s.soderia_vacios={sifon:0,bidon10:0,bidon20:0};
    const conv={soda:"sifon",b10:"bidon10",b20:"bidon20"};
    ["soda","b10","b20"].forEach(pk=>{
      const sk=conv[pk];
      s.soderia[sk]=(s.soderia[sk]||0)+realesL[pk];
      s.soderia_vacios[sk]=(s.soderia_vacios[sk]||0)+realesV[pk];
    });
    s.camion={sifon:0,bidon10:0,bidon20:0};
    setStock(s);syncData({stock:s});
    onGuardar({...datos,_diaCerrado:true,_stockActualizado:true,...(Object.keys(diffs).length>0?{_cierreDiffs:diffs}:{})});
    setMostrarCierre(false);
    if(onCerrarDia)setTimeout(()=>onCerrarDia(),800);
  };

  // ── Early return: pantalla de cierre ─────────────────────────────
  if(mostrarCierre){
    const llenosVuelta={
      soda: realesLlenos.soda!==""?Number(realesLlenos.soda):Math.floor(sobrantes.soda/CAJON_SODA),
      b10:  realesLlenos.b10!==""?Number(realesLlenos.b10):sobrantes.b10,
      b20:  realesLlenos.b20!==""?Number(realesLlenos.b20):sobrantes.b20,
    };
    const vaciosVuelta={
      soda: realesVacios.soda!==""?Number(realesVacios.soda):Math.floor(vaciosRec.soda/CAJON_SODA),
    };
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={()=>setMostrarCierre(false)}>← Volver</button>
          <span style={s.headerTitle}>Cierre del día · {dia}</span>
        </div>
        <div style={{padding:16}}>

          {/* LO QUE CARGASTE HOY */}
          <span style={{...s.sectionTitle,padding:"0 0 8px"}}>LO QUE CARGASTE HOY</span>
          <div style={{...s.card,margin:"0 0 12px"}}>
            {[
              ["Soda",      llenosCargados.soda>0?`${Math.floor(llenosCargados.soda/CAJON_SODA)} cajones (${llenosCargados.soda} un)`:"—"],
              ["Bidón 10L", llenosCargados.b10>0?`${llenosCargados.b10} unidades`:"—"],
              ["Bidón 20L", llenosCargados.b20>0?`${llenosCargados.b20} unidades`:"—"],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:14,color:"var(--color-text-secondary)"}}>{l}</span>
                <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{v}</span>
              </div>
            ))}
          </div>

          {/* MOVIMIENTOS DEL DÍA */}
          <span style={{...s.sectionTitle,padding:"0 0 8px"}}>MOVIMIENTOS DEL DÍA (REGISTRADOS)</span>
          <div style={{...s.card,margin:"0 0 12px",padding:"10px 12px"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",marginBottom:8}}>
              {["","Vendido","Prestado","Devuelto"].map(h=>(
                <div key={h} style={{fontSize:11,color:"var(--color-text-tertiary)",textAlign:h?"center":"left",fontWeight:500}}>{h}</div>
              ))}
            </div>
            {[["Soda","soda"],["10L","b10"],["20L","b20"]].map(([label,pk])=>(
              <div key={pk} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"7px 0",borderTop:"0.5px solid var(--color-border-tertiary)",alignItems:"center"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{label}</span>
                <span style={{textAlign:"center",fontSize:15,fontWeight:600,color:"var(--color-text-warning)"}}>
                  {vendidosDia[pk]>0?`−${pk==="soda"?Math.floor(vendidosDia[pk]/CAJON_SODA):vendidosDia[pk]}`:"—"}
                </span>
                <span style={{textAlign:"center",fontSize:15,fontWeight:600,color:prestadosDia[pk]>0?"var(--color-text-warning)":"var(--color-text-tertiary)"}}>
                  {prestadosDia[pk]>0?`−${pk==="soda"?Math.floor(prestadosDia[pk]/CAJON_SODA):prestadosDia[pk]}`:"0"}
                </span>
                <span style={{textAlign:"center",fontSize:15,fontWeight:600,color:devueltosDia[pk]>0?"var(--color-text-success)":"var(--color-text-tertiary)"}}>
                  {devueltosDia[pk]>0?`+${pk==="soda"?Math.floor(devueltosDia[pk]/CAJON_SODA):devueltosDia[pk]}`:"0"}
                </span>
              </div>
            ))}
          </div>

          {/* CONFIRMÁ LO QUE TRAÉS DE VUELTA */}
          <span style={{...s.sectionTitle,padding:"0 0 8px"}}>CONFIRMÁ LO QUE TRAÉS DE VUELTA</span>
          <div style={{...s.card,margin:"0 0 12px",padding:"10px 12px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:4,marginBottom:8}}>
              {["","Debería tener","Tenés en mano"].map(h=>(
                <div key={h} style={{fontSize:11,color:h==="Debería tener"?"#5daaff":"var(--color-text-secondary)",textAlign:h?"center":"left",fontWeight:500}}>{h}</div>
              ))}
            </div>
            {[
              ["Soda\n(vacíos)","soda","vacios"],
              ["10L\n(sobrante)","b10","llenos"],
              ["20L\n(sobrante)","b20","llenos"],
            ].map(([label,pk,tipo])=>{
              const calcVal=tipo==="vacios"
                ?(pk==="soda"?Math.floor(vaciosRec[pk]/CAJON_SODA):vaciosRec[pk])
                :(pk==="soda"?Math.floor(sobrantes[pk]/CAJON_SODA):sobrantes[pk]);
              const stateObj=tipo==="vacios"?realesVacios:realesLlenos;
              const setFn=tipo==="vacios"?setRealesVacios:setRealesLlenos;
              const realVal=stateObj[pk]!==""?Number(stateObj[pk]):calcVal;
              const diff=realVal-calcVal;
              return (
                <div key={pk} style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10,marginTop:6}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,color:"var(--color-text-primary)",whiteSpace:"pre-line"}}>{label}</span>
                    <div style={{textAlign:"center",fontSize:24,fontWeight:500,color:"#5daaff"}}>{calcVal}</div>
                    <input type="number" min={0}
                      value={stateObj[pk]}
                      placeholder={String(calcVal)}
                      style={{padding:"8px 4px",borderRadius:8,border:"1.5px solid var(--color-border-secondary)",background:"var(--color-background-tertiary)",color:"var(--color-text-primary)",fontSize:20,textAlign:"center",width:"100%",boxSizing:"border-box"}}
                      onChange={e=>setFn(r=>({...r,[pk]:e.target.value}))}
                    />
                  </div>
                  <div style={{textAlign:"center",marginTop:5,fontSize:12,fontWeight:600,
                    color:diff===0?"var(--color-text-success)":diff>0?"var(--color-text-warning)":"var(--color-text-danger)"}}>
                    {diff===0?"sin diferencia":`${diff>0?"+":""}${diff} diferencia`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* VUELVE A SODERÍA */}
          <div style={{...s.card,margin:"0 0 16px",background:"var(--color-background-success)",border:"1.5px solid var(--color-text-success)",padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-success)",marginBottom:10}}>Vuelve a sodería</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid rgba(77,217,160,0.2)"}}>
              <span style={{fontSize:13,color:"var(--color-text-success)"}}>Soda (vacíos)</span>
              <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-success)"}}>{vaciosVuelta.soda} caj</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid rgba(77,217,160,0.2)"}}>
              <span style={{fontSize:13,color:"var(--color-text-success)"}}>Bidón 10L</span>
              <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-success)"}}>{llenosVuelta.b10} un</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
              <span style={{fontSize:13,color:"var(--color-text-success)"}}>Bidón 20L</span>
              <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-success)"}}>{llenosVuelta.b20} un</span>
            </div>
          </div>

          <button
            style={{width:"100%",padding:"16px",borderRadius:10,border:"none",
              background:"var(--color-background-tertiary)",borderTop:"2px solid #f5b942",
              color:"#f5b942",fontSize:15,fontWeight:700,cursor:"pointer"}}
            onClick={confirmarCierre}>
            ✓ Cerrar día y actualizar stock
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Planilla · {dia}</span>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{fecha}</span>
          {planilla._autoGuardado&&<span style={{fontSize:10,color:"#4dd9a0",fontWeight:500}}>✓ Auto-guardado</span>}
          {planilla._stockActualizado&&<span style={{fontSize:10,color:"var(--color-text-info)",fontWeight:500}}>📦 Stock actualizado</span>}
        </div>
      </div>
      <div style={{padding:16}}>

        {/* Datos de salida — ingreso manual */}
        <span style={{...s.sectionTitle,padding:"0 0 8px"}}>Al salir a repartir</span>
        <div style={s.grid3}>
          {[["fecha","Fecha","text"],["peso","Peso kg","number"],["bultos","Bultos","number"]].map(([k,l,t])=>(
            <div key={k}><label style={s.label}>{l}</label>
              <input style={s.inputNum} type={t} placeholder={t==="text"?"dd/mm/aaaa":"0"} value={datos[k]||""} onChange={e=>set(k,e.target.value)} />
            </div>
          ))}
        </div>
        {/* Desglose de peso y bultos */}
        {(pesoAuto>0||bultosAuto>0)&&(
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:10,lineHeight:1.7,background:"var(--color-background-tertiary)",borderRadius:8,padding:"6px 10px"}}>
            {bultosAuto>0&&<div>📦 <b>Bultos auto:</b> {cajonesLlenos} cajones soda + {b10Llenos} bid.10L + {b20Llenos} bid.20L = <b>{bultosAuto}</b></div>}
            {pesoAuto>0&&<div>⚖️ <b>Peso auto:</b> {cajonesLlenos}×13kg + {b10Llenos}×10kg + {b20Llenos}×20kg = <b>{pesoAuto} kg</b></div>}
          </div>
        )}

        {/* Llenos — ingreso manual, vacios/plata/llenar auto desde ventas */}
        <span style={{...s.sectionTitle,padding:"12px 0 8px"}}>Envases cargados (solo ingresá los llenos)</span>
        <div style={{background:"var(--color-background-secondary)",borderRadius:10,overflow:"hidden",marginBottom:4}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",padding:"6px 10px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            {["Producto","Llenos","Vacíos","Plata","Llenar"].map(h=><div key={h} style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,textAlign:h==="Producto"?"left":"right"}}>{h}</div>)}
          </div>
          {PRODUCTOS_CONFIG.map(p=>{
            const auto=totalesPorProd[p.id];
            const esSoda = p.id==="soda";
            return (
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",padding:"6px 10px",borderBottom:"0.5px solid var(--color-border-tertiary)",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{p.nombre}</div>
                  {esSoda&&auto.cajones>0&&<div style={{fontSize:10,color:"#f5b942"}}>{auto.cajones} caj. ({auto.vacios} un.)</div>}
                </div>
                <div>
                  <input type="number" style={{...s.inputNum,width:"100%",fontSize:13}} value={datos.productos[p.id]?.llenos||""} onChange={e=>setProd(p.id,"llenos",e.target.value)} placeholder="0" />
                  {esSoda&&datos.productos[p.id]?.llenos>0&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",textAlign:"right"}}>{Math.floor((datos.productos[p.id]?.llenos||0)/6)} caj.</div>}
                </div>
                <div style={{textAlign:"right",fontSize:13,color:"var(--color-text-secondary)"}}>{esSoda?`${auto.cajones||"—"} caj`:(auto.vacios||"—")}</div>
                <div style={{textAlign:"right",fontSize:13,color:"var(--color-text-primary)"}}>{auto.plata?fmt(auto.plata).replace("$",""):"—"}</div>
                <div style={{textAlign:"right",fontSize:13,color:"var(--color-text-danger)"}}>{auto.llenar?fmt(auto.llenar).replace("$",""):"—"}</div>
              </div>
            );
          })}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",padding:"8px 10px",background:"var(--color-background-tertiary)"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",fontWeight:500}}>Totales</div>
            <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{totalLlenosIngresados||"—"}</div>
            <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{Object.values(totalesPorProd).reduce((a,p)=>a+p.vacios,0)||"—"}</div>
            <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{totalVentaPlata?fmt(totalVentaPlata).replace("$",""):"—"}</div>
            <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"var(--color-text-danger)"}}>{totalVentaLlenar?fmt(totalVentaLlenar).replace("$",""):"—"}</div>
          </div>
        </div>
        <p style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:12}}>Vacíos, plata y llenar se calculan automáticamente desde las ventas del día.</p>

        {/* Gastos extras */}
        <div style={s.divider} />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.06em"}}>Gastos extras (efectivo)</span>
          <button style={{...s.btn,fontSize:12,padding:"4px 12px"}} onClick={addGasto}>+ Agregar</button>
        </div>
        {(datos.gastos||[]).length===0&&<p style={{fontSize:13,color:"var(--color-text-tertiary)",marginBottom:8}}>Sin gastos extras</p>}
        {(datos.gastos||[]).map((g,i)=>(
          g.confirmado
          ? <div key={i} style={{...s.card,margin:"0 0 6px",background:"var(--color-background-tertiary)",borderLeft:"3px solid #4dd9a0",padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{g.cat.charAt(0).toUpperCase()+g.cat.slice(1)}{g.desc?` · ${g.desc}`:""}</div>
                  <div style={{fontSize:12,color:"var(--color-text-danger)",marginTop:2}}>−{fmt(num(g.monto))}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setGasto(i,"confirmado",false)}>Editar</button>
                  <button style={s.btnDanger} onClick={()=>delGasto(i)}>✕</button>
                </div>
              </div>
            </div>
          : <div key={i} style={{...s.card,margin:"0 0 6px",padding:"10px 12px"}}>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <select style={{...s.select,flex:1}} value={g.cat} onChange={e=>setGasto(i,"cat",e.target.value)}>
                  {GASTOS_CATEGORIAS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
                <input style={{...s.inputNum,flex:1}} type="number" placeholder="Monto $" value={g.monto||""} onChange={e=>setGasto(i,"monto",e.target.value)} />
              </div>
              <input style={{...s.input,marginBottom:6}} placeholder="Descripción (opcional)" value={g.desc||""} onChange={e=>setGasto(i,"desc",e.target.value)} />
              <div style={{display:"flex",gap:6}}>
                <button style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:"#0a2e1f",color:"#4dd9a0",fontSize:12,fontWeight:500,cursor:"pointer",opacity:!g.monto?0.5:1}}
                  disabled={!g.monto}
                  onClick={()=>setGasto(i,"confirmado",true)}>
                  ✓ Confirmar y guardar
                </button>
                <button style={s.btnDanger} onClick={()=>delGasto(i)}>✕</button>
              </div>
            </div>
        ))}
        {totalGastos>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:"0.5px solid var(--color-border-tertiary)",marginBottom:8}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Total gastos extras</span>
          <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)"}}>−{fmt(totalGastos)}</span>
        </div>}

        {/* Cobranza */}
        <div style={s.divider} />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0 8px"}}>
          <span style={{fontSize:10,color:"var(--color-text-tertiary)",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.07em"}}>Cobranza del día</span>
          <button style={{...s.btn,fontSize:11,padding:"3px 10px"}}
            onClick={()=>setDatos(d=>({...d,
              peso:String(pesoAuto||d.peso||""),
              efectivo:String(Math.round(cobEfectivo)),
              retenciones:String(cobTransDesc),
              fiado:String(Math.round(cobFiado))
            }))}>
            ↻ Autocompletar desde ventas
          </button>
        </div>
        <div style={s.grid3}>
          {[["efectivo","Efectivo"],["fiado","Fiado"],["retenciones","Retención 2.5%"]].map(([k,l])=>(
            <div key={k}><label style={{...s.label,textAlign:"center"}}>{l}</label>
              <input style={{...s.inputNum,textAlign:"center"}} type="number" placeholder="0" value={datos[k]||""} onChange={e=>set(k,e.target.value)} />
            </div>
          ))}
        </div>
        {/* Desglose de transferencias */}
        {cobTransBruto>0&&(
          <div style={{...s.card,margin:"10px 0",background:"var(--color-background-tertiary)"}}>
            <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>Detalle transferencias</div>
            {[["Monto bruto",fmt(cobTransBruto),"primary"],["Retención 2.5%",`−${fmt(cobTransDesc)}`,"danger"],["Neto recibido",fmt(cobTransNeto),"success"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{l}</span>
                <span style={{fontSize:13,fontWeight:500,color:`var(--color-text-${c})`}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {cobSaldos>0&&(
          <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-tertiary)"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Cobrado de deuda anterior</span>
              <span style={{fontSize:13,fontWeight:500,color:"#4dd9a0"}}>{fmt(cobSaldos)}</span>
            </div>
          </div>
        )}
        <div style={{marginTop:12}}>
          <label style={s.label}>Observaciones</label>
          <textarea style={{...s.input,minHeight:56,resize:"vertical"}} placeholder="Notas del día..." value={datos.obs||""} onChange={e=>set("obs",e.target.value)} />
        </div>

        {/* Resumen */}
        <div style={s.divider} />
        <div id="planilla-capture">
        <span style={{...s.sectionTitle,padding:"0 0 10px"}}>Resumen del día</span>

        {/* Detalle de ventas — recuadrado azul, colapsable */}
        {ventasPropias.length>0
          ? <DetalleVentasDia ventas={ventasPropias} clientes={clientes} prospectos={prospectos} noVisitas={noVisitas} fecha={fecha} />
          : <div style={{...s.card,margin:"0 0 8px",padding:"12px 16px",background:"var(--color-background-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>📋 Sin ventas registradas para este día</span>
            </div>
        }

        {/* Ventas del día */}
        <div style={{...s.card,margin:"0 0 8px",background:"var(--color-background-secondary)",padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Ventas registradas</div>
          {[
            ["Contado (efectivo)", fmt(cobEfectivo), "primary"],
            ["Transferencias",     fmt(cobTransBruto), "info"],
            ["Fiado del día",      fmt(cobFiado), "warning"],
          ].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{l}</span>
              <span style={{fontSize:13,fontWeight:500,color:`var(--color-text-${c})`}}>{v}</span>
            </div>
          ))}
          {/* Cobros de deuda — separados por forma de pago */}
          {cobSaldosEfec>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>+ Cobro deuda · efectivo</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-success)"}}>{fmt(cobSaldosEfec)}</span>
            </div>
          )}
          {cobSaldosTrans>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>+ Cobro deuda · transferencia</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-info)"}}>{fmt(cobSaldosTrans)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 2px"}}>
            <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Total cobrado</span>
            <span style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(cobEfectivo+cobTransBruto)}</span>
          </div>
        </div>

        {/* Ventas de clientes de otros días */}
        {ventasExtraDia.length>0&&(
          <div style={{...s.card,margin:"0 0 8px",background:"var(--color-background-secondary)",padding:"14px 16px",borderLeft:"3px solid var(--color-border-info)"}}>
            <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-info)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>📦 Ventas de otros días ({ventasExtraDia.length})</div>
            {ventasExtraDia.map(v=>{
              const c=(clientes||[]).find(x=>x.id===v.clienteId);
              return (
                <div key={v.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{c?.nombre||"Cliente"} <span style={{color:"var(--color-text-tertiary)"}}>· {c?.dia}</span></span>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-info)"}}>{fmt(v.pagadoNum||v.neto||0)}</span>
                </div>
              );
            })}
            {extraEfectivo>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Contado</span><span style={{fontSize:11,color:"var(--color-text-primary)"}}>{fmt(extraEfectivo)}</span></div>}
            {extraTrans>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Transfer.</span><span style={{fontSize:11,color:"var(--color-text-info)"}}>{fmt(extraTrans)}</span></div>}
            {extraFiado>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Fiado</span><span style={{fontSize:11,color:"var(--color-text-warning)"}}>{fmt(extraFiado)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 2px"}}>
              <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Total otros días</span>
              <span style={{fontSize:16,fontWeight:500,color:"var(--color-text-info)"}}>{fmt(extraTotal)}</span>
            </div>
          </div>
        )}
        <div style={{...s.card,margin:"0 0 8px",padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Efectivo en mano</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Efectivo cobrado (contado)</span>
            <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{fmt(cobEfectivo)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{fontSize:13,color:"var(--color-text-danger)"}}>− Llenado de envases</span>
            <span style={{fontSize:13,color:"var(--color-text-danger)"}}>{fmt(totalVentaLlenar)}</span>
          </div>
          {totalGastos>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{fontSize:13,color:"var(--color-text-danger)"}}>− Gastos extras</span>
            <span style={{fontSize:13,color:"var(--color-text-danger)"}}>{fmt(totalGastos)}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 2px"}}>
            <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Efectivo en mano</span>
            <span style={{fontSize:18,fontWeight:500,color:(cobEfectivo-totalVentaLlenar-totalGastos)>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{fmt(cobEfectivo-totalVentaLlenar-totalGastos)}</span>
          </div>
        </div>

        {/* Transferencias */}
        {cobTransBruto>0&&(
          <div style={{...s.card,margin:"0 0 8px",padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Transferencias</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Monto total</span>
              <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{fmt(cobTransBruto)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Retención 2.5% (informativo)</span>
              <span style={{fontSize:12,color:"var(--color-text-danger)"}}>−{fmt(cobTransDesc)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 2px"}}>
              <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Neto a acreditar</span>
              <span style={{fontSize:16,fontWeight:500,color:"var(--color-text-info)"}}>{fmt(cobTransNeto)}</span>
            </div>
            <DetalleTransferencias
              ventas={ventasPropias.filter(v=>v.pago==="transferencia"||(v.pago==="mixto"&&(Number(v.montoTrans)||0)>0))}
              ventasPendTrans={ventasPendTrans}
            />
          </div>
        )}

        {/* Fiado */}
        <div style={{...s.card,margin:"0 0 8px",padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Fiado pendiente</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Fiado del día</span>
            <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{fmt(cobFiado)}</span>
          </div>
          {cobSaldos>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>− Cobros de saldos anteriores</span>
              <span style={{fontSize:13,color:"var(--color-text-success)"}}>−{fmt(cobSaldos)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 2px"}}>
            <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Fiado neto pendiente</span>
            <span style={{fontSize:16,fontWeight:500,color:fiadoNeto>0?"var(--color-text-warning)":"var(--color-text-success)"}}>{fmt(Math.abs(fiadoNeto))}{fiadoNeto<0?" (a favor)":""}</span>
          </div>
        </div>

        {/* Ganancia */}
        <div style={{...s.card,margin:"0 0 16px",padding:"14px 16px",background:"var(--color-background-secondary)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Ganancia neta del día</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>Total cobrado − Llenado − Gastos</div>
            </div>
            <span style={{fontSize:22,fontWeight:500,color:ganancia>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{fmt(ganancia)}</span>
          </div>
        </div>
        </div>{/* fin planilla-capture */}
        <button style={s.btnPrimary} onClick={()=>onGuardar(datos)}>Guardar planilla</button>
        {onCerrarDia&&ventas.length>0&&(()=>{
          const MAX_ENVIOS = 3;
          const envios = enviosInforme;
          const quedan = MAX_ENVIOS - envios;
          const agotado = quedan<=0;
          return (
            <button style={{...s.btnPrimary,background:agotado?"#555":envios>0?"#0F6E56":"#8B2FC9",marginTop:8,width:"100%",cursor:agotado?"default":"pointer",opacity:agotado?0.7:1}}
              onClick={async()=>{
                if(agotado){alert(`Ya enviaste el informe del día ${MAX_ENVIOS} veces (el máximo). Revisá tu email, incluida la carpeta de spam.`);return;}
                let imgData = null;
                try {
                  const el = document.getElementById("planilla-capture");
                  if(el && window.html2canvas) {
                    const canvas = await window.html2canvas(el, {
                      scale:1.5, useCORS:true, allowTaint:true,
                      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--color-background-primary").trim()||"#0f1923",
                      scrollY:0, scrollX:0, width:el.offsetWidth,
                      height:el.scrollHeight, windowWidth:el.offsetWidth, windowHeight:el.scrollHeight
                    });
                    imgData = canvas.toDataURL("image/jpeg", 0.78);
                  }
                } catch(e) { console.warn("Captura falló:", e); }
                const ok = await onCerrarDia(imgData);
                if(ok){
                  setEnviosInforme(Number(localStorage.getItem(`sr_informe_${fecha}_${dia}`)||envios+1));
                  alert(`✅ Informe enviado a tu email correctamente.${quedan-1>0?`\n\nSi no te llega, podés reenviarlo ${quedan-1} ${quedan-1===1?"vez":"veces"} más.`:""}`);
                } else {
                  alert("❌ No se pudo enviar el informe. Verificá tu conexión e intentá de nuevo.");
                }
              }}>
              {agotado
                ? "✓ Informe enviado (máximo alcanzado)"
                : envios>0
                  ? `🔄 Reenviar informe (${quedan} ${quedan===1?"envío":"envíos"} restante${quedan===1?"":"s"})`
                  : "📧 Cerrar día y enviar informe"}
            </button>
          );
        })()}

        {/* ── Botón Cerrar día / actualizar stock ── */}
        {!yaCerrado ? (
          <button style={{width:"100%",padding:"14px",borderRadius:10,border:"2px solid #f5b942",background:"#2e1f06",color:"#f5b942",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:10}}
            onClick={()=>setMostrarCierre(true)}>
            🔒 Cerrar el día y actualizar stock
          </button>
        ) : (
          <div style={{textAlign:"center",padding:"12px",borderRadius:10,background:"rgba(29,158,117,0.15)",color:"#4dd9a0",fontSize:13,fontWeight:500,marginTop:10}}>
            ✅ Día cerrado — stock actualizado
          </div>
        )}
      </div>
    </div>
  );
}

function InicioReparto({dia,fecha,planilla,productos,cargasDia,stock,onGuardar,onVolver}) {
  const prodKeys = {"Sifón 1.5L":"soda","Bidón 10L":"b10","Bidón 20L":"b20"};
  const CAJON = 6; // sifones por cajón
  const [llenos,setLlenos] = useState(()=>{
    const precarga = (cargasDia||CARGA_DIA_DEFAULT)[dia]||CARGA_DIA_DEFAULT[dia]||{};
    const m={};
    productos.forEach(p=>{
      const k=prodKeys[p.nombre];
      if(k) m[k] = planilla?.productos?.[k]?.llenos || precarga[k] || "";
    });
    return m;
  });
  const yaIniciado = planilla?.iniciado;

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Inicio del reparto · {dia}</span>
      </div>
      <div style={{padding:16}}>
        <div style={{...s.card,margin:"0 0 16px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)"}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-info)",marginBottom:4}}>
            📅 {dia} · {fecha ? new Date(fecha+'T12:00:00').toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""}
          </div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>
            {yaIniciado?"Podés modificar las cantidades iniciales si hay un error.":"Ingresá la cantidad de envases llenos con los que salís hoy."}
          </div>
        </div>

        <span style={{...s.sectionTitle,padding:"0 0 10px"}}>Envases llenos al salir</span>

        {productos.map(p=>{
          const k=prodKeys[p.nombre]; if(!k) return null;
          return (
            <div key={p.id} style={{...s.card,margin:"0 0 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{p.nombre}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{fmt(p.precio)} c/u</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button style={{...s.btn,padding:"6px 18px",fontSize:22,lineHeight:1}}
                  onClick={()=>setLlenos(l=>({...l,[k]:Math.max(0,(Number(l[k])||0)-(k==="soda"?CAJON:1))}))}>
                  {k==="soda"?"-caj":"-"}
                </button>
                <div style={{textAlign:"center",minWidth:50}}>
                  <div style={{fontSize:26,fontWeight:500,color:"var(--color-text-primary)"}}>{llenos[k]||0}</div>
                  {k==="soda"&&<div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{Math.floor((llenos[k]||0)/CAJON)}caj+{(llenos[k]||0)%CAJON}un</div>}
                </div>
                <button style={{...s.btn,padding:"6px 18px",fontSize:22,lineHeight:1}}
                  onClick={()=>setLlenos(l=>({...l,[k]:(Number(l[k])||0)+(k==="soda"?CAJON:1)}))}>
                  {k==="soda"?"+caj":"+"}
                </button>
              </div>
            </div>
          );
        })}

        <div style={{...s.card,margin:"12px 0 20px",background:"var(--color-background-secondary)"}}>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:6}}>Total envases cargados</div>
          <div style={{fontSize:28,fontWeight:500,color:"var(--color-text-primary)"}}>
            {Object.values(llenos).reduce((a,v)=>a+(Number(v)||0),0)}
          </div>
        </div>

        <button style={s.btnPrimary}
          onClick={()=>{
            const nuevaPlanilla = {
              ...(planilla||planillaDiaVacia()),
              iniciado:true,
              productos:{
                ...(planilla?.productos||{}),
                ...Object.fromEntries(Object.entries(llenos).map(([k,v])=>[k,{
                  ...(planilla?.productos?.[k]||{}),
                  llenos:v
                }]))
              }
            };
            onGuardar(nuevaPlanilla, true);
          }}>
          {yaIniciado?"Actualizar y continuar →":"🚀 Iniciar y descontar de sodería"}
        </button>

      </div>
      {/* Stock sodería */}
      {stock?.soderia&&(
        <div style={{...s.card,margin:"10px 14px 0",background:"var(--color-background-tertiary)"}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>Stock actual · Sodería</div>
          <div style={{display:"flex",gap:16}}>
            {[["Sifón",stock?.soderia?.sifon||0],["Bidón 10L",stock?.soderia?.bidon10||0],["Bidón 20L",stock?.soderia?.bidon20||0]].map(([l,v])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{l}</div>
                <div style={{fontSize:18,fontWeight:500,color:v>0?"var(--color-text-primary)":"var(--color-text-danger)"}}>{v||0}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
