/**
 * Post save utilities.
 *
 * Provides helpers for saving the current post in the block editor and
 * waiting for save operations to complete before continuing.
 *
 * @package WPAccessibilityValidator
 */
import { select, dispatch, subscribe } from '@wordpress/data';

/**
 * Save the current post and wait for the save to complete.
 *
 * Uses the core/editor data store to check whether the post is dirty, trigger
 * a save operation when needed, and then waits for both saving and autosaving
 * to complete before resolving. If there are no changes, the function resolves
 * immediately without performing any save.
 *
 * A safety timeout is included to avoid hanging indefinitely if the editor
 * save state never settles.
 *
 * @since 1.0.0
 *
 * @return {Promise<void>} Promise that resolves when any pending save
 *                         operations have finished.
 */
export async function savePostAndWait(): Promise<void> {
  const editorSelect = select('core/editor') as any;
  const editorDispatch = dispatch('core/editor') as any;

  // If nothing has changed, no need to save.
  if (!editorSelect?.isEditedPostDirty?.()) {
    return;
  }

  // Trigger a save (will choose autosave/draft/publish as appropriate).
  editorDispatch.savePost();

  // Wait until saving and autosaving are both done, with a safety timeout.
  await new Promise<void>((resolve, reject) => {
    const unsubscribe = subscribe(() => {
      const isSaving = editorSelect?.isSavingPost?.();
      const isAutosaving = editorSelect?.isAutosavingPost?.();

      if (!isSaving && !isAutosaving) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });

    const timeoutId = setTimeout(() => {
      unsubscribe();
      // eslint-disable-next-line no-console
      console.warn(
        'savePostAndWait: timed out waiting for post save to complete.'
      );
      reject(
        new Error(
          'Timed out waiting for the post save operation to complete.'
        )
      );
    }, 30000);
  });
}
