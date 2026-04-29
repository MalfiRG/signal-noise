// src/design-companion/core/DesignCompanion.tsx
// __DESIGN_COMPANION_DEV_ONLY__
// Phase 0 stub — renders inside the host React tree at App.tsx route /__design/*.
// Hostname-guard (per H2/§8.1 item 4) renders an error page when the editor is reached
// via a non-loopback URL.
const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export const DesignCompanion = () => {
  if (typeof window !== 'undefined' && !ALLOWED_HOSTNAMES.has(window.location.hostname)) {
    return (
      <div role="alert" className="design-companion-error">
        Design editor refused: not loopback. Open http://localhost:8080/__design instead.
      </div>
    );
  }
  return <div>Design Companion (Phase 0 stub — host-mounted via App.tsx route)</div>;
};
