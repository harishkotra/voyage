export type Genre = "fantasy" | "sci-fi" | "horror" | "pirate" | "western";
export type Difficulty = "easy" | "normal" | "hard";

export interface GameConfig {
  genre: Genre;
  difficulty: Difficulty;
}

export interface GameState {
  hp: number;
  maxHp: number;
  inventory: string[];
  location: string;
  flags: Record<string, string>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LogEntry {
  id: string;
  role: "dm" | "player";
  text: string;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameSession {
  config: GameConfig;
  state: GameState;
  status: GameStatus;
  messages: ChatMessage[];
  log: LogEntry[];
  turn: number;
  createdAt: number;
  ending?: string;
}
