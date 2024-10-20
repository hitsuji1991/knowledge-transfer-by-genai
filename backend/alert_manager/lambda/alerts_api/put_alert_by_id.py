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
        if event["httpMethod"] != HTTPMethod.PUT:
            status_code = HTTPStatus.METHOD_NOT_ALLOWED
            return {
                "statusCode": status_code,
                "headers": {"Content-Type": "text/plain"},
            }

        body = json.loads(event["body"])
        alert_id = event.get("pathParameters").get("alert_id")

        # DynamoDBに該当列があるか確認
        if check_column(table, alert_id):
            response, status_code = update_column(table, alert_id, body)
        else:
            # なければ404を返す
            status_code = HTTPStatus.NOT_FOUND
            response = {}

        return {
            "statusCode": status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response),
        }
    except Exception as e:
        print(e)
        raise e


def check_column(table, alert_id):
    response = table.query(KeyConditionExpression=Key("id").eq(alert_id))

    if len(response["Items"]) == 0:
        return False
    else:
        return True


def update_column(table, alert_id, body):
    try:
        updateExpression = ""
        attr_names = {}
        attr_values = {}

        update_fields = [
            ("status", "status"),
            ("closedAt", "closedAt"),
            ("comment", "comment"),
            ("conversation_id", "conversation_id"),
        ]

        for field, attr_name in update_fields:
            if body.get(field) is not None:
                if updateExpression:
                    updateExpression += ", "
                else:
                    updateExpression += "set "
                updateExpression += f"#{attr_name} = :{attr_name}"
                attr_names[f"#{attr_name}"] = attr_name
                attr_values[f":{attr_name}"] = body.get(field)

        response_ddb = table.update_item(
            Key={"id": alert_id},
            UpdateExpression=updateExpression,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
        )

    except Exception as e:
        print(e)

    if response_ddb["ResponseMetadata"]["HTTPStatusCode"] == HTTPStatus.OK:
        response = body
    else:
        response = {}

    return response, response_ddb["ResponseMetadata"]["HTTPStatusCode"]
