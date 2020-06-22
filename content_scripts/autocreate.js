/*
 Copyright (c) 2020 amano <amano@miku39.jp>

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

let elem = document.querySelector( 'div[class*="___page-title"]' );


//      <label><input type="checkbox" id="play-in-time">枠内に収まるように再生する動画を選択する</label>
let newelem = document.createElement( 'label' );
let inp = document.createElement( 'input' )
inp.setAttribute( 'type', 'checkbox' );
newelem.appendChild( inp );
newelem.appendChild( document.createTextNode( '10秒経過後に放送を開始' ) );
newelem.setAttribute( 'style', 'margin:32px auto 0;' );

elem.parentElement.insertBefore( newelem, elem.nextSibling );

let _timer;

(async () => {
    let result = await browser.storage.local.get( 'autocreate' );
    if( result.autocreate ){
        console.log( 'autocreate enabled.' );
        inp.checked = true;
        _timer = setTimeout( () => {
            document.querySelector( 'button[class*="__submit-button"]' ).click();
        }, 10 * 1000 );
    }else{
        inp.checked = false;
    }

    inp.addEventListener( 'change', ( ev ) => {
        if( inp.checked ){
            console.log( 'autocreate enabled.' );
            browser.storage.local.set( {'autocreate': true} );

            _timer = setTimeout( () => {
                document.querySelector( 'button[class*="__submit-button"]' ).click();
            }, 10 * 1000 );
        }else{
            console.log( 'autocreate disabled.' );
            browser.storage.local.set( {'autocreate': false} );
            clearTimeout( _timer );
        }
    } );

})();

