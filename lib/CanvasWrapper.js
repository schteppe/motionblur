window.CanvasWrapper = (function() {
	'use strict';
	var _canvas, _config, _canvasInnerWrapper, _canvasOuterWrapper;

	var CanvasWrapper = {
		setup: function(canvas, config) {
			_canvas = canvas;
			_canvas.id = 'goo';
			_config = config || {};
		},

		add: function() {
			_canvas.tabIndex = 0;
			_canvasOuterWrapper = document.getElementById('canvas-outer');
			_canvasInnerWrapper = document.getElementById('canvas-inner');
			_canvasInnerWrapper.appendChild(_canvas);

			// Put the goo logo inside the inner canvas wrapper.
			var gooLogo = document.getElementById('goologo');
			if(gooLogo){
				_canvasInnerWrapper.appendChild(gooLogo);
			}

			// Make sure the canvas is updated when the window is resized.
			window.addEventListener('resize', CanvasWrapper.resize);
			window.addEventListener('orientationchange', CanvasWrapper.resize);

			_canvas.addEventListener('mousedown', CanvasWrapper.uninterruptedPan, true);
			_canvas.addEventListener('mouseup', CanvasWrapper.allowSelection, true);

			function prevent(e) {
				e.preventDefault();
				e.stopPropagation();
			}

			_canvas.addEventListener('mousewheel', prevent, true);
			_canvas.addEventListener('DOMMouseScroll', prevent, true);

			CanvasWrapper.resize();
		},

		hide: function() {
			_canvas.style.visibility = 'hidden';
		},

		show: function() {
			_canvas.style.visibility = 'visible';
		},

		/**
		 * Resizes the camera according to the configuration included in the
		 * bundle.
		 */
		resize: function() {
			if (_config.mode === 'Resolution' && _config.resolution) {
				setSize(_config.resolution.width, _config.resolution.height);
			} else if (_config.mode == 'AspectRatio' && _config.aspect) {
				var aspectWidth = _config.aspect.width;
				var aspectHeight = _config.aspect.height;

				var ratio = aspectWidth / aspectHeight;
				var windowAspectRatio = window.innerWidth / window.innerHeight;

				var width, height;

				// Top/Bottom letterbox
				if (ratio > windowAspectRatio) {
					width = window.innerWidth;
					height = width / ratio;
				// Left/Right letterbox
				} else {
					height = window.innerHeight;
					width = height * ratio;
				}

				setSize(width, height);
			} else {
				setSize();
			}
		},

		uninterruptedPan: function() {
			var htmlEntities = document.querySelectorAll('.goo-entity');
			for (var i = 0; i < htmlEntities.length; i++) {
				htmlEntities[i].classList.add('no-pointer');
			}
		},

		allowSelection: function() {
			var htmlEntities = document.querySelectorAll('.goo-entity');
			for (var i = 0; i < htmlEntities.length; i++) {
				htmlEntities[i].classList.remove('no-pointer');
			}
		}
	};


	/**
	 * Sets a custom size on the canvas.
	 *
	 * @param {number} width
	 *        The new width of the canvas.
	 * @param {number} height
	 *        The new height of the canvas.
	 */
	function setSize(width, height) {
		var classList = _canvasOuterWrapper.classList;

		if (width && height) {
			classList.add('custom');
			_canvasInnerWrapper.style.width = width + 'px';
			_canvasInnerWrapper.style.height = height + 'px';

			if (window.innerWidth > width) {
				classList.add('center-h');
			} else {
				classList.remove('center-h');
			}

			if (window.innerHeight > height) {
				classList.add('center-v');
			} else {
				classList.remove('center-v');
			}
		} else {
			classList.remove('custom');

			_canvasInnerWrapper.style.width = '';
			_canvasInnerWrapper.style.height = '';
		}
	};


	return CanvasWrapper;
})();
