/**
 * Landing page for Poo App
 * "Organize your life while you Poop" 💩
 *
 * Responsive design with mobile-first approach:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px - 1024px (md)
 * - Desktop: > 1024px (lg)
 */

import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { trackLandingViewed } from '../lib/analytics';

export function Landing() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    trackLandingViewed();
  }, []);

  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => document.body.classList.remove('landing-page');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
      {/* Floating poop emojis background - reduced on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-3xl sm:text-4xl md:text-6xl animate-float"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${15 + (i % 5) * 2}s`,
            }}
          >
            💩
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6 safe-area-inset-top">
        <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">💩</span>
            <span className="font-black text-lg sm:text-xl md:text-2xl text-amber-900 truncate">Poo App</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link
              to="/pricing"
              className="px-3 sm:px-5 py-2 sm:py-2.5 text-amber-900 font-semibold text-sm sm:text-base hover:text-amber-700 transition-colors whitespace-nowrap"
            >
              Pricing
            </Link>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-900 text-amber-50 rounded-full font-semibold text-sm sm:text-base hover:bg-amber-800 active:bg-amber-950 transition-colors shadow-lg shadow-amber-900/20 whitespace-nowrap"
            >
              {isAuthenticated ? 'Open App' : 'Sign In'}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 md:pt-12 pb-16 sm:pb-20 md:pb-24">
        <div className="text-center">
          {/* Big poop - scales responsively */}
          <div className="text-[80px] sm:text-[100px] md:text-[140px] lg:text-[180px] leading-none mb-2 sm:mb-4 animate-bounce-slow">
            💩
          </div>

          {/* Tagline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-amber-900 mb-4 sm:mb-6 leading-tight px-2">
            Organize your life
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              while you Poop
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-amber-800/70 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            Real-time collaborative lists that sync everywhere — even offline.
            Turn your bathroom breaks into breakthrough moments. 🚽✨
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4 sm:px-0">
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-2xl font-bold text-base sm:text-lg hover:from-amber-500 hover:to-orange-400 active:from-amber-700 active:to-orange-600 transition-all shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1 text-center min-h-[56px] flex items-center justify-center"
            >
              {isAuthenticated ? 'Go to My Lists' : 'Get Started Free'}
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-amber-800 font-semibold hover:text-amber-600 active:text-amber-900 transition-colors text-center min-h-[48px] flex items-center justify-center"
            >
              See Features ↓
            </a>
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-amber-700/60 text-xs sm:text-sm px-4 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="text-green-500 font-bold">✓</span> Free forever plan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500 font-bold">✓</span> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500 font-bold">✓</span> Works offline
            </span>
          </div>
        </div>

        {/* Product Demo */}
        <section className="mt-16 sm:mt-20 md:mt-28">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 text-center mb-3 px-4">
            See how it works
          </h2>
          <p className="text-center text-amber-800/60 mb-10 sm:mb-14 text-sm sm:text-base">
            Create, collaborate, and sync — all in seconds.
          </p>
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
            <DemoStep step={1} label="Create a list" phone={<PhoneCreate />} />
            <DemoStep step={2} label="Add items" phone={<PhoneAdd />} />
            <DemoStep step={3} label="Share with others" phone={<PhoneShare />} />
            <DemoStep step={4} label="Sync in real time" phone={<PhoneSync />} />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-20 sm:mt-24 md:mt-32 scroll-mt-16 sm:scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 text-center mb-4 px-4">
            Everything you need, nothing you don't
          </h2>
          <p className="text-center text-amber-800/60 mb-10 sm:mb-14 text-sm sm:text-base">
            Built for the moments when inspiration strikes — wherever you are.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Real-time sync */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚡</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Real-Time Sync</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Every change appears instantly across all your devices. No refresh needed — your lists are always live.
              </p>
            </div>

            {/* Collaboration */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">👥</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Team Collaboration</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Share lists with family, roommates, or teammates. Real-time updates so everyone stays on the same page.
              </p>
            </div>

            {/* Offline */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📡</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Offline First</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                No signal? No problem. Add and check off tasks offline. Everything syncs automatically when you're back.
              </p>
            </div>

            {/* Cryptographic identity */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔐</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Your Data, Your Keys</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Every list is cryptographically signed with your personal DID. Proof of ownership, always.
              </p>
            </div>

            {/* Templates */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📋</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Smart Templates</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Jump-start any list with pre-built templates for groceries, chores, goals, and more.
              </p>
            </div>

            {/* Mobile native */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📱</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Native Mobile App</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                iOS and Android apps that feel native. Install it, open it, and start listing — in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* Why trust us */}
        <section className="mt-20 sm:mt-24 md:mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 text-center mb-10 sm:mb-14 px-4">
            Built on tech that actually works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 text-center">
              <div className="text-4xl mb-3">🆓</div>
              <div className="font-bold text-amber-900 mb-1">Free to start</div>
              <div className="text-sm text-amber-800/60">No credit card. No trial period. Just sign up and go.</div>
            </div>
            <div className="bg-amber-900 rounded-2xl p-6 sm:p-8 shadow-xl shadow-amber-900/20 text-center">
              <div className="text-4xl mb-3">🔐</div>
              <div className="font-bold text-amber-50 mb-1">Cryptographic ownership</div>
              <div className="text-sm text-amber-300">Your lists are signed with your personal DID. No one else can claim your data.</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 text-center">
              <div className="text-4xl mb-3">📡</div>
              <div className="font-bold text-amber-900 mb-1">Works offline</div>
              <div className="text-sm text-amber-800/60">Add tasks with no signal. Auto-syncs when you're back online.</div>
            </div>
          </div>
        </section>

        {/* Pricing summary */}
        <section className="mt-20 sm:mt-24 md:mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 text-center mb-4 px-4">
            Simple, honest pricing
          </h2>
          <p className="text-center text-amber-800/60 mb-10 sm:mb-14 text-sm sm:text-base">
            Start free. Upgrade only when you need more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              detail="forever"
              features={["5 lists", "3 collaborators/list", "Real-time sync", "Offline support"]}
            />
            <PricingCard
              name="Pro"
              price="$5"
              detail="per month"
              features={["Unlimited lists", "Unlimited collaborators", "Verifiable credentials", "Templates + export"]}
              highlight
            />
            <PricingCard
              name="Team"
              price="$12"
              detail="per user/month"
              features={["Everything in Pro", "Team workspace", "Admin controls", "Priority support"]}
            />
          </div>

          <div className="text-center mt-8">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 text-amber-700 font-semibold hover:text-amber-900 transition-colors text-sm sm:text-base"
            >
              See full pricing details →
            </Link>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-20 sm:mt-24 md:mt-32 text-center">
          <div className="bg-gradient-to-r from-amber-200/50 to-orange-200/50 rounded-2xl sm:rounded-3xl md:rounded-[40px] p-6 sm:p-10 md:p-16">
            <div className="text-5xl sm:text-6xl mb-4">💩</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 mb-3 sm:mb-4 px-2">
              Ready to be more productive?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-amber-800/70 mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              Turn your bathroom breaks into the most organized part of your day.
              Free to start — no credit card required.
            </p>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-2xl font-bold text-lg sm:text-xl hover:from-amber-500 hover:to-orange-400 active:from-amber-700 active:to-orange-600 transition-all shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:-translate-y-1 min-h-[60px] flex items-center justify-center sm:inline-flex"
            >
              {isAuthenticated ? 'Go to My Lists' : 'Start for Free — No Card Needed 💩'}
            </Link>
            <p className="mt-4 text-xs text-amber-700/50">Free forever plan available. Upgrade anytime.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-200 bg-amber-50/50 py-6 sm:py-8 safe-area-inset-bottom">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-700/60 text-xs sm:text-sm">
          <p>Made with 💩 by Aviary Tech</p>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-amber-800 transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-amber-800 transition-colors">Sign In</Link>
          </div>
          <p>Powered by Originals Protocol — Your data, cryptographically yours.</p>
        </div>
      </footer>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-30px) rotate(3deg); }
        }
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DemoStep({ step, label, phone }: { step: number; label: string; phone: ReactNode }) {
  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[220px] md:w-auto snap-start flex flex-col items-center gap-3">
      <div className="w-full bg-white/70 backdrop-blur-sm rounded-[28px] shadow-xl shadow-amber-200/60 border border-amber-100 overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 380 }}>
        {phone}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
        <span className="text-sm font-semibold text-amber-900">{label}</span>
      </div>
    </div>
  );
}

function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 bg-amber-900">
        <span className="text-[9px] text-amber-200 font-medium">9:41</span>
        <div className="w-16 h-4 bg-amber-800 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 border border-amber-400 rounded-[2px] relative"><div className="absolute inset-[1px] bg-amber-400 rounded-[1px] w-2/3" /></div>
        </div>
      </div>
      {/* App header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-900">
        <span className="text-base">💩</span>
        <span className="text-amber-50 font-black text-sm">Poo App</span>
      </div>
      {/* Content */}
      <div className="flex-1 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function PhoneCreate() {
  return (
    <PhoneShell>
      <div className="p-3">
        <p className="text-[9px] text-amber-700/60 font-medium mb-2">My Lists</p>
        {[{ emoji: '🛒', name: 'Groceries', count: 5 }, { emoji: '✅', name: 'Work Tasks', count: 3 }].map((list) => (
          <div key={list.name} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 mb-2 shadow-sm">
            <span className="text-base">{list.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-amber-900 truncate">{list.name}</p>
              <p className="text-[8px] text-amber-700/50">{list.count} items</p>
            </div>
          </div>
        ))}
        <button className="w-full mt-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-2.5 shadow-md shadow-amber-400/30">
          <span className="text-base font-bold leading-none">+</span>
          <span className="text-[10px] font-bold">New List</span>
        </button>
      </div>
    </PhoneShell>
  );
}

function PhoneAdd() {
  return (
    <PhoneShell>
      <div className="p-3 flex flex-col h-full">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base">🛒</span>
          <p className="text-[11px] font-bold text-amber-900">Groceries</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            { label: 'Milk 🥛', done: true },
            { label: 'Eggs 🥚', done: true },
            { label: 'Bread 🍞', done: false },
            { label: 'Butter', done: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.done ? 'border-green-400 bg-green-400' : 'border-amber-300'}`}>
                {item.done && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </div>
              <span className={`text-[10px] font-medium ${item.done ? 'line-through text-amber-400' : 'text-amber-900'}`}>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-3">
          <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-[9px] text-amber-400 border border-amber-200 shadow-sm">Add an item…</div>
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">+</span>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function PhoneShare() {
  return (
    <PhoneShell>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base">🛒</span>
          <p className="text-[11px] font-bold text-amber-900">Groceries</p>
          <div className="ml-auto flex -space-x-1.5">
            {['🧑', '👩'].map((a, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-amber-200 border border-white flex items-center justify-center text-[9px]">{a}</div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-3 border border-amber-100">
          <p className="text-[10px] font-bold text-amber-900 mb-2">Invite someone</p>
          <div className="flex gap-1.5 mb-3">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-[9px] text-amber-500">friend@email.com</div>
            <div className="px-2 py-1.5 bg-amber-500 text-white rounded-lg text-[9px] font-bold shadow-sm">Send</div>
          </div>
          <p className="text-[9px] text-amber-700/50 mb-2 font-medium">Collaborators</p>
          {['🧑 Alex', '👩 Jamie'].map((name) => (
            <div key={name} className="flex items-center gap-1.5 py-1">
              <div className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-[8px]">{name[0]}</div>
              <span className="text-[9px] text-amber-800">{name.slice(2)}</span>
              <span className="ml-auto text-[8px] text-green-500 font-medium">Active</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PhoneSync() {
  return (
    <PhoneShell>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-base">🛒</span>
          <p className="text-[11px] font-bold text-amber-900">Groceries</p>
          <div className="ml-auto flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-bold text-green-600">Live</span>
          </div>
        </div>
        <p className="text-[8px] text-amber-600/60 mb-3">Alex just added an item ✨</p>
        <div className="space-y-1.5">
          {[
            { label: 'Milk 🥛', done: true, who: '' },
            { label: 'Eggs 🥚', done: true, who: '' },
            { label: 'Bread 🍞', done: false, who: '' },
            { label: 'Olive oil 🫙', done: false, who: 'Alex', isNew: true },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm ${item.isNew ? 'bg-amber-100 border border-amber-300' : 'bg-white'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.done ? 'border-green-400 bg-green-400' : 'border-amber-300'}`}>
                {item.done && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </div>
              <span className={`text-[10px] font-medium flex-1 ${item.done ? 'line-through text-amber-400' : 'text-amber-900'}`}>{item.label}</span>
              {item.isNew && <span className="text-[7px] text-amber-600 font-medium bg-amber-200 px-1 rounded">new</span>}
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PricingCard({
  name,
  price,
  detail,
  features,
  highlight,
}: {
  name: string;
  price: string;
  detail: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col border transition-shadow ${
        highlight
          ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-500/10'
          : 'border-amber-200/60 bg-white/60 backdrop-blur-sm'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            Most popular
          </span>
        </div>
      )}
      <div className="mb-4">
        <h3 className="font-bold text-amber-900 mb-1">{name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-amber-900">{price}</span>
          <span className="text-xs text-amber-700/60">{detail}</span>
        </div>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-amber-800/70">
            <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
