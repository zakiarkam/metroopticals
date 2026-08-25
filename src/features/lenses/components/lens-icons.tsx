import {
  Circle,
  Gem,
  Glasses,
  Layers,
  Monitor,
  ShieldCheck,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";

export const LENS_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  circle: Circle,
  monitor: Monitor,
  sun: Sun,
  shield: ShieldCheck,
  waves: Waves,
  layers: Layers,
  glasses: Glasses,
  sparkles: Sparkles,
  gem: Gem,
};

export function LensIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = LENS_ICONS[name] ?? Circle;
  return <Icon className={className} />;
}
