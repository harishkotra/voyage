import type { CSSProperties } from "react";
import type { GameSession } from "../types";
import { GENRE_META } from "../lib/dm";
import HistoryLog from "./HistoryLog";
import InventorySidebar from "./InventorySidebar";
import GameOverScreen from "./GameOverScreen";
import Footer from "./Footer";

interface Props {
  session: GameSession;
  typing: boolean;
  hint: string | null;
  error: string | null;
  demo?: boolean;
  onAction: (text: string) => void;
  onHint: () => void;
  onRestart: () => void;
}

export default function GameScreen({
  session,
  typing,
  hint,
  error,
  demo = false,
  onAction,
  onHint,
  onRestart,
}: Props) {
  const accent = GENRE_META[session.config.genre].accent;
  const ended = session.status !== "playing";

  const style = {
    "--accent": accent,
    "--accent-glow": GENRE_META[session.config.genre].glow,
  } as CSSProperties;

  return (
    <div className="game-shell" style={style}>
      <header className="game-header">
        <div className="brand">
          <span className="brand-mark">✦</span> VOYAGE
          <span className="brand-genre">{GENRE_META[session.config.genre].label}</span>
          {demo && <span className="demo-badge">DEMO</span>}
        </div>
        <div className="header-actions">
          <span className="turn-count">Turn {session.turn}</span>
          <button className="btn-ghost" onClick={onHint} disabled={typing || ended}>
            💡 Hint
          </button>
          <button className="btn-ghost" onClick={onRestart}>
            ↺ Restart
          </button>
        </div>
      </header>

      <div className="game-body">
        <main className="history-column">
          <HistoryLog
            log={session.log}
            hint={hint}
            typing={typing}
            error={error}
          />
          {!ended && (
            <form
              className="input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem(
                  "action",
                ) as HTMLInputElement | null;
                if (!input) return;
                const value = input.value;
                if (value.trim()) {
                  onAction(value);
                  input.value = "";
                }
              }}
            >
              <input
                name="action"
                type="text"
                placeholder="What do you do?"
                autoComplete="off"
                disabled={typing}
                autoFocus
              />
              <button type="submit" disabled={typing}>
                {typing ? "…" : "Send"}
              </button>
            </form>
          )}
        </main>

        <aside className="sidebar">
          <InventorySidebar session={session} />
        </aside>
      </div>

      {ended && (
        <GameOverScreen
          session={session}
          accent={accent}
          onRestart={onRestart}
        />
      )}

      <Footer compact />
    </div>
  );
}
