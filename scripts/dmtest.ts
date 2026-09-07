import {
  buildSystemPrompt,
  callDM,
  detectEnding,
  initialState,
  parseStateReply,
  setApiUrl,
  stripStatsFooter,
  trimHistory,
} from "../src/lib/dm";

async function main() {
  setApiUrl(process.env.DM_API_URL || "http://localhost:4173/api/chat");
  const config = { genre: "fantasy" as const, difficulty: "normal" as const };
  let state = initialState(config);
  let messages = [
    { role: "system" as const, content: buildSystemPrompt(config, state) },
  ];

  console.log("== Turn 0: start ==");
  let raw = await callDM(messages);
  let parsed = parseStateReply(raw, state);
  console.log("parsed:", !!parsed, "hp:", parsed?.state.hp, "inv:", parsed?.state.inventory);
  if (parsed) {
    state = parsed.state;
    messages = [...messages, { role: "assistant", content: raw }];
  }
  console.log("narrative (first 60):", parsed?.narrative.slice(0, 60));

  // Turn 1: player action
  const actions = [
    "look around for a weapon",
    "take the sword and attack the goblin",
    "search the chest",
    "open the door",
  ];
  for (const action of actions) {
    console.log(`\n== Turn: "${action}" ==`);
    messages = [
      ...messages.filter((m) => m.role !== "system"),
    ];
    // rebuild system with current state
    messages = [
      { role: "system", content: buildSystemPrompt(config, state) },
      ...messages,
    ];
    messages = [...messages, { role: "user", content: action }];
    raw = await callDM(messages);
    parsed = parseStateReply(raw, state);
    console.log("parsed:", !!parsed, "hp:", parsed?.state.hp, "inv:", parsed?.state.inventory, "loc:", parsed?.state.location, "flags:", parsed?.state.flags);
    if (parsed) {
      state = parsed.state;
      messages = [...messages, { role: "assistant", content: raw }];
      console.log("narrative (first 80):", parsed.narrative.replace(/\n/g, " ").slice(0, 80));
    } else {
      console.log("NO STATE LINE. raw (first 120):", raw.slice(0, 120));
    }
  }

  console.log("\n== Ending detection tests ==");
  console.log("YOU WIN ->", detectEnding("You found it! YOU WIN"));
  console.log("GAME OVER ->", detectEnding("You die. GAME OVER"));
  console.log("none ->", detectEnding("You continue exploring."));

  console.log("\n== stripStatsFooter ==");
  console.log(stripStatsFooter("hello world <|stats|>{\"x\":1}<|/stats|>"));

  console.log("\n== trimHistory ==");
  const many = Array.from({ length: 30 }, (_, i) => ({ role: "user" as const, content: `m${i}` }));
  console.log("trimmed len:", trimHistory([{ role: "system", content: "s" }, ...many]).length);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
