// ════════════════════════════════════════════════════════════════════
// ◆  02-constantes.js — Constantes globales
// ════════════════════════════════════════════════════════════════════

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// Cargas de salida precargadas por día (soda en unidades: 1 cajón = 6 sifones)
const CARGA_DIA_DEFAULT = {
  "Lunes":     { soda: 0,   b10: 0,  b20: 0  },
  "Martes":    { soda: 90,  b10: 45, b20: 7  },
  "Miércoles": { soda: 60,  b10: 30, b20: 9  },
  "Jueves":    { soda: 120, b10: 45, b20: 14 },
  "Viernes":   { soda: 90,  b10: 30, b20: 7  },
};
const PRODUCTOS_CONFIG = [
  { id: "b10",  nombre: "Bidón 10L",       costoUnit: 800 },
  { id: "b20",  nombre: "Bidón 20L",       costoUnit: 1100 },
  { id: "soda", nombre: "Soda 1.5L (caj)", costoUnit: 880 },
];
const GASTOS_CATEGORIAS = ["propina","mercado","gnc","gaseosa","uber","inflado","frutas","otro"];

const CLIENTES_INICIALES = [];
const PRODUCTOS_INICIALES = [
  { id:1, nombre:"Sifón 1.5L", precio:800,  costo:133.33 },
  { id:2, nombre:"Bidón 10L",  precio:2500, costo:800 },
  { id:3, nombre:"Bidón 20L",  precio:5000, costo:800 },
  { id:4, nombre:"Dispenser",  precio:0,    costo:15000, esDispenser:true },
];

const planillaDiaVacia = () => ({
  fecha:"", peso:"", bultos:"",
  productos:{ b10:{llenos:"",vacios:"",plata:"",llenar:""}, b20:{llenos:"",vacios:"",plata:"",llenar:""}, soda:{llenos:"",vacios:"",plata:"",llenar:""} },
  gastos:[], efectivo:"", fiado:"", retenciones:"", obs:"",
});

const fmt = (n) => "$" + Math.round(Number(n)||0).toLocaleString("es-AR");
const num = (v) => Number(v)||0;

// ─── Cloud Storage (Firebase Firestore) ─────────────────────────────────────
// cloudSave and cloudLoad are defined in the <script> tag above via Firebase SDK

// Debounce save — espera 1.5s después del último cambio antes de guardar
let _saveTimer = null;
let _saveQueue = null;
