# SVG Sigil Quick Reference

## API Endpoints

### Get SVG
```bash
GET /api/sigils/:momentId/svg
Content-Type: image/svg+xml
```

Returns raw SVG that can be:
- Displayed in browser (`<img src="..." />`)
- Downloaded as .svg file
- Imported into design tools
- Styled with CSS

### Get All Formats
```bash
GET /api/sigils/:momentId/all
Content-Type: application/json
```

Returns:
```json
{
  "id": "uuid",
  "cycle": 42,
  "sigilPhrase": "geometric harmony",
  "sigilCode": "ctx.beginPath()...",
  "sigilSVG": "<svg>...</svg>",
  "sdf": null
}
```

---

## Database Queries

### Check SVG Storage
```sql
-- See which moments have SVG
SELECT id, cycle, sigil_phrase, 
       sigil_svg IS NOT NULL as has_svg,
       length(sigil_svg) as svg_size
FROM mind_moments
ORDER BY created_at DESC
LIMIT 20;
```

### Get Recent SVGs
```sql
-- Get the actual SVG data
SELECT id, cycle, sigil_phrase, sigil_svg
FROM mind_moments
WHERE sigil_svg IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## Node.js Usage

### From Database
```javascript
import { getMindMomentSVG } from './src/db/mind-moments.js';

const svg = await getMindMomentSVG(momentId);
// svg is a string: "<svg>...</svg>"
```

### From API
```javascript
const response = await fetch(`/api/sigils/${momentId}/svg`);
const svgText = await response.text();
```

---

## Browser Usage

### Display as Image
```html
<img src="/api/sigils/abc-123-def/svg" 
     alt="Mind moment sigil"
     width="200" 
     height="200" />
```

### Inline SVG (Styleable)
```javascript
fetch('/api/sigils/abc-123-def/svg')
  .then(r => r.text())
  .then(svg => {
    document.getElementById('container').innerHTML = svg;
    
    // Now you can style it with CSS!
    const path = document.querySelector('#container path');
    path.style.stroke = '#00ff88';
    path.style.strokeWidth = '3';
  });
```

### Download Button
```html
<button onclick="downloadSigil('abc-123-def')">
  Download SVG
</button>

<script>
function downloadSigil(momentId) {
  const link = document.createElement('a');
  link.href = `/api/sigils/${momentId}/svg`;
  link.download = `sigil-${momentId}.svg`;
  link.click();
}
</script>
```

---

## Console Output

When a sigil is generated, you'll see:

```
🎨 Generating sigil for: "geometric harmony"
✓ Sigil generated (2341ms)
  Code: 523 chars
  SVG: 245 chars
```

The SVG line confirms SVG generation is working!

---

## Testing

### Manual Test
```bash
# 1. Start server
npm run client:local

# 2. Send some percepts (via UI or API)

# 3. Check console for "SVG: xxx chars"

# 4. Get a moment ID from database
psql $DATABASE_URL -c "SELECT id FROM mind_moments ORDER BY created_at DESC LIMIT 1;"

# 5. Download the SVG
curl http://localhost:3001/api/sigils/{moment-id}/svg > test.svg

# 6. Open in browser or editor
open test.svg
```

### Automated Test
```bash
node test/sigil-conversions.test.js
```

Should show:
```
✅ Test 1: Simple line to SVG - PASSED
✅ Test 2: Multiple lines to SVG - PASSED
✅ Test 3: Arc to SVG - PASSED
✅ Test 4: Bezier curve to SVG - PASSED
✅ Test 5: Quadratic curve to SVG - PASSED
```

---

## Troubleshooting

### SVG not in database?
- Check `DATABASE_ENABLED=true` in .env
- Verify migration ran: `npm run migrate`
- Check console logs for errors

### API returns 404?
- Verify moment ID exists
- Check moment has `sigil_svg IS NOT NULL`
- Ensure server restarted after code changes

### SVG looks wrong?
- Canvas code may have errors (check source)
- Arc conversion is complex (check for full circles)
- View raw SVG to debug path data

---

## Performance

- **Generation:** ~10ms (negligible)
- **Storage:** ~1-2 KB per moment
- **API response:** < 1ms (text/xml)

---

## Future: SDF Generation

Once SDF implementation is ready:

```javascript
// In real-cog.js, uncomment these lines:
// const { svgToSDF } = await import('./sigil/svg-to-sdf.js');
// const sigilSDF = await svgToSDF(sigilSVG, { width: 256, height: 256 });

// Then use SDF endpoints:
GET /api/sigils/:id/sdf      // JSON with base64 data
GET /api/sigils/:id/sdf/raw  // Binary texture data
```

---

**Quick Reference Complete!**

See `docs/svg-implementation-summary.md` for full details.

