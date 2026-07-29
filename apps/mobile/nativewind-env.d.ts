/// <reference types="nativewind/types" />

declare module "*.css";

declare module "*.module.css" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
