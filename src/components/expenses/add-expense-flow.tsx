"use client";

import { cloneElement, isValidElement, useMemo, useState, type ReactElement } from "react";
import { ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAppData, type ExpenseInput } from "@/hooks/use-app-data";
import { splitEqually, validateCustomSplit } from "@/lib/calculations/expense-split";
import { getCategoryMeta } from "@/lib/mock/categories";
import { expenseFormSchema } from "@/lib/validations/expense";
import { cn } from "@/lib/utils";
import type { Expense, ExpenseCategory, FlatMember, SplitType } from "@/types";

import { AmountStep } from "./steps/amount-step";
import { ConfirmStep } from "./steps/confirm-step";
import { PaidByStep } from "./steps/paid-by-step";
import { PurposeStep } from "./steps/purpose-step";
import { SplitStep } from "./steps/split-step";

const STEP_ORDER = ["purpose", "amount", "paidBy", "split", "confirm"] as const;
type Step = (typeof STEP_ORDER)[number];

function paiseToRupeeString(paise: number) {
  return (paise / 100).toString();
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

function FlowContent({
  expense,
  onDone,
  onClose,
}: {
  expense?: Expense;
  onDone: () => void;
  onClose: () => void;
}) {
  const { activeMembers, members, addExpense, updateExpense, currentMember } = useAppData();
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

  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEP_ORDER[stepIndex];

  const [title, setTitle] = useState(expense?.title ?? "");
  const [titleTouched, setTitleTouched] = useState(Boolean(expense));
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "groceries");
  const [amountRupees, setAmountRupees] = useState(expense ? paiseToRupeeString(expense.amountPaise) : "");
  const [paidByFlatMemberId, setPaidByFlatMemberId] = useState(
    expense?.paidByFlatMemberId ?? currentMember.id
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
  const [splitError, setSplitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountPaise = Math.round((parseFloat(amountRupees || "0") || 0) * 100);

  function goTo(nextStep: Step) {
    setStepIndex(STEP_ORDER.indexOf(nextStep));
  }

  function handleBack() {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStepIndex((i) => i - 1);
  }

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

  function handleSplitTypeChange(type: SplitType) {
    if (type === "custom" && Object.keys(customValues).length === 0) {
      const equalSplits = splitEqually(amountPaise, selectedIds);
      setCustomValues(
        Object.fromEntries(equalSplits.map((s) => [s.flatMemberId, paiseToRupeeString(s.shareAmountPaise)]))
      );
    }
    setSplitError(null);
    setSplitType(type);
  }

  function toggleParticipant(flatMemberId: string) {
    setSelectedIds((prev) =>
      prev.includes(flatMemberId) ? prev.filter((id) => id !== flatMemberId) : [...prev, flatMemberId]
    );
  }

  function handleSplitContinue() {
    const parsed = expenseFormSchema.safeParse({
      title,
      amountRupees,
      category,
      date: (expense ? new Date(expense.date) : new Date()).toISOString(),
      paidByFlatMemberId,
      splitType,
      participantIds: selectedIds,
    });
    if (!parsed.success) {
      setSplitError(parsed.error.issues[0]?.message ?? "Check the details and try again.");
      return;
    }

    if (splitType === "custom") {
      const splits = selectedIds.map((id) => ({
        flatMemberId: id,
        shareAmountPaise: Math.round((parseFloat(customValues[id] || "0") || 0) * 100),
      }));
      const validation = validateCustomSplit(amountPaise, splits);
      if (!validation.isValid) {
        setSplitError(
          validation.remainingPaise > 0
            ? "Amounts don't add up to the total yet."
            : "Amounts add up to more than the total."
        );
        return;
      }
    }

    setSplitError(null);
    goTo("confirm");
  }

  function handleConfirm() {
    const splits =
      splitType === "equal"
        ? splitEqually(amountPaise, selectedIds)
        : selectedIds.map((id) => ({
            flatMemberId: id,
            shareAmountPaise: Math.round((parseFloat(customValues[id] || "0") || 0) * 100),
          }));

    setIsSubmitting(true);
    const input: ExpenseInput = {
      title: title.trim(),
      category,
      amountPaise,
      date: expense ? expense.date : new Date().toISOString(),
      paidByFlatMemberId,
      splitType,
      splits,
    };

    if (expense) {
      updateExpense(expense.id, input);
      toast.success("Expense updated");
    } else {
      addExpense(input);
      toast.success("Expense added");
    }
    setIsSubmitting(false);
    onDone();
  }

  const payer = pickableMembers.find((m) => m.id === paidByFlatMemberId) ?? currentMember;
  const participants = pickableMembers.filter((m) => selectedIds.includes(m.id));
  const equalSplits = splitEqually(amountPaise, selectedIds);
  const eachSharePaise = equalSplits[0]?.shareAmountPaise ?? 0;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between px-3 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={cn("h-1 w-6 rounded-full transition-colors", i <= stepIndex ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {step === "purpose" && (
          <PurposeStep
            title={title}
            category={category}
            onSelectCategory={handleSelectCategory}
            onTitleChange={handleTitleChange}
            onContinue={() => goTo("amount")}
          />
        )}
        {step === "amount" && (
          <AmountStep value={amountRupees} onChange={setAmountRupees} onContinue={() => goTo("paidBy")} />
        )}
        {step === "paidBy" && (
          <PaidByStep
            members={pickableMembers}
            selectedId={paidByFlatMemberId}
            onSelect={(id) => {
              setPaidByFlatMemberId(id);
              goTo("split");
            }}
          />
        )}
        {step === "split" && (
          <SplitStep
            members={pickableMembers}
            selectedIds={selectedIds}
            onToggleParticipant={toggleParticipant}
            splitType={splitType}
            onSplitTypeChange={handleSplitTypeChange}
            amountPaise={amountPaise}
            customValues={customValues}
            onCustomValueChange={(id, value) => setCustomValues((prev) => ({ ...prev, [id]: value }))}
            onContinue={handleSplitContinue}
            error={splitError}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            title={title}
            category={category}
            amountPaise={amountPaise}
            payer={payer}
            participants={participants}
            eachSharePaise={eachSharePaise}
            isCustomSplit={splitType === "custom"}
            customValues={customValues}
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
}
