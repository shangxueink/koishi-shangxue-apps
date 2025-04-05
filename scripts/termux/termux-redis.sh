#!/bin/bash

# 检查并安装 dialog 工具
if ! command -v dialog &> /dev/null; then
    pkg install dialog -y
fi

# Redis 安装目录
REDIS_DIR="$HOME/Redis"

# 默认端口
DEFAULT_PORT=6379

# 最大尝试端口
MAX_PORT=6389

# 日志函数 (可选)
log() {
    local message="$1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $message" >> "$REDIS_DIR/redis-manager.log"
}

# 安装 Redis
install_redis() {
    if [ -d "$REDIS_DIR" ]; then
        dialog --msgbox "Redis 目录已存在: $REDIS_DIR" 6 50
        return 1
    fi

    if ! dialog --clear --backtitle "Redis Manager" \
                --title "安装 Redis" \
                --yesno "确定要安装 Redis 吗？" 7 50; then
        return 1
    fi

    pkg install redis -y
    mkdir -p "$REDIS_DIR"
    cp /data/data/com.termux/files/usr/etc/redis.conf "$REDIS_DIR/redis.conf"

    # 修改 redis.conf (允许所有IP连接，关闭保护模式，设置空密码)
    sed -i 's/bind 127.0.0.1/bind 0.0.0.0/g' "$REDIS_DIR/redis.conf"  # 允许所有 IP 连接
    sed -i 's/protected-mode yes/protected-mode no/g' "$REDIS_DIR/redis.conf"  # 关闭保护模式
    sed -i 's/# requirepass foobared/requirepass ""/g' "$REDIS_DIR/redis.conf" # 设置空密码
    sed -i 's/requirepass foobared/requirepass ""/g' "$REDIS_DIR/redis.conf" # 如果没有注释，直接替换

    # 设置默认端口
    sed -i "s/port 6379/port $DEFAULT_PORT/g" "$REDIS_DIR/redis.conf"

    dialog --msgbox "Redis 安装完成！配置文件位于: $REDIS_DIR/redis.conf" 8 60
}

# 启动 Redis
start_redis() {
    if [ ! -f "$REDIS_DIR/redis.conf" ]; then
        dialog --msgbox "Redis 配置文件不存在: $REDIS_DIR/redis.conf" 6 50
        return 1
    fi

    # 获取当前端口
    local current_port=$(grep "^port" "$REDIS_DIR/redis.conf" | awk '{print $2}')
    local port=$current_port

    # 检查端口是否可用，如果不可用则递增端口
    local max_port=$MAX_PORT
    while true; do
        if ! netstat -tulnp | grep ":$port " > /dev/null; then
            break # 端口可用
        fi
        if [ "$port" -ge "$max_port" ]; then
            dialog --msgbox "端口 $current_port 到 $max_port 都被占用，无法启动 Redis！" 6 50
            return 1
        fi
        port=$((port + 1))
    done

    # 如果端口被占用，更新配置文件
    if [ "$port" != "$current_port" ]; then
        sed -i "s/port $current_port/port $port/g" "$REDIS_DIR/redis.conf"
        dialog --msgbox "端口 $current_port 被占用，已自动切换到端口 $port！" 6 50
    fi

    # 启动 Redis (前台运行，不返回 TUI)
    clear
    echo "---------------------------------------------------------"
    echo "正在启动 Redis，请勿关闭此终端窗口..."
    # echo "当前运行地址：127.0.0.1:$port"  #  好像这里的 $port 打印不出来啊
    echo "Termux用户请按【音量下键】，切换其他会话，以保持此会话后台运行"
    echo "---------------------------------------------------------"
    redis-server "$REDIS_DIR/redis.conf"
    echo "Redis 已停止。"
    #confirm_return # 前台运行，不再返回 TUI
}

# 停止 Redis
stop_redis() {
    if ! pgrep -f "$REDIS_DIR/redis.conf" > /dev/null; then
        dialog --msgbox "Redis 未在运行！" 6 50
        return 1
    fi

    # 获取当前端口
    local current_port=$(grep "^port" "$REDIS_DIR/redis.conf" | awk '{print $2}')

    redis-cli -p "$current_port" shutdown  # 无需密码
    dialog --infobox "Redis 正在停止..." 3 30; sleep 1
    if pgrep -f "$REDIS_DIR/redis.conf" > /dev/null; then
        dialog --msgbox "Redis 停止失败，请检查日志。" 6 50
    else
        dialog --msgbox "Redis 已停止！" 6 50
    fi
}

# 检查redis状态
check_redis_status() {
    if pgrep -f "$REDIS_DIR/redis.conf" > /dev/null; then
        dialog --msgbox "Redis 正在运行中！" 6 50
    else
        dialog --msgbox "Redis 未运行。" 6 50
    fi
}

# 修改端口
change_port() {
    # 获取当前端口
    local current_port=$(grep "^port" "$REDIS_DIR/redis.conf" | awk '{print $2}')

    new_port=$(dialog --clear --backtitle "Redis Manager" \
                       --title "修改端口" \
                       --inputbox "请输入新的 Redis 端口 (1024-$MAX_PORT):" 8 60 "$current_port" 3>&1 1>&2 2>&3)

    if [ -z "$new_port" ]; then
        return 1 # 用户取消
    fi

    if ! [[ "$new_port" =~ ^[0-9]+$ ]]; then
        dialog --msgbox "端口必须是数字！" 6 50
        return 1
    fi

    if (( "$new_port" < 1024 || "$new_port" > "$MAX_PORT" )); then
        dialog --msgbox "端口必须在 1024 到 $MAX_PORT 之间！" 6 50
        return 1
    fi

    sed -i "s/port $current_port/port $new_port/g" "$REDIS_DIR/redis.conf"
    dialog --msgbox "Redis 端口已修改为 $new_port！" 6 50
}

# 确认操作函数
function confirm_return {
    echo "--------------------------------------------------"
    read -n 1 -s -r -p "执行完成。按 任意 键返回主菜单..."
    echo
    read -n 1 -s -r -p "再按 任意 键返回主菜单..."
    echo
    echo
}


# 主菜单
main_menu() {
    while true; do
        choice=$(dialog --clear --backtitle "Redis Manager" \
                        --title "主菜单" \
                        --menu "请选择一个操作：" 18 60 10 \
                        1 "安装 Redis" \
                        2 "启动 Redis" \
                        3 "停止 Redis" \
                        4 "检查redis状态" \
                        5 "修改端口" \
                        6 "退出" \
                        3>&1 1>&2 2>&3)

        case $choice in
            1)
                install_redis
                ;;
            2)
                start_redis
                ;;
            3)
                stop_redis
                ;;
            4)
                check_redis_status
                ;;
            5)
                change_port
                ;;
            6)
                exit 0
                ;;
            *)
                dialog --infobox "无效选项，请重新选择..." 3 30; sleep 1
                ;;
        esac
    done
}

# 启动主菜单
main_menu