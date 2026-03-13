import { ShoppingCart, Mail } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-2">
          This account isn't part of any family yet.
        </p>
        <p className="text-gray-500 text-sm flex items-center justify-center gap-1.5">
          <Mail className="w-4 h-4" />
          Ask your family admin to invite you by email.
        </p>
      </div>
    </div>
  );
}
