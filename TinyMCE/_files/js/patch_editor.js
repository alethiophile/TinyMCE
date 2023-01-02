/* global jQuery, XF, tinymce */

!function($, window, document, _undefined)
{
    let editor_config = null;
    function load_config() {
        console.log("checking config");
        let $config = $('.js-editorSelect');
        if (!$config.length) {
            return false;
        }
        let data = $config.first().html();
        editor_config = $.parseJSON(data);
        return true;
    }

    function get_active_editor() {
        if (editor_config === null) {
            return null;
        }
        let active_editor = editor_config.selected_editor != "" ?
            editor_config.selected_editor :
            editor_config.default_editor != "" ?
            editor_config.default_editor : 'froala';
        return active_editor;
    }

    let deferred_inits = [];

    // This patching function patches the frontend objects such that the
    // original methods are renamed with the _froala postfix, then replaced with
    // dispatch methods. The dispatch methods query the editor config to
    // determine the active editor, then invoke the appropriate postfixed method
    // (_froala, _tinymce or _textarea).

    // Because the editor config is passed as a JSON object and parsed in code,
    // it's possible that the config may not be available before the editor
    // elements are initialized. In this case, the dispatch methods generally
    // act as no-ops. The exception is for the startInit dispatch method that
    // handles editor setup: in this case, if config is not available at call
    // time, the object is added to a list for deferred initialization. After
    // config becomes available, deferred initializations are carried out.

    function do_patch() {
        let backup = { 'startInit': 'startInit_froala' };
        let ext_obj = {
            // the startInit dispatch function differs from the others in that
            // it does deferred init handling; thus, it's written individually,
            // but all others are closures created by the add_dispatch function
            startInit: function () {
                let ed = get_active_editor();
                if (ed == null) {
                    let t = this;
                    deferred_inits.push(t);
                    return;
                }
                let disp = 'startInit_' + ed;
                return this[disp]();
            },

            startInit_textarea: function () {
                console.log("textarea startInit");
                let bbcode_data = this.$target.nextAll('input[type="hidden"]').val();
                let t = this;
                // This emulates the Froala editor's API for one function where
                // core code reaches into it.
                this.ed = {
                    bbCode: {
                        getTextArea: function () {
                            return t.$target;
                        }
                    },
                }
                this.$target.val(bbcode_data);
                this.$target.css('visibility', 'visible');
            },

            startInit_tinymce: function () {
                let style_mode = editor_config.editor_skin;
                let mce_skin = style_mode == 'dark' ? 'oxide-dark' : 'oxide';
                let content_css = style_mode == 'dark' ? 'dark' : 'default';
                tinymce.init({
                    target: this.$target[0],
                    base_url: '/js/vendor/tinymce',
                    promotion: false,
                    branding: false,
                    skin: mce_skin,
                    content_css: content_css,
                    plugins: 'fullscreen wordcount'
                }).then((editors) => {
                    this.ed = editors[0];
                    this.setupEditor_tinymce();
                });
            },

            setupEditor_tinymce: function () {
                let t = this,
                    ed = this.editor;

                ed.on('ResizeEditor', function () {
                    XF.layoutChange();
                });
            },

            blur_textarea: function () {
                this.$target[0].blur();
            },

            blur_tinymce: function () {
                // I'm not sure if this call is actually doing anything, but the
                // element does lose focus
                this.ed.getElement().blur();
            },

            isBbCodeView_textarea: function () {
                return true;
            },

            isBbCodeView_tinymce: function () {
                return false;
            },

            insertContent_tinymce: function (content) {
                this.ed.insertContent(content);
            },

            replaceContent_tinymce: function (content) {
                this.ed.setContent(content);
            }
        };
        function add_dispatch(fn) {
            backup[fn] = fn + '_froala';
            ext_obj[fn] = function () {
                let ed = get_active_editor();
                if (ed == null) {
                    return;
                }
                let disp = fn + '_' + ed;
                return this[disp].apply(this, arguments);
            };
        }
        let methods_to_patch =
            ['blur', 'isBbCodeView', 'insertContent', 'replaceContent'];
        for (let i of methods_to_patch) {
            add_dispatch(i)
        }
        ext_obj.__backup = backup;
        XF.Element.extend('editor', ext_obj);
    }

    console.log("patch_editor");
    do_patch();

    let wait_until_exist = null;
    let check_config_load = function () {
        load_config();
        if (editor_config === null) {
            return false;
        }
        if (wait_until_exist !== null) {
            clearInterval(wait_until_exist);
        }
        for (let i of deferred_inits) {
            i.startInit();
        }
        deferred_inits = [];
        return true;
    };

    if (!check_config_load()) {
        wait_until_exist = setInterval(check_config_load, 100);
    }
}
(jQuery, window, document);
