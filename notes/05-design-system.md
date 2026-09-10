# AI Knowledge Inbox Design System

## Purpose

This document is the visual source of truth for the entire frontend. New screens and components must reuse these tokens and patterns instead of introducing local colors, radii, shadows, or interaction styles.

The product should feel like a premium developer productivity tool: quiet, focused, and information-dense. Depth comes from neutral surface hierarchy and subtle borders. Electric violet is reserved for actions, focus, and small emphasis.

## Design principles

1. Use deep neutral surfaces with one restrained accent.
2. Create hierarchy through spacing, typography, and surface tone.
3. Prefer subtle borders to large shadows.
4. Keep radii moderate; pills are only for compact badges and statuses.
5. Use gradients only for the single ambient page background and the AI answer surface.
6. Use motion only to clarify state, with transitions between 150–250ms.
7. Use Lucide icons with consistent sizing and stroke weight.
8. Every interactive element needs hover, focus, disabled, loading, and error states where applicable.

## Design tokens

The canonical implementation lives in `frontend/src/styles/base.css`.

```css
:root {
  --background: #0b0d12;
  --surface: #11141b;
  --surface-secondary: #171b24;
  --surface-elevated: #1c212b;

  --text-primary: #f5f7fa;
  --text-secondary: #a7afbe;
  --text-muted: #687386;

  --border: #252b36;
  --border-hover: #343c4b;

  --primary: #8b5cf6;
  --primary-hover: #9d72ff;
  --primary-soft: rgba(139, 92, 246, 0.1);
  --primary-focus: rgba(139, 92, 246, 0.12);

  --success: #34d399;
  --success-soft: rgba(52, 211, 153, 0.1);
  --warning: #fbbf24;
  --error: #fb7185;
  --error-soft: rgba(251, 113, 133, 0.1);
  --info: #60a5fa;
  --text-on-primary: #ffffff;
  --primary-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);

  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;

  --transition-fast: 150ms ease;
  --transition-standard: 200ms ease;
}
```

Do not introduce another color when an existing semantic token expresses the same role.

## Surface hierarchy

| Level | Token | Use |
| --- | --- | --- |
| Page | `--background` | Application canvas |
| Primary | `--surface` | Main cards and panels |
| Secondary | `--surface-secondary` | Inputs, nested cards, snippets |
| Elevated | `--surface-elevated` | Hovered cards, menus, popovers |

Use `--border` for cards, inputs, major containers, and separators. Use `--border-hover` for hover states. Do not outline every small label or icon.

## Typography

Use Geist when it is bundled with the application; otherwise use Inter and the system sans-serif fallback stack. Do not require a remote font request.

| Role | Size | Weight | Color |
| --- | --- | --- | --- |
| Page title | 32px | 600 | `--text-primary` |
| Section title | 18px | 600 | `--text-primary` |
| Body | 14–15px | 400 | `--text-secondary` |
| Metadata | 12px | 400–600 | `--text-muted` |

Use concise labels and sentence case. Avoid pure white for normal text.

## Spacing and layout

Use an 8px base rhythm. Preferred gaps are 8, 12, 16, 24, 32, 48, and 64px. Center the primary workspace within a maximum width of 1120px. Keep content readable on small screens and preserve at least 16px page padding.

## Component patterns

### Buttons

- Primary background: `--primary`
- Hover background: `--primary-hover`
- Text: white
- Radius: `--radius-md`
- Shadow: `0 4px 16px rgba(139, 92, 246, 0.2)`
- Minimum target size: 44px
- Disabled state: reduced opacity and no hover movement

Secondary buttons use a neutral surface, `--border`, and `--text-secondary`.

### Inputs

- Background: `--surface`
- Border: `--border`
- Radius: `--radius-md`
- Text: `--text-primary`
- Placeholder: `--text-muted`
- Focus border: `--primary`
- Focus ring: `0 0 0 3px var(--primary-focus)`

Inputs must have a visible label or an accessible name. Validation errors use `--error` and explain how to recover.

### Cards

Main and knowledge cards use `--surface`, `--border`, and `--radius-xl`. Nested cards use `--surface-secondary` and `--radius-lg`. Hover changes the background to `--surface-secondary` and border to `--border-hover` with a 150ms transition.

### Badges

Badges may use `--radius-full` because they are compact metadata. Note badges use `--primary-soft` with a light violet foreground. URL badges use a 10% info tint with `--info`. Success badges use a 10% success tint with `--success`.

### Icons

Use Lucide icons. Default icons use `--text-muted`; active icons use `--primary-hover`. Icon containers use `--surface-secondary`, `--border`, and `--radius-md`.

### AI answers

AI answers are the main visual focal point. Use a restrained gradient from `#141821` to `--surface`, a `#2a3040` border, and `--radius-xl`. Present cited sources directly below the answer.

### Source snippets

Use `--surface-secondary`, `--border`, and `--radius-lg`. Titles use `--text-primary`, snippets use `--text-secondary`, and URLs use `--primary`.

## Status states

Use semantic colors consistently:

- Connected or completed: `--success`
- Checking or caution: `--warning`
- Failed or offline: `--error`
- Informational: `--info`

Pair color with an icon and text. Color alone must never communicate status.

## Responsive behavior

- Desktop: use multi-column layouts when the content benefits from comparison.
- Tablet: collapse complex layouts into one column below 840px.
- Mobile: use 16px page gutters, stack controls, and keep tap targets at least 44px.
- Avoid fixed heights for content regions.
- Test long titles, errors, URLs, and generated answers for wrapping.

## Accessibility

- Meet WCAG AA contrast for normal text and controls.
- Preserve visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Use semantic headings, landmarks, labels, and button elements.
- Announce asynchronous result changes with an appropriate live region.

## Avoid

- Violet as a large background fill
- Gradients on every button, card, heading, or icon
- Glassmorphism and heavy blur
- Neon glows and oversized shadows
- Large landing-page typography inside the application workspace
- Excessive pills, animation, or floating cards
- Hard-coded values that duplicate an existing token

## Implementation rule

Before adding a new UI component, choose its surface, typography role, radius, state colors, and interaction behavior from this document. Extend the token system only when a new semantic need cannot be represented by an existing token, and document that extension here in the same change.
