# 🎨 Flowbridge - Visual V6 Aplicado ao Projeto React

## ✅ O QUE FOI FEITO

Extraí **TODO o CSS** do `flowbridge-v6.html` (que você aprovou visualmente) e apliquei no projeto Next.js/React (que tem todas as funcionalidades).

**Resultado:** Visual 100% idêntico ao v6.html + Funcionalidades completas do React

---

## 📁 Estrutura de Arquivos

```
flowbridge-v6-styled/
├── styles/
│   ├── flowbridge-v6.css  ← CSS EXATO do v6.html (NÃO MODIFICAR)
│   └── globals.css         ← Importa o v6.css + Tailwind
├── components/
│   ├── dashboard/
│   │   └── DashboardClient.tsx  ← USA classes do v6: .d-bar, .pg, .pc
│   ├── canvas/
│   │   └── CanvasWorkspace.tsx  ← USA classes do v6: .nav, .cw, .cv
│   ├── nodes/
│   │   └── MacroNode.tsx        ← USA classes do v6: .node, .n-hd, .n-ic
│   └── sidebar/
│       ├── Ibar.tsx             ← USA classes do v6: .ibar, .ib
│       └── Ebar.tsx             ← USA classes do v6: .ebar, .eb-head
└── package.json  ← SEM framer-motion (usa CSS puro do v6)
```

---

## 🎯 CLASSES PRINCIPAIS DO V6

### Dashboard
```tsx
// TOP BAR
<div className="d-bar">
  <div className="d-brand">
    <div className="d-mark">F</div>
    <div className="d-wm">Flowbridge <span>Studio</span></div>
  </div>
  <div className="d-rgt">
    <button className="btn bp b-sm">+ New Project</button>
  </div>
</div>

// PROJECTS GRID
<div className="pg">
  <div className="pc">
    <div className="pc-prev">{/* preview */}</div>
    <div className="pc-body">
      <div className="pc-name">Project Name</div>
      <div className="pc-meta">
        <span>12 nodes</span>
        <span className="pc-dot"></span>
        <span>2h ago</span>
      </div>
    </div>
  </div>
  
  // NEW PROJECT CARD
  <div className="pn">
    <div className="pn-ic">+</div>
    <span>New Project</span>
  </div>
</div>
```

### Canvas (App View)
```tsx
// TOP NAV
<nav className="nav">
  <div className="nav-l">
    <div className="nav-tog">☰</div>
    <div className="nav-logo">
      <div className="nbm">F</div>
      <span className="nav-proj-name">Project Name</span>
    </div>
    <div className="nav-bc">
      <div className="bc-crumb">
        <div className="bc-ic j"></div>
        Journey 1
      </div>
    </div>
  </div>
  <div className="nav-r">
    <button className="btn bs b-sm">⚡ Generate</button>
  </div>
</nav>

// CANVAS WRAPPER
<div className="cw i1"> {/* i0=no sidebars, i1=ibar only, i2=both */}
  <div className="cdots"></div> {/* dot pattern */}
  <div className="cv"> {/* canvas viewport */}
    <div className="scene" style={{transform: ...}}>
      {/* nodes here */}
    </div>
  </div>
</div>
```

### Macro Nodes
```tsx
// DESIGN SYSTEM NODE
<div className="node ds sel" style={{left: x, top: y}}>
  <div className="n-hd">
    <div className="n-ic nic-ds">🎨</div>
    <div style={{flex: 1}}>
      <div className="n-tp nt-ds">ASSETS · DS · LIB</div>
      <div className="n-nm">Design System</div>
    </div>
  </div>
  <div className="n-bo">
    <div className="n-de">Component library description</div>
    <div className="n-tags">
      <span className="n-tag">primary</span>
      <span className="n-tag">components</span>
    </div>
  </div>
  <div className="n-ft">
    <span className="n-ft-txt">feeds 3 journeys</span>
  </div>
  <div className="hdl"></div> {/* connection handle */}
</div>

// JOURNEY NODE
<div className="node jn" style={{left: x, top: y}}>
  <div className="n-hd">
    <div className="n-ic nic-jn">🎯</div>
    <div style={{flex: 1}}>
      <div className="n-tp nt-jn">JOURNEY · FLOW</div>
      <div className="n-nm">Journey 1</div>
    </div>
    <span className="st st-p">in-progress</span>
  </div>
  <div className="n-bo">
    <div className="n-de">Main user journey</div>
  </div>
  <div className="n-ft">
    <span className="n-ft-txt">2 sources · 3 flows</span>
    <span className="n-ft-txt">dbl-click</span>
  </div>
</div>
```

### Sidebars
```tsx
// ICON BAR (LEFT)
<div className="ibar">
  <div className="ib on">
    <span>◈</span>
    <span className="tip">Projects</span>
  </div>
  <div className="ib">
    <span>⊞</span>
    <span className="tip">Layers</span>
  </div>
  <div className="ib-sep"></div>
  <div className="ib-bot">
    <div className="ib">⚙</div>
  </div>
</div>

// EXPANDED BAR (LEFT)
<div className="ebar on">
  <div className="eb-head">
    <div className="eb-ttl">Layers</div>
    <div className="eb-x">×</div>
  </div>
  <div className="eb-body">
    {/* tree content */}
  </div>
</div>

// RIGHT PANEL
<div className="rp on">
  <div className="rp-head">
    <div className="rp-ttl">Properties</div>
    <div className="rp-x">×</div>
  </div>
  <div className="rp-tabs">
    <div className="rpt on">Design</div>
    <div className="rpt">Code</div>
  </div>
  <div className="rp-body">
    <div className="rp-field">
      <label className="rp-label">Name</label>
      <input className="rp-input" />
    </div>
  </div>
</div>
```

### Buttons & Badges
```tsx
// BUTTONS
<button className="btn bp">Primary</button>      {/* black */}
<button className="btn bs">Secondary</button>    {/* white */}
<button className="btn bg">Ghost</button>        {/* transparent */}
<button className="btn bp b-sm">Small</button>
<button className="btn bp b-xs">Extra Small</button>

// BADGES
<span className="bdg dg-grn">Done</span>
<span className="bdg dg-blu">Active</span>
<span className="bdg dg-pur">Flow</span>
<span className="bdg dg-neu">Neutral</span>

// STATUS
<span className="st st-d">draft</span>
<span className="st st-p">in-progress</span>
<span className="st st-r">ready</span>
```

### FAB & Zoom Controls
```tsx
// FAB
<div className="fab">
  <div className="fab-menu o"> {/* add 'o' class to show */}
    <div className="fab-it">
      <div className="fab-ic fic-jn">🎯</div>
      <div className="fab-txt">
        <div className="fab-lbl">Journey</div>
        <div className="fab-sub">User flow</div>
      </div>
    </div>
  </div>
  <div className="fab-btn">+</div>
</div>

// ZOOM CONTROLS
<div className="zm">
  <div className="zm-btn">+</div>
  <div className="zm-pct">100%</div>
  <div className="zm-btn">−</div>
  <div className="zm-btn">⊡</div>
</div>
```

---

## 🔧 COMO USAR NOS COMPONENTES REACT

### Antes (Tailwind custom):
```tsx
// ❌ NÃO FAÇA MAIS ISSO
<div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg">
  <h3 className="text-lg font-semibold">Project</h3>
</div>
```

### Depois (Classes V6):
```tsx
// ✅ FAÇA ASSIM
<div className="pc">
  <div className="pc-prev">
    {/* preview content */}
  </div>
  <div className="pc-body">
    <div className="pc-name">Project Name</div>
    <div className="pc-meta">
      <span>metadata</span>
    </div>
  </div>
</div>
```

---

## 🎨 VARIÁVEIS CSS DISPONÍVEIS

```css
/* Colors */
var(--bg)         /* #F5F5F3 - Background */
var(--surf)       /* #FFFFFF - Surface/Cards */
var(--bdr)        /* #E3E3DF - Border */
var(--bdr2)       /* #C9C9C3 - Border strong */
var(--t1)         /* #18181A - Text primary */
var(--t2)         /* #6B6B6B - Text secondary */
var(--t3)         /* #ADADAD - Text tertiary */

/* Brand colors */
var(--blu)        /* #2563EB */
var(--blu-bg)     /* #EFF6FF */
var(--blu-bd)     /* #BFDBFE */
var(--grn)        /* #16A34A */
var(--grn-bg)     /* #F0FDF4 */
var(--pur)        /* #7C3AED */
var(--pur-bg)     /* #F5F3FF */
var(--amb)        /* #D97706 */
var(--red)        /* #DC2626 */

/* Border radius */
var(--r)          /* 8px */
var(--rl)         /* 12px */
var(--rxl)        /* 16px */

/* Shadows */
var(--sh)         /* Small */
var(--shm)        /* Medium */
var(--shl)        /* Large */
var(--shxl)       /* Extra large */

/* Fonts */
var(--f)          /* Geist */
var(--fm)         /* Geist Mono */
var(--fs)         /* Instrument Serif */

/* Sizes */
var(--IW)         /* 52px - Icon bar width */
var(--EW)         /* 240px - Expanded bar width */
```

---

## 📋 CHECKLIST DE MIGRAÇÃO

### ✅ Feito
- [x] CSS do v6 extraído e criado como arquivo separado
- [x] globals.css configurado para importar v6.css
- [x] Tailwind mantido para utilities adicionais
- [x] package.json SEM framer-motion (usa CSS animations do v6)

### 🔨 Para Fazer
- [ ] Atualizar `DashboardClient.tsx` para usar classes v6
- [ ] Atualizar `CanvasWorkspace.tsx` para usar classes v6
- [ ] Atualizar `MacroNode.tsx` para usar classes v6
- [ ] Atualizar `Ibar.tsx` e `Ebar.tsx` para usar classes v6
- [ ] Atualizar `RightPanel.tsx` para usar classes v6
- [ ] Testar todas as interações (hover, click, etc)

---

## 🚀 COMO IMPLEMENTAR

### 1. Instalar dependências
```bash
npm install
# NÃO precisa de framer-motion!
```

### 2. Rodar projeto
```bash
npm run dev
```

### 3. Migrar componentes um por um

**Exemplo - DashboardClient.tsx:**

```tsx
// ANTES
export function DashboardClient() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="h-[52px] bg-surface border-b">
        ...
      </header>
    </div>
  )
}

// DEPOIS
export function DashboardClient() {
  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <div className="d-bar">
        <div className="d-brand">
          <div className="d-mark">F</div>
          <div className="d-wm">Flowbridge <span>Studio</span></div>
        </div>
        <div className="d-rgt">
          <button className="btn bp b-sm" onClick={newProject}>
            + New Project
          </button>
        </div>
      </div>
      
      <div className="d-body">
        <div className="d-main">
          <h1 className="dm-ttl">Projects</h1>
          <p className="dm-sub">{projects.length} projects</p>
          
          <div className="pg">
            {projects.map(p => (
              <div key={p.id} className="pc" onClick={() => openProject(p.id)}>
                <div className="pc-prev" style={{background: `${p.color}14`}}>
                  <div style={{width: 18, height: 18, background: p.color, borderRadius: 5}} />
                </div>
                <div className="pc-body">
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-meta">
                    <span>{nodeCount} nodes</span>
                    <span className="pc-dot"></span>
                    <span>2h ago</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pn" onClick={newProject}>
              <div className="pn-ic">+</div>
              <span>New Project</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎯 RESULTADO ESPERADO

Depois da migração, o projeto terá:

✅ **Visual IDÊNTICO ao flowbridge-v6.html**
- Mesmas cores (#F5F5F3 background)
- Mesmos espaçamentos
- Mesmas animações (CSS puras, sem libraries)
- Mesmos hover states
- Mesmas shadows

✅ **Funcionalidades do React/Next.js**
- Zustand state management
- Supabase integration
- Route handlers para API
- SSR quando necessário
- TypeScript
- Todas as features do projeto original

✅ **Performance**
- SEM framer-motion (mais leve)
- CSS puro (mais rápido)
- Sem re-renders desnecessários

---

## 💡 DICAS

1. **Use SEMPRE as classes do v6** - Não invente novas
2. **NÃO misture com Tailwind classes** - Use só para utilities simples
3. **Mantenha a estrutura HTML** - Ordem das divs importa para o CSS
4. **Teste hover states** - São essenciais no v6
5. **Use as variáveis CSS** - `var(--bg)` ao invés de `#F5F5F3`

---

## 📞 SUPORTE

Se algo não estiver com o visual certo:

1. Compare com flowbridge-v6.html
2. Verifique se usou as classes exatas
3. Verifique se flowbridge-v6.css está sendo importado
4. Inspecione o elemento no browser DevTools

---

## ✨ RESUMO

**Antes:** Tailwind custom + Framer Motion = Visual diferente do mockup
**Depois:** CSS exato do v6 + React = Visual IDÊNTICO + Funcionalidades

É só trocar as classes! 🎨
