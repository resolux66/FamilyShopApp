import { FlaskConical } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center no-print">
      <p className="text-amber-800 text-xs font-medium flex items-center justify-center gap-1.5">
        <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
        You&rsquo;re in demo mode &mdash; some actions are disabled. Data resets daily.
      </p>
    </div>
  );
}
