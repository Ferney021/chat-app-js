self.window = self;

self.importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/2.3.1/jsencrypt.min.js"
);

let crypt = null;
let privateKey = null;

onmessage = function (e) {
  const [messageType, messageId, text, key] = e.data;
  let result;
  switch (messageType) {
    case "generate-keys":
      result = generateKeypair();
      break;
    case "encrypt":
      result = encrypt(text, key);
      break;
    case "decrypt":
      result = decrypt(text);
      break;
  }

  postMessage([messageId, result]);
};

function gcd(a, b) {
  if (b === 0) {
    return a;
  }
  return gcd(b, a % b);
}

function modInverse(e, phi) {
  let d = 0;
  let x1 = 0;
  let x2 = 1;
  let y1 = 1;
  let tempPhi = phi;

  while (e > 0) {
    const temp1 = Math.floor(tempPhi / e);
    const temp2 = tempPhi - temp1 * e;
    tempPhi = e;
    e = temp2;

    const x = x2 - temp1 * x1;
    const y = d - temp1 * y1;

    x2 = x1;
    x1 = x;
    d = y1;
    y1 = y;
  }

  if (tempPhi === 1) {
    return d + phi;
  }
}

function generateRandomPrime(min, max) {
  const isPrime = (num) => {
    if (num === 2 || num === 3) return true;
    if (num % 2 === 0 || num < 2) return false;

    const maxDivisor = Math.sqrt(num);
    for (let i = 3; i <= maxDivisor; i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  };

  let randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  while (!isPrime(randomNum)) {
    randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return randomNum;
}

/** Generate and store keypair */
function generateKeypair() {
  const min = 50;
  const max = 512;

  const p = generateRandomPrime(min, max);
  const q = generateRandomPrime(min, max);

  const n = p * q;
  const phi = (p - 1) * (q - 1);
  let e = 2;

  while (e < phi) {
    if (gcd(e, phi) === 1) {
      break;
    } else {
      e++;
    }
  }

  const d = modInverse(e, phi);

  privateKey = { d, n };

  return { e, n };
}

function encrypt(content, publicKey) {
  const { e, n } = publicKey;
  const encryptedMessage = content.split("").map((char) => {
    const charCode = char.charCodeAt(0);
    return BigInt(charCode) ** BigInt(e) % BigInt(n);
  });
  return encryptedMessage.toString();
}

function decrypt(content) {
  const { d, n } = privateKey;
  const decryptedMessage = content.split(",").map((charCode) => {
    const decrypted = BigInt(charCode) ** BigInt(d) % BigInt(n);
    return String.fromCharCode(Number(decrypted));
  });
  return decryptedMessage.join("");
}
