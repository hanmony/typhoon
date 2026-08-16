## Description
台风案例库

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## MongoDB
DOCKER 直接启动
```bash
docker run --name mongo -p 27017:27017 -d mongodb/mongodb-community-server:latest --replSet "dbrs" --bind_ip_all
```
下行中0ef为容器ID，自行替换
```bash
docker exec -it 0ef /bin/bash
mongosh
rs.initiate({_id: "dbrs", members: [{_id:0, host: "localhost"}]})
```
## 备份：
0 3 * * * docker exec -d typhoon-mongodb-1 mongodump --db typhoon --gzip --archive=/dump/typhoon-$(date +"\%Y-\%m-\%d")


## 服务器账号
172.20.41.74

root
Metro@2022

op
Metro@op@123456
