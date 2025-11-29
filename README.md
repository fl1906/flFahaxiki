# Sidao Chat (思导聊)

An AI-powered conversation and mind mapping productivity tool that seamlessly integrates intelligent dialogues with visual knowledge organization to help users structure and synthesize information efficiently.

## Theme

Sidao Chat embodies the principle of **conversational knowledge synthesis** - transforming linear AI interactions into structured, visual learning experiences. The application bridges the gap between unstructured conversations and organized knowledge representation through intelligent mind mapping that automatically extracts, organizes, and visualizes key concepts from AI interactions.

### Core Philosophy

- **From Conversation to Cognition**: Transform dialogue into discoverable knowledge structures
- **Context Preservation**: Maintain conversational context while extracting actionable insights
- **Visual Learning**: Leverage mind mapping for better comprehension and retention
- **Intelligent Organization**: AI-powered extraction of hierarchical concepts from conversations

## Problem Statement

### The Challenge

In today's AI-driven workflow, users face several critical challenges:

1. **Information Fragmentation**: AI conversations produce valuable insights that get lost in linear chat histories
2. **Knowledge Extraction Difficulty**: Manually organizing conversational insights into structured knowledge is time-consuming
3. **Context Loss**: Important connections between different conversation points are often missed
4. **Review Inefficiency**: Finding specific insights from long conversation histories is challenging
5. **Collaboration Barriers**: Sharing organized conversational insights with teams is difficult

### The Solution

Sidao Chat addresses these challenges by:

- **Automatic Mind Map Generation**: AI-driven extraction of concepts and relationships from conversations
- **Real-time Visualization**: Interactive mind maps that update as conversations progress
- **Bidirectional Navigation**: Seamless transitions between chat messages and mind map nodes
- **Knowledge Persistence**: Persistent storage of structured conversations and their visual representations
- **Multi-Model Flexibility**: Support for various AI models through customizable configurations

## Key Features Implemented

### 🧠 Intelligent Mind Mapping
- **Automatic Generation**: AI-powered extraction of concepts and relationships from conversations
- **Interactive Visualization**: Drag-and-drop interface with zoom and pan capabilities
- **Node Management**: Add, edit, delete, and reorganize mind map nodes
- **Layout Options**: Horizontal and vertical tree layouts with automatic positioning
- **Answer Integration**: Click nodes to reveal and view corresponding AI responses

### 💬 Advanced Conversation System
- **Multi-Model Support**: Integration with various AI providers through configurable endpoints
- **Conversation Branching**: Support for branching conversations from specific messages
- **Message History**: Persistent storage and retrieval of conversation histories
- **Real-time Updates**: Live conversation updates with synchronized mind map changes
- **Regeneration Capability**: Regenerate AI responses using different models

### 🔧 User Experience & Productivity
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Keyboard Shortcuts**: Comprehensive shortcuts for power users (Ctrl+S save, Ctrl+E export, etc.)
- **Dark/Light Themes**: Theme switching with system preference detection
- **Export Functionality**: Export mind maps to various formats (PNG, PDF, JSON)
- **Search & Filter**: Find conversations and messages quickly with advanced search

### 🔐 Authentication & Security
- **JWT-based Authentication**: Secure user sessions with 7-day token expiration
- **Password Security**: bcryptjs hashing for secure password storage
- **User Management**: Complete registration, login, and profile management
- **Session Persistence**: Cookie-based token storage with automatic refresh

### 🛠️ Technical Features
- **Custom AI Model Configuration**: Users can add their own AI endpoints and API keys
- **Conversation Management**: Create, edit, delete, and organize conversations
- **Real-time Sync**: Synchronized state between chat and mind map views
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Performance Optimization**: Efficient data loading with lazy loading and caching

### 🌐 Internationalization
- **Multi-language Support**: Built-in i18n with Chinese and English language support
- **Localized UI**: All interface elements, messages, and documentation translated
- **Dynamic Language Switching**: Change languages without page reload

## Technical Design & Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router                                       │
│  ├── Chat Interface (/chat)                                  │
│  ├── Mind Mapping (/mindmap)                                │
│  ├── Settings & Configuration (/settings)                    │
│  ├── Authentication (/login, /register)                     │
│  └── History Management (/history)                           │
├─────────────────────────────────────────────────────────────┤
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│  ├── /api/auth/* - Authentication endpoints                 │
│  ├── /api/chat - AI conversation handler                    │
│  ├── /api/models - AI model CRUD operations                 │
│  ├── /api/mindmap/* - Mind map generation & retrieval       │
│  ├── /api/conversations - Conversation management           │
│  └── /api/messages - Message handling                       │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic                             │
├─────────────────────────────────────────────────────────────┤
│  ├── JWT Authentication & Session Management                │
│  ├── AI Model Integration (z-ai-web-dev-sdk)               │
│  ├── Mind Map Layout Algorithms                            │
│  ├── Conversation Context Management                        │
│  └── Data Validation & Error Handling                      │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM + SQLite Database                               │
│  ├── Users - Authentication & Profile                      │
│  ├── AIModelConfig - Custom AI configurations               │
│  ├── Conversation - Chat sessions with branching            │
│  ├── ChatMessage - Individual conversation messages         │
│  └── Mindmap - JSON-stored mind map structures              │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

**Technology Stack:**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5 (configured for flexibility)
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **State Management**: React hooks with Zustand for complex state
- **UI Components**: Radix UI primitives with custom styling
- **Internationalization**: next-intl for dynamic language switching

**Component Architecture:**
```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   ├── chat/              # Chat interface
│   ├── mindmap/           # Mind mapping interface
│   ├── settings/          # Configuration pages
│   └── layout.tsx         # Root layout
├── components/             # Reusable React components
│   ├── layout/           # Layout components
│   ├── ui/               # shadcn/ui components
│   └── mindmap/          # Mind map specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── prisma/               # Database schema
└── public/               # Static assets
```

### Database Design

**Core Data Models:**

1. **User**: Authentication and profile management
   - JWT-based authentication with 7-day expiration
   - Profile information and preferences
   - Relationship to AI configurations and conversations

2. **AIModelConfig**: Custom AI model configurations
   - Support for multiple AI providers and endpoints
   - User-specific API keys and model settings
   - Flexible model configuration system

3. **Conversation**: Chat session management
   - Support for conversation branching
   - Integration with mind maps through node linking
   - Parent-child relationships for conversation trees

4. **ChatMessage**: Individual conversation messages
   - Full conversation history with timestamps
   - Support for user and AI message types
   - Linkage to specific mind map nodes

5. **Mindmap**: Visual knowledge representation
   - JSON-based storage of hierarchical node structures
   - Direct linkage to conversations for bidirectional navigation
   - Support for custom layouts and styling

### API Architecture

**RESTful API Design:**
- **Authentication Flow**: JWT token-based authentication with cookie storage
- **Error Handling**: Comprehensive error responses with detailed error codes
- **Request Validation**: Input validation using Zod schemas
- **Response Format**: Consistent JSON response structure with metadata

**Key API Endpoints:**
- `/api/auth/*` - Authentication (login, register, logout)
- `/api/chat` - AI conversation processing with model integration
- `/api/models` - AI model CRUD operations
- `/api/mindmap/*` - Mind map generation and retrieval
- `/api/conversations` - Conversation management with branching support

### Mind Mapping Engine

**Layout Algorithms:**
- **Horizontal Tree Layout**: Traditional left-to-right hierarchical layout
- **Vertical Tree Layout**: Top-to-bottom hierarchical organization
- **Auto-positioning**: Intelligent node spacing and collision avoidance
- **Interactive Positioning**: Manual node adjustment with automatic child repositioning

**Visualization Features:**
- **Dynamic Rendering**: SVG-based connection lines with interactive nodes
- **Zoom & Pan**: Canvas manipulation with mouse and keyboard controls
- **Node Interaction**: Click-to-expand, drag-to-reposition, inline editing
- **Visual Feedback**: Hover effects, selection indicators, and loading states

### AI Integration Architecture

**Multi-Model Support:**
- **Flexible Configuration**: User-defined AI endpoints and models
- **Standardized Interface**: Common API abstraction for different AI providers
- **Error Handling**: Graceful degradation when AI services are unavailable
- **Conversation Context**: Automatic context passing from conversation history

**Response Processing:**
- **Streaming Support**: Real-time response streaming when available
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Response Formatting**: Markdown parsing and syntax highlighting
- **Knowledge Extraction**: AI-powered concept extraction for mind map generation

### Performance Optimization

**Frontend Optimizations:**
- **Code Splitting**: Automatic route-based code splitting with Next.js
- **Lazy Loading**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image component with automatic optimization
- **Caching Strategy**: React Query for server state caching and synchronization

**Backend Optimizations:**
- **Database Query Optimization**: Prisma query optimization with selective loading
- **Response Compression**: Gzip compression for API responses
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Connection Pooling**: Efficient database connection management

### Security Architecture

**Authentication & Authorization:**
- **JWT Security**: Secure token generation and validation
- **Password Security**: bcryptjs hashing with salt rounds
- **Session Management**: Secure cookie handling with httpOnly and secure flags
- **API Security**: Request validation and SQL injection prevention

**Data Protection:**
- **Input Validation**: Comprehensive input sanitization and validation
- **XSS Prevention**: Content Security Policy and input escaping
- **CSRF Protection**: SameSite cookies and CSRF tokens
- **Environment Security**: Environment variable protection for sensitive data

### Deployment Architecture

**Production Deployment:**
- **Docker Support**: Multi-stage Docker builds for production
- **Environment Configuration**: Environment-specific configuration management
- **Database Management**: SQLite with migration and seeding support
- **Monitoring**: Built-in error tracking and performance monitoring

**Development Workflow:**
- **Hot Reloading**: Development server with automatic reloading
- **Database Migrations**: Prisma migration system for schema changes
- **Code Quality**: ESLint and TypeScript configuration
- **Testing**: Jest and React Testing Library integration

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sidao-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Database setup**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3004](http://localhost:3004) to view the application.

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start

# Or build and start in one command
npm run start:prod
```

### Docker Deployment

```bash
# Using Docker Compose (recommended)
npm run docker:compose

# Or manual build and run
npm run docker:build
npm run docker:run
```

### User Registration

1. Visit `/login` page
2. Click "Register new account"
3. Fill in email and password
4. Configure AI models in settings after login

### AI Model Configuration

1. Go to "Settings" page after login
2. Click "Add new model"
3. Fill in model name, API endpoint, and API key
4. Supports OpenAI, Claude, and other AI service providers

> ⚠️ **Security Note**: Please set strong JWT secrets before production deployment!

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with initial data

## Contributing

This is an open-source project focused on advancing AI-powered knowledge management. We welcome contributions that enhance user experience and expand the platform's capabilities.

### Development Guidelines

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Quality

- Follow TypeScript best practices
- Use ESLint configuration for code consistency
- Write meaningful commit messages
- Include tests for new features when possible

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Thanks to all developers and users who have contributed to this project.

---

Built with ❤️ using Next.js, TypeScript, Tailwind CSS, and modern web technologies.