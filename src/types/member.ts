export type MemberRole = "owner" | "member";

/**
 * A FlatMember, not a global user record: the same profile could hold a
 * separate FlatMember row per flat once multi-flat support lands.
 */
export interface FlatMember {
  id: string;
  flatId: string;
  profileId: string;
  name: string;
  avatarUrl?: string;
  role: MemberRole;
  isActive: boolean;
  joinedAt: string;
  leftAt: string | null;
}
