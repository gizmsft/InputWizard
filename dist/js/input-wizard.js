; function CaretLocator(element, options) {
    "use strict";

    const $target = (element instanceof jQuery) ? element : $(element);
    const _target = $target.get(0);
    const _nodeName = _target.nodeName.toUpperCase();

    const nodeTypes = {
        TextArea: "TEXTAREA",
        Input: "INPUT"
    };

    // input manager can only be attached to input or textarea elements.
    (function (nodeName) {
        if (nodeName != nodeTypes.TextArea && nodeName != nodeTypes.Input) {
            throw "unsupported element type '" + nodeName + "' for InputManager";
        }
    })(_nodeName);

    const defaults = {
        debug: false
    };

    const local = {
        marker: $("<span style='white-space: nowrap; padding: 0; margin: 0;'>\u200B</span>"),
        debug: false,
        settings: null
    };

    // save settings by overriding defaults
    local.settings = $.extend(true, {}, defaults, options);
    local.debug = local.settings.debug;

    var _twinContainerTextArea = $("<div></div>").css({
        'border-width': '1px',
        'border-style': 'solid',
        'overflow': 'hidden',
        'box-sizing': 'border-box',
        'white-space': 'pre-wrap',
        'word-wrap': 'break-word',
        'position': 'absolute',
        'top': local.debug ? ($target.position().top) + 'px' : '0px',
        'left': local.debug ? ($target.position().left + $target.width() + 100) + 'px' : '-9999px',
        'visibility': local.debug ? 'visible' : 'hidden'
    });

    var _twinContainerInput = $('<div></div>').css({
        'border-width': '1px',
        'border-style': 'solid',
        'overflow': 'hidden',
        'box-sizing': 'border-box',
        'white-space': 'nowrap',
        'word-wrap': 'nowrap',
        'position': 'absolute',
        'top': local.debug ? ($target.position().top) + 'px' : '0px',
        'left': local.debug ? ($target.position().left + $target.width() + 100) + 'px' : '-9999px',
        'visibility': local.debug ? 'visible' : 'hidden'
    });

    var _cssTextArea = [
        'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
        'font-stretch', 'font-size-adjust', 'line-height',

        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-style',
        'padding-top', 'padding-left', 'padding-bottom', 'padding-right',

        'box-sizing', 'width', 'height', 'overflow-x', 'overflow-y', 'tab-size', 'moz-tab-size',

        'line-height', 'letter-spacing', 'word-spacing', 'text-decoration', 'text-align',
        'text-transform', 'text-indent', 'direction'
    ];

    var _cssInput = [
        'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
        'padding-top', 'padding-left', 'padding-bottom', 'padding-right',
        'line-height', 'letter-spacing', 'word-spacing', 'text-decoration', 'text-align',
        'direction'
    ];

    this.setHighlight = function ($element, preText, postText, term) {
        $element.empty();

        if (term) {
            if (_nodeName == nodeTypes.TextArea) {
                var $css = $target.css(_cssTextArea);
                $element.css($css);
                $element.append(preText.substr(0, preText.length - term.length));
                $element.append($("<span style='background-color: yellow; color: transparent;'></span>").append(term));
                $element.append(postText);
                $element.css({ top: -1 * $target.scrollTop() });
            } else if (_nodeName == nodeTypes.Input) {
                var $css = $target.css(_cssInput);
                $element.css($css);
                $element.append(preText.substr(0, preText.length - term.length));
                $element.append($("<span style='background-color: yellow; color: transparent;'></span>").append(term));
                $element.append(postText);
            }
        }
    }

    this.unsetHighlight = function ($element) {
        $element.empty();
    }

    this.setDebug = function (enabled) {
        local.debug = !!enabled;
    }

    this.getCursorOffset = function (preText, postText) {
        var height = _target.clientHeight;
        var width = _target.clientWidth;

        if (_nodeName == nodeTypes.TextArea) {
            // Get textbox/textarea style.
            var $css = $target.css(_cssTextArea);

            $.extend($css, {
                'height': height - 2,
                'width': width - 2,
            });

            //create div as a copy and get cursor position.
            _twinContainerTextArea.appendTo($target.parent()).css($css).empty().append(preText, local.marker, postText);

            var position = { top: null, right: null, left: null, height: null, isRTL: false };
            var pos = local.marker.position();

            position.height = local.marker.height();
            position.top = pos.top - $target.scrollTop();
            position.bottom = height - position.top;

            position.isRTL = ($target.css('direction') === 'rtl' || _target.dir === 'rtl');
            position.left = pos.left
            position.right = width - pos.left;

            if (!local.debug) {
                _twinContainerTextArea.empty();
                _twinContainerTextArea.remove();
            }

            return position;
        }
        else if (_nodeName == nodeTypes.Input) {
            var height = _target.clientHeight;
            var width = _target.clientWidth;

            // Get textbox/textarea style.
            var $css = $target.css(_cssInput);

            $.extend(true, $css, {
                'height': height - 2,
                'min-width': width - 2,
            });

            //create div as a copy and get cursor position.
            _twinContainerInput.appendTo($target.parent()).css($css).empty().append(preText, local.marker, postText);

            var position = { top: null, right: null, left: null, height: null, isRTL: false };
            var pos = local.marker.position();

            position.height = local.marker.height();
            position.top = pos.top;
            position.bottom = height - position.top;

            position.isRTL = ($target.css('direction') === 'rtl' || _target.dir === 'rtl');
            position.left = pos.left - $target.scrollLeft();
            position.right = width - pos.left;

            if (!local.debug) {
                _twinContainerInput.empty();
                _twinContainerInput.remove();
            }

            return position;
        }
    }
}

; function InputManager(element, options) {
    "use strict";

    var $self = this;
    var $target = (element instanceof jQuery) ? element : $(element);
    var _target = $target.get(0);

    // input manager can only be attached to input or textarea elements.
    (function (nodeName) {
        if (nodeName != 'input' && nodeName != 'textarea') {
            throw 'unsupported element type \'' + nodeName + '\' for inputManager';
        }
    })(_target.nodeName.toLowerCase());

    const defaults = {
        containerClass: 'input-manager',
        debug: false,
        enabled: true,
        highlightTemplate: "<div class='highlight'></div>",
        events: {
            onKeydown: null,
            onKeyup: null,
            onCursorPositionChanged: null
        }
    }

    const local = {
        debug: false,
        enabled: true,
        bufferedCusorPosition: 0,
        settings: null
    };

    // save settings by overriding defaults
    local.settings = $.extend(true, {}, defaults, options);
    local.debug = local.settings.debug;
    local.enabled = local.settings.enabled;

    $target.addClass(local.settings.containerClass);

    const _caretLocator = new CaretLocator($target, {
        debug: local.debug
    });

    //////////////////////////////////////////
    // PUBLIC FUNCTIONS
    //////////////////////////////////////////

    // returns element this plugin is attached to.
    this.getTarget = function () {
        return $target;
    }

    // returns current settings of the plugin.
    this.getSettings = function () {
        return local.settings;
    }

    // set debug
    this.setDebug = function (enabled) {
        local.debug = !!enabled;
        _caretLocator.setDebug(enabled);
    }

    // set enable events
    this.setEnabled = function (enabled) {
        local.enabled = enabled;
    }

    // get enable events
    this.getEnabled = function () {
        return local.enabled;
    }

    this.getCursorOffset = function (preText, postText) {
        return _caretLocator.getCursorOffset(preText, postText);
    }

    this.setHighlight = function (element, preText, postText, term) {
        _caretLocator.setHighlight(element, preText, postText, term);
    }

    this.unsetHighlight = function ($element) {
        _caretLocator.unsetHighlight($element);
    }

    // returns current cursor position
    this.getCursorPosition = function () {
        var index = _target.selectionEnd;

        if (typeof index === 'number') {
            return index;
        }
        else if (document.selection) {
            var range = _target.createTextRange();
            range.moveStart('character', 0);
            range.moveEnd('textedit');
            return range.text.length;
        }
    }

    // sets cursor position.
    this.setCursorPosition = function (position) {
        if ($target.is(':focus')) {
            if (typeof _target.selectionEnd === 'number') {
                _target.selectionStart = _target.selectionEnd = position;
            }
            else if (_target.createTextRange) {
                var range = _target.createTextRange();
                range.move('character', position);
                range.select();
            }
        }
    }

    this.getSelectedText = function () {
        // Get Previous text
        var start = _target.selectionStart;

        if (typeof start === 'number') {
            var end = _target.selectionEnd;
            return _target.value.substring(start, end);
        }
        else if (document.selection) {
            return _target.selection.createRange().text;
        }
    }

    this.getInputState = function () {
        return getInputState();
    }

    this.updateCursorPosition = function () {
        raiseCursorPositionChanged();
    }

    /////////////////////////////////
    // PRIVATE FUNCTIONS
    /////////////////////////////////

    // raises event 'onCursorPositionChanged' when cursor is moved.
    var raiseCursorPositionChanged = function () {
        if (local.settings.events.onCursorPositionChanged && local.enabled) {
            if ($target.is(':focus')) {
                var cursorPosition = $self.getCursorPosition();
                if (local.bufferedCusorPosition != cursorPosition) {
                    local.bufferedCusorPosition = cursorPosition;

                    var state = getInputState();
                    var param = $.extend({
                        'cursorPosition': cursorPosition
                    }, state);
                    local.settings.events.onCursorPositionChanged.call($self, param);
                }
            }
        }
    }

    // raises event 'onKeydown' when cursor is moved.
    var raiseKeydown = function (e) {
        if (local.settings.events.onKeydown && local.enabled) {
            var state = getInputState();
            var param = $.extend(e, state);
            local.settings.events.onKeydown.call($self, param);
        }
    }

    // raises event 'onKeyup' when cursor is moved.
    var raiseKeyup = function (e) {
        if (local.settings.events.onKeyup && local.enabled) {
            var state = getInputState();
            var param = $.extend(e, state);
            local.settings.events.onKeyup.call($self, param);
        }
    }

    var getInputState = function () {
        var preText = getPreText();
        var postText = $target.val().substring(preText.length);
        var offset = getCursorOffset(preText, postText);
        return {
            preText: preText,
            postText: postText,
            cursorOffset: offset
        };
    }

    // returns all text before cursor.
    var getPreText = function () {
        // Get Previous text
        var index = _target.selectionEnd;

        if (typeof index === 'number') {
            return _target.value.substring(0, index);
        }
        else if (document.selection) {
            var range = _target.createTextRange();
            range.moveStart('character', 0);
            range.moveEnd('textedit');
            return range.text;
        }
    }

    // returns offset of the cursor.
    var getCursorOffset = function (preText, postText) {
        return _caretLocator.getCursorOffset(preText, postText);
    };

    // changes function scope so that 'this' could point to source object
    var contextBinder = function (func, scope) {
        if (func.bind) {
            return func.bind(scope);
        } else {
            return function () {
                func.apply(scope, arguments[2]);
            };
        }
    };

    // trap all events that we are interested in.
    // keypress is depricated
    $target.on('keydown', raiseKeydown);
    $target.on('keyup', raiseKeyup);
    $target.on('keypress keydown keyup input click paste change', raiseCursorPositionChanged);
}

; function OptionSelector(options) {
    "use strict";
    var _self = this;

    if (!options.lists || !Array.isArray(options.lists) || !options.lists.length) {
        throw "There must be atleast one list defined in options.";
    }

    var defaults = {
        lists: [],
        data: null,
        itemDataAttribute: "index",
        defaultListIndex: 0,
        defaultIndex: -1,
        visible: true,
        enabled: true,
        css: {
            hideRootClass: "root-selector-hide",
            rootClass: "root-selector",
            rootListClass: "root-selector-list",
            rootListItemClass: "root-selector-list-item",
            listClass: "selector-list",
            listItemClass: "selector-list-item",
            selectedListItemClass: "selector-list-item-selected",
        },
        mainListTemplate: "<ul></ul>",
        mainListItemTemplate: "<li></li>",
        listTemplate: "<ul></ul>",
        itemTemplate: "<li></li>",
        events: {
            onClicked: function (e) { },
            onSelectionChanged: function (e) { },
            onVisibilityChanged: function (e) { }
        },
        extensions: {
            formatter: function (element) { }
        }
    };

    var local = {
        visible: true,
        enabled: true,
        settings: null,
        data: null,
        selectedIndexes: [],
        uiRoot: null,
        uiRootList: null,
        uiLists: [],
        activeListIndex: 0
    };

    //Settings
    local.settings = $.extend(true, {}, defaults, options);
    local.visible = local.settings.visible;
    local.enabled = local.settings.enabled;
    local.uiRoot = $('<div></div>').addClass(local.settings.css.rootClass);
    local.uiRootList = $(local.settings.mainListTemplate).addClass(local.settings.css.rootListClass).appendTo(local.uiRoot);

    $.each(local.settings.lists, function (index, listInfo) {
        local.selectedIndexes[index] = -1;
        var $list = $(local.settings.listTemplate).addClass(local.settings.css.listClass).addClass(listInfo.listClass);
        var $rootItem = $(local.settings.mainListItemTemplate).addClass(local.settings.css.rootListItemClass).append($list);
        local.uiRootList.append($rootItem).addClass(local.settings.css.rootListClass);
        local.uiLists.push($list);
    });

    local.activeListIndex = (local.settings.defaultListIndex > -1) ? local.settings.defaultListIndex : 0;

    ////////////////////////////////////////
    // PUBLIC FUNCTIONS
    ////////////////////////////////////////

    // returns top most element of the plugin
    this.getUIRoot = function () {
        return local.uiRoot;
    }

    // returns ui lists
    this.getUILists = function () {
        return local.uiLists;
    }

    this.getEnabled = function () {
        return local.enabled;
    }

    this.setEnabled = function (enabled) {
        local.enabled = !!enabled;
    }

    // returns data blob
    this.getData = function () {
        return local.data;
    }

    // creates list items by removing previous.
    this.setData = function (data) {
        this.clear();

        if (data && Array.isArray(data) && data.length == local.uiLists.length) {
            local.data = data;
            draw();
            this.setSelectedIndex();
        }
    }

    // returns number of lists.
    this.getListCount = function () {
        return local.uiLists.length;
    }

    // returns number of items in the list by list index.
    this.getListItemCount = function (index) {
        if (local.uiLists[index]) {
            return local.uiLists[index].children().length;
        }
    }

    // retuns flag whether the conrol is visible or not.
    this.getVisible = function () {
        return local.visible;
    }

    // changes visibility of the plugin.
    this.setVisible = function (visible) {
        var isChanged = false;

        if (visible && !local.visible) {
            local.uiRoot.removeClass(local.settings.css.hideRootClass);
            local.visible = true;
            isChanged = true;
        }
        else if (!visible && local.visible) {
            local.uiRoot.addClass(local.settings.css.hideRootClass);
            local.visible = false;
            isChanged = true;
        }

        if (isChanged && local.settings.events.onVisibilityChanged != null && local.enabled) {
            local.settings.events.onVisibilityChanged.call(this, local.visible);
        }
    }

    if (!local.visible) {
        local.uiRoot.addClass(local.settings.css.hideRootClass);
    }

    // clears the list items.
    this.clear = function () {
        local.data = null;
        $.each(local.uiLists, function (index, list) {
            list.empty();
        });
        $.each(local.selectedIndexes, function (index, item) { item = -1 });
        local.activeListIndex = (local.settings.defaultListIndex > -1) ? local.settings.defaultListIndex : 0;
    }

    // returns selected data item.
    this.getSelectedDataItem = function () {
        if (local.data && local.activeListIndex > -1 && local.selectedIndexes[local.activeListIndex] > -1) {
            return local.data[local.activeListIndex][local.selectedIndexes[local.activeListIndex]];
        }
        return null;
    }

    // returns selected item index.
    this.getSelectedIndex = function () {
        return (local.data && local.activeListIndex > -1 && local.selectedIndexes[local.activeListIndex] > -1) ? {
            listIndex: local.activeListIndex,
            listItemIndex: local.selectedIndexes[local.activeListIndex]
        } : null;
    }

    // sets selected list item.
    this.setSelectedIndex = function (itemIndex, listIndex) {

        if (listIndex == local.activeListIndex && itemIndex == local.selectedIndexes[local.activeListIndex]) {
            return;
        }

        var x = (typeof listIndex != 'number') ? local.activeListIndex : listIndex;
        var y = (typeof itemIndex != 'number') ? local.settings.defaultIndex : itemIndex;

        if (x > -1 && x < local.uiLists.length) {
            if (y > -1 && y < local.uiLists[x].children().length) {

                $.each(local.uiLists, function (j) {
                    var $children = local.uiLists[j].children();
                    var selectedClass = local.settings.lists[j].selectedListItemClass;

                    $children.each(function (i, item) {
                        if (j != x) {
                            decorateItem(selectedClass, $(item), x, -1, i);
                        }
                        else {
                            decorateItem(selectedClass, $(item), x, y, i);
                        }
                    });

                    local.activeListIndex = x;
                    local.selectedIndexes[local.activeListIndex] = y;

                });

                if (typeof itemIndex == 'number' &&
                    local.settings.events.onSelectionChanged != null &&
                    local.enabled) {
                    local.settings.events.onSelectionChanged.call(this,
                        { activeListIndex: local.activeListIndex, activeListItemIndex: y });
                }
            }
        }
    }

    ////////////////////////////////////////
    // PRIVATE FUNCTIONS
    ////////////////////////////////////////

    //raised when a list item is clicked
    var onClicked = function (e) {
        if (local.enabled) {
            var $element = $(e.target);
            var $listItem = $element.closest('.' + local.settings.css.listItemClass);
            var selectedListIndex = local.activeListIndex;

            $.each(local.uiLists, function (i, $list) {
                if ($list.is($listItem.parent())) {
                    selectedListIndex = i;
                }
            });

            this.setSelectedIndex($listItem.data(local.settings.itemDataAttribute), selectedListIndex);

            if (local.settings.events.onClicked != null) {
                local.settings.events.onClicked.call(this, $listItem);
            }
        }
    }

    //Private Static - creates list items using data property
    // To use complete data item structure such as { name: 'anyname', data: 'anyhash' } change this method.
    // To use elements other than list change this method.
    var draw = function () {
        if (local.data) {
            $.each(local.settings.lists, function (j, listInfo) {
                var $list = local.uiLists[j];
                if (local.data[j]) {
                    $.each(local.data[j], function (i, dataItem) {
                        var $listItem = $(local.settings.itemTemplate)
                            .data(local.settings.itemDataAttribute, i)
                            .addClass(local.settings.css.listItemClass)
                            .addClass(listInfo.listItemClass);

                        if (local.settings.extensions.formatter) {
                            $listItem.append(local.settings.extensions.formatter(dataItem, $listItem));
                        }
                        else {
                            $listItem.text(dataItem);
                        }

                        decorateItem(listInfo.selectedListItemClass, $listItem, -1, -1, i);
                        $list.append($listItem);
                    });
                }
            });
        }
    }

    // decorates item by adding/removing css classes
    var decorateItem = function (cssClass, item, currListIndex, selIndex, currIndex) {
        var selectedCssClass = null;

        if (currListIndex > -1) {
            selectedCssClass = local.settings.lists[currListIndex].selectedItemClass;
        }

        selectedCssClass = selectedCssClass || local.settings.css.selectedListItemClass;

        if (selIndex != currIndex) {
            item.removeClass(selectedCssClass).removeClass(cssClass);
        }
        else if (!item.hasClass(cssClass)) {
            item.addClass(selectedCssClass).addClass(cssClass);
        }
    }

    //changes function scope so that 'this' could point to source object
    var contextBinder = function (func, scope) {
        if (func.bind) {
            return func.bind(scope);
        } else {
            return function () {
                func.apply(scope, arguments);
            };
        }
    };

    // binds all list items to onClicked event in one go.
    // If we change the ui element from List to something else we need to handle the event binding below.
    $.each(local.uiLists, function (index, list) {
        list.on('click', '> *', contextBinder(onClicked, _self));
    });

    if (local.settings.data) {
        this.setData(local.settings.data);
    }

}

; (function ($, window, document, undefined) {
  'use strict';

  const pluginName = "inputWizard";

  const defaults = {
    enabled: true,
    popupSettings: {
      lists: [],
      defaultListIndex: 0,
      defaultIndex: 0,
      inputControlClass: "input-control",
      inputManagerClass: "input-manager"
    },
    selectOnSpacebar: true,
    formatter: null,
    triggers: null,
    events: {
      onDataLoad: function (data) { return true; },
      onSelected: null,
    },
    extensions: {
      getSelectorPositionOverride: null
    }
  };

  // returns true if character is RTL
  function IsRtlCharacter(character) {
    var ltrChars = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' + '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';
    var rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
    var rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');
    return rtlDirCheck.test(character);
  }


  // returns true if the character is printable.
  function isPrintableKey(code) {
    return (
      (code > 47 && code < 58) || // number keys
      (code === 32) || // spacebar & return key(s) (if you want to allow carriage returns)
      //(code === 13) ||
      (code > 64 && code < 91) || // letter keys
      (code > 95 && code < 112) || // numpad keys
      (code > 185 && code < 193) || // ;=,-./` (in order)
      (code > 218 && code < 223));   // [\]' (in order)
  }

  // stores key value pairs
  function CacheManager() {
    var cache = {};

    this.setSearchCache = function (term, results) {
      cache[term] = results;
    }

    this.getSearchCache = function (term) {
      return cache[term];
    }
  }

  // executes first call based on key and 
  // ignores all rest of the calls for that key.
  function RequestSingulator() {
    var keys = [];

    return function (key, funcAsync) {
      var found = find(keys, function (item) {
        return item == key;
      });

      if (found) {
        return Promise.resolve();
      }

      keys.push(key);

      return funcAsync()
        .then(function () {
          var index = keys.indexOf(key);
          if (index > -1) {
            keys.splice(index, 1);
          }
        });
    }
  }

  const keyCodes = {
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    BACKSPACE: 8,
    DELETE: 46,
    ESCAPE: 27,
    ENTER: 13,
    SPACEBAR: 32,
    TAB: 9,
  };

  // used to synchronize function calls.
  // A function is passed as a parameter. A flag is set before the function is called from within
  // if the flag is set the next call is ignored.
  function InputWizard(element, options) {

    // Save element this plugin is attached to.
    const $target = (element instanceof jQuery) ? element : $(element);
    const self = this;

    const local = {
      enabled: true,
      enableCache: true,
      // save location of cursor from where the text is to be compared.
      // the value is set when the option selector appears and is reset when
      // option selector invisibility turns false.
      currentMatchStartLocation: -1,
      // when a search result returned matches the pre-text in target
      // we need to save that state so on selection of one of the item
      // from the result could be properly processed.
      optionSelectorStateInfo: null,
      debounceTimer: null,
      highlight: $("<div class='highlight'></div>"),
      settings: null
    }

    local.settings = $.extend(true, {}, defaults, options);
    local.enabled = local.settings.enabled;

    var $selector = new OptionSelector({
      lists: local.settings.popupSettings.lists,
      defaultListIndex: local.settings.popupSettings.defaultListIndex,
      defaultIndex: local.settings.popupSettings.defaultIndex,
      rootListClass: local.settings.popupSettings.rootListClass,
      rootListItemClass: local.settings.popupSettings.rootListItemClass,
      visible: false,
      events: {
        onClicked: function (e) {
          $target.focus();
          if ($selector.getVisible()) {
            applySelection($selector, $target);
            $selector.setVisible(false);
          }
        },
        onVisibilityChanged: function (visible) {
          if (!visible) {
            // reset start location of text to be replaced by option selector
            $inputManager.unsetHighlight(local.highlight);
            local.currentMatchStartLocation = -1;
            local.optionSelectorStateInfo = null;
          }
        },
      },
      extensions: {
        formatter: local.settings.formatter,
      }
    });

    var _cacheManager = new CacheManager();

    var $inputManager = new InputManager($target, {
      containerClass: local.settings.popupSettings.inputManagerClass
    });

    function getEnabled () {
      return local.enabled;
    }

    function setEnabled (enabled) {
      local.enabled = !!enabled;
      $inputManager.setEnabled(local.enabled);
      $selector.setEnabled(local.enabled);
      $inputManager.unsetHighlight(local.highlight);
      if (!enabled) {
        $selector.setVisible(false);
      }
    }

    ///////////////////////////////////////////
    ///////////////////////////////////////////

    // This event is triggered when input control has its text or cursor position changed.
    // this event would call "getSuggestion" function which gets the data from the server
    // or the cache and fills up in the option selector.
    var onKeydown = function (e) {
      if (!local.enabled) {
        return;
      }

      var keyCode = e.which;
      var ctrlKey = e.ctrlKey;
      var shiftKey = e.shiftKey;

      $inputManager.updateCursorPosition();

      if ($selector.getVisible()) {
        // if the selector is visible then the input keys can be for optionselector navigation.\

        if (keyCode === keyCodes.ESCAPE) {
          // If ESCAPE is clicked then hide the selector if visible and exit.
          e.preventDefault();
          $selector.setVisible(false);
          return;
        }
        else if (keyCode === keyCodes.UP) {
          // if UP is clicked then move one item up in the option selector and exit.
          e.preventDefault();
          $selector.setSelectedIndex($selector.getSelectedIndex().listItemIndex - 1);
          return;
        }
        else if (keyCode === keyCodes.DOWN) {
          // if DOWN is clicked then move one item down in the option selector and exit.
          e.preventDefault();
          $selector.setSelectedIndex($selector.getSelectedIndex().listItemIndex + 1);
          return;
        }
        else if (keyCode == keyCodes.LEFT) {
          // if LEFT is clicked then move to left list in the option selector and exit.
          e.preventDefault();
          var nextListIndex = $selector.getSelectedIndex().listIndex - 1;
          if (nextListIndex > -1) {
            var itemIndex = $selector.getSelectedIndex().listItemIndex;
            var listItemCount = $selector.getListItemCount(nextListIndex);
            if (itemIndex >= listItemCount) {
              itemIndex = listItemCount - 1;
            }
            $selector.setSelectedIndex(itemIndex, nextListIndex);
          }
          return;
        }
        else if (keyCode == keyCodes.RIGHT) {
          // if RIGHT is clicked then move to right list in the option selector and exit.
          e.preventDefault();
          var nextListIndex = $selector.getSelectedIndex().listIndex + 1;
          if (nextListIndex < $selector.getListCount()) {
            var itemIndex = $selector.getSelectedIndex().listItemIndex;
            var listItemCount = $selector.getListItemCount(nextListIndex);
            if (itemIndex >= listItemCount) {
              itemIndex = listItemCount - 1;
            }
            $selector.setSelectedIndex(itemIndex, nextListIndex);
          }
          return;
        }
        else if (keyCode === keyCodes.ENTER || (keyCode === keyCodes.SPACEBAR && local.settings.selectOnSpacebar)) {

          // if ENTER or <SHIFT> + SPACEBAR is clicked then use the selected item in option selector,
          // and hide the selector and exit.
          if (keyCode === keyCodes.ENTER && $selector.getVisible()) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }

          // if CTRL is pressed then we are activating some system action.
          if (!ctrlKey) {
            // process selected text
            applySelection($selector, $target);
            return;
          }
        }
        else if (keyCode === keyCodes.TAB) {
          // if TAB is clicked then next item is selected in option selector,
          // if <SHIFT> + TAB is clicked then previous item is selected in the option selector.
          // in either case after the item selection the code exists.
          e.preventDefault();
          var listindex = $selector.getSelectedIndex().listIndex;
          var itemIndex = $selector.getSelectedIndex().listItemIndex;
          var listItemCount = $selector.getListItemCount(listindex);

          if (shiftKey) {
            if (itemIndex == 0 && listItemCount > 0) {
              $selector.setSelectedIndex(listItemCount - 1);
            }
            else {
              $selector.setSelectedIndex(itemIndex - 1);
            }
          }
          else {
            if (itemIndex >= listItemCount - 1 && listItemCount > 0) {
              $selector.setSelectedIndex(0);
            }
            else {
              $selector.setSelectedIndex(itemIndex + 1);
            }
          }
          return;
        }
      }
      else {
        // Any operation that needs to be done when option selector is not visible is done here.
        // when option selector is not visible, on BACKSPACE or DELETE we just delete the character and exit.
        if ([keyCodes.BACKSPACE, keyCodes.DELETE].indexOf(keyCode) > -1) {
          return;
        }
      }

      // Uptil here keydown event system defaults as not processed as
      // use might need to cancel it. we do not want to cancel the
      // event anymore and let the control be updated to setting
      // timeout would let system default process.
      setTimeout(onKeydownInternal, 0, ctrlKey, shiftKey, keyCode);
    }

    var onKeydownInternal = function (ctrlKey, shiftKey, keyCode) {
      var isPrintableKeyCode = isPrintableKey(keyCode);

      // if key is not printable and they are not BACKSPACE OR DELETE then exit.
      // this is done because DELETE and BACKSPACE are two none-printable keys which 
      // effect the entered text but not others.
      if (!isPrintableKeyCode && [keyCodes.BACKSPACE, keyCodes.DELETE].indexOf(keyCode) < 0) {
        return;
      }

      //////////////////////////////////////////////////////
      // When we reach here:
      // 1 - Selector may or may not be visible
      // 2 - The key entered is printable
      // 3 - The key entered is backspace, delete when the selector is open
      //////////////////////////////////////////////////////

      var selectorOpenRequested = (ctrlKey && keyCode == keyCodes.SPACEBAR && !$selector.getVisible());
      getSuggestions(ctrlKey, keyCode, selectorOpenRequested);
    }

    // "getSuggestion" function gets the data from the server or the cache
    // and fills up in the option selector, and opens option selector
    // if there were some result returned. this function makes sure that
    // the results are filled up only when the term search for is still
    // valid. if its changed the returned result is cached but not
    // dispalyed.
    var getSuggestions = function (ctrlKey, keyCode, selectorOpenRequested) {

      var currentState = $inputManager.getInputState();
      var preText = currentState.preText;

      // WE NEED TO DECIDE TO SHOW THE OPTION SELECTOR WHEN THERE ARE NO RESULTS.
      if (!preText || !preText.trim().length) {
        $selector.setVisible(false);
        return;
      }

      // If there are multiple triggers then match triggers in order.
      // whichever matches first would be used and rest are ignored.
      for (var x = 0; x < local.settings.triggers.length; x++) {
        var trigger = local.settings.triggers[x];
        var matches = null;

        // if option selector activation is requested using CTRL + SPACEBAR then get match start location.
        if (selectorOpenRequested) {
          matches = preText.match(trigger.match);

          if (matches) {
            local.currentMatchStartLocation = preText.length - matches[matches.length - 1].length;
          }
        }
        else if (preText.length <= preText.replace(/\s+$/, '').length) {
          // Whether the option selector is activated using CTRL + SPACEBAR or not,
          // if there is a printable key is typed and match start location is not recorded,
          // then record it and continue.
          if (local.currentMatchStartLocation < 0) {
            local.currentMatchStartLocation = preText.length - 1;
          }

          if (local.currentMatchStartLocation > -1) {
            // if match start location is valid then  match again based on the 
            // recorded location to see if match qualifies for replacement.
            matches = preText.substring(local.currentMatchStartLocation).match(trigger.match);
          }
        }

        // if there are matches then it means that the term entered qualifies for replacement
        if (matches) {
          var term = matches[matches.length - 1];
          var cache = _cacheManager.getSearchCache(term);

          $inputManager.setHighlight(local.highlight, currentState.preText, currentState.postText, term);

          // if we cached the result then get cached result or else from api call.
          if (cache != null) {
            var cachedTrigger = cache[0];
            var cachedResult = cache[1];
            searchCallback(currentState, cachedTrigger, term)(cachedResult);
          }
          else {
            trigger.search(term, searchCallback(currentState, trigger, term));
          }

          // we found the match so no need for next loop.
          break;
        }
      }

      if (!matches) {
        $selector.setVisible(false);
        return;
      }

      $inputManager.unsetHighlight(local.highlight);

      // WE NEED TO DECIDE TO SHOW THE OPTION SELECTOR WHEN THERE ARE NO RESULTS.
      // if (hideOptionSelector) {
      //   $selector.setVisible(false);
      // }
    }

    // This function must be called when the result is returned from the server.
    // this is done by calling callback parameter of tigger "search" function.
    // the way this function works is:
    //    first call preserves
    //    state of pre and post text
    //    trigger that was matched
    //    start location of the match
    //    term that was to be replaced
    var searchCallback = function (searchState, trigger, term) {

      // this function is called when the results are returned.
      return function (results) {
        // decide whether the option selector should finally be displayed or not.
        var showOptionSelector = false;

        // if results were returned then we cache the results.
        if (results) {
          if (local.settings.events.onDataLoad) {
            showOptionSelector = local.settings.events.onDataLoad.call(self, results);
            if (!_cacheManager.getSearchCache(term) && local.enableCache) {
              _cacheManager.setSearchCache(term, [trigger, results]);
            }
          }
        }

        // show option selector if ondataload returns true. this function is used
        // to validate the result set.
        if (showOptionSelector) {

          // option selector can be displayed with the conditions validated later.
          var inputState = $inputManager.getInputState();

          // show option selector only when the pretext matches one of the searches called.
          // the results returned may not be in order XXXXXX
          if (inputState.preText == searchState.preText) {
            $selector.setData(results);

            local.optionSelectorStateInfo = {
              preText: searchState.preText,
              postText: searchState.postText,
              trigger: trigger,
              term: term
            };

            if (!$selector.getVisible()) {
              var position = searchState.cursorOffset;

              if (local.settings.extensions.getSelectorPositionOverride) {
                var absolutePos = local.settings.extensions.getSelectorPositionOverride(position);
                $selector.getUIRoot().css(absolutePos);
                // {
                //   top: position.top + position.height + local.settings.popupOffset.top,
                //   left: position.left + local.settings.popupOffset.left
                // }
              }

              //more screen bounding checks can be added here.
              $selector.setVisible(true);
            }
          }
          // else {
          //   // option selector can not be displayed so hide if visible.
          //   if ($selector.getVisible()) {
          //     $selector.setVisible(false);
          //   }
          // }
        }
      };
    }

    // When user types something, an event is triggered to get data from the server
    // or the cache. if the data is available from cache then it is displayed in the
    // option selector. if it comes from the server, then the callback function
    // fills it up in the option selector. in both cases user has to select click
    // an item in on the application selector which calls this "applySelection" function.
    // applySelection, copies data from the item selected and changes the target control
    // text.
    var applySelection = function (optionSelector, element) {

      $inputManager.unsetHighlight(local.highlight);

      if (optionSelector.getVisible()) {
        var trigger = local.optionSelectorStateInfo.trigger;
        var oldText = local.optionSelectorStateInfo.term;
        var newText = optionSelector.getSelectedDataItem();

        var replacement = trigger.replace(newText, oldText, optionSelector.getSelectedIndex().listIndex);

        var newpreText = null;
        var newpostText = null;

        if (local.currentMatchStartLocation < 0) {
          if ($.isArray(replacement)) {
            newpreText = local.optionSelectorStateInfo.preText.replace(trigger.match, replacement[0]);
            newpostText = replacement[1] + local.optionSelectorStateInfo.postText;
          }
          else {
            newpreText = local.optionSelectorStateInfo.preText.replace(trigger.match, replacement);
            newpostText = local.optionSelectorStateInfo.postText;
          }
        }
        else {
          if ($.isArray(replacement)) {
            newpreText = local.optionSelectorStateInfo.preText.substring(0, local.currentMatchStartLocation) +
              local.optionSelectorStateInfo.preText.substring(local.currentMatchStartLocation).replace(trigger.match, replacement[0]);
            newpostText = replacement[1] + local.optionSelectorStateInfo.postText;
          }
          else {
            newpreText = local.optionSelectorStateInfo.preText.substring(0, local.currentMatchStartLocation) +
              local.optionSelectorStateInfo.preText.substring(local.currentMatchStartLocation).replace(trigger.match, replacement);
            newpostText = local.optionSelectorStateInfo.postText;
          }
        }

        element.val(newpreText + newpostText);
        $inputManager.setCursorPosition(newpreText.length);

        if (local.settings.events.onSelected) {
          local.settings.events.onSelected.call(self, oldText, newText);
        }
      }

      // rendering ignored.

      $selector.setVisible(false);
    }

    // wrap target element with a wrapper.
    var $container = $("<div></div>");
    $container.addClass(local.settings.popupSettings.inputControlClass);
    $target.before($container).detach();
    $container.append(local.highlight);
    $container.append($selector.getUIRoot());
    $container.append($target);

    // register event to hide popup when clicked anywhere else on the page.
    $(document.body).bind('click', function (e) {
      if ($(e.target).closest($selector).length == 0) {
        $selector.setVisible(false);
      }
    });

    // changes function scope so that 'this' could point to source object
    var contextBinder = function (func, scope) {
      if (func.bind) {
        return func.bind(scope);
      } else {
        return function () {
          func.apply(scope, arguments[2]);
        };
      }
    };

    var onScroll = function (e) {
      // implement code to move option selector or not.
    };

    // keydown does not work in mobile
    // input does not have key press information
    // scroll
    $target.on('keydown', contextBinder(onKeydown, self));
    $target.on('scroll', contextBinder(onScroll, self));

    return {
      setEnabled: setEnabled,
      getEnabled: getEnabled
    };
  }

  InputWizard.prototype = {
    getEnabled: function () {
      return getEnabled();
    },
    setEnabled: function (enabled) {
      setEnabled(enabled);
    }
  }

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, pluginName)) {
        var plugin = new InputWizard(this, options);
        $.data(this, pluginName, plugin);
      }
    });
  }

})(jQuery, window, document);