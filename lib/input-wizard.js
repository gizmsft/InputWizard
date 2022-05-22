; (function ($, window, document, undefined) {
  'use strict';

  const pluginName = "inputWizard";

  const defaults = {
    enabled: true,
    popupSettings: [],
    inputManagerClass: "input-manager",
    inputControlClass: "input-control",
    fullWordMatchOnly: true,
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
      containerClass: local.settings.inputManagerClass
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
    $container.addClass(local.settings.inputControlClass);
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