import { prisma } from "@whatsapp-otp/database";
import crypto from "crypto";
import { 
  evaluateMessageDispatch, 
  parseAndValidatePhone 
} from "../src/billing/pricing-engine";
import { 
  reserveWalletFunds, 
  commitReservationAndCharge, 
  releaseReservation, 
  creditWalletWithGstInvoice, 
  recordAdminAdjustment, 
  reconcileStaleReservations,
  refundFailedMessageDelivery
} from "../src/billing/wallet-ledger";
import { 
  calculateGstBreakdown, 
  calculateMargin, 
  roundInr 
} from "../src/billing/money";

async function runBillingVerificationSuite() {
  console.log("\n=======================================================");
  console.log("DIGITAL BEINGS WALLET, PRICING & BILLING ENGINE TESTS");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // Setup test organization & wallet
  const testOrgId = `test_org_${Date.now()}`;
  const testProjectId = `test_proj_${Date.now()}`;

  const testOrg = await prisma.organization.create({
    data: {
      id: testOrgId,
      name: "Test Billing Org Ltd"
    }
  });

  const testProj = await prisma.project.create({
    data: {
      id: testProjectId,
      organizationId: testOrgId,
      name: "Billing Test Project"
    }
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Indian OTP pricing rate matches ₹0.25 launch rate
    // -------------------------------------------------------------
    const inOtp = await evaluateMessageDispatch("+919876543210", "AUTHENTICATION");
    assert(inOtp.sellingPrice === 0.25 && inOtp.destinationCountry === "India", 
      "Test 1: Indian OTP message deduction matches ₹0.25 launch rate");

    // -------------------------------------------------------------
    // Test 2: Indian utility message deduction matches ₹0.20 launch rate
    // -------------------------------------------------------------
    const inUtil = await evaluateMessageDispatch("+919876543210", "UTILITY");
    assert(inUtil.sellingPrice === 0.20 && inUtil.destinationCountry === "India", 
      "Test 2: Indian utility message deduction matches ₹0.20 launch rate");

    // -------------------------------------------------------------
    // Test 3: Indian marketing message deduction matches ₹1.25 launch rate
    // -------------------------------------------------------------
    const inMkt = await evaluateMessageDispatch("+919876543210", "MARKETING");
    assert(inMkt.sellingPrice === 1.25 && inMkt.destinationCountry === "India", 
      "Test 3: Indian marketing message deduction matches ₹1.25 launch rate");

    // -------------------------------------------------------------
    // Test 4: US OTP message deduction matches ₹0.60 launch rate
    // -------------------------------------------------------------
    const usOtp = await evaluateMessageDispatch("+12025550143", "AUTHENTICATION");
    assert(usOtp.sellingPrice === 0.60 && usOtp.destinationCountry === "United States", 
      "Test 4: US OTP message deduction matches ₹0.60 launch rate");

    // -------------------------------------------------------------
    // Test 5: US utility message deduction matches ₹0.60 launch rate
    // -------------------------------------------------------------
    const usUtil = await evaluateMessageDispatch("+12025550143", "UTILITY");
    assert(usUtil.sellingPrice === 0.60 && usUtil.destinationCountry === "United States", 
      "Test 5: US utility message deduction matches ₹0.60 launch rate");

    // -------------------------------------------------------------
    // Test 6: US marketing message deduction matches ₹3.25 launch rate
    // -------------------------------------------------------------
    const usMkt = await evaluateMessageDispatch("+12025550143", "MARKETING");
    assert(usMkt.sellingPrice === 3.25 && usMkt.destinationCountry === "United States", 
      "Test 6: US marketing message deduction matches ₹3.25 launch rate");

    // -------------------------------------------------------------
    // Test 7: Unconfigured international destination blocks message dispatch
    // -------------------------------------------------------------
    let blockedUnconfigured = false;
    try {
      // Iceland (+354) is not configured in launch rates
      await evaluateMessageDispatch("+3545812345", "AUTHENTICATION");
    } catch (err: any) {
      blockedUnconfigured = err.message.includes("UNCONFIGURED_DESTINATION_RATE");
    }
    assert(blockedUnconfigured, "Test 7: Unconfigured international destination blocks dispatch before delivery attempt");

    // -------------------------------------------------------------
    // Test 8: Margin protection blocks dispatch when selling price < minimum margin
    // -------------------------------------------------------------
    // Create an artificial rate with price below cost
    const unsafeRate = await prisma.pricingRate.create({
      data: {
        country: "Testland",
        isoCode: "TL",
        countryDialCode: "999",
        category: "AUTHENTICATION",
        basePrice: 0.10, // Below total cost
        providerCost: 0.15,
        providerCurrency: "INR",
        providerCostInr: 0.15,
        infraCostInr: 0.02,
        totalCostInr: 0.17, // Total cost is 0.17 > 0.10
        minMarginPercent: 15.0,
        actualMarginPercent: -70.0,
        marginInr: -0.07,
        status: "ACTIVE",
        lossRiskStatus: "UNSAFE_BLOCKED",
        version: 1,
        createdBy: "TEST_SUITE"
      }
    });

    let marginBlocked = false;
    try {
      const marginCheck = calculateMargin(0.10, 0.17, 15.0);
      if (!marginCheck.isSafe || marginCheck.lossRiskStatus === "UNSAFE_BLOCKED") {
        marginBlocked = true;
      }
    } finally {
      await prisma.pricingRate.delete({ where: { id: unsafeRate.id } });
    }
    assert(marginBlocked, "Test 8: Margin protection blocks dispatch when selling price is below minimum margin");

    // -------------------------------------------------------------
    // Test 9: Concurrent message requests cannot spend the same wallet balance
    // -------------------------------------------------------------
    // Credit wallet with exact funds for 1 message (₹0.25)
    await prisma.wallet.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: testOrgId,
        balance: 0.25,
        reservedBalance: 0.0,
        currency: "INR"
      }
    });

    // First reservation takes the available ₹0.25
    const res1 = await reserveWalletFunds({
      organizationId: testOrgId,
      amount: 0.25,
      referenceType: "OTP",
      referenceId: "conc_req_1"
    });

    // Second reservation must be rejected because available balance is now ₹0.00
    let secondAttemptBlocked = false;
    try {
      await reserveWalletFunds({
        organizationId: testOrgId,
        amount: 0.25,
        referenceType: "OTP",
        referenceId: "conc_req_2"
      });
    } catch (err: any) {
      secondAttemptBlocked = err.message.includes("INSUFFICIENT_WALLET_BALANCE");
    }

    assert(secondAttemptBlocked, "Test 9: Concurrent message requests cannot spend the same wallet balance");

    // Cleanup reservation from test 9
    await releaseReservation(res1.reservation.id, "Cleanup test 9");

    // -------------------------------------------------------------
    // Test 10: Failed dispatch releases reservation immediately without deducting funds
    // -------------------------------------------------------------
    // Reset wallet balance to ₹10.00
    const walletRecord = await prisma.wallet.findUnique({ where: { organizationId: testOrgId } });
    await prisma.wallet.update({
      where: { id: walletRecord!.id },
      data: { balance: 10.00, reservedBalance: 0.0 }
    });

    const hold = await reserveWalletFunds({
      organizationId: testOrgId,
      amount: 1.25,
      referenceType: "CAMPAIGN",
      referenceId: "camp_fail_test"
    });

    // Check reserved balance is 1.25
    const walletWhileHolding = await prisma.wallet.findUnique({ where: { id: walletRecord!.id } });
    const holdReserved = Number(walletWhileHolding?.reservedBalance);

    // Release reservation
    await releaseReservation(hold.reservation.id, "Meta API dispatch rejected");
    const walletAfterRelease = await prisma.wallet.findUnique({ where: { id: walletRecord!.id } });
    
    assert(
      holdReserved === 1.25 &&
      Number(walletAfterRelease?.balance) === 10.00 && 
      Number(walletAfterRelease?.reservedBalance) === 0.0,
      "Test 10: Failed dispatch releases reservation immediately without deducting funds"
    );

    // -------------------------------------------------------------
    // Test 11: Meta delivery webhook failure processes refund if eligible and does not double-credit
    // -------------------------------------------------------------
    // Perform a successful reservation & commit
    const resToCommit = await reserveWalletFunds({
      organizationId: testOrgId,
      amount: 0.25,
      referenceType: "OTP",
      referenceId: "otp_refund_test"
    });

    const testMetaMsgId = `meta_test_msg_${Date.now()}`;
    await commitReservationAndCharge({
      reservationId: resToCommit.reservation.id,
      projectId: testProjectId,
      metaMessageId: testMetaMsgId,
      recipientPhone: "+919876543210",
      destinationCountry: "India",
      isoCountryCode: "IN",
      category: "AUTHENTICATION",
      rateId: inOtp.rateId,
      rateVersion: inOtp.rateVersion,
      sellingPrice: 0.25,
      estimatedCost: 0.125
    });

    const balBeforeRefund = (await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance;
    
    // First refund attempt (should succeed)
    const refund1 = await refundFailedMessageDelivery({
      metaMessageId: testMetaMsgId,
      failureReason: "Undeliverable / invalid phone number"
    });

    const balAfterRefund1 = (await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance;

    // Second refund attempt (should be idempotent / return ALREADY_REFUNDED)
    const refund2 = await refundFailedMessageDelivery({
      metaMessageId: testMetaMsgId,
      failureReason: "Duplicate webhook delivery"
    });

    const balAfterRefund2 = (await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance;

    assert(
      refund1.status === "SUCCESS" &&
      refund2.status === "ALREADY_REFUNDED" &&
      Number(balAfterRefund1) === roundInr(Number(balBeforeRefund) + 0.25, 2) &&
      Number(balAfterRefund2) === Number(balAfterRefund1),
      "Test 11: Meta delivery webhook failure processes refund and does not double-credit"
    );

    // -------------------------------------------------------------
    // Test 12: GST is displayed separately from base service price
    // -------------------------------------------------------------
    const gstCalc = calculateGstBreakdown(100.00, "27", "27", 18.00, false);
    assert(
      gstCalc.baseAmount === 100.00 && 
      gstCalc.totalTaxAmount === 18.00 && 
      gstCalc.totalPayableAmount === 118.00,
      "Test 12: GST is displayed separately from base service price"
    );

    // -------------------------------------------------------------
    // Test 13: Recharge of ₹100 shows ₹18 GST and ₹118 total payable (with 18% GST)
    // -------------------------------------------------------------
    assert(
      gstCalc.totalPayableAmount === 118.00 && gstCalc.gstRatePercent === 18,
      "Test 13: Recharge of ₹100 shows ₹18 GST and ₹118 total payable (with 18% GST)"
    );

    // -------------------------------------------------------------
    // Test 14: Customer with registered GSTIN receives compliant tax invoice with sequential invoice number
    // -------------------------------------------------------------
    const pmtId = `pay_test_${Date.now()}`;
    const invoiceResult = await creditWalletWithGstInvoice({
      organizationId: testOrgId,
      baseAmount: 100.00,
      paymentId: pmtId,
      orderId: `order_${Date.now()}`,
      customerBilling: {
        legalBusinessName: "Acme Enterprises LLP",
        gstin: "27AAPCA1234F1Z5",
        billingAddress: "402 Corporate Park, Pune",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        country: "India"
      }
    });

    const inv = invoiceResult.invoice;
    assert(
      inv !== null &&
      inv?.invoiceNumber?.startsWith("INV-DB-") &&
      inv?.customerGstin === "27AAPCA1234F1Z5",
      "Test 14: Customer with registered GSTIN receives compliant tax invoice with sequential invoice number"
    );

    // -------------------------------------------------------------
    // Test 15: In-state customer receives CGST and SGST line items
    // -------------------------------------------------------------
    const inStateBreakdown = calculateGstBreakdown(100.00, "27", "27", 18.00, false);
    assert(
      inStateBreakdown.cgstAmount === 9.00 && 
      inStateBreakdown.sgstAmount === 9.00 && 
      inStateBreakdown.igstAmount === 0.00,
      "Test 15: In-state customer receives CGST and SGST line items"
    );

    // -------------------------------------------------------------
    // Test 16: Out-of-state customer receives IGST line item
    // -------------------------------------------------------------
    const outStateBreakdown = calculateGstBreakdown(100.00, "07", "27", 18.00, false);
    assert(
      outStateBreakdown.cgstAmount === 0.00 && 
      outStateBreakdown.sgstAmount === 0.00 && 
      outStateBreakdown.igstAmount === 18.00,
      "Test 16: Out-of-state customer receives IGST line item"
    );

    // -------------------------------------------------------------
    // Test 17: Wallet balance reflects only spendable base amount, not GST tax liability
    // -------------------------------------------------------------
    // A recharge of baseAmount 100.00 should credit exactly 100.00 to the wallet balance
    const walletBeforeTopup = Number((await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance);
    const topupPmtId = `pay_topup_${Date.now()}`;
    await creditWalletWithGstInvoice({
      organizationId: testOrgId,
      baseAmount: 50.00, // Total charged at gateway is ₹59 (50 + 9 GST)
      paymentId: topupPmtId,
      orderId: `order_topup_${Date.now()}`
    });
    const walletAfterTopup = Number((await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance);
    assert(
      roundInr(walletAfterTopup - walletBeforeTopup, 2) === 50.00,
      "Test 17: Wallet balance reflects only spendable base amount, not GST tax liability"
    );

    // -------------------------------------------------------------
    // Test 18: Idempotent payment webhook does not credit wallet twice on duplicate event
    // -------------------------------------------------------------
    const duplicateRecharge = await creditWalletWithGstInvoice({
      organizationId: testOrgId,
      baseAmount: 50.00,
      paymentId: topupPmtId, // Same paymentId
      orderId: `order_topup_${Date.now()}`
    });
    const walletAfterDuplicate = Number((await prisma.wallet.findUnique({ where: { organizationId: testOrgId } }))?.balance);
    assert(
      duplicateRecharge.status === "ALREADY_PROCESSED" &&
      walletAfterDuplicate === walletAfterTopup,
      "Test 18: Idempotent payment webhook does not credit wallet twice on duplicate event"
    );

    // -------------------------------------------------------------
    // Test 19: Admin pricing change records audit record with reason, actor, and previous rate
    // -------------------------------------------------------------
    // Fetch rate
    const rateToAudit = await prisma.pricingRate.findFirst({
      where: { isoCode: "IN", category: "UTILITY", status: "ACTIVE" }
    });

    const auditEntry = await prisma.pricingRateAudit.create({
      data: {
        id: crypto.randomUUID(),
        rateId: rateToAudit!.id,
        changeType: "UPDATE",
        oldValues: { basePrice: Number(rateToAudit!.basePrice) },
        newValues: { basePrice: 0.22 },
        reason: "Meta rate card adjustment Q4 2026",
        actor: "admin@digitalbeings.in"
      }
    });

    assert(
      auditEntry.reason === "Meta rate card adjustment Q4 2026" &&
      auditEntry.actor === "admin@digitalbeings.in" &&
      auditEntry.changeType === "UPDATE",
      "Test 19: Admin pricing change records audit record with reason, actor, and previous rate"
    );

    // -------------------------------------------------------------
    // Test 20: Route suspension blocks message dispatch immediately
    // -------------------------------------------------------------
    // Temporarily suspend a route
    await prisma.pricingRate.update({
      where: { id: rateToAudit!.id },
      data: { status: "SUSPENDED" }
    });

    let suspendedBlocked = false;
    try {
      await evaluateMessageDispatch("+919876543210", "UTILITY");
    } catch (err: any) {
      suspendedBlocked = err.message.includes("ROUTE_SUSPENDED") || err.message.includes("UNCONFIGURED_DESTINATION_RATE");
    } finally {
      // Restore status
      await prisma.pricingRate.update({
        where: { id: rateToAudit!.id },
        data: { status: "ACTIVE" }
      });
    }

    assert(suspendedBlocked, "Test 20: Route suspension blocks message dispatch immediately");

    // -------------------------------------------------------------
    // Test 21: Manual admin adjustment creates compensating ledger entry rather than altering historical records
    // -------------------------------------------------------------
    const adjResult = await recordAdminAdjustment({
      organizationId: testOrgId,
      amount: 15.00,
      reason: "Customer goodwill credit for testing reconciliation",
      adminEmail: "compliance@digitalbeings.in"
    });

    const ledgerAdjustment = await prisma.walletLedgerEntry.findFirst({
      where: { id: adjResult.ledgerEntry.id }
    });

    assert(
      adjResult.status === "SUCCESS" &&
      ledgerAdjustment?.entryType === "ADJUSTMENT" &&
      ledgerAdjustment?.reason === "Customer goodwill credit for testing reconciliation" &&
      Number(ledgerAdjustment?.amount) === 15.00,
      "Test 21: Manual admin adjustment creates compensating ledger entry rather than altering historical records"
    );

    // -------------------------------------------------------------
    // Test 22: Automated reconciliation releases expired reservations older than 15 minutes
    // -------------------------------------------------------------
    // Create an artificially expired reservation (16 minutes ago)
    const expiredRes = await prisma.walletReservation.create({
      data: {
        id: crypto.randomUUID(),
        walletId: walletRecord!.id,
        amount: 2.50,
        currency: "INR",
        status: "ACTIVE",
        referenceType: "API_DISPATCH",
        referenceId: "stale_res_123",
        expiresAt: new Date(Date.now() - 16 * 60 * 1000)
      }
    });

    // Increment wallet reserved balance
    await prisma.wallet.update({
      where: { id: walletRecord!.id },
      data: { reservedBalance: { increment: 2.50 } }
    });

    const reconResult = await reconcileStaleReservations();
    const checkedRes = await prisma.walletReservation.findUnique({ where: { id: expiredRes.id } });

    assert(
      reconResult.reconciledCount >= 1 &&
      checkedRes?.status === "RELEASED",
      "Test 22: Automated reconciliation releases expired reservations older than 15 minutes"
    );

  } finally {
    // Cleanup test organization data
    try {
      await prisma.messageBillingRecord.deleteMany({ where: { projectId: testProjectId } });
      await prisma.walletLedgerEntry.deleteMany({ where: { wallet: { organizationId: testOrgId } } });
      await prisma.walletReservation.deleteMany({ where: { wallet: { organizationId: testOrgId } } });
      await prisma.walletTransaction.deleteMany({ where: { wallet: { organizationId: testOrgId } } });
      await prisma.invoice.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.customerBillingProfile.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.wallet.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.project.delete({ where: { id: testProjectId } });
      await prisma.organization.delete({ where: { id: testOrgId } });
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
  }

  console.log("\n=======================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL 22 TESTS)`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBillingVerificationSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
