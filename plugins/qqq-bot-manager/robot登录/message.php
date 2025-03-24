<?php // external\login\robot登录\get_login.php
header('Content-Type: application/json; charset=utf-8');
$uin = !empty($_GET['uin']) ? $_GET['uin'] : '';
$quid = !empty($_GET['developerId']) ? $_GET['developerId'] : '';
$ticket = !empty($_GET['ticket']) ? $_GET['ticket'] : '';

$ch = curl_init();
// 设置请求的 URL
$url = "https://q.qq.com/pb/AppFetchPrivateMsg";

$headers = [
    "Content-Type: application/json",
    "Cookie: quin=$uin; quid=$quid; qticket=$ticket; developerId=$quid"
];
// 设置 POST 请求的数据
$postData = json_encode([
    "page_num" => 0,
    "page_size" => 9999,
    "receiver" => $quid,
    "appType" => 2
]);

// 设置 cURL 选项
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 如果需要跳过 SSL 验证，可以设置为 false
curl_setopt($ch, CURLOPT_ENCODING, "gzip"); // 启用 gzip 压缩支持

// 执行 cURL 请求
$response = curl_exec($ch);

// 检查是否有错误发生
if (curl_errno($ch)) {
    $formattedResponse = [
        "code" => -1,
        "messages" => [],
        "error" => "cURL Error: " . curl_error($ch)
    ];
} else {
    // 尝试解码 gzip 压缩的内容
    if (substr($response, 0, 3) === "\x1f\x8b\x08") { // 检查 gzip 标志
        $response = gzdecode($response);
    }

    // 解析 JSON 数据
    $data = json_decode($response, true);

    // 检查返回数据是否包含错误信息
    if (isset($data['code']) && $data['code'] != 0) {
        $formattedResponse = [
            "code" => -1,
            "messages" => [],
            "error" => "API Error: " . $data['message']
        ];
    } else {
        // 提取关键信息并清理 HTML 标签
        $formattedResponse = [
            "code" => 0,
            "messages" => []
        ];
        if (isset($data['data']['privateMsgs']) && is_array($data['data']['privateMsgs'])) {
            foreach ($data['data']['privateMsgs'] as $msg) {
                // 替换 content 中的链接为 
                $content = strip_tags($msg['content']); // 去掉 HTML 标签
                $content = preg_replace('/https?:\/\/[^\s]+/', '', $content); // 替换链接为 
                $content = preg_replace('/\[查看详情\]\(/', '', $content);

                $formattedResponse["messages"][] = [ // 将消息添加到 messages 数组
                    "title" => strip_tags($msg['title']), // 去掉 HTML 标签
                    "content" => $content, // 替换后的 content
                    "send_time" => date("Y-m-d H:i:s", $msg['send_time']) // 格式化时间
                ];
            }
        }

        // 添加总数和未读数
        $formattedResponse["total_count"] = $data['data']['total_count'];
        $formattedResponse["unread_count"] = $data['data']['unread_count'];
    }
}

// 输出格式化后的 JSON 数据
echo json_encode($formattedResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// 关闭 cURL 会话
curl_close($ch);
?>