import { Card } from './ui/Card';
import { NumInput, TagSelector, ShotZoneGrid } from './ui/FormInputs';

// Shot-context taxonomies used by the shooting card. Kept co-located with the
// only consumer so the picker and the drill's data model live together.
export const SHOT_TYPES = [
  { id: 'open-play', label: 'Open Play' },
  { id: 'set-piece', label: 'Set Piece' },
  { id: 'counter', label: 'Counter' },
  { id: '1v1', label: '1v1' },
];

export const SHOT_APPROACHES = [
  { id: 'right-foot', label: 'Right Foot' },
  { id: 'left-foot', label: 'Left Foot' },
  { id: 'header', label: 'Header' },
  { id: 'volley', label: 'Volley' },
  { id: 'first-time', label: 'First Time' },
];

export const PRESSURE_SIMS = [
  { id: 'none', label: 'None' },
  { id: 'passive', label: 'Passive' },
  { id: 'active', label: 'Active' },
  { id: 'match-like', label: 'Match-like' },
];

/**
 * ShootingStatsCard — shots/goals plus optional foot breakdown and contextual
 * shot-group details (zone × type × approach × pressure).
 *
 * Form shape expected:
 *   form.shooting.{shotsTaken, goals}
 *   form.shooting.leftFoot.{shots, goals}
 *   form.shooting.rightFoot.{shots, goals}
 *   form.shooting.shotDetails: Array<{zone, type, approach, pressure, shots, goals}>
 *
 * The parent owns all state: pass an `update(path, value)` helper that mutates
 * the form by dot-path, and controlled `showFootBreakdown` / `showShotDetails`
 * toggles so the reveal state persists across renders.
 */
export function ShootingStatsCard({
  form,
  update,
  showFootBreakdown,
  setShowFootBreakdown,
  showShotDetails,
  setShowShotDetails,
}) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Shooting Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="Shots Taken" value={form.shooting.shotsTaken} onChange={v => update('shooting.shotsTaken', v)} />
        <NumInput label="Goals Scored" value={form.shooting.goals} onChange={v => update('shooting.goals', v)} />
      </div>
      {form.shooting.shotsTaken > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Shot %: {form.shooting.goals && form.shooting.shotsTaken
            ? `${Math.round((Number(form.shooting.goals) / Number(form.shooting.shotsTaken)) * 100)}%`
            : '\u2014'}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <button
          type="button"
          onClick={() => setShowFootBreakdown(!showFootBreakdown)}
          className="text-xs text-accent hover:underline"
        >
          {showFootBreakdown ? 'Hide' : 'Show'} foot breakdown
        </button>
        <button
          type="button"
          onClick={() => setShowShotDetails(!showShotDetails)}
          className="text-xs text-accent hover:underline"
        >
          {showShotDetails ? 'Hide' : 'Show'} shot context details
        </button>
      </div>
      {showFootBreakdown && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Left Foot</p>
            <div className="grid grid-cols-2 gap-4">
              <NumInput label="Shots" value={form.shooting.leftFoot.shots} onChange={v => update('shooting.leftFoot.shots', v)} />
              <NumInput label="Goals" value={form.shooting.leftFoot.goals} onChange={v => update('shooting.leftFoot.goals', v)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Right Foot</p>
            <div className="grid grid-cols-2 gap-4">
              <NumInput label="Shots" value={form.shooting.rightFoot.shots} onChange={v => update('shooting.rightFoot.shots', v)} />
              <NumInput label="Goals" value={form.shooting.rightFoot.goals} onChange={v => update('shooting.rightFoot.goals', v)} />
            </div>
          </div>
        </div>
      )}
      {showShotDetails && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">Add shot groups with context tags (zone, type, approach, pressure)</p>
          {form.shooting.shotDetails.map((detail, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Group {idx + 1}</span>
                <button type="button" onClick={() => {
                  const next = [...form.shooting.shotDetails];
                  next.splice(idx, 1);
                  update('shooting.shotDetails', next);
                }} className="text-xs text-red-400 hover:underline">Remove</button>
              </div>
              <ShotZoneGrid value={detail.zone} onChange={v => {
                const next = [...form.shooting.shotDetails];
                next[idx] = { ...next[idx], zone: v };
                update('shooting.shotDetails', next);
              }} />
              <TagSelector label="Shot Type" options={SHOT_TYPES} value={detail.type} onChange={v => {
                const next = [...form.shooting.shotDetails];
                next[idx] = { ...next[idx], type: v };
                update('shooting.shotDetails', next);
              }} />
              <TagSelector label="Approach" options={SHOT_APPROACHES} value={detail.approach} onChange={v => {
                const next = [...form.shooting.shotDetails];
                next[idx] = { ...next[idx], approach: v };
                update('shooting.shotDetails', next);
              }} />
              <TagSelector label="Pressure" options={PRESSURE_SIMS} value={detail.pressure} onChange={v => {
                const next = [...form.shooting.shotDetails];
                next[idx] = { ...next[idx], pressure: v };
                update('shooting.shotDetails', next);
              }} />
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Shots" value={detail.shots} onChange={v => {
                  const next = [...form.shooting.shotDetails];
                  next[idx] = { ...next[idx], shots: v };
                  update('shooting.shotDetails', next);
                }} />
                <NumInput label="Goals" value={detail.goals} onChange={v => {
                  const next = [...form.shooting.shotDetails];
                  next[idx] = { ...next[idx], goals: v };
                  update('shooting.shotDetails', next);
                }} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => {
            update('shooting.shotDetails', [...form.shooting.shotDetails, { zone: '', type: '', approach: '', pressure: '', shots: '', goals: '' }]);
          }} className="text-xs text-accent hover:underline">+ Add Shot Group</button>
        </div>
      )}
    </Card>
  );
}

/**
 * PassingStatsCard — attempts, completed, key passes + derived completion %.
 */
export function PassingStatsCard({ form, update }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Passing Stats</h3>
      <div className="grid grid-cols-3 gap-4">
        <NumInput label="Attempts" value={form.passing.attempts} onChange={v => update('passing.attempts', v)} />
        <NumInput label="Completed" value={form.passing.completed} onChange={v => update('passing.completed', v)} />
        <NumInput label="Key Passes" value={form.passing.keyPasses} onChange={v => update('passing.keyPasses', v)} />
      </div>
      {form.passing.attempts > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Completion %: {form.passing.completed && form.passing.attempts
            ? `${Math.round((Number(form.passing.completed) / Number(form.passing.attempts)) * 100)}%`
            : '\u2014'}
        </p>
      )}
    </Card>
  );
}

/**
 * FitnessStatsCard — sprint count and distance covered. `distanceUnit` is
 * threaded in so the label matches the user's chosen unit (km/mi).
 */
export function FitnessStatsCard({ form, update, distanceUnit }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Fitness Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="Sprints Completed" value={form.fitness.sprints} onChange={v => update('fitness.sprints', v)} />
        <NumInput label={`Distance (${distanceUnit})`} value={form.fitness.distance} onChange={v => update('fitness.distance', v)} step="0.1" />
      </div>
    </Card>
  );
}
