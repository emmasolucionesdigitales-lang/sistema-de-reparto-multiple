// ════════════════════════════════════════════════════════════════════
// ◆  07-stock.js — StockGeneral · ConfirmacionesDia
// ════════════════════════════════════════════════════════════════════

function StockGeneral({stock,setStock,clientes,ventas,productos,planillas,onVolver}) {
  const CAJON = 6;
  const [tab, setTab] = React.useState("stock");
  const [guardado, setGuardado] = React.useState(false);
  // Stock base editable (solo Sodería y Casa — se setea una vez)
  const [base, setBase] = React.useState(()=>({
    soderia:        {...stock?.soderia        ||{sifon:0,bidon10:0,bidon20:0}},
    soderia_vacios: {...stock?.soderia_vacios ||{sifon:0,bidon10:0,bidon20:0}},
    casa:           {...stock?.casa           ||{sifon:0,bidon10:0,bidon20:0}},
  }));
  const setB = (lugar,key,val) => setBase(b=>({...b,[lugar]:{...b[lugar],[key]:Number(val)||0}}));

  // Calcular lo vendido en total por día (desde todas las ventas registradas)
  const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  const prodKey = {"Sifón 1.5L":"sifon","Bidón 10L":"bidon10","Bidón 20L":"bidon20"};

  // Ventas de hoy (fechaKey = hoy)
  const hoy = new Date().toISOString().slice(0,10);
  const ventasHoy = ventas.filter(v=>v.fechaKey===hoy);

  // ¿El día ya fue cerrado?
  const diaCerradoHoy = DIAS.some(d=>!!planillas[`${d}_${hoy}`]?._diaCerrado);

  // Lo cargado hoy (de las planillas del día)
  const cargadoHoy = {sifon:0, bidon10:0, bidon20:0};
  DIAS.forEach(d=>{
    const p = planillas[`${d}_${hoy}`];
    if(p?.productos){
      cargadoHoy.sifon   += Number(p.productos.soda?.llenos||0);
      cargadoHoy.bidon10 += Number(p.productos.b10?.llenos||0);
      cargadoHoy.bidon20 += Number(p.productos.b20?.llenos||0);
    }
  });

  // Lo vendido hoy
  const vendidoHoy = {sifon:0, bidon10:0, bidon20:0};
  ventasHoy.forEach(v=>v.detalle.forEach(d=>{
    const k=prodKey[d.nombre]; if(k) vendidoHoy[k]+=d.cantidad;
  }));

  // En camión: valor real de Firebase (actualizado por InicioReparto/cerrarCamion)
  const enCamionHoy = diaCerradoHoy ? {sifon:0,bidon10:0,bidon20:0} : {
    sifon:   stock?.camion?.sifon   || 0,
    bidon10: stock?.camion?.bidon10 || 0,
    bidon20: stock?.camion?.bidon20 || 0,
  };

  // Sodería: valor real de Firebase
  const soCal = {
    sifon:   stock?.soderia?.sifon   || 0,
    bidon10: stock?.soderia?.bidon10 || 0,
    bidon20: stock?.soderia?.bidon20 || 0,
  };

  // Envases en clientes
  const envC = {sifon:0,bidon10:0,bidon20:0};
  clientes.forEach(c=>{envC.sifon+=(c.sifon||0);envC.bidon10+=(c.bidon10||0);envC.bidon20+=(c.bidon20||0);});
  ventas.forEach(v=>{
    (v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)envC[k]+=Number(e.cant)||0;});
    (v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)envC[k]-=Number(e.cant)||0;});
  });

  const guardar = () => {
    setStock({soderia:base.soderia, soderia_vacios:base.soderia_vacios, casa:base.casa, camion:stock?.camion||{sifon:0,bidon10:0,bidon20:0}});
    setGuardado(true);
    setTimeout(()=>setGuardado(false),2000);
  };

  const Row = ({l,v,color})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
      <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{l}</span>
      <span style={{fontSize:13,fontWeight:500,color:color||"var(--color-text-primary)"}}>{v}</span>
    </div>
  );

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <span style={s.headerTitle}>📦 Stock</span>
      </div>
      <div style={{display:"flex",gap:6,padding:"10px 14px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        {[["stock","📦 Inventario"],["clientes","👥 Clientes"]].map(([t,l])=>(
          <button key={t} style={{...s.btn,flex:1,padding:"8px 4px",fontSize:13,fontWeight:tab===t?600:400,
            background:tab===t?"var(--color-background-secondary)":"transparent",
            borderBottom:tab===t?"2px solid #185FA5":"none",
            borderRadius:tab===t?"8px 8px 0 0":"8px",
            color:tab===t?"var(--color-text-primary)":"var(--color-text-secondary)"}}
            onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      <div style={{padding:14,overflowY:"auto"}}>
      {tab==="stock"&&(<>
        {/* Estado actual calculado */}
        <div style={{...s.card,margin:"0 0 12px",background:"var(--color-background-secondary)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>📊 Estado actual (calculado)</div>
            {(stock?.camion?.sifon>0||stock?.camion?.bidon10>0||stock?.camion?.bidon20>0)&&(
              <button style={{...s.btn,fontSize:10,padding:"3px 8px",color:"var(--color-text-danger)",border:"1px solid var(--color-text-danger)"}}
                onClick={()=>{if(window.confirm("¿Limpiar camión? Solo si no hay reparto activo.")){setStock(prev=>({...prev,camion:{sifon:0,bidon10:0,bidon20:0}}));}}}>
                🔄 Limpiar camión
              </button>
            )}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {[["🏭 Sodería",[Math.floor(soCal.sifon/CAJON),soCal.bidon10,soCal.bidon20]],["🚚 En reparto",[Math.floor(enCamionHoy.sifon/CAJON),enCamionHoy.bidon10,enCamionHoy.bidon20]]].map(([titulo,vals])=>(
              <div key={titulo} style={{flex:1}}>
                <div style={{fontSize:10,color:titulo.includes("reparto")&&diaCerradoHoy?"#4dd9a0":"var(--color-text-tertiary)",marginBottom:4}}>
                  {titulo}{titulo.includes("reparto")&&diaCerradoHoy?" ✅":""}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {vals.map((v,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",background:"var(--color-background-tertiary)",borderRadius:6,padding:"4px 8px"}}>
                      <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{["Caj","10L","20L"][i]}</span>
                      <span style={{fontSize:14,fontWeight:600,color:titulo.includes("reparto")&&diaCerradoHoy?"#4dd9a0":v<3?"var(--color-text-danger)":v<8?"var(--color-text-warning)":"var(--color-text-primary)"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {(cargadoHoy.sifon>0||cargadoHoy.bidon10>0||cargadoHoy.bidon20>0)&&(
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:6,marginTop:4}}>
              Hoy: cargado {Math.floor(cargadoHoy.sifon/CAJON)} caj · {cargadoHoy.bidon10} 10L · {cargadoHoy.bidon20} 20L
              {" / "}vendido {Math.floor(vendidoHoy.sifon/CAJON)} caj · {vendidoHoy.bidon10} 10L · {vendidoHoy.bidon20} 20L
            </div>
          )}
        </div>

        {/* Stock base editable — se setea una vez */}
        {[["soderia","🏭 Sodería (stock base llenos)"],["soderia_vacios","📦 Sodería (vacíos en depósito)"],["casa","🏠 Casa / Depósito"]].map(([lugar,titulo])=>(
          <div key={lugar} style={{...s.card,margin:"0 0 12px"}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>{titulo}</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>Modificá solo cuando ajustés físicamente el stock</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div>
                <label style={{...s.label,textAlign:"center",fontSize:11}}>Cajones soda</label>
                <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0}
                  value={Math.floor((base[lugar]?.sifon||0)/CAJON)}
                  onChange={e=>{ const caj=Number(e.target.value)||0; const sueltos=(base[lugar]?.sifon||0)%CAJON; setB(lugar,"sifon",caj*CAJON+sueltos); }} />
                <div style={{fontSize:10,color:"var(--color-text-tertiary)",textAlign:"center",marginTop:2}}>{base[lugar]?.sifon||0} sifones</div>
              </div>
              <div>
                <label style={{...s.label,textAlign:"center",fontSize:11}}>Bidón 10L</label>
                <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0} value={base[lugar]?.bidon10||0} onChange={e=>setB(lugar,"bidon10",e.target.value)} />
              </div>
              <div>
                <label style={{...s.label,textAlign:"center",fontSize:11}}>Bidón 20L</label>
                <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0} value={base[lugar]?.bidon20||0} onChange={e=>setB(lugar,"bidon20",e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button style={{...s.btnPrimary,background:guardado?"#0F6E56":undefined}} onClick={guardar}>
          {guardado?"✓ Guardado":"Guardar stock base"}
        </button>
      </>)}

      {tab==="clientes"&&(<>
        <div style={{...s.card,margin:"0 0 12px",background:"var(--color-background-secondary)"}}>
          <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Total envases en clientes</div>
          <div style={{display:"flex",gap:8}}>
            {[[Math.floor(envC.sifon/CAJON),"caj",`${envC.sifon} sif`],[envC.bidon10,"10L",null],[envC.bidon20,"20L",null]].map(([v,u,sub])=>(
              <div key={u} style={{flex:1,background:"var(--color-background-tertiary)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-info)"}}>{v}</div>
                {sub&&<div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{sub}</div>}
                <div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:2}}>{u}</div>
              </div>
            ))}
          </div>
        </div>
        {clientes.filter(c=>{
          const vC=ventas.filter(v=>v.clienteId===c.id);
          const ex={sifon:0,bidon10:0,bidon20:0};
          vC.forEach(v=>{
            (v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)ex[k]+=Number(e.cant)||0;});
            (v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)ex[k]-=Number(e.cant)||0;});
          });
          return ex.sifon>0||ex.bidon10>0||ex.bidon20>0;
        }).sort((a,b)=>{const dA=DIAS.indexOf(a.dia),dB=DIAS.indexOf(b.dia);return dA!==dB?dA-dB:(a.orden||9999)-(b.orden||9999);}).map(c=>{
          const vC=(todasVentas||ventas).filter(v=>v.clienteId===c.id);
          const extra={sifon:0,bidon10:0,bidon20:0};
          vC.forEach(v=>{
            (v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)extra[k]+=Number(e.cant)||0;});
            (v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)extra[k]-=Number(e.cant)||0;});
          });
          return (
            <div key={c.id} style={{...s.card,margin:"0 0 8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{c.dia}</div>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {extra.sifon>0&&<span style={{...s.tag,color:"var(--color-text-warning)"}}>+{extra.sifon} sif</span>}
                  {extra.bidon10>0&&<span style={{...s.tag,color:"var(--color-text-warning)"}}>+{extra.bidon10} 10L</span>}
                  {extra.bidon20>0&&<span style={{...s.tag,color:"var(--color-text-warning)"}}>+{extra.bidon20} 20L</span>}
                </div>
              </div>
            </div>
          );
        })}
        {clientes.filter(c=>{const vC=ventas.filter(v=>v.clienteId===c.id);const ex={sifon:0,bidon10:0,bidon20:0};vC.forEach(v=>{(v.envPrest||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)ex[k]+=Number(e.cant)||0;});(v.envDev||[]).forEach(e=>{const k=e.prod==="Sifón 1.5L"?"sifon":e.prod==="Bidón 10L"?"bidon10":e.prod==="Bidón 20L"?"bidon20":null;if(k)ex[k]-=Number(e.cant)||0;});});return ex.sifon>0||ex.bidon10>0||ex.bidon20>0;}).length===0&&
          <p style={{textAlign:"center",color:"var(--color-text-tertiary)",padding:"30px 0",fontSize:14}}>No hay clientes con envases prestados extra</p>}
      </>)}
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

