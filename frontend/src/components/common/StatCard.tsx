interface Props {
  label: string;
  value: string | number;
  unit: string;
  icon?: string;
}

export default function StatCard({ label, value, unit, icon }: Props) {
  return (
    <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg bg-paper-100 px-5 py-4 text-center shadow-card">
      {icon && (
        <div aria-hidden className="mb-1.5 text-[18px] leading-none opacity-80">
          {icon}
        </div>
      )}
      <div className="font-serif text-[28px] font-semibold leading-tight text-ink-900 tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 flex items-baseline justify-center gap-1 text-[11px] text-ink-500">
        {label}
        <span className="text-[10px] text-ink-400">({unit})</span>
      </div>
    </div>
  );
}
