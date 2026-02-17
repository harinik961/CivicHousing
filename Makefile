install:
	npm install

run:
	npm start

build:
	npm run build

log: 
	git log --oneline > git-log.txt
	
clean:
	rm -f git-log.txt
