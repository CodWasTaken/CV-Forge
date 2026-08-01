export const profileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile', 'coachNotes', 'followUpQuestions'],
  properties: {
    profile: {
      type: 'object',
      additionalProperties: false,
      required: ['personal', 'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards', 'languages', 'achievements'],
      properties: {
        personal: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'title', 'email', 'phone', 'location', 'website', 'linkedin'],
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            location: { type: 'string' },
            website: { type: 'string' },
            linkedin: { type: 'string' }
          }
        },
        summary: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['role', 'organization', 'location', 'start', 'end', 'summary', 'achievements'],
            properties: {
              role: { type: 'string' },
              organization: { type: 'string' },
              location: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' },
              summary: { type: 'string' },
              achievements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['degree', 'institution', 'location', 'start', 'end', 'details'],
            properties: {
              degree: { type: 'string' },
              institution: { type: 'string' },
              location: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' },
              details: { type: 'string' }
            }
          }
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'link', 'description', 'achievements'],
            properties: {
              name: { type: 'string' },
              link: { type: 'string' },
              description: { type: 'string' },
              achievements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        certifications: { type: 'array', items: { type: 'string' } },
        awards: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        achievements: { type: 'array', items: { type: 'string' } }
      }
    },
    coachNotes: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } }
  }
};

export const websiteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['website', 'coachNotes', 'followUpQuestions'],
  properties: {
    website: {
      type: 'object',
      additionalProperties: false,
      required: [
        'theme', 'accent', 'heroKicker', 'headline', 'subheadline', 'aboutTitle', 'aboutBody',
        'experienceTitle', 'experienceIntro', 'projectsTitle', 'projectsIntro', 'skillsTitle',
        'contactTitle', 'contactText', 'ctaLabel', 'sectionOrder', 'featuredExperience', 'featuredProjects'
      ],
      properties: {
        theme: { type: 'string', enum: ['aurora', 'studio', 'mono'] },
        accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        heroKicker: { type: 'string' },
        headline: { type: 'string' },
        subheadline: { type: 'string' },
        aboutTitle: { type: 'string' },
        aboutBody: { type: 'string' },
        experienceTitle: { type: 'string' },
        experienceIntro: { type: 'string' },
        projectsTitle: { type: 'string' },
        projectsIntro: { type: 'string' },
        skillsTitle: { type: 'string' },
        contactTitle: { type: 'string' },
        contactText: { type: 'string' },
        ctaLabel: { type: 'string' },
        sectionOrder: {
          type: 'array',
          items: { type: 'string', enum: ['about', 'skills', 'experience', 'projects', 'credentials', 'contact'] }
        },
        featuredExperience: { type: 'array', items: { type: 'integer', minimum: 0 } },
        featuredProjects: { type: 'array', items: { type: 'integer', minimum: 0 } }
      }
    },
    coachNotes: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } }
  }
};
