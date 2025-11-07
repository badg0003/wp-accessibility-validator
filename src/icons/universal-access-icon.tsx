import { createElement } from '@wordpress/element';

// Stylized universal access glyph to replace the default checkmark icon.
const universalAccessIcon = (
  <svg width="128" height="128" viewBox="0 0 128 128" role="img">
    <circle fill="#f05a27" cx="64" cy="64" r="64" />
    <path
      fill="#fff"
      d="M24 47.3c4 0 6.7 1.7 8.2 4.3v-3.9H42v27.8h-9.8v-3.9c-1.5 2.5-4.3 4.3-8.2 4.3-6.6 0-11.9-5.4-11.9-14.3S17.3 47.3 24 47.3Zm3.1 8.5c-2.8 0-5.1 2-5.1 5.8s2.3 5.8 5.1 5.8 5.1-2 5.1-5.8-2.3-5.8-5.1-5.8Z"
    />
    <path fill="#fff" d="M50.8 48.3h-5.1v-9.1h15.2v36.3H50.7V48.3Z" />
    <path fill="#fff" d="M69.9 48.3h-5.1v-9.1H80v36.3H69.8V48.3Z" />
    <path
      fill="#fff"
      d="M105.2 47.7h10.7L98.2 88.8H87.6l6.7-14.4-11.4-26.6h10.8l5.9 15.8 5.6-15.8h-.1Z"
    />
    <path fill="#f7ad39" d="M12.2 80.1h72.1v8.6H12.2z" />
  </svg>
);

export default universalAccessIcon;
