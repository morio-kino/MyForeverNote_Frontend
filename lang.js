// 表示言語
var language = "en";

// Glottologistオブジェクト作成
const glot = new Glottologist();

/**
**言語切り替え用のイベント処理
**/
const ja = document.getElementById('ja');
const en = document.getElementById('en');
const zh = document.getElementById('zh');

ja.addEventListener('click', e => {
    e.preventDefault();
    changeLanguage("ja");
})

en.addEventListener('click', e => {
    e.preventDefault();
    changeLanguage("en");
})

zh.addEventListener('click', e => {
    e.preventDefault();
    changeLanguage("zh");
})

// 多言語のテキストをGlottologistに読み込む。
glot.import("/lang.json").then(() => {
    // 最初の表示
    glot.render();
    
    // デフォルトの表示言語を切り替える
    changeLanguage(language);
});

// 多言語のテキストをdictionaryに読み込む
var dictionary = null;
$.getJSON("/lang.json", (data) => {
    dictionary = data;
});

// 指定されたキーに対応する現在の言語のテキストを取得する
function getTextFromDict(key) {
    try {
        if (dictionary == null) {
            return key;
        }
        return dictionary[key][language];
    } catch (e) {
        return "--------";
    }
}

// 多言語に対応するinputのid
var target_inputs = [
    "search1",
    "search2",
    "update_this_note",
    "delete_this_note",
    "addCategoryButton",
    "addNoteButton",
    "execButton",
    "updateLocalDB",
];

// 言語切替時の処理
function changeLanguage(lang) {
    language = lang;
    glot.render(language);

    for (var i=0; i<target_inputs.length; i++) {
        var id = target_inputs[i];
        var text = getTextFromDict(id);
        var obj = $("#" + id);
        obj.val(text);
    }

    $("#categoryType").empty();
    $("#categoryType").append("<option value='1'>" + getTextFromDict("main category") + "</option>");
    $("#categoryType").append("<option value='2'>" + getTextFromDict("subcategory") + "</option>");
}
