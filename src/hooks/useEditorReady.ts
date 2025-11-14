/**
 * Editor readiness hook.
 *
 * Provides a React hook for determining when the block editor is in a
 * ready state for running asynchronous tasks such as accessibility scans.
 * Readiness is based on the presence of a post ID and the absence of
 * pending save or autosave operations for a clean new post.
 *
 * @package WPAccessibilityValidator
 */
import { useSelect } from '@wordpress/data';

/**
 * Result shape for the editor readiness hook.
 *
 * @typedef {Object} EditorReadyState
 * @property {?number} postId  The current post ID, or null if none.
 * @property {boolean} isReady Whether the editor is ready for background tasks.
 */
interface EditorReadyState {
  postId: number | null;
  isReady: boolean;
}

/**
 * Hook for determining editor readiness.
 *
 * Uses the core/editor data store to derive whether the current post and
 * editor are in a state where background tasks can safely run. The editor
 * is considered ready when there is a valid post ID and no save or autosave
 * operations are currently in progress for a clean new post.
 *
 * @since 1.0.0
 *
 * @return {EditorReadyState} The current editor readiness state.
 */
export const useEditorReady = (): EditorReadyState => {
  return useSelect((selectFn) => {
    type CoreEditorStore = {
      getCurrentPostId?: () => number | null;
      isSavingPost?: () => boolean;
      isAutosavingPost?: () => boolean;
      isCleanNewPost?: () => boolean;
    };

    const editorStore = selectFn('core/editor') as CoreEditorStore;

    const postId = editorStore.getCurrentPostId?.() ?? null;
    const isSaving = editorStore.isSavingPost?.() ?? false;
    const isAutosaving = editorStore.isAutosavingPost?.() ?? false;
    const isCleanNew = editorStore.isCleanNewPost?.() ?? false;

    return {
      postId,
      isReady: !!postId && !isSaving && !isAutosaving && !isCleanNew,
    };
  }, []);
};
