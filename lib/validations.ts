import { z } from 'zod'

export const betaSignupSchema = z.object({
  name: z.string().min(2, "Nom requis (min 2 caractères)").max(100),
  email: z.string().email("Email invalide"),
  company: z.string().max(100).optional(),
  role: z.string().max(50).optional(),
})

export const contactFormSchema = z.object({
  name: z.string().min(2, "Nom requis (min 2 caractères)").max(100),
  email: z.string().email("Email invalide"),
  company: z.string().max(100).optional(),
  subject: z.enum(["demo", "pricing", "technical", "partnership", "other"], {
    message: "Sujet requis"
  }),
  message: z.string().min(10, "Message trop court (min 10 caractères)").max(2000),
})

export type BetaSignupInput = z.infer<typeof betaSignupSchema>
export type ContactFormInput = z.infer<typeof contactFormSchema>
