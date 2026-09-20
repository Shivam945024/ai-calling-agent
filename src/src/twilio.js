import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export function createCallResponse(host) {
  const response = new VoiceResponse();

  const connect = response.connect();

  connect.stream({
    url: `wss://${host}/media-stream`
  });

  return response.toString();
}
