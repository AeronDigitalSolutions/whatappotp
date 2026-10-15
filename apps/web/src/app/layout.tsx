import "./globals.css";
import React from "react";
import { ModalProvider } from "@/context/ModalContext";

export const metadata = {
  title: "WhatsApp OTP SaaS",
  description: "Send OTPs instantly via WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
