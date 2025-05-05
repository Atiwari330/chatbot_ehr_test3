# Feature Implementation Plan: SOAP Note Generation (V1 - Revised 2)

## Goal

Implement functionality allowing users to automatically generate a draft SOAP (Subjective, Objective, Assessment, Plan) progress note for a specific client based on their demographic data and recent session transcripts. The generated note should appear in the application's existing artifact panel for review, editing, and saving, leveraging the current `text` artifact infrastructure.

## Core V1 Strategy (Revised based on feedback)

1.  **Trigger:** A user clicks a "Generate SOAP Note" button on the client detail page (`/clients/[clientId]`).
2.  **Action:** The button click triggers a `fetch` call to a new, dedicated API route (`/api/soap-note`).
3.  **API Route (`/api/soap-note`):**
    - Authenticates the user and **verifies ownership** of the `clientId`.
    - Fetches necessary client and transcript data.
    - Calls a new server-side function (`generateSoapNoteContent`) to **synchronously** generate the full SOAP note text using an LLM, including **safeguards for long transcripts**.
    - Saves the generated note as the first version of a new `document` record (using `kind: 'text'`).
    - Returns a **structured JSON response** containing `{ documentId, title, initialContent }` to the frontend. Handles errors by returning `{ error: '...' }`.
4.  **Frontend:**
    - Receives the `documentId`, `title`, and `initialContent` from the API response.
    - Uses the `setArtifact` function (from `useArtifact` hook) to open the artifact panel.
    - Sets the artifact state with the received `documentId`, `title`, `kind: 'text'`, the **`initialContent`**, `status: 'idle'`, and `isVisible: true`. This avoids a flash of empty content.
5.  **Artifact Display:** The existing `Artifact` component displays the `initialContent` immediately using the `text` artifact editor (`components/text-editor.tsx`).
6.  **Editing/Versioning:** All subsequent editing, saving (which creates new versions), and version history viewing are handled by the existing artifact system for `text` documents.
7.  **(Optional but Recommended):** Define the `createSoapNote` AI tool for future use, ensuring its parameters require `clientId` and it uses the correct `dataStream.write` method if/when implemented for streaming. **Do not register** this tool or its handler in V1.

---

## Implementation Steps (Revised 2)

### Step 1: Create the Core Server-Side SOAP Note Generation Logic

This function fetches data, handles transcript length, constructs the prompt, calls the LLM synchronously, and returns the generated text and client name.

1.  **Create Directory:** `artifacts/soap/`
2.  **Create File:** `artifacts/soap/generation.ts`
3.  **Add Code:**

    ```typescript
    // artifacts/soap/generation.ts
    import { streamText } from "ai";
    import { getClientById, getTranscriptsByClientId } from "@/lib/db/queries";
    import { myProvider } from "@/lib/ai/providers";
    import type { Client, Transcript } from "@/lib/db/schema"; // Correct import from schema

    // Define a reasonable character limit for transcripts included in the prompt
    const MAX_PROMPT_TRANSCRIPT_CHARS = 8000; // ~4k tokens, adjust based on model/cost/performance

    /**
     * Generates SOAP note content synchronously.
     * Fetches client/transcript data, handles truncation, calls LLM.
     * @param clientId The ID of the client.
     * @param userId The ID of the user requesting the note (for authorization).
     * @returns Promise<{ fullText: string; clientName: string }>
     * @throws Error if client not found, access denied, or LLM fails.
     */
    async function generateSoapNoteContent(
      clientId: string,
      userId: string
    ): Promise<{ fullText: string; clientName: string }> {
      // 1. Fetch Data (Authorization check included)
      console.log(
        `[generateSoapNoteContent] Fetching client ${clientId} for user ${userId}`
      );
      const client = await getClientById(clientId, userId);
      if (!client) {
        console.error(
          `[generateSoapNoteContent] Client ${clientId} not found or access denied for user ${userId}.`
        );
        throw new Error(
          `Client not found or access denied for ID: ${clientId}`
        );
      }
      console.log(`[generateSoapNoteContent] Found client: ${client.name}`);

      // Fetch last N transcripts (e.g., last 3) - adjust limit as needed
      const transcripts = await getTranscriptsByClientId(clientId);
      const recentTranscripts = transcripts.slice(0, 3); // Example: Limit to last 3
      console.log(
        `[generateSoapNoteContent] Found ${recentTranscripts.length} recent transcripts for client ${clientId}.`
      );

      // 2. Format Data for Prompt & Handle Length
      const clientDemographics = `
    Client Name: ${client.name}
    Date of Birth: ${
        client.dateOfBirth
          ? new Date(client.dateOfBirth).toLocaleDateString()
          : "N/A"
      }
    Gender: ${client.gender}
    Insurance: ${client.insuranceCompany || "N/A"}
    Chief Complaint: ${client.chiefComplaint || "N/A"}
    Diagnosis: ${client.diagnosis?.join(", ") || "N/A"}
    Medications: ${client.medications || "N/A"}
    Treatment Goals: ${client.treatmentGoals || "N/A"}
      `.trim();

      // Combine and truncate transcript content
      let combinedTranscriptContent = recentTranscripts
        .map(
          (t, index) => `
    --- Transcript ${index + 1} (${new Date(
            t.sessionDateTime
          ).toLocaleString()}) ---
    ${t.content}
    --- End Transcript ${index + 1} ---
      `
        )
        .join("\n\n")
        .trim();

      if (combinedTranscriptContent.length > MAX_PROMPT_TRANSCRIPT_CHARS) {
        console.warn(
          `[generateSoapNoteContent] Transcript content for client ${clientId} truncated from ${combinedTranscriptContent.length} to ${MAX_PROMPT_TRANSCRIPT_CHARS} characters.`
        );
        combinedTranscriptContent =
          combinedTranscriptContent.slice(0, MAX_PROMPT_TRANSCRIPT_CHARS) +
          "\n\n... [Content Truncated due to length]";
      }
      if (!combinedTranscriptContent) {
        combinedTranscriptContent =
          "No recent transcripts available or content was empty.";
        console.log(
          `[generateSoapNoteContent] No transcript content available for client ${clientId}.`
        );
      }

      // 3. Construct the Prompt
      const systemPrompt = `
    You are a licensed mental-health clinician generating a progress note in SOAP format (Subjective, Objective, Assessment, Plan) based on the provided client information and session transcripts.
    
    Instructions:
    - Use the provided client demographics and transcript content.
    - Structure the note clearly with headings for Subjective, Objective, Assessment, and Plan (e.g., ## Subjective).
    - Subjective: Summarize the client's reported feelings, concerns, and experiences from the transcripts. Use quotes sparingly and appropriately.
    - Objective: Describe the client's presentation, affect, behavior, and mental status observed during the session(s) as inferred from the transcripts. Note participation and engagement.
    - Assessment: Provide a clinical assessment of the client's progress towards treatment goals, current functioning, and any relevant diagnostic impressions based *only* on the provided information. Synthesize subjective and objective data. Note risk assessment if applicable based on content.
    - Plan: Outline the plan for the next session(s), including interventions, focus areas, client homework (if any), and coordination of care needs.
    - Be concise, professional, and use standard clinical language.
    - Ensure the note is based *only* on the information provided below. Do not invent details.
    - Format the output using Markdown.
    
    CLIENT DEMOGRAPHICS:
    ${clientDemographics}
    
    SESSION TRANSCRIPTS:
    ${combinedTranscriptContent}
    
    Generate the SOAP progress note now.
      `.trim();

      // 4. Call LLM and accumulate text synchronously
      console.log(
        `[generateSoapNoteContent] Calling LLM for client ${clientId}...`
      );
      let accumulatedText = "";
      const { textStream } = await streamText({
        model: myProvider.languageModel("artifact-model"), // Consider a model optimized for longer context/generation if needed
        system: systemPrompt,
        prompt: `Generate a SOAP note for the client ${client.name} based on the provided context.`,
        // Add temperature or other parameters if needed
      });

      // Accumulate the text from the stream
      for await (const delta of textStream) {
        accumulatedText += delta;
      }

      if (!accumulatedText) {
        console.error(
          `[generateSoapNoteContent] LLM failed to generate content for client ${clientId}.`
        );
        throw new Error("LLM failed to generate SOAP note content.");
      }

      console.log(
        `[generateSoapNoteContent] Generated SOAP note content for client ${clientId} (length: ${accumulatedText.length})`
      );
      return { fullText: accumulatedText.trim(), clientName: client.name };
    }

    // Export the core generation function for direct use by the API route
    export { generateSoapNoteContent };
    ```

### Step 2: Create the API Route

This route handles the button click, performs checks, calls the generation logic, saves the result, and returns necessary info to the frontend.

1.  **Create Directory:** `app/api/soap-note/` (or `app/(ehr)/api/soap-note/`)
2.  **Create File:** `app/api/soap-note/route.ts`
3.  **Add Code:**

    ```typescript
    // app/api/soap-note/route.ts
    import { NextResponse } from "next/server";
    import { generateUUID } from "@/lib/utils";
    import { auth } from "@/app/(auth)/auth";
    import { saveDocument, getClientById } from "@/lib/db/queries";
    import { generateSoapNoteContent } from "@/artifacts/soap/generation"; // Import the core logic

    export const dynamic = "force-dynamic"; // Ensures the route is not cached
    export const maxDuration = 90; // Increase timeout for potentially long LLM calls

    export async function POST(req: Request) {
      try {
        const session = await auth();
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        const { clientId } = await req.json();
        if (!clientId || typeof clientId !== "string") {
          return NextResponse.json(
            { error: "Missing or invalid clientId" },
            { status: 400 }
          );
        }

        // **** Explicit Security Check: Verify user owns the client ****
        console.log(
          `[API /api/soap-note] Verifying ownership for client ${clientId}, user ${userId}`
        );
        const clientCheck = await getClientById(clientId, userId);
        if (!clientCheck) {
          console.warn(
            `[API /api/soap-note] User ${userId} attempted action on unauthorized client ${clientId}`
          );
          // Return 404 to avoid confirming existence of the client ID to unauthorized users
          return NextResponse.json(
            { error: "Client not found or access denied." },
            { status: 404 }
          );
        }
        console.log(
          `[API /api/soap-note] Ownership verified for client ${clientId}`
        );
        // ***************************************************************

        console.log(
          `[API /api/soap-note] Generating SOAP note for client: ${clientId}, user: ${userId}`
        );

        // 1. Generate the content synchronously
        const { fullText: soapNoteContent, clientName } =
          await generateSoapNoteContent(clientId, userId);

        // 2. Generate a new document ID
        const documentId = generateUUID();
        const title = `SOAP Note - ${clientName}`; // Use fetched client name

        // 3. Save the generated note as a new document
        await saveDocument({
          id: documentId,
          title: title,
          kind: "text", // Save as a standard text document
          content: soapNoteContent,
          userId: userId,
        });

        console.log(
          `[API /api/soap-note] Saved SOAP note document with ID: ${documentId}`
        );

        // 4. Return ID, title, and initial content to the frontend
        return NextResponse.json({
          documentId: documentId,
          title: title,
          initialContent: soapNoteContent, // Send content back
        });
      } catch (error) {
        console.error(
          "[API /api/soap-note] Error generating or saving SOAP note:",
          error
        );
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate SOAP note.";
        // Return structured JSON error
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
    }
    ```

### Step 3: Update Frontend Button and Logic

Modify the client detail page component.

1.  **Edit File:** `components/client-detail-page-content.tsx`
2.  **Ensure Imports:** Make sure `useState`, `useArtifact`, `toast`, `Button`, `Link`, `nanoid` (or similar for unique IDs) are imported.
    ```typescript
    import React, { useState } from "react"; // Ensure React is imported if not already
    import Link from "next/link";
    import { useArtifact } from "@/hooks/use-artifact";
    import { toast } from "@/components/toast";
    import { Button } from "@/components/ui/button";
    import { nanoid } from "nanoid"; // Example for unique IDs
    // ... other necessary imports ...
    ```
3.  **Add State and Hook:** Inside the `ClientDetailPageContent` component function:
    ```typescript
    export default function ClientDetailPageContent({ client, transcripts }: ClientDetailPageContentProps) {
      // ... existing state (isSheetOpen) ...
      const [isGeneratingSoap, setIsGeneratingSoap] = useState(false); // Loading state
      const { setArtifact } = useArtifact(); // Artifact hook
    ```
4.  **Implement/Update Button Click Handler:**

    ```typescript
    const handleGenerateSoapNote = async () => {
      setIsGeneratingSoap(true);
      const loadingToastId = nanoid(); // Generate unique ID for the toast
      toast({
        type: "success",
        description: "Generating SOAP note, please wait...",
      }); // Use a loading toast

      try {
        const response = await fetch("/api/soap-note", {
          // Ensure path is correct
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id }),
        });

        // Try to parse JSON regardless of status code first for structured errors
        let responseBody;
        try {
          responseBody = await response.json();
        } catch (e) {
          // If JSON parsing fails, fall back to text
          const errorText = await response.text();
          throw new Error(
            errorText || `HTTP error! status: ${response.status}`
          );
        }

        // Check response.ok *after* attempting to parse JSON
        if (!response.ok) {
          // Use the error message from the JSON if available
          throw new Error(
            responseBody.error || `HTTP error! status: ${response.status}`
          );
        }

        const { documentId, title, initialContent } = responseBody;

        if (!documentId || typeof initialContent !== "string" || !title) {
          console.error("Invalid API response:", responseBody);
          throw new Error(
            "Invalid response from API. Missing required fields."
          );
        }

        // Open the artifact panel with the new document ID and initial content
        setArtifact({
          documentId: documentId,
          title: title, // Use title from API response
          kind: "text",
          content: initialContent, // Set initial content directly
          status: "idle", // Generation is complete
          isVisible: true,
          boundingBox: { top: 0, left: 0, width: 0, height: 0 }, // Will be updated by effect
        });

        // Update toast to success
        toast({
          type: "success",
          description: "SOAP note generated successfully!",
        });
      } catch (error) {
        console.error("Failed to generate SOAP note:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        // Update toast to error
        toast({
          type: "error",
          description: `Failed to generate SOAP note: ${errorMessage}`,
        });
      } finally {
        setIsGeneratingSoap(false);
      }
    };
    ```

5.  **Add/Update the Button in JSX:** Ensure the button exists, calls `handleGenerateSoapNote`, and uses the `isGeneratingSoap` state.

    ```tsx
    // components/client-detail-page-content.tsx
    // Example placement in CardHeader:
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-2xl font-semibold">{client.name}</CardTitle>
      <div className="flex space-x-2">
        {" "}
        {/* Wrapper */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSoapNote}
          disabled={isGeneratingSoap} // Disable while generating
          aria-live="polite" // Announce changes for screen readers
        >
          {isGeneratingSoap ? "Generating..." : "Generate SOAP Note"}
        </Button>
        <Button asChild size="sm">
          <Link href={`/clients/${client.id}/edit`}>Edit Client</Link>
        </Button>
      </div>
    </CardHeader>
    ```

### Step 4: (Optional but Recommended) Define AI Tool

Define the tool structure for potential future use via chat/agents. **Do not register it in V1.**

1.  **Create/Edit File:** `lib/ai/tools/createSoapNote.ts`
2.  **Add/Update Code:**

    ```typescript
    // lib/ai/tools/createSoapNote.ts
    import { z } from "zod";
    import { tool, type DataStreamWriter } from "ai";
    import type { Session } from "next-auth";
    import { generateUUID } from "@/lib/utils";
    import { generateSoapNoteContent } from "@/artifacts/soap/generation"; // Import core logic
    import { getClientById, saveDocument } from "@/lib/db/queries"; // Import DB functions

    interface CreateSoapNoteProps {
      session: Session;
      dataStream: DataStreamWriter;
    }

    export const createSoapNote = ({
      session,
      dataStream,
    }: CreateSoapNoteProps) =>
      tool({
        description:
          "Generates a SOAP progress note for a specific client based on their data and recent transcripts. Use this when asked to create a progress note or SOAP note.",
        parameters: z.object({
          clientId: z
            .string()
            .uuid()
            .describe(
              "The UUID of the client for whom to generate the SOAP note."
            ),
        }),
        execute: async ({ clientId }) => {
          const documentId = generateUUID();
          let title = `SOAP Note for ${clientId}`; // Fallback

          if (!session.user?.id) {
            throw new Error("User session not found for createSoapNote tool.");
          }
          const userId = session.user.id;

          // Fetch client name for a better title & verify access
          try {
            const client = await getClientById(clientId, userId); // Auth check
            if (!client) {
              throw new Error("Client not found or access denied.");
            }
            title = `SOAP Note - ${client.name}`;
          } catch (e) {
            console.error(
              `Tool: Could not fetch client name or verify access for SOAP note title: ${e}`
            );
            // Return an error object that the tool framework can handle
            return {
              error: `Failed to verify client access: ${
                e instanceof Error ? e.message : "Unknown error"
              }`,
            };
          }

          // Inform the UI about the artifact being created
          dataStream.write({ type: "kind", content: "text" }); // Use write
          dataStream.write({ type: "id", content: documentId });
          dataStream.write({ type: "title", content: title });
          dataStream.write({ type: "clear", content: "" });

          try {
            // --- V1.5/V2: Streaming Implementation ---
            // Placeholder: Generate sync and manually stream (less efficient for long notes via tool)
            // In a real streaming scenario, you'd integrate with the handler's streaming logic.
            console.log(
              `[createSoapNote Tool] Generating content for ${clientId}`
            );
            const { fullText } = await generateSoapNoteContent(
              clientId,
              userId
            );

            // Save the document generated by the tool
            await saveDocument({
              id: documentId,
              title,
              kind: "text",
              content: fullText,
              userId: userId,
            });
            console.log(`[createSoapNote Tool] Saved document ${documentId}`);

            // Manually stream the result back (adjust chunking as needed)
            const chunkSize = 100;
            for (let i = 0; i < fullText.length; i += chunkSize) {
              const chunk = fullText.substring(i, i + chunkSize);
              dataStream.write({ type: "text-delta", content: chunk }); // Use write
            }
            // --- End Placeholder ---

            dataStream.write({ type: "finish", content: "" }); // Use write
            return {
              documentId: documentId,
              title: title,
              kind: "text",
              message: `SOAP note generation started for ${title}. The document is now visible.`,
            };
          } catch (error) {
            console.error(
              "[createSoapNote Tool] Error during execution:",
              error
            );
            dataStream.write({
              type: "error",
              content: "Failed to generate SOAP note.",
            }); // Use write
            dataStream.write({ type: "finish", content: "" }); // Use write
            return {
              error: `Failed to generate SOAP note: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            };
          }
        },
      });
    ```

### Step 5: Verification Steps (Revised)

1.  **Apply Code Changes:** Implement all code changes outlined above.
2.  **Database:** No schema changes needed. Run `pnpm db:push` or `pnpm db:migrate` if you made unrelated changes.
3.  **Start Server:** `pnpm dev`.
4.  **Navigate:** Go to a client detail page (`/clients/[clientId]`) that has some associated transcripts.
5.  **Button Check:** Verify the "Generate SOAP Note" button exists and is enabled.
6.  **Click Generate:** Click the button.
7.  **Observe Frontend:**
    - Button should show "Generating..." and be disabled.
    - A loading toast should appear ("Generating SOAP note...").
    - After the API call completes (may take 10-60 seconds depending on LLM/content):
      - The artifact panel should open smoothly.
      - The artifact title should be "SOAP Note - \[Client Name]".
      - The **full generated SOAP note content** should appear directly in the text editor.
      - The loading toast should update to a success message ("SOAP note generated successfully!").
      - The button should become enabled again.
8.  **Content Verification:** Read the generated note. Does it follow SOAP format? Does it accurately reflect (truncated, if necessary) client/transcript data? Is the tone professional?
9.  **Editing & Saving:** Make a small edit to the note. Wait ~2 seconds (debounce). Refresh the page or navigate away and back. Verify the edit was saved as a new version (check "Last Updated" time or use version history actions).
10. **Error Handling:**
    - **Unauthorized:** Log out and try to access the API route directly (e.g., via `curl` or Postman) - expect a 401.
    - **Forbidden:** Log in as User B, try to generate a note for a client belonging to User A (using their `clientId` in the API call) - expect a 404/403 error response and toast.
    - **LLM Failure:** Temporarily modify the prompt in `artifacts/soap/generation.ts` to be nonsensical and trigger an LLM error - expect a failure toast on the frontend.
    - **Missing Client:** Call the API with an invalid `clientId` - expect a 404 error response and toast.
11. **(Optional) AI Tool Definition Check:** Review the code in `lib/ai/tools/createSoapNote.ts`. Ensure it compiles and logically requires `clientId`. No runtime test needed for V1 unless you register it.

---
