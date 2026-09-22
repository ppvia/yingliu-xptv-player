import {build} from 'esbuild';
await build({entryPoints:['runtime/extension-worker.js'],bundle:true,outfile:'public/extension-worker.js',format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
