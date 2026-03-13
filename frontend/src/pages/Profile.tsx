import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ShoppingCart, Package, CheckSquare } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

interface Stats {
  lists_created: number;
  items_added: number;
  items_bought: number;
}

export function Profile() {
  const { user, refetch: refetchAuth } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name || '');

  useEffect(() => {
    setDisplayName(user?.display_name || '');
  }, [user?.display_name]);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/users/me/stats'),
  });

  const updateMutation = useMutation({
    mutationFn: (name: string) => api.patch('/users/me', { display_name: name }),
    onSuccess: () => {
      refetchAuth();
      showToast('Display name updated!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    updateMutation.mutate(displayName.trim());
  };

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Account</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            readOnly
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
          />
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-600 mb-1">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
              placeholder="Your name"
              disabled={updateMutation.isPending}
            />
            <button
              type="submit"
              disabled={!displayName.trim() || updateMutation.isPending || displayName === user?.display_name}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>
      </div>

      {/* Activity summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Activity</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex justify-center mb-1">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{stats?.lists_created ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lists created</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-center mb-1">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats?.items_added ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Items added</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex justify-center mb-1">
              <CheckSquare className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats?.items_bought ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Items bought</p>
          </div>
        </div>
      </div>
    </div>
  );
}
