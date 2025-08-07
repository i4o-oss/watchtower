# Watchtower - Design Brief

## Color Palette

### Primary Colors
- **Primary White** - `#FEFEFE` (Clean backgrounds and main content surfaces)
- **Primary Dark Green** - `#0D4F3C` (Primary brand color for buttons, links, and emphasis)

### Secondary Colors
- **Secondary Green Medium** - `#148A5E` (Interactive elements and hover states)
- **Secondary Green Light** - `#10B981` (Success indicators and positive feedback)
- **Secondary Green Pale** - `#ECFDF5` (Subtle backgrounds and selected states)

### Accent Colors
- **Accent Emerald** - `#059669` (Call-to-action buttons and important notifications)
- **Accent Mint** - `#6EE7B7` (Highlighting and active states)

### Functional Colors
- **Success Green** - `#10B981` (Operational status and successful monitoring)
- **Warning Amber** - `#F59E0B` (Degraded performance and warnings)
- **Error Red** - `#DC2626` (Downtime alerts and critical errors)
- **Info Blue** - `#3B82F6` (Informational messages and neutral notifications)

### Neutral Colors
- **Neutral Light Gray** - `#F9FAFB` (Subtle section backgrounds)
- **Neutral Gray** - `#6B7280` (Secondary text and inactive elements)
- **Neutral Dark Gray** - `#374151` (Primary text and content)
- **Neutral Charcoal** - `#1F2937` (Headers and high-contrast text)

### Background Colors
- **Background Pure White** - `#FFFFFF` (Card backgrounds and content containers)
- **Background Off-White** - `#F9FAFB` (Main application background)
- **Background Dark** - `#111827` (Dark mode primary background)
- **Background Dark Surface** - `#1F2937` (Dark mode card backgrounds)

## Typography

### Font Family
- **Primary Font**: Inter (Modern, clean, excellent readability)
- **Monospace Font**: JetBrains Mono (For code, endpoints, and technical data)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Text Styles

#### Headings
- **H1**: `32px/40px`, Bold, Letter spacing `-0.02em`
  - Used for main page titles and dashboard headers
- **H2**: `24px/32px`, Semibold, Letter spacing `-0.01em`
  - Used for section headers and card titles
- **H3**: `20px/28px`, Semibold, Letter spacing `0em`
  - Used for subsection headers and metric labels
- **H4**: `18px/24px`, Medium, Letter spacing `0em`
  - Used for component titles and form sections

#### Body Text
- **Body Large**: `16px/24px`, Regular, Letter spacing `0em`
  - Primary reading text for descriptions and content
- **Body**: `14px/20px`, Regular, Letter spacing `0em`
  - Standard text for UI elements and labels
- **Body Small**: `12px/16px`, Regular, Letter spacing `0.01em`
  - Secondary information and metadata

#### Special Text
- **Code/Monospace**: `14px/20px`, Medium, Letter spacing `0em`
  - API endpoints, error codes, and technical identifiers
- **Caption**: `11px/16px`, Medium, Letter spacing `0.06em`, Uppercase
  - Status labels, badges, and system information
- **Button Text**: `14px/20px`, Medium, Letter spacing `0.01em`
  - Interactive element text
- **Link Text**: `14px/20px`, Medium, Primary Dark Green
  - Clickable text throughout the application

## Component Styling

### Buttons

#### Primary Button
- **Background**: Primary Dark Green (`#0D4F3C`)
- **Text**: White (`#FFFFFF`)
- **Height**: `40px`
- **Corner Radius**: `6px`
- **Padding**: `12px 16px`
- **Hover**: Secondary Green Medium (`#148A5E`)

#### Secondary Button
- **Border**: `1px` Primary Dark Green (`#0D4F3C`)
- **Text**: Primary Dark Green (`#0D4F3C`)
- **Background**: Transparent
- **Height**: `40px`
- **Corner Radius**: `6px`
- **Padding**: `12px 16px`
- **Hover**: Background Secondary Green Pale (`#ECFDF5`)

#### Destructive Button
- **Background**: Error Red (`#DC2626`)
- **Text**: White (`#FFFFFF`)
- **Height**: `40px`
- **Corner Radius**: `6px`
- **Hover**: Darker red (`#B91C1C`)

#### Ghost Button
- **Text**: Neutral Dark Gray (`#374151`)
- **Background**: Transparent
- **Height**: `36px`
- **Hover**: Background Neutral Light Gray (`#F9FAFB`)

### Cards
- **Background**: White (`#FFFFFF`)
- **Border**: `1px` solid `#E5E7EB`
- **Shadow**: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- **Corner Radius**: `8px`
- **Padding**: `20px`

### Input Fields
- **Height**: `40px`
- **Corner Radius**: `6px`
- **Border**: `1px` Neutral Gray (`#D1D5DB`)
- **Active Border**: `2px` Primary Dark Green (`#0D4F3C`)
- **Background**: White (`#FFFFFF`)
- **Text**: Neutral Dark Gray (`#374151`)
- **Placeholder**: Neutral Gray (`#6B7280`)
- **Padding**: `8px 12px`

### Status Indicators
- **Operational**: Success Green (`#10B981`) with white text
- **Degraded**: Warning Amber (`#F59E0B`) with white text
- **Down**: Error Red (`#DC2626`) with white text
- **Maintenance**: Info Blue (`#3B82F6`) with white text
- **Corner Radius**: `12px` (pill shape)
- **Padding**: `4px 8px`
- **Font**: Caption style

### Data Tables
- **Header Background**: Neutral Light Gray (`#F9FAFB`)
- **Header Text**: Neutral Charcoal (`#1F2937`), Semibold
- **Row Border**: `1px` solid `#E5E7EB`
- **Row Hover**: Background Neutral Light Gray (`#F9FAFB`)
- **Cell Padding**: `12px 16px`

## Icons
- **Primary Size**: `20px × 20px`
- **Large Size**: `24px × 24px`
- **Small Size**: `16px × 16px`
- **Navigation Icons**: `20px × 20px`
- **Primary Color**: Primary Dark Green (`#0D4F3C`) for interactive icons
- **Secondary Color**: Neutral Gray (`#6B7280`) for decorative icons
- **Status Icons**: Match their respective status colors

## Spacing System
- **2px** - Micro spacing (icon-to-text alignment)
- **4px** - Minimal spacing (tight elements)
- **8px** - Small spacing (form element gaps)
- **12px** - Default spacing (component internal padding)
- **16px** - Medium spacing (card padding, section gaps)
- **24px** - Large spacing (major section separation)
- **32px** - Extra large spacing (page section separation)
- **48px** - Maximum spacing (screen padding)

## Motion & Animation
- **Standard Transition**: `150ms` ease-out (hover states, color changes)
- **Medium Transition**: `200ms` ease-out (component state changes)
- **Slow Transition**: `300ms` ease-out (layout changes, modal animations)
- **Spring Animation**: Custom cubic-bezier(0.34, 1.56, 0.64, 1) for button interactions
- **Page Transitions**: `250ms` ease-in-out
- **Loading States**: Subtle pulse animation at `1.5s` intervals

## Dark Mode Variants
- **Dark Background**: `#111827` (primary dark background)
- **Dark Surface**: `#1F2937` (card and component backgrounds)
- **Dark Border**: `#374151` (subtle borders and dividers)
- **Dark Primary Green**: `#10B981` (adjusted for contrast)
- **Dark Text Primary**: `#F9FAFB` (main text)
- **Dark Text Secondary**: `#D1D5DB` (secondary text)
- **Dark Neutral**: `#6B7280` (disabled and inactive elements)

## Application-Specific Guidelines

### Dashboard Layout
- **Sidebar Width**: `240px` (collapsed: `64px`)
- **Header Height**: `64px`
- **Content Padding**: `24px`
- **Card Grid Gap**: `16px`

### Status Page Public View
- **Max Content Width**: `1200px`
- **Center-aligned layout with generous whitespace
- **Incident cards with prominent status indicators
- **Subscription form with Primary button styling

### Monitoring Configuration
- **Form sections with clear visual hierarchy
- **Endpoint cards showing health status
- **Configuration panels with Secondary button actions
- **Real-time status updates with smooth transitions

### Notification Settings
- **Toggle switches using Primary Dark Green
- **Channel cards with platform-specific icons
- **Test notification buttons with Ghost styling
