declare module '*?raw' {
  const text: string;
  export default text;
}
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module 'elkjs/lib/elk-api.js' {
  import ELK from 'elkjs/lib/elk-api';
  export default ELK;
}
