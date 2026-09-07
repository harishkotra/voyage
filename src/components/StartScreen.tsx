import { useState } from "react";
import type { Difficulty, GameConfig, Genre } from "../types";
import { DIFFICULTIES, DIFFICULTY_META, GENRES, GENRE_META } from "../lib/dm";
import Footer from "./Footer";

interface Props {
  onStart: (config: GameConfig) => void;
  demo?: boolean;
  onDemoChange?: (demo: boolean) => void;
}

export default function StartScreen({ onStart, demo = false, onDemoChange }: Props) {
  const [genre, setGenre] = useState<Genre>("fantasy");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    setStarting(true);
    onStart({ genre, difficulty });
  };

  return (
    <div className="start-screen">
      <div className="start-card">
        <div className="start-title-block">
          <div className="start-kicker">✦ AI DUNGEON MASTER ✦</div>
          <h1 className="start-title">VOYAGE</h1>
          <p className="start-subtitle">
            A living text adventure. Every playthrough is different — the
            dungeon master weaves the world around every choice you make.
          </p>
        </div>

        <div className="start-section">
          <h2>Choose your genre</h2>
          <div className="genre-grid">
            {GENRES.map((g) => (
              <button
                key={g}
                className={`genre-card ${genre === g ? "selected" : ""}`}
                style={
                  genre === g
                    ? {
                        borderColor: GENRE_META[g].accent,
                        boxShadow: `0 0 0 1px ${GENRE_META[g].accent}, 0 8px 30px ${GENRE_META[g].glow}`,
                      }
                    : undefined
                }
                onClick={() => setGenre(g)}
              >
                <span className="genre-emoji">{GENRE_META[g].emoji}</span>
                <span className="genre-name">{GENRE_META[g].label}</span>
                <span className="genre-win">{GENRE_META[g].win}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="start-section">
          <h2>Difficulty</h2>
          <div className="difficulty-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`difficulty-chip ${difficulty === d ? "selected" : ""}`}
                onClick={() => setDifficulty(d)}
              >
                {DIFFICULTY_META[d].label}
              </button>
            ))}
          </div>
          <p className="difficulty-note">{DIFFICULTY_META[difficulty].note}</p>
        </div>

        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => onDemoChange?.(e.target.checked)}
          />
          <span>
            <strong>Demo mode</strong> — scripted, instant responses (no live
            calls). Great for recording a video walkthrough.
          </span>
        </label>

        <button className="start-button" onClick={handleStart} disabled={starting}>
          {starting ? "Forging the world…" : "Begin the Adventure"}
        </button>
        <p className="start-footer">Live from chatjimmy.ai — nothing is hardcoded.</p>
        <Footer />
      </div>
    </div>
  );
}
