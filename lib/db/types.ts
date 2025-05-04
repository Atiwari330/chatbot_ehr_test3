import type { InferSelectModel } from 'drizzle-orm';
import { user, client, transcript /*, add more tables here */ } from './schema';

// Re-export inferred types for convenience
export type User = InferSelectModel<typeof user>;
export type Client = InferSelectModel<typeof client>;
export type Transcript = InferSelectModel<typeof transcript>;

// Add more exported types as your schema grows
