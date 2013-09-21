var app = angular.module('testApp', [ 'ngPDFViewer' ]);

app.controller('TestController', [ '$scope', 'PDFViewerService', function($scope, pdf) {
	console.log('TestController: new instance');

	$scope.pdfURL = "test.pdf";

	$scope.instance = pdf.Instance("viewer");

	$scope.nextPage = function() {
		$scope.instance.nextPage();
	};

	$scope.prevPage = function() {
		$scope.instance.prevPage();
	};

	$scope.pageLoaded = function(curPage, totalPages) {
		$scope.currentPage = curPage;
		$scope.totalPages = totalPages;
	};

	$scope.loadProgress = function(loaded, total, state) {
		console.log('loaded =', loaded, 'total =', total, 'state =', state);
	};
}]);
