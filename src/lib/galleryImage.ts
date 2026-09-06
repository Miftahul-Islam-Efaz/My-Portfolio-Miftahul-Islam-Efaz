import {driveFileId,driveImage} from './driveImage';

/** Ask Drive for the visible resolution, not the full original for every card.
 * No crop suffix or forced JPEG: proportions and transparency stay intact.
 * Other image hosts continue to use their supplied thumbnail unchanged. */
export function galleryImage(source: string, compact: boolean) {
 const id=driveFileId(source);
 if(!id)return {src:driveImage(source)};
 const url=(width:number)=>`/api/drive-image?id=${id}&opt=w${width}`;
 return {
  src:url(768),
  srcSet:[320,480,768,1024,1440].map(width=>`${url(width)} ${width}w`).join(', '),
  sizes:compact
   ? '(max-width: 560px) calc((100vw - 36px) / 2), (max-width: 1000px) 31vw, (min-width: 1600px) 296px, 19vw'
   : '(max-width: 560px) calc(100vw - 24px), (max-width: 1000px) 47vw, (min-width: 1600px) 499px, 32vw',
 };
}
