// ════════════════════════════════════════════════════════════════════
// ◆  07-stock.js — StockGeneral · ConfirmacionesDia
// ════════════════════════════════════════════════════════════════════

function StockGeneral({stock,setStock,clientes,setClientes,ventas,productos,setProductos,cargasDia,setCargasDia,planillas,onVolver,onResumen}) {
  const [clientesAbierto,setClientesAbierto]=React.useState(false);
  const hoyDia = DIAS[(new Date().getDay()+6)%7] || "Lunes";
  const [diaCarga,setDiaCarga]=React.useState(DIAS.includes(hoyDia)?hoyDia:"Lunes");
  const PRODS=[["sifon","Sifón 1.5L"],["bidon10","Bidón 10L"],["bidon20","Bidón 20L"],["dispenser","Dispenser"]];

  const setLoc=(loc,key,val)=>{
    const ns=JSON.parse(JSON.stringify(stock));
    if(!ns[loc]) ns[loc]={sifon:0,bidon10:0,bidon20:0,dispenser:0};
    ns[loc][key]=Math.max(0,Math.round(Number(val)||0));
    setStock(ns);
  };
  const setClienteEnv=(id,key,val)=>{
    setClientes((clientes||[]).map(c=>c.id===id?{...c,[key]:Math.max(0,Math.round(Number(val)||0))}:c));
  };
  const setProdPrecio=(id,campo,val)=>{
    setProductos((productos||[]).map(p=>p.id===id?{...p,[campo]:Math.max(0,Number(val)||0)}:p));
  };
  const setCarga=(dia,key,val)=>{
    const nc=JSON.parse(JSON.stringify(cargasDia||{}));
    if(!nc[dia]) nc[dia]={};
    nc[dia][key]=Math.max(0,Math.round(Number(val)||0));
    setCargasDia(nc);
  };

  const clientesReales=(clientes||[]).filter(c=>!c._esProspecto);
  const totClientes={sifon:0,bidon10:0,bidon20:0,dispenser:0};
  clientesReales.forEach(c=>{
    totClientes.sifon   +=Number(c.sifon)||0;
    totClientes.bidon10 +=Number(c.bidon10)||0;
    totClientes.bidon20 +=Number(c.bidon20)||0;
    totClientes.dispenser+=Number(c.dispenser)||0;
  });

  const inNum={...s.inputNum,padding:"5px 2px",fontSize:13};

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={{...s.headerTitle,flex:1}}>📦 Stock</span>
        {onResumen&&<button style={s.btn} onClick={onResumen}>📊 Resumen</button>}
      </div>

      <div style={{padding:"10px 14px 40px"}}>

        <div style={{fontSize:11,color:"var(--color-text-info)",margin:"0 0 10px",padding:"7px 11px",background:"var(--color-background-info)",borderRadius:8}}>ℹ️ El <b>sifón</b> se cuenta en <b>unidades sueltas</b> (6 unidades = 1 cajón).</div>

        {/* SODERÍA */}
        <div style={{...s.card,margin:"0 0 10px"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:9}}>🏭 Sodería <span style={{fontWeight:400,color:"var(--color-text-tertiary)",fontSize:11}}>· de acá sale el camión</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 52px 52px 46px",gap:6,fontSize:11,color:"var(--color-text-tertiary)",marginBottom:5}}>
            <span></span><span style={{textAlign:"center"}}>Llenos</span><span style={{textAlign:"center"}}>Vacíos</span><span style={{textAlign:"center",color:"var(--color-text-secondary)"}}>Total</span>
          </div>
          {PRODS.map(([k,lbl])=>{
            const ll=stock.soderia?.[k]||0, va=stock.soderia_vacios?.[k]||0;
            return (
              <div key={k} style={{display:"grid",gridTemplateColumns:"1fr 52px 52px 46px",gap:6,alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{lbl}</span>
                <input type="number" value={ll} onChange={e=>setLoc("soderia",k,e.target.value)} style={inNum} />
                <input type="number" value={va} onChange={e=>setLoc("soderia_vacios",k,e.target.value)} style={inNum} />
                <span style={{textAlign:"center",fontSize:13,color:"var(--color-text-secondary)",fontWeight:500}}>{ll+va}{k==="sifon"&&<span style={{display:"block",fontSize:9,color:"var(--color-text-tertiary)",fontWeight:400}}>{Math.floor((ll+va)/6)} caj</span>}</span>
              </div>
            );
          })}
        </div>

        {/* DEPÓSITO */}
        <div style={{...s.card,margin:"0 0 10px"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:9}}>📦 Depósito <span style={{fontWeight:400,color:"var(--color-text-tertiary)",fontSize:11}}>· vacíos nuevos, sin uso</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {PRODS.map(([k,lbl])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--color-background-tertiary)",borderRadius:8,padding:"6px 9px"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{lbl.replace(" 1.5L","")}{k==="sifon"&&<span style={{fontSize:9,color:"var(--color-text-tertiary)",display:"block"}}>{Math.floor((stock.casa?.sifon||0)/6)} caj</span>}</span>
                <input type="number" value={stock.casa?.[k]||0} onChange={e=>setLoc("casa",k,e.target.value)} style={{...inNum,width:48}} />
              </div>
            ))}
          </div>
        </div>

        {/* EN CLIENTES */}
        <div style={{...s.card,margin:"0 0 10px"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:7}}>👥 En clientes <span style={{fontWeight:400,color:"var(--color-text-tertiary)",fontSize:11}}>· prestados</span></div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            <span style={{background:"var(--color-background-tertiary)",borderRadius:6,padding:"3px 8px",fontSize:12,color:"var(--color-text-secondary)"}}>Sifón <b style={{color:"var(--color-text-primary)"}}>{totClientes.sifon}</b> <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>({Math.floor(totClientes.sifon/6)} caj)</span></span>
            <span style={{background:"var(--color-background-tertiary)",borderRadius:6,padding:"3px 8px",fontSize:12,color:"var(--color-text-secondary)"}}>10L <b style={{color:"var(--color-text-primary)"}}>{totClientes.bidon10}</b></span>
            <span style={{background:"var(--color-background-tertiary)",borderRadius:6,padding:"3px 8px",fontSize:12,color:"var(--color-text-secondary)"}}>20L <b style={{color:"var(--color-text-primary)"}}>{totClientes.bidon20}</b></span>
            <span style={{background:"var(--color-background-tertiary)",borderRadius:6,padding:"3px 8px",fontSize:12,color:"var(--color-text-secondary)"}}>Disp <b style={{color:"var(--color-text-primary)"}}>{totClientes.dispenser}</b></span>
          </div>
          <button onClick={()=>setClientesAbierto(o=>!o)} style={{...s.btn,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>✏️ Detalle por cliente ({clientesReales.length})</span><span>{clientesAbierto?"▲":"▼"}</span>
          </button>
          {clientesAbierto&&(
            <div style={{marginTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 42px 42px 42px 42px",gap:4,fontSize:10,color:"var(--color-text-tertiary)",marginBottom:5}}>
                <span></span><span style={{textAlign:"center"}}>Sif</span><span style={{textAlign:"center"}}>10L</span><span style={{textAlign:"center"}}>20L</span><span style={{textAlign:"center"}}>Disp</span>
              </div>
              {clientesReales.sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"")).map(c=>(
                <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 42px 42px 42px 42px",gap:4,alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</span>
                  <input type="number" value={c.sifon||0} onChange={e=>setClienteEnv(c.id,"sifon",e.target.value)} style={{...inNum,padding:"4px 2px",fontSize:12}} />
                  <input type="number" value={c.bidon10||0} onChange={e=>setClienteEnv(c.id,"bidon10",e.target.value)} style={{...inNum,padding:"4px 2px",fontSize:12}} />
                  <input type="number" value={c.bidon20||0} onChange={e=>setClienteEnv(c.id,"bidon20",e.target.value)} style={{...inNum,padding:"4px 2px",fontSize:12}} />
                  <input type="number" value={c.dispenser||0} onChange={e=>setClienteEnv(c.id,"dispenser",e.target.value)} style={{...inNum,padding:"4px 2px",fontSize:12}} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCTOS Y PRECIOS */}
        <div style={{...s.card,margin:"0 0 10px"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:3}}>🏷️ Productos y precios</div>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:9}}>De acá salen los precios de la planilla y todas las ventas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 74px 74px",gap:6,fontSize:11,color:"var(--color-text-tertiary)",marginBottom:5}}>
            <span></span><span style={{textAlign:"center"}}>Llenado</span><span style={{textAlign:"center"}}>Venta</span>
          </div>
          {(productos||[]).map(p=>(
            <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 74px 74px",gap:6,alignItems:"center",marginBottom:5}}>
              <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{p.nombre}</span>
              <input type="number" value={p.costo||0} onChange={e=>setProdPrecio(p.id,"costo",e.target.value)} style={{...inNum,fontSize:12}} />
              {p.esDispenser
                ? <span style={{textAlign:"center",fontSize:11,color:"var(--color-text-warning)"}}>comodato</span>
                : <input type="number" value={p.precio||0} onChange={e=>setProdPrecio(p.id,"precio",e.target.value)} style={{...inNum,fontSize:12}} />
              }
            </div>
          ))}
        </div>

        {/* CARGA DIARIA */}
        <div style={{...s.card,margin:"0 0 10px"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-info)",marginBottom:9}}>🚐 Carga diaria del camión</div>
          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
            {DIAS.map(d=>(
              <button key={d} onClick={()=>setDiaCarga(d)} style={{fontSize:12,padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",background:diaCarga===d?"#185FA5":"var(--color-background-tertiary)",color:diaCarga===d?"#e2eaf4":"var(--color-text-secondary)",fontWeight:diaCarga===d?500:400}}>{d.slice(0,3)}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {[["soda","Sifón"],["b10","Bidón 10L"],["b20","Bidón 20L"],["disp","Dispenser"]].map(([k,lbl])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--color-background-tertiary)",borderRadius:8,padding:"6px 9px"}}>
                <span style={{fontSize:13,color:"var(--color-text-primary)"}}>{lbl.replace("Bidón ","").replace(" 1.5L","")}{k==="soda"&&<span style={{fontSize:9,color:"var(--color-text-tertiary)",display:"block"}}>{Math.floor(((cargasDia?.[diaCarga]?.soda)||0)/6)} caj</span>}</span>
                <input type="number" value={(cargasDia?.[diaCarga]?.[k])||0} onChange={e=>setCarga(diaCarga,k,e.target.value)} style={{...inNum,width:48}} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ConfirmacionesDia({dia,ventas,clientes,onConfirmar,onVolver}) {
  const [abiertos, setAbiertos] = React.useState({});
  const toggleFecha = (fk) => setAbiertos(o=>({...o,[fk]:!o[fk]}));
  const pendientes = ventas.filter(v=>!v.transConfirmada);
  const confirmadas = ventas.filter(v=>v.transConfirmada);
  const porCliente = {};
  pendientes.forEach(v=>{
    if(!porCliente[v.clienteId]) porCliente[v.clienteId]={cliente:clientes.find(c=>c.id===v.clienteId),ventas:[]};
    porCliente[v.clienteId].ventas.push(v);
  });
  const grupos = Object.values(porCliente);
  const totalPendiente = pendientes.reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const totalConfirmado = confirmadas.reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
  const confirmadasPorFecha = {};
  confirmadas.forEach(v=>{ const fk=v.fechaKey||"sin fecha"; if(!confirmadasPorFecha[fk])confirmadasPorFecha[fk]=[]; confirmadasPorFecha[fk].push(v); });
  const fechasConf = Object.keys(confirmadasPorFecha).sort().reverse();
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>Transferencias · {dia}</span>
      </div>
      <div style={{padding:"10px 14px 4px"}}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <div style={{...s.card,flex:1,margin:0,background:"#1e3a5f",border:"1px solid #f5b942",padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#f5b942",fontWeight:500,textTransform:"uppercase",marginBottom:4}}>🔴 Pendientes</div>
            <div style={{fontSize:18,fontWeight:700,color:"#f5b942"}}>{fmt(totalPendiente)}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{pendientes.length} transfer.</div>
          </div>
          <div style={{...s.card,flex:1,margin:0,background:"#0a2e1f",border:"1px solid #4dd9a0",padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#4dd9a0",fontWeight:500,textTransform:"uppercase",marginBottom:4}}>✓ Confirmadas</div>
            <div style={{fontSize:18,fontWeight:700,color:"#4dd9a0"}}>{fmt(totalConfirmado)}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{confirmadas.length} transfer.</div>
          </div>
        </div>
        {grupos.length===0&&<p style={{textAlign:"center",padding:"20px 0",color:"var(--color-text-tertiary)",fontSize:14}}>✓ No hay transferencias pendientes para {dia}</p>}
        {grupos.map(({cliente:c,ventas:vts})=>(
          <div key={c?.id||Math.random()} style={{...s.card,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{c?.nombre||"Cliente desconocido"}</div>
                <div style={{fontSize:14,color:"var(--color-text-secondary)",marginTop:2}}>{c?.calle?`${c.calle} ${c.nro||""}`:c?.manzana?`Mz ${c.manzana} L ${c.lote}`:""}{c?.barrio?` · ${c.barrio}`:""}</div>
              </div>
              {c?.telefono&&<a href={`https://wa.me/54${c.telefono}`} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:"none"}}>💬</a>}
            </div>
            {vts.map(v=>(
              <div key={v.id} style={{...s.card,margin:"0 0 6px",background:"var(--color-background-tertiary)",padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{v.fechaKey} · {v.fecha?.slice(-8)||""}</div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{(v.detalle||[]).map(d=>`${d.nombre}×${d.cantidad}`).join(" · ")}</div>
                  </div>
                  <span style={{fontSize:16,fontWeight:500,color:"#f5b942"}}>{fmt(v.pagadoNum||v.neto||0)}</span>
                </div>
                <button style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:"#185FA5",color:"#e2eaf4",fontSize:13,fontWeight:500,cursor:"pointer"}}
                  onClick={()=>onConfirmar(v.id)}>✓ Confirmar transferencia</button>
              </div>
            ))}
          </div>
        ))}
        {fechasConf.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:10,color:"var(--color-text-tertiary)",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em",margin:"8px 0 6px"}}>✓ Ya confirmadas</div>
            {fechasConf.map(fk=>{
              const vtsFecha=confirmadasPorFecha[fk];
              const totalFecha=vtsFecha.reduce((a,v)=>a+(v.pagadoNum||v.neto||0),0);
              const open=!!abiertos[fk];
              return (
                <div key={fk} style={{...s.card,margin:"0 0 6px",background:"#0a2e1f",border:"0.5px solid #4dd9a0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>toggleFecha(fk)}>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:"#4dd9a0"}}>📅 {fk}</div>
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{vtsFecha.length} transferencia{vtsFecha.length!==1?"s":""}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:15,fontWeight:600,color:"#4dd9a0"}}>{fmt(totalFecha)}</div>
                      <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:2}}>{open?"▲":"▼"}</div>
                    </div>
                  </div>
                  {open&&<div style={{marginTop:10,borderTop:"0.5px solid rgba(77,217,160,0.2)",paddingTop:8}}>
                    {vtsFecha.map(v=>{
                      const c=clientes.find(x=>x.id===v.clienteId);
                      return (
                        <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid rgba(77,217,160,0.15)"}}>
                          <div>
                            <div style={{fontSize:13,color:"var(--color-text-primary)"}}>{c?.nombre||"Cliente"}</div>
                            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:1}}>{(v.detalle||[]).map(d=>`${d.nombre}×${d.cantidad}`).join(" · ")}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                            <div style={{fontSize:13,fontWeight:500,color:"#4dd9a0"}}>{fmt(v.pagadoNum||v.neto||0)}</div>
                            <button style={{fontSize:10,color:"var(--color-text-tertiary)",background:"none",border:"none",cursor:"pointer",padding:"2px 0",textDecoration:"underline"}} onClick={()=>onConfirmar(v.id)}>desmarcar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
