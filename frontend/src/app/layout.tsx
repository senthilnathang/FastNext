import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/modules/auth";
import { EnhancedThemeProvider } from "@/shared/providers/EnhancedThemeProvider";
import { NuqsProvider, ConditionalAppLayout } from "@/shared/components";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SecurityProvider } from "@/lib/security/SecurityProvider";
import { SessionTimeoutWarning } from "@/shared/components/SessionTimeoutWarning";

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
      <body className="font-sans antialiased">
        <SecurityProvider>
          <TRPCProvider>
            <NuqsProvider>
              <EnhancedThemeProvider 
                attribute="class" 
                defaultTheme="system" 
                enableSystem
                defaultColorScheme="default"
                colorSchemeStorageKey="color-scheme"
              >
                <AuthProvider>
                  <ConditionalAppLayout>
                    {children}
                  </ConditionalAppLayout>
                  <SessionTimeoutWarning />
                </AuthProvider>
              </EnhancedThemeProvider>
            </NuqsProvider>
          </TRPCProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
