import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation - FastNext Framework',
  description: 'Interactive API documentation for testing and exploring FastNext Framework endpoints',
}

export default function APIDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}