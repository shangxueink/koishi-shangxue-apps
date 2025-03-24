<?php // external\login\robot登录\bot_data.php
header('Content-Type: application/json; charset=utf-8');
// 获取 GET 参数
$uin = !empty($_GET['uin']) ? $_GET['uin'] : '';
$quid = !empty($_GET['developerId']) ? $_GET['developerId'] : '';
$ticket = !empty($_GET['ticket']) ? $_GET['ticket'] : '';
$appid = !empty($_GET['appid']) ? $_GET['appid'] : '';
$type = !empty($_GET['type']) ? intval($_GET['type']) : 1; // 默认值为 1

// 初始化 cURL 会话
$ch = curl_init();

// 根据 type 参数设置请求的 URL
$data_type = $type == 2 ? 2 : ($type == 3 ? 3 : 1); // 根据 type 设置 data_type
$url = "https://bot.q.qq.com/cgi-bin/datareport/read?bot_appid=$appid&data_type={$data_type}&data_range=0&scene_id=1";

$headers = [
    "Content-Type: application/json",
    "Cookie: quin=$uin; quid=$quid; qticket=$ticket; developerId=$quid"
];
// 设置 cURL 选项
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 如果需要跳过 SSL 验证，可以设置为 false
curl_setopt($ch, CURLOPT_ENCODING, "gzip"); // 启用 gzip 压缩支持

// 执行 cURL 请求
$response = curl_exec($ch);

// 检查是否有错误发生
if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch);
} else {
    // 尝试解码 gzip 压缩的内容
    if (substr($response, 0, 3) === "\x1f\x8b\x08") { // 检查 gzip 标志
        $response = gzdecode($response);
    }

    // 解析响应内容
    $responseData = json_decode($response, true);

    // 根据 type 参数选择翻译函数
    if ($type == 2) {
        $translatedResponse = translateResponse($responseData); // 使用原有翻译逻辑
    } elseif ($type == 3) {
        $translatedResponse = translateFriendResponse($responseData); // 使用新的翻译逻辑（针对 type=3）
    } else {
        $translatedResponse = translateNewResponse($responseData); // 默认使用新的翻译逻辑（针对 type=1）
    }

    // 输出翻译后的响应内容
    echo json_encode($translatedResponse, JSON_UNESCAPED_UNICODE);
}

// 关闭 cURL 会话
curl_close($ch);

// 原有的翻译函数
function translateResponse($data) {
    if (isset($data['retcode']) && $data['retcode'] == 0) {
        $data['msg'] = "成功";
        if (isset($data['data'])) {
            foreach ($data['data']['group_data'] as &$group) {
                $group['报告日期'] = $group['report_date'];
                $group['现有群组'] = $group['existing_groups'];
                $group['已使用群组'] = $group['used_groups'];
                $group['新增群组'] = $group['added_groups'];
                $group['移除群组'] = $group['removed_groups'];
                unset($group['report_date'], $group['existing_groups'], $group['used_groups'], $group['added_groups'], $group['removed_groups']);
            }
        }
    } else {
        $data['msg'] = "失败: " . $data['msg'];
    }
    return $data;
}

// 新的翻译函数（针对 type=1）
function translateNewResponse($data) {
    if (isset($data['retcode']) && $data['retcode'] == 0) {
        $data['msg'] = "成功";
        if (isset($data['data'])) {
            foreach ($data['data']['msg_data'] as &$msg) {
                $msg['报告日期'] = $msg['report_date'];
                $msg['上行消息量'] = $msg['up_msg_cnt'];
                $msg['上行消息人数'] = $msg['up_msg_uv'];
                $msg['下行消息量'] = $msg['down_msg_cnt'];
                $msg['被动消息数'] = $msg['down_passive_msg_cnt'];
                $msg['主动消息数'] = $msg['down_initiative_msg_cnt'];
                $msg['内联消息数'] = $msg['inline_msg_cnt'];
                $msg['总消息量'] = $msg['bot_msg_cnt'];
                $msg['对话用户次日留存'] = $msg['next_day_retention'];
                $msg['场景名称'] = $msg['scene_name'];
                unset($msg['report_date'], $msg['up_msg_cnt'], $msg['up_msg_uv'], $msg['down_msg_cnt'], $msg['down_passive_msg_cnt'], $msg['down_initiative_msg_cnt'], $msg['inline_msg_cnt'], $msg['bot_msg_cnt'], $msg['next_day_retention'], $msg['scene_name']);
            }
        }
    } else {
        $data['msg'] = "失败: " . $data['msg'];
    }
    return $data;
}
// 新的翻译函数（针对 type=3，翻译 friend_data）
function translateFriendResponse($data) {
    if (isset($data['retcode']) && $data['retcode'] == 0) {
        $data['msg'] = "成功";
        if (isset($data['data'])) {
            foreach ($data['data']['friend_data'] as &$friend) {
                $friend['报告日期'] = $friend['report_date'];
                $friend['现有好友数'] = $friend['stock_added_friends'];
                $friend['已使用好友数'] = $friend['used_friends'];
                $friend['新增好友数'] = $friend['new_added_friends'];
                $friend['移除好友数'] = $friend['new_removed_friends'];
                // 删除原始字段
                unset($friend['report_date'], $friend['stock_added_friends'], $friend['used_friends'], $friend['new_added_friends'], $friend['new_removed_friends']);
            }
        }
    } else {
        $data['msg'] = "失败: " . $data['msg'];
    }
    return $data;
}
?>