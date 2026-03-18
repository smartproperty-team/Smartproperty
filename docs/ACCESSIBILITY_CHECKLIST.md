# Accessibility Checklist (POUR)

This checklist is based on the 4 accessibility principles and rules shown in your requirement image.
Use it during design, development, QA, and release validation.

## How to use this checklist

- Mark each item as done only after manual verification.
- Validate with keyboard-only navigation and a screen reader.
- Re-check after major UI or content changes.

## 1) Perceptible

### 1.1 Texte alternatif

- [ ] Every informative image has meaningful alt text.
- [ ] Decorative images/icons use empty alt (alt="").
- [ ] Icon-only buttons include an accessible name (aria-label or visible text).
- [ ] Charts/complex visuals include a text summary.

### 1.2 Media temporel

- [ ] Videos include captions.
- [ ] Audio-only content has a transcript.
- [ ] Video content includes transcript or audio description when needed.
- [ ] Autoplay media can be paused or stopped.

### 1.3 Adaptable

- [ ] Content order remains logical when styles are removed.
- [ ] Headings follow semantic hierarchy (h1 -> h2 -> h3 ...).
- [ ] Forms use proper labels, fieldsets, and legends when grouping is needed.
- [ ] Tables use semantic headers (<th>) and structure.

### 1.4 Distinguable

- [ ] Text contrast meets minimum ratio (normal text >= 4.5:1, large text >= 3:1).
- [ ] Information is not conveyed by color alone.
- [ ] Text can be resized to 200% without loss of content/function.
- [ ] Focus indicators are clearly visible.

## 2) Utilisable

### 2.1 Accessible au clavier

- [ ] All interactive elements are reachable by keyboard.
- [ ] No keyboard trap exists.
- [ ] Tab order is logical and predictable.
- [ ] Custom controls support keyboard interaction.

### 2.2 Assez de temps

- [ ] Users can extend or disable time limits where possible.
- [ ] Session timeout warnings are provided in advance.
- [ ] Auto-updating content can be paused/stopped.

### 2.3 Crise d'epilepsie

- [ ] No content flashes more than 3 times per second.
- [ ] Animations avoid seizure-triggering patterns.
- [ ] Motion effects have reduced-motion alternatives when relevant.

### 2.4 Navigable

- [ ] Every page has a clear title.
- [ ] Skip link to main content is available.
- [ ] Navigation is consistent across screens.
- [ ] Link text is descriptive (no generic "click here").
- [ ] Current location/state is communicated (active nav, breadcrumbs, stepper state).

## 3) Comprehensible

### 3.1 Lisible

- [ ] Primary language is defined in the document/page.
- [ ] Instructions are clear and concise.
- [ ] Acronyms/abbreviations are explained when needed.

### 3.2 Previsible

- [ ] UI components behave consistently.
- [ ] Focus changes do not trigger unexpected context changes.
- [ ] New windows/tabs are announced to users.

### 3.3 Input

- [ ] Form errors are clearly identified near relevant fields.
- [ ] Error messages explain how to fix the issue.
- [ ] Required fields are clearly indicated.
- [ ] Important actions include confirmation when needed.

## 4) Robuste

### 4.1 Compatible

- [ ] HTML is semantically valid.
- [ ] ARIA is used only when necessary and correctly.
- [ ] UI is tested with screen readers (at least one desktop + one mobile flow).
- [ ] UI is tested in major browsers and responsive breakpoints.

## Quick Validation Log

- [ ] Keyboard-only pass completed
- [ ] Screen reader pass completed
- [ ] Contrast pass completed
- [ ] Forms and errors pass completed
- [ ] Media accessibility pass completed
- [ ] Regression pass completed after fixes

## Notes

- Date:
- Reviewer:
- Scope:
- Known exceptions:
