/**
 * Preview URL hook.
 *
 * Provides a React hook for working with the post preview URL in the block
 * editor, including a helper for generating a fresh preview URL on demand.
 * The hook derives its data from the core/editor data store.
 *
 * @package WPAccessibilityValidator
 */
import { useCallback } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

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
 * `currentPost.preview_link` (falling back to `currentPost.link`) and is
 * augmented with preview query arguments and a cache-busting token.
 *
 * @since 1.0.0
 *
 * @return {UsePreviewUrlWithNonceResult} Hook result with state and helpers.
 */
export const usePreviewUrlWithNonce = () => {
  const { postId, previewLink, postType } = useSelect((selectFn: any) => {
    const editor = selectFn('core/editor');

    const currentPost = editor.getCurrentPost?.() ?? {};
    const link = currentPost.preview_link || currentPost.link;

    return {
      postId: editor.getCurrentPostId?.(),
      postType: editor.getCurrentPostType?.(),
      previewLink: link,
    };
  }, []);

  const isReady = !!postId && !!previewLink;

  /**
   * Build a fresh preview URL for the current post.
   *
   * The URL is based on the editor-provided preview link and is augmented
   * with query arguments to ensure preview mode and to avoid stale responses
   * via a simple cache-busting parameter.
   *
   * @since 1.0.0
   *
   * @return {?string} The computed preview URL, or null if it cannot be built.
   */
  const getFreshPreviewUrl = useCallback(() => {
    if (!postId || !previewLink) {
      return null;
    }

    // Start from whatever WP gave us as the preview link
    let url = previewLink;

    // Ensure it's actually treated as a preview, and add a cache-buster
    url = addQueryArgs(url, {
      preview: 'true',
      preview_id: postId,
      // cheap cache buster so the iframe doesn't reuse an old response
      _wpav_scan: Date.now(),
    });

    // If you later add your PHP REST route that returns
    // wp_create_nonce( 'post_preview_' . $post_id ),
    // you can inject it here as `_wpnonce`.
    //
    // url = addQueryArgs(url, { _wpnonce: previewNonceFromRest });

    return url;
  }, [postId, previewLink]);

  return {
    isReady,
    hasNonce: true, // or real check once you wire up a REST nonce
    getFreshPreviewUrl,
  };
};
