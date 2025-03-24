<?php // external\login\robot登录\bot_list.php
header('Content-Type: application/json; charset=utf-8');
$uin = !empty($_GET['uin']) ? $_GET['uin'] : '';
$quid = !empty($_GET['developerId']) ? $_GET['developerId'] : '';
$ticket = !empty($_GET['ticket']) ? $_GET['ticket'] : '';
// 初始化 cURL 会话
$ch = curl_init();

$url = "https://q.qq.com/homepagepb/GetAppListForLogin";

// 设置请求头
$headers = [
    "Content-Type: application/json",
    "Cookie: quin=$uin; quid=$quid; qticket=$ticket; developerId=$quid"
];
// 设置 POST 请求的数据
$postData = json_encode([
    "uin" => $uin,
    "developer_id" => $quid,
    "ticket" => $ticket,
    "app_type" => [2]
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
    echo "cURL Error: " . curl_error($ch);
} else {
    // 尝试解码 gzip 压缩的内容
    if (substr($response, 0, 3) === "\x1f\x8b\x08") { // 检查 gzip 标志
        $response = gzdecode($response);
    }

    // 输出响应内容
    echo  $response;
}

// 关闭 cURL 会话
curl_close($ch);
?>