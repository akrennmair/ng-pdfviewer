SRC=ng-pdfviewer.js
MIN_SRC=$(patsubst %.js,dist/%.min.js,$(SRC))

all: $(MIN_SRC)

dist/%.min.js: %.js
	closure-compiler --js $< --js_output_file $@ --create_source_map $(patsubst %.js,%.map,$@) --source_map_format=v3
	echo '//@ sourceMappingURL=$(patsubst %.js,%.map,$@)' >> $@

check:
	jshint $(SRC)

.PHONY: check
