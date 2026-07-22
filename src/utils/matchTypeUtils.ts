/** Shared match type label mapping used across all PPC components */
export const getMatchTypeLabel = (raw: string | null): { label: string; color: string } => {
  if (!raw) return { label: '—', color: 'bg-muted text-muted-foreground' };
  const upper = raw.toUpperCase().trim();
  switch (upper) {
    case 'TARGETING_EXPRESSION_PREDEFINED':
      return { label: 'Auto', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
    case 'TARGETING_EXPRESSION':
      return { label: 'Product', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
    case 'BROAD':
      return { label: 'Broad', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' };
    case 'EXACT':
      return { label: 'Exact', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
    case 'PHRASE':
      return { label: 'Phrase', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' };
    default:
      return { label: raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: 'bg-muted text-muted-foreground' };
  }
};

/** Get a friendly short name for a raw match type string (no styling) */
export const getMatchTypeFriendlyName = (raw: string): string => {
  return getMatchTypeLabel(raw).label;
};
