'use client';

import React, { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { addTranscriptAction } from '@/app/actions/transcriptActions';
import { type AddTranscriptFormState } from '@/app/actions/transcriptTypes';
import { toast } from '@/components/toast';

interface AddTranscriptFormProps {
  clientId: string;
  onFormSuccess: () => void; // Callback to close the Sheet
}

// Submit button component aware of form pending state
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Adding...' : 'Add Transcript'}
    </Button>
  );
}

export default function AddTranscriptForm({ clientId, onFormSuccess }: AddTranscriptFormProps) {
  const initialState: AddTranscriptFormState = { message: null, success: false };
  // useActionState hook manages form state and connects to the server action
  const [state, formAction] = useActionState(addTranscriptAction, initialState);

  // Effect to handle feedback (toasts) and closing the sheet on success
  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        type: 'success',
        description: state.message
      });
      onFormSuccess(); // Trigger the callback to close the Sheet
    } else if (state?.message && !state.success) {
      // Prioritize specific field errors for the toast message
      const errorMsg = state.errors?.sessionDateTime?.[0]
        || state.errors?.content?.[0]
        || state.errors?.authorization?.[0]
        || state.errors?.general?.[0]
        || state.message; // Fallback to general message
      toast({
        type: 'error',
        description: errorMsg
      });
    }
  }, [state, onFormSuccess]); // Depend on state and the callback

  return (
    // The form action is handled by the useActionState hook
    <form action={formAction} className="space-y-4">
      {/* Hidden input to ensure clientId is submitted with the form */}
      <input type="hidden" name="clientId" value={clientId} />

      {/* Session Date and Time Input */}
      <div className="space-y-1">
        <Label htmlFor="sessionDateTime">Session Date & Time</Label>
        <Input
          id="sessionDateTime"
          name="sessionDateTime"
          type="datetime-local" // Standard HTML input for date and time
          required // Basic client-side validation
          className="mt-1"
          aria-describedby="sessionDateTime-error"
          aria-invalid={!!state?.errors?.sessionDateTime}
        />
        {/* Display server-side validation error for this field */}
        {state?.errors?.sessionDateTime && (
          <p id="sessionDateTime-error" className="mt-1 text-sm text-destructive">
            {state.errors.sessionDateTime.join(', ')}
          </p>
        )}
      </div>

      {/* Transcript Content Textarea */}
      <div className="space-y-1">
        <Label htmlFor="content">Transcript Content</Label>
        <Textarea
          id="content"
          name="content"
          required // Basic client-side validation
          rows={15} // Adjust rows as needed
          placeholder="Paste or type the session transcript here..."
          className="mt-1"
          aria-describedby="content-error"
          aria-invalid={!!state?.errors?.content}
        />
        {/* Display server-side validation error for this field */}
        {state?.errors?.content && (
          <p id="content-error" className="mt-1 text-sm text-destructive">
            {state.errors.content.join(', ')}
          </p>
        )}
      </div>

      {/* Display General/Authorization Errors */}
      {state?.errors?.general && (
        <p className="mt-1 text-sm text-destructive">
          {state.errors.general.join(', ')}
        </p>
      )}
      {state?.errors?.authorization && (
        <p className="mt-1 text-sm text-destructive">
          {state.errors.authorization.join(', ')}
        </p>
      )}

      {/* Form Actions */}
      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
