// ════════════════════════════════════════════════════════════════════
// ◆  14-config.js — Config
// ════════════════════════════════════════════════════════════════════

// ── Tarjeta de seguridad: activar/desactivar acceso con huella (dueño) ──
// Usa las funciones que ya viven en 05-licencias.js (bioSoportado, srBioRegistrar, etc.)
function SeguridadHuella() {
  const soportado = (typeof bioSoportado === "function") ? bioSoportado() : false;
  const [enrolado, setEnrolado] = React.useState((typeof bioEnrolado === "function") ? bioEnrolado() : false);
  const [trabajando, setTrabajando] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const activar = async () => {
    setMsg(""); setTrabajando(true);
    try {
      await srBioRegistrar();
      setEnrolado(true);
      setMsg("✓ Listo. La próxima vez que abras la app vas a poder entrar con tu huella.");
    } catch(e) {
      setMsg("No se pudo activar. Probá de nuevo, o usá un dispositivo con lector de huella / Face ID (suele andar en el celular).");
    }
    setTrabajando(false);
  };

  const desactivar = () => {
    // "sr_bio_cred" es la misma clave que usa 05-licencias.js (SR_BIO_KEY)
    try { localStorage.removeItem("sr_bio_cred"); localStorage.removeItem("sr_bio_no"); } catch(e){}
    setEnrolado(false);
    setMsg("Huella desactivada. Vas a entrar con tu PIN.");
  };

  return (
    <div style={{...s.card,margin:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:18}}>🔒</span>
        <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Acceso con huella</span>
      </div>
      {!soportado ? (
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"4px 0 0",lineHeight:1.5}}>
          Este dispositivo no tiene lector de huella / Face ID disponible. Suele funcionar desde el celular; probá abriendo la app ahí.
        </p>
      ) : (<>
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 12px",lineHeight:1.5}}>
          Entrá a la app con tu huella en lugar de escribir el PIN. El PIN sigue funcionando por si lo necesitás.
        </p>
        {enrolado ? (
          <>
            <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-success)",display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <span>✓</span><span>Huella activada</span>
            </div>
            <button style={{...s.btn,width:"100%",padding:"11px",fontSize:13,background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:10,fontWeight:600,cursor:"pointer"}}
              onClick={desactivar}>Desactivar huella</button>
          </>
        ) : (
          <button style={{...s.btnPrimary,width:"100%",opacity:trabajando?0.6:1}} disabled={trabajando}
            onClick={activar}>{trabajando?"Verificando..." : "👆 Activar huella"}</button>
        )}
        {msg && <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"8px 0 0",lineHeight:1.5}}>{msg}</p>}
      </>)}
    </div>
  );
}

// ── Tarjeta de notificaciones (dueño) ──────────────────────────────────────
function NotifConfig() {
  const pedirPermiso = async () => {
    if(!('Notification' in window)) return;
    const r = await Notification.requestPermission();
    setPermiso(r);
  };
  const [permiso,setPermiso] = React.useState('Notification' in window ? Notification.permission : 'no-soportado');
  const [probando,setProbando] = React.useState(false);
  const [resultado,setResultado] = React.useState(null);
  const probar = async () => {
    setProbando(true); setResultado(null);
    try {
      if(typeof window.activarNotif!=='function'){ setResultado({ok:false,msg:'La función todavía no cargó, esperá unos segundos y probá de nuevo.'}); }
      else {
        const ok = await window.activarNotif();
        setResultado(ok?{ok:true,msg:'Suscripción guardada. Esto confirma que el navegador quedó registrado — no confirma que un aviso vaya a llegar (eso depende del servidor).'}:{ok:false,msg:'No se pudo activar. Revisá los permisos del navegador.'});
      }
    } catch(e){ setResultado({ok:false,msg:e.message||'Error inesperado'}); }
    setProbando(false);
  };
  const estadoColor = permiso === 'granted' ? '#4dd9a0' : permiso === 'denied' ? '#f07070' : '#f5b942';
  const estadoTexto = permiso === 'granted' ? '✅ Activadas' : permiso === 'denied' ? '🚫 Bloqueadas por el sistema' : permiso === 'no-soportado' ? '⚠ No soportado' : '⏳ Sin activar';
  return (
    <div style={{...s.card,margin:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:18}}>🔔</span>
        <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Notificaciones</span>
      </div>
      <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 10px",lineHeight:1.5}}>
        Avisos de cierre, transferencias, mantenimiento y agenda — funcionan con la app cerrada.
      </p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:13,fontWeight:600,color:estadoColor}}>{estadoTexto}</span>
        {permiso !== 'granted' && permiso !== 'denied' && (
          <button style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:500,cursor:"pointer"}}
            onClick={pedirPermiso}>Activar</button>
        )}
        {permiso === 'denied' && (
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Activalas desde el navegador</span>
        )}
      </div>
      {permiso === 'granted' && (<>
        <button style={{width:"100%",background:"var(--color-background-tertiary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,padding:"9px",fontSize:13,fontWeight:500,cursor:"pointer",marginBottom:6}}
          disabled={probando} onClick={probar}>
          {probando?"Probando...":"🔄 Probar / renovar suscripción de avisos"}
        </button>
        {resultado&&(
          <div style={{fontSize:12,color:resultado.ok?"var(--color-text-success)":"var(--color-text-danger)",lineHeight:1.4}}>
            {resultado.ok?"✓ ":"✗ "}{resultado.msg}
          </div>
        )}
      </>)}
    </div>
  );
}

function Config({productos,setProductos,clientes,setClientes,ventas,setVentas,planillas,setPlanillas,stock,setStock,cargasDia,setCargasDia,syncData,onVolver,negocioId,tabInicial,repartos,repartoActual}) {
  const [tab,setTab]=useState(["datos","vehiculo","apariencia"].includes(tabInicial)?tabInicial:"datos");
  const [editandoId,setEditandoId]=useState(null);
  const [importando,setImportando]=useState(false);
  const [importReparto,setImportReparto]=useState(repartoActual?.id??"");
  // ▶ Fix: filtroReparto faltaba declarado — causaba crash al abrir Datos
  const [filtroReparto,setFiltroReparto]=useState("todos");
  const [mantVeh,setMantVeh] = React.useState(()=>{try{return JSON.parse(localStorage.getItem("rm_mant_vehiculo_v1")||"[]");}catch{return [];}});
  const [mostrarNuevoMant,setMostrarNuevoMant] = React.useState(false);
  const saveMantVeh = (lista) => {setMantVeh(lista);localStorage.setItem("rm_mant_vehiculo_v1",JSON.stringify(lista));if(syncData)syncData({mantVeh:lista});};
  const prestados={sifon:clientes.reduce((a,c)=>a+(c.sifon||0),0),bidon10:clientes.reduce((a,c)=>a+(c.bidon10||0),0),bidon20:clientes.reduce((a,c)=>a+(c.bidon20||0),0)};
  const stockKeys={"Sifón 1.5L":"sifon","Bidón 10L":"bidon10","Bidón 20L":"bidon20","Dispenser":"dispenser"};
  return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={onVolver}>← Volver</button><span style={s.headerTitle}>Configuración</span></div>
      <div style={{padding:"14px 14px 6px",background:"var(--color-background-secondary)"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:8}}>
          {[["datos","📋","Datos"],["vehiculo","🚐","Vehículo"],["apariencia","🎨","Estilo"]].map(([id,ico,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
              padding:"14px 8px",borderRadius:14,cursor:"pointer",
              border:`2px solid ${tab===id?"var(--color-accent)":"var(--color-border-tertiary)"}`,
              background:tab===id?"var(--color-background-info)":"var(--color-background-tertiary)",
              boxShadow:tab===id
                ?"0 0 0 1px var(--color-accent), 0 4px 16px rgba(24,95,165,0.25)"
                :"0 2px 6px rgba(0,0,0,0.25)",
              color:tab===id?"var(--color-text-info)":"var(--color-text-secondary)",
              transition:"all 0.18s",
            }}>
              <span style={{fontSize:26,lineHeight:1}}>{ico}</span>
              <span style={{fontSize:11,fontWeight:tab===id?600:400,letterSpacing:"0.03em"}}>{lbl}</span>
            </button>
          ))}
        </div>
      </div>
      {tab==="stock"&&(<>
        <div style={{padding:16}}>
          <div style={{...s.card,margin:"0 0 14px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px"}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>💲 Precios y costos</span>
          </div>
          
        {/* Lista de artículos */}
        {productos.map(p=>{
          const editing = editandoId===p.id;
          const [pr,setPr] = [p.precio, v=>setProductos(productos.map(x=>x.id===p.id?{...x,precio:Number(v)||0}:x))];
          const [co,setCo] = [p.costo, v=>setProductos(productos.map(x=>x.id===p.id?{...x,costo:Number(v)||0}:x))];
          const margen = p.precio>0?Math.round(((p.precio-p.costo)/p.precio)*100):0;
          return (
            <div key={p.id} style={{...s.card,margin:"0 0 10px",borderLeft:editing?"3px solid #185FA5":"0.5px solid var(--color-border-tertiary)"}}>
              {!editing?(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{p.nombre}</div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>
                      Venta: <b>{fmt(p.precio)}</b> · Costo: {fmt(p.costo)} · 
                      <span style={{color:margen>40?"var(--color-text-success)":margen>20?"var(--color-text-warning)":"var(--color-text-danger)"}}> {margen}% margen</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>setEditandoId(p.id)}>Editar</button>
                    <button style={s.btnDanger} onClick={()=>{if(window.confirm(`¿Eliminar "${p.nombre}"?`))setProductos(productos.filter(x=>x.id!==p.id));}}>✕</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Editando: {p.nombre}</span>
                    <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setEditandoId(null)}>Cancelar</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div>
                      <label style={s.label}>Nombre</label>
                      <input style={s.input} defaultValue={p.nombre} id={`nm-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Precio de venta $</label>
                      <input style={s.inputNum} type="number" defaultValue={p.precio} id={`pr-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Costo de llenado $</label>
                      <input style={s.inputNum} type="number" defaultValue={p.costo} id={`co-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Unidad (ej: 1.5L)</label>
                      <input style={s.input} defaultValue={p.unidad||""} id={`un-${p.id}`} placeholder="opcional" />
                    </div>
                  </div>
                  <button style={s.btnPrimary} onClick={()=>{
                    const nm=document.getElementById(`nm-${p.id}`).value;
                    const pr=Number(document.getElementById(`pr-${p.id}`).value);
                    const co=Number(document.getElementById(`co-${p.id}`).value);
                    const un=document.getElementById(`un-${p.id}`).value;
                    setProductos(productos.map(x=>x.id===p.id?{...x,nombre:nm,precio:pr,costo:co,unidad:un}:x));
                    setEditandoId(null);
                  }}>Guardar</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Agregar nuevo artículo */}
        {editandoId==="nuevo"?(
          <div style={{...s.card,margin:"0 0 12px",borderLeft:"3px solid #4dd9a0"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:500,color:"#4dd9a0"}}>Nuevo artículo</span>
              <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setEditandoId(null)}>Cancelar</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={s.label}>Nombre</label><input style={s.input} id="nm-nuevo" placeholder="Ej: Bidón 20L" /></div>
              <div><label style={s.label}>Precio de venta $</label><input style={s.inputNum} type="number" id="pr-nuevo" placeholder="0" /></div>
              <div><label style={s.label}>Costo de llenado $</label><input style={s.inputNum} type="number" id="co-nuevo" placeholder="0" /></div>
              <div><label style={s.label}>Unidad</label><input style={s.input} id="un-nuevo" placeholder="ej: 20L" /></div>
            </div>
            <button style={{...s.btnPrimary,background:"#0F6E56"}} onClick={()=>{
              const nm=document.getElementById("nm-nuevo").value.trim();
              if(!nm) return;
              const pr=Number(document.getElementById("pr-nuevo").value)||0;
              const co=Number(document.getElementById("co-nuevo").value)||0;
              const un=document.getElementById("un-nuevo").value;
              setProductos([...productos,{id:Date.now(),nombre:nm,precio:pr,costo:co,unidad:un}]);
              setEditandoId(null);
            }}>+ Agregar artículo</button>
          </div>
        ):(
          <button style={{...s.btn,width:"100%",padding:"10px",fontSize:13,marginBottom:16,borderStyle:"dashed"}}
            onClick={()=>setEditandoId("nuevo")}>+ Agregar nuevo artículo</button>
        )}

        {/* Calculadora de costo real */}
        <CalculadoraCostoReal productos={productos} ventas={ventas} />

        </div>
        <div style={{padding:"0 16px 16px"}}>
          <div style={{...s.card,margin:"0 0 14px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px"}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>📦 Stock en depósito</span>
          </div>
          
            <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16,lineHeight:1.6}}>
              Control de stock en los 3 lugares. Al iniciar reparto el camión se carga desde la sodería automáticamente.
            </p>
            {[["soderia","🏭 Sodería"],["casa","🏠 Casa"],["camion","🚚 Camión"]].map(([lugar,titulo])=>(
              <div key={lugar} style={{...s.card,margin:"0 0 12px"}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>{titulo}</div>
                <div style={s.grid3}>
                  {[["sifon","Sifón"],["bidon10","Bidón 10L"],["bidon20","Bidón 20L"]].map(([k,l])=>(
                    <div key={k}>
                      <label style={{...s.label,textAlign:"center"}}>{l}</label>
                      <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0}
                        value={stock?.[lugar]?.[k]??0}
                        onChange={e=>{
                          const ns=JSON.parse(JSON.stringify(stock||{}));
                          if(!ns[lugar]) ns[lugar]={sifon:0,bidon10:0,bidon20:0};
                          ns[lugar][k]=Number(e.target.value)||0;
                          setStock(ns);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button style={s.btnPrimary} onClick={()=>{syncData({stock});alert("Stock guardado");}}>Guardar stock</button>

        {/* ── Carga diaria del camión ── */}
        <div style={{...s.card,margin:"16px 0 14px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px"}}>
          <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>🚚 Carga diaria del camión</span>
        </div>
        {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map(dia=>{
          const c = cargasDia?.[dia] || {soda:0,b10:0,b20:0};
          const upd = (k,v) => { const nd={...(cargasDia||{}),[dia]:{...c,[k]:Number(v)||0}};setCargasDia(nd); };
          return (
            <div key={dia} style={{...s.card,margin:"0 0 10px"}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:10}}>{dia}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["soda","🫧 Soda"],["b10","💧 Bidón 10L"],["b20","🫙 Bidón 20L"]].map(([k,lbl])=>(
                  <div key={k}>
                    <label style={{...s.label,textAlign:"center",fontSize:10}}>{lbl}</label>
                    <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0}
                      value={c[k]??0} onChange={e=>upd(k,e.target.value)}/>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button style={s.btnPrimary} onClick={()=>{syncData({cargasDia});alert("✅ Cargas guardadas");}}>Guardar cargas</button>
        </div>
      </>)}

        {tab==="datos"&&(
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>

            {/* NOTIFICACIONES */}
            <NotifConfig />

            {/* SEGURIDAD — acceso con huella (dueño) */}
            <SeguridadHuella />

            {/* RESPALDO */}
            <div style={{...s.card,margin:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:18}}>💾</span>
                <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Respaldo</span>
              </div>
              <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 12px",lineHeight:1.5}}>
                Guardá todos los datos en un archivo. Descargalo seguido y guardalo en otro lado (mail, Drive). Si se pierde el teléfono, lo restaurás y recuperás todo.
              </p>
              <button style={{...s.btnPrimary,width:"100%",marginBottom:8}} onClick={()=>{
                if(typeof window._descargarRespaldo==="function") window._descargarRespaldo();
                else alert("No se pudo generar el respaldo. Recargá la app e intentá de nuevo.");
              }}>💾 Descargar respaldo (.json)</button>
              <label style={{...s.btn,width:"100%",padding:"10px",display:"block",textAlign:"center",cursor:"pointer",boxSizing:"border-box",fontSize:13,marginBottom:10}}>
                ♻️ Restaurar desde un respaldo
                <input type="file" accept=".json,application/json" style={{display:"none"}} onChange={(e)=>{
                  const file=e.target.files&&e.target.files[0]; if(!file) return;
                  if(!window.confirm("⚠️ Restaurar va a REEMPLAZAR todos los datos actuales por los del archivo. ¿Seguro?")){ e.target.value=""; return; }
                  const reader=new FileReader();
                  reader.onload=(ev)=>{
                    try{ const data=JSON.parse(ev.target.result); const ok=window._restaurarRespaldo&&window._restaurarRespaldo(data); if(ok) alert("✅ Respaldo restaurado. Revisá que esté todo en orden."); }
                    catch(err){ alert("El archivo no es un respaldo válido (.json). "+err.message); }
                    e.target.value="";
                  };
                  reader.readAsText(file);
                }} />
              </label>
            {/* Exportar datos */}
            {(repartos||[]).length > 1 && (
              <div style={{...s.card,margin:0,padding:"10px 14px"}}>
                <label style={{...s.label,marginBottom:6}}>📦 Exportar datos de:</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button
                    style={{...s.btn,padding:"6px 14px",fontSize:12,
                      background:filtroReparto==="todos"?"#185FA5":"var(--color-background-tertiary)",
                      color:filtroReparto==="todos"?"#e2eaf4":"var(--color-text-secondary)",
                      border:filtroReparto==="todos"?"none":"0.5px solid var(--color-border-secondary)"}}
                    onClick={()=>setFiltroReparto("todos")}>
                    Todos los repartidores
                  </button>
                  {(repartos||[]).map(r=>(
                    <button key={r.id}
                      style={{...s.btn,padding:"6px 14px",fontSize:12,
                        background:filtroReparto===r.id?"#185FA5":"var(--color-background-tertiary)",
                        color:filtroReparto===r.id?"#e2eaf4":"var(--color-text-secondary)",
                        border:filtroReparto===r.id?"none":"0.5px solid var(--color-border-secondary)"}}
                      onClick={()=>setFiltroReparto(r.id)}>
                      {r.repartidorNombre||r.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button style={s.btnPrimary} onClick={()=>exportarExcel(clientes,ventas,productos,planillas,repartos||[],filtroReparto)}>
              {(()=>{
                const n = filtroReparto==="todos"
                  ? clientes.length
                  : clientes.filter(c=>c.repartoId===filtroReparto).length;
                const rep = filtroReparto==="todos"
                  ? "todos"
                  : ((repartos||[]).find(r=>r.id===filtroReparto)?.repartidorNombre||"");
                return `📥 Exportar datos · ${n} clientes${rep!=="todos"?` · ${rep}`:""}`;
              })()}
            </button>
            </div>

            {/* IMPORTAR CLIENTES */}
            <div style={{...s.card,margin:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>📥</span>
                <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Importar clientes</span>
              </div>
            {/* Importar clientes */}
            {!importando
              ?<button style={{...s.btn,width:"100%",padding:"11px",fontSize:13}}
                 onClick={()=>setImportando(true)}>
                 📤 Importar clientes desde Excel
               </button>
              :<div style={{...s.card,margin:0}}>
                 <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>Seleccioná el archivo Excel con los clientes:</div>
                 {(repartos&&repartos.length>0)&&(
                   <div style={{marginBottom:10}}>
                     <label style={{...s.label,fontWeight:500}}>Asignar los clientes a:</label>
                     <select style={{...s.input}} value={importReparto}
                       onChange={e=>setImportReparto(e.target.value?Number(e.target.value)||e.target.value:"")}>
                       <option value="">— Sin asignar —</option>
                       {repartos.map(r=>(
                         <option key={r.id} value={r.id}>{r.numero}. {r.repartidorNombre}</option>
                       ))}
                     </select>
                     <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:4}}>
                       Los clientes importados quedarán asignados a ese reparto.
                     </div>
                   </div>
                 )}
                 <input type="file" accept=".xlsx" style={{...s.input,marginBottom:8,padding:"6px"}}
                   onChange={e=>{
                     if(e.target.files[0]){
                       importarClientesPlanilla(e.target.files[0], clientes, (nuevos)=>{setClientes(nuevos);syncData({clientes:nuevos,negocioId});}, importReparto||null);
                     }
                     setImportando(false);
                   }}
                 />
                 <button style={{...s.btn,width:"100%"}} onClick={()=>setImportando(false)}>Cancelar</button>
               </div>
            }
            </div>

            {/* MANTENIMIENTO DE DATOS */}
            <div style={{...s.card,margin:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>🔧</span>
                <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Mantenimiento de datos</span>
              </div>
              <button style={{...s.btn,width:"100%",padding:"10px",fontSize:13,marginBottom:8}}
                onClick={()=>{if(window.confirm("¿Subir todos los datos a la nube?")){
                  cloudSave({clientes,ventas,planillas,stock,productos,noVisitas:(noVisitas||[]),prospectos:(prospectos||[])},uid,negocioId)
                    .then(()=>alert("✅ Datos sincronizados."))
                    .catch(()=>alert("❌ Error. Verificá tu conexión."));
                }}}>
                🔄 Forzar sincronización
              </button>
            {/* Enviar informe */}
            <button style={{...s.btn,width:"100%",padding:"11px",background:"#185FA5",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}
              onClick={async ()=>{
                const lic=JSON.parse(localStorage.getItem("rm_licencia")||"{}");
                if(!lic.email){alert("No hay email configurado en la licencia.");return;}
                const total=ventas.reduce((a,v)=>a+(v.neto||0),0);
                const hoy=new Date().toLocaleDateString("es-AR");
                if(window.enviarEmailBrevoRM){
                  await window.enviarEmailBrevoRM({
                    to:lic.email, toName:lic.nombre||"",
                    subject:`📊 Informe de repartos · ${hoy}`,
                    htmlContent:`<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
                      <h2 style="color:#185FA5">📊 Informe de repartos</h2>
                      <p style="color:#666">${hoy}</p>
                      <div style="background:#f0f7ff;border-radius:10px;padding:16px;margin:16px 0">
                        <div style="font-size:28px;font-weight:700;color:#185FA5">$${total.toLocaleString("es-AR")}</div>
                        <div style="color:#666">Total acumulado · ${ventas.length} ventas · ${clientes.length} clientes</div>
                      </div>
                      <p style="color:#999;font-size:11px">Sistema de Reparto · Emma Soluciones Digitales</p>
                    </div>`
                  });
                  alert("✅ Informe enviado a "+lic.email);
                } else { alert("❌ Servicio de email no disponible."); }
              }}>
              📊 Enviar informe por email
            </button>
            </div>

            {/* ESPACIO USADO */}
            <div style={{...s.card,margin:0}}>
              {(()=>{
                let total=0;
                try{for(let k in localStorage){if(localStorage.hasOwnProperty(k)){total+=((localStorage[k]||'').length*2);}}}catch(e){}
                const kb=Math.round(total/1024);
                const pct=Math.min(100,Math.round(kb/5120*100));
                const color=pct>80?"#e05c5c":pct>50?"#f5b942":"#4dd9a0";
                return (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>💾 Espacio usado</span>
                      <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{kb} KB · {pct}%</span>
                    </div>
                    <div style={{height:8,background:"var(--color-background-tertiary)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:color,borderRadius:4}}/>
                    </div>
                    {pct>70&&<div style={{fontSize:12,color:"#e05c5c",marginTop:8}}>⚠️ Espacio alto. Eliminá fotos si la app falla.</div>}
                  </div>
                );
              })()}
            </div>

            {/* EMMA CONTROL (plegable) */}
            <details style={{...s.card,margin:0}}>
              <summary style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",cursor:"pointer"}}>🔗 Vincular con Emma Control</summary>
              <div style={{marginTop:10}}>
                <VincularEmmaControl />
              </div>
            </details>

            {/* WhatsApp */}
            <a href="https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto"
              target="_blank" rel="noopener"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"12px",borderRadius:10,background:"#0a2e1f",
                border:"1px solid #4dd9a0",color:"#4dd9a0",fontSize:13,fontWeight:600,textDecoration:"none"}}>
              💬 Soporte por WhatsApp
            </a>

            {/* ZONA PELIGROSA (plegable) */}
            <details style={{...s.card,margin:0,border:"1px solid rgba(220,38,38,0.3)"}}>
              <summary style={{fontSize:13,fontWeight:600,color:"var(--color-text-danger)",cursor:"pointer"}}>⚠️ Zona peligrosa</summary>
              <div style={{marginTop:10}}>
              <button style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--color-text-danger)",
                background:"rgba(220,38,38,0.1)",color:"var(--color-text-danger)",fontSize:13,fontWeight:600,cursor:"pointer"}}
                onClick={async ()=>{
                  if(!window.confirm("⚠️ ¿Borrar TODOS los clientes, ventas y movimientos?\n\nLos productos, stock y repartos se conservan.")) return;
                  ["rm_clientes_v3","rm_ventas_v3","rm_planillas_v1","rm_novisitas_v1",
                   "rm_prospectos_v1","rm_recordatorios_v1","rm_lc_hist_precios","rm_lc_ultimo_backup"]
                    .forEach(k=>localStorage.removeItem(k));
                  Object.keys(localStorage).filter(k=>k.startsWith("rm_lc_backup_")).forEach(k=>localStorage.removeItem(k));
                  if(window.db && negocioId){
                    try{
                      const col=window.db.collection("negocios").doc(negocioId).collection("datos");
                      const snap=await col.get();
                      const ops=[];
                      snap.forEach(doc=>{
                        const id=doc.id;
                        if(id.startsWith("cl_")||id.startsWith("vt_")||id==="clientes_meta"||id==="ventas_meta"){
                          ops.push(doc.ref.delete());
                        } else if(id==="config"){
                          ops.push(doc.ref.update({planillas:{},noVisitas:[],recordatorios:[],prospectos:[],histPrecios:[],mantVeh:[]}));
                        }
                      });
                      await Promise.all(ops);
                    }catch(e){console.error(e);}
                  }
                  window.location.reload();
                }}>
                🗑️ Borrar clientes, ventas y movimientos
              </button>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:6,textAlign:"center"}}>Los productos, stock y repartos se conservan</div>
              </div>
            </details>
          </div>
        )}
      {tab==="vehiculo"&&(
        <div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>🔧 Mantenimiento del vehículo</div>
              <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:2}}>Historial de service y reparaciones</div>
            </div>
            <button style={{...s.btnPrimary,padding:"8px 14px",fontSize:13}} onClick={()=>setMostrarNuevoMant(true)}>+ Registrar</button>
          </div>
          {mantVeh.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)"}}>
              <div style={{fontSize:40,marginBottom:10}}>🚐</div>
              <div style={{fontSize:14}}>Sin registros aún</div>
              <div style={{fontSize:12,marginTop:6}}>Registrá cambios de aceite, service y reparaciones</div>
            </div>
          )}
          {[...mantVeh].reverse().map((m,i)=>(
            <div key={i} style={{...s.card,margin:"0 0 10px",borderLeft:`3px solid ${m.tipo==="aceite"?"#f5b942":m.tipo==="preventivo"?"#4dd9a0":m.tipo==="embrague"?"#e05c5c":m.tipo==="reparacion"?"#5daaff":m.tipo==="gnc"?"#22c55e":m.tipo==="vtv"?"#3b82f6":"#a0aec0"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>
                    {m.tipo==="aceite"?"🛢 Cambio de aceite":m.tipo==="preventivo"?"🔩 Mantenimiento preventivo":m.tipo==="embrague"?"⚙️ Cambio de embrague":m.tipo==="reparacion"?"🛠 Reparación":m.tipo==="gnc"?"🟢 Oblea GNC":m.tipo==="vtv"?"🔵 VTV":m.tipo==="otro"?"📋 "+(m.otroDetalle||"Otro"):"📋 "+m.tipo}
                  </div>
                  {m.descripcion&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>{m.descripcion}</div>}
                  <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
                    {m.km&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>📊 {Number(m.km).toLocaleString("es-AR")} km</span>}
                    {m.costo&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>💰 ${Number(m.costo).toLocaleString("es-AR")}</span>}
                  </div>
                  {m.proximo&&<div style={{fontSize:12,color:"#f5b942",marginTop:4,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:4}}>⏰ Próximo: {m.proximo}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:10,flexShrink:0}}>
                  <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{m.fecha}</span>
                  <button style={{background:"#3a2020",color:"#e05c5c",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}
                    onClick={()=>saveMantVeh(mantVeh.filter((_,j)=>mantVeh.length-1-j!==i))}>Borrar</button>
                </div>
              </div>
            </div>
          ))}
          {mostrarNuevoMant&&(
            <VehiculoMantModal
              onGuardar={(reg)=>{saveMantVeh([...mantVeh,reg]);setMostrarNuevoMant(false);}}
              onCerrar={()=>setMostrarNuevoMant(false)}
            />
          )}
        </div>
      )}
      {tab==="apariencia"&&(
        <div style={{padding:16}}>
          <ConfigApariencia />
        </div>
      )}

    </div>
  );
}

