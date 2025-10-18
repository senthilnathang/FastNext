import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { GraphQLProvider } from "@/lib/graphql";
import { SecurityProvider } from "@/lib/security/SecurityProvider";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthProvider } from "@/modules/auth";
import { ConditionalAppLayout, NuqsProvider } from "@/shared/components";
import { ServiceWorkerRegistration } from "@/shared/components/ServiceWorkerRegistration";
import { SessionTimeoutWarning } from "@/shared/components/SessionTimeoutWarning";
import { EnhancedThemeProvider } from "@/shared/providers/EnhancedThemeProvider";

export const metadata: Metadata = {
  title: "FastNext Framework",
  description:
    "Secure, comprehensive web application framework with enhanced authentication",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#007bff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        <SecurityProvider>
          <GraphQLProvider>
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
                    <ConditionalAppLayout>{children}</ConditionalAppLayout>
                    <SessionTimeoutWarning />
                    <Toaster />
                  </AuthProvider>
                </EnhancedThemeProvider>
              </NuqsProvider>
            </TRPCProvider>
          </GraphQLProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
