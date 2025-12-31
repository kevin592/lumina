### run docker config for docker
```
docker-compose -f docker-compose.prod.yml up -d
```

## build docker with dockerfile locally
```
docker build --build-arg USE_MIRROR=true -t lumina .
docker run --name lumina-website -d -p 1111:1111 -e "DATABASE_URL=postgresql://postgres:mysecretpassword@192.168.31.200:5438/postgres"  -v "C:\Users\94972\Desktop\testlumina:/app/.lumina" lumina
```

## build docker with dockerfile locally on arm64
```
docker buildx build --platform linux/arm64 -t lumina-arm .

docker run --name lumina-website --platform linux/arm64 -d -p 1111:1111 -e "DATABASE_URL=postgresql://postgres:mysecretpassword@192.168.31.200:5438/postgres"  -v "C:\Users\94972\Desktop\testlumina:/app/.lumina" luminaspace/lumina:latest

docker run -p 1111:1111 -e "DATABASE_URL=postgresql://postgres:mysecretpassword@192.168.31.200:5438/postgres"  -v "C:\Users\94972\Desktop\testlumina:/app/.lumina" luminaspace/lumina:latest
```

## build docker image & run with docker-compose locally
```
docker-compose -f docker-compose.yml up -d --build
```


## run test docker
```
docker run -d \
  --name lumina-website \
  --network lumina-network \
  -p 1111:1111 \
  -e NODE_ENV=production \
  -v /volume1/docker/lumina/luminadata:/app/.lumina \
  -e NEXTAUTH_SECRET=my_ultra_secure_nextauth_secret \
  -e DATABASE_URL=postgresql://postgres:mysecretpassword@lumina-postgres:5432/postgres \
  --restart always \
  luminaspace/lumina:fa46f26
```

# add @mastra/rag
```
pnpm add @mastra/rag --ignore-scripts
```


# act-cli
choco install act-cli

act -W .github/workflows/debug-changelog.yml

## runnung job
act -j debug-changelog -W .github/workflows/debug-changelog.yml


## RUN on QEMU
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
docker run -d \
--name lumina-postgres \
--network lumina-network \
-p 5435:5432 \
-e POSTGRES_DB=postgres \
-e POSTGRES_USER=postgres \
-e POSTGRES_PASSWORD=mysecretpassword \
-e TZ=Asia/Shanghai \
--restart always \
postgres:14

docker run -d \
  --name lumina-website \
  --network lumina-network \
  -p 1111:1111 \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=http://localhost:1111 \
  -e NEXT_PUBLIC_BASE_URL=http://localhost:1111 \
  -e NEXTAUTH_SECRET=my_ultra_secure_nextauth_secret \
  -e DATABASE_URL=postgresql://postgres:mysecretpassword@lumina-postgres:5432/postgres \
  --restart always \
  --platform linux/arm64 \
  luminaspace/lumina:latest
