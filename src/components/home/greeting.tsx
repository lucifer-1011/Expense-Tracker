"use client";

import { useCurrentFlat } from "@/hooks/use-current-flat";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const { profile } = useCurrentFlat();
  const firstName = profile?.displayName.split(" ")[0] ?? "";

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{getGreeting()},</p>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{firstName}</h1>
    </div>
  );
}
