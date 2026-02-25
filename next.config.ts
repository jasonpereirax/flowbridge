import type { NextConfig } from 'next'

const config: NextConfig = {
  // Turbopack is stable in Next 15 — enabled via --turbo flag in dev
  experimental: {
    // Server Actions are stable in Next 15, no flag needed
  },
  images: {
    remotePatterns: [
      // Figma thumbnails
      { protocol: 'https', hostname: '**.figma.com' },
      { protocol: 'https', hostname: 'figma-alpha-api.s3.us-west-2.amazonaws.com' },
      // Supabase Storage (avatars, etc.)
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
}

export default config
