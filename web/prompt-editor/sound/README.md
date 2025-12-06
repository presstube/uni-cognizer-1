# Sound Engine Prompt Editor

A real-time prompt editor for testing and refining the UNI Audio Instrument system.

## Features

✅ **Prompt Management**
- Create, save, load, activate, and delete prompts
- Auto-save last used prompt
- Slug auto-generation from name

✅ **LLM Configuration**
- Provider selection (Gemini, Claude)
- Model selection with up-to-date options
- Temperature, Top P, Top K, Max Tokens
- Quick presets (Deterministic, Balanced, Creative)

✅ **Testing Interface**
- Custom text input
- Random mind moment fetcher
- Real-time generation (~1.8s)
- Comprehensive results display

✅ **Results Visualization**
- AI reasoning prominently displayed
- Audio selections (music, texture, bass preset)
- Parameter bars with scale indicators
- Sample details from CSV (descriptions, properties)
- Validation feedback with scale constraint checking

## Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open the editor:**
   ```
   http://localhost:3001/prompt-editor/sound/
   ```

3. **Test generation:**
   - The default "UNI Audio Instrument v1.0" prompt is pre-loaded
   - Click "🎲 Random Mind Moment" to fetch test text
   - Or enter your own creative paragraph
   - Click "⚡ Generate" to test

## Usage

### Creating a New Prompt

1. Select "+ New Prompt" from the dropdown
2. Enter a name (slug auto-generates)
3. Write your system prompt
4. Adjust LLM settings as needed
5. Click "💾 Save"
6. Click "✓ Set Active" to make it the system default

### Testing a Prompt

1. Load a prompt from the dropdown (or use active)
2. Enter test input or fetch a random mind moment
3. Click "⚡ Generate"
4. Review:
   - AI reasoning (why it made these choices)
   - Audio selections (files and preset)
   - Parameters (with visual bars)
   - Sample details (descriptions and properties)

### LLM Settings

**Provider Options:**
- Gemini (default, fast, proven in testing)
- Anthropic Claude (alternative)

**Models:**
- Gemini 2.0 Flash Exp (recommended, ~1.8s)
- Gemini 2.0 Flash
- Gemini 1.5 Flash/Pro
- Claude Sonnet 4.5
- Claude Sonnet 4 / Opus 4

**Quick Presets:**
- **Deterministic**: Low temperature (0.1), focused outputs
- **Balanced**: Medium temperature (0.7), good default
- **Creative**: High temperature (0.9), more varied outputs

### Understanding Results

**Reasoning Section:**
Shows the AI's thought process in 2-3 sentences explaining:
- Why specific music/texture samples were chosen
- How parameters reflect the emotional/sensory qualities
- Key mood or tonal decisions

**Parameters:**
Each parameter has:
- Visual bar (0-1 scale)
- Numeric value
- Scale indicators show minor/major with ✓/✗ validation

**Sample Details:**
Full information from CSV files:
- Filename and description
- Tone, density, mood
- Scale (music), category (texture)
- Rhythm (music)

## File Structure

```
/web/prompt-editor/sound/
├── index.html           # Main UI (two-pane layout)
├── style.css            # Custom styles
├── editor.js            # State & CRUD operations
├── generator.js         # LLM API wrapper
├── results-display.js   # Render results/reasoning
├── parameter-viz.js     # Parameter visualizations
└── README.md            # This file
```

## API Endpoints

The editor uses these backend endpoints:

```
GET    /api/sound-prompts              # List all prompts
GET    /api/sound-prompts/active       # Get active prompt
GET    /api/sound-prompts/:id          # Get one prompt
POST   /api/sound-prompts              # Create/update
POST   /api/sound-prompts/:id/activate # Set active
DELETE /api/sound-prompts/:id          # Delete
POST   /api/sound-prompts/test         # Test generation
GET    /api/sound-prompts/random-mind-moment  # Random text
GET    /api/sound-prompts/csvs/defaults       # Default CSVs
```

## CSV Files

Default CSV files are stored in the database and loaded from:
- `/assets/sound-samples/music_samples.csv`
- `/assets/sound-samples/texture_samples.csv`

Custom CSV upload functionality is planned for a future release.

## Keyboard Shortcuts

- `Cmd/Ctrl + S`: Save prompt (coming soon)
- `Cmd/Ctrl + Enter`: Generate (coming soon)

## Troubleshooting

**"Failed to load prompts"**
- Check that the server is running
- Verify database migrations have run

**"Generation failed"**
- Check that you have a GEMINI_API_KEY in `.env`
- Verify the prompt text is not empty
- Check network tab for API errors

**Scale validation errors**
- The bass_scale and melody_scale must match the selected music sample's scale
- If music is minor: scales must be 0.00-0.49
- If music is major: scales must be 0.50-1.00

## Development

Built following the Prime Directive:
- Functional, small, focused modules
- Each file under 300 lines
- Shared styles from `editor-base.css`
- Event-driven, stateless client
- Server holds all state

## License

Part of the Cognizer-1 project.
