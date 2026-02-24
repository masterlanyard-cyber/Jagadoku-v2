# Jagadoku Mobile - Design Specification (LOCKED)
**Status:** 🔒 LOCKED - DO NOT MODIFY UI WITHOUT EXPLICIT APPROVAL
**Last Updated:** February 24, 2026
**Version:** 1.0.0

## ⚠️ IMPORTANT NOTICE
This design specification is LOCKED. Any changes to UI components, colors, spacing, or visual elements must be explicitly approved. When implementing new features, maintain these exact specifications.

---

## Color System

### Light Mode (Default)
```css
Background: #f8f9fc (Soft blue-gray)
Foreground Text: #0f172a (Dark slate)
Card Surface: #ffffff (White)
Muted Surface: #f3f4f8
Border Subtle: #e0e2ea
Text Muted: #64748b
```

### Dark Mode
```css
Background: #0b1220 (Deep blue-black)
Foreground Text: #f3f4f6 (Light gray)
Card Surface: #111827 (Dark gray)
Muted Surface: #1f2937
Border Subtle: #374151
Text Muted: #d1d5db
```

### Accent Colors
- **Primary Indigo:** #6366f1 (Buttons, active states, FAB)
- **Success Green:** #16a34a (Income, positive indicators)
- **Danger Red:** #dc2626 (Expenses, warnings)
- **Warning Amber:** #d97706 (Budget alerts)
- **Info Blue:** #2563eb (Information panels)

---

## Typography

### Font Family
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

### Text Colors (Light Mode)
- **Heading (gray-900):** #0f172a
- **Body (gray-700):** #334155
- **Muted (gray-600):** #475569
- **Secondary (gray-500):** #64748b
- **Tertiary (gray-400):** #94a3b8

### Text Colors on Colored Backgrounds
- **Green panels:** Text uses #166534 (dark green) for contrast
- **Red panels:** Text uses #991b1b (dark red) for contrast
- **Blue panels:** Text uses #1e40af (dark blue) for contrast
- **Amber panels:** Text uses #b45309 (dark amber) for contrast

---

## Component Specifications

### Cards & Panels
```css
Background: #ffffff (light) / #111827 (dark)
Border: 1px solid #e0e2ea (light) / #374151 (dark)
Border Radius: 1rem (16px) for rounded-2xl
Shadow (light mode): 0 1px 3px rgba(0, 0, 0, 0.08)
Shadow (dark mode): none
Padding: 1rem (16px) standard
```

### Gradient Panels

#### Budget Summary (Indigo-Purple)
```css
Light Mode: from-indigo-600 (#4f46e5) to-purple-600 (#9333ea)
Dark Mode: Same gradient
Text: White (#ffffff)
Secondary Text: #e0e7ff (indigo-100)
```

#### Investment Summary (Blue)
```css
Light Mode: from-blue-500 (#3b82f6) to-blue-600 (#2563eb)
Dark Mode: from-blue-700 to-blue-800
Text: White (#ffffff)
Muted Text: opacity-90
```

### Buttons

#### Primary Button (Indigo)
```css
Background: #6366f1
Hover: #4f46e5
Text: White
Border Radius: 0.5rem (8px)
Padding: 0.5rem 0.75rem
Font Weight: 600 (semibold)
Transition: all 0.2s ease
```

#### Floating Action Button (FAB)
```css
Size: 56px (w-14 h-14)
Background: #6366f1 (indigo-600)
Hover: #4f46e5 (indigo-700)
Text: White
Border Radius: 50% (rounded-full)
Shadow: shadow-lg with indigo-500/40
Position: Fixed bottom navigation, center slot (position 3)
Active Scale: 0.95
Margin Top: -24px (-mt-6)
```

### Input Fields
```css
Background (light): #ffffff
Background (dark): #0f172a
Border: #e0e2ea (light) / #374151 (dark)
Border Radius: 0.5rem (8px)
Padding: 0.5rem 0.75rem
Shadow (light): inset 0 1px 2px rgba(0, 0, 0, 0.05)
Focus Border: #6366f1 (indigo-600)
Focus Shadow: 0 0 0 3px rgba(99, 102, 241, 0.1)
Placeholder: #94a3b8 (light) / #9ca3af (dark)
```

### Colored Status Panels

#### Green Panel (Income/Success)
```css
Light Mode:
  - bg-green-50: #f0fdf4
  - bg-green-100: #dcfce7
  - bg-green-900: #f0fdf4 (converted to light)
  - text-green-600/700/800: #16a34a, #15803d, #166534
  - border-green-100: #bbf7d0

Dark Mode:
  - bg-green-900: dark green variants
  - text-green-300/400: light green variants
```

#### Red Panel (Expense/Danger)
```css
Light Mode:
  - bg-red-50: #fef2f2
  - bg-red-100: #fee2e2
  - bg-red-900: #fef2f2 (converted to light)
  - text-red-600/700/800: #dc2626, #b91c1c, #991b1b
  - border-red-100: #fecaca

Dark Mode:
  - bg-red-900: dark red variants
  - text-red-300/400: light red variants
```

#### Blue Panel (Information)
```css
Light Mode:
  - bg-blue-50: #eff6ff
  - bg-blue-100: #dbeafe
  - bg-blue-900: #eff6ff (converted to light)
  - text-blue-600/800/900: #2563eb, #1e40af, #1e3a8a
  - border-blue-100: #bfdbfe

Dark Mode:
  - bg-blue-900/950: very dark blue
  - text-blue-200/300: light blue variants
```

#### Amber Panel (Warning)
```css
Light Mode:
  - bg-amber-100: #fef3c7
  - bg-amber-900: #fffbeb (converted to light)
  - text-amber-600/700: #d97706, #b45309
  - border-amber-100: #fde68a

Dark Mode:
  - bg-amber-900/950: very dark amber
  - text-amber-300/400: light amber variants
```

---

## Navigation

### Bottom Navigation Bar
```css
Position: Fixed bottom
Background: White (light) / #111827 (dark)
Border Top: 1px solid #e0e2ea (light) / #374151 (dark)
Height: Auto (padding-based)
Grid: 5 columns (equal width)
Shadow: Custom gradient fade
```

### Navigation Items Order (LEFT to RIGHT)
1. **Dashboard** (Beranda) - Home icon
2. **Transactions** (Transaksi) - List icon
3. **FAB Button** (Tambah) - Plus icon (CENTER)
4. **Budget** (Anggaran) - Calculator icon
5. **Investasi** (Investasi) - Chart icon

### Active State
```css
Background: #eef2ff (indigo-50) in light mode
Background: #312e81 (indigo-900) in dark mode
Text Color: #6366f1 (indigo-600) in light mode
Text Color: #a5b4fc (indigo-300) in dark mode
Border Radius: 0.75rem (12px)
```

### Inactive State
```css
Text Color: #6b7280 (gray-500) in light mode
Text Color: #9ca3af (gray-400) in dark mode
Background: Transparent
```

---

## Layout & Spacing

### Container Padding
- Standard padding: `p-4` (1rem / 16px)
- Card gaps: `gap-3` (0.75rem / 12px)
- Section spacing: `space-y-4` (1rem / 16px between sections)

### Grid System
```css
2-column grid: grid-cols-2 gap-3
List items: space-y-3
Form fields: space-y-4
```

---

## Modal Specifications

### Transaction/Investment Modal
```css
Background: White (light) / #111827 (dark)
Border: 1px solid #e5e7eb (light) / #374151 (dark)
Border Radius: 1rem (16px)
Max Width: 24rem (384px)
Padding: 1.25rem (20px)
Backdrop: rgba(0, 0, 0, 0.5) with backdrop-blur-sm
```

### Toggle Buttons (Transaction Type)
```css
Active:
  - Background: #6366f1 (indigo-600)
  - Text: White

Inactive:
  - Background: #f3f4f8 (gray-100) in light
  - Background: #374151 (gray-700) in dark
  - Text: Inherit
```

---

## Progress Bars & Indicators

### Budget Progress Bar
```css
Height: 0.75rem (12px)
Background: rgba(0, 0, 0, 0.2) on gradient
Border Radius: 9999px (full)
Colors:
  - Green (< 80%): #10b981
  - Amber (80-99%): #f59e0b
  - Red (≥ 100%): #ef4444
Transition: all 0.5s ease
```

### Investment Allocation Bar
```css
Height: 1.5rem (24px)
Background: #e5e7eb (light) / #374151 (dark)
Border Radius: 9999px (full)
Text: White, centered
Font Size: 0.75rem (12px)
Font Weight: 600 (semibold)
```

---

## Icons & Graphics

### Icon Size Standards
- Small icons: `w-4 h-4` (16px)
- Medium icons: `w-5 h-5` (20px)
- Large icons: `w-6 h-6` (24px)
- Navigation icons: `w-6 h-6` (24px)
- FAB icon: `w-6 h-6` (24px)

### Icon Colors
```css
Light Mode:
  - Primary: #6b7280 (gray-500)
  - Active: #6366f1 (indigo-600)
  - On colored backgrounds: Inherit from context

Dark Mode:
  - Primary: #9ca3af (gray-400)
  - Active: #a5b4fc (indigo-300)
```

---

## Animations & Transitions

### Standard Transitions
```css
Button hover: transition: all 0.2s ease
Background changes: transition: background-color 0.2s ease
Color changes: transition: color 0.2s ease
FAB active: transition: all 0.2s ease, active:scale-95
```

### Smooth Scrolling
```css
html {
  scroll-behavior: smooth;
  -webkit-tap-highlight-color: transparent;
}
```

---

## Theme Toggle

### Default Theme
- **Default on first load:** Light Mode
- **Storage Key:** `jagadoku-theme`
- **Values:** `"light"` | `"dark"`

### Toggle Button Location
- Located in header (top-right on most pages)
- Icon: Sun (light mode) / Moon (dark mode)

---

## Accessibility & UX

### Tap Targets
- Minimum size: 44x44px for touch targets
- FAB: 56x56px (exceeds minimum)
- Navigation items: Full column width with adequate padding

### Contrast Ratios
- All text on backgrounds must maintain WCAG AA standards
- Gradient panels use white text for maximum contrast
- Colored panels in light mode use dark text variants

### Focus States
```css
Input fields: Blue ring with shadow
Buttons: Slight scale or opacity change
Links: Underline or color change
```

---

## File Structure for Styles

### Main CSS File
`src/app/globals.css`
- Contains all CSS variables
- Light/dark mode overrides
- Component-level customizations
- Utility classes

### Theme Context
`src/context/ThemeContext.tsx`
- Manages theme state
- Applies theme to document
- Persists to localStorage
- Prevents flash of wrong theme

### Layout
`src/app/layout.tsx`
- Blocking script for theme application
- Prevents flash of unstyled content
- Sets initial background colors

---

## DO NOT MODIFY

### Critical CSS Rules (LOCKED)
These rules must remain unchanged:

1. **Light mode background colors:** All `bg-*-900` classes in light mode convert to light equivalents
2. **Text contrast rules:** All `text-*` color overrides for light mode
3. **Gradient definitions:** `from-*` and `to-*` class values
4. **FAB positioning:** Center position in navigation (slot 3)
5. **Border radius standards:** Consistent use of rounded-xl and rounded-2xl
6. **Shadow specifications:** Light mode uses subtle shadows, dark mode uses none
7. **Input focus states:** Blue ring with indigo color

---

## Future Development Guidelines

When adding NEW features:

✅ **DO:**
- Use existing color variables from the design system
- Follow the established spacing scale (p-4, gap-3, etc.)
- Maintain the same border radius standards
- Use the same shadow specifications
- Follow the navigation structure
- Preserve the FAB center position
- Keep the gradient panel contrast intact

❌ **DON'T:**
- Change any existing color values
- Modify the navigation order or FAB position
- Alter the light/dark mode color mappings
- Change border radius values
- Modify shadow specifications
- Update font families
- Change the theme default (must stay "light")
- Modify input field styling
- Alter the colored panel background conversions

---

## Version History

### v1.0.0 (2026-02-24)
- Initial design specification locked
- Refined light mode with #f8f9fc background
- All colored panels optimized for contrast
- Gradient backgrounds maintain proper contrast
- Text colors fully optimized for readability
- FAB positioned at center (slot 3)
- Navigation order established
- Input fields with refined focus states

---

**END OF DESIGN SPECIFICATION**

*Any modifications to this design must be documented here with version updates.*
