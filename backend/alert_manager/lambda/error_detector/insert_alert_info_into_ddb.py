import json
import os
import uuid

import boto3
from boto3.dynamodb.conditions import Key

dynamoDB = boto3.resource("dynamodb")
ALERT_INFO_TABLE_NAME = os.environ["ALERT_INFO_TABLE_NAME"]
ERROR_CODE_TABLE_NAME = os.environ["ERROR_CODE_TABLE_NAME"]


def handler(event, context):
    try:
        # JSTをUTCに変換
        timestamp = event.get("timestamp")
        error_code = str(event.get("error"))

        response = insert_alert_info(
            ALERT_INFO_TABLE_NAME,
            ERROR_CODE_TABLE_NAME,
            timestamp,
            error_code,
        )
        return {
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(response),
        }
    except Exception as e:
        # 全体の一般的なエラー処理
        # 今回はprintするだけ
        print(e)
        raise e


def insert_alert_info(
    alert_info_table_name: str,
    error_code_table_name: str,
    timestamp: str,
    error_code: str,
):
    alert_info_table = dynamoDB.Table(alert_info_table_name)
    error_code_table = dynamoDB.Table(error_code_table_name)

    # エラー情報を取得
    try:
        error_info = error_code_table.query(
            KeyConditionExpression=Key("error_code").eq(error_code)
        )["Items"][0]
    except IndexError as e:
        # IndexErrorのみを処理
        # その他、「dynamodbにアイテムをinsertする」処理で想定が難しいエラーは呼び出し元に処理を移譲する
        msg = "[ERROR] This error code is not in Error DB: {}".format(e)
        print(msg)
        raise e

    # alert_id となる UUID を発行
    alert_id = str(uuid.uuid4())
    opened_at = timestamp
    closed_at = ""
    status = "OPEN"
    severity = error_info["severity"]
    category = error_info["category"]
    detail = error_info["alert_detail"] + "\n" + error_info["invoke_condition"]
    tag_name = error_info["tag_name"]
    tag_description = error_info["tag_description"]
    closed_by = ""
    comment = ""
    conversation_id = ""
    meetingids = []
    conversation = { "messages" : [] }
    alert_info = {
        "id": alert_id,
        "openedAt": opened_at,
        "closedAt": closed_at,
        "status": status,
        "severity": severity,
        "category": category,
        "detail": detail,
        "name": tag_name,
        "description": tag_description,
        "closedBy": closed_by,
        "comment": comment,
        "conversation_id": conversation_id,
        "conversation": conversation,
        "meetingIds": [],
    }

    response = alert_info_table.put_item(Item=alert_info)

    return response
