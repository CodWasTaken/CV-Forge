export const emptyProfile = () => ({
  personal: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: ''
  },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  awards: [],
  languages: [],
  achievements: []
});

const ensureString = (value) => typeof value === 'string' ? value : '';
const ensureStringArray = (value) => Array.isArray(value) ? value.map(ensureString).filter(Boolean) : [];

export function normalizeProfile(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const personal = source.personal && typeof source.personal === 'object' ? source.personal : {};

  return {
    personal: {
      name: ensureString(personal.name),
      title: ensureString(personal.title),
      email: ensureString(personal.email),
      phone: ensureString(personal.phone),
      location: ensureString(personal.location),
      website: ensureString(personal.website),
      linkedin: ensureString(personal.linkedin)
    },
    summary: ensureString(source.summary),
    skills: ensureStringArray(source.skills),
    experience: Array.isArray(source.experience) ? source.experience.map((item) => ({
      role: ensureString(item?.role),
      organization: ensureString(item?.organization),
      location: ensureString(item?.location),
      start: ensureString(item?.start),
      end: ensureString(item?.end),
      summary: ensureString(item?.summary),
      achievements: ensureStringArray(item?.achievements)
    })) : [],
    education: Array.isArray(source.education) ? source.education.map((item) => ({
      degree: ensureString(item?.degree),
      institution: ensureString(item?.institution),
      location: ensureString(item?.location),
      start: ensureString(item?.start),
      end: ensureString(item?.end),
      details: ensureString(item?.details)
    })) : [],
    projects: Array.isArray(source.projects) ? source.projects.map((item) => ({
      name: ensureString(item?.name),
      link: ensureString(item?.link),
      description: ensureString(item?.description),
      achievements: ensureStringArray(item?.achievements)
    })) : [],
    certifications: ensureStringArray(source.certifications),
    awards: ensureStringArray(source.awards),
    languages: ensureStringArray(source.languages),
    achievements: ensureStringArray(source.achievements)
  };
}

export const demoProfile = normalizeProfile({
  personal: {
    name: 'Alex Morgan',
    title: 'Product-minded Software Engineer',
    email: 'alex@example.com',
    phone: '+48 000 000 000',
    location: 'Warsaw, Poland',
    website: 'alexmorgan.dev',
    linkedin: 'linkedin.com/in/alexmorgan'
  },
  summary: 'Product-minded software engineer who turns ambiguous customer problems into reliable web products. Experienced in modern JavaScript, accessible interfaces, and measurable delivery improvements.',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Product discovery', 'Accessibility', 'SQL', 'CI/CD'],
  experience: [
    {
      role: 'Senior Software Engineer',
      organization: 'Northstar Labs',
      location: 'Warsaw, Poland',
      start: '2023',
      end: 'Present',
      summary: 'Led product engineering for a B2B workflow platform used by operations teams.',
      achievements: [
        'Reduced onboarding time by 38% by redesigning the setup flow around customer support data.',
        'Introduced automated release checks that cut production regressions by 45%.',
        'Mentored four engineers and established lightweight architecture reviews for high-risk changes.'
      ]
    },
    {
      role: 'Frontend Engineer',
      organization: 'Brightworks',
      location: 'Remote',
      start: '2020',
      end: '2023',
      summary: 'Built customer-facing analytics and account-management experiences.',
      achievements: [
        'Improved Core Web Vitals across the application and increased trial-to-paid conversion by 9%.',
        'Created a reusable component library adopted by three product squads.'
      ]
    }
  ],
  education: [
    {
      degree: 'BSc, Computer Science',
      institution: 'Warsaw University of Technology',
      location: 'Warsaw, Poland',
      start: '2016',
      end: '2020',
      details: 'Focus: human-computer interaction and distributed systems.'
    }
  ],
  projects: [
    {
      name: 'Open Portfolio Kit',
      link: 'github.com/alex/open-portfolio-kit',
      description: 'An open-source starter for accessible developer portfolios.',
      achievements: ['Reached 1,200 GitHub stars and received contributions from 20 developers.']
    }
  ],
  certifications: ['Professional Scrum Product Owner I'],
  awards: ['Northstar Impact Award, 2025'],
  languages: ['English — fluent', 'Polish — native'],
  achievements: ['Speaker at WarsawJS: “Designing interfaces that explain themselves.”']
});
