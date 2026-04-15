/**
 * Validate a Hub URL by pinging its health endpoint.
 *
 * Shared between HubSetupPage (pre-auth) and HubSettings (in-app).
 */

export async function validateHubUrl(url: string): Promise<{ reachable: boolean; error?: string }> {
  const trimmedUrl = url.replace(/\/+$/, '');
  const healthUrl = `${trimmedUrl}/api/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { reachable: false, error: `Server returned ${String(response.status)}` };
    }

    return { reachable: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { reachable: false, error: 'Connection timed out' };
    }
    const message = error instanceof Error ? error.message : 'Network error';
    return { reachable: false, error: message };
  }
}
