// ════════════════════════════════════════════════════════════════════
// ◆  12-resumen.js — Resumen · exportar · importar · CalculadoraCostoReal
// ════════════════════════════════════════════════════════════════════

function Resumen({ventas,clientes,productos,planillas,noVisitas,repartos,onVolver}) {
  const [filtro,setFiltro]   = React.useState("mes");   // mes | anio | todo | dia
  const [mesSel,setMesSel]   = React.useState(()=>new Date().toISOString().slice(0,7)); // YYYY-MM
  const [diaSel,setDiaSel]   = React.useState("todos");
  const [repartoFiltro,setRepartoFiltro] = React.useState("todos");
  const chartRefs = {bar:React.useRef(null),donut:React.useRef(null),line:React.useRef(null)};
  const chartInst = React.useRef({});

  // ── Filtro por repartidor ────────────────────────────────────────────────
  // Antes este resumen sumaba SIEMPRE la plata de todos los repartidores
  // juntos, sin poder desglosar. Ahora, si el negocio tiene más de un
  // reparto cargado, se puede elegir "todos" o uno puntual.
  const hayRepartos = repartos && repartos.length > 0;
  const clientesR = (!hayRepartos || repartoFiltro==="todos")
    ? clientes
    : clientes.filter(c=>c.repartoId===repartoFiltro);
  const idsClientesR = new Set(clientesR.map(c=>c.id));
  const ventasR = (!hayRepartos || repartoFiltro==="todos")
    ? ventas
    : ventas.filter(v=>idsClientesR.has(v.clienteId));

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtradas = React.useMemo(()=>{
    let r = ventasR;
    if(filtro==="mes")  r = r.filter(v=>(v.fechaKey||v.fecha||"").slice(0,7)===mesSel);
    if(filtro==="anio") r = r.filter(v=>(v.fechaKey||v.fecha||"").slice(0,4)===mesSel.slice(0,4));
    if(filtro==="dia")  r = diaSel==="todos" ? r : r.filter(v=>v.dia===diaSel);
    return r;
  },[ventasR,filtro,mesSel,diaSel]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalNeto    = filtradas.reduce((a,v)=>a+(v.neto||0),0);
  const totalGan     = filtradas.reduce((a,v)=>a+(v.ganancia||0),0);
  const totalCosto   = filtradas.reduce((a,v)=>a+(v.costo||0),0);
  const cobEfectivo  = filtradas.filter(v=>v.pago==="contado"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoEfec)||0):(v.neto||0)),0);
  const cobTrans     = filtradas.filter(v=>v.pago==="transferencia"||v.pago==="mixto").reduce((a,v)=>a+(v.pago==="mixto"?(Number(v.montoTrans)||0):(v.neto||0)),0);
  const cobFiado     = filtradas.filter(v=>v.pago==="fiado").reduce((a,v)=>a+(v.neto||0),0);
  const cobSaldos    = filtradas.reduce((a,v)=>{const e=(v.pagadoNum||0)-(v.neto||0);return a+(e>0?e:0);},0);
  const porPago      = {contado:cobEfectivo, transferencia:cobTrans, fiado:cobFiado};
  const cantidades   = {};
  productos.forEach(p=>{cantidades[p.nombre]=0;});
  filtradas.forEach(v=>v.detalle.forEach(d=>{cantidades[d.nombre]=(cantidades[d.nombre]||0)+d.cantidad;}));
  const conDeuda     = clientesR.filter(c=>c.saldo<0);
  const conFavor     = clientesR.filter(c=>c.saldo>0);
  const rankingClientes = React.useMemo(()=>{
    const mapa = {};
    filtradas.filter(v=>!v._esCobro&&!v._esAjuste&&!v._esCambio).forEach(v=>{
      if(!mapa[v.clienteId]) mapa[v.clienteId]={id:v.clienteId,nombre:v.cliente,total:0,compras:0};
      mapa[v.clienteId].total += v.neto||0;
      mapa[v.clienteId].compras += 1;
    });
    return Object.values(mapa).sort((a,b)=>b.total-a.total).slice(0,10);
  },[filtradas]);

  // ── Agrupación por mes (para vista anual e histórico) ─────────────────────
  const porMes = {};
  ventasR.forEach(v=>{
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
  },[filtro,mesSel,diaSel,ventasR]);

  // ── Render ────────────────────────────────────────────────────────────────
  const tituloFiltro = filtro==="mes"?`${mesSel.slice(5)}/${mesSel.slice(0,4)}`:filtro==="anio"?mesSel.slice(0,4):"Histórico completo";

  return (
    <div style={s.screen}>
      <HeaderApp titulo="Resumen" onVolver={onVolver}/>

      {/* Selector de repartidor (sólo si hay más de un reparto cargado) */}
      {hayRepartos && (
        <div style={{padding:"10px 14px 0"}}>
          <select style={s.select} value={repartoFiltro} onChange={e=>setRepartoFiltro(e.target.value)}>
            <option value="todos">Todos los repartidores</option>
            {repartos.map(r=>(
              <option key={r.id} value={r.id}>{r.repartidorNombre||r.nombre||r.id}</option>
            ))}
          </select>
        </div>
      )}

      {/* Selector de período */}
      <div style={{padding:"10px 14px 6px"}}>
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {[["mes","Este mes"],["anio","Este año"],["todo","Histórico"],["dia","Por día"]].map(([v,l])=>(
            <button key={v} style={{...s.btn,fontSize:12,padding:"5px 12px",background:filtro===v?"#185FA5":"var(--color-background-tertiary)",color:filtro===v?"#e2eaf4":"var(--color-text-secondary)",border:filtro===v?"none":"0.5px solid var(--color-border-secondary)"}}
              onClick={()=>setFiltro(v)}>{l}</button>
          ))}
          <button style={{...s.btn,fontSize:12,padding:"5px 12px"}} onClick={()=>{
            const total=filtradas.reduce((a,v)=>a+(v.neto||0),0);
            const texto=`*Resumen Reparto App · ${tituloFiltro}*\n\n💰 Efectivo: ${fmt(cobEfectivo)}\n📲 Transfer: ${fmt(cobTrans)}\n📝 Fiado: ${fmt(cobFiado)}\n📦 Total: ${fmt(total)}\n✅ Ganancia: ${fmt(totalGan)}\n\nEntregas: ${filtradas.length} clientes`;
            window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`,"_blank");
          }}>💬 WA</button>
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
            {rankingClientes.length>0&&(
        <>
          <span style={s.sectionTitle}>🏆 Top clientes del período</span>
          <div style={{...s.card,margin:"0 14px 8px",padding:0,overflow:"hidden"}}>
            {rankingClientes.map((c,idx)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",padding:"8px 14px",borderBottom:idx<rankingClientes.length-1?"0.5px solid var(--color-border-tertiary)":"none",gap:10}}>
                <span style={{fontSize:11,fontWeight:700,color:"var(--color-text-tertiary)",minWidth:18,textAlign:"center"}}>
                  {idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":`${idx+1}`}
                </span>
                <span style={{flex:1,fontSize:13,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</span>
                <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{c.compras} compras</span>
                <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-success)"}}>{fmt(c.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
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

function exportarExcel(clientes,ventas,productos,planillas,repartos,filtroReparto){
  const wb=XLSX.utils.book_new();
  const fecha=new Date().toLocaleDateString("es-AR").replace(/\//g,"-");

  // Helper: nombre del repartidor de un cliente
  const getNombreRep=(c)=>{
    if(!repartos||!repartos.length) return "";
    const r=repartos.find(x=>x.id===c.repartoId);
    return r?(r.repartidorNombre||r.nombre||""):"Sin asignar";
  };

  // Filtrar según la selección
  const clientesFilt = (!filtroReparto||filtroReparto==="todos")
    ? clientes
    : clientes.filter(c=>c.repartoId===filtroReparto);
  const clienteIds = new Set(clientesFilt.map(c=>c.id));
  const ventasFilt = (!filtroReparto||filtroReparto==="todos")
    ? ventas
    : ventas.filter(v=>clienteIds.has(v.clienteId));

  // Nombre del reparto seleccionado (para el nombre del archivo)
  const nomRep = (!filtroReparto||filtroReparto==="todos")
    ? "todos"
    : ((repartos||[]).find(r=>r.id===filtroReparto)?.repartidorNombre||"reparto").replace(/\s+/g,"_");

  // Hoja Clientes — con columna Repartidor
  const wsC=XLSX.utils.json_to_sheet(clientesFilt.map(c=>({
    Repartidor:getNombreRep(c),
    ID:c.id, Nombre:c.nombre, "Día":c.dia, Orden:c.orden||"",
    Barrio:c.barrio, Manzana:c.manzana, Lote:c.lote, Calle:c.calle, "N°":c.nro,
    "Teléfono":c.telefono, Maps:c.maps,
    "Sifón":c.sifon, "Bidón 10L":c.bidon10, "Bidón 20L":c.bidon20,
    Dispenser:c.dispenser||0, Saldo:c.saldo, Notas:c.notas||""
  })));
  XLSX.utils.book_append_sheet(wb,wsC,"Clientes");

  // Hoja Ventas — con columna Repartidor
  const fv=[];
  ventasFilt.forEach(v=>{
    const cl=clientes.find(c=>c.id===v.clienteId);
    const repNom=cl?getNombreRep(cl):"";
    v.detalle.forEach(d=>fv.push({
      Repartidor:repNom,
      ID:v.id, Fecha:v.fechaKey||v.fecha, "Día":v.dia, Cliente:v.cliente,
      Producto:d.nombre, Cantidad:d.cantidad, "Precio Unit":d.precio, "Total Prod":d.total,
      "Forma Pago":v.pago, Bruto:v.bruto, Neto:v.neto, Costo:v.costo, Ganancia:v.ganancia,
      Pagado:v.pagadoNum, "Saldo Aplic":v.saldoAplicado||0, Obs:v.obs||""
    }));
  });
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fv.length?fv:[{}]),"Ventas");

  // Hoja Planillas — antes ignoraba filtroReparto y siempre exportaba las
  // planillas de TODOS los repartidores, aunque se hubiera elegido uno
  // solo. La clave de cada planilla es "dia_fecha_repartoId" (claveDiaReparto);
  // se compara esa tercera parte contra filtroReparto igual que en las
  // demás hojas.
  const fp=[];
  Object.entries(planillas).forEach(([clave,p])=>{
    if(filtroReparto && filtroReparto!=="todos"){
      const partes = clave.split("_");
      const repartoIdClave = partes.length>2 ? partes.slice(2).join("_") : null;
      if(repartoIdClave !== filtroReparto) return;
    }
    const partesRep = clave.split("_");
    const repartoIdRep = partesRep.length>2 ? partesRep.slice(2).join("_") : null;
    const nomRepPlanilla = repartoIdRep ? ((repartos||[]).find(r=>r.id===repartoIdRep)?.repartidorNombre||"") : "";
    fp.push({"Día":clave,Repartidor:nomRepPlanilla,Fecha:p.fecha||"",Peso:p.peso||"",Bultos:p.bultos||"","10L Llenos":p.productos?.b10?.llenos||0,"10L Vacíos":p.productos?.b10?.vacios||0,"10L Plata":p.productos?.b10?.plata||0,"10L Llenar":p.productos?.b10?.llenar||0,"20L Llenos":p.productos?.b20?.llenos||0,"20L Vacíos":p.productos?.b20?.vacios||0,"20L Plata":p.productos?.b20?.plata||0,"20L Llenar":p.productos?.b20?.llenar||0,"Soda Llenos":p.productos?.soda?.llenos||0,"Soda Vacíos":p.productos?.soda?.vacios||0,"Soda Plata":p.productos?.soda?.plata||0,"Soda Llenar":p.productos?.soda?.llenar||0,Efectivo:p.efectivo||0,Fiado:p.fiado||0,Retenciones:p.retenciones||0,Gastos:(p.gastos||[]).map(g=>`${g.cat}: $${g.monto}`).join(" | "),"Total Gastos":(p.gastos||[]).reduce((a,g)=>a+(Number(g.monto)||0),0),Obs:p.obs||""});
  });
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fp.length?fp:[{}]),"Planillas");

  // Hoja Saldos — con columna Repartidor
  const fs=clientesFilt.filter(c=>c.saldo!==0).map(c=>({Repartidor:getNombreRep(c),Nombre:c.nombre,"Día":c.dia,Saldo:c.saldo,Estado:c.saldo<0?"Debe":"A favor"}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fs.length?fs:[{}]),"Saldos");

  // Hoja resumen por repartidor (solo si se exportan todos)
  if(!filtroReparto||filtroReparto==="todos"){
    const resumen={};
    clientes.forEach(c=>{
      const k=getNombreRep(c)||"Sin asignar";
      if(!resumen[k])resumen[k]={Repartidor:k,Clientes:0,"10L en calle":0,"20L en calle":0,"Soda en calle":0,"Deben":0};
      resumen[k].Clientes++;
      resumen[k]["10L en calle"]+=c.bidon10||0;
      resumen[k]["20L en calle"]+=c.bidon20||0;
      resumen[k]["Soda en calle"]+=(c.sifon||0);
      if((c.saldo||0)<0) resumen[k]["Deben"]+=Math.abs(c.saldo);
    });
    const fres=Object.values(resumen);
    if(fres.length>0) XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fres),"Por Repartidor");
  }

  XLSX.writeFile(wb,`backup_reparto_${nomRep}_${fecha}.xlsx`);
}

function descargarPlantillaClientes(){
  const wb=XLSX.utils.book_new();
  const cabecera=["Nombre y Apellido *","Día de Reparto *","N° Orden *","Barrio","Calle","Número","Manzana","Lote","Sector","Aclaración / Casa","Teléfono (sin 0/15)","Link Google Maps","Sifones","Bidones 10L","Bidones 20L","Dispenser","Saldo Inicial ($) + a favor / - debe","Notas rápidas"];
  const data=[
    ["SISTEMA DE REPARTO 2026 — Planilla de Carga de Clientes"],
    ["INSTRUCCIONES: Completá los campos obligatorios (*). No modifiques los encabezados. Dejá en blanco lo que no corresponda. Una fila = un cliente."],
    cabecera,
    ["Pérez Juan","Martes",1,"Lomas 600","Av. Principal",123,"","","","Casa verde portón negro","3816559001","",6,2,0,0,0,"Tiene perro"],
    ["García María","Jueves",1,"Barrio Sur","","","C",14,"2","","3815112233","https://maps.app.goo.gl/ejemplo",0,0,2,1,-500,"Deuda del mes anterior"],
    ["López Pedro","Viernes",2,"","Rivadavia",456,"","","","Depto 3B","3814445566","",4,4,1,0,1200,""],
    ["▼ Completá a partir de aquí con los datos reales de tus clientes"],
  ];
  const ws=XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,ws,"Clientes");
  XLSX.writeFile(wb,"plantilla_clientes_SR2026.xlsx");
}

function importarClientesDesdeExcel(file,clientes,setClientes,syncData){
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const wb=XLSX.read(e.target.result,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
      // Buscar fila de encabezados (la que tenga "Nombre")
      let headerIdx=-1;
      for(let i=0;i<Math.min(rows.length,10);i++){
        if(rows[i].some(c=>String(c).toLowerCase().includes("nombre"))){headerIdx=i;break;}
      }
      if(headerIdx===-1){alert("No se encontró la fila de encabezados. Verificá que el archivo tenga una columna 'Nombre'.");return;}
      const headers=rows[headerIdx].map(h=>String(h).toLowerCase().trim());
      const col=(names)=>{for(const n of names){const idx=headers.findIndex(h=>h.includes(n));if(idx!==-1)return idx;}return -1;};
      const C={
        nombre:col(["nombre"]),dia:col(["día de reparto","dia de reparto","día","dia"]),
        orden:col(["n° orden","orden"]),barrio:col(["barrio"]),calle:col(["calle"]),
        numero:col(["número","numero"]),manzana:col(["manzana"]),lote:col(["lote"]),
        aclaracion:col(["aclaración","aclaracion","casa"]),telefono:col(["teléfono","telefono"]),
        maps:col(["maps","google maps"]),sifon:col(["sifon","sifones"]),
        bidon10:col(["10l","bidon 10","bidón 10","bidones 10"]),
        bidon20:col(["20l","bidon 20","bidón 20","bidones 20"]),
        dispenser:col(["dispenser"]),saldo:col(["saldo"]),notas:col(["notas"]),
      };
      const SKIP=["▼","instrucciones","sistema de reparto","completá a partir"];
      const diasValidos=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
      const nuevos=[];
      for(let i=headerIdx+1;i<rows.length;i++){
        const r=rows[i];
        const nombre=C.nombre!==-1?String(r[C.nombre]||"").trim():"";
        if(!nombre||SKIP.some(p=>nombre.toLowerCase().includes(p)))continue;
        const diaRaw=C.dia!==-1?String(r[C.dia]||"").trim():"";
        const dia=diasValidos.find(d=>d.toLowerCase()===diaRaw.toLowerCase())||"Lunes";
        const calle=C.calle!==-1?String(r[C.calle]||"").trim():"";
        const nro=C.numero!==-1?String(r[C.numero]||"").trim():"";
        const acl=C.aclaracion!==-1?String(r[C.aclaracion]||"").trim():"";
        const calleDir=[calle,nro].filter(Boolean).join(" ")||acl;
        nuevos.push({
          id:Date.now()+i,nombre,dia,
          barrio:C.barrio!==-1?String(r[C.barrio]||"").trim():"",
          manzana:C.manzana!==-1?String(r[C.manzana]||"").trim():"",
          lote:C.lote!==-1?String(r[C.lote]||"").trim():"",
          calle:calleDir,
          telefono:C.telefono!==-1?String(r[C.telefono]||"").trim():"",
          maps:C.maps!==-1?String(r[C.maps]||"").trim():"",
          sifon:C.sifon!==-1?Number(r[C.sifon])||0:0,
          bidon10:C.bidon10!==-1?Number(r[C.bidon10])||0:0,
          bidon20:C.bidon20!==-1?Number(r[C.bidon20])||0:0,
          dispenser:C.dispenser!==-1?Number(r[C.dispenser])||0:0,
          saldo:C.saldo!==-1?Number(r[C.saldo])||0:0,
          notas:C.notas!==-1?String(r[C.notas]||"").trim():"",
          orden:C.orden!==-1?Number(r[C.orden])||0:0,
        });
      }
      if(nuevos.length===0){alert("No se encontraron clientes en el archivo. Verificá que hayas completado datos debajo de los encabezados.");return;}
      const dupls=nuevos.filter(nc=>clientes.some(c=>c.nombre.toLowerCase()===nc.nombre.toLowerCase()));
      let finales;
      if(dupls.length>0&&clientes.length>0){
        const msg=`Se encontraron ${nuevos.length} clientes en el Excel.\n\n⚠️ ${dupls.length} ya existen:\n${dupls.map(d=>"• "+d.nombre).join("\n")}\n\n¿Qué querés hacer?\n\n[Aceptar] = REEMPLAZAR TODOS (borra los actuales)\n[Cancelar] = Solo agregar los que NO existen`;
        if(window.confirm(msg)){finales=nuevos;}
        else{const ex=new Set(clientes.map(c=>c.nombre.toLowerCase()));finales=[...clientes,...nuevos.filter(nc=>!ex.has(nc.nombre.toLowerCase()))];}
      } else if(clientes.length>0){
        if(!window.confirm(`Se van a agregar ${nuevos.length} clientes nuevos a los ${clientes.length} existentes. ¿Confirmar?`))return;
        finales=[...clientes,...nuevos];
      } else {
        if(!window.confirm(`Se van a importar ${nuevos.length} clientes. ¿Confirmar?`))return;
        finales=nuevos;
      }
      setClientes(finales);
      if(syncData)syncData({clientes:finales});
      alert(`✅ ${nuevos.length} clientes importados correctamente.`);
    }catch(err){alert("Error al importar: "+err.message);}
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

