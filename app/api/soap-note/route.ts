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
