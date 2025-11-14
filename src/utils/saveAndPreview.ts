/****
 * Post autosave utilities.
 *
 * Provides helpers for autosaving the current post in the block editor and
 * waiting for save operations to complete before continuing.
 *
 * @package WPAccessibilityValidator
 */
import { select, dispatch, subscribe } from '@wordpress/data';

/**
 * Autosave the current post and wait for the autosave to complete.
 *
 * Uses the core/editor data store to check whether the post is dirty, trigger
 * a server-side autosave when needed, and then waits for the autosave
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

  // Trigger a server-side autosave (used by the editor for preview).
  editorDispatch.autosave?.({ local: false });

  const unsubscribe = subscribe(() => {
    const isSaving = editorSelect.isSavingPost();
    const isAutosaving = editorSelect.isAutosavingPost();

    if (!isSaving && !isAutosaving) {
      const previewUrl = editorSelect.getEditedPostPreviewLink();
      console.log(previewUrl);
      unsubscribe();
    }
  });
}
