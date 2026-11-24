'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const base=__dirname,root=path.resolve(base,'../../..');
const {chromium}=require(path.join(root,'.tools/ui/node_modules/playwright-core'));
const safe={x:1921,y:660,width:1402,height:962};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function png(p){const b=fs.readFileSync(p);if(b.subarray(1,4).toString()!=='PNG')throw Error('Not PNG');return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),bitDepth:b[24],colorType:b[25],bytes:b.length};}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 try{
  for(const locale of ['en-US','ko']){
   const page=await browser.newPage({viewport:{width:5244,height:2950},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(base,'index.html')).href+'?locale='+locale);
   await page.evaluate(()=>window.artworkReady);
   const wordmarkFontLoaded=await page.evaluate(()=>document.fonts.check('700 91px "Space Grotesk"'));
   if(!wordmarkFontLoaded)throw Error('Space Grotesk wordmark font failed to load');
   const screenshotGeometry=await page.locator('#screen').evaluate(img=>{const r=img.getBoundingClientRect();return {naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,displayWidth:r.width,displayHeight:r.height};});
   if(Math.abs(screenshotGeometry.displayWidth/screenshotGeometry.displayHeight-screenshotGeometry.naturalWidth/screenshotGeometry.naturalHeight)>.00001)throw Error('Screenshot aspect ratio changed');
   const core=await page.locator('[data-core]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {name:n.dataset.core,x:r.x,y:r.y,width:r.width,height:r.height};}));
   for(const box of core)if(box.x<safe.x||box.y<safe.y||box.x+box.width>safe.x+safe.width||box.y+box.height>safe.y+safe.height)throw Error('Core artwork outside safe area: '+JSON.stringify(box));
   if(errors.length)throw Error(errors.join('\n'));
   const output=path.join(base,locale+'-universal.png');
   await page.screenshot({path:output,type:'png',omitBackground:false});
   const info=png(output);if(info.width!==5244||info.height!==2950||info.bitDepth!==8||info.colorType!==2)throw Error('Expected opaque 8-bit RGB PNG: '+JSON.stringify(info));
   const crop=path.join(base,'previews',locale+'-safe-crop.png');
   await page.screenshot({path:crop,type:'png',clip:safe,omitBackground:false});
   const previewPage=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
   await previewPage.goto(pathToFileURL(path.join(base,'index.html')).href+'?locale='+locale);
   await previewPage.evaluate(()=>window.artworkReady);
   await previewPage.evaluate(()=>{document.querySelector('.artwork').style.transform='scale('+1600/5244+')';document.querySelector('.artwork').style.transformOrigin='top left';document.documentElement.style.width='1600px';document.documentElement.style.height='900px';document.body.style.width='1600px';document.body.style.height='900px';});
   const preview=path.join(base,'previews',locale+'-preview.png');
   await previewPage.screenshot({path:preview,type:'png',omitBackground:false});
   await previewPage.close();
   const relative=p=>path.relative(root,p);
   results.push({locale,file:relative(output),...info,mode:'RGB',alpha:false,sha256:sha(output),safeArea:safe,coreBounds:core,coreInsideSafeArea:true,sourceScreenshot:relative(path.join(base,'../screenshots',locale,'iphone/01-terminal.jpg')),sourceScreenshotSha256:sha(path.join(base,'../screenshots',locale,'iphone/01-terminal.jpg')),sourceScreenshotUnmodified:true,screenshotGeometry,wordmarkFontLoaded,previews:{full:relative(preview),safeCrop:relative(crop)},jsErrors:errors});
   await page.close();
  }
 }finally{await browser.close();}
 const manifest={schemaVersion:1,createdOn:'2026-11-25',app:'Bibimer',purpose:'Optional App Store universal creative assets: header and search results',specification:'https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications',renderSource:['index.html','artwork.css','background.svg','render.cjs'],brandSource:'android/app/src/main/assets/brand.svg',brandSha256:sha(path.join(root,'android/app/src/main/assets/brand.svg')),wordmarkFont:'android/app/src/main/assets/fonts/SpaceGrotesk-Bold.woff2',fontSha256:sha(path.join(root,'android/app/src/main/assets/fonts/SpaceGrotesk-Bold.woff2')),sourceScreenshots:'Existing App Store iPhone submission captures; no new app capture or build',assets:results};
 fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify(results.map(({locale,width,height,mode,alpha,sha256,coreInsideSafeArea,bytes})=>({locale,width,height,mode,alpha,sha256,coreInsideSafeArea,bytes})),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
