[to Wiki](../../wiki)

# MyForeverNote
## Overview.
MyForeverNote uses Ethereum to.

+ Create, update and record personal notes.
+ You can search and view the notes you have created.
+ The notes are encrypted and cannot be viewed without an Ethereum wallet.
+ You can export/import notes you've created, so you can transfer the notes you've created to other wallets You can take over to.
+ local DB functionality
    + Create, update, search, and save notes even when you are not connected to the network by using local DBs You can view the information created in the remote DB (on Ethereum)
    + Local DB (local file) for information created in a remote DB (on Ethereum). You can save them as.
    + Notes created in the local DB can be exported/imported to a remote DB ( Ethereum).

# MyForeverNote_Frontend
Frontend program for MyForeverNote.

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

The above file is created when you build the MyForeverNote_Truffle project.

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

