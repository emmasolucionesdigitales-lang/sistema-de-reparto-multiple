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
  const save = (v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
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
