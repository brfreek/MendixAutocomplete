define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/on",
    "dojo/dom-attr",
    "dojo/text!KeyRefresh/widget/template/KeyRefresh.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, domClass, dojoArray, lang, dojoText, dojoHtml, dojoEvent, on, domAttr, widgetTemplate) {
    "use strict";

    return declare("KeyRefresh.widget.KeyRefresh", [ _WidgetBase, _TemplatedMixin ], {

        templateString: widgetTemplate,


        widgetBase: null,

        // Internal variables.
        _handles: null,
        _contextObj: null,
        _inputNode: null,
        _inputLabel: null,
        _inputParent: null,
        _listviewSearch: null,
        searchAttribute: "",
        searchMicroflow: "",
        focusOutMicroflow: "",
        focusInMicroflow: "",
        placeholder: "",
        listViewName: "",
        _callAgain: false,
        _prevCount: 0,
        _currentFocus: 0,
        keyPressTimeout: null,

        _onUpHandler: null,
        _onDownHandler: null,
        _focusInHandler: null,
        _focusOutHandler: null,

        constructor: function () {
            this._handles = [];
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._listviewSearch = document.getElementsByClassName("mx-name-" + this.listViewName)[0];

            this._inputParent = this.widgetBase.children[0];
            if(this._inputParent){
                this._inputNode = this._inputParent.children[0];
                this._inputLabel  = this._inputParent.children[1];

            } else {
                console.error("Input and label not found");
            }

            domAttr.set(this._inputNode, "placeholder", this.placeholder);
            this._inputLabel.innerHTML = this.placeholder;

            var context = this._contextObj;
            var attribute = this.searchAttribute;
            var self = this;

            var listview = this._listviewSearch;
            if(this._onUpHandler === null){
                on(this._inputNode, "keyup", function(event) {
                    var charCount = event.currentTarget.value.length;

                    if(((charCount >= 3 && charCount) || charCount < 3 && charCount < self._prevCount) && self.validKeyPress(event.keyCode)){
                        charCount >= 3 ? context.set(attribute, event.currentTarget.value) : self.emptySearch(context);
                        if(!domClass.contains(self._inputParent, "form-label-group--searching")){
                            domClass.add(self._inputParent, "form-label-group--searching");
                        }
                        clearTimeout(self.keyPressTimeout);
                        self.keyPressTimeout = setTimeout(() => {
                            self.callSearch(charCount);
                        }, 250);

                    } else {

                    }
                });

            }
            if(this._onDownHandler === null){
                on(this._inputNode, "keydown", function(event) {
                    var list = listview.getElementsByClassName("mx-listview-item");
                    if(event.keyCode == 40){
                        self._currentFocus++
                        self.addActive(list);
                    } else if (event.keyCode == 38){
                        self._currentFocus--;
                        self.addActive(list);
                    } else if(event.keyCode == 13 || event.keyCode == 9){
                        event.preventDefault();
                        if(self._currentFocus > -1){
                            if(list){
                                list[self._currentFocus].click();
                            }
                        }
                    }
                });


            }

            if(this._focusOutHandler === null){
                on(this._inputNode, "focusout", function(event){
                    clearTimeout(self.keyPressTimeout);
                    self.keyPressTimeout = setTimeout(() => {
                        //If there is a focus out microflow configured, the developer decides what happens with the search list.
                        if(self.focusOutMicroflow !== ""){
                            mx.data.action({
                                params: {
                                    actionname: self.focusOutMicroflow,
                                    applyto: "selection",
                                    guids: [self._contextObj.getGuid()]
                                }, callback: function(){
                                    console.log("focus out of input")
                                }, error: function(){

                                }
                            });
                        } else {
                            self.emptySearch(context);
                            self.callSearch(0);
                        }

                    }, 250);

                });
            }
            if(this._focusInHandler === null){
                on(this._inputNode, "focusin", function(event){
                    var charCount = event.currentTarget.value.length;

                    //If there is a focus in microflow configured, the developer decides what happens with the search list.
                    if(self.focusInMicroflow !== ""){
                        var charCount = event.currentTarget.value.length;
                        mx.data.action({
                            params: {
                                actionname: self.focusInMicroflow,
                                applyto: "selection",
                                guids: [self._contextObj.getGuid()]
                            }, callback: function(){

                            }, error: function(){

                            }
                        })

                    } else {

                        charCount >= 3 ? context.set(attribute, event.currentTarget.value) : self.emptySearch(context);
                        self.callSearch(charCount);
                    }

                });
            }

            this._updateRendering(callback);
        },

        addActive: function(x){
            if(!x || x.length === 0) return false;

            this.removeActive(x);
            if(this._currentFocus >= x.length) this._currentFocus = 0;
            if(this._currentFocus < 0) this._currentFocus = (x.length -1);

            x[this._currentFocus].classList.add("autocomplete-active");
        },
        removeActive: function(x){
            for(var i = 0; i < x.length; i++){
                x[i].classList.remove("autocomplete-active");
            }
        },

        validKeyPress: function(key){
            switch(key) {
                case 38:
                case 37:
                case 39:
                case 40:
                case 27:
                case 17:
                case 18:
                case 18:
                case 20:{
                    return false;
                    break;
                }
                default: {
                    return true;
                    break;
                }
            }
        },

        emptySearch: function(context){
            context.set(this.searchAttribute, "")
        },

        callSearch: function(charCount) {
            var listview = this._listviewSearch;

            var self = this;
            mx.data.action({
                params: {
                    actionname: self.searchMicroflow,
                    applyto: "selection",
                    guids: [self._contextObj.getGuid()]
                }, callback: function(cb){
                    self._prevCount = charCount;
                    domClass.remove(self._inputParent, "form-label-group--searching");

                    var list = listview.getElementsByClassName("mx-listview-item");
                    var val = self._inputNode.value;
                    var re = new RegExp(val, "ig");

                    for (var i = list.length - 1; i >= 0; i--) {
                        var listItem = list[i].getElementsByClassName('mx-text')[0];
                        listItem.innerHTML = listItem.innerHTML
                        .replace('<strong>', '')
                        .replace('</strong>', '')
                        .replace(re, "<strong>" + val + "</strong>");
                    }

                    self.addActive(list);
                }, error: function(error){
                    console.log("Error: " +error);
                }
            });
        },

        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function () {

            if(this._onDownHandler){
                this._onDownHandler.remove();
                this._onDownHandler = null;

            }

            if(this._onUpHandler){
                this._onUpHandler.remove();
                this._onUpHandler = null;
            }

            if(this._focusInHandler){
                this._focusInHandler.remove();
                this._focusInHandler = null;
            }

            if(this._focusOutHandler){
                this._focusOutHandler.remove();
                this._focusOutHandler = null;
            }

            logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            this._executeCallback(callback, "_updateRendering");
        },

        // Shorthand for running a microflow
        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: lang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        // Shorthand for executing a callback, adds logging to your inspector
        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["KeyRefresh/widget/KeyRefresh"]);
