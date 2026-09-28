import { createHmac, timingSafeEqual } from 'node:crypto';

const base = 'https://www.econozone.org';
const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const page = (title, message, status = 200) => new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — ECONOZONE</title><style>body{font:17px/1.6 Arial,sans-serif;max-width:680px;margin:10vh auto;padding:0 22px;color:#17243a}a{color:#003da5}button{padding:12px 20px;background:#003da5;color:white;border:0;cursor:pointer}</style><h1>${title}</h1><p>${message}</p><p><a href="/">Retour à ECONOZONE</a></p></html>`, { status, headers });
const secret = () => process.env.UNSUBSCRIBE_SECRET;
const configured = () => Boolean(secret() && process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const signature = (data) => createHmac('sha256', secret()).update(data).digest('base64url');
const validEmail = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function makeToken(email) {
  const data = Buffer.from(JSON.stringify({ email, expires: Date.now() + 30 * 60_000 })).toString('base64url');
  return `${data}.${signature(data)}`;
}

function readToken(token) {
  if (typeof token !== 'string' || token.length > 800) return null;
  const [data, mac, extra] = token.split('.');
  if (!data || !mac || extra || !/^[A-Za-z0-9_-]+$/.test(data)) return null;
  const expected = Buffer.from(signature(data));
  const supplied = Buffer.from(mac);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return validEmail(payload.email) && Number.isFinite(payload.expires) && payload.expires > Date.now() ? payload.email : null;
  } catch { return null; }
}

async function brevo(path, method, body) {
  return fetch(`https://api.brevo.com/v3/${path}`, {
    method,
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body)
  });
}

export default async function handler(request) {
  if (!configured()) return page('Service indisponible', 'Le retrait automatique n’est pas encore activé. Écrivez à contact@econozone.org.', 503);
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const token = url.searchParams.get('jeton');
    if (!readToken(token)) return page('Lien expiré', 'Ce lien est invalide ou a expiré. Recommencez depuis la page Se désabonner.', 400);
    return page('Confirmer le désabonnement', `<form method="post" action="/api/desabonnement"><input type="hidden" name="jeton" value="${token}"><button type="submit">Confirmer mon désabonnement</button></form>`);
  }
  if (request.method !== 'POST') return page('Méthode non autorisée', '', 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== base) return page('Demande refusée', 'Origine non autorisée.', 403);
  let form;
  try { form = await request.formData(); } catch { return page('Demande invalide', 'Le formulaire est illisible.', 400); }
  if (form.get('website')) return page('Demande reçue', 'Si cette adresse figure dans notre liste, elle recevra les instructions de retrait.');
  const token = form.get('jeton');
  if (token) {
    const email = readToken(token);
    if (!email) return page('Lien expiré', 'Ce lien est invalide ou a expiré. Recommencez depuis la page Se désabonner.', 400);
    try {
      const response = await brevo(`contacts/${encodeURIComponent(email)}`, 'PUT', { emailBlacklisted: true });
      if (response.ok || response.status === 404) return page('Désabonnement confirmé', 'Cette adresse ne recevra plus les envois de la liste ECONOZONE.');
    } catch { /* service distant indisponible */ }
    return page('Retrait non effectué', 'Veuillez réessayer ou écrire à contact@econozone.org.', 502);
  }
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!validEmail(email)) return page('Adresse invalide', 'Saisissez une adresse courriel valide.', 400);
  const link = `${base}/api/desabonnement?jeton=${encodeURIComponent(makeToken(email))}`;
  try {
    const response = await brevo('smtp/email', 'POST', {
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'ECONOZONE' },
      to: [{ email }], subject: 'Confirmez votre désabonnement ECONOZONE',
      htmlContent: `<p>Vous avez demandé à ne plus recevoir les communications d’ECONOZONE.</p><p><a href="${link}">Confirmer le désabonnement</a> (lien valable 30 minutes).</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`
    });
    if (!response.ok) throw new Error('Delivery failed');
  } catch { return page('Envoi impossible', 'Veuillez réessayer ou écrire à contact@econozone.org.', 502); }
  return page('Vérifiez votre messagerie', 'Si cette adresse figure dans notre liste, un courriel permettant de confirmer le retrait a été envoyé.');
}
