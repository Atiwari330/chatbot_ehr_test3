// components/client-list-page-content.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { type Client as ClientType } from '@/lib/db/schema' // Use capitalized 'Client' type with alias

interface ClientListPageContentProps {
  initialClients: ClientType[] // Use alias 'ClientType'
}

export default function ClientListPageContent({ initialClients }: ClientListPageContentProps) {
  // Simple date formatting (can be enhanced later)
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A'
    // new Date() can handle both string and Date objects
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button asChild>
          <Link href="/clients/new">Add New Client</Link>
        </Button>
      </div>

      <div className="flex-1 border rounded-lg p-4 bg-background overflow-y-auto">
        {initialClients.length === 0 ? (
          <p className="text-muted-foreground text-center">No clients found. Add your first client!</p>
        ) : (
          <ul className="space-y-3">
            {initialClients.map((client) => (
              <li key={client.id} className="border p-3 rounded hover:bg-muted transition-colors">
                <Link href={`/clients/${client.id}`} className="flex justify-between items-center">
                  <span className="font-medium">{client.name}</span>
                  <span className="text-sm text-muted-foreground">
                    DOB: {formatDate(client.dateOfBirth)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
