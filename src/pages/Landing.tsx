/**
 * Landing page for Poo App
 * "Organize your life while you Poop"
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
    <div className="min-h-screen bg-amber-50 overflow-x-hidden">

      {/* Header */}
      <header className="pt-14 px-4 pb-4 sm:pt-8 sm:px-6 sm:pb-6 safe-area-inset-top">
        <nav className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-2xl sm:text-3xl flex-shrink-0">💩</span>
            <span className="font-black text-lg sm:text-xl text-amber-900 truncate">Poo App</span>
          </div>
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-900 text-amber-50 rounded-full font-semibold text-sm sm:text-base hover:bg-amber-800 active:bg-amber-950 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {isAuthenticated ? 'Open App' : 'Sign In'}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 md:pt-28 pb-16 sm:pb-20 md:pb-24">
        <div className="text-center">
          <div className="text-[72px] sm:text-[96px] md:text-[112px] leading-none mb-6 sm:mb-8 cursor-default select-none hover:animate-wiggle" aria-hidden="true">
            💩
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-amber-900 mb-6 sm:mb-8 leading-[0.95] tracking-tight">
            Organize your life
            <br />
            <span className="font-light text-amber-700">while you</span> Poop
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-amber-800/60 max-w-md mx-auto mb-10 sm:mb-14 leading-relaxed">
            The world's most <em>productive</em> todo app. Turn your bathroom breaks
            into breakthrough moments.
          </p>

          <Link
            to={isAuthenticated ? '/app?action=new' : '/login'}
            className="inline-flex px-10 py-4 bg-amber-900 text-amber-50 rounded-full font-bold text-base sm:text-lg hover:bg-amber-800 active:bg-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50 transition-colors min-h-[52px] items-center justify-center"
          >
            {isAuthenticated ? 'Start a List' : 'Sign in to Start a List'}
          </Link>
        </div>

        {/* Features */}
        <section id="features" className="mt-28 sm:mt-36 md:mt-44 scroll-mt-16 sm:scroll-mt-20">

          {/* Lead feature — the differentiator */}
          <div className="bg-amber-900 text-amber-50 rounded-2xl p-8 sm:p-10 md:p-12 mb-4 sm:mb-6">
            <div className="max-w-lg">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 leading-snug">
                Cryptographically yours
              </h3>
              <p className="text-amber-200 text-sm sm:text-base md:text-lg leading-relaxed">
                Every task is signed with your personal keys via the Originals Protocol.
                Your todos, your proof, your legacy — not someone else's database entry.
              </p>
            </div>
          </div>

          {/* Supporting features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-100">
              <div className="text-2xl sm:text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-bold text-amber-900 mb-1.5">Lightning fast</h3>
              <p className="text-sm text-amber-800/60 leading-relaxed">
                Add tasks faster than... well, you know. Perfect for those quick sessions.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-100">
              <div className="text-2xl sm:text-3xl mb-3">👥</div>
              <h3 className="text-lg font-bold text-amber-900 mb-1.5">Share lists</h3>
              <p className="text-sm text-amber-800/60 leading-relaxed">
                Collaborate with family, roommates, or coworkers. Shared accountability, shared relief.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-28 sm:mt-36 md:mt-44 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-900 mb-3 sm:mb-4">
            Ready to be more productive?
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-amber-800/60 mb-8 sm:mb-10 max-w-md mx-auto">
            Join thousands who've transformed their bathroom time into
            the most organized part of their day.
          </p>
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="inline-flex px-10 py-4 sm:py-5 bg-amber-900 text-amber-50 rounded-full font-bold text-lg sm:text-xl hover:bg-amber-800 active:bg-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50 transition-colors min-h-[56px] items-center justify-center"
          >
            Start Organizing 💩
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200 bg-amber-50 py-8 sm:py-10 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-amber-700/60 text-xs sm:text-sm">
          <p>Made with 💩 by Aviary Tech</p>
          <p className="mt-2">Powered by Originals Protocol</p>
        </div>
      </footer>
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-6deg); }
          40% { transform: rotate(5deg); }
          60% { transform: rotate(-3deg); }
          80% { transform: rotate(2deg); }
        }
        .hover\\:animate-wiggle:hover {
          animation: wiggle 0.5s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .hover\\:animate-wiggle:hover {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
