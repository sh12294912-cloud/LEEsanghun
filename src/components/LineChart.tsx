import { formatKoreanDate } from '../lib/date';

export interface Series {
  label: string;
  color: string;
  points: { date: string; value: number }[]; // 날짜 오름차순
}

interface Props {
  series: Series[];
  unit?: string;
  height?: number;
}

const W = 320;
const PAD = { top: 10, right: 10, bottom: 22, left: 34 };

/** 의존성 없는 간단한 SVG 꺾은선 그래프 (날짜 기준 x축) */
export default function LineChart({ series, unit = '', height = 170 }: Props) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const dates = [...new Set(all.map((p) => p.date))].sort();
  const values = all.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1;
  min = Math.floor(min - pad);
  max = Math.ceil(max + pad);

  const iw = W - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const t = (d: string) => new Date(d).getTime();
  const t0 = t(dates[0]);
  const span = t(dates[dates.length - 1]) - t0;
  const x = (d: string) => PAD.left + (span ? ((t(d) - t0) / span) * iw : iw / 2);
  const y = (v: number) => PAD.top + ih - ((v - min) / (max - min)) * ih;
  const ticks = [min, (min + max) / 2, max];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${height}`} role="img">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.left - 6} y={y(v)} className="chart-label" textAnchor="end" dominantBaseline="middle">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={height - 4} className="chart-label">{formatKoreanDate(dates[0]).replace(/ \(.\)/, '')}</text>
        {dates.length > 1 && (
          <text x={W - PAD.right} y={height - 4} className="chart-label" textAnchor="end">
            {formatKoreanDate(dates[dates.length - 1]).replace(/ \(.\)/, '')}
          </text>
        )}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={s.points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.points.map((p) => (
              <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3} fill={s.color}>
                <title>{`${formatKoreanDate(p.date)} · ${s.label} ${p.value}${unit}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
