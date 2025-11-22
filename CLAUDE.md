# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "思导聊" (Sidao Chat) - an AI conversation and mind mapping productivity tool built with Next.js 15, TypeScript, and Tailwind CSS. The application integrates AI conversations with mind maps to help users structure and organize information efficiently.

## Development Commands

### Core Development
- `npm run dev` - Start development server with nodemon on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run start:prod` - Build and start production server in one command
- `npm run lint` - Run ESLint

### Database Operations
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with initial data

### Docker Operations
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:compose` - Start with Docker Compose

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5 (with noImplicitAny: false)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based with bcryptjs password hashing
- **AI Integration**: z-ai-web-dev-sdk for AI model interactions

### Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints (auth, chat, models, mindmap, conversations)
│   ├── chat/             # Chat interface
│   ├── history/          # Conversation history
│   ├── login/            # Authentication pages
│   ├── mindmap/          # Mind mapping interface
│   ├── settings/         # Settings and configuration
│   └── layout.tsx        # Root layout with error boundary
├── components/            # React components
│   ├── layout/           # Layout components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
├── prisma/               # Database schema and seed data
└── public/               # Static assets
```

### Key Concepts

#### Authentication System
- JWT-based authentication with 7-day expiration
- Cookie-based token storage
- User registration, login, and password management
- Auth middleware protected via `verifyJWT()` function in `src/lib/auth.ts`

#### Database Schema (Prisma)
- **User**: User accounts with profile information
- **AIModelConfig**: Custom AI model configurations per user
- **Conversation**: Chat sessions with support for branching and mindmap integration
- **ChatMessage**: Individual messages within conversations
- **Mindmap**: JSON-stored mind map structures linked to conversations

#### API Routes Structure
- `/api/auth/*`: Authentication endpoints (login, register, logout)
- `/api/chat`: AI conversation handler with model integration
- `/api/models`: AI model CRUD operations
- `/api/mindmap/*`: Mind map generation and retrieval
- `/api/conversations`: Conversation management
- `/api/messages`: Message handling

#### Component System
- Uses shadcn/ui component library with New York style
- Path aliases configured: `@/components`, `@/lib`, `@/hooks`, `@/ui`
- Toast notifications via `sonner`
- Error boundaries for graceful error handling

#### AI Integration
- Custom model configuration system allowing users to add their own AI endpoints
- Integration with `z-ai-web-dev-sdk` for AI model communication
- Support for multiple AI models and providers

### Configuration Files
- **TypeScript**: Configured with `@/*` path mapping to `./src/*`
- **Next.js**: Standalone output for Docker deployment, TypeScript/ESLint build errors ignored
- **Tailwind**: Uses shadcn/ui configuration with CSS variables
- **Prisma**: SQLite provider with environment variable database URL

### Development Notes
- The application uses Chinese language interface (zh-CN)
- Users need to register for a new account - no demo accounts available
- Database is SQLite for development ease
- Supports conversation branching and mind map node linking
- Error boundaries implemented for better user experience

### Key Features Implementation
- Real-time AI conversations with custom model support
- Automatic mind map generation from conversation content
- Conversation history with search and filtering
- Responsive design with mobile-first approach
- Dark/light theme support via next-themes