import type { GameState } from "../types";

export interface DemoResult {
  narrative: string;
  state: GameState;
  ending: "won" | "lost" | null;
}

const MAX_HP = 100;

function clone(state: GameState): GameState {
  return {
    ...state,
    inventory: [...state.inventory],
    flags: { ...state.flags },
  };
}

/**
 * A fully scripted "DM" for recording a video walkthrough. No network calls —
 * deterministic, fast, and keyword-driven so the demo responds sensibly to
 * whatever the presenter types. Produces narration + a STATE update that flows
 * through the same parsing pipeline as the live endpoint.
 */
export function runDemoTurn(
  state: GameState,
  action: string | null,
  kind: "action" | "hint",
): DemoResult {
  const s = clone(state);
  const a = (action || "").toLowerCase();
  const hasSword = s.inventory.includes("rusty sword");
  const monsterDefeated = s.flags["monster"] === "defeated";

  // ---- Hint: a subtle, non-spoiling nudge ----
  if (kind === "hint") {
    return {
      narrative:
        "The glint of metal at your feet and a growl deeper in the dark are both worth a closer look…",
      state: s,
      ending: null,
    };
  }

  // ---- Opening scene ----
  if (action === null) {
    return {
      narrative:
        "The lantern sputters as you step into the mouth of the cavern. Cold air breathes out of the dark, and somewhere ahead a low growl echoes off the stone. A rusty sword lies half-buried in the dirt at your feet, and a heavy iron door stands barred against the far wall.\n\nWhat do you do?",
      state: { ...s, location: "cavern entrance" },
      ending: null,
    };
  }

  // ---- Give up / death ----
  if (/\b(die|give up|surrender|quit|sleep here)\b/.test(a)) {
    s.hp = 0;
    return {
      narrative:
        "Exhausted and reckless, you sink down to rest in the dark. The growl returns, closer this time. It is the last thing you ever hear.\n\nGAME OVER",
      state: s,
      ending: "lost",
    };
  }

  // ---- Heal ----
  if (/\b(drink|potion|heal|bandage)\b/.test(a)) {
    s.hp = Math.min(MAX_HP, s.hp + 30);
    return {
      narrative:
        "You take a swig from the waterskin. Warmth spreads through you and your wounds knit closed.\n\nWhat do you do?",
      state: s,
      ending: null,
    };
  }

  // ---- Look around ----
  if (/\b(look|inspect|survey|scan)\b/.test(a)) {
    return {
      narrative:
        "You scan the cavern. A rusty sword glints at your feet, a heavy iron door bars the far wall, and a narrow tunnel leads deeper into the dark, where the growling echoes.\n\nWhat do you do?",
      state: s,
      ending: null,
    };
  }

  // ---- Take the sword ----
  if (/\b(take|grab|pick|collect|sword|weapon)\b/.test(a) && !hasSword) {
    s.inventory.push("rusty sword");
    return {
      narrative:
        "You snatch up the rusty sword and heft it. It is heavy but serviceable, and the familiar weight steadies your nerves.\n\nWhat do you do?",
      state: s,
      ending: null,
    };
  }

  // ---- Fight the monster ----
  if (/\b(attack|fight|kill|hit|strike|monster|goblin|charge|swing)\b/.test(a)) {
    if (hasSword) {
      s.hp = Math.max(0, s.hp - 30);
      s.flags["monster"] = "defeated";
      return {
        narrative:
          "You charge the goblin. Your rusty sword bites deep — it shrieks once and crumples to the floor. You're wounded, but the way forward is clear.\n\nWhat do you do?",
        state: s,
        ending: null,
      };
    }
    s.hp = Math.max(0, s.hp - 40);
    return {
      narrative:
        "You swing wildly with your bare hands. The goblin claws your arm badly before you scramble out of reach. You need a weapon!\n\nWhat do you do?",
      state: s,
      ending: null,
    };
  }

  // ---- Open the chest / win ----
  if (/\b(open|chest|door|search|treasure|unlock|win)\b/.test(a)) {
    if (monsterDefeated) {
      return {
        narrative:
          "You pry the iron door open and step into the vault. Inside, the Sunstone blazes with golden light, the very heart of your quest.\n\nYOU WIN",
        state: s,
        ending: "won",
      };
    }
    return {
      narrative:
        "You push against the heavy iron door, but it is barred from the other side. The growling behind you grows louder — perhaps deal with that first.\n\nWhat do you do?",
      state: s,
      ending: null,
    };
  }

  // ---- Explore / default ----
  if (/\b(north|go|walk|enter|tunnel|explore|advance)\b/.test(a)) {
    return {
      narrative:
        "You press deeper into the tunnel. The darkness thickens, and the growl sharpens into something hungry ahead.\n\nWhat do you do?",
      state: { ...s, location: "deep tunnel" },
      ending: null,
    };
  }

  // ---- Fallback ----
  return {
    narrative:
      "You consider your next move carefully. The rusty sword at your feet, the barred iron door, and the growling dark all wait for you.\n\nWhat do you do?",
    state: s,
    ending: null,
  };
}
