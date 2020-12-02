#!/bin/sh
echo "running npm install"
npm i
if [ $? -eq 0 ]; then
  echo "edit .env file first"
  vim .env
  echo "installing systemd service..."
  sudo cp systemd.service /lib/systemd/system/wxm-toolbox-api.service
  sudo systemctl enable wxm-toolbox-api.service
  echo "starting systemd service..."
  sudo sudo /bin/systemctl start wxm-toolbox-api.service
else
  echo "npm install failed"
fi
