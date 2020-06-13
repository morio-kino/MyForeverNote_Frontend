// コントラクトのアドレス
var addr = "0x85953A09a6d0545dEE5975E11ce17608E3595850";    // Ropsten

// ForeverNoteのABI
var ABI = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_owner","type":"address"},{"indexed":true,"internalType":"uint8","name":"_type","type":"uint8"},{"indexed":false,"internalType":"uint32","name":"_id","type":"uint32"},{"indexed":false,"internalType":"uint64","name":"_ctime","type":"uint64"},{"indexed":false,"internalType":"string","name":"_text","type":"string"}],"name":"Category","type":"event","signature":"0x707b3fb9fc4b430b8b33073b47ad09c8076cd02256b671402b78cdf61e39b23b"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_owner","type":"address"},{"indexed":true,"internalType":"uint32","name":"_category1","type":"uint32"},{"indexed":true,"internalType":"uint32","name":"_category2","type":"uint32"},{"indexed":false,"internalType":"string","name":"_note","type":"string"}],"name":"Note","type":"event","signature":"0xa5e274288031f47325f339b1f31ee5db77059ebd83f6479106a81980f2fcc5d7"},{"constant":false,"inputs":[{"internalType":"uint8","name":"_type","type":"uint8"},{"internalType":"uint32","name":"_id","type":"uint32"},{"internalType":"uint64","name":"_ctime","type":"uint64"},{"internalType":"string","name":"_text","type":"string"}],"name":"addCategory","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function","signature":"0x673fc11f"},{"constant":false,"inputs":[{"internalType":"uint8[]","name":"_type","type":"uint8[]"},{"internalType":"uint32[]","name":"_id","type":"uint32[]"},{"internalType":"uint64[]","name":"_ctime","type":"uint64[]"},{"internalType":"string[]","name":"_text","type":"string[]"}],"name":"addCategories","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function","signature":"0x0542562f"},{"constant":false,"inputs":[{"internalType":"uint32","name":"_category1","type":"uint32"},{"internalType":"uint32","name":"_category2","type":"uint32"},{"internalType":"string","name":"_note","type":"string"}],"name":"addNote","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function","signature":"0x45a764e1"},{"constant":false,"inputs":[{"internalType":"uint32[]","name":"_category1","type":"uint32[]"},{"internalType":"uint32[]","name":"_category2","type":"uint32[]"},{"internalType":"string[]","name":"_note","type":"string[]"}],"name":"addNotes","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function","signature":"0x2c674a7e"}];


