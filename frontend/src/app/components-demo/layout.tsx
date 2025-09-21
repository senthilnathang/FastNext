import AppLayout from '@/shared/components/AppLayout';

export default function ComponentsDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}