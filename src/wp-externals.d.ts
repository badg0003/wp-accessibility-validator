declare module '@wordpress/plugins' {
  import type { ComponentType, ReactNode } from 'react';

  interface RegisterPluginSettings {
    render: ComponentType;
    icon?: ReactNode;
  }

  export function registerPlugin(
    name: string,
    settings: RegisterPluginSettings
  ): void;
}

declare module '@wordpress/edit-post' {
  import type { ComponentType } from 'react';

  export const PluginSidebar: ComponentType<Record<string, unknown>>;
  export const PluginSidebarMoreMenuItem: ComponentType<
    Record<string, unknown>
  >;
  export const PluginPrePublishPanel: ComponentType<Record<string, unknown>>;
}

declare module '@wordpress/editor' {
  import type { ComponentType } from 'react';

  export const PluginDocumentSettingPanel: ComponentType<
    Record<string, unknown>
  >;
  export const PluginPostStatusInfo: ComponentType<Record<string, unknown>>;
  export const PluginPrePublishPanel: ComponentType<Record<string, unknown>>;
  export const store: unknown;
}

declare module '@wordpress/block-editor' {
  import type { ComponentType, ReactNode } from 'react';

  interface BlockControlsProps {
    group?: string;
    children?: ReactNode;
  }

  export const BlockControls: ComponentType<BlockControlsProps>;
}

declare module '@wordpress/editor/store/selectors' {
  // Minimal selector surface you need right now. Extend as required.
  export function getCurrentPostId(): number | string | null;
  export function getEditedPostAttribute<T = unknown>(
    attribute: string
  ): T;
}
