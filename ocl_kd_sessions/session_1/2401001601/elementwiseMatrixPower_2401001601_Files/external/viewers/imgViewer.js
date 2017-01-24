/*!
 * Viewer v0.5.0
 * https://github.com/fengyuanchen/viewer
 *
 * Copyright (c) 2015-2016 Fengyuan Chen
 * Released under the MIT license
 *
 * Date: 2016-01-21T09:59:52.834Z
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define('viewer', ['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $window = $(window);
  var $document = $(document);

  // Constants
  var NAMESPACE = 'viewer';
  var ELEMENT_VIEWER = document.createElement(NAMESPACE);

  // Classes
  var CLASS_FIXED = 'viewer-fixed';
  var CLASS_OPEN = 'viewer-open';
  var CLASS_SHOW = 'viewer-show';
  var CLASS_HIDE = 'viewer-hide';
  var CLASS_HIDE_XS_DOWN = 'viewer-hide-xs-down';
  var CLASS_HIDE_SM_DOWN = 'viewer-hide-sm-down';
  var CLASS_HIDE_MD_DOWN = 'viewer-hide-md-down';
  var CLASS_FADE = 'viewer-fade';
  var CLASS_IN = 'viewer-in';
  var CLASS_MOVE = 'viewer-move';
  var CLASS_ACTIVE = 'viewer-active';
  var CLASS_INVISIBLE = 'viewer-invisible';
  var CLASS_TRANSITION = 'viewer-transition';
  var CLASS_FULLSCREEN = 'viewer-fullscreen';
  var CLASS_FULLSCREEN_EXIT = 'viewer-fullscreen-exit';
  var CLASS_CLOSE = 'viewer-close';

  // Selectors
  var SELECTOR_IMG = 'img';

  // Events
  var EVENT_MOUSEDOWN = 'mousedown touchstart pointerdown MSPointerDown';
  var EVENT_MOUSEMOVE = 'mousemove touchmove pointermove MSPointerMove';
  var EVENT_MOUSEUP = 'mouseup touchend touchcancel pointerup pointercancel MSPointerUp MSPointerCancel';
  var EVENT_WHEEL = 'wheel mousewheel DOMMouseScroll';
  var EVENT_TRANSITIONEND = 'transitionend';
  var EVENT_LOAD = 'load.' + NAMESPACE;
  var EVENT_KEYDOWN = 'keydown.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_RESIZE = 'resize.' + NAMESPACE;
  var EVENT_BUILD = 'build.' + NAMESPACE;
  var EVENT_BUILT = 'built.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_SHOWN = 'shown.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_HIDDEN = 'hidden.' + NAMESPACE;
  var EVENT_VIEW = 'view.' + NAMESPACE;
  var EVENT_VIEWED = 'viewed.' + NAMESPACE;

  // Supports
  var SUPPORT_TRANSITION = typeof ELEMENT_VIEWER.style.transition !== 'undefined';

  // Others
  var round = Math.round;
  var sqrt = Math.sqrt;
  var abs = Math.abs;
  var min = Math.min;
  var max = Math.max;
  var num = Number;

  function isString(s) {
    return typeof s === 'string';
  }

  function isNumber(n) {
    return typeof n === 'number' && !isNaN(n);
  }

  function isUndefined(u) {
    return typeof u === 'undefined';
  }

  function toArray(obj, offset) {
    var args = [];

    if (isNumber(offset)) { // It's necessary for IE8
      args.push(offset);
    }

    return args.slice.apply(obj, args);
  }

  // Custom proxy to avoid jQuery's guid
  function proxy(fn, context) {
    var args = toArray(arguments, 2);

    return function () {
      return fn.apply(context, args.concat(toArray(arguments)));
    };
  }

  function getTransform(options) {
    var transforms = [];
    var rotate = options.rotate;
    var scaleX = options.scaleX;
    var scaleY = options.scaleY;

    if (isNumber(rotate)) {
      transforms.push('rotate(' + rotate + 'deg)');
    }

    if (isNumber(scaleX) && isNumber(scaleY)) {
      transforms.push('scale(' + scaleX + ',' + scaleY + ')');
    }

    return transforms.length ? transforms.join(' ') : 'none';
  }

  // Force reflow to enable CSS3 transition
  function forceReflow(element) {
    return element.offsetWidth;
  }

  // e.g.: http://domain.com/path/to/picture.jpg?size=1280×960 -> picture.jpg
  function getImageName(url) {
    return isString(url) ? url.replace(/^.*\//, '').replace(/[\?&#].*$/, '') : '';
  }

  function getImageSize(image, callback) {
    var newImage;

    // Modern browsers
    if (image.naturalWidth) {
      return callback(image.naturalWidth, image.naturalHeight);
    }

    // IE8: Don't use `new Image()` here
    newImage = document.createElement('img');

    newImage.onload = function () {
      callback(this.width, this.height);
    };

    newImage.src = image.src;
  }

  function getTouchesCenter(touches) {
    var length = touches.length;
    var pageX = 0;
    var pageY = 0;

    if (length) {
      $.each(touches, function (i, touch) {
        pageX += touch.pageX;
        pageY += touch.pageY;
      });

      pageX /= length;
      pageY /= length;
    }

    return {
      pageX: pageX,
      pageY: pageY
    };
  }

  function getResponsiveClass(option) {
    switch (option) {
      case 2:
        return CLASS_HIDE_XS_DOWN;

      case 3:
        return CLASS_HIDE_SM_DOWN;

      case 4:
        return CLASS_HIDE_MD_DOWN;
    }
  }

  function Viewer(element, options, syncFunction) {
    this.$element = $(element);
    this.options = $.extend({}, Viewer.DEFAULTS, $.isPlainObject(options) && options);
    this.isImg = false;
    this.isBuilt = false;
    this.isShown = false;
    this.isViewed = false;
    this.isFulled = false;
    this.isPlayed = false;
    this.wheeling = false;
    this.playing = false;
    this.fading = false;
    this.tooltiping = false;
    this.transitioning = false;
    this.action = false;
    this.target = false;
    this.timeout = false;
    this.index = 0;
    this.length = 0;
    this.init();
	
	element.info = this;
	this.syncFunction = element.syncFunction;
  }
  
  //function 

  Viewer.prototype = {
    constructor: Viewer,

    init: function () {
      var options = this.options;
      var $this = this.$element;
      var isImg = $this.is(SELECTOR_IMG);
      var $images = isImg ? $this : $this.find(SELECTOR_IMG);
      var length = $images.length;
      var ready = $.proxy(this.ready, this);

      if (!length) {
        return;
      }

      if ($.isFunction(options.build)) {
        $this.one(EVENT_BUILD, options.build);
      }

      if (this.trigger(EVENT_BUILD).isDefaultPrevented()) {
        return;
      }

      // Override `transition` option if it is not supported
      if (!SUPPORT_TRANSITION) {
        options.transition = false;
      }

      this.isImg = isImg;
      this.length = length;
      this.count = 0;
      this.$images = $images;
      this.$body = $('body');

      if (options.inline) {
        $this.one(EVENT_BUILT, $.proxy(function () {
          this.view();
        }, this));

        $images.each(function () {
          if (this.complete) {
            ready();
          } else {
            $(this).one(EVENT_LOAD, ready);
          }
        });
      } else {
        $this.on(EVENT_CLICK, $.proxy(this.start, this));
      }
    },

    ready: function () {
      this.count++;

      if (this.count === this.length) {
        this.build();
      }
    },

    build: function () {
      var options = this.options;
      var $this = this.$element;
      var $parent;
      var $viewer;
      var $title;
      var $toolbar;
      var $navbar;
      var $button;

      if (this.isBuilt) {
        return;
      }

      this.$parent = $parent = $this.parent();
      this.$viewer = $viewer = $(Viewer.TEMPLATE);
      this.$canvas = $viewer.find('.viewer-canvas');
      this.$footer = $viewer.find('.viewer-footer');
      this.$title = $title = $viewer.find('.viewer-title');
      this.$toolbar = $toolbar = $viewer.find('.viewer-toolbar');
      this.$navbar = $navbar = $viewer.find('.viewer-navbar');
      this.$button = $button = $viewer.find('.viewer-button');
      this.$tooltip = $viewer.find('.viewer-tooltip');
      this.$player = $viewer.find('.viewer-player');
      this.$list = $viewer.find('.viewer-list');

      $title.addClass(!options.title ? CLASS_HIDE : getResponsiveClass(options.title));

      $toolbar.addClass(!options.toolbar ? CLASS_HIDE : getResponsiveClass(options.toolbar));
      $toolbar.find('li[class*=zoom]').toggleClass(CLASS_INVISIBLE, !options.zoomable);
      $toolbar.find('li[class*=flip]').toggleClass(CLASS_INVISIBLE, !options.scalable);

      if (!options.rotatable) {
        $toolbar.find('li[class*=rotate]').addClass(CLASS_INVISIBLE).appendTo($toolbar);
      }

      $navbar.addClass(!options.navbar ? CLASS_HIDE : getResponsiveClass(options.navbar));

      if (options.inline) {
        $button.addClass(CLASS_FULLSCREEN);
        $viewer.css('z-index', options.zIndexInline);

        if ($parent.css('position') === 'static') {
          $parent.css('position', 'relative');
        }
      } else {
        $button.addClass(CLASS_CLOSE);
        $viewer.
          css('z-index', options.zIndex).
          addClass([CLASS_FIXED, CLASS_FADE, CLASS_HIDE].join(' '));
      }

      $this.after($viewer);

      if (options.inline) {
        this.render();
        this.bind();
        this.isShown = true;
      }

      this.isBuilt = true;

      if ($.isFunction(options.built)) {
        $this.one(EVENT_BUILT, options.built);
      }

      this.trigger(EVENT_BUILT);
    },

    unbuild: function () {
      var options = this.options;
      var $this = this.$element;

      if (!this.isBuilt) {
        return;
      }

      if (options.inline) {
        $this.removeClass(CLASS_HIDE);
      }

      this.$viewer.remove();
    },

    bind: function () {
      var options = this.options;
      var $this = this.$element;

      if ($.isFunction(options.view)) {
        $this.on(EVENT_VIEW, options.view);
      }

      if ($.isFunction(options.viewed)) {
        $this.on(EVENT_VIEWED, options.viewed);
      }

      this.$viewer.
        on(EVENT_CLICK, $.proxy(this.click, this)).
        on(EVENT_WHEEL, $.proxy(this.wheel, this));

      this.$canvas.on(EVENT_MOUSEDOWN, $.proxy(this.mousedown, this));

      $document.
        on(EVENT_MOUSEMOVE, (this._mousemove = proxy(this.mousemove, this))).
        on(EVENT_MOUSEUP, (this._mouseup = proxy(this.mouseup, this))).
        on(EVENT_KEYDOWN, (this._keydown = proxy(this.keydown, this)));

      $window.on(EVENT_RESIZE, (this._resize = proxy(this.resize, this)));
    },

    unbind: function () {
      var options = this.options;
      var $this = this.$element;

      if ($.isFunction(options.view)) {
        $this.off(EVENT_VIEW, options.view);
      }

      if ($.isFunction(options.viewed)) {
        $this.off(EVENT_VIEWED, options.viewed);
      }

      this.$viewer.
        off(EVENT_CLICK, this.click).
        off(EVENT_WHEEL, this.wheel);

      this.$canvas.off(EVENT_MOUSEDOWN, this.mousedown);

      $document.
        off(EVENT_MOUSEMOVE, this._mousemove).
        off(EVENT_MOUSEUP, this._mouseup).
        off(EVENT_KEYDOWN, this._keydown);

      $window.off(EVENT_RESIZE, this._resize);
    },

    render: function () {
      this.initContainer();
      this.initViewer();
      this.initList();
      this.renderViewer();
    },

    initContainer: function () {
      this.container = {
        width: $window.innerWidth(),
        height: $window.innerHeight()
      };
    },

    initViewer: function () {
      var options = this.options;
      var $parent = this.$parent;
      var viewer;

      if (options.inline) {
        this.parent = viewer = {
          width: max($parent.width(), options.minWidth),
          height: max($parent.height(), options.minHeight)
        };
      }

      if (this.isFulled || !viewer) {
        viewer = this.container;
      }

      this.viewer = $.extend({}, viewer);
    },

    renderViewer: function () {
      if (this.options.inline && !this.isFulled) {
        this.$viewer.css(this.viewer);
      }
    },

    initList: function () {
      var options = this.options;
      var $this = this.$element;
      var $list = this.$list;
      var list = [];

      this.$images.each(function (i) {
        var src = this.src;
        var alt = this.alt || getImageName(src);
        var url = options.url;

        if (!src) {
          return;
        }

        if (isString(url)) {
          url = this.getAttribute(url);
        } else if ($.isFunction(url)) {
          url = url.call(this, this);
        }

        list.push(
          '<li>' +
            '<img' +
              ' src="' + src + '"' +
              ' data-action="view"' +
              ' data-index="' +  i + '"' +
              ' data-original-url="' +  (url || src) + '"' +
              ' alt="' +  alt + '"' +
            '>' +
          '</li>'
        );
      });

      $list.html(list.join('')).find(SELECTOR_IMG).one(EVENT_LOAD, {
        filled: true
      }, $.proxy(this.loadImage, this));

      this.$items = $list.children();

      if (options.transition) {
        $this.one(EVENT_VIEWED, function () {
          $list.addClass(CLASS_TRANSITION);
        });
      }
    },

    renderList: function (index) {
      var i = index || this.index;
      var width = this.$items.eq(i).width();
      var outerWidth = width + 1; // 1 pixel of `margin-left` width

      // Place the active item in the center of the screen
      this.$list.css({
        width: outerWidth * this.length,
        marginLeft: (this.viewer.width - width) / 2 - outerWidth * i
      });
    },

    resetList: function () {
      this.$list.empty().removeClass(CLASS_TRANSITION).css('margin-left', 0);
    },

    initImage: function (callback) {
      var options = this.options;
      var $image = this.$image;
      var viewer = this.viewer;
      var footerHeight = this.$footer.height();
      var viewerWidth = viewer.width;
      var viewerHeight = max(viewer.height - footerHeight, footerHeight);
      var oldImage = this.image || {};

      getImageSize($image[0], $.proxy(function (naturalWidth, naturalHeight) {
        var aspectRatio = naturalWidth / naturalHeight;
        var width = viewerWidth;
        var height = viewerHeight;
        var initialImage;
        var image;

        if (viewerHeight * aspectRatio > viewerWidth) {
          height = viewerWidth / aspectRatio;
        } else {
          width = viewerHeight * aspectRatio;
        }

        width = min(width * 0.9, naturalWidth);
        height = min(height * 0.9, naturalHeight);

        image = {
          naturalWidth: naturalWidth,
          naturalHeight: naturalHeight,
          aspectRatio: aspectRatio,
          ratio: width / naturalWidth,
          width: width,
          height: height,
          left: (viewerWidth - width) / 2,
          top: (viewerHeight - height) / 2
        };

        initialImage = $.extend({}, image);

        if (options.rotatable) {
          image.rotate = oldImage.rotate || 0;
          initialImage.rotate = 0;
        }

        if (options.scalable) {
          image.scaleX = oldImage.scaleX || 1;
          image.scaleY = oldImage.scaleY || 1;
          initialImage.scaleX = 1;
          initialImage.scaleY = 1;
        }

        this.image = image;
        this.initialImage = initialImage;

        if ($.isFunction(callback)) {
          callback();
        }
      }, this));
    },

    renderImage: function (callback, disableAnimation) {
      var image = this.image;
      var $image = this.$image;
	
	  //if(disableAnimation == true){
	//	$image.removeClass(CLASS_TRANSITION);
	 // }
	  //console.log('classes= ' + $image.attr('class'));
	  
      $image.css({
        width: image.width,
        height: image.height,
        marginLeft: image.left,
        marginTop: image.top,
        transform: getTransform(image)
      });

      if ($.isFunction(callback)) {
        if (this.transitioning) {
          $image.one(EVENT_TRANSITIONEND, callback);
        } else {
          callback();
        }
      }
	  
	  //$image.addClass(CLASS_TRANSITION);
	  
    },

    resetImage: function () {
      this.$image.remove();
      this.$image = null;
    },

    start: function (e) {
      var target = e.target;

      if ($(target).is('img')) {
        this.target = target;
        this.show();
      }
    },

    click: function (e) {
      var $target = $(e.target);
      var action = $target.data('action');
      var image = this.image;

      switch (action) {
        case 'mix':
          if (this.isPlayed) {
            this.stop();
          } else {
            if (this.options.inline) {
              if (this.isFulled) {
                this.exit();
              } else {
                this.full();
              }
            } else {
              this.hide();
            }
          }

          break;

        case 'view':
          this.view($target.data('index'));
          break;

        case 'zoom-in':
          this.zoom(0.1, true);
          break;

        case 'zoom-out':
          this.zoom(-0.1, true);
          break;

        case 'one-to-one':
          this.toggle();
          break;

        case 'reset':
          this.reset();
          break;

        case 'prev':
          this.prev();
          break;

        case 'play':
          this.play();
          break;

        case 'next':
          this.next();
          break;

        case 'rotate-left':
          this.rotate(-90);
          break;

        case 'rotate-right':
          this.rotate(90);
          break;

        case 'flip-horizontal':
          this.scaleX(-image.scaleX || -1);
          break;

        case 'flip-vertical':
          this.scaleY(-image.scaleY || -1);
          break;

        default:
          if (this.isPlayed) {
            this.stop();
          }
      }
    },

    load: function () {
      var options = this.options;
      var viewer = this.viewer;
      var $image = this.$image;

      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = false;
      }

      $image.removeClass(CLASS_INVISIBLE).css('cssText', (
        'width:0;' +
        'height:0;' +
        'margin-left:' + viewer.width / 2 + 'px;' +
        'margin-top:' + viewer.height / 2 + 'px;' +
        'max-width:none!important;' +
        'visibility:visible;'
      ));

      this.initImage($.proxy(function () {
        $image.
          toggleClass(CLASS_TRANSITION, options.transition).
          toggleClass(CLASS_MOVE, options.movable);

        this.renderImage($.proxy(function () {
          this.isViewed = true;
          this.trigger(EVENT_VIEWED);
        }, this));
      }, this));
    },

    loadImage: function (e) {
      var image = e.target;
      var $image = $(image);
      var $parent = $image.parent();
      var parentWidth = $parent.width();
      var parentHeight = $parent.height();
      var filled = e.data && e.data.filled;

      getImageSize(image, function (naturalWidth, naturalHeight) {
        var aspectRatio = naturalWidth / naturalHeight;
        var width = parentWidth;
        var height = parentHeight;

        if (parentHeight * aspectRatio > parentWidth) {
          if (filled) {
            width = parentHeight * aspectRatio;
          } else {
            height = parentWidth / aspectRatio;
          }
        } else {
          if (filled) {
            height = parentWidth / aspectRatio;
          } else {
            width = parentHeight * aspectRatio;
          }
        }

        $image.css({
          width: width,
          height: height,
          marginLeft: (parentWidth - width) / 2,
          marginTop: (parentHeight - height) / 2
        });
      });
    },

    resize: function () {
      this.initContainer();
      this.initViewer();
      this.renderViewer();
      this.renderList();
      this.initImage($.proxy(function () {
        this.renderImage();
		if(!this.isFulled){
			this.syncFunction(this.image);
		  }
      }, this));

      if (this.isPlayed) {
        this.$player.
          find(SELECTOR_IMG).
          one(EVENT_LOAD, $.proxy(this.loadImage, this)).
          trigger(EVENT_LOAD);
      }
    },

    wheel: function (event) {
      var e = event.originalEvent || event;
      var ratio = num(this.options.zoomRatio) || 0.1;
      var delta = 1;

      if (!this.isViewed) {
        return;
      }

      event.preventDefault();

      // Limit wheel speed to prevent zoom too fast
      if (this.wheeling) {
        return;
      }

      this.wheeling = true;

      setTimeout($.proxy(function () {
        this.wheeling = false;
      }, this), 50);

      if (e.deltaY) {
        delta = e.deltaY > 0 ? 1 : -1;
      } else if (e.wheelDelta) {
        delta = -e.wheelDelta / 120;
      } else if (e.detail) {
        delta = e.detail > 0 ? 1 : -1;
      }

      this.zoom(-delta * ratio, true, event);
	  
	  if(!this.isFulled){
		this.syncFunction(this.image);
	  }
	  
    },

    keydown: function (e) {
      var options = this.options;
      var which = e.which;

      if (!this.isFulled || !options.keyboard) {
        return;
      }

      switch (which) {

        // (Key: Esc)
        case 27:
          if (this.isPlayed) {
            this.stop();
          } else {
            if (options.inline) {
              if (this.isFulled) {
                this.exit();
              }
            } else {
              this.hide();
            }
          }

          break;

        // (Key: Space)
        case 32:
          if (this.isPlayed) {
            this.stop();
          }

          break;

        // View previous (Key: ←)
        case 37:
          this.prev();
          break;

        // Zoom in (Key: ↑)
        case 38:

          // Prevent scroll on Firefox
          e.preventDefault();

          this.zoom(options.zoomRatio, true);
          break;

        // View next (Key: →)
        case 39:
          this.next();
          break;

        // Zoom out (Key: ↓)
        case 40:

          // Prevent scroll on Firefox
          e.preventDefault();

          this.zoom(-options.zoomRatio, true);
          break;

        // Zoom out to initial size (Key: Ctrl + 0)
        case 48:
          // Go to next

        // Zoom in to natural size (Key: Ctrl + 1)
        case 49:
          if (e.ctrlKey || e.shiftKey) {
            e.preventDefault();
            this.toggle();
          }

          break;

        // No default
      }
    },

    mousedown: function (event) {
      var options = this.options;
      var originalEvent = event.originalEvent;
      var touches = originalEvent && originalEvent.touches;
      var e = event;
      var action = options.movable ? 'move' : false;
      var touchesLength;

      if (!this.isViewed) {
        return;
      }

      if (touches) {
        touchesLength = touches.length;

        if (touchesLength > 1) {
          if (options.zoomable && touchesLength === 2) {
            e = touches[1];
            this.startX2 = e.pageX;
            this.startY2 = e.pageY;
            action = 'zoom';
          } else {
            return;
          }
        } else {
          if (this.isSwitchable()) {
            action = 'switch';
          }
        }

        e = touches[0];
      }

      if (action) {
        event.preventDefault();
        this.action = action;

        // IE8  has `event.pageX/Y`, but not `event.originalEvent.pageX/Y`
        // IE10 has `event.originalEvent.pageX/Y`, but not `event.pageX/Y`
        this.startX = e.pageX || originalEvent && originalEvent.pageX;
        this.startY = e.pageY || originalEvent && originalEvent.pageY;
		
      }
    },

    mousemove: function (event) {
      var options = this.options;
      var action = this.action;
      var $image = this.$image;
      var originalEvent = event.originalEvent;
      var touches = originalEvent && originalEvent.touches;
      var e = event;
      var touchesLength;

      if (!this.isViewed) {
        return;
      }

      if (touches) {
        touchesLength = touches.length;

        if (touchesLength > 1) {
          if (options.zoomable && touchesLength === 2) {
            e = touches[1];
            this.endX2 = e.pageX;
            this.endY2 = e.pageY;
          } else {
            return;
          }
        }

        e = touches[0];
      }

      if (action) {
        event.preventDefault();

        if (action === 'move' && options.transition && $image.hasClass(CLASS_TRANSITION)) {
          $image.removeClass(CLASS_TRANSITION);
        }

        this.endX = e.pageX || originalEvent && originalEvent.pageX;
        this.endY = e.pageY || originalEvent && originalEvent.pageY;
		
        this.change(event);
		
		if(!this.isFulled){
		    this.syncFunction(this.image);
		}
      }
    },

    mouseup: function (event) {
      var action = this.action;

      if (action) {
        event.preventDefault();

        if (action === 'move' && this.options.transition) {
          this.$image.addClass(CLASS_TRANSITION);
        }

        this.action = false;
		
		if(!this.isFulled){
		    this.syncFunction(this.image);
	    }
      }
    },

    // Show the viewer (only available in modal mode)
    show: function () {
      var options = this.options;
      var $viewer;

      if (options.inline || this.transitioning) {
        return;
      }

      if (!this.isBuilt) {
        this.build();
      }

      if ($.isFunction(options.show)) {
        this.$element.one(EVENT_SHOW, options.show);
      }

      if (this.trigger(EVENT_SHOW).isDefaultPrevented()) {
        return;
      }

      this.$body.addClass(CLASS_OPEN);
      $viewer = this.$viewer.removeClass(CLASS_HIDE);

      this.$element.one(EVENT_SHOWN, $.proxy(function () {
        this.view(this.target ? this.$images.index(this.target) : this.index);
        this.target = false;
      }, this));

      if (options.transition) {
        this.transitioning = true;
        $viewer.addClass(CLASS_TRANSITION);
        forceReflow($viewer[0]);
        $viewer.one(EVENT_TRANSITIONEND, $.proxy(this.shown, this)).addClass(CLASS_IN);
      } else {
        $viewer.addClass(CLASS_IN);
        this.shown();
      }
    },

    // Hide the viewer (only available in modal mode)
    hide: function () {
      var options = this.options;
      var $viewer = this.$viewer;

      if (options.inline || this.transitioning || !this.isShown) {
        return;
      }

      if ($.isFunction(options.hide)) {
        this.$element.one(EVENT_HIDE, options.hide);
      }

      if (this.trigger(EVENT_HIDE).isDefaultPrevented()) {
        return;
      }

      if (this.isViewed && options.transition) {
        this.transitioning = true;
        this.$image.one(EVENT_TRANSITIONEND, $.proxy(function () {
          $viewer.one(EVENT_TRANSITIONEND, $.proxy(this.hidden, this)).removeClass(CLASS_IN);
        }, this));
        this.zoomTo(0, false, false, true);
      } else {
        $viewer.removeClass(CLASS_IN);
        this.hidden();
      }
    },

    /**
     * View one of the images with image's index
     *
     * @param {Number} index
     */
    view: function (index) {
      var $title = this.$title;
      var $image;
      var $item;
      var $img;
      var url;
      var alt;

      index = Number(index) || 0;

      if (!this.isShown || this.isPlayed || index < 0 || index >= this.length ||
        this.isViewed && index === this.index) {
        return;
      }

      if (this.trigger(EVENT_VIEW).isDefaultPrevented()) {
        return;
      }

      $item = this.$items.eq(index);
      $img = $item.find(SELECTOR_IMG);
      url = $img.data('originalUrl');
      alt = $img.attr('alt');

      this.$image = $image = $('<img src="' + url + '" alt="' + alt + '">');

      if (this.isViewed) {
        this.$items.eq(this.index).removeClass(CLASS_ACTIVE);
      }

      $item.addClass(CLASS_ACTIVE);

      this.isViewed = false;
      this.index = index;
      this.image = null;
      this.$canvas.html($image.addClass(CLASS_INVISIBLE));

      // Center current item
      this.renderList();

      // Clear title
      $title.empty();

      // Generate title after viewed
      this.$element.one(EVENT_VIEWED, $.proxy(function () {
        var image = this.image;
        var width = image.naturalWidth;
        var height = image.naturalHeight;

        $title.html(alt + ' (' + width + ' &times; ' + height + ')');
      }, this));

      if ($image[0].complete) {
        this.load();
      } else {
        $image.one(EVENT_LOAD, $.proxy(this.load, this));

        if (this.timeout) {
          clearTimeout(this.timeout);
        }

        // Make the image visible if it fails to load within 1s
        this.timeout = setTimeout($.proxy(function () {
          $image.removeClass(CLASS_INVISIBLE);
          this.timeout = false;
        }, this), 1000);
      }
    },

    // View the previous image
    prev: function () {
      this.view(max(this.index - 1, 0));
    },

    // View the next image
    next: function () {
      this.view(min(this.index + 1, this.length - 1));
    },

    /**
     * Move the image with relative offsets
     *
     * @param {Number} offsetX
     * @param {Number} offsetY (optional)
     */
    move: function (offsetX, offsetY) {
      var image = this.image;

      this.moveTo(
        isUndefined(offsetX) ? offsetX : image.left + num(offsetX),
        isUndefined(offsetY) ? offsetY : image.top + num(offsetY)
      );
    },

    /**
     * Move the image to an absolute point
     *
     * @param {Number} x
     * @param {Number} y (optional)
     */
    moveTo: function (x, y) {
      var image = this.image;
      var changed = false;

      // If "y" is not present, its default value is "x"
      if (isUndefined(y)) {
        y = x;
      }

      x = num(x);
      y = num(y);

      if (this.isViewed && !this.isPlayed && this.options.movable) {
        if (isNumber(x)) {
          image.left = x;
          changed = true;
        }

        if (isNumber(y)) {
          image.top = y;
          changed = true;
        }

        if (changed) {
          this.renderImage();
        }
		
      }
    },

    /**
     * Zoom the image with a relative ratio
     *
     * @param {Number} ratio
     * @param {Boolean} hasTooltip (optional)
     * @param {jQuery Event} _event (private)
     */
    zoom: function (ratio, hasTooltip, _event) {
      var image = this.image;

      ratio = num(ratio);

      if (ratio < 0) {
        ratio =  1 / (1 - ratio);
      } else {
        ratio = 1 + ratio;
      }

      this.zoomTo(image.width * ratio / image.naturalWidth, hasTooltip, _event);
    },

    /**
     * Zoom the image to an absolute ratio
     *
     * @param {Number} ratio
     * @param {Boolean} hasTooltip (optional)
     * @param {jQuery Event} _event (private)
     * @param {Boolean} _zoomable (private)
     */
    zoomTo: function (ratio, hasTooltip, _event, _zoomable) {
      var options = this.options;
      var minZoomRatio = 0.01;
      var maxZoomRatio = 100;
      var image = this.image;
      var width = image.width;
      var height = image.height;
      var originalEvent;
      var newWidth;
      var newHeight;
      var offset;
      var center;

      ratio = max(0, ratio);

      if (isNumber(ratio) && this.isViewed && !this.isPlayed && (_zoomable || options.zoomable)) {
        if (!_zoomable) {
          minZoomRatio = max(minZoomRatio, options.minZoomRatio);
          maxZoomRatio = min(maxZoomRatio, options.maxZoomRatio);
          ratio = min(max(ratio, minZoomRatio), maxZoomRatio);
        }

        if (ratio > 0.95 && ratio < 1.05) {
          ratio = 1;
        }

        newWidth = image.naturalWidth * ratio;
        newHeight = image.naturalHeight * ratio;
		
		if(newWidth < 200 && newHeight < 200){
			return;
		}

        if (_event && (originalEvent = _event.originalEvent)) {
          offset = this.$viewer.offset();
          center = originalEvent.touches ? getTouchesCenter(originalEvent.touches) : {
            pageX: _event.pageX || originalEvent.pageX || 0,
            pageY: _event.pageY || originalEvent.pageY || 0
          };

          // Zoom from the triggering point of the event
          image.left -= (newWidth - width) * (
            ((center.pageX - offset.left) - image.left) / width
          );
          image.top -= (newHeight - height) * (
            ((center.pageY - offset.top) - image.top) / height
          );
        } else {

          // Zoom from the center of the image
          image.left -= (newWidth - width) / 2;
          image.top -= (newHeight - height) / 2;
        }

        image.width = newWidth;
        image.height = newHeight;
        image.ratio = ratio;
        this.renderImage();

        if (hasTooltip) {
          this.tooltip();
        }
      }
    },

    /**
     * Rotate the image with a relative degree
     *
     * @param {Number} degree
     */
    rotate: function (degree) {
      this.rotateTo((this.image.rotate || 0) + num(degree));
    },

    /**
     * Rotate the image to an absolute degree
     * https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function#rotate()
     *
     * @param {Number} degree
     */
    rotateTo: function (degree) {
      var image = this.image;

      degree = num(degree);

      if (isNumber(degree) && this.isViewed && !this.isPlayed && this.options.rotatable) {
        image.rotate = degree;
        this.renderImage();
      }
    },

    /**
     * Scale the image
     * https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function#scale()
     *
     * @param {Number} scaleX
     * @param {Number} scaleY (optional)
     */
    scale: function (scaleX, scaleY) {
      var image = this.image;
      var changed = false;

      // If "scaleY" is not present, its default value is "scaleX"
      if (isUndefined(scaleY)) {
        scaleY = scaleX;
      }

      scaleX = num(scaleX);
      scaleY = num(scaleY);

      if (this.isViewed && !this.isPlayed && this.options.scalable) {
        if (isNumber(scaleX)) {
          image.scaleX = scaleX;
          changed = true;
        }

        if (isNumber(scaleY)) {
          image.scaleY = scaleY;
          changed = true;
        }

        if (changed) {
          this.renderImage();
        }
      }
    },

    /**
     * Scale the abscissa of the image
     *
     * @param {Number} scaleX
     */
    scaleX: function (scaleX) {
      this.scale(scaleX, this.image.scaleY);
    },

    /**
     * Scale the ordinate of the image
     *
     * @param {Number} scaleY
     */
    scaleY: function (scaleY) {
      this.scale(this.image.scaleX, scaleY);
    },

    // Play the images
    play: function () {
      var options = this.options;
      var $player = this.$player;
      var load = $.proxy(this.loadImage, this);
      var list = [];
      var total = 0;
      var index = 0;
      var playing;

      if (!this.isShown || this.isPlayed) {
        return;
      }

      if (options.fullscreen) {
        this.requestFullscreen();
      }

      this.isPlayed = true;
      $player.addClass(CLASS_SHOW);

      this.$items.each(function (i) {
        var $this = $(this);
        var $img = $this.find(SELECTOR_IMG);
        var $image = $('<img src="' + $img.data('originalUrl') + '" alt="' + $img.attr('alt') + '">');

        total++;

        $image.addClass(CLASS_FADE).toggleClass(CLASS_TRANSITION, options.transition);

        if ($this.hasClass(CLASS_ACTIVE)) {
          $image.addClass(CLASS_IN);
          index = i;
        }

        list.push($image);
        $image.one(EVENT_LOAD, {
          filled: false
        }, load);
        $player.append($image);
      });

      if (isNumber(options.interval) && options.interval > 0) {
        playing = $.proxy(function () {
          this.playing = setTimeout(function () {
            list[index].removeClass(CLASS_IN);
            index++;
            index = index < total ? index : 0;
            list[index].addClass(CLASS_IN);

            playing();
          }, options.interval);
        }, this);

        if (total > 1) {
          playing();
        }
      }
    },

    // Stop play
    stop: function () {
      if (!this.isPlayed) {
        return;
      }

      if (this.options.fullscreen) {
        this.exitFullscreen();
      }

      this.isPlayed = false;
      clearTimeout(this.playing);
      this.$player.removeClass(CLASS_SHOW).empty();
    },

    // Enter modal mode (only available in inline mode)
    full: function () {
      var options = this.options;
      var $image = this.$image;
      var $list = this.$list;

      if (!this.isShown || this.isPlayed || this.isFulled || !options.inline) {
        return;
      }

      this.isFulled = true;
      this.$body.addClass(CLASS_OPEN);
      this.$button.addClass(CLASS_FULLSCREEN_EXIT);

      if (options.transition) {
        $image.removeClass(CLASS_TRANSITION);
        $list.removeClass(CLASS_TRANSITION);
      }

      this.$viewer.addClass(CLASS_FIXED).removeAttr('style').css('z-index', options.zIndex);
      this.initContainer();
      this.viewer = $.extend({}, this.container);
      this.renderList();
      this.initImage($.proxy(function () {
        this.renderImage(function () {
          if (options.transition) {
            setTimeout(function () {
              $image.addClass(CLASS_TRANSITION);
              $list.addClass(CLASS_TRANSITION);
            }, 0);
          }
        });
      }, this));
    },

    // Exit modal mode (only available in inline mode)
    exit: function () {
      var options = this.options;
      var $image = this.$image;
      var $list = this.$list;

      if (!this.isFulled) {
        return;
      }

      this.isFulled = false;
      this.$body.removeClass(CLASS_OPEN);
      this.$button.removeClass(CLASS_FULLSCREEN_EXIT);

      if (options.transition) {
        $image.removeClass(CLASS_TRANSITION);
        $list.removeClass(CLASS_TRANSITION);
      }

      this.$viewer.removeClass(CLASS_FIXED).css('z-index', options.zIndexInline);
      this.viewer = $.extend({}, this.parent);
      this.renderViewer();
      this.renderList();
      this.initImage($.proxy(function () {
        this.renderImage(function () {
          if (options.transition) {
            setTimeout(function () {
              $image.addClass(CLASS_TRANSITION);
              $list.addClass(CLASS_TRANSITION);
            }, 0);
          }
        });
      }, this));
    },

    // Show the current ratio of the image with percentage
    tooltip: function () {
      var options = this.options;
      var $tooltip = this.$tooltip;
      var image = this.image;
      var classes = [
            CLASS_SHOW,
            CLASS_FADE,
            CLASS_TRANSITION
          ].join(' ');

      if (!this.isViewed || this.isPlayed || !options.tooltip) {
        return;
      }

      $tooltip.text(round(image.ratio * 100) + '%');

      if (!this.tooltiping) {
        if (options.transition) {
          if (this.fading) {
            $tooltip.trigger(EVENT_TRANSITIONEND);
          }

          $tooltip.addClass(classes);
          forceReflow($tooltip[0]);
          $tooltip.addClass(CLASS_IN);
        } else {
          $tooltip.addClass(CLASS_SHOW);
        }
      } else {
        clearTimeout(this.tooltiping);
      }

      this.tooltiping = setTimeout($.proxy(function () {
        if (options.transition) {
          $tooltip.one(EVENT_TRANSITIONEND, $.proxy(function () {
            $tooltip.removeClass(classes);
            this.fading = false;
          }, this)).removeClass(CLASS_IN);

          this.fading = true;
        } else {
          $tooltip.removeClass(CLASS_SHOW);
        }

        this.tooltiping = false;
      }, this), 1000);
    },

    // Toggle the image size between its natural size and initial size
    toggle: function () {
      if (this.image.ratio === 1) {
        this.zoomTo(this.initialImage.ratio, true);
      } else {
        this.zoomTo(1, true);
      }
    },

    // Reset the image to its initial state
    reset: function () {
      if (this.isViewed && !this.isPlayed) {
        this.image = $.extend({}, this.initialImage);
        this.renderImage();
      }
    },

    // Update viewer when images changed
    update: function () {
      var $this = this.$element;
      var $images = this.$images;
      var indexes = [];
      var index;

      if (this.isImg) {

        // Destroy viewer if the target image was deleted
        if (!$this.parent().length) {
          return this.destroy();
        }
      } else {
        this.$images = $images = $this.find(SELECTOR_IMG);
        this.length = $images.length;
      }

      if (this.isBuilt) {
        $.each(this.$items, function (i) {
          var img = $(this).find('img')[0];
          var image = $images[i];

          if (image) {
            if (image.src !== img.src) {
              indexes.push(i);
            }
          } else {
            indexes.push(i);
          }
        });

        this.$list.width('auto');
        this.initList();

        if (this.isShown) {
          if (this.length) {
            if (this.isViewed) {
              index = $.inArray(this.index, indexes);

              if (index >= 0) {
                this.isViewed = false;
                this.view(max(this.index - (index + 1), 0));
              } else {
                this.$items.eq(this.index).addClass(CLASS_ACTIVE);
              }
            }
          } else {
            this.$image = null;
            this.isViewed = false;
            this.index = 0;
            this.image = null;
            this.$canvas.empty();
            this.$title.empty();
          }
        }
      }
    },

    // Destroy the viewer
    destroy: function () {
      var $this = this.$element;

      if (this.options.inline) {
        this.unbind();
      } else {
        if (this.isShown) {
          this.unbind();
        }

        $this.off(EVENT_CLICK, this.start);
      }

      this.unbuild();
      $this.removeData(NAMESPACE);
    },

    // A shortcut for triggering custom events
    trigger: function (type, data) {
      var e = $.Event(type, data);

      this.$element.trigger(e);

      return e;
    },

    shown: function () {
      var options = this.options;

      this.transitioning = false;
      this.isFulled = true;
      this.isShown = true;
      this.isVisible = true;
      this.render();
      this.bind();

      if ($.isFunction(options.shown)) {
        this.$element.one(EVENT_SHOWN, options.shown);
      }

      this.trigger(EVENT_SHOWN);
    },

    hidden: function () {
      var options = this.options;

      this.transitioning = false;
      this.isViewed = false;
      this.isFulled = false;
      this.isShown = false;
      this.isVisible = false;
      this.unbind();
      this.$body.removeClass(CLASS_OPEN);
      this.$viewer.addClass(CLASS_HIDE);
      this.resetList();
      this.resetImage();

      if ($.isFunction(options.hidden)) {
        this.$element.one(EVENT_HIDDEN, options.hidden);
      }

      this.trigger(EVENT_HIDDEN);
    },

    requestFullscreen: function () {
      var documentElement = document.documentElement;

      if (this.isFulled && !document.fullscreenElement && !document.mozFullScreenElement &&
        !document.webkitFullscreenElement && !document.msFullscreenElement) {

        if (documentElement.requestFullscreen) {
          documentElement.requestFullscreen();
        } else if (documentElement.msRequestFullscreen) {
          documentElement.msRequestFullscreen();
        } else if (documentElement.mozRequestFullScreen) {
          documentElement.mozRequestFullScreen();
        } else if (documentElement.webkitRequestFullscreen) {
          documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      }
    },

    exitFullscreen: function () {
      if (this.isFulled) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    },

    change: function (event) {
		//console.log('inside change with event: ' + event);
      var offsetX = this.endX - this.startX;
      var offsetY = this.endY - this.startY;

      switch (this.action) {

        // Move the current image
        case 'move':
          this.move(offsetX, offsetY);
          break;

        // Zoom the current image
        case 'zoom':
          this.zoom(function (x1, y1, x2, y2) {
            var z1 = sqrt(x1 * x1 + y1 * y1);
            var z2 = sqrt(x2 * x2 + y2 * y2);

            return (z2 - z1) / z1;
          }(
            abs(this.startX - this.startX2),
            abs(this.startY - this.startY2),
            abs(this.endX - this.endX2),
            abs(this.endY - this.endY2)
          ), false, event);

          this.startX2 = this.endX2;
          this.startY2 = this.endY2;
          break;

        case 'switch':
          this.action = 'switched';

          if (abs(offsetX) > abs(offsetY)) {
            if (offsetX > 1) {
              this.prev();
            } else if (offsetX < -1) {
              this.next();
            }
          }

          break;

        // No default
      }

      // Override
      this.startX = this.endX;
      this.startY = this.endY;
    },

    isSwitchable: function () {
      var image = this.image;
      var viewer = this.viewer;

      return (image.left >= 0 && image.top >= 0 && image.width <= viewer.width &&
        image.height <= viewer.height);
    }
  };

  Viewer.DEFAULTS = {
    // Enable inline mode
    inline: false,

    // Show the button on the top-right of the viewer
    button: true,

    // Show the navbar
    navbar: true,

    // Show the title
    title: true,

    // Show the toolbar
    toolbar: true,

    // Show the tooltip with image ratio (percentage) when zoom in or zoom out
    tooltip: true,

    // Enable to move the image
    movable: true,

    // Enable to zoom the image
    zoomable: true,

    // Enable to rotate the image
    rotatable: true,

    // Enable to scale the image
    scalable: true,

    // Enable CSS3 Transition for some special elements
    transition: true,

    // Enable to request fullscreen when play
    fullscreen: true,

    // Enable keyboard support
    keyboard: true,

    // Define interval of each image when playing
    interval: 5000,

    // Min width of the viewer in inline mode
    minWidth: 200,

    // Min height of the viewer in inline mode
    minHeight: 100,

    // Define the ratio when zoom the image by wheeling mouse
    zoomRatio: 0.1,

    // Define the min ratio of the image when zoom out
    minZoomRatio: 0.01,

    // Define the max ratio of the image when zoom in
    maxZoomRatio: 100,

    // Define the CSS `z-index` value of viewer in modal mode.
    zIndex: 2015,

    // Define the CSS `z-index` value of viewer in inline mode.
    zIndexInline: 0,

    // Define where to get the original image URL for viewing
    // Type: String (an image attribute) or Function (should return an image URL)
    url: 'src',

    // Event shortcuts
    build: null,
    built: null,
    show: null,
    shown: null,
    hide: null,
    hidden: null,
    view: null,
    viewed: null
  };

  Viewer.TEMPLATE = (
    '<div class="viewer-container">' +
      '<div class="viewer-canvas" style="background: #eeeeee; border: 1px solid #ccc;"></div>' +
      '<div class="viewer-footer" style="height: 50px;">' +
        '<div class="viewer-title"></div>' +
        '<div class="viewer-navbar" style="visibility: hidden;">' +
          '<ul class="viewer-list"></ul>' +
        '</div>' +
      '</div>' +
      '<div class="viewer-tooltip"></div>' +
      '<div class="viewer-button" data-action="mix"></div>' +
      '<div class="viewer-player"></div>' +
    '</div>'
  );

  // Save the other viewer
  Viewer.other = $.fn.viewer;

  // Register as jQuery plugin
  $.fn.viewer = function (options) {
    var args = toArray(arguments, 1);
    var result;

    this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;
      if (!data) {
        if (/destroy|hide|exit|stop|reset/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new Viewer(this, options)));
      }

      if (isString(options) && $.isFunction(fn = data[options])) {
        result = fn.apply(data, args);
      }
	  //alert('data= ' + JSON.stringify(data));
	  //currentState.data = data;
	  
    });
	
    return isUndefined(result) ? this : result;
  };

  $.fn.viewer.Constructor = Viewer;
  $.fn.viewer.setDefaults = Viewer.setDefaults;

  // No conflict
  $.fn.viewer.noConflict = function () {
    $.fn.viewer = Viewer.other;
    return this;
  };

});




//IMAGE VIEWER:
//---------------
function ImageViewer(parent, isFromBufferViewer){
	var self = this;
	this.container = parent;
	parent.style.position = 'relative';
	
	//clear parent and create the basic controllers:
	parent.innerHTML = '';
	this.activePreviews = [];
	parent.style.background = '#eeeeee';
	parent.style.overflowX = 'auto';
	this.currentRotationDegree = 0;
	
	//create footer controls:
	$(parent).append ($(
    '<div class="viewer-container">' +
      //'<div class="viewer-canvas" style="background: #eeeeee; border: 1px solid #ccc;"></div>' +
      '<div class="viewer-footer" style="height: 40px;">' +
        //'<div class="viewer-title"></div>' +
        '<ul class="viewer-toolbar">' +
		  '<li class="viewer-icon-button viewer-native-method viewer-move-up" data-arguments="[0,-10]" data-enable="inline" data-method="move" title="move up"></li>' +
		  '<li class="viewer-icon-button viewer-native-method viewer-move-down" data-arguments="[0,10]" data-enable="inline" data-method="move" title="move down"></li>' +
		  '<li class="viewer-icon-button viewer-native-method viewer-move-left" data-arguments="[-10,0]" data-enable="inline" data-method="move" title="move left"></li>' +
		  '<li class="viewer-icon-button viewer-native-method viewer-move-right" data-arguments="[10,0]" data-enable="inline" data-method="move" title="move right"></li>' +
		
          '<li class="viewer-icon-button viewer-native-method viewer-zoom-in" data-arguments="[0.5]" data-enable="inline" data-method="zoom" title="zoom-in"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-zoom-out" data-arguments="[-0.5]" data-enable="inline" data-method="zoom" title="zoom-out"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-one-to-one" data-method="zoomTo" data-arguments="[1]" title="show original size"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-reset" data-method="reset" title="reset preview"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-rotate-left" data-arguments="[]" data-method="rotateTo" data-direction="left" title="rotate left"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-rotate-right" data-arguments="[]" data-method="rotateTo" data-direction="right" title="rotate right"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-flip-horizontal" data-arguments="[-1]" data-method="scaleX" title="flip horizontal"></li>' +
          '<li class="viewer-icon-button viewer-native-method viewer-flip-vertical" data-arguments="[-1]" data-method="scaleY" title="flip vertical"></li>' +
          //'<li class="viewer-icon-button popOutViewer" title="pop up viewer"></li>' +
		  
		  '<li class="viewer-icon-button viewer-effect-toggle viewer-grayScale" data-target="gray" title="toggle gray-scale"></li>' +
		  '<li class="viewer-icon-button viewer-effect-toggle viewer-red-channel" data-target="red" title="toggle red-channel"></li>' +
		  '<li class="viewer-icon-button viewer-effect-toggle viewer-green-channel" data-target="green" title="toggle green-channel"></li>' +
		  '<li class="viewer-icon-button viewer-effect-toggle viewer-blue-channel" data-target="blue" title="toggle blue-channel"></li>' +
		  '<li class="viewer-icon-button viewer-showAsBuffer" title="view image as buffer">' +
		
		  '<li class="viewer-icon-button viewer-compare" title="Compare Menu" style="position: absolute; right: 20px;"></li>' +
		  
		  '<li class="viewer-icon-button viewer-diffControl-elements viewer-diffControl viewer-diffControl-left" data-direction="-1" title="prev diff" style="position: absolute; left: 20px;"></li>' +
		  '<li class="viewer-icon-button viewer-diffControl-elements viewer-diffControl viewer-diffControl-right" data-direction="1" title="next diff" style="position: absolute; left: 45px;"></li>' +

		  '<li class="viewer-icon-button viewer-compareMode" title="switch to overlay compare mode" style="position: absolute; right: 45px;"></li>' +
        '</ul>' +
      '</div>' +
    '</div>'
  ));
	
	if(isFromBufferViewer == true){
		$(parent).find('.viewer-showAsBuffer').remove();
	}
	
	$(this.container).find('.viewer-compare')[0].style.display = '';
	
	this.syncFunction = function(updatedData){
		//disable animations:
		//$(self.container).find('.viewer-transition.viewer-move').addClass('no-animation');
		//var updatedData = self.activePreviews[0].viewerInfo.image;
		var len = self.activePreviews.length;
		//var data = $(this).data();
		for(var i=0; i<len; i++){
			var previewInstance = self.activePreviews[i];
			
			//copy fields:
			if(previewInstance.viewerInfo.image != null){
				//previewInstance.viewerInfo.image.ratio = updatedData.ratio;
				previewInstance.viewerInfo.image.width = updatedData.width;
				previewInstance.viewerInfo.image.height = updatedData.height;
				previewInstance.viewerInfo.image.left = updatedData.left;
				previewInstance.viewerInfo.image.top = updatedData.top;
				previewInstance.viewerInfo.image.rotate = updatedData.rotate;
				previewInstance.viewerInfo.image.scaleX = updatedData.scaleX;
				previewInstance.viewerInfo.image.scaleY = updatedData.scaleY;
				
				previewInstance.viewerInfo.image = updatedData;
				previewInstance.viewerInfo.renderImage(null, true);
			}
			//previewInstance.updateMarkerLocation();
		}
		self.updateMarkersLocations();
	};
	
	//register buttons functionalities:
	$(parent).find('.viewer-showAsBuffer').click(function(){
		var onCloseFunction = function(){
			bufferViewer.dispose();
		}
		var overlayDiv = openOverlayLayout('100%','100%', true, onCloseFunction, null, null, true);
		//overlayDiv.style.minHeight = '650px';
		//overlayDiv.style.minWidth = '1000px';
		var containerDiv = document.createElement('div');
		containerDiv.style.position = 'relative';
		containerDiv.style.width = '100%';
		containerDiv.style.height = '100%';
		overlayDiv.appendChild(containerDiv);
		//add selected buffer to view:
		var bufferViewer = new BufferViewer(containerDiv, true);
		
		
		for(var i=0; i<self.activePreviews.length; i++){
			var bitmapPath = self.activePreviews[i].imgSrc;
			var title = self.activePreviews[i].title;

			$.ajax({
				url:  'ImageViewer?getBitmapPath=' + title,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (bitmapPath) {
					bufferViewer.AddBuffer(title, bitmapPath, 'char');
				},
				error: function(jqxhr, statusText, errorThrown){}
			});
		}

	});
	
	$(parent).find('.viewer-native-method').click(function(){
		//enable animations:
		//$(self.container).find('.viewer-transition.viewer-move').removeClass('no-animation');

		var len = self.activePreviews.length;
		var data = $(this).data();
		
		if(data.method == 'rotateTo'){
			var additionalDegree = 0;
			if(data.direction == 'left'){
				additionalDegree = -90;
			}
			if(data.direction == 'right'){
				additionalDegree = 90;
			}
			self.currentRotationDegree += additionalDegree;
			data.arguments[0] = self.currentRotationDegree;
		}
		
		if(data.method == 'reset'){
			self.currentRotationDegree = 0;
		}
		
		var previewInstance = self.activePreviews[0];
		previewInstance.executeMethod(data);
		self.syncFunction(previewInstance.viewerInfo.image);
		var args = data.arguments || [];
		switch (data.method) {
			case 'scaleX':
			case 'scaleY':
			    args[0] = -args[0];
			    break;
		}
		self.updateMarkersLocations();
	});
	
	//register effects buttons functionalities:
	$(parent).find('.viewer-effect-toggle').click(function(){
		var data = $(this).data();
		if(data.target == null){
			return;
		}
		//update server:
		var serverTogglersUpdated = false;
		$.ajax({
				url:  'ImageViewer?toggle=' + data.target,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (data) {
					serverTogglersUpdated = true;
				},
				error: function(jqxhr, statusText, errorThrown){}
			});
		if(serverTogglersUpdated != true){
			alert('Error, failed to apply effect: ' + serverTogglersUpdated);
			return;
		}
		
		//toggle the button class:
		if($(this).hasClass('viewer-grayedOut-button')){
			$(this).removeClass('viewer-grayedOut-button');
		}
		else{
			$(this).addClass('viewer-grayedOut-button');
		}
		
		var len = self.activePreviews.length;
		for(var i=0; i<len; i++){
			var previewInstance = self.activePreviews[i];
			var renderRequestStr = 'ImageViewer?redraw=' + previewInstance.title + '?time=' + Date.now();
			//console.log(renderRequestStr);
			previewInstance.changeImage(renderRequestStr);
		}
		
	});
	
	//$(parent).find('.popOutViewer').click(function(){
		
		//build popup input string:
		//tikkie
		
		//todo: dispose this viewer.
		
	//});
	
	//create diff-info container:
	this.diffInfoSpan = document.createElement('span');
	this.diffInfoSpan.className = 'diffInfoSpan comparableImageTitle viewer-diffControl-elements';
	this.diffInfoSpan.onclick = function(){
		//if(this.title == null || this.title == ''){
			alert(this.title);
			//showNotificationCenterScreen(this.title);
		//}
	};
	parent.appendChild(this.diffInfoSpan);
	
	
	
	//previews wrapper:
	var previewsTable = document.createElement('table');
	parent.appendChild(previewsTable);
	//previewsTable.style.height = 'calc(100% - 180px)';//60
	previewsTable.style.width = '100%';
	previewsTable.style.paddingTop = '20px';
	//previewsTable.style.background = 'pink';
	this.previewsRow = previewsTable.insertRow();
	
	//comparables list:
	this.comparablesList = [];
	
	$(parent).find('.viewer-compare').click(function(){
		var overlayDiv = openOverlayLayout('600px','400px', true, null, self.container);
		overlayDiv.style.paddingLeft = '10px';
		var title = document.createElement('div');
		
		title.innerHTML = '- Choose images to compare to:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '10px';
		overlayDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '2px';
		overlayDiv.appendChild(seperator);
		
		var tableContent = '';
		for(var i=0; i<self.comparablesList.length; i++){
			var comparableImage = self.comparablesList[i];
			var additionalClass = '';
			if(self.IsImageDisplayed(comparableImage.name)){
				additionalClass = ' comparableImageTitle-selected';
			}
			tableContent += '<tr><td class="comparableImageTitle' + additionalClass + '" ' +
										'data-name = "' + comparableImage.name + '" ' +
										'data-path = "' + comparableImage.path + '" ' +
										'data-width = "' + comparableImage.width + '" ' +
										'data-height = "' + comparableImage.height + '" ' +
										'data-channelorder = "' + comparableImage.channelOrder + '" ' +
										'data-channeltype = "' + comparableImage.channelType + '" ' +
										'data-rowpitch = "' + comparableImage.rowPitch + '" ' +
									'">' + 
									comparableImage.name + '</td><td>' +
									comparableImage.width + 'x' + comparableImage.height + '</td><td>' + 
									comparableImage.channelOrder + '</td><td>' + comparableImage.channelType + '</td></tr>';
		}
		var tableContainer = document.createElement('div');
		overlayDiv.appendChild(tableContainer);
		tableContainer.innerHTML = '<table class="newAnalysisInputTable" style="position: relative; width: 100%; margin-left: 0px;">' + 
											  '<thead><tr style="outline: thin solid;"><td>Variable Name</td><td>Resolution</td><td>Channel Order</td>' +
											  '<td>Channel Type</td></tr></thead><tbody>' + tableContent + '</tbody></table>';
		
		$(tableContainer).find('.comparableImageTitle').click(function(){
			if($(this).hasClass('comparableImageTitle-selected')){
				$(this).removeClass('comparableImageTitle-selected');
				self.RemoveImage($(this).data().name);
			}
			else{
				$(this).addClass('comparableImageTitle-selected');
				var data = $(this).data();
				var requestStr = 'ImageViewer?add=' + data.name + '&' + data.path + '&' + data.width + '&' + data.height + '&' + 
								data.channelorder + '&' + data.channeltype + '&' + data.rowpitch;
				self.AddImage(requestStr, data.name);
			}
		});
	});
	
	$(parent).find('.viewer-diffControl').click(function(){
		var data = $(this).data();
		self.getNextDiff(data.direction);
	});
	
	$(parent).find('.viewer-compareMode').click(function(){

		//toggle the button class:
		if($(this).hasClass('viewer-grayedOut-button')){
			$(this).removeClass('viewer-grayedOut-button');
			this.title = 'switch to overlay compare mode';
			self.switchToSideBySideMode();
		}
		else{
			$(this).addClass('viewer-grayedOut-button');
			this.title = 'switch to side-by-side compare mode';
			self.switchToOverlayMode();
		}
		
	});
	
	//register window size event:
	this.onWindowResize =  function(){
		var newHeight = $(self.container).height() - 90;
		$(self.container).find('.thumbnails-img').css({"height": newHeight + 'px'});
	}
	
	//hide "compare" controllers:
	$(this.container).find('.viewer-diffControl-elements').css({"visibility": 'hidden'});
	$(this.container).find('.viewer-compareMode').css({"visibility": 'hidden'});
	
	$(window).resize(this.onWindowResize);
}

ImageViewer.prototype.AddImage = function (imgSrc, title){
	//alert(imgSrc + "\n" + title);
	//add new TD to previewsTab;e:
	var newTD = this.previewsRow.insertCell();
	//newTD.style.border = '1px solid #ccc';
	newTD.style.overflow = 'hidden';
	var DTwidth = (100 / $(this.previewsRow).find('td').length) + '%';
	$(this.previewsRow).find('td').css({width: DTwidth});
	
	//create instance:
	var previewInstance = new ImagePreview(imgSrc, title, newTD, this.syncFunction, this);
	
	//set marker if there's one:
	if(this.diffMarkerX != null && this.diffMarkerY != null){
		previewInstance.setDiffMarker(this.diffMarkerX, this.diffMarkerY);
	}
	
	//add to active previews:
	this.activePreviews.push(previewInstance);
	
	$(this.container).find('.thumbnails-img').css({ width: DTwidth});
	
	//trigger resize to avoid buggy view:
	$(window).resize();
	
	if(this.activePreviews.length > 1){
		$(this.container).find('.viewer-diffControl-elements').css({"visibility": ''});
		$(this.container).find('.viewer-compareMode').css({"visibility": ''});
	}
}

ImageViewer.prototype.RemoveImage = function (title){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		if(previewInstance.title == title){
			previewInstance.executeMethod({method: 'destroy'});
			$(previewInstance.parentTD).remove();
			this.activePreviews.splice(i,1); //remove index i.
			
			$.ajax({
				url:  'ImageViewer?remove=' + title,
				type: "POST",
				async: false,
				dataType: "text",
				success: function () {
				},
				error: function () {
				}
			});
			
			//trigger resize to avoid buggy view:
			$(window).resize();
			
			if(this.activePreviews.length <= 1){
				$(this.container).find('.viewer-diffControl-elements').css({"visibility": "hidden"});
				$(this.container).find('.viewer-compareMode').css({"visibility": 'hidden'});
			}
		}
	}
}

ImageViewer.prototype.dispose = function(){
	var len = this.activePreviews.length;
	for(var i=len-1; i>=0; i--){
		var previewInstance = this.activePreviews[i];
		this.RemoveImage(previewInstance.title);
	}
	$.ajax({
		url:  'ImageViewer?resetTogglers',
		type: "POST",
		async: false,
	});
	
	$(window).off("resize", this.onWindowResize);	
}

ImageViewer.prototype.IsImageDisplayed = function (title){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		if(previewInstance.title == title){
			return true;
		}
	}
	return false;
}

ImageViewer.prototype.onPixelHover = function (x, y){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		if(previewInstance.isPixelHoverDisabled == true){
			return;
		}
		//get data from server:
		$.ajax({
				url:  'ImageViewer?getPixelData=' + previewInstance.title + '&' + x + '&' + y,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (value) {
					previewInstance.headerDiv.innerHTML = '<span style="color: #0071c5;">pixel ' + x  + 'x' + y + '</span>';
					if(value != null & value != ''){
						previewInstance.headerDiv.innerHTML += '<span style="font-wieght: 700; color: #0071c5;"> value: ' + value + '</span>';
					}
					else{
						previewInstance.headerDiv.innerHTML += '<span style="color: gray;"> (out of image range).</span>';
					}
				},
				error: function(jqxhr, statusText, errorThrown){
					previewInstance.headerDiv.innerHTML = '';//"pixel: " + x  + 'x' + y + ' value is: todo';
				}
			});
		
	}
}

ImageViewer.prototype.addComparableImage = function (path, name, width, height, channelOrder, channelType, rowpitch){
	var newComparable = {
		"path": path,
		"name": name,
		"width": width,
		"height": height,
		"channelOrder": channelOrder,
		"channelType": channelType,
		"rowPitch": rowpitch
	};
	this.comparablesList.push(newComparable);
	
	$(this.container).find('.viewer-compare')[0].style.display = '';
}

ImageViewer.prototype.getNextDiff = function (direction){
	var self = this;
	var mainImagePreviewInstance = self.activePreviews[0];
	if(mainImagePreviewInstance.viewerInfo.image == null){
		setTimeout(function(){self.getNextDiff();}, 50);
		return;
	}
	var imageWidth = mainImagePreviewInstance.viewerInfo.image.naturalWidth;
	var imageHeight = mainImagePreviewInstance.viewerInfo.image.naturalHeight;
		
	//get data from server:
	
	$.ajax({
		url:  'ImageViewer?getNextDiff=' + imageWidth + '&' + imageHeight + '&' + direction,
		type: "POST",
		async: false,
		dataType: "json",
		success: function (data) {
			if(data==null || data.x == null || data.y == null){
				alert('No other diffs in this direction');
				return;
			}
			self.setDiffMarker(data.x, data.y, data.tooltipsArray);
		},
		error: function(jqxhr, statusText, errorThrown){
			alert('error while getting Next-Diff');
		}
	});
}

ImageViewer.prototype.setDiffMarker = function (x, y, tooltipsArray){
	var len = this.activePreviews.length;
	this.diffMarkerX = x;
	this.diffMarkerY = y;
	var tipText = '';
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		var tooltip = null;
		if(tooltipsArray != null){
			for(var i=0; i<tooltipsArray.length; i++){
				var tooltipsEntry = tooltipsArray[i];
				if(tooltipsEntry.name == previewInstance.title){
					tooltip = tooltipsEntry.color;
					tipText += tooltipsEntry.color + ' in variable "' + tooltipsEntry.name + '"\n';
					break;
				}
			}
		}
		previewInstance.setDiffMarker(x,y,tooltip);
	}
	this.updateMarkersLocations();
	
	this.diffInfoSpan.innerHTML = 'diff at pixel ' + x + 'x' + y;
	this.diffInfoSpan.title =  'diff at pixel ' + x + 'x' + y + ':\n' + tipText;
}

ImageViewer.prototype.hideDiffMarker = function (){
	this.diffMarkerX = null;
	this.diffMarkerY = null;
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		previewInstance.hideDiffMarker();
	}
}

ImageViewer.prototype.updateMarkersLocations = function(){
	if(this.diffMarkerX == null || this.diffMarkerY == null){
		return;
	}
	var len = this.activePreviews.length;
	if(len < 1){
		return;
	}
	var previewInstance = this.activePreviews[0];
	previewInstance.calculateAndUpdateMarkerLocation();
	var top = previewInstance.activeMarker.style.top;
	var left = previewInstance.activeMarker.style.left;
	
	for(var i=1; i<len; i++){
		previewInstance = this.activePreviews[i];
		previewInstance.updateMarkerLocation(top, left);
	}
}

ImageViewer.prototype.switchToSideBySideMode = function(){
	var len = this.activePreviews.length;
	var previewInstance;
	for(var i=1; i<len; i++){
		previewInstance = this.activePreviews[i];
		previewInstance.parentTD.style.display = '';
		previewInstance.headerDiv.innerHTML = '';
		previewInstance.isPixelHoverDisabled = false;
	}
	this.adjustImagePreviewsWidth(len);
	
	//reset view:
	$(this.container).find('.viewer-reset').click();
	
	//update server compare mode:
	$.ajax({
		url:  'ImageViewer?setCompareMode=' + '1',
		type: "POST",
		async: false,
	});

	//show channel toggling buttons:
	$(this.container).find('.viewer-effect-toggle').css({display: ''});
	
	//get main image again:
	previewInstance = this.activePreviews[0];
	previewInstance.headerDiv.innerHTML = '';
	previewInstance.isPixelHoverDisabled = false;
	previewInstance.changeImage(filesBaseDir + '/resources/1x1.jpg');
	var renderRequestStr = 'ImageViewer?redraw=' + previewInstance.title + '?time=' + Date.now();
	//console.log(renderRequestStr);
	setTimeout(function(){
		previewInstance.changeImage(renderRequestStr);
	}, 1);
	
}

ImageViewer.prototype.switchToOverlayMode = function(){
	var len = this.activePreviews.length;
	var previewInstance;
	for(var i=1; i<len; i++){
		previewInstance = this.activePreviews[i];
		previewInstance.parentTD.style.display = 'none';
		previewInstance.headerDiv.innerHTML = '';
		previewInstance.isPixelHoverDisabled = true;
	}
	this.adjustImagePreviewsWidth(1);

	//reset view:
	$(this.container).find('.viewer-reset').click();
	
	//update server compare mode:
	$.ajax({
		url:  'ImageViewer?setCompareMode=' + '2',
		type: "POST",
		async: false,
	});

	//show channel toggling buttons:
	$(this.container).find('.viewer-effect-toggle').css({display: 'none'});
	
	//get main image again:
	previewInstance = this.activePreviews[0];
	previewInstance.changeImage(filesBaseDir + '/resources/1x1.jpg');
	previewInstance.headerDiv.innerHTML = 'Overlay mode: white pixels indicates difference, black pixels indicates match';
	previewInstance.isPixelHoverDisabled = true;
	var renderRequestStr = 'ImageViewer?redraw=' + previewInstance.title + '?time=' + Date.now();
	//console.log(renderRequestStr);
	setTimeout(function(){
		previewInstance.changeImage(renderRequestStr);
	}, 1);
}

ImageViewer.prototype.adjustImagePreviewsWidth = function(imagesCount){
	var DTwidth = (100 / imagesCount) + '%';
	$(this.previewsRow).find('td').css({width: DTwidth});
	
	//trigger resize to avoid buggy view:
	$(window).resize();
}



function ImagePreview(imgSrc, title, parent, syncFunction, mainViewer){
	var self = this;
	this.imgSrc = imgSrc;
	this.title = title;
	this.parentTD = parent;
	var thumbnailSrc=filesBaseDir + '/resources/1x1.jpg';
	imgSrc += '?time=' + Date.now();
	if(sessionID != null){
		imgSrc = sessionID + '?' + imgSrc;
	}
	
	parent.innerHTML = '<div class="docs-galley">' + 
								    '<ul class="docs-pictures clearfix" style="visibility: hidden;">' +
									    '<img class="thumbnails-img" data-original="' + imgSrc + '" src="' + thumbnailSrc + '" alt="' + title + '">' +
								    '</ul>' + 
							   '</div>';
	
	 var $images = $($(parent).find('.docs-pictures')[0]);
	 var $toggles = $($(this.container).find('.docs-toggles')[0]);//$('.docs-toggles');
	 var $buttons =$('.docs-buttons');// $('.docs-buttons');
	 var options = {
	 	inline: true,
	 	url: 'data-original'
	   };

	var viewerULelement = $(parent).find('.docs-pictures')[0];
	viewerULelement.syncFunction = syncFunction;
	this.imageViewerObj = $images.viewer(options, syncFunction);
	this.viewerInfo = viewerULelement.info;
	
	//pixel hover:
	var registerPixelTracker = function(){
		
		while($(parent).find(".viewer-move").length < 1){
			setTimeout(function(){registerPixelTracker();}, 50);
			return;
		}
		
		$($(parent).find(".viewer-move")[0]).mousemove(function (e) {
			var offset_t = $(this).offset().top - $(window).scrollTop();
			var offset_l = $(this).offset().left - $(window).scrollLeft();
			var scaleRatio = viewerULelement.info.image.ratio;
			var left = Math.floor( (e.clientX - offset_l) / scaleRatio);
			var top = Math.floor( (e.clientY - offset_t)  / scaleRatio);
			mainViewer.onPixelHover(left, top);
		});
	}
	
	registerPixelTracker();
	
	//add header text container:
	parent.style.position = 'relative';
	this.headerDiv = document.createElement('div');
	parent.appendChild(this.headerDiv);
	this.headerDiv.style.position = 'absolute';
	this.headerDiv.style.top = '0px';
	this.headerDiv.style.left = '10px';
	this.headerDiv.style.zIndex = '999';
	this.headerDiv.style.fontSize = '15px';
	this.headerDiv.style.fontWeight = '700';
	this.headerDiv.style.color = '#0071c5';
	this.headerDiv.innerHTML = '';
	
	this.activeMarker = document.createElement('span');
	this.activeMarker.className = 'diff-marker';
	this.activeMarker.style.visibility = 'hidden';
	parent.appendChild(this.activeMarker);
	
	
	
	//add a "save as" button if can save:
	var canSave = false;
	$.ajax({
		url:  'ImageViewer?canSaveAsBMP=' + self.title,
		type: "POST",
		async: false,
		dataType: "text",
		success: function () {
			canSave = true;
		},
		error: function(jqxhr, statusText, errorThrown){}
	});
	
	if(canSave == true){
		this.saveAsBMPImg = document.createElement('img');
		parent.appendChild(this.saveAsBMPImg);
		this.saveAsBMPImg.style.position = 'absolute';
		this.saveAsBMPImg.style.top = '45px';
		this.saveAsBMPImg.style.right = '9px';
		this.saveAsBMPImg.style.width = '16px';
		this.saveAsBMPImg.style.height = '16px';
		this.saveAsBMPImg.style.zIndex = '999';
		this.saveAsBMPImg.style.cursor = 'pointer';
		this.saveAsBMPImg.title = 'save image';
		this.saveAsBMPImg.src = filesBaseDir + '/resources/save.png';
		
		this.saveAsBMPImg.onclick = function(){
			$.ajax({
				url:  'ImageViewer?saveAsBMP=' + self.title,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (data) {
					//alert('image saved successfully.');
				},
				error: function(jqxhr, statusText, errorThrown){
					//alert('Failed to save image.');
				}
			});
		}
		
	}
	
	
}

ImagePreview.prototype.executeMethod = function (data){
	var args = data.arguments || [];
	if (data.method) {
		//console.log('execution for ' + this.title + ': ' + data.method + ', ' + args[0] + ', ' + args[1]);
	  	this.imageViewerObj = this.imageViewerObj.viewer(data.method, args[0], args[1]);
	}
}

ImagePreview.prototype.changeImage = function (src){
	var ImageElement = $(this.parentTD).find(".viewer-move")[0];
	if(sessionID != null){
		ImageElement.src = sessionID + '?' + src;
	}
}

ImagePreview.prototype.setDiffMarker = function (x, y, tooltip){
	this.activeMarker.pixelX = x;
	this.activeMarker.pixelY = y;
	this.activeMarker.title = 'pixel ' + x + 'x' + y + ': ' + tooltip;
	this.activeMarker.style.visibility = '';
}

ImagePreview.prototype.hideDiffMarker = function (){
	this.activeMarker.style.visibility = 'hidden';
}

ImagePreview.prototype.updateMarkerLocation = function(top, left){
	this.activeMarker.style.top = top;
	this.activeMarker.style.left =  left;
	//console.log('new location for ' + this.title + ': ' + left + ', ' + top);
}

ImagePreview.prototype.calculateAndUpdateMarkerLocation = function(){
	if(this.activeMarker == null || this.activeMarker.style.visibility == 'hidden' ){
		return;
	}
	var self = this;
	if($(this.parentTD).find(".viewer-move")[0] == null){
		setTimeout(function(){self.calculateAndUpdateMarkerLocation();}, 50);
		return;
	}
	
	var x = this.activeMarker.pixelX;
	var y = this.activeMarker.pixelY;
	var img = $(this.parentTD).find(".viewer-move")[0];
	var offset_t = $(img).offset().top - $(window).scrollTop();
	var offset_l = $(img).offset().left - $(window).scrollLeft();
	var scaleRatio =this.viewerInfo.image.ratio;
	var left = Math.floor(x * scaleRatio) + offset_l ;
	var top = Math.floor(y * scaleRatio) + offset_t;

	this.activeMarker.style.top = top + 'px';
	this.activeMarker.style.left =  left + 'px';
}


