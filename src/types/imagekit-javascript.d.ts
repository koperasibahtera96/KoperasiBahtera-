// src/types/imagekit-javascript.d.ts
declare module "imagekit-javascript" {
  export interface ClientOptions {
    publicKey: string;
    urlEndpoint: string;
    authenticationEndpoint: string;
  }

  export interface UploadOptions {
    file: File | Blob | string; // bisa File video/gambar, Blob, atau base64
    fileName: string;
    folder?: string;
    useUniqueFileName?: boolean;
    tags?: string[] | string;
  }

  export default class ImageKit {
    constructor(options: ClientOptions);
    upload(
      options: UploadOptions,
      callback: (err: any, result: { url: string }) => void,
      progress?: (evt: any) => void
    ): void;
  }
}
