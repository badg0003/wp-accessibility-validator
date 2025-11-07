/**
 * External dependencies
 */
import axe from 'axe-core';

/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginMoreMenuItem } from '@wordpress/editor';
import { select } from '@wordpress/data';
import { serialize } from '@wordpress/blocks';
import { Icon, check } from '@wordpress/icons';

// Define a custom type for our violation to include the block name.
interface ViolationWithContext extends axe.Result {
  blockName?: string;
}

/**
 * Runs an accessibility scan using client-side rendered HTML.
 */
async function runClientSideScan() {
  console.clear();
  console.log(
    '%cStarting client-side accessibility scan...',
    'color: blue; font-weight: bold;'
  );

  const blocks = select('core/block-editor').getBlocks();
  const allViolations: ViolationWithContext[] = [];

  for (const block of blocks) {
    console.group(`Scanning block: "${block.name}"`);

    const renderedHtml = serialize([block]);

    if (
      renderedHtml.trim().length === 0 ||
      renderedHtml.startsWith('<!-- wp:latest-posts')
    ) {
      console.log('Skipping: This is a dynamic block or is empty.');
      console.groupEnd();
      continue;
    }

    // Create an element and position it off-screen instead of using `hidden`.
    // This makes it visually hidden but still available to accessibility tools like Axe.
    const temporaryElement = document.createElement('div');
    Object.assign(temporaryElement.style, {
      position: 'absolute',
      left: '-10000px',
      top: 'auto',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });
    temporaryElement.innerHTML = renderedHtml;
    document.body.appendChild(temporaryElement);

    try {
      // Run the scan on the off-screen element.
      const axeResults = await axe.run(temporaryElement, {
        resultTypes: ['violations'], // Optimization: only ask for what we need.
      });

      if (axeResults.violations.length > 0) {
        console.log(
          `%cFound ${axeResults.violations.length} violations.`,
          'color: red;'
        );
        const violationsWithContext = axeResults.violations.map(
          (violation) => ({
            ...violation,
            blockName: block.name,
          })
        );
        allViolations.push(...violationsWithContext);
      } else {
        console.log('%cNo violations found.', 'color: green;');
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No elements found')
      ) {
        console.log('Skipping: Block contains no testable HTML elements.');
      } else {
        console.error(
          'An unexpected error occurred during Axe scan for this block:',
          error
        );
      }
    } finally {
      // Always clean up the element.
      document.body.removeChild(temporaryElement);
    }
    console.groupEnd();
  }

  displayResults(allViolations);
}

/**
 * Displays the final list of violations in the browser console and via an alert.
 */
function displayResults(violations: ViolationWithContext[]) {
  console.log('--------------------');
  if (violations.length === 0) {
    console.log(
      '%c✅ Final Result: No accessibility violations found in static blocks.',
      'color: green; font-weight: bold;'
    );
    return;
  }

  console.group(
    `%c❌ Final Result: Found ${violations.length} total violation(s) in static blocks.`,
    'color: red; font-weight: bold;'
  );
  violations.forEach((violation) => {
    console.groupCollapsed(
      `Error: "${violation.help}" in block: ${violation.blockName}`
    );
    console.warn('Description:', violation.description);
    console.warn('Impact:', violation.impact);
    console.warn('Help URL:', violation.helpUrl);
    console.warn(
      'HTML Element(s):',
      violation.nodes.map((n) => n.html).join(', ')
    );
    console.groupEnd();
  });
  console.groupEnd();

  alert(
    `Accessibility scan complete. Found ${violations.length} violation(s). Check the browser console for details.`
  );
}

/**
 * The main React component that adds the menu item.
 */
const AccessibilityCheckerMenuItem = () => (
  <PluginMoreMenuItem icon={<Icon icon={check} />} onClick={runClientSideScan}>
    Check Accessibility
  </PluginMoreMenuItem>
);

// Register the plugin with WordPress.
registerPlugin('wp-accessibility-validator', {
  render: AccessibilityCheckerMenuItem,
});
