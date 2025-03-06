#!/bin/bash

# 检查并安装 dialog 工具
if ! command -v dialog &> /dev/null; then
    pkg install dialog -y
fi

# 主菜单函数
function main_menu {
    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "主菜单" \
                        --menu "请选择一个操作：" 15 50 5 \
                        1 "安装依赖" \
                        2 "Koishi 控制" \
                        3 "设置 Koishi 目录" \
                        4 "退出" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                install_dependencies
                ;;
            2)
                koishi_control
                ;;
            3)
                set_koishi_directory
                ;;
            4)
                clear
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# 设置 Koishi 目录函数
function set_koishi_directory {
    dialog --inputbox "请输入 Koishi 目录路径：" 8 50 "$KOISHI_DIR" 2> /tmp/koishi_dir.txt
    KOISHI_DIR=$(cat /tmp/koishi_dir.txt)
    export KOISHI_DIR
    dialog --msgbox "Koishi 目录已设置为: $KOISHI_DIR" 5 50
}

# 安装依赖函数
function install_dependencies {
    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "安装依赖" \
                        --menu "请选择要安装的依赖：" 15 50 5 \
                        1 "安装基础依赖" \
                        2 "安装 Node.js 和 Yarn" \
                        3 "创建 Koishi 项目" \
                        4 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                dialog --infobox "正在安装基础依赖，请稍候..." 5 50
                pkg i x11-repo -y
                pkg rei tur-repo -y
                pkg rei libexpat -y
                pkg i chromium -y
                pkg i ffmpeg -y
                dialog --msgbox "基础依赖安装完成！" 5 50
                ;;
            2)
                dialog --infobox "正在安装 Node.js 和 Yarn，请稍候..." 5 50
                pkg i nodejs-lts -y
                npm config set registry https://registry.npmmirror.com
                npm i -g yarn
                yarn config set registry https://registry.npmmirror.com
                dialog --msgbox "Node.js 和 Yarn 安装完成！" 5 50
                ;;
            3)
                if [ -z "$KOISHI_DIR" ]; then
                    dialog --msgbox "请先设置 Koishi 目录！" 5 50
                else
                    dialog --msgbox "请手动回车五次以完成 Koishi 项目的创建。" 7 50
                    mkdir -p "$KOISHI_DIR"
                    cd "$KOISHI_DIR" || exit
                    yarn create koishi
                    dialog --msgbox "Koishi 项目创建完成！" 5 50
                fi
                ;;
            4)
                break
                ;;
            *)
                break
                ;;
        esac
    done
}

# Koishi 控制菜单函数
function koishi_control {
    if [ -z "$KOISHI_DIR" ]; then
        dialog --msgbox "请先设置 Koishi 目录！" 5 50
        return
    fi

    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "Koishi 控制" \
                        --menu "请选择一个操作：" 15 50 8 \
                        1 "启动 Koishi (yarn start)" \
                        2 "整理依赖 (yarn)" \
                        3 "重装依赖 (rm -rf node_modules && yarn install)" \
                        4 "升级全部依赖 (yarn upgrade)" \
                        5 "以开发模式启动 (yarn dev)" \
                        6 "编译全部源码 (yarn build)" \
                        7 "依赖去重 (yarn dedupe)" \
                        8 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn start
                ;;
            2)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn
                ;;
            3)
                cd "$KOISHI_DIR/koishi-app" || exit
                rm -rf node_modules
                yarn install
                ;;
            4)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn upgrade
                ;;
            5)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn dev
                ;;
            6)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn build
                ;;
            7)
                cd "$KOISHI_DIR/koishi-app" || exit
                yarn dedupe
                ;;
            8)
                break
                ;;
            *)
                break
                ;;
        esac
    done
}

# 启动主菜单
main_menu
