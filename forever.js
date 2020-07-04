/////////////////////////////////////////////////////////////////////////////////////////////
// [メモ]
// category情報
//   event情報
//     category2の情報は (category1 << 16) + displayID の値
//   categoryMap
//     category2の情報は (category1 << 16) + displayID の値
//   表示のvalue
//     category2の情報は (category1 << 16) + displayID の値
// note情報
//   event情報
//     category2の情報は (category1 << 16) + displayID の値
//   dataMap
//     category2の情報は (category1 << 16) + displayID の値
//   json
//     category2の情報は displayID
//   
/////////////////////////////////////////////////////////////////////////////////////////////

// 全文検索用インデックス
var elasticIndex;

// 全文検索用インデックスを作成
function createSearchIndex(dataMap) {
    elasticIndex = createIndex();

    dataMap.forEach(function(obj, ctime) {
        if (obj.type == "delete") {
          return;
        }

        var displayID = Number(obj.category2) - (Number(obj.category1) << 16);

        // ドキュメント追加
        elasticIndex.addDoc({
            "id": ctime,
            "title": obj.title,
            "body": obj.data
        });
    });
}

/* 絞り込み全文検索ボタンが押されたときの処理 */
function searchNoteElastic() {
    $("#elasticNoteList").empty();
    if (elasticIndex == null) {
        return;
    }

    // 部分一致を含めて検索
    var text = $("#elasticText").val();
    const result = elasticIndex.search(text, {
        fields: {
            title: {boost: 1},
            body: {boost: 1},
        },
        expand: true,
    });

    // 検索結果を表示
    for(var i=0; i<result.length; i++) {
	var ctime = Number(result[i].ref);
	var obj = dataMap.get(ctime);

        if (obj.type == "delete") {
            continue;
          //return;
        }
        //var ctimeObj = new Date(ctime);
        var displayID = Number(obj.category2) - (Number(obj.category1) << 16);

        $("#elasticNoteList").append("<li>"
                           + "<a href='#search' onclick='onNoteLinkClick(" + ctime + ");'>"
                           + obj.title
                           + "</a>"
                           + "</li>");
    }
}

/////////////////////////////////////////////////////////////////////////////

var lastBalance = 0;
var newBalance = 0;
var web3;
var foreverNote;
var userAccount;
var passphrase = "password";
var decryptErrorText = "(decrypt error)";
var dbType = "local";

// Markdown データを表示形式に変換する
function convertMarkdownData(data) {
    return marked(data);
}

// テキストデータを表示形式に変換する
function convertTextData(data) {
    return "<pre>" + data + "</pre>";
}

// テキストデータを表示形式に変換する
function convertHTMLData(data) {
    return data;
}

var dataTypeIDs = [
    {ID:"#typeMarkdown", type:"markdown"},
    {ID:"#typeText", type:"text"},
    {ID:"#typeHTML", type:"html"},
];
var dataConverters = {
    "markdown":convertMarkdownData,
    "text" : convertTextData,
    "html" : convertHTMLData,
};

/////////////////////////////////////////////////////////////////////////////
// categoryMapのフォーマット
//     key   : 大分類のcategoryID
//     value : {text:大分類のテキスト, ctime:作成時刻, childlen:小分類情報の配列}
//
//              小分類情報のフォーマット
//              {ID:categoryID, ctime, text:小分類のテキスト}
var categoryMap = new Map();

/////////////////////////////////////////////////////////////////////////////
// localNoteMapのフォーマット
//      key   : category1    … 1, 2, 3, ...
//      value : category1に属するノート情報マップ
//
//              category1に属するノート情報マップのフォーマット
//              key   : category2    … 65537, 65538, ...
//              value : { ctime, utime, title, type, data }
var localNoteMap = new Map();
var localNoteDeleteList = new Array();

/////////////////////////////////////////////////////////////////////////////
// dataMapのフォーマット
//     key   : ノートのID(ctime)
//     value : ノートのデータオブジェクト
var dataMap = new Map();

//////////////////////////////////////////////////
// 表示エリアのクリア
function clearDisplayArea() {
    $("#ctimeUpdate").val("");
    $("#titleUpdate").val("");
    $("#noteUpdate").val("");
    $("#previewUpdate").empty();
    $("#noteList").empty();
    $("#elasticNoteList").empty();
    $("#noteInfo").empty();
    $("#noteView").empty();
    
}

/////////////////////////////////////////////////////
// 分類に関する常時の初期化
function initCategoryDisplay() {
    categoryMap = new Map();

    $("#parentCategory").empty();
    $("#category1").empty();
    $("#category2").empty();
    $("#searchCategory1").empty();
    $("#searchCategory2").empty();
    $("#category1Update").empty();
    $("#category2Update").empty();

    var all_text = getTextFromDict("(all)");
    $("#searchCategory1").append("<option value='0'>" + all_text + "</option>");
    $("#searchCategory2").append("<option value='0'>" + all_text + "</option>");
}

///////////////////////////////////////////////////
// categoryMapの情報を元に分類情報を再表示
function flushCategoryDisplayInfo() {
    $("#category1").empty();
    $("#category1Update").empty();
    $("#searchCategory1").empty();
    $("#parentCategory").empty();

    var all_text = getTextFromDict("(all)");
    $("#searchCategory1").append("<option value='0'>" + all_text + "</option>");

    categoryMap.forEach(function(categoryInfo, categoryID) {
        var categoryText = categoryInfo.text;
        $("#category1").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#category1Update").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#searchCategory1").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#parentCategory").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
    });
  
    $("#category2").empty();
    $("#searchCategory2").empty();
    $("#category2Update").empty();

    var all_text = getTextFromDict("(all)");
    $("#searchCategory2").append("<option value='0'>" + all_text + "</option>");

    var parentID = 1;
    var parentCategoryInfo = categoryMap.get(Number(parentID));
    for(var i=0; i<parentCategoryInfo.childlen.length; i++) {
        var childInfo = parentCategoryInfo.childlen[i];
        var displayID = Number(childInfo.ID) - (Number(parentID) << 16);
        var categoryText = childInfo.text;
        if ($("#category1").val() == parentID) {
            $("#category2").append("<option value='" + categoryID + "'>[" + displayID + "] " + categoryText + "</option>");
        }
        if ($("#category1Update").val() == parentID) {
            $("#category2Update").append("<option value='" + categoryID + "'>[" + displayID + "] " + categoryText + "</option>");
        }
    }
}

///////////////////////////////////////////////////
// 分類情報反映追加処理
function setCategoryInfo(categoryType, categoryID, categoryCtime, categoryText) {
    if(categoryType == 1) {
        // 分類のタイプ1
        if (categoryMap.has(Number(categoryID))) {
            var categoryInfo = categoryMap.get(Number(categoryID));
            if (Number(categoryInfo.ctime) == Number(categoryCtime)) {
                // 既に同じ情報がある
                return;
            }
            if (Number(categoryInfo.ctime) < Number(categoryCtime)) {
                // 新しい情報を採用
                categoryInfo.ctime = categoryCtime;
                categoryInfo.text = categoryText;
                // 分類の表示を再表示する
                flushCategoryDisplayInfo();
                return;
            }
        } else {
            categoryMap.set(Number(categoryID), {text:categoryText, ctime:categoryCtime, childlen:[]});
        }
        $("#category1").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#category1Update").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#searchCategory1").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
        $("#parentCategory").append("<option value='" + categoryID + "'>[" + categoryID + "] " + categoryText + "</option>");
    } else {
        // 分類のタイプ2
        var parentID = Number(categoryID) >> 16;
        var displayID = Number(categoryID) - (Number(parentID) << 16);
        if (categoryMap.has(Number(parentID))) {
            var isNewCategory = true;
            var categoryInfo = categoryMap.get(Number(parentID));
            for(var i=0; i<categoryInfo.childlen.length; i++) {
                if (Number(categoryInfo.childlen[i].ID) == Number(categoryID)) {
                    isNewCategory = false;
                    if(categoryInfo.childlen[i].ctime < categoryCtime) {
                        // 既に保持している情報より新しい情報
                        categoryInfo.childlen[i].ctime = categoryCtime;
                        categoryInfo.childlen[i].text = categoryText;
                        // 分類の表示を再表示する
                        flushCategoryDisplayInfo();
                        return;
                    } else {
                        // 既に新しい情報を保持している
                        return;
                    }
                }
            }
            if (isNewCategory == true) {
                categoryInfo.childlen.push({ID:categoryID, ctime:categoryCtime, text:categoryText});
            }
        } else {
            var childInfo = {ID:categoryID, ctime:categoryCtime, text:categoryText};
            categoryMap.set(Number(parentID), {text:"", ctime:0, childlen:[childInfo]});
        }
        if ($("#category1").val() == parentID) {
            $("#category2").append("<option value='" + categoryID + "'>[" + displayID + "] " + categoryText + "</option>");
        }
        if ($("#searchCategory1").val() == parentID) {
            $("#searchCategory2").append("<option value='" + categoryID + "'>[" + displayID + "] " + categoryText + "</option>");
        }
        if ($("#category1Update").val() == parentID) {
            $("#category2Update").append("<option value='" + categoryID + "'>[" + displayID + "] " + categoryText + "</option>");
        }
    }
}
						      

///////////////////////////////////////////////////
// 「ノート」エリアの表示変更
function displayNoteArea(val) {
    // 画面でチェックされているタイプを取得
    var dataType = "";
    for (var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID).prop('checked')) {
            dataType = dataTypeIDs[i].type;
            break;
        }
    }

    // 指定された種別に従い表示形式の変換
    var converter;
    if (dataType == "") {
        converter = convertTextData;
    } else {
        converter = dataConverters[dataType];
    }
    $("#preview").empty();
    $("#preview").append(converter(val));
}

///////////////////////////////////////////////////
// 「ノート」エリアのデータ変更時の処理
function noteChange(note){
    var val, old = note.value;
    return function(){
        if(old != (val=note.value)){
            old = val;
            displayNoteArea(val);
        }
    }
}

///////////////////////////////////////////////////
// 更新用「ノート」エリアの表示変更
function displayNoteUpdateArea(val) {
    // 画面でチェックされているタイプを取得
    var dataType = "";
    for (var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID+"Update").prop('checked')) {
            dataType = dataTypeIDs[i].type;
            break;
        }
    }

    // 指定された種別に従い表示形式の変換
    var converter;
    if (dataType == "") {
        converter = convertTextData;
    } else {
        converter = dataConverters[dataType];
    }
    $("#previewUpdate").empty();
    $("#previewUpdate").append(converter(val));
}

///////////////////////////////////////////////////
// 更新用「ノート」エリアのデータ変更時の処理
function noteUpdateChange(note){
    var val, old = note.value;
    return function(){
        if(old != (val=note.value)){
            old = val;
            displayNoteUpdateArea(val);
        }
    }
}

//////////////////////////////////////////////////
// ノートの形式が変更されたときの処理
function typeClick() {
    var val = $("#note").val();
    displayNoteArea(val);
}

//////////////////////////////////////////////////
// 更新用のノートの形式が変更されたときの処理
function typeUpdateClick() {
    var val = $("#noteUpdate").val();
    displayNoteUpdateArea(val);
}

///////////////////////////////////////////////////
// ページロード時の処理
window.addEventListener('load', function() {
    // 画面操作を無効する
    lockScreen("load");

    // 解読失敗時に表示する文字列を作成
    decryptErrorText = "(" + getTextFromDict("decrypt error") + ")";
    
    // 「ノート」の入力エリアのキーボードイベント関数を設定
    $("#note").each(function(){
                $(this).bind('keyup', noteChange(this));
             });
  
    // 更新用「ノート」の入力エリアのキーボードイベント関数を設定
    $("#noteUpdate").each(function(){
                $(this).bind('keyup', noteUpdateChange(this));
             });
  
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    var web3 = new Web3 ( Web3.givenProvider || "ws://localhost:8545", null, {} );
   
    // デフォルトアカウントの設定
    var accountPromise = web3.eth.getAccounts()
    .then(accounts => {
        web3.eth.defaultAccount = accounts[0];
        userAccount = web3.eth.defaultAccount;
    
        $("#accountLabel").text(userAccount);
        $("#accountLabelEx").text(userAccount);
        $("#accountLabelIm").text(userAccount);
        $("#accountLabelDB").text(userAccount);
    
        return new Promise(function(resolve, reject) {
            if (accounts.length > 0) {
                resolve(accounts[0]);
            } else {
                document.body.innerHTML = '<body><h1>' + getTextFromDict("not support dapps") + '</h1></body>';
                reject(getTextFromDict("not support dapps"));
            }
        });
    });
  
    // アカウントを使用可能な場合の処理
    var passPromise = accountPromise.then(account => {
        // MyForeverNoteのコントラクトのインスタンスを作成
        foreverNote = new web3.eth.Contract(ABI, addr);
    
        // バランスの表示
        web3.eth.getBalance(userAccount, (error, balance) => {
            $("#baranceEth").text(web3.utils.fromWei(balance, 'ether') + " eth");
            lastBalance = balance;
            newBalance = balance;
        });
    
        // アカウントを元に、暗号化で使用するパスフレーズを生成
        return new Promise(function(resolve, reject) {
            // パスフレーズの生成
            var msg = userAccount;
            var from = userAccount;
            var params = [msg, from];
            var method = 'personal_sign';
              
            web3.currentProvider.sendAsync({method, params, userAccount}, function (err, result) {
                if (err) {
                    console.log(err);
                    reject(err);
                    // 画面操作を有効にする
                    unlockScreen("load");
                    return
                }
                if (result.error) {
                    console.log(result.error);
                    reject(result.error);
                    // 画面操作を有効にする
                    unlockScreen("load");
                    return;
                }
        
                passphrase = result.result;
                resolve(passphrase);
            });
        });
    });
  
    // パスフレーズが生成できた場合の処理
    passPromise.then(password => {
        // 分類が追加されたときのイベントを監視する処理を登録
        var category = foreverNote.events.Category(
            {},
            function (error, result) {
                console.log("category watch");
                if (!error) {
                    var categoryType = result.returnValues._type;
                    var categoryID = result.returnValues._id;
                    var ctime = result.returnValues._ctime;
                    var encryptedCategoryText = result.returnValues._text;
              
                    // 分類テキストの復号化
                    var categoryText = "";
                    try {
                        categoryText = decrypt(encryptedCategoryText, passphrase);
                    } catch {
                        // 解読失敗
                        categoryText = decryptErrorText;
                    }
                    if (categoryText == "") {
                        // 解読失敗
                        categoryText = decryptErrorText;
                    }
              
                    setCategoryInfo(categoryType, categoryID, ctime, categoryText);
                }
          
                // バランスの表示
                web3.eth.getBalance(userAccount, (error, balance) => {
                    $("#baranceEth").text(web3.utils.fromWei(balance, 'ether') + " eth");
                    //if (lastBalance != balance) {
                    //  var useBalance = String(Number(lastBalance) - Number(balance));                
                    //  $("#baranceLoss").text(web3.utils.fromWei(useBalance, 'ether') + " eth");
                    //}
                    newBalance = balance;
                });
        
            });
    
        // ノートが追加されたときのイベントを監視する処理を登録
        var note = foreverNote.events.Note(
            {},
            function (error, result) {
                console.log("category watch");
                // バランスの表示
                web3.eth.getBalance(userAccount, (error, balance) => {
                    $("#baranceEth").text(web3.utils.fromWei(balance, 'ether') + " eth");
                    //if (lastBalance != balance) {
                    //    var useBalance = String(Number(lastBalance) - Number(balance));                
                    //    $("#baranceLoss").text(web3.utils.fromWei(useBalance, 'ether') + " eth");
                    //}
                    newBalance = balance;
                });
            });
    
        // デフォルトではローカルDBを使用する
        localDBSelected();
    
        // 注意事項を表示する。
        var rtn = confirm(getTextFromDict("if you use local DB"));
        if (rtn == true) {
            // ローカルDBの選択ダイアログを表示する
            $('#localDBFile').trigger("click");
        }
    
        // 画面操作を有効にする
        unlockScreen("load");
    });
});


///////////////////////////////////////////////////////
// 「使用するDB」の「ローカルDB」が選択されたときの処理
function localDBSelected() {
    document.getElementById("exportFromRemote").style.display="none";
    document.getElementById("exportFromLocal").style.display="";
    document.getElementById("importToRemote").style.display="none";
    document.getElementById("importToLocal").style.display="";
    document.getElementById("localDBfromRemote").style.display="none";
    document.getElementById("localDBfromLocal").style.display="";

    if (dbType === 'local') {
        return;
    }
    dbType = "local";

    // ローカルDBファイルの読み込み
    readLocalDBFile();
}

/////////////////////////////////////////////
// ローカルDBファイルの指定が変更された場合の処理
function localDBFileChange() {
    if (dbType === 'local') {
        // ローカルDBァイルの読み込み
        readLocalDBFile();
    }
}

////////////////////////////////
// ローカルDBファイルの読み込み
function readLocalDBFile() {
    // 表示エリアのクリア
    clearDisplayArea();

    // 分類に関する表示の初期化
    initCategoryDisplay();

    // ローカルノートの情報をクリア
    localNoteMap = new Map();
    localNoteDeleteList = new Array();
    
    var fileName = $('#localDBFile').val();
    if ( fileName === '' ) {
        alert(getTextFromDict("specify local DB"));
    } else {
        if ($('#importFile').length > 0) {
            // 画面操作を無効する
            lockScreen("read_local_db_lock");

            // 選択されたファイル情報を取得
            var file = $('#localDBFile')[0].files[0];
            
            // FileReaderで読み込む
            var reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = function() {
                // fetchでデコードする。
                fetch(reader.result).then(response => {
                    var textPromise = response.text();
                    textPromise.then(data => {
                        // DB情報の復号化
                        var jsonText = "";
                        try {
                            jsonText = decrypt(data, passphrase);
                        } catch {
                            // 解読失敗
                            jsonText = ""
                        }
                        if (categoryText == "") {
                            // 解読失敗
                            alert(getTextFromDict("cannot use specified local DB"));
                        } else {
                            //alert(jsonText);
                            setupFromDBText(jsonText);
                        }
                        // 画面操作を有効化する
                        unlockScreen("read_local_db_lock");
                    });
                });
            }
        }            
    }
}




///////////////////////////////////////////////////
// ローカルDBの情報(json形式)からセットアップする処理
function setupFromDBText(textData) {
    var obj = null;
    try {
        obj = JSON.parse(textData);
    } catch(error) {
        alert(getTextFromDict("it is not your DB"));
        return;
    }

    //////////////////////////////
    // 分類情報をセットアップ
    for(var i=0; i<obj.categories.length; i++) {
        var categoryData = obj.categories[i];
        setCategoryInfo(1, categoryData.ID, categoryData.ctime, categoryData.text);
        for(var j=0; j<categoryData.childlen.length; j++) {
            var id = (Number(categoryData.ID) << 16) + Number(categoryData.childlen[j].ID);
            setCategoryInfo(2, id,
                            categoryData.childlen[j].ctime,
                            categoryData.childlen[j].text);
        }
    }

    //////////////////////////
    // ノートの情報をセットアップ
    for(var i=0; i<obj.notes.length; i++) {
        var noteData = obj.notes[i];
        var category2 = (Number(noteData.category1) << 16) + Number(noteData.category2);
        var addNoteData = { ctime : noteData.ctime,
                             utime : noteData.utime,
                             title : noteData.title,
                             type  : noteData.type,
                             data  : noteData.data,
                          };
        if (localNoteMap[noteData.category1]) {
            let map2 = localNoteMap[noteData.category1];
            if (map2[category2]) {
                let noteArray = map2[category2];
                noteArray.push(addNoteData);
            } else {
                let newArray = [addNoteData];
                map2[category2] = newArray;
            }
        } else {
            let newArray = [addNoteData];
            let newMap2 = {};
            newMap2[category2] = newArray;
            localNoteMap[noteData.category1] = newMap2;
        }
    }
  
}

///////////////////////////////////////////////////////
// 「使用するDB」の「リモートDB」が選択されたときの処理
function remoteDBSelected() {
    if (dbType === 'remote') {
        return;
    }
    dbType = "remote";
    document.getElementById("exportFromRemote").style.display="";
    document.getElementById("exportFromLocal").style.display="none";
    document.getElementById("importToRemote").style.display="";
    document.getElementById("importToLocal").style.display="none";
    document.getElementById("localDBfromRemote").style.display="";
    document.getElementById("localDBfromLocal").style.display="none";

    // 表示エリアのクリア
    clearDisplayArea();

    // ローカルノートの情報をクリア
    localNoteMap = new Map();
    localNoteDeleteList = new Array();
    
    // 分類の状態を表示
    getCategoryInfo();
}

///////////////////////////////////////////////////
// 「分類を追加」の「分類の種類」が変更されたときの処理
function categoryTypeChange() {
    var categoryType = $('[name=categoryType]').val();
    if (categoryType == 2) {
        $("#parentCategory").removeAttr("disabled");
        $("#parentCategoryText").slideDown();
    } else {
        $("#parentCategory").attr("disabled", "disabled");
        $("#parentCategoryText").slideUp();
    }
    checkCategoryOpeType();
}

///////////////////////////////////////////////////
// 「category1」が変更されたときの処理
function category1Change() {
    var categoryID = $("#category1").val();
    var parentCategoryInfo = categoryMap.get(Number(categoryID));
    $("#category2").empty();
    for(var i=0; i<parentCategoryInfo.childlen.length; i++) {
        var childInfo = parentCategoryInfo.childlen[i];
        var displayID = Number(childInfo.ID) - (Number(categoryID) << 16);
        $("#category2").append("<option value='" + childInfo.ID + "'>[" + displayID + "] " + childInfo.text + "</option>");
    }
}

///////////////////////////////////////////////////
// 「category1_update」が変更されたときの処理
function category1UpdateChange() {
    var categoryID = $("#category1Update").val();
    var parentCategoryInfo = categoryMap.get(Number(categoryID));
    $("#category2Update").empty();
    for(var i=0; i<parentCategoryInfo.childlen.length; i++) {
        var childInfo = parentCategoryInfo.childlen[i];
        var displayID = Number(childInfo.ID) - (Number(categoryID) << 16);
        $("#category2Update").append("<option value='" + childInfo.ID + "'>[" + displayID + "] " + childInfo.text + "</option>");
    }
}

///////////////////////////////////////////////////
// 「searchCategory1」が変更されたときの処理
function searchCategory1Change() {
    var categoryID = $("#searchCategory1").val();
    var parentCategoryInfo = categoryMap.get(Number(categoryID));
    $("#searchCategory2").empty();

    var all_text = getTextFromDict("(all)");
    $("#searchCategory2").append("<option value='0'>" + all_text + "</option>");

    if (categoryID != 0) {
        for(var i=0; i<parentCategoryInfo.childlen.length; i++) {
            var childInfo = parentCategoryInfo.childlen[i];
            var displayID = Number(childInfo.ID) - (Number(categoryID) << 16);
            $("#searchCategory2").append("<option value='" + childInfo.ID + "'>[" + displayID + "] " + childInfo.text + "</option>");
        }
    }
}

///////////////////////////////////////////////////
// 分類の追加か更新かの判定
function isCategoryUpdate() {
    var categoryType = $("#categoryType").val();
    var parentCategory = Number($("#parentCategory").val());
    var categoryID = Number($("#categoryID").val());
    var isUpdate = false;
    if (categoryType == 1) {
        isUpdate = categoryMap.has(categoryID);
    } else if (categoryType == 2) {
        categoryID = (Number(parentCategory) << 16) + Number(categoryID);
        if(categoryMap.has(parentCategory)) {
            var parentInfo = categoryMap.get(parentCategory);
            for(let categoryInfo of parentInfo.childlen) {
                if(categoryInfo.ID == categoryID) {
                    isUpdate = true;
                    break;
                }
            }
        }
    }
    return isUpdate;
}

function getOldCategoryText() {
    var categoryType = $("#categoryType").val();
    var parentCategory = Number($("#parentCategory").val());
    var categoryID = Number($("#categoryID").val());
    var oldCategoryText = "";
    if (categoryType == 1) {
        isUpdate = categoryMap.has(categoryID);
        if (isUpdate) {
            var category1Info = categoryMap.get(categoryID);
            return (category1Info.text);
        }
    } else if (categoryType == 2) {
        categoryID = (Number(parentCategory) << 16) + Number(categoryID);
        if(categoryMap.has(parentCategory)) {
            var parentInfo = categoryMap.get(parentCategory);
            for(let categoryInfo of parentInfo.childlen) {
                if(categoryInfo.ID == categoryID) {
                    return (categoryInfo.text);
                }
            }
        }
    }
    return("");
}

///////////////////////////////////////////////////
// 分類の操作種別の監視処理
function checkCategoryOpeType() {
    var isUpdate = isCategoryUpdate();
    if(isUpdate) {
        var text = getTextFromDict("update_categories");
        var oldCategoryText = getOldCategoryText();
        $("#oldCategoryText").val(oldCategoryText);
        $("#addCategoryButton").val(text);
        $("#oldCategoryInfo").slideDown();
    } else {
        var text = getTextFromDict("add_categories");
        $("#oldCategoryText").val("");
        $("#addCategoryButton").val(text);
        $("#oldCategoryInfo").slideUp();
    }
}

///////////////////////////////////////////////////
// 「分類を追加」ボタンが押されたときの処理
function addCategory() {
    if (dbType == 'local') {
        addCategoryLocal();
    } else {
        addCategoryRemote();
    }
}

function addCategoryLocal() {
    var isUpdate = isCategoryUpdate();
    var ctime = new Date().getTime();
    var categoryType = $("#categoryType").val();
    var parentCategory = $("#parentCategory").val();
    var categoryID = $("#categoryID").val();
    var categoryText = $("#categoryText").val();
    var isUpdate = isCategoryUpdate();

    if (categoryType == 2) {
        categoryID = Number(parentCategory << 16) + Number(categoryID);
    }
    setCategoryInfo(categoryType, categoryID, ctime, categoryText);

    // 更新エリアの表示を更新
    $("#oldCategoryText").val(categoryText);
    $("#categoryText").val("");

    // 追加/更新の変更
    checkCategoryOpeType();

    if (isUpdate) {
        alert(getTextFromDict("categories updated"));
    } else {
        alert(getTextFromDict("added categories"));
    }
}

function addCategoryRemote() {
    var ctime = new Date().getTime();
    var categoryType = $("#categoryType").val();
    var parentCategory = $("#parentCategory").val();
    var categoryID = $("#categoryID").val();
    var categoryText = $("#categoryText").val();
    var isUpdate = isCategoryUpdate();
  
    if (categoryType == 2) {
        categoryID = Number(Number(parentCategory) << 16) + Number(categoryID);
    }
  
    // 暗号化
    var encryptedCategoryText = encrypt(categoryText, passphrase);
  
    // 最終確認
    if(isUpdate) {
        var rtn = confirm(getTextFromDict("do you want to update the categories"));
        if (rtn == false) {
            alert(getTextFromDict("canceled categories update"));
            return;
        }
    } else {
        var rtn = confirm(getTextFromDict("do you want to add a categories"));
        if (rtn == false) {
            alert(getTextFromDict("addition of a categories was cancelled"));
            return;
        }
    }
  
    // addCategoryのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');
    var addCategoryPromis = foreverNote.methods.addCategory(categoryType, categoryID, ctime, encryptedCategoryText)
        .send({from:userAccount, gasPrice:gasPrice}, function(err, result) {
            if (err) return console.log(err);
            if (result) return console.log(result);
        });

    // 更新エリアの表示を更新
    $("#oldCategoryText").val(categoryText);
    $("#categoryText").val("");

    console.log("addCategoryPromis=" + addCategoryPromis);
}

///////////////////////////////////////////////////
// 「ノートを追加」ボタンが押されたときの処理
function addNote() {
    if (dbType == 'local') {
        addNoteLocal();
    } else {
        addNoteRemote();
    }
}

function addNoteLocal() {
    var category1 = $("#category1").val();
    var category2 = $("#category2").val();
  
    // ノートデータのJSON化
    var ctime = new Date().getTime();
    var utime = ctime;
    var title = $("#title").val();
    var type = "text";
    for(var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID).prop('checked')) {
            type = dataTypeIDs[i].type;
            break;
        }
    }
    var data = $('[name=note]').val();

    var addNoteData = { ctime : ctime,
                         utime : utime,
                         title : title,
                         type  : type,
                         data  : data,
                      };
    if (localNoteMap[category1]) {
        let map2 = localNoteMap[category1];
        if (map2[category2]) {
            let noteArray = map2[category2];
            noteArray.push(addNoteData);
        } else {
            let newArray = [addNoteData];
            map2[category2] = newArray;
        }
    } else {
        let newArray = [addNoteData];
        let newMap2 = {};
        newMap2[category2] = newArray;
        localNoteMap[category1] = newMap2;
    }

    alert(getTextFromDict("added a note"));
}

function addNoteRemote() {
    var category1 = $("#category1").val();
    var category2 = $("#category2").val();
  
    // ノートデータのJSON化
    var obj = {};
  					  
    obj.ctime = new Date().getTime();
    obj.utime = obj.ctime;
    obj.title = $("#title").val();
    obj.type = "text";
    for(var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID).prop('checked')) {
            obj.type = dataTypeIDs[i].type;
            break;
        }
    }
    obj.data = $('[name=note]').val();
    var note = JSON.stringify( obj );
  
    // Balanceの退避
    lastBalance = newBalance;
  
    // 暗号化
    var encryptedNote = encrypt(note, passphrase);
  
    // 最終確認
    var rtn = confirm(getTextFromDict("do you want to add a note with this content"));
    if (rtn == false) {
        alert(getTextFromDict("anceled the addition of the note"));
        return;
    }
  
    // addNoteのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');
    var addNotePromis = foreverNote.methods.addNote(category1, category2, encryptedNote)
        .send({from:userAccount, gasPrice:gasPrice}, function(err, result) {
            if (err) return console.log(err);
            if (result) return console.log(result);
        });
    console.log("addNotePromis=" + addNotePromis);
}

///////////////////////////////////////////////////
// 「ノートを更新」ボタンが押されたときの処理
function updateNote() {
    if ($("#ctimeUpdate").val() == "") {
        alert(getTextFromDict("the note to be updated is not specified"));
        return;
    }
    if (dbType == 'local') {
        updateNoteLocal();
    } else {
        updateNoteRemote();
    }
}

///////////////////////////////////////////////////
// ローカルDBのノートを更新
function updateNoteLocal() {
    // 最終確認
    var rtn = confirm(getTextFromDict("do you want to update your notes"));
    if (rtn == false) {
        alert(getTextFromDict("canceled the update of the note"));
        return;
    }

    // 新ノートデータの作成
    var obj = {};
    obj.ctime = Number($("#ctimeUpdate").val());
    obj.utime = new Date().getTime();
    obj.title = $("#titleUpdate").val();
    obj.type = "text";
    for(var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID+"Update").prop('checked')) {
            obj.type = dataTypeIDs[i].type;
            break;
        }
    }
    obj.data = $("#noteUpdate").val();

    ////////////////////////////////////
    // 古い情報をlocalNoteMapから削除する
    var isExist = false;
    for (let key1 in localNoteMap) {
        var map2 = localNoteMap[key1];
        for (let key2 in map2) {
            var noteArray = map2[key2];
            for (var i=0; i< noteArray.length; i++) {
                if (noteArray[i].ctime == obj.ctime) {
                    noteArray.splice(i, 1);
                    isExist = true;
                    break;
                }
            }
            if (isExist == true) {
                break;
            }
        }
        if (isExist == true) {
            break;
        }
    }

    
    //////////////////////////
    // ノートの情報をセットアップ
    var category1 = $("#category1Update").val();
    var category2 = $("#category2Update").val();
    var displayID = Number(category2) - (Number(category1) << 16);
  
    if (localNoteMap[category1]) {
        let map2 = localNoteMap[category1];
        if (map2[category2]) {
            let noteArray = map2[category2];
            noteArray.push(obj);
        } else {
            let newArray = [obj];
            map2[category2] = newArray;
        }
    } else {
        let newArray = [obj];
        let newMap2 = {};
        newMap2[category2] = newArray;
        localNoteMap[category1] = newMap2;
    }

    // 検索結果のクリア
    $("#noteList").empty();
    $("#elasticNoteList").empty();
    $("#noteInfo").empty();
    $("#noteView").empty();
  
    dataMap = new Map();
}

/////////////////////////////////////////////////
// リモートDBのノートを更新
function updateNoteRemote() {
    var category1 = $("#category1Update").val();
    var category2 = $("#category2Update").val();
  
    // ノートデータのJSON化
    var obj = {};
  					  
    obj.ctime = Number($("#ctimeUpdate").val());
    obj.utime = new Date().getTime();
    obj.title = $("#titleUpdate").val();
    obj.type = "text";
    for(var i=0; i<dataTypeIDs.length; i++) {
        if ($(dataTypeIDs[i].ID+"Update").prop('checked')) {
            obj.type = dataTypeIDs[i].type;
            break;
        }
    }
    obj.data = $("#noteUpdate").val();
    var note = JSON.stringify( obj );
  
    // Balanceの退避
    lastBalance = newBalance;
  
    // 暗号化
    var encryptedNote = encrypt(note, passphrase);
  
    // 最終確認
    var rtn = confirm(getTextFromDict("do you want to update your notes"));
    if (rtn == false) {
        alert(getTextFromDict("canceled the update of the note"));
        return;
    }
  
    // addNoteのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');
    var addNotePromis = foreverNote.methods.addNote(category1, category2, encryptedNote)
        .send({from:userAccount, gasPrice:gasPrice}, function(err, result) {
            if (err) return console.log(err);
            if (result) return console.log(result);
        });
    console.log("addNotePromis=" + addNotePromis);
}

///////////////////////////////////////////////////
// 「ノートを削除」ボタンが押されたときの処理
function deleteNote() {
    if ($("#ctimeUpdate").val() == "") {
        alert(getTextFromDict("the note to be deleted is not specified"));
        return;
    }
    if (dbType == 'local') {
        deleteNoteLocal();
    } else {
        deleteNoteRemote();
    }
}

function deleteNoteLocal() {
    // 最終確認
    var rtn = confirm(getTextFromDict("do you want to delete this note"));
    if (rtn == false) {
        alert(getTextFromDict("canceled the deletion of the note"));
        return;
    }

    // 削除するノートデータの作成
    var obj = {};
    obj.ctime = Number($("#ctimeUpdate").val());
    obj.utime = new Date().getTime();
    obj.title = "";
    obj.type = "delete";
    obj.data = "";

    ////////////////////////////////////
    // 古い情報をlocalNoteMapから削除する(検索対象外にする)
    var isExist = false;
    for (let key1 in localNoteMap) {
        var map2 = localNoteMap[key1];
        for (let key2 in map2) {
            var noteArray = map2[key2];
            for (var i=0; i< noteArray.length; i++) {
                if (noteArray[i].ctime == obj.ctime) {
                    noteArray.splice(i, 1);
                    isExist = true;
                    break;
                }
            }
            if (isExist == true) {
                break;
            }
        }
        if (isExist == true) {
            break;
        }
    }

    /////////////////////////////////
    // 削除リストに追加
    localNoteDeleteList.push(obj);

    // 表示エリアを全てクリア
    clearDisplayArea();
    dataMap = new Map();
}

function deleteNoteRemote() {
    var category1 = $("#category1Update").val();
    var category2 = $("#category2Update").val();
  
    // ノートデータのJSON化
    var obj = {};
  					  
    obj.ctime = Number($("#ctimeUpdate").val());
    obj.utime = new Date().getTime();
    obj.title = "";
    obj.type = "delete";
    obj.data = "";
    var note = JSON.stringify( obj );
  
    // Balanceの退避
    lastBalance = newBalance;
  
    // 暗号化
    var encryptedNote = encrypt(note, passphrase);
  
    // 最終確認
    var rtn = confirm(getTextFromDict("do you want to delete this note"));
    if (rtn == false) {
        alert(getTextFromDict("canceled the deletion of the note"));
        return;
    }
  
    // addNoteのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');
    var addNotePromis = foreverNote.methods.addNote(category1, category2, encryptedNote)
        .send({from:userAccount,gasPrice:gasPrice}, function(err, result) {
            if (err) return console.log(err);
            if (result) return console.log(result);
        });
    console.log("addNotePromis=" + addNotePromis);
}

///////////////////////////////////////////////////
// 日時情報を表示形式の文字列に変更
function getDateString(date) {
    var str = date.toLocaleString("ja");
    return str;
}

///////////////////////////////////////////////////
// 「検索」ボタンが押されたときの処理
function searchNote() {
    clearDisplayArea();
    if (dbType == 'local') {
        searchNoteLocal();
    } else {
        searchNoteRemote();
    }
}

///////////////////////////////////////////////////
// ローカルDB使用時に「検索」ボタンが押されたときの処理
function addNoteInfoToDataMap(category1, category2, noteInfoArray) {
    if (noteInfoArray == null) {
        return;
    }
    for(var i=0; i<noteInfoArray.length; i++) {
        var noteInfo = noteInfoArray[i];
        var obj = {};
        obj.ctime = noteInfo.ctime;
        obj.utime = noteInfo.utime;
        obj.category1 = Number(category1);
        obj.category2 = Number(category2);
        obj.title = noteInfo.title;
        obj.type = noteInfo.type;
        obj.data = noteInfo.data;
        var ctime = new Date(obj.ctime);
        var utime = new Date(obj.utime);
        var newNote = false;
        if (dataMap.has(ctime.getTime()) == false) {
            newNote = true;
        } else {
            var objOld = dataMap.get(ctime.getTime());
            if (Number(objOld.utime) < utime.getTime()) {
              newNote = true;
            }
        }
        if (newNote == true) {
            dataMap.set(ctime.getTime(), obj);
        }
    }
}

function searchNoteLocal() {
    // 画面操作を無効する
    lockScreen("search_lock");
  
    $("#noteList").empty();
    $("#elasticNoteList").empty();
  
    dataMap = new Map();
  
    // ノートの取得
    var category1 = $("#searchCategory1").val();
    if (category1 == 0) {
        // 全ての情報を表示
        for(var key1 in localNoteMap) {
            var map2 = localNoteMap[key1];
            for(var key2 in map2) {
                addNoteInfoToDataMap(key1, key2, map2[key2]);
            }
        }
    } else {
        var map2 = localNoteMap[category1];
        if (map2 != null) {
            var category2 = $("#searchCategory2").val();
            if (category2 == 0) {
                // category1の全ての情報を表示
                for(var key2 in map2) {
                    addNoteInfoToDataMap(category1, key2, map2[key2]);
                }
            } else {
                addNoteInfoToDataMap(category1, category2, map2[category2]);
            }
        }
    }

    // dataMapの内容を表示
    dataMap.forEach(function(obj, ctime) {
        if (obj.type == "delete") {
          return;
        }
        $("#noteList").append("<li>"
                           + "<a href='#search' onclick='onNoteLinkClick(" + ctime + ");'>"
                           + obj.title
                           + "</a>"
                           + "</li>");
    });

    // 全文検索用のインデックスの作成
    createSearchIndex(dataMap);

    // 画面操作を有効化する
    unlockScreen("search_lock");
}

///////////////////////////////////////////////////
// リモートDB使用時に「検索」ボタンが押されたときの処理
function searchNoteRemote() {
    // 画面操作を無効する
    lockScreen("search_lock");
  
    $("#noteList").empty();
    $("#elasticNoteList").empty();
  
    lastBalance = newBalance;
    dataMap = new Map();
  
    // ノートの取得
    var category1 = $("#searchCategory1").val();
    if (category1 == 0) {
        category1 = null;
    }
    var category2 = $("#searchCategory2").val();
    if (category2 == 0) {
        category2 = null;
    }
    var notes = foreverNote.getPastEvents(
        'Note',
        {
            filter: {_owner:userAccount, _category1:category1, _category2:category2},
            fromBlock:0,
            toBlock:'latest'
        });
    notes.then(function (events) {
        if (events.length == 0) {
            $("#noteList").append(getTextFromDict("(not applicable)"));
        } else {
            for(var i=0; i<events.length; i++) {
                var category1 = events[i].returnValues._category1;
                var category2 = events[i].returnValues._category2;
                var encryptedNote = events[i].returnValues._note;
                var displayID = Number(category2) - (Number(category1) << 16);
        
                // ノートの復号化
                var success = false;
                var title = "";
                var ctime = 0;
                var utime = 0;
                var obj = null;
                try {
                    var note = decrypt(encryptedNote, passphrase);
                    if (note == "") {
                        // 解読失敗
                        title = decryptErrorText;
                    } else {
                        // タイトルの取得
                        obj = JSON.parse(note);
                        title = obj.title;
                        ctime = new Date(obj.ctime);
                        utime = new Date(obj.utime);
                        obj.category1 = Number(category1);
                        obj.category2 = Number(category2);
                        success = true;
                    }
                } catch(error) {
                    // 解読失敗
                    title = decryptErrorText;
                }
        
                if (success == false) {
                    $("#noteList").append(title);
                    continue;
                }
        
                var newNote = false;
                if (dataMap.has(ctime.getTime()) == false) {
                    newNote = true;
                } else {
                    var objOld = dataMap.get(ctime.getTime());
                    if (Number(objOld.utime) < utime.getTime()) {
                        newNote = true;
                    }
                }
                if (newNote == false) {
                    continue;
                }
        
                dataMap.set(ctime.getTime(), obj);
            }
      
            // dataMapの内容を表示
            dataMap.forEach(function(obj, ctime) {
                if (obj.type == "delete") {
                    return;
                }
                //var ctimeObj = new Date(ctime);
                var displayID = Number(obj.category2) - (Number(obj.category1) << 16);
        
                $("#noteList").append("<li>"
                                   + "<a href='#search' onclick='onNoteLinkClick(" + ctime + ");'>"
                                   + obj.title
                                   + "</a>"
                                   + "</li>");
            });
      
            // 全文検索用のインデックスの作成
            createSearchIndex(dataMap);
        }
        // 画面操作を有効化する
        unlockScreen("search_lock");
    }, function( error) {
        console.error( error);
        // 画面操作を有効化する
        unlockScreen("search_lock");
    });
}

////////////////////////////////////////////////////////////////////
// ノートの一覧のリンクをクリックされたときの処理
function onNoteLinkClick(ctime) {
    var obj = dataMap.get(ctime);
  
    $("#ctimeUpdate").val(obj.ctime);
    $("#titleUpdate").val(obj.title);
    $("#category1Update").val(obj.category1);
    category1UpdateChange();
    $("#category2Update").val(obj.category2);
    $("#noteUpdate").val(obj.data);
    for(var i=0; i<dataTypeIDs.length; i++) {
        if(dataTypeIDs[i].type == obj.type) {
            $(dataTypeIDs[i].ID+"Update").prop('checked', true);
            break;
        }
    }

    // 指定された種別に従い表示形式の変換
    var converter = dataConverters[obj.type];
    if (converter == null) {
        converter = convertTextData;
    }
    $("#previewUpdate").empty();
    $("#previewUpdate").append(converter(obj.data));
  
    var category1Info = categoryMap.get(obj.category1);
    var category1text = category1Info.text;
    var category2text = "";
    for(var category2Info of category1Info.childlen) {
        if(category2Info.ID == obj.category2) {
            category2text = category2Info.text;
            break;
        }
    }
  
    $("#noteInfo").empty();
    $("#noteInfo").append(getTextFromDict("creation date") + " : " + getDateString(new Date(obj.ctime)));
    $("#noteInfo").append(",　");
    $("#noteInfo").append(getTextFromDict("update date") + " : " + getDateString(new Date(obj.utime)));
    $("#noteInfo").append("<br/>");
    $("#noteInfo").append(getTextFromDict("categories") + " : [" + category1text + "][" + category2text + "]");
    $("#noteInfo").append("<br/>");
    $("#noteInfo").append("<br/>");
    $("#noteInfo").append("<b>" + getTextFromDict("title") + " : " + obj.title + "</b><br/>");
  
    // 指定された種別に従い表示形式の変換
    var converter = dataConverters[obj.type];
    if (converter == null) {
        converter = convertTextData;
    }
    $("#noteView").empty();
    $("#noteView").append(converter(obj.data));
}

///////////////////////////////////////////////////
// 分類の情報取得処理
function getCategoryInfo() {
    // 画面操作を無効にする
    lockScreen("get_category_info");
  
    // 分類に関する表示の初期化
    initCategoryDisplay();
  
    // 分類の取得
    var categories = foreverNote.getPastEvents(
        'Category',
        {
            filter: {_owner:userAccount},
            fromBlock:0,
            toBlock:'latest'
        });

    categories.then(
        function (events) {
            if (events.length == 0) {
                alert(getTextFromDict("no information has been registered yet"));
            } else {
                for(var i=0; i<events.length; i++) {
                    var categoryType = events[i].returnValues._type;
                    var categoryID = events[i].returnValues._id;
                    var ctime = events[i].returnValues._ctime;
                    var encryptedCategoryText = events[i].returnValues._text;
          
                    // 分類テキストの復号化
                    var categoryText = "";
                    try {
                        categoryText = decrypt(encryptedCategoryText, passphrase);
                    } catch {
                        // 解読失敗
                        categoryText = decryptErrorText;
                    }
                    if (categoryText == "") {
                        // 解読失敗
                        categoryText = decryptErrorText;
                    }
            
                    setCategoryInfo(categoryType, categoryID, ctime, categoryText);
                }
    
                // デフォルトのcategory1が選択された状態に設定し、category2を有効にする。
                category1Change();
            }
    
            // 画面操作を有効にする
            unlockScreen("get_category_info");
        }, function( error) {
            alert(error);
            console.error(error);
            // 画面操作を有効にする
            unlockScreen("get_category_info");
        });
}


//////////////////////////////////////////////////////////////////////////
// メモリ上の情報をjson形式に変換
function createJsonFromMemoryData() {
    // categoryMapForExの作成
    var categoryMapForEx = new Map();

    categoryMap.forEach(function(categoryInfo, parentID) {
        setCategoryInfoForEx(categoryMapForEx, 1, parentID, categoryInfo.ctime, categoryInfo.text);
        for(var i=0; i<categoryInfo.childlen.length; i++) {
            var childInfo = categoryInfo.childlen[i];
            setCategoryInfoForEx(categoryMapForEx, 2, childInfo.ID, childInfo.ctime, childInfo.text);
        }
    });

    // noteMapForExの作成
    var noteMap = new Map();
    // 全ての情報を表示
    for(var category1 in localNoteMap) {
        var map2 = localNoteMap[category1];
        for(var category2 in map2) {
            var notes = map2[category2];
            for (var i=0; i<notes.length; i++) {
                var obj = notes[i];
                var displayID = Number(category2) - (Number(category1) << 16);
                var ctime = new Date(obj.ctime);
                var utime = new Date(obj.utime);
                obj.category1 = Number(category1);
                obj.category2 = Number(displayID);

                var newNote = false;
                if (noteMap.has(ctime.getTime()) == false) {
                    newNote = true;
                } else {
                    var objOld = noteMap.get(ctime.getTime());
                    if (Number(objOld.utime) < utime.getTime()) {
                        newNote = true;
                    }
                }
                if (newNote == false) {
                    continue;
                }
        
                noteMap.set(ctime.getTime(), obj);
            }
        }
    }

    for(var i=0; i<localNoteDeleteList.length; i++) {
        var obj = localNoteDeleteList[i];
        obj.category1 = Number(category1);
        obj.category2 = Number(displayID);
        
        var newDelete = false;
        if (noteMap.has(obj.ctime) == false) {
            obj.category1 = Number(0);
            obj.category2 = Number(0);
            newDelete = true;
        } else {
            var objOld = noteMap.get(obj.ctime);
            if (Number(objOld.utime) < obj.utime()) {
                obj.category1 = objOld.category1;
                obj.category2 = objOld.category2;
                newDelete = true;
            }
        }
        if (newDelete) {
            noteMap.set(obj.ctime, obj);
        }
    }

    // jsonObjの作成
    jsonObj = {};
    jsonObj.categories = [];
    for(var ID of categoryMapForEx.keys()) {
       var categoryWk = categoryMapForEx.get(ID);
       var categoryData = {}
       categoryData.ID = ID;
       categoryData.ctime = categoryWk.ctime;
       categoryData.text = categoryWk.text;
       categoryData.childlen = categoryWk.childlen;
       jsonObj.categories.push(categoryData);
    }

    jsonObj.notes = [];
    for(var ctime of noteMap.keys()) {
        var obj = noteMap.get(ctime);
          if (obj.type == "delete") {
            continue;
          }
        jsonObj.notes.push(obj);
    }

    // JSONに変換
    var jsonData = JSON.stringify( jsonObj );

    return jsonData;
}

///////////////////////////////////////////////////////////////////////////
// 「ローカルDBをイーサリアム上の最新の情報で更新する」ボタンが押された場合の処理
function saveToLocalDB() {
    var fileName = $('#newLocalDBFile').val();
    if ( fileName === '' ) {
        alert(getTextFromDict("please enter the local DB file name"));
        return;
    }

    if (dbType == 'local') {
        // メモリ上の情報をJSON形式に変換
        var jsonData = createJsonFromMemoryData();
      
        // 暗号化
        var encryptedJsonData = encrypt(jsonData, passphrase);
      
        if (window.navigator.msSaveBlob) {
             window.navigator.msSaveBlob(new Blob([encryptedJsonData], { type: "text/plain" }), fileName);
        } else {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([encryptedJsonData], { type: "text/plain" }));
            //a.target   = '_blank';
            a.download = fileName;
            document.body.appendChild(a) //  FireFox specification
            a.click();
            document.body.removeChild(a) //  FireFox specification
        }
    } else {
        exportToFile(function(dataObj) {
            // JSONに変換
            var jsonData = JSON.stringify( dataObj );
    
            // 暗号化
            var encryptedJsonData = encrypt(jsonData, passphrase);
          
            if (window.navigator.msSaveBlob) {
                 window.navigator.msSaveBlob(new Blob([encryptedJsonData], { type: "text/plain" }), fileName);
            } else {
                var a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([encryptedJsonData], { type: "text/plain" }));
                //a.target   = '_blank';
                a.download = fileName;
                document.body.appendChild(a) //  FireFox specification
                a.click();
                document.body.removeChild(a) //  FireFox specification
            }
        });
    }
}

//////////////////////////////////////////////////////////
// エクスポート/インポートの「実行」ボタンが押されたときの処理
function execExIm() {
    if (dbType == 'local') {
        execExImLocal();
    } else {
        execExImRemote();
    }
}

function execExImLocal() {
    if ($('input[name=eximType]:checked').val() === 'export') {
        // エクスポート処理
        
        var fileName = $('#exportFile').val();
        if ( fileName === '' ) {
            alert(getTextFromDict("please enter a file name"));
            return;
        }

        // メモリ上の情報をJSON形式に変換
        var jsonData = createJsonFromMemoryData();
      
        if (window.navigator.msSaveBlob) {
             window.navigator.msSaveBlob(new Blob([jsonData], { type: "text/plain" }), fileName);
        } else {
             var a = document.createElement("a");
             a.href = URL.createObjectURL(new Blob([jsonData], { type: "text/plain" }));
             a.download = fileName;
             document.body.appendChild(a) //  FireFox specification
             a.click();
             document.body.removeChild(a) //  FireFox specification
        }
        
    } else {
        // インポート処理
        var fileName = $('#importFile').val();
        if ( fileName === '' ) {
            alert(getTextFromDict("please specify the file"));
            return;
        }
        // 表示エリアのクリア
        clearDisplayArea();
    
        // 分類に関する表示の初期化
        initCategoryDisplay();
    
        // ローカルノートの情報をクリア
        localNoteMap = new Map();
        localNoteDeleteList = new Array();
        
        if ($('#importFile').length > 0) {
            // 画面操作を無効する
            lockScreen("import_lock");

            // 選択されたファイル情報を取得
            var file = $('#importFile')[0].files[0];
            
            // FileReaderで読み込む
            var reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = function() {
                // fetchでデコードする。
                fetch(reader.result).then(response => {
                    var textPromise = response.text();
                    textPromise.then(data => {
                        setupFromDBText(data);

                        alert(getTextFromDict("the import is now complete"));
                        // 画面操作を有効化する
                        unlockScreen("import_lock");
                    });
                });
            }
        }            
    }
}

function execExImRemote() {
    if ($('input[name=eximType]:checked').val() === 'export') {
        var fileName = $('#exportFile').val();
        if ( fileName === '' ) {
            alert(getTextFromDict("please enter a file name"));
            return;
        }

        exportToFile(function(dataObj) {
            // JSONに変換
            var jsonData = JSON.stringify( dataObj );
          
            if (window.navigator.msSaveBlob) {
               window.navigator.msSaveBlob(new Blob([jsonData], { type: "text/plain" }), fileName);
            } else {
               var a = document.createElement("a");
               a.href = URL.createObjectURL(new Blob([jsonData], { type: "text/plain" }));
               //a.target   = '_blank';
               a.download = fileName;
               document.body.appendChild(a) //  FireFox specification
               a.click();
               document.body.removeChild(a) //  FireFox specification
            }
        });
    } else {
        var fileName = $('#importFile').val();
        var useGasPrice = $('#useGasPrice').val();
        if ( fileName === '' ) {
            alert(getTextFromDict("please specify the file"));
            return;
        } else if ( useGasPrice === '' ) {
            alert(getTextFromDict("please specify the gas price"));
            return;
        }

        //alert("import from " + fileName);
        if ($('#importFile').length > 0) {
            // 画面操作を無効する
            lockScreen("import_lock");

            // 選択されたファイル情報を取得
            var file = $('#importFile')[0].files[0];
            
            // FileReaderで読み込む
            var reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = function() {
                // fetchでデコードする。
                fetch(reader.result).then(response => {
                    var textPromise = response.text();
                    textPromise.then(data => {
                        importFromText(data);
                    });
                });
            }
        }            
    }
}

///////////////////////////////////////////////////
// 「インポート」の処理
function importFromText(textData) {
    var obj = JSON.parse(textData);

    // Balanceの退避
    lastBalance = newBalance;
  
    //////////////////////////////
    // 分類の追加を呼び出す
    var categoryParams = {
        categoryTypes: [],
        categoryIDs : [],
        categoryCtimes : [],
        categoryTexts : [],
    };
    for(var i=0; i<obj.categories.length; i++) {
        var categoryData = obj.categories[i];
        addCategoryForIm(categoryParams, (-1), categoryData);
        for(var j=0; j<categoryData.childlen.length; j++) {
            addCategoryForIm(categoryParams, categoryData.ID, categoryData.childlen[j]);
        }
    }

    //////////////////////
    // ノートの追加を呼び出す
    var noteParams = {
        noteCategory1s : [],
        noteCategory2s : [],
        noteTexts : [],
    };
    for(var i=0; i<obj.notes.length; i++) {
        var noteData = obj.notes[i];
        addNoteForIm(noteParams, noteData);
    }
  
    //////////////////////////////////
    // addCategoriesのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');

    var addCategoryPromis = foreverNote.methods.addCategories(categoryParams.categoryTypes,
                                                       categoryParams.categoryIDs,
                                                       categoryParams.categoryCtimes,
                                                       categoryParams.categoryTexts)
        .send({from:userAccount, gasPrice:gasPrice}, function(err, result) {
            if (err) return console.log(err);
            if (result) return console.log(result);
        });
    console.log("addCategoriesPromis=" + addCategoryPromis);

    //////////////////////////////////
    // addNoteのトランザクション作成
    var gasPriceGwei = Number($("#useGasPrice").val());
    var gasPrice = web3.toWei(gasPriceGwei,'gwei');

    var addNotePromis = foreverNote.methods.addNotes(noteParams.noteCategory1s,
                                                     noteParams.noteCategory2s,
                                                     noteParams.noteTexts)
        .send({from:userAccount, gasPrice:gasPrice}, function(err, result) {

            // 画面操作を有効にする
            unlockScreen("import_lock");
      
            if (err) return console.log(err);
            if (result) return console.log(result);
        });
    console.log("addNotePromis=" + addNotePromis);
}

///////////////////////////////////////////////////
// 分類の情報を;配列に追加
function addCategoryForIm(categoryParams, parentCategory, categoryData) {
    var ctime = categoryData.ctime;
    var categoryType;
    var categoryID = categoryData.ID;
    var categoryText = categoryData.text;

    if (parentCategory < 0) {
        // 分類1
        categoryType = 1;
    } else {
        // 分類2
        categoryType = 2;
        categoryID = Number(parentCategory << 16) + Number(categoryID);
    }
    
    // 暗号化
    var encryptedCategoryText = encrypt(categoryText, passphrase);

    categoryParams.categoryTypes.push(categoryType);
    categoryParams.categoryIDs.push(categoryID);
    categoryParams.categoryCtimes.push(ctime);
    categoryParams.categoryTexts.push(encryptedCategoryText);
}

///////////////////////////////////////////////////
// ノートの情報を排列に追加
function addNoteForIm(noteParams, noteData) {
    var category1 = noteData.category1;
    var category2 = Number(category1 << 16) + Number(noteData.category2);

    // ノートデータのJSON化
    var obj = {};
                        
    obj.ctime = noteData.ctime;
    obj.utime = obj.ctime;
    obj.title = noteData.title;
    obj.type = noteData.type;
    obj.data = noteData.data;
    var note = JSON.stringify( obj );

    // 暗号化
    var encryptedNote = encrypt(note, passphrase);
  
    noteParams.noteCategory1s.push(category1);
    noteParams.noteCategory2s.push(category2);
    noteParams.noteTexts.push(encryptedNote);
}

///////////////////////////////////////////////////
// 「エクスポート」の処理

var jsonObj = {};
// jsonObjのフォーマット
//    categoryes[] : 大分類の配列
//                categoryのフォーマット
//                    ID : 大分類のID
//                    ctime : 大分類の作成時刻
//                    text : 大分類のテキスト
//                    childlen[] : 小分類情報の配列
//                    小分類のフォーマット
//                        ID : 小分類のID
//                        ctime : 小分類の作成時刻
//                        text : 小分類のテキスト


function exportToFile(dataConsumer) {
    // 画面操作を無効する
    lockScreen("export_lock");

    // categoryMapForExを作成
    var categoryMapPromise = createCategoryMapForEx();

    // noteMapを作成
    var noteMapPromise = createNoteMapForEx();
    
    if (categoryMapPromise == null || noteMapPromise == null) {
        // エラーが発生したら処理を中止

        // 画面操作を有効にする
        unlockScreen("export_lock");
        return;
    }

    var allDonePromise = Promise.all([categoryMapPromise, noteMapPromise]);
    allDonePromise.then(function (maps) {
        var categoryMapForEx = maps[0];
        var noteMap = maps[1];
        
        // jsonObjの作成
        jsonObj = {};
        jsonObj.categories = [];
        for(var ID of categoryMapForEx.keys()) {
           var categoryWk = categoryMapForEx.get(ID);
           var categoryData = {}
           categoryData.ID = ID;
           categoryData.ctime = categoryWk.ctime;
           categoryData.text = categoryWk.text;
           categoryData.childlen = categoryWk.childlen;
           jsonObj.categories.push(categoryData);
        }

        jsonObj.notes = [];
        for(var ctime of noteMap.keys()) {
            var obj = noteMap.get(ctime);
            if (obj.type == "delete") {
              continue;
            }
            jsonObj.notes.push(obj);
        }

        // データを処理する関数に渡す。
        dataConsumer(jsonObj);
   
        // 画面操作を有効にする
        unlockScreen("export_lock");
    });

}

///////////////////////////////////////////////////
// categoryMapForExを作成する処理
function createCategoryMapForEx() {
    // 分類のイベント情報の取得
    var categoryEventsPromise = foreverNote.getPastEvents("Category",
        {
          filter:{_owner:userAccount, _type:null},
          fromBlock:0,
          toBlock:'latest'
        });
  
    // 分類イベント情報からcategoryMapForExを作成
    var categoryMapPromise = categoryEventsPromise
        .then(categories => {
             var categoryMapForEx = new Map();
      
             for(let category of categories) {
                var categoryType = category.returnValues._type;
                var categoryID = category.returnValues._id;
                var ctime = category.returnValues._ctime;
                var encryptedCategoryText = category.returnValues._text;
         
                // 分類テキストの復号化
                var categoryText = "";
                try {
                    categoryText = decrypt(encryptedCategoryText, passphrase);
                } catch {
                    // 解読失敗
                    categoryText = "";
                }
                if (categoryText == "") {
                    // 削除された分類はスキップ
                    //alert("分類の解読に失敗しました。[" + encryptedCategoryText + "]\n" +
                    //      "この情報を無視します。");
                    ;
                } else {
                    setCategoryInfoForEx(categoryMapForEx, categoryType, categoryID, ctime, categoryText);
                }
             }
      
             var result = new Promise(function(resolve) {
                 resolve(categoryMapForEx);
             });
             return result;
        }, error => {
            alert(getTextFromDict("error occurred when retrieving categories information"));
            return null;
        });

    return categoryMapPromise;
}

/////////////////////////////////////////////////////////////////////////////
// categoryMapForExのフォーマット
//     key   : 大分類のcategoryID
//     value : {text:大分類のテキスト, ctime:作成時刻, childlen:小分類情報の配列}
//              小分類情報のフォーマット
//              {ID:categoryID, ctime, text:小分類のテキスト}

///////////////////////////////////////////////////
// 分類情報反映追加処理(categoryMapForExに情報を蓄える)
function setCategoryInfoForEx(categoryMapForEx, categoryType, categoryID, categoryCtime, categoryText) {
    if(categoryType == 1) {
        // 分類のタイプ1
        if (categoryMapForEx.has(Number(categoryID))) {
            var categoryInfo = categoryMapForEx.get(Number(categoryID));
            if (Number(categoryInfo.ctime) == Number(categoryCtime)) {
                // 既に同じ情報がある
                return;
            }
            if (Number(categoryInfo.ctime) < Number(categoryCtime)) {
                // 新しい情報を採用
                categoryInfo.ctime = categoryCtime;
                categoryInfo.text = categoryText;
                // 分類の表示を再表示する
                //flushCategoryDisplayInfo();
                return;
            }
        } else {
            categoryMapForEx.set(Number(categoryID), {text:categoryText, ctime:categoryCtime, childlen:[]});
        }
    } else {
        // 分類のタイプ2
        var parentID = Number(categoryID) >> 16;
        var displayID = Number(categoryID) - (Number(parentID) << 16);
        if (categoryMapForEx.has(Number(parentID))) {
            var isNewCategory = true;
            var categoryInfo = categoryMapForEx.get(Number(parentID));
            for(var i=0; i<categoryInfo.childlen.length; i++) {
                if (Number(categoryInfo.childlen[i].ID) == Number(displayID)) {
                    isNewCategory = false;
                    if(categoryInfo.childlen[i].ctime < categoryCtime) {
                        // 既に保持している情報より新しい情報
                        categoryInfo.childlen[i].ctime = categoryCtime;
                        categoryInfo.childlen[i].text = categoryText;
                        return;
                    } else {
                        // 既に新しい情報を保持している
                        return;
                    }
                }
            }
            if (isNewCategory == true) {
              categoryInfo.childlen.push({ID:displayID, ctime:categoryCtime, text:categoryText});
            }
        } else {
            var childInfo = {ID:displayID, ctime:categoryCtime, text:categoryText};
            categoryMapForEx1.set(Number(parentID), {text:"", ctime:0, childlen:[childInfo]});
        }
    }
}

function createNoteMapForEx() {
    // ノートイベントの取得
    var noteEventsPromise  = foreverNote.getPastEvents(
        'Note',
        {
            filter: {_owner:userAccount, _category1:null, _category2:null},
            fromBlock:0,
            toBlock:'latest'
        });

    // ノートイベント情報からnoteMapを作成
    var noteMapPromise = noteEventsPromise
        .then(events => {
            var noteMap = new Map();
            for(var i=0; i<events.length; i++) {
                var category1 = events[i].returnValues._category1;
                var category2 = events[i].returnValues._category2;
                var encryptedNote = events[i].returnValues._note;
                var displayID = Number(category2) - (Number(category1) << 16);
        
                // ノートの復号化
                var success = false;
                var title = "";
                var ctime = 0;
                var utime = 0;
                var obj = null;
                try {
                    var note = decrypt(encryptedNote, passphrase);
                    if (note == "") {
                        // 解読失敗
                        title = decryptErrorText;
                    } else {
                        // タイトルの取得
                        obj = JSON.parse(note);
                        title = obj.title;
                        ctime = new Date(obj.ctime);
                        utime = new Date(obj.utime);
                        obj.category1 = Number(category1);
                        obj.category2 = Number(displayID);
                        success = true;
                    }
                } catch(error) {
                    // 解読失敗
                    title = decryptErrorText;
                }
        
                if (success == false) {
                    continue;
                }
        
                var newNote = false;
                if (noteMap.has(ctime.getTime()) == false) {
                    newNote = true;
                } else {
                    var objOld = noteMap.get(ctime.getTime());
                    if (Number(objOld.utime) < utime.getTime()) {
                      newNote = true;
                    }
                }
                if (newNote == false) {
                  continue;
                }
        
                noteMap.set(ctime.getTime(), obj);
            }
    
            var result = new Promise(function(resolve) {
                resolve(noteMap);
            });
            return result;
    
        }, error => {
            alert(getTextFromDict("error occurred when retrieving event information for a note"));
            return null;
        });

    return noteMapPromise;
}

/*
 * 画面操作を無効にする
 */
function lockScreen(id) {

    /*
     * 現在画面を覆い隠すためのDIVタグを作成する
     */
    var divTag = $('<div />').attr("id", id);

    /*
     * スタイルを設定
     */
    divTag.css("z-index", "999")
          .css("position", "absolute")
          .css("top", "0px")
          .css("left", "0px")
          .css("right", "0px")
          .css("bottom", "0px")
          .css("background-color", "gray")
          .css("opacity", "0.8");

    /*
     * BODYタグに作成したDIVタグを追加
     */
    $('body').append(divTag);
}

/*
 * 画面操作無効を解除する
 */
function unlockScreen(id) {

    /*
     * 画面を覆っているタグを削除する
     */
    $("#" + id).remove();
}

