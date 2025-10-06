/**
 * @fileoverview View components for the OID4VC verifier frontend application
 *
 * This module exports all view components used in the OpenID for Verifiable
 * Credentials (OID4VC) verifier frontend. These components handle the presentation
 * layer of the application, providing user interfaces for credential verification
 * workflows.
 *
 * ## Component Categories
 *
 * - **Page Components**: Complete page layouts (Home, Init, Result, ErrorPage)
 * - **Layout Components**: Structural components (Template)
 * - **UI Components**: Reusable interface elements (Card, PresentationDetail)
 *
 * ## Architecture
 *
 * All components follow consistent patterns:
 * - TypeScript interfaces for props
 * - Comprehensive error handling
 * - Accessibility features
 * - Responsive design
 * - Security considerations
 *
 * @public
 */

export * from './error';
export * from './home';
export * from './init';
export * from './result';
export * from './template';
