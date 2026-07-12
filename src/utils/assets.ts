export function assetUrl(path: string, base = import.meta.env.BASE_URL): string {
  const derivatives: Record<string, string> = {
    'assets/mentor.png': 'assets/mentor.jpg',
    'assets/young-hero.png': 'assets/young-hero.jpg',
    'assets/world-map.png': 'assets/world-map.jpg',
  };
  const requestedPath = path.replace(/^\/+/, '');
  const cleanPath = derivatives[requestedPath] ?? requestedPath;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
}
