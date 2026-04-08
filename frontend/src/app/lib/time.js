export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  // Check if date is valid and not a "zero" date from Go (0001-01-01)
  if (isNaN(date.getTime()) || date.getFullYear() <= 1) return "";

  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}