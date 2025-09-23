import { AppLayout } from '@/shared/components';

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}