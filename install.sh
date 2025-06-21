#!/data/data/com.termux/files/usr/bin/bash

pkg up -y && pkg install openjdk-21 wget nano nodejs -y
mkdir papermc && cd papermc 
wget -O server.jar https://api.papermc.io/v2/projects/paper/versions/1.21.4/builds/232/downloads/paper-1.21.4-232.jar
java -jar server.jar || true
sed -i 's/eula=false/eula=true/' eula.txt
npm init -y
npm install express socket.io multer fs-extra
mkdir public && cd public
wget https://raw.githubusercontent.com/swk3087/papermc-web/refs/heads/main/index.html
cd ..
wget https://raw.githubusercontent.com/swk3087/papermc-web/refs/heads/main/server.js
echo "alias paper='node ~/papermc/server.js'" >> ~/.bashrc
source ~/.bashrc
echo "end. cmd paper to start"
