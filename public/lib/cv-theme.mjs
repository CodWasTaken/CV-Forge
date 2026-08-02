const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const CV_THEME_PRESETS = Object.freeze({
  classic: Object.freeze({
    name: 'Classic',
    accent: '#30343d',
    accent2: '#555b68',
    page: '#ffffff',
    text: '#22252c',
    muted: '#606572',
    panel: '#eef0f4',
    font: 'modern'
  }),
  ocean: Object.freeze({
    name: 'Ocean',
    accent: '#155e75',
    accent2: '#0e7490',
    page: '#f7fbfc',
    text: '#102a32',
    muted: '#49656d',
    panel: '#dff2f5',
    font: 'humanist'
  }),
  forest: Object.freeze({
    name: 'Forest',
    accent: '#24543b',
    accent2: '#3f7556',
    page: '#fbfcf8',
    text: '#1c2b22',
    muted: '#58685e',
    panel: '#e5efe7',
    font: 'humanist'
  }),
  ember: Object.freeze({
    name: 'Ember',
    accent: '#9a3412',
    accent2: '#c2410c',
    page: '#fffaf5',
    text: '#301b14',
    muted: '#79584c',
    panel: '#ffead8',
    font: 'classic'
  }),
  plum: Object.freeze({
    name: 'Plum',
    accent: '#6b3a75',
    accent2: '#8b4f96',
    page: '#fffaff',
    text: '#2e2031',
    muted: '#6d5b70',
    panel: '#f2e5f4',
    font: 'modern'
  }),
  mono: Object.freeze({
    name: 'Mono',
    accent: '#111111',
    accent2: '#3f3f46',
    page: '#ffffff',
    text: '#111111',
    muted: '#52525b',
    panel: '#eeeeef',
    font: 'technical'
  })
});

export const CV_FONT_OPTIONS = Object.freeze({
  modern: Object.freeze({ name: 'Modern sans', body: 'Arial, Helvetica, sans-serif', heading: 'Arial, Helvetica, sans-serif' }),
  humanist: Object.freeze({ name: 'Humanist sans', body: 'Trebuchet MS, Segoe UI, sans-serif', heading: 'Trebuchet MS, Segoe UI, sans-serif' }),
  classic: Object.freeze({ name: 'Classic serif', body: 'Georgia, Times New Roman, serif', heading: 'Georgia, Times New Roman, serif' }),
  technical: Object.freeze({ name: 'Technical mono', body: 'SFMono-Regular, Consolas, Liberation Mono, monospace', heading: 'Arial, Helvetica, sans-serif' })
});

export const DEFAULT_CV_THEME = Object.freeze({
  preset: 'classic',
  ...CV_THEME_PRESETS.classic
});

export function normalizeCvTheme(value = {}) {
  const preset = typeof value.preset === 'string' && CV_THEME_PRESETS[value.preset]
    ? value.preset
    : 'custom';
  const fallback = CV_THEME_PRESETS[preset] || CV_THEME_PRESETS.classic;
  const font = typeof value.font === 'string' && CV_FONT_OPTIONS[value.font] ? value.font : fallback.font;

  return {
    preset,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 40) : fallback.name,
    accent: normalizeColor(value.accent, fallback.accent),
    accent2: normalizeColor(value.accent2, fallback.accent2),
    page: normalizeColor(value.page, fallback.page),
    text: normalizeColor(value.text, fallback.text),
    muted: normalizeColor(value.muted, fallback.muted),
    panel: normalizeColor(value.panel, fallback.panel),
    font
  };
}

export function themeFromPreset(preset) {
  const selected = CV_THEME_PRESETS[preset] || CV_THEME_PRESETS.classic;
  return normalizeCvTheme({ preset: CV_THEME_PRESETS[preset] ? preset : 'classic', ...selected });
}

export function cvThemeVariables(input) {
  const theme = normalizeCvTheme(input);
  const fonts = CV_FONT_OPTIONS[theme.font];
  return {
    '--cv-accent': theme.accent,
    '--cv-accent-2': theme.accent2,
    '--cv-page-bg': theme.page,
    '--cv-text': theme.text,
    '--cv-muted': theme.muted,
    '--cv-panel': theme.panel,
    '--cv-on-accent': readableTextColor(theme.accent),
    '--cv-on-accent-muted': blend(readableTextColor(theme.accent), theme.accent, 0.22),
    '--cv-body-font': fonts.body,
    '--cv-heading-font': fonts.heading
  };
}

export function readableTextColor(hex) {
  const [r, g, b] = hexToRgb(normalizeColor(hex, '#000000'));
  const luminance = [r, g, b]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.43 ? '#111111' : '#ffffff';
}

function normalizeColor(value, fallback) {
  return typeof value === 'string' && HEX_COLOR.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

function hexToRgb(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function blend(foreground, background, backgroundWeight) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const mixed = fg.map((channel, index) => Math.round(channel * (1 - backgroundWeight) + bg[index] * backgroundWeight));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
