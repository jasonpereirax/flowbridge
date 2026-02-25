# 🚀 Quick Start: Implementação em 3 Passos

---

## Passo 1: Copiar Arquivos (5 min)

```bash
# Na raiz do seu projeto flowbridge-v6-final/:

cp MacroNode.tsx components/nodes/
cp ScreenNode.tsx components/nodes/
cp ConnectorLayer.tsx components/canvas/
cp Ibar.tsx components/sidebar/
cp Ebar.tsx components/sidebar/
cp RightPanel.tsx components/panels/
```

Ou manualmente, copie cada arquivo `.tsx` para seu editor.

---

## Passo 2: Atualizar CanvasWorkspace.tsx (30 min)

Abra `components/canvas/CanvasWorkspace.tsx` e:

### 2.1 Adicione imports no topo:
```typescript
import { MacroNodeCard } from '@/components/nodes/MacroNode'
import { ScreenNodeCard } from '@/components/nodes/ScreenNode'
import { ConnectorLayer } from '@/components/canvas/ConnectorLayer'
import { Ibar } from '@/components/sidebar/Ibar'
import { Ebar } from '@/components/sidebar/Ebar'
import { RightPanel } from '@/components/panels/RightPanel'
import { FlowPanel } from '@/components/panels/FlowPanel'
import { FAB } from '@/components/ui/FAB'
```

### 2.2 Copie o código de IMPLEMENTATION_GUIDE.md (Seção 4.2)
Dentro da função `CanvasWorkspace`, substitua o return statement antigo

### 2.3 Teste TypeScript:
```bash
npm run typecheck
```

Se houver erros → veja seção "Troubleshooting" abaixo

---

## Passo 3: Testar (30 min)

### 3.1 Inicie o dev server:
```bash
npm run dev
```

### 3.2 Teste manual:

| Ação | Resultado esperado |
|---|---|
| Abrir projeto | Canvas vazio + Ibar + Ebar |
| FAB → "Design System" | Card roxo aparece |
| Drag o card | Move suavemente |
| FAB → "Journey" | Card azul aparece |
| DS → drag handle azul → drop em Journey | Linha curva com seta |
| Double-click em Journey | Entra em micro view |
| FAB em micro view → "Screen" | Card pequeno com thumbnail |
| Click em node → RightPanel | Painel abre e pode editar |

---

## ✅ Pronto!

Se todos os testes passaram, você tem:
- ✅ Canvas visual funcionando
- ✅ Nodes (macro e micro)
- ✅ Connectors
- ✅ Selection + editing
- ✅ Navigation (macro ↔ micro)

**Próximo passo:** Priority 2 (Context Form UI)

---

## ❌ Algo não funciona?

### Erro: "Cannot find module"
```
Error: Module not found: Can't resolve '@/components/nodes/MacroNode'
```
→ Verifique se arquivo está em `components/nodes/MacroNode.tsx` (e não em outro lugar)

### Erro: "Property does not exist on store"
```
TypeError: store.toggleEbarSection is not a function
```
→ Abra `lib/store/index.ts` e procure a linha com `.toggleEbarSection:`
→ Se não existir, adicione (veja IMPLEMENTATION_GUIDE.md, Passo 5)

### Componente em branco / não aparece
→ Verifique browser console (F12) para erros
→ Verifique se `view` é 'macro' ou 'micro'
→ Verifique se `ibarOpen` é true (clique Ibar para toggle)

### Styling errado / cores estranhas
→ Verifique Tailwind está rodando: `npm run dev` deve compilar CSS
→ Limpe node_modules: `rm -rf node_modules && npm install`

### Mais ajuda
→ Leia **IMPLEMENTATION_GUIDE.md** (Seção Troubleshooting)

---

## Referência Rápida

**Store actions mais usadas:**
```typescript
store.selectNode(id)              // Seleciona node
store.openJourney(id)            // Entra em Journey (micro view)
store.goMacro()                  // Volta para macro view
store.updateNode(id, patch)      // Edita node
store.updateScreen(...)          // Edita screen
store.fitView()                  // F key - encaixa view
store.moveNode(id, position)     // Arrastar
```

**Componentes instalados:**
```
MacroNodeCard      ← Nodes DS/Journey (roxo/azul)
ScreenNodeCard     ← Screens no micro view (small)
ConnectorLayer     ← SVG bezier curves
Ibar              ← Icon strip lateral
Ebar              ← Tree nodes/flows
RightPanel        ← Propriedades + context + info
```

**Keyboard shortcuts:**
```
F              → Fit view
Del            → Delete selected
Esc            → Clear selection
Double-click   → Enter Journey
Drag           → Move node/screen
```

---

## Próximos Passos

Quando esta base estiver sólida:

1. **Priority 2:** Context Form UI
   - Adicionar campos estruturados (components, APIs, etc)
   - Time: 3-4h

2. **Priority 3:** Figma Integration
   - Bind URLs e fetch thumbnails
   - Time: 3-4h

3. **Priority 4:** Generate Button
   - Wire Claude API
   - Build code modal
   - Time: 4-6h

---

## Documentação Completa

- **FLOWBRIDGE_ANALISE_COMPLETA.md** — Visão geral do projeto
- **PRIORITY_1_DETAILED_PLAN.md** — Plano detalhado com código
- **IMPLEMENTATION_GUIDE.md** — Passo a passo completo + troubleshooting
- **RESUMO_ENTREGA.md** — O que você tem + arquitetura

---

## Status

```
✅ Analysis done
✅ Components coded
✅ Documentation written
⏳ Your turn: integrate!
```

Boa sorte! 🚀

Qualquer dúvida, consulte os docs ou abre um issue.
