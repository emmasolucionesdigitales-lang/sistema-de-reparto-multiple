// ════════════════════════════════════════════════════════════════════
// ◆  01-temas.js — Paletas de temas · TEMAS · aplicarTema · getTemaActual
// ════════════════════════════════════════════════════════════════════

const TEMAS = {
  // MODO OSCURO
  "oscuro-azul": {
    nombre:"Océano Oscuro", modo:"oscuro", emoji:"🌊",
    vars:{
      "--color-background-primary":"#0f1923","--color-background-secondary":"#1a2b3c","--color-background-tertiary":"#253647",
      "--color-background-info":"#1e3a5f","--color-background-success":"#0a2e1f","--color-background-warning":"#2e1f06","--color-background-danger":"#2e0a0a",
      "--color-text-primary":"#e2eaf4","--color-text-secondary":"#7a9ab8","--color-text-tertiary":"#4a6a85",
      "--color-text-info":"#5daaff","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070",
      "--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)",
      "--color-accent":"#185FA5","body-bg":"#080f17"
    }
  },
  "oscuro-verde": {
    nombre:"Bosque Oscuro", modo:"oscuro", emoji:"🌿",
    vars:{
      "--color-background-primary":"#0d1f17","--color-background-secondary":"#162e22","--color-background-tertiary":"#1e3d2d",
      "--color-background-info":"#1a3d2f","--color-background-success":"#0a2e1f","--color-background-warning":"#2e2006","--color-background-danger":"#2e0a0a",
      "--color-text-primary":"#e0f0e8","--color-text-secondary":"#7ab898","--color-text-tertiary":"#4a8565",
      "--color-text-info":"#5dff9a","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070",
      "--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)",
      "--color-accent":"#1a8a4a","body-bg":"#060f0a"
    }
  },
  "oscuro-violeta": {
    nombre:"Noche Violeta", modo:"oscuro", emoji:"🔮",
    vars:{
      "--color-background-primary":"#13101f","--color-background-secondary":"#1e1833","--color-background-tertiary":"#2a2045",
      "--color-background-info":"#251a5f","--color-background-success":"#0a2e1f","--color-background-warning":"#2e1f06","--color-background-danger":"#2e0a0a",
      "--color-text-primary":"#ede8f4","--color-text-secondary":"#9a88c8","--color-text-tertiary":"#6a5a95",
      "--color-text-info":"#b87dff","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070",
      "--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)",
      "--color-accent":"#7b3fc9","body-bg":"#080610"
    }
  },
  "oscuro-rojo": {
    nombre:"Carbón Rojo", modo:"oscuro", emoji:"🔥",
    vars:{
      "--color-background-primary":"#1a1010","--color-background-secondary":"#2a1818","--color-background-tertiary":"#3a2020",
      "--color-background-info":"#3a1a1a","--color-background-success":"#0a2e1f","--color-background-warning":"#2e1f06","--color-background-danger":"#3a0a0a",
      "--color-text-primary":"#f4e8e8","--color-text-secondary":"#c88888","--color-text-tertiary":"#956a6a",
      "--color-text-info":"#ff8d8d","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070",
      "--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)",
      "--color-accent":"#c93030","body-bg":"#0f0606"
    }
  },
  "oscuro-gris": {
    nombre:"Pizarra Oscura", modo:"oscuro", emoji:"⚫",
    vars:{
      "--color-background-primary":"#141416","--color-background-secondary":"#1e2024","--color-background-tertiary":"#28292e",
      "--color-background-info":"#1a2235","--color-background-success":"#0a2e1f","--color-background-warning":"#2e2006","--color-background-danger":"#2e0a0a",
      "--color-text-primary":"#e8e8ea","--color-text-secondary":"#8888a0","--color-text-tertiary":"#555565",
      "--color-text-info":"#7aaaff","--color-text-success":"#4dd9a0","--color-text-warning":"#f5b942","--color-text-danger":"#f07070",
      "--color-border-tertiary":"rgba(255,255,255,0.07)","--color-border-secondary":"rgba(255,255,255,0.13)","--color-border-primary":"rgba(255,255,255,0.22)",
      "--color-accent":"#4466cc","body-bg":"#0a0a0c"
    }
  },
  // MODO CLARO
  "claro-azul": {
    nombre:"Cielo Claro", modo:"claro", emoji:"☀️",
    vars:{
      "--color-background-primary":"#f0f4f8","--color-background-secondary":"#ffffff","--color-background-tertiary":"#e4ecf4",
      "--color-background-info":"#dbeafe","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2",
      "--color-text-primary":"#1a2b3c","--color-text-secondary":"#4a6a85","--color-text-tertiary":"#7a9ab8",
      "--color-text-info":"#1d4ed8","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b",
      "--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)",
      "--color-accent":"#185FA5","body-bg":"#dde5ed"
    }
  },
  "claro-verde": {
    nombre:"Primavera", modo:"claro", emoji:"🌱",
    vars:{
      "--color-background-primary":"#f0f7f3","--color-background-secondary":"#ffffff","--color-background-tertiary":"#e0f0e8",
      "--color-background-info":"#d1fae5","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2",
      "--color-text-primary":"#1a2e22","--color-text-secondary":"#3a6a4a","--color-text-tertiary":"#6a9a7a",
      "--color-text-info":"#065f46","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b",
      "--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)",
      "--color-accent":"#1a7a3a","body-bg":"#d5ece0"
    }
  },
  "claro-naranja": {
    nombre:"Arena Cálida", modo:"claro", emoji:"🌅",
    vars:{
      "--color-background-primary":"#fdf6ee","--color-background-secondary":"#ffffff","--color-background-tertiary":"#f7ece0",
      "--color-background-info":"#fef3c7","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2",
      "--color-text-primary":"#2d1f0e","--color-text-secondary":"#7a5a3a","--color-text-tertiary":"#a07a5a",
      "--color-text-info":"#b45309","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b",
      "--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)",
      "--color-accent":"#c05a10","body-bg":"#f0e4d5"
    }
  },
  "claro-violeta": {
    nombre:"Lavanda", modo:"claro", emoji:"💜",
    vars:{
      "--color-background-primary":"#f5f0fc","--color-background-secondary":"#ffffff","--color-background-tertiary":"#ede4f8",
      "--color-background-info":"#ede9fe","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2",
      "--color-text-primary":"#1e1040","--color-text-secondary":"#5a4080","--color-text-tertiary":"#8a70b0",
      "--color-text-info":"#5b21b6","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b",
      "--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)",
      "--color-accent":"#6d28d9","body-bg":"#e8ddf5"
    }
  },
  "claro-gris": {
    nombre:"Minimalista", modo:"claro", emoji:"⚪",
    vars:{
      "--color-background-primary":"#f8f9fa","--color-background-secondary":"#ffffff","--color-background-tertiary":"#eef0f2",
      "--color-background-info":"#e0e7ff","--color-background-success":"#d1fae5","--color-background-warning":"#fef3c7","--color-background-danger":"#fee2e2",
      "--color-text-primary":"#111827","--color-text-secondary":"#4b5563","--color-text-tertiary":"#9ca3af",
      "--color-text-info":"#3730a3","--color-text-success":"#065f46","--color-text-warning":"#92400e","--color-text-danger":"#991b1b",
      "--color-border-tertiary":"rgba(0,0,0,0.07)","--color-border-secondary":"rgba(0,0,0,0.13)","--color-border-primary":"rgba(0,0,0,0.22)",
      "--color-accent":"#374151","body-bg":"#e5e7eb"
    }
  },
};

function aplicarTema(temaId) {
  const tema = TEMAS[temaId];
  if(!tema) return;
  const root = document.documentElement;
  Object.entries(tema.vars).forEach(([k,v])=>{
    if(k==="body-bg") document.body.style.background=v;
    else root.style.setProperty(k,v);
  });
}

function getTemaActual() {
  try { return JSON.parse(localStorage.getItem("sr_tema")||"null") || "oscuro-azul"; } catch { return "oscuro-azul"; }
}

// Aplicar tema al cargar antes de React
(()=>{ try { aplicarTema(getTemaActual()); } catch{} })();

