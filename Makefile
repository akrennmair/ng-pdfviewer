all: ng-pdfviewer.min.js

ng-pdfviewer.min.js: ng-pdfviewer.js
	closure-compiler --js $< --js_output_file $@

check:
	jshint ng-pdfviewer.js

.PHONY: check
