// enviar-notif.js — Sistema de Reparto (MULTI)
// Recordatorios de agenda + transferencias + mantenimiento + cierres por horario.
const admin   = require('firebase-admin');
const webpush = require('web-push');

const VAPID_PUBLIC  = 'BCddH8J9o3uc7RnLKD2PV9Ut4FfoQPBnlN0y1CbDGJptSqNYsPU5kiVCWDsXmuR4xv1yFUuKyJdwO2ar2B0lBFQ';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VENTANA_MIN = 20;

webpush.setVapidDetails('mailto:carabajalponce1980@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);
const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function ahoraArg(){ return new Date(Date.now() - 3*60*60*1000); }
function fechaStr(d){ return d.toISOString().slice(0,10); }
function minutosDelDia(d){ return d.getUTCHours()*60 + d.getUTCMinutes(); }

async function cargarClientes(col){
  const meta = await col.doc('clientes_meta').get();
  const nc = meta.exists ? (meta.data().n || 0) : 0;
  let clientes = [];
  for(let i=0;i<nc;i++){ const d = await col.doc('cl_'+i).get(); if(d.exists) clientes = clientes.concat(d.data().d || []); }
  return clientes;
}
async function cargarVentas(col){
  const meta = await col.doc('ventas_meta').get();
  const nv = meta.exists ? (meta.data().n || 0) : 0;
  let ventas = [];
  for(let i=0;i<nv;i++){ const d = await col.doc('vt_'+i).get(); if(d.exists) ventas = ventas.concat(d.data().d || []); }
  return ventas;
}
async function enviarPush(sub, payload){
  try { await webpush.sendNotification(sub, JSON.stringify(payload)); console.log('✅', payload.title); return true; }
  catch(e){ console.log('✗ Error push:', e.statusCode || e.message); return e.statusCode; }
}

async function main(){
  const arg      = ahoraArg();
  const hoy      = fechaStr(arg);
  const hora     = arg.getUTCHours();
  const ahoraMin = minutosDelDia(arg);
  console.log('Hora Argentina:', hoy, String(hora).padStart(2,'0')+':'+String(arg.getUTCMinutes()).padStart(2,'0'));

  const negocios = await db.collection('negocios').get();
  let enviados = 0;

  for (const negDoc of negocios.docs){
    const negocioId = negDoc.id;
    const col = db.collection('negocios').doc(negocioId).collection('datos');

    const subSnap = await col.doc('push_sub').get();
    if(!subSnap.exists) continue;
    let sub;
    try { sub = JSON.parse(subSnap.data().sub); } catch { continue; }

    const cfgSnap = await col.doc('config').get();
    if(!cfgSnap.exists) continue;
    const cfg = cfgSnap.data();
    const recordatorios = cfg.recordatorios || [];
    const mantVeh       = cfg.mantVeh || [];

    const logSnap = await col.doc('push_log').get();
    const log     = logSnap.exists ? (logSnap.data().enviados || {}) : {};
    let cambioLog = false;
    let clientes = null;

    // ── 1) Recordatorios de agenda ──
    for (const r of recordatorios){
      if(r.confirmado || r.fecha !== hoy || !r.hora) continue;
      const [h,m] = r.hora.split(':').map(Number);
      const recMin = h*60+m;
      if(recMin > ahoraMin || ahoraMin - recMin > VENTANA_MIN) continue;
      const clave = (r.id || (r.fecha+r.hora)) + '_' + r.fecha;
      if(log[clave]) continue;
      if(clientes === null) clientes = await cargarClientes(col);
      const cli = clientes.find(c => c.id === r.clienteId);
      const nombre = (cli && cli.nombre) || r.clienteNombre || '';
      const cuerpo = (nombre ? nombre+' — ' : '') + (r.motivo || 'Tenés un recordatorio');
      const st = await enviarPush(sub, { title: r.tipo==='cobro'?'💰 Recordatorio de cobro':'🏠 Recordatorio de visita', body:cuerpo, tag:clave, requireInteraction:true });
      if(st===true){ log[clave]=Date.now(); cambioLog=true; enviados++; }
      else if(st===410||st===404){ await col.doc('push_sub').delete().catch(()=>{}); }
    }

    // ── 2) Transferencias pendientes (13:00 y 19:00) ──
    if(hora===13 || hora===19){
      const clave = 'trans_'+hoy+'_'+hora;
      if(!log[clave]){
        const ventas = await cargarVentas(col);
        const pend = ventas.filter(v => v.fechaKey===hoy && v.pago==='transferencia' && !v.transConfirmada).length;
        if(pend>0){
          const st = await enviarPush(sub, { title:'💳 Transferencias sin confirmar', body:`Tenés ${pend} transferencia${pend>1?'s':''} pendiente${pend>1?'s':''} de hoy.`, tag:'trans-pend', requireInteraction:true });
          if(st===true){ log[clave]=Date.now(); cambioLog=true; enviados++; }
        }
      }
    }

    // ── 3) Mantenimiento de vehículo (07:00) ──
    if(hora===7){
      const hoyD = new Date(hoy+'T12:00:00');
      for(const mv of mantVeh){
        if(!mv.proximaFechaISO) continue;
        const prox = new Date(mv.proximaFechaISO+'T12:00:00');
        const dias = Math.round((prox-hoyD)/(1000*60*60*24));
        if(dias>=0 && dias<=3){
          const clave = 'mant_'+mv.proximaFechaISO;
          if(log[clave]) continue;
          const cuando = dias===0?'HOY':`en ${dias} día${dias>1?'s':''}`;
          const st = await enviarPush(sub, { title:'🔧 Mantenimiento de vehículo', body:`${mv.tipo||'Mantenimiento'} vence ${cuando}${mv.descripcion?' — '+mv.descripcion:''}.`, tag:clave, requireInteraction:false });
          if(st===true){ log[clave]=Date.now(); cambioLog=true; enviados++; }
        }
      }
    }

    // ── 4) Aviso cierre 18:00 ──
    if(hora===18){
      const clave='cierre18_'+hoy;
      if(!log[clave]){
        const st = await enviarPush(sub, { title:'🚚 Sistema de Reparto — 18:00 hs', body:'¿Ya revisaste todas las entregas del día?', tag:'cierre-18', requireInteraction:false });
        if(st===true){ log[clave]=Date.now(); cambioLog=true; enviados++; }
      }
    }

    // ── 5) Aviso cierre planilla 20:00 ──
    if(hora===20){
      const clave='cierre20_'+hoy;
      if(!log[clave]){
        const st = await enviarPush(sub, { title:'⏰ Son las 20:00 hs', body:'Hora de cerrar la planilla. Los pendientes quedarán como no visitados.', tag:'cierre-20', requireInteraction:true });
        if(st===true){ log[clave]=Date.now(); cambioLog=true; enviados++; }
      }
    }

    if(cambioLog) await col.doc('push_log').set({ enviados: log }, { merge: true });
  }

  console.log('Listo. Notificaciones enviadas:', enviados);
}

main().catch(e => { console.error(e); process.exit(1); });
