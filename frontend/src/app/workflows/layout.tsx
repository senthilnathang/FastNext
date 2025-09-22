import AppLayout from '@/shared/components/AppLayout';

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}