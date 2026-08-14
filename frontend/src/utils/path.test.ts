import { describe, it, expect } from 'vitest';
import { withBaseUrl } from './path';

describe('withBaseUrl', () => {
  it('拼接相对路径与 BASE_URL', () => {
    expect(withBaseUrl('data/latest/metro_stats.json')).toBe(
      '/data/latest/metro_stats.json'
    );
  });

  it('剥离路径开头的多余斜杠，避免双斜杠', () => {
    expect(withBaseUrl('/data/a.json')).toBe('/data/a.json');
    expect(withBaseUrl('///data/a.json')).toBe('/data/a.json');
  });
});
