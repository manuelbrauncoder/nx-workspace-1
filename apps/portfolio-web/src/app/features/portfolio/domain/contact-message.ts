// The model belongs to the API layer. The rest of the feature imports it from here, so `domain`
// stays the only place of the feature that knows the API layer.
export type { ContactMessage } from '@api/contact/contact-message';
