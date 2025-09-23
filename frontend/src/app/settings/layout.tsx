import { AppLayout } from '@/shared/components';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}