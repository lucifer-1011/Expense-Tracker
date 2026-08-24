import { z } from "zod";

export const createFlatSchema = z.object({
  name: z.string().trim().min(1, "Give your flat a name").max(80, "Keep it under 80 characters"),
});

export type CreateFlatValues = z.infer<typeof createFlatSchema>;

export const joinFlatSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, "Enter an invite code")
    .transform((v) => v.toUpperCase()),
});

export type JoinFlatValues = z.infer<typeof joinFlatSchema>;
