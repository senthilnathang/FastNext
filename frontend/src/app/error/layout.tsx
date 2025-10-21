import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Error Pages - FastNext Framework",
  description: "Common error page templates for testing and demonstration",
};

export default function ErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}