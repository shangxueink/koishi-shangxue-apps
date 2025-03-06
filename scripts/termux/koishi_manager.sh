#!/bin/bash

# 设置颜色变量
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 定义 koishi 目录
KOISHI_DIR="$HOME/koishi/koishi-app"

# 函数：安装依赖
install_dependencies() {
  echo -e "${YELLOW}开始安装依赖...${NC}"
  pkg i x11-repo -y
  pkg rei tur-repo -y
  pkg rei libexpat -y
  pkg i chromium -y
  pkg i ffmpeg -y
  pkg i nodejs-lts -y
  npm config set registry https://registry.npmmirror.com
  npm i -g yarn
  yarn config set registry https://registry.npmmirror.com
  echo -e "${GREEN}依赖安装完成！${NC}"
}

# 函数：创建 Koishi 项目
create_koishi_project() {
  echo -e "${YELLOW}开始创建 Koishi 项目...${NC}"
  mkdir -p "$HOME/koishi"
  cd "$HOME/koishi" || exit 1
  yarn create koishi
  echo -e "${GREEN}Koishi 项目创建完成！${NC}"
}

# 函数：启动 Koishi
start_koishi() {
  echo -e "${YELLOW}启动 Koishi...${NC}"
  cd "$KOISHI_DIR" || exit 1
  yarn start
}

# 函数：整理依赖
tidy_dependencies() {
  echo -e "${YELLOW}整理依赖...${NC}"
  cd "$KOISHI_DIR" || exit 1
  yarn
}

# 函数：重装依赖
reinstall_dependencies() {
  echo -e "${YELLOW}重装依赖...${NC}"
  cd "$KOISHI_DIR" || exit 1
  rm -rf node_modules
  # 清空但不删除 yarn.lock
  > yarn.lock
  yarn install
}

# 函数：升级全部依赖
upgrade_dependencies() {
  echo -e "${YELLOW}升级全部依赖...${NC}"
  cd "$KOISHI_DIR" || exit 1
  yarn upgrade
}

# 函数：以开发模式启动
start_dev_mode() {
  echo -e "${YELLOW}以开发模式启动...${NC}"
  cd "$KOISHI_DIR" || exit 1
  yarn dev
}

# 函数：编译全部源码
build_source_code() {
  echo -e "${YELLOW}编译全部源码...${NC}"
  cd "$KOISHI_DIR" || exit 1
  yarn build
}

# 函数：显示主菜单
show_main_menu() {
  options=(
    "安装依赖 (pkg i ...)"
    "创建 Koishi 项目 (yarn create koishi)"
    "Koishi 控制面板"
    "退出"
  )

  selection=$(dialog --stdout \
    --backtitle "Koishi Termux Manager" \
    --menu "请选择操作:" 15 60 4 \
    1 "${options[0]}" \
    2 "${options[1]}" \
    3 "${options[2]}" \
    4 "${options[3]}"
  )

  case "$selection" in
    1)
      install_dependencies
      ;;
    2)
      create_koishi_project
      ;;
    3)
      show_koishi_control_menu
      ;;
    4)
      echo "退出脚本。"
      exit 0
      ;;
    *)
      echo "无效选项。"
      ;;
  esac
}

# 函数：显示 Koishi 控制面板菜单
show_koishi_control_menu() {
  options=(
    "启动 Koishi (cd koishi/koishi-app && yarn start)"
    "整理依赖 (cd koishi/koishi-app && yarn)"
    "重装依赖 (rm -rf node_modules && > yarn.lock && yarn install)"
    "升级全部依赖 (cd koishi/koishi-app && yarn upgrade)"
    "以开发模式启动 (cd koishi/koishi-app && yarn dev)"
    "编译全部源码 (cd koishi/koishi-app && yarn build)"
    "返回主菜单"
  )

  selection=$(dialog --stdout \
    --backtitle "Koishi Termux Manager - 控制面板" \
    --menu "请选择操作:" 20 70 7 \
    1 "${options[0]}" \
    2 "${options[1]}" \
    3 "${options[2]}" \
    4 "${options[3]}" \
    5 "${options[4]}" \
    6 "${options[5]}" \
    7 "${options[6]}"
  )

  case "$selection" in
    1)
      start_koishi
      ;;
    2)
      tidy_dependencies
      ;;
    3)
      reinstall_dependencies
      ;;
    4)
      upgrade_dependencies
      ;;
    5)
      start_dev_mode
      ;;
    6)
      build_source_code
      ;;
    7)
      show_main_menu
      ;;
    *)
      echo "无效选项。"
      ;;
  esac
}

# 检查是否安装 dialog
if ! command -v dialog &> /dev/null
then
  echo -e "${RED}请先安装 dialog 工具： pkg install dialog${NC}"
  exit 1
fi

# 主程序循环
while true; do
  show_main_menu
done
