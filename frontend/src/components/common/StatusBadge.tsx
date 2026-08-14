interface Props {
  text: string;
  color?: string;
  active?: boolean;
}

/** 旧调用方传入 legacy 十六进制色，此处映射到纸墨语义令牌 */
const SEMANTIC: Record<string, string> = {
  '#4caf50': 'border-jade-600/30 bg-jade-600/10 text-jade-600',
  '#ff9800': 'border-gold-600/30 bg-gold-600/10 text-gold-600',
  '#4a6a8a': 'border-ink-400/30 bg-ink-400/10 text-ink-500',
};

export default function StatusBadge({ text, color, active }: Props) {
  if (active === false) {
    return (
      <span className="inline-block rounded-full border border-paper-300 bg-paper-200/60 px-2.5 py-0.5 text-[10px] leading-5 text-ink-400 opacity-70">
        {text}
      </span>
    );
  }

  const tone = (color && SEMANTIC[color]) || SEMANTIC['#4a6a8a'];
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] leading-5 ${tone}`}>
      {text}
    </span>
  );
}
