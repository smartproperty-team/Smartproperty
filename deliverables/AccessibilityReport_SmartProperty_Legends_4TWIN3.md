# Accessibility Audit Report (WCAG) - SmartProperty

**Project Code:** SmartProperty
**Team Name:** Legends
**Class:** 4TWIN3
**Date:** May 2026
**Standard:** WCAG 2.1 (Level A & AA)
**Application URL:** *(see main README.md)*

---

## 1. Executive Summary

This report presents a comprehensive accessibility audit of the SmartProperty platform based on the Web Content Accessibility Guidelines (WCAG) 2.1. The audit covers all four POUR principles (Perceivable, Operable, Understandable, Robust) and documents the compliance level achieved, issues detected, and corrective measures implemented.

### Compliance Level Achieved: **WCAG 2.1 Level AA (Partial)**

The application meets the majority of Level A and Level AA success criteria. Remaining items are documented in the "Known Limitations" section.

---

## 2. Audit Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| axe-core | via @axe-core/playwright 4.11.1 | Automated accessibility rule testing |
| Playwright | 1.58.2 | Browser automation for accessibility checks |
| Lighthouse Accessibility | Chrome DevTools | Accessibility scoring and issue detection |
| Manual Keyboard Testing | N/A | Tab order, focus management, keyboard traps |
| Color Contrast Analyzer | axe-core `color-contrast` rule | WCAG contrast ratio verification |

---

## 3. Pages Audited

| Page | URL | Priority |
|------|-----|----------|
| Home | `/` | High |
| Properties | `/properties` | High |
| Login | `/login` | High |
| Register | `/register` | High |
| Dashboard | `/dashboard` | Medium |
| Property Detail | `/properties/:id` | Medium |
| Settings | `/settings` | Medium |

---

## 4. POUR Compliance Assessment

### 4.1 Perceivable

#### 1.1 Text Alternatives - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.1.1 Non-text Content | PASS | All informative images have meaningful `alt` text. Decorative images use `alt=""`. Icon-only buttons include `aria-label`. |

#### 1.2 Time-Based Media - N/A

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.2.1 Audio/Video | N/A | No `<video>` or `<audio>` elements found in core routes. No embedded media players detected during automated scan. |

#### 1.3 Adaptable - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.3.1 Info and Relationships | PASS | Headings follow semantic hierarchy (`h1` > `h2` > `h3`). Forms use proper labels. Tables use `<th>` headers. |
| 1.3.2 Meaningful Sequence | PASS | Content order remains logical when styles are removed. Source order matches visual order. |
| 1.3.3 Sensory Characteristics | PASS | Instructions do not rely solely on shape, size, or visual location. |

#### 1.4 Distinguishable - PASS (Level AA)

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.4.1 Use of Color | PASS | Status indicators include text labels (e.g., "Approved"/"Rejected") in addition to color. |
| 1.4.3 Contrast (Minimum) | PASS | All core pages pass axe-core `color-contrast` rule. Normal text >= 4.5:1, large text >= 3:1. |
| 1.4.4 Resize Text | PASS | Text resizable to 200% without loss of content or function. Automated test confirms no horizontal overflow at 200% zoom on all core routes. |
| 1.4.5 Images of Text | PASS | No images of text used; all text is rendered as real text. |

**Contrast Audit Evidence:**

Initial audit (March 2026) found contrast violations on Home and Properties pages:
- `#tab-sale` text: ~1.55:1 ratio (required >= 4.5:1)
- `.search-button > span`: ~1.55:1
- `.cta-button`: ~1.55:1
- `.logo-text`: ~1.36:1 (required >= 3:1 for large text)
- `.footer-subscribe-form button`: ~1.55:1

**Corrective measures applied:**
- Updated button background/text color combinations for CTA elements
- Fixed logo text contrast in footer
- Fixed subscribe button contrast

**Final re-audit result:** 0 contrast violations across all 4 core routes (`/`, `/properties`, `/login`, `/register`).

**Text Resize Evidence:**
```json
{
  "method": "Playwright html font-size 200% smoke check",
  "results": [
    { "url": "/",           "hasHOverflow": false },
    { "url": "/properties", "hasHOverflow": false },
    { "url": "/login",      "hasHOverflow": false },
    { "url": "/register",   "hasHOverflow": false }
  ]
}
```

---

### 4.2 Operable

#### 2.1 Keyboard Accessible - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 2.1.1 Keyboard | PASS | All interactive elements reachable by keyboard. Custom controls support keyboard interaction. |
| 2.1.2 No Keyboard Trap | PASS | No keyboard traps detected. Automated Playwright test confirms `probableTrap: false` on all core routes. |

**Keyboard Navigation Evidence:**
```json
{
  "method": "Playwright tab sequence smoke test",
  "results": [
    { "url": "/",           "focusableCount": 53, "uniqueFocusTargets": 17, "probableTrap": false },
    { "url": "/properties", "focusableCount": 41, "uniqueFocusTargets": 14, "probableTrap": false },
    { "url": "/login",      "focusableCount": 12, "uniqueFocusTargets": 12, "probableTrap": false },
    { "url": "/register",   "focusableCount": 14, "uniqueFocusTargets": 14, "probableTrap": false }
  ]
}
```

**Corrective measure:** Mobile menu links removed from tab order when closed via conditional `tabIndex` and `aria-hidden` in `HomeNavbar`, preventing hidden-focus jumps on small screens.

#### 2.2 Enough Time - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 2.2.1 Timing Adjustable | PASS | Session timeout warning added with "Stay signed in" action using refresh-token flow. |
| 2.2.2 Pause, Stop, Hide | PASS | Notifications panel includes pause/resume toggle for 30-second live updates. |

#### 2.3 Seizures and Physical Reactions - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 2.3.1 Three Flashes | PASS | No content flashes more than 3x/second. Animations are loading spinners, pulse placeholders, slow decorative motion. |
| 2.3.3 Motion from Interactions | PASS | Global `prefers-reduced-motion: reduce` fallback added in `index.css`. |

#### 2.4 Navigable - PASS (Level AA)

| Criterion | Status | Details |
|-----------|--------|---------|
| 2.4.1 Bypass Blocks | PASS | Skip link (`a.skip-link`) to main content implemented and verified in keyboard test. |
| 2.4.2 Page Titled | PASS | Centralized route-based `document.title` in `App.tsx` for all key routes. |
| 2.4.3 Focus Order | PASS | Tab order is logical and predictable across all tested pages. |
| 2.4.4 Link Purpose | PASS | No generic "click here" links. Link text is descriptive. |
| 2.4.5 Multiple Ways | PASS | Navigation bar + direct URL access + search functionality. |
| 2.4.7 Focus Visible | PASS | `:focus-visible` outline/ring patterns in shared styles and components. |

---

### 4.3 Understandable

#### 3.1 Readable - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 3.1.1 Language of Page | PASS | `lang` attribute set in `index.html`. Runtime language updates on toggle via `document.documentElement.lang` in `App.tsx`. |
| 3.1.2 Language of Parts | PASS | Acronyms expanded (e.g., "GDPR" -> "General Data Protection Regulation"). |

#### 3.2 Predictable - PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 3.2.1 On Focus | PASS | Focus does not trigger unexpected context changes. |
| 3.2.2 On Input | PASS | No unexpected behavior on form input. |
| 3.2.3 Consistent Navigation | PASS | Shared navbar/sidebar patterns across all flows. |
| 3.2.4 Consistent Identification | PASS | UI components follow consistent patterns. |

#### 3.3 Input Assistance - PASS (Level AA)

| Criterion | Status | Details |
|-----------|--------|---------|
| 3.3.1 Error Identification | PASS | Field-level errors near inputs with `aria-describedby` and `aria-invalid`. |
| 3.3.2 Labels or Instructions | PASS | All form fields have associated labels. |
| 3.3.3 Error Suggestion | PASS | Error messages provide correction guidance (e.g., "Invalid email format"). |
| 3.3.4 Error Prevention | PASS | Destructive actions use confirmation dialogs. Required fields marked with `required` + `aria-required`. |

---

### 4.4 Robust

#### 4.1 Compatible - PARTIAL PASS (Level A)

| Criterion | Status | Details |
|-----------|--------|---------|
| 4.1.1 Parsing | PASS | HTML is semantically valid. No editor diagnostics errors. |
| 4.1.2 Name, Role, Value | PASS | ARIA used correctly. Redundant ARIA removed (e.g., `footer[role="contentinfo"]`). Necessary ARIA preserved (`aria-current`, `aria-expanded`, `aria-controls`). |
| 4.1.3 Status Messages | PASS | Form errors and notifications communicated to assistive technology. |

---

## 5. Issues Found and Corrective Measures

### Resolved Issues

| # | Issue | Severity | WCAG Criterion | Fix Applied |
|---|-------|----------|-----------------|-------------|
| 1 | Low contrast on CTA buttons (home page) | High | 1.4.3 | Updated button colors to meet 4.5:1 ratio |
| 2 | Low contrast on logo text | Medium | 1.4.3 | Updated footer logo text color |
| 3 | Low contrast on subscribe button | Medium | 1.4.3 | Updated footer button color scheme |
| 4 | Low contrast on empty-state text (properties) | Medium | 1.4.3 | Updated text color for sufficient contrast |
| 5 | Mobile menu items in tab order when hidden | Medium | 2.1.1 | Added conditional `tabIndex`/`aria-hidden` |
| 6 | Missing skip link on non-home routes | Medium | 2.4.1 | Added app-level skip link for all routes |
| 7 | Missing page titles for routes | Medium | 2.4.2 | Added centralized route-based `document.title` |
| 8 | No session timeout warning | Medium | 2.2.1 | Added in-app warning with extend/dismiss actions |
| 9 | No reduced-motion global fallback | Low | 2.3.3 | Added `prefers-reduced-motion: reduce` in `index.css` |
| 10 | Redundant ARIA roles | Low | 4.1.2 | Removed redundant `role` attributes where native HTML semantics suffice |
| 11 | External links not announced | Low | 3.2.2 | Added "opens in new tab" to `aria-label`/`title` |
| 12 | No notification pause control | Low | 2.2.2 | Added pause/resume toggle for live updates |

### Known Limitations

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Screen reader cross-device testing | Pending | Manual testing with NVDA/VoiceOver not yet completed |
| 2 | Multi-browser responsive testing | Pending | Full cross-browser validation at all breakpoints not yet done |
| 3 | axe `incomplete` nodes | Informational | Some nodes flagged as "incomplete" by axe but no violations detected |

---

## 6. Lighthouse Accessibility Scores

| Page | Score | Rating |
|------|-------|--------|
| Home (`/`) | 90+ | Good |
| Properties (`/properties`) | 90+ | Good |
| Login (`/login`) | 95+ | Excellent |
| Register (`/register`) | 95+ | Excellent |
| Dashboard (`/dashboard`) | 88+ | Good |

---

## 7. Testing Methodology

### Automated Testing
- **axe-core via Playwright:** Ran `color-contrast` rule checks across 4 core routes
- **Playwright keyboard smoke test:** Validated tab sequence, focus count, and keyboard trap detection
- **Playwright text resize test:** Verified no horizontal overflow at 200% zoom
- Report files stored in `frontend/lighthouse-reports/`

### Manual Testing
- Keyboard-only navigation through all core user flows
- Focus indicator visibility verification
- Form error identification and correction guidance review
- Skip link functionality verification

---

## 8. Conclusion

The SmartProperty application achieves **WCAG 2.1 Level AA partial compliance**. All Level A criteria are met, and the majority of Level AA criteria are satisfied. The primary remaining items are manual screen reader testing across multiple devices and comprehensive cross-browser responsive validation. The application demonstrates a strong commitment to accessibility through automated testing, systematic issue tracking, and documented corrective measures applied throughout development.
