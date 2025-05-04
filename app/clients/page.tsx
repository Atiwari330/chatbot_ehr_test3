// app/clients/page.tsx (Fallback location)
import { auth } from '@/app/(auth)/auth';
import { getClientsByUserId } from '@/lib/db/queries';
import ClientListPageContent from '@/components/client-list-page-content';
import { redirect } from 'next/navigation';
import { type Client } from '@/lib/db/schema';

export default async function ClientsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Ensure user is logged in
  if (!userId) {
    // Redirect to login page if not authenticated
    redirect('/login?next=/clients');
  }

  let clients: Client[] = [];
  try {
    // Fetch clients specific to the logged-in user
    clients = await getClientsByUserId(userId);
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Handle error appropriately
    // For now, we'll proceed with an empty list
  }

  // Render the page content component with the fetched data
  return <ClientListPageContent initialClients={clients} />;
}
