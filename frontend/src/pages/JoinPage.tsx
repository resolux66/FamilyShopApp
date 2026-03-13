import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invite link — missing token.');
      return;
    }

    api
      .post('/auth/accept-invite', { inviteId: token })
      .then(() => {
        setStatus('success');
        refetch();
        setTimeout(() => navigate('/welcome'), 500);
      })
      .catch((err: unknown) => {
        setStatus('error');
        if (err instanceof ApiError) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('Something went wrong. Please try again.');
        }
      });
  }, [token, navigate, refetch]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">FamilyCart</h1>

        {status === 'loading' && (
          <>
            <Loader className="w-6 h-6 text-green-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Accepting your invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-green-600 font-semibold">Invitation accepted!</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-red-600 font-semibold mb-2">Invite not valid</p>
            <p className="text-gray-600 text-sm">{errorMsg}</p>
            <p className="text-gray-500 text-sm mt-3">
              Ask your family admin to resend the invite.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
