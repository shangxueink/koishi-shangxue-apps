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

# 安装依赖函数
function install_dependencies {
    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "安装依赖" \
                        --menu "请选择要安装的依赖：" 15 50 5 \
                        1 "安装 Chromium 和相关库" \
                        2 "安装 Node.js 和 Yarn" \
                        3 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                dialog --infobox "正在安装 Chromium 和相关库，请稍候..." 5 50
                pkg i x11-repo -y
                pkg rei tur-repo -y
                pkg rei libexpat -y
                pkg i chromium -y
                pkg i ffmpeg -y
                dialog --msgbox "Chromium 和相关库安装完成！" 5 50
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
                cd ~/koishi/koishi-app
                yarn start
                ;;
            2)
                cd ~/koishi/koishi-app
                yarn
                ;;
            3)
                cd ~/koishi/koishi-app
                rm -rf node_modules
                yarn install
                ;;
            4)
                cd ~/koishi/koishi-app
                yarn upgrade
                ;;
            5)
                cd ~/koishi/koishi-app
                yarn dev
                ;;
            6)
                cd ~/koishi/koishi-app
                yarn build
                ;;
            7)
                cd ~/koishi/koishi-app
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

# 设置 Koishi 目录函数
function set_koishi_directory {
    dialog --inputbox "请输入 Koishi 目录的路径：" 8 50 ~/koishi 2>/tmp/koishi_dir
    KOISHI_DIR=$(cat /tmp/koishi_dir)
    mkdir -p $KOISHI_DIR
    cd $KOISHI_DIR
    dialog --msgbox "Koishi 目录已设置为 $KOISHI_DIR" 5 50
}

# 启动主菜单
main_menu
