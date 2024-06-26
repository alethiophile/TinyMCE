/* global jQuery, XF, tinymce */

!function($, window, document, _undefined)
{
    function get_bbcode_menu_items(ed) {
        let items = {
            
        };
        return items;
    }
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
                return this[disp].apply(this, arguments);
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
                let xf_ed = this;
                xf_ed.bbCodeView = false;
                // let mce_skin = style_mode == 'dark' ? 'tinymce-5-dark' : 'tinymce-5';
                // let content_css = style_mode == 'dark' ? 'tinymce-5-dark' : 'tinymce-5';
                let paste_process_state = false;

                function setup_editor(ed) {
                    ed.on('ResizeEditor', function () {
                        XF.layoutChange();
                    });

                    ed.bbCode = {
                        getTextArea: function () {
                            return xf_ed.$target;
                        }
                    };

                    function save_if_necessary() {
                        if (!xf_ed.bbCodeView) {
                            ed.save();
                        }
                    }

                    function handle_draft() {
                        let $form = xf_ed.$target.closest('form');
                        let draftHandler = XF.Element.getHandler($form, 'draft');
                        save_if_necessary();
                        draftHandler.triggerSave();
                    }

                    function ed_keydown (e) {
                        if (e.key == 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            save_if_necessary();
                            xf_ed.$target.closest('form').submit();
                            return false;
                        }
                        if (draft_timeout !== null) {
                            clearTimeout(draft_timeout);
                        }
                        draft_timeout = setTimeout(handle_draft, 2500);
                    }

                    let draft_timeout = null;
                    ed.on('keydown', ed_keydown);

                    ed.ui.registry.addIcon(
                        'bbCodeView',
                        '<svg width="24" height="24"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-weight="950">[&nbsp;&nbsp;]</text></svg>'
                    );
                    ed.ui.registry.addButton('bbCodeViewButton', {
                        icon: 'bbCodeView',
                        tooltip: "Edit BB-code directly",
                        onAction: function () {
                            function to_bbcode(bbcode) {
                                ed.hide();
                                xf_ed.$target.css("visibility", "visible").val(bbcode);
                                let $richtext_button = $(`<button class="button button--primary tinymce_richtext_button"><span class="button-text">Rich text editor</span></button>`);
                                $richtext_button.css('margin-top', '6px');
                                xf_ed.$target.after($richtext_button);
                                xf_ed.$target.closest('form').on('submit', reset_state);
                                xf_ed.$target.attr('name', 'message');
                                $richtext_button.click(function (e) {
                                    // for some reason if I don't do this then it submits the form and posts the reply (???)
                                    e.preventDefault();
                                    let bbcode = xf_ed.$target.val();
                                    XF.ajax(
                                        'POST',
                                        XF.canonicalizeUrl('index.php?editor/to-html'),
                                        { bb_code: bbcode },
                                        (data) => { to_richtext(data.editorHtml); }
                                    );
                                });
                                xf_ed.$target.on('keydown', ed_keydown);
                                XF.layoutChange();
                                xf_ed.bbCodeView = true;
                            }

                            function reset_state() {
                                to_richtext(null);
                            }

                            function to_richtext(html) {
                                ed.show();
                                if (html !== null) {
                                    ed.setContent(html);
                                }
                                xf_ed.$target.closest('form').find('button.tinymce_richtext_button').remove();
                                xf_ed.$target.closest('form').off('submit', reset_state);
                                xf_ed.$target.off('keydown', ed_keydown);
                                xf_ed.$target.attr('name', 'message_html');
                                XF.layoutChange();
                                xf_ed.bbCodeView = false;
                            }

                            let html = ed.getContent();
                            XF.ajax(
                                'POST',
                                XF.canonicalizeUrl('index.php?editor/to-bb-code'),
                                { html: html },
                                (data) => { to_bbcode(data.bbCode); }
                            );
                        },
                    });

                    let preview_config = {
                        text: 'Preview',
                        icon: 'preview',
                        tooltip: 'Show a preview of your post',
                        onAction: function () {
                            function show_preview(html) {
                                ed.hide();
                                xf_ed.$target.css('display', 'none');
                                let $preview_div = $(`<div class="tinymce_preview_area"><h3>Preview:</h3><div class="inner_content"></div><hr></div>`);
                                xf_ed.$target.after($preview_div);
                                $preview_div.find('.inner_content').css({
                                    'margin': '5px',
                                }).html(html);
                                let $edit_button = $(`<button class="button button--primary tinymce_edit_button"><span class="button-text">Return to editor</span></button>`);
                                $edit_button.css('margin-top', '6px');
                                $preview_div.after($edit_button);
                                xf_ed.$target.closest('form').on('submit', hide_preview);
                                $edit_button.click(function (e) {
                                    e.preventDefault();
                                    hide_preview();
                                });
                                XF.layoutChange();
                            }

                            function hide_preview() {
                                xf_ed.$target.parent().find('div.tinymce_preview_area').remove();
                                xf_ed.$target.parent().find('button.tinymce_edit_button').remove();
                                xf_ed.$target.closest('form').off('submit', hide_preview);
                                xf_ed.$target.css('display', '');
                                ed.show();
                                XF.layoutChange();
                            }

                            save_if_necessary();
                            let $form = xf_ed.$target.closest('form');
                            let form_data = XF.getDefaultFormData($form);
                            let preview_url = xf_ed.$target.data('preview-url') ? xf_ed.$target.data('preview-url') : $form.data('preview-url');

                            XF.ajax(
                                'POST',
                                XF.canonicalizeUrl(preview_url),
                                form_data,
                                function (data) {
                                    XF.setupHtmlInsert(data.html, function ($html) {
                                        XF.activate($html);
                                        show_preview($html.find('.bbWrapper'));
                                    });
                                });
                        }
                    };

                    ed.ui.registry.addButton('previewButton', preview_config);
                    ed.ui.registry.addMenuItem('previewButton', preview_config);

                    let paste_plain_state = false;

                    ed.on('PastePlainTextToggle', (ev) => {
                        paste_plain_state = ev.state;
                    });

                    ed.ui.registry.addToggleMenuItem('pasteallformats', {
                        text: 'Paste all formatting',
                        active: paste_process_state,
                        onAction: () => {
                            paste_process_state = !paste_process_state;
                        },
                        onSetup: (api) => {
                            api.setActive(!paste_plain_state && paste_process_state);
                            api.setEnabled(!paste_plain_state);
                        },
                    });

                    ed.ui.registry.addNestedMenuItem('tableformat', {
                        text: 'Table',
                        icon: 'table',
                        getSubmenuItems: () => [
                            {
                                type: 'nestedmenuitem',
                                text: 'Row',
                                getSubmenuItems: () => 'tableinsertrowbefore tableinsertrowafter tabledeleterow | tablecutrow tablecopyrow tablepasterowbefore tablepasterowafter',
                            },
                            {
                                type: 'nestedmenuitem',
                                text: 'Column',
                                getSubmenuItems: () => 'tableinsertcolumnbefore tableinsertcolumnafter tabledeletecolumn | tablecutcolumn tablecopycolumn tablepastecolumnbefore tablepastecolumnafter',
                            },
                            {
                                type: 'separator',
                            },
                            'deletetable'
                        ],
                    });

                    let bbcode_items = get_bbcode_menu_items(ed);
                }

                let menus = {
                    edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext pasteallformats | selectall | searchreplace' },
                    view: { title: 'View', items: 'visualaid | previewButton fullscreen' },
                    insert: { title: 'Insert', items: 'link inserttable | hr ' },
                    format: { title: 'Format', items: 'bold italic underline strikethrough codeformat | tableformat | styles blocks fontfamily fontsize align | forecolor | removeformat' },
                    tools: { title: 'Tools', items: 'spellchecker spellcheckerlanguage | code wordcount' },
                };

                // this function processes text that's pasted in as rich-text,
                // to remove styles that we probably don't want (namely color
                // and font-family)

                // the characteristic problem this solves is when someone pastes
                // from google docs or wherever, and gets a huge block of text
                // that's explicitly set to color: black and font-family: times
                // or whatever; this tends not to display well

                // this can be disabled (thus pasting all formatting) by
                // enabling the "Paste all formatting" toggle in the edit menu
                let paste_postprocess = (editor, args) => {
                    if (paste_process_state) {
                        console.log('skipping postprocess');
                        return;
                    }
                    console.log(args);
                    let $node = $(args.node);
                    $node.
                        css('color', '').css('font-family', '').
                        find('*').
                        css('color', '').css('font-family', '');
                    args.node = $node[0];
                };

                tinymce.init({
                    target: this.$target[0],
                    base_url: '/js/vendor/tinymce',
                    promotion: false,
                    branding: false,
                    skin: mce_skin,
                    content_css: content_css,
                    plugins: 'fullscreen wordcount searchreplace link table',
                    toolbar: 'undo redo | styles fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | removeformat | hr link unlink table | alignleft aligncenter alignright alignjustify | bbCodeViewButton fullscreen previewButton',
                    toolbar_mode: 'wrap',
                    mobile: {
                        toolbar_mode: 'wrap',
                    },
                    menubar: 'edit view insert format tools',
                    menu: menus,
                    contextmenu: 'link image',
                    link_title: false,
                    link_target_list: false,
                    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6;',
                    font_size_formats: '9px 10px 12px 15px 18px 22px 26px',
                    font_family_formats: 'Arial=arial,helvetica,sans-serif; Book Antiqua=book antiqua,palatino; Courier New=courier new,courier; Georgia=georgia,palatino; Tahoma=tahoma,arial,helvetica,sans-serif; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva',
                    style_formats_autohide: true,
                    table_appearance_options: false,
                    table_advtab: false,
                    table_cell_advtab: false,
                    table_row_advtab: false,
                    table_toolbar: 'tabledelete | tablerowheader | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
                    content_style: 'p { margin: 0; }',
                    paste_postprocess: paste_postprocess,
                    setup: setup_editor
                }).then((editors) => {
                    this.ed = editors[0];

                    // for some reason the formatter isn't set during the
                    // setup_editor run, so we do this here instead
                    let formats_to_remove = ['pre', 'div', 'subscript', 'superscript'];
                    for (let i of formats_to_remove) {
                        this.ed.formatter.unregister(i);
                    }
                });
            },

            blur_textarea: function () {
                this.$target[0].blur();
            },

            blur_tinymce: function () {
                if (this.bbCodeView) {
                    this.blur_textarea();
                }
                else {
                    // I'm not sure if this call is actually doing anything, but
                    // the element does lose focus
                    this.ed.getElement().blur();
                }
            },

            focus_textarea: function () {
                this.$target[0].focus();
            },

            focus_tinymce: function () {
                if (this.bbCodeView) {
                    this.focus_textarea();
                }
                else {
                    this.ed.focus();
                }
            },

            scrollToCursor_textarea: function () {
                this.$target[0].blur();
                this.$target[0].focus();
            },

            scrollToCursor_tinymce: function () {
                if (this.bbCodeView) {
                    this.scrollToCursor_textarea();
                }
                else {
                    this.ed.selection.getNode().scrollIntoView(false);
                }
            },

            isBbCodeView_textarea: function () {
                return true;
            },

            isBbCodeView_tinymce: function () {
                return this.bbCodeView;
            },

            insertContent_textarea: function (html, text) {
                XF.insertIntoTextBox(this.$target, text);
            },

            replaceContent_textarea: function (html, text) {
                XF.replaceIntoTextBox(this.$target, text);
            },

            insertContent_tinymce: function (html, text) {
                if (this.bbCodeView) {
                    XF.insertIntoTextBox(this.$target, text);
                }
                else {
                    this.ed.insertContent(html);
                }
            },

            replaceContent_tinymce: function (html, text) {
                if (this.bbCodeView) {
                    XF.replaceIntoTextBox(this.$target, text);
                }
                else {
                    this.ed.setContent(html);
                }
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
            ['blur', 'isBbCodeView', 'insertContent', 'replaceContent',
             'focus', 'scrollToCursor'];
        for (let i of methods_to_patch) {
            add_dispatch(i)
        }
        ext_obj.__backup = backup;
        XF.Editor = XF.extend(XF.Editor, ext_obj);
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
