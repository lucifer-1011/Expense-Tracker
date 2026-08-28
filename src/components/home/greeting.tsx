"use client";

import { useCurrentFlat } from "@/hooks/use-current-flat";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

/**
 * Just the greeting and first name -- the flat name already lives in the
 * app header (MobileHeader/TopNav), so it isn't repeated here.
 */
export function Greeting() {
  const { profile } = useCurrentFlat();
  const firstName = profile?.displayName.split(" ")[0] ?? "";

  return (
    <div className="px-[22px] pt-[22px] pb-[18px]">
      <p className="text-[12.5px] text-muted-foreground">{getGreeting()}</p>
      <p className="text-[19px] font-extrabold tracking-[-0.02em] text-foreground">{firstName}</p>
    </div>
  );
}
