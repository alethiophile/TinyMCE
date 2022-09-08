/* global jQuery, XF, tinymce_selected_editor, tinymce_default_editor */

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

    console.log("patch_editor");
    let active_editor = tinymce_selected_editor != "" ?
        tinymce_selected_editor : tinymce_default_editor;
    if (active_editor == 'textarea') {
        patch_for_textarea();
    }
    else if (active_editor == 'tinymce') {
        patch_for_tinymce();
    }
}
(jQuery, window, document);
