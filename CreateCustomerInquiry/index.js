const axios = require('axios');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    // Gets Cognitive Services API Key from Environment Variables. While developing on your local machine, this is read from local.settings.json
    const cognitiveServicesApiKey = process.env["CognitiveServicesApiKey"];
    const cognitiveServicesEndpointUri = process.env["CognitiveServicesEndpointUri"];

    // Get message either from query parameter or from message body
    const message = (req.query.message || (req.body && req.body.message));

    if (!message) {
        context.res = {
            status: 400,
            body: "Missing customer message. Pass it either as query parameter message or in the body."
        }

        return;
    }

    const messageSentiment = await getMessageSentimentFromCognitiveServices(message, cognitiveServicesApiKey, cognitiveServicesEndpointUri);

    if (messageSentiment === null) {
        context.res = {
            status: 500,
            body: "Unexepected error: getting message sentiment from cognitive services failed"
        }

        return;
    }

    const htmlFormattedResponse = formatResponseAsHtml(message, messageSentiment);

    context.res =
    {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=UTF-8"
        },
        body: htmlFormattedResponse
    }
}

async function getMessageSentimentFromCognitiveServices(message, cognitiveServicesApiKey, cognitiveServicesEndpointUri) {
    
    const requestBody = JSON.stringify({
        documents:
            [
                {
                    id: "1",
                    language: "de",
                    text: message
                }
            ]
    });

    var messageSentimentResponse;

    try {
        messageSentimentResponse = await axios.post(
            cognitiveServicesEndpointUri + '/text/analytics/v3.1/sentiment',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': cognitiveServicesApiKey
                }
            }
        );
    } catch (error) {
        messageSentimentResponse = null;
        return;
    }

    return messageSentimentResponse.data;
}

function formatResponseAsHtml(originalMessage, classification) {
    var html = "";

    const document = classification.documents[0];

    html += '<body style="font-family: sans-serif;">';
    html += '<h1>Kundenanfrage</h1>';
    html += '<p>' + originalMessage + '</p>';
    html += '<h2>Erkannte Stimmung des Kunden</h2>';

    switch (document.sentiment) {
        case 'positive':
            html += '<div style="font-size: x-large"><span>😊</span><span>Freundlich</span></div>';
            break;

        case 'neutral':
        case 'mixed':
            html += '<div style="font-size: x-large"><span>😑</span><span>Neutral</span></div>';
            break;

        case 'negative':
            html += '<div style="font-size: x-large"><span>😡</span><span>Verärgert</span></div>';
            break;

        default:
            break;
    }

    html += '<div>';
    html += '<span style="font-weight: bold;">' + Math.round(document.confidenceScores.positive * 100) + ' % </span><span>Positiv | </span>';
    html += '<span style="font-weight: bold;">' + Math.round(document.confidenceScores.neutral * 100) + ' % </span><span>Neutral | </span>';
    html += '<span style="font-weight: bold;">' + Math.round(document.confidenceScores.negative * 100) + ' % </span><span>Negativ</span>';
    html += '</div>';
    html += '</body>';

    return html;
}