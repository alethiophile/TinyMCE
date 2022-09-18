#!/bin/bash

# This is for installing the addon into an existing XF 2 installation in
# development mode. To install for production, use a release zip archive.

# To use, navigate to the root install directory of the XF install, then invoke
# this script from there: e.g. $ ../TinyMCE/install.sh

install_dir=$(pwd)
root_dir=$(dirname "$0")

mkdir -p "src/addons/QQ"
relative_path=$(realpath --relative-to=src/addons/QQ "$root_dir"/TinyMCE)
ln -sv "$relative_path" src/addons/QQ

rsync -av src/addons/QQ/TinyMCE/_files/ ./

php cmd.php xf:addon-install QQ/TinyMCE
