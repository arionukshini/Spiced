declare module "*.css?raw" {
  const css: string;
  export default css;
}

declare const __DEV__: boolean;
declare const __VERSION__: string;
