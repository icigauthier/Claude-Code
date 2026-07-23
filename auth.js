// Connexion sécurisée du CRM (un seul utilisateur : toi).
//
//   • Active dès qu'un mot de passe est configuré (variable CRM_PASSWORD),
//     ou automatiquement en production (sécurité anti-oubli).
//   • Sur ton PC en local (aucune variable) : désactivée → rien ne change.
//
// Session sans base de données : un cookie signé (HMAC) que le serveur vérifie
// à chaque requête. Pas de stockage serveur → survit aux redémarrages.
import crypto from 'node:crypto'

const COOKIE = 'crm_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

const isProd = () => process.env.NODE_ENV === 'production'
const getPassword = () => process.env.CRM_PASSWORD || ''
// Secret de signature du cookie : idéalement SESSION_SECRET, sinon dérivé du
// mot de passe (changer le mot de passe invalide alors les sessions).
const getSecret = () => process.env.SESSION_SECRET || getPassword() || 'crm-dev-secret'

// La connexion est exigée si un mot de passe existe, ou en production.
const authRequired = () => !!getPassword() || isProd()
// En production sans mot de passe : configuration incomplète (on bloque tout).
const misconfigured = () => isProd() && !getPassword()

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${mac}`
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function parseCookies(req) {
  const out = {}
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

// Limiteur anti-force-brute (en mémoire, par IP).
const attempts = new Map()
function rateBlocked(ip) {
  const e = attempts.get(ip)
  if (!e) return false
  if (Date.now() - e.ts > LOGIN_WINDOW_MS) { attempts.delete(ip); return false }
  return e.count >= MAX_ATTEMPTS
}
function noteFailure(ip) {
  const now = Date.now()
  const e = attempts.get(ip)
  if (!e || now - e.ts > LOGIN_WINDOW_MS) attempts.set(ip, { count: 1, ts: now })
  else { e.count++; e.ts = now }
}
function noteSuccess(ip) { attempts.delete(ip) }

export function setupAuth(app) {
  app.set('trust proxy', 1) // derrière le proxy HTTPS de l'hébergeur

  // Vérification de santé (utilisée par l'hébergeur) — toujours publique.
  app.get('/healthz', (req, res) => res.json({ ok: true }))

  // Page de connexion — publique.
  app.get('/login', (req, res) => {
    if (misconfigured()) return res.status(503).type('html').send(setupPage())
    res.type('html').send(loginPage())
  })

  // Traitement de la connexion.
  app.post('/api/login', (req, res) => {
    if (!authRequired()) return res.json({ ok: true })
    if (misconfigured()) return res.status(503).json({ error: 'Serveur non configuré (mot de passe manquant).' })
    const ip = req.ip || 'ip'
    if (rateBlocked(ip)) return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 15 minutes.' })
    const password = (req.body && req.body.password) || ''
    if (!safeEqual(password, getPassword())) {
      noteFailure(ip)
      return res.status(401).json({ error: 'Mot de passe incorrect.' })
    }
    noteSuccess(ip)
    res.cookie(COOKIE, sign({ exp: Date.now() + MAX_AGE_MS }), {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'lax',
      maxAge: MAX_AGE_MS,
      path: '/',
    })
    res.json({ ok: true })
  })

  // Déconnexion.
  app.post('/api/logout', (req, res) => {
    res.clearCookie(COOKIE, { path: '/' })
    res.json({ ok: true })
  })

  // Barrière : tout ce qui suit exige une session valide.
  app.use((req, res, next) => {
    if (!authRequired()) return next()
    if (misconfigured()) {
      if (req.path.startsWith('/api/')) return res.status(503).json({ error: 'Serveur non configuré (mot de passe manquant).' })
      return res.status(503).type('html').send(setupPage())
    }
    const token = parseCookies(req)[COOKIE]
    if (verify(token)) return next()
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Non authentifié' })
    // Navigation web non authentifiée → page de connexion.
    res.type('html').send(loginPage())
  })
}

/* ---------- Pages HTML autonomes (styles intégrés) ---------- */
function shell(title, inner) {
  return `<!doctype html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:'Hanken Grotesk',system-ui,sans-serif; color:#191309;
    background:#173b34; padding:24px; }
  .card { background:#fbf7ef; width:100%; max-width:380px; border-radius:20px;
    padding:36px 30px; box-shadow:0 24px 60px rgba(0,0,0,.28); }
  .kicker { font-family:'Space Mono',monospace; font-size:12px; letter-spacing:2px;
    text-transform:uppercase; color:#b8894b; margin:0 0 8px; }
  h1 { font-size:26px; line-height:1.15; margin:0 0 6px; }
  p.sub { color:#6b6156; font-size:14px; margin:0 0 24px; }
  label { display:block; font-size:13px; font-weight:600; margin:0 0 6px; }
  input { width:100%; padding:13px 14px; font-size:16px; border:1px solid #e2dbc9;
    border-radius:12px; background:#fff; font-family:inherit; }
  input:focus { outline:none; border-color:#173b34; box-shadow:0 0 0 3px rgba(23,59,52,.15); }
  button { width:100%; margin-top:18px; padding:13px 16px; font-size:16px; font-weight:700;
    color:#fff; background:#173b34; border:none; border-radius:100px; cursor:pointer;
    font-family:inherit; }
  button:hover { background:#12302b; }
  button:disabled { opacity:.6; cursor:default; }
  .err { color:#b3452f; font-size:14px; margin-top:14px; min-height:18px; }
</style></head><body>${inner}</body></html>`
}

function loginPage() {
  return shell('Connexion · CRM iciGauthier', `
  <form class="card" id="f" autocomplete="off">
    <p class="kicker">CRM iciGauthier</p>
    <h1>Connexion</h1>
    <p class="sub">Espace privé — accès réservé.</p>
    <label for="pw">Mot de passe</label>
    <input id="pw" type="password" autocomplete="current-password" autofocus>
    <button id="btn" type="submit">Entrer</button>
    <div class="err" id="err"></div>
  </form>
  <script>
    const f=document.getElementById('f'),pw=document.getElementById('pw'),
      btn=document.getElementById('btn'),err=document.getElementById('err');
    f.addEventListener('submit',async(e)=>{
      e.preventDefault(); err.textContent=''; btn.disabled=true; btn.textContent='...';
      try{
        const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({password:pw.value})});
        if(r.ok){ location.href='/'; return; }
        const j=await r.json().catch(()=>({}));
        err.textContent=j.error||'Connexion refusée.';
      }catch{ err.textContent='Erreur de connexion.'; }
      btn.disabled=false; btn.textContent='Entrer'; pw.select();
    });
  </script>`)
}

function setupPage() {
  return shell('Configuration requise · CRM', `
  <div class="card">
    <p class="kicker">CRM iciGauthier</p>
    <h1>Presque prêt</h1>
    <p class="sub">Le serveur est en ligne mais aucun mot de passe n'est encore
    défini. Pour protéger tes données, ajoute la variable
    <b>CRM_PASSWORD</b> dans les réglages de l'hébergeur, puis redémarre.</p>
  </div>`)
}
