import AppLayout from '@/shared/components/AppLayout';

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}