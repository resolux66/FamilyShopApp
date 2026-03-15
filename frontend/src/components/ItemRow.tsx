import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ListItem, User } from '../types';
import { relativeTime } from '../utils/time';
import { useAuth } from '../contexts/AuthContext';

interface ItemRowProps {
  item: ListItem;
  isFirst: boolean;
  isLast: boolean;
  isShopping: boolean;
  currentUser: User;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleBought: (bought: boolean) => void;
  onEdit: (data: { name: string; quantity?: string; note?: string }) => Promise<unknown>;
  onDelete: () => void;
}

export function ItemRow({
  item,
  isFirst,
  isLast,
  isShopping,
  currentUser,
  onMoveUp,
  onMoveDown,
  onToggleBought,
  onEdit,
  onDelete,
}: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity || '');
  const [editNote, setEditNote] = useState(item.note || '');
  const [saving, setSaving] = useState(false);
  const { isDemo } = useAuth();

  const canEditDelete =
    currentUser.role === 'admin' || item.added_by === currentUser.id;
  const isBought = item.is_bought === 1;

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await onEdit({
        name: editName.trim(),
        quantity: editQty.trim() || undefined,
        note: editNote.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Item name"
            autoFocus
          />
          <input
            type="text"
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Quantity"
          />
          <input
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Note"
          />
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim()}
            className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg group transition-opacity
        ${isBought ? 'opacity-50' : 'hover:bg-gray-50'}`}
    >
      {/* Checkbox (shopping mode only) */}
      {isShopping && (
        <input
          type="checkbox"
          checked={isBought}
          onChange={(e) => onToggleBought(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer"
          aria-label={`Mark "${item.name}" as ${isBought ? 'not bought' : 'bought'}`}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-medium text-gray-900 ${isBought ? 'line-through' : ''}`}>
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-sm text-gray-500">{item.quantity}</span>
          )}
        </div>
        {item.note && (
          <p className="text-sm text-gray-500 mt-0.5">{item.note}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          by {item.adder_name || 'Unknown'} · {relativeTime(item.created_at)}
          {isBought && item.buyer_name && ` · bought by ${item.buyer_name}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 no-print">
        {/* Reorder buttons (only when not in shopping mode) */}
        {!isShopping && (
          <>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-20 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-20 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Edit/Delete */}
        {canEditDelete && (
          <>
            <button
              onClick={() => {
                setEditName(item.name);
                setEditQty(item.quantity || '');
                setEditNote(item.note || '');
                setEditing(true);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Edit item"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {!isDemo && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
