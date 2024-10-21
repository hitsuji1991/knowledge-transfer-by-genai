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
            "openedAt": "2024-02-21T16:09:35.603Z",
            "closedAt": "",
            "status": "OPEN",
            "severity": "MEDIUM",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation": {"messages" : []},
            "meetingIds" : [],
        },
        {
            "id": "dummy2",
            "openedAt": "2024-02-20T12:08:33.603Z",
            "closedAt": "",
            "status": "OPEN",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation": {"messages" : []},
            "meetingIds" : [],
        },
        {
            "id": "dummy3",
            "openedAt": "2024-02-22T08:08:36.603Z",
            "closedAt": "",
            "status": "OPEN",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation": {"messages" : []},
            "meetingIds" : [],
        },
        {
            "id": "dummy4",
            "openedAt": "2024-02-21T18:08:34.603Z",
            "closedAt": "",
            "status": "OPEN",
            "severity": "HIGH",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation": {"messages" : []},
            "meetingIds" : [],
        },
        {
            "id": "dummy5",
            "openedAt": "2024-02-21T14:08:37.603Z",
            "closedAt": "2024-02-21T16:08:33.603Z",
            "status": "CLOSE",
            "severity": "CRITICAL",
            "category": "F0023",
            "detail": "System breakdown",
            "name": "water_pressure_pv",
            "tag_description": "Water pressure sensor at location xxx",
            "closed_by": "",
            "comment": "",
            "conversation": {"messages" : []},
            "meetingIds" : [],
        },
    ]
    return initial_data
