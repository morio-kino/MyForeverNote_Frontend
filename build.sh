# Update npm.
sudo npm install -g npm

# Install according to package.json
sudo npm install

#  Copy the web3.js file.
cp ./node_modules/web3/dist/web3.js .

# Copy the glottologist.js file.
cp ./node_modules/glottologist/dist/glottologist.js .

# Generate index-search.js from js/index-search-src.js
export PATH=./node_modules/.bin:$PATH
browserify js/index-search-src.js -o index-search.js

