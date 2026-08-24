"use client";

import { cloneElement, isValidElement, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryPill } from "@/components/shared/category-pill";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses, type ExpenseInput } from "@/hooks/use-expenses";
import { splitEqually, validateCustomSplit } from "@/lib/calculations/expense-split";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "@/lib/mock/categories";
import { expenseFormSchema } from "@/lib/validations/expense";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Expense, ExpenseCategory, FlatMember, SplitType } from "@/types";

function paiseToRupeeString(paise: number) {
  return (paise / 100).toString();
}

/** Digits + at most one decimal point, capped to 2 decimal places and 9 integer digits (same limits the old numeric keypad enforced). */
function sanitizeAmountInput(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll(".", "");
  }
  const [whole, decimal] = cleaned.split(".");
  const cappedWhole = (whole ?? "").slice(0, 9);
  return decimal !== undefined ? `${cappedWhole}.${decimal.slice(0, 2)}` : cappedWhole;
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

interface AddExpenseFlowProps {
  trigger?: ReactElement<{ onClick?: () => void }>;
  expense?: Expense;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseFlow({ trigger, expense, open: openProp, onOpenChange }: AddExpenseFlowProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [session, setSession] = useState(0);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  function setOpen(next: boolean) {
    if (next) setSession((s) => s + 1);
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const triggerElement =
    trigger && isValidElement(trigger) ? cloneElement(trigger, { onClick: () => setOpen(true) }) : null;

  const body = <FlowContent key={`${expense?.id ?? "new"}-${session}`} expense={expense} onDone={() => setOpen(false)} onClose={() => setOpen(false)} />;

  if (isDesktop) {
    return (
      <>
        {triggerElement}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            className="h-[85vh] max-h-[720px] w-full max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
          >
            {body}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {triggerElement}
      <Drawer open={open} onOpenChange={setOpen} snapPoints={[1]}>
        <DrawerContent className="overflow-hidden">{body}</DrawerContent>
      </Drawer>
    </>
  );
}

/**
 * A single scrollable page: category, name, amount, payer, participants, and
 * split type/amounts all live here at once, with one sticky "Add expense"
 * action at the bottom -- no step-by-step wizard, no intermediate Continue
 * buttons, no review screen. Everything reactively recomputes from the same
 * form state, so changing the amount, toggling a participant, or switching
 * split type always keeps the custom-split total (and the submit button's
 * enabled state) correct -- there's no separate "step" that could go stale.
 */
function FlowContent({
  expense,
  onDone,
  onClose,
}: {
  expense?: Expense;
  onDone: () => void;
  onClose: () => void;
}) {
  const { activeMembers, members, membership } = useCurrentFlat();
  const { addExpense, updateExpense } = useExpenses();
  const isEditing = Boolean(expense);

  const pickableMembers = useMemo(() => {
    if (!expense) return activeMembers;
    const extraIds = expense.splits
      .map((s) => s.flatMemberId)
      .filter((id) => !activeMembers.some((m) => m.id === id));
    const extras = extraIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is FlatMember => Boolean(m));
    return [...activeMembers, ...extras];
  }, [expense, activeMembers, members]);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [titleTouched, setTitleTouched] = useState(Boolean(expense));
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "groceries");
  const [amountRupees, setAmountRupees] = useState(expense ? paiseToRupeeString(expense.amountPaise) : "");
  const [paidByFlatMemberId, setPaidByFlatMemberId] = useState(
    expense?.paidByFlatMemberId ?? membership?.id ?? ""
  );
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? "equal");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    expense ? expense.splits.map((s) => s.flatMemberId) : activeMembers.map((m) => m.id)
  );
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    if (!expense || expense.splitType !== "custom") return {};
    return Object.fromEntries(
      expense.splits.map((s) => [s.flatMemberId, paiseToRupeeString(s.shareAmountPaise)])
    );
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountPaise = Math.round((parseFloat(amountRupees || "0") || 0) * 100);
  const participants = pickableMembers.filter((m) => selectedIds.includes(m.id));
  const equalSplits = splitEqually(amountPaise, selectedIds);
  const eachSharePaise = equalSplits[0]?.shareAmountPaise ?? 0;

  const customSplitsPreview = participants.map((p) => ({
    flatMemberId: p.id,
    shareAmountPaise: Math.round((parseFloat(customValues[p.id] || "0") || 0) * 100),
  }));
  const customValidation = validateCustomSplit(amountPaise, customSplitsPreview);

  const parsedForm = expenseFormSchema.safeParse({
    title,
    amountRupees,
    category,
    date: (expense ? new Date(expense.date) : new Date()).toISOString(),
    paidByFlatMemberId,
    splitType,
    participantIds: selectedIds,
  });

  const isSplitValid = splitType === "equal" || customValidation.isValid;
  const canSubmit = parsedForm.success && isSplitValid && !isSubmitting;

  function handleSelectCategory(next: ExpenseCategory) {
    setCategory(next);
    if (!titleTouched) {
      setTitle(getCategoryMeta(next).label);
    }
  }

  function handleTitleChange(value: string) {
    setTitleTouched(true);
    setTitle(value);
  }

  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    setAmountRupees(sanitizeAmountInput(e.target.value));
  }

  function handleSplitTypeChange(type: SplitType) {
    if (type === "custom" && Object.keys(customValues).length === 0) {
      const seeded = splitEqually(amountPaise, selectedIds);
      setCustomValues(Object.fromEntries(seeded.map((s) => [s.flatMemberId, paiseToRupeeString(s.shareAmountPaise)])));
    }
    setSplitType(type);
  }

  function toggleParticipant(flatMemberId: string) {
    setSelectedIds((prev) =>
      prev.includes(flatMemberId) ? prev.filter((id) => id !== flatMemberId) : [...prev, flatMemberId]
    );
  }

  async function handleSubmit() {
    if (!parsedForm.success) {
      setFormError(parsedForm.error.issues[0]?.message ?? "Check the details and try again.");
      return;
    }
    if (splitType === "custom") {
      if (customSplitsPreview.some((s) => s.shareAmountPaise < 0)) {
        setFormError("Amounts can't be negative.");
        return;
      }
      if (!customValidation.isValid) {
        setFormError(
          customValidation.remainingPaise > 0
            ? "Amounts don't add up to the total yet."
            : "Amounts add up to more than the total."
        );
        return;
      }
    }

    const splits = splitType === "equal" ? equalSplits : customSplitsPreview;
    const input: ExpenseInput = {
      title: title.trim(),
      category,
      amountPaise,
      date: expense ? expense.date : new Date().toISOString(),
      paidByFlatMemberId,
      splitType,
      splits,
    };

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (expense) {
        await updateExpense(expense.id, input);
        toast.success("Expense updated");
      } else {
        await addExpense(input);
        toast.success("Expense added");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the expense. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!membership) {
    // Membership/roster hasn't finished loading yet -- FlatProvider's own
    // loading gate normally prevents this, but guards against a flash of a
    // broken form if this flow is ever opened mid-fetch.
    return null;
  }

  const assignedPaise = customSplitsPreview.reduce((sum, s) => sum + s.shareAmountPaise, 0);
  const remainingPaise = amountPaise - assignedPaise;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {isEditing ? "Edit expense" : "Add expense"}
        </h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {/* Category */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {EXPENSE_CATEGORIES.map((c) => (
              <CategoryPill
                key={c.value}
                category={c}
                selected={c.value === category}
                onClick={() => handleSelectCategory(c.value)}
              />
            ))}
          </div>
        </section>

        {/* Name */}
        <section className="space-y-1.5">
          <label htmlFor="expense-title" className="text-sm font-medium text-muted-foreground">
            Expense name
          </label>
          <Input
            id="expense-title"
            autoFocus={!isEditing}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Dinner at Big Bazaar"
            className="h-12 rounded-xl text-base"
          />
        </section>

        {/* Amount */}
        <section className="space-y-1.5">
          <label htmlFor="expense-amount" className="text-sm font-medium text-muted-foreground">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="expense-amount"
              inputMode="decimal"
              value={amountRupees}
              onChange={handleAmountChange}
              placeholder="0"
              className="h-16 rounded-xl border-2 pl-10 text-3xl font-extrabold tracking-tight tabular-nums"
            />
          </div>
        </section>

        {/* Who paid */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who paid?</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {pickableMembers.map((member) => {
              const selected = member.id === paidByFlatMemberId;
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPaidByFlatMemberId(member.id)}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-foreground hover:bg-accent"
                  )}
                >
                  <MemberAvatar member={member} size="sm" />
                  {firstName(member.name)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Split between */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Split between</p>
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border">
            {pickableMembers.map((member) => {
              const selected = selectedIds.includes(member.id);
              return (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleParticipant(member.id)}
                      aria-label={`Include ${member.name} in the split`}
                    />
                    <MemberAvatar member={member} size="sm" />
                    <span className="truncate text-sm font-medium text-foreground">{member.name}</span>
                  </label>
                  {splitType === "custom" && selected && (
                    <div className="relative w-24 shrink-0">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        inputMode="decimal"
                        value={customValues[member.id] ?? ""}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, [member.id]: sanitizeAmountInput(e.target.value) }))
                        }
                        placeholder="0"
                        aria-label={`${member.name}'s share`}
                        className="h-9 rounded-lg pl-6 text-right tabular-nums"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Equal / Custom toggle */}
          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary p-1">
            {(["equal", "custom"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSplitTypeChange(type)}
                className={cn(
                  "flex-1 cursor-pointer rounded-full py-2 text-sm font-medium capitalize transition-colors",
                  splitType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {type} split
              </button>
            ))}
          </div>

          {splitType === "equal" ? (
            participants.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Split equally between {participants.length} {participants.length === 1 ? "person" : "people"} ·{" "}
                <span className="font-semibold text-foreground">{formatPaise(eachSharePaise)} each</span>
              </p>
            )
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Total {formatPaise(amountPaise)}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  remainingPaise === 0 ? "text-positive-muted-foreground" : "text-owing-muted-foreground"
                )}
              >
                {remainingPaise === 0
                  ? `Assigned ${formatPaise(assignedPaise)} of ${formatPaise(amountPaise)}`
                  : `${formatPaise(Math.abs(remainingPaise))} ${remainingPaise > 0 ? "remaining" : "over"}`}
              </span>
            </div>
          )}
        </section>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
      </div>

      <div
        className="shrink-0 border-t border-border px-4 py-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button
          size="lg"
          className="h-14 w-full cursor-pointer rounded-full text-base"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </div>
  );
}
