import { useSelect } from '@wordpress/data';

interface EditorReadyState {
  postId: number | null;
  isReady: boolean;
}

export const useEditorReady = (): EditorReadyState => {
  return useSelect((selectFn) => {
    const editorStore = selectFn('core/editor') as {
      getCurrentPostId?: () => number | null;
      isSavingPost?: () => boolean;
      isAutosavingPost?: () => boolean;
      isCleanNewPost?: () => boolean;
    };

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
