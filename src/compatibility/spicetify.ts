export interface StorageAPI {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface SpicetifyAPI {
  Platform?: {
    History?: {
      location: { pathname: string };
      listen(listener: (location: { pathname: string }) => void): () => void;
    };
  };
  GraphQL?: {
    Definitions?: Record<string, unknown>;
    Request?: (definition: unknown, variables: Record<string, unknown>) => Promise<unknown>;
  };
  Player?: {
    isPlaying(): boolean;
    addEventListener(type: string, callback: () => void): void;
    removeEventListener(type: string, callback: () => void): void;
  };
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
