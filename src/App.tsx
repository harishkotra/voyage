import { useCallback, useEffect, useRef, useState } from "react";
import StartScreen from "./components/StartScreen";
import GameScreen from "./components/GameScreen";
import type {
  ChatMessage,
  GameConfig,
  GameSession,
  GameState,
  LogEntry,
} from "./types";
import {
  STATE_REMINDER,
  buildSystemPrompt,
  callDM,
  detectEnding,
  formatState,
  initialState,
  parseStateReply,
  trimHistory,
} from "./lib/dm";
import { runDemoTurn } from "./lib/demo";
import { loadSession, saveSession } from "./lib/storage";

let idCounter = 0;
function nextId() {
  return `${Date.now()}-${idCounter++}`;
}

interface Snap {
  config: GameConfig;
  messages: ChatMessage[];
  state: GameState;
}

export default function App() {
  const [session, setSession] = useState<GameSession | null>(() => loadSession());
  const [typing, setTyping] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get("demo") === "1",
  );
  const busyRef = useRef(false);
  const demoRef = useRef(demo);
  useEffect(() => {
    demoRef.current = demo;
  }, [demo]);

  // Persist session on change.
  useEffect(() => {
    saveSession(session);
  }, [session]);

  /**
   * Core DM turn. Operates on a snapshot and returns the updated values.
   * Does not touch React session state itself, so it is safe to reuse from
   * start and from each action. For a "hint" turn nothing is persisted.
   */
  const runTurn = useCallback(
    async (
      snap: Snap,
      action: string | null,
      kind: "action" | "hint",
    ): Promise<{
      messages: ChatMessage[];
      state: GameState;
      narrative: string;
      ending: "won" | "lost" | null;
    } | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setTyping(true);
      setError(null);
      setHint(null);

      let working = [...snap.messages];
      const workingState = { ...snap.state };

      // Rebuild the system prompt with the latest state (in-prompt state block).
      const systemIndex = working.findIndex((m) => m.role === "system");
      if (systemIndex >= 0) {
        working[systemIndex] = {
          role: "system",
          content: buildSystemPrompt(snap.config, workingState),
        };
      }

      if (action !== null) {
        working = [
          ...working,
          {
            role: "user",
            content: action + (kind === "action" ? STATE_REMINDER : ""),
          },
        ];
      }

      try {
        let raw: string;
        if (demoRef.current) {
          // Scripted demo mode: no network — deterministic for video walkthroughs.
          const d = runDemoTurn(workingState, action, kind);
          raw = d.narrative + "\n\n" + formatState(d.state);
        } else {
          raw = await callDM(working);
        }
        const parsed = parseStateReply(raw, workingState);
        const narrative = parsed ? parsed.narrative : raw;
        const nextState = parsed ? parsed.state : workingState;
        const ending = detectEnding(narrative);

        if (kind === "action" && action !== null) {
          working = [...working, { role: "assistant", content: raw }];
        }

        return { messages: working, state: nextState, narrative, ending };
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong talking to the DM.");
        return null;
      } finally {
        busyRef.current = false;
        setTyping(false);
      }
    },
    [],
  );

  const applyResult = useCallback(
    (
      s: GameSession | null,
      result: {
        messages: ChatMessage[];
        state: GameState;
        narrative: string;
        ending: "won" | "lost" | null;
      },
    ): GameSession | null => {
      if (!s) return s;
      const dmEntry: LogEntry = { id: nextId(), role: "dm", text: result.narrative };
      return {
        ...s,
        state: result.state,
        messages: trimHistory(result.messages),
        log: [...s.log, dmEntry],
        turn: s.turn + 1,
        status: result.ending ?? s.status,
        ending: result.ending ? result.narrative : s.ending,
      };
    },
    [],
  );

  const startGame = useCallback(
    async (config: GameConfig) => {
      const state = initialState(config);
      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(config, state) },
      ];
      setSession({
        config,
        state,
        status: "playing",
        messages,
        log: [],
        turn: 0,
        createdAt: Date.now(),
      });
      setError(null);

      const result = await runTurn({ config, messages, state }, null, "action");
      if (result) {
        setSession((s) => applyResult(s, result));
      }
    },
    [runTurn, applyResult],
  );

  const handleAction = useCallback(
    async (text: string) => {
      if (!session || typing || busyRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const playerEntry: LogEntry = { id: nextId(), role: "player", text: trimmed };
      setSession((s) => (s ? { ...s, log: [...s.log, playerEntry] } : s));

      const result = await runTurn(
        {
          config: session.config,
          messages: session.messages,
          state: session.state,
        },
        trimmed,
        "action",
      );
      if (result) {
        setSession((s) => applyResult(s, result));
      }
    },
    [session, typing, runTurn, applyResult],
  );

  const handleHint = useCallback(async () => {
    if (!session || typing || busyRef.current) return;
    const result = await runTurn(
      {
        config: session.config,
        messages: session.messages,
        state: session.state,
      },
      "[OOC: Give the player a 1-sentence hint about what to do next. Do NOT advance the story, change state, or reveal secrets. Reply with only the hint.]",
      "hint",
    );
    if (result) setHint(result.narrative);
  }, [session, typing, runTurn]);

  const restart = useCallback(() => {
    setSession(null);
    setHint(null);
    setError(null);
  }, []);

  if (!session) {
    return <StartScreen onStart={startGame} demo={demo} onDemoChange={setDemo} />;
  }

  return (
    <GameScreen
      session={session}
      typing={typing}
      hint={hint}
      error={error}
      demo={demo}
      onAction={handleAction}
      onHint={handleHint}
      onRestart={restart}
    />
  );
}
