// app/clients/[clientId]/page.tsx
import { auth } from '@/app/(auth)/auth';
import { getClientById, getTranscriptsByClientId } from '@/lib/db/queries';
import ClientDetailPageContent from '@/components/client-detail-page-content'; // Make sure this path is correct
import { redirect, notFound } from 'next/navigation';
import { type Client, type Transcript } from '@/lib/db/schema';

interface ClientDetailPageProps {
  params: {
    clientId: string;
  };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/login?next=/clients/${params.clientId}`);
  }

  let client: Client | undefined;
  let transcripts: Transcript[] = [];

  try {
    // Fetch the specific client, ensuring it belongs to the logged-in user
    client = await getClientById(params.clientId, userId);

    // If client doesn't exist or doesn't belong to the user, show 404
    if (!client) {
      notFound();
    }

    // Fetch transcripts for this client (user access implicitly checked above)
    transcripts = await getTranscriptsByClientId(params.clientId);

  } catch (error) {
    console.error("Error fetching client details or transcripts:", error);
    // Optional: Render an error component or message
    // For now, we rely on notFound() if the client fetch fails
    // If transcript fetch fails, we'll show an empty list
    if (!client) notFound(); // Ensure notFound is called if client fetch failed in catch
  }

  // If client fetch succeeded but somehow client is still undefined (shouldn't happen with notFound)
  if (!client) {
     notFound();
  }

  // Render the client detail page content
  return <ClientDetailPageContent client={client} transcripts={transcripts} />;
}
