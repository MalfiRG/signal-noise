// __DESIGN_COMPANION_DEV_ONLY__
// [M3] Origin/Referer paired check — fall back to Referer URL parsing when Origin is absent.

const refererOriginMatches = (
  allowedOrigins: readonly string[],
  referer: string,
): boolean => {
  try {
    const u = new URL(referer);
    return allowedOrigins.includes(`${u.protocol}//${u.host}`);
  } catch {
    return false;
  }
};

export const isSameOrigin = (
  allowedOrigins: readonly string[],
  origin: string | undefined | null,
  referer: string | undefined | null,
  secFetchSite: string | undefined | null,
  contentType: string | undefined | null,
): boolean => {
  if (secFetchSite !== 'same-origin') return false;
  if (!contentType || !contentType.toLowerCase().startsWith('application/json')) return false;
  if (origin && allowedOrigins.includes(origin)) return true;
  if (!origin && referer && refererOriginMatches(allowedOrigins, referer)) return true;
  return false;
};
