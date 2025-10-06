import { html } from 'hono/html';
import { Child, FC } from 'hono/jsx';

/**
 * Tailwind CSS configuration for custom theme extensions
 *
 * Defines custom font families and theme extensions that are used
 * throughout the application for consistent styling.
 *
 * @private
 */
const tailwindConfig = html`
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            roboto: ['Roboto', 'sans-serif'],
          },
        },
      },
    };
  </script>
`;

/**
 * Props interface for the Template component
 *
 * @public
 */
export interface TemplateProps {
  /** Child components to be rendered within the template */
  children: Child;
}

/**
 * Base HTML template component for the OID4VC verifier frontend application
 *
 * This component provides the foundational HTML structure, metadata, and styling
 * for all pages in the verifier application. It includes:
 *
 * - **Responsive Design**: Mobile-first viewport configuration
 * - **SEO Optimization**: Comprehensive meta tags for search engines
 * - **External Resources**: Font Awesome icons and Google Fonts integration
 * - **Styling Framework**: Tailwind CSS with custom configuration
 * - **Consistent Layout**: Header, main content area, and footer structure
 * - **Accessibility**: Semantic HTML structure and proper heading hierarchy
 *
 * ## Design System
 *
 * The template establishes a consistent design system with:
 * - **Color Scheme**: Green primary colors with gray accents
 * - **Typography**: Roboto font family for readability
 * - **Layout**: Flexbox-based responsive layout
 * - **Spacing**: Consistent padding and margin values
 *
 * ## Usage
 *
 * This template is automatically applied to all pages through the Hono JSX renderer
 * middleware, ensuring consistent presentation across the entire application.
 *
 * @example
 * ```typescript
 * // Template is used automatically via JSX renderer middleware
 * app.use('*', jsxRenderer(({ children }) => <Template>{children}</Template>));
 *
 * // Individual pages are wrapped automatically
 * return c.render(<HomePage />); // Will be wrapped in Template
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the complete HTML document structure
 *
 * @public
 */
export const Template: FC<TemplateProps> = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <title>Verifier Frontend</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <meta name="description" content="Verifier Frontend Application" />
        <meta name="keywords" content="Verifier, Frontend, Application" />
        <meta name="author" content="Your Name" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
        />
        <link
          rel="icon"
          href="https://api.iconify.design/bi:person-vcard-fill.svg"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp,container-queries"></script>
        {tailwindConfig}
      </head>
      <body class="flex flex-col h-screen bg-white text-gray-900 font-roboto">
        <header class="bg-green-600 shadow-md p-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Verifier Frontend</h1>
        </header>
        <main class="flex-grow p-6 bg-gray-100 shadow-md rounded-lg m-4">
          {children}
        </main>
        <footer class="bg-green-700 text-white p-4 mt-auto">
          <div class="text-center">© 2024 Verifier Frontend</div>
        </footer>
      </body>
    </html>
  );
};
