import { useSelect } from '@wordpress/data';
import { WPBlock, WPBlockEditorStore } from 'src/types';

/**
 * Recursively flattens a tree of blocks into a single array of blocks.
 *
 * This allows violations to be mapped back to any nested inner block,
 * not just top-level blocks in the editor.
 *
 * @since 1.0.0
 *
 * @param {WPBlock[]} blocksToFlatten Blocks to flatten.
 * @return {WPBlock[]} All blocks, including nested inner blocks.
 */
const flattenBlocks = (blocksToFlatten: WPBlock[]): WPBlock[] => {
  const all: WPBlock[] = [];

  for (const block of blocksToFlatten) {
    all.push(block);

    if (Array.isArray((block as any).innerBlocks) && block.innerBlocks.length) {
      all.push(...flattenBlocks(block.innerBlocks as WPBlock[]));
    }
  }

  return all;
};

export function useCurrentBlocks() {
  return useSelect(
    (selectFn) =>
      flattenBlocks(
        (selectFn('core/block-editor') as WPBlockEditorStore).getBlocks()
      ),
    []
  );
}
