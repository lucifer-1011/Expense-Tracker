import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { FlatMember } from "@/types";
import { MemberAvatar } from "./member-avatar";

export function RoommateRow({
  member,
  subtitle,
  trailing,
  className,
}: {
  member: Pick<FlatMember, "id" | "name" | "avatarUrl">;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <MemberAvatar member={member} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
        {subtitle && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}
