// ════════════════════════════════════════════════════════════════════
// ◆  09-clientes.js — ListaClientes · DetalleCliente · EditCliente · EditVenta · Modals
// ════════════════════════════════════════════════════════════════════

function ListaClientes({clientes,dia,fecha,ventas,todasVentas,noVisitas,prospectos,recordatorios,onSeleccionar,onNuevoCliente,onVolver,onReordenar,onEditarCliente,onRegistrarNoVisita,onQuitarNoVisita,onVentaProspecto,onNoEstaProspecto,onNoQuiereProspecto,onConfirmarTransfer,onVerProspecto,onAbrirMapa,onIrPlanilla,onIrMenu}) {
  const [busqueda,setBusqueda] = useState("");
  const [editandoOrden,setEditandoOrden] = useState(null);
  const [ordenTemp,setOrdenTemp] = useState("");
  // ventas y noVisitas ya filtradas por fecha+dia desde App
  const atendidos = new Set(ventas.filter(v=>!v._esCobro&&!v._esAjuste).map(v=>v.clienteId));
  const noVMap = {}; (noVisitas||[]).filter(v=>v.fecha===fecha).forEach(v=>{noVMap[v.clienteId]=v.motivo;});
  // visitados = ventas + noesta2 + noquiso (noesta 1ra vez NO cuenta)
  const visitadosSinVenta = new Set(
    Object.entries(noVMap).filter(([,m])=>m==="noesta2"||m==="noquiso").map(([id])=>Number(id))
  );
  const visitados = new Set([...atendidos,...visitadosSinVenta]);
  const prospectosDelDia = (prospectos||[]).filter(p=>p.dia===dia&&p.estado==="activo");
  const visitadosProspectos = new Set(
    ventas.filter(v=>prospectosDelDia.some(p=>p.id===v.clienteId)).map(v=>v.clienteId)
  );

  const marcarNoVisita = (id,motivo) => {
    const prev = noVMap[id];
    if(motivo==="noesta"&&prev==="noesta") onRegistrarNoVisita(id,"noesta2");
    else if(prev===motivo) onQuitarNoVisita(id);
    else onRegistrarNoVisita(id,motivo);
  };

  const clientesOrdenados = [...clientes].sort((a,b)=>(a.orden||9999)-(b.orden||9999));
  const filtrados  = clientesOrdenados.filter(c=>buscarCliente(c,busqueda)>0);
  const pendientesNormales = filtrados.filter(c=>!visitados.has(c.id)&&noVMap[c.id]!=="noesta");
  const volverAlFinal      = filtrados.filter(c=>noVMap[c.id]==="noesta"&&!atendidos.has(c.id));
  const pendientes         = [...pendientesNormales, ...volverAlFinal];
  const sinEntrega         = filtrados.filter(c=>visitadosSinVenta.has(c.id));
  const listos             = filtrados.filter(c=>atendidos.has(c.id));

  const abrirRuta = ()=>{
    const cp=pendientes.filter(c=>c.maps).slice(0,9);
    if(!cp.length){alert("Ningún pendiente tiene Maps cargado.");return;}
    const dest=encodeURIComponent(cp[cp.length-1].maps);
    const wps=cp.slice(0,-1).map(c=>encodeURIComponent(c.maps)).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1${wps?`&waypoints=${wps}`:""}&destination=${dest}&travelmode=driving`,"_blank");
  };

  const guardarOrden=(c)=>{
    const n=parseInt(ordenTemp);
    if(!isNaN(n)&&n>0) onReordenar(clientes.map(x=>x.id===c.id?{...x,orden:n}:x));
    setEditandoOrden(null);setOrdenTemp("");
  };

  const Card=({c})=>{
    const [fotoOpen,setFotoOpen] = React.useState(false);
    const esProspecto = !!c._esProspecto;
    const atendido=esProspecto?visitadosProspectos.has(c.id):atendidos.has(c.id);
    const est=noVMap[c.id];
    // Borde naranja para prospectos, verde/amarillo/rojo para clientes normales
    const bc=esProspecto?"#f5b942":atendido?"#1D9E75":est==="noesta"?"#EF9F27":(est==="noesta2"||est==="noquiso")?"#E24B4A":"var(--color-border-tertiary)";
    const handleClick = () => esProspecto ? (onVerProspecto&&onVerProspecto(c)) : onSeleccionar(c);
    return (
      <>
      <div style={{...s.card,borderLeft:`3px solid ${bc}`,opacity:(visitados.has(c.id))?0.65:est==="noesta"?0.85:1}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <div style={{flexShrink:0,paddingTop:2}} onClick={()=>{if(!atendido){setEditandoOrden(c.id);setOrdenTemp(String(c.orden||""));}}}>
            {editandoOrden===c.id
              ? <input autoFocus type="number" min={1} value={ordenTemp}
                  onChange={e=>setOrdenTemp(e.target.value)}
                  onBlur={()=>guardarOrden(c)}
                  onKeyDown={e=>e.key==="Enter"&&guardarOrden(c)}
                  style={{width:40,textAlign:"center",padding:"3px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14}} />
              : <div style={{width:34,height:34,borderRadius:8,background:"var(--color-background-secondary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"var(--color-text-secondary)",cursor:"pointer",border:"0.5px solid var(--color-border-tertiary)"}}>
                  {c.orden||"#"}
                </div>
            }
          </div>
          <div style={{flex:1,cursor:"pointer",minWidth:0}} onClick={handleClick}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontWeight:500,fontSize:15,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                {c.nombre}
                {c.foto&&<span style={{fontSize:10,color:"#4dd9a0",flexShrink:0,marginLeft:3}}>📷</span>}
              </div>
              {(recordatorios||[]).some(r=>r.clienteId===c.id&&!r.confirmado)&&(
                <span style={{fontSize:13,flexShrink:0}} title="Recordatorio pendiente">🔔</span>
              )}
              {(()=>{const vt=ventas.find(v=>v.clienteId===c.id&&v.fechaKey===fecha&&(v.pago==="transferencia"||v.pago==="mixto"));
                if(!vt) return null;
                // Para mixto mostrar solo la parte de transferencia, no el total
                const montoTransfer = vt.pago==="mixto" ? (vt.montoTrans||0) : (vt.pagadoNum||vt.neto||0);
                if(montoTransfer===0) return null;
                return (
                  <button style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",lineHeight:1,flexShrink:0,display:"flex",alignItems:"center",gap:3,borderRadius:6,background:vt.transConfirmada?"transparent":"rgba(245,185,66,0.15)"}}
                    onClick={e=>{e.stopPropagation();onConfirmarTransfer&&onConfirmarTransfer(c.id,vt.id);}}
                    title={vt.transConfirmada?"Transfer. confirmada — tocá para desmarcar":"Tocá para confirmar transferencia"}>
                    <span style={{fontSize:15}}>{vt.transConfirmada?"🟢":"🔴"}</span>
                    {!vt.transConfirmada&&<span style={{fontSize:11,fontWeight:500,color:"#f5b942"}}>{fmt(montoTransfer)}</span>}
                  </button>
                );
              })()}
            </div>
            <div style={{fontSize:17,color:"var(--color-text-secondary)",marginTop:2}}>
              {c.calle?`${c.calle} ${c.nro||""}`:c.manzana?`Mz ${c.manzana} L ${c.lote}`:""}{c.barrio?` · ${c.barrio}`:""}
            </div>
            {c.notas&&<div style={{fontSize:12,color:"var(--color-text-warning)",marginTop:2}}>📝 {c.notas}</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
              <TagsCliente cliente={c} ventas={todasVentas||ventas}/>
              {atendido    && <span style={s.badge("success")}>✓ Listo</span>}
              {est==="noesta" && !atendido  && <span style={s.badge("warning")}>🔄 No estaba aún</span>}
              {est==="noesta2"  && <span style={s.badge("warning")}>No estaba</span>}
              {est==="noquiso"  && <span style={s.badge("danger")}>No quiso</span>}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0,alignItems:"center"}}>
            {(c.maps||(c.lat&&c.lng))     && <a href={c.maps||`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>📍</a>}
            {c.telefono && <a href={`https://wa.me/54${c.telefono}`} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>💬</a>}
            <span style={{fontSize:20,cursor:"pointer",lineHeight:1}} title="Foto domicilio" onClick={e=>{e.stopPropagation();setFotoOpen(true);}}>📷</span>
          </div>
        </div>
        {(!visitados.has(c.id)||est==="noesta")&&!atendido&&!esProspecto&&(
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button style={{background:"var(--color-background-warning)",color:"var(--color-text-warning)",border:"1px solid var(--color-border-warning)",borderRadius:10,padding:"10px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1}}
              onClick={()=>marcarNoVisita(c.id,est==="noesta"?"noesta2":"noesta")}>
              {est==="noesta"?"2ª vez":"🔄 No está"}
            </button>
            <button style={{background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"1px solid var(--color-border-danger)",borderRadius:10,padding:"10px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1}}
              onClick={()=>marcarNoVisita(c.id,"noquiso")}>No quiere</button>
            <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:10,padding:"10px 0",fontSize:14,cursor:"pointer",fontWeight:600,flex:2}}
              onClick={()=>onSeleccionar(c)}>Entregar →</button>
          </div>
        )}
        {(!visitadosProspectos.has(c.id))&&!atendido&&esProspecto&&(
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button style={{background:"var(--color-background-warning)",color:"var(--color-text-warning)",border:"1px solid var(--color-border-warning)",borderRadius:10,padding:"10px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1}}
              onClick={()=>onNoEstaProspecto&&onNoEstaProspecto(c.id)}>🔄 No está</button>
            <button style={{background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"1px solid var(--color-border-danger)",borderRadius:10,padding:"10px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1}}
              onClick={()=>onNoQuiereProspecto&&onNoQuiereProspecto(c.id)}>No quiere</button>
            <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:10,padding:"10px 0",fontSize:14,cursor:"pointer",fontWeight:600,flex:2}}
              onClick={()=>onVentaProspecto&&onVentaProspecto(c)}>Entregar →</button>
          </div>
        )}
        {(est==="noesta2"||est==="noquiso")&&!atendido&&(
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
            <button style={{...s.btn,fontSize:12,padding:"4px 10px"}} onClick={()=>onQuitarNoVisita(c.id)}>Desmarcar</button>
          </div>
        )}
        {onEditarCliente&&<PieEnvases c={c} ventas={todasVentas||ventas} onEditar={onEditarCliente} />}
      </div>
      {fotoOpen&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{e.stopPropagation();setFotoOpen(false);}}>
          {c.foto
            ? <img src={c.foto} alt="Domicilio" style={{maxWidth:"100%",maxHeight:"60vh",borderRadius:10,objectFit:"contain",marginBottom:16}} />
            : <div style={{color:"#aaa",fontSize:14,marginBottom:20}}>Sin foto · {c.nombre}</div>
          }
          <div style={{display:"flex",gap:12}} onClick={e=>e.stopPropagation()}>
            <label style={{background:"#185FA5",color:"#e2eaf4",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
              📷 Cámara
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}}
                onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onReordenar(clientes.map(x=>x.id===c.id?{...x,foto:b64}:x));setFotoOpen(false);}} />
            </label>
            <label style={{background:"#2a3a4a",color:"#e2eaf4",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
              🖼 Galería
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onReordenar(clientes.map(x=>x.id===c.id?{...x,foto:b64}:x));setFotoOpen(false);}} />
            </label>
            {c.foto&&<button style={{background:"#3a2020",color:"#e05c5c",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",border:"none"}} onClick={()=>{onReordenar(clientes.map(x=>x.id===c.id?{...x,foto:""}:x));setFotoOpen(false);}}>🗑</button>}
          </div>
          <span style={{color:"#aaa",fontSize:11,marginTop:14}}>Tocá fuera para cerrar</span>
        </div>
      )}

      </>
    );
  };

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Clientes · {dia}</span>
        <button style={{...s.btn,padding:"6px 12px",fontSize:13}} onClick={onNuevoCliente}>+ Nuevo</button>
      </div>
      <div style={{padding:"10px 16px 6px"}}>
        <input style={s.input} placeholder="Buscar por domicilio o nombre..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={s.badge("success")}>{visitados.size}/{clientes.length} visitados</span>
          {volverAlFinal.length>0&&<span style={s.badge("warning")}>{volverAlFinal.length} volver al final</span>}
          {sinEntrega.length>0&&<span style={s.badge("danger")}>{sinEntrega.length} sin entrega</span>}
          <button style={{...s.btn,fontSize:11,padding:"3px 10px",marginLeft:"auto"}} onClick={onAbrirMapa||abrirRuta}>🗺 Mapa</button>
        </div>
        <p style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:6}}>Tocá el # para editar el número de orden del cliente</p>
      </div>
      {filtrados.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)",fontSize:14}}>No hay clientes para {dia}.</div>}
      {pendientesNormales.length>0&&<><span style={s.sectionTitle}>Pendientes ({pendientesNormales.length})</span>{pendientesNormales.map(c=><Card key={c.id} c={c}/>)}</>}
      {volverAlFinal.length>0&&<><span style={{...s.sectionTitle,color:"#f5b942"}}>🔄 Volver a visitar ({volverAlFinal.length})</span>{volverAlFinal.map(c=><Card key={c.id} c={c}/>)}</>}
      {listos.length>0&&<><span style={s.sectionTitle}>Entregado ({listos.length})</span>{listos.map(c=><Card key={c.id} c={c}/>)}</>}
      {sinEntrega.length>0&&<><span style={s.sectionTitle}>Sin entrega ({sinEntrega.length})</span>{sinEntrega.map(c=><Card key={c.id} c={c}/>)}</>}

      {/* Botón Reparto completo cuando todos los clientes están visitados */}
      {pendientes.length===0&&clientes.length>0&&(
        <div style={{margin:"12px 14px 24px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{background:"#0a2e1f",border:"1.5px solid #4dd9a0",borderRadius:14,padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>🎉</div>
            <div style={{fontSize:15,fontWeight:600,color:"#4dd9a0",marginBottom:4}}>¡Todos visitados!</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:14}}>Completaste todos los clientes del día.</div>
            <div style={{display:"flex",gap:8}}>
              {onIrPlanilla&&<button style={{...s.btnPrimary,flex:1,background:"#185FA5"}} onClick={onIrPlanilla}>
                📋 Ver planilla del día
              </button>}
              {onIrMenu&&<button style={{...s.btnPrimary,flex:1,background:"#1a8a4a"}} onClick={onIrMenu}>
                🏠 Menú principal
              </button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleCliente({cliente,ventas,dia,fecha,productos,onVenta,onVolver,onEditar,onEliminarVenta,onEditarVenta,onEliminarCliente,onNoEstaCliente,onNoQuiereCliente,recordatorios,onGuardarRecordatorio,onConfirmarRecordatorio,onCobrarSaldo,soloLectura=false}) {
  const [editandoCliente,setEditandoCliente] = useState(false);
  const [editandoVentaId,setEditandoVentaId] = useState(null);
  const [editandoSaldo,setEditandoSaldo] = useState(false);
  const [tipoSaldoEdit,setTipoSaldoEdit] = useState("");
  const [montoSaldoEdit,setMontoSaldoEdit] = useState("");
  const [mostrarRecordatorio,setMostrarRecordatorio] = useState(false);
  const [mostrarPagoSaldo,setMostrarPagoSaldo] = useState(false);
  const [mostrarFotoGrande,setMostrarFotoGrande] = useState(false);
  const recActivos = (recordatorios||[]).filter(r=>r.clienteId===cliente.id&&!r.confirmado);
  const historial = [...ventas].sort((a,b)=>(b.fechaKey||"").localeCompare(a.fechaKey||"")||(b.id||0)-(a.id||0));
  const ventaHoy  = fecha ? ventas.find(v=>v.fechaKey===fecha&&!v._esCobro&&!v._esAjuste) : null;
  const initials  = cliente.nombre.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  const totalComprado = ventas.reduce((a,v)=>a+(v.neto||0),0);
  const promedioVenta = ventas.length>0 ? Math.round(totalComprado/ventas.length) : 0;
  const ventasUltimos30 = ventas.filter(v=>{
    const fk=v.fechaKey||""; if(!fk) return false;
    const d=new Date(fk); const hoy=new Date();
    return (hoy-d)/86400000<=30;
  }).length;

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>{cliente.nombre}</span>
        <div style={{display:"flex",gap:4}}>
          <button style={{...s.btn,padding:"4px 8px",fontSize:18,lineHeight:1,position:"relative"}}
            onClick={()=>setMostrarRecordatorio(true)}>
            🔔
            {recActivos.length>0&&<span style={{position:"absolute",top:-3,right:-3,background:"#f5b942",color:"#0f1923",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{recActivos.length}</span>}
          </button>
          {!soloLectura&&<button style={{...s.btn,fontSize:12,padding:"5px 10px"}} onClick={()=>{setEditandoCliente(!editandoCliente);setEditandoVentaId(null);}}>
            {editandoCliente?"Cancelar":"Editar"}
          </button>}
        </div>
      </div>
      {mostrarPagoSaldo&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <PagoSaldoPanel
            saldo={cliente.saldo}
            onCobrar={(monto,pago)=>{
              onCobrarSaldo&&onCobrarSaldo(monto,pago);
              setMostrarPagoSaldo(false);
            }}
            onCerrar={()=>setMostrarPagoSaldo(false)}
          />
        </div>
      )}
      {mostrarRecordatorio&&(
        <RecordatorioModal
          cliente={cliente}
          onGuardar={(datos)=>{
            onGuardarRecordatorio&&onGuardarRecordatorio({...datos,clienteId:cliente.id,clienteNombre:cliente.nombre,dia:cliente.dia,id:Date.now(),confirmado:false});
            setMostrarRecordatorio(false);
          }}
          onCerrar={()=>setMostrarRecordatorio(false)}
        />
      )}

      {mostrarFotoGrande&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setMostrarFotoGrande(false)}>
          {cliente.foto
            ? <img src={cliente.foto} alt="Domicilio" style={{maxWidth:"100%",maxHeight:"60vh",borderRadius:10,objectFit:"contain",marginBottom:16}} />
            : <div style={{color:"#aaa",fontSize:14,marginBottom:20}}>Sin foto aún · {cliente.nombre}</div>
          }
          <div style={{display:"flex",gap:12}} onClick={e=>e.stopPropagation()}>
            <label style={{background:"#185FA5",color:"#e2eaf4",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
              📷 Cámara
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}}
                onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onEditar({foto:b64});setMostrarFotoGrande(false);}} />
            </label>
            <label style={{background:"#2a3a4a",color:"#e2eaf4",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
              🖼 Galería
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onEditar({foto:b64});setMostrarFotoGrande(false);}} />
            </label>
            {cliente.foto&&<button style={{background:"#3a2020",color:"#e05c5c",padding:"12px 14px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:"none"}} onClick={()=>{onEditar({foto:""});setMostrarFotoGrande(false);}}>🗑</button>}
          </div>
          <span style={{color:"#aaa",fontSize:11,marginTop:14}}>Tocá fuera para cerrar</span>
        </div>
      )}
      <div style={{padding:16}}>
        {recActivos.length>0&&!editandoCliente&&(
          <div style={{marginBottom:10}}>
            {recActivos.map(r=>(
              <div key={r.id} style={{...s.card,margin:"0 0 6px",background:"#2e1f06",border:"1px solid #f5b942",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>🔔</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:"#f5b942"}}>{r.fecha} {r.hora&&`· ${r.hora}`}</div>
                  <div style={{fontSize:13,color:"var(--color-text-primary)",marginTop:2}}>{r.motivo}</div>
                </div>
                <button style={{background:"#4dd9a0",color:"#0a2e1f",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}
                  onClick={()=>onConfirmarRecordatorio&&onConfirmarRecordatorio(r.id)}>
                  ✓ Listo
                </button>
              </div>
            ))}
          </div>
        )}
        {!editandoCliente && <>
          {/* Header cliente */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            {cliente.foto
              ? <img src={cliente.foto} alt="" onClick={()=>setMostrarFotoGrande(true)} title="Ver foto grande" style={{width:52,height:52,borderRadius:10,objectFit:"cover",flexShrink:0,border:"0.5px solid var(--color-border-tertiary)",cursor:"zoom-in"}} />
              : <div style={{width:52,height:52,borderRadius:10,background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:18,color:"var(--color-text-info)",flexShrink:0}}>{initials}</div>
            }
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:16,color:"var(--color-text-primary)"}}>{cliente.nombre}</div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                {cliente.calle?`${cliente.calle} ${cliente.nro||""} · `:cliente.manzana?`Mz ${cliente.manzana} L ${cliente.lote} · `:""}
                {cliente.barrio} · {cliente.dia}
              </div>
              {cliente.notas&&<div style={{fontSize:12,color:"var(--color-text-warning)",marginTop:3}}>📝 {cliente.notas}</div>}
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {(cliente.maps||(cliente.lat&&cliente.lng))     && <a href={cliente.maps||`https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`} target="_blank" rel="noreferrer" style={{fontSize:26,textDecoration:"none"}}>📍</a>}
              {cliente.telefono && <a href={`https://wa.me/54${cliente.telefono}`} target="_blank" rel="noreferrer" style={{fontSize:26,textDecoration:"none"}}>💬</a>}

            </div>
          </div>

          {/* Foto domicilio si existe - clickable */}
          {cliente.foto&&!editandoCliente&&(
            <div style={{marginBottom:10,cursor:"zoom-in",borderRadius:10,overflow:"hidden",maxHeight:140,position:"relative"}} onClick={()=>setMostrarFotoGrande(true)}>
              <img src={cliente.foto} alt="Domicilio" style={{width:"100%",maxHeight:140,objectFit:"cover",display:"block"}} />
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.5))",padding:"6px 10px",fontSize:11,color:"#fff"}}>
                📷 Domicilio · tocá para ampliar
              </div>
            </div>
          )}

          {/* Métricas */}
          <div style={{...s.grid2,marginBottom:12}}>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Saldo</div>
              <div style={{...s.metricVal,color:cliente.saldo<0?"var(--color-text-danger)":cliente.saldo>0?"var(--color-text-success)":"var(--color-text-primary)"}}>{fmt(cliente.saldo)}</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{cliente.saldo<0?"Debe":cliente.saldo>0?"A su favor":"Al día"}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Total histórico</div>
              <div style={s.metricVal}>{fmt(totalComprado)}</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{ventas.length} compras</div>
            </div>
          </div>

          {/* Saldo */}
          <div style={{...s.card,margin:"0 0 10px",borderLeft:cliente.saldo<0?"3px solid var(--color-text-danger)":cliente.saldo>0?"3px solid #4dd9a0":"0.5px solid var(--color-border-tertiary)"}}>
            {!editandoSaldo?(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{cliente.saldo<0?"Saldo pendiente":cliente.saldo>0?"Saldo a favor":"Sin saldo"}</div>
                  <div style={{fontSize:20,fontWeight:500,color:cliente.saldo<0?"var(--color-text-danger)":cliente.saldo>0?"#4dd9a0":"var(--color-text-tertiary)"}}>{fmt(Math.abs(cliente.saldo))}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {cliente.saldo<0&&(
                    <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:500,cursor:"pointer"}}
                      onClick={()=>setMostrarPagoSaldo(true)}>
                      💰 Cobrar
                    </button>
                  )}
                  {!soloLectura&&<button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>setEditandoSaldo(true)}>Ajustar</button>}
                </div>
              </div>
            ):(
              <div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8,fontWeight:500}}>Ajustar saldo</div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {[["favor","A favor"],["deuda","Debe"],["cero","En cero"]].map(([v,l])=>(
                    <button key={v} style={{flex:1,fontSize:11,padding:"6px 4px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",cursor:"pointer",
                      background:tipoSaldoEdit===v?"#185FA5":"var(--color-background-secondary)",
                      color:tipoSaldoEdit===v?"#e2eaf4":"var(--color-text-secondary)"}}
                      onClick={()=>setTipoSaldoEdit(v)}>{l}</button>
                  ))}
                </div>
                {tipoSaldoEdit&&tipoSaldoEdit!=="cero"&&(
                  <input style={{...s.input,marginBottom:8}} type="number" min={0} placeholder="Monto ($)"
                    value={montoSaldoEdit} onChange={e=>setMontoSaldoEdit(e.target.value)} />
                )}
                <div style={{display:"flex",gap:6}}>
                  <button style={{...s.btn,flex:1,fontSize:12}} onClick={()=>{setEditandoSaldo(false);setTipoSaldoEdit("");setMontoSaldoEdit("");}}>Cancelar</button>
                  <button style={{...s.btnPrimary,flex:2,fontSize:12,padding:"8px"}} onClick={()=>{
                    let s=cliente.saldo||0;
                    if(tipoSaldoEdit==="favor") s=Math.abs(Number(montoSaldoEdit)||0);
                    if(tipoSaldoEdit==="deuda") s=-Math.abs(Number(montoSaldoEdit)||0);
                    if(tipoSaldoEdit==="cero")  s=0;
                    onEditar({saldo:s});
                    setEditandoSaldo(false);setTipoSaldoEdit("");setMontoSaldoEdit("");
                  }}>Guardar saldo</button>
                </div>
              </div>
            )}
          </div>

          {/* Registrar venta — solo una por día */}
          {ventaHoy
            ? <div style={{...s.card,margin:"0 0 12px",borderLeft:"3px solid #1D9E75",padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:500,color:"#4dd9a0"}}>✓ Entrega registrada hoy</span>
                  <span style={s.badge("success")}>{fmt(ventaHoy.neto)}</span>
                </div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>
                  {ventaHoy.detalle.map(d=>`${d.nombre} ×${d.cantidad}`).join(" · ")} · {ventaHoy.pago}
                </div>
              </div>
                        : <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                <button style={{background:"var(--color-background-warning)",color:"var(--color-text-warning)",border:"1px solid var(--color-border-warning)",borderRadius:10,padding:"12px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1,minWidth:90}}
                  onClick={()=>{onNoEstaCliente&&onNoEstaCliente();}}>
                  🔄 No está
                </button>
                <button style={{background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"1px solid var(--color-border-danger)",borderRadius:10,padding:"12px 0",fontSize:13,cursor:"pointer",fontWeight:500,flex:1,minWidth:90}}
                  onClick={()=>{onNoQuiereCliente&&onNoQuiereCliente();}}>
                  🚫 No quiere
                </button>
                <button style={{...s.btnPrimary,padding:"12px 0",fontSize:15,borderRadius:10,flex:2,minWidth:120}} onClick={onVenta}>
                  📦 Registrar entrega
                </button>
              </div>
          }
          {/* Cobrar deuda rápido */}
          {cliente.saldo<0&&!ventaHoy&&(
            <button
              style={{width:"100%",background:"#0a2e1f",color:"#4dd9a0",border:"1.5px solid #4dd9a0",borderRadius:10,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              onClick={()=>setMostrarPagoSaldo(true)}>
              💰 Cobrar deuda · {fmt(Math.abs(cliente.saldo))}
            </button>
          )}

          {/* Historial colapsable */}
          <details style={{marginTop:4}}>
            <summary style={{cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-tertiary)",borderRadius:8,padding:"10px 14px",marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>📋 Historial ({ventas.length} compras · {fmt(totalComprado)})</span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>▾</span>
            </summary>
          <div style={{marginTop:4}}>
          {historial.length===0&&<p style={{fontSize:13,color:"var(--color-text-tertiary)",padding:"4px 0"}}>Sin registros aún</p>}
          {historial.map(v=>(
            <div key={v.id} style={{marginBottom:8}}>
              {editandoVentaId===v.id
                ? <EditVenta venta={v} productos={productos} onGuardar={(d,p,m,sa,obs,tr2)=>{onEditarVenta(v.id,d,p,m,sa,obs,tr2);setEditandoVentaId(null);}} onCancelar={()=>setEditandoVentaId(null)} />
                : <div style={{...s.card,margin:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{v.fechaKey||v.fecha?.slice(0,10)||v.dia} · {v.fecha?.slice(-8)||""}</span>
                      <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(v.neto)}</span>
                    </div>
                    <div style={{fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{v.detalle.map(d=>`${d.nombre} ×${d.cantidad}`).join(" · ")}</div>
                    <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:6}}>
                      {(()=>{const esMixto=(Number(v.montoTrans)||0)>0&&(Number(v.montoEfec)||0)>0;return esMixto?`Mixto · ef ${fmt(v.montoEfec)} + tr ${fmt(v.montoTrans)}`:v.pago;})()}{v.desc>0?` · desc. ${fmt(v.desc)}`:""}{v.saldoAplicado>0?` · saldo ${fmt(v.saldoAplicado)}`:""}{v.obs?` · ${v.obs.replace(/\s*\[Mixto:[^\]]*\]/g,"")}`:""} 
                    </div>
                    {!soloLectura&&<div style={{display:"flex",justifyContent:"flex-end",gap:6}}>
                      <button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>setEditandoVentaId(v.id)}>Editar</button>
                      <button style={{...s.btnDanger,fontSize:11,padding:"4px 10px"}} onClick={()=>{if(window.confirm(`¿Eliminar venta de ${fmt(v.neto)}?`))onEliminarVenta(v.id);}}>Eliminar</button>
                    </div>}
                  </div>
              }
            </div>
          ))}
          </div>
          </details>

          {/* Envases colapsable */}
          <details style={{marginTop:6}}> 
            <summary style={{cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-tertiary)",borderRadius:8,padding:"10px 14px",marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>🫧 Envases</span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>▾</span>
            </summary>
            <div style={{marginTop:4}}>
              {/* Editor unificado: el mismo ♻️ Envases de todas las listas */}
              <div style={{...s.card,margin:"0 0 10px",paddingTop:2}}>
                <PieEnvases c={cliente} ventas={ventas} onEditar={(id,cambios)=>onEditar(cambios)}
                  izquierda={<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Ajustar fijos y prestados</span>} />
              </div>
              {(()=>{
                const pkEnv={"Sifón 1.5L":"sifon","Bidón 10L":"bidon10","Bidón 20L":"bidon20"};
                const extra={sifon:0,bidon10:0,bidon20:0};
                historial.forEach(v=>{
                  (v.envPrest||[]).forEach(e=>{const k=pkEnv[e.prod];if(k)extra[k]+=Number(e.cant)||0;});
                  (v.envDev||[]).forEach(e=>{const k=pkEnv[e.prod];if(k)extra[k]-=Number(e.cant)||0;});
                });
                // Sumar ajuste manual
                const aj=cliente.envAjuste||{};
                const exTotal={sifon:extra.sifon+(aj.sifon||0),bidon10:extra.bidon10+(aj.bidon10||0),bidon20:extra.bidon20+(aj.bidon20||0)};
                const hab={sifon:cliente.sifon||0,bidon10:cliente.bidon10||0,bidon20:cliente.bidon20||0};
                const total={sifon:hab.sifon+exTotal.sifon,bidon10:hab.bidon10+exTotal.bidon10,bidon20:hab.bidon20+exTotal.bidon20};
                const hayExtra=exTotal.sifon!==0||exTotal.bidon10!==0||exTotal.bidon20!==0;
                return (<>
                  <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-tertiary)"}}>
                    <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>📦 En poder del cliente ahora</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {total.sifon>0&&<div style={s.metricCard}><div style={s.metricLabel}>Sifón</div><div style={{...s.metricVal,color:exTotal.sifon>0?"var(--color-text-warning)":exTotal.sifon<0?"var(--color-text-success)":"var(--color-text-primary)"}}>{total.sifon}</div></div>}
                      {total.bidon10>0&&<div style={s.metricCard}><div style={s.metricLabel}>10L</div><div style={{...s.metricVal,color:exTotal.bidon10>0?"var(--color-text-warning)":exTotal.bidon10<0?"var(--color-text-success)":"var(--color-text-primary)"}}>{total.bidon10}</div></div>}
                      {total.bidon20>0&&<div style={s.metricCard}><div style={s.metricLabel}>20L</div><div style={{...s.metricVal,color:exTotal.bidon20>0?"var(--color-text-warning)":exTotal.bidon20<0?"var(--color-text-success)":"var(--color-text-primary)"}}>{total.bidon20}</div></div>}
                      {cliente.dispenser>0&&<div style={s.metricCard}><div style={s.metricLabel}>Dispenser</div><div style={s.metricVal}>{cliente.dispenser}</div></div>}
                      {!total.sifon&&!total.bidon10&&!total.bidon20&&!cliente.dispenser&&<span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Sin envases</span>}
                    </div>
                    {hayExtra&&(
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:8,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:6}}>
                        {(hab.sifon>0||hab.bidon10>0||hab.bidon20>0)&&<span>Habitual: {hab.sifon>0?`Sifón×${hab.sifon} `:""}{hab.bidon10>0?`10L×${hab.bidon10} `:""}{hab.bidon20>0?`20L×${hab.bidon20}`:""} · </span>}
                        {exTotal.sifon!==0&&<span style={{color:exTotal.sifon>0?"var(--color-text-warning)":"var(--color-text-success)"}}>{exTotal.sifon>0?`+${exTotal.sifon} sif. extra`:` −${Math.abs(exTotal.sifon)} sif. devueltos`} </span>}
                        {exTotal.bidon10!==0&&<span style={{color:exTotal.bidon10>0?"var(--color-text-warning)":"var(--color-text-success)"}}>{exTotal.bidon10>0?`+${exTotal.bidon10} 10L extra`:` −${Math.abs(exTotal.bidon10)} 10L devueltos`} </span>}
                        {exTotal.bidon20!==0&&<span style={{color:exTotal.bidon20>0?"var(--color-text-warning)":"var(--color-text-success)"}}>{exTotal.bidon20>0?`+${exTotal.bidon20} 20L extra`:` −${Math.abs(exTotal.bidon20)} 20L devueltos`}</span>}
                      </div>
                    )}
                  </div>
                </>);
              })()}
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"10px 0 6px"}}>Movimientos registrados</div>
              {historial.filter(v=>(v.envPrest||[]).length>0||(v.envDev||[]).length>0).length===0&&
                <p style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Sin movimientos de envases registrados</p>}
              {historial.filter(v=>(v.envPrest||[]).length>0||(v.envDev||[]).length>0).map(v=>(
                <div key={v.id} style={{...s.card,margin:"0 0 8px"}}>
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>{v.fechaKey||v.dia}</div>
                  {(v.envPrest||[]).map((e,i)=>(
                    <div key={"p"+i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                      <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>+ Prestado: {e.prod}</span>
                      <span style={s.badge("warning")}>×{e.cant}</span>
                    </div>
                  ))}
                  {(v.envDev||[]).map((e,i)=>(
                    <div key={"d"+i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                      <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>← Devuelto: {e.prod}</span>
                      <span style={s.badge("success")}>×{e.cant}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>


          {!soloLectura&&<><div style={{...s.divider,marginTop:12}}/>
          <details style={{marginTop:4}}>
            <summary style={{fontSize:12,color:"var(--color-text-tertiary)",cursor:"pointer",padding:"4px 0",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
              ⚙ Opciones avanzadas
            </summary>
            <div style={{marginTop:8}}>
              <button style={{...s.btnDanger,width:"100%",padding:"10px",fontSize:13}} onClick={()=>{if(window.confirm(`¿Eliminar a ${cliente.nombre}? Se borrarán también sus ventas.`))onEliminarCliente();}}>
                Eliminar cliente
              </button>
            </div>
          </details></>}
        </>}
        {editandoCliente && !soloLectura && <EditCliente cliente={cliente} onGuardar={cambios=>{onEditar(cambios);setEditandoCliente(false);}} onEliminarCliente={onEliminarCliente} />}
      </div>
    </div>
  );
}

function EditCliente({cliente,onGuardar,onEliminarCliente}) {
  const [datos,setDatos]=useState({...cliente});
  const set=(k,v)=>setDatos(d=>({...d,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
      <div><label style={s.label}>Día de reparto</label>
        <select style={s.select} value={datos.dia} onChange={e=>set("dia",e.target.value)}>{DIAS.map(d=><option key={d} value={d}>{d}</option>)}</select>
      </div>
      {[["nombre","Nombre y apellido"],["barrio","Barrio"],["manzana","Manzana"],["lote","Lote"],["sector","Sector"],["calle","Calle"],["nro","Número"],["telefono","Teléfono (sin 0 ni 15)"],["maps","Link Google Maps"],["foto","Link foto del domicilio (Google Drive, etc)"]].map(([k,l])=>(
        <div key={k}><label style={s.label}>{l}</label><input style={s.input} value={datos[k]||""} onChange={e=>set(k,e.target.value)} placeholder={l} /></div>
      ))}
      <div>
        <label style={s.label}>Notas rápidas (timbre roto, perro, cobrar deuda, etc.)</label>
        <input style={s.input} value={datos.notas||""} onChange={e=>set("notas",e.target.value)} placeholder="ej: timbre roto, cobrar $2000..." />
      </div>
      <span style={{...s.label,fontSize:13,marginTop:4}}>Envases habituales</span>
      <div style={s.grid3}>
        {[["sifon","Sifón"],["bidon10","10L"],["bidon20","20L"]].map(([k,l])=>(
          <div key={k}><label style={{...s.label,textAlign:"center"}}>{l}</label>
            <input style={{...s.input,textAlign:"center"}} type="number" min={0} value={datos[k]||0} onChange={e=>set(k,Number(e.target.value))} />
          </div>
        ))}
      </div>
      <div>
        <label style={s.label}>Dispenser en comodato</label>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button style={{...s.btn,padding:"5px 16px",fontSize:20,lineHeight:1}} onClick={()=>set("dispenser",Math.max(0,(datos.dispenser||0)-1))}>−</button>
          <span style={{fontSize:20,fontWeight:500,minWidth:32,textAlign:"center",color:"var(--color-text-primary)"}}>{datos.dispenser||0}</span>
          <button style={{...s.btn,padding:"5px 16px",fontSize:20,lineHeight:1}} onClick={()=>set("dispenser",(datos.dispenser||0)+1)}>+</button>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>unidades prestadas</span>
        </div>
      </div>
      <div><label style={s.label}>Saldo (corrección manual)</label><input style={s.input} type="number" value={datos.saldo||0} onChange={e=>set("saldo",Number(e.target.value))} /></div>
      {datos.foto&&<div style={{position:"relative",cursor:"zoom-in"}} onClick={()=>setMostrarFotoGrande(true)}>
        <img src={datos.foto} alt="Domicilio" style={{width:"100%",borderRadius:8,maxHeight:160,objectFit:"cover"}} />
        <div style={{position:"absolute",bottom:6,right:8,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:11,borderRadius:6,padding:"2px 8px"}}>🔍 Ampliar</div>
      </div>}
      <button style={s.btnPrimary} onClick={()=>onGuardar(datos)}>Guardar cambios</button>
      <div style={{marginTop:16,paddingTop:12,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
        <button style={{...s.btnDanger,width:"100%",padding:"10px",fontSize:13}}
          onClick={()=>{if(window.confirm(`¿Eliminar a ${datos.nombre}? Se borrarán también todas sus ventas.`))onEliminarCliente();}}>
          Eliminar cliente permanentemente
        </button>
      </div>
    </div>
  );
}

function EditVenta({venta,productos,onGuardar,onCancelar}) { // onGuardar(detalle,pago,monto,saldoApl,obs,montoTrans2)
  const [cantidades,setCantidades]=useState(()=>{const m={};productos.forEach(p=>{m[p.nombre]=0;});venta.detalle.forEach(d=>{m[d.nombre]=d.cantidad;});return m;});
  const esMixtaOrig = venta.pago==="mixto" || (Number(venta.montoTrans)||0)>0;
  const [pago,setPago]=useState(esMixtaOrig?"mixto":(venta.pago||"contado"));
  const [monto,setMonto]=useState(()=>String(venta.pagadoNum||venta.neto||""));
  const [montoEfec,setMontoEfec]=useState(esMixtaOrig?String(venta.montoEfec||""):"");
  const [montoTrans,setMontoTrans]=useState(esMixtaOrig?String(venta.montoTrans||""):"");
  const [obs,setObs]=useState((venta.obs||"").replace(/\s*\[Mixto:[^\]]*\]/g,""));
  const detalle=productos.map(p=>({nombre:p.nombre,cantidad:cantidades[p.nombre]||0,precio:p.precio,total:(cantidades[p.nombre]||0)*p.precio})).filter(d=>d.cantidad>0);
  const bruto=detalle.reduce((a,d)=>a+d.total,0);
  const neto=bruto;
  const sonarTrans = ()=>{try{const ctx=new(window.AudioContext||window.webkitAudioContext)();[523,659,784].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.value=0.3;o.start(ctx.currentTime+i*0.15);o.stop(ctx.currentTime+i*0.15+0.15);});}catch(e){}};
  return (
    <div style={{...s.card,margin:0,background:"var(--color-background-secondary)"}}>
      <p style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>Editando venta</p>
      {productos.map(p=>(
        <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{p.nombre}</span>
          <div style={s.row}>
            <button style={{...s.btn,padding:"3px 12px",fontSize:17}} onClick={()=>setCantidades(q=>({...q,[p.nombre]:Math.max(0,(q[p.nombre]||0)-1)}))}>−</button>
            <span style={{minWidth:24,textAlign:"center",fontWeight:500,fontSize:15,color:"var(--color-text-primary)"}}>{cantidades[p.nombre]||0}</span>
            <button style={{...s.btn,padding:"3px 12px",fontSize:17}} onClick={()=>setCantidades(q=>({...q,[p.nombre]:(q[p.nombre]||0)+1}))}>+</button>
          </div>
        </div>
      ))}
      {/* Forma de pago */}
      <div style={{display:"flex",gap:6,margin:"10px 0"}}>
        {[["contado","Contado"],["transferencia","Transfer."],["fiado","Fiado"],["mixto","Mixto"]].map(([v,l])=>(
          <button key={v} style={{...s.btn,flex:1,fontSize:12,padding:"8px 2px",background:pago===v?"#185FA5":undefined,color:pago===v?"#fff":undefined,border:pago===v?"none":undefined}} onClick={()=>setPago(v)}>{l}</button>
        ))}
      </div>
      {pago==="mixto"&&(
        <div style={{...s.card,margin:"0 0 8px",background:"var(--color-background-tertiary)"}}>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Total: {fmt(neto)}</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={s.label}>Efectivo $</label><input style={s.input} type="number" placeholder="0" value={montoEfec} onChange={e=>setMontoEfec(e.target.value)}/></div>
            <div style={{flex:1}}><label style={s.label}>Transferencia $</label><input style={s.input} type="number" placeholder="0" value={montoTrans} onChange={e=>setMontoTrans(e.target.value)}/></div>
          </div>
          {(Number(montoEfec||0)+Number(montoTrans||0))>0&&(
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>
              Pagado: {fmt(Number(montoEfec||0)+Number(montoTrans||0))}
              {(Number(montoEfec||0)+Number(montoTrans||0))<neto&&<span style={{color:"var(--color-text-warning)"}}> · Saldo: {fmt(neto-Number(montoEfec||0)-Number(montoTrans||0))}</span>}
            </div>
          )}
        </div>
      )}
      {pago!=="fiado"&&pago!=="mixto"&&(
        <div style={{marginBottom:8}}>
          <label style={s.label}>Monto cobrado (vacío = {fmt(neto)} exacto)</label>
          <input style={s.input} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder={String(Math.round(neto))}/>
        </div>
      )}
      {pago==="transferencia"&&(
        <div style={{...s.card,margin:"0 0 8px",background:"#1e3a5f",border:"0.5px solid #5daaff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:"#5daaff"}}>Confirmar transferencia</span>
            <button style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer"}} onClick={sonarTrans}>🔔 Confirmar</button>
          </div>
        </div>
      )}
      <div style={{marginBottom:8}}><label style={s.label}>Observaciones</label><input style={s.input} value={obs} onChange={e=>setObs(e.target.value)}/></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:14,fontWeight:500,color:"var(--color-text-primary)",borderTop:"0.5px solid var(--color-border-tertiary)"}}><span>Total</span><span>{fmt(neto)}</span></div>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button style={{...s.btn,flex:1}} onClick={onCancelar}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2,padding:"10px"}} onClick={()=>{
          if(pago==="mixto"){
            const ef=Number(montoEfec||0), tr=Number(montoTrans||0);
            if(ef+tr===0){ alert("⚠️ Completá el desglose: cuánto en efectivo y cuánto por transferencia."); return; }
            onGuardar(detalle,"mixto",String(ef),venta.saldoAplicado||0,obs,tr);
          } else {
            onGuardar(detalle,pago,pago==="fiado"?"":monto,venta.saldoAplicado||0,obs);
          }
        }}>Guardar</button>
      </div>
    </div>
  );
}

function VehiculoMantModal({onGuardar,onCerrar}) {
  const [tipo,setTipo] = React.useState("aceite");
  const [otroDetalle,setOtroDetalle] = React.useState("");
  const [descripcion,setDescripcion] = React.useState("");
  const [km,setKm] = React.useState("");
  const [costo,setCosto] = React.useState("");
  const [proximo,setProximo] = React.useState("");
  const [proximaFechaISO,setProximaFechaISO] = React.useState("");
  const [fechaISO,setFechaISO] = React.useState(new Date().toISOString().slice(0,10));
  const fechaDisplay = fechaISO ? new Date(fechaISO+'T12:00:00').toLocaleDateString("es-AR") : "";
  const tipos = [
    {id:"aceite",    label:"🛢 Cambio de aceite",         color:"#f5b942"},
    {id:"preventivo",label:"🔩 Mantenimiento preventivo", color:"#4dd9a0"},
    {id:"embrague",  label:"⚙️ Cambio de embrague",      color:"#e05c5c"},
    {id:"reparacion",label:"🛠 Reparación",               color:"#5daaff"},
    {id:"gnc",       label:"🟢 Oblea GNC",                color:"#22c55e"},
    {id:"vtv",       label:"🔵 VTV",                      color:"#3b82f6"},
    {id:"otro",      label:"📋 Otro",                     color:"#a0aec0"},
  ];
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",zIndex:1200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"var(--color-background-secondary)",borderRadius:"16px 16px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)"}}>🔧 Registrar mantenimiento</span>
          <button style={{background:"none",border:"none",fontSize:22,color:"var(--color-text-secondary)",cursor:"pointer"}} onClick={onCerrar}>✕</button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>📅 Fecha del mantenimiento</label>
          <input type="date" style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box"}} value={fechaISO} onChange={e=>setFechaISO(e.target.value)} />
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:6}}>Tipo</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {tipos.map(t=>(
              <button key={t.id} onClick={()=>setTipo(t.id)} style={{padding:"7px 12px",borderRadius:8,border:`2px solid ${tipo===t.id?t.color:"var(--color-border-tertiary)"}`,background:tipo===t.id?t.color+"22":"transparent",color:tipo===t.id?t.color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer",fontWeight:tipo===t.id?600:400}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {tipo==="otro"&&(
          <div style={{marginBottom:10}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>¿Qué es? (detalle del "Otro")</label>
            <input style={{width:"100%",background:"var(--color-background-tertiary)",border:"2px solid #a0aec0",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:14,boxSizing:"border-box",fontWeight:500}}
              placeholder="Ej: Cambio de gomas, batería, luces..." value={otroDetalle} onChange={e=>setOtroDetalle(e.target.value)} />
          </div>
        )}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Descripción / detalle adicional</label>
          <textarea style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,resize:"none",boxSizing:"border-box",minHeight:60}} placeholder="Ej: Cambio aceite 10W-40 + filtro..." value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Km actuales</label>
            <input type="number" style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box"}} placeholder="Ej: 125000" value={km} onChange={e=>setKm(e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Costo ($)</label>
            <input type="number" style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box"}} placeholder="Ej: 85000" value={costo} onChange={e=>setCosto(e.target.value)} />
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Próximo mantenimiento (notas)</label>
          <input style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box"}} placeholder="Ej: 135.000 km / junio 2026" value={proximo} onChange={e=>setProximo(e.target.value)} />
        </div>
        <div style={{marginBottom:18,background:"rgba(255,193,7,0.08)",border:"1px solid rgba(255,193,7,0.3)",borderRadius:10,padding:"10px 12px"}}>
          <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>📅 Fecha próximo mantenimiento <span style={{color:"#f5b942",fontSize:11}}>(para notificación)</span></label>
          <input type="date" style={{width:"100%",background:"var(--color-background-tertiary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"8px 10px",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box"}} value={proximaFechaISO} onChange={e=>setProximaFechaISO(e.target.value)} />
          {!proximaFechaISO && <p style={{fontSize:11,color:"var(--color-text-tertiary)",margin:"4px 0 0"}}>Opcional — si completás, te avisamos 3 días antes</p>}
        </div>
        <button style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"#185FA5",color:"#e2eaf4",fontSize:15,fontWeight:600,cursor:"pointer"}} onClick={()=>{if(!tipo)return;onGuardar({tipo,descripcion,km,costo,proximo,proximaFechaISO,fecha:fechaDisplay,fechaISO,otroDetalle:tipo==="otro"?otroDetalle:""});}}>
          Guardar registro
        </button>
      </div>
    </div>
  );
}

function RecordatorioModal({cliente,onGuardar,onCerrar}) {
  const hoy = new Date();
  const [fecha,setFecha] = React.useState(hoy.toISOString().slice(0,10));
  const [hora,setHora]   = React.useState("10:00");
  const [tipo,setTipo]   = React.useState("visita"); // visita | cobro
  const [motivo,setMotivo] = React.useState("");
  const tipoConfig = {visita:{ico:"🏠",label:"Visita",color:"#5daaff",bg:"#1e3a5f"},cobro:{ico:"💰",label:"Cobro",color:"#f5b942",bg:"#2e1f06"}};
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--color-background-secondary)",borderRadius:16,padding:20,width:"100%",maxWidth:400,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>🔔 Nuevo recordatorio</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>{cliente.nombre}</div>
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
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:2}}>
            <label style={s.label}>Fecha</label>
            <input type="date" style={s.input} value={fecha} onChange={e=>setFecha(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <label style={s.label}>Hora</label>
            <input type="time" style={s.input} value={hora} onChange={e=>setHora(e.target.value)}/>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={s.label}>Detalle</label>
          <textarea style={{...s.input,minHeight:60,resize:"vertical"}} placeholder={tipo==="cobro"?"ej: Cobrar deuda $5.000, pago parcial...":"ej: Pasar a ver al cliente, entregar pedido..."} value={motivo} onChange={e=>setMotivo(e.target.value)}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...s.btn,flex:1}} onClick={onCerrar}>Cancelar</button>
          <button style={{...s.btnPrimary,flex:2}} onClick={()=>{
            if(!motivo.trim()){alert("Ingresá el detalle");return;}
            onGuardar({fecha,hora,tipo,motivo:motivo.trim()});
          }}>Guardar recordatorio</button>
        </div>
      </div>
    </div>
  );
}

function PagoSaldoPanel({saldo,onCobrar,onCerrar}) {
  const deuda = Math.abs(saldo||0);
  const [monto,setMonto] = React.useState(String(deuda));
  const [pago,setPago]   = React.useState("contado");
  return (
    <div style={{background:"var(--color-background-secondary)",borderRadius:16,padding:20,width:"100%",maxWidth:400,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
      <div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>💰 Cobrar deuda</div>
      <div style={{fontSize:13,color:"var(--color-text-danger)",marginBottom:16}}>Total pendiente: {fmt(deuda)}</div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["contado","Efectivo"],["transferencia","Transferencia"]].map(([v,l])=>(
          <button key={v} style={{...s.btn,flex:1,fontSize:14,padding:"10px 4px",background:pago===v?"#185FA5":undefined,color:pago===v?"#fff":undefined,border:pago===v?"none":undefined}}
            onClick={()=>setPago(v)}>{l}</button>
        ))}
      </div>
      <div style={{marginBottom:16}}>
        <label style={s.label}>Monto cobrado</label>
        <input style={s.input} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder={String(deuda)}/>
        {Number(monto)<deuda&&Number(monto)>0&&(
          <div style={{fontSize:12,color:"var(--color-text-warning)",marginTop:4}}>
            Pago parcial · Queda pendiente: {fmt(deuda-Number(monto))}
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{...s.btn,flex:1}} onClick={onCerrar}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2,fontSize:15}} onClick={()=>{
          const m=Number(monto)||deuda;
          if(m<=0){alert("Ingresá el monto");return;}
          onCobrar(m,pago);
        }}>Confirmar cobro</button>
      </div>
    </div>
  );
}

function CobroDeudaPanel({saldo,onCobrar}) {
  const [monto,setMonto] = React.useState("");
  const [pago,setPago]   = React.useState("contado");
  const [open,setOpen]   = React.useState(false);
  const deuda = Math.abs(saldo);
  if(!open) return (
    <button style={{width:"100%",padding:"12px",fontSize:14,fontWeight:500,borderRadius:10,border:"1px solid var(--color-border-danger)",background:"var(--color-background-danger)",color:"var(--color-text-danger)",cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
      onClick={()=>setOpen(true)}>
      💰 Cobrar deuda — {fmt(deuda)}
    </button>
  );
  return (
    <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-danger)",border:"0.5px solid var(--color-border-danger)"}}>
      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)",marginBottom:10}}>Cobrar deuda · Total pendiente: {fmt(deuda)}</div>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["contado","Efectivo"],["transferencia","Transfer."]].map(([v,l])=>(
          <button key={v} style={{...s.btn,flex:1,fontSize:13,padding:"9px 4px",background:pago===v?"#185FA5":undefined,color:pago===v?"#fff":undefined,border:pago===v?"none":undefined}} onClick={()=>setPago(v)}>{l}</button>
        ))}
      </div>
      <div style={{marginBottom:8}}>
        <label style={s.label}>Monto cobrado (vacío = todo {fmt(deuda)})</label>
        <input style={s.input} type="number" placeholder={String(deuda)} value={monto} onChange={e=>setMonto(e.target.value)}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{...s.btn,flex:1}} onClick={()=>setOpen(false)}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2}} onClick={()=>{
          const m = Number(monto)||deuda;
          onCobrar(m,pago);
        }}>Registrar cobro</button>
      </div>
    </div>
  );
}


function FiadosPendientes({clientes,ventas,onCobrar,onVolver,onEditarCliente}) {
  const [pagando,setPagando]=React.useState(null);
  const [monto,setMonto]=React.useState('');
  const [pago,setPago]=React.useState('contado');
  const conDeuda=clientes.filter(c=>c.saldo<0).sort((a,b)=>a.saldo-b.saldo);
  const totalDeuda=conDeuda.reduce((a,c)=>a+Math.abs(c.saldo),0);
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <div style={{flex:1}}>
          <div style={s.headerTitle}>💰 Fiados pendientes</div>
          <div style={{fontSize:11,color:'var(--color-text-danger)'}}>{conDeuda.length} clientes · {fmt(totalDeuda)} total</div>
        </div>
      </div>
      {conDeuda.length===0&&<div style={{padding:40,textAlign:'center',color:'var(--color-text-success)',fontSize:15}}>✅ Sin fiados pendientes</div>}
      {conDeuda.map(c=>(
        <div key={c.id} style={{...s.card,margin:'6px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:'var(--color-text-primary)'}}>{c.nombre}</div>
              <div style={{fontSize:11,color:'var(--color-text-tertiary)'}}>{c.dia}{c.barrio?' · '+c.barrio:''}</div>
            </div>
            <span style={{fontSize:16,fontWeight:700,color:'var(--color-text-danger)'}}>{fmt(Math.abs(c.saldo))}</span>
          </div>
          {pagando===c.id?(
            <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:8,borderTop:'0.5px solid var(--color-border-tertiary)'}}>
              <div style={{display:'flex',gap:6}}>
                {['contado','transferencia'].map(p=>(
                  <button key={p} style={{flex:1,padding:'7px',fontSize:12,borderRadius:8,border:'0.5px solid var(--color-border-secondary)',background:pago===p?'#185FA5':'var(--color-background-tertiary)',color:pago===p?'#e2eaf4':'var(--color-text-secondary)',cursor:'pointer',fontWeight:pago===p?600:400}}
                    onClick={()=>setPago(p)}>{p==='contado'?'💵 Efectivo':'💳 Transfer.'}</button>
                ))}
              </div>
              <input style={{...s.input}} type='number' placeholder={fmt(Math.abs(c.saldo))+' (total)'} value={monto} onChange={e=>setMonto(e.target.value)} />
              <div style={{display:'flex',gap:6}}>
                <button style={{...s.btn,flex:1}} onClick={()=>{setPagando(null);setMonto('');}}>Cancelar</button>
                <button style={{...s.btnPrimary,flex:2,padding:'9px'}} onClick={()=>{
                  const m=Number(monto)||Math.abs(c.saldo);
                  onCobrar(c.id,m,pago);
                  setPagando(null);setMonto('');
                }}>✓ Confirmar cobro</button>
              </div>
            </div>
          ):(
            <button style={{width:'100%',padding:'9px',background:'#0a2e1f',color:'#4dd9a0',border:'1px solid #4dd9a0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}
              onClick={()=>{setPagando(c.id);setMonto(String(Math.abs(c.saldo)));setPago('contado');}}>
              💰 Cobrar deuda
            </button>
          )}
          {onEditarCliente&&<PieEnvases c={c} ventas={ventas} onEditar={onEditarCliente} />}
        </div>
      ))}
    </div>
  );
}
