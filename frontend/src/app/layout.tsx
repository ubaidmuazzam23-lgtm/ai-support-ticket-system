// File: frontend/src/app/layout.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI IT Support Platform',
  description: 'Intelligent Automation · Smart Routing · Global Scale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#F2F2F2', fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}