export {};

declare global {
  interface Window {
    wpavSettings?: {
      wcagTags?: string[];
      availableWcagTags?: Record<string, string>;
      defaultWcagTags?: string[];
    };
  }
}
