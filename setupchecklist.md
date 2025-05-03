# Vercel AI Chatbot Local Setup Checklist (Windows 11 / Git Bash / Supabase / OpenAI)

## I. Prerequisites

[x] - **Install Node.js:** Ensure you have Node.js installed (LTS version recommended). Download from [nodejs.org](https://nodejs.org/). Verified: `v22.14.0`
[x] - **Install pnpm:** Install the pnpm package manager globally using npm (which comes with Node.js). In Git Bash: `npm install -g pnpm`. Verified: `10.8.0` (Project specifies 9.12.3, but 10.8.0 should work).
[x] - **Install Git:** Ensure Git is installed. Git Bash itself usually includes Git. Verified: `git version 2.40.1.windows.1`
[x] - **Create Supabase Project:** Go to [supabase.com](https://supabase.com), sign up or log in, and create a new project. (Assuming this is done to get the URI)
[x] - **Get Supabase Database Connection String:**
[x] - In your Supabase project dashboard, navigate to `Project Settings` (Gear icon).
[x] - Go to the `Database` section.
[x] - Under `Connection info` > `Connection string`, copy the URI listed under **Direct connection**. URI: `postgresql://postgres:[YOUR-PASSWORD]@db.grnkpngvyfxuxkgxufpn.supabase.co:5432/postgres` (Remember to use your actual password).
[x] - **Get OpenAI API Key:** Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys), sign up or log in, and create a new API key. Copy the key.
[ ] - **(Optional) Set up Redis:** Get connection URL if needed for resumable streams. (Skipped for now)
[x] - **(Optional) Set up Vercel Blob:** Get `BLOB_READ_WRITE_TOKEN` if needed for file uploads.

## II. Code Setup

[ ] - **Clone the Repository:** Open Git Bash, navigate to where you want to store the project, and run: `git clone <repository_url> vercel-ai-chatbot` (Replace `<repository_url>` with the actual Git URL).
[ ] - **Navigate into Project Directory:** `cd vercel-ai-chatbot`
[ ] - **Install Dependencies:** Run `pnpm install`

## III. Environment Configuration

[x] - **Create Environment File:** Copy the example environment file. In Git Bash: `cp .env.example .env.local`
[x] - **Edit `.env.local`:** Open the newly created `.env.local` file in a text editor and set the following values:
[x] - **`AUTH_SECRET`**: Generate a strong secret using `openssl rand -base64 32` in Git Bash or use [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32). Paste the generated value.
[x] - **`POSTGRES_URL`**: Paste the Supabase Database Connection String: `postgresql://postgres:iamaKing6699@db.grnkpngvyfxuxkgxufpn.supabase.co:5432/postgres` (Ensure password is correct).
[x] - **`OPENAI_API_KEY`**: Add this line and paste your OpenAI API key: `OPENAI_API_KEY=sk-xxxxxxxxxx`
[x] - **(Optional) `BLOB_READ_WRITE_TOKEN`**: If you set up Vercel Blob, paste your token here. Otherwise, you can leave it blank or comment it out (`# BLOB_READ_WRITE_TOKEN=...`) if you don't need local file uploads via Vercel Blob.
[ ] - **(Optional) `REDIS_URL`**: If you set up Redis, paste its connection URL here. Otherwise, leave blank or comment out. Resumable streams will be disabled without it. (Skipped for now)
[x] - **Remove/Comment `XAI_API_KEY`**: Delete the `XAI_API_KEY` line or comment it out (e.g., `# XAI_API_KEY=...`) as it's no longer needed.

## IV. Switch LLM to OpenAI

[x] - **Install OpenAI SDK Package:** In Git Bash, run: `pnpm add @ai-sdk/openai`
[x] - **Modify Provider Configuration:**
[x] - Open the file `lib/ai/providers.ts`.
[x] - Add the import: `import { openai } from '@ai-sdk/openai';`
[x] - Find the `customProvider` block (the one _not_ guarded by `isTestEnvironment`).
[x] - Replace the `xai(...)` calls within `languageModels` with `openai(...)` calls, specifying the OpenAI models you want to use (e.g., `openai('gpt-4o')`, `openai('gpt-4-turbo')`). Example snippet to replace the existing `languageModels` block:
typescript
      languageModels: {
        'chat-model': openai('gpt-4o'), // Or your preferred chat model
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4-turbo'), // Or your preferred reasoning model
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-3.5-turbo'), // Or your preferred title model
        'artifact-model': openai('gpt-4-turbo'), // Or your preferred artifact model
      },
      // Decide on image model - remove if not needed, or configure OpenAI DALL-E
      // imageModels: {
      //  'small-model': openai.image('dall-e-3'),
      // },
[x] - **(Optional) Configure Image Model:** If you need image generation and want to use DALL-E, uncomment or add the `imageModels` section as shown above. If not, remove the `imageModels` section entirely. (Commented out for now)
[x] - Save the `lib/ai/providers.ts` file.

## V. Database Setup

[ ] - **Run Database Migrations:** Ensure your Supabase project is ready and the `POSTGRES_URL` in `.env.local` is correct. In Git Bash, run: `pnpm db:migrate`. This will create the required tables in your Supabase database.

## VI. Run the Application

[ ] - **Start the Development Server:** In Git Bash, run: `pnpm dev`
[ ] - **Access the Application:** Open your web browser and go to `http://localhost:3000`.

## VII. Post-Setup Notes

- If you modify `.env.local` or `lib/ai/providers.ts` while the development server is running, you'll need to **stop** (Ctrl+C) and **restart** (`pnpm dev`) the server for the changes to take effect.
- The first time you run the app, it should automatically handle authentication (likely creating a guest session or redirecting to login/register if configured).
- If you skipped Redis setup, resumable streams in the chat API (`app/(chat)/api/chat/route.ts`) will be disabled. The chat should still function, but might not recover gracefully from interruptions during streaming.
- If you skipped Vercel Blob setup, the file upload feature (`app/(chat)/api/files/upload/route.ts`) will not work correctly without modification.
