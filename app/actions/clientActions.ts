"use server";

import { z } from "zod";
import { updateClient } from "@/lib/db/queries"; // Use existing function
import { revalidatePath } from "next/cache";

// --- Zod Schema reflecting client fields ---
const ClientUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional().nullable()
    .transform(val => val ? val.toISOString().split('T')[0] : undefined), // Convert Date to string format
  gender: z.string().optional().or(z.literal("")),
  insuranceCompany: z.string().optional().or(z.literal("")),
  chiefComplaint: z.string().optional().or(z.literal("")),
  medications: z.string().optional().or(z.literal("")),
  treatmentGoals: z.string().optional().or(z.literal("")),
  // Handle diagnosis array - this assumes comma-separated input from a textarea
  diagnosis: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    ) // Split string into array, trim whitespace, remove empty strings
    .pipe(z.array(z.string()).optional()), // Validate as optional array of strings
});

// Type for form state
export type ClientFormState = {
  message: string | null;
  errors?: {
    name?: string[];
    email?: string[];
    phone?: string[];
    address?: string[];
    notes?: string[];
    dateOfBirth?: string[];
    gender?: string[];
    insuranceCompany?: string[];
    chiefComplaint?: string[];
    medications?: string[];
    treatmentGoals?: string[];
    diagnosis?: string[];
    general?: string[];
  };
  success: boolean;
} | null;

export async function updateClientAction(
  clientId: string,
  userId: string, // We need userId for the updateClient function
  prevState: ClientFormState | null,
  formData: FormData
): Promise<ClientFormState> {
  if (!clientId) {
    return {
      message: "Client ID is missing.",
      success: false,
      errors: { general: ["Client ID is missing."] },
    };
  }

  // Extract ALL relevant fields from FormData
  const rawFormData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    dateOfBirth: formData.get("dateOfBirth"), // Comes as string from form
    gender: formData.get("gender"),
    insuranceCompany: formData.get("insuranceCompany"),
    chiefComplaint: formData.get("chiefComplaint"),
    medications: formData.get("medications"),
    treatmentGoals: formData.get("treatmentGoals"),
    diagnosis: formData.get("diagnosis"), // Comes as string (e.g., comma-separated)
  };

  // Validate the data using the comprehensive schema
  const validatedFields = ClientUpdateSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error(
      "Validation Errors:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      message: "Validation failed. Please check the fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  try {
    console.log(
      `Attempting to update client ${clientId} with data:`,
      validatedFields.data
    );

    // Use existing updateClient function from queries.ts
    const updatedClient = await updateClient(
      clientId,
      userId,
      validatedFields.data // Pass the validated data object
    );

    console.log(
      `Successfully updated client ${clientId} (Name: ${updatedClient.name})`
    );

    // Revalidate paths to reflect changes
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients"); // Revalidate list page if names might change there

    return {
      message: `Client "${updatedClient.name}" updated successfully.`,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to update client ${clientId}:`, error);
    return {
      message: "Database Error: Failed to update client.",
      success: false,
      errors: { general: ["Database Error: Failed to update client."] },
    };
  }
}
