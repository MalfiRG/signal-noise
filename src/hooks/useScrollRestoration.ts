import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "scroll-pos";

export function useScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

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

  useEffect(() => {
    const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    const saved = data[pathname];

    if (saved && saved > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: saved, behavior: "instant" });
        delete data[pathname];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }, 500);

      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);
}
