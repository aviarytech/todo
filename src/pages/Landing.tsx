/**
 * Landing page for Poo App
 * "Organize your life while you Poop" 💩
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 overflow-hidden">
      {/* Floating poop emojis background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-6xl animate-float"
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
      <header className="relative z-10 p-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-4xl">💩</span>
            <span className="font-black text-2xl text-amber-900">Poo App</span>
          </div>
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="px-6 py-2.5 bg-amber-900 text-amber-50 rounded-full font-semibold hover:bg-amber-800 transition-colors shadow-lg shadow-amber-900/20"
          >
            {isAuthenticated ? 'Open App' : 'Sign In'}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center">
          {/* Big poop */}
          <div className="text-[120px] md:text-[180px] leading-none mb-4 animate-bounce-slow">
            💩
          </div>

          {/* Tagline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-amber-900 mb-6 leading-tight">
            Organize your life
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              while you Poop
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-amber-800/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            The world's most <em>productive</em> todo app. Turn your bathroom breaks 
            into breakthrough moments. 🚽✨
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-2xl font-bold text-lg hover:from-amber-500 hover:to-orange-400 transition-all shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1"
            >
              {isAuthenticated ? 'Go to My Lists' : 'Get Started — It\'s Free'}
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-amber-800 font-semibold hover:text-amber-600 transition-colors"
            >
              See Features ↓
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-amber-700/60 text-sm">
            <span>🧻</span>
            <span>Trusted by productive poopers worldwide</span>
            <span>🧻</span>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-32 scroll-mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-amber-900 text-center mb-16">
            Why Poo App? 🤔
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Lightning Fast</h3>
              <p className="text-amber-800/70">
                Add tasks faster than... well, you know. Perfect for those quick sessions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-5xl mb-4">🔐</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Cryptographically Verified</h3>
              <p className="text-amber-800/70">
                Every task is signed with your personal keys. Your todos, your proof, your legacy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Share Lists</h3>
              <p className="text-amber-800/70">
                Collaborate with family, roommates, or coworkers. Shared accountability, shared relief.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-32 text-center">
          <div className="bg-gradient-to-r from-amber-200/50 to-orange-200/50 rounded-[40px] p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-amber-900 mb-4">
              Ready to be more productive?
            </h2>
            <p className="text-amber-800/70 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of people who've transformed their bathroom time into 
              the most organized part of their day.
            </p>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block px-10 py-5 bg-amber-900 text-amber-50 rounded-2xl font-bold text-xl hover:bg-amber-800 transition-colors shadow-xl"
            >
              Start Organizing 💩
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-200 bg-amber-50/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-amber-700/60 text-sm">
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
