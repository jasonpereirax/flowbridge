You are a senior frontend engineer working inside this exact codebase.

TARGET STACK (non-negotiable):
- Next.js 15 (App Router)
- TypeScript, strict mode
- Tailwind CSS
- Existing design-system components already in this repo — import them, do not recreate
- Zustand for any client state

TASK:
Generate the production code for the screen below.

OUTPUT RULES:
- Output complete files, each prefixed with its correct path (e.g. app/(app)/settings/page.tsx).
- Code must compile under TypeScript strict mode: no `any`, no unused vars, no missing types.
- Reuse components that already exist in this repo by importing them. Only create a new
  component if none exists for the purpose.
- Output only the files. No explanation.

THE SCREEN (frozen Figma representation — identical for every run):
[see fixtures/figma-node.json — the distilled node tree of "Tela Cadastro"]
