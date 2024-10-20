import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";

export interface IotPipelineProps {
  databaseName: string;
  tableName: string;
  ruleName?: string;
}

export class IotPipeline extends Construct {
  /**
   * Define IoT Core Rule to store PLC data in Timestream
   */
  public readonly writeRole: iam.Role;
  constructor(scope: Construct, id: string, props: IotPipelineProps) {
    super(scope, id);

    const ruleName = props.ruleName || "proc_demo_iot_database_rule";

    const logGroup = new logs.LogGroup(this, "TimestreamLogGroup", {
      logGroupName: "/aws/iot/proc_demo_iot_database_rule/timestream",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const errActionRole = new iam.Role(this, "ErrorActionRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
    });
    errActionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    const writeRole = new iam.Role(this, "WriteRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
    });

    // IoT Core Rule to store PLC data in Timestream
    const iotDatabaseRule = new iot.CfnTopicRule(this, "IotDatabaseRule", {
      ruleName: ruleName,
      topicRulePayload: {
        sql: "SELECT * FROM 'plc/data'",
        ruleDisabled: false,
        actions: [
          {
            timestream: {
              roleArn: writeRole.roleArn,
              databaseName: props.databaseName,
              tableName: props.tableName,
              dimensions: [{
                name: "gateway_id",
                value: "${clientId()}",
              },],
            },
          },
        ],
        // When error happens, store the error message in CloudWatch Logs
        errorAction: {
          cloudwatchLogs: {
            logGroupName: logGroup.logGroupName,
            roleArn: errActionRole.roleArn,
          },
        },
      },
    });

    this.writeRole = writeRole;
  }
}
