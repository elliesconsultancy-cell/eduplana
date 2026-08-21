import {
  Briefcase,
  Camera,
  Compass,
  Cpu,
  Hammer,
  Laptop,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SignalKey } from "./career";

/**
 * Icons live apart from `career.ts` so the signal definitions stay importable
 * from server code without dragging the icon set along.
 */
export const CAREER_ICONS: Record<SignalKey, LucideIcon> = {
  ict: Laptop,
  stem: Cpu,
  enterprise: Briefcase,
  vocational: Hammer,
  guidance: Compass,
  exposure: Users,
  creative: Camera,
  agriculture: Sprout,
};
