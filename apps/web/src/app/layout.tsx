import "./globals.css";
import React from "react";
import { ModalProvider } from "@/context/ModalContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata = {
  metadataBase: new URL("https://digitalbeings.in"),
  title: {
    default: "Digital Beings - WhatsApp OTP & Marketing Cloud Suite",
    template: "%s | Digital Beings",
  },
  description: "Digital Beings | Secure • Connect • Grow. Enterprise WhatsApp Cloud platform for high-speed OTP authentication, broadcast campaigns, and official green-tick verification.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Digital Beings - WhatsApp OTP & Marketing Suite",
    description: "Secure • Connect • Grow. Enterprise WhatsApp Cloud platform for instant OTPs, broadcast campaigns, and green-tick verified messaging.",
    images: ["/logo.png"],
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('db_theme');
                if (storedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
