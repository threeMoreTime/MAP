import { createContext } from "react";
import type { MetroDataState } from "../hooks/useMetroData";

export const MetroDataContext = createContext<MetroDataState | null>(null);
