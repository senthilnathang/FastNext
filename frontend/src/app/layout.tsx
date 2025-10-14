import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/modules/auth";
import { EnhancedThemeProvider } from "@/shared/providers/EnhancedThemeProvider";
import { NuqsProvider, ConditionalAppLayout } from "@/shared/components";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SecurityProvider } from "@/lib/security/SecurityProvider";
import { SessionTimeoutWarning } from "@/shared/components/SessionTimeoutWarning";
import { GraphQLProvider } from "@/lib/graphql";
import { Toaster } from "sonner";
import { ServiceWorkerRegistration } from "@/shared/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "FastNext Framework",
  description: "Secure, comprehensive web application framework with enhanced authentication",
  icons: {
    icon: '/favicon.ico',
  },
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
                     <ConditionalAppLayout>
                       {children}
                     </ConditionalAppLayout>
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
