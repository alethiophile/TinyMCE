/* global jQuery, XF */

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
        // console.log(data);
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
        XF.Element.extend('editor', {
            __backup: {
                'startInit': 'startInit_froala',
                'blur': 'blur_froala',
            },

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
                // console.log(bbcode_data);
                this.$target.val(bbcode_data);
                this.$target.css('visibility', 'visible');
            },

            blur: function () {
                let ed = get_active_editor();
                if (ed == null) {
                    return;
                }
                let disp = 'blur_' + ed;
                return this[disp]();
            },

            blur_textarea: function () {
                this.$target[0].blur();
            }
        });
        XF.modifyEditorContent_froala = XF.modifyEditorContent;
        $.extend(XF, {
            modifyEditorContent: function () {
                let ed = get_active_editor();
                if (ed == null) {
                    return;
                }
                let disp = 'modifyEditorContent_' + ed;
                return this[disp].apply(this, arguments);
            },
            modifyEditorContent_textarea: function($container, htmlCallback, textCallback, notConstraints)
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
