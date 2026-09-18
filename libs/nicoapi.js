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

var NicoApi = {
    // niconico.comで生放送するときにアクセスする先のドメイン
    live_base_uri_en: "http://watch.live.niconico.com/api/",
    live_base_uri_jp: "http://watch.live.nicovideo.jp/api/",
    live_base_uri: "",
    base_uri_jp: "http://www.nicovideo.jp/",
    base_uri_en: "http://video.niconico.com/",
    base_uri: "",

    nicoapi_header: {
        "X-Frontend-Id": 6,
        "X-Frontend-Version": 0,
        "X-Niconico-Language": "ja-jp"
    },

    /**
     * fetchを使用してAPIを呼び出す.
     * @param url URL
     * @param postdata POST時のパラメータ配列(&で結合される)
     * @param extra_header 追加ヘッダ
     * @returns {Promise<{ok:boolean, status:number, text:string}>}
     */
    callApi: async function( url, postdata, extra_header ){
        let headers = extra_header ? Object.assign( {}, extra_header ) : {};
        let method = postdata ? "POST" : "GET";
        let body;
        if( postdata ){
            headers["Content-type"] = "application/x-www-form-urlencoded; charset=UTF-8";
            body = postdata.join( "&" );
        }

        try{
            let res = await HttpFetch( method, url, {headers, body} );
            let text = await res.text();
            if( !res.ok ){
                console.log( url + " failed." + res.status );
                return {ok: false, status: res.status, text};
            }
            return {ok: true, status: res.status, text};
        }catch( x ){
            console.log( url + " failed." + x );
            return {ok: false, status: 0, text: ""};
        }
    },

    // ニコニコ動画のAPIトークンを取得する
    getApiToken: async function( url ){
        let result = await this.callApi( url );
        if( !result.ok ) return null;
        try{
            let token = result.text.match( /NicoAPI\.token\s*=\s*\"(.*)\";/ );
            if( !token ){
                token = result.text.match( /NicoAPI\.token\s*=\s*\'(.*)\';/ );
            }
            token = token[1];
            console.log( "Token:" + token );
            return token;
        }catch( x ){
            console.log( x );
            return null;
        }
    },

    getpostkey: async function( thread, block_no, uselc, lang_flag, locale_flag, seat_flag ){
        let url = this.live_base_uri + "getpostkey?thread=" + thread + "&block_no=" + block_no + "&uselc=" + uselc + "&lang_flag=" + lang_flag + "&locale_flag=" + locale_flag + "&seat_flag=" + seat_flag;
        return this.callApi( url );
    },

    /**
     * 動画のサムネイル情報(XML)を取得する.
     * @param video_id
     * @returns {Promise<Document|null>}
     */
    getthumbinfo: async function( video_id ){
        let url = "http://ext.nicovideo.jp/api/getthumbinfo/" + video_id;
        let result = await this.callApi( url );
        if( !result.ok ) return null;
        return new DOMParser().parseFromString( result.text, "text/xml" );
    },

    heartbeat: async function( postdata ){
        let url = this.live_base_uri + "heartbeat";
        return this.callApi( url, postdata );
    },
    getremainpoint: async function(){
        let url = this.live_base_uri + "getremainpoint";
        return this.callApi( url );
    },
    usepoint: async function( postdata ){
        let url = this.live_base_uri + "usepoint";
        return this.callApi( url, postdata );
    },

    /**
     * マイリストのRSS(XML)を取得する.
     * @param mylist_id
     * @returns {Promise<Document|null>}
     */
    mylistRSS: async function( mylist_id ){
        // https://nvapi.nicovideo.jp/v2/mylists/2573798?pageSize=100&page=1&sensitiveContents=mask から取得
        let url = `https://www.nicovideo.jp/mylist/${mylist_id}?rss=2.0&lang=ja-jp&special_chars_decode=1`;
        let result = await this.callApi( url );
        if( !result.ok ) return null;
        return new DOMParser().parseFromString( result.text, "text/xml" );
    },

    /**
     * 自身のマイリストの内容を取得する
     * @param mylist_id
     */
    getMylist: async function( mylist_id ){
        let url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylist_id}?pageSize=500&page=1`;
        return this.callApi( url, null, this.nicoapi_header );
    },

    getMylist_v2: async function( mylist_id ){
        let url = `https://nvapi.nicovideo.jp/v2/mylists/${mylist_id}?pageSize=500&page=1`;
        return this.callApi( url, null, this.nicoapi_header );
    },

    addDeflist: async function( item_id, token, additional_msg ){
        let url = this.base_uri + "api/deflist/add";
        let reqstr = [];
        reqstr[0] = "item_id=" + encodeURIComponent( item_id );
        reqstr[1] = "description=" + encodeURIComponent( additional_msg );
        reqstr[2] = "token=" + encodeURIComponent( token );
        reqstr[3] = "item_type=0";
        return this.callApi( url, reqstr );
    },
    addMylist: async function( item_id, mylist_id, token, additional_msg ){
        let url = this.base_uri + "api/mylist/add";
        let reqstr = [];
        reqstr[0] = "group_id=" + encodeURIComponent( mylist_id );
        reqstr[1] = "item_type=0"; // 0 means video.
        reqstr[2] = "item_id=" + encodeURIComponent( item_id );
        reqstr[3] = "description=" + encodeURIComponent( additional_msg );
        reqstr[4] = "token=" + encodeURIComponent( token );
        return this.callApi( url, reqstr );
    },
    getMylistToken: async function( video_id ){
        let url = this.base_uri + "mylist_add/video/" + video_id;
        return this.callApi( url );
    },

    /**
     * あとで見る（とりあえずマイリスト）に登録してある動画一覧を得る.
     */
    getDeflist: async function(){
        let url = "https://nvapi.nicovideo.jp/v1/users/me/watch-later?sortKey=addedAt&sortOrder=desc&pageSize=500&page=1";
        return this.callApi( url, null, this.nicoapi_header );
    },
    /**
     * マイリストの一覧を得る.
     */
    getmylistgroup: async function(){
        let url = "https://nvapi.nicovideo.jp/v1/users/me/mylists?sampleItemCount=3";
        return this.callApi( url, null, this.nicoapi_header );
    },
    /**
     * マイリストに登録してある動画一覧を得る.
     */
    getmylist: async function( item_id ){
        let url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${item_id}?pageSize=500&page=1`;
        return this.callApi( url, null, this.nicoapi_header );
    },

    /**
     * マイリストからマイリストへコピー
     */
    copymylist: async function( from_id, to_id, ids, token ){
        let url = this.base_uri + "api/mylist/copy";
        let data = [];
        data[0] = "group_id=" + from_id;
        data[1] = "target_group_id=" + to_id;
        data[2] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[3 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },
    /**
     * とりマイからマイリストへコピー
     */
    copydeflist: async function( to_id, ids, token ){
        let url = this.base_uri + "api/deflist/copy";
        let data = [];
        data[0] = "target_group_id=" + to_id;
        data[1] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[2 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },

    /**
     * マイリストからマイリストへ移動
     */
    movemylist: async function( from_id, to_id, ids, token ){
        let url = this.base_uri + "api/mylist/move";
        let data = [];
        data[0] = "group_id=" + from_id;
        data[1] = "target_group_id=" + to_id;
        data[2] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[3 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },
    /**
     * とりマイからマイリストへ移動
     */
    movedeflist: async function( to_id, ids, token ){
        let url = this.base_uri + "api/deflist/move";
        let data = [];
        data[0] = "target_group_id=" + to_id;
        data[1] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[2 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },

    /**
     * マイリストの動画を削除
     */
    deletemylist: async function( from_id, ids, token ){
        let url = this.base_uri + "api/mylist/delete";
        let data = [];
        data[0] = "group_id=" + from_id;
        data[1] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[2 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },
    /**
     * とりマイの動画を削除
     */
    deletedeflist: async function( ids, token ){
        let url = this.base_uri + "api/deflist/delete";
        let data = [];
        data[0] = "token=" + token;
        for( let i = 0; i < ids.length; i++ ){
            data[1 + i] = "id_list[0][]=" + ids[i];
        }
        return this.callApi( url, data );
    },

    getUserMylistPageApiToken: async function(){
        return this.callApi( this.base_uri + "my/mylist" );
    }
};

NicoApi.base_uri = NicoApi.base_uri_jp;
NicoApi.live_base_uri = NicoApi.live_base_uri_jp;
