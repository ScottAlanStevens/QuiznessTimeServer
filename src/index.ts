import { processMessageAsync, addConnectionAsync, deleteConnectionAsync } from "./transport"

const defaultHandler = async (event: any) => {

    console.log(JSON.stringify(event, null, 2))

    let message = JSON.parse(event.body)

    return await processMessageAsync(event.requestContext.connectionId, message)
}

const addConnectionHandler = async (event: any) => {

    console.log(JSON.stringify(event, null, 2))

    process.env.ENDPOINT = event.requestContext.domainName + '/' + event.requestContext.stage

    return await addConnectionAsync(event.requestContext.connectionId)
}

const deleteConnectionHandler = async (event: any) => {

    console.log(JSON.stringify(event, null, 2))

    process.env.ENDPOINT = event.requestContext.domainName + '/' + event.requestContext.stage

    return await deleteConnectionAsync(event.requestContext.connectionId)
}

export {
    addConnectionHandler,
    deleteConnectionHandler,
    defaultHandler
}