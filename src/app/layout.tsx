import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Flatmates -- Expense Tracker",
  description: "Track shared flat expenses, balances, and settlements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppDataProvider>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" />
          </TooltipProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}
