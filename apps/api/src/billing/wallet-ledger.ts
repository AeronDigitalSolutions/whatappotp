import { prisma } from "@whatsapp-otp/database";
import crypto from "crypto";
import { calculateGstBreakdown, roundInr, toPaise, fromPaise } from "./money";

export interface ReserveFundsParams {
  organizationId: string;
  amount: number;
  referenceType: "OTP" | "CAMPAIGN" | "API_DISPATCH";
  referenceId: string;
  rateId?: string;
  rateVersion?: number;
}

export interface CommitChargeParams {
  reservationId: string;
  projectId: string;
  metaMessageId: string;
  recipientPhone: string;
  destinationCountry: string;
  isoCountryCode: string;
  category: "AUTHENTICATION" | "UTILITY" | "MARKETING";
  rateId: string;
  rateVersion: number;
  sellingPrice: number;
  estimatedCost: number;
  actualCost?: number;
  description?: string;
}

export interface RechargeParams {
  organizationId: string;
  baseAmount: number; // Spendable credit in INR (excluding GST)
  paymentId: string;  // Razorpay payment ID
  orderId: string;    // Razorpay order ID
  customerBilling?: {
    legalBusinessName?: string;
    gstin?: string;
    billingAddress?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    country?: string;
  };
}

/**
 * Concurrency-safe atomic balance reservation.
 * Holds funds before dispatching to Meta WhatsApp Cloud API.
 */
export async function reserveWalletFunds(params: ReserveFundsParams) {
  const { organizationId, amount, referenceType, referenceId, rateId, rateVersion } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch or initialize wallet
    let wallet = await tx.wallet.findUnique({
      where: { organizationId }
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          balance: 0.0,
          reservedBalance: 0.0,
          currency: "INR"
        }
      });
    }

    const currentBalance = Number(wallet.balance);
    const currentReserved = Number(wallet.reservedBalance);
    const availableBalance = roundInr(currentBalance - currentReserved, 4);

    // Concurrency-safe check: available balance must cover reservation
    if (availableBalance < amount) {
      throw new Error(
        `INSUFFICIENT_WALLET_BALANCE: Available balance is ₹${availableBalance.toFixed(2)} (Total: ₹${currentBalance.toFixed(2)}, In-flight Reserved: ₹${currentReserved.toFixed(2)}). Required: ₹${amount.toFixed(2)}. Please recharge your wallet at /dashboard/wallet.`
      );
    }

    // 2. Atomically increment reserved balance
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        reservedBalance: { increment: amount }
      }
    });

    // 3. Create active reservation with 15-minute safety TTL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const reservation = await tx.walletReservation.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        amount,
        currency: "INR",
        status: "ACTIVE",
        referenceType,
        referenceId,
        rateId: rateId || null,
        rateVersion: rateVersion || null,
        expiresAt
      }
    });

    return {
      reservation,
      wallet: updatedWallet,
      availableBalance: roundInr(Number(updatedWallet.balance) - Number(updatedWallet.reservedBalance), 4)
    };
  }, { timeout: 30000, maxWait: 15000 });
}

/**
 * Commits a reservation upon confirmed Meta WhatsApp message dispatch.
 * Atomically deducts funds from balance and releases reservation.
 * Records immutable ledger entry and message billing record.
 */
export async function commitReservationAndCharge(params: CommitChargeParams) {
  return await prisma.$transaction(async (tx) => {
    // Idempotency: Check if this Meta message was already billed
    const existingBilling = await tx.messageBillingRecord.findUnique({
      where: { metaMessageId: params.metaMessageId }
    });
    if (existingBilling) {
      return { status: "ALREADY_COMMITTED", billingRecord: existingBilling };
    }

    // 1. Fetch reservation
    const reservation = await tx.walletReservation.findUnique({
      where: { id: params.reservationId }
    });

    if (!reservation) {
      throw new Error(`Reservation '${params.reservationId}' not found.`);
    }

    if (reservation.status === "COMMITTED") {
      return { status: "ALREADY_COMMITTED", reservationId: reservation.id };
    }

    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reservation '${params.reservationId}' cannot be committed (Status: ${reservation.status}).`);
    }

    const wallet = await tx.wallet.findUnique({ where: { id: reservation.walletId } });
    if (!wallet) throw new Error("Associated wallet not found.");

    const balanceBefore = Number(wallet.balance);
    const reservedBefore = Number(wallet.reservedBalance);
    const chargeAmount = Number(reservation.amount);

    const balanceAfter = roundInr(balanceBefore - chargeAmount, 2);
    const reservedAfter = Math.max(0, roundInr(reservedBefore - chargeAmount, 4));

    // 2. Atomically update wallet
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: chargeAmount },
        reservedBalance: { decrement: chargeAmount }
      }
    });

    // 3. Mark reservation committed
    await tx.walletReservation.update({
      where: { id: reservation.id },
      data: { status: "COMMITTED" }
    });

    // 4. Create Immutable Ledger Entry
    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        entryType: "DEBIT_DISPATCH",
        amount: -chargeAmount,
        balanceBefore,
        balanceAfter,
        reservedBefore,
        reservedAfter,
        currency: "INR",
        referenceType: "MESSAGE_BILLING",
        referenceId: params.metaMessageId,
        description: params.description || `${params.category} message dispatched to ${params.recipientPhone} (${params.destinationCountry})`,
        idempotencyKey: `dispatch_${params.metaMessageId}`
      }
    });

    // 5. Create Message Billing Audit Record
    const grossMargin = roundInr(params.sellingPrice - params.estimatedCost, 4);
    const marginPercent = params.sellingPrice > 0
      ? roundInr((grossMargin / params.sellingPrice) * 100, 2)
      : 0;

    const billingRecord = await tx.messageBillingRecord.create({
      data: {
        id: crypto.randomUUID(),
        projectId: params.projectId,
        metaMessageId: params.metaMessageId,
        recipientPhone: params.recipientPhone,
        destinationCountry: params.destinationCountry,
        isoCountryCode: params.isoCountryCode,
        category: params.category,
        rateId: params.rateId,
        rateVersion: params.rateVersion,
        sellingPrice: params.sellingPrice,
        estimatedCost: params.estimatedCost,
        actualCost: params.actualCost ?? params.estimatedCost,
        grossMargin,
        marginPercent,
        currency: "INR",
        status: "CHARGED",
        reservationId: reservation.id,
        ledgerEntryId: ledgerEntry.id
      }
    });

    // 6. Write legacy transaction for backward compatibility
    await tx.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        amount: -chargeAmount,
        type: "charge",
        referenceId: params.metaMessageId,
        description: params.description || `${params.category} message to ${params.recipientPhone}`
      }
    });

    return {
      status: "SUCCESS",
      billingRecord,
      ledgerEntry,
      newBalance: balanceAfter
    };
  }, { timeout: 30000, maxWait: 15000 });
}

/**
 * Releases a reservation when dispatch fails before sending or is rejected.
 * Restores reserved balance without deducting wallet credits.
 */
export async function releaseReservation(reservationId: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.walletReservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation || reservation.status !== "ACTIVE") {
      return { status: "NO_ACTION_REQUIRED" };
    }

    const wallet = await tx.wallet.findUnique({ where: { id: reservation.walletId } });
    if (!wallet) return { status: "WALLET_NOT_FOUND" };

    const reservedBefore = Number(wallet.reservedBalance);
    const releaseAmount = Number(reservation.amount);
    const reservedAfter = Math.max(0, roundInr(reservedBefore - releaseAmount, 4));

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        reservedBalance: { decrement: releaseAmount }
      }
    });

    await tx.walletReservation.update({
      where: { id: reservation.id },
      data: { status: "RELEASED" }
    });

    await tx.walletLedgerEntry.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        entryType: "CREDIT_RELEASE",
        amount: 0.0,
        balanceBefore: Number(wallet.balance),
        balanceAfter: Number(wallet.balance),
        reservedBefore,
        reservedAfter,
        currency: "INR",
        referenceType: "RESERVATION_RELEASE",
        referenceId: reservation.referenceId,
        description: `Reservation released: ${reason}`,
        reason
      }
    });

    return { status: "RELEASED", releasedAmount: releaseAmount };
  }, { timeout: 30000, maxWait: 15000 });
}

/**
 * Idempotent wallet recharge with separate GST tax calculation and GST Tax Invoice creation.
 */
export async function creditWalletWithGstInvoice(params: RechargeParams) {
  const { organizationId, baseAmount, paymentId, orderId, customerBilling } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Idempotency Check: Prevent duplicate crediting
    const existingLedger = await tx.walletLedgerEntry.findUnique({
      where: { idempotencyKey: `recharge_${paymentId}` }
    });

    if (existingLedger) {
      const existingInvoice = await tx.invoice.findFirst({ where: { paymentReference: paymentId } });
      return {
        status: "ALREADY_PROCESSED",
        credited: false,
        invoice: existingInvoice,
        ledgerEntry: existingLedger
      };
    }

    // 2. Fetch or update billing profile
    if (customerBilling) {
      await tx.customerBillingProfile.upsert({
        where: { organizationId },
        update: {
          legalBusinessName: customerBilling.legalBusinessName || undefined,
          gstin: customerBilling.gstin || undefined,
          billingAddress: customerBilling.billingAddress || undefined,
          city: customerBilling.city || undefined,
          state: customerBilling.state || undefined,
          stateCode: customerBilling.stateCode || undefined,
          country: customerBilling.country || "India"
        },
        create: {
          id: crypto.randomUUID(),
          organizationId,
          legalBusinessName: customerBilling.legalBusinessName || null,
          gstin: customerBilling.gstin || null,
          billingAddress: customerBilling.billingAddress || null,
          city: customerBilling.city || null,
          state: customerBilling.state || null,
          stateCode: customerBilling.stateCode || "27",
          country: customerBilling.country || "India"
        }
      });
    }

    const profile = await tx.customerBillingProfile.findUnique({ where: { organizationId } });
    const taxConfig = await tx.taxConfiguration.findFirst();

    const supplierState = taxConfig?.supplierStateCode || "27";
    const customerState = profile?.stateCode || "27";
    const taxRate = Number(taxConfig?.taxRatePercent || 18.00);

    // 3. Calculate GST breakdown
    const gstBreakdown = calculateGstBreakdown(
      baseAmount,
      customerState,
      supplierState,
      taxRate,
      profile?.taxExempt || false
    );

    // 4. Update Wallet Balance with Base Amount (Messaging Credits)
    const wallet = await tx.wallet.upsert({
      where: { organizationId },
      update: { balance: { increment: baseAmount } },
      create: {
        id: crypto.randomUUID(),
        organizationId,
        balance: baseAmount,
        reservedBalance: 0.0,
        currency: "INR"
      }
    });

    const balanceBefore = Number(wallet.balance) - baseAmount;
    const balanceAfter = Number(wallet.balance);

    // 5. Generate Sequential Tax Invoice
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const invoiceCount = await tx.invoice.count();
    const invoiceNumber = `INV-DB-${yearMonth}-${String(invoiceCount + 1).padStart(4, "0")}`;

    const invoice = await tx.invoice.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        invoiceNumber,
        type: "TAX_INVOICE",
        paymentReference: paymentId,
        orderId,
        baseAmount: gstBreakdown.baseAmount,
        gstRatePercent: gstBreakdown.gstRatePercent,
        cgstAmount: gstBreakdown.cgstAmount,
        sgstAmount: gstBreakdown.sgstAmount,
        igstAmount: gstBreakdown.igstAmount,
        totalTaxAmount: gstBreakdown.totalTaxAmount,
        totalAmount: gstBreakdown.totalPayableAmount,
        customerGstin: profile?.gstin || null,
        customerBusinessName: profile?.legalBusinessName || null,
        customerAddress: profile?.billingAddress || null,
        customerState: profile?.state || null,
        customerStateCode: profile?.stateCode || null,
        status: "PAID"
      }
    });

    // 6. Record Immutable Ledger Entry
    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        entryType: "CREDIT_RECHARGE",
        amount: baseAmount,
        balanceBefore,
        balanceAfter,
        reservedBefore: Number(wallet.reservedBalance),
        reservedAfter: Number(wallet.reservedBalance),
        currency: "INR",
        referenceType: "PAYMENT",
        referenceId: paymentId,
        description: `Wallet top-up of ₹${baseAmount.toFixed(2)} (GST ₹${gstBreakdown.totalTaxAmount.toFixed(2)} invoiced separately: ${invoiceNumber})`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber,
          orderId,
          totalPaidAtGateway: gstBreakdown.totalPayableAmount,
          gstBreakdown: gstBreakdown as any
        },
        idempotencyKey: `recharge_${paymentId}`
      }
    });

    // 7. Write legacy WalletTransaction for compatibility
    await tx.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        amount: baseAmount,
        type: "credit",
        referenceId: paymentId,
        description: `Razorpay Online Recharge (${invoiceNumber})`
      }
    });

    return {
      status: "SUCCESS",
      credited: true,
      newBalance: balanceAfter,
      invoice,
      ledgerEntry
    };
  }, { timeout: 30000, maxWait: 15000 });
}

export interface SubscriptionPaymentParams {
  organizationId: string;
  type: "SUBSCRIPTION" | "ADDON_SEAT" | "ADDON_OBA";
  planId?: "TRIAL" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM" | string;
  extraSeatsCount?: number;
  baseAmount: number;
  paymentId: string;
  orderId: string;
  customerBilling?: any;
}

/**
 * Idempotent subscription / add-on purchase with GST Tax Invoice creation and organization update.
 */
export async function processSubscriptionPayment(params: SubscriptionPaymentParams) {
  const { organizationId, type, planId = "BASIC", extraSeatsCount = 1, baseAmount, paymentId, orderId, customerBilling } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Idempotency Check
    const existingInvoice = await tx.invoice.findFirst({ where: { paymentReference: paymentId } });
    if (existingInvoice) {
      return {
        status: "ALREADY_PROCESSED",
        success: true,
        invoice: existingInvoice
      };
    }

    // 2. Fetch or update billing profile
    if (customerBilling) {
      await tx.customerBillingProfile.upsert({
        where: { organizationId },
        update: {
          legalBusinessName: customerBilling.legalBusinessName || undefined,
          gstin: customerBilling.gstin || undefined,
          billingAddress: customerBilling.billingAddress || undefined,
          city: customerBilling.city || undefined,
          state: customerBilling.state || undefined,
          stateCode: customerBilling.stateCode || undefined,
          country: customerBilling.country || "India"
        },
        create: {
          id: crypto.randomUUID(),
          organizationId,
          legalBusinessName: customerBilling.legalBusinessName || null,
          gstin: customerBilling.gstin || null,
          billingAddress: customerBilling.billingAddress || null,
          city: customerBilling.city || null,
          state: customerBilling.state || null,
          stateCode: customerBilling.stateCode || "27",
          country: customerBilling.country || "India"
        }
      });
    }

    const profile = await tx.customerBillingProfile.findUnique({ where: { organizationId } });
    const taxConfig = await tx.taxConfiguration.findFirst();

    const supplierState = taxConfig?.supplierStateCode || "27";
    const customerState = profile?.stateCode || "27";
    const taxRate = Number(taxConfig?.taxRatePercent || 18.00);

    // 3. Calculate GST breakdown
    const gstBreakdown = calculateGstBreakdown(
      baseAmount,
      customerState,
      supplierState,
      taxRate,
      profile?.taxExempt || false
    );

    // 4. Generate Tax Invoice Sequence
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const invoiceCount = await tx.invoice.count();
    const invoiceNumber = `INV-DB-${yearMonth}-${String(invoiceCount + 1).padStart(4, "0")}`;

    let description = "";
    if (type === "SUBSCRIPTION") {
      description = `Digital Beings Platform Subscription: ${planId} Plan (30 Days)`;
    } else if (type === "ADDON_SEAT") {
      description = `Digital Beings Add-on: ${extraSeatsCount} Additional Team Seat(s)`;
    } else if (type === "ADDON_OBA") {
      description = `Official Business Account (Green Tick) Verification Fee`;
    }

    const invoice = await tx.invoice.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        invoiceNumber,
        type: "TAX_INVOICE",
        paymentReference: paymentId,
        orderId,
        baseAmount: gstBreakdown.baseAmount,
        gstRatePercent: gstBreakdown.gstRatePercent,
        cgstAmount: gstBreakdown.cgstAmount,
        sgstAmount: gstBreakdown.sgstAmount,
        igstAmount: gstBreakdown.igstAmount,
        totalTaxAmount: gstBreakdown.totalTaxAmount,
        totalAmount: gstBreakdown.totalPayableAmount,
        customerGstin: profile?.gstin || null,
        customerBusinessName: profile?.legalBusinessName || null,
        customerAddress: profile?.billingAddress || null,
        customerState: profile?.state || null,
        customerStateCode: profile?.stateCode || null,
        status: "PAID"
      }
    });

    // 5. Update Organization state according to user rules
    const org = await tx.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error(`Organization ${organizationId} not found`);

    if (type === "SUBSCRIPTION") {
      const seats = planId === "TRIAL" ? 1 : planId === "BASIC" ? 4 : (planId === "ENTERPRISE" || planId === "CUSTOM") ? 99 : 6;
      const currentExpiry = org.planExpiresAt && new Date(org.planExpiresAt) > now ? new Date(org.planExpiresAt) : now;
      const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

      await tx.organization.update({
        where: { id: organizationId },
        data: {
          plan: planId,
          seatsAllowed: seats,
          planExpiresAt: newExpiry,
          obaIncluded: (planId === "PROFESSIONAL" || planId === "ENTERPRISE" || planId === "CUSTOM") ? true : org.obaIncluded
        }
      });

      // Bundled Starter Fuel Credits:
      // ₹500 Trial: ₹0 (No wallet value)
      // ₹1,000 Basic: ₹50 wallet balance
      // ₹2,500 Professional: ₹100 wallet balance
      // Enterprise / Custom: ₹250 wallet balance
      const bonusFuel = planId === "BASIC" ? 50.0 : planId === "PROFESSIONAL" ? 100.0 : (planId === "ENTERPRISE" || planId === "CUSTOM") ? 250.0 : 0.0;
      if (bonusFuel > 0) {
        const wallet = await tx.wallet.upsert({
          where: { organizationId },
          update: { balance: { increment: bonusFuel } },
          create: {
            id: crypto.randomUUID(),
            organizationId,
            balance: bonusFuel,
            reservedBalance: 0.0,
            currency: "INR"
          }
        });

        const balanceBefore = Number(wallet.balance) - bonusFuel;
        const balanceAfter = Number(wallet.balance);

        await tx.walletLedgerEntry.create({
          data: {
            id: crypto.randomUUID(),
            walletId: wallet.id,
            entryType: "CREDIT_RECHARGE",
            amount: bonusFuel,
            balanceBefore,
            balanceAfter,
            reservedBefore: Number(wallet.reservedBalance),
            reservedAfter: Number(wallet.reservedBalance),
            currency: "INR",
            referenceType: "SUBSCRIPTION_BONUS",
            referenceId: paymentId,
            description: `Bundled Starter OTP Credit: ₹${bonusFuel.toFixed(2)} included with ${planId} Plan activation`,
            metadata: {
              planId,
              orderId,
              invoiceId: invoice.id
            },
            idempotencyKey: `sub_bonus_${paymentId}`
          }
        });

        await tx.walletTransaction.create({
          data: {
            id: crypto.randomUUID(),
            walletId: wallet.id,
            amount: bonusFuel,
            type: "credit",
            referenceId: paymentId,
            description: `Starter OTP Fuel Credit (${planId} Plan Bonus)`
          }
        });
      }
    } else if (type === "ADDON_SEAT") {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          extraSeats: { increment: extraSeatsCount || 1 }
        }
      });
    } else if (type === "ADDON_OBA") {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          obaIncluded: true
        }
      });
    }

    return {
      status: "SUCCESS",
      success: true,
      type,
      planId,
      invoice,
      description
    };
  }, { timeout: 30000, maxWait: 15000 });
}

/**
 * Administrative balance adjustment with mandatory audit reason.
 * Records compensating ledger entry rather than mutating historical records.
 */
export async function recordAdminAdjustment(params: {
  organizationId: string;
  amount: number; // Positive to credit, negative to debit
  reason: string;
  adminEmail: string;
}) {
  const { organizationId, amount, reason, adminEmail } = params;
  if (!reason || reason.trim().length < 5) {
    throw new Error("A detailed audit reason (at least 5 characters) is mandatory for financial adjustments.");
  }

  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { organizationId } });
    if (!wallet) throw new Error("Wallet not found for organization.");

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = roundInr(balanceBefore + amount, 2);

    if (balanceAfter < 0) {
      throw new Error(`Adjustment of ₹${amount} would result in negative wallet balance (Current: ₹${balanceBefore}).`);
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } }
    });

    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        entryType: "ADJUSTMENT",
        amount,
        balanceBefore,
        balanceAfter,
        reservedBefore: Number(wallet.reservedBalance),
        reservedAfter: Number(wallet.reservedBalance),
        currency: "INR",
        referenceType: "ADMIN_ADJUSTMENT",
        referenceId: `adj_${Date.now()}`,
        description: `Administrative adjustment: ${amount > 0 ? '+' : ''}₹${amount.toFixed(2)} by ${adminEmail}`,
        reason,
        metadata: { adminEmail }
      }
    });

    await tx.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        amount,
        type: amount > 0 ? "credit" : "charge",
        description: `Admin adjustment: ${reason}`
      }
    });

    return {
      status: "SUCCESS",
      newBalance: balanceAfter,
      ledgerEntry
    };
  }, { timeout: 30000, maxWait: 15000 });
}

/**
 * Automated reconciliation service:
 * Finds and auto-releases stale/orphaned reservations (older than 15 minutes).
 */
export async function reconcileStaleReservations() {
  const now = new Date();
  const staleReservations = await prisma.walletReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now }
    }
  });

  const results = [];
  for (const res of staleReservations) {
    try {
      const releaseResult = await releaseReservation(res.id, "AUTO_EXPIRED_STALE_RESERVATION");
      results.push({ id: res.id, amount: Number(res.amount), result: releaseResult });
    } catch (err: any) {
      console.error(`Failed to auto-release stale reservation ${res.id}:`, err);
    }
  }

  return {
    reconciledCount: results.length,
    reservations: results
  };
}

/**
 * Reconciles message delivery failures reported by Meta WhatsApp webhooks.
 * Refunds wallet balance with an immutable ledger credit entry if eligible and not already refunded.
 */
export async function refundFailedMessageDelivery(params: {
  metaMessageId: string;
  failureReason: string;
  rawWebhookData?: any;
}) {
  const { metaMessageId, failureReason, rawWebhookData } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch message billing record
    const billingRecord = await tx.messageBillingRecord.findUnique({
      where: { metaMessageId }
    });

    if (!billingRecord) {
      return { status: "MESSAGE_NOT_FOUND" };
    }

    if (billingRecord.status === "REFUNDED") {
      return { status: "ALREADY_REFUNDED", billingRecord };
    }

    // 2. Fetch associated wallet
    const project = await tx.project.findUnique({
      where: { id: billingRecord.projectId },
      include: { organization: { include: { wallet: true } } }
    });

    const wallet = project?.organization?.wallet;
    if (!wallet) {
      return { status: "WALLET_NOT_FOUND" };
    }

    const refundAmount = Number(billingRecord.sellingPrice);
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = roundInr(balanceBefore + refundAmount, 2);

    // 3. Atomically refund wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: refundAmount } }
    });

    // 4. Mark billing record as refunded
    await tx.messageBillingRecord.update({
      where: { id: billingRecord.id },
      data: { 
        status: "REFUNDED",
        reconciledAt: new Date(),
        reconciliationNotes: `Refunded due to Meta delivery failure: ${failureReason}`
      }
    });

    // 5. Create immutable double-entry ledger record
    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        entryType: "REFUND",
        amount: refundAmount,
        balanceBefore,
        balanceAfter,
        reservedBefore: Number(wallet.reservedBalance),
        reservedAfter: Number(wallet.reservedBalance),
        currency: "INR",
        referenceType: "DELIVERY_FAILURE_REFUND",
        referenceId: metaMessageId,
        description: `Refund for delivery failure on message ${metaMessageId}: ${failureReason}`,
        reason: failureReason,
        metadata: rawWebhookData || undefined,
        idempotencyKey: `refund_${metaMessageId}`
      }
    });

    // 6. Write legacy transaction for backwards compatibility
    await tx.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        amount: refundAmount,
        type: "refund",
        referenceId: metaMessageId,
        description: `Refund: ${failureReason}`
      }
    });

    return {
      status: "SUCCESS",
      refundedAmount: refundAmount,
      balanceAfter,
      ledgerEntry
    };
  }, { timeout: 30000, maxWait: 15000 });
}

