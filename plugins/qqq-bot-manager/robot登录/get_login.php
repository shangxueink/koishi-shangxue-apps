<?php // external\login\robot登录\get_login.php
header('Content-Type: application/json; charset=utf-8');
// 初始化 cURL 会话
$ch = curl_init();

// 设置请求的 URL
$url = "https://q.qq.com/qrcode/create";

// 设置请求头
$headers = [
    "Host: q.qq.com",
    "Connection: keep-alive",
    "Content-Length: 14",
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
    "Cookie: eas_sid=41m7Z1K8d1o9I7K9p1K6B6r7u7; pgv_pvid=8447256215; _qimei_uuid42=1860c150c11100118f57abcef9fe9d1aaa7fad2094; _qimei_fingerprint=0eb7ffa5149be8fd41edb5fe28473fbf; _qimei_q36=; _qimei_h38=0fc61a988f57abcef9fe9d1a0100000141860c; tokenParams=%3FADTAG%3Dpvp.storyweb; pvpqqcomrouteLine=index_mindex_heroDetail_ip_ip_a20161115tyf_a20161115tyf; pgv_info=ssid=s4776604380&pgvReferrer=; ts_uid=9383740967; skey=@I9cmbJV4t; uin=o366799772; idt=1729623102; qm_authimgs_id=0; qm_verifyimagesession=h01b026f63fc01f319c611481e87e3f18c7beab2ee160c32788cad85b6c5dd5f5d33cecd2535fc66af7; video_omgid=59756bf7414e459bc7abf864bd73ebe6; vversion_name=8.5.50; sd_userid=45631734844062070; ptui_loginuin=366799772; ied_qq=o0366799772; pt2gguin=o0366799772"
];

// 设置 POST 请求的数据
$postData = '{"type":"777"}';

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
    $result = [
        "status" => "error",
        "message" => "cURL Error: " . curl_error($ch)
    ];
} else {
    // 尝试解码 gzip 压缩的内容
    if (substr($response, 0, 3) === "\x1f\x8b\x08") { // 检查 gzip 标志
        $response = gzdecode($response);
    }

    // 将响应内容解析为 JSON
    $responseData = json_decode($response, true);

    // 检查是否成功获取 QrCode 参数
    if (isset($responseData['data']['QrCode'])) {
        $qrcode = $responseData['data']['QrCode'];
        // 构造新的 URL，不进行 URL 编码
        $finalUrl = "https://q.qq.com/login/applist?client=qq&code=" . $qrcode . "&ticket=null";
        $result = [
            "status" => "success",
            "url" => $finalUrl,
            "qr" => $qrcode
        ];
    } else {
        $result = [
            "status" => "error",
            "message" => "QrCode parameter not found in response."
        ];
    }
}

// 关闭 cURL 会话
curl_close($ch);

// 返回 JSON 格式的结果，不编码链接和中文
header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
?>