// ════════════════════════════════════════════════════════════════════
// ◆  01-temas.js — Paletas de temas
// ════════════════════════════════════════════════════════════════════

// ── PALETAS DE TEMAS ─────────────────────────────────────────────────────────
const TEMAS_LC = {
  "oscuro-azul":    { nombre:"Océano Oscuro",   modo:"oscuro", emoji:"🌊", vars:{"--color-background-primary":"#0f1923","--color-background-secondary":"#1a2b3c","--color-background-tertiary":"#253647","--color-background-info":"#1e3a5f","--color-background-success":"#0a2e1f","--color-background-warning":"#2e1f06","--color-background-danger":"#2e0a0a","--color-text-primary":"#e2eaf4","--color-text-secondary":"#99b2ca","--color-text-tertiary":"#7797b5","--color-text-info":"#5daaff","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070","--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)","--color-accent":"#185FA5","body-bg":"#080f17"} },
  "oscuro-rojo":    { nombre:"Carbón Rojo",     modo:"oscuro", emoji:"🔥", vars:{"--color-background-primary":"#1a1010","--color-background-secondary":"#2a1818","--color-background-tertiary":"#3a2020","--color-background-info":"#3a1a1a","--color-background-success":"#0a2e1f","--color-background-warning":"#2e1f06","--color-background-danger":"#3a0a0a","--color-text-primary":"#f4e8e8","--color-text-secondary":"#d5a5a5","--color-text-tertiary":"#c58686","--color-text-info":"#ff8d8d","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070","--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)","--color-accent":"#c93030","body-bg":"#0f0606"} },
  "claro-azul":     { nombre:"Cielo Claro",     modo:"claro",  emoji:"☀️", vars:{"--color-background-primary":"#f0f4f8","--color-background-secondary":"#ffffff","--color-background-tertiary":"#e4ecf4","--color-background-info":"#dbeafe","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2","--color-text-primary":"#1a2b3c","--color-text-secondary":"#3c576f","--color-text-tertiary":"#4d6d88","--color-text-info":"#1d4ed8","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b","--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)","--color-accent":"#185FA5","body-bg":"#dde5ed"} },
  "claro-naranja":  { nombre:"Arena Cálida",    modo:"claro",  emoji:"🌅", vars:{"--color-background-primary":"#fdf6ee","--color-background-secondary":"#ffffff","--color-background-tertiary":"#f7ece0","--color-background-info":"#fef3c7","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2","--color-text-primary":"#2d1f0e","--color-text-secondary":"#63482d","--color-text-tertiary":"#7d5c3c","--color-text-info":"#b45309","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b","--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)","--color-accent":"#c05a10","body-bg":"#f0e4d5"} },
};

// ── ESTILO METÁLICO — versión con relieve de cada color de arriba ────────
// No son temas nuevos con su propia paleta: son los MISMOS colores de
// arriba, con la manija en "metálico" en vez de "clásico". Por eso se arman
// solos acá abajo, copiando los vars de cada uno — si mañana cambiás un
// color en un tema clásico, el metálico lo sigue automáticamente.
Object.keys(TEMAS_LC).forEach(id=>{
  const base = TEMAS_LC[id];
  TEMAS_LC[id+"-metal"] = { nombre:base.nombre, modo:base.modo, emoji:"⚙️", relieve:true, vars:base.vars };
});
function _ajustarColorLC(hex, amt) {
  hex = (hex||"").replace("#","");
  if(hex.length!==6) return "#"+hex;
  const canal = (i) => Math.max(0,Math.min(255, parseInt(hex.substring(i,i+2),16)+amt)).toString(16).padStart(2,"0");
  return "#"+canal(0)+canal(2)+canal(4);
}
// Los temas "Metálico" (relieve/fibra de carbono) se sacaron para
// simplificar — eran 10 variantes extra (el doble de superficie para
// mantener) que complicaban probar cualquier cambio visual sin revisar las
// 20 combinaciones. El resguardo de aplicarTemaLC (más abajo) hace que
// quien tuviera un Metálico elegido caiga solo a su versión Clásica.

// ── RELIEVE — el degradado vive DENTRO de la variable de color ────────────
// Todas las pantallas ya pintan sus tarjetas y botones con
// background:"var(--color-background-tertiary)" (o secondary, o accent).
// Una variable CSS puede contener un degradado igual que un color plano —
// así que en vez de tocar cada pantalla, acá redefinimos esas 3 variables
// para que en vez de un color liso tengan un linear-gradient. Se aplica
// solo, en todos lados, apenas cambia la variable — sin re-render de React.
function _generarRelieveVarsLC(vars, modo) {
  const bgSec  = vars["--color-background-secondary"];
  const bgTer  = vars["--color-background-tertiary"];
  const accent = vars["--color-accent"];
  const oscuro = modo === "oscuro";
  return {
    "--color-background-secondary": `linear-gradient(180deg, ${_ajustarColorLC(bgSec, oscuro?46:34)} 0%, ${_ajustarColorLC(bgSec, oscuro?-22:-20)} 100%)`,
    "--color-background-tertiary":  `linear-gradient(180deg, ${_ajustarColorLC(bgTer, oscuro?54:38)} 0%, ${_ajustarColorLC(bgTer, oscuro?8:2)} 45%, ${_ajustarColorLC(bgTer, oscuro?-26:-30)} 100%)`,
    "--color-accent":               `linear-gradient(180deg, ${_ajustarColorLC(accent,60)} 0%, ${accent} 45%, ${_ajustarColorLC(accent,-45)} 100%)`,
  };
}
// ── SOMBRA GLOBAL — el relieve de verdad ──────────────────────────────────
// Casi toda la app arma sus botones con <button> (los días, los accesos
// rápidos, Clientes/Stock/Config, etc.) y sus campos con <input>/<select>/
// <textarea> — así que una sola regla de CSS con !important le agrega
// bisel, forma, borde y tipografía a TODOS a la vez, sin tocar ninguna
// pantalla puntual. Los botones quedan elevados (relieve hacia afuera);
// los campos de carga quedan hundidos (como una ranura, al revés) — así se
// distingue de un vistazo qué se toca y dónde se escribe.
function _aplicarSombraGlobalLC(tema) {
  let tag = document.getElementById("relieve-global-lc");
  if(!tag){ tag = document.createElement("style"); tag.id = "relieve-global-lc"; document.head.appendChild(tag); }
  if(!tema.relieve){ tag.textContent = ""; return; }
  const oscuro = tema.modo === "oscuro";
  const sombraBtn = oscuro
    ? "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -4px 8px rgba(0,0,0,0.5), 0 4px 0 rgba(0,0,0,0.75), 0 7px 12px rgba(0,0,0,0.55)"
    : "inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -3px 6px rgba(0,0,0,0.14), 0 3px 0 rgba(0,0,0,0.28), 0 5px 10px rgba(0,0,0,0.22)";
  const sombraInput = oscuro
    ? "inset 0 2px 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06)"
    : "inset 0 2px 4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8)";
  const sombraBadge = oscuro
    ? "0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)"
    : "0 2px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6)";
  const borde = oscuro ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)";
  const bordeInput = oscuro ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)";
  const textShadow = oscuro ? "0 1px 1px rgba(0,0,0,0.7)" : "0 1px 0 rgba(255,255,255,0.6)";
  tag.textContent = `
    button:not(.no-relieve){
      box-shadow:${sombraBtn} !important;
      border:1px solid ${borde} !important;
      border-radius:9px !important;
      font-weight:700 !important;
      letter-spacing:0.02em !important;
      text-shadow:${textShadow} !important;
      transition:box-shadow .12s, transform .05s;
    }
    button:not(.no-relieve):active{ transform:translateY(2px); box-shadow:inset 0 2px 4px rgba(0,0,0,0.5) !important; }
    input:not(.no-relieve), select:not(.no-relieve), textarea:not(.no-relieve){
      box-shadow:${sombraInput} !important;
      border:1px solid ${bordeInput} !important;
      border-radius:7px !important;
    }
    span[style*="border-radius: 50%"], span[style*="border-radius:50%"]{
      box-shadow:${sombraBadge} !important;
    }
  `;
}
// ── FIBRA DE CARBONO — propiedades separadas, no todo en una variable ─────
// El contenedor de toda la app pinta con background:"var(--color-background-
// primary)" — por eso antes la textura no se veía "adentro": estaba puesta
// solo en <body>, y el contenedor (que tapa todo el ancho/alto) mostraba su
// color de siempre por encima. Ahora se inyecta como regla CSS directa con
// !important, apuntando a "#root > div" (el contenedor real que arma
// React) — más confiable que meter todo el patrón adentro de una sola
// variable CSS.
function _capasFibraCarbonoLC(bg, oscuro) {
  const hilo   = _ajustarColorLC(bg, oscuro?16:10);
  const cruce  = _ajustarColorLC(bg, oscuro?24:16);
  const sombra = _ajustarColorLC(bg, oscuro?-6:-5);
  return {
    image: [
      `linear-gradient(27deg, ${hilo} 5px, transparent 5px)`,
      `linear-gradient(207deg, ${hilo} 5px, transparent 5px)`,
      `linear-gradient(27deg, ${hilo} 5px, transparent 5px)`,
      `linear-gradient(207deg, ${hilo} 5px, transparent 5px)`,
      `linear-gradient(90deg, ${sombra} 10px, transparent 10px)`,
      `linear-gradient(${sombra} 25%, transparent 25%, transparent 75%, ${sombra} 75%, ${sombra})`,
      `linear-gradient(90deg, ${cruce} 10px, transparent 10px)`,
      `linear-gradient(${cruce} 25%, transparent 25%, transparent 75%, ${cruce} 75%, ${cruce})`,
    ].join(", "),
    position: "0 0, 0 0, 10px 10px, 10px 10px, 0 0, 0 0, 10px 10px, 10px 10px",
  };
}
// Encuentra el div raíz de la app buscando por un estilo que sabemos que
// tiene siempre (min-height:100vh, de s.app en 03-utils.js) — más seguro
// que adivinar un selector CSS que puede no coincidir con el HTML real.
function _contenedorAppLC() {
  const candidatos = document.querySelectorAll("#root div, #root main, #root section");
  for(const el of candidatos){
    if(el.style && el.style.minHeight === "100vh") return el;
  }
  const raiz = document.getElementById("root");
  return raiz ? raiz.firstElementChild : null;
}
function aplicarTemaLC(temaId) {
  let tema = TEMAS_LC[temaId];
  if(!tema){
    // El tema pedido no existe (por ejemplo, tenía un "-metal" elegido de
    // cuando existía ese estilo). En vez de dejar la app sin ningún tema
    // aplicado, cae a la versión base, y si tampoco existe, a un default fijo.
    const base = (temaId||"").replace(/-metal$/,"");
    temaId = TEMAS_LC[base] ? base : "oscuro-azul";
    tema = TEMAS_LC[temaId];
    try { localStorage.setItem("lc_tema", JSON.stringify(temaId)); } catch {}
  }
  const root = document.documentElement;
  Object.entries(tema.vars).forEach(([k,v])=>{ if(k!=="body-bg") root.style.setProperty(k,v); });
  const cont = _contenedorAppLC();
  if(tema.relieve){
    const rel = _generarRelieveVarsLC(tema.vars, tema.modo);
    Object.entries(rel).forEach(([k,v])=>root.style.setProperty(k,v));
    const oscuro = tema.modo==="oscuro";
    const capasApp  = _capasFibraCarbonoLC(tema.vars["--color-background-primary"], oscuro);
    const capasBody = _capasFibraCarbonoLC(tema.vars["body-bg"], oscuro);
    if(cont){
      cont.style.backgroundColor = tema.vars["--color-background-primary"];
      cont.style.backgroundImage = capasApp.image;
      cont.style.backgroundSize = "20px 20px";
      cont.style.backgroundPosition = capasApp.position;
    }
    // <html> también, no solo <body> — así no queda un hueco blanco abajo
    // si el documento termina siendo más alto que lo que <body> cubre.
    [document.body, root].forEach(el=>{
      el.style.backgroundColor = tema.vars["body-bg"];
      el.style.backgroundImage = capasBody.image;
      el.style.backgroundSize = "20px 20px";
      el.style.backgroundPosition = capasBody.position;
    });
  } else {
    // Clásico: sin textura, todo vuelve a ser liso.
    if(cont){
      cont.style.backgroundImage = "none";
      cont.style.backgroundColor = "";
      cont.style.backgroundSize = "";
      cont.style.backgroundPosition = "";
    }
    [document.body, root].forEach(el=>{
      el.style.backgroundImage = "none";
      el.style.backgroundColor = tema.vars["body-bg"];
      el.style.backgroundSize = "";
      el.style.backgroundPosition = "";
    });
  }
  _aplicarSombraGlobalLC(tema);
}
function getTemaLC() { try { return JSON.parse(localStorage.getItem("lc_tema")||'"oscuro-azul"'); } catch { return "oscuro-azul"; } }
(()=>{
  try { aplicarTemaLC(getTemaLC()); } catch{}
  // El contenedor de la app todavía no existe acá (React recién lo crea
  // después de que carguen TODOS los archivos, al final de index.html).
  // En cuanto aparezca, reaplicamos una vez más para que la fibra de
  // carbono llegue también ahí adentro, no solo al fondo de la página.
  const raiz = document.getElementById("root");
  if(raiz && window.MutationObserver){
    const obs = new MutationObserver(()=>{
      if(raiz.firstElementChild){ try{ aplicarTemaLC(getTemaLC()); }catch{} obs.disconnect(); }
    });
    obs.observe(raiz, {childList:true});
  }
})();

const { useState } = React;

