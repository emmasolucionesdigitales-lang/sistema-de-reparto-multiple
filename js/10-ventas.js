// ════════════════════════════════════════════════════════════════════
// ◆  10-ventas.js — NuevaVenta · NuevoCliente
// ════════════════════════════════════════════════════════════════════

function NuevaVenta({cliente,productos,fecha,onGuardar,onNoEsta,onNoQuiere,onVolver}) {
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
  const detalle=productos.map(p=>({nombre:p.nombre,cantidad:cantidades[p.nombre]||0,precio:p.precio,total:(cantidades[p.nombre]||0)*p.precio})).filter(d=>d.cantidad>0);
  const bruto=detalle.reduce((a,d)=>a+d.total,0);
  const desc=0; // retención informativa solo en planilla
  const neto=bruto-desc;
  const saldoDisp=cliente.saldo>0?cliente.saldo:0;
  const saldoApl=(usarSaldo&&pago!=="fiado")?Math.min(saldoDisp,neto):0;
  const aPagar=neto-saldoApl;
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
        <span style={s.headerTitle}>Entrega · {cliente.nombre}</span>
      </div>
      <div style={{padding:16}}>
        {/* Envases habituales del cliente */}
        {(()=>{const tags=[];if(cliente.sifon>0)tags.push(`Sifón×${cliente.sifon}`);if(cliente.bidon10>0)tags.push(`10L×${cliente.bidon10}`);if(cliente.bidon20>0)tags.push(`20L×${cliente.bidon20}`);return tags.length>0?(<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{tags.map(t=><span key={t} style={{...s.tag,background:"#1e3a5f",color:"var(--color-text-info)",border:"0.5px solid var(--color-border-info)",fontSize:11}}>🧴 {t}</span>)}</div>):null;})()}
        <span style={{...s.sectionTitle,padding:"0 0 10px"}}>Cantidades entregadas</span>
        {productos.map(p=>(
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
                  const resto = aPagar - Number(ef||0);
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
                Total pagado: {fmt(Number(montoEfec||0)+Number(montoTrans||0))} de {fmt(aPagar)}
                {(Number(montoEfec||0)+Number(montoTrans||0))<aPagar&&
                  <span style={{color:"var(--color-text-warning)"}}> · Queda {fmt(aPagar-Number(montoEfec||0)-Number(montoTrans||0))} de saldo</span>}
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

        {pago!=="fiado"&&(
          <div style={{marginBottom:12}}>
            <label style={s.label}>
              {opcionSaldo==="parcial"?"Monto que paga (parcial)":opcionSaldo==="todo"?`Total a cobrar (deuda + compra):`:"Monto cobrado (vacío = ${fmt(aPagar)} exacto)"}
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
          <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10,marginTop:6,display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>A cobrar</span>
            <span style={{fontSize:26,fontWeight:500,color:"var(--color-text-primary)"}}>{fmt(aPagar)}</span>
          </div>
        </div>
        <button style={{...s.btnPrimary,marginBottom:10,opacity:detalle.length===0?0.45:1}} disabled={detalle.length===0} onClick={()=>{
          if(pago==="mixto"){
            const ef=Number(montoEfec||0), tr=Number(montoTrans||0);
            const totalPagado=ef+tr;
            const saldoDelta=totalPagado-aPagar;
            if(ef>0) onGuardar(detalle,"contado",String(ef),saldoApl,envPrest,envDev,obs,"mixto_ef",tr,saldoDelta);
            else if(tr>0) onGuardar(detalle,"transferencia",String(tr),saldoApl,envPrest,envDev,obs,"mixto_tr",ef,saldoDelta);
          } else {
            const montoFinal = opcionSaldo==="todo"&&!monto
              ? String(Math.round(Math.abs(cliente.saldo)+aPagar))
              : monto;
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
        </div>
        {/* Cobrar deuda sin entrega */}
        {cliente.saldo<0&&(
          <CobroDeudaPanel saldo={cliente.saldo} onCobrar={(mCobro,pCobro)=>{
            onGuardar([{nombre:"Cobro de deuda",cantidad:1,precio:0,total:0}],pCobro,String(mCobro),0,[],[],`Cobro de deuda $${mCobro.toLocaleString("es-AR")} (${pCobro})`,"cobro_deuda");
          }} />
        )}
        <div style={s.divider} />
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

