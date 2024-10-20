import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as iotEvents from "aws-cdk-lib/aws-iotevents";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as trigger from "aws-cdk-lib/triggers";

export interface ErrorDetectorProps {
  readonly alertsTable: dynamodb.TableV2;
  readonly errordbTableName?: string;
  readonly ruleName?: string;
}

export class ErrorDetector extends Construct {
  /**
   * Define IoT Core rule and IoT Events to insert alert info into DynamoDB.
   */

  public readonly iotEventsRole: iam.Role;
  constructor(scope: Construct, id: string, props: ErrorDetectorProps) {
    super(scope, id);

    const ruleName = props.ruleName || "proc_demo_iot_publish_error_topic_rule";
    const logGroup = new logs.LogGroup(this, "IotPublishErrorTopicLogGroup", {
      logGroupName: "/aws/iot/proc_demo_error_detector/publish_error_topic",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const errordbTableName = props.errordbTableName || "error_info_table";

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

    // Create Error DB
    const errorTable = new dynamodb.TableV2(this, "ErrorTable", {
      tableName: errordbTableName,
      partitionKey: {
        name: "error_code",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // lambda function resource　-----------------------------------------------
    // Insert an alert infomation into DynamoDB when the status is changed Normal to ErrorDetected in IoT Events.
    const insertAlertIntoDbFunction = new lambda.Function(
      this,
      "InsertAlertIntoDbFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/error_detector"
        ),
        handler: "insert_alert_info_into_ddb.handler",
        environment: {
          ALERT_INFO_TABLE_NAME: props.alertsTable.tableName,
          ERROR_CODE_TABLE_NAME: errorTable.tableName,
        },
      }
    );

    // Publish error topic when data arrived at IoT Core.
    const publishErrorTopicFunction = new lambda.Function(
      this,
      "PublishErrorTopicFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/error_detector"
        ),
        handler: "publish_error_topic.handler",
        environment: {
          MAX_ERROR_ID: "90",
          ERROR_CODE_TOPIC_NAME: "plc/error/",
        },
        memorySize: 512,
      }
    );

    // attach pocicy to  publicErrorTopic Functions
    publishErrorTopicFunction.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTFullAccess")
    );

    // In order to make Error Info DB
    const insertInitialErrorDataIntoDbFunction = new lambda.Function(
      this,
      "InsertInitialErrorDataIntoDbFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/error_detector"
        ),
        handler: "insert_error_info_into_ddb.handler",
        environment: {
          ERROR_CODE_TABLE_NAME: errorTable.tableName,
        },
      }
    );

    // Grant write/read permissions to DynamoDB for various Lambda functions
    errorTable.grantReadData(insertAlertIntoDbFunction);
    errorTable.grantReadData(publishErrorTopicFunction);
    errorTable.grantWriteData(insertInitialErrorDataIntoDbFunction);

    props.alertsTable.grantReadWriteData(insertAlertIntoDbFunction);
    props.alertsTable.grantWriteData(insertInitialErrorDataIntoDbFunction);

    // Insert initial demo data into DynamoDB
    // After crete DynamoDB, execute insertInitialDataIntoDb function
    new trigger.Trigger(this, "Trigger", {
      handler: insertInitialErrorDataIntoDbFunction,
      executeAfter: [],
    });

    // create iot topic rule for publish error topic
    const iotPublishErrorTopicRule = new iot.CfnTopicRule(
      this,
      "IotPublishErrorTopicRule",
      {
        ruleName: ruleName,
        topicRulePayload: {
          sql: "SELECT * FROM 'plc/data'",
          ruleDisabled: false,
          actions: [
            {
              lambda: {
                functionArn: publishErrorTopicFunction.functionArn,
              },
            },
          ],
          errorAction: {
            cloudwatchLogs: {
              logGroupName: logGroup.logGroupName,
              roleArn: errActionRole.roleArn,
            },
          },
        },
      }
    );

    // Add permission about IoT Core to Lambda Function
    publishErrorTopicFunction.addPermission("AddIotTopicRuleTrigger", {
      principal: new iam.ServicePrincipal("iot.amazonaws.com"),
      sourceArn: iotPublishErrorTopicRule.attrArn,
    });

    // Create iot events role for insert alert info into DynamoDB.
    const iotEventsRole = new iam.Role(this, "IotEventsRole", {
      assumedBy: new iam.ServicePrincipal("iotevents.amazonaws.com"),
    });
    iotEventsRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess")
    );

    //　Create iot topic role for publish data about error status into iot events.
    const errorDetectorInput = new iotEvents.CfnInput(
      this,
      "ErrorDetectorInput",
      {
        inputName: "ErrorDetectorInput",
        inputDefinition: {
          attributes: [
            { jsonPath: "timestamp" },
            { jsonPath: "isNormal" },
            { jsonPath: "error" },
          ],
        },
      }
    );

    // Create topic role to insert data into iot events.
    const iotErrorTopicRole = new iam.Role(this, "IotErrorTopicRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
    });
    iotErrorTopicRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTEventsFullAccess")
    );

    // Create topic to insert data into iot events.
    const errorIotTopic = new iot.CfnTopicRule(this, "ErrorIotTopic", {
      topicRulePayload: {
        sql: "SELECT * FROM 'plc/error/#'",
        actions: [
          {
            iotEvents: {
              inputName: errorDetectorInput.inputName!,
              roleArn: iotErrorTopicRole.roleArn,
            },
          },
        ],
        ruleDisabled: false,
        awsIotSqlVersion: "2016-03-23",
      },
    });

    const errorDetectorModelDefinition = {
      states: [
        {
          stateName: "Normal",
          onInput: {
            events: [],
            transitionEvents: [
              {
                eventName: "to_ErrorDetected",
                condition: `$input.${errorDetectorInput.inputName}.isNormal == \'False\'`,
                actions: [],
                nextState: "ErrorDetected",
              },
            ],
          },
          onEnter: {
            events: [
              {
                eventName: "init",
                condition: `true`,
                actions: [
                  {
                    setVariable: {
                      variableName: "error",
                      value: `$input.${errorDetectorInput.inputName}.error`,
                    },
                  },
                ],
              },
            ],
          },
          onExit: {
            events: [],
          },
        },
        {
          stateName: "ErrorDetected",
          onInput: {
            events: [],
            transitionEvents: [
              {
                eventName: "to_Normal",
                condition: `$input.${errorDetectorInput.inputName}.isNormal == \'True\'`,
                actions: [],
                nextState: "Normal",
              },
            ],
          },
          onEnter: {
            events: [
              {
                eventName: "invokeLambda",
                condition: `true`,
                actions: [
                  {
                    lambda: {
                      functionArn: insertAlertIntoDbFunction.functionArn,
                      payload: {
                        contentExpression: `\'{
                                                    \"timestamp\": \"\${$input.${errorDetectorInput.inputName}.timestamp}\",
                                                    \"error\": \${$input.${errorDetectorInput.inputName}.error}
                                                  }\'`,
                        type: "JSON",
                      },
                    },
                  },
                ],
              },
            ],
          },
          onExit: {
            events: [],
          },
        },
      ],
      initialStateName: "Normal",
    };

    const errorDetectorModel = new iotEvents.CfnDetectorModel(
      this,
      "ErrorDetectorModel",
      {
        detectorModelName: "ErrorDetectorModel",
        detectorModelDefinition: errorDetectorModelDefinition,
        key: "error",
        evaluationMethod: "SERIAL",
        roleArn: iotEventsRole.roleArn,
      }
    );

    // Add permission about IoT Events to Lambda Function
    insertAlertIntoDbFunction.addPermission("AddIotEventTrigger", {
      principal: new iam.ServicePrincipal("iotevents.amazonaws.com"),
      sourceArn: errorDetectorModel.roleArn,
    });
  }
}
