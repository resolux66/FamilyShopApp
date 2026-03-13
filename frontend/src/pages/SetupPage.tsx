import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function SetupPage() {
  const navigate = useNavigate();
  const { refetch } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setError('');
    setStep(2);
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        inviteCode: inviteCode.trim().toUpperCase(),
        familyName: familyName.trim(),
      });
      refetch();
      navigate('/welcome');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // If code was invalid, go back to step 1
        if (err.code === 'INVALID_CODE') {
          setStep(1);
        }
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
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Create Your Family</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your admin invite code to get started.
        </p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Admin Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] tracking-widest"
                maxLength={12}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={inviteCode.trim().length < 6}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Family Name
              </label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g. The Smiths"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                autoFocus
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!familyName.trim() || loading}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Creating…' : 'Create Family'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 min-h-[44px]"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
