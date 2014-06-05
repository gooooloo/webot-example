start:
	@export DEBUG=webot* && npm start

clear:
	@clear

test: clear
	@export DEBUG="webot* -*verbose" && ./node_modules/.bin/mocha
