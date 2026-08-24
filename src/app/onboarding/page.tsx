"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wallet2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { createFlatSchema, joinFlatSchema } from "@/lib/validations/flat";
import { cn } from "@/lib/utils";

type Mode = "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [mode, setMode] = useState<Mode>("create");
  const [flatName, setFlatName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If the user already has an active flat (e.g. they navigated back here
  // manually), send them home instead of letting them create a second one.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    createClient()
      .from("flat_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          router.replace("/");
        } else {
          setCheckingExisting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createFlatSchema.safeParse({ name: flatName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a flat name.");
      return;
    }

    setIsSubmitting(true);
    const { error: rpcError } = await createClient().rpc("create_flat", {
      flat_name: parsed.data.name,
    });
    setIsSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    toast.success("Flat created");
    router.push("/");
    router.refresh();
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = joinFlatSchema.safeParse({ inviteCode });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter an invite code.");
      return;
    }

    setIsSubmitting(true);
    const { error: rpcError } = await createClient().rpc("join_flat_with_invite_code", {
      code: parsed.data.inviteCode,
    });
    setIsSubmitting(false);

    if (rpcError) {
      setError("That invite code doesn't match a flat. Double check and try again.");
      return;
    }

    toast.success("You've joined the flat");
    router.push("/");
    router.refresh();
  }

  if (authLoading || checkingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wallet2 className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">FlatSplit</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Let&apos;s get you set up</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new flat or join one with an invite code
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
          {(["create", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                "flex-1 cursor-pointer rounded-full py-2 text-sm font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {m === "create" ? "Create a flat" : "Join a flat"}
            </button>
          ))}
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="flat-name">Flat name</Label>
              <Input
                id="flat-name"
                value={flatName}
                onChange={(e) => setFlatName(e.target.value)}
                placeholder="4B, Prestige Meridian"
                className="h-12 rounded-xl"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-full text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create flat"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="FLAT-7XQ2M"
                className="h-12 rounded-xl uppercase"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-full text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Joining..." : "Join flat"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
