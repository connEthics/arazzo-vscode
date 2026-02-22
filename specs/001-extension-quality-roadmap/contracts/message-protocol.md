# Contract: Extension ↔ Webview Message Protocol

**Version**: 1.1 (adds error handling, unchanged existing messages)

## Extension → Webview Messages

### `update`
Push parsed Arazzo spec to the documentation view.
```typescript
{ type: 'update'; spec: ArazzoSpec }
```

### `update-flowchart`
Push parsed Arazzo spec to the flowchart view with optional workflow selection.
```typescript
{ type: 'update-flowchart'; spec: ArazzoSpec; workflowId?: string }
```

### `select-workflow`
Auto-select a workflow based on cursor position in the editor.
```typescript
{ type: 'select-workflow'; workflowId: string }
```

### `scroll-to-step`
Navigate to a specific step in the documentation preview.
```typescript
{ type: 'scroll-to-step'; stepId: string; workflowId: string }
```

## Webview → Extension Messages

### `ready`
Webview signals it is ready to receive data. Also used for retry after error state.
```typescript
{ type: 'ready' }
```

### `step-selected`
User clicked a step in the flowchart; navigate editor to that step.
```typescript
{ type: 'step-selected'; stepId: string; workflowId: string }
```

## Error Handling (new in v1.1)

- If the webview receives a message that cannot be parsed or has an unknown `type`, it transitions to error state.
- If `spec` in `update` or `update-flowchart` is `null`/`undefined`, the webview transitions to error state with message "Failed to load document data".
- Error state clears previous content and shows an inline banner with a Retry button.
- Retry sends `{ type: 'ready' }` to request fresh data from the extension.

## Backward Compatibility

All existing message types remain unchanged. The only addition is webview-side error handling for malformed messages — no extension-side protocol changes required.
