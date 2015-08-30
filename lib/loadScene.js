(function (
	CanvasWrapper,
	WebGLSupport
) {
	'use strict';

	function setup(gooRunner, scene, loader) {
		// Application code goes here!

		/*
		 To get a hold of entities, one can use the World's selection functions:
		 var allEntities = gooRunner.world.getEntities();                  // all
		 var entity      = gooRunner.world.by.name('EntityName').first();  // by name
		 */
	}

	/**
	 * Converts camelCase (js) to dash-case (html)
	 */
	function camel2dash(str) {
		return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}

	/**
	* Shows the fallback help content on index.html
	*/
	function showFallback(errorObject) {
		// Show the fallback
		var fallbackEl = document.getElementById('fallback');
		fallbackEl.classList.add('show');
		fallbackEl.style.backgroundImage = fallbackEl.getAttribute('data-background');
		var browsers = WebGLSupport.BROWSERS;


		var id;
		if (errorObject.browser === browsers.IOS) {
				id = 'ios-error';
		} else {

			id = camel2dash(errorObject.error);

			if (errorObject.error == WebGLSupport.ERRORS.WEBGL_DISABLED) {
				if (errorObject.browser == browsers.CHROME) {
					id += '-chrome';
				} else if (errorObject.browser == browsers.SAFARI) {
					id += '-safari';
				}
			}
		}

		var errorElement = document.getElementById(id);
		errorElement.classList.add('show');
		hideLoadingOverlay();
	}


	function getLoadingOverlay() {
		return document.getElementById('goo-loading-overlay');
	}


	function showLoadingOverlay() {
		getLoadingOverlay().classList.add('loading');
	}


	function hideLoadingOverlay() {
		getLoadingOverlay().classList.remove('loading');
	}


	function showCanvas() {
		document.getElementById('canvas-outer').classList.remove('hidden');
	}


	function init() {
		// Check that WebGL is supported.
		var result = WebGLSupport.check();
		if (result.error !== WebGLSupport.ERRORS.NO_ERROR) {
			showFallback(result);
			return;
		}

		// Prevent browser peculiarities to mess with our controls.
		document.body.addEventListener('touchstart', function (event) {

			if(event.target.nodeName === 'A' ) { return }
			var node = event.target.parentElement;
			for (var i = 0; i < 5; i++) {
				if (!node) {
					break;
				}
				if (node.nodeName === 'A') {
					return;
				}
				node = node.parentElement;
			}
			event.preventDefault();
			return;
		}, false);

		// Init the GooEngine
		var gooRunner = initGoo();
		var world = gooRunner.world;

		var transformSystem = world.getSystem('TransformSystem');
		var lightingSystem = world.getSystem('LightingSystem');
		var cameraSystem = world.getSystem('CameraSystem');
		var boundingSystem = world.getSystem('BoundingUpdateSystem');
		var animationSystem = world.getSystem('AnimationSystem');
		var renderSystem = world.getSystem('RenderSystem');
		var renderer = gooRunner.renderer;

		// Crazy hack to make orientation change work on the webview in iOS.
		goo.SystemBus.addListener('goo.viewportResize', function () {
			var dpx = gooRunner.renderer.devicePixelRatio;
			renderer.domElement.style.width = '1px';
			renderer.domElement.style.height = '1px';
			renderer.domElement.offsetHeight;
			renderer.domElement.style.width = '';
			renderer.domElement.style.height = '';
		});

		// Load the scene
		loadScene(gooRunner).then(function (loaderAndScene) {
			

			world.processEntityChanges();
			transformSystem._process();
			lightingSystem._process();
			cameraSystem._process();
			boundingSystem._process();
			if (goo.Renderer.mainCamera) { gooRunner.renderer.checkResize(goo.Renderer.mainCamera); }
			return setup(gooRunner, loaderAndScene.scene, loaderAndScene.loader);
		}).then(function () {
			new goo.EntityCombiner(world).combine();
			world.processEntityChanges();
			transformSystem._process();
			lightingSystem._process();
			cameraSystem._process();
			boundingSystem._process();
			animationSystem._process();
			renderSystem._process();

			return renderer.precompileShaders(renderSystem._activeEntities, renderSystem.lights);
		}).then(function () {
			return renderer.preloadMaterials(renderSystem._activeEntities);
		}).then(function () {
			showCanvas();
			hideLoadingOverlay();
			CanvasWrapper.show();

			var shareButtons = document.getElementsByClassName('share-buttons')[0];
			if (shareButtons) {
				shareButtons.style.display = 'block';
			}
			var logo = document.getElementById('goologo');
			if (logo) {
				logo.style.display = 'block';
			}

			CanvasWrapper.resize();
			// Start the rendering loop!
			gooRunner.startGameLoop();
			gooRunner.renderer.domElement.focus();
		}).then(null, function (e) {
			// If something goes wrong, 'e' is the error message from the engine.
			alert('Failed to load scene: ' + e);
		});
	}


	function initGoo() {
		// Create typical Goo application.
		var gooRunner = new goo.GooRunner({
			antialias: true,
			manuallyStartGameLoop: true,
			useDevicePixelRatio: true,
			logo: false
		});

		gooRunner.world.add(new goo.AnimationSystem());
		gooRunner.world.add(new goo.StateMachineSystem(gooRunner));
		gooRunner.world.add(new goo.HtmlSystem(gooRunner.renderer));
		gooRunner.world.add(new goo.TimelineSystem());
		gooRunner.world.add(new goo.PhysicsSystem());
		gooRunner.world.add(new goo.ColliderSystem());

		return gooRunner;
	}


	function loadScene(gooRunner) {
		/**
		 * Callback for the loading screen.
		 *
		 * @param  {number} handled
		 * @param  {number} total
		 */
		var progressCallback = function (handled, total) {
			var loadedPercent = (100 * handled / total).toFixed();
			var progress = document.getElementById("progress");
			progress.style.width = loadedPercent + "%";
		};

		// The loader takes care of loading the data.
		var loader = new goo.DynamicLoader({
			world: gooRunner.world,
			rootPath: 'res'
		});

		return loader.load('root.bundle').then(function(result) {
			var scene = null;

			// Try to get the first scene in the bundle.
			for (var key in result) {
				if (/\.scene$/.test(key)) {
					scene = result[key];
					break;
				}
			}

			

			if (!scene || !scene.id) {
				alert('Error: No scene in bundle'); // Should never happen.
				return null;
			}

			// Setup the canvas configuration (sizing mode, resolution, aspect
			// ratio, etc).
			var canvasConfig = scene ? scene.canvas : {};
			CanvasWrapper.setup(gooRunner.renderer.domElement, canvasConfig);
			CanvasWrapper.add();
			CanvasWrapper.hide();

			return loader.load(scene.id, {
				preloadBinaries: true,
				progressCallback: progressCallback
			})
			.then(function (scene) {
				return { scene: scene, loader: loader };
			});
		});
	}
	init();
})(CanvasWrapper, WebGLSupport);