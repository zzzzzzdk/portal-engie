import { RefObject, useLayoutEffect } from 'react'

const LABELABLE_TAGS = new Set([
  'BUTTON',
  'INPUT',
  'METER',
  'OUTPUT',
  'PROGRESS',
  'SELECT',
  'TEXTAREA',
])

const isLabelableElement = (element: HTMLElement | null) => {
  if (!element) {
    return false
  }

  if (!LABELABLE_TAGS.has(element.tagName)) {
    return false
  }

  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement
    return input.type !== 'hidden'
  }

  return true
}

const sanitizeLabels = (root: HTMLElement | null) => {
  if (!root) {
    return
  }

  const labels = root.querySelectorAll<HTMLLabelElement>('label[for]')
  labels.forEach((label) => {
    const htmlFor = label.getAttribute('for')
    if (!htmlFor) {
      return
    }

    const target = root.querySelector<HTMLElement>(`#${CSS.escape(htmlFor)}`)
      || document.getElementById(htmlFor)

    if (!isLabelableElement(target)) {
      label.removeAttribute('for')
    }
  })
}

const useSanitizeFormLabels = (rootRef?: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const root = rootRef?.current || document.body
    if (!root) {
      return
    }

    sanitizeLabels(root)

    const observer = new MutationObserver(() => {
      sanitizeLabels(root)
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['for', 'id'],
    })

    return () => {
      observer.disconnect()
    }
  })
}

export default useSanitizeFormLabels
