import "./globals.css";
import React from "react";

export const metadata = {
  title: "WhatsApp OTP SaaS",
  description: "Send OTPs instantly via WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
