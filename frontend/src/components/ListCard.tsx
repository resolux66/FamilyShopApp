import { Link } from 'react-router-dom';
import { ShoppingBag, Package } from 'lucide-react';
import type { ShoppingList } from '../types';
import { relativeTime } from '../utils/time';

interface ListCardProps {
  list: ShoppingList;
}

export function ListCard({ list }: ListCardProps) {
  return (
    <Link
      to={`/lists/${list.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2">
          {list.name}
        </h3>
        {list.is_shopping === 1 && (
          <span className="flex-shrink-0 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            <ShoppingBag className="w-3 h-3" />
            Shopping
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Package className="w-4 h-4" />
          <span>{list.item_count ?? 0} item{(list.item_count ?? 0) !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-right">
          {list.creator_name && (
            <span className="block text-xs">by {list.creator_name}</span>
          )}
          <span className="text-xs">{relativeTime(list.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
