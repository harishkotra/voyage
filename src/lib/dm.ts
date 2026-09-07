import type {
  ChatMessage,
  Difficulty,
  GameConfig,
  GameState,
  Genre,
} from "../types";

export const MODEL = "llama3.1-8B";

/**
 * Relative endpoint — proxied by the Vite dev server and by server.mjs so
 * the browser never hits chatjimmy.ai directly (it sends no CORS headers).
 * Override at runtime via setApiUrl for tests.
 */
export let API_URL = "/api/chat";
export function setApiUrl(url: string) {
  API_URL = url;
}

export const GENRES: Genre[] = ["fantasy", "sci-fi", "horror", "pirate", "western"];
export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export const GENRE_META: Record<
  Genre,
  { label: string; accent: string; glow: string; win: string; emoji: string }
> = {
  fantasy: {
    label: "Fantasy",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
    win: "recover the Sunstone from the heart of the dragon's lair",
    emoji: "🐉",
  },
  "sci-fi": {
    label: "Sci-Fi",
    accent: "#22d3ee",
    glow: "rgba(34,211,238,0.35)",
    win: "reach the derelict starbridge and activate its jump core",
    emoji: "🚀",
  },
  horror: {
    label: "Horror",
    accent: "#f87171",
    glow: "rgba(248,113,113,0.35)",
    win: "escape the house before the entity catches you — find the way out",
    emoji: "🕯️",
  },
  pirate: {
    label: "Pirate",
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.35)",
    win: "find the lost treasure of Captain Marlowe on the sunken isle",
    emoji: "🏴‍☠️",
  },
  western: {
    label: "Western",
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.35)",
    win: "outdraw the outlaw king and recover the stolen gold from Blackrock Gulch",
    emoji: "🤠",
  },
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; note: string }> = {
  easy: { label: "Easy", note: "generous HP, forgiving traps, frequent clues" },
  normal: { label: "Normal", note: "moderate HP loss, fair clues" },
  hard: { label: "Hard", note: "heavy HP loss, sparse clues, harsher consequences" },
};

const BASE_SYSTEM = `You are the Dungeon Master of a text adventure game. Narrate the world in vivid second-person prose, 1-3 short paragraphs per turn. Always end your narration with an implicit prompt for the player's next action (something like "What do you do?" — but weave it naturally into the scene; never break the fourth wall).

OUTPUT FORMAT (CRITICAL — never skip this):
After your narration, ALWAYS finish your reply with a single machine-readable line, exactly in this format:
STATE: HP=<int>, inventory=[comma-separated], location=<string>, flags={key:value}
This STATE line must be the very last thing you write. Update HP, inventory, location, and flags to match what happened this turn. If nothing changed, repeat the current values. Never omit it.

RULES:
- HP starts at 100. Combat, traps, and hazards reduce it. Reaching 0 HP means the player dies — narrate a dramatic death and end with "GAME OVER".
- Reaching the win condition (below) means the player wins — narrate the ending and end with "YOU WIN".
- Keep inventory changes perfectly consistent with the narrative. If the player picks something up, add it to inventory. If they use/drop it, remove it.
- Be creative and fair. Reward clever player actions. Never auto-win or auto-lose on a single turn. Allow multiple valid paths to the goal.
- If the player does something impossible, narrate a reasonable consequence (they can't fly, but they might find a rope).
- Keep the tone immersive and atmospheric, matching the genre.
- Reply with ONLY your narration and the STATE line. Do not add commentary, labels, or markdown outside the prose.`;

/** Reminder appended to every player message so the model never forgets the STATE line. */
export const STATE_REMINDER =
  "\n\n[OOC reminder: after your narration, end your reply with exactly one line: STATE: HP=<int>, inventory=[comma-separated], location=<string>, flags={key:value}. Always include it.]";

export function buildSystemPrompt(config: GameConfig, state: GameState): string {
  const genre = GENRE_META[config.genre];
  const diff = DIFFICULTY_META[config.difficulty];
  return [
    `GENRE: ${config.genre}. DIFFICULTY: ${config.difficulty} (${diff.note}).`,
    `WIN CONDITION: ${genre.win}.`,
    BASE_SYSTEM,
    "",
    "CURRENT STATE:",
    formatState(state),
  ].join("\n");
}

export function formatState(state: GameState): string {
  const flags = Object.entries(state.flags)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
  return `STATE: HP=${state.hp}, inventory=[${state.inventory.join(", ")}], location=${state.location}, flags={${flags}}`;
}

export function initialState(config: GameConfig): GameState {
  return {
    hp: 100,
    maxHp: 100,
    inventory: [],
    location: config.genre === "sci-fi" ? "docking bay" : "village edge",
    flags: {},
  };
}

const STATE_RE = /STATE:\s*HP=(\d+),\s*inventory=\[([^\]]*)\],\s*location=(.*?),\s*flags=\{(.*?)\}/i;

/**
 * Parse the machine-readable STATE line out of a DM reply.
 * Returns { state, narrative } where narrative is the reply with the line
 * stripped, or null if no STATE line was found.
 */
export function parseStateReply(
  reply: string,
  fallback: GameState,
): { state: GameState; narrative: string } | null {
  const match = reply.match(STATE_RE);
  if (!match) return null;

  const [, hpRaw, invRaw, locRaw, flagsRaw] = match;

  const hp = Math.max(0, Math.min(fallback.maxHp, parseInt(hpRaw, 10) || fallback.hp));
  const inventory = invRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const location = locRaw.trim();
  const flags: Record<string, string> = {};
  flagsRaw.split(",").forEach((pair) => {
    const idx = pair.indexOf(":");
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) flags[k] = v;
    }
  });

  const state: GameState = {
    hp,
    maxHp: fallback.maxHp,
    inventory,
    location: location || fallback.location,
    flags,
  };

  const narrative = reply.replace(STATE_RE, "").trim();
  return { state, narrative };
}

export function detectEnding(narrative: string): "won" | "lost" | null {
  if (/\bYOU WIN\b/i.test(narrative)) return "won";
  if (/\bGAME OVER\b/i.test(narrative)) return "lost";
  return null;
}

/** Strip the <|stats|>...<|/stats|> footer appended by the endpoint. */
export function stripStatsFooter(text: string): string {
  return text.replace(/<\|stats\|>[\s\S]*?<\|[^>]*stats\|>/g, "").trim();
}

/**
 * Call the DM endpoint. Returns the raw assistant text (stats footer
 * stripped). Non-streaming single response.
 */
export async function callDM(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachment: null,
      chatOptions: {
        selectedModel: MODEL,
        systemPrompt: messages[0]?.role === "system" ? messages[0].content : "",
        topK: 8,
      },
      messages: messages.filter((m) => m.role !== "system"),
    }),
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return stripStatsFooter(text);
}

/** Trim conversation history to the last N messages (plus system). */
export function trimHistory(
  messages: ChatMessage[],
  keep = 20,
): ChatMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const trimmed = rest.slice(-keep);
  return [...system, ...trimmed];
}
