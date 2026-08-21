import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FlatMember } from "@/types";

const PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const SIZE_CLASSES = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" } as const;

export function MemberAvatar({
  member,
  size = "md",
  ringed = false,
  className,
}: {
  member: Pick<FlatMember, "id" | "name" | "avatarUrl">;
  size?: keyof typeof SIZE_CLASSES;
  ringed?: boolean;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZE_CLASSES[size], ringed && "ring-2 ring-card", className)}>
      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name} /> : null}
      <AvatarFallback className={cn("font-semibold", colorForId(member.id))}>
        {initials(member.name)}
      </AvatarFallback>
    </Avatar>
  );
}
