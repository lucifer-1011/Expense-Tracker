"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AddExpenseFlow } from "@/components/expenses/add-expense-flow";
import { DeleteExpenseDialog } from "@/components/expenses/delete-expense-dialog";
import { Amount } from "@/components/shared/amount";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ErrorState } from "@/components/shared/error-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { formatDate } from "@/lib/format";
import { getCategoryMeta } from "@/lib/mock/categories";

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getExpense, getMember, deleteExpense } = useAppData();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const expense = getExpense(params.id);

  if (!expense) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Link
          href="/activity"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to activity
        </Link>
        <ErrorState
          title="Expense not found"
          description="This expense may have been deleted, or the link is incorrect."
        />
      </div>
    );
  }

  const payer = getMember(expense.paidByFlatMemberId);
  const categoryMeta = getCategoryMeta(expense.category);
  const expenseId = expense.id;

  function handleDelete() {
    deleteExpense(expenseId);
    toast.success("Expense deleted");
    router.push("/activity");
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-6">
      <Link
        href="/activity"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to activity
      </Link>

      <div>
        <div className="flex flex-col items-center gap-3 text-center">
          <CategoryIcon category={expense.category} size="lg" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {categoryMeta.label}
            </p>
            <h1 className="text-xl font-bold text-foreground">{expense.title}</h1>
          </div>
          <Amount amountPaise={expense.amountPaise} className="text-4xl" />
        </div>

        {expense.description && (
          <p className="mt-5 text-center text-sm text-muted-foreground">{expense.description}</p>
        )}

        <div className="mt-6 divide-y divide-border border-t border-border text-sm">
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Paid by</span>
            {payer && (
              <div className="flex items-center gap-2">
                <MemberAvatar member={payer} size="sm" />
                <span className="font-medium text-foreground">{payer.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium text-foreground">{formatDate(expense.date, { withYear: true })}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Split</span>
            <span className="font-medium capitalize text-foreground">
              {expense.splitType} · {expense.splits.length} {expense.splits.length === 1 ? "person" : "people"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1 cursor-pointer rounded-full"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            className="h-12 flex-1 cursor-pointer rounded-full"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Split breakdown
        </p>
        <div className="mt-2 divide-y divide-border">
          {expense.splits.map((split) => {
            const member = getMember(split.flatMemberId);
            if (!member) return null;
            return (
              <div key={split.flatMemberId} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <MemberAvatar member={member} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{member.name}</span>
                    {!member.isActive && (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Left flat
                      </span>
                    )}
                  </div>
                </div>
                <Amount amountPaise={split.shareAmountPaise} variant="muted" className="text-sm" />
              </div>
            );
          })}
        </div>
      </div>

      <AddExpenseFlow expense={expense} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteExpenseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        expenseTitle={expense.title}
        onConfirm={handleDelete}
      />
    </div>
  );
}
