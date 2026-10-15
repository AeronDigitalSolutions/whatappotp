import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "@whatsapp-otp/database";
import crypto from "crypto";

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] });

fastify.get("/health", async () => {
  return { status: "ok", environment: "hostinger", database: "connected", auth: "enabled" };
});

// --- AUTHENTICATION ---
function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

fastify.post("/v1/auth/signup", async (request: any, reply) => {
  const { email, password, name } = request.body;
  if (!email || !password) return reply.status(400).send({ error: "Email and password required" });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.status(400).send({ error: "Email already exists" });

    const user = await prisma.user.create({
      data: { id: crypto.randomUUID(), email, name, passwordHash: hashPassword(password) }
    });

    const org = await prisma.organization.create({
      data: { id: crypto.randomUUID(), name: `${name || 'My'} Organization` }
    });

    await prisma.membership.create({
      data: { id: crypto.randomUUID(), userId: user.id, organizationId: org.id, role: "owner" }
    });

    const project = await prisma.project.create({
      data: { id: crypto.randomUUID(), organizationId: org.id, name: "Default Project" }
    });

    await prisma.wallet.create({
      data: { id: crypto.randomUUID(), organizationId: org.id, balance: 0.00 }
    });

    return reply.send({ success: true, user: { id: user.id, email: user.email, name: user.name }, projectId: project.id, organizationId: org.id });
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(500).send({ error: "Failed to create account" });
  }
});

fastify.post("/v1/auth/login", async (request: any, reply) => {
  const { email, password } = request.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: { include: { projects: true } } }
    });

    if (!membership) return reply.status(500).send({ error: "Account corrupted (no organization)" });

    return reply.send({ success: true, user: { id: user.id, email: user.email, name: user.name }, projectId: membership.organization.projects[0]?.id, organizationId: membership.organizationId });
  } catch (err: any) {
    return reply.status(500).send({ error: "Login failed" });
  }
});

// --- SOCIAL AUTHENTICATION (Google & Meta) ---
async function findOrCreateSocialUser({ email, name, emailVerified = true, metaAccessToken = null }: { email: string, name?: string, emailVerified?: boolean, metaAccessToken?: string | null }) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name: name || null,
        emailVerified
      }
    });

    const org = await prisma.organization.create({
      data: { id: crypto.randomUUID(), name: `${name || 'My'} Organization` }
    });

    await prisma.membership.create({
      data: { id: crypto.randomUUID(), userId: user.id, organizationId: org.id, role: "owner" }
    });

    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: org.id,
        name: "Default Project",
        metaAccessToken: metaAccessToken || null
      }
    });

    await prisma.wallet.create({
      data: { id: crypto.randomUUID(), organizationId: org.id, balance: 0.00 }
    });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { projects: true } } }
  });

  const projectId = membership?.organization.projects[0]?.id;
  const organizationId = membership?.organizationId;

  if (metaAccessToken && projectId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { metaAccessToken }
    }).catch(() => {});
  }

  return { user: { id: user.id, email: user.email, name: user.name }, projectId, organizationId };
}

fastify.post("/v1/auth/google", async (request: any, reply) => {
  const { credential, accessToken } = request.body;
  if (!credential && !accessToken) {
    return reply.status(400).send({ error: "Missing Google token or credential" });
  }

  try {
    let email: string | null = null;
    let name: string | null = null;

    if (credential) {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      const data = await res.json();
      if (!res.ok || !data.email) throw new Error(data.error_description || "Invalid Google token");
      email = data.email;
      name = data.name;
    } else if (accessToken) {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok || !data.email) throw new Error(data.error_description || "Invalid Google access token");
      email = data.email;
      name = data.name;
    }

    if (!email) return reply.status(400).send({ error: "No email returned from Google account" });

    const result = await findOrCreateSocialUser({ email, name: name || undefined, emailVerified: true });
    return reply.send({ success: true, ...result });
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(400).send({ error: err.message || "Google authentication failed" });
  }
});

fastify.post("/v1/auth/meta", async (request: any, reply) => {
  const { accessToken } = request.body;
  if (!accessToken) {
    return reply.status(400).send({ error: "Missing Meta access token" });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Invalid Meta access token");
    }

    const email = data.email || `${data.id}@facebook.com`;
    const name = data.name || "Meta User";

    const result = await findOrCreateSocialUser({ email, name, emailVerified: true, metaAccessToken: accessToken });
    return reply.send({ success: true, ...result });
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(400).send({ error: err.message || "Meta authentication failed" });
  }
});

// --- PROJECT & SETUP ---
fastify.get("/v1/project/:id", async (request: any, reply) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: request.params.id } });
    if (!project) return reply.status(404).send({ error: "Project not found" });
    return reply.send({ success: true, project });
  } catch (err: any) {
    return reply.status(500).send({ error: "Server error" });
  }
});

fastify.post("/v1/auth/meta/callback", async (request: any, reply) => {
  const { accessToken, projectId } = request.body;
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { metaAccessToken: accessToken }
    });
    return reply.send({ success: true });
  } catch (error: any) {
    return reply.status(500).send({ error: "Failed to save Meta token" });
  }
});

fastify.get("/v1/meta/accounts/:projectId", async (request: any, reply) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: request.params.projectId } });
    if (!project || !project.metaAccessToken) return reply.status(400).send({ error: "Meta not connected" });
    
    const token = project.metaAccessToken;
    const tree: any[] = [];

    // 1. Fetch businesses the user has access to
    const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?access_token=${token}`);
    const bizData = await bizRes.json();
    
    if (bizData.error) {
      fastify.log.error(bizData.error);
      return reply.send({ success: false, error: "Facebook API Error: " + bizData.error.message });
    }

    let businesses = bizData.data || [];
    if (businesses.length === 0) {
      businesses = [
        { id: "205078357411585", name: "Digital Being" },
        { id: "1787910995900172", name: "ishinna_b_sadana" }
      ];
    }
    
    for (const biz of businesses) {
       // 2. Fetch WABAs for each business
       const wabaRes = await fetch(`https://graph.facebook.com/v19.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${token}`);
       const wabaData = await wabaRes.json();
       
       const wabas: any[] = [];
       if (wabaData.data) {
          for (const waba of wabaData.data) {
             // 3. Fetch Phone numbers for each WABA
             const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?access_token=${token}`);
             const phoneData = await phoneRes.json();
             
             wabas.push({
               id: waba.id,
               name: waba.name || "Unnamed WABA",
               phones: (phoneData.data || []).map((p: any) => ({
                 id: p.id,
                 number: p.display_phone_number,
                 verifiedName: p.verified_name,
                 quality: p.quality_rating,
                 status: p.code_verification_status
               }))
             });
          }
       }
       
       tree.push({
         id: biz.id,
         name: biz.name || "Unnamed Business",
         wabas
       });
    }

    return reply.send({ success: true, businesses: tree, raw: bizData });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch hierarchical accounts from Meta" });
  }
});

fastify.post("/v1/meta/select/:projectId", async (request: any, reply) => {
  const { wabaId, phoneId, displayPhone, verifiedName, wabaName } = request.body;
  const projectId = request.params.projectId;
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { metaWabaId: wabaId, metaPhoneId: phoneId }
    });

    // Also upsert into PhoneNumber table
    if (phoneId) {
      await prisma.phoneNumber.upsert({
        where: { projectId_phoneId: { projectId, phoneId } },
        update: {
          wabaId: wabaId || "",
          displayPhone: displayPhone || phoneId,
          verifiedName: verifiedName || null,
          wabaName: wabaName || null,
          isDefault: true
        },
        create: {
          id: crypto.randomUUID(),
          projectId,
          phoneId,
          displayPhone: displayPhone || phoneId,
          verifiedName: verifiedName || null,
          wabaId: wabaId || "",
          wabaName: wabaName || null,
          service: "AUTHENTICATION",
          isDefault: true
        }
      });
    }

    return reply.send({ success: true });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to save selection" });
  }
});

// --- MODULE 1: PHONE NUMBERS & SERVICE ROUTING ---
fastify.get("/v1/meta/numbers/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return reply.status(404).send({ error: "Project not found" });

    // Fetch saved numbers in DB
    const savedNumbers = await prisma.phoneNumber.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });

    // Also discover any phone numbers from Meta if token exists
    if (project.metaAccessToken) {
      try {
        const token = project.metaAccessToken;
        const bizIds = ["205078357411585", "1787910995900172"];
        for (const bizId of bizIds) {
          const wabaRes = await fetch(`https://graph.facebook.com/v19.0/${bizId}/owned_whatsapp_business_accounts?access_token=${token}`);
          const wabaData = await wabaRes.json();
          if (wabaData.data) {
            for (const waba of wabaData.data) {
              const pRes = await fetch(`https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?access_token=${token}`);
              const pData = await pRes.json();
              if (pData.data) {
                for (const phone of pData.data) {
                  await prisma.phoneNumber.upsert({
                    where: { projectId_phoneId: { projectId, phoneId: phone.id } },
                    update: {
                      displayPhone: phone.display_phone_number,
                      verifiedName: phone.verified_name || null,
                      quality: phone.quality_rating || null,
                      status: phone.code_verification_status || null,
                      wabaName: waba.name || null
                    },
                    create: {
                      id: crypto.randomUUID(),
                      projectId,
                      phoneId: phone.id,
                      displayPhone: phone.display_phone_number,
                      verifiedName: phone.verified_name || null,
                      wabaId: waba.id,
                      wabaName: waba.name || null,
                      service: "AUTHENTICATION",
                      isDefault: project.metaPhoneId === phone.id,
                      quality: phone.quality_rating || null,
                      status: phone.code_verification_status || null
                    }
                  });
                }
              }
            }
          }
        }
      } catch (syncErr) {
        fastify.log.warn("Meta sync warning: " + syncErr);
      }
    }

    const numbers = await prisma.phoneNumber.findMany({
      where: { projectId },
      orderBy: [{ service: "asc" }, { createdAt: "desc" }]
    });

    return reply.send({ success: true, numbers });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch phone numbers" });
  }
});

fastify.post("/v1/meta/numbers/assign", async (request: any, reply) => {
  const { projectId, phoneId, service, isDefault } = request.body;
  if (!projectId || !phoneId || !service) {
    return reply.status(400).send({ error: "Missing required fields" });
  }

  try {
    // If setting as default, clear other defaults for this service
    if (isDefault) {
      await prisma.phoneNumber.updateMany({
        where: { projectId, service },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.phoneNumber.update({
      where: { projectId_phoneId: { projectId, phoneId } },
      data: { service, isDefault: !!isDefault }
    });

    // If OTP service is set, keep project.metaPhoneId synced
    if (service === "AUTHENTICATION" && isDefault) {
      await prisma.project.update({
        where: { id: projectId },
        data: { metaPhoneId: phoneId, metaWabaId: updated.wabaId }
      });
    }

    return reply.send({ success: true, number: updated });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to assign service" });
  }
});

fastify.post("/v1/meta/numbers/add-manual", async (request: any, reply) => {
  const { projectId, phoneId, displayPhone, verifiedName, wabaId, wabaName, service } = request.body;
  if (!projectId || !phoneId || !displayPhone || !wabaId) {
    return reply.status(400).send({ error: "Missing required fields (phoneId, displayPhone, wabaId)" });
  }

  try {
    const created = await prisma.phoneNumber.upsert({
      where: { projectId_phoneId: { projectId, phoneId } },
      update: {
        displayPhone,
        verifiedName: verifiedName || null,
        wabaId,
        wabaName: wabaName || null,
        service: service || "AUTHENTICATION"
      },
      create: {
        id: crypto.randomUUID(),
        projectId,
        phoneId,
        displayPhone,
        verifiedName: verifiedName || null,
        wabaId,
        wabaName: wabaName || null,
        service: service || "AUTHENTICATION",
        isDefault: false
      }
    });

    return reply.send({ success: true, number: created });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to add phone number" });
  }
});

// --- MODULE 2: TEMPLATE STUDIO & META APPROVAL ---
fastify.get("/v1/meta/templates/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.metaAccessToken) {
      return reply.status(400).send({ error: "Meta WhatsApp not connected" });
    }

    const wabaId = project.metaWabaId || "2107898293422238";
    const token = project.metaAccessToken;

    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?access_token=${token}&limit=100`);
    const data = await res.json();

    if (data.error) {
      return reply.status(400).send({ error: "Meta API Error: " + data.error.message });
    }

    return reply.send({ success: true, templates: data.data || [], wabaId });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch templates from Meta" });
  }
});

fastify.post("/v1/meta/templates/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  const { name, category, language, components } = request.body;

  if (!name || !category || !language || !components) {
    return reply.status(400).send({ error: "Missing required template fields (name, category, language, components)" });
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.metaAccessToken) {
      return reply.status(400).send({ error: "Meta WhatsApp not connected" });
    }

    const wabaId = project.metaWabaId || "2107898293422238";
    const token = project.metaAccessToken;

    const payload = {
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      category,
      language: language || "en_US",
      components
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      return reply.status(400).send({ success: false, error: data.error?.message || "Meta rejected template creation" });
    }

    return reply.send({ success: true, template: data });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to submit template to Meta" });
  }
});

fastify.delete("/v1/meta/templates/:projectId/:templateName", async (request: any, reply) => {
  const { projectId, templateName } = request.params;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.metaAccessToken) {
      return reply.status(400).send({ error: "Meta WhatsApp not connected" });
    }

    const wabaId = project.metaWabaId || "2107898293422238";
    const token = project.metaAccessToken;

    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      return reply.status(400).send({ error: data.error?.message || "Failed to delete template" });
    }

    return reply.send({ success: true, data });
  } catch (error: any) {
    return reply.status(500).send({ error: "Failed to delete template" });
  }
});

// --- BILLING (Razorpay) & WALLET ---
fastify.get("/v1/wallet/:organizationId", async (request: any, reply) => {
  const { organizationId } = request.params;
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { organizationId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          balance: 0.00
        },
        include: {
          transactions: true
        }
      });
    }

    return reply.send({ success: true, wallet });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch wallet" });
  }
});

fastify.post("/v1/billing/order", async (request: any, reply) => {
  const { amount, organizationId } = request.body;
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!rzpKeyId || !rzpKeySecret) return reply.status(500).send({ error: "Razorpay keys missing" });

  try {
    const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: `receipt_${organizationId}_${Date.now()}` })
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(orderData.error?.description || "Razorpay API error");
    return reply.send({ success: true, orderId: orderData.id, amount: orderData.amount, keyId: rzpKeyId });
  } catch (error: any) {
    return reply.status(500).send({ error: "Failed to create order" });
  }
});

fastify.post("/v1/billing/webhook", async (request: any, reply) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "digitalbeings_secret_123";
  const signature = request.headers['x-razorpay-signature'];
  const expectedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(request.body)).digest('hex');

  if (expectedSignature !== signature) return reply.status(400).send({ error: "Invalid signature" });

  if (request.body.event === "payment.captured") {
    const payment = request.body.payload.payment.entity;
    const amountInRs = payment.amount / 100;
    const orgId = payment.notes?.organizationId || "demo-org-id";
    try {
      const wallet = await prisma.wallet.upsert({
        where: { organizationId: orgId },
        update: { balance: { increment: amountInRs } },
        create: { organizationId: orgId, balance: amountInRs }
      });
      await prisma.walletTransaction.create({
        data: { walletId: wallet.id, amount: amountInRs, type: "credit", referenceId: payment.id, description: "Razorpay Wallet Top-up" }
      });
    } catch (dbErr) { fastify.log.error(dbErr); }
  }
  return reply.send({ status: "ok" });
});

// --- DISPATCH & MESSAGING ---
fastify.post("/v1/messages", async (request: any, reply) => {
  const { projectId, to, code } = request.body;
  if (!projectId || !to || !code) return reply.status(400).send({ error: "Missing required fields" });

  try {
    const project = await prisma.project.findUnique({ 
      where: { id: projectId },
      include: { organization: { include: { wallet: true } } }
    });

    if (!project || !project.metaAccessToken || !project.metaPhoneId) {
      return reply.status(400).send({ error: "Meta WhatsApp not connected to this project" });
    }

    const wallet = project.organization.wallet;
    if (!wallet || Number(wallet.balance) < 0.50) {
      return reply.status(402).send({ error: "Insufficient wallet balance. Please top up." });
    }

    const waUrl = `https://graph.facebook.com/v19.0/${project.metaPhoneId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: to.replace("+", "").trim(),
      type: "template",
      template: {
        name: "otp_verification",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }]
          }
        ]
      }
    };

    const waRes = await fetch(waUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${project.metaAccessToken}`
      },
      body: JSON.stringify(payload)
    });

    const waData = await waRes.json();
    if (!waRes.ok) {
      fastify.log.error(waData);
      return reply.status(500).send({ error: "WhatsApp API failed: " + (waData.error?.message || "Unknown error") });
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: 0.50 } }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -0.50,
        type: "charge",
        description: `OTP sent to ${to}`,
        referenceId: waData.messages?.[0]?.id
      }
    });

    return reply.send({ success: true, messageId: waData.messages?.[0]?.id });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

// Send template message routed by service (OTP, MARKETING, UTILITY)
fastify.post("/v1/messages/send-template", async (request: any, reply) => {
  const { projectId, service, to, templateName, language, components } = request.body;
  if (!projectId || !to || !templateName) {
    return reply.status(400).send({ error: "Missing required fields (projectId, to, templateName)" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: { include: { wallet: true } },
        phoneNumbers: true
      }
    });

    if (!project || !project.metaAccessToken) {
      return reply.status(400).send({ error: "Meta WhatsApp not connected" });
    }

    // Resolve phone number: check if there's a number designated for this service
    let targetPhoneId = project.metaPhoneId;
    if (service && project.phoneNumbers.length > 0) {
      const match = project.phoneNumbers.find(p => p.service === service && p.isDefault) ||
                    project.phoneNumbers.find(p => p.service === service) ||
                    project.phoneNumbers[0];
      if (match) targetPhoneId = match.phoneId;
    }

    if (!targetPhoneId) {
      return reply.status(400).send({ error: "No phone number available to dispatch message" });
    }

    const wallet = project.organization.wallet;
    const cost = service === "MARKETING" ? 1.00 : 0.50;
    if (!wallet || Number(wallet.balance) < cost) {
      return reply.status(402).send({ error: `Insufficient wallet balance. Minimum required: ₹${cost.toFixed(2)}` });
    }

    const waUrl = `https://graph.facebook.com/v19.0/${targetPhoneId}/messages`;
    const payload: any = {
      messaging_product: "whatsapp",
      to: to.replace("+", "").trim(),
      type: "template",
      template: {
        name: templateName,
        language: { code: language || "en_US" }
      }
    };

    if (components && Array.isArray(components) && components.length > 0) {
      payload.template.components = components;
    }

    const waRes = await fetch(waUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${project.metaAccessToken}`
      },
      body: JSON.stringify(payload)
    });

    const waData = await waRes.json();
    if (!waRes.ok) {
      fastify.log.error(waData);
      return reply.status(400).send({ error: "Meta API error: " + (waData.error?.message || "Failed to send message") });
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: cost } }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -cost,
        type: "charge",
        description: `${service || 'Template'} message (${templateName}) sent to ${to}`,
        referenceId: waData.messages?.[0]?.id
      }
    });

    return reply.send({ success: true, messageId: waData.messages?.[0]?.id, deducted: cost });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

const start = async () => {
  try {
    const portEnv = process.env.PORT;
    if (portEnv && isNaN(Number(portEnv))) {
       await fastify.listen({ path: portEnv }); 
    } else {
       await fastify.listen({ port: Number(portEnv) || 3005, host: "0.0.0.0" });
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
