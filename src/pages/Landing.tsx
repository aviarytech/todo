/**
 * Boop marketing landing page.
 * Ported from design handoff: Boop Landing.html.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Landing() {
  const { isAuthenticated } = useAuth();
  const appHref = isAuthenticated ? '/' : '/login';

  return (
    <div className="boop-landing">
      <style>{boopStyles}</style>

      <nav className="nav">
        <div className="wrap nav-inner">
          <a href="#" className="wordmark"><span className="dot" />boop</a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#trust">Trust</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-cta">
            <Link to={appHref} className="btn btn-ghost">Sign in</Link>
            <Link to={appHref} className="btn btn-primary">Get boop</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap">
          <h1><span className="mark" />boop.</h1>
          <p className="hero-sub">
            A calm little place for the things you need to do — alone or with a few people you trust.
            No feeds, no nags, no notifications asking how you feel.
          </p>
          <div className="hero-cta">
            <Link to={appHref} className="btn btn-primary">Get boop — free</Link>
            <a href="#how" className="btn btn-ghost">See how it works →</a>
          </div>
          <div className="hero-meta">
            <span className="pip" />
            <span>no ads · no tracking · end-to-end signed</span>
          </div>

          <div className="shot">
            <div className="shot-grid">
              <div className="phone">
                <div className="phone-inner">
                  <div className="phone-topbar">
                    <span>9:41</span>
                    <span>•••</span>
                  </div>
                  <div className="wordmark wordmark-sm"><span className="dot" />boop</div>
                  <h4>Weekend, again.</h4>
                  <div className="mono-sub">shared · with jamie</div>
                  <div className="progress"><div /></div>

                  <div className="item"><span className="box on" /><span className="t">Call mom</span></div>
                  <div className="item"><span className="box" /><span className="t">Long walk, no phone</span></div>
                  <div className="item"><span className="box" /><span className="t">Finish the book</span><span className="chip">!! high</span></div>
                  <div className="item"><span className="box on" /><span className="t">Tomatoes, a lot</span><span className="chip">produce</span></div>
                  <div className="item"><span className="box" /><span className="t">Basil</span><span className="chip">produce</span></div>
                </div>
              </div>
              <div className="mock">
                <div className="mock-head">
                  <div>
                    <div className="mock-tag">shared</div>
                    <h3>Sprint 24</h3>
                  </div>
                  <div className="avatars">
                    <div className="avy avy-violet">R</div>
                    <div className="avy avy-coral">J</div>
                    <div className="avy avy-green">M</div>
                  </div>
                </div>
                <div className="progress progress-lg"><div /></div>
                <div className="item done"><span className="box on" /><span className="t">Finalize auth migration plan</span><span className="chip">eng</span></div>
                <div className="item done"><span className="box on" /><span className="t">Review PR #2317</span><span className="chip">review</span></div>
                <div className="item done"><span className="box on" /><span className="t">Write launch post</span><span className="chip">comms</span></div>
                <div className="item"><span className="box" /><span className="t">Perf investigation</span><span className="chip chip-accent">!! high</span></div>
                <div className="item"><span className="box" /><span className="t">Ship settings redesign</span><span className="chip">eng</span></div>
                <div className="item"><span className="box" /><span className="t">Customer sync — Acme</span><span className="chip">cs</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-label">how it works</div>
          <h2>Three things,<br />done <em>beautifully</em>.</h2>
          <p className="section-lede">
            No second-brain claims. No AI that rewrites your life. Just a fast, quiet way to remember stuff and check it off.
          </p>

          <div className="features">
            <div className="feat">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 10l2 2 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Write it down.</h3>
              <p>Open boop. Type. Hit return. You can add <kbd>#tags</kbd> and <kbd>!!</kbd> priorities inline. That's it — that's the app.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="5" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 6l6 3M7 14l6-3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </div>
              <h3>Share, carefully.</h3>
              <p>Invite a few humans. Lists carry a signature so collaborators know it really came from you. Not blockchain jargon — a quiet green dot.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v6l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </div>
              <h3>Boop it.</h3>
              <p>Check the box. Feel the little pop. Watch the progress ring fill. No social graph, no streak lectures — just the quiet satisfaction of a done thing.</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat"><div className="n">3s</div><div className="l">to capture a thing</div></div>
            <div className="stat"><div className="n">0</div><div className="l">notifications unless you ask</div></div>
            <div className="stat"><div className="n">⌘K</div><div className="l">to go anywhere</div></div>
            <div className="stat"><div className="n">E2EE</div><div className="l">on shared lists, by default</div></div>
          </div>
        </div>
      </section>

      <section className="section section-tight" id="trust">
        <div className="wrap">
          <div className="trust">
            <div className="trust-grid">
              <div>
                <div className="section-label section-label-dark">trust, not hype</div>
                <h2>Your lists are yours.<br />Proven, not promised.</h2>
                <p>
                  Every list you share carries a signature from your device. Collaborators see a verified badge —
                  so nobody can spoof "Mom's grocery list" or edit your sprint plan without leaving a trace.
                </p>
                <p>
                  You can export your key, rotate it, or switch devices. The usual web3 strangeness stays behind the curtain.
                  You just see a small green dot.
                </p>
              </div>
              <div className="badge-card">
                <div className="who">
                  <span className="avy avy-violet big">R</span>
                  <div>
                    <div className="name">
                      Riley Chen
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1l1.5 1.2 1.8-.1.2 1.8L10.8 5 10 6.5l.8 1.5-1.3 1.1-.2 1.8-1.8-.1L6 11l-1.5-1.2-1.8.1-.2-1.8L1.2 7 2 5.5 1.2 4l1.3-1.1.2-1.8 1.8.1L6 1z" fill="#6b3cff" />
                        <path d="M4 6l1.5 1.5L8 4.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="did">did:boop:rly.2kx8f…9qn</div>
                  </div>
                </div>
                <div className="badge-note">
                  "Sprint 24" shared this list with 3 people. Signed 2 minutes ago.
                </div>
                <span className="signed">
                  <span className="signed-dot" />
                  verified · signature intact
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pullquote">
        <div className="wrap">
          <blockquote>
            "Finally, a to-do app that doesn't want to be my second brain, my coach, or my life partner. It just remembers milk."
          </blockquote>
          <cite>— every early tester, basically</cite>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-label">pricing</div>
          <h2>Fair, flat, forever.</h2>
          <p className="section-lede">One paid tier, priced for a human. Free forever for solo use. No per-seat price-gouging.</p>

          <div className="plans">
            <div className="plan">
              <div className="plan-name">Personal</div>
              <div className="plan-desc">For you and your groceries.</div>
              <div className="price">$0<small>/forever</small></div>
              <ul>
                <li>Unlimited personal lists</li>
                <li>Calendar view</li>
                <li>Keyboard shortcuts, ⌘K palette</li>
                <li>Light + dark</li>
              </ul>
              <Link to={appHref} className="btn btn-ghost plan-cta">Start free</Link>
            </div>
            <div className="plan hero-plan">
              <div className="plan-name">Shared</div>
              <div className="plan-desc">For a few humans you trust.</div>
              <div className="price">$5<small>/month</small></div>
              <ul>
                <li>Everything in Personal</li>
                <li>Shared + signed lists</li>
                <li>Up to 8 collaborators per list</li>
                <li>Activity history</li>
                <li>Identity + verification</li>
              </ul>
              <Link to={appHref} className="btn btn-primary plan-cta plan-cta-invert">Start 14-day trial</Link>
            </div>
            <div className="plan">
              <div className="plan-name">Team</div>
              <div className="plan-desc">For small teams, no nonsense.</div>
              <div className="price">$8<small>/user/month</small></div>
              <ul>
                <li>Everything in Shared</li>
                <li>Unlimited collaborators</li>
                <li>Workspace templates</li>
                <li>SSO, audit log</li>
                <li>Priority support</li>
              </ul>
              <a href="mailto:hello@boop.app" className="btn btn-ghost plan-cta">Contact us</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tight" id="faq">
        <div className="wrap">
          <div className="section-label">faq</div>
          <h2>Just the honest questions.</h2>

          <div className="faq-grid">
            <div>
              <h3 className="faq-q">Is this another second-brain app?</h3>
              <p className="faq-a">No. It's a first-brain app. It remembers the five things you need to do today and gets out of the way.</p>
            </div>
            <div>
              <h3 className="faq-q">Do I need to understand DIDs?</h3>
              <p className="faq-a">No. You'll see a small green dot next to your name. That's the whole user-facing surface.</p>
            </div>
            <div>
              <h3 className="faq-q">Offline?</h3>
              <p className="faq-a">Works fully offline. Syncs when you reconnect. Your device holds your signing key.</p>
            </div>
            <div>
              <h3 className="faq-q">Do you sell my data?</h3>
              <p className="faq-a">We can't. Shared lists are end-to-end encrypted. We see a blob of ciphertext and the bill you pay us. That's how it should be.</p>
            </div>
            <div>
              <h3 className="faq-q">Will you add AI?</h3>
              <p className="faq-a">Only if it helps you write down "milk" faster. Probably not.</p>
            </div>
            <div>
              <h3 className="faq-q">What platforms?</h3>
              <p className="faq-a">iOS, Android, Mac, Windows, web. Keyboard-first on desktop. Thumb-first on mobile.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-wrap">
        <div className="wrap">
          <div className="cta-band">
            <h2>One thing, then<br />the next.</h2>
            <p>Free for solo use. Nothing to cancel.</p>
            <Link to={appHref} className="btn btn-primary cta-btn">Get boop</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot">
            <div className="foot-col foot-col-brand">
              <div className="wordmark wordmark-sm"><span className="dot" />boop</div>
              <div className="foot-tag">Made carefully, in a quiet room.</div>
            </div>
            <div className="foot-col">
              <strong>Product</strong>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#">Changelog</a>
              <a href="#">Roadmap</a>
            </div>
            <div className="foot-col">
              <strong>Trust</strong>
              <Link to="/privacy">Privacy</Link>
              <a href="#trust">Security</a>
              <a href="#">Open protocol</a>
              <a href="#">Delete my data</a>
            </div>
            <div className="foot-col">
              <strong>Company</strong>
              <a href="#">About</a>
              <a href="#">Manifesto</a>
              <a href="mailto:hello@boop.app">Contact</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 boop · made in a quiet room</span>
            <span>v0.4.0 · signed build</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const boopStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Nunito:wght@500;600;700;800;900&display=swap');

  .boop-landing {
    --bg: #fafaf7;
    --card: #ffffff;
    --panel: #f4f3ee;
    --ink: #111014;
    --muted: #6b6a74;
    --dim: #a8a7b0;
    --line: #ecebe6;
    --lineSoft: #f3f2ec;
    --accent: #6b3cff;
    --accentSoft: #ece4ff;
    --accentInk: #2a1570;
    --ok: #1a7a4c;
    --sans: 'Geist', 'Inter', system-ui, sans-serif;
    --rounded: 'Nunito', system-ui, sans-serif;
    --mono: 'Geist Mono', ui-monospace, monospace;

    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    min-height: 100vh;
  }
  .boop-landing * { box-sizing: border-box; }
  .boop-landing button { font: inherit; cursor: pointer; }
  .boop-landing a { color: inherit; text-decoration: none; }
  .boop-landing kbd { font-family: var(--mono); font-size: 0.85em; background: var(--panel); border: 1px solid var(--line); padding: 1px 6px; border-radius: 4px; }

  .boop-landing .wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
  @media (max-width: 720px) { .boop-landing .wrap { padding: 0 20px; } }

  .boop-landing .nav { position: sticky; top: 0; z-index: 20; backdrop-filter: blur(14px); background: rgba(250,250,247,0.75); border-bottom: 1px solid var(--lineSoft); }
  .boop-landing .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .boop-landing .wordmark { display: inline-flex; align-items: center; gap: 8px; font-family: var(--rounded); font-weight: 800; font-size: 22px; letter-spacing: -0.8px; color: var(--ink); }
  .boop-landing .wordmark .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); }
  .boop-landing .wordmark-sm { font-size: 18px; gap: 6px; }
  .boop-landing .wordmark-sm .dot { width: 13px; height: 13px; }
  .boop-landing .nav-links { display: flex; gap: 28px; font-size: 14px; color: var(--muted); }
  .boop-landing .nav-links a:hover { color: var(--ink); }
  .boop-landing .nav-cta { display: flex; gap: 10px; align-items: center; }
  .boop-landing .btn { border: none; border-radius: 999px; padding: 10px 18px; font-size: 14px; font-weight: 600; font-family: var(--sans); white-space: nowrap; transition: transform 120ms, box-shadow 120ms, background 120ms; display: inline-flex; align-items: center; justify-content: center; }
  .boop-landing .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 6px 18px rgba(107,60,255,0.3); }
  .boop-landing .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(107,60,255,0.38); }
  .boop-landing .btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
  .boop-landing .btn-ghost:hover { background: var(--panel); }
  @media (max-width: 820px) { .boop-landing .nav-links { display: none; } }

  .boop-landing .hero { padding: 80px 0 60px; position: relative; }
  .boop-landing .hero h1 { font-family: var(--rounded); font-weight: 900; font-size: clamp(48px, 8vw, 108px); letter-spacing: -3px; line-height: 0.95; margin: 0 0 24px; max-width: 900px; text-wrap: balance; }
  .boop-landing .hero h1 .mark { display: inline-block; width: clamp(40px, 7vw, 90px); height: clamp(40px, 7vw, 90px); border-radius: 50%; background: var(--accent); vertical-align: -0.14em; margin-right: 14px; }
  .boop-landing .hero-sub { font-size: clamp(17px, 2.1vw, 22px); color: var(--muted); max-width: 620px; line-height: 1.45; margin-bottom: 34px; text-wrap: pretty; }
  .boop-landing .hero-cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .boop-landing .hero-cta .btn-primary { padding: 14px 24px; font-size: 15px; }
  .boop-landing .hero-cta .btn-ghost { padding: 14px 20px; font-size: 15px; }
  .boop-landing .hero-meta { margin-top: 28px; display: inline-flex; align-items: center; gap: 14px; color: var(--muted); font-size: 13px; font-family: var(--mono); }
  .boop-landing .hero-meta .pip { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }

  .boop-landing .shot { margin-top: 56px; position: relative; padding: 40px; background: var(--panel); border-radius: 28px; border: 1px solid var(--line); overflow: hidden; }
  .boop-landing .shot::before { content: ""; position: absolute; top: -80px; right: -100px; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle at center, rgba(107,60,255,0.2), transparent 70%); filter: blur(20px); }
  .boop-landing .shot-grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: stretch; position: relative; }
  @media (max-width: 880px) { .boop-landing .shot-grid { grid-template-columns: 1fr; } }

  .boop-landing .mock { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 22px; box-shadow: 0 30px 80px rgba(20,10,50,0.1); }
  .boop-landing .mock h3 { margin: 0; font-family: var(--rounded); font-weight: 700; font-size: 22px; letter-spacing: -0.4px; }
  .boop-landing .mock-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .boop-landing .mock-tag { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-bottom: 4px; }
  .boop-landing .avatars { display: flex; }
  .boop-landing .avy { width: 28px; height: 28px; border-radius: 50%; color: #fff; font-family: var(--rounded); font-weight: 800; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--card); }
  .boop-landing .avy + .avy { margin-left: -10px; }
  .boop-landing .avy-violet { background: var(--accent); }
  .boop-landing .avy-coral { background: #ff6e4a; }
  .boop-landing .avy-green { background: #1a7a4c; }
  .boop-landing .avy.big { width: 40px; height: 40px; font-size: 15px; border: none; }

  .boop-landing .item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--lineSoft); }
  .boop-landing .item:last-child { border-bottom: none; }
  .boop-landing .box { width: 20px; height: 20px; border: 1.6px solid var(--dim); border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .boop-landing .box.on { background: var(--accent); border-color: var(--accent); }
  .boop-landing .box.on::after { content: ""; width: 10px; height: 6px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg) translate(1px, -1px); }
  .boop-landing .item .t { flex: 1; font-size: 14px; }
  .boop-landing .item.done .t { text-decoration: line-through; color: var(--muted); }
  .boop-landing .chip { font-size: 11px; font-family: var(--mono); background: var(--panel); color: var(--muted); padding: 2px 8px; border-radius: 999px; }
  .boop-landing .chip-accent { color: var(--accent); background: var(--accentSoft); }

  .boop-landing .section { padding: 80px 0; }
  .boop-landing .section-tight { padding-top: 20px; }
  .boop-landing .section-label { font-family: var(--mono); font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; display: inline-flex; align-items: center; gap: 8px; }
  .boop-landing .section-label::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
  .boop-landing .section-label-dark { color: rgba(255,255,255,0.6); }
  .boop-landing .section h2 { font-family: var(--rounded); font-weight: 800; font-size: clamp(36px, 5vw, 60px); letter-spacing: -1.8px; line-height: 1.02; margin: 0 0 20px; max-width: 780px; text-wrap: balance; }
  .boop-landing .section h2 em { font-style: normal; color: var(--accent); }
  .boop-landing .section-lede { font-size: 18px; color: var(--muted); max-width: 620px; line-height: 1.5; margin-bottom: 48px; text-wrap: pretty; }

  .boop-landing .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  @media (max-width: 900px) { .boop-landing .features { grid-template-columns: 1fr; } }
  .boop-landing .feat { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 26px; transition: transform 180ms, box-shadow 180ms; }
  .boop-landing .feat:hover { transform: translateY(-2px); box-shadow: 0 20px 50px rgba(20,10,50,0.08); }
  .boop-landing .feat-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--accentSoft); display: inline-flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 18px; }
  .boop-landing .feat h3 { margin: 0 0 8px; font-family: var(--rounded); font-weight: 700; font-size: 19px; letter-spacing: -0.3px; }
  .boop-landing .feat p { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.55; }

  .boop-landing .trust { background: #0c0b10; color: #f1eef9; border-radius: 28px; padding: 60px 48px; position: relative; overflow: hidden; margin: 40px 0; }
  .boop-landing .trust::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(107,60,255,0.28), transparent 55%); }
  .boop-landing .trust-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; align-items: center; position: relative; }
  @media (max-width: 880px) { .boop-landing .trust-grid { grid-template-columns: 1fr; gap: 40px; } .boop-landing .trust { padding: 48px 28px; } }
  .boop-landing .trust h2 { color: #fff; font-family: var(--rounded); font-weight: 800; font-size: clamp(32px, 4.5vw, 52px); letter-spacing: -1.5px; line-height: 1.05; margin: 0 0 16px; }
  .boop-landing .trust p { font-size: 16px; color: rgba(241,238,249,0.7); line-height: 1.55; margin: 0 0 20px; max-width: 500px; }
  .boop-landing .badge-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px; }
  .boop-landing .badge-card .who { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .boop-landing .badge-card .name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 6px; color: #fff; }
  .boop-landing .badge-card .did { font-family: var(--mono); font-size: 11px; color: rgba(241,238,249,0.5); }
  .boop-landing .badge-note { font-size: 14px; color: rgba(241,238,249,0.8); margin-bottom: 18px; line-height: 1.5; }
  .boop-landing .signed { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-family: var(--mono); color: #6bff9a; padding: 6px 10px; background: rgba(107,255,154,0.1); border-radius: 999px; }
  .boop-landing .signed-dot { width: 6px; height: 6px; border-radius: 50%; background: #6bff9a; }

  .boop-landing .pullquote { padding: 100px 0; text-align: center; }
  .boop-landing .pullquote blockquote { font-family: var(--rounded); font-weight: 600; font-size: clamp(28px, 4vw, 44px); letter-spacing: -1.2px; line-height: 1.2; margin: 0 auto; max-width: 840px; text-wrap: balance; color: var(--ink); }
  .boop-landing .pullquote cite { display: block; font-style: normal; font-size: 14px; color: var(--muted); font-family: var(--mono); margin-top: 28px; }

  .boop-landing .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  @media (max-width: 900px) { .boop-landing .plans { grid-template-columns: 1fr; } }
  .boop-landing .plan { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; }
  .boop-landing .plan.hero-plan { background: var(--ink); color: #fff; border: none; }
  .boop-landing .plan.hero-plan .price, .boop-landing .plan.hero-plan .plan-name { color: #fff; }
  .boop-landing .plan-name { font-family: var(--rounded); font-weight: 700; font-size: 20px; margin-bottom: 4px; }
  .boop-landing .plan-desc { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
  .boop-landing .plan.hero-plan .plan-desc { color: rgba(255,255,255,0.6); }
  .boop-landing .price { font-family: var(--rounded); font-weight: 800; font-size: 44px; letter-spacing: -1.5px; line-height: 1; }
  .boop-landing .price small { font-size: 14px; color: var(--muted); font-weight: 500; margin-left: 4px; }
  .boop-landing .plan.hero-plan .price small { color: rgba(255,255,255,0.6); }
  .boop-landing .plan ul { list-style: none; padding: 0; margin: 24px 0; flex: 1; }
  .boop-landing .plan li { font-size: 14px; padding: 8px 0; display: flex; gap: 10px; align-items: flex-start; color: var(--ink); }
  .boop-landing .plan.hero-plan li { color: rgba(255,255,255,0.85); }
  .boop-landing .plan li::before { content: ""; width: 14px; height: 14px; border-radius: 50%; background: var(--accentSoft); flex-shrink: 0; margin-top: 3px; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M3 6.5l2 2 4.5-5' stroke='%236b3cff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>"); background-position: center; background-repeat: no-repeat; }
  .boop-landing .plan.hero-plan li::before { background-color: rgba(107,60,255,0.3); background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M3 6.5l2 2 4.5-5' stroke='white' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>"); }
  .boop-landing .plan-cta { text-align: center; width: 100%; }
  .boop-landing .plan-cta-invert { background: #fff; color: var(--accent); }
  .boop-landing .plan-cta-invert:hover { background: #f1eef9; }

  .boop-landing .cta-wrap { padding: 60px 0; }
  .boop-landing .cta-band { background: var(--accent); color: #fff; border-radius: 28px; padding: 80px 40px; text-align: center; position: relative; overflow: hidden; }
  .boop-landing .cta-band::before { content: ""; position: absolute; top: -100px; left: -100px; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.1); }
  .boop-landing .cta-band::after { content: ""; position: absolute; bottom: -120px; right: -80px; width: 400px; height: 400px; border-radius: 50%; background: rgba(255,255,255,0.08); }
  .boop-landing .cta-band h2 { position: relative; font-family: var(--rounded); font-weight: 900; font-size: clamp(36px, 6vw, 68px); letter-spacing: -2px; line-height: 1; margin: 0 0 20px; color: #fff; }
  .boop-landing .cta-band p { position: relative; font-size: 18px; opacity: 0.88; margin: 0 0 32px; }
  .boop-landing .cta-btn { background: #fff; color: var(--accent); padding: 16px 28px; font-size: 16px; position: relative; }
  .boop-landing .cta-btn:hover { background: #f1eef9; }

  .boop-landing footer { padding: 60px 0 80px; border-top: 1px solid var(--lineSoft); }
  .boop-landing .foot { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 32px; }
  .boop-landing .foot-col { display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: var(--muted); }
  .boop-landing .foot-col-brand { max-width: 280px; }
  .boop-landing .foot-col strong { color: var(--ink); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; font-family: var(--mono); margin-bottom: 6px; }
  .boop-landing .foot-col a:hover { color: var(--ink); }
  .boop-landing .foot-tag { font-size: 13px; }
  .boop-landing .foot-bottom { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--lineSoft); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--dim); font-family: var(--mono); }

  .boop-landing .phone { width: 300px; margin: 0 auto; background: var(--ink); border-radius: 44px; padding: 10px; box-shadow: 0 40px 80px rgba(20,10,50,0.2); position: relative; }
  .boop-landing .phone-inner { background: var(--bg); border-radius: 34px; overflow: hidden; aspect-ratio: 9 / 19.5; padding: 22px 18px; }
  .boop-landing .phone-topbar { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--muted); font-family: var(--mono); margin-bottom: 18px; }
  .boop-landing .phone h4 { margin: 14px 0 4px; font-family: var(--rounded); font-weight: 700; font-size: 22px; letter-spacing: -0.4px; }
  .boop-landing .mono-sub { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .boop-landing .progress { height: 4px; background: var(--line); border-radius: 999px; overflow: hidden; margin: 14px 0 18px; }
  .boop-landing .progress > div { height: 100%; width: 62%; background: var(--accent); border-radius: 999px; }
  .boop-landing .progress-lg { height: 6px; margin-bottom: 20px; }

  .boop-landing .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin: 40px 0; }
  @media (max-width: 760px) { .boop-landing .stats { grid-template-columns: repeat(2, 1fr); } }
  .boop-landing .stat { padding: 24px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; }
  .boop-landing .stat .n { font-family: var(--rounded); font-weight: 800; font-size: 36px; letter-spacing: -1px; }
  .boop-landing .stat .l { font-size: 13px; color: var(--muted); margin-top: 2px; }

  .boop-landing .faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 48px; margin-top: 40px; }
  @media (max-width: 760px) { .boop-landing .faq-grid { grid-template-columns: 1fr; } }
  .boop-landing .faq-q { font-family: var(--rounded); font-weight: 700; font-size: 17px; margin: 0 0 8px; }
  .boop-landing .faq-a { font-size: 14px; color: var(--muted); line-height: 1.6; margin: 0; }
`;
