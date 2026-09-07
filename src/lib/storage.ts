import type { GameSession } from "../types";

const KEY = "voyage-dm-session-v1";

export function saveSession(session: GameSession | null): void {
  try {
    if (session === null) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, JSON.stringify(session));
    }
  } catch {
    // storage may be unavailable; ignore
  }
}

export function loadSession(): GameSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSession;
    if (!parsed || !parsed.config || !parsed.state || !Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
