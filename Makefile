SRC=ng-pdfviewer.js
MIN_SRC=$(patsubst %.js,dist/%.min.js,$(SRC))

all: $(MIN_SRC)

dist/%.min.js: %.js
	closure-compiler --js $< --js_output_file $@

check:
	jshint $(SRC)

.PHONY: check
