/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse', function($parse) {
	var canvas = null;
	var instance_id = null;

	return {
		restrict: "E",
		template: '<canvas></canvas>',
		scope: {
			onPageLoad: '&',
			loadProgress: '&',
			src: '@',
			base64: '@',
			id: '='
		},
		controller: [ '$scope', function($scope) {
			$scope.pageNum = 1;
			$scope.pdfDoc = null;
			$scope.scale = 1.0;
			$scope.MAX_ZOOM_OUT = 0.4;
			$scope.MAX_ZOOM_IN = 3.0;
			$scope.SCALE_STEP = 0.1;

			$scope.documentProgress = function(progressData) {
				if ($scope.loadProgress) {
					$scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
				}
			};

			$scope.loadPDF = function(path) {
				console.log('loadPDF ', path);
				PDFJS.getDocument(path, null, null, $scope.documentProgress).then(function(_pdfDoc) {
					$scope.pdfDoc = _pdfDoc;
					$scope.renderPage($scope.pageNum, function(success) {
						if ($scope.loadProgress) {
							$scope.loadProgress({state: "finished", loaded: 0, total: 0});
						}
					});
				}, function(message, exception) {
					console.log("PDF load error: " + message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
			};

			$scope.loadBase64PDF = function(base64) {
				console.log('loadBase64PDF');
				PDFJS.getDocument(StringView.base64ToBytes(base64)).then(function(_pdfDoc) {
					console.log("Loaded");
					$scope.pdfDoc = _pdfDoc;
					$scope.renderPage($scope.pageNum, function(success) {
						if ($scope.loadProgress) {
							$scope.loadProgress({state: "finished", loaded: 0, total: 0});
						}
					});
				}, function(message, exception) {
					console.log("PDF load error: " + message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
			};

			$scope.renderPage = function(num, callback) {
				console.log('renderPage ', num);
				$scope.pdfDoc.getPage(num).then(function(page) {
					var viewport = page.getViewport($scope.scale);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.render({ canvasContext: ctx, viewport: viewport }).promise.then(
						function() { 
							if (callback) {
								callback(true);
							}
							$scope.$apply(function() {
								$scope.onPageLoad({ page: $scope.pageNum, total: $scope.pdfDoc.numPages });
							});
						}, 
						function() {
							if (callback) {
								callback(false);
							}
							console.log('page.render failed');
						}
					);
				});
			};
			$scope.$on('pdfviewer.zoomIn', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.scale < $scope.MAX_ZOOM_IN) {
					$scope.scale+=$scope.SCALE_STEP;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.zoomOut', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.scale > $scope.MAX_ZOOM_OUT) {
					$scope.scale-=$scope.SCALE_STEP;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.zoomReset', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				$scope.scale = 1.0;
				$scope.renderPage($scope.pageNum);
			});

			$scope.$on('pdfviewer.nextPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum < $scope.pdfDoc.numPages) {
					$scope.pageNum++;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.prevPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum > 1) {
					$scope.pageNum--;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.gotoPage', function(evt, id, page) {
				if (id !== instance_id) {
					return;
				}

				if (page >= 1 && page <= $scope.pdfDoc.numPages) {
					$scope.pageNum = page;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.reset', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				$scope.pdfDoc = null;
				$scope.onPageLoad({ page: -1, total: -1 });
				$scope.scale = 1.0;
				$(instance_id).find('canvas').remove();
				canvas = $('<canvas></canvas>')[0];
				$(instance_id).append(canvas);
			});
		} ],
		link: function(scope, iElement, iAttr) {
			canvas = iElement.find('canvas')[0];
			instance_id = iAttr.id;

			iAttr.$observe('src', function(v) {
				console.log('src attribute changed, new value is', v);
				if (v !== undefined && v !== null && v !== '') {
					scope.pageNum = 1;
					scope.loadPDF(scope.src);
				}
			});
			iAttr.$observe('base64', function(v) {
				console.log('base64 attribute changed');
				if (v !== undefined && v !== null && v !== '') {
					console.log("new len is", v.length);
					scope.pageNum = 1;
					scope.loadBase64PDF(scope.base64);
				}
			});
		}
	};
}]).
service("PDFViewerService", [ '$rootScope', function($rootScope) {

	var svc = { };
	svc.nextPage = function() {
		$rootScope.$broadcast('pdfviewer.nextPage');
	};

	svc.prevPage = function() {
		$rootScope.$broadcast('pdfviewer.prevPage');
	};

	svc.Instance = function(id) {
		var instance_id = id;

		return {
			prevPage: function() {
				$rootScope.$broadcast('pdfviewer.prevPage', instance_id);
			},
			nextPage: function() {
				$rootScope.$broadcast('pdfviewer.nextPage', instance_id);
			},
			gotoPage: function(page) {
				$rootScope.$broadcast('pdfviewer.gotoPage', instance_id, page);
			},
			zoomIn: function() {
				$rootScope.$broadcast('pdfviewer.zoomIn', instance_id);
			},
			zoomOut: function() {
				$rootScope.$broadcast('pdfviewer.zoomOut', instance_id);
			},
			zoomReset: function() {
				$rootScope.$broadcast('pdfviewer.zoomReset', instance_id);
			},
			reset: function() {
				$rootScope.$broadcast('pdfviewer.reset', instance_id);
			}
		};
	};

	return svc;
}]);
