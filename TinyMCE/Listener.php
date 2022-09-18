<?php

namespace QQ\TinyMCE;

use XF\Mvc\Entity\Entity;

class Listener
{
    public static function userStructureCallback(\XF\Mvc\Entity\Manager $em, \XF\Mvc\Entity\Structure &$structure)
    {
        /* $structure->columns['editor_select'] = [
         *     'type' => Entity::STR, 'nullable' => true, 'default' => null,
         *     'allowedValues' => ['FROALA', 'TEXTAREA', 'TINYMCE']]; */
    }
}
