import type React from "react"
import type { Metadata } from "next"
import { Comfortaa, Nunito } from "next/font/google"
import "./globals.css"

const comfortaa = Comfortaa({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playful",
})

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Daily Tasks",
  description: "Simple mobile todo list app",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${comfortaa.variable} ${nunito.variable}`}>
      <body className={`overscroll-none antialiased`}>{children}</body>
    </html>
  )
}
