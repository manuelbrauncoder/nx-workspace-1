// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { MEDIA_MAX_BYTES, MEDIA_TYPES } from '@api/media/media';
export type { Media } from '@api/media/media';
export {
  PORTFOLIO_LIMITS,
  PORTFOLIO_SECTIONS,
  isPortfolioSectionName,
} from '@api/portfolio/portfolio';
export type {
  About,
  ContactSection,
  Hero,
  Portfolio,
  PortfolioImage,
  PortfolioSectionName,
  PortfolioSections,
  Project,
  ProjectsSection,
  Seo,
  Settings,
  Skill,
  SkillSet,
  SkillsSection,
} from '@api/portfolio/portfolio';
