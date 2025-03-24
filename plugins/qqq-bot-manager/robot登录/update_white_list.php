<?php // external\login\robot登录\update_white_list.php
header('Content-Type: application/json; charset=utf-8');

$appid = $_GET["appid"] ?? null;
$uin = $_GET["uin"] ?? null;
$uid = $_GET["uid"] ?? null;
$ticket = $_GET["ticket"] ?? null;
$qrcode = $_GET["qrcode"] ?? null;
$ip = $_GET["ip"] ?? null;
$action = $_GET["action"] ?? null;

if (empty($appid) || empty($uin) || empty($uid) || empty($ticket) || empty($qrcode) || empty($ip) || empty($action)) {
    echo json_encode([
        "code" => 400,
        "msg" => "参数不完整"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = "https://bot.q.qq.com/cgi-bin/dev_info/white_ip_config?bot_appid={$appid}";
$headers = [
    "content-type: application/json",
    "Cookie: quin={$uin}; quid={$uid}; qticket={$ticket}",
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_ENCODING, "gzip, deflate, br");
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode([
        "code" => 500,
        "msg" => "CURL错误：" . curl_error($ch)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
curl_close($ch);

$data = json_decode($response, true);
if ($data['retcode'] !== 0) {
    echo json_encode([
        "code" => 500,
        "msg" => ($action === 'add') ? "获取白名单失败：无法新增 IP" : "获取白名单失败：无法删除 IP"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$ipList = $data['data']['ip_white_infos']['prod']['ip_list'] ?? [];

if ($action === 'add') {
    if (!in_array($ip, $ipList, true)) {
        $ipList[] = $ip;
    } else {
        echo json_encode([
            "code" => 409,
            "msg" => "IP 已存在于白名单中"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} elseif ($action === 'del') {
    if (in_array($ip, $ipList, true)) {
        $key = array_search($ip, $ipList, true);
        if ($key !== false) {
            unset($ipList[$key]);
        }
    } else {
        echo json_encode([
            "code" => 404,
            "msg" => "IP 不在白名单中"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} else {
    echo json_encode([
        "code" => 400,
        "msg" => "无效的操作"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$ipList = array_values($ipList);
$data = [
    "bot_appid" => $appid,
    "ip_white_infos" => [
        "prod" => [
            "ip_list" => $ipList,
            "use" => true
        ]
    ],
    "qr_code" => $qrcode
];

$url = "https://bot.q.qq.com/cgi-bin/dev_info/update_white_ip_config";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_UNESCAPED_UNICODE));
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode([
        "code" => 500,
        "msg" => "CURL错误：" . curl_error($ch)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
curl_close($ch);

$result = json_decode($response, true);
if ($result['retcode'] !== 0) {
    echo json_encode([
        "code" => -1,
        "msg" => ($action === 'add') ? "新增失败" : "删除失败"
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        "code" => 0,
        "msg" => ($action === 'add') ? "新增成功" : "删除成功"
    ], JSON_UNESCAPED_UNICODE);
}
?>