all:
	node scripts/create_pages.js
	cd ./src/cvimrc_parser && make

release: all
	./scripts/build.sh

clean:
	rm -rf release*
