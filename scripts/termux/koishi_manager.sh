#!/bin/bash

# Koishi Manager for Termux
# Version: 1.0

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 清屏函数
clear_screen() {
  clear
}

# 显示标题
show_title() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${PURPLE}     Koishi Termux 管理器     ${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo ""
}

# 确保 koishi 目录存在
ensure_koishi_dir() {
  if [ ! -d "$HOME/koishi" ]; then
    echo -e "${YELLOW}创建 koishi 目录...${NC}"
    mkdir -p $HOME/koishi
  fi
}

# 执行命令并显示结果
execute_command() {
  echo -e "${GREEN}执行命令: $1${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  eval "$1"
  echo -e "${YELLOW}----------------------------------------${NC}"
  echo -e "${GREEN}命令执行完成!${NC}"
  echo ""
  read -n 1 -s -r -p "按任意键继续..."
}

# 安装基础依赖
install_dependencies() {
  clear_screen
  show_title
  echo -e "${BLUE}正在安装基础依赖...${NC}"
  
  execute_command "pkg i x11-repo -y"
  execute_command "pkg rei tur-repo -y"
  execute_command "pkg rei libexpat -y"
  execute_command "pkg i chromium -y"
  execute_command "pkg i ffmpeg -y"
  execute_command "pkg i nodejs-lts -y"
  execute_command "npm config set registry https://registry.npmmirror.com"
  execute_command "npm i -g yarn"
  execute_command "yarn config set registry https://registry.npmmirror.com"
  
  echo -e "${GREEN}基础依赖安装完成!${NC}"
  read -n 1 -s -r -p "按任意键继续..."
}

# 创建 Koishi 项目
create_koishi_project() {
  clear_screen
  show_title
  echo -e "${BLUE}正在创建 Koishi 项目...${NC}"
  
  ensure_koishi_dir
  cd $HOME/koishi
  
  execute_command "cd $HOME/koishi && yarn create koishi << EOF




EOF"
  
  echo -e "${GREEN}Koishi 项目创建完成!${NC}"
  read -n 1 -s -r -p "按任意键继续..."
}

# 启动 Koishi
start_koishi() {
  clear_screen
  show_title
  echo -e "${BLUE}正在启动 Koishi...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && yarn start"
}

# 整理依赖
organize_dependencies() {
  clear_screen
  show_title
  echo -e "${BLUE}正在整理依赖...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && yarn"
}

# 重装依赖
reinstall_dependencies() {
  clear_screen
  show_title
  echo -e "${BLUE}正在重装依赖...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && rm -rf node_modules && > yarn.lock && yarn install"
}

# 升级全部依赖
upgrade_dependencies() {
  clear_screen
  show_title
  echo -e "${BLUE}正在升级全部依赖...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && yarn upgrade-interactive --latest"
}

# 开发模式启动
start_dev_mode() {
  clear_screen
  show_title
  echo -e "${BLUE}正在以开发模式启动 Koishi...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && yarn dev"
}

# 编译全部源码
build_source() {
  clear_screen
  show_title
  echo -e "${BLUE}正在编译全部源码...${NC}"
  
  ensure_koishi_dir
  execute_command "cd $HOME/koishi/koishi-app && yarn build"
}

# 显示主菜单
show_main_menu() {
  clear_screen
  show_title
  
  local options=("安装基础依赖 (安装 Chromium、Node.js、Yarn 等)" 
                "创建 Koishi 项目 (执行 yarn create koishi)" 
                "Koishi 管理" 
                "退出")
  local current=0
  
  # 显示菜单
  display_menu() {
    for i in "${!options[@]}"; do
      if [ $i -eq $current ]; then
        echo -e "${GREEN}> ${options[$i]}${NC}"
      else
        echo -e "  ${options[$i]}"
      fi
    done
  }
  
  # 显示初始菜单
  display_menu
  
  # 处理按键
  while true; do
    read -s -n 1 key
    
    # 检测箭头键
    if [[ $key = $'\e' ]]; then
      read -s -n 2 -t 0.1 key
      if [[ $key = '[A' ]]; then  # 上箭头
        ((current--))
        if [ $current -lt 0 ]; then
          current=$((${#options[@]}-1))
        fi
      elif [[ $key = '[B' ]]; then  # 下箭头
        ((current++))
        if [ $current -ge ${#options[@]} ]; then
          current=0
        fi
      fi
      
      # 重新显示菜单
      clear_screen
      show_title
      display_menu
    elif [[ $key = '' ]]; then  # 回车键
      case $current in
        0) install_dependencies; break;;
        1) create_koishi_project; break;;
        2) show_koishi_menu; break;;
        3) exit 0;;
      esac
    fi
  done
}

# 显示 Koishi 管理菜单
show_koishi_menu() {
  clear_screen
  show_title
  
  local options=("启动 Koishi (cd koishi/koishi-app && yarn start)" 
                "整理依赖 (cd koishi/koishi-app && yarn)" 
                "重装依赖 (cd koishi/koishi-app && rm -rf node_modules && > yarn.lock && yarn install)" 
                "升级全部依赖 (cd koishi/koishi-app && yarn upgrade-interactive --latest)" 
                "开发模式启动 (cd koishi/koishi-app && yarn dev)" 
                "编译全部源码 (cd koishi/koishi-app && yarn build)"
                "返回主菜单")
  local current=0
  
  # 显示菜单
  display_menu() {
    for i in "${!options[@]}"; do
      if [ $i -eq $current ]; then
        echo -e "${GREEN}> ${options[$i]}${NC}"
      else
        echo -e "  ${options[$i]}"
      fi
    done
  }
  
  # 显示初始菜单
  display_menu
  
  # 处理按键
  while true; do
    read -s -n 1 key
    
    # 检测箭头键
    if [[ $key = $'\e' ]]; then
      read -s -n 2 -t 0.1 key
      if [[ $key = '[A' ]]; then  # 上箭头
        ((current--))
        if [ $current -lt 0 ]; then
          current=$((${#options[@]}-1))
        fi
      elif [[ $key = '[B' ]]; then  # 下箭头
        ((current++))
        if [ $current -ge ${#options[@]} ]; then
          current=0
        fi
      fi
      
      # 重新显示菜单
      clear_screen
      show_title
      display_menu
    elif [[ $key = '' ]]; then  # 回车键
      case $current in
        0) start_koishi; break;;
        1) organize_dependencies; break;;
        2) reinstall_dependencies; break;;
        3) upgrade_dependencies; break;;
        4) start_dev_mode; break;;
        5) build_source; break;;
        6) show_main_menu; return;;
      esac
    fi
  done
  
  # 返回到 Koishi 管理菜单
  show_koishi_menu
}

# 主程序入口
main() {
  # 检查 Termux 环境
  if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${RED}错误: 此脚本只能在 Termux 环境中运行!${NC}"
    exit 1
  fi
  
  # 显示主菜单
  show_main_menu
}

# 运行主程序
main
