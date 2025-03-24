<?php // external\login\robot登录\robot.php
header('Content-Type: application/json; charset=utf-8');
// 获取 GET 参数
$qrcode = !empty($_GET['qrcode']) ? $_GET['qrcode'] : '';
$action = !empty($_GET['action']) ? $_GET['action'] : '';

// 初始化 cURL 会话
$ch = curl_init();

// 设置请求的 URL
$url = "https://q.qq.com/qrcode/get";

// 设置请求头
$headers = [
    "Host: q.qq.com",
    "Connection: keep-alive",
    "Content-Length: 53",
    "Cache-Control: max-age=0",
    "User-Agent: Mozilla/5.0 (Linux; U; Android 14; zh-cn; 22122RK93C Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 XiaoMi/MiuiBrowser/17.8.220115 swan-mibrowser",
    "Content-Type: application/json",
    "Accept: */*",
    "Origin: https://q.qq.com",
    "Sec-Fetch-Site: same-origin",
    "Sec-Fetch-Mode: cors",
    "Sec-Fetch-Dest: empty",
    "Referer: https://q.qq.com/",
    "Accept-Encoding: gzip, deflate, br",
    "Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cookie: eas_sid=41m7Z1K8d1o9I7K9p1K6B6r7u7; pgv_pvid=8447256215; _qimei_uuid42=1860c150c11100118f57abcef9fe9d1aaa7fad2094; _qimei_fingerprint=0eb7ffa5149be8fd41edb5fe28473fbf; _qimei_q36=; _qimei_h38=0fc61a988f57abcef9fe9d1a0100000141860c; tokenParams=%3FADTAG%3Dpvp.storyweb; pvpqqcomrouteLine=index_mindex_heroDetail_ip_ip_a20161115tyf_a20161115tyf; pgv_info=ssid=s4776604380&pgvReferrer=; ts_uid=9383740967; skey=@I9cmbJV4t; uin=o366799772; idt=1729623102; qm_authimgs_id=0; qm_verifyimagesession=h01b026f63fc01f319c611481e87e3f18c7beab2ee160c32788cad85b6c5dd5f5d33cecd2535fc66af7"
];

// 设置 POST 请求的数据
$postData = json_encode(["qrcode" => $qrcode]);

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
    echo json_encode(["code" => 500, "message" => "cURL Error: " . curl_error($ch)], JSON_UNESCAPED_UNICODE);
    exit;
}

// 尝试解码 gzip 压缩的内容
if (substr($response, 0, 3) === "\x1f\x8b\x08") { // 检查 gzip 标志
    $response = gzdecode($response);
}

// 如果未传入 action 参数，则直接返回原始响应内容
if (empty($action)) {
    echo $response; // 直接返回原始响应内容
    exit;
}

// 解析响应内容
$responseData = json_decode($response, true);

// 从响应中获取必要的参数（假设参数在 data 字段中）
if (isset($responseData['data'])) {
    $innerData0 = $responseData['data'];
    $innerData = $innerData0['data'];
    $uin = isset($innerData['uin']) ? $innerData['uin'] : '';
    $quid = isset($innerData['developerId']) ? $innerData['developerId'] : '';
    $ticket = isset($innerData['ticket']) ? $innerData['ticket'] : '';
    $appid = isset($innerData['appId']) ? $innerData['appId'] : '';
} else {
    echo json_encode(["code" => 400, "message" => "响应格式错误，未找到 data 字段"], JSON_UNESCAPED_UNICODE);
    exit;
}

// 检查是否获取到必要的参数
if (empty($uin) || empty($quid) || empty($ticket) || empty($appid)) {
    echo json_encode(["code" => 400, "message" => "登录状态获取失败，未获取到必要的参数（uin、developerId、ticket、appid）"], JSON_UNESCAPED_UNICODE);
    exit;
}
switch ($action) {
    case 'bot列表':
        // 构造请求 URL
        $requestUrl = "https://yan.gsiot.top/yz/robot/bot.php?uin=" . urlencode($uin) .
                      "&developerId=" . urlencode($quid) .
                      "&ticket=" . urlencode($ticket);
        break;

    case '通知':
        // 构造请求 URL
        $requestUrl = "https://yan.gsiot.top/yz/robot/msg.php?uin=" . urlencode($uin) .
                      "&developerId=" . urlencode($quid) .
                      "&ticket=" . urlencode($ticket);
        break;

    case '数据':
        // 构造请求 URL
        $requestUrl = "https://yan.gsiot.top/yz/robot/data.php?uin=" . urlencode($uin) .
                      "&developerId=" . urlencode($quid) .
                      "&ticket=" . urlencode($ticket) .
                      "&type=1&appid=" . urlencode($appid);
        break;

    case '群聊数据':
        // 构造请求 URL
        $requestUrl = "https://yan.gsiot.top/yz/robot/data.php?uin=" . urlencode($uin) .
                      "&developerId=" . urlencode($quid) .
                      "&ticket=" . urlencode($ticket) .
                      "&type=2&appid=" . urlencode($appid);
        break;

    case '单聊数据':
        // 构造请求 URL
        $requestUrl = "https://yan.gsiot.top/yz/robot/data.php?uin=" . urlencode($uin) .
                      "&developerId=" . urlencode($quid) .
                      "&ticket=" . urlencode($ticket) .
                      "&type=3&appid=" . urlencode($appid);
        break;

    default:
        echo json_encode(["code" => 400, "message" => "未知的操作类型，目前仅支持 bot列表、通知、数据、群聊数据、单聊数据"], JSON_UNESCAPED_UNICODE);
        exit;
}

// 初始化新的 cURL 会话
$secondCh = curl_init();

// 设置新的请求 URL
curl_setopt($secondCh, CURLOPT_URL, $requestUrl);
curl_setopt($secondCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($secondCh, CURLOPT_SSL_VERIFYPEER, false); // 如果需要跳过 SSL 验证，可以设置为 false

// 执行新的 cURL 请求
$secondResponse = curl_exec($secondCh);

// 检查是否有错误发生
if (curl_errno($secondCh)) {
    echo json_encode(["code" => 500, "message" => "cURL Error: " . curl_error($secondCh)], JSON_UNESCAPED_UNICODE);
} else {
    // 输出响应内容
    echo $secondResponse;
}

// 关闭新的 cURL 会话
curl_close($secondCh);

// 关闭第一个 cURL 会话
curl_close($ch);