// app/clients/[clientId]/page.tsx
import { auth } from '@/app/(auth)/auth'; // Fix auth import path
import { getClientById, getTranscriptsByClientId } from '@/lib/db/queries';
import { notFound, redirect } from 'next/navigation';
import { type Client } from '@/lib/db/schema'; // Fix import
import type { Transcript } from '@/lib/db/types'; // Import from types
import Link from 'next/link';
import ClientEditForm from './ClientEditForm'; // Import the new ClientEditForm component
import { Metadata } from 'next';

interface ClientDetailPageProps {
  params: {
    clientId: string;
  };
}

// Generate Metadata
export async function generateMetadata({
  params,
}: {
  params: { clientId: string };
}): Promise<Metadata> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { title: 'Client - Authentication Required' };
  }

  try {
    const client = await getClientById(params.clientId, userId);
    if (!client) {
      return { title: 'Client Not Found' };
    }
    return { title: `Client: ${client.name}` };
  } catch (error) {
    console.error('Failed to fetch client for metadata:', error);
    return { title: 'Client Details' };
  }
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

  // Render the client details with edit form and transcripts section
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-6">
        {/* Pass the full client object */}
        <ClientEditForm client={client} />
      </div>

      {/* Transcripts section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Transcripts</h2>
        {transcripts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {transcripts.map((transcript) => (
              <li key={transcript.id} className="py-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(transcript.sessionDateTime).toLocaleString()}
                  </span>
                  <Link 
                    href={`/clients/${params.clientId}/transcripts/${transcript.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {transcript.content.substring(0, 150)}...
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No session transcripts available.</p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6">
        <Link href="/clients" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Clients List
        </Link>
      </div>
    </div>
  );
}
