<?php // external\login\robot登录\white_login.php
header('Content-Type: application/json; charset=utf-8');

$appid = $_GET["appid"] ?? null;
$uin = $_GET["uin"] ?? null;
$uid = $_GET["uid"] ?? null;
$ticket = $_GET["ticket"] ?? null;

if (empty($appid) || empty($uin) || empty($uid) || empty($ticket)) {
    echo json_encode([
        "code" => 400,
        "msg" => "参数不完整",
        "qrcode" => null,
        "url" => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = "https://q.qq.com/qrcode/create";
$headers = [
    "Content-Type: application/json",
    "Cookie: quin={$uin}; quid={$uid}; qticket={$ticket}",
];
$data = [
    "type" => 51,
    "miniAppId" => $appid
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode([
        "code" => 500,
        "msg" => "CURL错误：" . curl_error($ch),
        "qrcode" => null,
        "url" => null
    ], JSON_UNESCAPED_UNICODE);
    curl_close($ch);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

if (isset($data['data']['QrCode'])) {
    $qrCode = $data['data']['QrCode'];
    $generatedUrl = "https://q.qq.com/qrcode/check?client=qq&code=" . $qrCode . "&ticket=" . $ticket;
    echo json_encode([
        "code" => 0,
        "msg" => "获取成功",
        "qrcode" => $qrCode,
        "url" => $generatedUrl
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        "code" => -1,
        "msg" => "获取链接失败",
        "qrcode" => null,
        "url" => null
    ], JSON_UNESCAPED_UNICODE);
}
?>