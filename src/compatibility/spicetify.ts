export interface StorageAPI {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface SpicetifyAPI {
  LocalStorage?: StorageAPI;
  Menu?: {
    Item: new (name: string, checked: boolean, onClick: () => void, icon?: string) => {
      register(): void;
      deregister(): void;
    };
  };
  PopupModal?: {
    display(options: { title: string; content: Element; isLarge?: boolean }): void;
    hide(): void;
  };
  showNotification?: (message: string, isError?: boolean) => void;
}

export function getSpicetify(): SpicetifyAPI | undefined {
  return (globalThis as typeof globalThis & { Spicetify?: SpicetifyAPI }).Spicetify;
}

export function hasSettingsAPI(api: SpicetifyAPI | undefined): api is SpicetifyAPI {
  return typeof api?.Menu?.Item === "function" && typeof api?.PopupModal?.display === "function";
}
