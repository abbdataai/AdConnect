# Content Templates

> **Purpose**: Pre-written pt-BR slide content blocks (and HTML/SVG snippet anchors) for the most common MKT WiFi slides
> **MCP Validated:** 2026-05-04

## When to Use

Use these as starting text for slide bodies. **Adapt wording for tone but never alter the canonical numbers, the tagline, or the LGPD-forbidden-list framing.**

## Opening / Title Slide

```text
Headline:   "Wi-Fi que paga a conta."
Subtitle:   "MKT WiFi — a plataforma multi-tenant SaaS que transforma
             redes captivas em ativos geradores de receita."
Visual:     Brand mark + animated radar (echoes the connecting screen of the portal)
Footer:     pt-BR · LGPD-compliant · Multi-tenant SaaS · Brasil 2026
```

HTML/SVG anchor: use the `title` slide type from `aide-slides/slide-types.md`. The radar animation should echo the captive-portal `connecting` step (radar SVG with rotating sweep + soft cyan glow).

## Three-Persona Value Slide (CMO / CTO / CFO)

```text
Headline:   "Um produto. Três conversas de C-Level."
Visual:     3-column method-grid with icon badges
Column 1 (CMO):  "Do blind spot ao First-Party Data"
                 • Captura de leads qualificados em fluxo físico
                 • Automação de marketing por proximidade
                 • Demografia em tempo real (idade, gênero, bairro)
Column 2 (CTO):  "SaaS multi-tenant escalável"
                 • Isolamento por organization_id (Postgres RLS)
                 • Provisionamento automático por subdomínio
                 • CI contínua + grep_pii_check.sh em cada PR
Column 3 (CFO):  "De custo passivo a ativo de receita"
                 • 4 modelos de monetização (CPV, pacote, híbrido, mensal)
                 • Custo operacional diluído pelo multi-tenant
                 • Receita compartilhada entre operador e plataforma
Bottom panel:    Tags: [Multi-tenant] [LGPD] [First-Party Data] [ROI]
```

HTML anchor: `method-grid` with `center-divider` class, 3 cells, each with an `icon-badge` SVG element at top, headline `Instrument Serif italic clamp(1.4rem, 2.2vw, 1.9rem)`, then a `<ul>` of three bullets.

## Captive-Portal Flow Slide (5 steps)

```text
Headline:   "Do toque na rede ao acesso liberado em 5 passos."
Visual:     SVG horizontal pipeline — 5 iOS-frame insets, viewBox=1200
Nodes:      Connecting (3.1s) → Form (anônimo) → Ad (30s) → Conectado (30 min) → Renew (60s)
Bottom:     "Coletamos apenas: nome · faixa etária · gênero · bairro.
             LGPD by design — assinado pelo Jurídico em 2026-05-03."
Tags:       [LGPD] [Anonimização] [5 passos] [grep_pii_check.sh]
```

SVG snippet template (insert into the slide body):

```html
<svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid meet">
  <!-- Node 1: connecting -->
  <g transform="translate(40, 60)">
    <rect x="0" y="0" width="180" height="240" rx="22" class="ios-frame"/>
    <text x="90" y="270" text-anchor="middle" class="node-label">Conectando</text>
    <text x="90" y="290" text-anchor="middle" class="node-sub">3.1s</text>
  </g>
  <!-- Node 2..5 follow same pattern with x offsets 240, 480, 720, 960 -->
  <!-- Arrows: glow-filtered SVG paths between nodes (no plain text arrows) -->
</svg>
```

`ios-frame` should fill with a thumbnail render of each step (use 1.4 aspect ratio insets matching the portal prototype).

## Multi-Tenant Architecture Slide

```text
Headline:   "Um deployment. N operadores. Zero vazamento."
Visual:     SVG architecture diagram — subdomain → JWT → tenant filter → row-level isolation
Layers:     [acme.mktwifi.com.br]  →  [auth/JWT]  →  [organization_id]  →  [Postgres RLS]
Bottom:     "Cada operador (café, shopping, rede de hotéis) é um Tenant.
             Toda tabela owned por operador carrega organization_id FK indexado.
             Resolução: subdomínio para admin, device_id → venue → org para portal."
Tags:       [Postgres RLS] [SQLAlchemy 2.x async] [TD-08] [TD-09]
```

SVG anchor: viewBox=1200×400, two parallel chains (admin path on top, portal device-chain on bottom) converging into a shared `organization_id` filter box, then a Postgres RLS box.

## Monetization 4-Tier Card Slide

```text
Headline:   "Quatro modelos. Um operador. Receita previsível."
Visual:     4-tier card grid with default prices
Tier 1:     CPV — "R$ 0,20 por visualização" — ideal para campanhas pontuais
Tier 2:     Pacote — "R$ 50 por 10h Wi-Fi" — receita previsível por bloco
Tier 3:     Híbrido — "View + tempo" — flexibilidade máxima
Tier 4:     Mensal — "R$ 299 / mês" — ARR estável, churn baixo
Bottom:     "Mudança de plano não afeta campanhas em andamento (FR-122).
             Moeda formatada em pt-BR: R$ vírgula-decimal, ponto-milhar."
Tags:       [CPV] [ARR] [Multi-modelo] [pt-BR currency]
```

HTML anchor: `tier-cards` with 4 cells, each cell has a price headline (Instrument Serif italic, glow on the chosen card), subtitle, 3-line benefit list. Add `pulse-glow` animation to the **Mensal R$ 299** card for ARR emphasis when audience is CFO.

## LGPD 3-Tier Slide

```text
Headline:   "Privacy-by-design, validado pelo Jurídico."
Visual:     3-tier comparison — tier-cards
Tier 1 — Coletamos:
            • Nome (primeiro)
            • Faixa etária (chips: 18-24 / 25-34 / 35-50 / 50+)
            • Gênero (chips: Feminino / Masculino / Prefiro não informar)
            • Bairro (select: Centro / Zona Norte / Sul / Leste / Oeste / Praia)
Tier 2 — Não coletamos:
            • Telefone
            • Email
            • CPF
            • Sobrenome
            • Data de nascimento exata
            • MAC visível
Tier 3 — Como garantimos:
            • Pydantic extra="forbid"
            • Literal types
            • grep_pii_check.sh em CI (AT-015)
Bottom:     "Sign-off do Departamento Jurídico em 2026-05-03 condicionado
             à anonimização — propagado em NFR-005, schema do Lead, e risco R3."
Tags:       [LGPD] [Privacy by Design] [NFR-005] [AT-015]
```

HTML anchor: `tier-cards` with 3 cells. Tier 2 cards must visually convey "forbidden" — apply a subtle red-tinted strikethrough class (e.g., `tier-forbidden`) so the audience reads the intent at a glance.

## Backend API Endpoints Clustered Table

```text
Headline:   "21 endpoints. 9 clusters. Tudo async."
Visual:     Clustered table (auth / dashboard / campaigns / users / devices /
            notifications / monetization / reports / portal)
Highlight:  Captive-portal cluster (4 endpoints) destacado em accent2
Bottom:     "FastAPI + Pydantic v2 + SQLAlchemy 2.x async. Run com 1 worker
             enquanto sessões ficarem em memória (DESIGN_CAPTIVE_PORTAL.md Decisão 3)."
Tags:       [FastAPI] [async] [21 endpoints] [Pydantic v2]
```

HTML anchor: `table` slide type. Use cluster-header rows (full-width spanning rows with cluster name + endpoint count). Color the captive-portal cluster row using the `accent2` token.

## ROI Bar-Chart Slide (CFO scenario)

```text
Headline:   "CPV vs ARR: dois caminhos, um operador."
Visual:     Horizontal animated bars
Bar 1:      CPV scenario — 1.500 views/mês × R$ 0,20 = R$ 300/mês variável
Bar 2:      Mensal ARR — R$ 299/mês fixo, churn baixo, previsível
Bottom:     "FR-122: mudança de plano não é retroativa.
             Recomendamos Mensal para operadores acima de 1.500 views/mês."
Tags:       [CPV] [ARR] [FR-122] [pt-BR currency]
```

Bars must use `animated-bars` from `aide-slides/animation-patterns.md` (left-to-right fill on slide entry, gold pulse-glow on the longer bar).

## Closing CTA Slide

```text
Headline:   "Pronto para transformar Wi-Fi em receita?"
Sub:        "MKT WiFi · multi-tenant SaaS · pt-BR · LGPD-ready"
CTA button: "Solicitar acesso"  (referência consciente ao FR-007)
Footer:     contato@mktwifi.com.br · acme.mktwifi.com.br
```

HTML anchor: `closing-quote` (gold-quote). The CTA button uses `pulse-glow` — it is the single most important element on the slide.

## See Also

- [patterns/slide-deck-types.md](slide-deck-types.md) — Deck content maps that consume these blocks
- [patterns/pt-br-formatting.md](pt-br-formatting.md) — Currency, chip, and UI string rules
- [concepts/lgpd-anonymization.md](../concepts/lgpd-anonymization.md) — LGPD source of truth
