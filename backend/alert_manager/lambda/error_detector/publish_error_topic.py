import asyncio
import json
import os
from datetime import datetime
from pprint import pprint

import boto3
from dateutil.tz import gettz

iot = boto3.client("iot-data")

MAX_ERROR_ID = os.environ["MAX_ERROR_ID"]
ERROR_CODE_TOPIC_NAME = os.environ["ERROR_CODE_TOPIC_NAME"]


async def publish_to_topic(error_code, timestamp, is_normal):
    error = {
        "timestamp": str(timestamp),
        "isNormal": str(is_normal),  # 異常かどうか
        # "isConnected": str(True),
        "error": str(error_code),  # IoT Events が判断するためのエラーコード
    }
    try:
        await asyncio.to_thread(
            iot.publish,
            topic=ERROR_CODE_TOPIC_NAME + str(error_code),
            qos=0,
            payload=json.dumps(error),
        )
    except Exception as e:
        print(f"Error publishing to topic {error_code}: {str(e)}")


async def send_error_data_to_errortopic(error_list: list[int], timestamp: str):
    # 各エラーコードトピックにエラーが発生しているかどうかの状態を送信する。
    # 各エラーコードのトピックはエラーコードの数だけ存在する。
    # IoT Events は各トピックのデータを参照して、各エラーコードの異常が発生しているかの状態を判断している。
    # error_list に含まれる数値は異常となっているエラーコードであり、
    # error_list に含まれる数値のエラーコードのトピックには異常であることを示すデータを送信、
    # 含まれないものは正常であることを示すデータを送信する。
    tasks = []
    for error_code in range(1, int(MAX_ERROR_ID) + 1):
        is_normal = error_code not in error_list
        task = asyncio.create_task(publish_to_topic(error_code, timestamp, is_normal))
        tasks.append(task)

    await asyncio.gather(*tasks, return_exceptions=True)


def handler(event, context):
    # pprint(event)
    # print(f"timestamp: {event.get('timestamp')}")

    # エラーコードの重複を削除してリスト化
    error_list = list(set(event.get("error")))
    # print(f"error_list: {error_list}")

    # PLC から送られてくるエラーコードは文字列なので数値に変換
    error_list = [int(error_code) for error_code in error_list]

    # エラーコードがない場合は終了
    if len(error_list) == 0:
        return

    timestamp = convert_jst_to_utc(event.get("timestamp"))
    asyncio.run(send_error_data_to_errortopic(error_list, timestamp))


def convert_jst_to_utc(timestamp: str) -> str:
    # PLCから送られてくる時刻はJST
    timestamp_jst = datetime.strptime(timestamp + "+0900", "%Y%m%d %H:%M:%S.%f%z")
    # UTC に変換
    timestamp_utc = timestamp_jst.astimezone(gettz("UTC")).strftime(
        "%Y-%m-%d %H:%M:%S.%f"
    )
    timestamp_utc = timestamp_utc.replace(" ", "T") + "Z"
    return timestamp_utc
