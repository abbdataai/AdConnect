# pt-BR Formatting Rules

> **Purpose**: Brazilian Portuguese formatting rules and canonical UI strings for MKT WiFi slides
> **MCP Validated:** 2026-05-04

## When to Use

- Whenever a slide displays a currency, phone, date, role, chip group, or product UI string
- Whenever copying user-facing text from the captive portal or admin SPA prototypes
- Whenever an English label is tempting (almost always wrong on a pt-BR deck)

## Currency

| Format | Correct | Wrong |
|--------|---------|-------|
| Symbol | `R$ ` (with space after `$`) | `R$0,20`, `R$ 0.20` |
| Decimal | comma `,` | dot `.` |
| Thousands | dot `.` | comma `,` |

| Value | pt-BR display |
|-------|---------------|
| 0.20 | `R$ 0,20` |
| 50.00 | `R$ 50,00` |
| 299.00 | `R$ 299,00` |
| 1500.00 | `R$ 1.500,00` |
| 12500.50 | `R$ 12.500,50` |

## Phone

Format: `(NN) NNNNN-NNNN` (mobile) or `(NN) NNNN-NNNN` (landline). **Note:** the captive portal must NEVER collect a phone number — this format applies only to admin-side data (e.g., operator support contacts) per LGPD anonymization rules. See [concepts/lgpd-anonymization.md](../concepts/lgpd-anonymization.md).

| Correct | Wrong |
|---------|-------|
| `(11) 99999-9999` | `+55 11 99999-9999` |
| `(21) 3333-4444` | `21-3333-4444` |

## CNPJ

Format: `NN.NNN.NNN/NNNN-NN`. **Never collect on the captive portal.** Use only for operator-onboarding contexts in admin slides.

| Correct | Wrong |
|---------|-------|
| `12.345.678/0001-99` | `12345678000199` |

## Date

Format: `DD/MM/YYYY` (Brazilian convention).

| Correct | Wrong |
|---------|-------|
| `30/04/2026` | `2026-04-30` (ISO is fine for backend, not for slide UI) |
| `03/05/2026` | `05/03/2026` (US order is wrong) |

## Role Labels (BD-03)

Always pt-BR:

| Tier | Label |
|------|-------|
| Operator-admin | **Administrador** |
| Advertiser | **Anunciante** |
| Viewer | **Visualizador** |

Never use English ("Admin", "Advertiser", "Viewer") in slide UI.

## Captive-Portal Chip Values (FR-022)

Use these exact strings — never translate, never paraphrase:

### Idade chips

| Chip label |
|------------|
| `18-24` |
| `25-34` |
| `35-50` |
| `50+` |

### Gênero chips

| Chip label |
|------------|
| `Feminino` |
| `Masculino` |
| `Prefiro não informar` |

### Bairro options

| Option label |
|--------------|
| `Centro` |
| `Zona Norte` |
| `Zona Sul` |
| `Zona Leste` |
| `Zona Oeste` |
| `Praia` |

## Common UI Strings (Verbatim)

These are user-facing strings from the prototypes — copy verbatim onto slides:

| Context | String |
|---------|--------|
| Login: keep-signed-in checkbox | `Manter conectado` |
| Login: forgot-password link | `Esqueci minha senha` |
| Login: SSO buttons (Google/Microsoft) | `em breve` (the SSO buttons are roadmap, not shipped — FR-006) |
| Login: signup-style CTA | `Solicitar acesso` |
| Connected screen: renewal reward chip | `+30 min acesso` |
| Connected screen: welcome line | `Aproveite, {firstName}!` |
| Renew screen: primary CTA | `Assistir e renovar` |
| Privacy reassurance line (under form) | `Seus dados ficam seguros e nunca são vendidos.` |

## Roadmap Status Strings

When a feature is not yet shipped, mark it explicitly. **Never claim a feature ships when it is `em breve`** (per anti-pattern rule 11 in the agent file).

| Feature | Status | FR-ID |
|---------|--------|-------|
| SSO Google | `em breve` | FR-006 |
| SSO Microsoft | `em breve` | FR-006 |
| "Nova regra" creation flow | `em breve` | FR-104 |

## Common Mistakes

| Don't | Do |
|-------|-----|
| `R$0,20` (no space) | `R$ 0,20` |
| `R$ 0.20` (dot decimal) | `R$ 0,20` |
| `R$ 1,500.00` (US thousands) | `R$ 1.500,00` |
| `+55 11 99999-9999` | `(11) 99999-9999` |
| `2026-04-30` on a UI slide | `30/04/2026` |
| `Admin` / `Advertiser` / `Viewer` | `Administrador` / `Anunciante` / `Visualizador` |
| `Female` / `Male` / `Prefer not to say` | `Feminino` / `Masculino` / `Prefiro não informar` |
| `18 to 24` | `18-24` |
| Showing SSO buttons as active | Add `em breve` chip and cite FR-006 |

## See Also

- [concepts/lgpd-anonymization.md](../concepts/lgpd-anonymization.md) — Why phone/CPF are forbidden on the portal
- [concepts/captive-portal-flow.md](../concepts/captive-portal-flow.md) — Where chip values appear
- [patterns/content-templates.md](content-templates.md) — Pre-written content blocks that follow these rules
