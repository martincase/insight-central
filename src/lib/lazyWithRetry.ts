import { lazy, type ComponentType } from "react";

/**
 * Wraps React.lazy() so a stale chunk left over from a previous Cloudflare
 * Pages deploy (asset hashes change every deploy, so a tab opened before a
 * deploy can 404 on its old JS chunk) triggers one full page reload instead
 * of crashing. The reload fetches the current index.html and its matching,
 * still-live asset hashes. A sessionStorage flag stops a genuinely broken
 * module from reload-looping forever.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const key = `lazy-retry:${factory.toString()}`;
    try {
      const module = await factory();
      sessionStorage.removeItem(key);
      return module;
    } catch (error) {
      const alreadyRetried = sessionStorage.getItem(key);
      if (!alreadyRetried) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Never resolves: the reload is already in flight.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
