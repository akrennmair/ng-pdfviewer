# ng-pdfviewer

# *** WARNING *** Since I keep getting support requests for this: I haven't maintained ng-pdfviewer for ages, and I do not plan to do any further work on it. DO NOT USE THIS IN PRODUCTION!!!

AngularJS PDF viewer directive using pdf.js.

``` html
<button ng-disabled="currentPage<=1" class="btn btn-default" ng-click="firstPage()">&laquo;</button>
<button ng-disabled="(currentPage-1)<1" class="btn btn-default" ng-click="prevPage()">&lsaquo;</button>
<button ng-disabled="(currentPage+1)>totalPages" class="btn btn-default" ng-click="nextPage()">&rsaquo;</button>
<button ng-disabled="currentPage>=totalPages" class="btn btn-default" ng-click="lastPage()">&raquo;</button>
<button class="btn btn-default" ng-click="zoomIn()"><i class="fa fa-search-plus fa-fw"/></button>
<button class="btn btn-default" ng-click="zoomOut()"><i class="fa fa-search-minus fa-fw"/></button>
<button class="btn btn-default" ng-click="zoomReset()"><i class="fa fa-search fa-fw"/></button>
<br>
<span>{{currentPage}}/{{totalPages}}</span>
<br>
<pdfviewer base64="{{ base64encoded }}" src="test.pdf" on-page-load='pageLoaded(page,total)' id="viewer"></pdfviewer>
```

and in your AngularJS code:

``` js

var app = angular.module('testApp', [ 'ngPDFViewer' ]);

app.controller('TestCtrl', [ '$scope', 'PDFViewerService', function($scope, pdf) {
	$scope.viewer = pdf.Instance("viewer");

  $scope.gotoPage = function(p){
		$scope.instance.gotoPage(p);
  };

  $scope.prevPage = function(){
		$scope.instance.prevPage();
  };

  $scope.nextPage = function(){
		$scope.instance.nextPage();
  };

  $scope.firstPage = function(){
    $scope.gotoPage(1);
  };

  $scope.lastPage = function(){
    $scope.gotoPage($scope.totalPages);
  };

  $scope.zoomIn = function(){
    $scope.instance.zoomIn();
  };

  $scope.zoomOut = function(){
    $scope.instance.zoomOut();
  };

  $scope.zoomReset = function(){
    $scope.instance.zoomReset();
  };

	$scope.pageLoaded = function(curPage, totalPages) {
		$scope.currentPage = curPage;
		$scope.totalPages = totalPages;
	};
}]);
```

## Requirements

* AngularJS (http://angularjs.org/)
* PDF.js (http://mozilla.github.io/pdf.js/)
* StringView (https://developer.mozilla.org/en-US/Add-ons/Code_snippets/StringView)

## Usage

Include `ng-pdfviewer.js` as JavaScript file, along with `pdf.js` and `pdf.compat.js`.

Declare `ngPDFViewer` as dependency to your module.

You can now use the `pdfviewer` tag in your HTML source.

## Attention

base64 encoded file can't have the "data:application/pdf;base64," prefix. Remove it before load.

## License

MIT. See LICENSE.md for further details.

## Author

Andreas Krennmair <ak@synflood.at>

## Repo Maintainer

Matteo Gaggiano <maxxxx92@gmail.com>
