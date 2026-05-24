// ── App Reparto Multi · Enviador de notificaciones push ──────────────────
// Corre desde GitHub Actions. Itera sobre todos los negocios registrados
// y envía notificaciones push al dueño de cada uno.

const webpush = require('web-push');
const admin   = require('firebase-admin');

// ── Inicializar Firebase Admin ────────────────────────────────────────────
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SA, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// ── Configurar VAPID ─────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Hora Argentina (UTC-3) ────────────────────────────────────────────────
function horaArg() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours();
}
function fechaArgHoy() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── Enviar push ───────────────────────────────────────────────────────────
async function enviar(sub, payload, negocioId) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    console.log(`✅ [${negocioId}] Enviada:`, payload.title);
  } catch (err) {
    console.error(`❌ [${negocioId}] Error:`, err.statusCode, err.message);
    if (err.statusCode === 410 || err.statusCode === 404) {
      await db.collection('negocios').doc(negocioId).collection('datos').doc('push_sub').delete();
      console.log(`⚠ [${negocioId}] Suscripción expirada, borrada.`);
    }
  }
}

// ── Obtener todos los negocios con suscripción ────────────────────────────
async function getNegociosConSub() {
  const snap = await db.collection('negocios').get();
  const result = [];
  for (const negDoc of snap.docs) {
    const negocioId = negDoc.id;
    const subDoc = await db.collection('negocios').doc(negocioId).collection('datos').doc('push_sub').get();
    if (!subDoc.exists) continue;
    try {
      const sub = JSON.parse(subDoc.data().sub);
      result.push({ negocioId, sub });
    } catch { continue; }
  }
  return result;
}

// ── Transferencias pendientes para un negocio ─────────────────────────────
async function checkTransferencias(negocioId, sub) {
  const hoy = fechaArgHoy();
  let pendientes = 0;
  try {
    const col = db.collection('negocios').doc(negocioId).collection('datos');
    const meta = await col.doc('ventas_meta').get();
    if (!meta.exists) return;
    const n = meta.data().n || 0;
    for (let i = 0; i < n; i++) {
      const doc = await col.doc(`vt_${i}`).get();
      if (!doc.exists) continue;
      (doc.data().d || []).forEach(v => {
        if (v.fechaKey === hoy && v.pago === 'transferencia' && !v.transConfirmada) pendientes++;
      });
    }
  } catch (e) { console.error(`[${negocioId}] Error ventas:`, e.message); return; }
  if (pendientes > 0) {
    await enviar(sub, {
      title: '💳 Transferencias sin confirmar',
      body: `Tenés ${pendientes} transferencia${pendientes > 1 ? 's' : ''} pendiente${pendientes > 1 ? 's' : ''} de hoy.`,
      tag: 'trans-pendientes',
      requireInteraction: true,
    }, negocioId);
  } else {
    console.log(`[${negocioId}] Sin transferencias pendientes.`);
  }
}

// ── Mantenimiento de vehículo para un negocio ─────────────────────────────
async function checkMantenimiento(negocioId, sub) {
  try {
    const col = db.collection('negocios').doc(negocioId).collection('datos');
    const doc = await col.doc('config').get();
    if (!doc.exists) return;
    const mantVeh = doc.data().mantVeh || [];
    const hoy = new Date(fechaArgHoy() + 'T12:00:00');
    for (const m of mantVeh) {
      if (!m.proximaFechaISO) continue;
      const prox = new Date(m.proximaFechaISO + 'T12:00:00');
      const dias = Math.round((prox - hoy) / (1000 * 60 * 60 * 24));
      if ([0, 1, 2, 3].includes(dias)) {
        const labels = { aceite:'Cambio de aceite', preventivo:'Mantenimiento preventivo', embrague:'Cambio de embrague', reparacion:'Reparación', otro:'Mantenimiento' };
        const tipo = labels[m.tipo] || m.tipo || 'Mantenimiento';
        const cuando = dias === 0 ? 'HOY' : `en ${dias} día${dias > 1 ? 's' : ''}`;
        await enviar(sub, {
          title: '🔧 Vencimiento de mantenimiento',
          body: `${tipo} vence ${cuando}${m.descripcion ? ' — ' + m.descripcion : ''}.`,
          tag: `mant-${m.proximaFechaISO}`,
          requireInteraction: false,
        }, negocioId);
      }
    }
  } catch (e) { console.error(`[${negocioId}] Error mantenimiento:`, e.message); }
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const hora = horaArg();
  console.log(`Hora Argentina: ${hora}:00`);

  const negocios = await getNegociosConSub();
  console.log(`Negocios con suscripción: ${negocios.length}`);
  if (negocios.length === 0) { process.exit(0); return; }

  for (const { negocioId, sub } of negocios) {
    console.log(`\nProcesando negocio: ${negocioId}`);
    if (hora === 7)  await checkMantenimiento(negocioId, sub);
    if (hora === 13) await checkTransferencias(negocioId, sub);
    if (hora === 18) {
      await enviar(sub, {
        title: '🚚 Reparto — 18:00 hs',
        body: '¿Ya revisaste todas las entregas del día?',
        tag: 'cierre-18',
        requireInteraction: false,
      }, negocioId);
    }
    if (hora === 19) await checkTransferencias(negocioId, sub);
    if (hora === 20) {
      await enviar(sub, {
        title: '⏰ Son las 20:00 hs',
        body: 'Hora de cerrar la planilla. Los pendientes quedarán como no visitados.',
        tag: 'cierre-20',
        requireInteraction: true,
      }, negocioId);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
