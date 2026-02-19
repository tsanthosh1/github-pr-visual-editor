/**
 * GitHub PR Visual Editor - Content Script
 * Makes GitHub's Preview mode editable - click checkboxes, edit text inline
 * Only works during active editing (not on submitted comments)
 */

(function () {
  'use strict';

  const CONFIG = { syncDelay: 300 };

  // Track individual child elements that have been enhanced
  let enhancedCheckboxes = new WeakSet();
  let enhancedEditables = new WeakSet();
  let addedEditButtons = new WeakSet();
  let labeledPreviewTabs = new WeakSet();

  // ─── Bootstrap ───────────────────────────────────────────────

  function init() {
    console.log('[GH Visual Editor] Initializing...');
    setupGlobalKeyboardInterceptor();

    // Watch for DOM changes
    const observer = new MutationObserver(onDOMMutation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'aria-selected', 'open'],
    });

    // Initial scan + periodic fallback every 1.5s
    scan();
    setInterval(scan, 1500);
  }

  let _scanScheduled = false;
  function scheduleScan() {
    if (_scanScheduled) return;
    _scanScheduled = true;
    requestAnimationFrame(() => {
      _scanScheduled = false;
      scan();
    });
  }

  function onDOMMutation(mutations) {
    for (const m of mutations) {
      if (m.type === 'childList') {
        const target = m.target;
        if (target.closest?.('.preview-content') ||
            target.closest?.('.js-previewable-comment-form') ||
            target.classList?.contains('timeline-comment') ||
            target.closest?.('.timeline-comment')) {
          scheduleScan();
          return;
        }
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scheduleScan();
            return;
          }
        }
      }
      if (m.type === 'attributes') {
        const target = m.target;
        if (target.classList?.contains('js-previewable-comment-form') ||
            target.classList?.contains('preview-tab') ||
            target.classList?.contains('js-preview-tab') ||
            target.classList?.contains('preview-content') ||
            target.classList?.contains('details-overlay')) {
          scheduleScan();
          return;
        }
      }
    }
  }

  function scan() {
    enhanceAllPreviews();
    addEditButtons();
  }

  // ─── Edit Buttons ────────────────────────────────────────────

  function addEditButtons() {
    // Use 'editable-comment' class - present on page load, no lazy loading needed
    const comments = document.querySelectorAll('.editable-comment, .current-user.timeline-comment');

    comments.forEach(comment => {
      if (addedEditButtons.has(comment)) return;

      const header = comment.querySelector('.timeline-comment-header');
      if (!header) return;
      if (header.querySelector('.gh-ve-edit-btn')) return;

      const actionsContainer = header.querySelector('.timeline-comment-actions');
      if (!actionsContainer) return;

      addedEditButtons.add(comment);

      const editBtn = document.createElement('button');
      editBtn.className = 'gh-ve-edit-btn timeline-comment-action Link--secondary Button--link Button--medium Button';
      editBtn.type = 'button';
      editBtn.title = 'Visual Edit';
      editBtn.innerHTML = `
        <span class="Button-content">
          <span class="Button-label">
            <svg aria-label="Edit" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-pencil">
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
            </svg>
          </span>
        </span>
      `;

      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerEditAndPreview(comment);
      });

      actionsContainer.insertBefore(editBtn, actionsContainer.firstChild);
    });
  }

  /**
   * Trigger edit mode by opening the "..." dropdown to load the Edit button,
   * then clicking it, then switching to Preview
   */
  function triggerEditAndPreview(comment) {
    // Check if already in edit mode
    if (comment.classList.contains('is-comment-editing')) {
      // Already editing - just switch to preview
      const editForm = comment.querySelector('.js-previewable-comment-form');
      if (editForm) {
        clickPreviewTab(editForm);
      }
      return;
    }

    // First try: edit button might already be loaded
    const existingEditBtn = comment.querySelector('.js-comment-edit-button');
    if (existingEditBtn) {
      existingEditBtn.click();
      waitForEditFormAndPreview(comment);
      return;
    }

    // Need to open the dropdown to lazy-load the edit button
    const detailsElement = comment.querySelector('.timeline-comment-actions details.details-overlay');
    if (!detailsElement) return;

    // Open dropdown to trigger include-fragment loading
    detailsElement.setAttribute('open', '');

    // Wait for the edit button to appear
    waitForElement(
      () => comment.querySelector('.js-comment-edit-button'),
      (editBtnInMenu) => {
        // Close the dropdown
        detailsElement.removeAttribute('open');
        // Click edit
        editBtnInMenu.click();
        // Then switch to preview
        waitForEditFormAndPreview(comment);
      },
      30, 100 // 30 retries x 100ms = 3s max
    );
  }

  function clickPreviewTab(editForm) {
    const previewTab = editForm.querySelector('.preview-tab, .js-preview-tab');
    if (!previewTab) return;
    const isSelected = previewTab.classList.contains('selected') ||
                       previewTab.getAttribute('aria-selected') === 'true';
    if (!isSelected) {
      previewTab.click();
    }
  }

  function waitForEditFormAndPreview(comment) {
    waitForElement(
      () => comment.querySelector('.js-previewable-comment-form'),
      (editForm) => {
        clickPreviewTab(editForm);
        // Wait for preview content to render
        waitForElement(
          () => {
            const body = editForm.querySelector('.js-preview-body');
            return (body && body.children.length > 0) ? body : null;
          },
          (previewBody) => {
            const textarea = editForm.querySelector('textarea.js-comment-field, textarea[name*="body"]');
            if (textarea) {
              makePreviewEditable(previewBody, textarea);
            }
          },
          30, 150
        );
      },
      30, 150
    );
  }

  /**
   * Generic retry helper: call finder() until it returns truthy, then call callback
   */
  function waitForElement(finder, callback, retries = 20, interval = 150) {
    const result = finder();
    if (result) {
      callback(result);
    } else if (retries > 0) {
      setTimeout(() => waitForElement(finder, callback, retries - 1, interval), interval);
    }
  }

  // ─── Preview Enhancement ─────────────────────────────────────

  function enhanceAllPreviews() {
    // Restore labels on forms that left preview mode
    document.querySelectorAll('.js-previewable-comment-form').forEach(editForm => {
      const isPreviewMode =
        editForm.classList.contains('preview-selected') ||
        editForm.querySelector('.preview-tab.selected, .js-preview-tab[aria-selected="true"]');
      if (!isPreviewMode) restorePreviewTabLabel(editForm);
    });

    const previewBodies = document.querySelectorAll('.js-preview-body');

    previewBodies.forEach(previewBody => {
      if (previewBody.children.length === 0) return;

      const editForm = previewBody.closest('.js-previewable-comment-form');
      if (!editForm) return;

      const isPreviewMode =
        editForm.classList.contains('preview-selected') ||
        editForm.querySelector('.preview-tab.selected, .js-preview-tab[aria-selected="true"]');
      if (!isPreviewMode) return;

      const textarea = editForm.querySelector('textarea.js-comment-field, textarea[name*="body"]');
      if (!textarea) return;

      // Always call makePreviewEditable - child WeakSets prevent double-processing
      makePreviewEditable(previewBody, textarea);
    });
  }

  function makePreviewEditable(previewBody, textarea) {
    previewBody.classList.add('gh-ve-enhanced-preview');
    enhanceCheckboxes(previewBody, textarea);
    enhanceTextContent(previewBody, textarea);

    // Label the preview tab to indicate editability
    const editForm = previewBody.closest('.js-previewable-comment-form');
    if (editForm) {
      labelPreviewTab(editForm);
      interceptFormSubmit(editForm, textarea);
    }
  }

  /**
   * Intercept form submission to flush any pending content-editable syncs
   */
  let interceptedForms = new WeakSet();
  function interceptFormSubmit(editForm, textarea) {
    const form = editForm.closest('form');
    if (!form || interceptedForms.has(form)) return;
    interceptedForms.add(form);

    // Capture phase: flush pending syncs before GitHub processes the submit
    form.addEventListener('submit', () => {
      console.log('[GH Visual Editor] Form submit intercepted, flushing syncs...');
      flushAllPendingSyncs(editForm, textarea);
      console.log('[GH Visual Editor] Textarea value at submit:', textarea.value.substring(0, 200));
    }, true);

    // Also catch clicks on submit buttons (some GitHub flows don't fire 'submit')
    form.querySelectorAll('button[type="submit"], .js-comment-submit-button').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('[GH Visual Editor] Submit button clicked, flushing syncs...');
        flushAllPendingSyncs(editForm, textarea);
      }, true);
    });
  }

  /**
   * Immediately sync all contenteditable elements that have pending changes
   */
  function flushAllPendingSyncs(editForm, textarea) {
    const editables = editForm.querySelectorAll('.gh-ve-editable');
    editables.forEach(el => {
      const originalText = el.dataset.originalText;
      const newText = el.textContent.trim();
      if (originalText && originalText !== newText) {
        syncToMarkdown(el, textarea);
      }
    });
  }

  /**
   * Append a pencil icon to the Preview tab to signal it's editable
   */
  function labelPreviewTab(editForm) {
    const previewTab = editForm.querySelector('.preview-tab, .js-preview-tab');
    if (!previewTab || labeledPreviewTabs.has(previewTab)) return;
    labeledPreviewTabs.add(previewTab);

    // Store original text so we can restore later
    previewTab.dataset.ghVeOriginalText = previewTab.textContent.trim();

    // Append pencil icon
    const pencil = document.createElement('span');
    pencil.className = 'gh-ve-tab-indicator';
    pencil.setAttribute('aria-hidden', 'true');
    pencil.innerHTML = ' ✏️';
    previewTab.appendChild(pencil);
  }

  /**
   * Restore the Preview tab label when the form leaves preview mode
   */
  function restorePreviewTabLabel(editForm) {
    const previewTab = editForm.querySelector('.preview-tab, .js-preview-tab');
    if (!previewTab || !labeledPreviewTabs.has(previewTab)) return;

    const indicator = previewTab.querySelector('.gh-ve-tab-indicator');
    if (indicator) indicator.remove();
    labeledPreviewTabs.delete(previewTab);
  }

  // ─── Checkboxes ──────────────────────────────────────────────

  function enhanceCheckboxes(container, textarea) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');

    checkboxes.forEach((checkbox, index) => {
      if (enhancedCheckboxes.has(checkbox)) return;
      enhancedCheckboxes.add(checkbox);

      checkbox.removeAttribute('disabled');
      checkbox.style.cursor = 'pointer';
      checkbox.style.pointerEvents = 'auto';

      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        updateCheckboxInMarkdown(textarea, index, checkbox.checked);
      });
      checkbox.addEventListener('click', (e) => e.stopPropagation());
    });
  }

  function updateCheckboxInMarkdown(textarea, checkboxIndex, checked) {
    const lines = textarea.value.split('\n');
    let current = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*[-*]\s+)\[([ xX])\](\s*.*)$/);
      if (match) {
        if (current === checkboxIndex) {
          lines[i] = `${match[1]}[${checked ? 'x' : ' '}]${match[3]}`;
          updateTextarea(textarea, lines.join('\n'));
          return;
        }
        current++;
      }
    }
  }

  // ─── Editable Text ──────────────────────────────────────────

  function enhanceTextContent(container, textarea) {
    const elements = container.querySelectorAll('p, li:not(.task-list-item), h1, h2, h3, h4, h5, h6');

    elements.forEach((el) => {
      if (enhancedEditables.has(el)) return;
      enhancedEditables.add(el);

      el.classList.add('gh-ve-editable');
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('role', 'textbox');
      el.setAttribute('tabindex', '0');
      el.dataset.originalText = el.textContent.trim();
      attachEditableListeners(el, textarea);
    });

    container.querySelectorAll('li.task-list-item').forEach((li) => {
      if (enhancedEditables.has(li)) return;
      enhanceTaskListItem(li, textarea);
    });
  }

  function enhanceTaskListItem(li, textarea) {
    enhancedEditables.add(li);

    const checkbox = li.querySelector('input[type="checkbox"]');
    if (!checkbox || li.querySelector('.gh-ve-task-text')) return;

    let textContent = '';
    let node = checkbox.nextSibling;
    const nodesToWrap = [];

    while (node) {
      nodesToWrap.push(node);
      textContent += node.textContent || '';
      node = node.nextSibling;
    }
    if (nodesToWrap.length === 0) return;

    const span = document.createElement('span');
    span.className = 'gh-ve-editable gh-ve-task-text';
    span.setAttribute('contenteditable', 'true');
    span.setAttribute('role', 'textbox');
    span.setAttribute('tabindex', '0');
    span.dataset.originalText = textContent.trim();

    nodesToWrap.forEach(n => span.appendChild(n));
    li.appendChild(span);
    attachEditableListeners(span, textarea);
  }

  // ─── Editable Listeners ──────────────────────────────────────

  function attachEditableListeners(element, textarea) {
    let syncTimeout = null;

    element.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); element.blur(); }
    }, true);
    element.addEventListener('keyup', (e) => e.stopPropagation(), true);
    element.addEventListener('keypress', (e) => e.stopPropagation(), true);

    element.addEventListener('input', () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => syncToMarkdown(element, textarea), CONFIG.syncDelay);
    }, true);

    element.addEventListener('blur', () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncToMarkdown(element, textarea);
    }, true);

    element.addEventListener('paste', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    }, true);
  }

  // ─── Sync Back to Markdown ───────────────────────────────────

  /**
   * Strip common inline markdown formatting so we can compare rendered text
   * to source markdown lines.
   */
  function stripInlineMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
      .replace(/__(.+?)__/g, '$1')          // __bold__
      .replace(/\*(.+?)\*/g, '$1')          // *italic*
      .replace(/_(.+?)_/g, '$1')            // _italic_
      .replace(/~~(.+?)~~/g, '$1')          // ~~strike~~
      .replace(/`([^`]+)`/g, '$1')          // `code`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
      .trim();
  }

  function syncToMarkdown(element, textarea) {
    const originalText = element.dataset.originalText;
    const newText = element.textContent.trim();
    if (!originalText || originalText === newText) return;

    const lines = textarea.value.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      // Try direct match first (plain text, no formatting)
      if (trimmed.includes(originalText)) {
        lines[i] = lines[i].replace(originalText, newText);
        element.dataset.originalText = newText;
        updateTextarea(textarea, lines.join('\n'));
        console.log('[GH Visual Editor] Synced (direct match) line', i);
        return;
      }

      // Try stripped-markdown match (handles **bold**, *italic*, etc.)
      const stripped = stripInlineMarkdown(trimmed);
      if (stripped === originalText || stripped.includes(originalText)) {
        // Find the specific changed substring using diff
        const prefixLen = commonPrefixLen(originalText, newText);
        const suffixLen = commonSuffixLen(originalText, newText, prefixLen);
        const oldSub = originalText.substring(prefixLen, originalText.length - suffixLen);
        const newSub = newText.substring(prefixLen, newText.length - suffixLen);

        if (oldSub && lines[i].includes(oldSub)) {
          // Replace just the changed substring (preserves markdown formatting)
          lines[i] = lines[i].replace(oldSub, newSub);
        } else {
          // Fallback: replace the content portion after any line prefix
          const prefixMatch = lines[i].match(/^(\s*(?:#{1,6}\s+|[-*]\s+(?:\[[xX ]\]\s*)?|>\s*))/);
          const linePrefix = prefixMatch ? prefixMatch[1] : '';
          lines[i] = linePrefix + newText;
        }

        element.dataset.originalText = newText;
        updateTextarea(textarea, lines.join('\n'));
        console.log('[GH Visual Editor] Synced (stripped match) line', i);
        return;
      }
    }

    console.warn('[GH Visual Editor] syncToMarkdown: no match found for:', JSON.stringify(originalText));
  }

  function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function commonSuffixLen(a, b, prefixLen) {
    let i = 0;
    while (i < (a.length - prefixLen) && i < (b.length - prefixLen) &&
           a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  // Use the native setter so GitHub's internal state tracking picks up the change
  const nativeTextAreaSetter =
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;

  function updateTextarea(textarea, value) {
    // Call the native setter to bypass any framework wrappers
    nativeTextAreaSetter.call(textarea, value);

    // Dispatch events that GitHub / frameworks listen for
    textarea.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertReplacementText',
    }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('[GH Visual Editor] Textarea updated, length:', value.length);
  }

  function setupGlobalKeyboardInterceptor() {
    const handler = (e) => {
      const el = document.activeElement;
      if (el && (el.classList.contains('gh-ve-editable') ||
                 el.closest?.('.gh-ve-editable') ||
                 el.closest?.('.gh-ve-enhanced-preview'))) {
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handler, true);
    document.addEventListener('keyup', handler, true);
    document.addEventListener('keypress', handler, true);
  }

  // ─── Start ───────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
