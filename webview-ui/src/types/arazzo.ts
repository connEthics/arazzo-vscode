// ═══════════════════════════════════════════════════════════════════════════════
// Arazzo Specification Types (1.0.x and 1.1.x)
//
// Single source of truth: @connethics/arazzo-core, vendored in
// ../vendor/@connethics/arazzo-core (see VENDOR.json). Type-only re-export:
// nothing of core is bundled into the webview by this module.
// https://spec.openapis.org/arazzo/v1.1.0.html
// ═══════════════════════════════════════════════════════════════════════════════

export type * from '@connethics/arazzo-core';

import type {
  LegacyFailureAction,
  LegacySourceDescription,
  LegacySuccessAction,
  OutputValue,
  ReusableObject,
} from '@connethics/arazzo-core';

// The documentation view still renders a few non-specification fields found
// in documents in the wild (`description` on a source, `outputs` on an
// action); the validator reports them as `arazzo-unknown-field`. These local
// aliases take precedence over the star re-export above.
export type SourceDescription = LegacySourceDescription;
export type SuccessAction = LegacySuccessAction;
export type FailureAction = LegacyFailureAction;

/**
 * Type guard to check if an object is a ReusableObject (same test as
 * arazzo-core, kept local so that the webview does not bundle core).
 */
export function isReusableObject(obj: unknown): obj is ReusableObject {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
    && typeof (obj as { reference?: unknown }).reference === 'string';
}

/**
 * Text form of outputs: runtime expressions as is, Arazzo 1.1 Selector
 * Objects as `<context> → <selector> (<type>)`.
 */
export function outputsAsText(outputs: Record<string, OutputValue> | undefined): Record<string, string> | undefined {
  if (!outputs) return undefined;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(outputs)) {
    if (typeof value === 'string') {
      out[name] = value;
    } else if (value && typeof value === 'object') {
      const type = typeof value.type === 'string' ? value.type : `${value.type.type} ${value.type.version}`;
      out[name] = `${value.context} → ${value.selector} (${type})`;
    } else {
      out[name] = String(value);
    }
  }
  return out;
}
