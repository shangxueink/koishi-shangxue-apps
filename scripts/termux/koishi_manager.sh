#!/bin/bash

# 检查并安装 dialog 工具，如果未安装
if ! command -v dialog &> /dev/null; then
    pkg install dialog -y
fi

# 定义 Koishi 根目录，默认为 ~/koishi，可以根据需要修改
KOISHI_ROOT="$HOME/koishi"
KOISHI_APP_DIR="$KOISHI_ROOT/koishi-app"

# 函数：检查 Koishi 实例目录是否存在，并返回目录路径
function find_koishi_instance_dir {
    local -a koishi_dirs
    find "$HOME" -maxdepth 3 -name "koishi.yml" 2>/dev/null | while IFS= read -r file; do
        koishi_dirs+=("$(dirname "$file")")
    done

    if [[ ${#koishi_dirs[@]} -eq 0 ]]; then
        echo "" # 没有找到 koishi 实例
        return 1
    elif [[ ${#koishi_dirs[@]} -eq 1 ]]; then
        echo "${koishi_dirs[0]}" # 找到一个，直接返回
        return 0
    else
        # 找到多个，需要用户选择
        local choices=""
        for i in "${!koishi_dirs[@]}"; do
            choices+="$i ${koishi_dirs[$i]} \n"
        done
        chosen_index=$(dialog --clear --backtitle "Koishi Manager" \
                           --title "选择 Koishi 实例" \
                           --radiolist "找到多个 Koishi 实例，请选择要管理的实例：" 20 60 10 \
                           "$choices" 2>&1 1>&3 3>&2)
        if [[ -n "$chosen_index" ]]; then
            echo "${koishi_dirs[$chosen_index]}"
            return 0
        else
            echo "" # 用户取消选择
            return 1
        fi
    fi
}


# 主菜单函数
function main_menu {
    while true; do
        local current_koishi_dir=""
        current_koishi_dir=$(find_koishi_instance_dir)

        local menu_items=(
            "1 安装 Koishi 依赖 (pkg i ... yarn config ...)"
            "2 Koishi 控制"
            "3 退出"
        )

        if [[ -n "$current_koishi_dir" ]]; then
             menu_items[1]="2 Koishi 控制 (当前实例: $(basename "$current_koishi_dir"))"
        else
             menu_items[1]="2 Koishi 控制 (未检测到 Koishi 实例)"
        fi


        local choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "主菜单" \
                        --menu "请选择一个操作：" 18 70 3 \
                        "${menu_items[@]}" \
                        3>&1 1>&2 2>&3)

        case "$choice" in
            "1 安装 Koishi 依赖 (pkg i ... yarn config ...)")
                install_dependencies
                ;;
            "2 Koishi 控制 (当前实例: $(basename "$current_koishi_dir"))"|"2 Koishi 控制 (未检测到 Koishi 实例)")
                if [[ -n "$current_koishi_dir" ]]; then
                    KOISHI_APP_DIR="$current_koishi_dir" # 更新 Koishi 应用目录为检测到的目录
                    koishi_control_menu
                else
                    dialog --msgbox "未检测到 Koishi 实例，请先手动创建 Koishi 实例 (yarn create koishi)。" 8 60
                fi
                ;;
            "3 退出")
                clear
                exit 0
                ;;
            "") # 用户取消
                continue
                ;;
            *)
                dialog --msgbox "无效的选择。" 8 30
                ;;
        esac
    done
}

# 安装依赖函数
function install_dependencies {
    dialog --infobox "正在安装 Koishi 依赖，请稍候..." 8 60
    pkg i x11-repo -y
    pkg rei tur-repo -y
    pkg rei libexpat -y
    pkg i chromium -y
    pkg i ffmpeg -y
    pkg i nodejs-lts -y
    npm config set registry https://registry.npmmirror.com
    npm i -g yarn
    yarn config set registry https://registry.npmmirror.com
    mkdir -p "$KOISHI_ROOT"

    dialog --msgbox "依赖安装完成！\n\n接下来，请手动执行 'yarn create koishi' 命令来创建 Koishi 项目。\n按照提示，一路回车五次即可。\n\n创建完成后，再次运行本脚本以进行 Koishi 控制。" 15 70
}


# Koishi 控制菜单函数
function koishi_control_menu {
    while true; do
        local choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "Koishi 控制" \
                        --menu "请选择一个操作：" 20 70 8 \
                        "1 启动 Koishi (yarn start)" "cd '$KOISHI_APP_DIR' && yarn start" \
                        "2 整理依赖 (yarn)" "cd '$KOISHI_APP_DIR' && yarn" \
                        "3 重装依赖 (rm -rf node_modules && yarn install)" "cd '$KOISHI_APP_DIR' && rm -rf node_modules && yarn install" \
                        "4 升级全部依赖 (yarn upgrade)" "cd '$KOISHI_APP_DIR' && yarn upgrade" \
                        "5 更新全部依赖 (yarn upgrade-interactive --latest)" "cd '$KOISHI_APP_DIR' && yarn upgrade-interactive --latest" \
                        "6 清理依赖 (yarn dedupe)" "cd '$KOISHI_APP_DIR' && yarn dedupe" \
                        "7 以开发模式启动 (yarn dev)" "cd '$KOISHI_APP_DIR' && yarn dev" \
                        "8 编译全部源码 (yarn build)" "cd '$KOISHI_APP_DIR' && yarn build" \
                        "9 返回主菜单"  ""\
                        3>&1 1>&2 2>&3)

        case "$choice" in
            "1 启动 Koishi (yarn start)")
                cd "$KOISHI_APP_DIR" && yarn start
                ;;
            "2 整理依赖 (yarn)")
                cd "$KOISHI_APP_DIR" && yarn
                ;;
            "3 重装依赖 (rm -rf node_modules && yarn install)")
                cd "$KOISHI_APP_DIR" && rm -rf node_modules && yarn install
                ;;
            "4 升级全部依赖 (yarn upgrade)")
                cd "$KOISHI_APP_DIR" && yarn upgrade
                ;;
            "5 更新全部依赖 (yarn upgrade-interactive --latest)")
                cd "$KOISHI_APP_DIR" && yarn upgrade-interactive --latest
                ;;
            "6 清理依赖 (yarn dedupe)")
                cd "$KOISHI_APP_DIR" && yarn dedupe
                ;;
            "7 以开发模式启动 (yarn dev)")
                cd "$KOISHI_APP_DIR" && yarn dev
                ;;
            "8 编译全部源码 (yarn build)")
                cd "$KOISHI_APP_DIR" && yarn build
                ;;
            "9 返回主菜单")
                break
                ;;
            "") # 用户取消
                continue
                ;;
            *)
                dialog --msgbox "无效的选择。" 8 30
                ;;
        esac
    done
}

# 脚本启动时执行主菜单
main_menu
