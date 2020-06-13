// Language for display("en" or "ja" or "zh")
var language = "ja";

// Create a Glottologist object.
const glot = new Glottologist();

/**
** Event processing for language switching.
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

// Multilingual text is loaded into Glottologist.
glot.import("/lang.json").then(() => {
    // First display
    glot.render();
    
    // Switch to the default display language.
    changeLanguage(language);
});

// Load a multilingual text into a "dictionary".
var dictionary = null;
$.getJSON("/lang.json", (data) => {
    dictionary = data;
});

// Get the text in the current language for a given key.
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

// The id of the input control that supports multiple languages.
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

// Function to be executed at the time of language switching.
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
