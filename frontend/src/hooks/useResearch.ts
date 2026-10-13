import { useContext, useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router-dom";
import { CITY_COORDS } from "../data/cityCoords";
import { normalizeCities } from "../lib/research";
import { useReducedMotion } from "./useReducedMotion";
import { MetroDataContext } from "../lib/metroDataContext";

const basketKey = "metroviz.research.cities";
const motionKey = "metroviz.research.reduce-motion";
function read(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function write(key: string, value: string) {
  if (read(key) === value) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* URL is the durable fallback. */
  }
  window.dispatchEvent(new Event("research-preference"));
}
function subscribe(callback: () => void) {
  window.addEventListener("research-preference", callback);
  return () => window.removeEventListener("research-preference", callback);
}

export function useBasket() {
  const data = useContext(MetroDataContext);
  const allowed =
    data && data.merged.length > 0
      ? data.merged.map((city) => city.city)
      : Object.keys(CITY_COORDS);
  const [params, setParams] = useSearchParams();
  const stored = useSyncExternalStore(
    subscribe,
    () => read(basketKey),
    () => "",
  );
  const { ids, adjusted } = normalizeCities(
    params.get("cities") ?? stored,
    allowed,
  );
  const normalizedSelection = ids.join(",");
  const explicitSelection = params.has("cities");
  useEffect(() => {
    if (explicitSelection && normalizedSelection !== stored)
      write(basketKey, normalizedSelection);
  }, [explicitSelection, normalizedSelection, stored]);
  function replace(next: string[]) {
    const normalized = normalizeCities(next.join(","), allowed).ids;
    write(basketKey, normalized.join(","));
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("cities", normalized.join(","));
        return p;
      },
      { replace: true },
    );
  }
  function href(path: string, changes: Record<string, string | null> = {}) {
    const p = new URLSearchParams(params);
    p.set("cities", ids.join(","));
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) p.delete(key);
      else p.set(key, value);
    }
    return `${path}?${p.toString()}`;
  }
  return {
    ids,
    adjusted,
    replace,
    href,
    toggle: (id: string) =>
      replace(ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]),
  };
}

export function useMotion() {
  const system = useReducedMotion();
  const manual = useSyncExternalStore(
    subscribe,
    () => read(motionKey) === "1",
    () => false,
  );
  return {
    reduced: system || manual,
    system,
    manual,
    toggle: () => write(motionKey, manual ? "0" : "1"),
  };
}
