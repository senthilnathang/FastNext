import { AppLayout } from '@/shared/components';

export default function ComponentsDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}