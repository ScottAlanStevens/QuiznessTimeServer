import AWS, { DynamoDB } from 'aws-sdk';

if (!AWS.config.region) {
    AWS.config.update({
        region: 'eu-west-2'
    });
}

let dynamodb: DynamoDB;

export async function getItemAsync<T>(tableName: string, data: { [key: string]: any }): Promise<T> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    var params = {
        TableName: tableName,
        Key: DynamoDB.Converter.marshall(data)
    };

    return new Promise((resolve, reject) => {
        dynamodb.getItem(params, (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else if (result.Item == undefined) {
                reject(new Error('Item not found'));
            } else resolve(DynamoDB.Converter.unmarshall(result.Item) as T);
        });
    });
}

export async function putItemAsync(tableName: string, item: { [key: string]: any }): Promise<DynamoDB.PutItemOutput> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    var params = {
        TableName: tableName,
        Item: DynamoDB.Converter.marshall(item)
    };

    return new Promise((resolve, reject) => {
        dynamodb.putItem(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err);
            } else resolve(data);
        });
    });
}

export async function putItemsAsync(tableName: string, items: any[]): Promise<DynamoDB.BatchWriteItemOutput> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    var params: DynamoDB.BatchWriteItemInput = {
        RequestItems: {

        }
    };

    params.RequestItems[tableName] = items.map((item) => {

        var putReq: DynamoDB.PutRequest = {
            Item: DynamoDB.Converter.marshall(item)
        }

        var writeReq: DynamoDB.WriteRequest = {
            PutRequest: putReq
        }

        return writeReq
    })

    return dynamodb.batchWriteItem(params).promise()
}

export async function deleteItemAsync(tableName: string, item: { [key: string]: any }): Promise<DynamoDB.DeleteItemOutput> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    var params = {
        TableName: tableName,
        Key: DynamoDB.Converter.marshall(item)
    };

    return new Promise((resolve, reject) => {
        dynamodb.deleteItem(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err);
            } else resolve(data);
        });
    });
}

export async function scanAsync<T>(tableName: string): Promise<Array<T>> {

    var params: DynamoDB.ScanInput = {
        TableName: tableName
    };

    return new Promise(async (resolve, reject) => {
        let scanResults: DynamoDB.AttributeMap[] = []

        let items;

        do {
            items = await _scanAsync(params);

            items.Items.forEach((item) => scanResults.push(item));

            params.ExclusiveStartKey = items.LastEvaluatedKey;

        } while (typeof items.LastEvaluatedKey != "undefined");

        resolve(scanResults.map((item) => {
            return DynamoDB.Converter.unmarshall(item) as T
        }))
    })
}

export type DynamoKeyQueryItem = {
    keyName: string,
    keyValue: string
}

export async function queryAsync<T>(tableName: string, keys: Array<DynamoKeyQueryItem>): Promise<Array<T>> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    let params: DynamoDB.QueryInput = {
        TableName: tableName,
        KeyConditionExpression: '',
        ExpressionAttributeValues: {}
    }

    keys.forEach((key: DynamoKeyQueryItem, idx: number) => {
        if (params.KeyConditionExpression.length > 0) {
            params.KeyConditionExpression += ` AND `
        }

        params.KeyConditionExpression += `${key.keyName} = :v${idx + 1}`

        params.ExpressionAttributeValues[`:v${idx + 1}`] = {
            S: key.keyValue
        }
    })

    return new Promise((resolve, reject) => {
        dynamodb.query(params, (err, data: DynamoDB.QueryOutput) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(data.Items.map((item) => {
                    return DynamoDB.Converter.unmarshall(item) as T
                }))
            }
        });
    });
}

async function _scanAsync(params: DynamoDB.ScanInput): Promise<DynamoDB.ScanOutput> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    return new Promise((resolve, reject) => {
        dynamodb.scan(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err);
            } else resolve(data);
        });
    });
}

export interface ScanFilterItem {
    propertyName: string
    values: Array<string>
    comparisonOperator: ScanFilterComparisonType
}

export enum ScanFilterComparisonType {
    EQ = "EQ",
    NE = "NE",
    IN = "IN",
    LE = "LE",
    LT = "LT",
    GE = "GE",
    GT = "GT",
    BETWEEN = "BETWEEN",
    NOT_NULL = "NOT_NULL",
    NULL = "NULL",
    CONTAINS = "CONTAINS",
    NOT_CONTAINS = "NOT_CONTAINS",
    BEGINS_WITH = "BEGINS_WITH"
}

export async function scanByPropertyAsync<T>(tableName: string, filters: Array<ScanFilterItem>): Promise<Array<T>> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    let scanFilter: DynamoDB.FilterConditionMap = {}

    for (let filter of filters) {
        scanFilter[filter.propertyName] = {
            ComparisonOperator: filter.comparisonOperator,
            AttributeValueList: filter.values.map((x) => {
                return {
                    S: x
                }
            })
        }
    }

    let params = {
        TableName: tableName,
        ScanFilter: scanFilter
    }

    return new Promise((resolve, reject) => {
        dynamodb.scan(params, (err, data) => {

            if (err || data.Items == undefined) reject(err);
            else {
                resolve(data.Items.map((x) => {
                    return DynamoDB.Converter.unmarshall(x) as T
                }));
            }
        });
    });
}

export async function incrementPropertyAsync(tableName: string, item: { [key: string]: any; }, incrementKey: string): Promise<DynamoDB.PutItemOutput | DynamoDB.UpdateItemOutput> {

    dynamodb = dynamodb || (dynamodb = new DynamoDB())

    var params = {
        TableName: tableName,
        Key: DynamoDB.Converter.marshall(item),
        ExpressionAttributeValues: DynamoDB.Converter.marshall({
            ":incr": 1
        }),
        ExpressionAttributeNames: {
            "#Count": incrementKey
        },
        ReturnValues: "ALL_NEW",
        ConditionExpression: 'attribute_exists(#Count)',
        UpdateExpression: "SET #Count = #Count + :incr"
    }

    return new Promise((resolve, reject) => {
        dynamodb.updateItem(params, (err, data) => {
            if (err) {
                // incrementKey does not exist
                if (err.code == 'ConditionalCheckFailedException') {

                    item[incrementKey] = 1

                    var putItemParams = {
                        TableName: tableName,
                        Item: DynamoDB.Converter.marshall(item),
                    }

                    dynamodb.putItem(putItemParams, (err, data) => {
                        if (err) {
                            console.error(err)
                            reject(err)
                        }
                        else {
                            resolve(data)
                        }
                    })
                } else {
                    console.error(err)
                    reject(err)
                }
            } else resolve(data)
        })
    })
}