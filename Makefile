# get git config
config:
	git config -l

# get git log
log: 
	git log --oneline > git-log.txt

# get git status
status:
	git branch
	git remote -v
	git status

# download files from the project code repo
	git fetch
	git pull
	git status

# installs dependencies of project
install:
	cd frontend && npm install

# locally run website
run:
	cd frontend && npm start

# installs dependencies and locally runs website
run-local: 
	cd frontend && npm install && npm start

# creates build folder and files for website
build:
	cd frontend && npm run build

# removes temporary files
clean:
	rm -f git-log.txt

# run docker-compose up
docker-compose:
	docker compose up --build