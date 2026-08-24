"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentFlat } from "@/components/providers/flat-provider";
import { createFlatSchema } from "@/lib/validations/flat";

export function EditFlatNameDialog({
  open,
  onOpenChange,
  currentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
}) {
  const { updateFlatName } = useCurrentFlat();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(currentName);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const parsed = createFlatSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a flat name.");
      return;
    }

    if (parsed.data.name === currentName) {
      onOpenChange(false);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await updateFlatName(parsed.data.name);
      toast.success("Flat name updated");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the flat name.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit flat name</DialogTitle>
          <DialogDescription>This updates the name everyone in the flat sees.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-flat-name">Flat name</Label>
            <Input
              id="edit-flat-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="4B, Prestige Meridian"
              className="h-12 rounded-xl"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" className="w-full cursor-pointer rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
