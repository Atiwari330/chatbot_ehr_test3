Task: Make Artifact Side-Panel Globally Available
Background
The project already has:

A useArtifact SWR hook that stores the currently “open” artifact in the browser cache.
A full-featured <Artifact /> component (in components/artifact.tsx) that can display / edit artifacts when mounted and artifact.isVisible === true.
The chat page mounts <Artifact />, but other pages (e.g. client-detail) do not, so clicking “Generate SOAP Note” updates the SWR cache but no UI is listening → the panel never appears.
Goal
Mount a lightweight global wrapper for <Artifact /> so the side-panel works on every page without duplicating code.

Deliverables
components/artifact-root.tsx – a minimal client-side wrapper that instantiates <Artifact /> with stubbed props.
Layout update (app/layout.tsx or top-level layout in your routing structure) – import the wrapper and render it once, after {children}.
✅ Manual test instructions (acceptance criteria at bottom).
Implementation Details

1. components/artifact-root.tsx
   tsx

'use client';
import { Artifact } from '@/components/artifact';
import { useState } from 'react';

/\*\*

- Global listener for the SWR `artifact` store.
- Renders nothing when `artifact.isVisible === false`.
- Uses minimal stub helpers because editing is done inside <Artifact> itself.
  \*/
  export default function ArtifactRoot() {
  const noop = () => {};
  const [input, setInput] = useState(''); // satisfy props

return (
<Artifact
chatId="global-artifact" // arbitrary
input={input}
setInput={setInput}
handleSubmit={noop}
status="idle"
stop={noop}
attachments={[]} // no uploads in this context
setAttachments={noop as any}
append={noop}
messages={[]} // artifact panel doesn’t need chat msgs
setMessages={noop as any}
reload={noop}
votes={[]}
isReadonly={true}
selectedVisibilityType="private"
/>
);
}
Explanation
<Artifact /> expects a bunch of chat-related props. For the standalone side-panel we can pass inert functions / empty arrays. All real behaviour (fetching versions, editing content, etc.) is internal to <Artifact />.

2. Update global layout
   Open whichever layout is always rendered (e.g. app/layout.tsx). Example diff:

tsx
CopyInsert
// app/layout.tsx
import './globals.css';
import ArtifactRoot from '@/components/artifact-root'; // NEW

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="en">
<body className="min-h-screen bg-background">
{children}

        {/* Global artifact listener */}
        <ArtifactRoot />          {/* NEW */}
      </body>
    </html>

);
}
No other pages need modification: when any code calls setArtifact({ … isVisible:true }), the wrapper re-renders, <Artifact /> becomes visible and slides in.

3. Acceptance Criteria
   Run pnpm dev.
   Login ➜ navigate to any client ➜ click Generate SOAP Note.
   Toast shows “Generating…”, then “Success”.
   The side-panel slides in from the right, titled SOAP Note – <Client Name>, displaying markdown.
   Close the panel (existing close button). Refresh page; <ArtifactRoot> should remain hidden until a new artifact is opened.
   Confirm the chat page still works (it now has two <Artifact /> instances, but only one will be visible at a time because they share the same SWR store).
   Notes / Future Work
   If you want to avoid two <Artifact /> instances on the chat page, remove its local <Artifact> import – the global one suffices.
   For a lighter UI, consider building a slim SimpleArtifactPanel that only renders markdown, but that’s out of scope here.
