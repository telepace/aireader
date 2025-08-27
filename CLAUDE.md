# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a React-based LLM prompt testing tool built with TypeScript and Material-UI. It allows users to test and optimize prompts using various AI models via OpenRouter API.

## Architecture

### Core Components
- **React + TypeScript**: Frontend framework with type safety
- **Material-UI**: Component library for consistent styling
- **OpenRouter API**: Unified API for accessing multiple AI models
- **Local Storage**: Persistent storage for tests and conversations
- **Responsive Design**: Adapts to desktop and mobile screens

### Key Features
- **Prompt Testing**: Test prompts with different AI models
- **Test Management**: Save, load, and manage prompt tests
- **Real-time Chat**: Interactive chat with AI assistants
- **JSONL Export**: Export saved tests in JSONL format
- **Dark/Light Mode**: Theme switching support
- **Responsive Layout**: Collapsible sidebars for mobile

### Project Structure
```
src/
├── components/          # React components
│   ├── Layout/         # AppHeader, TabPanel
│   ├── ChatPanel.tsx   # Real-time chat interface
│   ├── InputPanel.tsx  # Prompt input components
│   ├── OutputPanel.tsx # Results display
│   ├── SavedTests.tsx  # Test management
│   └── NextStepChat.tsx # Advanced chat features
├── hooks/              # Custom React hooks
│   ├── usePromptTest.ts    # Test state management
│   ├── useUIState.ts       # UI state persistence
│   └── useModelSelection.ts # Model selection logic
├── services/           # API and external services
│   └── api.ts          # OpenRouter API integration
├── utils/              # Utility functions
│   └── storage.ts      # Local storage helpers
├── types/              # TypeScript type definitions
└── services/           # API layer
```

## Development Commands

### Setup
```bash
# Install dependencies
npm install
# or
pnpm install

# Configure API key
cp .env.example .env
# Edit .env with your REACT_APP_OPENROUTER_API_KEY
```

### Development
```bash
# Start development server
npm start
# Runs on http://localhost:3000

# Build for production
npm run build

# Run unit tests
npm test

# Run E2E tests
npx playwright test

# Run E2E tests in headed mode
npx playwright test --headed

# Run specific E2E test
npx playwright test e2e/app.spec.ts --headed
```

### Testing
- **Unit Tests**: Jest + React Testing Library (src/**/*.test.tsx)
- **E2E Tests**: Playwright (e2e/*.spec.ts)
- **Test Coverage**: Configured for 80% unit and 70% integration

## API Integration

### OpenRouter API
- **Base URL**: `https://openrouter.ai/api/v1`
- **Models**: Configurable via dropdown, supports OpenAI o3/o4-mini
- **Authentication**: REACT_APP_OPENROUTER_API_KEY in .env
- **Features**: Streaming responses, chat completions, error handling

### Key API Functions
- `generateContent()`: Single prompt generation
- `generateContentStream()`: Streaming generation
- `generateChat()`: Chat-based generation
- `generateChatStream()`: Streaming chat responses

## Data Management

### Storage Keys
- `prompt_tests`: Saved prompt tests
- `nextstep_conversations`: Chat conversations
- `promptTester_*`: UI state persistence

### Export/Import
- JSON format for conversations
- JSONL format for batch testing
- Local storage with graceful error handling

## Configuration

### Environment Variables
```bash
REACT_APP_OPENROUTER_API_KEY=your_api_key_here
```

### Available Models
- OpenAI o3
- OpenAI o4-mini
- Extensible via model selection dropdown

## Key Files to Know
- **App.tsx**: Main application component with tab navigation
- **api.ts**: All API interactions with OpenRouter
- **usePromptTest.ts**: Core prompt testing state management
- **storage.ts**: Local storage utilities for persistence
- **types.ts**: Shared TypeScript interfaces

# Quality Assurance Protocol

## CRITICAL REQUIREMENT - Pre-Delivery Validation
**EVERY task completion must ensure**:

### 1. Compilation & Build Verification
```bash
# Must pass without errors
npm run build
```

### 2. Test Suite Validation  
```bash
# All tests must pass
npm test
```

### 3. Functional Testing
- Manually verify new features work in browser
- Ensure no existing functionality breaks
- Test edge cases and error scenarios

### 4. Code Quality Checks
- TypeScript compilation without errors
- No console errors in browser
- Clean ESLint output (warnings acceptable)

## Git Operations Protocol
**Only after successful validation**:
- Use `git add`, `git commit` for version control
- Use `gh` commands for GitHub operations
- Include meaningful commit messages
- Ensure clean working directory

## Development Guidelines
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files unless explicitly requested