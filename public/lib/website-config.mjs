import { themeAccent } from './website-theme.mjs';
import { normalizeIndexes, unique, text } from './website-utils.mjs';
const THEMES = new Set(['aurora', 'studio', 'mono']);
const SECTIONS = ['about', 'skills', 'experience', 'projects', 'credentials', 'contact'];

export function createDefaultWebsite(profile = {}) {
  const personal = profile.personal || {};
  const title = personal.title || 'Professional';
  const name = personal.name || 'Your Name';
  return {
    theme: 'aurora',
    accent: '#7c5cff',
    heroKicker: 'Portfolio & CV',
    headline: `${name} — ${title}`,
    subheadline: profile.summary || `A focused overview of ${name}'s experience, projects, and professional strengths.`,
    aboutTitle: 'About',
    aboutBody: profile.summary || 'Add a professional summary to introduce your work and the outcomes you create.',
    experienceTitle: 'Experience',
    experienceIntro: 'Selected roles, responsibilities, and measurable contributions.',
    projectsTitle: 'Selected work',
    projectsIntro: 'Projects that show how ideas were turned into useful outcomes.',
    skillsTitle: 'Capabilities',
    contactTitle: 'Let’s work together',
    contactText: personal.email ? `Reach out at ${personal.email}.` : 'Add an email address or professional link to make it easy to get in touch.',
    ctaLabel: personal.email ? 'Email me' : 'View profile',
    sectionOrder: [...SECTIONS],
    featuredExperience: (profile.experience || []).map((_, index) => index).slice(0, 4),
    featuredProjects: (profile.projects || []).map((_, index) => index).slice(0, 4)
  };
}

export function normalizeWebsite(value = {}, profile = {}) {
  const defaults = createDefaultWebsite(profile);
  const source = value && typeof value === 'object' ? value : {};
  const theme = THEMES.has(source.theme) ? source.theme : defaults.theme;
  const accent = /^#[0-9a-f]{6}$/i.test(String(source.accent || '')) ? String(source.accent) : themeAccent(theme);
  const sectionOrder = unique((Array.isArray(source.sectionOrder) ? source.sectionOrder : defaults.sectionOrder)
    .filter((item) => SECTIONS.includes(item)));
  for (const section of SECTIONS) if (!sectionOrder.includes(section)) sectionOrder.push(section);

  return {
    theme,
    accent,
    heroKicker: text(source.heroKicker, defaults.heroKicker),
    headline: text(source.headline, defaults.headline),
    subheadline: text(source.subheadline, defaults.subheadline),
    aboutTitle: text(source.aboutTitle, defaults.aboutTitle),
    aboutBody: text(source.aboutBody, defaults.aboutBody),
    experienceTitle: text(source.experienceTitle, defaults.experienceTitle),
    experienceIntro: text(source.experienceIntro, defaults.experienceIntro),
    projectsTitle: text(source.projectsTitle, defaults.projectsTitle),
    projectsIntro: text(source.projectsIntro, defaults.projectsIntro),
    skillsTitle: text(source.skillsTitle, defaults.skillsTitle),
    contactTitle: text(source.contactTitle, defaults.contactTitle),
    contactText: text(source.contactText, defaults.contactText),
    ctaLabel: text(source.ctaLabel, defaults.ctaLabel),
    sectionOrder,
    featuredExperience: normalizeIndexes(source.featuredExperience, profile.experience?.length, defaults.featuredExperience),
    featuredProjects: normalizeIndexes(source.featuredProjects, profile.projects?.length, defaults.featuredProjects)
  };
}
