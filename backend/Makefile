# Variables

APP_NAME=civichousing-api
ENV_NAME=civichousing-api-env

# Local Development

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

install:
	pip install -r requirements.txt

flask-run: 
	FLASK_APP=app.py flask run

migrate:
	flask db migrate -m "migration"

upgrade:
	flask db upgrade

# Elastic Beanstalk 
# Must install 'pip install awsebcli' and authenticate 'aws configure' once
# You should not need to run eb-init or eb-create. Once authenticated, 
# eb deploy should be enough to deploy since our eb instance already exists

eb-init: 
	eb init

eb-create:
	eb create $(ENV_NAME)

deploy:
	eb deploy

status:
	eb status

logs:
	eb logs

health:
	eb health

open:
	eb open