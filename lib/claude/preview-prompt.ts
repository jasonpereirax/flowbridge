import type { GenerateRequest } from '@/types'
import { buildPrompt } from './prompt-builder'

// ─────────────────────────────────────────────────────────────────────────────
// Build-free PREVIEW prompt. Produces ONE self-contained HTML document that
// renders the screen for visual evaluation — no build, no framework, no module
// resolution. Reuses the same semantic context the code generation uses, so the
// preview reflects the design + intent, then drops into an <iframe srcdoc>.
//
// IMPORTANT: the preview must mirror the ACTUAL design — its real fonts and exact
// colors — NOT the host app's design tokens. Injecting the app palette biases the
// model toward the wrong colors.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPreviewPrompt(req: GenerateRequest): { system: string; user: string } {
  const { user: context } = buildPrompt(req)

  // Reuse the assembled context, swap the code-generation closing instruction.
  const user = context.replace(
    /Generate all screens now\. Return ONLY the JSON array\./,
    'Render the screen(s) above as a SINGLE self-contained HTML document for visual preview.',
  )

  const system = `You produce a SINGLE self-contained HTML document that visually previews the screen(s) described below — as faithfully as possible to the design.

## Hard rules
- Output ONLY raw HTML: one complete document starting with <!doctype html>. No markdown, no code fences, no prose.
- Load Tailwind via <script src="https://cdn.tailwindcss.com"></script>.
- FONTS: load the exact font families named in the design (the "FONTS USED" line) via Google Fonts <link> tags, and apply them. If a serif/display font is specified, the headings MUST be serif — do not fall back to a default sans.
- COLORS: use the EXACT hex colors given in the design outline and tokens. Do NOT invent or substitute a generic brand palette (no random blues/greens). If the headline is #18181A, render it #18181A.
- Inline everything else. No external CSS/JS except the Tailwind CDN and Google Fonts. EXCEPTION: if the reference code references image/SVG assets at http://localhost:3845/assets/… use those EXACT URLs in <img> tags — they are the real design assets and load in this preview. For other icons/avatars use inline SVG or shaped divs.
- Reproduce EVERY section top to bottom — do not stop early or summarize lower sections.
- Match layout, spacing, sizing and typography to the design as precisely as the data allows. Use the element dimensions and font sizes provided, and follow the reference code's exact Tailwind classes.
- If multiple screens are given, stack them vertically with a small label above each.

This is a visual preview, not production code — but it must look like THIS design, not a generic interpretation of it.`.trim()

  return { system, user }
}
