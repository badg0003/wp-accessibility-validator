// src/components/BlockStableIdProvider.tsx
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { createElement, useEffect } from '@wordpress/element';

const ATTRIBUTE_NAME = 'wpavId';

/**
 * Register a hidden wpavId attribute on all blocks and populate it once per instance.
 * This component itself renders nothing; importing it is enough to register the filters.
 */

// 1) Add the attribute to every block type
addFilter(
  'blocks.registerBlockType',
  'wpav/add-id-attribute',
  (settings: any, _name: string) => {
    if (!settings.attributes) {
      settings.attributes = {};
    }

    if (!settings.attributes[ATTRIBUTE_NAME]) {
      settings.attributes[ATTRIBUTE_NAME] = {
        type: 'string',
      };
    }

    return settings;
  }
);

// 2) Populate the attribute once per block instance in the editor
const withBlockId = createHigherOrderComponent(
  (BlockEdit: React.ComponentType<any>) =>
    (props: any) => {
      const { attributes, clientId, setAttributes } = props;
      const currentId = attributes[ATTRIBUTE_NAME];

      useEffect(() => {
        // If the block already has an ID (loaded from content), don't change it.
        if (currentId) {
          return;
        }

        // Simple deterministic ID; you can make this more opaque if you want.
        const newId = `wpav-${clientId}`;

        setAttributes({ [ATTRIBUTE_NAME]: newId });
      }, [currentId, clientId, setAttributes]);

      return <BlockEdit {...props} />;
    },
  'withBlockId'
);

addFilter(
  'editor.BlockEdit',
  'wpav/with-block-id',
  withBlockId
);

/**
 * Non-visual component: importing this file is enough for side effects.
 * You don't actually need to render it anywhere, but we export a no-op
 * component so it fits naturally into your "components" pattern.
 */
export const BlockStableIdProvider: React.FC = () => null;