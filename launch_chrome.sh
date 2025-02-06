# #!/bin/sh

# DATA_DIR=`mktemp -d` &&
# echo 'Temporary dir:' $DATA_DIR &&
# touch $DATA_DIR/First\ Run &&
# google-chrome --user-data-dir=$DATA_DIR --password-store=basic --load-extension=. $*
# rm -rf $DATA_DIR


#!/bin/bash
DATA_DIR=$(mktemp -d)
echo "Temporary dir: $DATA_DIR"
touch "$DATA_DIR/First Run"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --user-data-dir="$DATA_DIR" --password-store=basic --load-extension="$(pwd)" "$@"
rm -rf "$DATA_DIR"