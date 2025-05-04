"use client";

import { useState, useEffect, useActionState } from "react"; 
import { useFormStatus } from "react-dom";
import {
  updateClientAction,
  ClientFormState,
} from "@/app/actions/clientActions";
import type { Client } from "@/lib/db/schema";

// Extended client interface for form handling that includes optional fields
interface ExtendedClient extends Client {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface ClientEditFormProps {
  client: ExtendedClient; 
}

// Separate SubmitButton component to handle pending state
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
        pending
          ? "bg-indigo-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      }`}
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export default function ClientEditForm({ client }: ClientEditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const initialState: ClientFormState = { message: null, success: false };
  const updateClientWithId = updateClientAction.bind(
    null,
    client.id,
    client.userId
  );
  const [state, formAction] = useActionState(updateClientWithId, initialState);

  useEffect(() => {
    if (state?.success) {
      setIsEditing(false); // Exit edit mode on successful save
      // Optionally show state.message in a toast notification
      console.log(state.message);
    }
    if (state?.errors?.general) {
      // Display general errors (e.g., DB connection issues)
      console.error("Server Action Error:", state.errors.general.join(", "));
      // Show error to user via toast or alert div
    }
  }, [state]);

  const handleCancel = () => {
    setIsEditing(false);
    // Resetting form state is implicitly handled by useFormState and re-render
  };

  // Helper to format date for display and input defaultValue
  const formatDateForInput = (
    date: Date | string | null | undefined
  ): string => {
    if (!date) return "";
    try {
      // Handles both Date objects and date strings
      const d = new Date(date);
      // Format as YYYY-MM-DD for the date input type
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      return ""; // Return empty if date is invalid
    }
  };

  // Format diagnosis array for display/editing
  const formatDiagnosisForDisplay = (
    diag: string[] | null | undefined
  ): string => {
    return diag?.join(", ") || "N/A";
  };
  const formatDiagnosisForInput = (
    diag: string[] | null | undefined
  ): string => {
    return diag?.join(", ") || "";
  };

  if (!isEditing) {
    // --- View Mode ---
    return (
      <div>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {client.name}
          </h2>
          <button
            onClick={() => setIsEditing(true)}
            className="ml-4 inline-flex justify-center py-1 px-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Edit Client
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {/* Display ALL relevant fields */}
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.email || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.phone || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.dateOfBirth
                ? new Date(client.dateOfBirth).toLocaleDateString()
                : "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Gender</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.gender || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.address || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Insurance Company
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.insuranceCompany || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Chief Complaint
            </dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.chiefComplaint || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Diagnosis</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {formatDiagnosisForDisplay(client.diagnosis)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Medications</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.medications || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">
              Treatment Goals
            </dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.treatmentGoals || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Notes</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {client.notes || "N/A"}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(client.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.updatedAt
                ? new Date(client.updatedAt).toLocaleDateString()
                : "N/A"}
            </dd>
          </div>
          {/* Do NOT display userId unless necessary */}
        </dl>
      </div>
    );
  } else {
    // --- Edit Mode ---
    return (
      <form action={formAction} className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Edit Client
        </h2>

        {/* Display general form errors/success */}
        {state?.message && !state.success && state.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            {" "}
            <p className="text-sm font-medium text-red-800">
              {state.errors.general.join(", ")}
            </p>{" "}
          </div>
        )}
        {/* Consider using toasts for success messages instead of a static div */}
        {/* {state?.success && state.message && ( <div className="rounded-md bg-green-50 p-4 mb-4"> <p className="text-sm font-medium text-green-800">{state.message}</p> </div> )} */}

        {/* Form Fields for ALL editable properties */}
        {/* Name (Required) */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            defaultValue={client.name}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="name-error"
          />
          {state?.errors?.name && (
            <p id="name-error" className="mt-2 text-sm text-red-600">
              {state.errors.name.join(", ")}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            name="email"
            id="email"
            defaultValue={client.email ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="email-error"
          />
          {state?.errors?.email && (
            <p id="email-error" className="mt-2 text-sm text-red-600">
              {state.errors.email.join(", ")}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            defaultValue={client.phone ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="phone-error"
          />
          {state?.errors?.phone && (
            <p id="phone-error" className="mt-2 text-sm text-red-600">
              {state.errors.phone.join(", ")}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium text-gray-700"
          >
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            id="dateOfBirth"
            defaultValue={formatDateForInput(client.dateOfBirth)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="dateOfBirth-error"
          />
          {state?.errors?.dateOfBirth && (
            <p id="dateOfBirth-error" className="mt-2 text-sm text-red-600">
              {state.errors.dateOfBirth.join(", ")}
            </p>
          )}
        </div>

        {/* Gender (Example using select) */}
        <div>
          <label
            htmlFor="gender"
            className="block text-sm font-medium text-gray-700"
          >
            Gender
          </label>
          <select
            name="gender"
            id="gender"
            defaultValue={client.gender ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="gender-error"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
            {/* Add more options as needed */}
          </select>
          {state?.errors?.gender && (
            <p id="gender-error" className="mt-2 text-sm text-red-600">
              {state.errors.gender.join(", ")}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Address
          </label>
          <textarea
            name="address"
            id="address"
            rows={3}
            defaultValue={client.address ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="address-error"
          ></textarea>
          {state?.errors?.address && (
            <p id="address-error" className="mt-2 text-sm text-red-600">
              {state.errors.address.join(", ")}
            </p>
          )}
        </div>

        {/* Insurance Company */}
        <div>
          <label
            htmlFor="insuranceCompany"
            className="block text-sm font-medium text-gray-700"
          >
            Insurance Company
          </label>
          <input
            type="text"
            name="insuranceCompany"
            id="insuranceCompany"
            defaultValue={client.insuranceCompany ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="insuranceCompany-error"
          />
          {state?.errors?.insuranceCompany && (
            <p
              id="insuranceCompany-error"
              className="mt-2 text-sm text-red-600"
            >
              {state.errors.insuranceCompany.join(", ")}
            </p>
          )}
        </div>

        {/* Chief Complaint */}
        <div>
          <label
            htmlFor="chiefComplaint"
            className="block text-sm font-medium text-gray-700"
          >
            Chief Complaint
          </label>
          <textarea
            name="chiefComplaint"
            id="chiefComplaint"
            rows={3}
            defaultValue={client.chiefComplaint ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="chiefComplaint-error"
          ></textarea>
          {state?.errors?.chiefComplaint && (
            <p id="chiefComplaint-error" className="mt-2 text-sm text-red-600">
              {state.errors.chiefComplaint.join(", ")}
            </p>
          )}
        </div>

        {/* Diagnosis (Example using textarea for comma-separated values) */}
        <div>
          <label
            htmlFor="diagnosis"
            className="block text-sm font-medium text-gray-700"
          >
            Diagnosis (comma-separated)
          </label>
          <textarea
            name="diagnosis"
            id="diagnosis"
            rows={3}
            defaultValue={formatDiagnosisForInput(client.diagnosis)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="diagnosis-error"
          ></textarea>
          {state?.errors?.diagnosis && (
            <p id="diagnosis-error" className="mt-2 text-sm text-red-600">
              {
                /* Zod error for array might be generic, adjust display */ state.errors.diagnosis.join(
                  ", "
                )
              }
            </p>
          )}
        </div>

        {/* Medications */}
        <div>
          <label
            htmlFor="medications"
            className="block text-sm font-medium text-gray-700"
          >
            Medications
          </label>
          <textarea
            name="medications"
            id="medications"
            rows={3}
            defaultValue={client.medications ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="medications-error"
          ></textarea>
          {state?.errors?.medications && (
            <p id="medications-error" className="mt-2 text-sm text-red-600">
              {state.errors.medications.join(", ")}
            </p>
          )}
        </div>

        {/* Treatment Goals */}
        <div>
          <label
            htmlFor="treatmentGoals"
            className="block text-sm font-medium text-gray-700"
          >
            Treatment Goals
          </label>
          <textarea
            name="treatmentGoals"
            id="treatmentGoals"
            rows={3}
            defaultValue={client.treatmentGoals ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="treatmentGoals-error"
          ></textarea>
          {state?.errors?.treatmentGoals && (
            <p id="treatmentGoals-error" className="mt-2 text-sm text-red-600">
              {state.errors.treatmentGoals.join(", ")}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            defaultValue={client.notes ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            aria-describedby="notes-error"
          ></textarea>
          {state?.errors?.notes && (
            <p id="notes-error" className="mt-2 text-sm text-red-600">
              {state.errors.notes.join(", ")}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <SubmitButton /> {/* Use the separate button component */}
        </div>
      </form>
    );
  }
}
