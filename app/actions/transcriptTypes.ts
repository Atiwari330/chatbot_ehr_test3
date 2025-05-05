import { z } from "zod";

// Schema for validating data received by the server action
export const TranscriptSchema = z.object({
  clientId: z.string().uuid("Invalid Client ID format."),
  // Use coerce.date() for datetime-local input string
  sessionDateTime: z.coerce.date({
    required_error: "Session date and time are required.",
    invalid_type_error: "Invalid date and time format. Please ensure you select both date and time.",
  }),
  content: z.string().min(1, "Transcript content cannot be empty."),
});

// Define the state type for useActionState hook in the form component
export type AddTranscriptFormState = {
  message: string | null;
  errors?: {
    clientId?: string[];
    sessionDateTime?: string[];
    content?: string[];
    authorization?: string[]; // For permission errors
    general?: string[]; // For database or unexpected errors
  };
  success: boolean;
} | null;
