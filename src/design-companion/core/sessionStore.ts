// __DESIGN_COMPANION_DEV_ONLY__
const KEY = (id: string) => `design-companion:unsaved:${id}`;
export const saveUnsavedBuffer = (id: string, edits: Record<string, string>): void => {
  sessionStorage.setItem(KEY(id), JSON.stringify(edits));
};
export const restoreUnsavedBuffer = (id: string): Record<string, string> | null => {
  const raw = sessionStorage.getItem(KEY(id));
  return raw ? (JSON.parse(raw) as Record<string, string>) : null;
};
export const clearUnsavedBuffer = (id: string): void => {
  sessionStorage.removeItem(KEY(id));
};
export const installBeforeUnload = (hasUnsaved: () => boolean): () => void => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsaved()) { e.preventDefault(); e.returnValue = ''; }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
};
