import OpenCC from './vendor/opencc/opencc-1.4.2.js';
export const simplified=OpenCC.Converter({from:'tw',to:'cn'});
export const traditional=OpenCC.Converter({from:'cn',to:'tw'});
export const searchFold=text=>simplified(String(text).normalize('NFKC')).toLowerCase();
