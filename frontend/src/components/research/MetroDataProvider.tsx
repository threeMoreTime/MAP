import type { ReactNode } from "react";
import { MetroDataContext } from "../../lib/metroDataContext";
import { useMetroDataLoader } from "../../hooks/useMetroData";

export default function MetroDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const data = useMetroDataLoader();
  return (
    <MetroDataContext.Provider value={data}>
      {children}
    </MetroDataContext.Provider>
  );
}
