/**
 * Canonical drill definitions shared across the app.
 * Every place that needs reps/duration/instruction for a drill name imports from here.
 *
 * Add a new drill once here and it's available everywhere.
 */

export const DRILL_DETAILS = {
  'Wall Passes (1-touch)': {
    reps: '3 sets x 20 passes',
    duration: 5,
    instruction: 'Alternate feet each set. Stay on your toes.',
  },
  'Wall Passes (2-touch)': {
    reps: '3 sets x 15 passes',
    duration: 5,
    instruction: 'First touch to control, second to pass. Focus on cushioning.',
  },
  'Finishing Drill': {
    reps: '20 shots total',
    duration: 8,
    instruction: '10 right foot, 10 left foot from inside the box. Aim corners.',
  },
  'Shooting (Inside Box)': {
    reps: '15 shots',
    duration: 7,
    instruction: '5 right, 5 left, 5 from different angles. Quick release.',
  },
  'Shooting (Outside Box)': {
    reps: '10 shots',
    duration: 6,
    instruction: 'Focus on power and placement. Hit the target before hitting it hard.',
  },
  'Crossing & Finishing': {
    reps: '10 crosses + finish',
    duration: 8,
    instruction: 'Cross from wide, run in and finish. Alternate sides.',
  },
  'Free Kicks': {
    reps: '15 kicks',
    duration: 8,
    instruction: '5 near post, 5 far post, 5 over the wall. Technique over power.',
  },
  'Long Passing': {
    reps: '20 passes',
    duration: 7,
    instruction: 'Hit targets at 30+ yards. Lock your ankle, follow through.',
  },
  'Short Passing Combos': {
    reps: '3 sets x 2 min',
    duration: 6,
    instruction: 'Quick 1-2 touch passing. Move after every pass.',
  },
  'Rondo': {
    reps: '3 rounds x 3 min',
    duration: 10,
    instruction: 'Keep possession under pressure. 2-touch max.',
  },
  'Dribbling Circuit': {
    reps: '5 runs through',
    duration: 6,
    instruction: 'Cones: inside-outside, drag backs, step-overs. Speed up each run.',
  },
  'Sprint Intervals': {
    reps: '8 x 30m sprints',
    duration: 8,
    instruction: '30 sec rest between sprints. Max effort each one.',
  },
};

const DRILL_FALLBACK = {
  reps: '10 min',
  duration: 10,
  instruction: 'Focus on quality over quantity.',
};

/**
 * Look up drill details by canonical name.
 * Returns the fallback if the drill isn't in the catalog.
 * Callers can pass a second arg to merge in instance-specific overrides (e.g. from a coach plan).
 */
export function getDrillDetail(name, overrides = {}) {
  const base = DRILL_DETAILS[name] || DRILL_FALLBACK;
  return { ...base, ...overrides };
}
