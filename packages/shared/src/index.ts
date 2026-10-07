import { z } from "zod";

export const SendOtpRequestSchema = z.object({
  phone: z.string().min(10).max(20),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  length: z.number().min(4).max(10).default(6),
  expiry_seconds: z.number().min(60).max(3600).default(300),
  purpose: z.string().optional(),
  reference: z.string().optional(),
  locale: z.string().default("en"),
  metadata: z.record(z.any()).optional()
});

export type SendOtpRequest = z.infer<typeof SendOtpRequestSchema>;

export const VerifyOtpRequestSchema = z.object({
  request_id: z.string().optional(),
  phone: z.string().optional(),
  code: z.string().min(4).max(10),
}).refine(data => data.request_id || data.phone, {
  message: "Either request_id or phone must be provided",
});

export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequestSchema>;

