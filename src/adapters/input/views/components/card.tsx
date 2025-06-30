import { FC } from 'hono/jsx';
import { JSX } from 'hono/jsx/jsx-runtime';

/**
 * Props interface for the Card component
 *
 * @public
 */
export interface CardProps {
  /** The child elements to be rendered within the card */
  children: JSX.Element;
  /** The title text to display in the card header */
  title: string;
}

/**
 * Reusable card component for consistent content presentation
 *
 * This component provides a standardized container for content throughout
 * the OID4VC verifier frontend application. It ensures consistent visual
 * presentation with proper spacing, shadows, and responsive design.
 *
 * ## Design Features
 *
 * - **Consistent Styling**: White background with subtle shadow and border
 * - **Responsive Design**: Adapts to different screen sizes with max-width constraints
 * - **Proper Spacing**: Standardized padding and margins for content
 * - **Typography**: Clear title hierarchy with semantic heading structure
 * - **Accessibility**: Semantic HTML structure with proper section elements
 * - **Visual Hierarchy**: Clear separation between title and content areas
 *
 * ## Layout Specifications
 *
 * - **Max Width**: 384px (24rem) for optimal readability
 * - **Padding**: 24px (1.5rem) for comfortable content spacing
 * - **Border Radius**: 8px for modern, friendly appearance
 * - **Shadow**: Medium shadow for subtle depth
 * - **Border**: Light gray border for definition
 * - **Centering**: Automatically centered with auto margins
 *
 * ## Usage Patterns
 *
 * The Card component is used throughout the application for:
 * - Page content containers
 * - Form wrappers
 * - Error message displays
 * - Result presentations
 * - Navigation sections
 *
 * @example
 * ```typescript
 * // Basic usage
 * <Card title="Welcome">
 *   <>
 *     <p>This is the card content.</p>
 *     <button>Action Button</button>
 *   </>
 * </Card>
 *
 * // With complex content
 * <Card title="Verification Results">
 *   <>
 *     <div className="space-y-4">
 *       <p>Verification completed successfully.</p>
 *       <ul>
 *         <li>Document: Valid</li>
 *         <li>Signature: Verified</li>
 *       </ul>
 *       <a href="/home">Return Home</a>
 *     </div>
 *   </>
 * </Card>
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the card container
 *
 * @public
 */
export const Card: FC<CardProps> = ({ children, title }) => {
  // Validate required props
  if (!title || typeof title !== 'string') {
    console.error('Card component: title is required and must be a string');
    return (
      <section class="bg-white rounded-lg shadow-md max-w-96 p-6 my-4 mx-auto border border-gray-200">
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-gray-800">Error</h2>
        </div>
        <p class="text-red-600">Card configuration error: Invalid title</p>
      </section>
    );
  }

  if (!children) {
    console.error('Card component: children is required');
    return (
      <section class="bg-white rounded-lg shadow-md max-w-96 p-6 my-4 mx-auto border border-gray-200">
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
        <p class="text-gray-600">No content available</p>
      </section>
    );
  }

  return (
    <section
      class="bg-white rounded-lg shadow-md max-w-96 p-6 my-4 mx-auto border border-gray-200"
      role="region"
      aria-labelledby="card-title"
    >
      <div class="mb-4">
        <h2 id="card-title" class="text-xl font-semibold text-gray-800">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
};
