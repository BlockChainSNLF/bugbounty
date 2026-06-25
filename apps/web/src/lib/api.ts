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
    if (text.trimStart().startsWith("<")) {
      throw new Error(`${response.status} — The backend service is unavailable. Please try again in a moment.`);
    }
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

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const url = `${API_URL}${path}`;
    console.error("[api] Non-JSON response:", url, "| status:", response.status, "| content-type:", response.headers.get("content-type"), "| body:", text.slice(0, 300));
    if (text.trimStart().startsWith("<")) {
      throw new Error("The backend service is starting up. Please wait a few seconds and try again.");
    }
    throw new Error("Server returned an unexpected response. The service may be temporarily unavailable.");
  }
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
