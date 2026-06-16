# BookReel Design Spec
**Author:** Penny (Design Agent)
**Date:** June 16, 2026
**Version:** v2

This document is Penny's complete design specification for all BookReel pages and components.
It serves as the authoritative reference for visual styling, typography, color palette, and
component patterns across the application.

---

## Design Tokens

### Color Palette
- **Parchment** `#FAFAF7` — page background
- **Vellum** `#F4F1EB` — card/input background  
- **Antique Border** `#E8E2D5` — borders
- **Warm Taupe** `#EDE9E0` — secondary backgrounds
- **Ink** `#0D0D0B` — primary text
- **Muted** `#8A8278` — secondary text / placeholders
- **Vermillion** `#C8402F` — primary accent / CTA
- **Vermillion Dark** `#A8321F` — hover state

### Typography
- **Playfair Display** — headings, logo, display text (700, 900)
- **Inter** — body, labels, UI text (400, 500, 600)

---

## Components

### BrandLogo
- "Book" in Ink, box icon, "Reel" in Vermillion italic
- Configurable `size` and `inverted` props

### PrimaryButton
- Solid: Vermillion background, Parchment text
- Ghost: transparent background, Antique Border border
- Hover transitions, disabled opacity 0.55

### StatusBadge
- Pill shape, uppercase 11px Inter
- Statuses: pending, processing, review, generating, complete, failed, free, author, pro

### GlobalNav
- Fixed 64px height, Parchment background, Antique Border bottom
- BrandLogo left, nav links center, user avatar + tier badge + sign out right
- Active link: underline in Vermillion

---

## Pages

### Auth: Login
- Centered Vellum card (max-width 440px) on Parchment background
- BrandLogo → diamond rule → "Welcome back, author." → "Your stories are waiting."
- Small-caps form labels, Vellum input backgrounds, Vermillion focus border
- Full-width Vermillion "Sign In" button
- "Don't have an account? Start here →" footer link

### Auth: Signup
- Same card layout
- "Your book's trailer starts here." heading
- "✦ Join 100+ indie authors" social proof
- Full Name + Email + Password fields
- "Create My Account →" button
- Playfair italic value reminder: "Built entirely from your manuscript."

### 404 Not Found
- Full Parchment viewport, centered
- Large "404" in Playfair 900, 160px, color Warm Taupe
- "This page seems to have closed its covers."
- Body copy + "Return to the Shelf →" CTA + browse link

### Offline
- Same centered layout
- 📡 icon, "You've gone off the page." heading
- "Try Again" Vermillion button with window.location.reload()
