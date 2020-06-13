//////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt(data, passphrase) {
  //パスワードはUTF-8エンコーディング
  var secretPassphrase = CryptoJS.enc.Utf8.parse(passphrase);
  var salt = CryptoJS.lib.WordArray.random(128 / 8);
  var key128Bits500Iterations =
      CryptoJS.PBKDF2(secretPassphrase, salt, {keySize: 128 / 8, iterations: 500 });
  //初期化ベクトル（ブロック長と同じ）
  var iv = CryptoJS.lib.WordArray.random(128 / 8);
  //暗号化オプション（IV:初期化ベクトル, CBCモード, パディングモード：PKCS7
  var options = {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};
  //暗号化内容のエンコーディングは「UTF-8」
  var messageText = CryptoJS.enc.Utf8.parse(data);

  //----------------------------------------------------------------------
  //暗号化
  var encrypted = CryptoJS.AES.encrypt(messageText, key128Bits500Iterations, options);
  //----------------------------------------------------------------------

  //暗号結果データをカンマ（","）で結合してまとめる（復号時にわかるように）
  //（salt + iv + ciphertext)
  var binaryData = CryptoJS.enc.Hex.stringify(salt);
  binaryData += (',' + CryptoJS.enc.Hex.stringify(iv));
  binaryData += (',' + encrypted);

  return binaryData;
}

function decrypt(encryptedData, passphrase) {
  // あからじめ仕込んでおいた暗号化データのカンマ","を使って文字列をそれぞれに分割
  var rawData = encryptedData.split(',');

  var salt = CryptoJS.enc.Hex.parse(rawData[0]);  // パスワードSalt
  var iv = CryptoJS.enc.Hex.parse(rawData[1]);    // 初期化ベクトル（IV）
  var encryptedData = CryptoJS.enc.Base64.parse(rawData[2]); //暗号化データ本体

  //パスワード（鍵空間の定義）
  var secretPassphrase = CryptoJS.enc.Utf8.parse(passphrase);
  var key128Bits500Iterations =
      CryptoJS.PBKDF2(secretPassphrase, salt, {keySize: 128 / 8, iterations: 500 });

  //復号オプション（暗号化と同様）
  var options = {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};

  //復号
  var decrypted = CryptoJS.AES.decrypt({"ciphertext":encryptedData}, key128Bits500Iterations, options);
  // 文字コードをUTF-8にする
  var data = decrypted.toString(CryptoJS.enc.Utf8);

  return data;
}
