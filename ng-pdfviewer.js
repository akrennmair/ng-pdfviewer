// AngularJS PDF viewer directive using pdf.js.

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse', function($parse) {
	var canvas = null;

	return {
		restrict: "E",
		template: '<canvas></canvas>',
		scope: {
			onPageLoad: '&',
			src: '@'
		},
		controller: [ '$scope', function($scope) {
			$scope.pageNum = 1;
			$scope.loadProgress = 0;
			$scope.pdfDoc = null;
			$scope.scale = 1.0;

			$scope.loadPDF = function(path) {
				console.log('loadPDF ', path);
				PDFJS.getDocument(path).then(function(_pdfDoc) {
					$scope.pdfDoc = _pdfDoc;
					$scope.renderPage($scope.pageNum, function(success) {
						$scope.loadProgress = 0;
					});
				}, function(message, exception) {
					console.log("PDF load error: " + message);
					throw exception;
				}, function(progressData) {
					$scope.loadProgress = (100 * progressData.loaded) / progressData.total;
					$scope.loadProgress = Math.round($scope.loadProgress*100)/100;
				});
			};

			$scope.renderPage = function(num) {
				console.log('renderPage ', num);
				$scope.pdfDoc.getPage(num).then(function(page) {
					var viewport = page.getViewport($scope.scale);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.render({ canvasContext: ctx, viewport: viewport }).then(
						function() { 
							$scope.$apply(function() {
								$scope.onPageLoad({ page: $scope.pageNum, total: $scope.pdfDoc.numPages });
							});
						}, 
						function() {
							console.log('page.render failed');
						}
					);
				});
			};

			$scope.$on('pdfviewer.nextPage', function() {
				if ($scope.pageNum < $scope.pdfDoc.numPages) {
					$scope.pageNum++;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.prevPage', function() {
				if ($scope.pageNum > 1) {
					$scope.pageNum--;
					$scope.renderPage($scope.pageNum);
				}
			});
		} ],
		link: function(scope, iElement, iAttr) {
			canvas = iElement.find('canvas')[0];
			console.log('link called. src = ', iAttr.src);

			iAttr.$observe('src', function(v) {
				console.log('src attribute changed, new value is', v);
				if (v !== undefined && v !== null && v !== '') {
					scope.loadPDF(scope.src);
				}
			});
		}
	};
}]);
