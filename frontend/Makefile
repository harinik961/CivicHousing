# Variables

APP_NAME=civichousing-frontend

# Local Development
# (If npm is not installed, use 'make docker-dev' to run with Node inside Docker.)

install:
	npm install

start:
	npm start

# Run npm install + npm start inside a Node Docker container (no local Node needed).
# Use this when 'npm' is not recognized on your machine.
# On Windows PowerShell, run this instead (from frontend folder; use one $ and PWD):
#   docker run -it --rm -p 3000:3000 -v "${PWD}:/app" -w /app -e CHOKIDAR_USEPOLLING=true node:24-alpine sh -c "npm install && npm start"
docker-dev:
	docker run -it --rm -p 3000:3000 -v "$$(pwd):/app" -w /app -e CHOKIDAR_USEPOLLING=true node:24-alpine sh -c "npm install && npm start"

# Docker

build:
	docker build -t $(APP_NAME) .

run:
	docker run -p 3000:80 $(APP_NAME)

stop:
	docker stop $$(docker ps -q --filter ancestor=$(APP_NAME)) 2>/dev/null || true

rebuild:
	docker build --no-cache -t $(APP_NAME) .

logs:
	docker logs $$(docker ps -q --filter ancestor=$(APP_NAME))
