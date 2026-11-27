# Admin area

Everything under `/admin` is for admins only. One `adminGuard` on the parent route in [app.routes.ts](../../../apps/portfolio-web/src/app/app.routes.ts) protects it: signed out it leads to the sign-in page, a user without admin rights lands on the start page. Admins open it through "Administration" in the settings menu of the header (the gear, together with language and theme, actions from `injectAccountActions()` of the auth public API), below `md` in the drawer, where `AccountMenu` with `layout="list"` shows the user and its actions without a popup.

```text
/admin              AdminHub         feature admin
/admin/users        UserList         feature admin
/admin/messages     MessageList      feature admin
/admin/portfolio/…  editor           feature portfolio-editor, see Portfolio
/admin/legal/…      editor           feature legal-editor, see below
```

The features hang below the same parent, none imports another. The hub links to the editors by their paths only.

## The feature `admin`

[src/app/features/admin/](../../../apps/portfolio-web/src/app/features/admin)

- `AdminUseCase` and `AdminStore` handle the accounts through [src/api/users](../../../apps/portfolio-web/src/api/users) (`GET`, `PATCH`, `DELETE /admin/users…`). The store loads them as soon as the area opens, so the hub can show the counts
- `InboxUseCase` and `InboxStore` handle the messages through the admin part of [src/api/contact](../../../apps/portfolio-web/src/api/contact) (`/contact/messages`). Both are app-wide (`@Service()`), because the bell in the header and the pages of the area show the same list. Only an admin loads it, signing out drops it
- Users and messages each have a mutation of their own, so a failure on one page never shows up on the other. After a write the loaded list is patched, nothing is fetched again
- [public-api.ts](../../../apps/portfolio-web/src/app/features/admin/public-api.ts) exports `MessageBell` for the app shell and nothing else
- The signed-in admin comes from `AuthStore` through `@features/auth/public-api`

### Users

- A card per account, oldest first: name (the email for an account without a name), email, role, date of registration
- Actions in a menu: grant or remove admin rights, sign out everywhere, delete the account. Signing out and deleting ask first, deleting says that notes and images go as well
- A role change takes effect on the next request of that user, the toast says so
- The own account has no menu. The backend refuses to change or delete it (409), which also keeps at least one admin. Should a 409 come anyway, the page explains it

### Messages

- A card per message, newest first. Unread ones carry a marker and the hidden text "Ungelesen" for screen readers
- The text is shown as typed with its line breaks (`white-space: pre-line`), never as HTML
- "Antworten" opens the mail program through `mailto:` with a subject and marks the message as read. Marking read or unread and deleting are buttons on the card, deleting asks first

### Message bell

- An admin sees a bell in the header, on every width. A badge counts the unread messages (from 10 "9+", the name of the button carries the exact number)
- Its menu lists the five newest unread messages and always links to all of them. Choosing a message marks it as read and opens `/admin/messages`
- The list is loaded with the first page, after each navigation and when the menu opens. There is no timer. A reload of a loaded list stays `success`, so the open message page does not flash its skeleton

### Why cards and not a table

The lists stay short, and cards read well on a phone without scrolling sideways. A table would need a new UI wrapper. If the lists grow, a table wrapper around the Spartan table plus paging is the next step.

## Legal pages

[src/app/features/legal-editor/](../../../apps/portfolio-web/src/app/features/legal-editor)

- `/admin/legal` lists the four pages (imprint, privacy policy, accessibility statement, cookie policy) with the time of the last change, or that a page does not exist yet. Each card links to the editor and, once the page exists, to the page on the site
- `/admin/legal/:page` edits one page: German and English, each with `app-form-rich-text profile="page"`, so links may also point within the site (`/privacy`) or to a phone number. The route only matches the four pages (`legalPageMatch`), anything else is a 404
- Saving sends both languages with `PATCH /legal/<page>`, which also creates a missing page. The heading of a page is not part of the text, the site renders it
- `LegalEditorStore` loads all pages once through `GET /legal` and patches the saved page into the loaded list. See [Legal pages](legal-pages.md)

## Rules in short

- Every page below the hub starts with `app-ui-breadcrumb`: Administration › area › page. The names of the areas are shared texts (`admin.areas.*`), so pages of different features show the same trail
- Every admin page sits below `/admin` and gets no guard of its own
- `index: false` for every admin route
- The own account offers no actions that the backend refuses anyway
- After deleting a card, the focus goes to the heading of the page
