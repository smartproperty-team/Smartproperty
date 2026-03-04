# SmartProperty Design System

This file defines the visual rules to keep all future components consistent.

## 1) Color System

Use CSS variables from `src/index.css` (Design Tokens section).

### Brand / Action

- `--sp-color-brand`: primary blue action
- `--sp-color-brand-hover`: blue hover
- `--sp-color-accent`: primary CTA orange (hero search)
- `--sp-color-accent-hover`: orange hover

### Text

- `--sp-color-text`: main heading/body text
- `--sp-color-text-muted`: placeholder/secondary text

### Surfaces / Borders

- `--sp-color-surface`: white cards/panels
- `--sp-color-surface-muted`: light background for hover/subtle blocks
- `--sp-color-border`: standard border color

## 2) Sizing and Spacing

### Radii

- `--sp-radius-xs`: 6px
- `--sp-radius-sm`: 8px
- `--sp-radius-md`: 12px
- `--sp-radius-lg`: 18px
- `--sp-radius-pill`: 999px (pills/chips/nav shell)

### Control heights

- `--sp-control-height-sm`: 40px
- `--sp-control-height-md`: 48px (default)
- `--sp-control-height-lg`: 56px (hero/search prominent controls)

### Spacing scale

- `--sp-space-xs`: 4px
- `--sp-space-sm`: 8px
- `--sp-space-md`: 12px
- `--sp-space-lg`: 16px
- `--sp-space-xl`: 24px
- `--sp-space-2xl`: 32px

## 3) Typography

Use existing project font stack and these tokenized sizes:

- `--sp-font-12`: micro labels/chips
- `--sp-font-14`: default button/nav text
- `--sp-font-16`: inputs/body defaults
- `--sp-font-18`: emphasized controls

## 4) Shadows

- `--sp-shadow-sm`: subtle elements
- `--sp-shadow-md`: cards and floating nav shell
- `--sp-shadow-lg`: large hero/search surfaces

## 5) Reusable Component Classes

Defined in `src/index.css` under `@layer components`:

- `.sp-container`: centered responsive container for pages/sections
- `.sp-card`: base card style
- `.sp-btn`: base button behavior
- `.sp-btn-primary`: primary blue button
- `.sp-btn-accent`: orange CTA button
- `.sp-btn-outline`: outlined neutral button
- `.sp-field`: text input field
- `.sp-select`: select field
- `.sp-chip`: compact status/category pill

## 6) Button Rules

Always build buttons from `.sp-btn` + one variant:

- Primary flow: `.sp-btn.sp-btn-primary`
- Hero / strongest CTA: `.sp-btn.sp-btn-accent`
- Neutral secondary actions: `.sp-btn.sp-btn-outline`

For icon buttons, keep icon size 16–18px and spacing 8px.

## 7) Form Rules

- Use `.sp-field` / `.sp-select` for all standard forms.
- Keep input/select heights equal in same row.
- Keep focus ring consistent with orange focus style (`box-shadow` in tokens).

## 8) Layout Rules (Site-wide)

- Root app is full width and full height.
- Use `.sp-container` for internal content alignment.
- Avoid hardcoded widths unless component-specific (hero/search can be wider).

## 9) Implementation Checklist for New Components

1. Use tokenized colors/radius/shadows only.
2. Reuse `.sp-*` classes before creating new classes.
3. If a new pattern is needed, add it to `src/index.css` under `@layer components`.
4. Do not place CSS inside `.tsx` files.
5. Keep hover/focus states defined for accessibility.
