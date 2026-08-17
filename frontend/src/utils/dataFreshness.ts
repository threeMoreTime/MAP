/**
 * 数据陈旧度工具：把 stats_scrape_date（数据实际采集日）转成可读的距离与等级。
 * 注意与 manifest.generated_at（索引构建时间）区分，二者语义不同。
 */

export type FreshnessLevel = 'fresh' | 'stale';

/** 距今天数；日期非法或缺失返回 null */
export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  const then = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  if (Number.isNaN(then)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86400000);
}

/** 超过 90 天视为陈旧（金色警示阈值） */
export function freshnessLevel(days: number | null): FreshnessLevel | null {
  if (days === null) return null;
  return days > 90 ? 'stale' : 'fresh';
}
