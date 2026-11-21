# Forms

Forms are built with Signal Forms (`@angular/forms/signals`) and the form controls in [packages/shared/ui/src/form-controls/](../../packages/shared/ui/src/form-controls). Each control is a complete field: it brings its label, description and error messages, so a form in a feature is a list of one-liners.

```html
<app-form-text [formField]="_noteForm.title" label="Titel" />
```

## A complete form

The note editor is the reference.

[apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.ts](../../apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.ts)

```ts
/** Starts empty and is replaced by the loaded note once it arrives. */
private readonly _model = linkedSignal<NoteFormModel>(() => {
  const note = this._note();
  return { title: note?.title ?? '', description: note?.description ?? '', newImages: [] };
});

/** Submitted by `FormRoot`, which only runs the action once the form is valid. */
private readonly _noteForm = form(
  this._model,
  (path) => {
    // Messages are functions, so a visible error follows the language.
    required(path.title, {
      message: () => this._i18n.translate('noteEditor.validation.titleRequired'),
    });
    pattern(path.title, /\S/, {
      message: () => this._i18n.translate('noteEditor.validation.titleBlank'),
    });
    maxLength(path.title, NOTE_TITLE_MAX_LENGTH, {
      message: () =>
        this._i18n.translate('noteEditor.validation.titleTooLong', {
          max: NOTE_TITLE_MAX_LENGTH,
        }),
    });
    maxLength(path.description, NOTE_DESCRIPTION_MAX_LENGTH, {
      message: () => this._i18n.translate('noteEditor.validation.descriptionTooLong'),
    });
  },
  { submission: { action: () => this._save() } },
);
```

[apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.html](../../apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.html)

<!-- prettier-ignore -->
```html
<form [formRoot]="_noteForm">
  <app-form-text [formField]="_noteForm.title" [label]="'noteEditor.fields.title' | t" autocomplete="off" />
  <app-form-rich-text [formField]="_noteForm.description" [label]="'noteEditor.fields.description' | t" />
  <app-form-files [formField]="_noteForm.newImages" [label]="'noteEditor.fields.newImages' | t" [maxFiles]="_freeImages()" [accept]="_imageTypes" [maxFileSize]="_imageMaxBytes" />

  @if (_store.mutationState().failure; as failure) {
    <app-failure-alert [failure]="failure" [heading]="'noteEditor.saveFailed' | t" />
  }

  <button [loading]="_saving()" [loadingLabel]="'noteEditor.saving' | t" appUiButton type="submit">
    {{ 'noteEditor.save' | t }}
  </button>
</form>
```

The parts:

- **Model**: a signal holding the form value. Here a `linkedSignal`, so the form starts empty and takes over the note once it is loaded. For a form without loaded data a plain `signal` is enough
- **Schema**: the function passed to `form()`. Validators and field logic (`required`, `email`, `maxLength`, `pattern`, `validate`, `disabled`) are declared there, not in the template
- **Submission**: `[formRoot]` on the `<form>` handles the submit event. It marks all fields as touched and runs `submission.action` only when the form is valid
- **Fields**: `[formField]` binds one field of the form to one control

Import `FormField` and `FormRoot` from `@angular/forms/signals` and the controls you use from `@shared/form-controls/...`.

### Messages belong to the validator

A control shows the `message` of each error. A validator without a message blocks the form but shows nothing, so always pass one. Pass it as a function that translates, so an error that is already visible follows the language. The function of `validate` runs reactively itself, so there the translated text is returned directly:

```ts
required(path.name, {
  message: () => this._i18n.translate('showcaseForms.validation.name'),
});
validate(path.terms, ({ value }) =>
  value()
    ? undefined
    : { kind: 'terms', message: this._i18n.translate('showcaseForms.validation.terms') },
);
```

See [Internationalization](i18n.md) for the keys.

### When errors appear

Errors are shown once the field is touched: after the user left it, or after a submit attempt. An untouched required field is not flagged while the user is still filling in the form.

### Submitting without `formRoot`

Where the form element cannot carry `[formRoot]`, call `submit()` yourself. It behaves the same way: all fields are marked as touched and the callback only runs for a valid form.

[apps/angular-base/src/app/features/showcase/presentation/forms/forms.ts](../../apps/angular-base/src/app/features/showcase/presentation/forms/forms.ts)

```ts
private async _save(event: Event): Promise<void> {
  event.preventDefault();
  await submit(this._profileForm, async () => {
    this._submitted.set(true);
  });
}
```

## The controls

All controls share `label` (required) and `description` (optional). State such as errors, touched, disabled and required comes from the form through `[formField]` and is not set in the template.

A required field shows an asterisk, hidden from screen readers, which hear the native `required` instead. `FormDate` is a button, which has no `required`, so its label carries a visually hidden "Pflichtfeld" (`announceRequired` on `FormControlShell`). A new control that is not a native input sets it as well.

| Control           | Selector                | Value type      | Own inputs                                           |
| ----------------- | ----------------------- | --------------- | ---------------------------------------------------- |
| `FormText`        | `app-form-text`         | `string`        | `type`, `placeholder`, `autocomplete`, `contentLang` |
| `FormTextarea`    | `app-form-textarea`     | `string`        | `placeholder`, `rows` (default 4), `contentLang`     |
| `FormRichText`    | `app-form-rich-text`    | `string` (HTML) | `profile`, `contentLang`                             |
| `FormFiles`       | `app-form-files`        | `File[]`        | `maxFiles`, `accept`, `maxFileSize`                  |
| `FormDate`        | `app-form-date`         | `Date \| null`  | `placeholder`                                        |
| `FormSelect`      | `app-form-select`       | `T \| null`     | `options` (required), `placeholder`                  |
| `FormToggleGroup` | `app-form-toggle-group` | `T \| null`     | `options` (required)                                 |
| `FormRadioGroup`  | `app-form-radio-group`  | `T \| null`     | `options` (required), `layout`                       |
| `FormStepper`     | `app-form-stepper`      | `number`        | `decreaseLabel`, `increaseLabel`                     |
| `FormCheckbox`    | `app-form-checkbox`     | `boolean`       |                                                      |
| `FormSwitch`      | `app-form-switch`       | `boolean`       |                                                      |

All of them are shown on `/showcase/forms`.

### Text in another language

A field whose text is in a language other than the page, such as the English version of a text on a German page, sets `contentLang` (`'de'` or `'en'`, `AppLanguage` from `@core/i18n/languages`). `FormText`, `FormTextarea` and `FormRichText` put it as `lang` on the native input, the textarea or the editable area, not on the host. The label and the toolbar keep the page language, the value is read with the right voice and spell-checked in its own language (WCAG 3.1.2 Language of Parts). Without `contentLang` the control has no `lang` and follows the page.

```html
<app-form-text [formField]="field().en" label="Englisch" contentLang="en" />
```

### `FormText`

```html
<app-form-text
  [formField]="_profileForm.email"
  label="E-Mail"
  description="Wird nur für Rückfragen verwendet."
  type="email"
  autocomplete="email"
/>
```

`type` is one of `text`, `email`, `password`, `search`, `tel`, `url`, `time`. `time` is the native time input, on a phone the system picker; its value is `'HH:MM'` or `''`. Combine it with `app-form-date` for a date and a time, as the event form of vyte-web does.

### `FormTextarea`

```html
<app-form-textarea [formField]="_profileForm.about" label="Über mich" rows="8" />
```

### `FormRichText`

```html
<app-form-rich-text [formField]="_noteForm.description" label="Beschreibung" />
```

An editor for formatted text: bold, italic, two heading levels (`h2`, `h3`), bullet and numbered lists, quotes and links. The value is an HTML string, so the field type stays `string`.

- An editor without text yields `''`, not an empty paragraph. `required` works as for any text field
- The formats are the schema of the editor. Whatever else is pasted or set as value is dropped while it is parsed, and nothing in it is loaded or executed
- Links are limited to `http://`, `https://` and `mailto:`. An address typed without a scheme becomes `https://`. Links open in a new tab
- The editor exists in the browser only. The server renders the empty frame, the content appears after hydration
- Show a stored value with `app-ui-rich-text`, never with `innerHTML` directly. See [UI components](ui-components.md#rich-text) for why the stored HTML is untrusted

The editor library (Tiptap) is wrapped by [rich-text-editor.ts](../../packages/shared/ui/src/form-controls/form-rich-text/rich-text-editor.ts), the only file that imports it. The allowed formats are listed once in [rich-text-rules.ts](../../packages/contracts/src/rich-text.ts). Adding a format means: the list there, the editor schema, the toolbar and the styles in [\_rich-text.scss](../../packages/shared/styles/base/_rich-text.scss).

- `profile="page"` (default `text`) is for pages of this site such as the legal pages: links may also be a path of the site (`/privacy`) or `tel:`. Show the value with the same profile

### `FormFiles`

```html
<app-form-files
  [formField]="_noteForm.newImages"
  label="Bilder hinzufügen"
  [maxFiles]="5"
  [accept]="['image/png', 'image/jpeg']"
  [maxFileSize]="10 * 1024 * 1024"
/>
```

A drop zone. Files are dropped onto it or chosen through the file dialog, which a click anywhere on the zone or the keyboard opens: the zone is a native file input under the hood.

- The value is a `File[]`. The control only collects the files, sending them is up to the form. The note editor uploads them after the note itself is saved
- `maxFiles` (default 10) is how many files the control holds. Once reached, the zone is locked until a file is removed
- `accept` is a list of MIME types, empty allows every type. `maxFileSize` is in bytes
- A file of the wrong type, one that is too large and files beyond `maxFiles` are left out, a message below the zone says why. These are not form errors: the value never contains such a file
- Chosen files are listed as `app-ui-attachment` tiles with name, size and a remove button, images with a preview

### `FormDate`

```html
<app-form-date [formField]="_profileForm.birthday" label="Geburtstag" />
```

The field type is `Date | null`. `min` and `max` come from the schema of the form. The date and the calendar follow the active language: `12.01.2026` in German, `12/01/2026` in English. The placeholders of `FormDate` and `FormSelect` default to a translated prompt.

### `FormSelect`

```ts
private readonly _roles: FormSelectOption<Role>[] = [
  { value: 'developer', label: 'Entwicklung' },
  { value: 'designer', label: 'Design' },
  { value: 'product', label: 'Produkt' },
];
```

```html
<app-form-select [formField]="_profileForm.role" [options]="_roles" label="Rolle" />
```

The control is generic over the value type. An option can be switched off with `disabled: true`. The field type is `T | null`, where `null` means nothing is selected.

### `FormToggleGroup`

```html
<app-form-toggle-group
  [formField]="_profileForm.contactWay"
  [options]="_contactWays"
  label="Kontaktweg"
/>
```

For two to four options shown side by side as buttons, one of them always selected. It uses `app-ui-toggle-group` inside. For longer lists use `FormSelect`.

### `FormRadioGroup`

```html
<app-form-radio-group
  [formField]="_answerForm.response"
  [options]="_responses"
  label="Deine Antwort"
  layout="cards"
/>
```

A real radio group (Spartan `radio-group`) for a few options where none is chosen yet, such as an answer. The field type is `T | null`, `required` in the schema makes a choice mandatory. An option can carry a `description` as a second line. The label wraps the whole option, so the option is clicked anywhere and the radio is named by its text.

- `layout="list"` (default) stacks the options, `layout="cards"` sets them as tiles side by side; the chosen tile takes `--primary`
- The tiles take their border, radius and shadow from `--form-choice-border`, `--form-choice-radius` and `--form-choice-shadow`, falling back to the input border and `--radius`. An app sets them where it wants another shape, vyte on its guest page

### `FormStepper`

```ts
// in the schema
min(path.companions, 0);
max(path.companions, () => this._maxCompanions());
```

```html
<app-form-stepper
  [formField]="_answerForm.companions"
  label="Ich bringe mit"
  description="bis zu 3 Personen"
  decreaseLabel="Eine Person weniger"
  increaseLabel="Eine Person mehr"
/>
```

A small whole number with "−" and "+", e.g. how many people someone brings. The bounds come from the `min()` and `max()` rules of the field, which the `FormField` directive binds (without them: from 0, no upper bound). The buttons have no visible text, so `decreaseLabel` and `increaseLabel` are required.

- The number is an `<output>` named by the label and announced after a change (`aria-live="polite"`)
- A button at its bound is disabled. If it had the focus, the focus moves to the other button instead of falling to the page

### `FormCheckbox` and `FormSwitch`

```html
<app-form-checkbox [formField]="_profileForm.terms" label="Ich stimme den Bedingungen zu" />
<app-form-switch
  [formField]="_profileForm.newsletter"
  label="Newsletter"
  description="Höchstens eine Mail im Monat."
/>
```

Both bind a `boolean`. The label sits next to the control instead of above it.

A checkbox label with markup, e.g. a link to the privacy policy inside the sentence, comes as an `ng-template` instead of `label`. `FormControlShell` renders it inside the `<label>`, so the whole sentence still names the checkbox. A click on the link opens it and leaves the box as it is. The contact form of `portfolio-web` works this way:

```html
<app-form-checkbox [formField]="_contactForm.privacy">
  <ng-template>
    Ich habe die <a routerLink="/privacy">Datenschutzerklärung</a> gelesen und bin einverstanden.
  </ng-template>
</app-form-checkbox>
```

### Disabling a field

Disable through the schema, not through an attribute:

```ts
disabled(path.customerNumber);
```

## How a control is built

The controls are custom controls of Signal Forms. Knowing the contract matters when you add one.

[packages/shared/ui/src/form-controls/form-text/form-text.ts](../../packages/shared/ui/src/form-controls/form-text/form-text.ts)

```ts
export class FormText implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly type = input<FormTextType>('text');
  readonly placeholder = input<string>();
  readonly autocomplete = input<string>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-text-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );
  // ...
}
```

- A control implements `FormValueControl<T>` with `value = model()`, or `FormCheckboxControl` with `checked = model()`
- The `FormField` directive binds the state inputs (`errors`, `touched`, `disabled`, `readonly`, `required`, `name`, `min`, `max`). A control declares the ones it needs and never computes them itself
- Leaving the control is reported through the `touch` output. Controls with a popup (`FormSelect`, `FormDate`) emit it only when focus leaves the closed control, because opening the list moves focus without the user leaving the field
- `visibleErrorMessages()` reduces the errors to what should be shown: nothing before the field is touched, and only errors that carry a message
- A `focus()` method lets the form move focus to the control

### `FormControlShell`

Label, description and errors are rendered in exactly one place, [form-control-shell/](../../packages/shared/ui/src/form-controls/form-control-shell). Every control projects its input element into it:

[packages/shared/ui/src/form-controls/form-text/form-text.html](../../packages/shared/ui/src/form-controls/form-text/form-text.html)

```html
<app-form-control-shell
  [controlId]="_id"
  [description]="description()"
  [disabled]="disabled()"
  [errors]="_errorMessages()"
  [label]="label()"
  [required]="required()"
>
  <input
    #control
    [id]="_id"
    [disabled]="disabled()"
    [readOnly]="readonly()"
    [required]="required()"
    [type]="type()"
    [value]="value()"
    (blur)="touch.emit()"
    (input)="value.set(control.value)"
    hlmInput
  />
</app-form-control-shell>
```

The shell

- renders the `<label>` for `controlId`, with an asterisk when the field is required. Its id is available as `shell.labelId()` for a control a `<label for>` cannot name, such as the editable `div` of `FormRichText`
- renders the description and, once there are visible errors, the error list with `role="alert"`
- supports `orientation="horizontal"`, which puts the control in front of the label (checkbox, switch)
- provides the accessibility wiring for the projected Spartan control: `aria-describedby` pointing at description and errors, and the invalid state

Because the shell owns the invalid state, controls do not bind `aria-invalid` or `forceInvalid` themselves. The shell replaces the `NgControl` Spartan would otherwise find. Without that, Spartan would read the state of the `FormField` directive and flag untouched fields as invalid.

Controls whose Spartan component takes `aria-describedby` as an input (checkbox, switch) read it from the shell: `[aria-describedby]="shell.describedBy()"`.

#### Focus outline

The shell also draws the focus of the projected control: a `2px` outline in `--ring` with `2px` offset on `:focus-visible`, for input, textarea, select trigger, date trigger, checkbox and switch ([form-control-shell.scss](../../packages/shared/ui/src/form-controls/form-control-shell/form-control-shell.scss)). Controls whose focusable element is hidden or is no helm control draw the same outline on their visible wrapper themselves: `FormRichText` around the editor, `FormFiles` around the drop zone, `FormRadioGroup` with `layout="cards"` around the tile. `UiToggleGroup` (and with it `FormToggleGroup`) draws it on its items.

Why: the helm controls set `outline-none` and show focus only through a half transparent ring. Once a field is invalid, their `data-[matches-spartan-invalid=true]` classes come later in the Tailwind order than `focus-visible:` and paint the pale error ring instead. A focused invalid field then looks exactly like an unfocused one (WCAG 2.4.7). The outline sits on top of border and ring, so it shows in every state, and also in forced-colors mode, which drops box shadows.

- The rule lives in the shell, not in the generated helm code, which the Spartan CLI overwrites
- Component styles are unlayered and win over the `outline-none` utility in `@layer utilities` without `!important`. `::ng-deep` reaches the element in the template of a helm component, `:host` keeps it inside the shell
- `--ring` keeps at least 3:1 against every surface token in each app and theme (lowest: angular-base light on `--accent`, 4.1:1). A new theme checks that too
- A new control whose focusable element is not in the list gets its `data-slot` added there and a row in [form-control-shell.spec.ts](../../packages/shared/ui/src/form-controls/form-control-shell/form-control-shell.spec.ts). The spec loads the stylesheet into jsdom, so the rule stays plain CSS without nesting

`FormControlShell` is internal to `shared/form-controls`. Features use the controls, not the shell.

## Adding a control

1. Create `packages/shared/ui/src/form-controls/form-<name>/` with `form-<name>.ts`, `.html`, `.scss` and a spec. Selector `app-form-<name>`, class `Form<Name>`
2. Implement `FormValueControl<T>` or `FormCheckboxControl` and declare the state inputs the control needs
3. Wrap the template in `app-form-control-shell` and pass `controlId`, `label`, `description`, `errors`, `required`, `disabled`
4. Emit `touch` when the user leaves the control and add a `focus()` method
5. Add the control to the showcase page [forms.html](../../apps/angular-base/src/app/features/showcase/presentation/forms/forms.html)
6. Add the name to the list in [CLAUDE.md](../../CLAUDE.md)

`shared/form-controls` is one of the two folders that may import Spartan and Tiptap. See [UI components](ui-components.md#why-wrappers).

## Rules in short

- New forms use Signal Forms
- One control per field, bound with `[formField]`. No hand-written labels or error markup in features
- Validation and field state are declared in the schema, with a message for every validator
- Label, description and errors are rendered by `FormControlShell` only
- The focus outline of a control is `2px` in `--ring` with `2px` offset. It comes from `FormControlShell`, a control draws it itself only on a visible wrapper of a hidden or non-helm element. Apps add no focus styling to controls
