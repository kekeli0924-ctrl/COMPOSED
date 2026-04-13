const W = 400;
const H = 220;
const BG_START = '#FAFAF8';
const BG_END = '#FFFFFF';

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  return { canvas, ctx };
}

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, BG_START);
  grad.addColorStop(1, BG_END);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle border
  ctx.strokeStyle = '#E8E5E0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

function drawBranding(ctx) {
  ctx.fillStyle = 'rgba(28,25,23,0.2)';
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Composed', W - 16, H - 12);
}

export function renderWeeklySummaryCard({ totalSessions, totalTime, avgShotPct, avgPassPct, weeklyLoad }) {
  const { canvas, ctx } = createCanvas();
  drawBackground(ctx);

  // Title
  ctx.fillStyle = 'rgba(28,25,23,0.5)';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WEEKLY SUMMARY', 24, 32);

  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillText('This Week', 24, 60);

  // Stats grid
  const stats = [
    { label: 'Sessions', value: `${totalSessions}` },
    { label: 'Total Time', value: `${totalTime}m` },
    { label: 'Shot %', value: avgShotPct != null ? `${avgShotPct}%` : '\u2014' },
    { label: 'Pass %', value: avgPassPct != null ? `${avgPassPct}%` : '\u2014' },
  ];
  if (weeklyLoad) stats.push({ label: 'Load', value: `${weeklyLoad}` });

  const cols = stats.length;
  const colW = (W - 48) / cols;
  stats.forEach((s, i) => {
    const x = 24 + i * colW;
    ctx.fillStyle = 'rgba(28,25,23,0.4)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, x, 100);
    ctx.fillStyle = '#1E3A5F';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText(s.value, x, 128);
  });

  // Divider
  ctx.fillStyle = 'rgba(28,25,23,0.1)';
  ctx.fillRect(24, 148, W - 48, 1);

  // Footer
  ctx.fillStyle = 'rgba(28,25,23,0.35)';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  const now = new Date();
  ctx.fillText(`Week of ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 24, 175);

  drawBranding(ctx);
  return canvas;
}

export function renderPRAchievementCard(prName, prValue) {
  const { canvas, ctx } = createCanvas();
  drawBackground(ctx);

  // Title
  ctx.fillStyle = 'rgba(28,25,23,0.5)';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PERSONAL RECORD', W / 2, 50);

  // PR name
  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 18px Inter, system-ui, sans-serif';
  ctx.fillText(prName, W / 2, 80);

  // PR value
  ctx.fillStyle = '#1E3A5F';
  ctx.font = 'bold 52px Inter, system-ui, sans-serif';
  ctx.fillText(prValue, W / 2, 140);

  drawBranding(ctx);
  return canvas;
}

// ── Coach Report Card ─────────────────────────────────────────────────────
// A full one-page shareable summary generated from gatherCoachReportData().
// Taller than other share cards (variable height based on content).

const REPORT_W = 400;
const ACCENT = '#1E3A5F';
const PACE_C = { accelerating: '#16A34A', steady: '#D97706', stalling: '#DC2626' };

function createReportCanvas(height) {
  const c = document.createElement('canvas');
  c.width = REPORT_W * 2;
  c.height = height * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  return { canvas: c, ctx };
}

export function renderCoachReportCard(data) {
  // Pre-calculate height based on content
  const hasMetrics = data.topMetrics.length > 0;
  const hasGoals = data.activeGoals.length > 0;
  const hasWhy = !!data.whySentence;
  let h = 280; // header + pace headline + summary
  if (hasWhy) h += 50;
  if (hasMetrics) h += 28 + data.topMetrics.length * 22;
  if (hasGoals) h += 28 + data.activeGoals.length * 20;
  h += 40; // footer

  const { canvas, ctx } = createReportCanvas(h);

  // Background
  const grad = ctx.createLinearGradient(0, 0, REPORT_W, h);
  grad.addColorStop(0, '#FAFAF8');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, REPORT_W, h);
  ctx.strokeStyle = '#E8E5E0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, REPORT_W - 1, h - 1);

  let y = 28;
  const L = 24; // left margin
  const R = REPORT_W - 24; // right edge

  // ── Header ──────────────────────────────────────────────
  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(data.playerName, L, y);
  y += 16;

  ctx.fillStyle = 'rgba(28,25,23,0.5)';
  ctx.font = '11px Inter, system-ui, sans-serif';
  const meta = [data.position, ...data.identityLabels, data.ageGroup, data.skillLevel].filter(Boolean).join(' · ');
  ctx.fillText(meta, L, y);
  y += 12;

  // Date range
  const fromDate = new Date(data.dateRange.from + 'T12:00:00');
  const toDate = new Date(data.dateRange.to + 'T12:00:00');
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  ctx.fillStyle = 'rgba(28,25,23,0.35)';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText(`Last 4 weeks · ${fmtDate(fromDate)} – ${fmtDate(toDate)}`, L, y);
  y += 24;

  // ── Pace headline ───────────────────────────────────────
  if (data.pace.hasPace) {
    const color = PACE_C[data.pace.label] || PACE_C.steady;
    ctx.fillStyle = color;
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    const velStr = `${data.pace.velocityPct > 0 ? '+' : ''}${data.pace.velocityPct}%`;
    ctx.fillText(velStr, L, y);

    const velW = ctx.measureText(velStr).width;
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.fillText(data.pace.label.toUpperCase(), L + velW + 8, y);
    y += 16;

    ctx.fillStyle = 'rgba(28,25,23,0.45)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(`${data.pace.headlinePrefix}`, L, y);
    y += 20;
  } else {
    ctx.fillStyle = 'rgba(28,25,23,0.45)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('Pace will show trends after two weeks of training.', L, y);
    y += 24;
  }

  // ── Why sentence ────────────────────────────────────────
  if (hasWhy) {
    ctx.fillStyle = '#1C1917';
    ctx.font = '12px Inter, system-ui, sans-serif';
    // Wrap text
    const words = data.whySentence.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > R - L) {
        ctx.fillText(line, L, y);
        y += 16;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, L, y); y += 16; }
    y += 6;
  }

  // ── Divider ─────────────────────────────────────────────
  ctx.fillStyle = 'rgba(28,25,23,0.08)';
  ctx.fillRect(L, y, R - L, 1);
  y += 14;

  // ── 4-week summary ──────────────────────────────────────
  ctx.fillStyle = 'rgba(28,25,23,0.4)';
  ctx.font = 'bold 9px Inter, system-ui, sans-serif';
  ctx.fillText('4-WEEK SUMMARY', L, y);
  y += 16;

  // Week bars
  const maxCount = Math.max(...data.summary.weekCounts.map(w => w.count), 1);
  const barMaxW = 140;
  data.summary.weekCounts.forEach(w => {
    ctx.fillStyle = 'rgba(28,25,23,0.35)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(w.week, L, y);

    const barW = Math.max((w.count / maxCount) * barMaxW, 2);
    ctx.fillStyle = w.count > 0 ? ACCENT + '60' : 'rgba(28,25,23,0.08)';
    ctx.fillRect(L + 56, y - 8, barW, 10);

    ctx.fillStyle = '#1C1917';
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.fillText(`${w.count}`, L + 56 + barW + 6, y);
    y += 18;
  });
  y += 2;

  // Totals row
  ctx.fillStyle = 'rgba(28,25,23,0.45)';
  ctx.font = '10px Inter, system-ui, sans-serif';
  const totals = [`${data.summary.totalSessions} sessions`, `${data.summary.totalTime}m total`];
  if (data.summary.streak > 0) totals.push(`🔥 ${data.summary.streak}-day streak`);
  ctx.fillText(totals.join(' · '), L, y);
  y += 18;

  // ── Top metrics ─────────────────────────────────────────
  if (hasMetrics) {
    ctx.fillStyle = 'rgba(28,25,23,0.08)';
    ctx.fillRect(L, y, R - L, 1);
    y += 14;

    ctx.fillStyle = 'rgba(28,25,23,0.4)';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('METRICS THAT MOVED', L, y);
    y += 16;

    data.topMetrics.forEach(m => {
      ctx.fillStyle = '#1C1917';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.name, L, y);

      ctx.textAlign = 'right';
      const dirColor = m.direction === '↑' ? '#16A34A' : m.direction === '↓' ? '#DC2626' : '#D97706';
      ctx.fillStyle = dirColor;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText(`${m.lastWeek} → ${m.thisWeek} ${m.direction}`, R, y);
      y += 20;
    });
    y += 2;
  }

  // ── IDP Goals ───────────────────────────────────────────
  if (hasGoals) {
    ctx.fillStyle = 'rgba(28,25,23,0.08)';
    ctx.fillRect(L, y, R - L, 1);
    y += 14;

    ctx.fillStyle = 'rgba(28,25,23,0.4)';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ACTIVE GOALS', L, y);
    y += 16;

    data.activeGoals.forEach(g => {
      ctx.fillStyle = '#1C1917';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const label = g.corner ? `${g.corner.charAt(0).toUpperCase() + g.corner.slice(1)}: ` : '';
      const text = `${label}${g.text}`;
      // Truncate if too long
      const maxW = R - L;
      let display = text;
      while (ctx.measureText(display).width > maxW && display.length > 3) {
        display = display.slice(0, -4) + '…';
      }
      ctx.fillText(display, L, y);
      y += 18;
    });
    y += 2;
  }

  // ── Footer ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(28,25,23,0.08)';
  ctx.fillRect(L, y, R - L, 1);
  y += 14;

  ctx.fillStyle = 'rgba(28,25,23,0.25)';
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  const genDate = new Date(data.generatedAt);
  ctx.fillText(`Generated by Composed · ${genDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, L, y);

  return canvas;
}

export async function shareCanvas(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'composed.png', { type: 'image/png' })] })) {
        try {
          await navigator.share({ files: [new File([blob], 'composed.png', { type: 'image/png' })] });
          resolve(true);
          return;
        } catch { /* fallthrough */ }
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'composed.png';
      a.click();
      URL.revokeObjectURL(url);
      resolve(true);
    }, 'image/png');
  });
}
