import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "scroll-pos";

/**
 * Manual scroll restoration for SPA with AnimatePresence.
 *
 * Problem: Mobile browsers evict background tabs and reload the SPA
 * when the user returns. The browser's native scroll restoration fires
 * before React mounts content, so scroll position resets to 0.
 *
 * Solution: Save scroll position to sessionStorage on visibility change
 * (tab going to background) and on beforeunload. Restore after a delay
 * that lets the route animation settle.
 */
export function useScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Disable browser's native restoration — it fires too early for SPAs
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // Save scroll position when page goes to background or unloads
  useEffect(() => {
    const save = () => {
      const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
      data[pathname] = window.scrollY;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", save);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", save);
    };
  }, [pathname]);

  // Restore scroll position on mount (after animation settles)
  useEffect(() => {
    const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    const saved = data[pathname];

    if (saved && saved > 0) {
      // Wait for AnimatePresence enter animation to complete (~500ms covers
      // both classic 400ms and reading 200ms variants with margin)
      const timer = setTimeout(() => {
        window.scrollTo({ top: saved, behavior: "instant" });
        // Clean up after restoring so normal navigation starts at top
        delete data[pathname];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // No saved position — new navigation, scroll to top
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);
}
