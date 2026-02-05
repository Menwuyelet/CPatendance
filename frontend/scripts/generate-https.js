// Simple HTTPS certificate generator for local development
// Run: node scripts/generate-https.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.resolve(__dirname, '../cert');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

console.log('Generating SSL certificates...');

// Try using openssl via system call
try {
  // Generate private key
  execSync(`openssl genrsa -out "${path.join(certDir, 'key.pem')}" 2048`, {
    stdio: 'inherit',
    shell: 'powershell.exe'
  });

  // Generate certificate
  execSync(`openssl req -new -x509 -key "${path.join(certDir, 'key.pem')}" -out "${path.join(certDir, 'cert.pem')}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, {
    stdio: 'inherit',
    shell: 'powershell.exe'
  });

  console.log('✅ SSL certificates generated successfully!');
} catch (error) {
  console.log('OpenSSL not found. Trying alternative method...');
  
  // Alternative: Use Node.js to create certificates
  const crypto = require('crypto');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  // Create self-signed certificate using ASN.1
  // This is a simplified approach - for production, use proper certificates
  
  // For now, let's use a pre-generated certificate approach
  console.log('Please install OpenSSL or use ngrok for HTTPS tunneling.');
  console.log('Download ngrok: https://ngrok.com/download');
  console.log('');
  console.log('Usage:');
  console.log('1. npm run dev (start Vite on port 5174)');
  console.log('2. ngrok http 5174');
  console.log('3. Use the HTTPS URL from ngrok on your phone');
}
