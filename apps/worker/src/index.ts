import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@whatsapp-otp/database";
import crypto from "crypto";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const API_VERSION = "v19.0";

const worker = new Worker(
  "otp-queue",
  async (job) => {
    const { requestId, phone, otp, locale, channel } = job.data;
    console.log(`[Worker] Processing OTP ${requestId} to ${phone} via ${channel}`);
    
    try {
      // 1. Mark as sent in DB
      await prisma.otpRequest.update({
        where: { id: requestId },
        data: { status: "sent" }
      });

      // 2. Send via Meta WhatsApp Cloud API
      const cleanPhone = phone.replace(/[^0-9]/g, ""); // Strip non-numeric chars for Meta API
      console.log(`[Worker] --> Meta API: Sending OTP to ${cleanPhone}`);
      
      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          // Since we are using a test number, we'll use the default "hello_world" template for testing. 
          // In production, this would be your approved Authentication template.
          name: "hello_world",
          language: { code: "en_US" }
        }
      };

      const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Worker] Meta API Error:`, data);
        throw new Error(data.error?.message || "Failed to send WhatsApp message");
      }

      // 3. Mark as delivered (Normally we'd rely on webhooks for this, but for now we mark it)
      await prisma.otpRequest.update({
        where: { id: requestId },
        data: { status: "delivered", metadata: data }
      });

      console.log(`[Worker] Delivered OTP ${requestId} successfully. Meta Message ID: ${data.messages?.[0]?.id}`);
      return { success: true, metaResponse: data };
    } catch (error: any) {
      console.error(`[Worker] Error sending OTP ${requestId}:`, error.message);
      
      // Update DB to failed
      await prisma.otpRequest.update({
        where: { id: requestId },
        data: { status: "failed" }
      });
      
      // We throw the error so BullMQ knows it failed and can retry it based on job config
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully!`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});

console.log("Worker started, waiting for jobs... Connected to Meta Cloud API.");
