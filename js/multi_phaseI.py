# -*- coding: utf-8 -*-
# Generaliza el motor de cierre del dia en 08-menu.js de Multi
# (PlanillaDelDia + InicioReparto), mismo patron ya aplicado en Individual
# (08-menu.js) hoy: las claves cortas fijas soda/b10/b20 pasan a armarse
# dinamicamente desde los productos reales marcados para ir al camion
# (productosDeCarga/claveCargaDeProducto, 03-utils.js). Decision explicita
# de Guillermo (20/11/2026): generalizarlo tambien en Multi, no dejarlo
# atado a los 3 de siempre.
path = "08-menu.js"
src = open(path, encoding="utf-8").read()
edits = []

# ── Edit 1: helpers de generalizacion (clavesCarga/ceroCarga/etc) ──────────
old1 = '''  const ventasExtraDia = ventas.filter(v => !clientesDia.has(v.clienteId) && (!v.dia || v.dia === dia) && v.fechaKey === fecha);
  // Auto-calcular desde ventas del dia
  const CAJON_SODA = 6;'''
new1 = '''  const ventasExtraDia = ventas.filter(v => !clientesDia.has(v.clienteId) && (!v.dia || v.dia === dia) && v.fechaKey === fecha);
  // Pedido de Guillermo (20/11/2026, portado de Individual/La Catalina): el
  // cierre del día usaba 3 claves cortas fijas (soda/b10/b20) sin relación
  // con las de stock, y dejaba afuera cualquier producto nuevo. Ahora se
  // arma sola, a partir de los productos reales marcados para ir al camión
  // (ver productosDeCarga/claveCargaDeProducto en 03-utils.js).
  const productosCarga = productosDeCarga(productos);
  const clavesCarga = productosCarga.map(claveCargaDeProducto);
  const ceroCarga = () => Object.fromEntries(clavesCarga.map(k => [k, 0]));
  const dispProd = (productos || []).find(p => p.esDispenser);
  const dispNombre = dispProd ? dispProd.nombre : "Dispenser";
  const nombreAPk = Object.fromEntries(productosCarga.map(p => [p.nombre, claveCargaDeProducto(p)]));
  const labelCorto = p => (p && p.nombre || "").replace(" 1.5L", "");
  const prodsCargaUI = productosCarga.map(p => ({ id: claveCargaDeProducto(p), nombre: p.nombre, costoUnit: p.costo || 0 }));
  const planKeyToStockKey = Object.fromEntries(productosCarga.map(p => [claveCargaDeProducto(p), claveStockDeProducto(p)]));
  // Peso/bultos de productos "extra" (más allá de soda/b10/b20) que van al
  // camión y tienen un peso cargado (kg por unidad) -- opcional, no inventa
  // ningún número si el producto no tiene peso asignado.
  const otrosProdsCarga = productosCarga.filter(p => !["soda", "b10", "b20"].includes(claveCargaDeProducto(p)));
  // Auto-calcular desde ventas del dia
  const CAJON_SODA = 6;'''
edits.append(("edit1 helpers clavesCarga/ceroCarga/etc", old1, new1))

# ── Edit 2: prodKey/totalesPorProd dinamicos ───────────────────────────────
old2 = '''  const prodKey = {
    "Bidón 10L": "b10",
    "Bidón 20L": "b20",
    "Sifón 1.5L": "soda"
  };
  // Solo ventas de clientes propios del día
  const totalesPorProd = {
    b10: {
      vacios: 0,
      plata: 0,
      llenar: 0
    },
    b20: {
      vacios: 0,
      plata: 0,
      llenar: 0
    },
    soda: {
      vacios: 0,
      plata: 0,
      llenar: 0,
      cajones: 0
    }
  };'''
new2 = '''  const prodKey = nombreAPk;
  // Solo ventas de clientes propios del día
  const totalesPorProd = Object.fromEntries(clavesCarga.map(pk => [
    pk,
    pk === "soda" ? { vacios: 0, plata: 0, llenar: 0, cajones: 0 } : { vacios: 0, plata: 0, llenar: 0 }
  ]));'''
edits.append(("edit2 prodKey/totalesPorProd dinamicos", old2, new2))

# ── Edit 3: llenar de productos extra (mas alla de soda/b10/b20) ──────────
old3 = '''  const sodaCajones = Math.floor(totalesPorProd.soda.vacios / CAJON_SODA) || 0;
  totalesPorProd.soda.cajones = sodaCajones;
  totalesPorProd.soda.llenar = sodaCajones * COSTO_CAJON_SODA;
  totalesPorProd.b10.llenar = totalesPorProd.b10.vacios * costB10;
  totalesPorProd.b20.llenar = totalesPorProd.b20.vacios * costB20;'''
new3 = '''  const sodaCajones = Math.floor(totalesPorProd.soda.vacios / CAJON_SODA) || 0;
  totalesPorProd.soda.cajones = sodaCajones;
  totalesPorProd.soda.llenar = sodaCajones * COSTO_CAJON_SODA;
  totalesPorProd.b10.llenar = totalesPorProd.b10.vacios * costB10;
  totalesPorProd.b20.llenar = totalesPorProd.b20.vacios * costB20;
  productosCarga.forEach(p => {
    const pk = claveCargaDeProducto(p);
    if (pk === "soda" || pk === "b10" || pk === "b20") return;
    totalesPorProd[pk].llenar = totalesPorProd[pk].vacios * (p.costo || 0);
  });'''
edits.append(("edit3 llenar productos extra", old3, new3))

# ── Edit 4: seed inicial de peso/bultos incluye productos extra ───────────
old4 = '''    const _cajInit = Math.floor(_sLlenos / (CAJON_SODA || 6));
    const _pesoInit = _cajInit * 13 + _b10Init * 10 + _b20Init * 20;
    const _bultosInit = _cajInit + _b10Init + _b20Init;'''
new4 = '''    const _cajInit = Math.floor(_sLlenos / (CAJON_SODA || 6));
    // Peso/bultos de productos "extra" (más allá de soda/b10/b20) -- solo
    // suma si el producto tiene un peso (kg por unidad) cargado.
    const _otrosPeso = otrosProdsCarga.reduce((acc, p) => acc + Number(planilla?.productos?.[claveCargaDeProducto(p)]?.llenos || 0) * (Number(p.peso) || 0), 0);
    const _otrosBultos = otrosProdsCarga.reduce((acc, p) => acc + Number(planilla?.productos?.[claveCargaDeProducto(p)]?.llenos || 0), 0);
    const _pesoInit = _cajInit * 13 + _b10Init * 10 + _b20Init * 20 + _otrosPeso;
    const _bultosInit = _cajInit + _b10Init + _b20Init + _otrosBultos;'''
edits.append(("edit4 seed peso/bultos con extras", old4, new4))

# ── Edit 5: llenosCargados dinamico + pesoAuto/bultosAuto con extras ──────
old5 = '''  const llenosCargados = {
    soda: Number(datos.productos?.soda?.llenos || 0),
    b10: Number(datos.productos?.b10?.llenos || 0),
    b20: Number(datos.productos?.b20?.llenos || 0)
  };
  // Peso y bultos calculados desde los productos cargados
  const cajonesLlenos = Math.floor((llenosCargados.soda || 0) / CAJON_SODA);
  const b10Llenos = llenosCargados.b10 || 0;
  const b20Llenos = llenosCargados.b20 || 0;
  const pesoAuto = cajonesLlenos * 13 + b10Llenos * 10 + b20Llenos * 20;
  const bultosAuto = cajonesLlenos + b10Llenos + b20Llenos;'''
new5 = '''  const llenosCargados = Object.fromEntries(clavesCarga.map(pk => [pk, Number(datos.productos?.[pk]?.llenos || 0)]));
  // Peso y bultos calculados desde los productos cargados
  const cajonesLlenos = Math.floor((llenosCargados.soda || 0) / CAJON_SODA);
  const b10Llenos = llenosCargados.b10 || 0;
  const b20Llenos = llenosCargados.b20 || 0;
  const pesoExtra = otrosProdsCarga.reduce((acc, p) => acc + Number(llenosCargados[claveCargaDeProducto(p)] || 0) * (Number(p.peso) || 0), 0);
  const bultosExtra = otrosProdsCarga.reduce((acc, p) => acc + Number(llenosCargados[claveCargaDeProducto(p)] || 0), 0);
  const pesoAuto = cajonesLlenos * 13 + b10Llenos * 10 + b20Llenos * 20 + pesoExtra;
  const bultosAuto = cajonesLlenos + b10Llenos + b20Llenos + bultosExtra;'''
edits.append(("edit5 llenosCargados/pesoAuto/bultosAuto dinamicos", old5, new5))

# ── Edit 6: vendidosDia/prestadosDia/devueltosDia dinamicos ───────────────
old6 = '''  const vendidosDia = {
    soda: 0,
    b10: 0,
    b20: 0,
    disp: 0
  };
  const prestadosDia = {
    soda: 0,
    b10: 0,
    b20: 0,
    disp: 0
  };
  const devueltosDia = {
    soda: 0,
    b10: 0,
    b20: 0,
    disp: 0
  };'''
new6 = '''  const vendidosDia = { ...ceroCarga(), disp: 0 };
  const prestadosDia = { ...ceroCarga(), disp: 0 };
  const devueltosDia = { ...ceroCarga(), disp: 0 };'''
edits.append(("edit6 vendidosDia/prestadosDia/devueltosDia dinamicos", old6, new6))

# ── Edit 7: sobrantes/vaciosRec dinamicos ──────────────────────────────────
old7 = '''  const sobrantes = {
    soda: Math.max(0, llenosCargados.soda - vendidosDia.soda),
    b10: Math.max(0, llenosCargados.b10 - vendidosDia.b10),
    b20: Math.max(0, llenosCargados.b20 - vendidosDia.b20)
  };
  const vaciosRec = {
    soda: Math.max(0, vendidosDia.soda + devueltosDia.soda - prestadosDia.soda),
    b10: Math.max(0, vendidosDia.b10 + devueltosDia.b10 - prestadosDia.b10),
    b20: Math.max(0, vendidosDia.b20 + devueltosDia.b20 - prestadosDia.b20)
  };
  // Sodería actual (antes del cierre) — para mostrar "quedará en" por fila
  const convPk = {
    soda: "sifon",
    b10: "bidon10",
    b20: "bidon20"
  };
  const soderiaActual = stock?.soderia || {};'''
new7 = '''  const sobrantes = Object.fromEntries(clavesCarga.map(pk => [pk, Math.max(0, (llenosCargados[pk] || 0) - (vendidosDia[pk] || 0))]));
  const vaciosRec = Object.fromEntries(clavesCarga.map(pk => [pk, Math.max(0, (vendidosDia[pk] || 0) + (devueltosDia[pk] || 0) - (prestadosDia[pk] || 0))]));
  // Sodería actual (antes del cierre) — para mostrar "quedará en" por fila
  const soderiaActual = stock?.soderia || {};'''
edits.append(("edit7 sobrantes/vaciosRec dinamicos + quitar convPk", old7, new7))

# ── Edit 8: enClientesPrestado dinamico ────────────────────────────────────
old8 = '''  const enClientesPrestado = { soda: 0, b10: 0, b20: 0 };
  (clientes || []).forEach(c => {
    ["soda", "b10", "b20"].forEach(pk => {
      const sk = convPk[pk];
      enClientesPrestado[pk] += prestadoClienteDe(c, sk, ventas);
    });
  });'''
new8 = '''  const enClientesPrestado = ceroCarga();
  (clientes || []).forEach(c => {
    clavesCarga.forEach(pk => {
      const sk = planKeyToStockKey[pk];
      enClientesPrestado[pk] += prestadoClienteDe(c, sk, ventas);
    });
  });'''
edits.append(("edit8 enClientesPrestado dinamico", old8, new8))

# ── Edit 9: CAPACIDAD_FIJA dinamico ────────────────────────────────────────
old9 = '''  const capFijaGuardada = (stock?.capacidadFijaPorReparto || {})[repartoId];
  const CAPACIDAD_FIJA = capFijaGuardada && (capFijaGuardada.soda || capFijaGuardada.b10 || capFijaGuardada.b20) ? capFijaGuardada : {
    soda: (stock?.soderia?.sifon || 0) + (stock?.soderia_vacios?.sifon || 0) + enClientesPrestado.soda,
    b10: (stock?.soderia?.bidon10 || 0) + (stock?.soderia_vacios?.bidon10 || 0) + enClientesPrestado.b10,
    b20: (stock?.soderia?.bidon20 || 0) + (stock?.soderia_vacios?.bidon20 || 0) + enClientesPrestado.b20
  };'''
new9 = '''  const capFijaGuardada = (stock?.capacidadFijaPorReparto || {})[repartoId];
  const CAPACIDAD_FIJA = capFijaGuardada && clavesCarga.some(pk => capFijaGuardada[pk]) ? capFijaGuardada : Object.fromEntries(clavesCarga.map(pk => {
    const sk = planKeyToStockKey[pk];
    return [pk, (stock?.soderia?.[sk] || 0) + (stock?.soderia_vacios?.[sk] || 0) + (enClientesPrestado[pk] || 0)];
  }));'''
edits.append(("edit9 CAPACIDAD_FIJA dinamico", old9, new9))

# ── Edit 10: guardarCapacidadFija usa ceroCarga como default ──────────────
old10 = '''      if (!s2.capacidadFijaPorReparto[repartoId]) s2.capacidadFijaPorReparto[repartoId] = { soda: 0, b10: 0, b20: 0 };'''
new10 = '''      if (!s2.capacidadFijaPorReparto[repartoId]) s2.capacidadFijaPorReparto[repartoId] = ceroCarga();'''
edits.append(("edit10 guardarCapacidadFija default dinamico", old10, new10))

# ── Edit 11: necesarioManana default dinamico ──────────────────────────────
old11 = '''  const necesarioManana = cargasDia && cargasDia[diaSiguiente] || {
    soda: 0,
    b10: 0,
    b20: 0
  };'''
new11 = '''  const necesarioManana = cargasDia && cargasDia[diaSiguiente] || ceroCarga();'''
edits.append(("edit11 necesarioManana default dinamico", old11, new11))

# ── Edit 12: paraLlenarCalc/vaciosRestoCalc dinamicos ──────────────────────
old12 = '''  const paraLlenarCalc = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  const vaciosRestoCalc = {
    soda: 0,
    b10: 0,
    b20: 0
  };
  ["soda", "b10", "b20"].forEach(pk => {
    const sk = convPk[pk];
    const llenosHoy = pk === "soda" ? Math.floor(sobrantes[pk] / CAJON_SODA) : sobrantes[pk];
    const vaciosHoy = pk === "soda" ? Math.floor(vaciosRec[pk] / CAJON_SODA) : vaciosRec[pk];
    const llenosYaHabia = pk === "soda" ? Math.floor((soderiaActual[sk] || 0) / CAJON_SODA) : soderiaActual[sk] || 0;
    const necDisp = pk === "soda" ? Math.ceil((necesarioManana[pk] || 0) / CAJON_SODA) : necesarioManana[pk] || 0;
    const falta = Math.max(0, necDisp - llenosYaHabia - llenosHoy);
    paraLlenarCalc[pk] = Math.min(falta, vaciosHoy);
    vaciosRestoCalc[pk] = Math.max(0, vaciosHoy - paraLlenarCalc[pk]);
  });'''
new12 = '''  const paraLlenarCalc = ceroCarga();
  const vaciosRestoCalc = ceroCarga();
  clavesCarga.forEach(pk => {
    const sk = planKeyToStockKey[pk];
    const llenosHoy = pk === "soda" ? Math.floor(sobrantes[pk] / CAJON_SODA) : sobrantes[pk];
    const vaciosHoy = pk === "soda" ? Math.floor(vaciosRec[pk] / CAJON_SODA) : vaciosRec[pk];
    const llenosYaHabia = pk === "soda" ? Math.floor((soderiaActual[sk] || 0) / CAJON_SODA) : soderiaActual[sk] || 0;
    const necDisp = pk === "soda" ? Math.ceil((necesarioManana[pk] || 0) / CAJON_SODA) : necesarioManana[pk] || 0;
    const falta = Math.max(0, necDisp - llenosYaHabia - llenosHoy);
    paraLlenarCalc[pk] = Math.min(falta, vaciosHoy);
    vaciosRestoCalc[pk] = Math.max(0, vaciosHoy - paraLlenarCalc[pk]);
  });'''
edits.append(("edit12 paraLlenarCalc/vaciosRestoCalc dinamicos", old12, new12))

# ── Edit 13: realesLlenos/Vacios/ParaLlenar useState dinamicos ────────────
old13 = '''  const [realesLlenos, setRealesLlenos] = useState({
    soda: "",
    b10: "",
    b20: ""
  });
  const [realesVacios, setRealesVacios] = useState({
    soda: "",
    b10: "",
    b20: ""
  });
  const [realesParaLlenar, setRealesParaLlenar] = useState({
    soda: "",
    b10: "",
    b20: ""
  });'''
new13 = '''  const ceroCargaStr = () => Object.fromEntries(clavesCarga.map(k => [k, ""]));
  const [realesLlenos, setRealesLlenos] = useState(ceroCargaStr());
  const [realesVacios, setRealesVacios] = useState(ceroCargaStr());
  const [realesParaLlenar, setRealesParaLlenar] = useState(ceroCargaStr());'''
edits.append(("edit13 realesLlenos/Vacios/ParaLlenar dinamicos", old13, new13))

# ── Edit 14: calcularMovimientoDeposito dinamico ───────────────────────────
old14 = '''    const realesL = {
      soda: realesLlenos.soda !== "" ? Number(realesLlenos.soda) * CAJON_SODA + sueltosSodaLL : sobrantes.soda,
      b10: realesLlenos.b10 !== "" ? Number(realesLlenos.b10) : sobrantes.b10,
      b20: realesLlenos.b20 !== "" ? Number(realesLlenos.b20) : sobrantes.b20
    };
    const realesPL = {
      soda: (realesParaLlenar.soda !== "" ? Number(realesParaLlenar.soda) : paraLlenarCalc.soda) * CAJON_SODA,
      b10: realesParaLlenar.b10 !== "" ? Number(realesParaLlenar.b10) : paraLlenarCalc.b10,
      b20: realesParaLlenar.b20 !== "" ? Number(realesParaLlenar.b20) : paraLlenarCalc.b20
    };
    const realesV = {
      soda: (realesVacios.soda !== "" ? Number(realesVacios.soda) * CAJON_SODA : vaciosRestoCalc.soda * CAJON_SODA) + sueltosSodaVV,
      b10: realesVacios.b10 !== "" ? Number(realesVacios.b10) : vaciosRestoCalc.b10,
      b20: realesVacios.b20 !== "" ? Number(realesVacios.b20) : vaciosRestoCalc.b20
    };
    const diffs = {};
    ["soda", "b10", "b20"].forEach(pk => {'''
new14 = '''    const realesL = Object.fromEntries(clavesCarga.map(pk => [pk,
      pk === "soda" ? (realesLlenos.soda !== "" ? Number(realesLlenos.soda) * CAJON_SODA + sueltosSodaLL : sobrantes.soda)
        : (realesLlenos[pk] !== "" ? Number(realesLlenos[pk]) : sobrantes[pk])
    ]));
    const realesPL = Object.fromEntries(clavesCarga.map(pk => [pk,
      pk === "soda" ? (realesParaLlenar.soda !== "" ? Number(realesParaLlenar.soda) : paraLlenarCalc.soda) * CAJON_SODA
        : (realesParaLlenar[pk] !== "" ? Number(realesParaLlenar[pk]) : paraLlenarCalc[pk])
    ]));
    const realesV = Object.fromEntries(clavesCarga.map(pk => [pk,
      pk === "soda" ? (realesVacios.soda !== "" ? Number(realesVacios.soda) * CAJON_SODA : vaciosRestoCalc.soda * CAJON_SODA) + sueltosSodaVV
        : (realesVacios[pk] !== "" ? Number(realesVacios[pk]) : vaciosRestoCalc[pk])
    ]));
    const diffs = {};
    clavesCarga.forEach(pk => {'''
edits.append(("edit14 realesL/realesPL/realesV dinamicos", old14, new14))

old15 = '''    const diffDeposito = {};
    const llenFijo = {},
      vacFijo = {};
    ["soda", "b10", "b20"].forEach(pk => {
      const esperadoPk = llenosCargados[pk];'''
new15 = '''    const diffDeposito = {};
    const llenFijo = {},
      vacFijo = {};
    clavesCarga.forEach(pk => {
      const esperadoPk = llenosCargados[pk];'''
edits.append(("edit15 diffDeposito/llenFijo/vacFijo loop dinamico", old15, new15))

# ── Edit 16: confirmarCierre dinamico ───────────────────────────────────────
old16 = '''    const s = JSON.parse(JSON.stringify(stock));
    if (!s.soderia) s.soderia = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
    if (!s.soderia_vacios) s.soderia_vacios = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
    if (!s.camiones) s.camiones = {};
    const conv = {
      soda: "sifon",
      b10: "bidon10",
      b20: "bidon20"
    };
    if (!s.casa) s.casa = {
      sifon: 0,
      bidon10: 0,
      bidon20: 0
    };
    ["soda", "b10", "b20"].forEach(pk => {
      const sk = conv[pk];
      s.soderia[sk] = (s.soderia[sk] || 0) + llenFijo[pk];
      s.soderia_vacios[sk] = (s.soderia_vacios[sk] || 0) + vacFijo[pk];
      s.casa[sk] = (s.casa[sk] || 0) + diffDeposito[pk];
    });'''
new16 = '''    const s = JSON.parse(JSON.stringify(stock));
    if (!s.soderia) s.soderia = {};
    if (!s.soderia_vacios) s.soderia_vacios = {};
    if (!s.camiones) s.camiones = {};
    if (!s.casa) s.casa = {};
    clavesCarga.forEach(pk => {
      const sk = planKeyToStockKey[pk];
      s.soderia[sk] = (s.soderia[sk] || 0) + llenFijo[pk];
      s.soderia_vacios[sk] = (s.soderia_vacios[sk] || 0) + vacFijo[pk];
      s.casa[sk] = (s.casa[sk] || 0) + diffDeposito[pk];
    });'''
edits.append(("edit16 confirmarCierre stock dinamico", old16, new16))

old17 = '''      const detalleCierre = {};
      ["soda", "b10", "b20"].forEach(pk => {
        const sk = conv[pk];
        const soderiaVuelta = (llenFijo[pk] || 0) + (vacFijo[pk] || 0);'''
new17 = '''      const detalleCierre = {};
      clavesCarga.forEach(pk => {
        const sk = planKeyToStockKey[pk];
        const soderiaVuelta = (llenFijo[pk] || 0) + (vacFijo[pk] || 0);'''
edits.append(("edit17 detalleCierre loop dinamico", old17, new17))

# ── Edit 18: intentarCerrar dinamico ───────────────────────────────────────
old18 = '''    const hayMovimiento = ["soda", "b10", "b20"].some(pk => diffDeposito[pk] !== 0);'''
new18 = '''    const hayMovimiento = clavesCarga.some(pk => diffDeposito[pk] !== 0);'''
edits.append(("edit18 intentarCerrar dinamico", old18, new18))

# ── Edit 19: "Detalle del día" tarjeta de cargado -> dinamica ─────────────
old19 = '''    }, [["Soda", llenosCargados.soda > 0 ? `${Math.floor(llenosCargados.soda / CAJON_SODA)} cajones (${llenosCargados.soda} un)` : "—"], ["Bidón 10L", llenosCargados.b10 > 0 ? `${llenosCargados.b10} unidades` : "—"], ["Bidón 20L", llenosCargados.b20 > 0 ? `${llenosCargados.b20} unidades` : "—"]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,'''
new19 = '''    }, productosCarga.map(p => {
      const pk = claveCargaDeProducto(p);
      const l = pk === "soda" ? "Soda" : labelCorto(p);
      const v = llenosCargados[pk] > 0 ? (pk === "soda" ? `${Math.floor(llenosCargados[pk] / CAJON_SODA)} cajones (${llenosCargados[pk]} un)` : `${llenosCargados[pk]} unidades`) : "—";
      return [l, v];
    }).map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,'''
edits.append(("edit19 tarjeta cargado dinamica", old19, new19))

# ── Edit 20: tabla Vendido/Prestado/Devuelto -> dinamica ───────────────────
old20 = '''    }, [["Soda", "soda"], ["10L", "b10"], ["20L", "b20"], ["Dispenser", "disp"]].map(([label, pk]) => /*#__PURE__*/React.createElement("div", {
      key: pk,'''
new20 = '''    }, [...productosCarga.map(p => [claveCargaDeProducto(p) === "soda" ? "Soda" : labelCorto(p), claveCargaDeProducto(p)]), [dispNombre, "disp"]].map(([label, pk]) => /*#__PURE__*/React.createElement("div", {
      key: pk,'''
edits.append(("edit20 tabla vendido/prestado/devuelto dinamica", old20, new20))

# ── Edit 21: "LO QUE VUELVE A SODERÍA" -> itera productosCarga ───────────
old21 = '''    }, [["Soda", "soda"], ["10L", "b10"], ["20L", "b20"]].map(([label, pk]) => {
      const cajon = pk === "soda" ? CAJON_SODA : 1;'''
new21 = '''    }, productosCarga.map(p => {
      const pk = claveCargaDeProducto(p);
      const label = pk === "soda" ? "Soda" : labelCorto(p);
      const cajon = pk === "soda" ? CAJON_SODA : 1;'''
edits.append(("edit21 lo-que-vuelve-a-soderia itera productosCarga", old21, new21))

old22 = '''      const div = n => pk === "soda" ? Math.floor(n / cajon) : n;
      const sk = convPk[pk];'''
new22 = '''      const div = n => pk === "soda" ? Math.floor(n / cajon) : n;
      const sk = planKeyToStockKey[pk];'''
edits.append(("edit22 sk via planKeyToStockKey", old22, new22))

# ── Edit 23: modal confirmacion deposito -> dinamico ───────────────────────
old23 = '''      const LBL = { soda: "Sifón", b10: "Bidón 10L", b20: "Bidón 20L" };
      const filas = ["soda", "b10", "b20"].filter(pk => diffDeposito[pk] !== 0);'''
new23 = '''      const LBL = Object.fromEntries(productosCarga.map(p => [claveCargaDeProducto(p), p.nombre]));
      const filas = clavesCarga.filter(pk => diffDeposito[pk] !== 0);'''
edits.append(("edit23 modal deposito dinamico", old23, new23))

# ── Edit 24: tabla de ingreso "Envases cargados" -> prodsCargaUI ──────────
old24 = '''  }, h))), PRODUCTOS_CONFIG.map(p => {
    const auto = totalesPorProd[p.id];'''
new24 = '''  }, h))), prodsCargaUI.map(p => {
    const auto = totalesPorProd[p.id];'''
edits.append(("edit24 PRODUCTOS_CONFIG -> prodsCargaUI", old24, new24))

# ── Edit 25: InicioReparto -- prodKeys dinamico ────────────────────────────
old25 = '''  const prodKeys = {
    "Sifón 1.5L": "soda",
    "Bidón 10L": "b10",
    "Bidón 20L": "b20"
  };
  const CAJON = 6; // sifones por cajón'''
new25 = '''  // Pedido de Guillermo (20/11/2026, portado de Individual/La Catalina):
  // prodKeys ahora se arma desde los productos reales marcados para ir al
  // camión (productosDeCarga/claveCargaDeProducto), no de un mapa fijo de
  // 3 nombres -- así un producto nuevo entra solo a esta pantalla.
  const prodKeys = Object.fromEntries(productosDeCarga(productos).map(p => [p.nombre, claveCargaDeProducto(p)]));
  const CAJON = 6; // sifones por cajón'''
edits.append(("edit25 InicioReparto prodKeys dinamico", old25, new25))

# ── Edit 26: InicioReparto -- "Stock actual · Sodería" dinamico ──────────
old26 = '''  }, [["Sifón", stock?.soderia?.sifon || 0], ["Bidón 10L", stock?.soderia?.bidon10 || 0], ["Bidón 20L", stock?.soderia?.bidon20 || 0]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {'''
new26 = '''  }, productosDeCarga(productos).map(p => { const sk = claveStockDeProducto(p); return [p.nombre.replace(" 1.5L", ""), stock?.soderia?.[sk] || 0]; }).map(([l, v]) => /*#__PURE__*/React.createElement("div", {'''
edits.append(("edit26 InicioReparto stock actual dinamico", old26, new26))

for label, old, new in edits:
    c = src.count(old)
    assert c == 1, f"{label}: expected 1 occurrence, found {c}"
for label, old, new in edits:
    src = src.replace(old, new)

open(path, "w", encoding="utf-8").write(src)
for label, old, new in edits:
    print(label, "OK (1)")
print("08-menu.js multi_phaseI ALL EDITS OK")
