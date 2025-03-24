<?php // external\login\robot登录\verify.php
header('Content-Type: application/json; charset=utf-8');

$appid = $_GET["appid"] ?? null;
$uin = $_GET["uin"] ?? null;
$uid = $_GET["uid"] ?? null;
$ticket = $_GET["ticket"] ?? null;
$qrcode = $_GET["qrcode"] ?? null;

if (empty($appid) || empty($uin) || empty($uid) || empty($ticket) || empty($qrcode)) {
    echo json_encode([
        "code" => 400,
        "msg" => "参数不完整"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = "https://q.qq.com/qrcode/get";
$headers = [
    "content-type: application/json",
    "Cookie: quin={$uin}; quid={$uid}; qticket={$ticket}",
];
$data = [
    "qrcode" => $qrcode
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
        "msg" => "CURL错误：" . curl_error($ch)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

if (isset($data['code']) && $data['code'] == 0) {
    echo json_encode([
        "code" => 0,
        "msg" => "授权成功"
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        "code" => -1,
        "msg" => "未授权"
    ], JSON_UNESCAPED_UNICODE);
}
?>