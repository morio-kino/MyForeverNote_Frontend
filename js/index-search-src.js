// 全文検索用のモジュール
const elasticlunr = require('elasticlunr');
require('./lunr.stemmer.support.js')(elasticlunr);
require('./lunr.jp.js')(elasticlunr);


createIndex = function() {
  var index = elasticlunr(function () {
      this.use(elasticlunr.jp);
      this.addField('title');
      this.addField('body');
      this.setRef('id');
  
      this.pipeline.reset();
  });
  return index;
}


