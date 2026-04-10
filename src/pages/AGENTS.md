# AGENTS.md

## Pages Layer Guidelines

The `src/pages/` directory acts as our view assemblers in Recifree. Here is what you need to remember:

### 1. Assemble, Do Not Create Shared UI Here
Pages should primarily focus on connecting context data to shared UI components. 
- Do **not** build complex, detailed interface pieces entirely within a `Page.jsx`. 
- If you find yourself writing custom buttons, specialized cards, or complex internal states within a page, refactor them into `src/components/` instead.

### 2. Refactoring Post-Implementation
After you implement a feature in a page, stop and review your code. Pages are notorious spots for accumulated spaghetti code. Look for:
- Redundant logic that could be a context generic utility or custom hook.
- Nested JSX that should be extracted into shared layout elements.
Always clean up and simplify before you consider your work "done".

### 3. Verification & Testing
Always provide integration testing for the Page views. You must run `npm run test` locally to ensure no global breakage occurred after modifying a page. 
