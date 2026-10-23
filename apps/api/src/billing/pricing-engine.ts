import { prisma } from "@whatsapp-otp/database";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { calculateMargin, fromMicro, toMicro, roundInr, calculateGstBreakdown } from "./money";

export interface RateEvaluationResult {
  recipientPhone: string;
  destinationCountry: string;
  isoCountryCode: string;
  category: "AUTHENTICATION" | "UTILITY" | "MARKETING";
  rateId: string;
  rateVersion: number;
  sellingPrice: number; // Base price excluding GST
  providerCostInr: number;
  infraCostInr: number;
  totalCostInr: number;
  grossMarginInr: number;
  marginPercent: number;
  minMarginPercent: number;
  rateCardVersion: string;
  lossRiskStatus: "SAFE" | "WARNING" | "UNSAFE_BLOCKED";
  isEligible: boolean;
  rejectionReason?: string;
}

/**
 * Normalizes phone number to E.164 and determines recipient's country ISO code.
 * Rejects invalid, ambiguous, or malformed numbers.
 */
export function parseAndValidatePhone(rawPhone: string): {
  e164: string;
  isoCountryCode: string;
  countryCallingCode: string;
} {
  const trimmed = (rawPhone || "").trim();
  if (!trimmed) {
    throw new Error("Missing recipient phone number");
  }

  // Attempt parse with explicit + or fallback to India default if 10 digits
  let formatted = trimmed;
  if (!formatted.startsWith("+")) {
    if (/^\d{10}$/.test(formatted)) {
      formatted = `+91${formatted}`;
    } else {
      formatted = `+${formatted}`;
    }
  }

  const parsed = parsePhoneNumberFromString(formatted);
  if (!parsed || !parsed.isValid()) {
    throw new Error(`Invalid international phone number: '${rawPhone}'. Must follow E.164 standard.`);
  }

  const iso = parsed.country || "UNKNOWN";
  if (iso === "UNKNOWN") {
    throw new Error(`Could not determine destination country for phone number: '${rawPhone}'.`);
  }

  return {
    e164: parsed.number,
    isoCountryCode: iso,
    countryCallingCode: parsed.countryCallingCode,
  };
}

/**
 * Initialize default launch rates, exchange rates, and tax configuration in database.
 */
export async function seedInitialBillingConfig() {
  try {
    // 1. Tax Configuration (GST 18%)
    const existingTax = await prisma.taxConfiguration.findFirst();
    if (!existingTax) {
      await prisma.taxConfiguration.create({
        data: {
          taxName: "GST",
          taxRatePercent: 18.00,
          cgstPercent: 9.00,
          sgstPercent: 9.00,
          igstPercent: 18.00,
          supplierGstin: "27AABCU9603R1ZM",
          supplierStateCode: "27",
          supplierLegalName: "Digital Beings Infotech Private Limited",
          supplierAddress: "Level 4, Trade Centre, BKC, Mumbai, Maharashtra - 400051",
          hsnSacCode: "998313"
        }
      });
      console.log("Seeded default TaxConfiguration (GST 18%)");
    }

    // 2. Exchange Rate (USD to INR with 2.5% buffer)
    const existingFx = await prisma.exchangeRate.findFirst({ where: { fromCurrency: "USD", toCurrency: "INR" } });
    if (!existingFx) {
      const baseRate = 86.50;
      const buffer = 2.50;
      const effectiveRate = roundInr(baseRate * (1 + buffer / 100), 4);
      await prisma.exchangeRate.create({
        data: {
          fromCurrency: "USD",
          toCurrency: "INR",
          baseRate,
          bufferPercent: buffer,
          effectiveRate,
          source: "RBI_REFERENCE_AUDITED"
        }
      });
      console.log(`Seeded USD/INR exchange rate (Base: ${baseRate}, Effective: ${effectiveRate})`);
    }

    // 3. Launch Pricing Rates as mandated by Section 2
    const launchRates = [
      // --- INDIA (IN) ---
      {
        country: "India",
        isoCode: "IN",
        countryDialCode: "91",
        category: "AUTHENTICATION",
        basePrice: 0.20,
        providerCost: 0.1150,
        providerCurrency: "INR",
        fxRate: 1.0,
        fxBufferPercent: 0.0,
        infraCostInr: 0.0100,
        minMarginPercent: 15.0,
      },
      {
        country: "India",
        isoCode: "IN",
        countryDialCode: "91",
        category: "UTILITY",
        basePrice: 0.18,
        providerCost: 0.1150,
        providerCurrency: "INR",
        fxRate: 1.0,
        fxBufferPercent: 0.0,
        infraCostInr: 0.0100,
        minMarginPercent: 15.0,
      },
      {
        country: "India",
        isoCode: "IN",
        countryDialCode: "91",
        category: "MARKETING",
        basePrice: 1.15,
        providerCost: 0.8631,
        providerCurrency: "INR",
        fxRate: 1.0,
        fxBufferPercent: 0.0,
        infraCostInr: 0.0100,
        minMarginPercent: 15.0,
      },
      // --- UNITED STATES (US) ---
      {
        country: "United States",
        isoCode: "US",
        countryDialCode: "1",
        category: "AUTHENTICATION",
        basePrice: 0.60,
        providerCost: 0.0034, // USD
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United States",
        isoCode: "US",
        countryDialCode: "1",
        category: "UTILITY",
        basePrice: 0.60,
        providerCost: 0.0034, // USD
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United States",
        isoCode: "US",
        countryDialCode: "1",
        category: "MARKETING",
        basePrice: 3.25,
        providerCost: 0.0250, // USD
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      // --- UNITED KINGDOM (GB) ---
      {
        country: "United Kingdom",
        isoCode: "GB",
        countryDialCode: "44",
        category: "AUTHENTICATION",
        basePrice: 2.80,
        providerCost: 0.0210, // USD
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United Kingdom",
        isoCode: "GB",
        countryDialCode: "44",
        category: "UTILITY",
        basePrice: 2.80,
        providerCost: 0.0210,
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United Kingdom",
        isoCode: "GB",
        countryDialCode: "44",
        category: "MARKETING",
        basePrice: 5.50,
        providerCost: 0.0460,
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      // --- UNITED ARAB EMIRATES (AE) ---
      {
        country: "United Arab Emirates",
        isoCode: "AE",
        countryDialCode: "971",
        category: "AUTHENTICATION",
        basePrice: 1.95,
        providerCost: 0.0150,
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United Arab Emirates",
        isoCode: "AE",
        countryDialCode: "971",
        category: "UTILITY",
        basePrice: 1.95,
        providerCost: 0.0150,
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      },
      {
        country: "United Arab Emirates",
        isoCode: "AE",
        countryDialCode: "971",
        category: "MARKETING",
        basePrice: 3.85,
        providerCost: 0.0320,
        providerCurrency: "USD",
        fxRate: 86.50,
        fxBufferPercent: 2.50,
        infraCostInr: 0.0200,
        minMarginPercent: 15.0,
      }
    ];

    for (const r of launchRates) {
      const existing = await prisma.pricingRate.findFirst({
        where: { isoCode: r.isoCode, category: r.category, version: 1 }
      });

      if (!existing) {
        // Calculate cost in INR
        const costInr = r.providerCurrency === "USD"
          ? r.providerCost * r.fxRate * (1 + r.fxBufferPercent / 100)
          : r.providerCost;
        const totalCostInr = roundInr(costInr + r.infraCostInr, 4);
        const marginCalc = calculateMargin(r.basePrice, totalCostInr, r.minMarginPercent);

        await prisma.pricingRate.create({
          data: {
            country: r.country,
            isoCode: r.isoCode,
            countryDialCode: r.countryDialCode,
            category: r.category,
            basePrice: r.basePrice,
            providerCost: r.providerCost,
            providerCurrency: r.providerCurrency,
            fxRate: r.fxRate,
            fxBufferPercent: r.fxBufferPercent,
            providerCostInr: roundInr(costInr, 4),
            infraCostInr: r.infraCostInr,
            totalCostInr,
            minMarginPercent: r.minMarginPercent,
            actualMarginPercent: marginCalc.marginPercent,
            marginInr: marginCalc.grossMarginInr,
            status: "ACTIVE",
            lossRiskStatus: marginCalc.lossRiskStatus,
            version: 1,
            rateCardVersion: "meta_v2026_q4",
            createdBy: "SYSTEM_INITIALIZER",
            approvedBy: "CHIEF_FINANCIAL_OFFICER"
          }
        });
      }
    }
  } catch (err: any) {
    console.error("Error seeding initial billing config:", err);
  }
}

/**
 * Validates message eligibility, evaluates route pricing, calculates margins,
 * and enforces strict margin protection before dispatch.
 */
export async function evaluateMessageDispatch(
  recipientPhone: string,
  rawCategory: string
): Promise<RateEvaluationResult> {
  const normCategory = (rawCategory || "AUTHENTICATION").trim().toUpperCase() as "AUTHENTICATION" | "UTILITY" | "MARKETING";
  if (!["AUTHENTICATION", "UTILITY", "MARKETING"].includes(normCategory)) {
    throw new Error(`Invalid message category: '${rawCategory}'. Supported: AUTHENTICATION, UTILITY, MARKETING`);
  }

  // 1. E.164 phone parsing & country detection
  const phoneInfo = parseAndValidatePhone(recipientPhone);

  // 2. Fetch approved, active pricing rate for this country and category
  const now = new Date();
  const rate = await prisma.pricingRate.findFirst({
    where: {
      isoCode: phoneInfo.isoCountryCode,
      category: normCategory,
      status: "ACTIVE",
      effectiveFrom: { lte: now },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gt: now } }
      ]
    },
    orderBy: { version: "desc" }
  });

  if (!rate) {
    throw new Error(
      `UNCONFIGURED_DESTINATION_RATE: No active approved pricing rate found for country '${phoneInfo.isoCountryCode}' (${normCategory}). Dispatch blocked to prevent unbilled or loss-making dispatches.`
    );
  }

  if (rate.status === "SUSPENDED") {
    throw new Error(
      `ROUTE_SUSPENDED: The messaging route for destination '${rate.country}' (${normCategory}) has been suspended by administration.`
    );
  }

  const sellingPrice = Number(rate.basePrice);
  const totalCostInr = Number(rate.totalCostInr);
  const minMarginPercent = Number(rate.minMarginPercent);

  // 3. Margin Protection Check
  const marginCalc = calculateMargin(sellingPrice, totalCostInr, minMarginPercent);

  if (!marginCalc.isSafe || marginCalc.lossRiskStatus === "UNSAFE_BLOCKED") {
    throw new Error(
      `MARGIN_PROTECTION_BLOCKED: Route ${rate.country} [${normCategory}] selling price (₹${sellingPrice.toFixed(4)}) is below the required safety threshold (Expected Cost: ₹${totalCostInr.toFixed(4)}, Margin: ${marginCalc.marginPercent}% < Required: ${minMarginPercent}%). Dispatch blocked by margin protection policy.`
    );
  }

  return {
    recipientPhone: phoneInfo.e164,
    destinationCountry: rate.country,
    isoCountryCode: rate.isoCode,
    category: normCategory,
    rateId: rate.id,
    rateVersion: rate.version,
    sellingPrice,
    providerCostInr: Number(rate.providerCostInr),
    infraCostInr: Number(rate.infraCostInr),
    totalCostInr,
    grossMarginInr: marginCalc.grossMarginInr,
    marginPercent: marginCalc.marginPercent,
    minMarginPercent,
    rateCardVersion: rate.rateCardVersion,
    lossRiskStatus: marginCalc.lossRiskStatus,
    isEligible: true,
  };
}
