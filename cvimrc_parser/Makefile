all:
	pnpx pegjs --optimize speed --format globals -e RCParser parser.peg && cp parser.js ../src/content_scripts/cvimrc_parser.js

test: all
	node ./test/test.js

clean:
	rm -f parser.js
