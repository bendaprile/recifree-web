# 📡 Services Layer `src/services`

## Purpose
This directory handles all data-access abstraction, external API calls, and database operations. It acts as the "middleman" between the raw data source (like Firestore) and our React UI.

## Core Directives for Agents

1. **No Component-Level Firebase Queries**: React components should **never** import `firebase/firestore` directly. All read/write queries and document mappings must live here and export as clean async functions.
2. **Embrace Graceful Degradation**: Recifree must work offline and during outages. Whenever implementing a database query, ensure your `catch` block returns a sensible fallback (such as static JSON data) rather than breaking the application.
3. **Handle Schema Oddities Internally**: If the database requires clunky workarounds (e.g., Firestore's inability to store raw arrays-of-arrays, meaning we must stringify `stepIngredients`), that formatting/parsing logic must be completely trapped inside the service layer mapping functions. The UI must only ever receive clean, standard Recifree schema objects.
4. **Test The Edge Cases**: When modifying services, make sure `*.test.js` covers both the "happy path" (API success) and the "sad path" (API failure/fallback logic).
