const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("bugbounty.token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      const message = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
      throw new Error(message ?? text);
    } catch {
      throw new Error(text);
    }
  }

  return response.json() as Promise<T>;
}

export async function apiBlobUrl(path: string): Promise<string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("bugbounty.token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export { API_URL };
