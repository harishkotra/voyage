import { useEffect, useRef } from "react";
import type { LogEntry } from "../types";

interface Props {
  log: LogEntry[];
  hint: string | null;
  typing: boolean;
  error: string | null;
}

export default function HistoryLog({ log, hint, typing, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length, hint, typing]);

  return (
    <div className="history-scroll">
      <div className="history">
        {log.map((entry) =>
          entry.role === "dm" ? (
            <div key={entry.id} className="dm-block">
              <div className="dm-prose">{entry.text}</div>
            </div>
          ) : (
            <div key={entry.id} className="player-chip">
              <span className="player-caret">❯</span> {entry.text}
            </div>
          ),
        )}

        {hint && (
          <div className="hint-block">
            <span className="hint-label">DM hint</span>
            <div className="hint-text">{hint}</div>
          </div>
        )}

        {typing && (
          <div className="typing-indicator">
            <span />
            <span />
            <span />
          </div>
        )}

        {error && <div className="error-banner">⚠ {error}</div>}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
