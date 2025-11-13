// usePreviewUrlWithNonce.ts
import { useSelect } from '@wordpress/data';

interface PreviewUrlState {
  previewUrl: string | null;
  hasNonce: boolean;
  isReady: boolean;
}

export const usePreviewUrlWithNonce = (): PreviewUrlState => {
  return useSelect((selectFn) => {
    const editorStore = selectFn('core/editor') as {
      getEditedPostPreviewLink?: () => string | null;
      isSavingPost?: () => boolean;
      isAutosavingPost?: () => boolean;
      isCleanNewPost?: () => boolean;
    };

    const isSaving = editorStore.isSavingPost?.() ?? false;
    const isAutosaving = editorStore.isAutosavingPost?.() ?? false;
    const isCleanNew = editorStore.isCleanNewPost?.() ?? false;
    const rawUrl = editorStore.getEditedPostPreviewLink?.() ?? null;

    // Only even consider it while we’re not actively saving
    const previewUrl =
      !isSaving && !isAutosaving && !isCleanNew ? rawUrl : null;

    const hasNonce =
      !!previewUrl && /[?&]preview_nonce=([^&]+)/.test(previewUrl);

    return {
      previewUrl: hasNonce ? previewUrl : null,
      hasNonce,
      isReady: !!previewUrl && hasNonce,
    };
  }, []);
};
