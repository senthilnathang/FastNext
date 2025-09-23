import { AppLayout } from '@/shared/components';

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}