// src/types/imagekit.d.ts
declare module "imagekit" {
  export interface ServerOptions {
    publicKey: string;
    privateKey: string;
    urlEndpoint: string;
  }

  export default class ImageKit {
    constructor(options: ServerOptions);
    getAuthenticationParameters(): {
      token: string;
      expire: number;
      signature: string;
    };
  }
}
