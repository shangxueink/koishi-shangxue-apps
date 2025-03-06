#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 函数定义
function install_dependencies() {
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
  echo -e "${GREEN}依赖安装完成!${NC}"
}

function create_koishi_project() {
  echo -e "${YELLOW}开始创建Koishi项目...${NC}"
  mkdir -p ~/koishi
  cd ~/koishi
  yarn create koishi
  # 模拟回车五次
  printf '\n\n\n\n\n'
  echo -e "${GREEN}Koishi项目创建完成!${NC}"
}

function koishi_control_menu() {
  while true; do
    clear
    echo -e "${BLUE}Koishi 控制菜单${NC}"
    echo "1. 启动 Koishi"
    echo "2. 整理依赖"
    echo "3. 重装依赖"
    echo "4. 升级全部依赖"
    echo "5. 以开发模式启动"
    echo "6. 编译全部源码"
    echo "7. 返回主菜单"
    read -p "请选择操作 (1-7): " choice

    case $choice in
      1)
        echo -e "${YELLOW}启动 Koishi...${NC}"
        cd ~/koishi/koishi-app && yarn start
        ;;
      2)
        echo -e "${YELLOW}整理依赖...${NC}"
        cd ~/koishi/koishi-app && yarn
        ;;
      3)
        echo -e "${YELLOW}重装依赖...${NC}"
        cd ~/koishi/koishi-app && rm -rf node_modules && find . -name "yarn.lock" -delete && yarn install
        ;;
      4)
        echo -e "${YELLOW}升级全部依赖...${NC}"
        cd ~/koishi/koishi-app && yarn upgrade
        ;;
      5)
        echo -e "${YELLOW}以开发模式启动...${NC}"
        cd ~/koishi/koishi-app && yarn dev
        ;;
      6)
        echo -e "${YELLOW}编译全部源码...${NC}"
        cd ~/koishi/koishi-app && yarn build
        ;;
      7)
        break
        ;;
      *)
        echo -e "${RED}无效选项，请重新选择!${NC}"
        sleep 1
        ;;
    esac
  done
}

# 主菜单
while true; do
  clear
  echo -e "${BLUE}Koishi 管理工具${NC}"
  echo "1. 安装依赖"
  echo "2. 创建 Koishi 项目"
  echo "3. Koishi 控制"
  echo "4. 退出"
  read -p "请选择操作 (1-4): " choice

  case $choice in
    1)
      install_dependencies
      ;;
    2)
      create_koishi_project
      ;;
    3)
      koishi_control_menu
      ;;
    4)
      echo -e "${GREEN}退出程序!${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}无效选项，请重新选择!${NC}"
      sleep 1
      ;;
  esac
done
