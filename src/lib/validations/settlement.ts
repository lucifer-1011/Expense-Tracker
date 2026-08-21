import { z } from "zod";

export const settlementFormSchema = z.object({
  fromFlatMemberId: z.string().min(1),
  toFlatMemberId: z.string().min(1),
  amountRupees: z.coerce
    .number({ error: "Enter an amount" })
    .positive("Enter an amount greater than zero"),
  method: z.enum(["cash", "upi", "bank_transfer", "other"], { error: "Choose a payment method" }),
  note: z.string().trim().max(140, "Keep it under 140 characters").optional(),
});

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
