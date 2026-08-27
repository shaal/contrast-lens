import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ColorFormat,
  RgbColor,
  apcaContrast,
  contrastResult,
  formatColor,
  hexToRgb,
  parseColor,
  rgbToHex
} from './contrast-engine';

@Component({
  selector: 'lens-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly formats: ColorFormat[] = ['HEX', 'RGB', 'HSL', 'LCH', 'OKLCH'];
  readonly foregroundInput = signal('#715BFF');
  readonly backgroundInput = signal('#FFFFFF');
  readonly foregroundFormat = signal<ColorFormat>('HEX');
  readonly backgroundFormat = signal<ColorFormat>('HEX');
  readonly foreground = signal<RgbColor>(hexToRgb('#715BFF')!);
  readonly background = signal<RgbColor>(hexToRgb('#FFFFFF')!);
  readonly blurEnabled = signal(false);
  readonly blurIntensity = signal(100);
  readonly toast = signal('');

  readonly result = computed(() => contrastResult(this.foreground(), this.background()));
  readonly ratio = computed(() => this.result().ratio.toFixed(2));
  readonly apca = computed(() => this.result().apca > 0 ? `+${this.result().apca.toFixed(1)}` : this.result().apca.toFixed(1));
  readonly effectiveBlur = computed(() => this.blurEnabled() ? (this.result().blurPercent * this.blurIntensity()) / 100 : 0);
  readonly blurPixels = computed(() => `${(this.effectiveBlur() / 100 * 3.6).toFixed(2)}px`);
  readonly foregroundHex = computed(() => rgbToHex(this.foreground()));
  readonly backgroundHex = computed(() => rgbToHex(this.background()));
  readonly contrastPercent = computed(() => Math.min(100, Math.max(0, (this.result().ratio - 1) / 20 * 100)));
  readonly markerLeft = computed(() => `${12 + this.contrastPercent() * 0.76}%`);
  readonly blurCopy = computed(() => this.result().blurPercent === 0 ? 'No blur needed — this pairing is crisp.' : `${this.result().blurPercent}% blur pressure at this contrast.`);

  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.hydrateFromQuery('foreground', params.get('fg'));
    this.hydrateFromQuery('background', params.get('bg'));
  }

  private hydrateFromQuery(side: 'foreground' | 'background', value: string | null): void {
    if (!value) return;
    const hex = value.startsWith('#') ? value : `#${value}`;
    const parsed = hexToRgb(hex);
    if (!parsed) return;
    if (side === 'foreground') {
      this.foregroundInput.set(rgbToHex(parsed));
      this.foreground.set(parsed);
    } else {
      this.backgroundInput.set(rgbToHex(parsed));
      this.background.set(parsed);
    }
  }

  updateColor(side: 'foreground' | 'background', event: Event): void {
    const input = event.target as HTMLInputElement;
    const format = side === 'foreground' ? this.foregroundFormat() : this.backgroundFormat();
    const parsed = parseColor(input.value, format);
    if (!parsed) return;
    if (side === 'foreground') {
      this.foregroundInput.set(input.value);
      this.foreground.set(parsed);
    } else {
      this.backgroundInput.set(input.value);
      this.background.set(parsed);
    }
  }

  updateFormat(side: 'foreground' | 'background', event: Event): void {
    const format = (event.target as HTMLSelectElement).value as ColorFormat;
    if (side === 'foreground') {
      this.foregroundFormat.set(format);
      this.foregroundInput.set(formatColor(this.foreground(), format));
    } else {
      this.backgroundFormat.set(format);
      this.backgroundInput.set(formatColor(this.background(), format));
    }
  }

  updateNativeColor(side: 'foreground' | 'background', event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    const parsed = hexToRgb(hex);
    if (!parsed) return;
    if (side === 'foreground') {
      this.foregroundFormat.set('HEX');
      this.foregroundInput.set(hex.toUpperCase());
      this.foreground.set(parsed);
    } else {
      this.backgroundFormat.set('HEX');
      this.backgroundInput.set(hex.toUpperCase());
      this.background.set(parsed);
    }
  }

  swapColors(): void {
    const oldForeground = this.foreground();
    const oldForegroundInput = this.foregroundInput();
    const oldForegroundFormat = this.foregroundFormat();
    this.foreground.set(this.background());
    this.foregroundInput.set(this.backgroundInput());
    this.foregroundFormat.set(this.backgroundFormat());
    this.background.set(oldForeground);
    this.backgroundInput.set(oldForegroundInput);
    this.backgroundFormat.set(oldForegroundFormat);
  }

  randomBackground(): void {
    const value = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;
    this.backgroundFormat.set('HEX');
    this.backgroundInput.set(value);
    this.background.set(hexToRgb(value)!);
  }

  status(threshold: number): 'Pass' | 'Review' {
    return this.result().ratio >= threshold ? 'Pass' : 'Review';
  }

  apcaStatus(threshold: number): 'Pass' | 'Review' {
    return Math.abs(this.result().apca) >= threshold ? 'Pass' : 'Review';
  }

  sampleClass(kind: 'body' | 'large' | 'ui'): string {
    return `sample-${kind}-${this.status(kind === 'body' ? 4.5 : kind === 'large' ? 3 : 3).toLowerCase()}`;
  }

  async copyLink(): Promise<void> {
    const link = `${window.location.origin}/?fg=${this.foregroundHex().slice(1)}&bg=${this.backgroundHex().slice(1)}`;
    try {
      await navigator.clipboard.writeText(link);
      this.toast.set('Share link copied');
    } catch {
      this.toast.set('Link ready in the address bar');
    }
    window.setTimeout(() => this.toast.set(''), 2200);
  }

  scrollToChecker(): void {
    window.history.replaceState(null, '', '#checker');
    document.querySelector('#checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  formatLabel(format: ColorFormat): string {
    return format === 'OKLCH' ? 'OKLCH' : format;
  }

  trackFormat(_index: number, format: ColorFormat): ColorFormat {
    return format;
  }
}
