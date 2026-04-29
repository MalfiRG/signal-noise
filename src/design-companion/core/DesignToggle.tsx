// __DESIGN_COMPANION_DEV_ONLY__
import { useNavigate, useLocation } from 'react-router-dom';

export const DesignToggle = () => {
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname.startsWith('/__design')) return null;
  return (
    <button
      type="button"
      className="design-companion-toggle"
      onClick={() => nav(`/__design?focus=${encodeURIComponent(loc.pathname)}`)}
      style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
    >
      Design this page
    </button>
  );
};
