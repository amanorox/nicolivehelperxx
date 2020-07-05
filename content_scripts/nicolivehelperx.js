/*
 Copyright (c) 2018 amano <amano@miku39.jp>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

console.log( 'load content-script.' );

// document.body.style.border = "5px solid blue";

let data = {};
data = JSON.parse( document.querySelector( '#embedded-data' ).getAttribute( 'data-props' ) );
data._type = 'html5';
console.log( `html5 nicolive player detected.` );
console.log( data );

// アドオンをリロードしたときにbackground-scriptのロードより先に来てしまうので適当に待つ
setTimeout( () => {
    let sending = browser.runtime.sendMessage( {
        cmd: 'put-liveinfo',
        liveinfo: data
    } );

    sending.then( ( success ) => {
    }, ( failed ) => {
        console.log( failed );
    } );
}, 100 );


(async () => {
    let result = await browser.storage.local.get( 'config' );
    console.log( 'Config loaded' );
    console.log( result.config );

    if( result.config['auto-extend'] ){
        setTimeout( () => {
            let auto_extend_button = document.querySelector( 'button[aria-label="現在OFF"]' );
            if( auto_extend_button ) auto_extend_button.click();
        }, 2000 );
    }

    let start_button = document.querySelector( 'button[class*="__button"][value="番組開始"]' );
    if( start_button ){
        start_button.addEventListener( 'click', ( ev ) => {
            console.log( 'start button clicked' );
        } );
    }
    if( result.config['auto-start'] ){
        // 放送開始ボタン
        setTimeout( () => {
            if( start_button ) start_button.click();
        }, 2000 );
    }

    if( result.config['auto-open'] ){
        setTimeout( () => {
            let lvid = data.program.nicoliveProgramId;
            let sending = browser.runtime.sendMessage( {
                cmd: 'open-nicolivehelper',
                request_id: lvid
            } );
        }, 1000 );
    }
})();


// DOMの変更監視して再生された動画を得る
const callback = function( mutationsList, observer ){
    // Use traditional 'for loops' for IE 11
    for( let mutation of mutationsList ){
        if( mutation.type === 'childList' ){
            for( let node of mutation.addedNodes ){
                let img = node.querySelector( 'img' );
                if( img.src.match( /nicovideo.cdn.nimg.jp\/thumbnails\/\d+\/(\d+)/ ) ){
                    let vid = RegExp.$1;
                    console.log( `sm${vid}` );
                    let sending = browser.runtime.sendMessage( {
                        cmd: 'playvideo',
                        video_id: vid,
                        lvid: data.program.nicoliveProgramId
                    } );
                    sending.then( ( success ) => {
                    }, ( failed ) => {
                        console.log( failed );
                    } );
                }
            }
        }
    }
};
const observer = new MutationObserver( callback );

// div.class = ___lock-item-area___2VlUz

const config = {attributes: false, childList: true, subtree: true};
let elem = document.querySelector( 'div[class*="___lock-item-area"]' )
observer.observe( elem, config );
