// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

const TokenContext = React.createContext<string | null>(null);

export const useToken = (): string | null => React.useContext(TokenContext);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    let aborted = false;
    fetch('http://127.0.0.1:8081/__design/token')
      .then(r => r.json())
      .then(j => { if (!aborted) setToken(j.token); })
      .catch(() => { /* surface via UI: Save button stays disabled */ });
    return () => { aborted = true; };
  }, []);
  return <TokenContext.Provider value={token}>{children}</TokenContext.Provider>;
};
