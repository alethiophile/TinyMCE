/* global jQuery, XF */

!function($, window, document, _undefined)
{
    function patch_for_textarea() {
        XF.Element.extend('editor', {
            startInit: function () {
                let bbcode_data = this.$target.nextAll('input[type="hidden"]').val();
                console.log(bbcode_data);
                this.$target.val(bbcode_data);
                this.$target.css('visibility', 'visible');
            },

            blur: function () {
                this.$target[0].blur();
            }
        });

        $.extend(XF, {
            modifyEditorContent: function($container, htmlCallback, textCallback, notConstraints)
            {
                var editor = XF.getEditorInContainer($container, notConstraints);
                if (!editor)
                {
                    return false;
                }

                if (XF.Editor && editor instanceof XF.Editor)
                {
                    var textarea = editor.$target;
                    textCallback(textarea);
                    textarea.trigger('autosize');
                    return true;
                }

                if (editor instanceof $ && editor.is('textarea'))
                {
                    textCallback(editor);
                    editor.trigger('autosize');
                    return true;
                }
                return false;
            },
        });
    }

    function patch_for_tinymce() {
        
    }

    let editor_config = null;
    function load_config() {
        console.log("checking config");
        let $config = $('.js-editorSelect');
        if (!$config.length) {
            return false;
        }
        let data = $config.first().html();
        console.log(data);
        editor_config = $.parseJSON(data);
        return true;
    }

    let deferred_inits = [];
    let patch_done = false;

    // The motivation for all this silliness is that 1. we have to pass the
    // editor config as a JSON object that gets parsed in-script, rather than a
    // JS inline script, because under some circumstances a JS inline script
    // won't be loaded. But 2. sometimes, this script will run before the
    // element containing the JSON config has loaded. Thus, we have to wait
    // until the config is loaded before we know how to patch the editor. But
    // 3. if we wait, sometimes the editor init() will run before we can patch
    // it, causing things to break. (This is an unpredictable race condition.)
    // Thus, we patch the editor twice: once immediately at script load,
    // replacing the init() function with one that defers execution until after
    // the full patch is completed; then again after the config is available,
    // doing the full functional editor patch and running any deferred init()
    // calls.
    
    function patch_defer_init() {
        // This patches the editor element so that its init() function will
        // never run before the config is loaded. It is run immediately on
        // script load, hopefully before any element is init()'d. Calls to
        // init() that happen before the config is loaded will be deferred until
        // afterward.
        XF.Element.extend('editor', {
            __backup: {
                'init': '_init'
            },

            init: function () {
                console.log("checking deferred init");
                let t = this;
                if (patch_done) {
                    t._init();
                }
                else {
                    deferred_inits.push(function () {
                        t._init();
                    });
                }
            }
        });
    }

    console.log("patch_editor");
    patch_defer_init();

    let wait_until_exist = null;
    let check_and_patch = function () {
        load_config();
        if (editor_config === null) {
            return false;
        }
        if (wait_until_exist !== null) {
            clearInterval(wait_until_exist);
        }
        let active_editor = editor_config.selected_editor != "" ?
            editor_config.selected_editor : editor_config.default_editor;
        console.log(active_editor);
        if (active_editor == 'textarea') {
            console.log("patching for textarea");
            patch_for_textarea();
        }
        else if (active_editor == 'tinymce') {
            patch_for_tinymce();
        }
        patch_done = true;
        for (let f of deferred_inits) {
            f();
        }
        deferred_inits = [];
        return true;
    };

    if (!check_and_patch()) {
        wait_until_exist = setInterval(check_and_patch, 100);
    }
}
(jQuery, window, document);
