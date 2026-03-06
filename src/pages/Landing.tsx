/**
 * Landing page for Poo App
 * "Organize your life while you Poop" 💩
 *
 * Responsive design with mobile-first approach:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px - 1024px (md)
 * - Desktop: > 1024px (lg)
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 overflow-hidden">
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

        {/* Social proof */}
        <section className="mt-20 sm:mt-24 md:mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 text-center mb-10 sm:mb-14 px-4">
            Loved by productive poopers everywhere 🧻
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Testimonial
              quote="I get more done in the bathroom than I do in meetings. Poo App changed my life."
              author="Alex K."
              role="Software Engineer"
            />
            <Testimonial
              quote="Our grocery lists are finally in sync. No more double-buying hummus."
              author="Jamie & Sam"
              role="Married, 4 cats"
              highlight
            />
            <Testimonial
              quote="The offline mode is a lifesaver. My building has terrible cell service and it just works."
              author="Morgan T."
              role="NYC Apartment Dweller"
            />
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-4xl font-black text-amber-900 mb-1">10k+</div>
              <div className="text-xs sm:text-sm text-amber-800/60">Active users</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black text-amber-900 mb-1">1M+</div>
              <div className="text-xs sm:text-sm text-amber-800/60">Tasks completed</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black text-amber-900 mb-1">4.9★</div>
              <div className="text-xs sm:text-sm text-amber-800/60">App store rating</div>
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
              Join thousands of people who've transformed their bathroom time into
              the most organized part of their day.
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

function Testimonial({
  quote,
  author,
  role,
  highlight,
}: {
  quote: string;
  author: string;
  role: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 flex flex-col gap-4 ${
        highlight
          ? 'bg-amber-900 text-amber-50 shadow-xl shadow-amber-900/20'
          : 'bg-white/60 backdrop-blur-sm shadow-xl shadow-amber-200/50'
      }`}
    >
      <p className={`text-sm sm:text-base leading-relaxed italic ${highlight ? 'text-amber-100' : 'text-amber-800/80'}`}>
        "{quote}"
      </p>
      <div>
        <div className={`font-semibold text-sm ${highlight ? 'text-amber-50' : 'text-amber-900'}`}>{author}</div>
        <div className={`text-xs mt-0.5 ${highlight ? 'text-amber-300' : 'text-amber-700/50'}`}>{role}</div>
      </div>
    </div>
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
