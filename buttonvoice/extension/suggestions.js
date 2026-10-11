import { suggestLabel, genericSuggestion } from '../src/suggestions.js';

// Website-supplied strings are shown as text and never executed.
export function suggestPageLabel(element) {
  const fixture = element.closest('[data-demo-page]');
  if (fixture && ['campus', 'shop', 'library', 'volunteer'].includes(fixture.dataset.demoPage)) {
    const suggestion = suggestLabel(element);
    if (suggestion.label) return { ...suggestion, source: '示例页面规则' };
  }
  if (element.closest('#preview.store-preview') && element.id.startsWith('demo-')) {
    const suggestion = suggestLabel(element);
    if (suggestion.label) return { ...suggestion, source: '示例页面规则' };
  }
  return genericSuggestion(element);
}
