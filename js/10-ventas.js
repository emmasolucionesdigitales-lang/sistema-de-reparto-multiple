// ════════════════════════════════════════════════════════════════════
// ◆  10-ventas.js — NuevaVenta · NuevoCliente
// ════════════════════════════════════════════════════════════════════

function NuevaVenta({cliente,productos,fecha,onGuardar,onNoEsta,onNoQuiere,onVolver,onSaltar,progressData}) {
  const [transConfirmada,setTransConfirmada] = React.useState(false);

  const sonarTransferencia = () => {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      [523,659,784].forEach((freq,i)=>{
        const osc=ctx.createOscillator(); const gain=ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value=freq; gain.gain.value=0.3;
        osc.start(ctx.currentTime+i*0.15);
        osc.stop(ctx.currentTime+i*0.15+0.15);
      });
    } catch(e){}
  };
  const [cantidades,setCantidades]=useState(()=>{const m={};productos.forEach(p=>{m[p.nombre]=0;});return m;});
  const [pago,setPago]=useState("contado");
  const [monto,setMonto]=useState("");
  const [montoEfec,setMontoEfec]=useState(""); // pago mixto: parte efectivo
  const [montoTrans,setMontoTrans]=useState(""); // pago mixto: parte transferencia
  const [transConfMixto,setTransConfMixto]=useState(false);
  const [usarSaldo,setUsarSaldo]=useState(false);
  const [opcionSaldo,setOpcionSaldo]=useState("compra"); // compra | todo | parcial
  const [envPrest,setEnvPrest]=useState([{prod:"",cant:""}]);
  const [envDev,setEnvDev]=useState([{prod:"",cant:""}]);
  const [obs,setObs]=useState("");
  const [dispRotoPrecio, setDispRotoPrecio] = React.useState("");
  const dispenser = productos.find(p=>p.esDispenser);
  const prodEntrega = productos.filter(p=>!p.esDispenser);
  const rotoPrecioNum = Number(dispRotoPrecio)||0;
  const detalle=[
    ...prodEntrega.map(p=>({nombre:p.nombre,cantidad:cantidades[p.nombre]||0,precio:p.precio,total:(cantidades[p.nombre]||0)*p.precio})).filter(d=>d.cantidad>0),
    ...(rotoPrecioNum>0?[{nombre:"Dispenser (rotura)",cantidad:1,precio:rotoPrecioNum,total:rotoPrecioNum,_esDispRoto:true}]:[]),
  ];
  const bruto=detalle.reduce((a,d)=>a+d.total,0);
  const desc=0; // retención informativa solo en planilla
  const neto=bruto-desc;
  const saldoDisp=cliente.saldo>0?cliente.saldo:0;
  const saldoApl=(usarSaldo&&pago!=="fiado")?Math.min(saldoDisp,neto):0;
  const aPagar=neto-saldoApl;
  const deudaPendiente = cliente.saldo<0 ? Math.abs(cliente.saldo) : 0;
  const totalACobrar = opcionSaldo==="todo" ? Math.round(deudaPendiente+aPagar) : aPagar;
  const pagaTodo = deudaPendiente>0 && pago!=="fiado" && opcionSaldo==="todo";
  React.useEffect(()=>{
    if(pago==="fiado") return;
    if(opcionSaldo==="todo" && deudaPendiente>0){ setMonto(String(Math.round(deudaPendiente+aPagar))); }
    else if(opcionSaldo==="compra"){ setMonto(""); }
  },[opcionSaldo,aPagar,deudaPendiente,pago]);
  const ER=({list,setList,i})=>(
    <div style={{...s.row,marginBottom:6}}>
      <select style={{...s.select,flex:2}} value={list[i].prod} onChange={e=>{const n=[...list];n[i].prod=e.target.value;setList(n);}}>
        <option value="">— Producto —</option>
        {productos.map(p=><option key={p.id} value={p.nombre}>{p.nombre}</option>)}
      </select>
      <input style={{...s.input,flex:1}} type="number" placeholder="Cant" value={list[i].cant} onChange={e=>{const n=[...list];n[i].cant=e.target.value;setList(n);}} />
    </div>
  );
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <div style={{flex:1,paddingLeft:4}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{cliente.nombre}</div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>
            {cliente.calle?`${cliente.calle} ${cliente.nro||""}`:cliente.manzana?`Mz ${cliente.manzana} L ${cliente.lote}`:""}{cliente.barrio?` · ${cliente.barrio}`:""}{cliente.orden?` · #${cliente.orden}`:""}
          </div>
        </div>
        <div style={{display:"flex",gap:6,fontSize:17,flexShrink:0}}>
          {(cliente.maps||(cliente.lat&&cliente.lng))&&<a href={cliente.maps||`https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`} target="_blank" rel="noreferrer" style={{textDecoration:"none"}} onClick={e=>e.stopPropagation()}>📍</a>}
          {cliente.telefono&&<a href={`https://wa.me/54${cliente.telefono}`} target="_blank" rel="noreferrer" style={{textDecoration:"none"}} onClick={e=>e.stopPropagation()}>💬</a>}
        </div>
      </div>
      {/* Panel de info del cliente */}
      <div style={{background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"7px 14px",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {cliente.saldo<0&&<span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"var(--color-background-danger)",color:"var(--color-text-danger)"}}>Debe {fmt(Math.abs(cliente.saldo))}</span>}
        {cliente.saldo>0&&<span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"var(--color-background-success)",color:"var(--color-text-success)"}}>A favor {fmt(cliente.saldo)}</span>}
        {cliente.sifon>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"var(--color-background-info)",color:"var(--color-text-info)"}}>Sifón×{cliente.sifon}</span>}
        {cliente.bidon10>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"var(--color-background-info)",color:"var(--color-text-info)"}}>10L×{cliente.bidon10}</span>}
        {cliente.bidon20>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"var(--color-background-info)",color:"var(--color-text-info)"}}>20L×{cliente.bidon20}</span>}
        {cliente.dispenser>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)"}}>Disp×{cliente.dispenser}</span>}
        {(()=>{const aj=cliente.envAjuste||{};const items=[];if((aj.sifon||0)>0)items.push(`+${aj.sifon} sif.`);if((aj.bidon10||0)>0)items.push(`+${aj.bidon10} 10L`);if((aj.bidon20||0)>0)items.push(`+${aj.bidon20} 20L`);return items.length>0?<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"var(--color-background-warning)",color:"var(--color-text-warning)"}}>{items.join(" ")} prest.</span>:null;})()}
        {cliente.notas&&<span style={{fontSize:11,color:"var(--color-text-warning)"}}>📝 {cliente.notas}</span>}
      </div>
      {/* Barra de progreso del día */}
      {progressData&&(
        <div style={{background:"var(--color-background-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"6px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:120}}>
            <div style={{flex:1,height:5,borderRadius:3,background:"var(--color-background-secondary)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:"#185FA5",width:`${Math.round((progressData.visitados/Math.max(progressData.total,1))*100)}%`}} /></div>
            <span style={{fontSize:11,color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{progressData.visitados}/{progressData.total}</span>
          </div>
          <span style={{fontSize:11,color:"var(--color-text-success)",fontWeight:500}}>{fmt(progressData.montoHoy)}</span>
          {progressData.stock&&Object.entries(progressData.stock).map(([k,v])=>v>0?<span key={k} style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{k}:{v}</span>:null)}
        </div>
      )}
      <div style={{padding:16}}>
        <span style={{...s.sectionTitle,padding:"0 0 10px"}}>Cantidades entregadas</span>
        {prodEntrega.map(p=>(
          <div key={p.id} style={{...s.card,margin:"0 0 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{p.nombre}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{fmt(p.precio)} c/u</div></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button style={{...s.btn,padding:"5px 16px",fontSize:20,lineHeight:1}} onClick={()=>setCantidades(q=>({...q,[p.nombre]:Math.max(0,(q[p.nombre]||0)-1)}))}>−</button>
              <span style={{fontSize:22,fontWeight:500,minWidth:32,textAlign:"center",color:"var(--color-text-primary)"}}>{cantidades[p.nombre]||0}</span>
              <button style={{...s.btn,padding:"5px 16px",fontSize:20,lineHeight:1}} onClick={()=>setCantidades(q=>({...q,[p.nombre]:(q[p.nombre]||0)+1}))}>+</button>
            </div>
          </div>
        ))}
        <div style={s.divider} />
        <label style={{...s.label,fontSize:13,marginBottom:8}}>Forma de pago</label>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["contado","Contado"],["transferencia","Transfer."],["fiado","Fiado"],["mixto","Mixto"]].map(([v,l])=>(
            <button key={v} style={{...s.btn,flex:1,background:pago===v?"#185FA5":undefined,color:pago===v?"#fff":undefined,border:pago===v?"none":undefined,padding:"9px 4px",fontSize:13}} onClick={()=>setPago(v)}>{l}</button>
          ))}
        </div>
        {/* Pago mixto: efectivo + transferencia */}
        {pago==="mixto"&&(
          <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-tertiary)"}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>Desglose del pago mixto</div>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{flex:1}}>
                <label style={s.label}>Efectivo $</label>
                <input style={s.input} type="number" placeholder="0" value={montoEfec} onChange={e=>{
                  const ef = e.target.value;
                  setMontoEfec(ef);
                  // Total real = compra + deuda si elige pagar todo
                  const totalReal = opcionSaldo==="todo" ? Math.round(Math.abs(cliente.saldo||0)+aPagar) : aPagar;
                  const resto = totalReal - Number(ef||0);
                  setMontoTrans(resto > 0 ? String(Math.round(resto)) : "0");
                }} />
              </div>
              <div style={{flex:1}}>
                <label style={s.label}>Transferencia $</label>
                <input style={s.input} type="number" placeholder="0" value={montoTrans} onChange={e=>setMontoTrans(e.target.value)} />
              </div>
            </div>
            {Number(montoEfec||0)+Number(montoTrans||0)>0&&(
              <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                {(()=>{
                  const totalReal = opcionSaldo==="todo" ? Math.round(Math.abs(cliente.saldo||0)+aPagar) : aPagar;
                  const totalPag = Number(montoEfec||0)+Number(montoTrans||0);
                  return <>
                    Total pagado: {fmt(totalPag)} de {fmt(totalReal)}
                    {totalPag<totalReal&&<span style={{color:"var(--color-text-warning)"}}> · Queda {fmt(totalReal-totalPag)}</span>}
                  </>;
                })()}
              </div>
            )}
            {Number(montoTrans||0)>0&&(
              <div style={{...s.card,margin:"8px 0 0",background:transConfMixto?"#0a2e1f":"#1e3a5f",border:transConfMixto?"0.5px solid #4dd9a0":"0.5px solid #5daaff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:transConfMixto?"#4dd9a0":"#5daaff"}}>{transConfMixto?"✓ Transfer. confirmada":"⏳ Confirmar transferencia"}</span>
                  <button style={{background:transConfMixto?"#4dd9a0":"#185FA5",color:transConfMixto?"#0a2e1f":"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}
                    onClick={()=>{setTransConfMixto(!transConfMixto);if(!transConfMixto)sonarTransferencia();}}>
                    {transConfMixto?"✓ OK":"Confirmar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Saldo a favor — descontarlo */}
        {saldoDisp>0&&pago!=="fiado"&&(
          <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-success)",border:"0.5px solid var(--color-border-success)",cursor:"pointer"}} onClick={()=>setUsarSaldo(!usarSaldo)}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input type="checkbox" checked={usarSaldo} onChange={e=>setUsarSaldo(e.target.checked)} style={{width:18,height:18,cursor:"pointer",accentColor:"#0F6E56"}} />
              <label style={{fontSize:14,color:"var(--color-text-success)",cursor:"pointer",fontWeight:500}}>Usar saldo a favor — {fmt(saldoDisp)}</label>
            </div>
            {usarSaldo&&saldoApl>0&&<div style={{fontSize:12,color:"var(--color-text-success)",marginTop:4,paddingLeft:28}}>Se descuentan {fmt(saldoApl)} del total</div>}
          </div>
        )}

        {/* Saldo en contra — opciones de pago */}
        {cliente.saldo<0&&pago!=="fiado"&&(
          <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-danger)",border:"0.5px solid var(--color-border-danger)"}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)",marginBottom:8}}>
              Deuda pendiente: {fmt(Math.abs(cliente.saldo))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                ["todo","Paga deuda + compra de hoy",Math.abs(cliente.saldo)+aPagar],
                ["compra","Solo la compra de hoy",null],
                ["parcial","Pago parcial (ingresá el monto)",null],
              ].map(([op,label,total])=>(
                <button key={op}
                  style={{textAlign:"left",padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--color-border-danger)",background:opcionSaldo===op?"#7f1d1d":"transparent",color:"var(--color-text-danger)",fontSize:12,cursor:"pointer",fontWeight:opcionSaldo===op?500:400}}
                  onClick={()=>setOpcionSaldo(op)}>
                  {opcionSaldo===op?"✓ ":""}{label}{total?` — ${fmt(total)}`:""}
                </button>
              ))}
            </div>
          </div>
        )}

        {pago!=="fiado"&&pago!=="mixto"&&(
          <div style={{marginBottom:12}}>
            <label style={s.label}>
              {opcionSaldo==="parcial"?"Monto que paga (parcial)":opcionSaldo==="todo"?"Total a cobrar (deuda + compra):":`Monto cobrado (vacío = ${fmt(aPagar)} exacto)`}
            </label>
            <input style={s.input} type="number"
              placeholder={opcionSaldo==="todo"?String(Math.round(Math.abs(cliente.saldo)+aPagar)):String(Math.round(aPagar))}
              value={monto} onChange={e=>setMonto(e.target.value)} />
          </div>
        )}
        <div style={s.divider} />
        <div style={{...s.card,margin:"0 0 12px",background:"var(--color-background-secondary)"}}>
          {bruto>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Subtotal</span><span style={{fontSize:13,color:"var(--color-text-primary)"}}>{fmt(bruto)}</span></div>}
          {desc>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Descuento 2.5%</span><span style={{fontSize:13,color:"var(--color-text-danger)"}}>−{fmt(desc)}</span></div>}
          {saldoApl>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Saldo a favor</span><span style={{fontSize:13,color:"var(--color-text-success)"}}>−{fmt(saldoApl)}</span></div>}
          {pagaTodo&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"var(--color-text-danger)"}}>Deuda anterior</span><span style={{fontSize:13,color:"var(--color-text-danger)"}}>+{fmt(deudaPendiente)}</span></div>}
          <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10,marginTop:6,display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>A cobrar</span>
            <span style={{fontSize:26,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(totalACobrar)}</span>
          </div>
        </div>
        <button style={{...s.btnPrimary,marginBottom:10,opacity:detalle.length===0?0.45:1}} disabled={detalle.length===0} onClick={()=>{
          const envIncompleto = [...envPrest, ...envDev].some(e=>{
            const tieneProd = !!e.prod;
            const tieneCant = String(e.cant||"").trim()!=="" && Number(e.cant)>0;
            return (tieneProd && !tieneCant) || (!tieneProd && tieneCant);
          });
          if(envIncompleto){
            alert("⚠️ Hay un envase cargado a medias: falta elegir el producto o poner la cantidad. Completalo o borrá esa fila antes de registrar, así no se pierde la devolución o el préstamo.");
            return;
          }
          if(pago==="mixto"){
            const ef=Number(montoEfec||0), tr=Number(montoTrans||0);
            if(ef===0&&tr===0){alert("Ingresá al menos un monto para el pago mixto");return;}
            const totalPagado=ef+tr;
            if(totalACobrar>0 && totalPagado>totalACobrar*3 && totalPagado>totalACobrar+10000){
              if(!window.confirm(`Estás cobrando ${fmt(totalPagado)}, bastante más que el total a cobrar (${fmt(totalACobrar)}). ¿Está bien?`)) return;
            }
            const saldoDelta = totalPagado - totalACobrar;
            if(ef>0) onGuardar(detalle,"contado",String(ef),saldoApl,envPrest,envDev,obs,"mixto_ef",tr,saldoDelta);
            else onGuardar(detalle,"transferencia",String(tr),saldoApl,envPrest,envDev,obs,"mixto_tr",ef,saldoDelta);
          } else {
            const montoFinal = opcionSaldo==="todo"&&!monto
              ? String(Math.round(Math.abs(cliente.saldo)+aPagar))
              : monto;
            const pagadoNum=Number(montoFinal)||0;
            if(pago!=="fiado" && totalACobrar>0 && pagadoNum>totalACobrar*3 && pagadoNum>totalACobrar+10000){
              if(!window.confirm(`Estás cobrando ${fmt(pagadoNum)}, bastante más que el total a cobrar (${fmt(totalACobrar)}). ¿Está bien?`)) return;
            }
            onGuardar(detalle,pago,montoFinal,saldoApl,envPrest,envDev,obs,opcionSaldo);
          }
        }}>
          ✓ Registrar entrega
        </button>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button style={{flex:1,background:"var(--color-background-warning)",color:"var(--color-text-warning)",border:"0.5px solid var(--color-border-warning)",borderRadius:8,padding:"11px 8px",fontSize:13,fontWeight:500,cursor:"pointer"}}
            onClick={onNoEsta}>
            🔄 No está
          </button>
          <button style={{flex:1,background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:8,padding:"11px 8px",fontSize:13,fontWeight:500,cursor:"pointer"}}
            onClick={onNoQuiere}>
            🚫 No quiere
          </button>
          {onSaltar&&<button style={{flex:1,background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,padding:"11px 8px",fontSize:13,fontWeight:500,cursor:"pointer"}}
            onClick={onSaltar}>
            ⏭ Saltar
          </button>}
        </div>
        {/* Cobrar deuda sin entrega */}
        {cliente.saldo<0&&(
          <CobroDeudaPanel saldo={cliente.saldo} onCobrar={(mCobro,pCobro)=>{
            onGuardar([{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}],pCobro,String(mCobro),0,[],[],`Cobro de deuda $${mCobro.toLocaleString("es-AR")} (${pCobro})`,"cobro_deuda");
          }} />
        )}
        <div style={s.divider} />
        {/* ── Dispenser ─────────────────────────────────── */}
        {dispenser&&(()=>{
          const cantActual = cliente.dispenser||0;
          const prestados = envPrest.filter(e=>e.prod==="Dispenser").reduce((a,e)=>a+(Number(e.cant)||0),0);
          const devueltos = envDev.filter(e=>e.prod==="Dispenser").reduce((a,e)=>a+(Number(e.cant)||0),0);
          const enCliente = cantActual + prestados - devueltos;
          return (
            <div style={{...s.card,margin:"0 0 10px",padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>🧊 Dispenser</span>
                <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                  En el cliente: <b style={{color:"var(--color-text-primary)"}}>{enCliente}</b>
                </span>
              </div>
              {/* Prestar / Devolver rápido */}
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <button style={{flex:1,background:"var(--color-background-info)",color:"var(--color-text-info)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:500,cursor:"pointer"}}
                  onClick={()=>setEnvPrest(prev=>{const n=[...prev];const idx=n.findIndex(e=>e.prod==="Dispenser");if(idx>=0){const c=[...n];c[idx]={...c[idx],cant:String((Number(c[idx].cant)||0)+1)};return c;}return [...n.filter(e=>e.prod!==""),{prod:"Dispenser",cant:"1"}];})}>
                  + Prestar uno
                </button>
                <button style={{flex:1,background:"var(--color-background-success)",color:"var(--color-text-success)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:500,cursor:"pointer",opacity:enCliente<=0?0.4:1}}
                  disabled={enCliente<=0}
                  onClick={()=>setEnvDev(prev=>{const n=[...prev];const idx=n.findIndex(e=>e.prod==="Dispenser");if(idx>=0){const c=[...n];c[idx]={...c[idx],cant:String((Number(c[idx].cant)||0)+1)};return c;}return [...n.filter(e=>e.prod!==""),{prod:"Dispenser",cant:"1"}];})}>
                  − Devolver uno
                </button>
              </div>
              {/* Cobrar rotura */}
              <div>
                <label style={{...s.label,marginBottom:4}}>💔 Cobrar rotura (precio a acordar)</label>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    style={{...s.input,flex:1}}
                    type="number"
                    placeholder={`Costo referencia: ${fmt(dispenser.costo)}`}
                    value={dispRotoPrecio}
                    onChange={e=>setDispRotoPrecio(e.target.value)}
                  />
                  {rotoPrecioNum>0&&(
                    <button style={{...s.btnDanger,padding:"8px 10px",fontSize:12,whiteSpace:"nowrap"}}
                      onClick={()=>setDispRotoPrecio("")}>✕ Quitar</button>
                  )}
                </div>
                {rotoPrecioNum>0&&(
                  <div style={{marginTop:6,fontSize:12,color:"var(--color-text-danger)",fontWeight:500}}>
                    Se cobrará {fmt(rotoPrecioNum)} por rotura de dispenser
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        <label style={{...s.label,fontSize:13,marginBottom:6}}>Envases prestados al cliente</label>
        {envPrest.map((_,i)=><ER key={i} list={envPrest} setList={setEnvPrest} i={i} />)}
        <button style={{...s.btn,fontSize:12,padding:"4px 12px",marginBottom:12}} onClick={()=>setEnvPrest([...envPrest,{prod:"",cant:""}])}>+ Fila</button>
        <label style={{...s.label,fontSize:13,marginBottom:6}}>Envases devueltos por el cliente</label>
        {envDev.map((_,i)=><ER key={i} list={envDev} setList={setEnvDev} i={i} />)}
        <button style={{...s.btn,fontSize:12,padding:"4px 12px",marginBottom:12}} onClick={()=>setEnvDev([...envDev,{prod:"",cant:""}])}>+ Fila</button>
        <div style={s.divider} />
        <label style={s.label}>Observaciones</label>
        <textarea style={{...s.input,minHeight:60,resize:"vertical",marginBottom:14}} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Notas opcionales..." />
      </div>
    </div>
  );
}

function NuevoCliente({diaActual,repartoActual,onGuardar,onVolver}) {
  const [datos,setDatos]=useState({
    nombre:"",dia:diaActual||"Martes",barrio:"",manzana:"",lote:"",sector:"",repartoId:repartoActual?.id||null,
    calle:"",nro:"",aclaracion:"",telefono:"",maps:"",foto:"",
    notas:"",sifon:0,bidon10:0,bidon20:0,orden:"",saldo:0
  });
  const set=(k,v)=>setDatos(d=>({...d,[k]:v}));
  return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={onVolver}>← Volver</button><span style={s.headerTitle}>Nuevo cliente</span></div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
        <div><label style={s.label}>Día de reparto</label>
          <select style={s.select} value={datos.dia} onChange={e=>set("dia",e.target.value)}>
            {DIAS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div><label style={s.label}>Número de orden en la ruta</label>
          <input style={s.input} type="number" min={1} placeholder="ej: 5" value={datos.orden||""} onChange={e=>set("orden",Number(e.target.value)||"")} />
        </div>
        {[["nombre","Nombre y apellido *"],["barrio","Barrio"],["manzana","Manzana"],["lote","Lote"],["sector","Sector"],["calle","Calle"],["nro","Número"],["aclaracion","Aclaración (piso, dpto, etc)"],["telefono","Teléfono (sin 0 ni 15)"],["maps","Link Google Maps"],["foto","Link foto del domicilio"],["notas","Notas rápidas (timbre, perro, deuda...)"]].map(([k,pl])=>(
          <div key={k}><label style={s.label}>{pl.replace(" *","")}</label>
            <input style={s.input} placeholder={pl.replace(" *","")} value={datos[k]||""} onChange={e=>set(k,e.target.value)} />
          </div>
        ))}
        <span style={{...s.label,fontSize:13,marginTop:4}}>Envases habituales</span>
        <div style={s.grid3}>
          {[["sifon","Sifón"],["bidon10","10L"],["bidon20","20L"]].map(([k,l])=>(
            <div key={k}><label style={{...s.label,textAlign:"center"}}>{l}</label>
              <input style={{...s.input,textAlign:"center"}} type="number" min={0} value={datos[k]} onChange={e=>set(k,Number(e.target.value))} />
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
        {datos.foto&&<img src={datos.foto} alt="Domicilio" style={{width:"100%",borderRadius:8,maxHeight:160,objectFit:"cover"}} />}
        <button style={{...s.btnPrimary,marginTop:8,opacity:!datos.nombre?0.45:1}} disabled={!datos.nombre} onClick={()=>onGuardar(datos)}>
          Agregar cliente
        </button>
      </div>
    </div>
  );
}


// ─── MÓDULO PROMOCIÓN ────────────────────────────────────────────────────────

