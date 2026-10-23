/**
 * Precision Financial Arithmetic Utility
 * 
 * Digital Beings Billing Engine
 * Rule: Store all monetary values using precise decimal arithmetic or integer minor units (paise / micro-units).
 * Never use raw floating-point arithmetic for financial operations.
 */

// 1 INR = 100 Paise = 10,000 Micro-Paise (for sub-paise Meta provider costs like ₹0.1150)
export const MICRO_UNITS = 10000;

export function toMicro(inr: number | string): number {
  const num = typeof inr === "string" ? parseFloat(inr) : inr;
  return Math.round((num + Number.EPSILON) * MICRO_UNITS);
}

export function fromMicro(micro: number): number {
  return Math.round(micro) / MICRO_UNITS;
}

export function toPaise(inr: number | string): number {
  const num = typeof inr === "string" ? parseFloat(inr) : inr;
  return Math.round((num + Number.EPSILON) * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function roundInr(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export interface GstBreakdown {
  baseAmount: number;
  gstRatePercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalPayableAmount: number;
  isInterState: boolean;
}

/**
 * Calculates GST based on customer state vs supplier state (27 - Maharashtra).
 * If customer is in Maharashtra -> CGST (9%) + SGST (9%)
 * If customer is in another state -> IGST (18%)
 * If customer is tax-exempt -> 0%
 */
export function calculateGstBreakdown(
  baseAmountInr: number,
  customerStateCode: string = "27",
  supplierStateCode: string = "27",
  taxRatePercent: number = 18.00,
  taxExempt: boolean = false
): GstBreakdown {
  const basePaise = toPaise(baseAmountInr);

  if (taxExempt || taxRatePercent <= 0) {
    return {
      baseAmount: fromPaise(basePaise),
      gstRatePercent: 0,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalPayableAmount: fromPaise(basePaise),
      isInterState: false,
    };
  }

  const isInterState = String(customerStateCode).trim() !== String(supplierStateCode).trim();
  const totalTaxPaise = Math.round((basePaise * taxRatePercent) / 100);
  const totalPayablePaise = basePaise + totalTaxPaise;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = fromPaise(totalTaxPaise);
  } else {
    const halfTax = Math.floor(totalTaxPaise / 2);
    cgstAmount = fromPaise(halfTax);
    sgstAmount = fromPaise(totalTaxPaise - halfTax);
  }

  return {
    baseAmount: fromPaise(basePaise),
    gstRatePercent: taxRatePercent,
    cgstPercent: isInterState ? 0 : roundInr(taxRatePercent / 2, 2),
    sgstPercent: isInterState ? 0 : roundInr(taxRatePercent / 2, 2),
    igstPercent: isInterState ? taxRatePercent : 0,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount: fromPaise(totalTaxPaise),
    totalPayableAmount: fromPaise(totalPayablePaise),
    isInterState,
  };
}

export interface MarginCalculation {
  sellingPrice: number;
  totalCostInr: number;
  grossMarginInr: number;
  marginPercent: number;
  minRequiredMarginPercent: number;
  isSafe: boolean;
  lossRiskStatus: "SAFE" | "WARNING" | "UNSAFE_BLOCKED";
}

/**
 * Calculates gross margin and evaluates against minimum required margin policy.
 */
export function calculateMargin(
  sellingPriceInr: number,
  totalCostInr: number,
  minRequiredMarginPercent: number = 15.00
): MarginCalculation {
  const sellMicro = toMicro(sellingPriceInr);
  const costMicro = toMicro(totalCostInr);
  const marginMicro = sellMicro - costMicro;

  const grossMarginInr = fromMicro(marginMicro);
  const marginPercent = sellMicro > 0 
    ? roundInr((marginMicro / sellMicro) * 100, 2)
    : -100;

  let lossRiskStatus: "SAFE" | "WARNING" | "UNSAFE_BLOCKED" = "SAFE";
  let isSafe = true;

  if (marginMicro <= 0 || marginPercent < minRequiredMarginPercent) {
    lossRiskStatus = "UNSAFE_BLOCKED";
    isSafe = false;
  } else if (marginPercent < minRequiredMarginPercent + 5.0) {
    lossRiskStatus = "WARNING";
  }

  return {
    sellingPrice: fromMicro(sellMicro),
    totalCostInr: fromMicro(costMicro),
    grossMarginInr,
    marginPercent,
    minRequiredMarginPercent,
    isSafe,
    lossRiskStatus,
  };
}
