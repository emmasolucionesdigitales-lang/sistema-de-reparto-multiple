// ════════════════════════════════════════════════════════════════════
// ◆  01-temas.js — Paletas de temas · TEMAS · aplicarTema · getTemaActual
// ════════════════════════════════════════════════════════════════════

const {
  useState
} = React;
const TEMAS = {
  // MODO OSCURO
  "oscuro-azul": {
    nombre: "Océano Oscuro",
    modo: "oscuro",
    emoji: "🌊",
    vars: {
      "--color-background-primary": "#0f1923",
      "--color-background-secondary": "#1a2b3c",
      "--color-background-tertiary": "#253647",
      "--color-background-info": "#1e3a5f",
      "--color-background-success": "#0a2e1f",
      "--color-background-warning": "#2e1f06",
      "--color-background-danger": "#2e0a0a",
      "--color-text-primary": "#e2eaf4",
      "--color-text-secondary": "#99b2ca",
      "--color-text-tertiary": "#7797b5",
      "--color-text-info": "#5daaff",
      "--color-text-success": "#4dd9a0",
      "--color-text-warning": "#f5b942",
      "--color-text-danger": "#f07070",
      "--color-border-tertiary": "rgba(255,255,255,0.07)",
      "--color-border-secondary": "rgba(255,255,255,0.13)",
      "--color-border-primary": "rgba(255,255,255,0.22)",
      "--color-accent": "#185FA5",
      "body-bg": "#080f17"
    }
  },
  "oscuro-rojo": {
    nombre: "Carbón Rojo",
    modo: "oscuro",
    emoji: "🔥",
    vars: {
      "--color-background-primary": "#1a1010",
      "--color-background-secondary": "#2a1818",
      "--color-background-tertiary": "#3a2020",
      "--color-background-info": "#3a1a1a",
      "--color-background-success": "#0a2e1f",
      "--color-background-warning": "#2e1f06",
      "--color-background-danger": "#3a0a0a",
      "--color-text-primary": "#f4e8e8",
      "--color-text-secondary": "#d5a5a5",
      "--color-text-tertiary": "#c58686",
      "--color-text-info": "#ff8d8d",
      "--color-text-success": "#4dd9a0",
      "--color-text-warning": "#f5b942",
      "--color-text-danger": "#f07070",
      "--color-border-tertiary": "rgba(255,255,255,0.07)",
      "--color-border-secondary": "rgba(255,255,255,0.13)",
      "--color-border-primary": "rgba(255,255,255,0.22)",
      "--color-accent": "#c93030",
      "body-bg": "#0f0606"
    }
  },
  // MODO CLARO
  "claro-azul": {
    nombre: "Cielo Claro",
    modo: "claro",
    emoji: "☀️",
    vars: {
      "--color-background-primary": "#f0f4f8",
      "--color-background-secondary": "#ffffff",
      "--color-background-tertiary": "#e4ecf4",
      "--color-background-info": "#dbeafe",
      "--color-background-success": "#d1fae5",
      "--color-background-warning": "#fef3c7",
      "--color-background-danger": "#fee2e2",
      "--color-text-primary": "#1a2b3c",
      "--color-text-secondary": "#3c576f",
      "--color-text-tertiary": "#4d6d88",
      "--color-text-info": "#1d4ed8",
      "--color-text-success": "#065f46",
      "--color-text-warning": "#92400e",
      "--color-text-danger": "#991b1b",
      "--color-border-tertiary": "rgba(0,0,0,0.07)",
      "--color-border-secondary": "rgba(0,0,0,0.13)",
      "--color-border-primary": "rgba(0,0,0,0.22)",
      "--color-accent": "#185FA5",
      "body-bg": "#dde5ed"
    }
  },
  "claro-naranja": {
    nombre: "Arena Cálida",
    modo: "claro",
    emoji: "🌅",
    vars: {
      "--color-background-primary": "#fdf6ee",
      "--color-background-secondary": "#ffffff",
      "--color-background-tertiary": "#f7ece0",
      "--color-background-info": "#fef3c7",
      "--color-background-success": "#d1fae5",
      "--color-background-warning": "#fef3c7",
      "--color-background-danger": "#fee2e2",
      "--color-text-primary": "#2d1f0e",
      "--color-text-secondary": "#63482d",
      "--color-text-tertiary": "#7d5c3c",
      "--color-text-info": "#b45309",
      "--color-text-success": "#065f46",
      "--color-text-warning": "#92400e",
      "--color-text-danger": "#991b1b",
      "--color-border-tertiary": "rgba(0,0,0,0.07)",
      "--color-border-secondary": "rgba(0,0,0,0.13)",
      "--color-border-primary": "rgba(0,0,0,0.22)",
      "--color-accent": "#c05a10",
      "body-bg": "#f0e4d5"
    }
  }
};
function aplicarTema(temaId) {
  const tema = TEMAS[temaId];
  if (!tema) return;
  const root = document.documentElement;
  Object.entries(tema.vars).forEach(([k, v]) => {
    if (k === "body-bg") document.body.style.background = v;else root.style.setProperty(k, v);
  });
}
function getTemaActual() {
  try {
    return JSON.parse(localStorage.getItem("rm_tema") || "null") || "oscuro-azul";
  } catch {
    return "oscuro-azul";
  }
}

// Aplicar tema al cargar antes de React
(() => {
  try {
    aplicarTema(getTemaActual());
  } catch {}
})();