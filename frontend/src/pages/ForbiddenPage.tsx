import { useState } from 'react';
import { ShoppingCart, Mail, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function ForbiddenPage() {
  const { startDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTryDemo = async () => {
    setLoading(true);
    setError('');
    try {
      await startDemo();
    } catch {
      setError('Could not start demo. Please try again.');
      setLoading(false);
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
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <button
            onClick={handleTryDemo}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 min-h-[44px]"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Starting demo…' : 'Try Demo'}
          </button>
        </div>

        <p className="text-gray-400 text-xs flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Have an account? Ask your family admin to invite you by email.
        </p>
      </div>
    </div>
  );
}
