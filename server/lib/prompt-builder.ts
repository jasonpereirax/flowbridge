import type { GenerationRequest } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Builds the system + user prompt from the project context graph.
// This is the core of the product — quality here = quality of generated code.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPrompt(req: GenerationRequest): { system: string; user: string } {
  const { project, dsNodes, screens } = req

  const s = project.settings

  // ── SYSTEM ─────────────────────────────────────────────────────────────────
  const system = `You are an expert ${s.framework} developer generating production-ready UI code.

## Stack
- Framework: ${s.framework}
- Component library: ${s.componentLibrary}
- CSS: ${s.cssFramework}
- Icons: ${s.iconSet}
- Output directory: ${s.outputDir}

## Rules
- Generate COMPLETE, working files — no placeholders, no TODOs
- Use ${s.componentLibrary} components wherever possible
- Follow ${s.framework} conventions strictly (${s.framework === 'nextjs' ? 'App Router, Server Components by default, use "use client" only when needed' : 'functional components, hooks'})
- Import only from the specified component library — do not invent component names
- Every file must be self-contained and immediately usable
- Output ONLY code blocks, no explanations

## Output format
Return a JSON array of files:
\`\`\`json
[
  {
    "path": "src/app/(auth)/login/page.tsx",
    "lang": "tsx",
    "content": "// full file content"
  }
]
\`\`\`
`.trim()

  // ── USER ───────────────────────────────────────────────────────────────────
  const parts: string[] = []

  // Design system context
  if (dsNodes?.length) {
    parts.push('## Design System')
    for (const ds of dsNodes) {
      parts.push(`### ${ds.name}`)
      if (ds.description) parts.push(ds.description)
      if (ds.tags?.length) parts.push(`Components available: ${ds.tags.join(', ')}`)
      if (ds.figmaFileKey) parts.push(`Figma file: ${ds.figmaFileKey}`)
    }
  }

  // Screens to generate
  parts.push(`\n## Screens to generate (${screens.length})`)

  for (const sc of screens) {
    parts.push(`\n### Screen: ${sc.name}`)

    const ctx = sc.context
    if (ctx.route)       parts.push(`Route: ${ctx.route}`)
    if (ctx.purpose)     parts.push(`Purpose: ${ctx.purpose}`)
    if (ctx.userIntent)  parts.push(`User intent: ${ctx.userIntent}`)
    if (ctx.requiresAuth) parts.push(`Requires authentication: yes`)

    if (ctx.components?.length) {
      parts.push(`Components to use: ${ctx.components.join(', ')}`)
    }

    if (ctx.apiEndpoints?.length) {
      parts.push('API endpoints:')
      for (const ep of ctx.apiEndpoints) {
        parts.push(`  ${ep.method} ${ep.path} — ${ep.description}`)
      }
    }

    if (ctx.notes)    parts.push(`Architecture notes: ${ctx.notes}`)
    if (ctx.genRules) parts.push(`Generation rules: ${ctx.genRules}`)

    // Figma component mapping
    if (sc.figma?.componentMap?.length) {
      parts.push('Figma → code component mapping:')
      for (const m of sc.figma.componentMap) {
        parts.push(`  "${m.figmaName}" → <${m.codeComponent}/>`)
      }
    }
  }

  parts.push('\nGenerate all screens now. Return only the JSON array.')

  return { system, user: parts.join('\n') }
}
