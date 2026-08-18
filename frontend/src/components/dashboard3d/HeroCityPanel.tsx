import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CityDetailPanel from '../charts/CityDetailPanel';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity | null;
  /** 进入 / 退出过渡（退出时保留最后一个城市内容做淡出） */
  phase: 'enter' | 'exit';
  onClose: () => void;
}

/**
 * 城市详情预览面板：桌面右侧纸墨浮卡（lg ~340 / xl ~370）；<lg 全屏纸墨 overlay。
 * 底部「查看完整城市详情」CTA 经 React Router 进入 /city/:id，
 * 形成 Map → focus → preview → full detail 的产品路径。
 */
export default function HeroCityPanel({ city, phase, onClose }: Props) {
  const navigate = useNavigate();
  // 退出时冻结最后一个城市对象，避免淡出瞬间内容闪空（官方 render 期间校正 state 模式）
  const [shown, setShown] = useState(city);
  if (city && city !== shown) setShown(city);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, onClose]);

  if (!shown) return null;

  return (
    <div
      role="dialog"
      aria-label={`${shown.city_cn} 城市详情`}
      className={
        'absolute z-30 overflow-y-auto bg-paper-100 ' +
        (phase === 'enter'
          ? 'motion-safe:hero-panel-enter '
          : 'motion-safe:hero-panel-exit ') +
        // <lg：全屏纸墨 overlay；lg+：右侧浮卡
        'max-lg:inset-0 max-lg:max-h-none max-lg:rounded-none max-lg:p-5 max-lg:pt-14 ' +
        'lg:right-4 lg:top-1/2 lg:max-h-[72vh] lg:w-[min(340px,calc(100vw-2rem))] ' +
        'xl:w-[min(370px,calc(100vw-2rem))] lg:-translate-y-1/2 lg:rounded-lg lg:p-4 lg:shadow-card-hover'
      }
    >
      <button
        onClick={onClose}
        aria-label="关闭城市详情"
        autoFocus
        className="absolute right-2.5 top-2.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-sm border border-paper-300 bg-paper-50 text-[13px] text-ink-500 hover:bg-paper-200 focus-visible:outline-2 focus-visible:outline-vermilion-500"
      >
        ✕
      </button>
      <CityDetailPanel city={shown} />
      {/* 正式下一步：进入完整城市详情页 */}
      <button
        type="button"
        onClick={() => navigate(`/city/${shown.city}`)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-vermilion-500/70 bg-paper-50 px-3 py-2.5 text-[13px] font-medium text-vermilion-600 transition-colors duration-200 hover:border-vermilion-600 hover:bg-vermilion-50 focus-visible:outline-2 focus-visible:outline-vermilion-500"
      >
        查看完整城市详情
        <span aria-hidden>→</span>
      </button>
      <p className="mt-2.5 border-t border-paper-300 pt-2 text-center text-[10px] text-ink-400">
        公开数据快照，非官方实时发布
      </p>
    </div>
  );
}
