<?php

namespace QQ\TinyMCE;

use XF\AddOn\AbstractSetup;
use XF\AddOn\StepRunnerInstallTrait;
use XF\AddOn\StepRunnerUninstallTrait;
use XF\AddOn\StepRunnerUpgradeTrait;

use XF\Db\Schema\Alter;
use XF\Db\Schema\Create;

class Setup extends AbstractSetup
{
    use StepRunnerInstallTrait;
    use StepRunnerUpgradeTrait;
    use StepRunnerUninstallTrait;

    /* public function installStep1()
     * {
     *     $this->schemaManager()->alterTable('xf_user', function(Alter $table)
     *         {
     *             $table->addColumn(
     *                 'editor_select',
     *                 "enum('froala', 'textarea', 'tinymce')"
     *             )->nullable(true)->setDefault(null);
     *         });
     * } */

    public function installStep1()
    {
        if (\XF::em()->find('XF:UserField', 'editor_select')) {
            return;
        }

        $field = \XF::em()->create('XF:UserField');
        $field->field_id = 'editor_select';
        $field->display_order = 1;
        $field->display_group = 'preferences';
        $field->field_type = 'select';
        $field->field_choices = [
            'froala' => "Froala (XF 2 default)",
            'tinymce' => "TinyMCE",
            'textarea' => "Rich text disabled"
        ];

        $title = $field->getMasterPhrase(true);
        $title->phrase_text = "Rich text editor";
        $field->addCascadedSave($title);

        $description = $field->getMasterPhrase(false);
        $description->phrase_text = "Select which rich-text editor you would like to use.";
        $field->addCascadedSave($description);

        $field->save();
    }
}
