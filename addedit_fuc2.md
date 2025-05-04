This plan reflects the actual structure of your codebase. Adjustments were made to correctly reference the database connection and leverage existing functions.

Goal: Add functionality to edit existing client details on the client profile page (/clients/[clientId]).

Core Technologies: Next.js (App Router), Drizzle ORM, React, Server Actions, Zod, TypeScript.

Plan:

1. Verify Database Schema (lib/db/schema.ts)

Action: Confirm your existing clientsTable schema includes all necessary fields and the automatic updatedAt handler. The existing schema already has this properly configured.

Current Structure (Based on Code Analysis):

```typescript
// lib/db/schema.ts
export const client = pgTable(
  'client',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId:
      uuid('user_id')
        .notNull()
        .references(() => user.id),
    name: text('name').notNull(),
    dateOfBirth: date('dob').notNull(),
    gender: text('gender').notNull().default('Prefer not to say'),
    insuranceCompany: text('insurance_company').notNull().default(''),
    chiefComplaint: text('chief_complaint').notNull().default(''),
    diagnosis: text('diagnosis').array().notNull().default(sql`'{}'::text[]`),
    medications: text('medications').notNull().default(''),
    treatmentGoals: text('treatment_goals').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
```

Note: The schema already has the correct `$onUpdate` handler for the `updatedAt` field, so no changes are needed.

2. Create Server Action Directory (If Needed)

Action: Ensure the directory app/actions/ exists in your project root. If not, create it.

```bash
mkdir -p app/actions
```

3. Implement Server Action (app/actions/clientActions.ts)

Action: Create/update the server action file to handle the update logic. Note that there's already an `updateClient` function in `lib/db/queries.ts` that we can leverage.

Code:

```typescript
// app/actions/clientActions.ts
"use server";

import { z } from "zod";
import { updateClient } from "@/lib/db/queries"; // Use existing function
import { revalidatePath } from "next/cache";

// --- Zod Schema reflecting ACTUAL Client fields ---
// Adjust types (e.g., z.enum for gender) and required/optional status as needed
const ClientUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional().nullable(), // Coerce string input to Date
  gender: z.string().optional().or(z.literal("")), // Consider z.enum(['Male', 'Female', 'Other']) if applicable
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
```

4. Update Client Profile Page (app/clients/[clientId]/page.tsx)

Action: Ensure the page component fetches the client data using Drizzle and passes the correct data (matching SelectClient type) to the ClientEditForm component.

Code:

```typescript
// app/clients/[clientId]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db"; // Adjust path
import { client, SelectClient } from "@/lib/db/schema"; // Adjust path
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import ClientEditForm from "./ClientEditForm"; // The form component

// Fetch client data using Drizzle
async function getClient(id: string): Promise<SelectClient | null> {
  // Add authorization check here if needed (e.g., check if logged-in user matches client.userId)
  try {
    const result = await db
      .select()
      .from(client)
      .where(eq(client.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return null;
  }
}

// Generate Metadata
export async function generateMetadata({
  params,
}: {
  params: { clientId: string };
}): Promise<Metadata> {
  const client = await getClient(params.clientId);
  if (!client) {
    return { title: "Client Not Found" };
  }
  return { title: `Client: ${client.name}` };
}

// Page Component
export default async function ClientProfilePage({
  params,
}: {
  params: { clientId: string };
}) {
  const client = await getClient(params.clientId);

  if (!client) {
    notFound();
  }

  // The fetched 'client' object (type SelectClient) should be directly usable
  // by ClientEditForm if its prop type is set correctly.

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-6">
        {/* Pass the full client object */}
        <ClientEditForm client={client} />
      </div>

      {/* Other sections (e.g., related projects, invoices) */}
      <div className="mt-6">
        <Link href="/clients" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Clients List
        </Link>
      </div>
    </div>
  );
}
```

5. Update Client Edit Form Component (app/clients/[clientId]/ClientEditForm.tsx)

Action: Modify the form component to handle the edit state, display all relevant client fields in view mode, and provide inputs for all editable fields in edit mode, using the SelectClient type for props.

Code:

```typescript
// app/clients/[clientId]/ClientEditForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateClientAction,
  ClientFormState,
} from "@/app/actions/clientActions";
import type { SelectClient } from "@/lib/db/schema"; // Import the correct type

interface ClientEditFormProps {
  client: SelectClient; // Use the type inferred from your schema
}

// Separate SubmitButton (no changes needed from previous plan)
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
        pending
          ? "bg-indigo-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      }`}
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export default function ClientEditForm({ client }: ClientEditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const initialState: ClientFormState = { message: null, success: false };
  const updateClientWithId = updateClientAction.bind(
    null,
    client.id,
    client.userId
  );
  const [state, formAction] = useFormState(updateClientWithId, initialState);

  useEffect(() => {
    if (state?.success) {
      setIsEditing(false); // Exit edit mode on successful save
      // Optionally show state.message in a toast notification
      console.log(state.message);
    }
    if (state?.errors?.general) {
      // Display general errors (e.g., DB connection issues)
      console.error("Server Action Error:", state.errors.general.join(", "));
      // Show error to user via toast or alert div
    }
  }, [state]);

  const handleCancel = () => {
    setIsEditing(false);
    // Resetting form state is implicitly handled by useFormState and re-render
  };

  // Helper to format date for display and input defaultValue
  const formatDateForInput = (
    date: Date | string | null | undefined
  ): string => {
    if (!date) return "";
    try {
      // Handles both Date objects and date strings
      const d = new Date(date);
      // Format as YYYY-MM-DD for the date input type
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      return ""; // Return empty if date is invalid
    }
  };

  // Format diagnosis array for display/editing
  const formatDiagnosisForDisplay = (
    diag: string[] | null | undefined
  ): string => {
    return diag?.join(", ") || "N/A";
  };
  const formatDiagnosisForInput = (
    diag: string[] | null | undefined
  ): string => {
    return diag?.join(", ") || "";
  };

  if (!isEditing) {
    // --- View Mode ---
    return (
      <div>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {client.name}
          </h2>
          <button
            onClick={() => setIsEditing(true)}
            className="ml-4 inline-flex justify-center py-1 px-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Edit Client
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {/* Display ALL relevant fields */}
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.email || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.phone || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.dateOfBirth
                ? new Date(client.dateOfBirth).toLocaleDateString()
                : "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Gender</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.gender || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.address || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Insurance Company
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.insuranceCompany || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Chief Complaint
            </dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.chiefComplaint || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Diagnosis</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {formatDiagnosisForDisplay(client.diagnosis)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Medications</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.medications || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Treatment Goals
            </dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.treatmentGoals || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Notes</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.notes || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(client.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.updatedAt
                ? new Date(client.updatedAt).toLocaleDateString()
                : "N/A"}
            </dd>
          </div>
          {/* Do NOT display userId unless necessary */}
        </dl>
      </div>
    );
  } else {
    // --- Edit Mode ---
    return (
      <form action={formAction} className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Edit Client
        </h2>

        {/* Display general form errors/success */}
        {state?.message && !state.success && state.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            {" "}
            <p className="text-sm font-medium text-red-800">
              {state.errors.general.join(", ")}
            </p>{" "}
          </div>
        )}
        {/* Consider using toasts for success messages instead of a static div */}
        {/* {state?.success && state.message && ( <div className="rounded-md bg-green-50 p-4 mb-4"> <p className="text-sm font-medium text-green-800">{state.message}</p> </div> )} */}

        {/* Form Fields for ALL editable properties */}
        {/* Name (Required) */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            defaultValue={client.name}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="name-error"
          />
          {state?.errors?.name && (
            <p id="name-error" className="mt-2 text-sm text-red-600">
              {state.errors.name.join(", ")}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            name="email"
            id="email"
            defaultValue={client.email ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="email-error"
          />
          {state?.errors?.email && (
            <p id="email-error" className="mt-2 text-sm text-red-600">
              {state.errors.email.join(", ")}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            defaultValue={client.phone ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="phone-error"
          />
          {state?.errors?.phone && (
            <p id="phone-error" className="mt-2 text-sm text-red-600">
              {state.errors.phone.join(", ")}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium text-gray-700"
          >
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            id="dateOfBirth"
            defaultValue={formatDateForInput(client.dateOfBirth)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="dateOfBirth-error"
          />
          {state?.errors?.dateOfBirth && (
            <p id="dateOfBirth-error" className="mt-2 text-sm text-red-600">
              {state.errors.dateOfBirth.join(", ")}
            </p>
          )}
        </div>

        {/* Gender (Example using select) */}
        <div>
          <label
            htmlFor="gender"
            className="block text-sm font-medium text-gray-700"
          >
            Gender
          </label>
          <select
            name="gender"
            id="gender"
            defaultValue={client.gender ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="gender-error"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
            {/* Add more options as needed */}
          </select>
          {state?.errors?.gender && (
            <p id="gender-error" className="mt-2 text-sm text-red-600">
              {state.errors.gender.join(", ")}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Address
          </label>
          <textarea
            name="address"
            id="address"
            rows={3}
            defaultValue={client.address ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="address-error"
          ></textarea>
          {state?.errors?.address && (
            <p id="address-error" className="mt-2 text-sm text-red-600">
              {state.errors.address.join(", ")}
            </p>
          )}
        </div>

        {/* Insurance Company */}
        <div>
          <label
            htmlFor="insuranceCompany"
            className="block text-sm font-medium text-gray-700"
          >
            Insurance Company
          </label>
          <input
            type="text"
            name="insuranceCompany"
            id="insuranceCompany"
            defaultValue={client.insuranceCompany ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="insuranceCompany-error"
          />
          {state?.errors?.insuranceCompany && (
            <p
              id="insuranceCompany-error"
              className="mt-2 text-sm text-red-600"
            >
              {state.errors.insuranceCompany.join(", ")}
            </p>
          )}
        </div>

        {/* Chief Complaint */}
        <div>
          <label
            htmlFor="chiefComplaint"
            className="block text-sm font-medium text-gray-700"
          >
            Chief Complaint
          </label>
          <textarea
            name="chiefComplaint"
            id="chiefComplaint"
            rows={3}
            defaultValue={client.chiefComplaint ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="chiefComplaint-error"
          ></textarea>
          {state?.errors?.chiefComplaint && (
            <p id="chiefComplaint-error" className="mt-2 text-sm text-red-600">
              {state.errors.chiefComplaint.join(", ")}
            </p>
          )}
        </div>

        {/* Diagnosis (Example using textarea for comma-separated values) */}
        <div>
          <label
            htmlFor="diagnosis"
            className="block text-sm font-medium text-gray-700"
          >
            Diagnosis (comma-separated)
          </label>
          <textarea
            name="diagnosis"
            id="diagnosis"
            rows={3}
            defaultValue={formatDiagnosisForInput(client.diagnosis)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="diagnosis-error"
          ></textarea>
          {state?.errors?.diagnosis && (
            <p id="diagnosis-error" className="mt-2 text-sm text-red-600">
              {
                /* Zod error for array might be generic, adjust display */ state.errors.diagnosis.join(
                  ", "
                )
              }
            </p>
          )}
        </div>

        {/* Medications */}
        <div>
          <label
            htmlFor="medications"
            className="block text-sm font-medium text-gray-700"
          >
            Medications
          </label>
          <textarea
            name="medications"
            id="medications"
            rows={3}
            defaultValue={client.medications ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="medications-error"
          ></textarea>
          {state?.errors?.medications && (
            <p id="medications-error" className="mt-2 text-sm text-red-600">
              {state.errors.medications.join(", ")}
            </p>
          )}
        </div>

        {/* Treatment Goals */}
        <div>
          <label
            htmlFor="treatmentGoals"
            className="block text-sm font-medium text-gray-700"
          >
            Treatment Goals
          </label>
          <textarea
            name="treatmentGoals"
            id="treatmentGoals"
            rows={3}
            defaultValue={client.treatmentGoals ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="treatmentGoals-error"
          ></textarea>
          {state?.errors?.treatmentGoals && (
            <p id="treatmentGoals-error" className="mt-2 text-sm text-red-600">
              {state.errors.treatmentGoals.join(", ")}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            defaultValue={client.notes ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="notes-error"
          ></textarea>
          {state?.errors?.notes && (
            <p id="notes-error" className="mt-2 text-sm text-red-600">
              {state.errors.notes.join(", ")}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <SubmitButton /> {/* Use the separate button component */}
        </div>
      </form>
    );
  }
}
```
