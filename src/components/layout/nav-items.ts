import { Home, Receipt, User, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Receipt },
  { href: "/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
