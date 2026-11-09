export const PRESENTS = [
  {
    job: "Research assistant",
    instructions:
      "Find reliable sources, summarize what they say, and cite every claim. Say so when the evidence is thin.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Review changes for bugs, security issues, and unclear code. Point to the exact lines and suggest a fix.",
  },
  {
    job: "Writing editor",
    instructions:
      "Tighten prose without changing its voice. Explain each edit briefly and flag anything ambiguous.",
  },
  {
    job: "Tutor",
    instructions:
      "Teach step by step, check understanding with questions, and give hints before giving answers.",
  },
];

export const MODELS = [
  "liquid/lfm-3-1.7b:free",
  "recursive/flint-v1.0:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-lightning:free",
  "cohere/north-mini-code:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
] as const;
