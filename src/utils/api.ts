let memoryAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return memoryAuthToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (memoryAuthToken) {
    headers.Authorization = `Bearer ${memoryAuthToken}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      // Ignore JSON error
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
