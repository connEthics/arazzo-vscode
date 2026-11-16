import { RULES } from '@connethics/arazzo-core';

/** Arazzo 1.1.0 specification (rule sections of arazzo-core use its numbering). */
export const SPEC_URL = 'https://spec.openapis.org/arazzo/v1.1.0.html';

/** Section number (1.1.0 numbering) → heading anchor of the published specification. */
const SECTION_ANCHORS: ReadonlyArray<[string, string]> = [
    ['5.8.15', 'payload-replacement-object'],
    ['5.8.14', 'request-body-object'],
    ['5.8.13', 'selector-object'],
    ['5.8.12', 'expression-type-object'],
    ['5.8.11', 'criterion-object'],
    ['5.8.10', 'reusable-object'],
    ['5.8.9', 'components-object'],
    ['5.8.8', 'failure-action-object'],
    ['5.8.7', 'success-action-object'],
    ['5.8.6', 'parameter-object'],
    ['5.8.5', 'step-object'],
    ['5.8.4', 'workflow-object'],
    ['5.8.3', 'source-description-object'],
    ['5.8.2', 'info-object'],
    ['5.8.1', 'arazzo-specification-object'],
    ['5.10', 'specification-extensions'],
    ['5.9', 'runtime-expressions'],
    ['5.1', 'versions'],
];

/**
 * Link to the specification section of a rule (first `§x.y.z` of its
 * `section`), or `undefined` for codes that are not arazzo-core rules.
 */
export function specLinkForRule(code: string): string | undefined {
    const rule = (RULES as Record<string, { section: string } | undefined>)[code];
    if (!rule) {
        return undefined;
    }
    const m = /§\s*(\d+(?:\.\d+)*)/.exec(rule.section);
    if (!m) {
        return SPEC_URL;
    }
    const section = m[1];
    const hit = SECTION_ANCHORS.find(([prefix]) => section === prefix || section.startsWith(prefix + '.'));
    return hit ? `${SPEC_URL}#${hit[1]}` : SPEC_URL;
}
