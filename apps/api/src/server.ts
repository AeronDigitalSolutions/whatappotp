import Fastify from "fastify";
import { prisma } from "@whatsapp-otp/database";
import { SendOtpRequestSchema, VerifyOtpRequestSchema } from "@whatsapp-otp/shared";
import crypto from "crypto";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const fastify = Fastify({ logger: true });

// Setup Queue
const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const otpQueue = new Queue("otp-queue", { connection: redisConnection });

const PEPPER = process.env.OTP_PEPPER || "default-pepper"; // In production, keep this very secure

// Helper to hash OTP
const hashOtp = (otp: string, projectId: string) => {
  return crypto.createHmac("sha256", PEPPER).update(`${projectId}:${otp}`).digest("hex");
};

// Mock Auth logic to get projectId from ApiKey
// Customers would pass `Authorization: Bearer <key>`
const getProjectId = async (request: any): Promise<string> => {
  // Hardcoded for Phase 2 demo. In real-world, lookup ApiKey table
  return "demo-project-id"; 
};

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.post("/v1/otp/send", async (request, reply) => {
  const projectId = await getProjectId(request);
  const result = SendOtpRequestSchema.safeParse(request.body);
  
  if (!result.success) {
    return reply.status(400).send({ error: result.error });
  }

  const data = result.data;
  
  // 1. Generate numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // 2. Hash it
  const otpHash = hashOtp(otp, projectId);
  const expiresAt = new Date(Date.now() + data.expiry_seconds * 1000);

  // 3. Store in DB
  const otpRequest = await prisma.otpRequest.create({
    data: {
      projectId,
      phone: data.phone,
      channel: data.channel,
      otpHash,
      expiresAt,
      purpose: data.purpose,
      reference: data.reference,
      locale: data.locale,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null
    }
  });

  // 4. Enqueue Job for Worker
  await otpQueue.add("send-otp", {
    requestId: otpRequest.id,
    phone: data.phone,
    otp: otp,
    locale: data.locale,
    channel: data.channel
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    }
  });

  return reply.status(202).send({ 
    request_id: otpRequest.id, 
    status: "queued",
    expires_at: expiresAt.toISOString()
  });
});

fastify.post("/v1/otp/verify", async (request, reply) => {
  const projectId = await getProjectId(request);
  const result = VerifyOtpRequestSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ error: result.error });
  }

  const { request_id, phone, code } = result.data;

  // Find request
  let otpRequest;
  if (request_id) {
    otpRequest = await prisma.otpRequest.findUnique({ where: { id: request_id } });
  } else if (phone) {
    otpRequest = await prisma.otpRequest.findFirst({
      where: { phone, projectId },
      orderBy: { createdAt: "desc" }
    });
  }

  if (!otpRequest) {
    return reply.status(404).send({ verified: false, reason: "not_found" });
  }

  if (otpRequest.status === "verified") {
    return reply.status(400).send({ verified: false, reason: "already_verified" });
  }

  if (otpRequest.expiresAt < new Date()) {
    await prisma.otpRequest.update({ where: { id: otpRequest.id }, data: { status: "expired" } });
    return reply.status(400).send({ verified: false, reason: "expired" });
  }

  if (otpRequest.attempts >= otpRequest.maxAttempts) {
    return reply.status(400).send({ verified: false, reason: "max_attempts" });
  }

  // Increment attempt
  await prisma.otpRequest.update({
    where: { id: otpRequest.id },
    data: { attempts: { increment: 1 } }
  });

  // Verify code securely
  const inputHash = hashOtp(code, projectId);
  
  // Constant time comparison (though DB lookup acts differently, comparing hashes is safe here)
  const isMatch = crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(otpRequest.otpHash, "hex"));

  // Log attempt
  await prisma.otpAttempt.create({
    data: {
      otpRequestId: otpRequest.id,
      codeProvided: "REDACTED", 
      successful: isMatch
    }
  });

  if (!isMatch) {
    return reply.status(400).send({ verified: false, reason: "invalid" });
  }

  // Success
  await prisma.otpRequest.update({
    where: { id: otpRequest.id },
    data: { status: "verified" }
  });

  return reply.status(200).send({ verified: true, reason: "ok" });
});

// Meta Webhook Verification and Event Receiver
fastify.get("/webhooks/whatsapp", async (request: any, reply) => {
  const mode = request.query["hub.mode"];
  const token = request.query["hub.verify_token"];
  const challenge = request.query["hub.challenge"];

  // Set this same token in the Meta App Dashboard when setting up webhooks
  const VERIFY_TOKEN = "my_secure_webhook_token_123";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send("Forbidden");
});

fastify.post("/webhooks/whatsapp", async (request: any, reply) => {
  const body = request.body;
  
  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value.statuses) {
          for (const status of change.value.statuses) {
            console.log(`[Webhook] Message ${status.id} is now ${status.status}`);
            // In a full implementation, you'd find the OtpRequest by providerMessageId and update its status
          }
        }
      }
    }
  }
  return reply.status(200).send("EVENT_RECEIVED");
});

// Meta Embedded Signup Callback
fastify.post("/v1/auth/meta/callback", async (request: any, reply) => {
  const { accessToken, projectId } = request.body;
  
  if (!accessToken || !projectId) {
    return reply.status(400).send({ success: false, error: "Missing tokens" });
  }

  try {
    // 1. In a real app, you exchange the short-lived accessToken for a System User Token
    //    using your OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET.
    // 2. You query the Graph API to get the associated WABA ID and Phone Number ID.
    // 3. Securely store it in the database for the given projectId.

    console.log(`[Auth] Received Meta Access Token for project ${projectId}. Exchanging...`);

    // Mock successful exchange
    await new Promise(res => setTimeout(res, 1000));

    return reply.status(200).send({ success: true, message: "Connected successfully" });
  } catch (error: any) {
    console.error("[Auth] Meta API Error:", error);
    return reply.status(500).send({ success: false, error: "Meta API Exchange Failed" });
  }
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
