import { AppLayout } from '@/shared/components';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}