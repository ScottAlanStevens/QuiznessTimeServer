import AWS, { ApiGatewayManagementApi, AWSError, Request } from "aws-sdk"
require('./patch.js')

let _apigwManagementApi: AWS.ApiGatewayManagementApi

const _init = () => {
    return new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: process.env.ENDPOINT
    });
}

export const postToConnectionAsync = async (params: ApiGatewayManagementApi.Types.PostToConnectionRequest, callback?: (err: AWSError, data: {}) => void) => {
    _apigwManagementApi = _apigwManagementApi || (_apigwManagementApi = _init())
    await _apigwManagementApi.postToConnection(params, callback).promise()
}