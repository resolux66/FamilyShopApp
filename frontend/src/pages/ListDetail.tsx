import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  ShoppingBag,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { ShoppingList, ListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { AddItemForm } from '../components/AddItemForm';
import { ItemRow } from '../components/ItemRow';
import { PrintList } from '../components/PrintList';
import { useToast } from '../components/Toast';
import { formatDateTime } from '../utils/time';

interface ListDetailData {
  list: ShoppingList;
  items: ListItem[];
}

export function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, family } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const queryKey = ['list', id];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => api.get<ListDetailData>(`/lists/${id}`),
    enabled: !!id,
  });

  // Set page title for printing
  useEffect(() => {
    if (data?.list) {
      document.title = `${data.list.name} — FamilyCart`;
    }
    return () => {
      document.title = 'FamilyCart';
    };
  }, [data?.list]);

  // WebSocket for real-time updates
  useWebSocket({
    listId: id!,
    enabled: !!id,
    onMessage: (msg) => {
      if (msg.type === 'list_updated' && msg.payload === null) {
        // Polling fallback — refetch
        queryClient.invalidateQueries({ queryKey });
        return;
      }
      queryClient.setQueryData<ListDetailData>(queryKey, (old) => {
        if (!old) return old;
        if (msg.type === 'list_updated') {
          return { ...old, list: msg.payload as ShoppingList };
        }
        if (msg.type === 'item_added') {
          const item = msg.payload as ListItem;
          return { ...old, items: [...old.items, item] };
        }
        if (msg.type === 'item_updated') {
          const updated = msg.payload as ListItem;
          return {
            ...old,
            items: old.items.map((i) => (i.id === updated.id ? updated : i)),
          };
        }
        if (msg.type === 'item_deleted') {
          const { itemId } = msg.payload as { itemId: string };
          return { ...old, items: old.items.filter((i) => i.id !== itemId) };
        }
        return old;
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<ShoppingList>(`/lists/${id}`, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<ListDetailData>(queryKey, (old) =>
        old ? { ...old, list: updated } : old
      );
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteListMutation = useMutation({
    mutationFn: () => api.delete(`/lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      navigate('/');
      showToast('List deleted', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const addItemMutation = useMutation({
    mutationFn: (body: { name: string; quantity?: string; note?: string }) =>
      api.post<ListItem>(`/lists/${id}/items`, body),
    onSuccess: (newItem) => {
      queryClient.setQueryData<ListDetailData>(queryKey, (old) =>
        old ? { ...old, items: [...old.items, newItem] } : old
      );
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: Record<string, unknown> }) =>
      api.patch<ListItem>(`/lists/${id}/items/${itemId}`, body),
    onMutate: async ({ itemId, body }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ListDetailData>(queryKey);
      queryClient.setQueryData<ListDetailData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, ...body } : item
          ),
        };
      });
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      showToast(err.message, 'error');
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ListDetailData>(queryKey, (old) =>
        old ? { ...old, items: old.items.map((i) => (i.id === updated.id ? updated : i)) } : old
      );
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/lists/${id}/items/${itemId}`),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ListDetailData>(queryKey);
      queryClient.setQueryData<ListDetailData>(queryKey, (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== itemId) } : old
      );
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      showToast(err.message, 'error');
    },
  });

  const handleMoveItem = (item: ListItem, direction: 'up' | 'down') => {
    const items = data?.items.filter((i) => i.is_bought === 0).sort((a, b) => a.position - b.position) || [];
    const idx = items.findIndex((i) => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const swapItem = items[swapIdx];
    updateItemMutation.mutate({ itemId: item.id, body: { position: swapItem.position } });
    updateItemMutation.mutate({ itemId: swapItem.id, body: { position: item.position } });
  };

  const handleEndShopping = (removeBought: boolean) => {
    updateListMutation.mutate({ is_shopping: false, removeBought });
    setShowEndModal(false);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-gray-600">List not found.</p>
        <Link to="/" className="text-green-600 hover:underline mt-2 block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { list, items } = data;
  const isShopping = list.is_shopping === 1;
  const canManageList = list.created_by === user?.id || user?.role === 'admin';

  const unboughtItems = items
    .filter((i) => i.is_bought === 0)
    .sort((a, b) => a.position - b.position);
  const boughtItems = items
    .filter((i) => i.is_bought === 1)
    .sort((a, b) => (a.bought_at || 0) - (b.bought_at || 0));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 no-print">
        <Link
          to="/"
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {editingName ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) {
                updateListMutation.mutate({ name: newName.trim() });
                setEditingName(false);
              }
            }}
            className="flex gap-2 flex-1"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
              autoFocus
            />
            <button type="submit" className="p-2 bg-green-600 text-white rounded-lg min-h-[44px]" aria-label="Save">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setEditingName(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg min-h-[44px]" aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{list.name}</h1>
            {canManageList && (
              <button
                onClick={() => { setNewName(list.name); setEditingName(true); }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Rename list"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => window.print()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Print list"
          >
            <Printer className="w-5 h-5" />
          </button>
          {canManageList && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Delete list"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Shopping mode banner */}
      {isShopping && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Shopping in progress</p>
              {list.starter_name && list.shopping_started_at && (
                <p className="text-xs text-green-600">
                  started by {list.starter_name} at {formatDateTime(list.shopping_started_at)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 min-h-[44px] flex-shrink-0"
          >
            Finish Shopping
          </button>
        </div>
      )}

      {/* Start shopping button */}
      {!isShopping && (
        <div className="mb-4 no-print">
          <button
            onClick={() => updateListMutation.mutate({ is_shopping: true })}
            disabled={updateListMutation.isPending}
            className="flex items-center gap-2 border border-green-300 text-green-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50 min-h-[44px]"
          >
            <ShoppingBag className="w-4 h-4" />
            Start Shopping
          </button>
        </div>
      )}

      {/* Add item form */}
      <div className="mb-4">
        <AddItemForm onAdd={(data) => addItemMutation.mutateAsync(data)} />
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {unboughtItems.length === 0 && boughtItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No items yet. Add some above!</p>
          </div>
        ) : (
          <>
            {/* Unbought items */}
            <div className="divide-y divide-gray-100">
              {unboughtItems.map((item, idx) => (
                <div key={item.id} className="px-2">
                  <ItemRow
                    item={item}
                    isFirst={idx === 0}
                    isLast={idx === unboughtItems.length - 1}
                    isShopping={isShopping}
                    currentUser={user!}
                    onMoveUp={() => handleMoveItem(item, 'up')}
                    onMoveDown={() => handleMoveItem(item, 'down')}
                    onToggleBought={(bought) =>
                      updateItemMutation.mutate({ itemId: item.id, body: { is_bought: bought } })
                    }
                    onEdit={(data) =>
                      updateItemMutation.mutateAsync({ itemId: item.id, body: data })
                    }
                    onDelete={() => deleteItemMutation.mutate(item.id)}
                  />
                </div>
              ))}
            </div>

            {/* Bought items */}
            {boughtItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Bought ({boughtItems.length})
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {boughtItems.map((item) => (
                    <div key={item.id} className="px-2">
                      <ItemRow
                        item={item}
                        isFirst={false}
                        isLast={false}
                        isShopping={isShopping}
                        currentUser={user!}
                        onMoveUp={() => {}}
                        onMoveDown={() => {}}
                        onToggleBought={(bought) =>
                          updateItemMutation.mutate({ itemId: item.id, body: { is_bought: bought } })
                        }
                        onEdit={(data) =>
                          updateItemMutation.mutateAsync({ itemId: item.id, body: data })
                        }
                        onDelete={() => deleteItemMutation.mutate(item.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Print view (hidden normally) */}
      {family && <PrintList list={list} items={items} family={family} />}

      {/* End shopping modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Finish Shopping</h2>
            <p className="text-gray-600 text-sm mb-5">
              What would you like to do with the {boughtItems.length} bought item
              {boughtItems.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleEndShopping(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg text-sm min-h-[44px]"
              >
                Keep bought items
              </button>
              <button
                onClick={() => handleEndShopping(true)}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium py-3 rounded-lg text-sm min-h-[44px]"
              >
                Remove bought items
              </button>
              <button
                onClick={() => setShowEndModal(false)}
                className="w-full text-gray-500 py-2 text-sm min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete list confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Delete List</h2>
            <p className="text-gray-600 text-sm mb-5">
              Delete <strong>{list.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteListMutation.mutate()}
                className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-red-700 min-h-[44px]"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-200 min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
