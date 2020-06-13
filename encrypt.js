//////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt(data, passphrase) {
  //Password is encoded in UTF-8.
  var secretPassphrase = CryptoJS.enc.Utf8.parse(passphrase);
  var salt = CryptoJS.lib.WordArray.random(128 / 8);
  var key128Bits500Iterations =
      CryptoJS.PBKDF2(secretPassphrase, salt, {keySize: 128 / 8, iterations: 500 });
  //Initialization vector (same as the block length)
  var iv = CryptoJS.lib.WordArray.random(128 / 8);
  //Encryption options (IV: initialization vector, CBC mode, padding mode: PKCS7)
  var options = {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};
  //The content is encoded as "UTF-8".
  var messageText = CryptoJS.enc.Utf8.parse(data);

  //----------------------------------------------------------------------
  //encryption
  var encrypted = CryptoJS.AES.encrypt(messageText, key128Bits500Iterations, options);
  //----------------------------------------------------------------------

  // Combine the encryption result data with commas (",") to make it clearer when decrypting.
  //（salt + iv + ciphertext)
  var binaryData = CryptoJS.enc.Hex.stringify(salt);
  binaryData += (',' + CryptoJS.enc.Hex.stringify(iv));
  binaryData += (',' + encrypted);

  return binaryData;
}

function decrypt(encryptedData, passphrase) {
  // Split the string into its component parts using commas in the encrypted data you've prepared for it.
  var rawData = encryptedData.split(',');

  var salt = CryptoJS.enc.Hex.parse(rawData[0]);  // Password Salt
  var iv = CryptoJS.enc.Hex.parse(rawData[1]);    // Initialization vector (IV)
  var encryptedData = CryptoJS.enc.Base64.parse(rawData[2]); // Body of encrypted data.

  // Password (key space definition)
  var secretPassphrase = CryptoJS.enc.Utf8.parse(passphrase);
  var key128Bits500Iterations =
      CryptoJS.PBKDF2(secretPassphrase, salt, {keySize: 128 / 8, iterations: 500 });

  // Decryption options (similar to encryption)
  var options = {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};

  // Decryption
  var decrypted = CryptoJS.AES.decrypt({"ciphertext":encryptedData}, key128Bits500Iterations, options);
  // Convert character code to UTF-8.
  var data = decrypted.toString(CryptoJS.enc.Utf8);

  return data;
}
