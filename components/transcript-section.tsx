'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddTranscriptForm from './add-transcript-form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from './ui/button';
import type { Transcript } from '@/lib/db/types';

interface TranscriptSectionProps {
  clientId: string;
  transcripts: Transcript[];
  clientName?: string;
}

export default function TranscriptSection({ clientId, transcripts, clientName }: TranscriptSectionProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Callback function to close the sheet on successful form submission
  const handleFormSuccess = () => {
    setIsSheetOpen(false);
  };

  return (
    <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Session Transcripts</h2>
        
        {/* Add Transcript Button using Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              Add Transcript
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-[550px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Session Transcript</SheetTitle>
              <SheetDescription>
                Enter the session details and transcript content{clientName ? ` for ${clientName}` : ''}. Click 'Add Transcript' when done.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <AddTranscriptForm
                clientId={clientId}
                onFormSuccess={handleFormSuccess}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {transcripts.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {transcripts.map((transcript) => (
            <li key={transcript.id} className="py-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {new Date(transcript.sessionDateTime).toLocaleString()}
                </span>
                <Link
                  href={`/clients/${clientId}/transcripts/${transcript.id}`}
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
  );
}
