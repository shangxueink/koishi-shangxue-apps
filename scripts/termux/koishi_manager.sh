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
                        3 "退出" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                install_dependencies_menu
                ;;
            2)
                select_koishi_instance
                ;;
            3)
                clear
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# 安装依赖菜单函数
function install_dependencies_menu {
    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "安装依赖" \
                        --menu "请选择要安装的依赖：" 15 50 5 \
                        1 "基础依赖" \
                        2 "Node.js 和 Yarn" \
                        3 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                install_basic_dependencies
                ;;
            2)
                install_nodejs_and_yarn
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

# 安装基础依赖函数
function install_basic_dependencies {
    dialog --infobox "正在安装基础依赖，请稍候..." 5 50
    pkg i x11-repo -y
    pkg rei tur-repo -y
    pkg rei libexpat -y
    pkg i chromium -y
    pkg i ffmpeg -y
    dialog --msgbox "基础依赖安装完成！" 5 50
}

# 安装 Node.js 和 Yarn 函数
function install_nodejs_and_yarn {
    dialog --infobox "正在安装 Node.js 和 Yarn，请稍候..." 5 50
    pkg i nodejs-lts -y
    npm config set registry https://registry.npmmirror.com
    npm i -g yarn
    yarn config set registry https://registry.npmmirror.com
    dialog --msgbox "Node.js 和 Yarn 安装完成！" 5 50
}

# 选择 Koishi 实例函数
function select_koishi_instance {
    instances=($(find ~ -name "koishi.yml" -exec dirname {} \;))
    if [ ${#instances[@]} -eq 0 ]; then
        dialog --msgbox "未找到任何 Koishi 实例！" 5 50
        return
    elif [ ${#instances[@]} -eq 1 ]; then
        koishi_instance=${instances[0]}
        koishi_control
    else
        instance_list=()
        for ((i=0; i<${#instances[@]}; i++)); do
            instance_list+=("$((i+1))" "${instances[$i]}")
        done
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "选择 Koishi 实例" \
                        --menu "请选择一个 Koishi 实例：" 15 50 5 \
                        "${instance_list[@]}" \
                        3>&1 1>&2 2>&3)
        if [ -n "$choice" ]; then
            koishi_instance=${instances[$((choice-1))]}
            koishi_control
        fi
    fi
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
                cd "$koishi_instance"
                yarn start
                ;;
            2)
                cd "$koishi_instance"
                yarn
                ;;
            3)
                cd "$koishi_instance"
                rm -rf node_modules
                yarn install
                ;;
            4)
                cd "$koishi_instance"
                yarn upgrade
                ;;
            5)
                cd "$koishi_instance"
                yarn dev
                ;;
            6)
                cd "$koishi_instance"
                yarn build
                ;;
            7)
                cd "$koishi_instance"
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
