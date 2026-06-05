// enviar-notificaciones.js  —  Sistema de Reparto (MULTI)
// Recorre los negocios, mira los recordatorios de cada uno y envía un push
// al dueño cuando llega la hora. Se ejecuta solo desde GitHub Actions.

const admin   = require('firebase-admin');
const webpush = require('web-push');

// ── Claves VAPID de la MULTI (la pública coincide con la del index.html) ──
const VAPID_PUBLIC  = 'BCddH8J9o3uc7RnLKD2PV9Ut4FfoQPBnlN0y1CbDGJptSqNYsPU5kiVCWDsXmuR4xv1yFUuKyJdwO2ar2B0lBFQ';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;            // secreto de GitHub

const VENTANA_MIN = 20;  // tolerancia hacia atrás por demoras de GitHub Actions

webpush.setVapidDetails('mailto:carabajalponce1980@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function ahoraArg(){ return new Date(Date.now() - 3 * 60 * 60 * 1000); }   // UTC-3
function fechaStr(d){ return d.toISOString().slice(0, 10); }
function minutosDelDia(d){ return d.getUTCHours() * 60 + d.getUTCMinutes(); }

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

async function main(){
  const arg      = ahoraArg();
  const hoy      = fechaStr(arg);
  const ahoraMin = minutosDelDia(arg);
  console.log('Hora Argentina:', hoy, String(Math.floor(ahoraMin/60)).padStart(2,'0') + ':' + String(ahoraMin%60).padStart(2,'0'));

  const negocios = await db.collection('negocios').get();
  let enviados = 0;

  for (const negDoc of negocios.docs){
    const negocioId = negDoc.id;
    const col       = db.collection('negocios').doc(negocioId).collection('datos');

    // 1) suscripción (del dueño)
    const subSnap = await col.doc('push_sub').get();
    if(!subSnap.exists) continue;
    let sub;
    try { sub = JSON.parse(subSnap.data().sub); } catch { continue; }

    // 2) recordatorios (están en 'config')
    const cfgSnap = await col.doc('config').get();
    if(!cfgSnap.exists) continue;
    const recordatorios = cfgSnap.data().recordatorios || [];
    if(!recordatorios.length) continue;

    // 3) log de enviados
    const logSnap = await col.doc('push_log').get();
    const log     = logSnap.exists ? (logSnap.data().enviados || {}) : {};
    let cambioLog = false;

    // clientes (solo si hace falta un nombre)
    let clientes = null;

    for (const r of recordatorios){
      if(r.confirmado) continue;
      if(r.fecha !== hoy) continue;
      if(!r.hora) continue;

      const [h, m] = r.hora.split(':').map(Number);
      const recMin = h * 60 + m;
      if(recMin > ahoraMin) continue;
      if(ahoraMin - recMin > VENTANA_MIN) continue;

      const clave = r.id + '_' + r.fecha;
      if(log[clave]) continue;

      if(clientes === null) clientes = await cargarClientes(col);
      const cli    = clientes.find(c => c.id === r.clienteId);
      const nombre = (cli && cli.nombre) || r.clienteNombre || '';
      const cuerpo = (nombre ? nombre + ' — ' : '') + (r.motivo || 'Tenés un recordatorio');

      try {
        await webpush.sendNotification(sub, JSON.stringify({
          title: '🔔 Recordatorio', body: cuerpo, tag: clave, requireInteraction: true
        }));
        log[clave] = Date.now();
        cambioLog  = true;
        enviados++;
        console.log('✓ Enviado a', negocioId, '-', cuerpo);
      } catch(e){
        console.log('✗ Error en', negocioId, ':', e.statusCode || e.message);
        if(e.statusCode === 410 || e.statusCode === 404){
          await col.doc('push_sub').delete().catch(()=>{});
        }
      }
    }

    if(cambioLog) await col.doc('push_log').set({ enviados: log }, { merge: true });
  }

  console.log('Listo. Notificaciones enviadas:', enviados);
}

main().catch(e => { console.error(e); process.exit(1); });
