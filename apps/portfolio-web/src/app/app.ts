import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { UiToaster } from '@shared/ui/toast/toaster/toaster';

@Component({
  imports: [RouterOutlet, UiToaster],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly _theme = inject(ThemeService);
}
