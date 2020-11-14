# Rijkslounge.nl
Alternatief voor [Rijksconnect](https://rijskconnect.nl)

* [GitHub Project board](https://github.com/cookiemonster/rijkslounge.nl/projects/1)
* [Trello project board](https://trello.com/b/lbQNN778/rijksconnect-rijkslounge)
* [Technical Design Documents](https://drive.google.com/drive/folders/1u5iz2GHJ6kplOwkvko4R7vSNqHvoTRrz?usp=sharing)



## Installatie

Maak een Virtual network/subnet: rijkslounge-vnet/default aan

/etc/hosts
```
10.0.5.1 	w1.rijkslounge.nl w1 # Web loadbalancer / Standard D3 v2 (4 vcpus, 14 GiB memory)
10.0.5.2 	w2.rijkslounge.nl w2 # Web loadbalancer / Standard D3 v2 (4 vcpus, 14 GiB memory)
10.0.5.3 	w3.rijkslounge.nl w3 # Web loadbalancer / Standard D3 v2 (4 vcpus, 14 GiB memory)
10.0.6.1 	d1.rijkslounge.nl d1 # MongoDB primary / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.6.2 	d2.rijkslounge.nl d2 # MongoDB replica / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.6.3 	d3.rijkslounge.nl d3 # MongoDB replica / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.7.1	c1.rijkslounge.nl c1 # Rocket.Chat APP server 1 / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.7.2 	c2.rijkslounge.nl c2 # Rocket.Chat APP server 2 / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.7.3 	c3.rijkslounge.nl c3 # Rocket.Chat APP server 3 / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.8.1 	v1.rijkslounge.nl v1 # Jitsi-Meet server / Standard DS4 v2 (8 vcpus, 28 GiB memory)
10.0.8.2 	v2.rijkslounge.nl v2 # Jitsi-Meet server / Standard DS4 v2 (8 vcpus, 28 GiB memory)
```

### Opbouwen van een Docker deployment met [CoreOS](https://coreos.com/)

#### Database 
```
root@d*:/# export d1=10.0.6.1 
root@d*:/# export d2=10.0.6.2 
root@d*:/# export d3=10.0.6.3
```

Genereer een sleutelbestand dat op alle MongdoDB nodes kan worden gebruikt. 
Voer dit een keer uit op een van de servers en kopieer het bestand vervolgens naar de andere 2 servers. 
```
root@d*:/# mkdir -p /home/core
root@d*:/# cd /home/core
root@d*:/# openssl rand -base64 741 > mongodb-keyfile
root@d*:/# chmod 600 mongodb-keyfile
root@d*:/# sudo chown 999 mongodb-keyfile
```

Start de mongodb-container op d1.rijkslounge.nl. Hierdoor wordt de container gestart zonder authenticatie zodat ingericht kan worden.
```
root@d1:/# docker run --name mongo \
-v /home/core/database/data:/data/db \
-v /home/core/database:/opt/keyfile \
--hostname="d1.rijkslounge.nl" \
-p 27017:27017 \
-d mongo:2.6.5 --smallfiles
```

Maak een admin gebruiker aan via de interactieve shell.
```
root@d1:/# docker exec -it mongo /bin/bash
root@d1:/# mongo

> use admin
switched to db admin

> db.createUser( {
     user: "siteUserAdmin",
     pwd: "Dit is geen echt wachtwoord",
     roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
   });


> db.createUser( {
     user: "siteRootAdmin",
     pwd: "password",
     roles: [ { role: "root", db: "admin" } ]
   });

> exit
exit
```


Stop en verwijder de MongoDB instance op d1.rijkslounge.nl
```
root@d1:/# docker stop mongo
root@d1:/# docker rm mongo
```

Start de eerste MongoDB instance met de key file op d1.rijkslounge.nl.
```
root@d1:/# docker run \
--name mongo \
-v /home/core/database/data:/data/db \
-v /home/core/database:/opt/keyfile \
--hostname="d1.rijkslounge.nl" \
--add-host d1.rijkslounge.nl:${d1} \
--add-host d2.rijkslounge.nl:${d2} \
--add-host d3.rijkslounge.nl:${d3} \
-p 27017:27017 -d mongo:2.6.5 \
--smallfiles \
--keyFile /opt/keyfile/mongodb-keyfile \
--replSet "rs0"

root@d1:/# docker exec -it mongo /bin/bash
root@d1:/# mongo
> use admin
> db.auth("siteRootAdmin", "Dit is geen echt wachtwoord");
> rs.initiate()
> rs.conf()
```

Op d2.rijkslounge.nl
```
root@d2:/# docker run \
--name mongo \
-v /home/core/database/data:/data/db \
-v /home/core/database:/opt/keyfile \
--hostname="d2.rijkslounge.nl" \
--add-host d1.rijkslounge.nl:${d1} \
--add-host d2.rijkslounge.nl:${d2} \
--add-host d3.rijkslounge.nl:${d3} \
-p 27017:27017 -d mongo:2.6.5 \
--smallfiles \
--keyFile /opt/keyfile/mongodb-keyfile \
--replSet "rs0"
```


Op d3.rijkslounge.nl
```
root@d3:/# docker run \
--name mongo \
-v /home/core/database/data:/data/db \
-v /home/core/database:/opt/keyfile \
--hostname="d3.rijkslounge.nl" \
--add-host d1.rijkslounge.nl:${d1} \
--add-host d2.rijkslounge.nl:${d2} \
--add-host d3.rijkslounge.nl:${d3} \
-p 27017:27017 -d mongo:2.6.5 \
--smallfiles \
--keyFile /opt/keyfile/mongodb-keyfile \
--replSet "rs0"
```


Nu d2.rijkslounge.nl en d3.rijkslounge.nl configureren als repplica.
```
root@d1:/# docker exec -it mongo /bin/bash
root@d1:/# mongo

> use admin

rs0:PRIMARY> rs.add("d2.rijkslounge.nl")
rs0:PRIMARY> rs.add("d3.rijkslounge.nl")
rs0:PRIMARY> rs.status()

```

Controleer de MongoDB logfiles op fouten alle MongoDB nodes
```
root@d*:/# docker logs -ft mongo
```


#### Installatie Rocket.Chat op c1.rijkslounge.nl

Maak directories aan:
```
sudo mkdir -p /var/www/rijkslounge.nl/data/runtime/db
sudo mkdir -p /var/www/rijkslounge.nl/data/dump

```

Haal de laatste versie van Rocket.Chat op:
```
docker pull rocketchat/rocket.chat:latest
```

Maak en bewerk Docker-compose.yml:
```
version: '2'

services:
  rocketchat:
    image: rocketchat/rocket.chat:latest
    command: >
      bash -c
        "for i in `seq 1 30`; do
          node main.js &&
          s=$$? && break || s=$$?;
          echo \"Tried $$i times. Waiting 5 secs...\";
          sleep 5;
        done; (exit $$s)"
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
    environment:
        - PORT=3000
        - ROOT_URL=https://rijkslounge.nl
        - MONGO_URL=mongodb://rocket:wachtwoord@d1.rijkslounge.nl:27017,d2.rijkslounge.nl:27017,d3.rijkslounge.nl:27017/rocketchat?authSource=admin&replicaSet=rs0&w=majority
        - MONGO_OPLOG_URL=mongodb://oploguser:wachtwoord@d1.rijkslounge.nl:27017,d2.rijkslounge.nl:27017,d3.rijkslounge.nl:27017/local?authSource=admin&replicaSet=rs0
        - INSTANCE_IP=10.0.7.1
    ports:
        - 3000:3000
    extra_hosts:
        - "c1.rijkslounge.nl:10.0.7.1"
        - "c2.rijkslounge.nl:10.0.7.2"
        - "c3.rijkslounge.nl:10.0.7.3"

#       - HTTP_PROXY=http://proxy.domain.com
#       - HTTPS_PROXY=http://proxy.domain.com
    depends_on:
      - mongo
    ports:
      - 3000:3000
    labels:
      - "traefik.backend=rocketchat"
      - "traefik.frontend.rule=Host: rijkslounge.nl"

  mongo:
    image: mongo:4.0
    restart: unless-stopped
    volumes:
     - ./data/db:/data/db
     #- ./data/dump:/dump
    command: mongod --smallfiles --oplogSize 128 --replSet rs0 --storageEngine=mmapv1
    labels:
      - "traefik.enable=false"

  # this container's job is just run the command to initialize the replica set.
  # it will run the command and remove himself (it will not stay running)
  mongo-init-replica:
    image: mongo:4.0
    command: >
      bash -c
        "for i in `seq 1 30`; do
          mongo mongo/rocketchat --eval \"
            rs.initiate({
              _id: 'rs0',
              members: [ { _id: 0, host: 'localhost:27017' } ]})\" &&
          s=$$? && break || s=$$?;
          echo \"Tried $$i times. Waiting 5 secs...\";
          sleep 5;
        done; (exit $$s)"
    depends_on:
      - mongo

  # hubot, the popular chatbot (add the bot user first and change the password before starting this image)
  hubot:
    image: rocketchat/hubot-rocketchat:latest
    restart: unless-stopped
    environment:
      - ROCKETCHAT_URL=rocketchat:3000
      - ROCKETCHAT_ROOM=GENERAL
      - ROCKETCHAT_USER=bot
      - ROCKETCHAT_PASSWORD=geen echt wachtwoord
      - BOT_NAME=bot
  # you can add more scripts as you'd like here, they need to be installable by npm
      - EXTERNAL_SCRIPTS=hubot-help,hubot-seen,hubot-links,hubot-diagnostics
    depends_on:
      - rocketchat
    labels:
      - "traefik.enable=false"
    volumes:
      - ./scripts:/home/hubot/scripts
  # this is used to expose the hubot port for notifications on the host on port 3001, e.g. for hubot-jenkins-notifier
    ports:
      - 3001:8080

  #traefik:
  #  image: traefik:latest
  #  restart: unless-stopped
  #  command: >
  #    traefik
  #     --docker
  #     --acme=true
  #     --acme.domains='your.domain.tld'
  #     --acme.email='your@email.tld'
  #     --acme.entrypoint=https
  #     --acme.storagefile=acme.json
  #     --defaultentrypoints=http
  #     --defaultentrypoints=https
  #     --entryPoints='Name:http Address::80 Redirect.EntryPoint:https'
  #     --entryPoints='Name:https Address::443 TLS.Certificates:'
  #  ports:
  #    - 80:80
  #    - 443:443
  #  volumes:
  #    - /var/run/docker.sock:/var/run/docker.sock

  # PKIoverheid-certificaat installatie is helaas nog handmatig.

```

Start Rocketchat op c1.rijkslounge.nl
```
root@c1:/#docker-compose up -d
```

