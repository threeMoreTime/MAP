interface Props {
  icon?: string;
  title: string;
}

export default function SectionTitle({ icon, title }: Props) {
  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-paper-300 pb-2.5">
      {icon && <span aria-hidden className="text-[16px] leading-none opacity-80">{icon}</span>}
      <h2 className="font-serif text-lg font-semibold text-ink-900">{title}</h2>
    </div>
  );
}
