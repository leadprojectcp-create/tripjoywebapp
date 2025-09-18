# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripJoy is a Next.js 15 travel community web application built with TypeScript, Firebase, and Tailwind CSS. The app supports multi-language internationalization and provides authentication through multiple providers (email, Kakao, Google, Apple).

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run type-check       # Run TypeScript type checking

# Firebase Deployment
npm run deploy           # Deploy to Firebase App Hosting
npm run deploy:preview   # Deploy to preview channel
npm run start:prod       # Start production server with PORT env var
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Storage, Realtime Database)
- **Internationalization**: Custom translation system with JSON files

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/app/auth/` - Authentication pages and services
- `src/app/contexts/` - React contexts (AuthContext, TranslationContext)
- `src/app/hooks/` - Custom React hooks (useAuth, useTranslation)
- `src/app/services/` - Firebase configuration and service layer
- `src/app/components/` - Reusable UI components
- `src/utils/` - Utility functions and helpers
- `src/types/` - TypeScript type definitions
- `public/translations/` - Multi-language JSON translation files

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)

## Firebase Architecture

### Configuration
Firebase is initialized client-side only with lazy loading pattern:
- Environment variables prefixed with `NEXT_PUBLIC_FIREBASE_*`
- Services exported: `auth`, `db`, `storage`, `realtimeDb`
- Helper functions: `getFirebaseAuth()`, `getFirebaseDb()`, etc.

### Authentication Flow
1. **Multi-provider support**: Email, Kakao, Google, Apple
2. **Signup process**:
   - Provider selection → Email input → Terms agreement → User info collection
   - Creates Firebase Auth user + Firestore user document
3. **User data structure**: Stored in Firestore `/users/{uid}` with fields:
   - Basic info: name, email, phoneNumber, birthDate, gender, location
   - Authentication: signupMethod, loginType, consents
   - Features: points, usage_count, likedPosts, bookmarkedPosts, chatIds

### State Management
- **AuthContext**: Manages authentication state across the app
- **TranslationContext**: Handles multi-language support
- **Custom hooks**: `useAuth()`, `useTranslation()`, `useUnreadMessageCount()`

## Development Patterns

### TypeScript Configuration
- Strict mode enabled with target ES2017
- Incremental compilation and isolated modules
- Path mapping for clean imports

### Security & Performance
- Security headers configured in next.config.ts
- Image optimization with WebP/AVIF formats
- CSS optimization and font loading optimization
- Firebase domain allowlisting for images

### Error Handling
- Custom error handler utilities in `src/utils/errorHandler.ts`
- Consistent error logging and user-friendly messages
- Environment-specific error handling

### Styling Conventions
- Tailwind CSS with modular CSS files for complex components
- CSS Modules pattern: `ComponentName.module.css`
- Responsive design with mobile-first approach

## Firebase Deployment

The app is configured for Firebase App Hosting:
- `firebase.json` configures deployment settings
- Build artifacts deployed from root directory
- Environment variables must be set in Firebase project
- Production builds ignore TypeScript/ESLint errors for deployment

## Multi-language Support

Translation system uses JSON files in `public/translations/`:
- Each feature has its own translation file (e.g., `dashboard.json`)
- Supports: Korean (ko), English (en), Vietnamese (vi), Chinese (zh), Japanese (ja), Thai (th), Filipino (fil)
- Context-based translation loading via `useTranslation()` hook

## Key Development Notes

- Firebase services are only initialized client-side to avoid SSR issues
- User authentication state is managed through Firebase Auth + Firestore data
- All sensitive operations use server-side API routes in `/api/auth/`
- Image uploads and media handling through Firebase Storage
- Real-time features use Firebase Realtime Database for chat functionality