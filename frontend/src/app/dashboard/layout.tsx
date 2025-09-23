import { AppLayout } from '@/shared/components';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}