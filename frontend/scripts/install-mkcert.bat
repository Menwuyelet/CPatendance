# Install mkcert for HTTPS certificates on Windows
# Run this script as Administrator

echo "Downloading mkcert..."
curl -L -o mkcert.exe https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe

echo "Installing mkcert..."
mkcert -install

echo "Generating certificates for localhost and your IP..."
mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 10.240.41.144 192.168.1.1

echo "✅ Certificates generated!"
echo "Files created: cert.pem, key.pem"
echo ""
echo "Now restart Vite dev server and access via https://10.240.41.144:5174"
