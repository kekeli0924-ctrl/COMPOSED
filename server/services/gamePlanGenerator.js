/**
 * Game Plan Generator — Cross-references opponent scouting report with player's own data.
 * Produces a personalized pre-match brief + warm-up session from the drill library.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '../logger.js';

// ── Rules-Based Cross-Reference ──────────────────

/**
 * Parse scouting report markdown and extract key sections.
 */
function parseReportSections(reportContent) {
  if (!reportContent) return {};
  const sections = {};
  let currentSection = null;
  let currentContent = [];

  for (const line of reportContent.split('\n')) {
    const headerMatch = line.match(/^##\s+\d*\.?\s*(.*)/);
    if (headerMatch) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = headerMatch[1].trim().toLowerCase();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
  return sections;
}

/**
 * Detect opponent characteristics from report text.
 */
function detectOpponentStyle(sections) {
  const text = Object.values(sections).join(' ').toLowerCase();
  return {
    highPress: /high press|pressing|press high|intense press/i.test(text),
    possessionBased: /possession|keep the ball|build.up|patient/i.test(text),
    directPlay: /direct|long ball|counter.attack|fast break|transition/i.test(text),
    strongSetPieces: /set piece|corner|free kick|dangerous.*dead ball/i.test(text),
    weakAerially: /weak.*aerial|struggle.*header|poor.*air|vulnerability.*height/i.test(text),
    weakLeftSide: /weak.*left|vulnerable.*left|exposed.*left/i.test(text),
    weakRightSide: /weak.*right|vulnerable.*right|exposed.*right/i.test(text),
    physicalTeam: /physical|strong|aggressive|tough/i.test(text),
  };
}

/**
 * Compute rules-based cross-reference between opponent and player data.
 * Returns tactical flags and drill suggestions.
 */
export function computeRulesBasedBrief(reportContent, playerStats) {
  const sections = parseReportSections(reportContent);
  const opponent = detectOpponentStyle(sections);
  const tips = [];
  const drillNeeds = []; // Categories to search for warm-up drills

  // Cross-reference: opponent style vs player weaknesses
  if (opponent.highPress && playerStats.passAccuracy < 75) {
    tips.push({
      priority: 'high',
      text: `They press high and your passing accuracy is ${playerStats.passAccuracy}%. Focus on quick-release passing and composure under pressure.`,
    });
    drillNeeds.push('passing');
  }

  if (opponent.highPress && playerStats.passAccuracy >= 75) {
    tips.push({
      priority: 'medium',
      text: `They press high but your passing is strong at ${playerStats.passAccuracy}%. Use this to play through their press — look for through balls behind their line.`,
    });
  }

  if (opponent.weakAerially) {
    tips.push({
      priority: 'medium',
      text: 'They struggle aerially. Attack with crosses and set pieces — get the ball into the box from wide areas.',
    });
    drillNeeds.push('crossing');
  }

  if (opponent.strongSetPieces) {
    tips.push({
      priority: 'high',
      text: 'They\'re dangerous from set pieces. Stay disciplined on corners and free kicks — don\'t give away cheap fouls near your box.',
    });
  }

  if (playerStats.weakFootRatio < 30) {
    tips.push({
      priority: 'medium',
      text: `Your weak foot usage is only ${playerStats.weakFootRatio}%. The opponent may force you onto it — practice both feet in warm-up.`,
    });
    drillNeeds.push('shooting');
  }

  if (playerStats.shotAccuracy < 60) {
    tips.push({
      priority: 'medium',
      text: `Your shot accuracy is ${playerStats.shotAccuracy}%. Take 5-10 focused finishing reps in warm-up to sharpen before the match.`,
    });
    drillNeeds.push('shooting');
  }

  if (playerStats.avgRPE > 7.5) {
    tips.push({
      priority: 'low',
      text: `Your recent training intensity is high (RPE ${playerStats.avgRPE.toFixed(1)}). Manage your energy — don't go all-out in the first 20 minutes.`,
    });
  }

  if (opponent.directPlay) {
    tips.push({
      priority: 'medium',
      text: 'They play direct and counter quickly. Stay compact when you have the ball and be ready to defend transitions.',
    });
  }

  if (opponent.weakLeftSide || opponent.weakRightSide) {
    const side = opponent.weakLeftSide ? 'left' : 'right';
    tips.push({
      priority: 'high',
      text: `Their ${side} side is vulnerable. Overload that flank and look to create from the ${side} channel.`,
    });
  }

  // Default tip if none generated
  if (tips.length === 0) {
    tips.push({
      priority: 'medium',
      text: 'Focus on your strengths and stick to your game plan. Stay composed and let your training show.',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    tips: tips.slice(0, 5),
    drillNeeds: [...new Set(drillNeeds)],
    opponent,
    playerStats,
  };
}

// ── Warm-Up Session Builder ──────────────────

/**
 * Build a 15-20 min warm-up session from the drill library.
 * Returns a plan object compatible with DailyPlanCard/LiveSessionMode.
 */
export function buildWarmupSession(crossReference, drills, opponentName) {
  const { drillNeeds } = crossReference;
  const timeline = [];
  let elapsed = 0;

  // Always start with dynamic warm-up
  timeline.push({
    name: 'Dynamic Warm-Up',
    reps: '5 min',
    duration: 5,
    instruction: 'Light jog, high knees, butt kicks, leg swings, arm circles. Build up to match pace.',
    startMin: elapsed,
    isWarmup: true,
  });
  elapsed += 5;

  // Pick 2-3 drills based on tactical needs
  const selectedDrills = [];
  const categories = drillNeeds.length > 0 ? drillNeeds : ['passing', 'shooting'];

  for (const cat of categories) {
    const matching = drills.filter(d => {
      const sub = (d.subcategory || d.category || '').toLowerCase();
      return sub.includes(cat) || d.name.toLowerCase().includes(cat);
    });
    if (matching.length > 0 && selectedDrills.length < 3) {
      // Pick a drill that's short (≤10 min)
      const short = matching.filter(d => (d.durationMinutes || d.duration_minutes || 10) <= 10);
      const pick = short.length > 0 ? short[Math.floor(Math.random() * short.length)] : matching[0];
      if (!selectedDrills.find(d => d.name === pick.name)) {
        selectedDrills.push(pick);
      }
    }
  }

  // If we still need more drills, add generic ones
  if (selectedDrills.length < 2) {
    const generic = drills.filter(d =>
      (d.difficulty === 'beginner' || d.difficulty === 'intermediate') &&
      (d.durationMinutes || d.duration_minutes || 10) <= 10 &&
      !selectedDrills.find(s => s.name === d.name)
    );
    while (selectedDrills.length < 2 && generic.length > 0) {
      selectedDrills.push(generic.splice(Math.floor(Math.random() * generic.length), 1)[0]);
    }
  }

  // Add selected drills to timeline
  for (const drill of selectedDrills) {
    const dur = Math.min(drill.durationMinutes || drill.duration_minutes || 8, 8);
    timeline.push({
      name: drill.name,
      reps: drill.repsDescription || drill.reps_description || `${dur} min`,
      duration: dur,
      instruction: drill.description || '',
      startMin: elapsed,
    });
    elapsed += dur;
  }

  // Cool-down
  timeline.push({
    name: 'Match Prep Cool-Down',
    reps: '3 min',
    duration: 3,
    instruction: 'Light stretches, deep breaths. Visualize your first touch, first pass, first shot.',
    startMin: elapsed,
    isCooldown: true,
  });
  elapsed += 3;

  return {
    type: 'game-plan-warmup',
    focus: `Pre-Match: vs ${opponentName}`,
    drills: selectedDrills.map(d => d.name),
    timeline,
    totalDuration: elapsed,
    targetDuration: elapsed,
    motivation: 'You\'ve prepared. Now go show it.',
    xpReward: 50,
  };
}

// ── AI-Enhanced Game Plan (Gemini) ──────────────────

const GAME_PLAN_PROMPT = `You are a youth soccer tactical analyst. Given an opponent scouting report and a player's recent performance data, generate a concise, actionable pre-match brief.

OPPONENT SCOUTING REPORT:
{{reportContent}}

PLAYER'S RECENT STATS (last 10 sessions):
- Shot accuracy: {{shotAccuracy}}%
- Pass accuracy: {{passAccuracy}}%
- Weak foot ratio: {{weakFootRatio}}% of shots with weaker foot
- Average RPE: {{avgRPE}}/10
- Sessions this week: {{sessionsThisWeek}}

RULES-BASED FLAGS:
{{flags}}

Generate a brief with:
1. A 2-sentence summary of how this player should approach the match
2. 3-5 specific tactical tips that reference BOTH the opponent's tendencies AND the player's own data
3. One key thing to watch out for

Keep it concise, direct, and actionable. Write for a youth player (ages 12-18). No generic advice — every tip must reference specific data.

Return ONLY the brief as clean text (no JSON, no markdown headers).`;

export async function generateAIGamePlan(reportContent, playerStats, crossReference) {
  if (!process.env.GEMINI_API_KEY) return null;

  const flags = crossReference.tips.map(t => `[${t.priority}] ${t.text}`).join('\n');

  let prompt = GAME_PLAN_PROMPT;
  prompt = prompt.replace('{{reportContent}}', (reportContent || '').slice(0, 3000));
  prompt = prompt.replace('{{shotAccuracy}}', playerStats.shotAccuracy ?? '—');
  prompt = prompt.replace('{{passAccuracy}}', playerStats.passAccuracy ?? '—');
  prompt = prompt.replace('{{weakFootRatio}}', playerStats.weakFootRatio ?? '—');
  prompt = prompt.replace('{{avgRPE}}', playerStats.avgRPE?.toFixed(1) ?? '—');
  prompt = prompt.replace('{{sessionsThisWeek}}', playerStats.sessionsThisWeek ?? '—');
  prompt = prompt.replace('{{flags}}', flags);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let response = null;

    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        break;
      } catch (err) {
        if (String(err).includes('RESOURCE_EXHAUSTED') || String(err).includes('429')) continue;
        throw err;
      }
    }

    if (!response) return null;
    return response.text?.trim() || null;
  } catch (err) {
    logger.error('Game plan AI generation failed', { error: err.message });
    return null;
  }
}
