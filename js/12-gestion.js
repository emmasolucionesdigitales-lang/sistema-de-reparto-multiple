// ════════════════════════════════════════════════════════════════════
// ◆  12-gestion.js — GestionClientes · FormCliente · Resumen · exportar · importar · Calculadora
// ════════════════════════════════════════════════════════════════════

function GestionClientes({clientes,onEditar,onEliminar,onNuevo,onVolver,onReordenarTodo,onRegistrarVenta,onVerDetalle,ventas,repartos}) {
  const [fotoClienteId,setFotoClienteId] = React.useState(null);
  const [reasignandoId,setReasignandoId] = useState(null);
  const fotoCliente = fotoClienteId ? clientes.find(c=>c.id===fotoClienteId) : null;
  const [busqueda,setBusqueda]   = useState("");
  const [filtroDia,setFiltroDia] = useState("todos");
  const [modoNuevo,setModoNuevo] = useState(false);
  const [editandoId,setEditandoId] = useState(null);

  // Calcular envases extra por cliente
  const extraEnvases = React.useMemo(()=>{
    const m={};
    (ventas||[]).forEach(v=>{
      if(!m[v.clienteId]) m[v.clienteId]={sifon:0,bidon10:0,bidon20:0};
      (v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)m[v.clienteId][k]+=Number(e.cant)||0;});
      (v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)m[v.clienteId][k]-=Number(e.cant)||0;});
    });
    return m;
  },[ventas]);

  const filtrados = clientes
    .filter(c=>filtroDia==="todos"||c.dia===filtroDia)
    .filter(c=>c.nombre.toLowerCase().includes(busqueda.toLowerCase())||
               (c.barrio||"").toLowerCase().includes(busqueda.toLowerCase())||
               (c.telefono||"").includes(busqueda))
    .sort((a,b)=>{
    if(a.dia!==b.dia) return DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia);
    return (a.orden||9999)-(b.orden||9999);
  });

  return (
    <>
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Gestión de clientes</span>
        <button style={{...s.btn,padding:"6px 12px",fontSize:12,background:"#185FA5",color:"#e2eaf4",border:"none"}}
          onClick={()=>{setModoNuevo(true);setEditandoId(null);}}>
          + Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div style={{padding:"10px 14px 6px"}}>
        <input style={s.input} placeholder="Buscar por nombre, barrio o teléfono..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
          {["todos",...DIAS].map(d=>(
            <button key={d} style={{...s.btn,fontSize:11,padding:"3px 10px",
              background:filtroDia===d?"#185FA5":"var(--color-background-tertiary)",
              color:filtroDia===d?"#e2eaf4":"var(--color-text-secondary)",
              border:filtroDia===d?"none":"0.5px solid var(--color-border-secondary)"}}
              onClick={()=>setFiltroDia(d)}>
              {d==="todos"?"Todos":d}
            </button>
          ))}
          <button style={{...s.btn,fontSize:11,padding:"3px 10px",marginLeft:"auto"}}
          onClick={()=>{
            const porDia = {};
            DIAS.forEach(d=>{ porDia[d]=[...clientes].filter(c=>c.dia===d).sort((a,b)=>(a.orden||9999)-(b.orden||9999)); });
            const compactados = clientes.map(c=>{
              const lista = porDia[c.dia];
              const idx = lista.findIndex(x=>x.id===c.id);
              return idx>=0 ? {...c, orden:idx+1} : c;
            });
            if(window.confirm("¿Reordenar todos los clientes eliminando los huecos en la numeración?")) onReordenarTodo(compactados);
          }}>
          ↺ Reordenar
        </button>
        </div>
        <p style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:6}}>
          {filtrados.length} clientes{filtroDia!=="todos"?` · ${filtroDia}`:""}
        </p>
      </div>

      {/* Formulario nuevo cliente */}
      {modoNuevo && (
        <div style={{...s.card,margin:"6px 14px",borderLeft:"3px solid #185FA5"}}>
          <div style={{...s.row,justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Nuevo cliente</span>
            <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setModoNuevo(false)}>Cancelar</button>
          </div>
          <FormCliente
            inicial={{nombre:"",dia:"Martes",barrio:"",manzana:"",lote:"",sector:"",calle:"",nro:"",aclaracion:"",telefono:"",maps:"",notas:"",sifon:0,bidon10:0,bidon20:0,orden:""}}
            onGuardar={(datos)=>{onNuevo(datos);setModoNuevo(false);}}
            repartos={repartos}
          />
        </div>
      )}

      {/* Lista */}
      {filtrados.map(c=>(
        <div key={c.id} style={{...s.card,borderLeft:editandoId===c.id?"3px solid #5daaff":"0.5px solid var(--color-border-tertiary)"}}>
          {editandoId===c.id ? (
            <>
              <div style={{...s.row,justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Editando</span>
                <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setEditandoId(null)}>Cancelar</button>
              </div>
              <FormCliente
                inicial={c}
                onGuardar={(datos)=>{onEditar(c.id,datos);setEditandoId(null);}}
                repartos={repartos}
              />
              {/* Ajuste de envases EXTRA prestados (editable) */}
              {(()=>{
                const ex = extraEnvases[c.id]||{sifon:0,bidon10:0,bidon20:0};
                // total actual prestado = calculado desde ventas + ajuste manual
                // el usuario edita el TOTAL directamente; envAjuste = total - ex
                const aj = c.envAjuste||{sifon:0,bidon10:0,bidon20:0};
                const total = {sifon:ex.sifon+(aj.sifon||0),bidon10:ex.bidon10+(aj.bidon10||0),bidon20:ex.bidon20+(aj.bidon20||0)};
                const setTotal=(k,val)=>{
                  const n=Number(val)||0;
                  onEditar(c.id,{envAjuste:{...aj,[k]:n-(ex[k]||0)}});
                };
                return (
                  <div style={{...s.card,margin:"4px 0",background:"var(--color-background-tertiary)",padding:"10px 12px",borderLeft:"3px solid var(--color-border-warning)"}}>
                    <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-warning)",marginBottom:4}}>📦 Envases extra prestados al cliente</div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>Editá directamente la cantidad que tiene en su poder. Ponelo en 0 si ya los devolvió todos.</div>
                    <div style={{display:"flex",gap:8}}>
                      {[["sifon","Sifón"],["bidon10","10L"],["bidon20","20L"]].map(([k,l])=>(
                        <div key={k} style={{flex:1,textAlign:"center"}}>
                          <label style={{...s.label,textAlign:"center",fontSize:11}}>{l}</label>
                          <input
                            style={{...s.inputNum,textAlign:"center",fontSize:18,fontWeight:700,
                              color:total[k]>0?"var(--color-text-warning)":total[k]<0?"var(--color-text-success)":"var(--color-text-tertiary)"}}
                            type="number"
                            value={total[k]}
                            onChange={e=>setTotal(k,e.target.value)}
                          />
                          <div style={{fontSize:9,color:"var(--color-text-tertiary)",marginTop:3}}>{total[k]>0?"prestado":total[k]<0?"devuelto de más":"ok"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,cursor:onVerDetalle?"pointer":"default"}}
                onClick={()=>onVerDetalle&&onVerDetalle(c)}>
                {/* Número de orden */}
                <div style={{width:32,height:32,borderRadius:8,background:"var(--color-background-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"var(--color-text-tertiary)",flexShrink:0}}>
                  {c.orden||"#"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:14,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
                  <div style={{fontSize:16,color:"var(--color-text-secondary)",marginTop:2}}>
                    {c.dia} · {c.calle?`${c.calle} ${c.nro||""}`:c.manzana?`Mz ${c.manzana} L ${c.lote}`:""}{c.barrio?` · ${c.barrio}`:""}
                  </div>
                  {c.notas&&<div style={{fontSize:11,color:"var(--color-text-warning)",marginTop:2}}>📝 {c.notas}</div>}
                  {/* Badge repartidor asignado */}
                  {c.repartoId&&repartos&&(()=>{const rep=repartos.find(r=>r.id===c.repartoId||String(r.id)===String(c.repartoId));return rep?<div style={{fontSize:11,color:"var(--color-text-info)",marginTop:2}}>🚚 {rep.repartidorNombre}</div>:null;})()}
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                    {/* Saldo */}
                    {c.saldo<0&&<span style={s.badge("danger")}>Debe {fmt(Math.abs(c.saldo))}</span>}
                    {c.saldo>0&&<span style={s.badge("success")}>A favor {fmt(c.saldo)}</span>}
                    {/* Envases habituales */}
                    {c.sifon>0&&<span style={s.tag}>Sifón×{c.sifon}</span>}
                    {c.bidon10>0&&<span style={s.tag}>10L×{c.bidon10}</span>}
                    {c.bidon20>0&&<span style={s.tag}>20L×{c.bidon20}</span>}
                    {c.dispenser>0&&<span style={{...s.tag,color:"#5daaff"}}>Disp×{c.dispenser}</span>}
                    {/* Envases extra prestados */}
                    {(()=>{
                      const ex=extraEnvases[c.id]||{};
                      const aj=c.envAjuste||{};
                      const total={sifon:(ex.sifon||0)+(aj.sifon||0),bidon10:(ex.bidon10||0)+(aj.bidon10||0),bidon20:(ex.bidon20||0)+(aj.bidon20||0)};
                      return (<>
                        {total.sifon>0&&<span style={{...s.tag,color:"var(--color-text-warning)",fontWeight:500}}>+{total.sifon} sif extra</span>}
                        {total.bidon10>0&&<span style={{...s.tag,color:"var(--color-text-warning)",fontWeight:500}}>+{total.bidon10} 10L extra</span>}
                        {total.bidon20>0&&<span style={{...s.tag,color:"var(--color-text-warning)",fontWeight:500}}>+{total.bidon20} 20L extra</span>}
                      </>);
                    })()}
                    
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"center"}}>
                  {c.maps&&<a href={c.maps} target="_blank" rel="noreferrer" style={{fontSize:18,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>📍</a>}
                  {c.telefono&&<a href={`https://wa.me/54${c.telefono}`} target="_blank" rel="noreferrer" style={{fontSize:18,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>💬</a>}
                  <span style={{fontSize:18,cursor:"pointer",lineHeight:1}} onClick={e=>{e.stopPropagation();setFotoClienteId(fotoClienteId===c.id?null:c.id);}}>📷</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8}}>
                <button style={{...s.btnDanger,fontSize:11,padding:"4px 12px"}} onClick={e=>{e.stopPropagation();onEliminar(c.id);}}>Eliminar</button>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {onRegistrarVenta&&<button style={{...s.btn,fontSize:11,padding:"4px 12px",background:"#185FA5",color:"#e2eaf4",border:"none"}} onClick={e=>{e.stopPropagation();onRegistrarVenta(c);}}>📦 Venta</button>}
                  {repartos&&repartos.length>0&&<button style={{...s.btn,fontSize:11,padding:"4px 12px",background:"rgba(93,170,255,0.15)",color:"var(--color-text-info)",border:"1px solid rgba(93,170,255,0.4)",fontWeight:500}} onClick={e=>{e.stopPropagation();setReasignandoId(c.id);}}>↔ Reasignar</button>}
                  <button style={{...s.btn,fontSize:11,padding:"4px 12px"}} onClick={e=>{e.stopPropagation();setEditandoId(c.id);}}>Editar</button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {filtrados.length===0&&!modoNuevo&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)",fontSize:14}}>
          No hay clientes{filtroDia!=="todos"?` en ${filtroDia}`:""}.
        </div>
      )}
    </div>

    {/* Modal reasignar reparto */}
    {reasignandoId&&repartos&&(()=>{
      const cli=filtrados.find(x=>x.id===reasignandoId)||clientes.find(x=>x.id===reasignandoId);
      if(!cli) return null;
      const repActual=repartos.find(r=>r.id===cli.repartoId||String(r.id)===String(cli.repartoId));
      return (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setReasignandoId(null)}>
          <div style={{background:"var(--color-background-primary)",borderRadius:16,padding:20,width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:12}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>↔ Reasignar reparto</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>
              <b>{cli.nombre}</b><br/>
              {repActual?`Actualmente: ${repActual.repartidorNombre}`:"Sin reparto asignado"}
            </div>
            {/* Selector de día */}
            <div>
              <label style={{...s.label,fontWeight:500}}>Día de visita</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {DIAS.map(d=>(
                  <button key={d}
                    style={{padding:"6px 12px",borderRadius:8,fontSize:12,border:"1px solid var(--color-border-secondary)",cursor:"pointer",
                      background:cli.dia===d?"#185FA5":"var(--color-background-tertiary)",
                      color:cli.dia===d?"#e2eaf4":"var(--color-text-secondary)",fontWeight:cli.dia===d?600:400}}
                    onClick={()=>{ onEditar(cli.id,{dia:d}); setReasignandoId(null); }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/* Selector de repartidor */}
            <div>
              <label style={{...s.label,fontWeight:500}}>Repartidor</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button
                  style={{padding:"10px 14px",borderRadius:10,fontSize:13,border:"1px solid var(--color-border-secondary)",cursor:"pointer",textAlign:"left",
                    background:!cli.repartoId?"rgba(93,170,255,0.15)":"var(--color-background-tertiary)",
                    color:!cli.repartoId?"var(--color-text-info)":"var(--color-text-secondary)"}}
                  onClick={()=>{ onEditar(cli.id,{repartoId:null}); setReasignandoId(null); }}>
                  — Sin asignar
                </button>
                {repartos.map(r=>(
                  <button key={r.id}
                    style={{padding:"10px 14px",borderRadius:10,fontSize:13,border:"1px solid var(--color-border-secondary)",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:(cli.repartoId===r.id||String(cli.repartoId)===String(r.id))?"rgba(93,170,255,0.2)":"var(--color-background-tertiary)",
                      color:(cli.repartoId===r.id||String(cli.repartoId)===String(r.id))?"var(--color-text-info)":"var(--color-text-primary)"}}
                    onClick={()=>{ onEditar(cli.id,{repartoId:r.id}); setReasignandoId(null); }}>
                    <span><b>{r.numero}.</b> {r.repartidorNombre}</span>
                    {(cli.repartoId===r.id||String(cli.repartoId)===String(r.id))&&<span style={{fontSize:16}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <button style={{...s.btn,textAlign:"center"}} onClick={()=>setReasignandoId(null)}>Cancelar</button>
          </div>
        </div>
      );
    })()}
    {/* Modal foto domicilio */}
    {fotoClienteId&&(
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setFotoClienteId(null)}>
        {fotoCliente&&fotoCliente.foto
          ? <img src={fotoCliente.foto} alt="Domicilio" style={{maxWidth:"100%",maxHeight:"60vh",borderRadius:10,objectFit:"contain",marginBottom:16}} />
          : <div style={{color:"#aaa",fontSize:14,marginBottom:20}}>Sin foto aún · {fotoCliente&&fotoCliente.nombre}</div>
        }
        <div style={{display:"flex",gap:12}} onClick={e=>e.stopPropagation()}>
          <label style={{background:"#185FA5",color:"#e2eaf4",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
            📷 Cámara
            <input type="file" accept="image/*" capture="environment" style={{display:"none"}}
              onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onEditar(fotoClienteId,{foto:b64});setFotoClienteId(null);}} />
          </label>
          <label style={{background:"#2a3a4a",color:"#e2eaf4",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
            🖼 Galería
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={async e=>{const f=e.target.files[0];if(!f)return;const b64=await comprimirFoto(f);onEditar(fotoClienteId,{foto:b64});setFotoClienteId(null);}} />
          </label>
          {fotoCliente&&fotoCliente.foto&&<button style={{background:"#3a2020",color:"#e05c5c",padding:"12px 14px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:"none"}} onClick={()=>{onEditar(fotoClienteId,{foto:""});setFotoClienteId(null);}}>🗑</button>}
        </div>
        <span style={{color:"#aaa",fontSize:11,marginTop:14}}>Tocá fuera para cerrar</span>
      </div>
    )}
    </>
  );
}

function FormCliente({inicial,onGuardar,repartos}) {
  const [datos,setDatos] = useState({...inicial});
  const set = (k,v) => setDatos(d=>({...d,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* Repartidor */}
      {repartos&&repartos.length>0&&(
        <div>
          <label style={{...s.label,fontWeight:600,color:"var(--color-text-info)"}}>🚚 Repartidor asignado</label>
          <select style={{...s.select,border:"1.5px solid var(--color-text-info)"}}
            value={datos.repartoId||""}
            onChange={e=>set("repartoId",e.target.value?Number(e.target.value)||e.target.value:null)}>
            <option value="">— Sin asignar —</option>
            {repartos.map(r=>(
              <option key={r.id} value={r.id}>{r.numero}. {r.repartidorNombre}</option>
            ))}
          </select>
        </div>
      )}
      <div style={s.grid2}>
        <div>
          <label style={s.label}>Día de reparto</label>
          <select style={s.select} value={datos.dia||"Martes"} onChange={e=>set("dia",e.target.value)}>
            {DIAS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Número de orden</label>
          <input style={s.input} type="number" min={1} placeholder="ej: 5" value={datos.orden||""} onChange={e=>set("orden",Number(e.target.value)||"")} />
        </div>
      </div>
      <div>
        <label style={s.label}>Nombre y apellido *</label>
        <input style={s.input} placeholder="Nombre completo" value={datos.nombre||""} onChange={e=>set("nombre",e.target.value)} />
      </div>
      <div style={s.grid2}>
        <div><label style={s.label}>Barrio</label><input style={s.input} placeholder="Barrio" value={datos.barrio||""} onChange={e=>set("barrio",e.target.value)} /></div>
        <div><label style={s.label}>Sector</label><input style={s.input} placeholder="Sector" value={datos.sector||""} onChange={e=>set("sector",e.target.value)} /></div>
      </div>
      <div style={s.grid3}>
        <div><label style={s.label}>Manzana</label><input style={s.input} placeholder="Mz" value={datos.manzana||""} onChange={e=>set("manzana",e.target.value)} /></div>
        <div><label style={s.label}>Lote</label><input style={s.input} placeholder="Lote" value={datos.lote||""} onChange={e=>set("lote",e.target.value)} /></div>
        <div><label style={s.label}>Casa</label><input style={s.input} placeholder="Casa" value={datos.aclaracion||""} onChange={e=>set("aclaracion",e.target.value)} /></div>
      </div>
      <div style={s.grid2}>
        <div><label style={s.label}>Calle</label><input style={s.input} placeholder="Calle" value={datos.calle||""} onChange={e=>set("calle",e.target.value)} /></div>
        <div><label style={s.label}>Número</label><input style={s.input} placeholder="Nro" value={datos.nro||""} onChange={e=>set("nro",e.target.value)} /></div>
      </div>
      <div>
        <label style={s.label}>Teléfono (sin 0 ni 15)</label>
        <input style={s.input} placeholder="3816559000" value={datos.telefono||""} onChange={e=>set("telefono",e.target.value)} />
      </div>
      <div>
        <label style={s.label}>Link Google Maps</label>
        <input style={s.input} placeholder="https://maps.app.goo.gl/..." value={datos.maps||""} onChange={e=>set("maps",e.target.value)} />
      </div>
      <div>
        <label style={s.label}>Notas rápidas</label>
        <input style={s.input} placeholder="timbre roto, perro, cobrar deuda..." value={datos.notas||""} onChange={e=>set("notas",e.target.value)} />
      </div>
      <label style={{...s.label,marginTop:4}}>Envases habituales asignados</label>
      <div style={s.grid3}>
        {[["sifon","Sifón"],["bidon10","Bidón 10L"],["bidon20","Bidón 20L"]].map(([k,l])=>(
          <div key={k}>
            <label style={{...s.label,textAlign:"center"}}>{l}</label>
            <input style={{...s.input,textAlign:"center"}} type="number" min={0} value={datos[k]||0} onChange={e=>set(k,Number(e.target.value))} />
          </div>
        ))}
      </div>
      <div>
        <label style={s.label}>Dispenser en comodato</label>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button style={{...s.btn,padding:"5px 14px",fontSize:18,lineHeight:1}} onClick={()=>set("dispenser",Math.max(0,(datos.dispenser||0)-1))}>−</button>
          <span style={{fontSize:18,fontWeight:500,minWidth:28,textAlign:"center",color:"var(--color-text-primary)"}}>{datos.dispenser||0}</span>
          <button style={{...s.btn,padding:"5px 14px",fontSize:18,lineHeight:1}} onClick={()=>set("dispenser",(datos.dispenser||0)+1)}>+</button>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>unidades</span>
        </div>
      </div>
      {/* Saldo */}
      <div style={{...s.card,margin:"4px 0",background:"var(--color-background-tertiary)",padding:"10px 12px"}}>
        <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>Saldo del cliente</div>
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          {[["favor","A favor (tiene crédito)"],["deuda","Debe (saldo pendiente)"],["cero","Sin saldo"]].map(([v,l])=>(
            <button key={v} style={{flex:1,fontSize:11,padding:"6px 4px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",cursor:"pointer",
              background:datos._tipoSaldo===v?"#185FA5":"var(--color-background-secondary)",
              color:datos._tipoSaldo===v?"#e2eaf4":"var(--color-text-secondary)"}}
              onClick={()=>set("_tipoSaldo",v)}>
              {l.split(" ")[0]}
            </button>
          ))}
        </div>
        {datos._tipoSaldo&&datos._tipoSaldo!=="cero"&&(
          <div>
            <label style={s.label}>{datos._tipoSaldo==="favor"?"Monto a favor ($)":"Monto que debe ($)"}</label>
            <input style={s.input} type="number" min={0} placeholder="0"
              value={datos._montoSaldo||""}
              onChange={e=>set("_montoSaldo",e.target.value)} />
          </div>
        )}
        {datos.saldo!==0&&<div style={{fontSize:11,color:datos.saldo<0?"var(--color-text-danger)":"var(--color-text-success)",marginTop:4}}>
          Saldo actual: {fmt(datos.saldo)} · {datos.saldo<0?"Debe":"A favor"}
        </div>}
        <div style={{marginTop:6}}>
          <label style={s.label}>O ingresá el saldo directamente (−negativo = debe · +positivo = a favor)</label>
          <input style={s.input} type="number" placeholder="ej: -2500 o 1800"
            value={datos._saldoDirecto??""} onChange={e=>set("_saldoDirecto",e.target.value)} />
        </div>
      </div>
      <button style={{...s.btnPrimary,marginTop:4,opacity:!datos.nombre?0.45:1}} disabled={!datos.nombre}
        onClick={()=>{
          let saldo = datos.saldo||0;
          if(datos._tipoSaldo==="favor")  saldo =  Math.abs(Number(datos._montoSaldo)||0);
          if(datos._tipoSaldo==="deuda")  saldo = -Math.abs(Number(datos._montoSaldo)||0);
          if(datos._tipoSaldo==="cero")   saldo = 0;
          if(datos._saldoDirecto!==undefined&&datos._saldoDirecto!=="") saldo=Number(datos._saldoDirecto);
          onGuardar({...datos, saldo});
        }}>
        Guardar cliente
      </button>
    </div>
  );
}

function Resumen({ventas,clientes,productos,planillas,noVisitas,onVolver}) {
  const [filtro,setFiltro]   = React.useState("mes");   // mes | anio | todo | dia
  const [mesSel,setMesSel]   = React.useState(()=>new Date().toISOString().slice(0,7)); // YYYY-MM
  const [diaSel,setDiaSel]   = React.useState("todos");
  const chartRefs = {bar:React.useRef(null),donut:React.useRef(null),line:React.useRef(null)};
  const chartInst = React.useRef({});

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtradas = React.useMemo(()=>{
    let r = ventas;
    if(filtro==="mes")  r = r.filter(v=>(v.fechaKey||v.fecha||"").slice(0,7)===mesSel);
    if(filtro==="anio") r = r.filter(v=>(v.fechaKey||v.fecha||"").slice(0,4)===mesSel.slice(0,4));
    if(filtro==="dia")  r = diaSel==="todos" ? r : r.filter(v=>v.dia===diaSel);
    return r;
  },[ventas,filtro,mesSel,diaSel]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalNeto    = filtradas.reduce((a,v)=>a+(v.neto||0),0);
  const totalGan     = filtradas.reduce((a,v)=>a+(v.ganancia||0),0);
  const totalCosto   = filtradas.reduce((a,v)=>a+(v.costo||0),0);
  const cobEfectivo  = filtradas.filter(v=>v.pago==="contado").reduce((a,v)=>a+(v.neto||0),0);
  const cobTrans     = filtradas.filter(v=>v.pago==="transferencia").reduce((a,v)=>a+(v.neto||0),0);
  const cobFiado     = filtradas.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
  const cobSaldos    = filtradas.reduce((a,v)=>{const e=(v.pagadoNum||0)-(v.neto||0);return a+(e>0?e:0);},0);
  const porPago      = {contado:cobEfectivo, transferencia:cobTrans, fiado:cobFiado};
  const cantidades   = {};
  productos.forEach(p=>{cantidades[p.nombre]=0;});
  filtradas.forEach(v=>v.detalle.forEach(d=>{cantidades[d.nombre]=(cantidades[d.nombre]||0)+d.cantidad;}));
  const conDeuda     = clientes.filter(c=>c.saldo<0);
  const conFavor     = clientes.filter(c=>c.saldo>0);

  // ── Agrupación por mes (para vista anual e histórico) ─────────────────────
  const porMes = {};
  ventas.forEach(v=>{
    const fk = (v.fechaKey||v.fecha||"").slice(0,7);
    if(!fk) return;
    const anio = fk.slice(0,4);
    if(filtro==="anio" && anio!==mesSel.slice(0,4)) return;
    if(!porMes[fk]) porMes[fk]={mes:fk,total:0,efectivo:0,trans:0,fiado:0,ganancia:0,ventas:0};
    porMes[fk].total    += v.neto||0;
    porMes[fk].efectivo += v.pago==="contado"?v.neto||0:0;
    porMes[fk].trans    += v.pago==="transferencia"?v.neto||0:0;
    porMes[fk].fiado    += v.pago==="fiado"?v.neto||0:0;
    porMes[fk].ganancia += v.ganancia||0;
    porMes[fk].ventas   += 1;
  });
  const mesesOrdenados = Object.values(porMes).sort((a,b)=>a.mes.localeCompare(b.mes));
  const ultimosMeses   = mesesOrdenados.slice(-12);

  // ── Chart.js ──────────────────────────────────────────────────────────────
  const CC = {blue:"#5daaff",green:"#4dd9a0",amber:"#f5b942",red:"#f07070",gray:"#4a6a85",grid:"rgba(255,255,255,0.07)",text:"#7a9ab8"};

  React.useEffect(()=>{
    if(typeof Chart==="undefined") return;
    Object.values(chartInst.current).forEach(c=>c?.destroy());
    chartInst.current={};

    // Bar — ventas por mes
    if(chartRefs.bar.current && ultimosMeses.length>0){
      chartInst.current.bar = new Chart(chartRefs.bar.current,{
        type:"bar",
        data:{
          labels: ultimosMeses.map(m=>{const [y,mo]=m.mes.split("-");return `${mo}/${y.slice(2)}`;}),
          datasets:[
            {label:"Efectivo", data:ultimosMeses.map(m=>m.efectivo), backgroundColor:"#185FA5", borderRadius:4, borderSkipped:false},
            {label:"Transfer.", data:ultimosMeses.map(m=>m.trans),   backgroundColor:"#5daaff", borderRadius:4, borderSkipped:false},
            {label:"Fiado",    data:ultimosMeses.map(m=>m.fiado),    backgroundColor:"#f5b942", borderRadius:4, borderSkipped:false},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:CC.text,padding:8,font:{size:10}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${Math.round(c.raw).toLocaleString("es-AR")}`}}},scales:{x:{stacked:true,grid:{color:CC.grid},ticks:{color:CC.text,font:{size:10}}},y:{stacked:true,grid:{color:CC.grid},ticks:{color:CC.text,callback:v=>`$${(v/1000).toFixed(0)}k`}}}}
      });
    }

    // Donut — forma de pago
    if(chartRefs.donut.current && totalNeto>0){
      const labels=["Efectivo","Transferencia","Fiado"];
      const vals=[cobEfectivo,cobTrans,cobFiado];
      chartInst.current.donut = new Chart(chartRefs.donut.current,{
        type:"doughnut",
        data:{labels,datasets:[{data:vals,backgroundColor:[CC.blue,"#3a7fd4",CC.amber],borderWidth:0,hoverOffset:6}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{color:CC.text,padding:10,font:{size:10}}},tooltip:{callbacks:{label:c=>`${c.label}: $${Math.round(c.raw).toLocaleString("es-AR")}`}}}}
      });
    }

    // Line — evolución ganancia por mes
    if(chartRefs.line.current && ultimosMeses.length>1){
      chartInst.current.line = new Chart(chartRefs.line.current,{
        type:"line",
        data:{
          labels:ultimosMeses.map(m=>{const [y,mo]=m.mes.split("-");return `${mo}/${y.slice(2)}`;}),
          datasets:[{label:"Ganancia",data:ultimosMeses.map(m=>m.ganancia),borderColor:CC.green,backgroundColor:"rgba(77,217,160,0.08)",pointBackgroundColor:CC.green,pointRadius:4,borderWidth:2,tension:0.3,fill:true}]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`$${Math.round(c.raw).toLocaleString("es-AR")}`}}},scales:{x:{grid:{color:CC.grid},ticks:{color:CC.text,font:{size:10}}},y:{grid:{color:CC.grid},ticks:{color:CC.text,callback:v=>`$${(v/1000).toFixed(0)}k`}}}}
      });
    }
    return ()=>{Object.values(chartInst.current).forEach(c=>c?.destroy());};
  },[filtro,mesSel,diaSel,ventas]);

  // ── Render ────────────────────────────────────────────────────────────────
  const tituloFiltro = filtro==="mes"?`${mesSel.slice(5)}/${mesSel.slice(0,4)}`:filtro==="anio"?mesSel.slice(0,4):"Histórico completo";

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Resumen</span>
        <button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>{
          const total=filtradas.reduce((a,v)=>a+(v.neto||0),0);
          const texto=`*Resumen Sistema de Reparto 2026 · Multi · ${tituloFiltro}*\n\n💰 Efectivo: ${fmt(cobEfectivo)}\n📲 Transfer: ${fmt(cobTrans)}\n📝 Fiado: ${fmt(cobFiado)}\n📦 Total: ${fmt(total)}\n✅ Ganancia: ${fmt(totalGan)}\n\nEntregas: ${filtradas.length} clientes`;
          window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`,"_blank");
        }}>💬 WA</button>
      </div>

      {/* Selector de período */}
      <div style={{padding:"10px 14px 6px"}}>
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {[["mes","Este mes"],["anio","Este año"],["todo","Histórico"],["dia","Por día"]].map(([v,l])=>(
            <button key={v} style={{...s.btn,fontSize:12,padding:"5px 12px",background:filtro===v?"#185FA5":"var(--color-background-tertiary)",color:filtro===v?"#e2eaf4":"var(--color-text-secondary)",border:filtro===v?"none":"0.5px solid var(--color-border-secondary)"}}
              onClick={()=>setFiltro(v)}>{l}</button>
          ))}
        </div>
        {(filtro==="mes"||filtro==="anio")&&(
          <input type="month" style={{...s.input,marginBottom:6}} value={mesSel}
            onChange={e=>setMesSel(e.target.value)} />
        )}
        {filtro==="dia"&&(
          <select style={{...s.select,marginBottom:6}} value={diaSel} onChange={e=>setDiaSel(e.target.value)}>
            <option value="todos">Todos los días</option>
            {DIAS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Métricas principales */}
      <div style={{...s.grid2,padding:"0 14px",gap:8,marginBottom:8}}>
        <div style={s.metricCard}><div style={s.metricLabel}>Total vendido</div><div style={{...s.metricVal,color:"#5daaff"}}>{fmt(totalNeto)}</div><div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{filtradas.length} entregas</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>Ganancia neta</div><div style={{...s.metricVal,color:"#4dd9a0"}}>{fmt(totalGan)}</div><div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>−{fmt(totalCosto)} llenado</div></div>
      </div>

      {/* Desglose cobranza */}
      <div style={{...s.grid3,padding:"0 14px",gap:6,marginBottom:10}}>
        <div style={s.metricCard}><div style={s.metricLabel}>Efectivo</div><div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(cobEfectivo)}</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>Transfer.</div><div style={{fontSize:15,fontWeight:500,color:"#5daaff"}}>{fmt(cobTrans)}</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>Fiado</div><div style={{fontSize:15,fontWeight:500,color:"#f5b942"}}>{fmt(cobFiado)}</div></div>
      </div>

      {/* Gráfico barras apiladas por mes */}
      {(filtro==="todo"||filtro==="anio")&&ultimosMeses.length>0&&(
        <>
          <span style={s.sectionTitle}>Ventas por mes (efectivo / transfer. / fiado)</span>
          <div style={{...s.card,margin:"0 14px 8px",padding:"12px 10px"}}>
            <div style={{height:180}}><canvas ref={chartRefs.bar} /></div>
          </div>
        </>
      )}

      {/* Gráfico donut forma de pago */}
      {totalNeto>0&&(
        <>
          <span style={s.sectionTitle}>Distribución por forma de pago</span>
          <div style={{...s.card,margin:"0 14px 8px",padding:"12px 10px"}}>
            <div style={{height:180}}><canvas ref={chartRefs.donut} /></div>
          </div>
        </>
      )}

      {/* Gráfico línea evolución ganancia */}
      {ultimosMeses.length>1&&(
        <>
          <span style={s.sectionTitle}>Evolución de ganancia por mes</span>
          <div style={{...s.card,margin:"0 14px 8px",padding:"12px 10px"}}>
            <div style={{height:150}}><canvas ref={chartRefs.line} /></div>
          </div>
        </>
      )}

      {/* Tabla mensual */}
      {(filtro==="todo"||filtro==="anio")&&mesesOrdenados.length>0&&(
        <>
          <span style={s.sectionTitle}>Detalle por mes</span>
          <div style={{...s.card,margin:"0 14px 8px",overflow:"hidden",padding:0}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"6px 10px",background:"var(--color-background-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              {["Mes","Total","Efectivo+Trans","Ganancia"].map(h=><div key={h} style={{fontSize:10,color:"var(--color-text-secondary)",fontWeight:500,textAlign:h==="Mes"?"left":"right"}}>{h}</div>)}
            </div>
            {[...mesesOrdenados].reverse().map(m=>(
              <div key={m.mes} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"7px 10px",borderBottom:"0.5px solid var(--color-border-tertiary)",alignItems:"center"}}>
                <div style={{fontSize:12,color:"var(--color-text-primary)",fontWeight:500}}>{m.mes.slice(5)}/{m.mes.slice(0,4)}</div>
                <div style={{textAlign:"right",fontSize:12,color:"var(--color-text-primary)"}}>{fmt(m.total)}</div>
                <div style={{textAlign:"right",fontSize:12,color:"#5daaff"}}>{fmt(m.efectivo+m.trans)}</div>
                <div style={{textAlign:"right",fontSize:12,color:"#4dd9a0"}}>{fmt(m.ganancia)}</div>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"8px 10px",background:"var(--color-background-tertiary)"}}>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500}}>Total</div>
              <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(mesesOrdenados.reduce((a,m)=>a+m.total,0))}</div>
              <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"#5daaff"}}>{fmt(mesesOrdenados.reduce((a,m)=>a+m.efectivo+m.trans,0))}</div>
              <div style={{textAlign:"right",fontSize:12,fontWeight:500,color:"#4dd9a0"}}>{fmt(mesesOrdenados.reduce((a,m)=>a+m.ganancia,0))}</div>
            </div>
          </div>
        </>
      )}

      {/* Unidades por producto */}
      <span style={s.sectionTitle}>Unidades entregadas · {tituloFiltro}</span>
      <div style={{display:"flex",gap:6,padding:"0 14px",marginBottom:10,flexWrap:"wrap"}}>
        {productos.map(p=>(
          <div key={p.id} style={{...s.metricCard,flex:1,minWidth:70,textAlign:"center"}}>
            <div style={s.metricLabel}>{p.nombre.replace(" 1.5L","").replace("Bidón ","")}</div>
            <div style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)"}}>{cantidades[p.nombre]||0}</div>
          </div>
        ))}
      </div>

      {/* Saldos */}
      {conDeuda.length>0&&(
        <>
          <span style={s.sectionTitle}>Clientes con deuda · {fmt(conDeuda.reduce((a,c)=>a+Math.abs(c.saldo),0))}</span>
          <div style={{...s.card,margin:"0 14px 8px"}}>
            {conDeuda.map(c=>(
              <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{c.nombre}</span>
                <span style={s.badge("danger")}>Debe {fmt(Math.abs(c.saldo))}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {conFavor.length>0&&(
        <>
          <span style={s.sectionTitle}>Saldos a favor</span>
          <div style={{...s.card,margin:"0 14px 8px"}}>
            {conFavor.map(c=>(
              <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{c.nombre}</span>
                <span style={s.badge("success")}>{fmt(c.saldo)} a favor</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function exportarExcel(clientes,ventas,productos,planillas){
  const wb=XLSX.utils.book_new();
  const wsC=XLSX.utils.json_to_sheet(clientes.map(c=>({ID:c.id,Nombre:c.nombre,"Día":c.dia,Barrio:c.barrio,Manzana:c.manzana,Lote:c.lote,"Teléfono":c.telefono,Maps:c.maps,"Sifón":c.sifon,"Bidón 10L":c.bidon10,"Bidón 20L":c.bidon20,Saldo:c.saldo})));
  XLSX.utils.book_append_sheet(wb,wsC,"Clientes");
  const fv=[];
  ventas.forEach(v=>v.detalle.forEach(d=>fv.push({ID:v.id,Fecha:v.fecha,"Día":v.dia,Cliente:v.cliente,Producto:d.nombre,Cantidad:d.cantidad,"Precio Unit":d.precio,"Total Prod":d.total,"Forma Pago":v.pago,Bruto:v.bruto,Descuento:v.desc,Neto:v.neto,Costo:v.costo,Ganancia:v.ganancia,Pagado:v.pagadoNum,"Saldo Aplic":v.saldoAplicado||0,Obs:v.obs||""})));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fv.length?fv:[{}]),"Ventas");
  const fp=[];
  Object.entries(planillas).forEach(([dia,p])=>fp.push({"Día":dia,Fecha:p.fecha||"",Peso:p.peso||"",Bultos:p.bultos||"","10L Llenos":p.productos?.b10?.llenos||0,"10L Vacíos":p.productos?.b10?.vacios||0,"10L Plata":p.productos?.b10?.plata||0,"10L Llenar":p.productos?.b10?.llenar||0,"20L Llenos":p.productos?.b20?.llenos||0,"20L Vacíos":p.productos?.b20?.vacios||0,"20L Plata":p.productos?.b20?.plata||0,"20L Llenar":p.productos?.b20?.llenar||0,"Soda Llenos":p.productos?.soda?.llenos||0,"Soda Vacíos":p.productos?.soda?.vacios||0,"Soda Plata":p.productos?.soda?.plata||0,"Soda Llenar":p.productos?.soda?.llenar||0,Efectivo:p.efectivo||0,Fiado:p.fiado||0,Retenciones:p.retenciones||0,Gastos:(p.gastos||[]).map(g=>`${g.cat}: $${g.monto}`).join(" | "),"Total Gastos":(p.gastos||[]).reduce((a,g)=>a+(Number(g.monto)||0),0),Obs:p.obs||""}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fp.length?fp:[{}]),"Planillas");
  const fs=clientes.filter(c=>c.saldo!==0).map(c=>({Nombre:c.nombre,"Día":c.dia,Saldo:c.saldo,Estado:c.saldo<0?"Debe":"A favor"}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fs.length?fs:[{}]),"Saldos");
  const fecha=new Date().toLocaleDateString("es-AR").replace(/\//g,"-");
  XLSX.writeFile(wb,`backup_reparto-app_${fecha}.xlsx`);
}

function importarClientesPlanilla(file, clientesActuales, onImportado) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, {type:"array"});

      // Buscar hoja "Clientes" o la primera hoja
      const hoja = wb.Sheets["Clientes"] || wb.Sheets[wb.SheetNames[0]];
      if(!hoja) { alert("No se encontró ninguna hoja en el archivo."); return; }

      // Leer en modo raw para detectar la fila de encabezados
      const rawRows = XLSX.utils.sheet_to_json(hoja, {header:1, defval:""});
      if(!rawRows.length) { alert("El archivo está vacío."); return; }

      // Buscar la fila que contiene "nombre" (puede ser fila 1, 2 o 3)
      let headerIdx = -1;
      for(let i=0; i<Math.min(rawRows.length,10); i++){
        if(rawRows[i].some(c=>String(c).toLowerCase().trim().includes("nombre"))){
          headerIdx = i; break;
        }
      }
      if(headerIdx === -1){ alert("No se encontró la fila de encabezados. El archivo debe tener una columna 'Nombre'."); return; }

      // Construir mapa de columnas (flexible con mayúsculas, acentos y nombres alternativos)
      const headers = rawRows[headerIdx].map(h=>String(h).toLowerCase().trim().normalize("NFD").replace(/\p{Mn}/gu,""));
      const col = (...keys) => {
        for(const k of keys){
          const kn = k.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu,"");
          const idx = headers.findIndex(h=>h.includes(kn)||kn.includes(h));
          if(idx !== -1) return idx;
        }
        return -1;
      };
      const C = {
        nombre:    col("nombre","apellido"),
        dia:       col("dia","día","day","jornada","reparto"),
        orden:     col("orden","n° orden","order","n orden"),
        barrio:    col("barrio","zona","neighborhood"),
        calle:     col("calle","street","direccion","dirección"),
        nro:       col("numero","número","n°","nro","number"),
        manzana:   col("manzana","mz"),
        lote:      col("lote","lt"),
        sector:    col("sector"),
        aclaracion:col("aclaracion","aclaración","casa","piso","depto"),
        telefono:  col("telefono","teléfono","tel","phone","celular","sin 0"),
        maps:      col("maps","google maps","ubicacion","link"),
        sifon:     col("sifon","sifón","sifones","sifones 1.5"),
        bidon10:   col("10l","bidon 10","bidón 10","bidones 10","b10"),
        bidon20:   col("20l","bidon 20","bidón 20","bidones 20","b20"),
        dispenser: col("dispenser","dispensador"),
        saldo:     col("saldo"),
        notas:     col("notas","nota","rapidas","rápidas","comentario"),
      };

      const DIAS_VALIDOS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
      const errores = [];
      const nuevos  = [];
      const SKIP    = ["▼","instrucciones","sistema de reparto","completá","clientes"];

      const dataRows = rawRows.slice(headerIdx + 1);
      dataRows.forEach((r, i) => {
        const fila  = headerIdx + i + 2; // nro de fila real en el Excel
        const get   = (idx) => idx !== -1 ? String(r[idx]||"").trim() : "";
        const getN  = (idx) => idx !== -1 ? Number(r[idx])||0 : 0;

        const nombre = get(C.nombre);
        if(!nombre || SKIP.some(p=>nombre.toLowerCase().includes(p))) return;

        const diaRaw = get(C.dia);
        const dia = DIAS_VALIDOS.find(d=>d.toLowerCase()===diaRaw.toLowerCase()) ||
                    DIAS_VALIDOS.find(d=>diaRaw.toLowerCase().includes(d.toLowerCase().slice(0,4)));

        if(!dia){ errores.push(`Fila ${fila} (${nombre}): día inválido "${diaRaw}"`); return; }

        nuevos.push({
          id:         Date.now() + i,
          nombre, dia,
          orden:      getN(C.orden),
          barrio:     get(C.barrio),
          calle:      get(C.calle),
          nro:        get(C.nro),
          manzana:    get(C.manzana),
          lote:       get(C.lote),
          sector:     get(C.sector),
          aclaracion: get(C.aclaracion),
          telefono:   get(C.telefono),
          maps:       get(C.maps),
          sifon:      getN(C.sifon),
          bidon10:    getN(C.bidon10),
          bidon20:    getN(C.bidon20),
          dispenser:  getN(C.dispenser),
          saldo:      getN(C.saldo),
          notas:      get(C.notas),
        });
      });

      if(errores.length > 0){
        const errMsg = `⚠️ ${errores.length} fila${errores.length!==1?"s":""} con error:\n\n`+
          errores.slice(0,5).join("\n")+(errores.length>5?`\n... y ${errores.length-5} más`:"");
        alert(errMsg);
      }

      if(nuevos.length === 0){ alert("No se encontraron clientes válidos. Verificá que el archivo tenga datos debajo de la fila de encabezados."); return; }

      // Vista previa + confirmación
      const dias = [...new Set(nuevos.map(c=>c.dia))].join(", ");
      const resumen = `📋 Vista previa del import:\n\n` +
        `✅ ${nuevos.length} clientes encontrados\n` +
        `📅 Días: ${dias}\n\n` +
        (clientesActuales.length > 0
          ? `Los ${nuevos.length} clientes se van a AGREGAR a los ${clientesActuales.length} existentes.\n\n`
          : "") +
        `¿Confirmar la importación?`;

      if(!window.confirm(resumen)) return;

      const DIAS_ORD = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
      const todos = [...clientesActuales,...nuevos].sort((a,b)=>
        DIAS_ORD.indexOf(a.dia)-DIAS_ORD.indexOf(b.dia)||(a.orden||9999)-(b.orden||9999));

      onImportado(todos);
      alert(`✅ ${nuevos.length} clientes importados correctamente.`);
    } catch(err){ alert("Error al leer el archivo: "+err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function importarBackup(file,setClientes,setVentas,setPlanillas){
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const wb=XLSX.read(e.target.result,{type:"array"});
      const csData=XLSX.utils.sheet_to_json(wb.Sheets["Clientes"]||{});
      if(csData.length) setClientes(csData.map(r=>({id:r.ID,nombre:r.Nombre||"",dia:r["Día"]||"Lunes",barrio:r.Barrio||"",manzana:r.Manzana||"",lote:r.Lote||"",telefono:String(r["Teléfono"]||""),maps:r.Maps||"",sifon:Number(r["Sifón"]||0),bidon10:Number(r["Bidón 10L"]||0),bidon20:Number(r["Bidón 20L"]||0),saldo:Number(r.Saldo||0)})));
      const vsData=XLSX.utils.sheet_to_json(wb.Sheets["Ventas"]||{});
      if(vsData.length){const vm={};vsData.forEach(r=>{if(!r.ID)return;if(!vm[r.ID])vm[r.ID]={id:r.ID,fecha:r.Fecha||"",dia:r["Día"]||"",cliente:r.Cliente||"",clienteId:null,pago:r["Forma Pago"]||"contado",bruto:Number(r.Bruto||0),desc:Number(r.Descuento||0),neto:Number(r.Neto||0),costo:Number(r.Costo||0),ganancia:Number(r.Ganancia||0),pagadoNum:Number(r.Pagado||0),saldoDelta:0,saldoAplicado:Number(r["Saldo Aplic"]||0),obs:r.Obs||"",detalle:[],envPrest:[],envDev:[]};vm[r.ID].detalle.push({nombre:r.Producto||"",cantidad:Number(r.Cantidad||0),precio:Number(r["Precio Unit"]||0),total:Number(r["Total Prod"]||0)});});setVentas(Object.values(vm));}
      const psData=XLSX.utils.sheet_to_json(wb.Sheets["Planillas"]||{});
      if(psData.length){const pm={};psData.forEach(r=>{if(!r["Día"])return;pm[r["Día"]]={fecha:r.Fecha||"",peso:r.Peso||"",bultos:r.Bultos||"",efectivo:r.Efectivo||"",fiado:r.Fiado||"",retenciones:r.Retenciones||"",obs:r.Obs||"",gastos:[],productos:{b10:{llenos:r["10L Llenos"]||"",vacios:r["10L Vacíos"]||"",plata:r["10L Plata"]||"",llenar:r["10L Llenar"]||""},b20:{llenos:r["20L Llenos"]||"",vacios:r["20L Vacíos"]||"",plata:r["20L Plata"]||"",llenar:r["20L Llenar"]||""},soda:{llenos:r["Soda Llenos"]||"",vacios:r["Soda Vacíos"]||"",plata:r["Soda Plata"]||"",llenar:r["Soda Llenar"]||""}}};});setPlanillas(pm);}
      alert("✅ Backup importado correctamente");
    }catch(err){alert("Error al importar: "+err.message);}
  };
  reader.readAsArrayBuffer(file);
}

function CalculadoraCostoReal({productos,ventas}) {
  const [gastoTraslado, setGastoTraslado] = React.useState("");
  const [envsXDia, setEnvsXDia] = React.useState("");
  const gastoNum = Number(gastoTraslado)||0;
  const envsNum  = Number(envsXDia)||0;
  const costoXEnvase = envsNum>0 && gastoNum>0 ? Math.round(gastoNum/envsNum) : 0;
  return (
    <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-tertiary)",borderLeft:"3px solid #5daaff"}}>
      <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:8}}>🧮 Calculadora de costo real puesto en cliente</div>
      <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:10,lineHeight:1.5}}>Calculá la ganancia real por artículo sumando el gasto de traslado.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div>
          <label style={s.label}>Gasto de traslado por día $</label>
          <input style={s.inputNum} type="number" placeholder="Ej: 5000" value={gastoTraslado} onChange={e=>setGastoTraslado(e.target.value)} />
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>GNC, nafta, propina, etc.</div>
        </div>
        <div>
          <label style={s.label}>Envases entregados ese día</label>
          <input style={s.inputNum} type="number" placeholder="Ej: 80" value={envsXDia} onChange={e=>setEnvsXDia(e.target.value)} />
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>Promedio de entregas por día</div>
        </div>
      </div>
      {costoXEnvase>0&&(
        <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:10}}>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8}}>Traslado por unidad: <b style={{color:"var(--color-text-info)"}}>{fmt(costoXEnvase)}</b></div>
          {productos.map(p=>{
            const costoReal   = (p.costo||0) + costoXEnvase;
            const gananciaReal= (p.precio||0) - costoReal;
            const margenReal  = p.precio>0?Math.round((gananciaReal/p.precio)*100):0;
            return (
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{p.nombre}</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Costo real: {fmt(costoReal)}</div>
                  <div style={{fontSize:13,fontWeight:600,color:gananciaReal>0?"var(--color-text-success)":"var(--color-text-danger)"}}>
                    {fmt(gananciaReal)} ({margenReal}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── OnboardingRoles ──────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════
// ◆  GPS / Mapa de Clientes
// ════════════════════════════════════════════════════════════════════

function extraerCoordsDeURL(url) {
  if(!url) return null;
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  m = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  m = url.match(/\/dir\/[^/]*\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  m = url.match(/\/(-2[0-9]\.\d{4,}),(-6[0-9]\.\d{4,})/);
  if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  return null;
}
function esLinkCorto(url) {
  return url && (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps"));
}

function CargaGPSMasiva({clientes, onActualizar, onVolver}) {
  const sinGPS = React.useMemo(()=>(clientes||[]).filter(c=>!c.lat||!c.lng),[]);
  const [idx, setIdx] = React.useState(0);
  const [latVal, setLatVal] = React.useState("");
  const [lngVal, setLngVal] = React.useState("");
  const [guardados, setGuardados] = React.useState(0);
  const [listo, setListo] = React.useState(false);
  const actualizados = React.useRef([...clientes]);
  const cliente = sinGPS[idx] || null;
  const coordsDelLink = cliente?.maps ? extraerCoordsDeURL(cliente.maps) : null;
  React.useEffect(()=>{
    if(!cliente) return;
    if(coordsDelLink){ setLatVal(String(coordsDelLink.lat)); setLngVal(String(coordsDelLink.lng)); }
    else { setLatVal(""); setLngVal(""); }
  },[idx]);
  const guardarYSiguiente = (omitir=false) => {
    if(!omitir && cliente) {
      const lat=parseFloat(latVal), lng=parseFloat(lngVal);
      if(!isNaN(lat)&&!isNaN(lng)) {
        const i=actualizados.current.findIndex(c=>c.id===cliente.id);
        if(i>=0) actualizados.current[i]={...actualizados.current[i],lat,lng};
        const ng=guardados+1; setGuardados(ng);
        if(ng%5===0||idx+1>=sinGPS.length) onActualizar([...actualizados.current]);
      }
    }
    setLatVal(""); setLngVal("");
    if(idx+1>=sinGPS.length) setListo(true);
    else setIdx(i=>i+1);
  };
  if(sinGPS.length===0||listo||!cliente) return (
    <div style={{...s.screen,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32}}>
      <div style={{fontSize:48}}>✅</div>
      <div style={{fontSize:17,fontWeight:600,color:"var(--color-text-primary)",textAlign:"center"}}>¡GPS cargado!</div>
      <div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center"}}>{guardados} cliente{guardados!==1?"s":""} con GPS guardado.</div>
      <button style={s.btnPrimary} onClick={onVolver}>Ver mapa →</button>
    </div>
  );
  const progreso=Math.round((idx/sinGPS.length)*100);
  const dir=cliente.calle?`${cliente.calle} ${cliente.nro||""}`.trim():cliente.manzana?`Mz ${cliente.manzana} L ${cliente.lote||""} · ${cliente.barrio||""}`:cliente.barrio||"";
  const latOk=latVal&&lngVal&&!isNaN(parseFloat(latVal))&&!isNaN(parseFloat(lngVal));
  return (
    <div style={{...s.screen,display:"flex",flexDirection:"column"}}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Cargar GPS · {idx+1}/{sinGPS.length}</span>
      </div>
      <div style={{height:4,background:"var(--color-background-tertiary)"}}>
        <div style={{height:"100%",background:"#185FA5",width:`${progreso}%`,transition:"width 0.3s"}}/>
      </div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...s.card,margin:0}}>
          <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",marginBottom:2}}>{cliente.nombre}</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{cliente.dia} · {dir}</div>
          {cliente.maps&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2,wordBreak:"break-all"}}>{cliente.maps}</div>}
        </div>
        {coordsDelLink&&<div style={{background:"var(--color-background-success)",borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:13,color:"var(--color-text-success)",fontWeight:600}}>✓ Coordenadas extraídas del link</div>
          <div style={{fontSize:12,color:"var(--color-text-success)"}}>{coordsDelLink.lat.toFixed(5)}, {coordsDelLink.lng.toFixed(5)}</div>
        </div>}
        <div style={{background:"var(--color-background-info)",borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:12,color:"var(--color-text-info)",fontWeight:600,marginBottom:4}}>📋 Cómo obtener las coordenadas:</div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.8}}>
            1. Tocá <b>"Abrir en Maps"</b> abajo<br/>2. <b>Mantené presionado</b> el punto del cliente<br/>3. Aparecen los números: <b>-26.865, -65.217</b><br/>4. Tocá esos números → <b>Copiar</b><br/>5. Volvé acá y pegá abajo
          </div>
        </div>
        {cliente.maps&&<button style={{...s.btnPrimary,background:"#1a7a3a",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>window.open(cliente.maps,"_blank")}>🗺 Abrir en Google Maps</button>}
        <div style={{...s.card,margin:0}}>
          <label style={{...s.label,fontSize:12,fontWeight:600}}>Pegá las coordenadas (ej: -26.86590, -65.21780)</label>
          <input style={{...s.input,marginTop:4}} placeholder="-26.86590, -65.21780"
            value={latVal&&lngVal?`${latVal}, ${lngVal}`:latVal}
            onChange={e=>{const raw=e.target.value;const m=raw.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);if(m){setLatVal(m[1]);setLngVal(m[2]);}else setLatVal(raw);}}
          />
          {latOk?<div style={{fontSize:11,color:"#4dd9a0",marginTop:4}}>✓ {latVal}, {lngVal}</div>
            :<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:4}}>Pegá los dos números separados por coma</div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...s.btn,flex:1,padding:"12px",fontSize:13}} onClick={()=>guardarYSiguiente(true)}>Omitir →</button>
          <button style={{...s.btnPrimary,flex:2,opacity:latOk||coordsDelLink?1:0.4}} disabled={!latOk&&!coordsDelLink} onClick={()=>guardarYSiguiente(false)}>Guardar y siguiente →</button>
        </div>
        <div style={{fontSize:11,color:"var(--color-text-tertiary)",textAlign:"center"}}>{guardados} guardados · {sinGPS.length-idx-1} restantes · Se sincroniza cada 5</div>
      </div>
    </div>
  );
}

function calcularRutaOptima(clientes) {
  if(clientes.length<=1) return clientes;
  const dist=(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng);
  const restantes=[...clientes];
  const ruta=[restantes.shift()];
  while(restantes.length>0){const ul=ruta[ruta.length-1];let md=Infinity,mi=0;restantes.forEach((c,i)=>{const d=dist(ul,c);if(d<md){md=d;mi=i;}});ruta.push(restantes.splice(mi,1)[0]);}
  return ruta;
}

function PreviaRuta({rutaOptima, ventasHoy, noVisHoy, onAplicar, onVolver}) {
  return (
    <div style={{...s.screen,display:"flex",flexDirection:"column"}}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Ruta óptima sugerida</span>
      </div>
      <div style={{padding:"10px 14px",background:"var(--color-background-info)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{fontSize:13,color:"var(--color-text-info)",lineHeight:1.6}}>Orden que minimiza la distancia total. Podés aplicarlo o volver sin cambios.</div>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {rutaOptima.map((c,i)=>{
          const entregado=ventasHoy.some(v=>v.clienteId===c.id);
          const noVis=noVisHoy.some(v=>v.clienteId===c.id);
          const dir=c.calle?c.calle+" "+(c.nro||""):c.manzana?"Mz "+c.manzana+" L "+(c.lote||""):c.barrio||"";
          return (
            <div key={c.id} style={{...s.card,margin:"6px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#185FA5",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{c.dia} · {dir}</div>
              </div>
              {entregado&&<span style={s.badge("success")}>✓</span>}
              {noVis&&<span style={s.badge("danger")}>✗</span>}
              {c.orden&&c.orden!==i+1&&<span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>antes:{c.orden}</span>}
            </div>
          );
        })}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"12px 16px",background:"var(--color-background-secondary)",borderTop:"0.5px solid var(--color-border-tertiary)",display:"flex",gap:8,zIndex:20}}>
        <button style={{...s.btn,flex:1,padding:"12px"}} onClick={onVolver}>Cancelar</button>
        <button style={{...s.btnPrimary,flex:2}} onClick={onAplicar}>✓ Aplicar este orden</button>
      </div>
    </div>
  );
}

function MapaClientes({clientes, dia, fecha, ventas, noVisitas, onSeleccionar, onVolver, onActualizar}) {
  const mapRef=React.useRef(null);
  const mapInstRef=React.useRef(null);
  const [leafletOk,setLeafletOk]=React.useState(!!window.L);
  const [filtroDia,setFiltroDia]=React.useState(dia||"todos");
  const [modoCarga,setModoCarga]=React.useState(false);
  const [modoRuta,setModoRuta]=React.useState(false);
  const [mostrarRuta,setMostrarRuta]=React.useState(false);
  const ventasHoy=(ventas||[]).filter(v=>v.fechaKey===fecha);
  const noVisHoy=(noVisitas||[]).filter(v=>v.fecha===fecha);
  const clientesFiltrados=(clientes||[]).filter(c=>{if(filtroDia!=="todos"&&c.dia!==filtroDia)return false;return c.lat&&c.lng;});
  const sinCoordenadas=(clientes||[]).filter(c=>(filtroDia==="todos"||c.dia===filtroDia)&&(!c.lat||!c.lng)).length;
  const entregadosCount=clientesFiltrados.filter(c=>ventasHoy.some(v=>v.clienteId===c.id)).length;
  const pendientesCount=clientesFiltrados.filter(c=>!ventasHoy.some(v=>v.clienteId===c.id)&&!noVisHoy.some(v=>v.clienteId===c.id)).length;
  const rutaOptima=React.useMemo(()=>calcularRutaOptima([...clientesFiltrados]),[clientesFiltrados.length,filtroDia]);

  React.useEffect(()=>{
    if(window.L){setLeafletOk(true);return;}
    const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(link);
    const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.onload=()=>setLeafletOk(true);document.head.appendChild(script);
  },[]);

  React.useEffect(()=>{
    if(modoCarga||modoRuta)return;
    if(!leafletOk||!mapRef.current)return;
    if(mapInstRef.current){mapInstRef.current.remove();mapInstRef.current=null;}
    const L=window.L;
    const map=L.map(mapRef.current,{zoomControl:true,scrollWheelZoom:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19}).addTo(map);
    mapInstRef.current=map;
    const bounds=[];
    const lista=mostrarRuta?rutaOptima:clientesFiltrados;
    lista.forEach((c,ri)=>{
      const entregado=ventasHoy.some(v=>v.clienteId===c.id);
      const noVis=noVisHoy.some(v=>v.clienteId===c.id);
      const color=entregado?"#4dd9a0":noVis?"#f07070":"#5daaff";
      const num=mostrarRuta?ri+1:(c.orden||"·");
      const icon=L.divIcon({className:"",html:`<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">${num}</div>`,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-16]});
      const marker=L.marker([c.lat,c.lng],{icon}).addTo(map);
      const dir=c.calle?c.calle+" "+(c.nro||""):c.manzana?"Mz "+c.manzana+" L "+(c.lote||""):c.barrio||"";
      const estado=entregado?"<span style='color:#059669;font-weight:600'>✓ Entregado</span>":noVis?"<span style='color:#dc2626;font-weight:600'>✗ No visitado</span>":"<span style='color:#2563eb;font-weight:600'>⏳ Pendiente</span>";
      const pid=`popup_btn_${c.id}`;
      marker.bindPopup(`<div style="font-family:sans-serif;min-width:170px;padding:4px 0"><div style="font-size:14px;font-weight:700;margin-bottom:2px">${c.nombre}</div><div style="font-size:11px;color:#666;margin-bottom:4px">${c.dia} · ${dir}</div><div style="margin-bottom:8px">${estado}</div>${!entregado?`<button id="${pid}" style="background:#185FA5;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;width:100%">Entregar →</button>`:""}</div>`);
      marker.on("popupopen",()=>{const btn=document.getElementById(pid);if(btn)btn.onclick=()=>{map.closePopup();onSeleccionar(c);};});
      bounds.push([c.lat,c.lng]);
    });
    if(mostrarRuta&&rutaOptima.length>1)L.polyline(rutaOptima.map(c=>[c.lat,c.lng]),{color:"#185FA5",weight:3,opacity:0.7,dashArray:"8,6"}).addTo(map);
    if(bounds.length>0)map.fitBounds(bounds,{padding:[30,30]});
    else map.setView([-26.82,-65.2],13);
    return()=>{if(mapInstRef.current){mapInstRef.current.remove();mapInstRef.current=null;}};
  },[leafletOk,modoCarga,modoRuta,filtroDia,clientesFiltrados.length,mostrarRuta]);

  if(modoCarga)return <CargaGPSMasiva clientes={clientes} onActualizar={onActualizar||((v)=>{})} onVolver={()=>setModoCarga(false)}/>;
  if(modoRuta)return <PreviaRuta rutaOptima={rutaOptima} ventasHoy={ventasHoy} noVisHoy={noVisHoy}
    onAplicar={()=>{const a=[...clientes];rutaOptima.forEach((c,i)=>{const idx=a.findIndex(x=>x.id===c.id);if(idx>=0)a[idx]={...a[idx],orden:i+1};});if(onActualizar)onActualizar(a);setModoRuta(false);setMostrarRuta(true);}}
    onVolver={()=>setModoRuta(false)}/>;

  return (
    <div style={{...s.screen,display:"flex",flexDirection:"column"}}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Mapa de clientes</span>
        {clientesFiltrados.length>1&&<button style={{...s.btn,fontSize:11,padding:"5px 10px",background:"var(--color-background-info)",color:"var(--color-text-info)",border:"none"}} onClick={()=>setModoRuta(true)}>🗺 Ruta óptima</button>}
      </div>
      <div style={{display:"flex",gap:6,padding:"8px 14px",overflowX:"auto",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {["todos",...DIAS].map(d=>(
          <button key={d} style={{...s.btn,padding:"5px 12px",fontSize:12,flexShrink:0,background:filtroDia===d?"#185FA5":"var(--color-background-tertiary)",color:filtroDia===d?"#e2eaf4":"var(--color-text-secondary)",border:filtroDia===d?"none":"0.5px solid var(--color-border-secondary)"}} onClick={()=>setFiltroDia(d)}>
            {d==="todos"?"Todos":d}
          </button>
        ))}
      </div>
      <div style={{display:"flex",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {[{val:clientesFiltrados.length,lbl:"Con GPS",color:"#5daaff"},{val:entregadosCount,lbl:"Entregados",color:"#4dd9a0"},{val:pendientesCount,lbl:"Pendientes",color:"#f5b942"},{val:sinCoordenadas,lbl:"Sin GPS",color:"var(--color-text-tertiary)"}].map((item,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:i<3?"0.5px solid var(--color-border-tertiary)":"none"}}>
            <div style={{fontSize:16,fontWeight:600,color:item.color}}>{item.val}</div>
            <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>{item.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"6px 14px",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {[["#4dd9a0","Entregado"],["#5daaff","Pendiente"],["#f07070","No visitado"]].map(([color,lbl])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:color}}/><span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{lbl}</span>
          </div>
        ))}
        {clientesFiltrados.length>1&&<button style={{...s.btn,fontSize:10,padding:"3px 8px",marginLeft:"auto",background:mostrarRuta?"#185FA5":"var(--color-background-tertiary)",color:mostrarRuta?"#e2eaf4":"var(--color-text-secondary)",border:"none"}} onClick={()=>setMostrarRuta(r=>!r)}>{mostrarRuta?"Ocultar ruta":"Ver ruta"}</button>}
      </div>
      {leafletOk&&clientesFiltrados.length===0&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,padding:32}}>
          <div style={{fontSize:40}}>📍</div>
          <div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",textAlign:"center"}}>Sin clientes con GPS</div>
          <button style={{...s.btnPrimary,maxWidth:260}} onClick={()=>setModoCarga(true)}>📍 Iniciar carga de GPS ({sinCoordenadas} clientes)</button>
        </div>
      )}
      {!leafletOk&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Cargando mapa...</div></div>}
      <div style={{flex:1,position:"relative",display:leafletOk&&clientesFiltrados.length>0?"block":"none"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%",minHeight:400}}/>
        {sinCoordenadas>0&&<button onClick={()=>setModoCarga(true)} style={{position:"absolute",bottom:16,right:16,zIndex:1000,background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:24,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 3px 12px rgba(0,0,0,0.4)"}}>📍 {sinCoordenadas} sin GPS</button>}
      </div>
    </div>
  );
}
