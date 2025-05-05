// artifacts/soap/generation.ts
import { streamText } from "ai";
import { getClientById, getTranscriptsByClientId } from "@/lib/db/queries";
import { myProvider } from "@/lib/ai/providers";
import type { Client } from "@/lib/db/schema"; // Correct schema import
import type { Transcript } from "@/lib/db/types"; // Import Transcript from types

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
