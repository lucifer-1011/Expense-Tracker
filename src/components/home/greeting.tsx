"use client";

import { useAppData } from "@/hooks/use-app-data";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const { currentMember } = useAppData();
  const firstName = currentMember.name.split(" ")[0];

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{getGreeting()},</p>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{firstName}</h1>
    </div>
  );
}
