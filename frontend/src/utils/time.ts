export function relativeTime(unixTs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTs;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(unixTs * 1000).toLocaleDateString();
}

export function formatDateTime(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleString();
}

export function formatDate(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
