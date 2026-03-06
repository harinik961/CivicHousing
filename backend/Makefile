build:
	docker build -t civichousing-backend .

run:
	docker run -p 5000:5000 --env-file .env civichousing-backend

stop:
	docker stop $$(docker ps -q --filter ancestor=civichousing-backend)

rebuild:
	docker build --no-cache -t civichousing-backend .

logs:
	docker logs $$(docker ps -q --filter ancestor=civichousing-backend)