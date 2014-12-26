/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$log', '$q', function($log, $q) {
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
			$scope.renderInProgress = false;
			$scope.forceReRender = true;

			$scope.documentProgress = function(progressData) {
				if ($scope.loadProgress) {
					$scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
				}
			};
			
			$scope.setScale = function(newValue){
				if (angular.isNumber(newValue)) {
					$scope.scale = newValue;
					$scope.forceReRender = true;
				}
			};
			
			$scope.renderDocument = function(){
				$log.debug("Render Document");
				angular.forEach(canvas, function(c,index){
					if (index==0)
						$scope.renderInProgress=true;
					var pageNumber = index + $scope.pageNum;
					$scope.renderPage(pageNumber, c, function(success) {
						$log.debug("Rendered Page <" + pageNumber + "> SUCCESS <" + success + ">");
						if (pageNumber==canvas.length){
							$scope.renderInProgress=false;
							$scope.forceReRender = false;
						}
					});
				});
			};

			$scope.loadPDF = function(path) {
				$log.debug("loadPDF <"+ path+">");

				var deferred = $q.defer();
				PDFJS.getDocument(path, null, null, $scope.documentProgress).then(function(_pdfDoc) {
					$log.debug("Document read");

					$scope.pdfDoc = _pdfDoc;
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "finished", loaded: 0, total: 0});
					}
					deferred.resolve($scope.pdfDoc);
				}, function(message, exception) {
					$log.debug("PDF load error: " + message + " <" + exception + "> ");
					deferred.reject(message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
				return deferred.promise;
			};

			$scope.renderPage = function(num, canvas, callback) {
				$log.debug('renderPage #' + num);
				var renderedPageInCanvas = canvas.getAttribute("rendered");
				if (renderedPageInCanvas==num && !$scope.forceReRender) {
					$log.debug("Skipping page <"+num+">");
					if (callback) {
						callback(true);
					}
					return;
				}
				$scope.pdfDoc.getPage(num).then(function(page) {
					var viewport = page.getViewport($scope.scale);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.render({ canvasContext: ctx, viewport: viewport }).then(
						function() {
							canvas.setAttribute("rendered",num);
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
							$log.debug('page.render failed');
						}
					);
				});
			};

			$scope.$on('pdfviewer.setScale', function(evt, id, scale) {
				if (id !== instance_id) {
					return;
				}

				$scope.setScale(scale);
				$scope.renderDocument();
			});

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

			instance_id = iAttr.id;

			createCanvas = function(iElement, count){
				canvas = iElement.find('canvas');
				
				if (canvas.length>count){
					//I need to remove canvases
					for (var i=count; i<canvas.length; i++){
						angular.element(canvas[i]).remove();
					}
				} else{
					//I need to add more canvas
					for (var i=canvas.length; i<count; i++){
						var tmpCanvas = angular.element('<canvas>');
						tmpCanvas[0].setAttribute("id","page"+(i+1));
						iElement.append(tmpCanvas);
					}
				}
				canvas = iElement.find('canvas');
			};

			iAttr.$observe('src', function(v) {
				$log.debug('src attribute changed, new value is <' + v + '>');
				if (v !== undefined && v !== null && v !== '') {
					scope.pageNum = 1;
					scope.loadPDF(scope.src).then(function (pdfDoc){
						$log.debug('PDF Loaded');
						scope.pagesToShow = scope.pagesToShow==0?scope.pdfDoc.numPages : scope.pagesToShow;
						createCanvas(iElement,scope.pagesToShow);
						scope.renderDocument();

					}, function(meg){
						$log.debug(meg);
					});
				}
			});
			
			iAttr.$observe('pagesToShow', function(v) {
				//SKIP if rendering is in progress or document not loaded
				if(scope.pdfDoc==null || scope.renderInProgress || !angular.isNumber(parseInt(v))) {
					scope.pagesToShow = _pageToShow;
					return;
				}
				
				$log.debug('pages-to-show attribute changed, new value is <' + v + ">");
				scope.pagesToShow = scope.pagesToShow==0 ? scope.pdfDoc.numPages : scope.pagesToShow;

				createCanvas(iElement,scope.pagesToShow);
				scope.renderDocument();
			});

			iAttr.$observe('scale', function(v) {
				//SKIP if rendering is in progress or document not loaded
				if(scope.pdfDoc==null || scope.renderInProgress || !angular.isNumber(parseInt(v)))
					return;
				$scope.forceReRender = true;
				$log.debug('scale attribute changed, new value is <' + v + ">");
				scope.renderDocument();
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
			setScale: function(scale) {
				$rootScope.$broadcast('pdfviewer.setScale', instance_id, scale);
			}
		};
	};

	return svc;
}]);
