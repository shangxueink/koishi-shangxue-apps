#!/bin/bash

# 检查并安装 dialog 工具
if ! command -v dialog &> /dev/null; then
    pkg_install_dialog=0
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install dialog -y
        pkg_install_dialog=1
    elif command -v yum &> /dev/null; then
        yum install dialog -y
        pkg_install_dialog=1
    elif command -v dnf &> /dev/null; then
        dnf install dialog -y
        pkg_install_dialog=1
    elif command -v pacman &> /dev/null; then
        pacman -S dialog --noconfirm
        pkg_install_dialog=1
    elif command -v zypper &> /dev/null; then
        zypper install dialog
        pkg_install_dialog=1
    else
        echo "Error: dialog 工具未找到，请手动安装后再运行脚本。"
        exit 1
    fi
    if [[ $pkg_install_dialog -eq 1 ]];then
        echo "dialog 安装完成,请重新运行脚本"
        exit 1
    fi
fi

# 默认实例目录 (Linux 兼容)
KOISHI_BASE_DIR="$HOME/koishi"

# 日志函数
log() {
    local message="$1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $message" >> "$KOISHI_BASE_DIR/koishi-manager.log"
}

# 获取 Koishi 实例列表
function get_koishi_instances {
    find "$KOISHI_BASE_DIR" -maxdepth 2 -name "koishi.yml" -print0 | while IFS= read -r -d $'\0' file; do
        dir=$(dirname "$file")
        instance_name=$(basename "$dir")
        echo "$instance_name"
    done
}

# 选择 Koishi 实例
function select_koishi_instance {
    local instances
    instances=$(get_koishi_instances)

    if [ -z "$instances" ]; then
        dialog --msgbox "未找到 Koishi 实例！" 6 50
        return 1
    fi

    local options=()
    while IFS= read -r instance; do
        options+=("$instance" "$instance")
    done <<< "$instances"

    selected_instance=$(dialog --clear --backtitle "Koishi Manager" \
                                --title "选择 Koishi 实例" \
                                --menu "请选择一个 Koishi 实例：" 18 60 10 \
                                "${options[@]}" \
                                3>&1 1>&2 2>&3)

    if [ -z "$selected_instance" ]; then
        return 1 # 用户取消选择
    fi

    KOISHI_APP_DIR="$KOISHI_BASE_DIR/$selected_instance"
    echo "$KOISHI_APP_DIR"
}

# 确认操作函数
function confirm_return {
    echo "--------------------------------------------------"
    read -n 1 -s -r -p "执行完成。按 任意 键返回主菜单...如果有任何报错：请 立即 现在 截图 完整 日志！！！"
    echo
    read -n 1 -s -r -p "再按 任意 键返回主菜单..."
    echo
    echo
}

# 运行命令并展示输出
run_command() {
    local cmd="$1"
    local dir="$2"
    local title="$3"

    if [ -n "$dir" ]; then
        cd "$dir" || { dialog --msgbox "无法进入目录: $dir" 6 50; return 1; }
    fi

    # 清屏并显示提示信息
    clear
    echo "正在执行: $title"
    echo "目录: $dir"
    echo "命令: $cmd"
    echo "--------------------------------------------------"

    # 执行命令并输出到终端
    eval "$cmd"

    # 等待用户输入两次任意键
    confirm_return

    return $?
}

# Chrome 安装子菜单
function install_chrome_variant {
    local pkg_manager="$1"

    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "选择 Chrome 安装方式" \
                        --menu "请选择要安装的 Chrome 版本:" 18 60 10 \
                        1 "安装 Chrome (官方)" \
                        2 "安装 Chromium (开源)" \
                        3 "安装 chromium-bsu (备选)" \
                        4 "安装 Snap Chromium (Ubuntu)" \
                        5 "返回上一级菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                clear
                echo "如果需要安装 Chrome (官方) ..."
                echo "请按照 https://www.google.com/chrome/?platform=linux 获取安装包，并手动安装。"
                confirm_return
                ;;
            2)
                clear
                echo "正在安装 Chromium (开源)，请稍候..."
                if [[ "$pkg_manager" == "apt-get" ]]; then
                    apt-get install chromium -y
                elif [[ "$pkg_manager" == "yum" ]] || [[ "$pkg_manager" == "dnf" ]]; then
                    yum install chromium -y || dnf install chromium -y
                elif [[ "$pkg_manager" == "pacman" ]]; then
                    pacman -S chromium --noconfirm
                elif [[ "$pkg_manager" == "zypper" ]]; then
                    zypper install chromium
                fi
                confirm_return
                ;;
            3)
                clear
                echo "正在安装 chromium-bsu (备选)，请稍候..."
                if [[ "$pkg_manager" == "apt-get" ]]; then
                    apt-get install chromium-bsu -y
                elif [[ "$pkg_manager" == "yum" ]] || [[ "$pkg_manager" == "dnf" ]]; then
                    yum install chromium-bsu -y || dnf install chromium-bsu -y
                elif [[ "$pkg_manager" == "pacman" ]]; then
                    pacman -S chromium-bsu --noconfirm
                elif [[ "$pkg_manager" == "zypper" ]]; then
                    zypper install chromium-bsu
                fi
                confirm_return
                ;;
            4)
                clear
                echo "正在安装 Snap Chromium (Ubuntu)，请稍候..."
                snap install chromium
                confirm_return
                ;;
            5)
                break
                ;;
            *)
                break
                ;;
        esac
    done
}


# 安装依赖函数 (适配 Linux)
function install_dependencies {
    local pkg_manager=""

    # 自动检测包管理器
    if command -v apt-get &> /dev/null; then
        pkg_manager="apt-get"
    elif command -v yum &> /dev/null; then
        pkg_manager="yum"
    elif command -v dnf &> /dev/null; then
        pkg_manager="dnf"
    elif command -v pacman &> /dev/null; then
        pkg_manager="pacman"
    elif command -v zypper &> /dev/null; then
        pkg_manager="zypper"
    else
        dialog --msgbox "未检测到 apt-get, yum, dnf, pacman, zypper 等包管理器，请手动安装依赖。" 8 60
        return 1
    fi

    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "安装依赖" \
                        --menu "请选择要安装的依赖 (需要 root 权限):" 18 60 10 \
                        1 "安装 Node.js" \
                        2 "安装 Yarn" \
                        3 "安装 Chromium (用于puppeteer渲染)" \
                        4 "安装 FFmpeg (用于音视频处理)" \
                        5 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                clear
                echo "正在安装 Node.js，请稍候..."
                if [[ "$pkg_manager" == "apt-get" ]]; then
                    apt-get update
                    apt-get install nodejs npm -y # 包含 npm
                elif [[ "$pkg_manager" == "yum" ]]; then
                    yum install nodejs npm -y
                elif [[ "$pkg_manager" == "dnf" ]]; then
                    dnf install nodejs npm -y
                elif [[ "$pkg_manager" == "pacman" ]]; then
                    pacman -S nodejs npm --noconfirm
                elif [[ "$pkg_manager" == "zypper" ]]; then
                    zypper install nodejs npm
                fi
                confirm_return
                ;;
            2)
                clear
                echo "正在安装 Yarn，请稍候..."
                if [[ "$pkg_manager" == "apt-get" ]]; then
                    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
                    echo "deb https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list
                    apt-get update
                    apt-get install yarn -y
                elif [[ "$pkg_manager" == "yum" ]] || [[ "$pkg_manager" == "dnf" ]]; then
                    curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo -o /etc/yum.repos.d/yarn.repo
                    yum install yarn -y || dnf install yarn -y # 尝试 yum 和 dnf
                elif [[ "$pkg_manager" == "pacman" ]]; then
                    pacman -S yarn --noconfirm
                elif [[ "$pkg_manager" == "zypper" ]]; then
                    zypper install yarn
                fi
                # 检查 Node.js 和 npm 版本
                echo "Node.js 版本："
                node --version
                echo "npm 版本："
                npm --version

                # 设置 npm 镜像
                echo "设置 npm 镜像源..."
                npm config set registry https://registry.npmmirror.com

                # 查看 npm 镜像
                echo "当前 npm 镜像源："
                npm config get registry

                # 设置 Yarn 镜像 (兼容 Yarn 1.x 和 2+)
                echo "设置 Yarn 镜像源..."
                yarn config set registry https://registry.npmmirror.com
                yarn config set npmRegistryServer https://registry.npmmirror.com

                # 查看 Yarn 镜像
                echo "当前 Yarn 镜像源："
                yarn config get registry  # 检查 Yarn 1.x 的 registry
                yarn config get npmRegistryServer # 检查 Yarn 2+ 的 npmRegistryServer

                confirm_return
                ;;
            3)
                install_chrome_variant "$pkg_manager"
                ;;
            4)
                clear
                echo "正在安装 FFmpeg，请稍候..."
                if [[ "$pkg_manager" == "apt-get" ]]; then
                    apt-get install ffmpeg -y
                elif [[ "$pkg_manager" == "yum" ]] || [[ "$pkg_manager" == "dnf" ]]; then
                    yum install ffmpeg -y || dnf install ffmpeg -y
                elif [[ "$pkg_manager" == "pacman" ]]; then
                    pacman -S ffmpeg --noconfirm
                elif [[ "$pkg_manager" == "zypper" ]]; then
                    zypper install ffmpeg
                fi
                confirm_return
                ;;
            5)
                break
                ;;
            *)
                break
                ;;
        esac
    done
}

# 创建 Koishi 实例
function create_koishi_instance {
    mkdir -p "$KOISHI_BASE_DIR"

    # 确认创建
    # if ! dialog --clear --backtitle "Koishi Manager" \
    #             --title "创建 Koishi 实例" \
    #             --yesno "确定要创建新的 Koishi 实例吗？" 7 50; then
    #   return
    # fi

    cd "$KOISHI_BASE_DIR" || return

    # 退出 UI，将控制权交给终端
    clear
    echo "正在创建 Koishi 实例，请按照提示进行操作..."
    echo "当前安装路径：$KOISHI_BASE_DIR"
    read -r -p "是否确认安装？(按 Enter 继续，输入 N 或 n 取消): " confirm
    if [[ "$confirm" == "N" || "$confirm" == "n" ]]; then
        main_menu
        return
    fi

    yarn create koishi

    # 退出脚本，不再返回 UI
    exit 0
}

# 删除 Koishi 实例
function delete_koishi_instance {
    if ! KOISHI_APP_DIR=$(select_koishi_instance); then
        return
    fi

    if dialog --clear --backtitle "Koishi Manager" \
              --title "删除 Koishi 实例"\
              --yesno "确定要删除 "$KOISHI_APP_DIR" 实例吗？此操作不可恢复！" 7 50; then
        rm -rf "$KOISHI_APP_DIR"
        dialog --msgbox "Koishi 实例已删除！" 6 50
        main_menu # 删除后返回主菜单
    fi
}

# Koishi 控制菜单
function koishi_control {
    if ! KOISHI_APP_DIR=$(select_koishi_instance); then
        return
    fi

    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "Koishi 控制" \
                        --menu "请选择一个操作：" 18 60 10 \
                        1 "启动 Koishi" \
                        2 "整理依赖 (yarn)" \
                        3 "重装依赖 (rm -rf node_modules && yarn install)" \
                        4 "升级全部依赖 (yarn upgrade)" \
                        5 "以开发模式启动 (yarn dev)" \
                        6 "编译全部源码 (yarn build)" \
                        7 "依赖去重 (yarn dedupe)" \
                        8 "删除 Koishi 实例" \
                        9 "返回主菜单" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                echo "正在启动 Koishi，请稍候..."
                run_command "yarn start" "$KOISHI_APP_DIR" "启动 Koishi"
                ;;
            2)
                run_command "yarn" "$KOISHI_APP_DIR" "整理依赖"
                ;;
            3)
                run_command "rm -rf node_modules && yarn install" "$KOISHI_APP_DIR" "重装依赖"
                ;;
            4)
                run_command "yarn upgrade" "$KOISHI_APP_DIR" "升级全部依赖"
                ;;
            5)
                run_command "yarn dev" "$KOISHI_APP_DIR" "开发模式启动"
                ;;
            6)
                run_command "yarn build" "$KOISHI_APP_DIR" "编译全部源码"
                ;;
            7)
                run_command "yarn dedupe" "$KOISHI_APP_DIR" "依赖去重"
                ;;
            8)
                delete_koishi_instance
                return # 删除后返回主菜单, 避免继续循环
                ;;
            9)
                break
                ;;
            *)
               break
                ;;
        esac
    done
}

# 主菜单
function main_menu {
    while true; do
        choice=$(dialog --clear --backtitle "Koishi Manager" \
                        --title "主菜单" \
                        --menu "请选择一个操作：" 18 60 10 \
                        1 "安装依赖" \
                        2 "创建 Koishi 实例" \
                        3 "管理 Koishi 实例" \
                        4 "退出" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                install_dependencies
                ;;
            2)
                create_koishi_instance
                ;;
            3)
                koishi_control
                ;;
            4)
                if dialog --clear --backtitle "Koishi Manager" \
                          --title "退出" \
                          --yesno "确定要退出吗？" 7 50; then
                    exit 0
                fi
                ;;
            "")  # 处理直接按 Enter 或 Esc 的情况 (Cancell)
                if dialog --clear --backtitle "Koishi Manager" \
                          --title "退出" \
                          --yesno "确定要退出吗？" 7 50; then
                    exit 0
                fi
                ;;

            *)
                dialog --infobox "无效选项，请重新选择..." 3 30; sleep 1
                ;;
        esac
    done
}

# 启动主菜单
main_menu
