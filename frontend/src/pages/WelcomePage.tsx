import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || user?.email?.split('@')[0] || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Please enter a display name to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.patch('/users/me', { display_name: displayName.trim() });
      refetch();
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm w-full shadow-sm">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">
          Welcome to FamilyCart!
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Choose a display name that your family will see.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError('');
              }}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Saving…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  );
}
