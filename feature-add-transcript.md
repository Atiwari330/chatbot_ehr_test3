Goal: Implement a feature allowing users to add session transcripts directly from the client detail page (/clients/[clientId]) using a Sheet component for the input form.

Core Technologies: Next.js (App Router), React, Server Actions, Zod, Drizzle ORM, shadcn/ui (Sheet, Button, Input, Textarea, Label), TypeScript.

Assumptions:

User authentication via next-auth (auth() helper).

Database schema (lib/db/schema.ts) and queries (lib/db/queries.ts - addTranscript, getClientById) are correct.

shadcn/ui components are installed and available.

toast component is available for user feedback.

Revised Implementation Plan: feature-add-transcript-v2.md

Phase 1: Backend - Server Action & Validation

Ensure Server Action File Exists:

Verify or create the file: app/actions/transcriptActions.ts.

Ensure the "use server"; directive is at the top.

Define Zod Schema for Server-Side Validation:

This schema remains crucial for data integrity and security on the server.

File: app/actions/transcriptActions.ts

Code:

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

Implement addTranscriptAction Server Action:

Handles form submission logic, server-side validation, security checks (user ownership), database insertion, and cache revalidation.

File: app/actions/transcriptActions.ts

Code:

"use server";

import { z } from "zod";
import { auth } from "@/app/(auth)/auth"; // Adjust path if needed
import { addTranscript, getClientById } from "@/lib/db/queries"; // Adjust path if needed
import { revalidatePath } from "next/cache";
import { TranscriptSchema, type AddTranscriptFormState } from './transcriptActions'; // Assuming schema is in the same file

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
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Phase 2: Frontend - Form Component & Sheet Integration

Create/Update the Add Transcript Form Component:

This component renders the form fields and uses useActionState for handling submission and feedback.

Includes basic client-side required attributes for immediate feedback.

File: components/add-transcript-form.tsx

Code:

// components/add-transcript-form.tsx
'use client';

import React, { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { addTranscriptAction, type AddTranscriptFormState } from '@/app/actions/transcriptActions'; // Adjust path
import { toast } from '@/components/toast';

interface AddTranscriptFormProps {
clientId: string;
onFormSuccess: () => void; // Callback to close the Sheet
}

// Submit button component aware of form pending state
function SubmitButton() {
const { pending } = useFormStatus();
return (
<Button type="submit" disabled={pending} aria-disabled={pending}>
{pending ? 'Adding...' : 'Add Transcript'}
</Button>
);
}

export default function AddTranscriptForm({ clientId, onFormSuccess }: AddTranscriptFormProps) {
const initialState: AddTranscriptFormState = { message: null, success: false };
// useActionState hook manages form state and connects to the server action
const [state, formAction] = useActionState(addTranscriptAction, initialState);

// Effect to handle feedback (toasts) and closing the sheet on success
useEffect(() => {
if (state?.success && state.message) {
toast({ type: 'success', description: state.message });
onFormSuccess(); // Trigger the callback to close the Sheet
} else if (state?.message && !state.success) {
// Prioritize specific field errors for the toast message
const errorMsg = state.errors?.sessionDateTime?.[0]
|| state.errors?.content?.[0]
|| state.errors?.authorization?.[0]
|| state.errors?.general?.[0]
|| state.message; // Fallback to general message
toast({ type: 'error', description: errorMsg });
}
}, [state, onFormSuccess]); // Depend on state and the callback

return (
// The form action is handled by the useActionState hook
<form action={formAction} className="space-y-4">
{/_ Hidden input to ensure clientId is submitted with the form _/}
<input type="hidden" name="clientId" value={clientId} />

      {/* Session Date and Time Input */}
      <div className="space-y-1">
        <Label htmlFor="sessionDateTime">Session Date & Time</Label>
        <Input
          id="sessionDateTime"
          name="sessionDateTime"
          type="datetime-local" // Standard HTML input for date and time
          required // Basic client-side validation
          className="mt-1"
          aria-describedby="sessionDateTime-error"
          aria-invalid={!!state?.errors?.sessionDateTime}
        />
        {/* Display server-side validation error for this field */}
        {state?.errors?.sessionDateTime && (
          <p id="sessionDateTime-error" className="mt-1 text-sm text-red-600">
            {state.errors.sessionDateTime.join(', ')}
          </p>
        )}
      </div>

      {/* Transcript Content Textarea */}
      <div className="space-y-1">
        <Label htmlFor="content">Transcript Content</Label>
        <Textarea
          id="content"
          name="content"
          required // Basic client-side validation
          rows={15} // Adjust rows as needed
          placeholder="Paste or type the session transcript here..."
          className="mt-1"
          aria-describedby="content-error"
          aria-invalid={!!state?.errors?.content}
        />
        {/* Display server-side validation error for this field */}
         {state?.errors?.content && (
          <p id="content-error" className="mt-1 text-sm text-red-600">
            {state.errors.content.join(', ')}
          </p>
        )}
      </div>

      {/* Display General/Authorization Errors */}
       {state?.errors?.general && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.general.join(', ')}
          </p>
        )}
       {state?.errors?.authorization && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.authorization.join(', ')}
          </p>
        )}

      {/* Form Actions */}
      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>

);
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Integrate Form into Client Detail Page using Sheet:

Modify ClientDetailPageContent to include a SheetTrigger (the "Add Transcript" button) and a SheetContent containing the AddTranscriptForm.

Manage the open/closed state of the Sheet using useState.

Pass the clientId and the onFormSuccess callback to the form.

File: components/client-detail-page-content.tsx

Code Modifications:

// components/client-detail-page-content.tsx
'use client';

import React, { useState } from 'react'; // Import useState
import Link from 'next/link';
import { format } from 'date-fns';
import { type Client, type Transcript } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
Sheet,
SheetContent,
SheetDescription,
SheetHeader,
SheetTitle,
SheetTrigger,
// SheetClose, // Keep commented unless needed
} from '@/components/ui/sheet'; // Import Sheet components
import AddTranscriptForm from './add-transcript-form'; // Import the form

interface ClientDetailPageContentProps {
client: Client;
transcripts: Transcript[];
}

// Helper function to format dates consistently
const formatDate = (date: string | Date | null | undefined): string => {
if (!date) return 'N/A';
try {
return format(new Date(date), 'MM/dd/yyyy');
} catch (error) {
console.error('Error formatting date:', error);
return 'Invalid Date';
}
};

// Helper function to format date-times consistently
const formatDateTime = (date: string | Date | null | undefined): string => {
if (!date) return 'N/A';
try {
// Format includes date and time (e.g., 10/26/2024 1:30 PM)
return format(new Date(date), 'MM/dd/yyyy p');
} catch (error) {
console.error('Error formatting date-time:', error);
return 'Invalid Date/Time';
}
};

export default function ClientDetailPageContent({
client,
transcripts,
}: ClientDetailPageContentProps) {
// State to control the visibility of the Sheet component
const [isSheetOpen, setIsSheetOpen] = useState(false);

// Callback function passed to the form, triggered on successful submission
const handleFormSuccess = () => {
setIsSheetOpen(false); // Close the sheet
// The page will automatically show the new transcript on next render
// because the server action called revalidatePath.
};

return (
<div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
{/_ Client Details Card (Structure remains, content might be in ClientEditForm now) _/}
<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-2xl font-semibold">{client.name}</CardTitle>
{/_ Link to edit client page - Assuming ClientEditForm is now on a separate page or handled differently _/}
<Button asChild size="sm">
{/_ Adjust this link if ClientEditForm is integrated differently now _/}
<Link href={`/clients/${client.id}/edit`}>Edit Client</Link>
</Button>
</CardHeader>
<CardContent className="space-y-4">
{/_ Display client details here _/}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div><p className="text-sm font-medium text-muted-foreground">Date of Birth</p><p>{formatDate(client.dateOfBirth)}</p></div>
<div><p className="text-sm font-medium text-muted-foreground">Gender</p><p>{client.gender || 'N/A'}</p></div>
<div><p className="text-sm font-medium text-muted-foreground">Insurance</p><p>{client.insuranceCompany || 'N/A'}</p></div>
</div>
<Separator />
<div><p className="text-sm font-medium text-muted-foreground">Chief Complaint</p><p className="whitespace-pre-wrap">{client.chiefComplaint || 'N/A'}</p></div>
<Separator />
<div><p className="text-sm font-medium text-muted-foreground">Diagnosis</p><p>{client.diagnosis?.join(', ') || 'N/A'}</p></div>
<Separator />
<div><p className="text-sm font-medium text-muted-foreground">Medications</p><p className="whitespace-pre-wrap">{client.medications || 'N/A'}</p></div>
<Separator />
<div><p className="text-sm font-medium text-muted-foreground">Treatment Goals</p><p className="whitespace-pre-wrap">{client.treatmentGoals || 'N/A'}</p></div>
</CardContent>
</Card>

      {/* Session Transcripts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Session Transcripts</CardTitle>
          {/* --- Add Transcript Button using Sheet --- */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              {/* This button opens the Sheet */}
              <Button variant="outline" size="sm">Add Transcript</Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[550px] overflow-y-auto"> {/* Adjust width and add scroll */}
              <SheetHeader>
                <SheetTitle>Add New Session Transcript</SheetTitle>
                <SheetDescription>
                  Enter the session details and transcript content for {client.name}. Click 'Add Transcript' when done.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                {/* Render the form inside the Sheet */}
                <AddTranscriptForm
                  clientId={client.id}
                  onFormSuccess={handleFormSuccess} // Pass the callback here
                />
              </div>
            </SheetContent>
          </Sheet>
          {/* --- End Add Transcript Button --- */}
        </CardHeader>
        <CardContent>
          {transcripts.length === 0 ? (
            <p className="text-muted-foreground">No session transcripts found for this client.</p>
          ) : (
            <ul className="space-y-3">
              {transcripts.map((transcript) => (
                <li
                  key={transcript.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 mb-2 sm:mb-0 mr-4">
                     <p className="text-sm font-medium">
                        Session: {formatDateTime(transcript.sessionDateTime)}
                     </p>
                     <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {transcript.content}
                     </p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/clients/${client.id}/chat/${transcript.id}`}>
                      Generate Progress Note
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {/* Future Enhancement: Add pagination controls here if transcript list becomes long */}
        </CardContent>
      </Card>
    </div>

);
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Verify Client Detail Page (app/clients/[clientId]/page.tsx)

Confirm this page still correctly fetches client and transcripts and passes them to ClientDetailPageContent. No changes are expected here based on the plan.

Phase 3: Testing & Refinement

Testing:

Happy Path: Add a transcript with valid data. Verify success toast, sheet closes, and the new transcript appears in the list (may require a manual browser refresh initially if revalidatePath takes a moment or if testing locally without full caching).

Validation Errors:

Submit with empty date/time. Verify required field error (client-side first, then server-side if bypassed).

Submit with empty content. Verify required field error.

Submit with an invalid date/time format string (if possible to bypass datetime-local). Verify server-side error.

Duplicate Entry: Add a transcript, then try adding another with the exact same client ID and session date/time. Verify the specific unique constraint error message from the server action.

Authorization: (Harder to test manually without specific tools) Attempt to add a transcript for a client belonging to another user. The server action should prevent this and return an authorization error.

UI: Test opening and closing the Sheet. Test responsiveness.

Refinement:

Review the styling of AddTranscriptForm within the SheetContent. Adjust padding, margins, and component sizes as needed for good presentation.

Consider the user experience of the datetime-local input across different browsers.

Performance Note: Acknowledge that for clients with a very large number of transcripts, fetching all of them (getTranscriptsByClientId) might become slow. Future improvements could involve pagination for the transcript list on the ClientDetailPageContent component. This is out of scope for the current feature but worth noting.
