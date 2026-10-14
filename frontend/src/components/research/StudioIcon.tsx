const paths = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  city: "M3 21V8h7v13 M10 21V3h8v18 M18 12h3v9 M1 21h22 M6 11v1 M6 15v1 M13 7h2 M13 11h2 M13 15h2",
  compare: "M4 19V9 M10 19V4 M16 19v-7 M22 19V6 M2 22h22",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5z M9 3v16 M15 5v16",
  layers: "m12 3 10 5-10 5L2 8l10-5z M2 12l10 5 10-5 M2 16l10 5 10-5",
  info: "M12 8h.01 M12 11v6 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  focus: "M9 3H3v6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  reset: "M3 10a9 9 0 1 1 2 8 M3 4v6h6",
  clock: "M12 7v5l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  motion: "m13 2-9 12h7l-1 8 10-12h-8l1-8z",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  route: "M5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4 M19 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4 M5 7v6a3 3 0 0 0 3 3h8a3 3 0 0 0 0-6h-4 M19 16v1",
  chevron: "m9 5 7 7-7 7",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  label: "M4 5h16 M12 5v15 M8 20h8",
} as const;
export type StudioIconName = keyof typeof paths;
export default function StudioIcon({ name, size = 18 }: { name: StudioIconName; size?: number }) {
  return <svg className="studio-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
