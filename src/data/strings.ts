// Narrative content module. TEMP placeholder copy — a content agent overwrites
// the VALUES later, so keep the SHAPE stable. Everything the title screen and
// intro read comes from here; nothing else should hardcode player-facing prose.

export interface GameStrings {
  gameTitle: string;
  tagline: string;
  /** Opening scene: a mentor figure hands the player their Codex. 4-6 lines. */
  opening: { speaker: string; text: string }[];
  /** Blurb per starter, keyed by SpeciesRole: "starter-verdant" | "starter-ember" | "starter-tide". */
  starterBlurbs: Record<string, string>;
  starterPrompt: string;
}

export const STRINGS: GameStrings = {
  gameTitle: "Gaiamon",
  tagline: "Sync with the wild. Wake the sleeping world.",
  opening: [
    { speaker: "Archivist Maru", text: "Oh good, you came! My knees retired years ago, but the map is NOT finished." },
    { speaker: "Archivist Maru", text: "Here. This is a Codex. Older than the waystones. Smarter than me before tea." },
    { speaker: "Archivist Maru", text: "The land out there is alive, little Warden. It dreams. Its dreams have paws." },
    { speaker: "Archivist Maru", text: "We call them Gaiamon. Sync with one, and you'll never walk alone again." },
    { speaker: "Archivist Maru", text: "The Codex doesn't trap them. It listens. Your job is to be worth listening WITH." },
    { speaker: "Archivist Maru", text: "Now — three little dreams wandered onto my porch this morning. Rude, but lucky." },
    { speaker: "Archivist Maru", text: "Pick one. Use your heart or your gut. Never your brain. Brains are awful at this." },
    { speaker: "Archivist Maru", text: "Go on then. The world's been waiting ages to meet you. Don't keep it waiting." },
  ],
  starterBlurbs: {
    "starter-verdant":
      "The Loyal Sprout — a small green promise that chose you before you chose it; slow to bloom, impossible to shake, the friend who holds the umbrella.",
    "starter-ember":
      "The Bold Cinder — a spark with big opinions and a bigger heart, first through every doorway, convinced you two are already legends.",
    "starter-tide":
      "The Curious Droplet — a wandering question made of water; it doesn't want to conquer the world, only to know what it tastes like.",
  },
  starterPrompt: "Which little dream hums back to you?",
};
