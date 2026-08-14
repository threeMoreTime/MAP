interface Props {
  icon?: string;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && (
        <div aria-hidden className="text-[32px] leading-none text-ink-300">
          {icon}
        </div>
      )}
      <div className="font-serif text-[15px] font-semibold text-ink-700">{title}</div>
      {description && <div className="max-w-[42ch] text-[13px] leading-relaxed text-ink-500">{description}</div>}
    </div>
  );
}
