# AGENTS.md

## Context Providers Guidelines

The `src/context/` directory deals with our application-wide state. 

### 1. Avoid Global Over-Architecture
Do not throw everything into context. Only truly global data (like themes or generic persistent data lists, e.g., shopping lists) belongs here. Local component state should stay local. Attempt to keep our state flow extremely straightforward to avoid spaghetti data bindings.

### 2. Mandatory Test Coverage
Context files have the greatest potential to break the application silently. 
- You must create or update test files (e.g. `ThemeContext.test.jsx`) when touching these files. 
- When building new context functions, add robust unit tests. Run `npm run test` constantly when updating context providers to ensure downstream usage remains secure and bug-free.
