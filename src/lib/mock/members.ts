import type { FlatMember } from "@/types";

export const MOCK_MEMBERS: FlatMember[] = [
  {
    id: "member-piyush",
    flatId: "flat-1",
    profileId: "profile-piyush",
    name: "Piyush Pagare",
    role: "owner",
    isActive: true,
    joinedAt: "2024-11-02T00:00:00.000Z",
    leftAt: null,
  },
  {
    id: "member-rahul",
    flatId: "flat-1",
    profileId: "profile-rahul",
    name: "Rahul Mehta",
    role: "member",
    isActive: true,
    joinedAt: "2024-11-02T00:00:00.000Z",
    leftAt: null,
  },
  {
    id: "member-aman",
    flatId: "flat-1",
    profileId: "profile-aman",
    name: "Aman Verma",
    role: "member",
    isActive: true,
    joinedAt: "2024-12-15T00:00:00.000Z",
    leftAt: null,
  },
  {
    id: "member-priya",
    flatId: "flat-1",
    profileId: "profile-priya",
    name: "Priya Nair",
    role: "member",
    isActive: true,
    joinedAt: "2025-03-01T00:00:00.000Z",
    leftAt: null,
  },
  {
    id: "member-karan",
    flatId: "flat-1",
    profileId: "profile-karan",
    name: "Karan Shah",
    role: "member",
    isActive: false,
    joinedAt: "2024-11-02T00:00:00.000Z",
    leftAt: "2025-05-20T00:00:00.000Z",
  },
];

/** The signed-in user, for this prototype -- Piyush. */
export const CURRENT_FLAT_MEMBER_ID = "member-piyush";
