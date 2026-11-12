---
name: a11y
description: Accessibility checklist (WCAG 2.2 AA) for the Angular frontends of this workspace, vyte first. Use when building or reviewing templates, components, forms, dialogs, navigation or styles of an app (apps/*, packages/shared/ui), and for touch targets and spacing.
---

# Accessibility checklist

Rules for the frontends. They add to `docs/frontend/styling.md` (section "Accessibility", "Touch targets and spacing") and `docs/frontend/ui-components.md`. Each rule names the wrapper or file that already implements it. When building, follow them; when reviewing, check each one and name the file that breaks it.

## Perceivable

- Text and interactive elements meet 4.5:1 contrast (3:1 for large text and for the border of a form field) in both themes. Check the token pairs, not single elements: `docs/frontend/styling.md` names the pairs that are safe
- Information is not carried by colour alone: an error has text, a state has a label or icon
- Decorative images and icons are hidden from assistive tech: `aria-hidden="true"` (icons do this unless they get a `label`, `ui-components.md`)
- Every `<img>` has an `alt` text; a decorative one has `alt=""`
- Zoom to 200% and a 320px-wide viewport show no content cut off and no horizontal scrolling

## Operable

- Every interactive element is reachable and usable with the keyboard, and the focus is visible (`:focus-visible`, token outline, `styling.md`)
- The first focusable element of a page is a skip link to `#main`; the app shell focuses `#main` after a navigation (`app-shell.ts`)
- Icon-only buttons have an `aria-label` (`UiButton`, `ui-components.md:109`)
- A blocked link has `aria-disabled` and swallows the click (`ui-components.md:110`)
- Touch targets are at least 44 × 44 CSS px with 8px between neighbouring targets (`styling.md`, "Touch targets and spacing")
- Nothing moves or times out without a way to keep it; a loading state is announced (`loadingLabel`, `aria-busy`)

## Understandable

- The page has one `<h1>`, headings do not skip levels, and `<html lang>` is the language of the page (set by the server from the `lang` cookie, `docs/frontend/i18n.md`)
- Navigation items that point to the current page carry `aria-current="page"` (`ui-components.md:323`)
- A form field has a visible label, a description where needed and its errors through `aria-describedby` with the invalid state (`forms.md:318–322`, `FormControlShell`)
- Error messages say what to do, in the language of the page

## Robust

- Dialogs have an accessible name (`app-ui-dialog` heading) and a description (`ui-components.md:368, 371`). Check in `UiDialogService` that focus moves into the dialog and back to the trigger on close; if it does not, that is a finding
- A group of controls has an accessible name (`fieldset` with `legend`, or `role="group"` with `aria-label`, `ui-components.md:484`)
- Feedback that appears without a click (a toast, a status text of your own) is announced. Toasts go through `UiToastService`; a status text of your own needs `role="status"` or `aria-live`. Check how `UiToaster` announces before relying on it

## Automated

- Specs of components run `await expect(element).toBeAccessible()` (axe-core, `packages/shared/ui/src/testing/accessibility.ts`). It runs every rule except colour contrast, which jsdom cannot measure: contrast is checked on the tokens
- A violation is fixed, not excluded. Disabling an axe rule needs a comment with the reason in the spec
