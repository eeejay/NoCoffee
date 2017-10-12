#!/bin/sh

DATA_DIR=`mktemp -d` &&
echo 'Temporary dir:' $DATA_DIR &&
touch $DATA_DIR/First\ Run &&
google-chrome --user-data-dir=$DATA_DIR --password-store=basic --load-extension=. $*
rm -rf $DATA_DIR
