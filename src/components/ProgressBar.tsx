interface Props {
  label: string;
  value: number;
  max: number;
  unit?: string;
}

export default function ProgressBar({ label, value, max, unit = '' }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max;
  return (
    <div className="progress">
      <div className="progress-head">
        <span>{label}</span>
        <span className={over ? 'text-warn' : 'muted'}>
          {Math.round(value)} / {max}
          {unit}
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
