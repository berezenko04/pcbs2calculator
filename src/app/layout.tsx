import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PCBS2 3DMark Calculator',
  description: 'Calculate estimated 3DMark scores for PCBS2 builds',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}