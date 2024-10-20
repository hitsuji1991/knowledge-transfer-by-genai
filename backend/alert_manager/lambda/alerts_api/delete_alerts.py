import json
import os
from http import HTTPMethod, HTTPStatus

import boto3

dynamoDB = boto3.resource("dynamodb")


def handler(event, context):
    status_code = HTTPStatus.OK
    TABLE_NAME = os.environ["TABLE_NAME"]
    table = dynamoDB.Table(TABLE_NAME)

    # HTTP Method のチェック
    if event["httpMethod"] != HTTPMethod.DELETE:
        status_code = HTTPStatus.METHOD_NOT_ALLOWED
        return {
            "statusCode": status_code,
            "headers": {"Content-Type": "text/plain"},
        }

    status_code = delete_data(table)

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({}),
    }


def delete_data(table) -> int:
    # DynamoDBに格納されているデータの全キーを取得
    try:
        response = table.scan()
        if len(response["Items"]) == 0:
            status_code = HTTPStatus.UNPROCESSABLE_ENTITY
        else:
            for item in response["Items"]:
                alert_id = item["alert_id"]
                table.delete_item(Key={"id": alert_id})
            status_code = HTTPStatus.OK

    except Exception as e:
        print(e)
        raise e

    # ステータスコードを返す
    return status_code
