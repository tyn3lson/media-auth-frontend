// app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'

export const metadata = {
  title: 'DeclassifAI',
  description: 'Your proof, safe and sound — check it anytime.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Load Orbitron font to match your logo */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}