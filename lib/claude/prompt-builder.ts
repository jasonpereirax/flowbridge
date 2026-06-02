import type { GenerateRequest } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Assembles the full context graph into a Claude system + user prompt.
// Quality of this file = quality of generated code.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPrompt(req: GenerateRequest): { system: string; user: string } {
  const { settings, dsNodes, screens } = req
  const s = settings

  // ── System prompt ──────────────────────────────────────────────────────────
  const system = `You are an expert ${s.framework} developer generating production-ready UI code.

## Stack
- Framework: ${s.framework}
- Components: ${s.componentLibrary}
- CSS: ${s.cssFramework}
- Icons: ${s.iconSet}
- Output root: ${s.outputDir}

## Hard rules
- Generate COMPLETE files — no placeholders, no "// TODO", no "..."
- Import ONLY from the specified component library (${s.componentLibrary})
- Follow ${frameworkRules(s.framework)}
- Use ${s.cssFramework === 'tailwind' ? 'Tailwind utility classes' : s.cssFramework} for all styling
- When an API contract (request/response shape) is provided, wire to it EXACTLY — never
  invent endpoint shapes, and never hardcode data that should be fetched
- For any screen that fetches data, handle loading, error and empty states explicitly
- When a Figma design is provided, REPRODUCE it faithfully: match the exact fonts named
  in the design (load them, e.g. via next/font or a font import — never silently fall back
  to a default), use the EXACT hex colors and dimensions given (do not substitute generic
  brand colors), and follow the section structure and copy verbatim
- Every file must be immediately usable with zero edits

## Output format
Return a single JSON array of file objects. Nothing else — no prose, no markdown wrapping the JSON.
[
  {
    "path": "src/app/(auth)/login/page.tsx",
    "lang": "tsx",
    "content": "// complete file..."
  }
]`.trim()

  // ── User prompt ────────────────────────────────────────────────────────────
  const parts: string[] = []

  // Design system context
  if (dsNodes?.length) {
    parts.push('## Design System / Component Libraries\n')
    for (const ds of dsNodes) {
      parts.push(`### ${ds.name}`)
      if (ds.description) parts.push(ds.description)
      if (ds.tags.length)  parts.push(`Available components: ${ds.tags.join(', ')}`)
      if (ds.figmaFileKey) parts.push(`Figma file key: \`${ds.figmaFileKey}\``)
    }
  }

  // Screens
  parts.push(`\n## Screens to generate (${screens.length})\n`)

  for (const sc of screens) {
    const ctx = sc.context
    parts.push(`### ${sc.name}${sc.isEntry ? ' [entry]' : ''}${sc.isError ? ' [error state]' : ''}`)

    // The actual design from Figma — reproduce this structure, sections and copy.
    // This is the single most important context: without it the model invents a layout.
    if (sc.figma?.structure) {
      parts.push('Design from Figma — REPRODUCE this exact structure, sections and text:')
      parts.push('```')
      parts.push(sc.figma.structure)
      parts.push('```')
    }

    if (sc.figma?.tokensText) {
      parts.push('Exact design tokens (from Figma — use these precise colors/values):')
      parts.push('```')
      parts.push(sc.figma.tokensText)
      parts.push('```')
    }

    if (sc.figma?.reference) {
      parts.push("Figma Dev Mode reference code — this is Figma's OWN React+Tailwind translation of this node. It is the highest-fidelity source: preserve its exact layout, spacing, sizing, colors and structure for EVERY section top to bottom. Adapt syntax to the target stack, but do NOT redesign or omit sections. Image/SVG assets referenced as http://localhost:3845/assets/… are the REAL design assets — keep those URLs (they can be swapped for production assets later):")
      parts.push('```tsx')
      parts.push(sc.figma.reference.slice(0, 120000))
      parts.push('```')
    }

    if (ctx.route)       parts.push(`Route: \`${ctx.route}\``)
    if (ctx.purpose)     parts.push(`Purpose: ${ctx.purpose}`)
    if (ctx.userIntent)  parts.push(`User intent: ${ctx.userIntent}`)
    if (ctx.requiresAuth) parts.push(`Auth required: yes`)

    if (ctx.components.length) {
      parts.push(`Use these components: ${ctx.components.join(', ')}`)
    }

    if (ctx.apiEndpoints.length) {
      parts.push('API endpoints:')
      ctx.apiEndpoints.forEach(ep => {
        parts.push(`  \`${ep.method} ${ep.path}\` — ${ep.description}`)
        // Contract shape is the highest-leverage signal — wire to it exactly,
        // do not invent request/response shapes.
        if (ep.request?.trim())  parts.push(`    Request:  ${ep.request.trim()}`)
        if (ep.response?.trim()) parts.push(`    Response: ${ep.response.trim()}`)
      })
    }

    if (sc.figma?.componentMap.length) {
      parts.push('Figma → code component mapping:')
      sc.figma.componentMap.forEach(m =>
        parts.push(`  "${m.figmaName}" → <${m.codeComponent} />`)
      )
    }

    if (ctx.notes)    parts.push(`Architecture: ${ctx.notes}`)
    if (ctx.genRules) parts.push(`Rules: ${ctx.genRules}`)

    parts.push('')
  }

  parts.push('Generate all screens now. Return ONLY the JSON array.')

  return { system, user: parts.join('\n') }
}

function frameworkRules(fw: string): string {
  switch (fw) {
    case 'nextjs':
      return 'Next.js 15 App Router conventions: Server Components by default, add "use client" only when you need hooks or browser APIs, use Server Actions for form mutations, never use getServerSideProps or getStaticProps'
    case 'react-vite':
      return 'React 19 with hooks, functional components only, no class components'
    case 'remix':
      return 'Remix v2 conventions: loader/action exports, Form component for mutations'
    case 'astro':
      return 'Astro with React islands where interactivity is needed, static by default'
    default:
      return 'modern React best practices'
  }
}
