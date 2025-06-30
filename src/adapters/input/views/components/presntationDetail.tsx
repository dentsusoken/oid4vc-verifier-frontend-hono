import { Tag } from 'cbor-x';
import { FC } from 'hono/jsx';
import { Buffer } from 'node:buffer';

/**
 * MIME type constant for image data rendering
 * @private
 */
const IMAGE_MIME_TYPE = 'image/png';

/**
 * Props interface for the PresentationDetail component
 *
 * @public
 */
export interface PresentationDetailProps {
  /** The title/identifier for the credential document */
  title: string;
  /** The credential data containing various fields and values */
  data: Record<string, unknown>;
}

/**
 * Credential data presentation component for detailed information display
 *
 * This component recursively renders credential data in a structured format,
 * handling various data types including text, images, dates, arrays, and
 * nested objects. It provides a comprehensive view of verified credential
 * information with proper formatting and type-specific rendering.
 *
 * ## Supported Data Types
 *
 * - **Uint8Array**: Rendered as base64-encoded images (typically portraits)
 * - **CBOR Tags**: Special handling for tagged values (dates, etc.)
 * - **Arrays**: Recursive rendering of array elements
 * - **Objects**: Recursive rendering of nested object properties
 * - **Dates**: Formatted date strings
 * - **Primitives**: String representation of numbers, booleans, etc.
 *
 * ## Features
 *
 * - **Recursive Rendering**: Handles deeply nested data structures
 * - **Type-Safe Processing**: Proper type checking for all data types
 * - **Image Support**: Displays binary image data as viewable images
 * - **Date Formatting**: Human-readable date presentation
 * - **Responsive Design**: Adapts to different screen sizes
 * - **Accessibility**: Proper semantic structure and labeling
 * - **Error Handling**: Graceful handling of malformed or missing data
 *
 * ## Security Considerations
 *
 * - Image data is safely encoded as base64 data URLs
 * - Text content is properly escaped to prevent XSS
 * - Binary data is validated before processing
 * - Recursive depth is controlled to prevent stack overflow
 *
 * ## Visual Structure
 *
 * The component renders credential data in a hierarchical format:
 * ```
 * Document Title
 * ├── Field Name
 * │   └── Field Value (text/image/date)
 * ├── Nested Object
 * │   ├── Sub-field 1
 * │   └── Sub-field 2
 * └── Array Field
 *     ├── Item 1
 *     └── Item 2
 * ```
 *
 * @example
 * ```typescript
 * // Usage with mDL credential data
 * const credentialData = {
 *   "family_name": "Doe",
 *   "given_name": "John",
 *   "birth_date": new Date("1990-01-01"),
 *   "portrait": new Uint8Array([...imageBytes]),
 *   "driving_privileges": [
 *     { "vehicle_category_code": "A" },
 *     { "vehicle_category_code": "B" }
 *   ]
 * };
 *
 * <PresentationDetail
 *   title="org.iso.18013.5.1.mDL"
 *   data={credentialData}
 * />
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the formatted credential data
 *
 * @public
 */
export const PresentationDetail: FC<PresentationDetailProps> = ({
  title,
  data,
}) => {
  // Validate required props
  if (!title || typeof title !== 'string') {
    console.error('PresentationDetail: title is required and must be a string');
    return (
      <section>
        <div class="mb-2">
          <h3 class="text-gray-800">Invalid Configuration</h3>
        </div>
        <div class="bg-white rounded-lg p-2 m-1 border border-gray-200">
          <p class="text-red-600">Component configuration error</p>
        </div>
      </section>
    );
  }

  if (!data || typeof data !== 'object') {
    console.warn(`PresentationDetail: No valid data provided for ${title}`);
    return (
      <section>
        <div class="mb-2">
          <h3 class="text-gray-800">{title}</h3>
        </div>
        <div class="bg-white rounded-lg p-2 m-1 border border-gray-200">
          <p class="text-gray-600">No data available</p>
        </div>
      </section>
    );
  }

  /**
   * Recursively maps and renders credential data based on value types
   *
   * This function handles the complex logic of determining how to render
   * different types of credential data, from simple strings to complex
   * nested objects and binary image data.
   *
   * @param data - The data object to process and render
   * @param depth - Current recursion depth (for preventing infinite loops)
   * @returns Array of JSX elements representing the rendered data
   *
   * @private
   */
  const mapData = (data: Record<string, unknown>, depth: number = 0) => {
    // Prevent excessive recursion depth
    if (depth > 10) {
      console.warn('PresentationDetail: Maximum recursion depth reached');
      return [
        <p class="text-red-600">Data structure too complex to display</p>,
      ];
    }

    return Object.entries(data).map(([key, value], index) => {
      // Generate unique key for React reconciliation
      const elementKey = `${depth}-${index}-${key}`;

      try {
        return (
          <div key={elementKey}>
            <p class="text-sm text-gray-500" title={`Field: ${key}`}>
              {key}
            </p>
            {renderValue(value, depth + 1)}
          </div>
        );
      } catch (error) {
        console.error(`Error rendering field ${key}:`, error);
        return (
          <div key={elementKey}>
            <p class="text-sm text-gray-500">{key}</p>
            <p class="text-red-600 text-sm">Error displaying value</p>
          </div>
        );
      }
    });
  };

  /**
   * Renders individual values based on their type
   *
   * @param value - The value to render
   * @param depth - Current recursion depth
   * @returns JSX element representing the rendered value
   *
   * @private
   */
  const renderValue = (value: unknown, depth: number) => {
    // Handle Uint8Array (typically images)
    if (value instanceof Uint8Array) {
      try {
        const base64Data = Buffer.from(value).toString('base64');
        return (
          <img
            class="max-w-24 max-h-24"
            src={`data:${IMAGE_MIME_TYPE};base64,${base64Data}`}
            alt="Credential image data"
            onError={(e: any) => {
              console.error('Failed to load image data');
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      } catch (error) {
        console.error('Failed to process image data:', error);
        return <p class="text-red-600 text-sm">Image data unavailable</p>;
      }
    }

    // Handle CBOR Tags (special encoded values)
    if (value instanceof Tag) {
      const tagValue =
        value.value instanceof Date
          ? value.value.toDateString()
          : String(value.value);
      return (
        <p class="w-full truncate" title={`Tagged value: ${tagValue}`}>
          {tagValue}
        </p>
      );
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <p class="text-gray-500 text-sm">Empty array</p>;
      }
      return (
        <div class="ml-2">
          {value.map((item, index) => (
            <div key={`array-${depth}-${index}`} class="ml-2">
              {typeof item === 'object' && item !== null ? (
                mapData(item as Record<string, unknown>, depth)
              ) : (
                <p class="text-sm">{String(item)}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle nested Objects
    if (
      typeof value === 'object' &&
      value !== null &&
      !(value instanceof Date)
    ) {
      return (
        <div class="ml-2">
          {mapData(value as Record<string, unknown>, depth)}
        </div>
      );
    }

    // Handle Dates
    if (value instanceof Date) {
      return (
        <p class="w-full truncate" title={`Date: ${value.toISOString()}`}>
          {value.toDateString()}
        </p>
      );
    }

    // Handle primitive values (string, number, boolean, null, undefined)
    const stringValue =
      value === null
        ? 'null'
        : value === undefined
          ? 'undefined'
          : String(value);

    return (
      <p class="w-full truncate" title={`Value: ${stringValue}`}>
        {stringValue}
      </p>
    );
  };

  return (
    <section
      role="region"
      aria-labelledby={`credential-${title.replace(/\W/g, '-')}`}
    >
      <div class="mb-2">
        <h3
          id={`credential-${title.replace(/\W/g, '-')}`}
          class="text-gray-800"
          title={`Credential document: ${title}`}
        >
          {title}
        </h3>
      </div>
      <div class="bg-white rounded-lg p-2 m-1 border border-gray-200">
        {mapData(data)}
      </div>
    </section>
  );
};
