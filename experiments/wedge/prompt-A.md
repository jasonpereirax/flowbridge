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

THE SCREEN (frozen design representation):
```json
{
  "section": "Selected Clients",
  "frame": { "name": "Selected Clients", "width": 1679, "background": "#F4F4F4" },
  "header": {
    "title": { "text": "Selected Clients", "fontSize": 21, "fontWeight": 600 },
    "trailingIcon": "Icon/Outline/plus (24x24)",
    "divider": { "type": "RECTANGLE", "height": 132 }
  },
  "listTitle": { "text": "Project(s)", "fontSize": 40, "fontWeight": 500, "trailingIcon": "Arrow (21x21)" },
  "rows": [
    { "avatar": { "type": "ELLIPSE", "size": 40, "fill": "#CF7745" }, "name": "Sesc Brasil",     "category": "Website Institucional", "year": "2021", "action": "See more" },
    { "avatar": { "type": "ELLIPSE", "size": 40, "fill": "#CF7745" }, "name": "W/Express",       "category": "Website Institucional", "year": "2021", "action": "See more" },
    { "avatar": { "type": "ELLIPSE", "size": 40, "fill": "#CF7745" }, "name": "EBANX",           "category": "Website Institucional", "year": "2021", "action": "See more" },
    { "avatar": { "type": "ELLIPSE", "size": 40, "fill": "#CF7745" }, "name": "CVV",             "category": "Website Institucional", "year": "2021", "action": "See more" },
    { "avatar": { "type": "ELLIPSE", "size": 40, "fill": "#CF7745" }, "name": "Nome do projeto", "category": "Website Institucional", "year": "2021", "action": "See more" }
  ],
  "rowTypography": {
    "name": { "fontSize": 48, "fontWeight": 400 },
    "category": { "fontSize": 24, "fontWeight": 400 },
    "year": { "fontSize": 24, "fontWeight": 400 },
    "action": { "fontSize": 24, "fontWeight": 400 }
  },
  "notes": "Each of the 5 rows has an identical structure: [avatar dot] [client name] [category] [year] [See more]. Layout is a horizontal row; rows are stacked vertically with a divider feel. Section sits on a light gray (#F4F4F4) background."
}
```

That is all the information you have. Generate the code.
