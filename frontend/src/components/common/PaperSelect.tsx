import type { SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

/** 纸墨风格下拉：去除系统默认外观，右侧 ▾ 指示 */
export default function PaperSelect({ children, className = '', ...rest }: Props) {
  return (
    <div className="relative inline-flex">
      <select
        {...rest}
        className={`h-9 cursor-pointer appearance-none rounded-sm border border-paper-300 bg-paper-50 pl-2.5 pr-7 text-[13px] text-ink-900 focus:border-vermilion-500 focus:outline-none ${className}`}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-400"
      >
        ▾
      </span>
    </div>
  );
}
