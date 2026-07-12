// ════════════════════════════════════════════════════════════════════
// ◆  03-utils.js — debounceSave · useLS · calcVenta · comprimirFoto
// ════════════════════════════════════════════════════════════════════

function debounceSave(fn) {
  _saveQueue = fn;
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=>{
    const f = _saveQueue; _saveQueue = null; _saveTimer = null;
    if(f) f();
  }, 1200);
}
window.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden" && _saveQueue){
    const f=_saveQueue; _saveQueue=null;
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
    f();
  }
});

function useLS(key, fallback) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
    catch { return fallback; }
  });
  // Acepta un valor directo O una función (prev => nuevoValor).
  // La forma función es la segura: React siempre le pasa el estado MÁS
  // reciente, incluso si hay varias llamadas seguidas antes de re-renderizar
  // (evita perder cambios cuando dos acciones se disparan rápido).
  const save = (v) => {
    setVal(prev => {
      const next = (typeof v === "function") ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [val, save];
}

const s = {
  app:{ maxWidth:480, margin:"0 auto", background:"var(--color-background-primary)", minHeight:"100vh", display:"flex", flexDirection:"column" },
  header:{ background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", padding:"10px 14px", display:"flex", alignItems:"center", gap:8, position:"sticky", top:0, zIndex:10 },
  headerTitle:{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", flex:1 },
  backBtn:{ background:"var(--color-background-tertiary)", border:"none", cursor:"pointer", padding:"6px 12px", color:"var(--color-text-secondary)", fontSize:13, borderRadius:8, display:"flex", alignItems:"center", gap:4, fontWeight:500 },
  screen:{ flex:1, paddingBottom:40 },
  card:{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"10px 14px", margin:"6px 14px" },
  label:{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, display:"block" },
  input:{ width:"100%", padding:"8px 10px", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:14, background:"var(--color-background-tertiary)", color:"var(--color-text-primary)", outline:"none", boxSizing:"border-box" },
  inputNum:{ padding:"7px 8px", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:14, background:"var(--color-background-tertiary)", color:"var(--color-text-primary)", outline:"none", textAlign:"right", width:"100%", boxSizing:"border-box" },
  btn:{ border:"0.5px solid var(--color-border-secondary)", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", background:"var(--color-background-tertiary)", color:"var(--color-text-secondary)" },
  btnPrimary:{ background:"#185FA5", color:"#e2eaf4", border:"none", borderRadius:8, padding:"12px 20px", fontSize:14, fontWeight:500, cursor:"pointer", width:"100%" },
  btnDanger:{ background:"var(--color-background-danger)", color:"var(--color-text-danger)", border:"0.5px solid var(--color-border-danger)", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer" },
  row:{ display:"flex", gap:8, alignItems:"center" },
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  grid3:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 },
  metricCard:{ background:"var(--color-background-tertiary)", borderRadius:8, padding:"10px 12px" },
  metricLabel:{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:3 },
  metricVal:{ fontSize:17, fontWeight:500, color:"var(--color-text-primary)" },
  badge:(c)=>({ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:6, background:`var(--color-background-${c})`, color:`var(--color-text-${c})` }),
  tag:{ fontSize:13, fontWeight:500, color:"var(--color-text-secondary)", background:"var(--color-background-tertiary)", borderRadius:8, padding:"3px 9px" },
  divider:{ borderTop:"0.5px solid var(--color-border-tertiary)", margin:"10px 0" },
  sectionTitle:{ fontSize:10, color:"var(--color-text-tertiary)", padding:"12px 14px 4px", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.07em", display:"block" },
  select:{ width:"100%", padding:"8px 10px", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:14, background:"var(--color-background-tertiary)", color:"var(--color-text-primary)", outline:"none", boxSizing:"border-box" },
  tabBar:{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)", padding:"0 14px", gap:4, background:"var(--color-background-secondary)" },
  tab:(a)=>({ padding:"9px 12px", fontSize:13, cursor:"pointer", border:"none", background:"none", color:a?"var(--color-text-primary)":"var(--color-text-tertiary)", fontWeight:a?500:400, borderBottom:a?"2px solid #5daaff":"2px solid transparent" }),
};

function calcVenta(detalle, pago, montoPagado, saldoAplicado, productos) {
  const bruto = detalle.reduce((a,d)=>a+d.total,0);
  const desc = 0; // retención solo en planilla, no afecta el monto de la venta
  const neto = bruto - desc;
  const aPagar = neto - (saldoAplicado||0);
  const pagadoNum = pago==="fiado" ? 0 : (montoPagado!==""&&!isNaN(Number(montoPagado)) ? Number(montoPagado) : aPagar);
  const saldoDelta = pagadoNum - neto;
  const costo = detalle.reduce((a,d)=>{ const p=productos.find(x=>x.nombre===d.nombre); return a+(p?p.costo*d.cantidad:0); },0);
  return { bruto, desc, neto, aPagar, pagadoNum, saldoDelta, costo, ganancia:neto-costo };
}

// Comprime imagen a max 800px y calidad 0.75 antes de guardar
function comprimirFoto(file, maxW=800, quality=0.75) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
}

// ── GENERADOR DE INFORMES PDF ────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════
// ◆  buscarCliente — búsqueda UNIFICADA priorizando el DOMICILIO
//    2 = coincide el domicilio · 1 = nombre/tel/notas · 0 = no
// ════════════════════════════════════════════════════════════════════
function buscarCliente(c, q) {
  const t = (q||"").trim().toLowerCase();
  if(!t) return 1;
  const domicilio = [
    c.calle, c.nro, (c.calle&&c.nro)?`${c.calle} ${c.nro}`:"",
    c.barrio, c.sector, c.aclaracion, c.manzana, c.lote,
    c.manzana?`mz ${c.manzana}`:"", c.lote?`l ${c.lote}`:"",
    (c.manzana&&c.lote)?`mz ${c.manzana} l ${c.lote}`:"",
    (c.manzana&&c.lote)?`manzana ${c.manzana} lote ${c.lote}`:"",
  ].filter(Boolean).join(" · ").toLowerCase();
  if(domicilio.includes(t)) return 2;
  if((c.nombre||"").toLowerCase().includes(t)) return 1;
  if(String(c.telefono||"").includes(t)) return 1;
  if((c.notas||"").toLowerCase().includes(t)) return 1;
  return 0;
}

// ════════════════════════════════════════════════════════════════════
// ◆  PieEnvases — pie de tarjeta de cliente UNIFICADO (todas las listas)
//    Botón ♻️ Envases + botones propios de cada pantalla + panel con Confirmar.
//    Guarda SIEMPRE en c.envAjuste (mecanismo único).
//    Uso: <PieEnvases c={c} ventas={ventas} onEditar={(id,cambios)=>...}
//           izquierda={<botón opcional/>}> {botones derecha opcionales} </PieEnvases>
// ════════════════════════════════════════════════════════════════════
function PieEnvases({c, ventas, onEditar, izquierda, children}) {
  const KEYS=["sifon","bidon10","bidon20","dispenser"];
  const KP={"Sifón 1.5L":"sifon","Bidón 10L":"bidon10","Bidón 20L":"bidon20","Dispenser":"dispenser"};
  const [draft,setDraft]=React.useState(null); // null = panel cerrado
  const calcExtra=()=>{
    const ex={sifon:0,bidon10:0,bidon20:0,dispenser:0};
    (ventas||[]).filter(v=>v.clienteId===c.id).forEach(v=>{
      (v.envPrest||[]).forEach(e=>{const k=KP[e.prod];if(k)ex[k]+=Number(e.cant)||0;});
      (v.envDev||[]).forEach(e=>{const k=KP[e.prod];if(k)ex[k]-=Number(e.cant)||0;});
    });
    return ex;
  };
  const abrir=()=>{
    const ex=calcExtra(), aj=c.envAjuste||{};
    setDraft({
      fijos:Object.fromEntries(KEYS.map(k=>[k,Number(c[k])||0])),
      prest:Object.fromEntries(KEYS.map(k=>[k,(ex[k]||0)+(aj[k]||0)])),
    });
  };
  const confirmar=()=>{
    const ex=calcExtra();
    onEditar(c.id,{
      ...Object.fromEntries(KEYS.map(k=>[k,Math.max(0,draft.fijos[k])])),
      envAjuste:Object.fromEntries(KEYS.map(k=>[k,draft.prest[k]-(ex[k]||0)])),
    });
    setDraft(null);
  };
  const abierto=!!draft;
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",alignItems:"center",gap:6,marginTop:10,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8}}>
        <div>{izquierda||null}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:20,cursor:"pointer",background:abierto?"var(--color-background-warning)":"var(--color-background-tertiary)",color:abierto?"var(--color-text-warning)":"var(--color-text-secondary)",border:abierto?"1px solid var(--color-border-warning)":"0.5px solid var(--color-border-secondary)"}}
            onClick={e=>{e.stopPropagation();abierto?setDraft(null):abrir();}}>♻️ Envases</button>
          {children}
        </div>
      </div>
      {abierto&&(
        <div style={{marginTop:8,background:"var(--color-background-tertiary)",borderRadius:8,padding:"8px 10px"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"grid",gridTemplateColumns:"82px 1fr 1fr 1fr 1fr",gap:4,fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4}}>
            <span></span><span style={{textAlign:"center"}}>Sifón</span><span style={{textAlign:"center"}}>10L</span><span style={{textAlign:"center"}}>20L</span><span style={{textAlign:"center"}}>Disp</span>
          </div>
          {[["fijos","🏠 Fijos"],["prest","📦 Prestados"]].map(([t,l])=>(
            <div key={t} style={{display:"grid",gridTemplateColumns:"82px 1fr 1fr 1fr 1fr",gap:4,alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,color:t==="prest"?"var(--color-text-warning)":"var(--color-text-secondary)"}}>{l}</span>
              {KEYS.map(k=>(
                <input key={k} type="number" value={draft[t][k]}
                  onChange={e=>{const n=Math.round(Number(e.target.value)||0);setDraft(d=>({...d,[t]:{...d[t],[k]:n}}));}}
                  style={{...s.inputNum,padding:"6px 2px",fontSize:14,textAlign:"center",
                    fontWeight:t==="prest"&&draft[t][k]!==0?600:400,
                    color:t==="prest"?(draft[t][k]>0?"var(--color-text-warning)":draft[t][k]<0?"var(--color-text-success)":"var(--color-text-primary)"):"var(--color-text-primary)"}} />
              ))}
            </div>
          ))}
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"2px 0 6px"}}>Prestados = total extra que tiene hoy · 0 = devolvió todo</div>
          <div style={{display:"flex",gap:6}}>
            <button style={{...s.btn,flex:1,fontSize:12}} onClick={e=>{e.stopPropagation();setDraft(null);}}>Cancelar</button>
            <button style={{flex:2,background:"#1d9e75",color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:13,fontWeight:600,cursor:"pointer"}}
              onClick={e=>{e.stopPropagation();confirmar();}}>✓ Confirmar</button>
          </div>
        </div>
      )}
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// ◆  HeaderBotones / HeaderApp — encabezado estándar: "Empresa · Pantalla" + M adentro
//    (Multi usa selector de paletas completo, no toggle claro/oscuro simple)
// ════════════════════════════════════════════════════════════════════
const SCALE_LABELS_LC = ["S","M","L","XL"];
function HeaderBotones() {
  const [scaleIdx,setScaleIdxLocal] = React.useState(()=>{ try{return JSON.parse(localStorage.getItem("rm_scale_v1")||"1");}catch{return 1;} });
  return (
    <button onClick={()=>{ const nv=(scaleIdx+1)%4; setScaleIdxLocal(nv); if(window._setScaleIdxLC) window._setScaleIdxLC(nv); }}
      style={{padding:"6px 10px",borderRadius:8,border:"none",background:"var(--color-background-tertiary)",color:"var(--color-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} title="Tamaño de texto">{SCALE_LABELS_LC[scaleIdx]}</button>
  );
}
function HeaderApp({titulo, onVolver}) {
  const negocio = (()=>{ try{return JSON.parse(localStorage.getItem("rm_licencia")||"null")?.negocio;}catch{return null;} })() || "Sistema de Reparto";
  return (
    <div style={s.header}>
      <button style={s.backBtn} onClick={onVolver}>← Volver</button>
      <span style={{...s.headerTitle,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{titulo?`${negocio} · ${titulo}`:negocio}</span>
      <HeaderBotones/>
    </div>
  );
}
