/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse', '$timeout', function($parse, $timeout) {
    var canvas = null;
    var instance_id = null;
    var width = null;
    var height = null;
    var renderPromise = null;
    var pageFit = false;

    return {
        restrict: "E",
        template: '<canvas></canvas>',
        scope: {
            onPageLoad: '&',
            loadProgress: '&',
            src: '@',
            id: '='
        },
        controller: [ '$scope', function($scope) {
            $scope.pageNum = 1;
            $scope.pdfDoc = null;
            $scope.scale = 1.0;

            $scope.documentProgress = function(progressData) {
                if ($scope.loadProgress) {
                    $scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
                }
            };

            $scope.convertDataURIToBinary = function (dataURI) {
                var BASE64_MARKER = ';base64,';
                var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
                var base64 = dataURI.substring(base64Index);
                var raw = window.atob(base64);
                var rawLength = raw.length;
                var array = new Uint8Array(new ArrayBuffer(rawLength));

                for(var i = 0; i < rawLength; i++) {
                    array[i] = raw.charCodeAt(i);
                }
                return array;
            };

            $scope.loadPDF = function(path) {
                if(path !== undefined)
                {
                    var param = path.substr(0,4) !== 'data' ? path : $scope.convertDataURIToBinary(path);
                    console.log('loadPDF ', path, param);
                    PDFJS.getDocument(param, null, null, $scope.documentProgress).then(function(_pdfDoc) {
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
                }

            };

            var ratio = 1;

            $scope.setCanvasSize = function()
            {
                var ctx = canvas.getContext('2d');
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                var newCanvas = document.createElement('canvas');
                $(newCanvas)
                    .attr("width", imageData.width)
                    .attr("height", imageData.height);

                newCanvas.getContext("2d").putImageData(imageData, 0, 0);

                var scale;

                if (pageFit && height && width)
                {
                    // First, set according to width
                    scale = width / canvas.width;

                    // Then, make sure height is not too much
                    if(scale * canvas.height > height)
                    {
                        scale = height / canvas.height;
                    }

                    canvas.width = canvas.width * scale;
                    canvas.height = canvas.height * scale;
                }
                else
                {
                    if(height === null)
                    {
                        scale = width / canvas.width;
                        canvas.width = width;
                        canvas.height = width * ratio;
                    }
                    else
                    {
                        scale = height / canvas.height;
                        canvas.height = height;
                        canvas.width = height * ratio;
                    }
                }


                ctx.scale(scale, scale);
                ctx.drawImage(newCanvas, 0, 0);
            };


            $scope.renderPage = function(num, callback) {
                console.log('renderPage ', num);
                $scope.pdfDoc.getPage(num).then(function(page) {

                    var scaling = width / page.getViewport(1.0).width;
                    var viewport = page.getViewport(scaling);

                    if(pageFit && viewport.height > height)
                    {
                        scaling *= height / viewport.height;
                        viewport = page.getViewport(scaling);
                    }

                    ratio = viewport.height / viewport.width;
                    var ctx = canvas.getContext('2d');

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;


                    if(renderPromise != null)
                    {
                        renderPromise.cancel()
                    }

                    renderPromise = page.render({ canvasContext: ctx, viewport: viewport });
                    renderPromise.promise.then(
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
        } ],
        link: function(scope, iElement, iAttr) {
            canvas = iElement.find('canvas')[0];
            instance_id = iAttr.id;
            pageFit = iAttr.scale === 'page-fit';

            if(typeof iAttr.width !== 'undefined')
            {
                width = parseInt(iAttr.width);
            } else if(typeof iAttr.height !== 'undefined')
            {
                height = parseInt(iAttr.height);
            }

            var loadPdfTimeout = null;

            iAttr.$observe('width', function(v) {
                console.log('width attribute changed, new value is', v);
                if(typeof iAttr.width !== 'undefined')
                {
                    width = parseInt(iAttr.width);

                    scope.setCanvasSize();

                    var loadPdf = function() { scope.loadPDF(scope.src); };
                    $timeout.cancel(loadPdfTimeout);
                    loadPdfTimeout = $timeout(loadPdf, 50);
                }
            });
            iAttr.$observe('height', function(v) {
                console.log('height attribute changed, new value is', v);
                if(typeof iAttr.height !== 'undefined')
                {
                    height = parseInt(iAttr.height);

                    scope.setCanvasSize();

                    var loadPdf = function() { scope.loadPDF(scope.src); };
                    $timeout.cancel(loadPdfTimeout);
                    loadPdfTimeout = $timeout(loadPdf, 50);
                }
            });

            iAttr.$observe('src', function(v) {
                console.log('src attribute changed, new value is', v);
                if (v !== undefined && v !== null && v !== '') {
                    scope.pageNum = 1;
                    scope.loadPDF(scope.src);
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
