import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(80, "Keep it under 80 characters");

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const updateDisplayNameSchema = z.object({
  displayName: displayNameSchema,
});
