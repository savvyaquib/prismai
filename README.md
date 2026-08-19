# Prismai - AI Companion SaaS

Prismai is a state-of-the-art SaaS platform engineered to revolutionize teaching and learning through interactive AI companions. Leveraging advanced real-time voice and text conversational AI, Prismai delivers highly personalized educational experiences across diverse subjects. The platform is robustly built for scale and performance, utilizing a modern tech stack including Next.js 16, React 19, Clerk, Supabase, and Vapi AI.

## Features

- **Interactive AI Companions**: Voice/Text conversational AI powered by [Vapi AI](https://vapi.ai/).
- **Companion Library**: Browse, search, and filter lessons/companions by subject and topic.
- **Authentication**: Secure user authentication and session management handled by [Clerk](https://clerk.com/).
- **Database & Storage**: Robust backend using [Supabase](https://supabase.com/).
- **User Journeys & Subscriptions**: Track user sessions and manage access to premium content.
- **Modern UI**: Styled with [Tailwind CSS v4](https://tailwindcss.com/) and [Shadcn UI](https://ui.shadcn.com/).
- **Error Tracking**: Monitored with [Sentry](https://sentry.io/).

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Auth**: [Clerk](https://clerk.com/)
- **Database**: [Supabase](https://supabase.com/)
- **AI Voice/Speech**: [Vapi AI](https://vapi.ai/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI + Lucide Icons)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Getting Started

### Prerequisites

Ensure you have Node.js installed on your machine. We recommend using `npm`, `yarn`, or `pnpm` as your package manager.

### Installation

1. Clone the repository and navigate to the project directory:

   ```bash
   git clone https://github.com/savvyaquib/prismai.git
   ```

2. Install the dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables. Create a `.env.local` file in the root directory and add the following keys (fill in with your actual keys):

   ```env
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   # Vapi AI
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=

   # Sentry (Optional for local dev)
   SENTRY_AUTH_TOKEN=
   ```

4. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application running.

## Project Structure

- `/app`: Next.js App Router containing pages, layouts, and API routes.
  - `/(protected)`: Protected routes requiring authentication (Companions, Subscriptions, Journey).
  - `/api`: Backend API endpoints.
  - `/sign-in`, `/sign-up`: Clerk authentication pages.
- `/components`: Reusable React components (UI elements, Forms, Cards, Navbar).
- `/lib`: Utility functions and Server Actions.
- `/constants`: Application-wide constant data and configurations.
- `/types`: TypeScript type definitions.
- `/public`: Static assets like icons and images.

## Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code issues.
