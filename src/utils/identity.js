/**
 * Player Identity System — maps identity to narratives, metrics, and motivations.
 * The identity turns every number into a chapter in the player's story.
 */

export const IDENTITIES = {
  scorer: {
    label: 'Scorer',
    paceLabel: "SCORER'S PACE",
    primaryMetric: 'shooting',
    narratives: {
      accelerating: "Your finishing is getting sharper — keep hunting goals.",
      stalling: "Your path to becoming a scorer has slowed — one finishing session can reignite it.",
      steady: "Steady progress on your scoring journey. Stay locked in.",
    },
    tips: {
      shooting: "Scorers live and die by finishing. 20 shots from the box today.",
      passing: "Even scorers need to link play. A quick passing drill sharpens your movement.",
      consistency: "Goals come from reps. Even 15 minutes of finishing compounds.",
      duration: "Longer sessions mean more chances to practice your killer instinct.",
      load: "Push the intensity — match-day pressure won't wait.",
    },
    peerPrefix: "scorers",
    motivation: "Every shot is a chance to prove yourself.",
    drillBoost: { shooting: 0.15 },
  },
  speedster: {
    label: 'Speedster',
    paceLabel: "SPEEDSTER'S PACE",
    primaryMetric: 'load',
    narratives: {
      accelerating: "You're getting faster — your speed is becoming your weapon.",
      stalling: "Speed needs constant work. Add sprint drills to stay explosive.",
      steady: "Maintaining your pace. Keep pushing the intensity.",
    },
    tips: {
      shooting: "Fast players who can finish are unstoppable. Add some shooting reps.",
      passing: "Quick passing under speed separates good from great.",
      consistency: "Speed fades without regular work. Stay in the routine.",
      duration: "Longer sessions build the endurance that fuels your speed.",
      load: "Intensity is your edge — don't let it drop.",
    },
    peerPrefix: "speedsters",
    motivation: "Nobody catches you. Train like it.",
    drillBoost: { physical: 0.15 },
  },
  playmaker: {
    label: 'Playmaker',
    paceLabel: "PLAYMAKER'S PACE",
    primaryMetric: 'passing',
    narratives: {
      accelerating: "Your vision is expanding — you're seeing passes others can't.",
      stalling: "Playmakers need rhythm. A passing session gets your touch back.",
      steady: "Steady hands, steady mind. Your passing game is holding.",
    },
    tips: {
      shooting: "Playmakers who can score are the most dangerous players on the pitch.",
      passing: "Playmakers thrive on rhythm. Wall passes, one-touch combos, quick feet.",
      consistency: "Creativity comes from repetition. Keep showing up.",
      duration: "More time on the ball, more chances to find that killer pass.",
      load: "Raise the tempo — match-day decisions happen at speed.",
    },
    peerPrefix: "playmakers",
    motivation: "The best pass is the one nobody else sees.",
    drillBoost: { passing: 0.15 },
  },
  engine: {
    label: 'Engine',
    paceLabel: "ENGINE'S PACE",
    primaryMetric: 'consistency',
    narratives: {
      accelerating: "Your work rate is climbing — you're becoming the player who never stops.",
      stalling: "Engines don't stall. Get back on track with one session today.",
      steady: "Consistent effort, consistent results. That's your identity.",
    },
    tips: {
      shooting: "Hard workers who can finish change games. Add a shooting block.",
      passing: "Work rate plus passing accuracy makes you the complete midfielder.",
      consistency: "Engines don't stop. Even 15 minutes keeps the momentum going.",
      duration: "Outwork everyone. Add 10 minutes and watch the gap grow.",
      load: "You thrive on volume. Push through — that's what makes you different.",
    },
    peerPrefix: "hard workers",
    motivation: "Outwork everyone. That's the edge nobody can take from you.",
    drillBoost: { physical: 0.1, shooting: 0.05 },
  },
  rock: {
    label: 'Rock',
    paceLabel: "ROCK'S PACE",
    primaryMetric: 'load',
    narratives: {
      accelerating: "You're getting stronger — nobody's getting past you.",
      stalling: "Defensive discipline needs maintenance. One focused session refocuses you.",
      steady: "Solid and steady. Exactly what a rock should be.",
    },
    tips: {
      shooting: "Defenders who score from set pieces are invaluable. Practice your heading.",
      passing: "Building from the back starts with clean passing under pressure.",
      consistency: "Reliability is your superpower. Keep the routine going.",
      duration: "Stamina wins the last 10 minutes. Push the session length.",
      load: "Physical dominance comes from consistent high-intensity work.",
    },
    peerPrefix: "defenders",
    motivation: "Nothing gets past you. Train like the wall you are.",
    drillBoost: { physical: 0.1, tactical: 0.1 },
  },
};

/**
 * Get the identity config for a player. Falls back to a generic default.
 */
export function getIdentity(playerIdentity) {
  if (!playerIdentity) return null;
  return IDENTITIES[playerIdentity] || null;
}

/**
 * Get the pace label for the hero circle (e.g., "SCORER'S PACE" or "YOUR PACE")
 */
export function getPaceLabel(playerIdentity) {
  const id = getIdentity(playerIdentity);
  return id?.paceLabel || 'YOUR PACE';
}

/**
 * Get identity-aware narrative for the pace state.
 */
export function getPaceNarrative(playerIdentity, paceLabel) {
  const id = getIdentity(playerIdentity);
  if (id?.narratives?.[paceLabel]) return id.narratives[paceLabel];
  // Fallback
  if (paceLabel === 'accelerating') return "You're improving faster than before";
  if (paceLabel === 'stalling') return 'Your improvement has slowed down';
  return 'Maintaining a steady pace';
}

/**
 * Get identity-aware tip for a declining metric.
 */
export function getIdentityTip(playerIdentity, metricKey) {
  const id = getIdentity(playerIdentity);
  if (id?.tips?.[metricKey]) return id.tips[metricKey];
  // Fallback tips
  const fallback = {
    shooting: 'Add one focused finishing drill.',
    passing: 'Try a wall-pass session this week.',
    consistency: 'Even a short 15-minute session counts.',
    duration: 'Try adding 10 minutes to your next session.',
    load: 'Push the intensity slightly or add a session.',
  };
  return fallback[metricKey] || 'Keep working on it.';
}

/**
 * Get identity-aware peer comparison prefix (e.g., "scorers at your level")
 */
export function getPeerPrefix(playerIdentity) {
  const id = getIdentity(playerIdentity);
  return id?.peerPrefix || 'players';
}

/**
 * Get drill category weight boosts for the identity.
 */
export function getIdentityDrillBoost(playerIdentity) {
  const id = getIdentity(playerIdentity);
  return id?.drillBoost || {};
}

/**
 * Get motivation quote for the identity.
 */
export function getIdentityMotivation(playerIdentity) {
  const id = getIdentity(playerIdentity);
  return id?.motivation || 'Small daily improvements lead to stunning results.';
}
