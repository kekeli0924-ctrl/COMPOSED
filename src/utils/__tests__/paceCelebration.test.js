import { describe, it, expect } from 'vitest';
import { getPaceCelebrationState } from '../paceCelebration';

const makePace = (velocityPct, label) => ({
  overall: { velocityPct, label },
  metrics: {},
  recommendation: null,
  position: null,
});

describe('getPaceCelebrationState', () => {
  it('State A positive: label changed upward', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(1.5, 'steady'),
      postPace: makePace(4.2, 'accelerating'),
      identityLabel: 'Scorer',
      sessionsThisWeek: 4,
    });
    expect(r.kind).toBe('A');
    expect(r.headline).toContain('STEADY to ACCELERATING');
    expect(r.headline).toContain("Scorer's Pace");
    expect(r.showSeeWhy).toBe(true);
  });

  it('State A negative: label changed downward — supportive tone', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(3.0, 'accelerating'),
      postPace: makePace(-1.5, 'steady'),
      identityLabel: 'Engine',
      sessionsThisWeek: 3,
    });
    expect(r.kind).toBe('A');
    expect(r.headline).toContain('ACCELERATING to STEADY');
    expect(r.headline).toContain('trends recover');
    expect(r.showSeeWhy).toBe(true);
  });

  it('State B: moved within same label', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(2.1, 'accelerating'),
      postPace: makePace(4.4, 'accelerating'),
      identityLabel: 'Scorer',
      sessionsThisWeek: 5,
    });
    expect(r.kind).toBe('B');
    expect(r.headline).toContain('ACCELERATING');
    expect(r.headline).toContain('up from');
    expect(r.showSeeWhy).toBe(true);
  });

  it('State C: flat, short of weekly goal', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(1.0, 'steady'),
      postPace: makePace(1.2, 'steady'),
      identityLabel: 'Playmaker',
      sessionsThisWeek: 2,
      weeklyGoal: 4,
    });
    expect(r.kind).toBe('C');
    expect(r.headline).toContain('2 more sessions');
    expect(r.showSeeWhy).toBe(true);
  });

  it('State C: flat, already at goal → steady encouragement', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(0.5, 'steady'),
      postPace: makePace(0.8, 'steady'),
      identityLabel: null,
      sessionsThisWeek: 4,
      weeklyGoal: 4,
    });
    expect(r.kind).toBe('C');
    expect(r.headline).toContain('held STEADY');
    expect(r.headline).toContain('trends build over weeks');
    expect(r.showSeeWhy).toBe(true);
  });

  it('State C: first session this week after gap', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(-3.0, 'stalling'),
      postPace: makePace(-2.8, 'stalling'),
      identityLabel: 'Rock',
      sessionsThisWeek: 1,
      isFirstSessionEver: false,
    });
    expect(r.kind).toBe('C');
    expect(r.headline).toContain('First session this week');
    expect(r.showSeeWhy).toBe(true);
  });

  it('State D: first session ever', () => {
    const r = getPaceCelebrationState({
      prePace: null,
      postPace: null,
      identityLabel: 'Scorer',
      isFirstSessionEver: true,
    });
    expect(r.kind).toBe('D');
    expect(r.headline).toContain('First session logged');
    expect(r.showSeeWhy).toBe(false);
  });

  it('State D: postPace exists but no velocityPct yet', () => {
    const r = getPaceCelebrationState({
      prePace: null,
      postPace: { overall: { velocityPct: null, label: 'steady' }, metrics: {} },
      identityLabel: null,
    });
    expect(r.kind).toBe('D');
    expect(r.showSeeWhy).toBe(false);
  });

  it('No identity label → neutral prefix', () => {
    const r = getPaceCelebrationState({
      prePace: makePace(1.0, 'steady'),
      postPace: makePace(5.0, 'accelerating'),
      identityLabel: null,
      sessionsThisWeek: 3,
    });
    expect(r.kind).toBe('A');
    expect(r.headline).toContain('Your Pace just moved');
    expect(r.headline).not.toContain("'s Pace");
  });
});
