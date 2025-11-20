# Visual Percept Database Integration Plan

**Goal**: Enable saving, loading, and managing "Active" profiles for the Visual Percept Prompt Editor, bringing it in line with the Personality and Sigil editors.

## 1. Database Schema

Create a new migration file `src/db/migrations/004_visual_prompts.sql` to introduce the `visual_prompts` table.

```sql
CREATE TABLE visual_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX idx_visual_prompts_active 
  ON visual_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX idx_visual_prompts_updated 
  ON visual_prompts (updated_at DESC);
```

## 2. Backend Implementation

### 2.1 Database Accessor
Create `src/db/visual-prompts.js` to handle CRUD operations.
- `getAllVisualPrompts()`
- `getVisualPromptById(id)`
- `getActiveVisualPrompt()`
- `createVisualPrompt(data)`
- `updateVisualPrompt(id, data)`
- `activateVisualPrompt(id)`: Handles transaction to set `active=true` while setting others to `false`.
- `deleteVisualPrompt(id)`

### 2.2 API Routes
Create `src/api/visual-prompts.js` to expose endpoints.
- `GET /` : List all prompts
- `GET /active` : Get the currently active prompt
- `GET /:id` : Get specific prompt
- `POST /` : Create or Update (based on presence of ID)
- `POST /:id/activate` : Set as active
- `DELETE /:id` : Delete prompt

### 2.3 Server Integration
Update `server.js`:
- Import `visualPromptsAPI`
- Mount routes under `/api/visual-prompts`
- Apply `editorAuth` middleware (consistent with other editors)

## 3. Frontend Implementation

Update `prompt-editor/visual-percept/editor.js`.

### 3.1 State Management
Add new fields to the state object:
- `prompts`: Array of available prompts
- `currentPromptId`: ID of currently loaded prompt (null for new)
- `currentPromptSlug`: Slug for current prompt

### 3.2 Initialization Logic (LSO + Database)
Refactor `init()` to follow this precedence:
1.  **Local Storage**: Check `visual_percept_last_id` in LSO.
2.  **Fetch ID**: If LSO has an ID, try to fetch it from DB.
3.  **Fallback Active**: If LSO fails or is empty, fetch `/api/visual-prompts/active`.
4.  **Fallback Default**: If no active prompt, load default hardcoded values (as "New Prompt").

### 3.3 UI Integration
- **Load Prompt Dropdown**: Populate from `GET /api/visual-prompts`.
- **Save Button**: Call `POST /api/visual-prompts`. Update state with new ID on success.
- **Activate Button**: Call `POST /api/visual-prompts/:id/activate`.
- **Delete Button**: Call `DELETE /api/visual-prompts/:id`.
- **Slug Generation**: Auto-generate slug from name (reusing logic from Sigil editor).

## 4. Verification

1.  **Migration**: Run `npm run migrate` and check table creation.
2.  **API**: Test endpoints with curl/Postman.
3.  **UI Save**: Create a new prompt "Test V1", save it, reload page. It should autoload.
4.  **UI Activate**: Set "Test V1" as active. Clear LSO. Reload. It should autoload "Test V1".
5.  **Switching**: Switch between saved prompts and verify fields update.

