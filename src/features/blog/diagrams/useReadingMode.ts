import { useState, useEffect } from "react";

export function useReadingMode() {
  const [isReadingMode, setIsReadingMode] = useState(
    () => document.documentElement.classList.contains("theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          setIsReadingMode(document.documentElement.classList.contains("theme-reading"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isReadingMode;
}
