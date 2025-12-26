# Frontend Guideline Document

This document outlines the frontend architecture, design principles, and technologies behind the Cardomat application. It is written in everyday language to help anyone understand how the frontend is set up and why certain choices were made.

---

## 1. Frontend Architecture

### Overview
The Cardomat frontend is built with React, a popular JavaScript library for building user interfaces. It uses modern tools and practices to make sure the app is fast, easy to maintain, and ready to grow.

### Key Technologies
- **React**: For building reusable UI components.
- **Webpack**: Bundles code and assets into optimized files for the browser.
- **Babel**: Transpiles modern JavaScript so it works in all browsers.
- **Redux**: Manages application state in a predictable way.
- **React Router**: Handles navigation and URL routing.

### How This Supports Our Goals
- **Scalability**: Components are broken into small, focused pieces. As features grow, we simply add more components without making existing code messy.
- **Maintainability**: A clear folder structure and consistent naming keep code organized. Developers can find and fix things quickly.
- **Performance**: Webpack and Babel optimize and shrink the code. We use lazy loading to only load parts of the app when needed.

---

## 2. Design Principles

### Usability
We design every screen with the user in mind. Buttons are easy to spot, forms have clear labels, and common actions are one click away.

### Accessibility
- **Keyboard Navigation**: All interactive elements can be reached with the keyboard.
- **Screen Reader Support**: We use semantic HTML and ARIA tags to describe components.
- **Contrast**: Text and backgrounds meet WCAG AA contrast ratios.

### Responsiveness
The UI adapts to different screen sizes:
- **Mobile**: Single-column layouts, large touch targets.
- **Tablet**: Two-column layouts when space allows.
- **Desktop**: Full dashboard view with side navigation.

---

## 3. Styling and Theming

### Styling Approach
- **Methodology**: BEM (Block, Element, Modifier) for naming CSS classes.
- **Pre-processor**: SASS (SCSS syntax) for variables, nesting, and mixins.
- **Modularity**: CSS Modules ensure styles are scoped per component and avoid conflicts.

### Theming
We support light and dark themes. Theme variables live in one place, so switching or tweaking colors is easy.

### Visual Style
- **Overall Feel**: Modern with subtle glassmorphism—semi-transparent panels with soft shadows.
- **Components**: Clean edges, smooth animations, and consistent spacing.

### Color Palette
- Primary: #4A90E2 (blue)
- Secondary: #50E3C2 (teal)
- Accent: #F5A623 (orange)
- Background (light): #F5F7FA
- Background (dark): #1F1F1F
- Text (dark): #333333
- Text (light): #FFFFFF

### Typography
- **Font Family**: Inter (system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")
- **Headings**: Bold, clear hierarchy (H1–H6).
- **Body Text**: Comfortable line heights and spacing.

---

## 4. Component Structure

### Organization
```
src/
├── components/    # Reusable UI building blocks
│   ├── Button/
│   ├── Modal/
│   └── CardList/
├── pages/         # Top-level views (Dashboard, Settings)
├── layouts/       # Page layouts (Nav + Sidebar)
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
└── styles/        # Global styles and theme definitions
```

### Reuse and Consistency
- Each component has its own folder with:
  - `.tsx` or `.jsx` file
  - `.module.scss` for styles
  - `index.ts` for easy importing
- This setup ensures that common elements like buttons or forms look and behave the same everywhere.

---

## 5. State Management

### Redux
- **Store**: Central place for application data (user info, card lists, settings).
- **Slices**: We group related state logic into slices (e.g., `cards`, `auth`, `ui`).
- **Actions & Reducers**: Define how data changes in response to user actions or API calls.

### Sharing State
Components connect to the Redux store with hooks (`useSelector`, `useDispatch`), ensuring data flows in a clear, predictable way. This avoids prop drilling and keeps components focused.

---

## 6. Routing and Navigation

### React Router
- **BrowserRouter**: Wraps the app to enable client-side routing.
- **Routes**: Defined in a single `AppRoutes.tsx` file for clarity.
- **Protected Routes**: Users must be authenticated to access certain pages.

### Navigation Structure
- **Top-Level Links**: Dashboard, Transactions, Cards, Settings.
- **Sub-Menus**: Expand under each main category for deeper functions.

Users move between screens without full page reloads, creating a smooth experience.

---

## 7. Performance Optimization

- **Code Splitting**: React.lazy + Suspense to load pages only when needed.
- **Asset Optimization**: Compress images, use SVGs for icons.
- **Memoization**: React.memo + useCallback to prevent unnecessary re-renders.
- **Lazy Data Fetching**: Load heavy data (like transaction history) only when its page is opened.
- **Bundle Analysis**: Regularly review bundle size to keep downloads small.

These steps ensure quick load times and a snappy interface.

---

## 8. Testing and Quality Assurance

### Unit Tests
- **Library**: Jest + React Testing Library.
- **Coverage**: Each component and utility function.

### Integration Tests
- Test how components work together, e.g., forms submitting and updating the store.

### End-to-End Tests
- **Tool**: Cypress.
- **Flows**: User login, card processing, viewing transaction history.

### Linting & Formatting
- **ESLint**: Enforces code style and catches errors early.
- **Prettier**: Automatic code formatting for consistency.

---

## 9. Conclusion and Overall Frontend Summary

This frontend setup combines React, Redux, and modern build tools to create a scalable, maintainable, and high-performance application. Our design principles ensure the UI is usable, accessible, and responsive. By using a clear component structure, robust state management, and thorough testing, we deliver a consistent and reliable experience for Cardomat users. Whether you’re a designer, developer, or project manager, this guide should help you understand how the frontend works and how to contribute smoothly. 

Thank you for reading the Cardomat Frontend Guidelines!