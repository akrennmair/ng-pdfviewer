/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse','$log', '$q', function($parse, $log, $q) {
	var _pageToShow = 1;
	var canvas = [];
	var instance_id = null;

	return {
		restrict: "E",
		template: '',
		scope: {
			onPageLoad: '&',
			loadProgress: '&',
			src: '@',
			pagesToShow: '@',
			scale: '@',
			id: '='
		},
		controller: [ '$scope', function($scope) {
			$scope.pageNum = 1;
			$scope.pdfDoc = null;

			$scope.documentProgress = function(progressData) {
				if ($scope.loadProgress) {
					$scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
				}
			};
			
			$scope.setScale = function(){
				$scope.scale = 2;
			};
			
			$scope.renderDocument = function(){
				$log.log("Render Document");
				angular.forEach(canvas, function(c,index){
					var pageNumber = index + $scope.pageNum;
					$scope.renderPage(pageNumber, c, function(success) {
						$log.log("Rendering Page <" + pageNumber + "> SUCCESS <" + success + ">");
					});
				});
			};

			$scope.loadPDF = function(path) {
				$log.log('loadPDF ', path);

				var deferred = $q.defer();
				PDFJS.getDocument(path, null, null, $scope.documentProgress).then(function(_pdfDoc) {
					$log.log("Document read");

					$scope.pdfDoc = _pdfDoc;
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "finished", loaded: 0, total: 0});
					}
					deferred.resolve($scope.pdfDoc);
				}, function(message, exception) {
					$log.log("PDF load error: " + message + " <" + exception + "> ");
					deferred.reject(message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
				return deferred.promise;
			};

			$scope.renderPage = function(num, canvas, callback) {
				$log.log('renderPage ', num);
				$scope.pdfDoc.getPage(num).then(function(page) {
					var viewport = page.getViewport($scope.scale);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.render({ canvasContext: ctx, viewport: viewport }).then(
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
							$log.log('page.render failed');
						}
					);
				});
			};

			$scope.$on('pdfviewer.nextPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum < $scope.pdfDoc.numPages) {
					$scope.pageNum++;
					$scope.renderDocument();
				}
			});

			$scope.$on('pdfviewer.prevPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum > 1) {
					$scope.pageNum--;
					$scope.renderDocument();
				}
			});

			$scope.$on('pdfviewer.gotoPage', function(evt, id, page) {
				if (id !== instance_id) {
					return;
				}

				if (page >= 1 && page <= $scope.pdfDoc.numPages) {
					$scope.pageNum = page;
					$scope.renderDocument();
				}
			});
		} ],
		link: function(scope, iElement, iAttr) {
			
			createCanvas = function(iElement, count){
				var i = 0;
				canvas = iElement.find('canvas');
				for (i = 0; i<canvas.length; i++){
					angular.element(canvas[i]).remove();
				}
				for (i = 0; i<count; i++){
					var tmpCanvas = angular.element('<canvas>');
					tmpCanvas[0].setAttribute("id","page"+(i+1));
					iElement.append(tmpCanvas);
				}
				canvas = iElement.find('canvas');
			};
			
			instance_id = iAttr.id;

			iAttr.$observe('src', function(v) {
				$log.log('src attribute changed, new value is', v);
				if (v !== undefined && v !== null && v !== '') {
					scope.pageNum = 1;
					scope.loadPDF(scope.src).then(function (pdfDoc){
						$log.log('PDF Loaded');
						scope.pagesToShow = scope.pagesToShow==0?scope.pdfDoc.numPages : scope.pagesToShow;
						createCanvas(iElement,scope.pagesToShow);
						scope.renderDocument();

						iAttr.$observe('pagesToShow', function(v) {
							$log.log('pages-to-show attribute changed, new value is <' + v + ">");
							scope.pagesToShow = scope.pagesToShow==0?scope.pdfDoc.numPages : scope.pagesToShow;

							createCanvas(iElement,scope.pagesToShow);

							if (scope.pdfDoc!=null) {
								scope.renderDocument();
							}
						});


						iAttr.$observe('scale', function(v) {
 							$log.log('scale attribute changed, new value is <' + v + ">");
							scope.scale = v;
							if (scope.pdfDoc!=null)
								scope.renderDocument();
						});

					}, function(meg){
						$log.log(meg);
					});
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
			}
		};
	};

	return svc;
}]);
