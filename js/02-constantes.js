// ════════════════════════════════════════════════════════════════════
// ◆  02-constantes.js — Constantes globales
// ════════════════════════════════════════════════════════════════════

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Cargas de salida precargadas por día (soda en unidades: 1 cajón = 6 sifones)
const CARGA_DIA_DEFAULT = {
  "Lunes":     { soda: 0,   b10: 0,  b20: 0  },
  "Martes":    { soda: 90,  b10: 45, b20: 7  },
  "Miércoles": { soda: 60,  b10: 30, b20: 9  },
  "Jueves":    { soda: 120, b10: 45, b20: 14 },
  "Viernes":   { soda: 90,  b10: 30, b20: 7  },
  "Sábado":    { soda: 0,   b10: 0,  b20: 0  },
};
const PRODUCTOS_CONFIG = [
  { id: "b10",  nombre: "Bidón 10L",       costoUnit: 800 },
  { id: "b20",  nombre: "Bidón 20L",       costoUnit: 1100 },
  { id: "soda", nombre: "Soda 1.5L (caj)", costoUnit: 880 },
];
const GASTOS_CATEGORIAS = ["propina","mercado","gnc","gaseosa","uber","inflado","frutas","otro"];

const CLIENTES_INICIALES = [];
// Pedido de Guillermo (19/11/2026, portado de La Catalina / Individual): el
// stock/comodato estaba atado a 4 nombres fijos (sifon/bidon10/bidon20/
// dispenser) en vez de a esta lista de productos. trackStock: tiene su
// propia fila en Stock. retornable: tiene comodato (envases prestados).
// capacidadBase: base por defecto de soderia para ese producto.
const PRODUCTOS_INICIALES = [
  { id:1, nombre:"Sifón 1.5L", precio:800,  costo:133.33, trackStock:true, retornable:true, capacidadBase:150 },
  { id:2, nombre:"Bidón 10L",  precio:2500, costo:800, trackStock:true, retornable:true, capacidadBase:70 },
  { id:3, nombre:"Bidón 20L",  precio:5000, costo:800, trackStock:true, retornable:true, capacidadBase:21 },
  { id:4, nombre:"Dispenser",  precio:0,    costo:15000, esDispenser:true, trackStock:true, retornable:true, capacidadBase:0 },
];
// Mapa de migracion: nombre del producto clasico -> clave vieja fija con la
// que estaba guardado su stock/comodato antes de esta lista (ver
// claveStockDeProducto en 03-utils.js).
const CLAVE_LEGACY_POR_NOMBRE = {
  "Sifón 1.5L": "sifon",
  "Bidón 10L": "bidon10",
  "Bidón 20L": "bidon20",
  "Dispenser": "dispenser",
};
// Lo mismo que CLAVE_LEGACY_POR_NOMBRE pero para el "cierre del dia" / "carga
// por dia" (08-menu.js, 07-stock.js, 15-config.js), que usa sus propias 3
// claves cortas de siempre (soda/b10/b20). Un producto nuevo no tiene clave
// corta: usa directamente su propia clave de stock (ver claveCargaDeProducto
// en 03-utils.js).
const PL_LEGACY_POR_NOMBRE = {
  "Sifón 1.5L": "soda",
  "Bidón 10L": "b10",
  "Bidón 20L": "b20",
};

const planillaDiaVacia = () => ({
  fecha:"", peso:"", bultos:"",
  productos:{ b10:{llenos:"",vacios:"",plata:"",llenar:""}, b20:{llenos:"",vacios:"",plata:"",llenar:""}, soda:{llenos:"",vacios:"",plata:"",llenar:""} },
  gastos:[], efectivo:"", fiado:"", retenciones:"", obs:"",
});

const fmt = (n) => "$" + Math.round(Number(n)||0).toLocaleString("es-AR");
const num = (v) => Number(v)||0;

// Clave de planilla por día — en la app Multiple cada reparto (camión) tiene
// su propia planilla para el mismo día/fecha, así que el reparto se suma a
// la clave. Si no hay repartoId (casos legacy/sin repartos) cae al formato
// simple dia_fecha para no romper compatibilidad con datos viejos.
function claveDiaReparto(dia, fecha, repartoId) {
  return repartoId ? `${dia}_${fecha}_${repartoId}` : `${dia}_${fecha}`;
}

// Stock vacío para el camión de un reparto — mismo shape que soderia /
// soderia_vacios / casa. Se usa para inicializar un camión nuevo y para
// vaciarlo al cerrar el día (su contenido ya se volcó a sodería/depósito).
function stockCamionVacio() {
  // Pedido de Guillermo (19/11/2026, portado de La Catalina / Individual):
  // antes fijo a 4 claves (sifon/bidon10/bidon20/dispenser) -- ahora se arma
  // desde la lista real de productos (window._rmProductos, expuesta en
  // 17-app.js igual que window._srProductos en Individual), asi un producto
  // nuevo con "controla stock" tiene lugar en el camion tambien. Si todavia
  // no se cargo esa lista (caso raro, muy al principio), cae a las 4 de
  // siempre para no romper nada.
  const productos = (typeof window !== "undefined" && window._rmProductos) || [];
  const claves = productos.filter(p => p.trackStock !== false).map(p => claveStockDeProducto(p));
  const o = {};
  (claves.length ? claves : ["sifon", "bidon10", "bidon20", "dispenser"]).forEach(k => { o[k] = 0; });
  return o;
}

// ─── Cloud Storage (Firebase Firestore) ─────────────────────────────────────
// cloudSave and cloudLoad are defined in the <script> tag above via Firebase SDK

// Debounce save — espera 1.5s después del último cambio antes de guardar
let _saveTimer = null;
let _saveQueue = null;
