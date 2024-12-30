# Font Documentation
> SaaS Metrics Platform Typography System

## Table of Contents
- [Font Assets](#font-assets)
- [Font Family](#font-family)
- [Font Weights](#font-weights)
- [Usage Guidelines](#usage-guidelines)
- [Licensing](#licensing)

## Font Assets

### Available Formats
The following font formats are provided for optimal browser compatibility and performance:
- WOFF2 (Primary): Modern browsers, smallest file size
- WOFF (Fallback): Broader browser support

### File Structure
```
fonts/
├── roboto/
│   ├── Roboto-Light.woff2
│   ├── Roboto-Light.woff
│   ├── Roboto-Regular.woff2
│   ├── Roboto-Regular.woff
│   ├── Roboto-Medium.woff2
│   ├── Roboto-Medium.woff
│   ├── Roboto-Bold.woff2
│   └── Roboto-Bold.woff
```

### Loading Strategy
Fonts are loaded using a performance-optimized strategy:
1. WOFF2 files are loaded with `font-display: swap`
2. WOFF files serve as fallbacks
3. System fonts are displayed during font loading

## Font Family

### Primary Stack
```css
--font-family-primary: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                      'Helvetica Neue', Arial, sans-serif;
```

### Fallback Hierarchy
1. **Roboto**: Primary web font
2. **-apple-system**: macOS/iOS system font
3. **BlinkMacSystemFont**: Chrome on macOS
4. **Segoe UI**: Windows system font
5. **Helvetica Neue**: Modern Apple devices
6. **Arial**: Universal fallback
7. **sans-serif**: Ultimate fallback

## Font Weights

### Available Weights
| Weight | Usage | Context |
|--------|--------|---------|
| Light (300) | Subtitles, secondary content | Used for supporting text and less emphasized content |
| Regular (400) | Body text, general content | Default weight for most text content |
| Medium (500) | Subheadings, emphasis | Used for section headers and emphasized content |
| Bold (700) | Headers, strong emphasis | Primary headers and critical information |

### Weight Guidelines
- Avoid using multiple weights in close proximity
- Maintain minimum contrast of 4.5:1 for all text
- Use appropriate weights for hierarchy establishment

## Usage Guidelines

### Material-UI Integration
```typescript
// theme.ts typography configuration
typography: {
  fontFamily: 'var(--font-family-primary)',
  h1: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2
  },
  body1: {
    fontWeight: 400,
    fontSize: '1rem',
    lineHeight: 1.5
  }
}
```

### Responsive Typography
| Breakpoint | Base Font Size | Scale Factor |
|------------|----------------|--------------|
| Mobile (<768px) | 14px | 1.2 |
| Tablet (768px-1024px) | 16px | 1.25 |
| Desktop (>1024px) | 16px | 1.333 |

### WCAG 2.1 Level AA Compliance
- Minimum text size: 16px (or 14px for bold text)
- Line height (line-spacing): At least 1.5 times the font size
- Paragraph spacing: At least 2 times the font size
- Letter spacing: At least 0.12 times the font size
- Word spacing: At least 0.16 times the font size

### Performance Optimization
- WOFF2 compression for modern browsers
- Font subsetting for used characters
- Preload critical font weights
- Local font fallbacks

## Licensing

### License Terms
Roboto is licensed under the Apache License, Version 2.0

### Usage Restrictions
- Freely usable in both commercial and non-commercial projects
- Modifications allowed with proper documentation
- No attribution required in final product

### Attribution Requirements
While not required, attribution is appreciated:
```text
Roboto Font: Copyright 2011 Google Inc. All Rights Reserved.
Licensed under the Apache License, Version 2.0
```

## Version Information
- Font Version: Roboto 2.137
- Last Updated: 2023
- Material-UI Version: 5.x
- Implementation Date: 2023

---

For additional information or updates to this documentation, please contact the design system team.