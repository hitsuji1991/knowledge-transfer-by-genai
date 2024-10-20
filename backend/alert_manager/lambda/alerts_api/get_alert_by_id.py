import json
import os
from http import HTTPMethod, HTTPStatus

import boto3
from boto3.dynamodb.conditions import Key

dynamoDB = boto3.resource("dynamodb")


def handler(event, context):
    try:
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

        # Query Parameter のチェック
        alert_id = event.get("pathParameters").get("alert_id")
        if alert_id != None:
            response = query_db(table, alert_id)
            # なければ422を返す
            if len(response) == 0:
                status_code = HTTPStatus.UNPROCESSABLE_ENTITY
        else:
            # Alert_idがなかった場合は422を返す
            status_code = HTTPStatus.UNPROCESSABLE_ENTITY
            response = {}

        return {
            "statusCode": status_code,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(response),
        }
    except Exception as e:
        print(e)
        raise e


def query_db(table, alert_id: str) -> dict:
    try:
        response = table.query(KeyConditionExpression=Key("id").eq(alert_id))
    except Exception as e:
        raise e
    return response["Items"]
