Incident Command System — Visual Design Specification

This specification defines only the visual language of the Incident Command System: color, typography, spacing, shape, elevation, iconography, motion, accessibility, and related visual standards. It intentionally excludes UI/UX structure, navigation, workflows, layouts, and feature placement.

1. Design Direction

The visual identity should communicate:

Calm · Operational · High-clarity · Trustworthy · Accessible · High-contrast

The system should avoid the visual language commonly associated with entertainment dashboards or consumer apps. Visual elements should feel stable and restrained, with emphasis reserved for meaningful changes in incident conditions.

The design language must work equally well on:

Desktop displays
Tablets
Mobile phones
Outdoor/high-brightness environments
Low-light command-center environments

The visual system should therefore use strong contrast, restrained saturation, scalable typography, and consistent semantic encoding.

2. Primary Color System

The primary foundation is a dark neutral system with semantic accent colors.

:root {
  /* ─────────────────────────
     CORE NEUTRALS
     ───────────────────────── */

  --bg: #0a0a0f;
  --surface: #16161d;
  --surface-2: #1d1d26;
  --surface-3: #24242e;

  --fg: #f4f4f8;
  --muted: #8a8a9a;
  --disabled: #555563;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);


  /* ─────────────────────────
     SEMANTIC COLORS
     ───────────────────────── */

  --safe: #34d399;
  --watch: #fbbf24;
  --warning: #fb923c;
  --critical: #f87171;
  --info: #60a5fa;

  --accent: #38bdf8;


  /* ─────────────────────────
     INTERACTION STATES
     ───────────────────────── */

  --focus: #38bdf8;
  --selected: #38bdf8;
  --success: #34d399;
  --error: #f87171;
}
Color hierarchy
Token	HEX	Purpose
--bg	#0A0A0F	Global background
--surface	#16161D	Primary surface
--surface-2	#1D1D26	Elevated surface
--surface-3	#24242E	Higher elevation
--fg	#F4F4F8	Primary text
--muted	#8A8A9A	Secondary text
--disabled	#555563	Disabled content
--border	rgba white 8%	Subtle separation
--border-strong	rgba white 16%	Strong separation
3. Semantic Color System

Semantic colors must have fixed meanings throughout the entire product.

Semantic state	Token	HEX	Meaning
Safe / Cleared	--safe	#34D399	Situation under control
Watch / Caution	--watch	#FBBF24	Monitor closely
Warning	--warning	#FB923C	Elevated concern
Critical	--critical	#F87171	Immediate danger/action
Information	--info	#60A5FA	Informational condition
Primary action	--accent	#38BDF8	Active interaction
Semantic color rules

Semantic colors must never change meaning based on context.

Green  = Safe
Amber  = Watch
Orange = Warning
Red    = Critical
Blue   = Information
Sky    = Interaction / Accent

A semantic color should not simultaneously represent a different concept elsewhere.

For example:

Blue ≠ Police
Blue = Information

when blue is being used as a semantic status.

4. Semantic Color Treatment

Semantic colors should not normally be used as large solid backgrounds.

Preferred treatment:

Dark surface
    +
Colored indicator
    +
Colored border/accent
    +
Text label

For example:

CRITICAL
#F87171

rather than:

Entire container = #F87171

This prevents visual fatigue and preserves hierarchy.

Recommended opacity levels

For subtle semantic backgrounds:

--safe-bg:     rgba(52, 211, 153, 0.10);
--watch-bg:    rgba(251, 191, 36, 0.10);
--warning-bg:  rgba(251, 146, 60, 0.10);
--critical-bg: rgba(248, 113, 113, 0.10);
--info-bg:     rgba(96, 165, 250, 0.10);

For stronger emphasis:

--safe-bg-strong:     rgba(52, 211, 153, 0.16);
--watch-bg-strong:    rgba(251, 191, 36, 0.16);
--warning-bg-strong:  rgba(251, 146, 60, 0.16);
--critical-bg-strong: rgba(248, 113, 113, 0.16);
--info-bg-strong:     rgba(96, 165, 250, 0.16);

These should be used sparingly.

5. Categorical Color Palette

Categorical colors are separate from semantic colors.

They may be used to distinguish:

Teams
Agencies
Resource classes
Incident categories
Map layers
Operational groups

A ColorBrewer-derived palette can be used here, but it should not replace the semantic palette.

Recommended starting palette:

Token	HEX
--cat-teal	#8DD3C7
--cat-yellow	#FFFFB3
--cat-purple	#BEBADA
--cat-coral	#FB8072
--cat-blue	#80B1D3
--cat-orange	#FDB462
--cat-green	#B3DE69
--cat-gold	#FFED6F
Important distinction

These colors communicate:

What something is

Semantic colors communicate:

What condition something is in

Never mix the two systems.

6. Color Contrast

All text and meaningful visual indicators must satisfy accessibility requirements.

Minimum contrast targets
Element	Minimum
Normal text	4.5:1
Large text	3:1
Important graphical elements	3:1
Focus indicators	3:1

The system should target higher contrast wherever practical, particularly for:

Critical alerts
Primary text
Mobile usage
Outdoor environments
Emergency conditions
7. Color Independence

Color must never be the only information channel.

A status should be distinguishable through a combination of:

Color
+
Text
+
Icon
+
Shape / pattern

Example:

● CRITICAL

rather than simply:

●

For dense data visualization, supplement color with:

Different line styles
Different marker shapes
Labels
Patterns
Icons
Text annotations
8. Typography

Typography should prioritize rapid recognition and legibility rather than decorative character.

Recommended typeface families:

Primary

Inter

or an equivalent modern sans-serif with strong screen legibility.

Monospaced

JetBrains Mono or equivalent for:

IDs
Coordinates
Timestamps where appropriate
Technical values
Codes
9. Type Scale

Use a constrained type scale.

Display
32 px

Heading XL
24 px

Heading L
20 px

Heading M
18 px

Body Large
16 px

Body
14 px

Body Small
13 px

Caption
12 px

Micro
11 px

Mobile implementations may reduce display sizes but should avoid excessive compression of body text.

Recommended minimum

Body content should generally remain 14px or larger, with critical operational information preferentially using 16px or larger.

10. Typography Weights

Use a limited weight vocabulary.

400 → Regular
500 → Medium
600 → Semibold
700 → Bold

Recommended usage:

Weight	Purpose
400	Body
500	Supporting emphasis
600	Headings / labels
700	Critical emphasis

Avoid using many different font weights simultaneously.

11. Text Color Hierarchy
--text-primary: #f4f4f8;
--text-secondary: #b5b5c2;
--text-muted: #8a8a9a;
--text-disabled: #555563;

Recommended hierarchy:

Primary
100%

Secondary
~75%

Muted
~55%

Disabled
~35%

Opacity should not be the sole method of communicating disabled states where contrast becomes inadequate.

12. Spacing System

Use a 4px base unit.

4
8
12
16
20
24
32
40
48
64

Primary spacing rhythm:

Small gap       8px
Default gap    12px
Component      16px
Section        24px
Major section  32px

Avoid arbitrary spacing values such as:

13px
17px
23px
29px

unless technically required.

Consistency is more important than absolute spacing precision.

13. Corner Radius

The system should use restrained rounding.

Recommended scale:

--radius-sm:  6px;
--radius-md:  8px;
--radius-lg:  12px;
--radius-xl:  16px;

Use:

6px → compact elements
8px → standard controls
12px → major surfaces
16px → prominent containers

Avoid excessive rounded "pill" styling because it pushes the visual language toward a consumer/social-app aesthetic.

14. Borders

Borders should be subtle but visible.

Default
border: 1px solid rgba(255,255,255,0.08);
Strong
border: 1px solid rgba(255,255,255,0.16);
Focus
border: 1px solid #38bdf8;

Borders should generally be preferred over heavy shadows for structural separation.

15. Elevation

Use layered surfaces rather than dramatic shadows.

Recommended hierarchy:

Background
#0A0A0F

Surface
#16161D

Surface 2
#1D1D26

Surface 3
#24242E

Visual elevation should therefore primarily be created through:

Surface color
+
Border
+
Very subtle shadow

rather than large glowing shadows.

16. Shadow System

Recommended shadows:

--shadow-sm:
  0 1px 2px rgba(0,0,0,0.30);

--shadow-md:
  0 4px 12px rgba(0,0,0,0.35);

--shadow-lg:
  0 8px 24px rgba(0,0,0,0.40);

Avoid colored shadows except for highly deliberate critical-state emphasis.

17. Iconography

Icons should use a consistent outline/linear visual language.

Recommended properties:

Style: Outline
Stroke: 1.75–2px
Corners: Rounded
Shape: Geometric

Avoid mixing:

Outlined icons
+
Filled icons
+
3D icons
+
emoji

within the same semantic system.

Icons should remain recognizable at small mobile sizes.

18. Icon Semantic Rules

Recommended meanings:

✓  Safe / completed
!  Warning
×  Critical failure
ⓘ  Information
?  Unknown
●  Active status
○  Inactive status
↗  Escalation
⌁  Connectivity / signal
⟳  Synchronization

The exact icon set should use proper iconography rather than literal Unicode symbols in production.

19. Status Indicators

Status indicators should use consistent geometry.

Example:

● SAFE
● WATCH
● WARNING
● CRITICAL
● INFO

Indicator sizes:

Small      6–8px
Standard   8–10px
Large      12–16px

Critical status may use controlled animation, but static forms must remain completely understandable.

20. Critical-State Visual Language

Critical states require a stronger treatment.

Recommended hierarchy:

Critical text
+
Critical icon
+
Critical indicator
+
Subtle critical background
+
Optional stronger border

Example:

background: rgba(248,113,113,0.10);
border-color: rgba(248,113,113,0.35);
color: #f87171;

Do not use:

background: #ff0000;

as the default critical treatment.

Pure red is excessively aggressive and provides poorer visual comfort.

21. Motion System

Motion should communicate state change, not decoration.

Recommended timing:

Instant feedback:     100–150ms
Standard transition:  150–250ms
Complex transition:   250–350ms

Recommended easing:

cubic-bezier(0.2, 0.8, 0.2, 1)

Avoid:

Bounce animations
Elastic animations
Excessive scaling
Continuous decorative movement
Large screen transitions
22. Critical Animation

Critical conditions may use a subtle pulse.

Example:

@keyframes criticalPulse {
  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

The pulse should be:

Slow
Subtle
Limited to the indicator

Never continuously animate a complete critical panel.

23. Reduced Motion

The visual system must respect:

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

Critical states must remain fully understandable without animation.

24. Mobile Visual Adaptation

Because the system must function effectively on phones, visual tokens should scale without changing their semantic meaning.

The mobile visual system should prioritize:

High contrast
Large readable text
Clear icons
Reduced visual density
Large touch-compatible visual targets
Strong semantic differentiation

Mobile should not introduce a separate color language.

The same:

Green → Safe
Amber → Watch
Orange → Warning
Red → Critical
Blue → Info

relationship must remain consistent.

25. Mobile Typography Adjustments

Recommended mobile minimums:

Primary body:        15–16px
Secondary body:      14px
Important labels:    14px+
Critical status:     14–16px+

Avoid reducing everything to 11–12px simply to fit more information.

For emergency operations, readability is more valuable than maximum information density.

26. Touch-Aware Visual Tokens

Even though interaction architecture is outside this specification, the visual system should accommodate touch interfaces.

Recommended minimum interactive visual footprint:

44 × 44 px

Prefer:

48 × 48 px

for frequently used controls where space permits.

This should be treated as a visual sizing token, not a layout specification.

27. Responsive Token Strategy

Use responsive design tokens rather than creating entirely separate visual systems.

Example:

:root {
  --text-body: 16px;
  --text-label: 14px;
  --space-unit: 4px;
  --radius: 8px;
}

@media (max-width: 640px) {
  :root {
    --text-body: 15px;
    --text-label: 14px;
    --radius: 8px;
  }
}

Color, status, typography hierarchy, iconography, and shape language should remain consistent.

28. Light Mode

Dark mode is the primary visual environment, but a light theme should use the same semantic colors.

Recommended light theme:

:root {
  --bg: #f7f7fa;
  --surface: #ffffff;
  --surface-2: #f0f0f4;
  --surface-3: #e7e7ed;

  --fg: #18181f;
  --muted: #5f606c;
  --disabled: #92939e;

  --border: rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.18);
}

The semantic meanings must remain unchanged.

29. Data Visualization Colors

Charts, graphs, and quantitative visualizations should follow a dedicated hierarchy.

First priority

Use semantic colors when the data represents state:

Safe
Watch
Warning
Critical
Second priority

Use categorical colors when the data represents distinct classes.

Never create arbitrary chart colors that conflict with the semantic system.

For example:

Red = Critical

should remain true even inside charts.

30. Maps and Geographic Visualization

Map colors should be visually subordinate to operational overlays.

Recommended hierarchy:

Base map
      ↓
Geographic context
      ↓
Operational zones
      ↓
Incidents
      ↓
Critical events

Avoid highly saturated base-map colors because they compete with incident markers.

Critical operational information should visually dominate geographic decoration.

31. Transparency

Recommended transparency values:

0.04 → extremely subtle
0.08 → standard border
0.10 → semantic background
0.16 → stronger semantic background
0.24 → strong highlight
0.35 → strong semantic border

Avoid excessive use of translucent layers because overlapping transparency can make dark interfaces muddy.

32. Focus State

Every focusable visual element should have a highly visible focus state.

Recommended:

outline: 2px solid #38bdf8;
outline-offset: 2px;

The focus indicator must not rely exclusively on color differences.

33. Disabled State

Disabled elements should communicate:

Reduced contrast
+
Reduced opacity
+
Uninteractive cursor/interaction state

But text must remain sufficiently visible for users to understand what the element represents.

Do not simply make content disappear through extremely low opacity.

34. Selection State

Selected elements should primarily use:

Accent border
+
Subtle accent background
+
Strong typography

Recommended:

background: rgba(56,189,248,0.10);
border-color: rgba(56,189,248,0.40);

Avoid filling entire selected elements with bright cyan.

35. Error System

Error should use the same critical family but be semantically distinct from incident severity when necessary.

System Error   → Coral
Incident Critical → Coral + Critical label
Validation Error → Coral + field-specific message

The difference should be communicated through labels and icons, not through inventing another shade of red.

36. Connectivity States

For a disaster-response system, connectivity deserves a defined visual language.

Recommended:

● ONLINE       Safe / connected
◐ DEGRADED     Watch
○ OFFLINE      Warning
! SYNC ERROR   Critical system condition

Use:

Green → connected
Amber → degraded
Orange/red → unavailable/error

Connectivity states should not be confused with incident severity.

37. Typography + Color Combination Rules

Preferred:

White text
on dark surfaces
Semantic accent
on dark surface

Avoid:

Light yellow text
on white background
Orange text
on yellow background
Red text
on orange background

Always verify the actual foreground/background combination, rather than assuming an individual color is accessible.

38. Visual Density

The system should target a medium-to-high information density, but visual density must not come from:

Tiny text
Extremely narrow spacing
Excessive borders
Excessive colors

Instead achieve density through:

Strong typography hierarchy
Consistent spacing
Grouped information
Clear alignment
Limited color vocabulary
39. Background Treatment

Do not use gradients as a primary visual identity.

Preferred:

Solid near-black
+
Subtle surface differentiation
+
Minimal accent highlights

Avoid:

Neon gradients
Glass-heavy UI
Bright glows
Animated backgrounds

The emergency information itself should be the visually important element.

40. Overall Visual Token Summary
╔══════════════════════════════════════╗
║       INCIDENT COMMAND SYSTEM        ║
╠══════════════════════════════════════╣
║                                      ║
║ BACKGROUND                           ║
║ #0A0A0F                              ║
║                                      ║
║ SURFACES                             ║
║ #16161D → #1D1D26 → #24242E         ║
║                                      ║
║ TEXT                                 ║
║ #F4F4F8                              ║
║ #8A8A9A                              ║
║                                      ║
║ SAFE          #34D399                ║
║ WATCH         #FBBF24                ║
║ WARNING       #FB923C                ║
║ CRITICAL      #F87171                ║
║ INFO          #60A5FA                ║
║ ACCENT        #38BDF8                ║
║                                      ║
║ TYPEFACE      Inter                   ║
║ MONO          JetBrains Mono          ║
║ BASE UNIT     4px                     ║
║ RADIUS        6 / 8 / 12 / 16px      ║
║ BORDER        White 8%                ║
║ MOTION        150–250ms               ║
║                                      ║
║ VISUAL RULE                           ║
║ Meaning > Decoration                 ║
╚══════════════════════════════════════╝
41. Non-Negotiable Visual Rules

The design system should enforce these rules globally:

1. Semantic meaning never changes.
Green, amber, orange, red, and blue must always retain their defined operational meanings.

2. Color never carries meaning alone.
Every important state receives additional text, iconography, geometry, or pattern.

3. Dark mode is the primary visual language.
Light mode is a compatible secondary theme.

4. Contrast takes priority over aesthetics.

5. Typography takes priority over color for hierarchy.

6. Saturation is reserved for operational significance.

7. Critical states receive emphasis, not visual chaos.

8. Mobile uses the same visual language as desktop.
Only scale and density should adapt.

9. Categorical colors and semantic colors remain separate systems.

10. The visual system should remain understandable under color-vision deficiencies.

11. Motion is informational, never decorative.

12. Every visual token should have a defined purpose.
