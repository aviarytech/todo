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

      {/* Header - compact on mobile with safe area support */}
      <header className="relative z-10 p-4 sm:p-6 safe-area-inset-top">
        <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">💩</span>
            <span className="font-black text-lg sm:text-xl md:text-2xl text-amber-900 truncate">Poo App</span>
          </div>
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-900 text-amber-50 rounded-full font-semibold text-sm sm:text-base hover:bg-amber-800 active:bg-amber-950 transition-colors shadow-lg shadow-amber-900/20 whitespace-nowrap flex-shrink-0"
          >
            {isAuthenticated ? 'Open App' : 'Sign In'}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 md:pt-12 pb-16 sm:pb-20 md:pb-24">
        <div className="text-center">
          {/* Big poop - scales responsively */}
          <div className="text-[80px] sm:text-[100px] md:text-[140px] lg:text-[180px] leading-none mb-2 sm:mb-4 animate-bounce-slow">
            💩
          </div>

          {/* Tagline - readable on all screens */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-amber-900 mb-4 sm:mb-6 leading-tight px-2">
            Organize your life
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              while you Poop
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-amber-800/70 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            The world's most <em>productive</em> todo app. Turn your bathroom breaks 
            into breakthrough moments. 🚽✨
          </p>

          {/* CTA Buttons - full width on mobile, touch-friendly */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 sm:mb-16 px-4 sm:px-0">
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-2xl font-bold text-base sm:text-lg hover:from-amber-500 hover:to-orange-400 active:from-amber-700 active:to-orange-600 transition-all shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1 text-center min-h-[52px] flex items-center justify-center"
            >
              {isAuthenticated ? 'Go to My Lists' : 'Join the Movement'}
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-amber-800 font-semibold hover:text-amber-600 active:text-amber-900 transition-colors text-center min-h-[48px] flex items-center justify-center"
            >
              See Features ↓
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-amber-700/60 text-xs sm:text-sm px-4">
            <span>🧻</span>
            <span>Trusted by productive poopers worldwide</span>
            <span>🧻</span>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-20 sm:mt-24 md:mt-32 scroll-mt-16 sm:scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 text-center mb-8 sm:mb-12 md:mb-16 px-4">
            Why Poo App? 🤔
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Feature 1 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚡</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Add tasks faster than... well, you know. Perfect for those quick sessions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔐</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Cryptographically Verified</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Every task is signed with your personal keys. Your todos, your proof, your legacy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl md:hover:-translate-y-2 transition-all active:scale-[0.98]">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">👥</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Share Lists</h3>
              <p className="text-sm sm:text-base text-amber-800/70">
                Collaborate with family, roommates, or coworkers. Shared accountability, shared relief.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-20 sm:mt-24 md:mt-32 text-center">
          <div className="bg-gradient-to-r from-amber-200/50 to-orange-200/50 rounded-2xl sm:rounded-3xl md:rounded-[40px] p-6 sm:p-10 md:p-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 mb-3 sm:mb-4 px-2">
              Ready to be more productive?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-amber-800/70 mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              Join thousands of people who've transformed their bathroom time into 
              the most organized part of their day.
            </p>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-amber-900 text-amber-50 rounded-2xl font-bold text-lg sm:text-xl hover:bg-amber-800 active:bg-amber-950 transition-colors shadow-xl min-h-[56px]"
            >
              Start Organizing 💩
            </Link>
          </div>
        </section>
      </main>

      {/* Footer - safe area padding for notched devices */}
      <footer className="relative z-10 border-t border-amber-200 bg-amber-50/50 py-6 sm:py-8 safe-area-inset-bottom">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-amber-700/60 text-xs sm:text-sm">
          <p>Made with 💩 by Aviary Tech</p>
          <p className="mt-2">Powered by Originals Protocol — Your data, cryptographically yours.</p>
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
