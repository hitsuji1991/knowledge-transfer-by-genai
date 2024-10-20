import json
import os
from http import HTTPMethod, HTTPStatus
from typing import Literal

import boto3
from boto3.dynamodb.conditions import Key

dynamoDB = boto3.resource("dynamodb")

type_status = Literal["OPEN", "CLOSE"]
DEFAULT_LIMIT = 250
DEFAULT_STATUSES: list[type_status] = ["OPEN", "CLOSE"]


def handler(event, context):
    status_code = HTTPStatus.OK
    TABLE_NAME = os.environ["TABLE_NAME"]
    table = dynamoDB.Table(TABLE_NAME)

    # HTTP Method のチェック
    if event["httpMethod"] != HTTPMethod.GET:
        status_code = HTTPStatus.METHOD_NOT_ALLOWED
        return {
            "statusCode": status_code,
            "headers": {"Content-Type": "text/plain"},
        }

    items = []
    for status in DEFAULT_STATUSES:
        res = query_db(table, DEFAULT_LIMIT, status)
        items.extend(res)

    if len(items) == 0:
        status_code = HTTPStatus.UNPROCESSABLE_ENTITY

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(items),
    }


def query_db(table, limit: int, status: type_status) -> list:
    """Get alerts from DynamoDB."""
    try:
        response = table.query(
            IndexName="status-index",
            KeyConditionExpression=Key("status").eq(status),
            Limit=int(limit),
            ScanIndexForward=False,
        )
        items = response["Items"]
        return items
    except Exception as e:
        print(e)
        raise e
