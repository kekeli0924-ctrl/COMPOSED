import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getToken } from '../../hooks/useApi';

const AGE_GROUPS = ['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
const LEVELS = ['MLS Next', 'ECNL', 'ECNL Regional', 'NAL', 'GA', 'State League', 'Club', 'Other'];
const GENDERS = ['Boys', 'Girls'];

export function ScoutingRequestForm({ onSubmitSuccess, onBack }) {
  const [clubName, setClubName] = useState('');
  const [level, setLevel] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clubName.trim()) { setError('Club name is required'); return; }
    if (!level) { setError('Level is required'); return; }
    if (!ageGroup) { setError('Age group is required'); return; }
    if (!gender) { setError('Gender is required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/scouting/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          clubName: clubName.trim(), level, ageGroup, gender,
          location: location.trim() || undefined,
          matchDate: matchDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create report'); setLoading(false); return; }
      onSubmitSuccess?.(data);
    } catch {
      setError('Connection failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Plan
        </button>
      )}

      <h2 className="text-xl font-bold text-gray-900">Scout an Opponent</h2>
      <p className="text-xs text-gray-400">AI will research this team and generate a detailed scouting dossier. Takes approximately 20 minutes.</p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Club Name *</label>
            <input type="text" value={clubName} onChange={e => setClubName(e.target.value)} placeholder="e.g. FC Connecticut"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Level *</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Select...</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Age Group *</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Select...</option>
                {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gender *</label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Select...</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Match Date</label>
              <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location / Region</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Connecticut, USA (helps find the right team)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'Submitting...' : 'Generate Scouting Report'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
