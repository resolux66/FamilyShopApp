import { useState } from 'react';
import { ShoppingCart, Mail, Play, LogIn, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function ForbiddenPage() {
  const { startDemo, requestSignIn } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const [email, setEmail] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInSent, setSignInSent] = useState(false);
  const [signInError, setSignInError] = useState('');

  const handleTryDemo = async () => {
    setDemoLoading(true);
    setDemoError('');
    try {
      await startDemo();
    } catch {
      setDemoError('Could not start demo. Please try again.');
      setDemoLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSignInLoading(true);
    setSignInError('');
    try {
      await requestSignIn(email.trim());
      setSignInSent(true);
    } catch {
      setSignInError('Could not send sign-in link. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FamilyCart</h1>
        <p className="text-gray-500 text-sm mb-6">
          A shared shopping list for your whole family.
        </p>

        {/* Try Demo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 text-left">
          <h2 className="font-semibold text-gray-800 mb-1">Try the demo</h2>
          <p className="text-xs text-gray-500 mb-3">
            Explore a pre-loaded family with live shopping lists — no sign-up needed.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 font-mono space-y-1">
            <div>Email: <span className="text-gray-900">demo@familycart.app</span></div>
            <div>Code: <span className="text-gray-900">DEMO2026</span></div>
          </div>
          {demoError && <p className="text-red-600 text-xs mb-2">{demoError}</p>}
          <button
            onClick={handleTryDemo}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 min-h-[44px]"
          >
            <Play className="w-4 h-4" />
            {demoLoading ? 'Starting demo…' : 'Try Demo'}
          </button>
        </div>

        {/* Sign in */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 text-left">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            Sign in with your family account
          </h2>
          {signInSent ? (
            <div className="text-center py-2">
              <p className="text-sm text-green-700 font-medium">Check your inbox!</p>
              <p className="text-xs text-gray-500 mt-1">
                We sent a sign-in link to <span className="font-medium">{email}</span>.
                It expires in 15 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="mt-3 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {signInError && <p className="text-red-600 text-xs">{signInError}</p>}
              <button
                type="submit"
                disabled={signInLoading}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                {signInLoading ? 'Sending…' : 'Send sign-in link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-gray-400 text-xs flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          New here? Ask your family admin to invite you by email.
        </p>
      </div>
    </div>
  );
}
