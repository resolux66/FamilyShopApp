import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { api } from '../api/client';
import type { ShoppingList } from '../types';
import { ListCard } from '../components/ListCard';
import { useToast } from '../components/Toast';

export function Dashboard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<ShoppingList[]>('/lists'),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<ShoppingList>('/lists', { name }),
    onSuccess: (newList) => {
      queryClient.setQueryData<ShoppingList[]>(['lists'], (old = []) => [newList, ...old]);
      setCreating(false);
      setNewName('');
      showToast('List created!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const filtered = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap no-print">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Lists</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex gap-2 bg-white border border-green-200 rounded-xl p-4 no-print"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
            autoFocus
            disabled={createMutation.isPending}
          />
          <button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm min-h-[44px]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Search */}
      {lists.length > 3 && (
        <div className="relative mb-4 no-print">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lists..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? 'No lists match your search.' : 'No lists yet.'}
          </p>
          {!search && (
            <button
              onClick={() => setCreating(true)}
              className="mt-3 text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Create your first list
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
