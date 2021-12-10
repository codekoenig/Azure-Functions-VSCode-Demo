const { CosmosClient } = require("@azure/cosmos");

const cosmosDbConfig = {
    databaseId: process.env.CosmosDbDatabaseId,
    containerId: process.env.CosmosDbContainerId,
    endpoint: process.env.CosmosDbEndpointUri,
    authKey: process.env.CosmosDbReadWriteKey,
    partitionKey: { kind: "Hash", paths: ["/inquiryDate"] },
};

module.exports = { insertNewInquiry };

async function insertNewInquiry(message, messageSentiment, customerEmail, context) {
    
    const messageSentimentDocument = messageSentiment.documents[0];
    const date = new Date();
    
    const inquiryDate = 
        `${date.getFullYear()}-` +
        `${String(date.getMonth() + 1).padStart(2, "0")}-` +
        `${String(date.getDate()).padStart(2, "0")}`;

    const inquiryDocument = {
        customerEmail: customerEmail,
        message: message,
        inquiryDate: inquiryDate,
        sentiment: messageSentimentDocument.sentiment,
        confidenceScores: messageSentimentDocument.confidenceScores
    };

    const container = await createDbContext(context);

    const resource = await container.items.create(inquiryDocument);
    context.log(resource.statusCode);
}

function createCosmosDbClient() {
    const endpoint = cosmosDbConfig.endpoint;
    const key = cosmosDbConfig.authKey;
    const client = new CosmosClient({ endpoint, key });

    return client;
}

async function createDbContext(context) {
    const partitionKey = cosmosDbConfig.partitionKey;

    const cosmosDbClient = createCosmosDbClient();

    // Create database if it does not exist
    const { database } = await cosmosDbClient.databases.createIfNotExists({
        id: cosmosDbConfig.databaseId,
    });

    context.log(`Created database: ${database.id}`);

    // Create the container if it does not exist
    const { container } = await cosmosDbClient
        .database(cosmosDbConfig.databaseId)
        .containers.createIfNotExists(
            { id: cosmosDbConfig.containerId, partitionKey },
            { offerThroughput: 400 }
        );

    context.log(`Created container: ${container.id}`);

    return container;
}
