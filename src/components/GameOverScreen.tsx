import type { GameSession } from "../types";
import { GENRE_META } from "../lib/dm";

interface Props {
  session: GameSession;
  accent: string;
  onRestart: () => void;
}

export default function GameOverScreen({ session, accent, onRestart }: Props) {
  const won = session.status === "won";
  const { state, turn } = session;
  const items = state.inventory.length;

  return (
    <div className="overlay">
      <div
        className="gameover-card"
        style={{ borderColor: accent, boxShadow: `0 0 60px var(--accent-glow)` }}
      >
        <div className="gameover-emoji">{won ? "🏆" : "💀"}</div>
        <h2 className="gameover-title" style={{ color: accent }}>
          {won ? "You Win" : "Game Over"}
        </h2>
        <p className="gameover-summary">
          {won
            ? "You reached your goal. The world remembers your deeds."
            : "The adventure ends here… for now."}
        </p>

        <div className="run-stats">
          <div className="stat">
            <span className="stat-num">{turn}</span>
            <span className="stat-label">turns</span>
          </div>
          <div className="stat">
            <span className="stat-num">{items}</span>
            <span className="stat-label">items found</span>
          </div>
          <div className="stat">
            <span className="stat-num">{state.hp}</span>
            <span className="stat-label">HP remaining</span>
          </div>
        </div>

        {session.ending && (
          <div className="ending-quote">“{session.ending.slice(0, 220)}”</div>
        )}

        <div className="gameover-genre">
          {GENRE_META[session.config.genre].emoji} {GENRE_META[session.config.genre].label} ·{" "}
          {session.config.difficulty}
        </div>

        <button className="start-button" onClick={onRestart}>
          ↺ Play Again
        </button>
      </div>
    </div>
  );
}
