import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCafeSettings } from '../cafeSettings'

/* ─── types ───────────────────────────────────────────────────────────────── */
declare global {
  interface Window { THREE: any }
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function buildAddress(parts: string[]) {
  return parts.filter((p) => p.trim().length > 0).join(', ')
}
function fmtMode(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function countUp(el: HTMLElement, target: number, suffix = '', frames = 55) {
  let i = 0
  const step = target / frames
  let cur = 0
  const iv = setInterval(() => {
    i++
    cur = Math.min(cur + step, target)
    el.innerHTML = `${Math.round(cur)}<span style="font-size:60%;color:#C8622A">${suffix}</span>`
    if (i >= frames) clearInterval(iv)
  }, 16)
  return iv
}

/* ─── 3D hook ─────────────────────────────────────────────────────────────── */
function use3DHero(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  heroRef: React.RefObject<HTMLDivElement>,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    const hero   = heroRef.current
    if (!canvas || !hero) return

    const init = () => {
      if (!window.THREE) { setTimeout(init, 120); return }
      const T = window.THREE

      const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene  = new T.Scene()
      const camera = new T.PerspectiveCamera(60, 1, 0.1, 100)
      camera.position.set(0, 1.5, 7)
      camera.lookAt(0, 0, 0)

      const resize = () => {
        const w = hero.clientWidth, h = hero.clientHeight || 480
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      window.addEventListener('resize', resize)

      const kMat = new T.MeshPhongMaterial({ color: 0x1a0e06, emissive: 0x3a1a08, specular: 0xC8622A, shininess: 80 })
      const knot  = new T.Mesh(new T.TorusKnotGeometry(1.5, 0.42, 160, 12), kMat)
      knot.position.set(3.2, 0, 0)
      scene.add(knot)

      const wKnot = new T.Mesh(
        new T.TorusKnotGeometry(1.52, 0.43, 80, 12),
        new T.MeshBasicMaterial({ color: 0xC8622A, wireframe: true, transparent: true, opacity: 0.13 }),
      )
      wKnot.position.set(3.2, 0, 0)
      scene.add(wKnot)

      scene.add(new T.AmbientLight(0x0A0804, 2))
      const pL1 = new T.PointLight(0xC8622A, 3, 12); pL1.position.set(5, 3, 3); scene.add(pL1)
      const pL2 = new T.PointLight(0xD4A840, 1.5, 10); pL2.position.set(0, 2, 4); scene.add(pL2)

      const N = 100; const pos = new Float32Array(N * 3)
      for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 14
      const pGeo = new T.BufferGeometry()
      pGeo.setAttribute('position', new T.BufferAttribute(pos, 3))
      scene.add(new T.Points(pGeo, new T.PointsMaterial({ color: 0xD4A840, size: 0.06, transparent: true, opacity: 0.45 })))

      let mx = 0, my = 0
      const onMouse = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2
        my = -(e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('mousemove', onMouse)

      let t = 0; let raf: number
      const loop = () => {
        raf = requestAnimationFrame(loop)
        t += 0.008
        knot.rotation.x  = t * 0.4
        knot.rotation.y  = t * 0.6
        wKnot.rotation.x = knot.rotation.x
        wKnot.rotation.y = knot.rotation.y
        camera.position.x += (mx * 1.2 - camera.position.x) * 0.04
        camera.position.y += (my * 0.8 - camera.position.y) * 0.04
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }
      loop()

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        window.removeEventListener('mousemove', onMouse)
        renderer.dispose()
      }
    }
    init()
  }, [canvasRef, heroRef])
}

/* ─── atoms ───────────────────────────────────────────────────────────────── */
function Badge({ children, color = 'coral' }: { children: React.ReactNode; color?: 'coral' | 'gold' | 'teal' }) {
  const map = {
    coral: { bg: 'rgba(200,98,42,.12)',  color: '#C8622A', border: 'rgba(200,98,42,.28)'  },
    gold:  { bg: 'rgba(212,168,64,.12)', color: '#D4A840', border: 'rgba(212,168,64,.28)' },
    teal:  { bg: 'rgba(29,158,117,.12)', color: '#1D9E75', border: 'rgba(29,158,117,.28)' },
  }
  const c = map[color]
  return (
    <span style={{
      display: 'inline-flex', padding: '4px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  )
}

function FeatCard({ iconPath, title, body }: { iconPath: string; title: string; body: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(245,240,232,.07)' : 'rgba(245,240,232,.04)',
        border: `1px solid ${hov ? 'rgba(200,98,42,.32)' : 'rgba(245,240,232,.09)'}`,
        borderRadius: 16, padding: '20px', transition: 'all .22s', cursor: 'default',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: 'rgba(200,98,42,.14)', border: '1px solid rgba(200,98,42,.24)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C8622A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath} />
        </svg>
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: '#F5F0E8', margin: '0 0 5px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'rgba(245,240,232,.48)', lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  )
}

function StepRow({ n, title, body, last }: { n: string; title: string; body: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '17px 0', borderBottom: last ? 'none' : '1px solid rgba(245,240,232,.07)' }}>
      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 800, color: 'rgba(200,98,42,.55)', letterSpacing: '.1em', flexShrink: 0, width: 24, paddingTop: 2 }}>{n}</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F0E8', margin: '0 0 3px' }}>{title}</p>
        <p style={{ fontSize: 12, color: 'rgba(245,240,232,.42)', lineHeight: 1.55, margin: 0 }}>{body}</p>
      </div>
    </div>
  )
}

/* ─── page ────────────────────────────────────────────────────────────────── */
export function CustomerLandingPage() {
  const settings = useCafeSettings()
  const navigate  = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef   = useRef<HTMLDivElement>(null)
  const statsRef  = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  use3DHero(canvasRef, heroRef)

  useEffect(() => {
    if (!statsRef.current) return
    const active = settings.table_access.filter((t) => t.active).length || settings.table_count
    const ivs: ReturnType<typeof countUp>[] = []
    const delay = setTimeout(() => {
      const g = (id: string) => statsRef.current?.querySelector<HTMLElement>(`#${id}`)
      const s1 = g('ls1'); if (s1) ivs.push(countUp(s1, active, '+'))
      const s2 = g('ls2'); if (s2) ivs.push(countUp(s2, settings.table_count * 3 + 8))
      const s3 = g('ls3'); if (s3) ivs.push(countUp(s3, 18, 's'))
      const s4 = g('ls4'); if (s4) ivs.push(countUp(s4, 100, '%'))
    }, 500)
    return () => { clearTimeout(delay); ivs.forEach(clearInterval) }
  }, [settings])

  const address      = buildAddress([settings.address_line_1, settings.address_line_2, settings.city, settings.state_region, settings.postal_code, settings.country_code])
  const supportPhone = settings.support_phone.trim()
  const supportEmail = settings.support_email.trim()
  const heroTitle    = settings.name?.trim() || 'The café that knows your table'
  const tagline      = settings.tagline?.trim() || 'Scan, browse, order — all from your seat.'
  const activeTables = settings.table_access.filter((t) => t.active)
  const previewTables = settings.table_name_preview.slice(0, 9)
  const guestCount   = activeTables.length || settings.table_count
  const firstToken   = settings.table_access[0]?.token ?? ''

  const words = heroTitle.split(' ')
  const lastWord = words.pop()!
  const restWords = words.join(' ')

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" />

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0A0804;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}

        .cl{font-family:'DM Sans',sans-serif;background:#0A0804;color:#F5F0E8;min-height:100vh;overflow-x:hidden;}

        /* NAV */
        .cl-nav{
          position:sticky;top:0;z-index:100;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 clamp(16px,5vw,52px);height:58px;
          background:rgba(10,8,4,.9);backdrop-filter:blur(14px);
          border-bottom:1px solid rgba(245,240,232,.09);
        }
        .cl-brand{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#F5F0E8;letter-spacing:-.3px;}
        .cl-nav-links{display:flex;gap:24px;align-items:center;}
        .cl-nav-links a{font-size:13px;color:rgba(245,240,232,.5);text-decoration:none;transition:color .15s;}
        .cl-nav-links a:hover{color:#F5F0E8;}
        .cl-nav-cta{padding:8px 18px;border-radius:9px;background:#C8622A;color:#fff;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;transition:background .15s;}
        .cl-nav-cta:hover{background:#a04e20;}
        .cl-burger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px;}
        .cl-burger span{display:block;width:22px;height:2px;background:#F5F0E8;border-radius:2px;}
        .cl-mob{display:none;position:fixed;inset:0;z-index:200;background:rgba(10,8,4,.97);flex-direction:column;align-items:center;justify-content:center;gap:26px;}
        .cl-mob.open{display:flex;}
        .cl-mob a{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#F5F0E8;text-decoration:none;}
        .cl-mob-close{position:absolute;top:18px;right:20px;background:none;border:none;color:rgba(245,240,232,.4);font-size:30px;cursor:pointer;line-height:1;}

        /* HERO */
        .cl-hero{position:relative;min-height:clamp(380px,55vw,560px);display:flex;align-items:center;overflow:hidden;}
        .cl-hero canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;}
        .cl-hero-ov{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(10,8,4,.94) 40%,rgba(10,8,4,.06) 100%);}
        .cl-hero-copy{position:relative;z-index:2;padding:clamp(32px,6vw,62px) clamp(16px,5vw,52px);max-width:min(580px,92vw);animation:fadeUp .7s ease both;}
        .cl-live{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:99px;border:1px solid rgba(200,160,80,.38);background:rgba(200,160,80,.09);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#D4A840;margin-bottom:16px;}
        .cl-live-dot{width:6px;height:6px;border-radius:50%;background:#D4A840;animation:dpulse 1.6s infinite;}
        .cl-hero h1{font-family:'Syne',sans-serif;font-size:clamp(26px,6vw,58px);font-weight:800;line-height:1.0;letter-spacing:-1px;margin-bottom:12px;}
        .cl-hero h1 em{font-style:normal;color:#C8622A;}
        .cl-hero-sub{font-size:clamp(13px,2vw,15px);color:rgba(245,240,232,.5);line-height:1.65;font-weight:300;margin-bottom:26px;max-width:400px;}
        .cl-cta-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
        .cl-btn{padding:clamp(10px,2vw,13px) clamp(18px,3vw,26px);border-radius:11px;font-size:clamp(12px,1.5vw,13px);white-space:nowrap;cursor:pointer;transition:all .15s;}
        .cl-btn-p{background:#C8622A;color:#fff;font-family:'Syne',sans-serif;font-weight:700;border:none;letter-spacing:.02em;}
        .cl-btn-p:hover{background:#a04e20;}
        .cl-btn-g{border:1px solid rgba(245,240,232,.2);color:rgba(245,240,232,.6);background:none;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;}
        .cl-btn-g:hover{border-color:rgba(245,240,232,.5);color:#F5F0E8;}

        /* STATS */
        .cl-stats{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(245,240,232,.09);border-bottom:1px solid rgba(245,240,232,.09);}
        .cl-stat{padding:clamp(13px,3vw,22px) clamp(12px,3vw,24px);border-right:1px solid rgba(245,240,232,.09);}
        .cl-stat:last-child{border-right:none;}
        .cl-stat-n{font-family:'Syne',sans-serif;font-size:clamp(18px,4vw,28px);font-weight:800;color:#F5F0E8;line-height:1;}
        .cl-stat-l{font-size:10px;color:rgba(245,240,232,.32);margin-top:3px;letter-spacing:.08em;text-transform:uppercase;}

        /* SECTIONS */
        .cl-sec{padding:clamp(40px,7vw,72px) clamp(16px,5vw,52px);}
        .cl-sec-tag{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B07D3A;margin-bottom:8px;font-weight:600;}
        .cl-sec-title{font-family:'Syne',sans-serif;font-size:clamp(20px,4vw,38px);font-weight:800;letter-spacing:-.5px;line-height:1.1;margin-bottom:6px;}
        .cl-sec-sub{font-size:clamp(12px,1.8vw,14px);color:rgba(245,240,232,.48);font-weight:300;line-height:1.65;max-width:500px;margin-bottom:30px;}

        /* FEAT GRID */
        .cl-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}

        /* SETUP */
        .cl-setup{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,52px);align-items:start;}
        .cl-chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .cl-chip{padding:7px 10px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;transition:all .2s;}
        .cl-detail{padding:16px;border-radius:13px;background:rgba(245,240,232,.04);border:1px solid rgba(245,240,232,.09);margin-top:18px;}
        .cl-detail-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(245,240,232,.07);}
        .cl-detail-row:last-child{border-bottom:none;}

        .cl-foot{padding:clamp(14px,3vw,22px) clamp(16px,5vw,52px);border-top:1px solid rgba(245,240,232,.09);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}
        .cl-foot-t{font-size:11px;color:rgba(245,240,232,.25);}

        /* ── TABLET 600-899 ── */
        @media(max-width:899px){
          .cl-nav-links{display:none;}
          .cl-burger{display:flex;}
          .cl-feat{grid-template-columns:repeat(2,1fr);}
          .cl-stats{grid-template-columns:repeat(2,1fr);}
          .cl-stat:nth-child(2){border-right:none;}
          .cl-stat:nth-child(3){border-top:1px solid rgba(245,240,232,.09);}
          .cl-stat:nth-child(4){border-top:1px solid rgba(245,240,232,.09);border-right:none;}
          .cl-setup{grid-template-columns:1fr;}
          .cl-hero-ov{background:linear-gradient(160deg,rgba(10,8,4,.92) 45%,rgba(10,8,4,.2) 100%);}
        }

        /* ── PHONE <600 ── */
        @media(max-width:599px){
          .cl-hero{min-height:340px;}
          .cl-feat{grid-template-columns:1fr;}
          .cl-chips{grid-template-columns:repeat(3,1fr);}
          .cl-cta-row{flex-direction:column;align-items:stretch;}
          .cl-btn{text-align:center;justify-content:center;width:100%;}
          .cl-hero-ov{background:rgba(10,8,4,.82);}
        }

        /* ── LARGE DESKTOP >1280 ── */
        @media(min-width:1280px){
          .cl-feat{grid-template-columns:repeat(3,1fr);gap:18px;}
          .cl-setup{gap:68px;}
          .cl-hero h1{font-size:clamp(52px,5vw,68px);}
        }
      `}</style>

      <div className="cl">

        {/* NAV */}
        <nav className="cl-nav">
          <span className="cl-brand">{settings.name || 'Café'}</span>
          <div className="cl-nav-links">
            <a href="#how">How it works</a>
            <a href="#tables">Tables</a>
            {supportPhone && <a href={`tel:${supportPhone}`}>Contact</a>}
            <button className="cl-nav-cta" onClick={() => navigate(`/t/${firstToken}`)}>Open menu →</button>
          </div>
          <button className="cl-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </nav>

        {/* MOBILE OVERLAY */}
        <div className={`cl-mob${menuOpen ? ' open' : ''}`} role="dialog" aria-modal="true">
          <button className="cl-mob-close" onClick={() => setMenuOpen(false)} aria-label="Close">×</button>
          <a href="#how"     onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#tables"  onClick={() => setMenuOpen(false)}>Tables</a>
          {supportPhone && <a href={`tel:${supportPhone}`} onClick={() => setMenuOpen(false)}>Call us</a>}
          <button
            className="cl-nav-cta"
            style={{ fontSize: 15, padding: '13px 32px' }}
            onClick={() => { setMenuOpen(false); navigate(`/t/${firstToken}`) }}
          >
            Open menu →
          </button>
        </div>

        {/* HERO */}
        <div className="cl-hero" ref={heroRef}>
          <canvas ref={canvasRef} />
          <div className="cl-hero-ov" />
          <div className="cl-hero-copy">
            <div className="cl-live">
              <span className="cl-live-dot" />
              {fmtMode(settings.service_mode)} · Live ordering
            </div>
            <h1>{restWords} <em>{lastWord}</em></h1>
            <p className="cl-hero-sub">{tagline} No app, no sign-up, no waiting game.</p>
            <div className="cl-cta-row">
              <button className="cl-btn cl-btn-p" onClick={() => navigate(`/t/${firstToken}`)}>Start at your table →</button>
              <a href="#how" className="cl-btn cl-btn-g">See how it works</a>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="cl-stats" ref={statsRef}>
          {([['ls1','Tables live'],['ls2','Menu items'],['ls3','Avg scan to order'],['ls4','No account needed']] as [string,string][]).map(([id, label]) => (
            <div className="cl-stat" key={id}>
              <div className="cl-stat-n" id={id}>0<span style={{ fontSize:'60%', color:'#C8622A' }}></span></div>
              <div className="cl-stat-l">{label}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <div className="cl-sec" id="how">
          <p className="cl-sec-tag">Why it works</p>
          <h2 className="cl-sec-title">Built different. Feels instant.</h2>
          <p className="cl-sec-sub">Every table gets its own live menu link. No generic homepage, no guessing, no wrong-table mix-ups.</p>
          <div className="cl-feat">
            <FeatCard iconPath="M13 2L3 14h9l-1 8 10-12h-9l1-8z"                                          title="Instant table link"       body="Scan once. Menu loads pre-assigned to your exact seat — no searching, no wrong table." />
            <FeatCard iconPath="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-14v4l3 1.5"                   title="Live kitchen sync"        body="Orders hit the right station the moment you tap. Track status in real time." />
            <FeatCard iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" title="Zero sign-up"       body="No app, no account, no password. Just the link and you're ordering in seconds." />
            <FeatCard iconPath="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" title="Smart recommendations"  body="The system learns what pairs well and suggests add-ons that fit your order." />
            <FeatCard iconPath="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v4M10 1v4M14 1v4" title="Follow-up orders" body="Want another round? Add to the same tracker — no new queue, same table context." />
            <FeatCard iconPath="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"   title="Ready alerts"             body="Get a chime when your order is ready. Browser notification, no install required." />
          </div>
        </div>

        {/* TABLE SETUP */}
        <div className="cl-sec" style={{ paddingTop: 0 }} id="tables">
          <div className="cl-setup">
            <div>
              <p className="cl-sec-tag">Table setup</p>
              <h2 className="cl-sec-title">Every seat has its own link</h2>
              <p className="cl-sec-sub">Staff assign QR codes. Guests scan and land on the right menu — every time.</p>
              <StepRow n="01" title="Find the code at your seat"      body="Table card, NFC tap, or staff-shared link — all go to the same place." />
              <StepRow n="02" title="Menu loads for your exact table" body="No homepage, no table-number hunt. The link already knows where you are." />
              <StepRow n="03" title="Order, relax, track"             body="Kitchen sees your table ID instantly. You see real-time status on the same screen." last />

              <div className="cl-detail">
                <p style={{ fontSize:10, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(245,240,232,.26)', margin:'0 0 12px' }}>Visit details</p>
                {[
                  { label: 'Address',     value: address || 'Not configured' },
                  { label: 'Help',        value: [supportPhone, supportEmail].filter(Boolean).join(' · ') || 'Ask staff at your table' },
                  { label: 'Table style', value: fmtMode(settings.table_name_style) },
                  { label: 'Currency',    value: settings.currency_code },
                ].map(({ label, value }) => (
                  <div className="cl-detail-row" key={label}>
                    <span style={{ fontSize:12, color:'rgba(245,240,232,.3)', flexShrink:0 }}>{label}</span>
                    <span style={{ fontSize:12, color:'#F5F0E8', textAlign:'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(245,240,232,.26)', marginBottom:10 }}>
                Live tables · {guestCount} configured
              </p>
              <div className="cl-chips">
                {previewTables.map((name, i) => (
                  <div key={name} className="cl-chip" style={{
                    background: i < activeTables.length ? 'rgba(200,98,42,.1)' : 'rgba(245,240,232,.04)',
                    border: `1px solid ${i < activeTables.length ? 'rgba(200,98,42,.38)' : 'rgba(245,240,232,.1)'}`,
                    color: i < activeTables.length ? '#C8622A' : 'rgba(245,240,232,.46)',
                  }}>
                    {name}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:13 }}>
                <Badge color="coral">{activeTables.length} active</Badge>
                <Badge color="gold">{settings.currency_code}</Badge>
                <Badge color="teal">No account</Badge>
              </div>

              <div style={{ marginTop:18, borderRadius:13, overflow:'hidden', border:'1px solid rgba(245,240,232,.09)', aspectRatio:'16/9', background:'rgba(245,240,232,.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {settings.image_url?.trim() ? (
                  <img src={settings.image_url} alt={settings.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                ) : (
                  <div style={{ textAlign:'center', color:'rgba(245,240,232,.18)' }}>
                    <div style={{ fontSize:34 }}>☕</div>
                    <p style={{ fontSize:11, marginTop:5 }}>Table service</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  "Always use your own table's link — not a neighbour's",
                  'No account or download needed to order',
                  'Staff can give you the correct link if the code is missing',
                ].map((text) => (
                  <div key={text} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                    <span style={{ color:'#1D9E75', fontSize:12, flexShrink:0, marginTop:1 }}>✓</span>
                    <p style={{ fontSize:12, color:'rgba(245,240,232,.42)', lineHeight:1.55, margin:0 }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="cl-foot">
          <span className="cl-foot-t">Table ordering · No app required · {fmtMode(settings.service_mode)}</span>
          <span className="cl-foot-t">Currency: {settings.currency_code} · {activeTables.length} tables live</span>
        </div>

      </div>
    </>
  )
}
