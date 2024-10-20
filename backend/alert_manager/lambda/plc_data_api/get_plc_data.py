import json
import os
from http import HTTPMethod, HTTPStatus
import urllib.parse
from datetime import datetime

import boto3

timestream_client = boto3.client("timestream-query")
DATABASE_NAME = os.environ["DATABASE_NAME"]
TABLE_NAME = os.environ["TABLE_NAME"]


def handler(event, context):
    try:
        status_code = HTTPStatus.OK

        # HTTP Method のチェック
        if event["httpMethod"] != HTTPMethod.GET:
            status_code = HTTPStatus.METHOD_NOT_ALLOWED
            return {
                "statusCode": status_code,
                "headers": {"Content-Type": "text/plain"},
            }

        # Query Parameter のチェック
        loop_name = event.get("pathParameters").get("loop_name")
        start, end = set_query_parameters(event.get("queryStringParameters"))

        if (loop_name is None) or (start is None) or (end is None):
            # Query Parameter, Path Parameters がどれか１つでもなかった場合は422を返す
            status_code = HTTPStatus.UNPROCESSABLE_ENTITY
            print("[ERROR] loop_name or start or end are not specified.")
            print("[DEBUG] loop_name is {}".format(loop_name))
            print("[DEBUG] start is {}".format(start))
            print("[DEBUG] end is {}".format(end))
            response = {}
        else:
            response = query_db(DATABASE_NAME, TABLE_NAME, loop_name, start, end)
            # Timestreamに存在していないloop_nameだった場合、もしくは
            # データが存在していない時刻を指定していた場合は422を返す
            if len(response) == 0:
                status_code = HTTPStatus.NOT_FOUND
                print(
                    "[ERROR] Loop_name is not in Timestream or no data at the specified time in Timestream."
                )

        shaped_response = shape_response(response)

        return {
            "statusCode": status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(shaped_response),
        }
    except Exception as e:
        print("[ERROR] {}".format(e))
        raise e


def query_db(
    database_name: str, table_name: str, loop_name: str, start: str, end: str
) -> dict:
    try:
        query = f"""SELECT time, 
        measure_name, 
        measure_value::varchar 
        FROM
         "{database_name}"."{table_name}" 
        WHERE
         "measure_name" = '{loop_name}' 
        AND
         "time" BETWEEN '{start}' AND '{end}' 
        ORDER BY time"""

        response = timestream_client.query(QueryString=query)
        return response
    except Exception as e:
        print("[ERROR] Failed to execute query: {}".format(query))
        print("[ERROR] {}".format(e))
        raise e


def set_query_parameters(query_string_parameters: dict) -> tuple:
    try:
        start = None
        end = None
        if query_string_parameters != None:
            start = query_string_parameters.get("start")
            if start is not None:
                start = urllib.parse.unquote(start)
            end = query_string_parameters.get("end")
            if end is not None:
                end = urllib.parse.unquote(end)
        return start, end
    except Exception as e:
        print("[ERROR] {}".format(e))
        raise e


def shape_response(response: dict) -> list:
    """
    timestreamからのresponase例を以下に示す。
    {
      "QueryId": "AEIACANJ635U...PUN7TVJ3OAEEBA",
      "Rows": [{
        "Data": [{
          "ScalarValue": "8981100005817821334"
          }]
        }],
        "ColumnInfo": [{
          "Name": "time",
          "Type": {
            "ScalarType": "BIGINT"
          }
        }]
    }
    のように。Timestreamに格納されている値はすべて"ScalarValue"というキーの値として返却される。
    以下の形式になるように、Timestreamからのresponseの形を変換する。
    [{
      "measure_name": "pressure",
      "measure_values": [
        {
          "timestamp": "2024-04-11T06:20:01.648Z",
          "tag_name": "tank_pressure_pv",
          "measure_value": "1.0"
        },
        {
          "timestamp": "2024-04-11T06:20:01.648Z",
          "tag_name": "tank_pressure_pv",
          "measure_value": "1.1"
        }]
    }, ...
    """

    try:
        # 一旦、Timestreamからのレスポンスを、測定値(measure_name)をキーに、
        # {timestamp, tag_name, measure_value} の辞書のリストを
        # バリューにした辞書である data_dict を作成する。
        data_dict = {}
        for data in response["Rows"]:
            # SELECT time, measure_name(loop_name), measure_value::varchar とクエリを投げたので
            # 1つめには時刻が格納されている
            timestamp = data["Data"][0]["ScalarValue"]
            ## ISO 形式に変換
            # datetime.strptime を利用するにはマイクロ秒の桁数は6桁に丸める
            timestamp = timestamp.rstrip("000")
            timestamp_obj = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S.%f")
            timestamp = timestamp_obj.isoformat() + "Z"

            # 2つめにはloop_nameが格納されている
            loop_name = data["Data"][1]["ScalarValue"]

            # 3つめはその時刻・loop_nameの全測定値が格納されている
            # 文字列で格納されているので辞書型に変換
            # 辞書型に変換すると、各キーが測定値名になっている
            measure_values = json.loads(data["Data"][2]["ScalarValue"])

            for measure_name in measure_values.keys():
                tmp = {
                    "timestamp": timestamp,
                    "tag_name": loop_name + "_" + measure_name + "_pv",
                    "measure_value": measure_values[measure_name],
                }

                if measure_name in data_dict.keys():
                    # すでに data_dict に measure_name が存在する場合は、
                    # 測定値のリストに追加する。
                    data_dict[measure_name].append(tmp)
                else:
                    # まだ data_dict に measure_name が存在していない場合は、
                    # リストを辞書のバリューに格納
                    data_dict[measure_name] = [tmp]

        # 作成した data_dict から、このAPIの要件となるデータの形になるように整形してreturnする。
        shaped_response = []
        for key in data_dict.keys():
            shaped_response.append(
                {
                    "measure_name": key,
                    "measure_values": data_dict[key],
                }
            )

        return shaped_response
    except Exception as e:
        print("[ERROR] {}".format(e))
        raise e
