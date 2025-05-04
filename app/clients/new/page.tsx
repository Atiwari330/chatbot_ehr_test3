// app/clients/new/page.tsx
'use client'; // Mark as a Client Component because we'll need form state/handling

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/toast'; // Assuming you have a toast component setup
// We will create this action later
// import { addClientAction } from '../actions'; // Assuming actions are in app/clients/actions.ts

export default function AddNewClientPage() {
  const router = useRouter();
  // Basic state for form fields - expand as needed
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // --- Placeholder for Server Action ---
    console.log('Submitting:', { name, dob });
    // Replace with actual server action call:
    // const formData = new FormData(event.currentTarget);
    // const result = await addClientAction(formData);
    // Handle result (success/error toast, redirect)
    // --- End Placeholder ---

    // Simulate submission for now
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({ type: 'success', description: 'Client added successfully (simulated)!' });
    router.push('/clients'); // Redirect back to the client list
    // setIsSubmitting(false); // Re-enable button if staying on page
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Add New Client</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">Client Name</Label>
          <Input
            id="name"
            name="name" // Important for FormData if using server actions directly
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., John Doe"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Date of Birth Field */}
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            name="dob" // Important for FormData
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Add other fields as needed (Gender, Insurance, etc.) */}
        {/* Example:
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Input id="gender" name="gender" placeholder="Optional" disabled={isSubmitting} />
        </div>
        */}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()} // Go back to the previous page
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
