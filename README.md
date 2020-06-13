# ForeverNote_Frontend
Frontend program for ForeverNote.

## Run the build
The build will be executed by executing the following command.

~~~
$ ./build.sh
~~~

## Contract information file
Specify the address and ABI of the contract you want to connect to in the following file.

~~~
contract-info.js
~~~

The above file is created when you build the ForeverNote_Truffle project.

## Required files
Only the following files are required after construction.

- contract-info.js
- encrypt.js
- favicon.ico
- forever.js
- index.html
- index-search.js
- web3.js

## Local test
If you want to test locally, you can start the web server with the following shell file.

~~~
$ ./start-web.sh
~~~

