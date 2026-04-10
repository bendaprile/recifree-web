# AGENTS.md

## Components Layer Guidelines

The `src/components/` directory handles our reusable UI elements in Recifree. Adhere to these guidelines when making edits here:

### 1. Build Isolated and Meaningful Components
Avoid massive, tightly coupled component files. If a component starts gathering too much logic or rendering complex nested DOM, break it down:
- Create smaller, state-independent subcomponents wherever possible.
- Favor a shared component architecture over locally defined spaghetti logic.

### 2. Testing Constraints
- Each component **MUST** have a corresponding test file located directly next to it (e.g., `Component.jsx` -> `Component.test.jsx`).
- Tests should cover all expected output behavior and typical mock input variations. Do not consider a component complete until its test suite ensures strong coverage.

### 3. Maintain Refactoring Standards
Whenever you modify an existing component, take a moment to look at the surrounding code. If there are opportunities to simplify logic or reduce over-architecture, **do it**. We aim for simple, readable code bases without unnecessary abstractions.
