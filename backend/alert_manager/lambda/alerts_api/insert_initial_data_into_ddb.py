import os
import uuid

import boto3

dynamoDB = boto3.resource("dynamodb")


def handler(event, context):
    try:
        TABLE_NAME = os.environ["TABLE_NAME"]
        table = dynamoDB.Table(TABLE_NAME)
        update_table(table)

    except Exception as e:
        print(e)


def update_table(table):
    initial_data = set_initial_data()
    print("initial_data is {}".format(initial_data))
    for item in initial_data:
        table.put_item(Item=item)


def set_initial_data():
    initial_data = [
        {
            "id": "dummy1",
            "opened_at": "2024-02-21T16:09:35.603Z",
            "closed_at": "",
            "status": "OPEN",
            "severity": "MEDIUM",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation_id": "",
        },
        {
            "id": "dummy2",
            "opened_at": "2024-02-20T12:08:33.603Z",
            "closed_at": "",
            "status": "OPEN",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation_id": "",
        },
        {
            "id": "dummy3",
            "opened_at": "2024-02-22T08:08:36.603Z",
            "closed_at": "",
            "status": "OPEN",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation_id": "",
        },
        {
            "id": "dummy4",
            "opened_at": "2024-02-21T18:08:34.603Z",
            "closed_at": "",
            "status": "OPEN",
            "severity": "HIGH",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation_id": "",
        },
        {
            "id": "dummy5",
            "opened_at": "2024-02-21T14:08:37.603Z",
            "closed_at": "2024-02-21T16:08:33.603Z",
            "status": "CLOSE",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation_id": "",
        },
    ]
    return initial_data
