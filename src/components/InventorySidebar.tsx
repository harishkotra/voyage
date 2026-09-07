import type { GameSession } from "../types";

interface Props {
  session: GameSession;
}

export default function InventorySidebar({ session }: Props) {
  const { state } = session;
  const pct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  const hpColor =
    pct > 50 ? "var(--hp-good)" : pct > 25 ? "var(--hp-warn)" : "var(--hp-bad)";

  return (
    <div className="inventory-card">
      <h3 className="sidebar-title">Status</h3>

      <div className="hp-section">
        <div className="hp-label">
          <span>HP</span>
          <span>
            {state.hp}/{state.maxHp}
          </span>
        </div>
        <div className="hp-track">
          <div
            className="hp-fill"
            style={{ width: `${pct}%`, background: hpColor }}
          />
        </div>
      </div>

      <div className="loc-section">
        <span className="loc-label">Location</span>
        <span className="loc-value">{state.location}</span>
      </div>

      <h3 className="sidebar-title">Inventory</h3>
      {state.inventory.length === 0 ? (
        <p className="inventory-empty">Empty. The world is yours to explore.</p>
      ) : (
        <ul className="inventory-list">
          {state.inventory.map((item, i) => (
            <li key={`${item}-${i}`} className="inventory-item">
              <span className="item-dot">◆</span> {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
