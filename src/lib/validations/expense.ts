import { z } from "zod";

const EXPENSE_CATEGORY_VALUES = [
  "groceries",
  "rent",
  "utilities",
  "internet",
  "food",
  "transport",
  "household",
  "entertainment",
  "other",
] as const;

export const expenseFormSchema = z.object({
  title: z.string().trim().min(1, "Give this expense a title").max(80, "Keep it under 80 characters"),
  description: z.string().trim().max(280, "Keep it under 280 characters").optional(),
  amountRupees: z.coerce
    .number({ error: "Enter an amount" })
    .positive("Enter an amount greater than zero"),
  category: z.enum(EXPENSE_CATEGORY_VALUES, { error: "Choose a category" }),
  date: z.string().min(1, "Pick a date"),
  paidByFlatMemberId: z.string().min(1, "Select who paid"),
  splitType: z.enum(["equal", "custom"]),
  participantIds: z.array(z.string()).min(1, "Select at least one participant"),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
