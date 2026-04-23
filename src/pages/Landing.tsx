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
          <p className="hero-signin">
            Already using boop? <Link to={appHref}>Sign in</Link>
          </p>
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
              <a href="mailto:hello@boop.ad" className="btn btn-ghost plan-cta">Contact us</a>
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
              <a href="mailto:hello@boop.ad">Contact</a>
              <Link to={appHref}>Sign in</Link>
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
