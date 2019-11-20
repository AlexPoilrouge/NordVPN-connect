#!/bin/bash


SCRIPT_NAME=$( basename "$0" )
SCRIPT_DIR_PATH=$( realpath "$( dirname "$0" )" )

EXTENSION_NAME="NordVPN_Connect@poilrouge.fr"
INSTALL_DIR="${HOME}/.local/share/gnome-shell/extensions"
SYSTEM_INSTALL_DIR="/usr/share/gnome-shell/extensions"

GIT_BRANCH="master"
GIT_REMOTE="origin"

OPT_SHELL_RELOAD=false
OPT_GITLESS=false
OPT_UNINSTALL_KEEP_CONFIG_FILE=false
OPT_EXTENSION_MODE=true

MODE="install"

NVPN_C_CONFIG_HOME_RELATIVE_PATH=".config/nordvpn/nordvpn_connect"


test_cmd() {
    if hash "$1" &>/dev/null; then
        true;
    else
        false;
    fi
}

help() {
    echo "${SCRIPT_NAME} [options <arg>] [<COMMAND>]"
    echo "---"
    echo "Options:"
    echo -e "\t--d, --directory <dir_path>"
    echo -e "\t\tspecify the extension install directory"
    echo ""
    echo -e "\t--branch <branch>"
    echo -e "\t\tspecify the git branch from which to perform the install"
    echo ""
    echo -e "\t--remote <remote>"
    echo -e "\t\tspecify the git remote from which to update (in case of update)"
    echo ""
    echo -e "\t--system-install"
    echo -e "\t\tinstall as a system extension"
    echo -e "\t\t(equivalent to using ' ${SCRIPT_NAME} -d ${SYSTEM_INSTALL_DIR} ')"
    echo ""
    echo -e "\t--gitless"
    echo -e "\t\tproceed with the script but without executing git commands …"
    echo ""
    echo -e "\t--keep-config-files"
    echo -e "\t\tdo not remove config files during uninstallation …"
    echo ""
    echo -e "\t--no-extension-mode"
    echo -e "\t\tdo not use the command line gnome shell utilities to manage extension …"
    echo -e "\n---"
    echo "Commands:"
    echo -e "\tinstall"
    echo -e "\t\tinstall the '${EXTENSION_NAME}' extension"
    echo -e "\t\t(default mode, if no COMMAND is given)"
    echo ""
    echo -e "\tuninstall"
    echo -e "\t\tuninstall the '${EXTENSION_NAME}' extension"
    echo ""
    echo -e "\tupdate"
    echo -e "\t\tupdate the '${EXTENSION_NAME}' extension"
    echo ""
    echo -e "\tclean"
    echo -e "\t\tclean the '${EXTENSION_NAME}' extension of its config files"
}


if ! test_cmd git;
then
    echo "$0 - git not found …";
    echo -e "\trunning in gitless mode …";
    OPT_GITLESS=true
fi
if ! test_cmd gnome-shell;
then
    echo "$0 - gnome-shell not found …";
    echo -e "\tshell-reload unavailable …";
    OPT_SHELL_RELOAD=false
fi

if ! test_cmd getopt;
then
    echo >&2 "$0 requires getopt to work…";
    exit 1;
fi
if ! test_cmd gnome-extensions;
then
    echo >&2 "$0 requires gnome-shell to work…";
    exit 1;
fi
 
if ! OPTS=$( getopt -l help,directory:,remote:,branch:,system-install,gitless,keep-config-files,no-extension-mode -o h,r,d: -- "$@" );
then
    echo >&2 "Unexpected error while reading options and commands …"
    exit 1
fi


eval set -- "$OPTS" 
while true ; do
    case "$1" in
        -d) INSTALL_DIR=$2
            shift 2;
            ;;
        -h) help ;
            exit 0 ;
            ;;
        -r) OPT_SHELL_RELOAD=true
            shift
            ;;
        --directory) INSTALL_DIR=$2
            shift 2;
            ;;
        --help) help ;
            exit 0 ;
            ;;
        --remote) GIT_REMOTE=$2
            shift 2;
            ;;
        --branch) GIT_BRANCH=$2
            shift 2;
            ;;
        --system-install) INSTALL_DIR=${SYSTEM_INSTALL_DIR};
            shift;
            ;;
        --gitless) echo "Gitless run …" ;
            OPT_GITLESS=true;
            shift;
            ;;
        --keep-config-files) OPT_UNINSTALL_KEEP_CONFIG_FILE=true;
            shift;
            ;;
        --no-extension-mode) OPT_EXTENSION_MODE=false
            shift;
            ;;
        --) shift; break;;
    esac
done

if [ $# -gt 0 ]; then
    MODE=$1
fi


if [ ! -d ${INSTALL_DIR} ];
then
    echo "$0 - the install directory '${INSTALL_DIR}' isn't found. Try specifying the appropriate directory using option '-d' …"
    exit 2;
else
    echo "$0 - install directory set to '${INSTALL_DIR}'"
fi


if [[ "${INSTALL_DIR}" == "${SYSTEM_INSTALL_DIR}" ]]; then
    if (( EUID != 0 )); then
        echo "${SCRIPT_NAME} - you would need root privilege to ${MODE} '${EXTENSION_NAME} as system extension …"
        exit 3
    fi
fi

OLD_BRANCH=$( git branch | grep "\*" | cut -d ' ' -f2 )


##### not mine #####
##### found at #####
#https://stackoverflow.com/questions/3878624/how-do-i-programmatically-determine-if-there-are-uncommitted-changes#
    require_clean_work_tree () {
        # Update the index
        git update-index -q --ignore-submodules --refresh
        err=0

        # Disallow unstaged changes in the working tree
        if ! git diff-files --quiet --ignore-submodules --
        then
            echo >&2 "you have unstaged changes."
            git diff-files --name-status -r --ignore-submodules -- >&2
            err=1
        fi

        # Disallow uncommitted changes in the index
        if ! git diff-index --cached --quiet HEAD --ignore-submodules --
        then
            echo >&2 "your index contains uncommitted changes."
            git diff-index --cached --name-status -r --ignore-submodules HEAD -- >&2
            err=1
        fi

        if [ $err = 1 ]
        then
            echo >&2 "Please commit or stash them."
            exit 4
        fi
    }
##########


_install_copy(){
    mkdir -p ${INSTALL_DIR}/${EXTENSION_NAME} ;
    cp -rvf ./*.md ./*.js ./*json ./*.ui img schemas ./*.css ${INSTALL_DIR}/${EXTENSION_NAME} ./setup.sh;
}

remove_config_files(){
    if [[ "${INSTALL_DIR}" == "${SYSTEM_INSTALL_DIR}" ]]; then
        sed -n '/^\([^:]\+\):[^:]\+:[1-9][0-9]\{3\}/ { s/:.*//; p }' /etc/passwd | while read -r U
        do
            U_HOME_DIR=$( realpath ~"$U" )
            U_CONFIG_DIR="${U_HOME_DIR}/${NVPN_C_CONFIG_HOME_RELATIVE_PATH}"

            if [ -d "${U_CONFIG_DIR}" ]; then
                echo "Removing config for user $U (${U_CONFIG_DIR}) …"
                rm -rvf "${U_CONFIG_DIR}"
            fi
        done
    else
        U_CONFIG_DIR="${HOME}/${NVPN_C_CONFIG_HOME_RELATIVE_PATH}"

        if [ -d "${U_CONFIG_DIR}" ]; then
            echo "Removing user config (${U_CONFIG_DIR}) …"
            rm -rvf "${U_CONFIG_DIR}"
        fi
    fi
}

case $MODE in
    install)  echo "Installing ${EXTENSION_NAME} …"
        if ! $OPT_GITLESS ;
        then
            require_clean_work_tree
            
            git checkout "$GIT_BRANCH" ;
        fi

        _install_copy || true


        if ! $OPT_GITLESS ;
        then
            require_clean_work_tree

            git checkout "$OLD_BRANCH" ;
        fi

        if $OPT_EXTENSION_MODE; then
            gnome-extensions enable ${EXTENSION_NAME}
        fi

        ;;
    uninstall) echo "Uninstalling ${EXTENSION_NAME} …"
        if $OPT_EXTENSION_MODE; then
            gnome-extensions disable ${EXTENSION_NAME}
        fi

        if [[ "${INSTALL_DIR}/${EXTENSION_NAME}" == "${SCRIPT_DIR_PATH}" ]]; then
            echo "WARNING! the install directory is also the same as this directory (and therefore probably the source directory and the git repository)!!!"
            echo "Do you want a complete uninstallation and remove this directory (${INSTALL_DIR}/${EXTENSION_NAME}) ?"

            read -r -p "[y/N]" choice
            case "$choice" in 
                y|Y ) rm -rfv "${INSTALL_DIR:?}"/"${EXTENSION_NAME}";;
                * ) echo "NO! ${INSTALL_DIR}/${EXTENSION_NAME} will remain…";;
            esac
        else
            rm -rfv "${INSTALL_DIR:?}"/"${EXTENSION_NAME}"
        fi

        if ! $OPT_UNINSTALL_KEEP_CONFIG_FILE; then
            remove_config_files;
        fi

        ;;
    update) echo "Updating ${EXTENSION_NAME} …"
        if ! $OPT_GITLESS ;
        then
            require_clean_work_tree

            git checkout "$GIT_BRANCH" ;

            git pull "$GIT_REMOTE" "$GIT_BRANCH"
        fi

        _install_copy || true

        if ! $OPT_GITLESS ;
        then
            git checkout "$OLD_BRANCH" ;
        fi


        if $OPT_EXTENSION_MODE; then
            gnome-extensions reload ${EXTENSION_NAME}
        fi

        ;;
    clean) echo "Cleaning ${EXTENSION_NAME} …"
        if ! $OPT_UNINSTALL_KEEP_CONFIG_FILE; then
            remove_config_files;
        else
            echo "The 'clean' command is incompatible with the '--keep-config-files' option …"
        fi
        ;;
    *) echo >&2 "$1 isn't a viable command …";;
esac

if $OPT_SHELL_RELOAD ;
then
    gnome-shell -r || true ;
else
    echo "[!] ${EXTENSION_NAME} ${MODE} done. You might need to refresh gnome-shell, for it to take effect on your system. Use hotkey \`Alt + F2\` and enter \"r\"…";
fi

exit 0
