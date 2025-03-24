<?php // external\login\robot登录\white_list.php
header('Content-Type: application/json; charset=utf-8');

$appid = $_GET["appid"] ?? null;
$uin = $_GET["uin"] ?? null;
$uid = $_GET["uid"] ?? null;
$ticket = $_GET["ticket"] ?? null;

if (empty($appid) || empty($uin) || empty($uid) || empty($ticket)) {
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
$code = $data['retcode'];

if ($code != 0) {
    echo json_encode([
        "code" => -1,
        "msg" => "获取白名单失败",
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);
} else {
    $ipList = $data['data']['ip_white_infos']['prod']['ip_list'];
    echo json_encode([
        "code" => 0,
        "msg" => "获取成功",
        "data" => $ipList
    ], JSON_UNESCAPED_UNICODE);
}
?>