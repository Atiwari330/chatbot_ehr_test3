// components/client-detail-page-content.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns'; // Date formatting utility
import { type Client, type Transcript } from '@/lib/db/types';
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
} from '@/components/ui/sheet';
import AddTranscriptForm from './add-transcript-form';

interface ClientDetailPageContentProps {
  client: Client;
  transcripts: Transcript[];
}

// Helper function to format dates consistently
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    // Handle potential string dates from DB
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
      return format(new Date(date), 'MM/dd/yyyy p'); // Includes time
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

  // Callback function to close the sheet on successful form submission
  const handleFormSuccess = () => {
    setIsSheetOpen(false);
  };
  
  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Client Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-semibold">{client.name}</CardTitle>
          <Button asChild size="sm">
            <Link href={`/clients/${client.id}/edit`}>Edit Client</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
              <p>{formatDate(client.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gender</p>
              <p>{client.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Insurance</p>
              <p>{client.insuranceCompany || 'N/A'}</p>
            </div>
             {/* Add other relevant single fields here if needed */}
          </div>
          <Separator />
           <div>
              <p className="text-sm font-medium text-muted-foreground">Chief Complaint</p>
              <p className="whitespace-pre-wrap">{client.chiefComplaint || 'N/A'}</p>
          </div>
           <Separator />
           <div>
              <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
              <p>
                {client.diagnosis && client.diagnosis.length > 0
                  ? client.diagnosis.join(', ')
                  : 'N/A'}
              </p>
          </div>
           <Separator />
           <div>
              <p className="text-sm font-medium text-muted-foreground">Medications</p>
              <p className="whitespace-pre-wrap">{client.medications || 'N/A'}</p>
          </div>
          <Separator />
           <div>
              <p className="text-sm font-medium text-muted-foreground">Treatment Goals</p>
              <p className="whitespace-pre-wrap">{client.treatmentGoals || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Session Transcripts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Session Transcripts</CardTitle>
          {/* Add Transcript Button using Sheet */}
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
