#!/bin/bash

# 设置颜色变量，方便后续使用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 定义菜单选项
main_menu_options=(
    "安装 Koishi 环境"
    "Koishi 管理"
    "退出"
)

koishi_menu_options=(
    "启动 Koishi (cd koishi/koishi-app && yarn start)"
    "整理依赖 (cd koishi/koishi-app && yarn)"
    "重装依赖 (cd koishi/koishi-app && rm -rf node_modules && rm yarn.lock && yarn install)"
    "升级全部依赖 (cd koishi/koishi-app && yarn upgrade)"
    "以开发模式启动 (cd koishi/koishi-app && yarn dev)"
    "编译全部源码 (cd koishi/koishi-app && yarn build)"
    "返回主菜单"
)

# 获取终端大小
get_terminal_size() {
  rows=$(tput lines)
  cols=$(tput cols)
}

# 打印菜单
print_menu() {
  local menu_options=("${!1[@]}")
  local selected=$2
  get_terminal_size
  clear
  echo "--------------------------------------------------"
  echo "  Koishi Termux 管理脚本"
  echo "--------------------------------------------------"
  for i in "${!menu_options[@]}"; do
    if [ "$i" -eq "$selected" ]; then
      echo -e "${GREEN}* ${menu_options[$i]}${NC}"
    else
      echo "  ${menu_options[$i]}"
    fi
  done
  echo "--------------------------------------------------"
  echo -e "使用 ${GREEN}↑${NC}/${GREEN}↓${NC} 选择，${GREEN}Enter${NC} 确认"
}

# 执行命令并记录日志
execute_command() {
  local command="$1"
  echo -e "${YELLOW}执行命令: ${command}${NC}"
  eval "$command" 2>&1 | tee -a koishi_manager.log
  echo -e "${GREEN}命令执行完毕。${NC}"
  sleep 1
}

# 主菜单处理函数
handle_main_menu() {
  local selected=0
  local key
  while true; do
    print_menu main_menu_options "$selected"
    read -rsn1 key
    case "$key" in
      $'\e[A') # Up
        selected=$(( (selected - 1 + ${#main_menu_options[@]}) % ${#main_menu_options[@]} ))
        ;;
      $'\e[B') # Down
        selected=$(( (selected + 1) % ${#main_menu_options[@]} ))
        ;;
      $'\r') # Enter
        case "$selected" in
          0) # 安装 Koishi 环境
            install_koishi_env
            break
            ;;
          1) # Koishi 管理
            handle_koishi_menu
            break
            ;;
          2) # 退出
            clear
            exit 0
            ;;
        esac
        ;;
    esac
  done
}

# Koishi 管理菜单处理函数
handle_koishi_menu() {
  local selected=0
  local key
  while true; do
    print_menu koishi_menu_options "$selected"
    read -rsn1 key
    case "$key" in
      $'\e[A') # Up
        selected=$(( (selected - 1 + ${#koishi_menu_options[@]}) % ${#koishi_menu_options[@]} ))
        ;;
      $'\e[B') # Down
        selected=$(( (selected + 1) % ${#koishi_menu_options[@]} ))
        ;;
      $'\r') # Enter
        case "$selected" in
          0) # 启动 Koishi
            execute_command "cd koishi/koishi-app && yarn start"
            break
            ;;
          1) # 整理依赖
            execute_command "cd koishi/koishi-app && yarn"
            break
            ;;
          2) # 重装依赖
            execute_command "cd koishi/koishi-app && rm -rf node_modules && rm yarn.lock && yarn install"
            break
            ;;
          3) # 升级全部依赖
            execute_command "cd koishi/koishi-app && yarn upgrade"
            break
            ;;
          4) # 以开发模式启动
            execute_command "cd koishi/koishi-app && yarn dev"
            break
            ;;
          5) # 编译全部源码
            execute_command "cd koishi/koishi-app && yarn build"
            break
          6) # 返回主菜单
            handle_main_menu
            return
            ;;
        esac
        ;;
    esac
  done
}


# 安装 Koishi 环境
install_koishi_env() {
  echo -e "${YELLOW}开始安装 Koishi 环境...${NC}"
  # 安装依赖
  execute_command "pkg i x11-repo -y"
  execute_command "pkg rei tur-repo -y"
  execute_command "pkg rei libexpat -y"
  execute_command "pkg i chromium -y"
  execute_command "pkg i ffmpeg -y"
  execute_command "pkg i nodejs-lts -y"

  # 设置 npm 淘宝镜像源
  execute_command "npm config set registry https://registry.npmmirror.com"

  # 安装 yarn
  execute_command "npm i -g yarn"

  # 设置 yarn 淘宝镜像源
  execute_command "yarn config set registry https://registry.npmmirror.com"

  # 创建 koishi 目录
  if [ ! -d "$HOME/koishi" ]; then
    mkdir "$HOME/koishi"
  fi

  # 创建 koishi 项目
  execute_command "cd $HOME/koishi && yarn create koishi"

  # 自动回车五次
  execute_command "cd $HOME/koishi && yes '' | yarn create koishi"

  echo -e "${GREEN}Koishi 环境安装完成！${NC}"
  sleep 1
}

# 主程序入口
main() {
  # 初始化日志文件
  > koishi_manager.log

  handle_main_menu
}

main
