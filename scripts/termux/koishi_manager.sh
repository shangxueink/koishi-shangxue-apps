#!/bin/bash

# 检查并安装 dialog 工具
if ! command -v dialog &> /dev/null; then
    pkg install dialog -y
fi

# 查找 koishi.yml 文件
function find_koishi_instances {
    local instances=()
    for dir in $(find ~/ -name "koishi.yml" -exec dirname {} \;); do
        instances+=("$dir")
    done
    echo "${instances[@]}"
}

# 选择 Koishi 实例
function select_koishi_instance {
    local instances=($(find_koishi_instances))
    if [ ${#instances[@]} -eq 0 ]; then
        dialog --msgbox "未找到任何 Koishi 实例！" 5 50
        return 1
    elif [ ${#instances[@]} -eq 1 ]; then
        KOISHI_DIR="${instances[0]}"
    else
        local options=()
        for i in "${!instances[@]}"; do
            options+=("$((i+1))" "${instances[$i]}")
        done
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "选择 Koishi 实例" \
                        --menu "请选择一个 Koishi 实例：" 15 50 5 \
                        "${options[@]}" \
                        3>&1 1>&2 2>&3)
        KOISHI_DIR="${instances[$((choice-1))]}"
    fi
}

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
                install_dependencies
                ;;
            2)
                select_koishi_instance
                if [ $? -eq 0 ]; then
                    koishi_control
                fi
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

# 安装依赖函数
function install_dependencies {
    dialog --infobox "正在安装依赖，请稍候..." 5 50
    pkg i x11-repo -y
    pkg rei tur-repo -y
    pkg rei libexpat -y
    pkg i chromium -y
    pkg i ffmpeg -y
    pkg i nodejs-lts -y
    npm config set registry https://registry.npmmirror.com
    npm i -g yarn
    yarn config set registry https://registry.npmmirror.com
    mkdir -p ~/koishi
    dialog --msgbox "依赖安装完成！" 5 50
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
                cd "$KOISHI_DIR/koishi-app"
                yarn start
                ;;
            2)
                cd "$KOISHI_DIR/koishi-app"
                yarn
                ;;
            3)
                cd "$KOISHI_DIR/koishi-app"
                rm -rf node_modules
                yarn install
                ;;
            4)
                cd "$KOISHI_DIR/koishi-app"
                yarn upgrade
                ;;
            5)
                cd "$KOISHI_DIR/koishi-app"
                yarn dev
                ;;
            6)
                cd "$KOISHI_DIR/koishi-app"
                yarn build
                ;;
            7)
                cd "$KOISHI_DIR/koishi-app"
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
