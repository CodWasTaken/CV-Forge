import { collectHighlights, escapeHtml, escapeAttribute, normalizeUrl, renderBulletList } from './website-utils.mjs';

export function renderAbout(profile, website) {
  const highlights = collectHighlights(profile).slice(0, 3);
  if (!website.aboutBody && !highlights.length) return '';
  return `<section class="section section-grid reveal" id="about">
    <div><p class="section-number">01</p><h2>${escapeHtml(website.aboutTitle)}</h2></div>
    <div class="section-copy"><p class="lead">${escapeHtml(website.aboutBody)}</p>${highlights.length ? `<ul class="highlight-list">${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</div>
  </section>`;
}

export function renderSkills(profile, website) {
  const skills = (profile.skills || []).filter(Boolean);
  if (!skills.length) return '';
  return `<section class="section reveal" id="skills"><div class="section-heading"><p class="section-number">02</p><h2>${escapeHtml(website.skillsTitle)}</h2></div><div class="skill-cloud">${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}</div></section>`;
}

export function renderExperience(profile, website) {
  const source = profile.experience || [];
  const items = website.featuredExperience.map((index) => source[index]).filter(Boolean);
  if (!items.length) return '';
  return `<section class="section reveal" id="experience"><div class="section-heading"><div><p class="section-number">03</p><h2>${escapeHtml(website.experienceTitle)}</h2></div><p>${escapeHtml(website.experienceIntro)}</p></div><div class="timeline">${items.map((item) => {
    const dates = [item.start, item.end].filter(Boolean).join(' — ');
    return `<article class="timeline-item"><div class="timeline-meta"><span>${escapeHtml(dates)}</span>${item.location ? `<span>${escapeHtml(item.location)}</span>` : ''}</div><div><h3>${escapeHtml(item.role || item.organization)}</h3>${item.organization && item.role ? `<p class="organization">${escapeHtml(item.organization)}</p>` : ''}${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}${renderBulletList(item.achievements)}</div></article>`;
  }).join('')}</div></section>`;
}

export function renderProjects(profile, website) {
  const source = profile.projects || [];
  const items = website.featuredProjects.map((index) => source[index]).filter(Boolean);
  if (!items.length) return '';
  return `<section class="section reveal" id="projects"><div class="section-heading"><div><p class="section-number">04</p><h2>${escapeHtml(website.projectsTitle)}</h2></div><p>${escapeHtml(website.projectsIntro)}</p></div><div class="project-grid">${items.map((item, index) => `<article class="project-card"><span class="project-index">0${index + 1}</span><h3>${escapeHtml(item.name || 'Project')}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}${renderBulletList(item.achievements)}${item.link ? `<a href="${escapeAttribute(normalizeUrl(item.link))}" target="_blank" rel="noreferrer">View project <span aria-hidden="true">↗</span></a>` : ''}</article>`).join('')}</div></section>`;
}

export function renderCredentials(profile) {
  const groups = [
    ['Education', (profile.education || []).map((item) => [item.degree, item.institution, [item.start, item.end].filter(Boolean).join('–')].filter(Boolean).join(' · '))],
    ['Certifications', profile.certifications || []],
    ['Awards', profile.awards || []],
    ['Languages', profile.languages || []]
  ].filter(([, items]) => items.some(Boolean));
  if (!groups.length) return '';
  return `<section class="section reveal" id="credentials"><div class="section-heading"><p class="section-number">05</p><h2>Credentials</h2></div><div class="credential-grid">${groups.map(([title, items]) => `<div><h3>${escapeHtml(title)}</h3><ul>${items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
}

export function renderContact(profile, website) {
  const personal = profile.personal || {};
  const links = [
    personal.email ? `<a href="mailto:${escapeAttribute(personal.email)}">${escapeHtml(personal.email)}</a>` : '',
    personal.linkedin ? `<a href="${escapeAttribute(normalizeUrl(personal.linkedin))}" target="_blank" rel="noreferrer">LinkedIn</a>` : '',
    personal.website ? `<a href="${escapeAttribute(normalizeUrl(personal.website))}" target="_blank" rel="noreferrer">Website</a>` : ''
  ].filter(Boolean);
  if (!website.contactText && !links.length) return '';
  return `<section class="contact-section reveal" id="contact"><p class="eyebrow">Contact</p><h2>${escapeHtml(website.contactTitle)}</h2><p>${escapeHtml(website.contactText)}</p><div class="contact-links">${links.join('')}</div></section>`;
}

export function primaryCta(profile, website) {
  const personal = profile.personal || {};
  if (personal.email) return `<a class="button button-primary" href="mailto:${escapeAttribute(personal.email)}">${escapeHtml(website.ctaLabel)}</a>`;
  if (personal.linkedin) return `<a class="button button-primary" href="${escapeAttribute(normalizeUrl(personal.linkedin))}" target="_blank" rel="noreferrer">${escapeHtml(website.ctaLabel)}</a>`;
  if (personal.website) return `<a class="button button-primary" href="${escapeAttribute(normalizeUrl(personal.website))}" target="_blank" rel="noreferrer">${escapeHtml(website.ctaLabel)}</a>`;
  return `<a class="button button-primary" href="#about">${escapeHtml(website.ctaLabel)}</a>`;
}

