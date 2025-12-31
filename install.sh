#!/bin/bash

# Colors for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if the network 'lumina-network' already exists
if [ ! "$(docker network ls -q -f name=lumina-network)" ]; then
    echo -e "${YELLOW}Network 'lumina-network' does not exist. Creating network...${NC}"
    docker network create lumina-network

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create Docker network. Please check your Docker setup.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Successfully created Docker network: lumina-network${NC}"
else
    echo -e "${YELLOW}Network 'lumina-network' already exists. Skipping network creation.${NC}"
fi

# Step 2: Check if the PostgreSQL container 'lumina-postgres' already exists
if [ "$(docker ps -aq -f name=lumina-postgres)" ]; then
    echo -e "${YELLOW}Container 'lumina-postgres' already exists. Skipping container creation.${NC}"
else
    echo -e "${YELLOW}2. 🐳 Starting PostgreSQL container...${NC}"
    docker run -d \
      --name lumina-postgres \
      --network lumina-network \
      -e POSTGRES_DB=postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=mysecretpassword \
      -e TZ=Asia/Shanghai \
      --restart always \
      postgres:14

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to start PostgreSQL container.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL container is running.${NC}"
fi

# Step 3: Prompt user to optionally mount the .lumina directory
echo -e "${YELLOW}Do you want to mount a local '.lumina' directory to '/app/.lumina' in the container? (y/n)${NC}"
read -p "Enter your choice: " mount_choice

if [[ "$mount_choice" == "y" || "$mount_choice" == "Y" ]]; then
    read -p "Please provide the path to your '.lumina' folder: " lumina_folder

    # Check if the directory exists; if not, create it
    if [ ! -d "$lumina_folder" ]; then
        echo -e "${YELLOW}Directory does not exist. Creating directory...${NC}"
        mkdir -p "$lumina_folder"

        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to create the directory. Please check permissions.${NC}"
            exit 1
        fi
    fi

    # Check if the directory has write permissions
    if [ ! -w "$lumina_folder" ]; then
        echo -e "${RED}The directory '$lumina_folder' does not have write permissions.${NC}"
        exit 1
    fi

    echo -e "${GREEN}Directory is ready for mounting: $lumina_folder${NC}"
    volume_mount="-v $lumina_folder:/app/.lumina"
else
    volume_mount=""
    echo -e "${YELLOW}Skipping mounting of .lumina directory.${NC}"
fi

# Step 4: Run Lumina container with or without volume path
echo -e "${YELLOW}3. 🖥️ Starting Lumina container...${NC}"
docker run -d \
  --name lumina-website \
  --network lumina-network \
  -p 1111:1111 \
  -e NODE_ENV=production \
  -e NEXTAUTH_SECRET=my_ultra_secure_nextauth_secret \
  -e DATABASE_URL=postgresql://postgres:mysecretpassword@lumina-postgres:5432/postgres \
  $volume_mount \
  --restart always \
  luminaspace/lumina:latest

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to start Lumina container.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All containers are up and running.${NC}"
