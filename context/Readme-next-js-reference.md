# GeniusTalks

GeniusTalks is a revolutionary multilingual platform meticulously crafted to serve as an all-in-one solution for startups and mid-size companies. While rooted in the essence of "organization" in Arabic, GeniusTalks serves as a virtual sanctuary for seamless integration of notes, documents, tasks, and collaborative projects. Beyond basic organization, GeniusTalks offers comprehensive business management features including Finance Management for tracking company incomes, outcomes, and salary management, as well as an advanced HR Module that streamlines employee documentation, contract generation, and leave management. Powered by cutting-edge AI technology, GeniusTalks enables employees to interact naturally through prompts to generate necessary documents, request leaves, or initiate salary increase discussions. Whether you're managing a growing startup or a mid-size company, GeniusTalks is your comprehensive solution for streamlined operations, enhanced productivity, and intelligent business management in a truly global digital experience.

## 🚀 Getting Started

### 📋 Prerequisites

- Node.js and npm installed
- Next.js installed globally or locally in your project

### ⏬ Installation

1. **Clone the repository:**
   ```sh
   // Use ssh secure than https
   git clone git@gitlab.com:notionksa/notionksaweb.git
   ```
2. **Install dependencies:**
   ```sh
   cd notionksaweb
   npm install
   ```

## 🖥️ Usage

how to use the project, including any important commands or configurations.

## ✨ Features

- A central dashboard for team and company ops
- Documents management using WYSIWYG editor with AI-powered autocompletion
- Project Management board
- Finance Management System
  - Income and outcome tracking
  - Salary management
  - Payroll generation
  - Financial reporting
  - AI-powered invoice scanning and creation
- HR Module
  - Automated document generation (NDA, Contracts)
  - Leave management
  - Employee self-service through AI prompts
  - Alerts for contract expirations and trial period endings :alarm_clock:
- AI-enhanced for speed and accuracy
- Multilingual Support
  - English version
  - Arabic version
  - French Version
- Dark Light mode
- More features coming soon

## 🎯 Role Management

Nazem implements a comprehensive role-based access control system with five distinct user roles:

### Role Hierarchy

1. **Admin** - Full system access
2. **Owner** - Full business access
3. **HR** - HR and limited finance access
4. **Accountant** - Finance-focused access
5. **Member** - Basic access

For detailed role permissions and implementation details, see [Role Management Documentation](./docs/roles/README.md).

## 🛠️ Technologies Used

- **Next.js**: A powerful React framework for building server-rendered applications with features like automatic routing, server-side rendering, and API routes.
- **TypeScript**: A strongly typed programming language that builds on JavaScript, providing better tooling and catching errors at compile time.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom user interfaces with a mobile-first approach.
- **shadcn/ui**: A collection of re-usable components built with Radix UI and Tailwind CSS, providing accessible and customizable UI components.
- **Prisma**: A next-generation ORM that makes database access easy with an auto-generated and type-safe query builder.
- **Zustand**: A small, fast and scalable state management solution with a minimal API and no boilerplate.
- **Jotai**: A primitive and flexible state management for React with a focus on atomic state management.
- **OpenAI**: Integration with OpenAI's API for AI-powered features and natural language processing.
- **Zod**: A TypeScript-first schema validation library with static type inference, ensuring type safety and runtime validation.
- **React Hook Form**: A performant, flexible and extensible form library with easy-to-use validation, handling complex forms with minimal re-renders.

## 📁 Folder Structure

```
.
├── .next/                          # Next.js build artifacts
├── .vscode/                        # VSCode editor configuration files
├── node_modules/                   # Installed dependencies from npm
├── prisma/                         # Prisma ORM configuration files
├── public/                         # Static assets like images, fonts, etc.
├── src/                            # Main source code folder
│   ├── app/                        # Next.js application pages and routes
│   │   ├── [locale]/               # Locale-specific routes for i18n
│   │   ├── auth/                   # Authentication components
│   │   ├── api/                    # API routes Controllers for backend actions
│   │   ├── layout.tsx              # Main application layout
│   │   ├── page.tsx                # Entry point of the Next.js app
│   │   ├── components/             # Reusable UI components
│   │   ├── hooks/                  # Custom React hooks for business Logic
│   │   │   ├── document/           # Document management hooks
│   │   │   ├── finance/            # Finance hooks for handling finances
│   │   │   ├── management/         # Management and global space-related hooks
│   │   ├── lib/                    # Utility libraries and helper functions
│   │   │   ├── data/               # Data utilities
│   │   │   ├── helpers/            # Helper functions for common tasks
│   │   │   ├── types/              # TypeScript type definitions
│   │   │   │   ├── comments.types.ts   # Comment types for handling comments
│   │   │   │   ├── document.types.ts   # Types related to document structure
│   │   │   │   ├── finance.types.ts    # Finance types
│   │   │   ├── validators/         # Validation schemas (using Zod)
│   │   │   │   ├── arabic/           # Arabic language validation rules
│   │   ├── providers/              # Context providers for global states
│   │   │   ├── modal-provider.tsx    # Modal management provider
│   │   ├── repositories/           # Data access layer for interacting with APIs
│   │   │   ├── document/           # Document repositories for CRUD ops
│   │   │   ├── finance/            # Finance repositories for project handling
│   │   │   ├── management/         # Management repositories (e.g., global space)
│   │   ├── services/               # Backend services
│   │   │   ├── aws/                # AWS services (e.g., S3, Lambda)
│   │   │   ├── firebase/           # Firebase services (auth, Firestore)
│   │   │   ├── email/              # Email services
│   │   │   ├── openai/             # OpenAI integration for AI-based functionality
│   │   │   ├── httpClient/         # Frontend HTTP client services for API interactions
│   │   │   ├── httpServer/         # Backend HTTP server services containing business logic
│   │   ├── store/                  # State management using Zustand and Jotai
│   │   │   ├── jotai/              # Jotai-based state stores
│   │   │   ├── zustand/            # Zustand-based state stores
│   │   ├── styles/                 # Global styles (SCSS, i18n-related styles)
│   └── README.md                   # Project readme file
├── docs/                           # Documentation folder
│   ├── roles/                      # Role-specific documentation
│   │   ├── README.md              # Detailed role management documentation
│   │   ├── permissions.md         # Detailed permissions matrix
│   │   └── role-diagrams/         # Role-related diagrams
│   ├── architecture/              # Architecture documentation
│   ├── api/                       # API documentation
│   └── guides/                    # User and developer guides
```

## 🏗️ Architecture Overview

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│           Next.js 14 Application (Arabic & English)            │
│               Custom Tiptap WYSIWYG Editor                      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    API & Services Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  • Firebase Authentication    • Firebase Cloud Functions       │
│  • Custom API Endpoints       • Firebase Cloud Messaging       │
│  • OCR Processing Pipeline    • Document Generation Service     │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Data & Storage Layer                        │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│  MongoDB    │ Firestore   │   AWS S3    │   Email Services    │
│ (Primary    │ (Real-time  │ (File       │   (NodeMailer)      │
│  Database)  │   Sync)     │  Storage)   │                     │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
```

### 🔄 Frontend Flow

```

                                 ┌───────────┐
                                 │  Store    │
                                 └───────────┘
                                       ▲
                                       │
                                       │
┌─────────┐     ┌───────────┐     ┌───────────┐       ┌──────────────┐
│  Page   │────▶│Component  │────▶│   Hook    │────▶│  httpClient  │
└─────────┘     └───────────┘     └───────────┘       └──────────────┘
     │               │                  │                      │
     │               │                  │                      │
     ▼               ▼                  ▼                      ▼
┌─────────┐     ┌───────────┐     ┌─────────────────┐     ┌──────────────┐
│  UI     │     │  UI Logic │     │ Business Logic  │     │  API Calls   │
└─────────┘     └───────────┘     └─────────────────┘     └──────────────┘
```

Hook Responsibilities:
├── Business Logic
├── Store Management
├── API Integration
└── Data Transformation

### 🔄 Backend Flow

```┌─────────────┐ ┌─────────────┐       ┌─────────────┐
   │   Route     │────▶  │  Service    │ ────▶│ Repository  │
   └─────────────┘       └─────────────┘       └─────────────┘
         │                       │                      │
         │                       │                      │
         ▼                       ▼                      ▼
   ┌─────────────┐        ┌──────────────┐         ┌─────────────┐
   │Request/Resp │        │Business Logic│         │DB Operations│
   └─────────────┘        └──────────────┘         └─────────────┘
```

### 📝 Data Flow Description

#### 🎨 Frontend

1. **Page**: Entry point that renders components
2. **Component**: UI elements and presentation logic
3. **Hook**: Contains all business logic and state management
4. **httpClient**: Handles API communication with the backend

#### ⚙️ Backend

1. **Route**: Next.js API routes that handle requests/responses and basic validation
2. **Service**: Contains all business logic and data processing
3. **Repository**: Manages database operations and data access

## 📝 Coding Conventions

### 🎨 Frontend Guidelines

- Use custom hooks for business logic to keep components clean and minimal
- Components should focus on presentation and UI logic
- Extract reusable logic into custom hooks
- Keep components small and focused on a single responsibility

### ⚙️ Backend Guidelines

- Use services for business logic implementation
- Keep controllers minimal and focused on request/response handling
- Controllers should only handle routing and basic request validation
- Complex business logic should be moved to dedicated services

### 📚 Documentation

- Every hook, service, component, and page must be documented
- Use JSDoc comments for functions and components
- Include:
  - Purpose and functionality
  - Parameters and return types
  - Usage examples
  - Dependencies and side effects

### 💬 Commit Message Convention

Follow this structure for commit messages:

- `Feat: Feature description` - For new features
- `Refact: Extract reusable logic into custom hook` - For code refactoring
- `Style: Update style for some components` - For styling changes
- `Fix: Bug fix description` - For bug fixes
- `Docs: Update documentation` - For documentation changes
- `Chore: Update dependencies` - For maintenance tasks
- `CI: Integrate automated testing into continuous integration pipeline` - For CI/CD related changes
- `Test: Add unit tests for user authentication` - For test-related changes
- `Perf: Optimize database queries for faster user retrieval` - For performance improvements
- `Build: Update build process to include new dependencies` - For build system changes
- `Revert: Revert previous commit that caused issues` - For reverting changes

### Branch Naming Conventions

Follow this structure for branch names:

- `feat/branch-name` or `feature/branch-name` - For new features
- `fix/branch-name` or `bugfix/branch-name` - For bug fixes
- `hot/branch-name` or `hotfix/branch-name` - For urgent fixes
- `ref/branch-name` or `refactor/branch-name` - For code refactoring
- `doc/branch-name` or `docs/branch-name` - For documentation changes
- `test/branch-name` - For test-related changes
- `chore/branch-name` - For maintenance tasks
- `rel/version` or `release/version` - For release branches
- `ci/branch-name` - For CI/CD related changes

### 🎯 Code Style

- Use Prettier for code formatting
- Use descriptive variable and function names
- Follow TypeScript best practices
- Keep files focused and maintainable

## 🎯 Testing Strategy

Unit tests are focused on:

- Hooks (frontend business logic)
- Services (backend business logic)
