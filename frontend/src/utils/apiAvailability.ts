const availabilityCache = new Map<string, boolean>();
const knownUnavailable = new Set([
  '/insurance-xml/bhxh-audit/records',
  '/inpatient/medical-record-archive/summary',
]);

export async function isApiAvailable(path: string): Promise<boolean> {
  if (knownUnavailable.has(path)) {
    availabilityCache.set(path, false);
    return false;
  }

  if (availabilityCache.has(path)) {
    return availabilityCache.get(path) ?? false;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const available = response.status !== 404;
    availabilityCache.set(path, available);
    return available;
  } catch {
    // Treat network issues as available so pages can keep their current behavior.
    availabilityCache.set(path, true);
    return true;
  }
}
