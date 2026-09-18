/*
 Copyright (c) 2017 amano <amano@miku39.jp>

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

var NicoLiveMylist = {
    mylists: [],            // マイリストグループ
    mylist_itemdata: {},    // 動画のマイリスト登録日とマイリストコメント


    /**
     * 指定のマイリスト内の動画IDリストを取得.
     * マイリストコメントも拾って保存する。
     * @param mylist_id
     * @returns {Promise<any>}
     */
    _retrieveVideoIdFromRSS: async function( mylist_id ){
        let xml = await NicoApi.mylistRSS( mylist_id );
        if( !xml ) return [];

        let items = xml.getElementsByTagName( 'item' );
        let videos = [];
        console.log( 'mylist rss items:' + items.length );
        for( let i = 0, item; item = items[i]; i++ ){
            let video_id;
            let description;
            try{
                video_id = item.getElementsByTagName( 'link' )[0].textContent.match( /(sm|nm)\d+|\d{10}/ );
            }catch( x ){
                video_id = "";
            }
            if( video_id ){
                videos.push( video_id[0] );
                try{
                    description = item.getElementsByTagName( 'description' )[0].textContent;
                    description = description.replace( /[\r\n]/mg, '<br>' );
                    description = description.match( /<p class="nico-memo">(.*?)<\/p>/ )[1];
                }catch( x ){
                    description = "";
                }

                let d = new Date( item.getElementsByTagName( 'pubDate' )[0].textContent );
                let dat = {
                    "pubDate": d.getTime() / 1000,  // 登録日 UNIX time
                    "description": description
                };
                this.mylist_itemdata[video_id[0]] = dat;
            }
        }// end for.
        return videos;
    },

    getName: function( mylist_id ){
        for( let i = 0, item; item = this.mylists.mylistgroup[i]; i++ ){
            if( item.id == mylist_id ){
                return item.name;
            }
        }
        return undefined;
    },

    /**
     * とりマイに追加する(本処理)
     * @param video_id 動画ID
     * @param item_id
     * @param token
     * @param additional_msg マイリストコメント
     */
    addDeflistExec: async function( video_id, item_id, token, additional_msg ){
        // 二段階目は取得したトークンを使ってマイリス登録をする.
        let result = await NicoApi.addDeflist( item_id, token, additional_msg );
        if( !result.ok ) return;
        let data = JSON.parse( result.text );
        switch( data.status ){
        case 'ok':
            NicoLiveHelper.showAlert( `${video_id}を"あとで見る"しました` );
            break;
        case 'fail':
            NicoLiveHelper.showAlert( data.error.description );
            break;
        default:
            break;
        }
    },

    /**
     * とりマイに登録する.
     * @param video_id 動画ID
     * @param additional_msg マイリストコメント
     */
    addDeflist: async function( video_id, additional_msg ){
        // 一段階目はトークンを取得する.
        if( !video_id ) return;
        let result = await NicoApi.getMylistToken( video_id );
        if( !result.ok ) return;
        try{
            let token = result.text.match( /NicoAPI\.token\s*=\s*\"(.*)\";/ );
            if( !token ){
                token = result.text.match( /NicoAPI\.token\s*=\s*\'(.*)\';/ );
            }
            let item_id = result.text.match( /item_id\"\s*value=\"(.*)\">/ );
            token = token[1];
            item_id = item_id[1];
            await NicoLiveMylist.addDeflistExec( video_id, item_id, token, additional_msg );
        }catch( x ){
            console.log( x );
            NicoLiveHelper.showAlert( 'あとで見るに追加に失敗しました' );
        }
    },

    /**
     * マイリストに登録する(本処理)
     * @param item_id
     * @param mylist_id マイリストID
     * @param token
     * @param video_id 動画ID
     * @param additional_msg マイリストコメント
     */
    addMyListExec: async function( item_id, mylist_id, token, video_id, additional_msg ){
        // 二段階目は取得したトークンを使ってマイリス登録をする.
        let result = await NicoApi.addMylist( item_id, mylist_id, token, additional_msg );
        if( !result.ok ) return;
        let data = JSON.parse( result.text );
        switch( data.status ){
        case 'ok':
            NicoLiveHelper.showAlert( `${video_id}を「${NicoLiveMylist.getName( mylist_id )}」にマイリストしました` );
            break;
        case 'fail':
            NicoLiveHelper.showAlert( data.error.description );
            break;
        default:
            break;
        }
    },

    /**
     * マイリストに追加する.
     * @param mylist_id マイリストID
     * @param video_id 動画ID
     * @param additional_msg 追加メッセージ
     */
    addMylist: async function( mylist_id, video_id, additional_msg ){
        console.log( `Add mylist: ${mylist_id}, ${video_id}` );

        if( mylist_id == 'default' ){
            this.addDeflist( video_id, additional_msg );
        }else{
            // 一段階目はトークンを取得する.
            let result = await NicoApi.getMylistToken( video_id );
            if( !result.ok ) return;
            try{
                let token = result.text.match( /NicoAPI\.token\s*=\s*\"(.*)\";/ );
                if( !token ){
                    token = result.text.match( /NicoAPI\.token\s*=\s*\'(.*)\';/ );
                }
                let item_id = result.text.match( /item_id\"\s*value=\"(.*)\">/ );
                await NicoLiveMylist.addMyListExec( item_id[1], mylist_id, token[1], video_id, additional_msg );
            }catch( x ){
                console.log( x );
                NicoLiveHelper.showAlert( 'マイリスト追加に失敗しました' );
            }
        }
    },

    processMylistGroup: function(){
        // ストックのマイリストメニューに項目を追加
        let menu = $( '#menu-stock-mylist' );
        for( let i = 0, grp; grp = NicoLiveMylist.mylists.data.mylists[i]; i++ ){
            let a = document.createElement( 'a' );
            a.setAttribute( 'class', 'dropdown-item' );
            a.setAttribute( 'href', '#' );
            a.setAttribute( 'nico_grp_id', grp.id );
            a.appendChild( document.createTextNode( grp.name ) );
            menu.append( a );
        }
    },

    /**
     * マイリストグループを取得してドロップダウンメニューに追加する
     */
    loadMylist: async function(){
        let result = await NicoApi.getmylistgroup();
        if( !result.ok ) return;
        try{
            NicoLiveMylist.mylists = JSON.parse( result.text );
            NicoLiveMylist.processMylistGroup();
        }catch( x ){
            if( NicoLiveMylist.mylists.status == 'fail' ){
                NicoLiveHelper.showAlert( NicoLiveMylist.mylists.error.description );
            }
            return;
        }

        if( NicoLiveMylist.mylists.status == 'fail' ){
            NicoLiveHelper.showAlert( NicoLiveMylist.mylists.error.description );
            return;
        }
    },

    init: function(){
        this.loadMylist();
    },

    destroy: function(){

    }
};


window.addEventListener( "unload", ( ev ) =>{
    NicoLiveMylist.destroy();
} );

