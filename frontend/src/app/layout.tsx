import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/modules/auth";
import { ThemeProvider } from "next-themes";
import { NuqsProvider } from "@/shared/components";
import { TRPCProvider } from "@/lib/trpc/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FastNext Framework",
  description: "Secure, comprehensive web application framework with enhanced authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>
          <NuqsProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ThemeProvider>
          </NuqsProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
