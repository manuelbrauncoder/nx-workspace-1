import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey, TranslationParams } from '@core/i18n/translation-key';
import { LanguageToggle } from '@shared/language-toggle/language-toggle';
import { UiAlert, UiAlertAction } from '@shared/ui/alert/alert';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton, UiButtonSize, UiButtonVariant } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiIcon } from '@shared/ui/icon/icon';
import { UI_ICON_NAMES } from '@shared/ui/icon/ui-icons';
import { UiListImports } from '@shared/ui/list/list';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiNavMenu, UiNavMenuItem } from '@shared/ui/nav-menu/nav-menu';
import { UiPagination } from '@shared/ui/pagination/pagination';
import { UiQrCode } from '@shared/ui/qr-code/qr-code';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiSeparator } from '@shared/ui/separator/separator';
import { UiSheet } from '@shared/ui/sheet/sheet';
import { UiSkeleton } from '@shared/ui/skeleton/skeleton';
import { UiSpinner } from '@shared/ui/spinner/spinner';
import { UiTabNav, UiTabNavItem } from '@shared/ui/tab-nav/tab-nav';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { UiToggleGroup } from '@shared/ui/toggle-group/toggle-group';
import { ShowcaseSection } from '../showcase-section/showcase-section';
import { ExampleDialog } from './example-dialog/example-dialog';

type Density = 'compact' | 'comfortable';

/** A text kept as key and params, so it follows the language while it is shown. */
interface Message {
  key: TranslationKey;
  params?: TranslationParams;
}

@Component({
  selector: 'app-showcase-components',
  imports: [
    LanguageToggle,
    LocalDatePipe,
    TranslatePipe,
    ShowcaseSection,
    UiAlert,
    UiAlertAction,
    UiAttachmentImports,
    UiBadge,
    UiSeparator,
    UiBreadcrumb,
    UiButton,
    UiCardImports,
    UiEmpty,
    UiIcon,
    UiListImports,
    UiMenuImports,
    UiNavMenu,
    UiPagination,
    UiRichText,
    UiSheet,
    UiSkeleton,
    UiQrCode,
    UiSpinner,
    UiTabNav,
    UiText,
    UiToggleGroup,
  ],
  styleUrl: './components.scss',
  templateUrl: './components.html',
})
export class Components {
  /** Page of the pagination example, from the query parameter `page`. */
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  private readonly _pageCount = 12;
  private readonly _page = computed(() =>
    Math.min(Math.max(1, Math.trunc(this.page())), this._pageCount),
  );

  private readonly _dialog = inject(UiDialogService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _variants: UiButtonVariant[] = [
    'default',
    'outline',
    'secondary',
    'ghost',
    'destructive',
    'link',
    'brand',
  ];
  private readonly _sizes: UiButtonSize[] = ['xs', 'sm', 'default', 'lg'];
  private readonly _icons = UI_ICON_NAMES;
  private readonly _breadcrumb: UiBreadcrumbItem[] = [
    { labelKey: 'layout.nav.showcaseOverview', path: '/showcase' },
    { labelKey: 'layout.nav.showcaseComponents' },
  ];
  private readonly _densities: { value: Density; labelKey: TranslationKey }[] = [
    { value: 'compact', labelKey: 'showcaseComponents.menu.compact' },
    { value: 'comfortable', labelKey: 'showcaseComponents.menu.comfortable' },
  ];

  private readonly _navItems: UiNavMenuItem[] = [
    { path: '/notes', labelKey: 'showcaseComponents.navMenu.notes' },
    {
      labelKey: 'showcaseComponents.navMenu.showcase',
      children: [
        { path: '/showcase/forms', labelKey: 'showcaseComponents.navMenu.forms' },
        { path: '/showcase/components', labelKey: 'showcaseComponents.navMenu.components' },
      ],
    },
  ];

  private readonly _tabs: UiTabNavItem[] = [
    { path: '/showcase/components', labelKey: 'showcaseComponents.navMenu.components' },
    { path: '/showcase/forms', labelKey: 'showcaseComponents.navMenu.forms' },
    { path: '/notes', labelKey: 'showcaseComponents.navMenu.notes' },
  ];

  private readonly _loading = signal(false);
  private readonly _density = signal<Density>('comfortable');
  private readonly _sheetOpen = signal(false);
  private readonly _period = signal<'day' | 'week' | 'month' | null>('week');
  /** Computed, so the labels follow the language. */
  private readonly _periods = computed(() => [
    { value: 'day' as const, label: this._i18n.translate('showcaseComponents.toggleGroup.day') },
    { value: 'week' as const, label: this._i18n.translate('showcaseComponents.toggleGroup.week') },
    {
      value: 'month' as const,
      label: this._i18n.translate('showcaseComponents.toggleGroup.month'),
    },
  ]);
  private readonly _attachmentRemoved = signal(false);
  private readonly _lastAction = signal<Message>({ key: 'showcaseComponents.overlays.noAction' });
  private readonly _sampleDate = new Date(2026, 0, 12, 14, 5);

  private _simulateLoading(): void {
    this._loading.set(true);
    setTimeout(() => this._loading.set(false), 1500);
  }

  private async _openDialog(): Promise<void> {
    const name = await this._dialog.open<string, string>(ExampleDialog, { data: 'Ada' }).closed;
    this._lastAction.set(
      name === undefined
        ? { key: 'showcaseComponents.overlays.dialogClosed' }
        : { key: 'showcaseComponents.overlays.dialogResult', params: { name } },
    );
  }

  private async _confirm(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('showcaseComponents.overlays.confirmHeading'),
      description: this._i18n.translate('showcaseComponents.overlays.confirmDescription'),
      confirmLabel: this._i18n.translate('showcaseComponents.overlays.confirmLabel'),
      variant: 'destructive',
    });
    this._lastAction.set({
      key: confirmed
        ? 'showcaseComponents.overlays.confirmed'
        : 'showcaseComponents.overlays.cancelled',
    });
  }

  private _showToast(kind: 'success' | 'info' | 'warning' | 'error'): void {
    this._toast[kind](this._i18n.translate('showcaseComponents.overlays.toastMessage'), {
      description: this._i18n.translate('showcaseComponents.overlays.toastKind', { kind }),
    });
  }

  private _showToastAtBottom(): void {
    this._toast.info(this._i18n.translate('showcaseComponents.overlays.toastElsewhere'), {
      position: 'bottom-center',
    });
  }
}
