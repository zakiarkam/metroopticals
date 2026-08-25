import React from "react";
import {
  Eye,
  Flame,
  Gem,
  Glasses,
  Headset,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  truck: Truck,
  refresh: RefreshCw,
  headset: Headset,
  star: Star,
  eye: Eye,
  glasses: Glasses,
  sparkles: Sparkles,
  tag: Tag,
  flame: Flame,
  gem: Gem,
  wallet: Wallet,
};

export function ContentIcon({
  name,
  className = "h-4 w-4",
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon className={className} aria-hidden />;
}
