/*
 Copyright (c) 2017-2018 amano <amano@miku39.jp>

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
// Chrome (MV3 service worker) の場合は importScripts で依存ライブラリを読み込む。
// Firefox (background.scripts) では manifest.json 側で複数ファイルを列挙して読み込む。
if( typeof importScripts === 'function' ){
    importScripts( '../libs/browser-polyfill.js', '../libs/utils.js' );
}

console.log( 'load background script.' );

// MV3 の Service Worker はアイドル時に破棄されるため、
// windowList / liveProp はメモリ変数ではなく browser.storage.session（無ければ storage.local）に保持する。
const sessionStorage = ( browser.storage.session ) ? browser.storage.session : browser.storage.local;

async function getWindowList(){
    let data = await sessionStorage.get( 'windowList' );
    return data.windowList || {};
}

async function setWindowList( windowList ){
    await sessionStorage.set( {windowList: windowList} );
}

async function getLivePropAll(){
    let data = await sessionStorage.get( 'liveProp' );
    return data.liveProp || {};
}

async function setLivePropAll( liveProp ){
    await sessionStorage.set( {liveProp: liveProp} );
}


browser.runtime.onInstalled.addListener( async function(){
    browser.tabs.create( {
        url: "bg/verup.html",
        active: false
    } );
    browser.action.setBadgeText( {
        text: 'NEW'
    } );

    // MV3 の Service Worker は再起動のたびにトップレベルコードを再実行するため、
    // contextMenus の登録は重複エラーを避けて onInstalled 内でのみ行う。
    await browser.contextMenus.removeAll();

    browser.contextMenus.create( {
        id: "menu_open_nicolivehelper_x",
        type: "normal",
        title: "Open New NicoLive Helper",
        contexts: ["all"]
    } );

    browser.contextMenus.create( {
        id: 'menu_copy_video_id',
        type: 'normal',
        title: 'ページ内の動画IDをコピー',
        contexts: ['all'],
        documentUrlPatterns: [
            "*://www.nicovideo.jp/tag/*",
            "*://www.nicovideo.jp/search/*",
            "*://com.nicovideo.jp/video/*",
            "*://www.nicovideo.jp/ranking*"
        ]
    } );
} );


async function OpenWindow( url, lvid ){
    browser.action.setBadgeText( {
        text: ''
    } );

    let mainURL = browser.runtime.getURL( url );
    try{
        let windowInfo = await browser.windows.create( {
            url: mainURL,
            type: "popup",
            width: 640,
            height: 480
        } );
        console.log( `Created window: ${windowInfo.id}` );
        console.log( windowInfo );
        let windowList = await getWindowList();
        windowList[lvid] = windowInfo;
        await setWindowList( windowList );
    }catch( error ){
        console.log( `create window Error: ${error}` );
    }
}

async function OpenNicoLiveHelperX2( request_id ){
    console.log( "Open New NicoLive Helper" );
    let lvid;
    if( request_id ){
        lvid = request_id[1];
    }else{
        lvid = 'lv0';
    }

    let url = "main/main.html";
    if( request_id ){
        url += "?lv=" + lvid;
    }

    let windowList = await getWindowList();
    if( windowList[lvid] ){
        let win_id = windowList[lvid].id;
        try{
            let windowInfo = await browser.windows.get( win_id, {populate: true} );
            let found = false;
            for( let tabInfo of windowInfo.tabs ){
                // console.log( tabInfo.url );
                if( tabInfo.title.indexOf( 'New NicoLive Helper' ) >= 0 ){
                    console.log( `window ${win_id} is already exists.` );
                    browser.windows.update( win_id, {focused: true} );
                    found = true;
                }
            }
            if( !found ){
                await OpenWindow( url, lvid );
            }
        }catch( error ){
            console.log( `get window error: ${error}` );
            await OpenWindow( url, lvid );
        }
    }else{
        await OpenWindow( url, lvid );
    }
}


async function putLiveinfo( request, sender, sendResponse ){
    // console.log( 'received live info.' );
    // console.log( sender );
    // console.log( request );

    let liveinfo = request.liveinfo;
    let lvid = liveinfo.program.nicoliveProgramId;

    let liveProp = await getLivePropAll();
    liveProp["" + lvid] = liveinfo;
    await setLivePropAll( liveProp );
}

async function getLiveInfo( request, sender, sendResponse ){
    console.log( sender );
    console.log( request );
    let lvid = request.request_id;
    let liveProp = await getLivePropAll();
    let info = liveProp["" + lvid];
    return info;
}


function isAvailableInNewLive( request, sender, sendResponse ){
    console.log( sender );
    console.log( request );
    let video_id = request.video_id;
    let url = `http://live2.nicovideo.jp/unama/api/v3/contents/${video_id}`;
    return (async () => {
        console.log( 'checking live available...' );
        try{
            let res = await HttpFetch( 'GET', url );
            if( !res.ok ){
                //let err = JSON.parse( await res.text() );
                return false;
            }
            let data = await res.json();
            return data.data;
        }catch( e ){
            console.log( e );
            return false;
        }
    })();
}


function handleMessage( request, sender, sendResponse ){
    switch( request.cmd ){
    case 'put-liveinfo':
        return putLiveinfo( request, sender, sendResponse );

    case 'get-liveinfo':
        return getLiveInfo( request, sender, sendResponse );

    case 'is-available-live':
        return isAvailableInNewLive( request, sender, sendResponse );

    case 'open-nicolivehelper':
        let lvid = request.request_id;
        OpenNicoLiveHelperX2( [lvid, lvid] );
        break;

    default:
        console.log( request );
        console.log( sender );
        break;
    }
}

browser.runtime.onMessage.addListener( handleMessage );

browser.action.onClicked.addListener( ( tab ) => {
    let request_id = tab.url.match( /nicovideo.jp\/watch\/((lv|co|ch)\d+)/ );
    OpenNicoLiveHelperX2( request_id );
} );

//browser.action.setBadgeText( {text: 'NEW'} );



async function CopyVideoId( tab ){
    let result = await browser.tabs.sendMessage( tab.id, {cmd: 'get-video-id'} );
    console.log( result );

}

browser.contextMenus.onClicked.addListener( ( info, tab ) => {
    console.log( "Item " + info.menuItemId + " clicked " + "in tab " + tab.id );
    let request_id = tab.url.match( /nicovideo.jp\/watch\/((lv|co|ch)\d+)/ );

    switch( info.menuItemId ){
    case 'menu_open_nicolivehelper_x':
        OpenNicoLiveHelperX2( request_id );
        // Notification("Start Live", "Starting a live lv9999999999");
        break;

    case 'menu_copy_video_id':
        CopyVideoId( tab );
        break;
    }
} );

