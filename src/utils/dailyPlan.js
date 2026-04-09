import { analyzeGaps } from './gapAnalysis';
import { getStreak, computeFourPillars } from './stats';
import { getIdentityMotivation, getIdentityDrillBoost } from './identity';

// Detailed drill definitions with reps/duration/instructions
const DRILL_DETAILS = {
  'Wall Passes (1-touch)': { reps: '3 sets x 20 passes', duration: 5, instruction: 'Alternate feet each set. Stay on your toes.' },
  'Wall Passes (2-touch)': { reps: '3 sets x 15 passes', duration: 5, instruction: 'First touch to control, second to pass. Focus on cushioning.' },
  'Finishing Drill': { reps: '20 shots total', duration: 8, instruction: '10 right foot, 10 left foot from inside the box. Aim corners.' },
  'Shooting (Inside Box)': { reps: '15 shots', duration: 7, instruction: '5 right, 5 left, 5 from different angles. Quick release.' },
  'Shooting (Outside Box)': { reps: '10 shots', duration: 6, instruction: 'Focus on power and placement. Hit the target before hitting it hard.' },
  'Crossing & Finishing': { reps: '10 crosses + finish', duration: 8, instruction: 'Cross from wide, run in and finish. Alternate sides.' },
  'Free Kicks': { reps: '15 kicks', duration: 8, instruction: '5 near post, 5 far post, 5 over the wall. Technique over power.' },
  'Long Passing': { reps: '20 passes', duration: 7, instruction: 'Hit targets at 30+ yards. Lock your ankle, follow through.' },
  'Short Passing Combos': { reps: '3 sets x 2 min', duration: 6, instruction: 'Quick 1-2 touch passing. Move after every pass.' },
  'Rondo': { reps: '3 rounds x 3 min', duration: 10, instruction: 'Keep possession under pressure. 2-touch max.' },
  'Dribbling Circuit': { reps: '5 runs through', duration: 6, instruction: 'Cones: inside-outside, drag backs, step-overs. Speed up each run.' },
  'Sprint Intervals': { reps: '8 x 30m sprints', duration: 8, instruction: '30 sec rest between sprints. Max effort each one.' },
};

function getDrillDetail(name) {
  return DRILL_DETAILS[name] || { reps: '10 min', duration: 10, instruction: 'Focus on quality over quantity.' };
}

function buildTimeline(drillNames) {
  const timeline = [];
  let elapsed = 0;

  // Context-aware warm-up
  const warmup = getWarmupForFocus(drillNames);
  timeline.push({
    name: warmup.name,
    reps: warmup.reps,
    duration: warmup.duration,
    instruction: warmup.instruction,
    startMin: 0,
    isWarmup: true,
  });
  elapsed = 5;

  for (const name of drillNames) {
    const detail = getDrillDetail(name);
    timeline.push({
      name,
      reps: detail.reps,
      duration: detail.duration,
      instruction: detail.instruction,
      startMin: elapsed,
    });
    elapsed += detail.duration;
  }

  // Cool-down always last
  timeline.push({
    name: 'Cool-down',
    reps: '5 min',
    duration: 5,
    instruction: 'Static stretches. Hold each stretch 20-30 seconds.',
    startMin: elapsed,
    isCooldown: true,
  });
  elapsed += 5;

  return { timeline, totalDuration: elapsed };
}

const STARTER_PLANS = [
  { focus: 'Getting Started', drills: ['Wall Passes (1-touch)', 'Finishing Drill', 'Dribbling Circuit'], motivation: 'Every expert was once a beginner. Let\'s build your foundation.' },
  { focus: 'Basic Shooting', drills: ['Finishing Drill', 'Shooting (Inside Box)', 'Free Kicks'], motivation: 'Find the back of the net. Focus on placement over power.' },
  { focus: 'Touch & Control', drills: ['Wall Passes (2-touch)', 'Short Passing Combos', 'Dribbling Circuit'], motivation: 'Great players are built on great first touches.' },
];

const RECOVERY_DRILLS = ['Wall Passes (2-touch)', 'Short Passing Combos', 'Dribbling Circuit'];

const PILLAR_DRILLS = {
  technique: ['Wall Passes (1-touch)', 'Wall Passes (2-touch)', 'Dribbling Circuit', 'Short Passing Combos'],
  tactics: ['Rondo', 'Short Passing Combos', 'Long Passing'],
  fitness: ['Sprint Intervals', 'Dribbling Circuit'],
  mentality: ['Free Kicks', 'Finishing Drill', 'Shooting (Outside Box)'],
};

// Position-specific drill weightings (40/20/20/20)
const POSITION_WEIGHTS = {
  Striker:  { shooting: 0.4, passing: 0.2, dribbling: 0.2, physical: 0.2 },
  Winger:   { dribbling: 0.4, crossing: 0.2, shooting: 0.2, physical: 0.2 },
  CAM:      { passing: 0.4, shooting: 0.2, dribbling: 0.2, physical: 0.2 },
  CDM:      { passing: 0.4, physical: 0.2, tactical: 0.2, dribbling: 0.2 },
  CB:       { physical: 0.4, passing: 0.2, tactical: 0.2, heading: 0.2 },
  GK:       { physical: 0.4, agility: 0.3, shooting: 0.2, mental: 0.1 },
  General:  { shooting: 0.25, passing: 0.25, dribbling: 0.25, physical: 0.25 },
};

const CATEGORY_DRILLS = {
  shooting: ['Finishing Drill', 'Shooting (Inside Box)', 'Shooting (Outside Box)', 'Free Kicks', 'Weak Foot Finishing', 'Power Shooting', 'Placement Shooting'],
  passing: ['Wall Passes (1-touch)', 'Wall Passes (2-touch)', 'Short Passing Combos', 'Long Passing', 'Rondo', 'Through Ball Practice'],
  dribbling: ['Dribbling Circuit', 'Cone Weave Dribbling', 'Ball Mastery Routine', '1v1 Moves Practice', 'Speed Dribbling', 'Close Control Box'],
  crossing: ['Crossing & Finishing', 'Driven Cross Practice', 'Whipped Cross Technique', 'Set Piece Delivery'],
  physical: ['Sprint Intervals', 'Ladder Footwork', 'T-Drill', 'Cone Shuttle Runs', 'Zig-Zag Agility', 'Bodyweight Circuit'],
  tactical: ['Positional Shadow Play', 'Scanning Practice', 'Decision-Making Cones', 'Off-The-Ball Movement'],
  agility: ['Ladder Footwork', 'T-Drill', 'Zig-Zag Agility', 'Deceleration Training', 'Reaction Sprints'],
  mental: ['Pre-Match Visualization', 'Pressure Finishing', 'Breathing & Focus Reset'],
};

// Warm-up variants matched to session focus
const WARMUP_VARIANTS = {
  shooting: { name: 'Shooting Warm-up', reps: '5 min', duration: 5, instruction: 'Light passing, then 5 easy shots from close range. Build up to match pace.' },
  passing: { name: 'Passing Warm-up', reps: '5 min', duration: 5, instruction: 'Short passes against wall, 2-touch rhythm. Gradually increase pace.' },
  physical: { name: 'Dynamic Warm-up', reps: '5 min', duration: 5, instruction: 'High knees, butt kicks, lateral shuffles, leg swings. Get the blood flowing.' },
  default: { name: 'Warm-up', reps: '5 min', duration: 5, instruction: 'Light jog, dynamic stretches, ball rolls.' },
};

function getWarmupForFocus(focusDrills) {
  const shootingDrills = CATEGORY_DRILLS.shooting || [];
  const passingDrills = CATEGORY_DRILLS.passing || [];
  const physicalDrills = [...(CATEGORY_DRILLS.physical || []), ...(CATEGORY_DRILLS.agility || [])];

  const shootCount = focusDrills.filter(d => shootingDrills.includes(d)).length;
  const passCount = focusDrills.filter(d => passingDrills.includes(d)).length;
  const physCount = focusDrills.filter(d => physicalDrills.includes(d)).length;

  if (physCount > shootCount && physCount > passCount) return WARMUP_VARIANTS.physical;
  if (shootCount >= passCount) return WARMUP_VARIANTS.shooting;
  if (passCount > 0) return WARMUP_VARIANTS.passing;
  return WARMUP_VARIANTS.default;
}

function selectDrillsByPosition(position, count = 4, exclude = [], identity = '') {
  const baseWeights = { ...(POSITION_WEIGHTS[position] || POSITION_WEIGHTS.General) };
  // Apply identity-based boosts
  const boosts = getIdentityDrillBoost(identity);
  for (const [cat, boost] of Object.entries(boosts)) {
    baseWeights[cat] = (baseWeights[cat] || 0) + boost;
  }
  const weights = baseWeights;
  const drills = [];
  const used = new Set(exclude);

  // Pick drills proportionally by weight
  const categories = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  for (const [cat, weight] of categories) {
    const numFromCat = Math.max(1, Math.round(count * weight));
    const available = (CATEGORY_DRILLS[cat] || []).filter(d => !used.has(d));
    const picked = available.sort(() => Math.random() - 0.5).slice(0, numFromCat);
    picked.forEach(d => { drills.push(d); used.add(d); });
    if (drills.length >= count) break;
  }

  return drills.slice(0, count);
}

function getIdpBoostArea(idpGoals) {
  const active = (idpGoals || []).filter(g => g.status === 'active');
  if (active.length === 0) return null;

  // Map IDP corners to drill categories
  const cornerToCategory = {
    technical: ['shooting', 'passing', 'dribbling'],
    tactical: ['tactical'],
    physical: ['physical', 'agility'],
    psychological: ['mental'],
  };

  // Find the most common corner among active goals
  const counts = {};
  for (const g of active) {
    counts[g.corner] = (counts[g.corner] || 0) + 1;
  }
  const topCorner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return topCorner ? cornerToCategory[topCorner] : null;
}

const MOTIVATIONS = [
  'Small daily improvements lead to stunning results.',
  'The best never take a day off from getting better.',
  'Train like nobody\'s watching. Perform like everybody is.',
  'Consistency beats talent when talent isn\'t consistent.',
  'Today\'s work is tomorrow\'s confidence.',
  'Champions are made when nobody\'s watching.',
  'One more session closer to where you want to be.',
  'Discipline is choosing what you want most over what you want now.',
];

function pickMotivation(identity) {
  if (identity) {
    const msg = getIdentityMotivation(identity);
    if (msg) return msg;
  }
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

export function generateDailyPlan(sessions, idpGoals = [], position = 'General', identity = '') {
  const today = new Date().toISOString().split('T')[0];
  const streak = getStreak(sessions);

  // Already trained today
  if (sessions.some(s => s.date === today)) {
    return {
      type: 'completed',
      focus: 'Session Complete',
      timeline: [],
      totalDuration: 0,
      drills: [],
      motivation: 'Great work today! Rest up and come back stronger tomorrow.',
      xpReward: 0,
    };
  }

  // New player → starter plan
  if (sessions.length < 3) {
    const plan = STARTER_PLANS[sessions.length % STARTER_PLANS.length];
    const { timeline, totalDuration } = buildTimeline(plan.drills);
    return { ...plan, type: 'starter', timeline, totalDuration, targetDuration: totalDuration, xpReward: 50 };
  }

  // Long streak → recovery
  if (streak >= 5) {
    const { timeline, totalDuration } = buildTimeline(RECOVERY_DRILLS);
    return {
      type: 'recovery',
      focus: 'Active Recovery',
      drills: RECOVERY_DRILLS,
      timeline,
      totalDuration,
      targetDuration: totalDuration,
      motivation: 'You\'ve been grinding. Today is about staying sharp without burning out.',
      xpReward: 25,
    };
  }

  // Fatigue check
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const lastSession = sorted[0];
  if (lastSession?.bodyCheck) {
    const { energy, soreness } = lastSession.bodyCheck;
    if ((energy && Number(energy) <= 2) || (soreness && Number(soreness) >= 4)) {
      const { timeline, totalDuration } = buildTimeline(RECOVERY_DRILLS);
      return {
        type: 'recovery',
        focus: 'Active Recovery',
        drills: RECOVERY_DRILLS,
        timeline,
        totalDuration,
        targetDuration: totalDuration,
        motivation: 'Your body needs a lighter session today. Quality over quantity.',
        xpReward: 25,
      };
    }
  }

  // IDP boost — find areas to prioritize
  const idpBoostCategories = getIdpBoostArea(idpGoals);

  // Gap-based plan with IDP boost
  const gaps = analyzeGaps(sessions);
  if (gaps.length > 0) {
    const topGap = gaps[0];
    const drills = topGap.miniSession.drills.slice(0, 3);

    // IDP boost: add a drill from the IDP focus area (+30% weight)
    if (idpBoostCategories && drills.length < 5) {
      for (const cat of idpBoostCategories) {
        const idpDrills = (CATEGORY_DRILLS[cat] || []).filter(d => !drills.includes(d));
        if (idpDrills.length > 0) {
          drills.push(idpDrills[Math.floor(Math.random() * idpDrills.length)]);
          break;
        }
      }
    }

    // Position weighting: fill remaining slots from position-relevant drills
    if (drills.length < 4) {
      const positionDrills = selectDrillsByPosition(position, 2, drills, identity);
      for (const d of positionDrills) {
        if (drills.length < 4 && !drills.includes(d)) drills.push(d);
      }
    }

    const { timeline, totalDuration } = buildTimeline(drills);

    return {
      type: 'gap',
      focus: topGap.miniSession.title,
      drills,
      timeline,
      totalDuration,
      targetDuration: totalDuration,
      motivation: topGap.miniSession.instruction || pickMotivation(identity),
      xpReward: 50,
      gapArea: topGap.area,
      gapUrgency: topGap.urgency,
    };
  }

  // Position-based plan (no gaps detected)
  const drills = selectDrillsByPosition(position, 4, [], identity);

  // IDP boost: swap one drill for IDP-relevant drill
  if (idpBoostCategories && drills.length >= 3) {
    for (const cat of idpBoostCategories) {
      const idpDrills = (CATEGORY_DRILLS[cat] || []).filter(d => !drills.includes(d));
      if (idpDrills.length > 0) {
        drills[drills.length - 1] = idpDrills[Math.floor(Math.random() * idpDrills.length)];
        break;
      }
    }
  }

  // Pillar-based fallback (if no position drills selected)
  if (drills.length < 3) {
    const pillars = computeFourPillars(sessions);
    if (pillars) {
      const weakest = pillars.reduce((min, p) => p.score < min.score ? p : min, pillars[0]);
      const pillarKey = weakest.label.toLowerCase();
      const extra = (PILLAR_DRILLS[pillarKey] || PILLAR_DRILLS.technique).filter(d => !drills.includes(d));
      while (drills.length < 4 && extra.length > 0) drills.push(extra.shift());
    }
  }

  if (drills.length >= 2) {
    const { timeline, totalDuration } = buildTimeline(drills);

    return {
      type: 'position',
      focus: `${position} Training`,
      drills,
      timeline,
      totalDuration,
      targetDuration: totalDuration,
      motivation: pickMotivation(identity),
      xpReward: 50,
    };
  }

  // General fallback
  const fallbackDrills = selectDrillsByPosition(position, 4, [], identity);
  if (fallbackDrills.length < 4) fallbackDrills.push('Finishing Drill', 'Wall Passes (1-touch)', 'Sprint Intervals', 'Dribbling Circuit');
  const finalDrills = [...new Set(fallbackDrills)].slice(0, 4);
  const { timeline: fbTimeline, totalDuration: fbDuration } = buildTimeline(finalDrills);
  return {
    type: 'general',
    focus: 'Complete Training',
    drills: finalDrills,
    timeline: fbTimeline,
    totalDuration: fbDuration,
    targetDuration: fbDuration,
    motivation: pickMotivation(identity),
    xpReward: 50,
  };
}
