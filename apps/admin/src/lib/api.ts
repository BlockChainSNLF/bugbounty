const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("bugbounty.admin.token") : null;
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
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      const raw = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
      if (raw) message = raw;
    } catch {
      // not JSON, use raw text
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
