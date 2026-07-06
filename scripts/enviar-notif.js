// enviar-notificaciones.js  —  Sistema de Reparto (MULTI)
// Recorre los negocios y manda push real (agenda, cierre, transferencias,
// mantenimiento) a todos los dispositivos del dueño. Corre desde GitHub Actions.

const admin   = require('firebase-admin');
const webpush = require('web-push');

const VAPID_PUBLIC  = 'BCddH8J9o3uc7RnLKD2PV9Ut4FfoQPBnlN0y1CbDGJptSqNYsPU5kiVCWDsXmuR4xv1yFUuKyJdwO2ar2B0lBFQ';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VENTANA_MIN = 15; // con cron cada 5 min alcanza y no llega tarde

webpush.setVapidDetails('mailto:carabajalponce1980@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const NOMBRES_DIA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function ahoraArg(){ return new Date(Date.now() - 3 * 60 * 60 * 1000); }
function fechaStr(d){ return d.toISOString().slice(0, 10); }
function minutosDelDia(d){ return d.getUTCHours() * 60 + d.getUTCMinutes(); }
function diaSemana(d){ return NOMBRES_DIA[d.getUTCDay()]; }

// Reconstruye la lista de clientes (están repartidos en cl_0, cl_1, ...)
async function cargarClientes(col){
  const meta = await col.doc('clientes_meta').get();
  const nc = meta.exists ? (meta.data().n || 0) : 0;
  let clientes = [];
  for(let i=0;i<nc;i++){
    const d = await col.doc('cl_' + i).get();
    if(d.exists) clientes = clientes.concat(d.data().d || []);
  }
  return clientes;
}
// Reconstruye ventas (vt_0, vt_1, ...) — solo se pide si hace falta (transferencias)
async function cargarVentas(col){
  const meta = await col.doc('ventas_meta').get();
  const nv = meta.exists ? (meta.data().n || 0) : 0;
  let ventas = [];
  for(let i=0;i<nv;i++){
    const d = await col.doc('vt_' + i).get();
    if(d.exists) ventas = ventas.concat(d.data().d || []);
  }
  return ventas;
}

// ── Enviar a UN dispositivo ──────────────────────────────────────────────
async function enviarPush(sub, payload){
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    console.log('✅', payload.title);
    return true;
  } catch(e){
    console.log('✗ Error push:', e.statusCode || e.message);
    return e.statusCode;
  }
}
// ── Enviar a TODOS los dispositivos del negocio (dueño puede tener celu+PC) ─
async function enviarATodos(subsMap, col, payload){
  const entries = Object.entries(subsMap || {});
  if(!entries.length) return false;
  let algunoOk = false;
  for(const [deviceId, info] of entries){
    let sub;
    try { sub = JSON.parse(info.sub); } catch { continue; }
    const st = await enviarPush(sub, payload);
    if(st === true) algunoOk = true;
    else if(st === 410 || st === 404){
      await col.doc('push_subs').update({ [deviceId]: admin.firestore.FieldValue.delete() }).catch(()=>{});
      console.log(`⚠ Suscripción de ${deviceId} expirada, borrada.`);
    }
  }
  return algunoOk;
}
// Filtra el mapa de suscripciones solo al dueño (entradas viejas sin "rol"
// se tratan como dueño, por compatibilidad con suscripciones ya guardadas).
function soloDueno(subsMap){
  const out = {};
  for(const [id, info] of Object.entries(subsMap||{})){
    if(!info.rol || info.rol === 'dueño') out[id] = info;
  }
  return out;
}
// Filtra el mapa de suscripciones a UN repartidor puntual, por nombre.
function soloRepartidor(subsMap, nombre){
  const out = {};
  for(const [id, info] of Object.entries(subsMap||{})){
    if(info.rol === 'repartidor' && info.nombre === nombre) out[id] = info;
  }
  return out;
}

async function main(){
  const arg      = ahoraArg();
  const hoy      = fechaStr(arg);
  const hora     = arg.getUTCHours();
  const ahoraMin = minutosDelDia(arg);
  const diaHoy   = diaSemana(arg);
  console.log('Hora Argentina:', hoy, String(hora).padStart(2,'0') + ':' + String(arg.getUTCMinutes()).padStart(2,'0'), '—', diaHoy);

  const negocios = await db.collection('negocios').get();
  let enviados = 0;

  for (const negDoc of negocios.docs){
    const negocioId = negDoc.id;
    const col       = db.collection('negocios').doc(negocioId).collection('datos');

    // 1) suscripciones (una por dispositivo del dueño)
    const subsSnap = await col.doc('push_subs').get();
    if(!subsSnap.exists) continue;
    const subsMap = subsSnap.data() || {};
    if(!Object.keys(subsMap).length) continue;

    // 2) datos del negocio (recordatorios, planillas y mantVeh están en 'config')
    const cfgSnap = await col.doc('config').get();
    if(!cfgSnap.exists) continue;
    const cfg           = cfgSnap.data();
    const recordatorios = cfg.recordatorios || [];
    const planillas      = cfg.planillas || {};
    const mantVeh        = cfg.mantVeh || [];

    // 3) log de enviados (para no repetir el mismo aviso)
    const logSnap = await col.doc('push_log').get();
    const log     = logSnap.exists ? (logSnap.data().enviados || {}) : {};
    let cambioLog = false;

    let clientes = null; // se cargan solo si hace falta un nombre
    let ventas   = null; // se cargan solo si hace falta (transferencias / huboReparto)

    // ── 1) Recordatorios de agenda (en cada corrida) ──
    for (const r of recordatorios){
      if(r.confirmado) continue;
      if(r.fecha !== hoy) continue;
      if(!r.hora) continue;

      const [h, m] = r.hora.split(':').map(Number);
      const recMin = h * 60 + m;
      if(recMin > ahoraMin) continue;
      if(ahoraMin - recMin > VENTANA_MIN) continue;

      const clave = (r.id || (r.fecha+r.hora)) + '_' + r.fecha;
      if(log[clave]) continue;

      if(clientes === null) clientes = await cargarClientes(col);
      const cli    = clientes.find(c => c.id === r.clienteId);
      const nombre = (cli && cli.nombre) || r.clienteNombre || '';
      const cuerpo = (nombre ? nombre + ' — ' : '') + (r.motivo || 'Tenés un recordatorio');

      // Si el recordatorio es "para" un repartidor puntual, avisarle SOLO a él.
      // Si no tiene asignación (tarea propia del dueño o legado), avisarle al dueño.
      const destinatarios = r.paraRepartidor ? soloRepartidor(subsMap, r.paraRepartidor) : soloDueno(subsMap);
      const ok = await enviarATodos(destinatarios, col, {
        title: r.tipo === 'cobro' ? '💰 Recordatorio de cobro' : '🏠 Recordatorio de visita',
        body: cuerpo, tag: clave, requireInteraction: true,
      });
      if(ok){ log[clave] = Date.now(); cambioLog = true; enviados++; }
    }

    // ── 2) Transferencias pendientes (13:00 y 19:00) ──
    if(hora === 13 || hora === 19){
      const clave = 'trans_' + hoy + '_' + hora;
      if(!log[clave]){
        if(ventas === null) ventas = await cargarVentas(col);
        const pend = ventas.filter(v => v.fechaKey === hoy && (v.pago === 'transferencia' || (v.pago === 'mixto' && Number(v.montoTrans) > 0)) && !v.transConfirmada).length;
        if(pend > 0){
          const ok = await enviarATodos(soloDueno(subsMap), col, {
            title: '💳 Transferencias sin confirmar',
            body: `Tenés ${pend} transferencia${pend>1?'s':''} pendiente${pend>1?'s':''} de hoy.`,
            tag: clave, requireInteraction: true,
          });
          if(ok){ log[clave] = Date.now(); cambioLog = true; enviados++; }
        }
      }
    }

    // ── 3) Mantenimiento de vehículo (07:00) ──
    if(hora === 7){
      const hoyD = new Date(hoy + 'T12:00:00');
      for(const mv of mantVeh){
        if(!mv.proximaFechaISO) continue;
        const prox = new Date(mv.proximaFechaISO + 'T12:00:00');
        const dias = Math.round((prox - hoyD) / (1000*60*60*24));
        if(dias < 0 || dias > 3) continue;
        const clave = 'mant_' + mv.proximaFechaISO + '_' + (mv.tipo||'');
        if(log[clave]) continue;
        const tipoLabel = {aceite:'Cambio de aceite',preventivo:'Mantenimiento preventivo',embrague:'Cambio de embrague',reparacion:'Reparación',otro:'Mantenimiento'}[mv.tipo] || mv.tipo || 'Mantenimiento';
        const cuando = dias === 0 ? 'HOY' : `en ${dias} día${dias>1?'s':''}`;
        const ok = await enviarATodos(soloDueno(subsMap), col, {
          title: '🔧 Vencimiento de mantenimiento',
          body: `${tipoLabel} vence ${cuando}${mv.descripcion?' — '+mv.descripcion:''}.`,
          tag: clave, requireInteraction: false,
        });
        if(ok){ log[clave] = Date.now(); cambioLog = true; enviados++; }
      }
    }

    // ── 4) y 5) Avisos de cierre — SOLO si hoy es día de reparto, hubo
    //     reparto (planilla iniciada o alguna venta) y sigue sin cerrar.
    if((hora === 18 || hora === 20) && DIAS.includes(diaHoy)){
      const planKey = `${diaHoy}_${hoy}`;
      const plan = planillas[planKey];
      if(ventas === null) ventas = await cargarVentas(col);
      const huboReparto = (plan && plan.iniciado) || ventas.some(v => v.fechaKey === hoy && v.dia === diaHoy);
      const sinCerrar = !plan || ((!plan.efectivo || plan.efectivo==='') && (!plan.fiado || plan.fiado===''));
      if(huboReparto && sinCerrar){
        if(hora === 18){
          const clave = 'cierre18_' + hoy;
          if(!log[clave]){
            const ok = await enviarATodos(soloDueno(subsMap), col, { title:'🚚 Sistema de Reparto — 18:00 hs', body:`¿Ya cerraste la planilla de ${diaHoy}?`, tag:'cierre-18', requireInteraction:false });
            if(ok){ log[clave] = Date.now(); cambioLog = true; enviados++; }
          }
        }
        if(hora === 20){
          const clave = 'cierre20_' + hoy;
          if(!log[clave]){
            const ok = await enviarATodos(soloDueno(subsMap), col, { title:'⏰ Son las 20:00 hs', body:'Hora de cerrar la planilla. Los pendientes quedarán como no visitados.', tag:'cierre-20', requireInteraction:true });
            if(ok){ log[clave] = Date.now(); cambioLog = true; enviados++; }
          }
        }
      }
    }

    if(cambioLog) await col.doc('push_log').set({ enviados: log }, { merge: true });
  }

  console.log('Listo. Notificaciones enviadas:', enviados);
}

main().catch(e => { console.error(e); process.exit(1); });
