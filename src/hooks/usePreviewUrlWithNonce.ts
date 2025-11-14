/**
 * Preview URL hook.
 *
 * Provides a React hook for working with the post preview URL in the block
 * editor. The hook uses the preview URL provided by WordPress core and
 * exposes readiness flags plus a helper for retrieving the latest URL on
 * demand.
 *
 * @package WPAccessibilityValidator
 */
import { useCallback, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * Result shape for the preview URL hook.
 *
 * @typedef {Object} UsePreviewUrlWithNonceResult
 * @property {boolean}  isReady             Whether a preview URL is currently available.
 * @property {boolean}  hasNonce            Whether the preview URL includes a nonce.
 * @property {Function} getFreshPreviewUrl  Function that returns a fresh preview URL
 *                                          for the current post, or null if one
 *                                          cannot be generated.
 */

/**
 * Hook for working with the editor preview URL.
 *
 * Exposes readiness flags and a helper for generating a fresh preview URL
 * for the current post. The preview URL is derived from the editor's
 * `getEditedPostPreviewLink()` (falling back to `currentPost.preview_link` and `currentPost.link`) and is
 * used exactly as WordPress provides it.
 *
 * @since 1.0.0
 *
 * @return {UsePreviewUrlWithNonceResult} Hook result with state and helpers.
 */
export const usePreviewUrlWithNonce = () => {
  const { postId, previewLink, postType } = useSelect((selectFn: any) => {
    const editor = selectFn('core/editor');

    const currentPost = editor.getCurrentPost?.() ?? {};
    const editedPreviewLink = editor.getEditedPostPreviewLink?.();

    const link =
      editedPreviewLink || currentPost.preview_link || currentPost.link || null;

    return {
      postId: editor.getCurrentPostId?.() ?? null,
      postType: editor.getCurrentPostType?.() ?? null,
      previewLink: link,
    };
  }, []);

  const isReady = !!postId && !!previewLink;

  const hasNonce = useMemo(() => {
    if (!previewLink || typeof previewLink !== 'string') {
      return false;
    }

    // Cheap check to see if WordPress has included a preview nonce parameter.
    return previewLink.includes('preview_nonce=');
  }, [previewLink]);

  /**
   * Retrieve the latest preview URL for the current post.
   *
   * The URL is taken directly from WordPress core (via the editor data store)
   * without adding custom query parameters. If a preview URL is not currently
   * available, null is returned.
   *
   * @since 1.0.0
   *
   * @return {?string} The current preview URL, or null if it cannot be built.
   */
  const getFreshPreviewUrl = useCallback(() => {
    if (!postId || !previewLink) {
      return null;
    }

    return previewLink;
  }, [postId, previewLink]);

  return {
    isReady,
    hasNonce,
    getFreshPreviewUrl,
  };
};
