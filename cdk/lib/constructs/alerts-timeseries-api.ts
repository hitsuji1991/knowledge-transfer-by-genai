import { Construct } from "constructs";
import { Auth } from "./auth";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as trigger from "aws-cdk-lib/triggers";
import * as timestream from "aws-cdk-lib/aws-timestream";
import * as iam from "aws-cdk-lib/aws-iam";

export interface AlertsTimeseriesApiProps {
  readonly alertsTable: dynamodb.TableV2;
  readonly auth: Auth;
  readonly timeseriesDatabase: timestream.CfnDatabase;
  readonly timeseriesTable: timestream.CfnTable;
}

export class AlertsTimeseriesApi extends Construct {
  readonly apiEndpoint: string;
  constructor(scope: Construct, id: string, props: AlertsTimeseriesApiProps) {
    super(scope, id);
    const alertsTableName = props.alertsTable.tableName;

    // API Gateway resource　-----------------------------------------------
    const api = new apigw.RestApi(this, "ServerlessRestApi", {
      cloudWatchRole: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["*"],
      },
    });

    // Define authorizer for Cognito User Pools
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [props.auth.userPool],
        identitySource: "method.request.header.Authorization",
        resultsCacheTtl: cdk.Duration.seconds(0),
        authorizerName: "CognitoAuthorizer",
      }
    );

    // Set up a method request in APIGW
    // path : "/alerts"
    const alerts = api.root.addResource("alerts");
    // path : "/alerts/<alert_id>"
    const alert = alerts.addResource("{alert_id}");
    // path : "/plc/loops/<loop_name>"
    const plc = api.root
      .addResource("plc")
      .addResource("loops")
      .addResource("{loop_name}");

    // Define methods of APIGW
    // path : "/alerts"
    // method : "GET"
    // lambda function resource　-----------------------------------------------
    const getAlertsFunction = new lambda.Function(this, "GetAlertsFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset("../backend/alert_manager/lambda/alerts_api"),
      handler: "get_alerts.handler",
      environment: {
        TABLE_NAME: alertsTableName,
      },
    });
    // grant lambda function the permission to write and read AlertsDB
    props.alertsTable.grantReadWriteData(getAlertsFunction);
    // Add APIGW to lambda function
    alerts.addMethod("GET", new apigw.LambdaIntegration(getAlertsFunction), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // path : "/alerts"
    // method : "DELETE"
    // lambda function resource　-----------------------------------------------
    const deleteAlertsFunction = new lambda.Function(
      this,
      "DeleteAlertsFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/alerts_api"
        ),
        handler: "delete_alerts.handler",
        environment: {
          TABLE_NAME: alertsTableName,
        },
      }
    );
    // grant lambda function the permission to write and read AlertsDB
    props.alertsTable.grantReadWriteData(deleteAlertsFunction);
    // Add APIGW to lambda function
    alerts.addMethod(
      "DELETE",
      new apigw.LambdaIntegration(deleteAlertsFunction),
      {
        authorizationType: apigw.AuthorizationType.COGNITO,
        authorizer,
      }
    );

    // path : "/alerts/<alert_id>"
    // method : "GET"
    // lambda function resource　-----------------------------------------------
    const getAlertByIdFunction = new lambda.Function(
      this,
      "GetAlertByIdFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/alerts_api"
        ),
        handler: "get_alert_by_id.handler",
        environment: {
          TABLE_NAME: alertsTableName,
        },
      }
    );
    // grant lambda function the permission to write and read AlertsDB
    props.alertsTable.grantReadWriteData(getAlertByIdFunction);
    // Add APIGW to lambda function
    alert.addMethod("GET", new apigw.LambdaIntegration(getAlertByIdFunction), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // path : "/alerts/<alert_id>"
    // method : "PUT"
    // lambda function resource　-----------------------------------------------
    const putAlertByIdFunction = new lambda.Function(
      this,
      "PutAlertByIdFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/alerts_api"
        ),
        handler: "put_alert_by_id.handler",
        environment: {
          TABLE_NAME: alertsTableName,
        },
      }
    );
    // grant lambda function the permission to write and read AlertsDB
    props.alertsTable.grantReadWriteData(putAlertByIdFunction);
    // Add APIGW to lambda function
    alert.addMethod("PUT", new apigw.LambdaIntegration(putAlertByIdFunction), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // path : "/alerts/<alert_id>"
    // method : "DELETE"
    // lambda function resource　-----------------------------------------------
    const deleteAlertByIdFunction = new lambda.Function(
      this,
      "DeleteAlertByIdFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/alerts_api"
        ),
        handler: "delete_alert_by_id.handler",
        environment: {
          TABLE_NAME: alertsTableName,
        },
      }
    );
    // grant lambda function the permission to write and read AlertsDB
    props.alertsTable.grantReadWriteData(deleteAlertByIdFunction);
    // Add APIGW to lambda function
    alert.addMethod(
      "DELETE",
      new apigw.LambdaIntegration(deleteAlertByIdFunction),
      {
        authorizationType: apigw.AuthorizationType.COGNITO,
        authorizer,
      }
    );

    // path : "/plc/loops/<loop_name>"
    // method : "GET"
    // lambda function resource　-----------------------------------------------
    const getPlcDataFunction = new lambda.Function(this, "GetPlcDataFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        "../backend/alert_manager/lambda/plc_data_api"
      ),
      handler: "get_plc_data.handler",
      environment: {
        DATABASE_NAME: props.timeseriesDatabase.databaseName!,
        TABLE_NAME: props.timeseriesTable.tableName!,
      },
    });
    // grant lambda function the permission to write and read TimeseriesDB
    getPlcDataFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["timestream:*"],
        resources: ["*"],
      })
    );
    // Add APIGW to lambda function
    plc.addMethod("GET", new apigw.LambdaIntegration(getPlcDataFunction), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // Insert initial demo data into DynamoDB
    // After crete DynamoDB, execute insertInitialDataIntoDDBFunction function
    const insertInitialDataIntoDDBFunction = new lambda.Function(
      this,
      "InsertInitialDataIntoDDBFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "../backend/alert_manager/lambda/alerts_api"
        ),
        handler: "insert_initial_data_into_ddb.handler",
        environment: {
          TABLE_NAME: alertsTableName,
        },
      }
    );
    props.alertsTable.grantWriteData(insertInitialDataIntoDDBFunction);
    new trigger.Trigger(this, "Trigger", {
      handler: insertInitialDataIntoDDBFunction,
      executeAfter: [],
    });

    this.apiEndpoint = api.url;
  }
}
