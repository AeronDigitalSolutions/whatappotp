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
  const { projectId, phoneId, service, services, isDefault } = request.body;
  if (!projectId || !phoneId) {
    return reply.status(400).send({ error: "Missing required fields (projectId, phoneId)" });
  }

  try {
    // Format service as comma-separated string if passed as array
    let serviceStr = "";
    if (Array.isArray(services)) {
      serviceStr = services.join(",");
    } else if (typeof service === "string") {
      serviceStr = service;
    }

    const updated = await prisma.phoneNumber.update({
      where: { projectId_phoneId: { projectId, phoneId } },
      data: {
        service: serviceStr,
        ...(isDefault !== undefined ? { isDefault: !!isDefault } : {})
      }
    });

    // If OTP/Authentication service is included and this is primary or project metaPhoneId is not set
    if (serviceStr.includes("AUTHENTICATION")) {
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

// ==========================================
// --- MODULE 3: API KEYS MANAGEMENT ---
// ==========================================

fastify.get("/v1/api-keys/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  try {
    const keys = await prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        lastUsed: true,
        revokedAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    return reply.send({ success: true, keys });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch API keys" });
  }
});

fastify.post("/v1/api-keys/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  const { name, environment } = request.body || {};
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return reply.status(404).send({ error: "Project not found" });

    const envTag = environment === "test" ? "test" : "live";
    const randomHex = crypto.randomBytes(24).toString("hex");
    const rawSecret = `wotp_${envTag}_${randomHex}`;
    const prefix = `${rawSecret.substring(0, 14)}...`;
    const keyHash = crypto.createHash("sha256").update(rawSecret).digest("hex");

    const newKey = await prisma.apiKey.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        name: name?.trim() || `${envTag === "test" ? "Development" : "Production"} API Key`,
        prefix,
        keyHash
      }
    });

    return reply.send({
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        prefix: newKey.prefix,
        createdAt: newKey.createdAt,
        secretKey: rawSecret
      }
    });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to create API key" });
  }
});

fastify.delete("/v1/api-keys/:projectId/:keyId", async (request: any, reply) => {
  const { projectId, keyId } = request.params;
  try {
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, projectId } });
    if (!key) return reply.status(404).send({ error: "API key not found" });

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() }
    });

    return reply.send({ success: true, message: "API key revoked successfully" });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to revoke API key" });
  }
});

// ==========================================
// --- MODULE 4: DEVELOPER OTP LIFECYCLE ---
// ==========================================

// Helper: Authenticate requests using API key or Dashboard Session
async function resolveProjectContext(request: any) {
  const authHeader = request.headers.authorization || request.headers["x-api-key"];
  const bodyProjectId = request.body?.projectId || request.query?.projectId;

  if (authHeader) {
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (rawKey.startsWith("wotp_")) {
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          project: {
            include: {
              organization: { include: { wallet: true } },
              phoneNumbers: true
            }
          }
        }
      });

      if (!apiKeyRecord) {
        throw new Error("Invalid API key provided");
      }
      if (apiKeyRecord.revokedAt) {
        throw new Error("API key has been revoked");
      }

      // Update lastUsed asynchronously
      prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsed: new Date() }
      }).catch(() => {});

      return { project: apiKeyRecord.project, apiKey: apiKeyRecord };
    }
  }

  // Fallback to body / query projectId for UI dashboard operations
  if (bodyProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: bodyProjectId },
      include: {
        organization: { include: { wallet: true } },
        phoneNumbers: true
      }
    });
    if (project) return { project, apiKey: null };
  }

  throw new Error("Authentication failed. Please provide a valid 'Authorization: Bearer wotp_...' header or a valid projectId.");
}

// POST /v1/otp/send - Generate and dispatch OTP
fastify.post("/v1/otp/send", async (request: any, reply) => {
  try {
    const { project } = await resolveProjectContext(request);
    const {
      phone,
      to,
      length = 6,
      expiryMinutes = 10,
      purpose = "AUTHENTICATION",
      reference,
      templateName,
      simulate = false
    } = request.body || {};

    const rawPhone = (phone || to || "").toString().trim();
    if (!rawPhone) {
      return reply.status(400).send({ error: "Missing required 'phone' parameter" });
    }

    // Clean phone number (strip whitespace, hyphens, parentheses)
    let cleanPhone = rawPhone.replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone.startsWith("+")) {
      // Default to India (+91) if 10 digits
      if (cleanPhone.length === 10) cleanPhone = `+91${cleanPhone}`;
      else cleanPhone = `+${cleanPhone}`;
    }

    // Check wallet balance (standard OTP rate is ₹0.50)
    const wallet = project.organization?.wallet;
    const otpCost = 0.50;
    if (!wallet || Number(wallet.balance) < otpCost) {
      return reply.status(402).send({
        error: `Insufficient wallet balance (Current: ₹${Number(wallet?.balance || 0).toFixed(2)}). Required: ₹${otpCost.toFixed(2)}. Please recharge your wallet at /dashboard/wallet.`
      });
    }

    // Generate secure numeric OTP
    const numDigits = Math.max(4, Math.min(8, Number(length) || 6));
    const minVal = Math.pow(10, numDigits - 1);
    const maxVal = Math.pow(10, numDigits) - 1;
    const otpCode = crypto.randomInt(minVal, maxVal + 1).toString();

    // Securely hash OTP for storage
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + Math.max(1, Number(expiryMinutes) || 10) * 60 * 1000);

    // Resolve designated sender phone number
    let targetPhoneId = project.metaPhoneId;
    if (project.phoneNumbers && project.phoneNumbers.length > 0) {
      const designated = project.phoneNumbers.find(p => p.service === "AUTHENTICATION" && p.isDefault) ||
                         project.phoneNumbers.find(p => p.service === "AUTHENTICATION") ||
                         project.phoneNumbers[0];
      if (designated) targetPhoneId = designated.phoneId;
    }

    const tplName = templateName || "otp_verification";

    // Create OTP request record in DB (status: queued)
    const otpRequest = await prisma.otpRequest.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        phone: cleanPhone,
        channel: "whatsapp",
        otpHash,
        expiresAt,
        status: "queued",
        purpose: purpose || "AUTHENTICATION",
        reference: reference || null,
        metadata: { length: numDigits, templateName: tplName }
      }
    });

    // If simulate flag or development bypass is enabled
    if (simulate || !project.metaAccessToken || !targetPhoneId) {
      // Deduct wallet for simulated test
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: otpCost } }
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -otpCost,
          type: "charge",
          description: `Simulated OTP sent to ${cleanPhone}`,
          referenceId: otpRequest.id
        }
      });

      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "sent" }
      });

      return reply.send({
        success: true,
        requestId: otpRequest.id,
        phone: cleanPhone,
        channel: "whatsapp",
        status: "sent",
        expiresAt,
        cost: otpCost,
        devCode: otpCode, // Provided in simulation for developer convenience
        note: "Simulated delivery (dev mode)"
      });
    }

    // Call Meta Cloud API for live delivery
    const waUrl = `https://graph.facebook.com/v19.0/${targetPhoneId}/messages`;
    const waPayload = {
      messaging_product: "whatsapp",
      to: cleanPhone.replace("+", ""),
      type: "template",
      template: {
        name: tplName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otpCode }]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: otpCode }]
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
      body: JSON.stringify(waPayload)
    });

    const waData = await waRes.json();

    if (!waRes.ok || waData.error) {
      const errMsg = waData.error?.message || "Failed to dispatch via Meta WhatsApp Cloud API";
      fastify.log.warn(`Meta OTP send failed: ${errMsg}`);

      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "failed", metadata: { error: errMsg, raw: waData } }
      });

      return reply.status(400).send({
        success: false,
        requestId: otpRequest.id,
        status: "failed",
        error: errMsg,
        hint: "In Meta Development Mode, ensure the recipient phone number is added to WhatsApp Test Numbers in Meta Developer Portal (App Roles / WhatsApp > API Setup)."
      });
    }

    // Meta Success: Deduct wallet & record transaction
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: otpCost } }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -otpCost,
        type: "charge",
        description: `OTP sent to ${cleanPhone}`,
        referenceId: waData.messages?.[0]?.id || otpRequest.id
      }
    });

    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { status: "sent", reference: waData.messages?.[0]?.id || null }
    });

    return reply.send({
      success: true,
      requestId: otpRequest.id,
      phone: cleanPhone,
      channel: "whatsapp",
      status: "sent",
      expiresAt,
      cost: otpCost,
      messageId: waData.messages?.[0]?.id
    });

  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(error.message?.includes("Authentication") ? 401 : 500).send({
      error: error.message || "Failed to send OTP"
    });
  }
});

// POST /v1/otp/verify - Verify user-submitted OTP code
fastify.post("/v1/otp/verify", async (request: any, reply) => {
  const { requestId, code, phone } = request.body || {};

  if (!requestId || !code) {
    return reply.status(400).send({ error: "Missing required fields: 'requestId' and 'code'" });
  }

  try {
    const otpRequest = await prisma.otpRequest.findUnique({
      where: { id: requestId },
      include: { otpAttempts: true }
    });

    if (!otpRequest) {
      return reply.status(404).send({ error: "OTP request not found or invalid requestId" });
    }

    if (phone) {
      const cleanPhone = phone.toString().replace(/[\s\-\(\)]/g, "");
      const reqPhone = otpRequest.phone.replace(/[\s\-\(\)]/g, "");
      if (!reqPhone.endsWith(cleanPhone.replace("+", "")) && !cleanPhone.endsWith(reqPhone.replace("+", ""))) {
        return reply.status(400).send({ error: "Phone number does not match OTP request" });
      }
    }

    if (otpRequest.status === "verified") {
      return reply.status(400).send({
        error: "This OTP has already been verified",
        verified: true,
        status: "verified"
      });
    }

    if (otpRequest.status === "expired" || new Date() > otpRequest.expiresAt) {
      if (otpRequest.status !== "expired") {
        await prisma.otpRequest.update({
          where: { id: otpRequest.id },
          data: { status: "expired" }
        });
      }
      return reply.status(400).send({
        error: "This OTP has expired. Please request a new one.",
        verified: false,
        status: "expired"
      });
    }

    if (otpRequest.attempts >= otpRequest.maxAttempts) {
      return reply.status(429).send({
        error: "Maximum verification attempts exceeded. Please request a new OTP.",
        verified: false,
        status: "locked"
      });
    }

    // Verify code hash
    const inputHash = crypto.createHash("sha256").update(code.toString().trim()).digest("hex");
    const isMatch = inputHash === otpRequest.otpHash;
    const clientIp = request.ip || request.headers["x-forwarded-for"] || "127.0.0.1";

    if (isMatch) {
      // Mark as verified
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: {
          status: "verified",
          attempts: { increment: 1 }
        }
      });

      await prisma.otpAttempt.create({
        data: {
          id: crypto.randomUUID(),
          otpRequestId: otpRequest.id,
          codeProvided: "******",
          successful: true,
          ipAddress: String(clientIp)
        }
      });

      return reply.send({
        success: true,
        verified: true,
        message: "OTP verified successfully",
        requestId: otpRequest.id,
        phone: otpRequest.phone
      });
    } else {
      // Failed attempt
      const newAttempts = otpRequest.attempts + 1;
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { attempts: newAttempts }
      });

      await prisma.otpAttempt.create({
        data: {
          id: crypto.randomUUID(),
          otpRequestId: otpRequest.id,
          codeProvided: "******",
          successful: false,
          ipAddress: String(clientIp)
        }
      });

      const remaining = Math.max(0, otpRequest.maxAttempts - newAttempts);
      return reply.status(400).send({
        success: false,
        verified: false,
        error: "Incorrect OTP code",
        remainingAttempts: remaining
      });
    }

  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to process verification" });
  }
});

// GET /v1/otp/logs/:projectId - Real-time OTP delivery & verification logs
fastify.get("/v1/otp/logs/:projectId", async (request: any, reply) => {
  const { projectId } = request.params;
  const { status, limit = 100 } = request.query || {};

  try {
    const whereClause: any = { projectId };
    if (status && status !== "ALL") {
      whereClause.status = status.toLowerCase();
    }

    const requests = await prisma.otpRequest.findMany({
      where: whereClause,
      include: {
        otpAttempts: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(200, Number(limit) || 100)
    });

    const logs = requests.map(r => ({
      id: r.id,
      phone: r.phone,
      channel: r.channel || "whatsapp",
      status: r.status,
      purpose: r.purpose || "AUTHENTICATION",
      reference: r.reference,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      attempts: r.attempts,
      maxAttempts: r.maxAttempts,
      cost: r.status === "failed" ? 0.00 : 0.50,
      attemptsHistory: r.otpAttempts.map(a => ({
        id: a.id,
        successful: a.successful,
        createdAt: a.createdAt,
        ipAddress: a.ipAddress
      }))
    }));

    return reply.send({ success: true, logs });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch OTP logs" });
  }
});

// POST /v1/otp/resend - Resend an existing OTP
fastify.post("/v1/otp/resend", async (request: any, reply) => {
  const { requestId } = request.body || {};
  if (!requestId) return reply.status(400).send({ error: "Missing 'requestId'" });

  try {
    const original = await prisma.otpRequest.findUnique({
      where: { id: requestId },
      include: {
        project: {
          include: {
            organization: { include: { wallet: true } },
            phoneNumbers: true
          }
        }
      }
    });

    if (!original) return reply.status(404).send({ error: "Original OTP request not found" });
    if (original.status === "verified") return reply.status(400).send({ error: "Cannot resend an already verified OTP" });

    // Generate fresh code
    const length = (original.metadata as any)?.length || 6;
    const minVal = Math.pow(10, length - 1);
    const maxVal = Math.pow(10, length) - 1;
    const newCode = crypto.randomInt(minVal, maxVal + 1).toString();
    const newHash = crypto.createHash("sha256").update(newCode).digest("hex");
    const newExpires = new Date(Date.now() + 10 * 60 * 1000);

    const project = original.project;
    let targetPhoneId = project.metaPhoneId;
    if (project.phoneNumbers && project.phoneNumbers.length > 0) {
      const designated = project.phoneNumbers.find(p => p.service === "AUTHENTICATION" && p.isDefault) ||
                         project.phoneNumbers.find(p => p.service === "AUTHENTICATION") ||
                         project.phoneNumbers[0];
      if (designated) targetPhoneId = designated.phoneId;
    }

    const tplName = (original.metadata as any)?.templateName || "otp_verification";

    // Call Meta
    if (project.metaAccessToken && targetPhoneId) {
      const waUrl = `https://graph.facebook.com/v19.0/${targetPhoneId}/messages`;
      await fetch(waUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${project.metaAccessToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: original.phone.replace("+", ""),
          type: "template",
          template: {
            name: tplName,
            language: { code: "en_US" },
            components: [
              { type: "body", parameters: [{ type: "text", text: newCode }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: newCode }] }
            ]
          }
        })
      });
    }

    await prisma.otpRequest.update({
      where: { id: original.id },
      data: {
        otpHash: newHash,
        expiresAt: newExpires,
        resendAt: new Date(),
        status: "sent"
      }
    });

    return reply.send({ success: true, message: "OTP resent successfully", expiresAt: newExpires });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to resend OTP" });
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
