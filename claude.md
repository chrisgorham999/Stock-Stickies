# Stock Stickies - Project Context

## Overview
A single-page React application for managing stock-related sticky notes with portfolio tracking, real-time stock data, and cloud sync via Firebase.

## Tech Stack
- **Frontend**: React 18 (via CDN), Babel for JSX transpilation
- **Styling**: Tailwind CSS (via CDN)
- **Backend**: Firebase Firestore (real-time database), Firebase Authentication
- **APIs**: Finnhub (stock quotes), MarketAux (news)
- **Charts**: Chart.js with Data Labels plugin
- **Security**: Firebase App Check with reCAPTCHA v3, AES-GCM encryption for API keys

## File Structure
```
Sticky-Notes/
├── index.html          # Single-file application (all code embedded)
├── claude.md           # This file - project context
├── ENCRYPTION_IMPLEMENTATION.md
└── SECURITY_RECOMMENDATIONS.md
```

## Key Features
1. **Sticky Notes**: Create, edit, delete notes with ticker symbols and share counts
2. **Categories**: Customizable color-coded categories (add, delete, change colors)
3. **Portfolio View**: Pie chart visualization of holdings with real-time prices
   - Updates 3x daily: 9:35 AM (market open), 1:00 PM (midday), 4:05 PM (market close) EST
   - Prices cached locally to minimize API calls
4. **Stock Data**: Live quotes, fundamentals, 52-week range, earnings dates
5. **News Feed**: MarketAux integration for stock news
6. **Watch List**: Track stocks without notes
7. **Dark Mode**: Toggle between light/dark themes
8. **Cloud Sync**: Real-time sync via Firebase with offline support

## Important Code Locations (index.html)

### Constants & Configuration
- **Lines 74-97**: Color constants (`DEFAULT_COLOR_LABELS`, `DEFAULT_COLORS`, `AVAILABLE_COLORS`, `MIN_CATEGORIES`, `MAX_CATEGORIES`)
- **Lines 86-91**: Input validation constants

### State Management
- **Lines 294-340**: All useState declarations
- **Line 311**: `categories` state (dynamic category colors)
- **Lines 312-317**: Category modal states

### Core Functions
- **Lines 535-560**: `handleLogin` - Authentication
- **Lines 569-610**: `syncNow` - Firestore sync
- **Lines 648-650**: `classifyNote` - Assign note to category
- **Lines 652-656**: `deleteNote` - Delete a note
- **Lines 659-716**: Category management functions:
  - `getAvailableColors()` - Colors not in use
  - `getNotesCountForCategory()` - Count notes per category
  - `addCategory()` - Add new category
  - `handleDeleteCategory()` - Delete with reassignment check
  - `confirmDeleteCategory()` - Execute deletion after reassignment
  - `changeCategoryColor()` - Change a category's color

### Auto-Repair Logic
- **Lines 734-746**: Orphaned notes repair (notes with invalid colors)
- **Lines 748-758**: Missing category labels repair

### Data Loading
- **Lines 363-420**: Firestore onSnapshot listener (loads user data)
- **Line 374**: Categories loaded from Firestore with DEFAULT_COLORS fallback

### UI Components
- **Lines 1250-1288**: Login page (dark mode styled)
- **Lines 1273-1513**: Expanded note modal with stock data
- **Lines 1666-1780**: Category management modals (Add Category, Reassign Notes)
- **Lines 1957-2017**: Legend UI with add/delete/color-change buttons
- **Lines 2018-2040**: Unclassified notes section
- **Lines 2041-2100**: Category sections with notes grid
- **Lines 2291-2294**: Fixed footer

## Recent Changes

### Category Management System
Added full CRUD for categories:
- Add new categories (up to 10 max)
- Delete categories (min 1 required)
- Change category colors from Tailwind palette
- Reassignment modal when deleting category with notes
- Auto-repair for orphaned notes and missing labels

### UI Updates
- Login page styled with dark mode (matches main app)
- Logo with SVG icon on login page
- Fixed footer: "Website created by Chris Gorham"

### Data Persistence
- `categories` array saved to Firestore
- Backward compatible - existing users get DEFAULT_COLORS

## Color System
Categories use Tailwind CSS background classes:
```javascript
AVAILABLE_COLORS = [
  'bg-yellow-200', 'bg-yellow-300', 'bg-yellow-400',
  'bg-pink-200', 'bg-pink-300', 'bg-pink-400',
  'bg-blue-200', 'bg-blue-300', 'bg-blue-400',
  'bg-green-200', 'bg-green-300', 'bg-green-400',
  'bg-red-200', 'bg-red-300', 'bg-red-400',
  'bg-orange-200', 'bg-orange-300', 'bg-orange-400',
  'bg-purple-200', 'bg-purple-300', 'bg-purple-400',
  'bg-teal-200', 'bg-teal-300', 'bg-cyan-200'
]
```

## Note Object Structure
```javascript
{
  id: number,           // Unique identifier
  title: string,        // Ticker symbol (1-5 chars, uppercase)
  text: string,         // Note content (up to 10,000 chars)
  color: string,        // Tailwind bg class (e.g., 'bg-yellow-200')
  classified: boolean,  // Whether note has been categorized
  shares?: number       // Optional: shares for portfolio tracking
}
```

## Known Issues & Fixes

### Orphaned Notes
If notes disappear after changing category colors, the auto-repair logic (lines 734-746) will move them to the first category on page refresh.

### Missing Labels
If category labels are blank, the auto-repair logic (lines 748-758) will restore default labels or use "Category" as fallback.

## Testing Checklist
1. Login/logout functionality
2. Create/edit/delete notes
3. Add/delete/recolor categories
4. Category reassignment when deleting with notes
5. Dark mode toggle
6. Portfolio chart updates
7. Stock data fetching
8. Cloud sync (check sync status indicator)
9. Page refresh persistence
