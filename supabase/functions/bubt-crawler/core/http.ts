const USER_AGENT = 'CampusOne-Engine/2.0 (BUBT Academic Companion; Android Bot)';

export async function fetchWithRetry(
  url: string,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.maxRetries ?? 2;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText} from ${url}`);
      }

      return await res.text();
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 4000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

