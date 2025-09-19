import AppLayout from '@/components/layout/AppLayout';

export default function ComponentsDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}