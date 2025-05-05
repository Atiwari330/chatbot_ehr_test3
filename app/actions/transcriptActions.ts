"use server";

import { auth } from "@/app/(auth)/auth";
import { addTranscript, getClientById } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";
import { TranscriptSchema, type AddTranscriptFormState } from "./transcriptTypes";

export async function addTranscriptAction(
  prevState: AddTranscriptFormState | null,
  formData: FormData
): Promise<AddTranscriptFormState> {
  const session = await auth();
  const userId = session?.user?.id;

  // 1. Authentication Check
  if (!userId) {
    return {
      message: "Authentication required.",
      success: false,
      errors: { authorization: ["User not authenticated."] },
    };
  }

  const rawFormData = {
    clientId: formData.get("clientId"),
    sessionDateTime: formData.get("sessionDateTime"), // Comes as string e.g., "YYYY-MM-DDTHH:mm"
    content: formData.get("content"),
  };

  // 2. Server-Side Validation
  const validatedFields = TranscriptSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("Server Validation Errors:", validatedFields.error.flatten().fieldErrors);
    // Return detailed errors for the form state
    return {
      message: "Validation failed. Please check the fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { clientId, sessionDateTime, content } = validatedFields.data;

  try {
    // 3. Authorization Check: Ensure user owns the client
    const client = await getClientById(clientId, userId);
    if (!client) {
      // Prevent adding transcript to a client not owned by the user
      return {
        message: "Authorization failed.",
        success: false,
        errors: { authorization: ["Client not found or access denied."] },
      };
    }

    // 4. Database Insertion
    const newTranscript = await addTranscript({
      clientId: clientId,
      sessionDateTime: sessionDateTime, // Zod coerced this to a Date object
      content: content,
    });

    console.log(`Successfully added transcript ${newTranscript.id} for client ${clientId}`);

    // 5. Cache Revalidation: Crucial for showing the new transcript on the page
    // This tells Next.js to refetch data for this path on the next request.
    revalidatePath(`/clients/${clientId}`);

    // 6. Return Success State
    return {
      message: "Transcript added successfully.",
      success: true,
    };

  } catch (error) {
    console.error(`Failed to add transcript for client ${clientId}:`, error);
    // Handle specific DB errors like unique constraint violation
    if (error instanceof Error && error.message.includes('transcript_client_session_unique_idx')) {
      return {
        message: "A transcript for this client at this exact session date and time already exists.",
        success: false,
        errors: { sessionDateTime: ["A transcript for this exact date/time already exists."] },
      };
    }
    // Generic database error
    return {
      message: "Database Error: Failed to add transcript.",
      success: false,
      errors: { general: ["An unexpected error occurred while saving the transcript."] },
    };
  }
}
