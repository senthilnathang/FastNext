import AppLayout from '@/components/layout/AppLayout';

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}