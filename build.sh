# npm のアップデート
sudo npm install -g npm

# npm の package.json の新規作成
# $ sudo npm init
# 既に package.json を作成し、必要なパッケージを記述済なので上記は不要

# package.jsonに従ってインストール
sudo npm install

# web3.jsのコピー
cp ./node_modules/web3/dist/web3.js .

# glottologist.js のコピー
cp ./node_modules/glottologist/dist/glottologist.js .

# elasticlunr のインストール
#sudo npm install elasticlunr 0.9.5

# js/index-search-src.js から index-search.js を生成
export PATH=./node_modules/.bin:$PATH
browserify js/index-search-src.js -o index-search.js

