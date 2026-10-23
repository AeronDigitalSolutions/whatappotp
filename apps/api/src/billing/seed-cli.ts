import "dotenv/config";
import { seedInitialBillingConfig } from "./pricing-engine";
import { prisma } from "@whatsapp-otp/database";

async function main() {
  console.log("Seeding Digital Beings billing, pricing, and tax configurations...");
  await seedInitialBillingConfig();
  
  const rates = await prisma.pricingRate.findMany({ where: { status: "ACTIVE" } });
  console.log(`Successfully verified ${rates.length} active pricing rates:`);
  for (const r of rates) {
    console.log(`- ${r.country} (${r.isoCode}) [${r.category}]: Base ₹${Number(r.basePrice).toFixed(2)}, Cost ₹${Number(r.totalCostInr).toFixed(4)}, Margin ${Number(r.actualMarginPercent).toFixed(1)}% (${r.lossRiskStatus})`);
  }

  const tax = await prisma.taxConfiguration.findFirst();
  console.log(`Tax Configuration: ${tax?.taxName} ${tax?.taxRatePercent}% (CGST: ${tax?.cgstPercent}%, SGST: ${tax?.sgstPercent}%, IGST: ${tax?.igstPercent}%)`);

  const fx = await prisma.exchangeRate.findFirst();
  console.log(`Exchange Rate: 1 ${fx?.fromCurrency} = ₹${fx?.effectiveRate} INR (Base: ₹${fx?.baseRate}, Buffer: ${fx?.bufferPercent}%)`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
