declare module '*.png';
declare module '*.jpg';
declare module '*.svg';

declare module 'js-client-file-downloader' {
  export class jsFileDownloader {
    static makeJSON: (obj: object, filename: string) => void;
  }
}
