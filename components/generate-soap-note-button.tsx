'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { useArtifact } from '@/hooks/use-artifact';

interface GenerateSoapNoteButtonProps {
  clientId: string;
  clientName: string;
}

export default function GenerateSoapNoteButton({ clientId, clientName }: GenerateSoapNoteButtonProps) {
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const { setArtifact } = useArtifact();

  const handleGenerateSoapNote = async () => {
    setIsGeneratingSoap(true);
    const loadingToastId = nanoid(); // Generate unique ID for the toast
    toast({
      type: 'success',
      description: 'Generating SOAP note, please wait...',
    }); // Use a loading toast

    try {
      const response = await fetch('/api/soap-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
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

      if (!documentId || typeof initialContent !== 'string' || !title) {
        console.error('Invalid API response:', responseBody);
        throw new Error(
          'Invalid response from API. Missing required fields.'
        );
      }

      // Open the artifact panel with the new document ID and initial content
      setArtifact({
        documentId: documentId,
        title: title, // Use title from API response
        kind: 'text',
        content: initialContent, // Set initial content directly
        status: 'idle', // Generation is complete
        isVisible: true,
        boundingBox: { top: 0, left: 0, width: 0, height: 0 }, // Will be updated by effect
      });

      // Update toast to success
      toast({
        type: 'success',
        description: 'SOAP note generated successfully!',
      });
    } catch (error) {
      console.error('Failed to generate SOAP note:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      // Update toast to error
      toast({
        type: 'error',
        description: `Failed to generate SOAP note: ${errorMessage}`,
      });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerateSoapNote}
      disabled={isGeneratingSoap} // Disable while generating
      aria-live="polite" // Announce changes for screen readers
    >
      {isGeneratingSoap ? "Generating..." : "Generate SOAP Note"}
    </Button>
  );
}
