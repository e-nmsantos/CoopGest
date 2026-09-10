#!/usr/bin/env bash
set -e

echo "=== [1/5] A instalar dependências do sistema ==="
apt-get update -y
apt-get install -y python3 python3-pip python3-venv git nginx

echo "=== [2/5] A descarregar o repositório CoopGest ==="
mkdir -p /var/www
cd /var/www
if [ -d "CoopGest" ]; then
    cd CoopGest
    git pull origin main
else
    git clone https://github.com/e-nmsantos/CoopGest.git
    cd CoopGest
fi

echo "=== [3/5] A configurar o ambiente Python ==="
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo "=== [4/5] A configurar o serviço permanente (systemd) ==="
cat << 'EOF' > /etc/systemd/system/coopgest.service
[Unit]
Description=CoopGest Application Service
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/CoopGest
Environment="PATH=/var/www/CoopGest/venv/bin"
Environment="FLASK_ENV=production"
Environment="PORT=8000"
ExecStart=/var/www/CoopGest/venv/bin/python wsgi.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable coopgest
systemctl restart coopgest

echo "=== [5/5] A configurar o servidor web Nginx (Porta 80) ==="
cat << 'EOF' > /etc/nginx/sites-available/coopgest
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/coopgest /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo ""
echo "=========================================================="
echo "  COOPGEST INSTALADO COM SUCESSO!"
echo "  Aceda no seu browser em: http://$(curl -s ifconfig.me)"
echo "=========================================================="
