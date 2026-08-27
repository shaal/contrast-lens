<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  type ColorFormat,
  type RgbColor,
  contrastResult,
  blurPixelsForTarget,
  formatColor,
  hexToRgb,
  parseColor,
  rgbToHex,
} from "./lib/contrast-engine";
import { buildContrastGuides, hsvToRgb, rgbToHsv } from "./lib/color-map";

type ColorSide = "foreground" | "background";
type WcagTarget = "AA" | "AAA";

const formats: ColorFormat[] = ["HEX", "RGB", "HSL", "LCH", "OKLCH"];
const foregroundInput = ref("#715BFF");
const backgroundInput = ref("#FFFFFF");
const foregroundFormat = ref<ColorFormat>("HEX");
const backgroundFormat = ref<ColorFormat>("HEX");
const foreground = ref<RgbColor>(hexToRgb("#715BFF")!);
const background = ref<RgbColor>(hexToRgb("#FFFFFF")!);
const blurEnabled = ref(true);
const blurIntensity = ref(100);
const toast = ref("");
const activeHelp = ref<string | null>(null);
const helpPosition = ref<{ top: number; left: number } | null>(null);
const wcagTarget = ref<WcagTarget>("AA");
const activeMapSide = ref<ColorSide>("foreground");
const mapRef = ref<HTMLElement | null>(null);
const mapDragging = ref(false);

const result = computed(() =>
  contrastResult(foreground.value, background.value),
);
const ratio = computed(() => result.value.ratio.toFixed(2));
const apca = computed(() =>
  result.value.apca > 0
    ? `+${result.value.apca.toFixed(1)}`
    : result.value.apca.toFixed(1),
);
const targetRatio = computed(() => (wcagTarget.value === "AA" ? 4.5 : 7));
const targetPass = computed(() => result.value.ratio >= targetRatio.value);
const effectiveBlurPixels = computed(() =>
  blurEnabled.value
    ? (blurPixelsForTarget(result.value.ratio, targetRatio.value) *
        blurIntensity.value) /
      100
    : 0,
);
const formatBlurPixels = (value: number): string =>
  `${Number(value.toFixed(1))}px`;
const blurPixels = computed(() => formatBlurPixels(effectiveBlurPixels.value));
const foregroundHex = computed(() => rgbToHex(foreground.value));
const backgroundHex = computed(() => rgbToHex(background.value));
const blurCopy = computed(() =>
  targetPass.value
    ? `${wcagTarget.value} target met — text stays clear.`
    : `${wcagTarget.value} target not met — the preview is softened below the selected target.`,
);
const ratioThresholds = [
  { value: 3, label: "UI / large" },
  { value: 4.5, label: "AA" },
  { value: 7, label: "AAA" },
] as const;
const ratioPosition = (value: number): string =>
  `${Math.min(100, Math.max(0, ((value - 1) / 20) * 100))}%`;
const currentRatioPosition = computed(() => ratioPosition(result.value.ratio));
const ratioScaleLabel = computed(
  () =>
    `Static contrast scale from 1 to 21. Current ratio is ${ratio.value} to 1. Thresholds are 3 for UI and large text, 4.5 for AA, and 7 for AAA.`,
);
const targetCopy = computed(() =>
  targetPass.value
    ? `This pair reaches the ${wcagTarget.value} target for normal text.`
    : `This pair is below the ${wcagTarget.value} target. Try a darker text color or a lighter background.`,
);
const mapColor = computed(() =>
  activeMapSide.value === "foreground" ? foreground.value : background.value,
);
const mapReference = computed(() =>
  activeMapSide.value === "foreground" ? background.value : foreground.value,
);
const mapHsv = computed(() => rgbToHsv(mapColor.value));
const mapGuides = computed(() =>
  buildContrastGuides(
    activeMapSide.value,
    mapHsv.value.h,
    mapReference.value,
  ).map((guide) => ({
    ...guide,
    labelY: guide.points[0]?.y ?? null,
    isTarget: guide.threshold === targetRatio.value,
  })),
);
const mapBackgroundStyle = computed(() => ({
  backgroundImage: `linear-gradient(to top, rgb(0 0 0), transparent), linear-gradient(to right, rgb(255 255 255), hsl(${mapHsv.value.h} 100% 50%))`,
}));
const mapKnobStyle = computed(() => ({
  left: `${Math.min(98.5, Math.max(1.5, mapHsv.value.s * 100))}%`,
  top: `${Math.min(98.5, Math.max(1.5, (1 - mapHsv.value.v) * 100))}%`,
  backgroundColor: formatColor(mapColor.value, "HEX"),
}));
const mapColorLabel = computed(
  () => `${activeMapSide.value} ${formatColor(mapColor.value, "HEX")}`,
);
const helpStyle = computed(() =>
  helpPosition.value
    ? {
        top: `${helpPosition.value.top}px`,
        left: `${helpPosition.value.left}px`,
      }
    : {},
);

function hydrateFromQuery(side: ColorSide, value: string | null): void {
  if (!value) return;
  const parsed = hexToRgb(value.startsWith("#") ? value : `#${value}`);
  if (!parsed) return;
  if (side === "foreground") {
    foregroundInput.value = rgbToHex(parsed);
    foreground.value = parsed;
  } else {
    backgroundInput.value = rgbToHex(parsed);
    background.value = parsed;
  }
}

function updateColor(side: ColorSide, event: Event): void {
  const input = event.target as HTMLInputElement;
  const format =
    side === "foreground" ? foregroundFormat.value : backgroundFormat.value;
  const parsed = parseColor(input.value, format);
  if (!parsed) return;
  if (side === "foreground") {
    foregroundInput.value = input.value;
    foreground.value = parsed;
  } else {
    backgroundInput.value = input.value;
    background.value = parsed;
  }
}

function updateFormat(side: ColorSide, event: Event): void {
  const format = (event.target as HTMLSelectElement).value as ColorFormat;
  if (side === "foreground") {
    foregroundFormat.value = format;
    foregroundInput.value = formatColor(foreground.value, format);
  } else {
    backgroundFormat.value = format;
    backgroundInput.value = formatColor(background.value, format);
  }
}

function updateNativeColor(side: ColorSide, event: Event): void {
  const hex = (event.target as HTMLInputElement).value;
  const parsed = hexToRgb(hex);
  if (!parsed) return;
  if (side === "foreground") {
    foregroundFormat.value = "HEX";
    foregroundInput.value = hex.toUpperCase();
    foreground.value = parsed;
  } else {
    backgroundFormat.value = "HEX";
    backgroundInput.value = hex.toUpperCase();
    background.value = parsed;
  }
}

function swapColors(): void {
  const oldForeground = foreground.value;
  const oldForegroundInput = foregroundInput.value;
  const oldForegroundFormat = foregroundFormat.value;
  foreground.value = background.value;
  foregroundInput.value = backgroundInput.value;
  foregroundFormat.value = backgroundFormat.value;
  background.value = oldForeground;
  backgroundInput.value = oldForegroundInput;
  backgroundFormat.value = oldForegroundFormat;
}

function setBlurIntensity(event: Event): void {
  blurIntensity.value = Number((event.target as HTMLInputElement).value);
}

function setWcagTarget(target: WcagTarget): void {
  wcagTarget.value = target;
}

function toggleHelp(id: string, event: MouseEvent): void {
  if (activeHelp.value === id) {
    closeHelp();
    return;
  }
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const width = Math.min(235, window.innerWidth - 28);
  const preferredLeft = bounds.left + bounds.width / 2 - width / 2;
  const left = Math.min(
    Math.max(14, preferredLeft),
    window.innerWidth - width - 14,
  );
  const preferredTop = bounds.bottom + 10;
  const top =
    preferredTop + 104 < window.innerHeight
      ? preferredTop
      : Math.max(14, bounds.top - 114);
  helpPosition.value = { top, left };
  activeHelp.value = id;
}

function closeHelp(): void {
  activeHelp.value = null;
  helpPosition.value = null;
}

function setMapSide(side: ColorSide): void {
  activeMapSide.value = side;
}

function updateMapColor(saturation: number, value: number): void {
  const nextColor = hsvToRgb({
    h: mapHsv.value.h,
    s: Math.min(1, Math.max(0, saturation)),
    v: Math.min(1, Math.max(0, value)),
  });
  if (activeMapSide.value === "foreground") {
    foreground.value = nextColor;
    foregroundInput.value = formatColor(nextColor, foregroundFormat.value);
  } else {
    background.value = nextColor;
    backgroundInput.value = formatColor(nextColor, backgroundFormat.value);
  }
}

function setMapPosition(event: PointerEvent): void {
  const bounds = mapRef.value?.getBoundingClientRect();
  if (!bounds) return;
  const saturation = (event.clientX - bounds.left) / bounds.width;
  const value = 1 - (event.clientY - bounds.top) / bounds.height;
  updateMapColor(saturation, value);
}

function stopMapDrag(): void {
  mapDragging.value = false;
  document.removeEventListener("pointermove", handleMapPointerMove);
  document.removeEventListener("pointerup", stopMapDrag);
  document.removeEventListener("pointercancel", stopMapDrag);
}

function handleMapPointerMove(event: PointerEvent): void {
  if (mapDragging.value) setMapPosition(event);
}

function startMapDrag(event: PointerEvent): void {
  if (event.button !== 0 && event.pointerType !== "touch") return;
  event.preventDefault();
  mapDragging.value = true;
  setMapPosition(event);
  document.addEventListener("pointermove", handleMapPointerMove);
  document.addEventListener("pointerup", stopMapDrag);
  document.addEventListener("pointercancel", stopMapDrag);
}

function nudgeMap(event: KeyboardEvent): void {
  const step = event.shiftKey ? 0.1 : 0.02;
  let saturation = mapHsv.value.s;
  let value = mapHsv.value.v;
  if (event.key === "ArrowLeft") saturation -= step;
  else if (event.key === "ArrowRight") saturation += step;
  else if (event.key === "ArrowUp") value += step;
  else if (event.key === "ArrowDown") value -= step;
  else if (event.key === "Home") {
    saturation = 0;
    value = 1;
  } else if (event.key === "End") {
    saturation = 1;
    value = 0;
  } else return;
  event.preventDefault();
  updateMapColor(saturation, value);
}

function setMapHue(event: Event): void {
  const hue = Number((event.target as HTMLInputElement).value);
  const nextColor = hsvToRgb({
    h: hue,
    s: mapHsv.value.s,
    v: mapHsv.value.v,
  });
  if (activeMapSide.value === "foreground") {
    foreground.value = nextColor;
    foregroundInput.value = formatColor(nextColor, foregroundFormat.value);
  } else {
    background.value = nextColor;
    backgroundInput.value = formatColor(nextColor, backgroundFormat.value);
  }
}

function status(threshold: number): "Pass" | "Review" {
  return result.value.ratio >= threshold ? "Pass" : "Review";
}

function apcaStatus(threshold: number): "Pass" | "Review" {
  return Math.abs(result.value.apca) >= threshold ? "Pass" : "Review";
}

function sampleClass(kind: "body" | "large" | "ui"): string {
  return `sample-${kind}-${status(kind === "body" ? 4.5 : 3).toLowerCase()}`;
}

function copyLink(): void {
  const link = `${window.location.origin}/?fg=${foregroundHex.value.slice(1)}&bg=${backgroundHex.value.slice(1)}`;
  navigator.clipboard
    .writeText(link)
    .then(() => {
      toast.value = "Share link copied";
    })
    .catch(() => {
      toast.value = "Link ready in the address bar";
    });
  window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

function scrollToChecker(): void {
  window.history.replaceState(null, "", "#checker");
  document
    .querySelector("#checker")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  hydrateFromQuery("foreground", params.get("fg"));
  hydrateFromQuery("background", params.get("bg"));
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeHelp();
  };
  window.addEventListener("keydown", handleEscape);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleEscape);
    stopMapDrag();
  });
});
</script>

<template>
  <main class="page-shell" @click="closeHelp">
    <header class="site-header content-width">
      <a class="brand" href="/" aria-label="Contrast Lens home"
        ><span class="brand-mark" aria-hidden="true">◒</span
        ><span>contrast<span class="brand-dot">.</span>lens</span></a
      >
      <nav class="top-nav" aria-label="Primary navigation">
        <a href="#checker">Checker</a><a href="#method">How it works</a
        ><a
          href="https://github.com/shaal/contrast-lens"
          target="_blank"
          rel="noreferrer"
          >Open source <span aria-hidden="true">↗</span></a
        >
      </nav>
      <button class="header-cta" type="button" @click="scrollToChecker">
        Check a pair <span aria-hidden="true">↓</span>
      </button>
    </header>

    <section class="hero content-width">
      <div class="hero-glow hero-glow-a" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-b" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="eyebrow-dot"></span> Contrast is a relationship
        </p>
        <h1>Make readability <em>visible.</em></h1>
        <p class="hero-intro">
          A calmer, more tactile way to check WCAG 2 and APCA contrast. See the
          number, feel the difference, and ship color choices with confidence.
        </p>
        <div class="hero-actions">
          <button
            class="button button-light"
            type="button"
            @click="scrollToChecker"
          >
            Start checking <span aria-hidden="true">↓</span></button
          ><span class="hero-note"
            ><span class="spark" aria-hidden="true">✦</span> with a blur lens
            for humans</span
          >
        </div>
      </div>
      <div class="hero-stamp" aria-label="WCAG and APCA powered">
        <span>WCAG 2</span><span class="stamp-divider"></span><span>APCA</span>
      </div>
      <div class="hero-orbit orbit-one" aria-hidden="true"></div>
      <div class="hero-orbit orbit-two" aria-hidden="true"></div>
    </section>

    <section
      id="checker"
      class="checker-section content-width"
      aria-labelledby="checker-heading"
    >
      <div class="section-heading-row">
        <div>
          <p class="eyebrow eyebrow-dark">
            <span class="eyebrow-dot"></span> The contrast desk
          </p>
          <h2 id="checker-heading">
            Find the signal<br /><em>in your colors.</em>
          </h2>
        </div>
        <p class="section-aside">
          Use the fields or the color pickers.<br />Every update is calculated
          locally.<span class="help-wrap help-wrap-inline"
            ><button
              class="help-button"
              type="button"
              aria-label="Why are calculations local?"
              :aria-expanded="activeHelp === 'local'"
              @click.stop="toggleHelp('local', $event)"
            >
              ?</button
            ><span
              v-if="activeHelp === 'local'"
              class="help-popover"
              :style="helpStyle"
              role="tooltip"
              >Your colors stay in this browser. Nothing is sent anywhere.</span
            ></span
          >
        </p>
      </div>

      <div class="checker-card">
        <div class="checker-toolbar">
          <span class="live-indicator"><span></span> Live check</span
          ><span class="toolbar-caption">Foreground ↔ Background</span
          ><button class="text-button" type="button" @click="copyLink">
            Copy share link <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div class="color-fields">
          <article class="color-field color-field-foreground">
            <div class="field-label-row">
              <span class="label-with-help"
                ><label for="foreground-value">Foreground</label
                ><span class="help-wrap"
                  ><button
                    class="help-button"
                    type="button"
                    aria-label="What is a foreground color?"
                    :aria-expanded="activeHelp === 'foreground'"
                    @click.stop="toggleHelp('foreground', $event)"
                  >
                    ?</button
                  ><span
                    v-if="activeHelp === 'foreground'"
                    class="help-popover"
                    :style="helpStyle"
                    role="tooltip"
                    >The color used for your text, icons, or other marks.</span
                  ></span
                ></span
              ><span class="field-role">Text / icon</span>
            </div>
            <div class="field-input-row">
              <input
                class="native-color"
                type="color"
                aria-label="Foreground color picker"
                :value="foregroundHex"
                @input="updateNativeColor('foreground', $event)"
              /><input
                id="foreground-value"
                class="color-value"
                :value="foregroundInput"
                :placeholder="
                  foregroundFormat === 'HEX'
                    ? '#000000'
                    : `${foregroundFormat.toLowerCase()}(…) `
                "
                @input="updateColor('foreground', $event)"
                autocomplete="off"
                spellcheck="false"
              /><select
                class="format-select"
                aria-label="Foreground format"
                :value="foregroundFormat"
                @change="updateFormat('foreground', $event)"
              >
                <option v-for="format in formats" :key="format" :value="format">
                  {{ format }}
                </option></select
              ><span class="help-wrap format-help"
                ><button
                  class="help-button"
                  type="button"
                  aria-label="What are color formats?"
                  :aria-expanded="activeHelp === 'formats'"
                  @click.stop="toggleHelp('formats', $event)"
                >
                  ?</button
                ><span
                  v-if="activeHelp === 'formats'"
                  class="help-popover"
                  :style="helpStyle"
                  role="tooltip"
                  >Pick how you want to type a color. They are different ways to
                  describe the same color.</span
                ></span
              >
            </div>
            <div class="field-meta">
              <span class="color-dot dot-purple"></span>{{ foregroundHex }}
              <span class="meta-separator">·</span>
              {{ foreground.r.toFixed(0) }}, {{ foreground.g.toFixed(0) }},
              {{ foreground.b.toFixed(0) }}
            </div>
          </article>
          <button
            class="swap-button"
            type="button"
            aria-label="Swap colors"
            @click="swapColors"
          >
            <span aria-hidden="true">⇄</span>
          </button>
          <article class="color-field color-field-background">
            <div class="field-label-row">
              <span class="label-with-help"
                ><label for="background-value">Background</label
                ><span class="help-wrap"
                  ><button
                    class="help-button"
                    type="button"
                    aria-label="What is a background color?"
                    :aria-expanded="activeHelp === 'background'"
                    @click.stop="toggleHelp('background', $event)"
                  >
                    ?</button
                  ><span
                    v-if="activeHelp === 'background'"
                    class="help-popover"
                    :style="helpStyle"
                    role="tooltip"
                    >The surface sitting behind your text, icons, or other
                    marks.</span
                  ></span
                ></span
              ><span class="field-role">Surface / canvas</span>
            </div>
            <div class="field-input-row">
              <input
                class="native-color"
                type="color"
                aria-label="Background color picker"
                :value="backgroundHex"
                @input="updateNativeColor('background', $event)"
              /><input
                id="background-value"
                class="color-value"
                :value="backgroundInput"
                :placeholder="
                  backgroundFormat === 'HEX'
                    ? '#FFFFFF'
                    : `${backgroundFormat.toLowerCase()}(…) `
                "
                @input="updateColor('background', $event)"
                autocomplete="off"
                spellcheck="false"
              /><select
                class="format-select"
                aria-label="Background format"
                :value="backgroundFormat"
                @change="updateFormat('background', $event)"
              >
                <option v-for="format in formats" :key="format" :value="format">
                  {{ format }}
                </option></select
              ><span class="help-wrap format-help"
                ><button
                  class="help-button"
                  type="button"
                  aria-label="What are color formats?"
                  :aria-expanded="activeHelp === 'formats'"
                  @click.stop="toggleHelp('formats', $event)"
                >
                  ?</button
                ><span
                  v-if="activeHelp === 'formats'"
                  class="help-popover"
                  :style="helpStyle"
                  role="tooltip"
                  >Pick how you want to type a color. They are different ways to
                  describe the same color.</span
                ></span
              >
            </div>
            <div class="field-meta">
              <span class="color-dot dot-white"></span>{{ backgroundHex }}
              <span class="meta-separator">·</span>
              {{ background.r.toFixed(0) }}, {{ background.g.toFixed(0) }},
              {{ background.b.toFixed(0) }}
            </div>
          </article>
        </div>

        <section
          class="contrast-map-block"
          aria-labelledby="contrast-map-heading"
        >
          <div class="map-heading-row">
            <div>
              <div class="result-kicker-line">
                <h3 id="contrast-map-heading" class="map-heading">
                  Contrast map
                </h3>
                <span class="help-wrap">
                  <button
                    class="help-button"
                    type="button"
                    aria-label="What is the contrast map?"
                    :aria-expanded="activeHelp === 'map'"
                    @click.stop="toggleHelp('map', $event)"
                  >
                    ?
                  </button>
                  <span
                    v-if="activeHelp === 'map'"
                    class="help-popover"
                    :style="helpStyle"
                    role="tooltip"
                    >The dot is your color. Drag it to try nearby colors. The
                    lines show where contrast ratios 3, 4.5, and 7 are
                    reached.</span
                  >
                </span>
              </div>
              <p class="map-intro">
                Drag the {{ activeMapSide }} dot. The other color stays still.
              </p>
            </div>
            <div
              class="map-side-picker"
              role="group"
              aria-label="Color to edit"
            >
              <button
                type="button"
                :class="{ 'map-side-selected': activeMapSide === 'foreground' }"
                :aria-pressed="activeMapSide === 'foreground'"
                @click="setMapSide('foreground')"
              >
                <span
                  class="map-side-dot"
                  :style="{ backgroundColor: foregroundHex }"
                ></span
                >Foreground
              </button>
              <button
                type="button"
                :class="{ 'map-side-selected': activeMapSide === 'background' }"
                :aria-pressed="activeMapSide === 'background'"
                @click="setMapSide('background')"
              >
                <span
                  class="map-side-dot"
                  :style="{ backgroundColor: backgroundHex }"
                ></span
                >Background
              </button>
            </div>
          </div>

          <div class="contrast-map-layout">
            <div class="map-axis" aria-hidden="true">
              <span>light</span><span>dark</span>
            </div>
            <div
              ref="mapRef"
              class="contrast-map"
              :style="mapBackgroundStyle"
              role="group"
              :aria-label="`Contrast map for ${activeMapSide}`"
              @pointerdown="startMapDrag"
            >
              <svg
                class="contrast-map-guides"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  v-for="guide in mapGuides"
                  :key="guide.threshold"
                  :d="guide.path"
                  :class="{
                    'contrast-map-line-target': guide.isTarget,
                    'contrast-map-line-muted': !guide.isTarget,
                  }"
                />
              </svg>
              <span
                v-for="guide in mapGuides"
                :key="`label-${guide.threshold}`"
                class="contrast-map-label"
                :class="{ 'contrast-map-label-target': guide.isTarget }"
                :style="
                  guide.labelY === null ? {} : { top: `${guide.labelY}%` }
                "
                aria-hidden="true"
                >{{ guide.threshold }}</span
              >
              <button
                class="map-knob"
                type="button"
                :style="mapKnobStyle"
                role="slider"
                :aria-label="`${activeMapSide} color position`"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="Math.round(mapHsv.s * 100)"
                :aria-valuetext="`${mapColorLabel}. Use arrow keys to adjust.`"
                @pointerdown.stop="startMapDrag"
                @keydown="nudgeMap"
              >
                <span aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <label class="hue-control">
            <span>Hue</span>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              :value="mapHsv.h"
              aria-label="Map hue"
              @input="setMapHue"
            />
            <output>{{ Math.round(mapHsv.h) }}°</output>
          </label>
          <div class="map-footer">
            <span class="map-readout" aria-live="polite">{{
              mapColorLabel
            }}</span>
            <div class="map-legend" aria-label="WCAG guide lines">
              <span><i class="map-legend-line"></i>3 large / UI</span>
              <span
                ><i
                  class="map-legend-line"
                  :class="{ 'map-legend-line-target': targetRatio === 4.5 }"
                ></i
                >4.5 AA</span
              >
              <span
                ><i
                  class="map-legend-line"
                  :class="{ 'map-legend-line-target': targetRatio === 7 }"
                ></i
                >7 AAA</span
              >
            </div>
          </div>
        </section>

        <div class="result-grid">
          <div class="result-main">
            <div class="result-kicker-line">
              <div class="result-kicker">The relationship</div>
              <span class="help-wrap"
                ><button
                  class="help-button"
                  type="button"
                  aria-label="What is contrast ratio?"
                  :aria-expanded="activeHelp === 'ratio'"
                  @click.stop="toggleHelp('ratio', $event)"
                >
                  ?</button
                ><span
                  v-if="activeHelp === 'ratio'"
                  class="help-popover"
                  :style="helpStyle"
                  role="tooltip"
                  >How different the two colors are. 1:1 is the lowest; 21:1 is
                  the highest.</span
                ></span
              >
            </div>
            <div class="ratio-line">
              <span class="ratio-number">{{ ratio }}</span
              ><span class="ratio-unit">:1</span>
            </div>
            <div class="result-description">
              <span>WCAG 2 contrast ratio</span>
              <span class="static-scale-note"
                >Static scale · actual ratio positions</span
              >
            </div>
            <div class="ratio-scale" role="img" :aria-label="ratioScaleLabel">
              <div class="ratio-scale-track" aria-hidden="true"></div>
              <span
                v-for="threshold in ratioThresholds"
                :key="threshold.value"
                class="ratio-scale-threshold"
                :class="{
                  'ratio-scale-threshold-focus':
                    threshold.value === targetRatio,
                }"
                :style="{ left: ratioPosition(threshold.value) }"
              >
                <i aria-hidden="true"></i><strong>{{ threshold.value }}</strong>
              </span>
              <span
                class="ratio-scale-current"
                :style="{ left: currentRatioPosition }"
              >
                <strong>{{ ratio }}:1</strong><small>current</small>
                <i aria-hidden="true"></i>
              </span>
            </div>
            <div class="ratio-scale-endpoints" aria-hidden="true">
              <span>1:1 · no difference</span><span>21:1 · maximum</span>
            </div>
            <div class="ratio-scale-key" aria-hidden="true">
              <span
                ><i class="scale-key-dot scale-key-ui"></i>3 UI / large</span
              >
              <span><i class="scale-key-dot scale-key-aa"></i>4.5 AA</span>
              <span><i class="scale-key-dot scale-key-aaa"></i>7 AAA</span>
            </div>
          </div>
          <div class="score-column">
            <div
              class="score-card"
              :class="{ 'score-card-focused': wcagTarget === 'AA' }"
            >
              <div class="score-title">
                <span class="score-icon">Aa</span> WCAG 2
                <span class="help-wrap"
                  ><button
                    class="help-button"
                    type="button"
                    aria-label="What is WCAG 2?"
                    :aria-expanded="activeHelp === 'wcag'"
                    @click.stop="toggleHelp('wcag', $event)"
                  >
                    ?</button
                  ><span
                    v-if="activeHelp === 'wcag'"
                    class="help-popover"
                    :style="helpStyle"
                    role="tooltip"
                    >The common accessibility check. AA asks for 4.5:1; AAA asks
                    for 7:1 for normal text.</span
                  ></span
                >
              </div>
              <div class="score-value">{{ ratio }}<small>:1</small></div>
              <div class="score-pills">
                <span :class="{ pass: status(4.5) === 'Pass' }"
                  >AA {{ status(4.5) === "Pass" ? "pass" : "review" }}</span
                ><span :class="{ pass: status(7) === 'Pass' }"
                  >AAA {{ status(7) === "Pass" ? "pass" : "review" }}</span
                >
              </div>
            </div>
            <div class="score-card score-card-apca">
              <div class="score-title">
                <span class="score-icon score-icon-dark">Lc</span> APCA
                <span class="help-wrap"
                  ><button
                    class="help-button"
                    type="button"
                    aria-label="What is APCA?"
                    :aria-expanded="activeHelp === 'apca'"
                    @click.stop="toggleHelp('apca', $event)"
                  >
                    ?</button
                  ><span
                    v-if="activeHelp === 'apca'"
                    class="help-popover"
                    :style="helpStyle"
                    role="tooltip"
                    >A newer, directional readability score. Lc 60 is a useful
                    body-text guide.</span
                  ></span
                >
              </div>
              <div class="score-value">{{ apca }}</div>
              <div class="score-pills">
                <span :class="{ pass: apcaStatus(60) === 'Pass' }"
                  >Body
                  {{ apcaStatus(60) === "Pass" ? "pass" : "review" }}</span
                ><span :class="{ pass: apcaStatus(45) === 'Pass' }"
                  >Large
                  {{ apcaStatus(45) === "Pass" ? "pass" : "review" }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="focus-panel" :class="{ 'focus-panel-success': targetPass }">
          <div class="focus-setting">
            <div class="focus-heading">
              <span>Choose your WCAG focus</span
              ><span class="help-wrap"
                ><button
                  class="help-button"
                  type="button"
                  aria-label="What is WCAG focus?"
                  :aria-expanded="activeHelp === 'focus'"
                  @click.stop="toggleHelp('focus', $event)"
                >
                  ?</button
                ><span
                  v-if="activeHelp === 'focus'"
                  class="help-popover"
                  :style="helpStyle"
                  role="tooltip"
                  >AA is the usual minimum. AAA is a stricter goal for more
                  readable text.</span
                ></span
              >
            </div>
            <div
              class="focus-options"
              role="group"
              aria-label="Choose WCAG focus"
            >
              <button
                type="button"
                :class="{ 'focus-option-selected': wcagTarget === 'AA' }"
                :aria-pressed="wcagTarget === 'AA'"
                aria-label="WCAG AA target"
                @click="setWcagTarget('AA')"
              >
                <strong>AA</strong><span>everyday target</span></button
              ><button
                type="button"
                :class="{ 'focus-option-selected': wcagTarget === 'AAA' }"
                :aria-pressed="wcagTarget === 'AAA'"
                aria-label="WCAG AAA target"
                @click="setWcagTarget('AAA')"
              >
                <strong>AAA</strong><span>stricter target</span>
              </button>
            </div>
          </div>
          <div class="focus-feedback">
            <span class="focus-feedback-kicker">Your selected target</span
            ><strong
              >{{ wcagTarget }}
              <span>{{ targetPass ? "success" : "review" }}</span></strong
            >
            <p>{{ targetCopy }}</p>
            <span class="focus-check"
              ><i :class="{ 'focus-check-success': targetPass }">{{
                targetPass ? "✓" : "!"
              }}</i>
              {{ ratio }}:1 current / {{ targetRatio.toFixed(1) }}:1
              required</span
            >
          </div>
        </div>

        <div class="preview-row">
          <div class="preview-copy">
            <div class="preview-eyebrow">
              <p class="eyebrow eyebrow-dark">
                <span class="eyebrow-dot"></span> Readability preview
              </p>
              <span class="help-wrap"
                ><button
                  class="help-button"
                  type="button"
                  aria-label="What is the blur lens?"
                  :aria-expanded="activeHelp === 'blur'"
                  @click.stop="toggleHelp('blur', $event)"
                >
                  ?</button
                ><span
                  v-if="activeHelp === 'blur'"
                  class="help-popover"
                  :style="helpStyle"
                  role="tooltip"
                  >A visual hint. Your selected WCAG target decides whether the
                  sample stays crisp or gets blurred.</span
                ></span
              >
            </div>
            <h3>Don’t just check it.<br /><em>Look at it.</em></h3>
            <p>
              Blur pressure makes the cost of low contrast perceptible. Turn on
              the lens and tune the intensity to simulate a quick readability
              gut-check.
            </p>
            <label class="toggle-row"
              ><input
                type="checkbox"
                :checked="blurEnabled"
                @change="blurEnabled = !blurEnabled"
              /><span class="toggle-track"><span></span></span
              ><span>Enable blur lens</span
              ><span class="optional-tag">Optional</span></label
            ><label
              class="intensity-control"
              :class="{ disabled: !blurEnabled }"
              ><span
                ><span>Lens intensity</span
                ><strong>{{ blurIntensity }}%</strong></span
              ><input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="blurIntensity"
                :disabled="!blurEnabled"
                @input="setBlurIntensity"
                aria-label="Blur lens intensity"
            /></label>
            <div
              class="blur-level"
              :class="{
                'blur-level-clear': blurEnabled && effectiveBlurPixels === 0,
                'blur-level-disabled': !blurEnabled,
              }"
              aria-live="polite"
            >
              <span>Applied blur</span>
              <strong>{{ blurEnabled ? blurPixels : "Off" }}</strong>
            </div>
            <p class="blur-note">
              <span aria-hidden="true">◌</span>
              {{
                blurEnabled
                  ? blurCopy
                  : "Turn on the lens to see where contrast starts to disappear."
              }}
            </p>
          </div>
          <div
            class="preview-window"
            :style="{ backgroundColor: backgroundHex }"
          >
            <div class="preview-window-top">
              <span>Sample / body text</span
              ><span>{{ foregroundHex }} on {{ backgroundHex }}</span>
            </div>
            <div
              class="preview-content"
              :style="{ color: foregroundHex, filter: `blur(${blurPixels})` }"
            >
              <span class="preview-overline">The small things add up.</span
              ><strong>Accessible by design.</strong>
              <p>
                Good contrast helps everyone read, focus, and move through an
                interface with less effort.
              </p>
              <span class="preview-link"
                >Read the full story <span aria-hidden="true">→</span></span
              >
            </div>
            <span
              class="preview-status"
              :class="{ 'preview-status-pass': targetPass }"
              >{{
                targetPass
                  ? `${wcagTarget} · Clear`
                  : `${wcagTarget} · Needs attention`
              }}
              <i></i
            ></span>
          </div>
        </div>

        <div
          class="sample-strip"
          :style="{ backgroundColor: backgroundHex, color: foregroundHex }"
        >
          <div class="sample-strip-head">
            <span>Three quick reality checks</span
            ><span>same colors, different jobs</span>
          </div>
          <div class="sample-list">
            <div class="sample-row">
              <span class="sample-size">01</span
              ><span class="sample-label">Body copy</span
              ><span :class="['sample-text', sampleClass('body')]"
                ><span>A paragraph people can comfortably read.</span></span
              ><span
                class="sample-result"
                :class="{ 'sample-pass': status(4.5) === 'Pass' }"
                >{{ status(4.5) }}</span
              >
            </div>
            <div class="sample-row">
              <span class="sample-size">02</span
              ><span class="sample-label">Large type</span
              ><span
                :class="[
                  'sample-text',
                  'sample-text-large',
                  sampleClass('large'),
                ]"
                ><span>A headline can carry more weight.</span></span
              ><span
                class="sample-result"
                :class="{ 'sample-pass': status(3) === 'Pass' }"
                >{{ status(3) }}</span
              >
            </div>
            <div class="sample-row">
              <span class="sample-size">03</span
              ><span class="sample-label">UI / graphics</span
              ><span
                :class="['sample-text', 'sample-text-ui', sampleClass('ui')]"
                ><span>Controls need a clear edge, too.</span></span
              ><span
                class="sample-result"
                :class="{ 'sample-pass': status(3) === 'Pass' }"
                >{{ status(3) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      id="method"
      class="method-section content-width"
      aria-labelledby="method-heading"
    >
      <div class="method-intro">
        <p class="eyebrow eyebrow-dark">
          <span class="eyebrow-dot"></span> Read the signal
        </p>
        <h2 id="method-heading">
          Two lenses.<br /><em>One clear decision.</em>
        </h2>
        <p>
          WCAG gives you a familiar ratio. APCA adds perception, polarity, and
          type size. Use both as a conversation starter — then look at the
          actual interface.
        </p>
      </div>
      <div class="method-cards">
        <article class="method-card">
          <span class="method-number">01</span>
          <div class="method-card-title">
            <span class="method-glyph glyph-ratio">Aa</span>
            <h3>WCAG 2 ratio</h3>
          </div>
          <p>
            The shared baseline. A 4.5:1 ratio is the AA target for normal text;
            7:1 is the stricter AAA target.
          </p>
          <span class="method-rule"></span
          ><span class="method-foot">Good for compliance language</span>
        </article>
        <article class="method-card method-card-dark">
          <span class="method-number">02</span>
          <div class="method-card-title">
            <span class="method-glyph glyph-lc">Lc</span>
            <h3>APCA score</h3>
          </div>
          <p>
            A perceptual, directional score. Lc 60 is a useful body-text guide;
            polarity tells you whether light or dark is doing the work.
          </p>
          <span class="method-rule"></span
          ><span class="method-foot">Good for type-aware decisions</span>
        </article>
      </div>
    </section>
    <section class="closing-panel content-width">
      <div class="closing-orb" aria-hidden="true"></div>
      <p class="eyebrow">
        <span class="eyebrow-dot"></span> A better color conversation
      </p>
      <h2>Make the invisible<br /><em>impossible to miss.</em></h2>
      <button
        class="button button-light"
        type="button"
        @click="scrollToChecker"
      >
        Check another pair <span aria-hidden="true">↓</span>
      </button>
    </section>
    <footer class="site-footer content-width">
      <a class="brand" href="/" aria-label="Contrast Lens home"
        ><span class="brand-mark" aria-hidden="true">◒</span
        ><span>contrast<span class="brand-dot">.</span>lens</span></a
      >
      <p>Open source contrast tools for thoughtful interfaces.</p>
      <span class="footer-meta">WCAG 2 · APCA · local-first</span>
    </footer>
    <div class="toast" :class="{ 'toast-visible': toast }" role="status">
      {{ toast }}
    </div>
  </main>
</template>
