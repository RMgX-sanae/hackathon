import { computeAccessibleName, getRole, isInaccessible } from 'dom-accessibility-api';

export const accessibleName = element => computeAccessibleName(element, {
  computedStyleSupportsPseudoElements: true,
}).trim();

export function isExposed(element, root) {
  if (!element.isConnected || !root.contains(element) || isInaccessible(element)) return false;
  for (let current = element; current; current = current.parentElement) {
    if (current.hasAttribute('inert') || current.hasAttribute('hidden')) return false;
    if (getComputedStyle(current).contentVisibility === 'hidden') return false;
    if (current.tagName === 'DETAILS' && !current.open) {
      const summary = [...current.children].find(child => child.tagName === 'SUMMARY');
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

// Operation metadata never participates in discovery or missing-name detection.
export function scanButtons(root) {
  return [...root.querySelectorAll('button, [role], input')]
    .filter(element => getRole(element) === 'button' && isExposed(element, root))
    .map(element => {
      const name = accessibleName(element);
      return { element, name, missing: name.length === 0 };
    });
}

// These are candidates, not verified buttons. Do not fabricate a button role.
export function scanCandidates(root) {
  return [...root.querySelectorAll('[onclick], [tabindex], [data-action], [data-demo-action]')]
    .filter(element => !getRole(element) && !element.matches('input,select,textarea,summary,a[href]') &&
      isExposed(element, root) && !element.closest('button,[role="button"]') &&
      (element.hasAttribute('onclick') || (element.tabIndex >= 0 && getComputedStyle(element).cursor === 'pointer')))
    .filter(element => !element.querySelector('button,a[href],input,select,textarea,[role="button"]'))
    .map(element => ({ element, name: accessibleName(element), missing: false, kind: 'candidate' }));
}

export function htmlSnapshot(element) {
  // Cloning is only for serialization. Names are always computed on the live DOM.
  const copy = element.cloneNode(true);
  copy.classList.remove('bv-issue', 'bv-repaired', 'bv-selected');
  if (!copy.className) copy.removeAttribute('class');
  return copy.outerHTML;
}

export function proposedHTML(element, label) {
  const copy = element.cloneNode(true);
  copy.classList.remove('bv-issue', 'bv-repaired', 'bv-selected');
  if (!copy.className) copy.removeAttribute('class');
  copy.setAttribute('aria-label', label.trim());
  return copy.outerHTML;
}
