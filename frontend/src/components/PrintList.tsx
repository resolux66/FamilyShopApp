import { QRCodeSVG } from 'qrcode.react';
import type { ShoppingList, ListItem, Family } from '../types';
import { formatDate } from '../utils/time';

interface PrintListProps {
  list: ShoppingList;
  items: ListItem[];
  family: Family;
}

export function PrintList({ list, items, family }: PrintListProps) {
  const listUrl = `${window.location.origin}/lists/${list.id}`;
  const unbought = items.filter((i) => i.is_bought === 0);
  const bought = items.filter((i) => i.is_bought === 1);
  const allItems = [...unbought, ...bought];

  return (
    <div className="print-only hidden p-8 font-sans text-black">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {family.name} · Created by {list.creator_name || 'Unknown'} ·{' '}
          {formatDate(list.created_at)}
        </p>
      </div>

      <table className="w-full border-collapse text-sm mb-8">
        <thead>
          <tr className="border-b-2 border-gray-400">
            <th className="text-left py-2 pr-4 font-semibold">Item</th>
            <th className="text-left py-2 pr-4 font-semibold">Quantity</th>
            <th className="text-left py-2 pr-4 font-semibold">Note</th>
            <th className="text-left py-2 pr-4 font-semibold">Added By</th>
            <th className="text-center py-2 font-semibold">Bought</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-200"
              style={item.is_bought ? { textDecoration: 'line-through', opacity: 0.6 } : {}}
            >
              <td className="py-2 pr-4">{item.name}</td>
              <td className="py-2 pr-4 text-gray-600">{item.quantity || '—'}</td>
              <td className="py-2 pr-4 text-gray-600">{item.note || '—'}</td>
              <td className="py-2 pr-4 text-gray-600">{item.adder_name || '—'}</td>
              <td className="py-2 text-center">{item.is_bought ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-end justify-between mt-8 pt-4 border-t border-gray-300">
        <div>
          <p className="text-xs text-gray-500">Scan to open live list</p>
          <p className="text-xs text-gray-400 mt-0.5">{listUrl}</p>
        </div>
        <QRCodeSVG value={listUrl} size={80} />
      </div>
    </div>
  );
}
