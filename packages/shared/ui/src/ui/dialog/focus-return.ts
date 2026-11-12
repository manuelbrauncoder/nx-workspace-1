/**
 * Where the focus goes back to when a dialog closes. Usually the element that opened it. A menu
 * item does not survive: the menu closes and takes the item with it, the focus would land on the
 * body. Then the trigger of that menu takes it.
 */
export function focusReturnTarget(document: Document): HTMLElement | true {
  const menu = document.activeElement?.closest('[role="menu"]');
  const trigger = menu?.id
    ? document.querySelector<HTMLElement>(`[aria-controls="${menu.id}"]`)
    : null;
  return trigger ?? true;
}
