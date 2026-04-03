/**
 * SVG-based drill diagrams showing setup, movement, and ball path.
 * Uses simple shapes: cones (triangles), player (circle), ball (filled circle),
 * arrows (lines with arrowheads), goals (rectangles), walls (thick lines).
 */

// Reusable SVG elements
function Cone({ x, y, color = '#F59E0B' }) {
  return <polygon points={`${x},${y - 6} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill={color} opacity="0.8" />;
}

function Player({ x, y, label }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill="#1E3A5F" />
      <text x={x} y={y + 3} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{label || 'P'}</text>
    </g>
  );
}

function Ball({ x, y }) {
  return <circle cx={x} cy={y} r="4" fill="white" stroke="#333" strokeWidth="1" />;
}

function Arrow({ x1, y1, x2, y2, color = '#1E3A5F', dashed = false }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 6;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5"
        strokeDasharray={dashed ? '4,3' : 'none'} markerEnd="none" />
      <polygon
        points={`${x2},${y2} ${x2 - headLen * Math.cos(angle - 0.4)},${y2 - headLen * Math.sin(angle - 0.4)} ${x2 - headLen * Math.cos(angle + 0.4)},${y2 - headLen * Math.sin(angle + 0.4)}`}
        fill={color}
      />
    </g>
  );
}

function Goal({ x, y, w = 50, h = 8 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#666" strokeWidth="2" rx="1" />
      <line x1={x + 5} y1={y} x2={x + 5} y2={y + h} stroke="#ccc" strokeWidth="0.5" />
      <line x1={x + 15} y1={y} x2={x + 15} y2={y + h} stroke="#ccc" strokeWidth="0.5" />
      <line x1={x + 25} y1={y} x2={x + 25} y2={y + h} stroke="#ccc" strokeWidth="0.5" />
      <line x1={x + 35} y1={y} x2={x + 35} y2={y + h} stroke="#ccc" strokeWidth="0.5" />
      <line x1={x + 45} y1={y} x2={x + 45} y2={y + h} stroke="#ccc" strokeWidth="0.5" />
    </g>
  );
}

function Wall({ x, y, w = 60 }) {
  return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#8B7355" strokeWidth="4" strokeLinecap="round" />;
}

function FieldBg() {
  return <rect x="0" y="0" width="200" height="140" rx="8" fill="#2D5016" opacity="0.15" />;
}

function Label({ x, y, text, color = '#666' }) {
  return <text x={x} y={y} textAnchor="middle" fontSize="7" fill={color}>{text}</text>;
}

// Diagram templates by subcategory/drill type
const DIAGRAMS = {
  // Shooting drills — player facing goal
  shooting: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Goal x={75} y={8} />
      <Player x={100} y={100} />
      <Ball x={100} y={90} />
      <Arrow x1={100} y1={88} x2={100} y2={20} color="#E11D48" />
      <Arrow x1={100} y1={88} x2={80} y2={20} color="#E11D48" dashed />
      <Arrow x1={100} y1={88} x2={120} y2={20} color="#E11D48" dashed />
      <Label x={100} y={135} text="Shooting at goal" />
    </svg>
  ),

  // Passing / wall passes
  passing: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Wall x={70} y={15} />
      <Player x={100} y={100} />
      <Ball x={100} y={90} />
      <Arrow x1={100} y1={88} x2={100} y2={22} color="#1E3A5F" />
      <Arrow x1={100} y1={22} x2={100} y2={82} color="#3B82F6" dashed />
      <Label x={100} y={10} text="Wall / Rebounder" />
      <Label x={100} y={135} text="Pass and receive" />
    </svg>
  ),

  // Dribbling — weave through cones
  dribbling: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Cone x={60} y={30} />
      <Cone x={100} y={30} />
      <Cone x={140} y={30} />
      <Cone x={60} y={60} />
      <Cone x={100} y={60} />
      <Cone x={140} y={60} />
      <Player x={30} y={90} />
      <Ball x={38} y={88} />
      {/* Weave path */}
      <path d="M 38 88 Q 60 70 60 60 Q 60 45 80 40 Q 100 35 100 50 Q 100 65 120 60 Q 140 55 140 40 Q 140 25 170 30"
        fill="none" stroke="#1E3A5F" strokeWidth="1.5" strokeDasharray="4,2" />
      <Arrow x1={160} y1={32} x2={170} y2={30} color="#1E3A5F" />
      <Label x={100} y={135} text="Weave through cones" />
    </svg>
  ),

  // Speed / sprint
  speed: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Cone x={30} y={70} />
      <Cone x={170} y={70} />
      <Player x={40} y={70} />
      <Arrow x1={50} y1={70} x2={160} y2={70} color="#E11D48" />
      <Label x={30} y={85} text="Start" />
      <Label x={170} y={85} text="Finish" />
      {/* Distance markers */}
      <line x1={70} y1={65} x2={70} y2={75} stroke="#999" strokeWidth="0.5" />
      <line x1={100} y1={65} x2={100} y2={75} stroke="#999" strokeWidth="0.5" />
      <line x1={130} y1={65} x2={130} y2={75} stroke="#999" strokeWidth="0.5" />
      <Label x={70} y={62} text="10m" color="#999" />
      <Label x={100} y={62} text="20m" color="#999" />
      <Label x={130} y={62} text="30m" color="#999" />
      <Label x={100} y={135} text="Sprint intervals" />
    </svg>
  ),

  // Agility — T-drill / ladder
  agility: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      {/* T shape */}
      <Cone x={100} y={110} />
      <Cone x={100} y={70} />
      <Cone x={50} y={40} />
      <Cone x={150} y={40} />
      {/* Path */}
      <Arrow x1={100} y1={105} x2={100} y2={75} color="#1E3A5F" />
      <Arrow x1={100} y1={72} x2={55} y2={44} color="#3B82F6" />
      <Arrow x1={55} y1={42} x2={145} y2={42} color="#E11D48" />
      <Arrow x1={145} y1={44} x2={100} y2={72} color="#3B82F6" dashed />
      <Player x={100} y={120} />
      <Label x={100} y={135} text="Agility drill" />
    </svg>
  ),

  // Crossing — wide to center
  crossing: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Goal x={75} y={8} />
      <Player x={30} y={90} label="P" />
      <Ball x={38} y={88} />
      {/* Run wide */}
      <Arrow x1={38} y1={85} x2={25} y2={40} color="#1E3A5F" />
      {/* Cross */}
      <Arrow x1={25} y1={38} x2={100} y2={25} color="#E11D48" dashed />
      {/* Target zone */}
      <rect x={80} y={20} width={40} height={20} fill="#E11D48" opacity="0.15" rx="2" />
      <Label x={100} y={33} text="Target" color="#E11D48" />
      <Label x={100} y={135} text="Cross into target zone" />
    </svg>
  ),

  // Free kicks
  freekick: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Goal x={75} y={8} />
      <Player x={100} y={100} />
      <Ball x={100} y={88} />
      {/* Wall */}
      <circle cx={85} cy={55} r="5" fill="#999" />
      <circle cx={95} cy={55} r="5" fill="#999" />
      <circle cx={105} cy={55} r="5" fill="#999" />
      <circle cx={115} cy={55} r="5" fill="#999" />
      {/* Curved shot */}
      <path d="M 100 86 Q 130 50 110 18" fill="none" stroke="#E11D48" strokeWidth="1.5" strokeDasharray="4,2" />
      <Arrow x1={112} y1={22} x2={110} y2={18} color="#E11D48" />
      <Label x={100} y={135} text="Free kick over wall" />
    </svg>
  ),

  // Strength / bodyweight
  strength: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      {/* Circuit stations */}
      <rect x={30} y={25} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={45} y={38} text="Squats" />
      <rect x={85} y={25} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={100} y={38} text="Push-ups" />
      <rect x={140} y={25} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={155} y={38} text="Planks" />
      <rect x={30} y={75} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={45} y={88} text="Lunges" />
      <rect x={85} y={75} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={100} y={88} text="Burpees" />
      <rect x={140} y={75} width={30} height={20} rx="3" fill="#1E3A5F" opacity="0.2" />
      <Label x={155} y={88} text="Core" />
      {/* Arrows connecting */}
      <Arrow x1={62} y1={35} x2={83} y2={35} color="#C4956A" />
      <Arrow x1={117} y1={35} x2={138} y2={35} color="#C4956A" />
      <Arrow x1={155} y1={47} x2={155} y2={73} color="#C4956A" />
      <Arrow x1={138} y1={85} x2={117} y2={85} color="#C4956A" />
      <Arrow x1={83} y1={85} x2={62} y2={85} color="#C4956A" />
      <Label x={100} y={135} text="Circuit training" />
    </svg>
  ),

  // Tactical — movement patterns
  tactical: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Cone x={50} y={40} />
      <Cone x={100} y={30} />
      <Cone x={150} y={40} />
      <Cone x={75} y={80} />
      <Cone x={125} y={80} />
      <Player x={100} y={110} />
      {/* Diagonal runs */}
      <Arrow x1={100} y1={105} x2={55} y2={45} color="#1E3A5F" dashed />
      <Arrow x1={55} y1={45} x2={100} y2={35} color="#3B82F6" dashed />
      <Arrow x1={100} y1={35} x2={145} y2={45} color="#1E3A5F" dashed />
      <Label x={100} y={135} text="Movement patterns" />
    </svg>
  ),

  // Psychological — breathing/focus
  psychological: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Player x={100} y={70} />
      {/* Breathing circles */}
      <circle cx={100} cy={70} r="20" fill="none" stroke="#C4956A" strokeWidth="1" opacity="0.3" />
      <circle cx={100} cy={70} r="30" fill="none" stroke="#C4956A" strokeWidth="1" opacity="0.2" />
      <circle cx={100} cy={70} r="40" fill="none" stroke="#C4956A" strokeWidth="1" opacity="0.1" />
      <Label x={100} y={120} text="Breathe in... hold... out" color="#C4956A" />
      <Label x={100} y={135} text="Mental focus" />
    </svg>
  ),

  // Warm-up / cool-down
  warmup: () => (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      <FieldBg />
      <Player x={30} y={70} />
      {/* Jogging path */}
      <path d="M 40 70 Q 70 40 100 70 Q 130 100 160 70" fill="none" stroke="#1E3A5F" strokeWidth="1.5" strokeDasharray="4,3" />
      <Arrow x1={155} y1={72} x2={165} y2={68} color="#1E3A5F" />
      <Label x={100} y={30} text="Light jog" />
      {/* Stretch icons */}
      <circle cx={60} y={110} r="3" fill="#C4956A" />
      <circle cx={100} y={110} r="3" fill="#C4956A" />
      <circle cx={140} y={110} r="3" fill="#C4956A" />
      <Label x={60} y={125} text="Stretch" color="#C4956A" />
      <Label x={100} y={125} text="Stretch" color="#C4956A" />
      <Label x={140} y={125} text="Stretch" color="#C4956A" />
      <Label x={100} y={135} text="Dynamic warm-up" />
    </svg>
  ),
};

// Map drill subcategory/category to diagram type
function getDiagramType(drill) {
  const sub = (drill.subcategory || '').toLowerCase();
  const cat = (drill.category || '').toLowerCase();
  const name = (drill.name || '').toLowerCase();

  if (name.includes('free kick')) return 'freekick';
  if (name.includes('cross') || name.includes('delivery')) return 'crossing';
  if (sub.includes('shooting') || name.includes('finishing') || name.includes('volley') || name.includes('shooting')) return 'shooting';
  if (sub.includes('passing') || name.includes('pass') || name.includes('rondo')) return 'passing';
  if (sub.includes('dribbling') || name.includes('dribbl') || name.includes('mastery') || name.includes('juggl') || name.includes('touch') || name.includes('croqueta')) return 'dribbling';
  if (sub.includes('speed') || name.includes('sprint') || name.includes('acceleration') || name.includes('reaction')) return 'speed';
  if (sub.includes('agility') || name.includes('agility') || name.includes('ladder') || name.includes('t-drill') || name.includes('shuttle') || name.includes('deceleration') || name.includes('zig')) return 'agility';
  if (sub.includes('strength') || name.includes('bodyweight') || name.includes('core') || name.includes('plyo') || name.includes('resistance') || name.includes('yoga') || name.includes('stability')) return 'strength';
  if (cat.includes('tactical')) return 'tactical';
  if (cat.includes('psychological')) return 'psychological';
  if (cat.includes('warm') || cat.includes('cool') || name.includes('warm') || name.includes('cool') || name.includes('foam') || name.includes('stretch')) return 'warmup';

  return 'shooting'; // fallback
}

export function DrillDiagram({ drill }) {
  const type = getDiagramType(drill);
  const DiagramComponent = DIAGRAMS[type] || DIAGRAMS.shooting;

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="aspect-[10/7] max-h-40">
        <DiagramComponent />
      </div>
    </div>
  );
}
