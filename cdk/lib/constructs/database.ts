import { Construct } from "constructs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as timestream from "aws-cdk-lib/aws-timestream";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

export class Database extends Construct {
  public readonly alertTable: ddb.TableV2;
  public readonly meetingTable: ddb.TableV2;
  public readonly timeseriesDatabase: timestream.CfnDatabase;
  public readonly timeseriesTable:timestream.CfnTable; 

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const alertTable = new ddb.TableV2(this, "AlertTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billing: ddb.Billing.onDemand(),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const meetingTable = new ddb.TableV2(this, "MeetingTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billing: ddb.Billing.onDemand(),
      removalPolicy: RemovalPolicy.DESTROY,
    });
    meetingTable.addGlobalSecondaryIndex({
      indexName: "AlertIndex",
      partitionKey: {
        name: "alertId",
        type: ddb.AttributeType.STRING,
      },
    });

    //const databaseName = props.databaseName || `${id}Database`;
    //const tableName = props.tableName || `${id}Table`;

    const timeseriesDatabase = new timestream.CfnDatabase(this, "timeseriesDatabase", {
      databaseName: 'iot-timeseries-data',
    });

    const timeseriesTable = new timestream.CfnTable(this, "timeseriesTable", {
      databaseName: timeseriesDatabase.databaseName!,
      tableName: 'iot-timeseries-table',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: 24,
        magneticStoreRetentionPeriodInDays: 7,
      },
    });
    timeseriesTable.addDependency(timeseriesDatabase);
    timeseriesTable.applyRemovalPolicy(RemovalPolicy.DESTROY);


    new CfnOutput(this, "AlertTableName", {
      value: alertTable.tableName,
    });
    new CfnOutput(this, "MeetingTableName", {
      value: meetingTable.tableName,
    });

    this.alertTable = alertTable;
    this.meetingTable = meetingTable;
    this.timeseriesDatabase = timeseriesDatabase;
    this.timeseriesTable = timeseriesTable;
  }
  
  
  grantWrite(role: iam.Role) {
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["timestream:*"],
        resources: ["*"],
      })
    );
    role.node.addDependency(this.timeseriesTable);
  }

}
